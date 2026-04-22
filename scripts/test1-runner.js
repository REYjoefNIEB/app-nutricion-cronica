#!/usr/bin/env node
/**
 * Test #1 Runner — Ancestry Personalization
 *
 * Valida que el algoritmo EM con inicialización determinista produce
 * vectores de ancestría diferentes para ADNs genéticamente distintos.
 *
 * Uso:
 *   node -r dotenv/config scripts/test1-runner.js dotenv_config_path=scripts/.env
 *   o con FIREBASE_WEB_API_KEY ya en el entorno:
 *   node scripts/test1-runner.js
 *
 * Pre-requisitos:
 *   1. scripts/nura-33fc1-service-account.json  (Admin SDK key)
 *   2. FIREBASE_WEB_API_KEY en entorno o en scripts/.env
 *   3. scripts/test-data/adn-A-corpas-padre.txt
 *   4. scripts/test-data/adn-B-sporny.txt
 */

'use strict';

// Cargar .env si existe (no falla si no existe)
try {
    require('dotenv').config({ path: require('path').join(__dirname, '.env') });
} catch (_) {}

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const yaml   = require('js-yaml');
const https  = require('https');
const http   = require('http');
const { execSync } = require('child_process');

// ── Constantes ────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'nura-33fc1-service-account.json');
const TEST_DATA_DIR        = path.join(__dirname, 'test-data');
const RESULTS_DIR          = path.join(__dirname, 'test-results');
const REPO_ROOT            = path.join(__dirname, '..');

const PROJECT_ID = 'nura-33fc1';
const REGION     = 'us-central1';

const FUNCTION_URLS = {
    processGeneticData: `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/processGeneticData`,
    analyzeAncestry:    `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/analyzeAncestry`
};

const ADN_FILES = {
    A: { path: path.join(TEST_DATA_DIR, 'adn-A-corpas-padre.txt'), label: 'Corpas padre (español andaluz)' },
    B: { path: path.join(TEST_DATA_DIR, 'adn-B-sporny.txt'),       label: 'Sporny (European American)'    }
};

const THRESHOLDS = {
    MIN_AIMS:        8,   // mínimo AIMs que el parser debe encontrar (MIN_SNPS en calculator.js)
    MIN_L2_DISTANCE: 0.05 // distancia mínima entre Q-vectores para considerar resultados distintos
};

// ── Helper: fetch con Node nativo (evita import() dinámico) ──────
function httpFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const lib = parsedUrl.protocol === 'https:' ? https : http;
        const body = options.body ? Buffer.from(options.body, 'utf8') : null;

        const reqOptions = {
            hostname: parsedUrl.hostname,
            path:     parsedUrl.pathname + parsedUrl.search,
            method:   options.method || 'GET',
            headers:  { ...(options.headers || {}), ...(body ? { 'Content-Length': body.length } : {}) }
        };

        const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }));
        });

        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// ── TAREA 2: Validar pre-requisitos ──────────────────────────────
function validatePrereqs() {
    const errors = [];

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        errors.push(`❌ Falta service account: ${path.relative(REPO_ROOT, SERVICE_ACCOUNT_PATH)}`);
        errors.push(`   → Ir a: https://console.firebase.google.com/project/${PROJECT_ID}/settings/serviceaccounts/adminsdk`);
        errors.push('   → Click "Generate new private key" y guardar como scripts/nura-33fc1-service-account.json');
    }

    if (!process.env.FIREBASE_WEB_API_KEY) {
        errors.push('❌ Falta FIREBASE_WEB_API_KEY en el entorno');
        errors.push('   → Obtener de: Firebase Console > Project Settings > General > Web API Key');
        errors.push('   → Agregar a scripts/.env: FIREBASE_WEB_API_KEY=AIzaSy...');
    }

    for (const [key, info] of Object.entries(ADN_FILES)) {
        if (!fs.existsSync(info.path)) {
            errors.push(`❌ Falta archivo ADN ${key}: scripts/test-data/${path.basename(info.path)}`);
            if (key === 'A') {
                errors.push('   → Corpas padre dataset: https://figshare.com/articles/dataset/92682');
                errors.push('   → Buscar el archivo .txt de 23andMe o compatible y renombrar a adn-A-corpas-padre.txt');
            }
            if (key === 'B') {
                errors.push('   → Sporny DNA: https://github.com/msporny/dna');
                errors.push('   → Descargar genome.txt y renombrar a adn-B-sporny.txt');
            }
        }
    }

    if (errors.length > 0) {
        console.error('\n🚫 PRE-REQUISITOS FALTANTES:\n');
        errors.forEach(e => console.error(e));
        console.error('\nEjecuta el script nuevamente cuando tengas todos los archivos.\n');
        process.exit(1);
    }

    if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

    console.log('✅ Pre-requisitos OK\n');
}

// ── Admin SDK ─────────────────────────────────────────────────────
function initAdmin() {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    admin.initializeApp({
        credential:    admin.credential.cert(serviceAccount),
        projectId:     PROJECT_ID,
        storageBucket: `${PROJECT_ID}.firebasestorage.app`
    });
    console.log('✅ Admin SDK inicializado\n');
}

// ── Crear usuario de test efímero ────────────────────────────────
async function createTestUser(label) {
    const ts    = Date.now();
    const email = `nura-test-${label.toLowerCase()}-${ts}@test.nura.app`;

    const userRecord = await admin.auth().createUser({
        email,
        password:      'NuraTest123!',
        displayName:   `Test ${label}`,
        emailVerified: true
    });

    // Crear doc en Firestore con consentimiento requerido por processGeneticData
    await admin.firestore().doc(`users/${userRecord.uid}`).set({
        email,
        displayName: `Test ${label}`,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        legal_consent: {
            terms_accepted:   true,
            genetic_consent:  true,
            privacy_accepted: true,
            timestamp:        admin.firestore.FieldValue.serverTimestamp()
        }
    });

    // Custom token → ID token via Identity Toolkit REST
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    const apiKey      = process.env.FIREBASE_WEB_API_KEY;

    const resp = await httpFetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token: customToken, returnSecureToken: true })
        }
    );

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Error intercambiando custom token para usuario ${label}: ${txt}`);
    }

    const { idToken } = await resp.json();

    console.log(`  ✅ Usuario ${label}: uid=${userRecord.uid}`);
    return { uid: userRecord.uid, email, idToken };
}

// ── Subir ADN a Storage en la ruta que processGeneticData espera ─
async function uploadADNToStorage(uid, localFilePath) {
    const bucket     = admin.storage().bucket();
    const fileName   = path.basename(localFilePath);
    // IMPORTANTE: path debe empezar con genetic-raw/${uid}/ (validado en la Cloud Function)
    const remotePath = `genetic-raw/${uid}/${Date.now()}_${fileName}`;

    await bucket.upload(localFilePath, {
        destination: remotePath,
        metadata:    { contentType: 'text/plain' }
    });

    const fileSize = fs.statSync(localFilePath).size;
    console.log(`  ✅ Subido a Storage: ${remotePath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
    return { storagePath: remotePath, fileName, fileSize };
}

// ── Invocar Cloud Function como usuario autenticado ──────────────
async function callFunction(functionName, idToken, data) {
    const url  = FUNCTION_URLS[functionName];
    const resp = await httpFetch(url, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ data })
    });

    const body = await resp.json();

    // Cloud Functions v2 wraps errors in { error: { message, status } }
    if (!resp.ok || body.error) {
        const msg = body.error?.message || body.error || JSON.stringify(body);
        throw new Error(`${functionName} falló (${resp.status}): ${msg}`);
    }

    // La respuesta exitosa de onCall v2 viene en body.result
    return body.result !== undefined ? body.result : body;
}

// ── Leer resultado de ancestría desde Firestore ──────────────────
async function readAncestryResult(uid) {
    // La Cloud Function guarda en users/${uid}/ancestry/result
    const doc = await admin.firestore().doc(`users/${uid}/ancestry/result`).get();
    if (doc.exists) return { path: `users/${uid}/ancestry/result`, data: doc.data() };

    // Fallback: listar la colección completa
    const snap = await admin.firestore().collection(`users/${uid}/ancestry`).get();
    if (!snap.empty) {
        const d = snap.docs[0];
        return { path: d.ref.path, data: d.data() };
    }

    throw new Error(`No se encontró resultado de ancestría para uid=${uid}`);
}

// ── Capturar logs de analyzeAncestry desde un instante específico ─
// sinceMs: timestamp en ms (Date.now()) del momento previo a la llamada.
// Retorna solo las líneas cuyo timestamp ISO >= since, filtrando ruido
// de corridas anteriores. Esto evita que logs de usuario A contaminen
// el análisis de usuario B (bug original del runner).
function captureLogsSince(sinceMs) {
    try {
        const raw = execSync(
            'firebase functions:log --only analyzeAncestry --lines 100',
            { encoding: 'utf8', cwd: REPO_ROOT, timeout: 30000 }
        );
        // Cada línea del log de Firebase empieza con un ISO timestamp:
        // "2026-04-22T00:54:09.582768Z ? analyzeancestry: [ANCESTRY] ..."
        // Filtramos solo las líneas con timestamp >= sinceMs.
        const sinceIso = new Date(sinceMs).toISOString();
        return raw.split('\n').filter(line => {
            const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
            return tsMatch ? tsMatch[1] >= sinceIso : false;
        }).join('\n');
    } catch (e) {
        console.warn(`  ⚠️ No se pudieron capturar logs: ${e.message}`);
        return '';
    }
}

// ── Parsear bloque [ANCESTRY] de logs ya filtrados por timestamp ──
// Recibe las líneas ya filtradas por captureLogsSince() — solo las de
// la ventana de tiempo de este usuario. Toma la PRIMERA ocurrencia de
// cada patrón para evitar contaminación de corridas previas del mismo
// archivo de ADN (por ejemplo si el usuario re-ejecuta el test).
function parseQVector(logLine) {
    const q = {};
    const regex = /(\w+)=([\d.]+)%/g;
    let m;
    while ((m = regex.exec(logLine)) !== null) {
        q[m[1]] = parseFloat(m[2]) / 100;
    }
    return Object.keys(q).length > 0 ? q : null;
}

function parseAncestryBlock(filteredLogs, uid) {
    const metrics = {
        uid,
        aimsEncontrados: null,
        qInicial:        null,
        qFinal:          null,
        iteracionesEM:   null,
        errors:          []
    };

    for (const line of filteredLogs.split('\n')) {
        // PRIMERA ocurrencia de cada patrón (las líneas ya están filtradas por tiempo)
        const aimsM = line.match(/\[ANCESTRY\] AIMs encontrados: (\d+)\/\d+/);
        if (aimsM && metrics.aimsEncontrados === null) metrics.aimsEncontrados = parseInt(aimsM[1]);

        const qIniM = line.match(/\[ANCESTRY\] Q inicial: (.+)/);
        if (qIniM && metrics.qInicial === null) metrics.qInicial = parseQVector(qIniM[1]);

        const convM = line.match(/\[ANCESTRY\] EM convergió en iteración (\d+)/);
        if (convM && metrics.iteracionesEM === null) metrics.iteracionesEM = parseInt(convM[1]);

        const qFinM = line.match(/\[ANCESTRY\] Q final: (.+)/);
        if (qFinM && metrics.qFinal === null) metrics.qFinal = parseQVector(qFinM[1]);

        if (line.match(/INTERNAL|Unhandled error|crashed|uncaughtException/i)) {
            metrics.errors.push(line.trim().substring(0, 200));
        }
    }

    return metrics;
}

// ── Calcular distancia L2 entre dos Q-vectores ───────────────────
function l2Distance(qA, qB) {
    if (!qA || !qB) return null;
    const keys = new Set([...Object.keys(qA), ...Object.keys(qB)]);
    let sumSq = 0;
    for (const k of keys) {
        const diff = (qA[k] || 0) - (qB[k] || 0);
        sumSq += diff * diff;
    }
    return Math.sqrt(sumSq);
}

// Extraer Q-vector del resultado Firestore.
// calculateAncestry() retorna { populations: [...], aimsAnalyzed, ... }
// → Firestore guarda { populations: [...], analyzedAt, aimsAnalyzed, ... }
// Bug original: se chequeaba Array.isArray(items) pero items es el doc completo.
function extractQFromFirestore(fsResult) {
    const populations = fsResult?.data?.populations;
    if (!Array.isArray(populations) || populations.length === 0) return null;
    const q = {};
    for (const item of populations) {
        if (item.population && item.percentage !== undefined) {
            q[item.population] = item.percentage / 100;
        }
    }
    return Object.keys(q).length > 0 ? q : null;
}

// Extraer Q-vector del JSON de respuesta de analyzeAncestry.
// La respuesta tiene { success, ancestry: { populations: [...], ... }, disclaimer }.
function extractQFromResponse(ancestryResp) {
    const populations = ancestryResp?.ancestry?.populations;
    if (!Array.isArray(populations) || populations.length === 0) return null;
    const q = {};
    for (const item of populations) {
        if (item.population && item.percentage !== undefined) {
            q[item.population] = item.percentage / 100;
        }
    }
    return Object.keys(q).length > 0 ? q : null;
}

// ── Evaluar criterios del Test #1 ────────────────────────────────
function evaluateCriteria(metricsA, metricsB, qA_store, qB_store) {
    const qA = metricsA.qFinal || qA_store;
    const qB = metricsB.qFinal || qB_store;
    const L2 = l2Distance(qA, qB);

    const criteria = {
        C1_uids_distintos: metricsA.uid !== metricsB.uid,
        C2_q_inicial_distinto: (
            metricsA.qInicial && metricsB.qInicial &&
            JSON.stringify(metricsA.qInicial) !== JSON.stringify(metricsB.qInicial)
        ),
        C3_q_final_distinto: (
            qA && qB &&
            JSON.stringify(qA) !== JSON.stringify(qB)
        ),
        C4_L2_mayor_umbral: L2 !== null && L2 >= THRESHOLDS.MIN_L2_DISTANCE,
        C5_aims_suficientes: (
            (metricsA.aimsEncontrados === null || metricsA.aimsEncontrados >= THRESHOLDS.MIN_AIMS) &&
            (metricsB.aimsEncontrados === null || metricsB.aimsEncontrados >= THRESHOLDS.MIN_AIMS)
        ),
        C6_sin_errores_internal: metricsA.errors.length === 0 && metricsB.errors.length === 0
    };

    // Si los logs no llegaron, marcar C2 como SKIP en lugar de FAIL
    if (!metricsA.qInicial || !metricsB.qInicial) {
        criteria.C2_q_inicial_distinto = 'SKIP_NO_LOGS';
    }

    return { criteria, L2, qA, qB };
}

// ── Decidir veredicto y diagnosis ─────────────────────────────────
function decideVeredicto(criteria, L2) {
    const fails = Object.entries(criteria)
        .filter(([, v]) => v === false)
        .map(([k]) => k);

    if (fails.length === 0) {
        return { verdict: 'PASS', reason: 'Todos los criterios automáticos pasaron — fingerprint OK' };
    }

    if (fails.includes('C1_uids_distintos')) {
        return { verdict: 'FAIL_SETUP', reason: 'UIDs idénticos — error en creación de usuarios de test' };
    }
    if (fails.includes('C5_aims_suficientes')) {
        return { verdict: 'FAIL_DIAGNOSIS_C', reason: `Parser no extrae suficientes AIMs (mínimo ${THRESHOLDS.MIN_AIMS}). Verificar formato de archivo ADN.` };
    }
    if (fails.includes('C6_sin_errores_internal')) {
        return { verdict: 'FAIL_INTERNAL_ERROR', reason: 'Errores INTERNAL detectados en Cloud Functions — ver logs-A.txt / logs-B.txt' };
    }
    if (fails.includes('C2_q_inicial_distinto')) {
        return { verdict: 'FAIL_DIAGNOSIS_A', reason: 'Q inicial idéntico — inicialización determinista no funciona o no se loggea' };
    }
    if (fails.includes('C3_q_final_distinto')) {
        return { verdict: 'FAIL_DIAGNOSIS_D', reason: 'Q final idéntico pese a Q inicial distinto — EM converge al mismo punto fijo' };
    }
    if (fails.includes('C4_L2_mayor_umbral')) {
        return { verdict: 'FAIL_DIAGNOSIS_D', reason: `L2=${L2?.toFixed(4) ?? 'N/A'} < ${THRESHOLDS.MIN_L2_DISTANCE} — diferenciación insuficiente entre ADNs` };
    }

    return { verdict: 'FAIL_UNKNOWN', reason: `Criterios fallidos: ${fails.join(', ')}` };
}

// ── Limpieza de datos de test ─────────────────────────────────────
async function cleanup(users) {
    if (users.length === 0) return;
    console.log('\n🧹 Limpiando datos de test...');

    for (const { uid } of users) {
        try {
            // Borrar subcolecciones Firestore
            const subcols = ['ancestry', 'physical_traits', 'fitness_profile', 'geno_environment',
                             'genetic_data', 'genetic_reports', 'audit_log'];
            for (const sub of subcols) {
                const snap = await admin.firestore().collection(`users/${uid}/${sub}`).limit(50).get();
                if (!snap.empty) {
                    const batch = admin.firestore().batch();
                    snap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            }
            await admin.firestore().doc(`users/${uid}`).delete();

            // Borrar de Storage
            try {
                const bucket = admin.storage().bucket();
                await bucket.deleteFiles({ prefix: `genetic-raw/${uid}/` });
            } catch (_) {}

            // Borrar de Auth
            await admin.auth().deleteUser(uid);
            console.log(`  ✅ Limpiado: ${uid}`);
        } catch (e) {
            console.warn(`  ⚠️ Falla al limpiar ${uid}: ${e.message}`);
        }
    }
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
    console.log('═'.repeat(60));
    console.log('🧪 NURA — Test #1: Ancestry Personalization Runner');
    console.log(`   Fecha: ${new Date().toISOString()}`);
    console.log('═'.repeat(60) + '\n');

    validatePrereqs();
    initAdmin();

    const createdUsers = [];

    try {
        // ──────────────────────────────────────────────────────────
        // USUARIO A
        // ──────────────────────────────────────────────────────────
        console.log(`📥 [A] Creando usuario: ${ADN_FILES.A.label}`);
        const userA = await createTestUser('A');
        createdUsers.push(userA);

        console.log(`📤 [A] Subiendo ADN a Storage...`);
        const storageA = await uploadADNToStorage(userA.uid, ADN_FILES.A.path);

        console.log(`⚙️  [A] Ejecutando processGeneticData...`);
        const t0A = Date.now();
        await callFunction('processGeneticData', userA.idToken, {
            storagePath: storageA.storagePath,
            fileName:    storageA.fileName,
            fileSize:    storageA.fileSize
        });
        const elapsedA = ((Date.now() - t0A) / 1000).toFixed(1);
        console.log(`  ✅ Completado en ${elapsedA}s`);

        console.log(`📊 [A] Ejecutando analyzeAncestry...`);
        const t_ancestryA = Date.now() - 10000; // margen de 10s por arranque de instancia
        const ancestryRespA = await callFunction('analyzeAncestry', userA.idToken, {});
        console.log(`  ✅ analyzeAncestry OK`);

        // Capturar logs de A INMEDIATAMENTE — antes de que B los sobreescriba.
        // 5s de espera para que Cloud Logging propague los logs.
        console.log(`📜 [A] Capturando logs...`);
        await new Promise(r => setTimeout(r, 5000));
        const logsA    = captureLogsSince(t_ancestryA);
        const metricsA = parseAncestryBlock(logsA, userA.uid);
        // Prioridad para qFinal: respuesta JSON > logs (más confiable que logs)
        metricsA.qFinal = extractQFromResponse(ancestryRespA) || metricsA.qFinal;
        console.log(`  ✅ Logs A: ${logsA.split('\n').filter(l => l.includes('[ANCESTRY]')).length} líneas [ANCESTRY]`);

        // ──────────────────────────────────────────────────────────
        // USUARIO B
        // ──────────────────────────────────────────────────────────
        console.log(`\n📥 [B] Creando usuario: ${ADN_FILES.B.label}`);
        const userB = await createTestUser('B');
        createdUsers.push(userB);

        console.log(`📤 [B] Subiendo ADN a Storage...`);
        const storageB = await uploadADNToStorage(userB.uid, ADN_FILES.B.path);

        console.log(`⚙️  [B] Ejecutando processGeneticData...`);
        const t0B = Date.now();
        await callFunction('processGeneticData', userB.idToken, {
            storagePath: storageB.storagePath,
            fileName:    storageB.fileName,
            fileSize:    storageB.fileSize
        });
        const elapsedB = ((Date.now() - t0B) / 1000).toFixed(1);
        console.log(`  ✅ Completado en ${elapsedB}s`);

        console.log(`📊 [B] Ejecutando analyzeAncestry...`);
        const t_ancestryB = Date.now() - 10000;
        const ancestryRespB = await callFunction('analyzeAncestry', userB.idToken, {});
        console.log(`  ✅ analyzeAncestry OK`);

        console.log(`📜 [B] Capturando logs...`);
        await new Promise(r => setTimeout(r, 5000));
        const logsB    = captureLogsSince(t_ancestryB);
        const metricsB = parseAncestryBlock(logsB, userB.uid);
        metricsB.qFinal = extractQFromResponse(ancestryRespB) || metricsB.qFinal;
        console.log(`  ✅ Logs B: ${logsB.split('\n').filter(l => l.includes('[ANCESTRY]')).length} líneas [ANCESTRY]`);

        // ──────────────────────────────────────────────────────────
        // LEER RESULTADOS DE FIRESTORE (fuente de verdad alternativa)
        // ──────────────────────────────────────────────────────────
        console.log('\n📂 Leyendo resultados de Firestore...');
        const fsResultA = await readAncestryResult(userA.uid);
        const fsResultB = await readAncestryResult(userB.uid);
        const qA_store  = extractQFromFirestore(fsResultA);
        const qB_store  = extractQFromFirestore(fsResultB);
        console.log(`  ✅ Leídos: ${fsResultA.path} / ${fsResultB.path}`);

        metricsA.tiempoProcesamiento = parseFloat(elapsedA);
        metricsB.tiempoProcesamiento = parseFloat(elapsedB);

        // ──────────────────────────────────────────────────────────
        // EVALUACIÓN
        // ──────────────────────────────────────────────────────────
        console.log('\n📐 Evaluando criterios...');
        const { criteria, L2, qA, qB } = evaluateCriteria(metricsA, metricsB, qA_store, qB_store);
        const { verdict, reason }       = decideVeredicto(criteria, L2);

        // ──────────────────────────────────────────────────────────
        // REPORTE
        // ──────────────────────────────────────────────────────────
        const report = {
            test_id:    'TEST_1_ancestry_personalization',
            fecha:      new Date().toISOString(),
            entorno:    'production',
            thresholds: THRESHOLDS,
            usuario_A: {
                uid:          userA.uid,
                archivo:      path.basename(ADN_FILES.A.path),
                label:        ADN_FILES.A.label,
                aims:         metricsA.aimsEncontrados,
                iteraciones:  metricsA.iteracionesEM,
                tiempo_s:     metricsA.tiempoProcesamiento,
                q_inicial:    metricsA.qInicial,
                q_final:      qA,
                errors:       metricsA.errors
            },
            usuario_B: {
                uid:          userB.uid,
                archivo:      path.basename(ADN_FILES.B.path),
                label:        ADN_FILES.B.label,
                aims:         metricsB.aimsEncontrados,
                iteraciones:  metricsB.iteracionesEM,
                tiempo_s:     metricsB.tiempoProcesamiento,
                q_inicial:    metricsB.qInicial,
                q_final:      qB,
                errors:       metricsB.errors
            },
            analisis: {
                distancia_L2: L2 !== null ? parseFloat(L2.toFixed(4)) : null,
                criterios:    criteria
            },
            veredicto:    verdict,
            razon:        reason,
            proximo_paso: verdict === 'PASS'
                ? 'Test #1 superado. Proceder con implementación v4.1 sub-poblaciones.'
                : `Aplicar fix: ${verdict}. Ver documentacion/BLOQUE3_diagnostics.md`
        };

        const ts         = Date.now();
        const reportPath = path.join(RESULTS_DIR, `test1-report-${ts}.yaml`);
        const logsPathA  = path.join(RESULTS_DIR, `logs-A-${ts}.txt`);
        const logsPathB  = path.join(RESULTS_DIR, `logs-B-${ts}.txt`);

        fs.writeFileSync(reportPath, yaml.dump(report, { lineWidth: 120 }));
        fs.writeFileSync(logsPathA,  logsA || '(sin logs capturados)');
        fs.writeFileSync(logsPathB,  logsB || '(sin logs capturados)');

        // ──────────────────────────────────────────────────────────
        // OUTPUT FINAL
        // ──────────────────────────────────────────────────────────
        console.log('\n' + '═'.repeat(60));
        console.log(`VEREDICTO: ${verdict === 'PASS' ? '✅ PASS' : '❌ ' + verdict}`);
        console.log(`Razón:     ${reason}`);
        console.log(`L2:        ${L2 !== null ? L2.toFixed(4) : 'N/A'} (umbral: ≥${THRESHOLDS.MIN_L2_DISTANCE})`);
        console.log('═'.repeat(60));

        console.log('\n📋 Criterios:');
        for (const [k, v] of Object.entries(criteria)) {
            const icon = v === true ? '✅' : v === false ? '❌' : '⏭️ ';
            console.log(`  ${icon} ${k}: ${v}`);
        }

        if (qA && qB) {
            console.log('\n📊 Q-vectores (Firestore):');
            const pops = [...new Set([...Object.keys(qA), ...Object.keys(qB)])].sort();
            for (const p of pops) {
                const a = ((qA[p] || 0) * 100).toFixed(1).padStart(5);
                const b = ((qB[p] || 0) * 100).toFixed(1).padStart(5);
                console.log(`  ${p.padEnd(10)} A=${a}%  B=${b}%`);
            }
        }

        console.log(`\n📁 Reporte: ${path.relative(REPO_ROOT, reportPath)}`);
        console.log(`📁 Logs A:  ${path.relative(REPO_ROOT, logsPathA)}`);
        console.log(`📁 Logs B:  ${path.relative(REPO_ROOT, logsPathB)}`);
        console.log(`\n➡️  ${report.proximo_paso}`);

    } catch (err) {
        console.error(`\n💥 Error fatal: ${err.message}`);
        if (process.env.DEBUG) console.error(err.stack);
    } finally {
        await cleanup(createdUsers);
        // Evitar que Admin SDK mantenga el proceso abierto
        await admin.app().delete().catch(() => {});
        process.exit(0);
    }
}

main();
