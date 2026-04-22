#!/usr/bin/env node
/**
 * Test #1.5 — Calibración Clínica del Algoritmo de Ancestría (NURA 4.1-A)
 *
 * Valida que el Q-vector de cada ADN de referencia cumple criterios clínicos:
 *   - El componente dominante declarado supera el umbral esperado.
 *   - Los componentes no-esperados permanecen bajo los umbrales de plausibilidad.
 *
 * Criterios (basados en literatura 1000G + HGDP):
 *   European: EUR ≥ 55%, AFR < 15%, AMR_NAT < 15%, EAS < 15%
 *
 * ADNs de referencia:
 *   A — Corpas padre (español andaluz) — figshare dataset 92682
 *   B — Sporny (European American)    — github.com/msporny/dna
 *   C — Greshake (European)           — openSNP user 1 (pendiente descarga)
 */
'use strict';

try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch (_) {}

const admin  = require('firebase-admin');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const http   = require('http');
const yaml   = require('js-yaml');

const PROJECT_ID = 'nura-33fc1';
const REGION     = 'us-central1';
const FUNCTION_URLS = {
    processGeneticData: `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/processGeneticData`,
    analyzeAncestry:    `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/analyzeAncestry`
};

const SA_PATH  = path.join(__dirname, 'nura-33fc1-service-account.json');
const DATA_DIR = path.join(__dirname, 'test-data');
const OUT_DIR  = path.join(__dirname, 'test-results');

// ── Samples ─────────────────────────────────────────────────────────
const SAMPLES = [
    {
        label:            'Corpas padre (español andaluz)',
        file:             'adn-A-corpas-padre.txt',
        expectedDominant: 'EUR',
        criteria: { EUR: { min: 55 }, AFR: { max: 15 }, AMR_NAT: { max: 15 }, EAS: { max: 15 } }
    },
    {
        label:            'Sporny (European American)',
        file:             'adn-B-sporny.txt',
        expectedDominant: 'EUR',
        criteria: { EUR: { min: 55 }, AFR: { max: 15 }, AMR_NAT: { max: 15 }, EAS: { max: 15 } }
    }
    // ADN-C Greshake (pendiente):
    // { label: 'Greshake (European)', file: 'adn-C-greshake.txt', expectedDominant: 'EUR',
    //   criteria: { EUR: { min: 55 }, AFR: { max: 15 }, AMR_NAT: { max: 15 }, EAS: { max: 15 } } }
];

// ── Init ─────────────────────────────────────────────────────────────
if (!fs.existsSync(SA_PATH)) { console.error('❌ Falta nura-33fc1-service-account.json'); process.exit(1); }
if (!process.env.FIREBASE_WEB_API_KEY) { console.error('❌ Falta FIREBASE_WEB_API_KEY en scripts/.env'); process.exit(1); }

admin.initializeApp({
    credential:    admin.credential.cert(require(SA_PATH)),
    projectId:     PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`
});
const db     = admin.firestore();
const bucket = admin.storage().bucket();

// ── Helpers (mismo patrón que test1-runner.js) ────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const lib  = parsedUrl.protocol === 'https:' ? https : http;
        const body = options.body ? Buffer.from(options.body, 'utf8') : null;
        const reqOptions = {
            hostname: parsedUrl.hostname,
            path:     parsedUrl.pathname + parsedUrl.search,
            method:   options.method || 'GET',
            headers:  { ...(options.headers || {}), ...(body ? { 'Content-Length': body.length } : {}) }
        };
        const req = lib.request(reqOptions, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => resolve({
                ok:   res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                text: () => Promise.resolve(data),
                json: () => Promise.resolve(JSON.parse(data))
            }));
        });
        req.on('error', reject);
        req.setTimeout(90000, () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

async function createTestUser(label) {
    const ts    = Date.now();
    const slug  = label.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    const email = `nura-test15-${slug}-${ts}@test.nura.app`;
    const userRecord = await admin.auth().createUser({
        email,
        password:      'NuraTest123!',
        displayName:   `Test ${label}`,
        emailVerified: true
    });

    // Crear doc Firestore con legal_consent (requerido por processGeneticData)
    await db.doc(`users/${userRecord.uid}`).set({
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

    // Custom token → ID token
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    const resp = await httpFetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_WEB_API_KEY}`,
        {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token: customToken, returnSecureToken: true })
        }
    );
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Error en custom token para ${label}: ${txt}`);
    }
    const { idToken } = await resp.json();
    return { uid: userRecord.uid, idToken };
}

async function uploadADN(uid, localFilePath) {
    const fileName   = path.basename(localFilePath);
    const remotePath = `genetic-raw/${uid}/${Date.now()}_${fileName}`;
    await bucket.upload(localFilePath, {
        destination: remotePath,
        metadata:    { contentType: 'text/plain' }
    });
    return remotePath;
}

async function callFunction(fnName, idToken, data) {
    const resp = await httpFetch(FUNCTION_URLS[fnName], {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ data })
    });
    const body = await resp.json();
    if (!resp.ok || body.error) {
        const msg = body.error?.message || body.error || JSON.stringify(body);
        throw new Error(`${fnName} falló (${resp.status}): ${msg}`);
    }
    return body.result !== undefined ? body.result : body;
}

async function readAncestryResult(uid) {
    const doc = await db.doc(`users/${uid}/ancestry/result`).get();
    if (doc.exists) return doc.data();
    const snap = await db.collection(`users/${uid}/ancestry`).get();
    if (!snap.empty) return snap.docs[0].data();
    throw new Error(`No se encontró resultado de ancestría para uid=${uid}`);
}

async function cleanup(uid) {
    try { await admin.auth().deleteUser(uid); } catch (_) {}
    try {
        const snap = await db.collection(`users/${uid}/ancestry`).get();
        for (const d of snap.docs) await d.ref.delete().catch(() => {});
        await db.doc(`users/${uid}`).delete().catch(() => {});
    } catch (_) {}
    try {
        const [files] = await bucket.getFiles({ prefix: `genetic-raw/${uid}/` });
        for (const f of files) await f.delete().catch(() => {});
    } catch (_) {}
}

// ── Evaluador de criterios ────────────────────────────────────────
function extractQ(ancestryData) {
    const populations = ancestryData?.populations;
    if (!Array.isArray(populations) || populations.length === 0) return null;
    const q = {};
    for (const p of populations) {
        if (p.population && p.percentage !== undefined) q[p.population] = p.percentage;
    }
    return Object.keys(q).length > 0 ? q : null;
}

function evaluateCriteria(label, q, criteria, expectedDominant) {
    const checks = [];
    let pass = true;

    // Verificar componente dominante
    const sorted   = Object.entries(q).sort((a, b) => b[1] - a[1]);
    const dominantPop = sorted[0]?.[0];
    const dominantPct = sorted[0]?.[1] ?? 0;
    const dominantOk  = dominantPop === expectedDominant;
    checks.push({ criterion: `Dominante = ${expectedDominant}`, value: `${dominantPop}=${dominantPct.toFixed(1)}%`, pass: dominantOk });
    if (!dominantOk) pass = false;

    // Verificar umbrales numéricos
    for (const [pop, bounds] of Object.entries(criteria)) {
        const pct = q[pop] ?? 0;
        if (bounds.min !== undefined) {
            const ok = pct >= bounds.min;
            checks.push({ criterion: `${pop} ≥ ${bounds.min}%`, value: `${pct.toFixed(1)}%`, pass: ok });
            if (!ok) pass = false;
        }
        if (bounds.max !== undefined) {
            const ok = pct <= bounds.max;
            checks.push({ criterion: `${pop} ≤ ${bounds.max}%`, value: `${pct.toFixed(1)}%`, pass: ok });
            if (!ok) pass = false;
        }
    }

    return { label, q, pass, checks };
}

// ── Procesar una muestra ──────────────────────────────────────────
async function processSample(sample) {
    const filePath = path.join(DATA_DIR, sample.file);
    if (!fs.existsSync(filePath)) {
        return { label: sample.label, skipped: true, reason: `Archivo no encontrado: ${sample.file}` };
    }

    console.log(`\n  👤 Creando usuario...`);
    const { uid, idToken } = await createTestUser(sample.label);
    console.log(`     uid=${uid}`);

    try {
        console.log(`  📤 Subiendo ADN (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(1)} MB)...`);
        const storagePath = await uploadADN(uid, filePath);

        console.log(`  ⚙️  processGeneticData...`);
        const t0 = Date.now();
        await callFunction('processGeneticData', idToken, { storagePath, fileName: sample.file });
        console.log(`     OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

        console.log(`  📊 analyzeAncestry...`);
        const t1 = Date.now();
        await callFunction('analyzeAncestry', idToken, {});
        console.log(`     OK (${((Date.now() - t1) / 1000).toFixed(1)}s)`);

        // Esperar propagación Firestore
        await sleep(5000);

        const fsData = await readAncestryResult(uid);
        const q = extractQ(fsData);
        if (!q) throw new Error('Q-vectores vacíos en Firestore');

        return { label: sample.label, q, aimsAnalyzed: fsData.aimsAnalyzed };
    } finally {
        console.log(`  🧹 Limpiando uid=${uid}...`);
        await cleanup(uid);
    }
}

// ── Main ─────────────────────────────────────────────────────────
const POPULATIONS = ['EUR', 'AFR', 'EAS', 'AMR_NAT', 'SAS', 'OCE'];

async function main() {
    console.log('\n' + '═'.repeat(64));
    console.log('🔬 NURA — Test #1.5: Calibración Clínica de Ancestría v4.1-A');
    console.log(`   Fecha: ${new Date().toISOString()}`);
    console.log(`   Muestras configuradas: ${SAMPLES.length} (ADN-C Greshake pendiente)`);
    console.log('═'.repeat(64));

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const evaluations = [];

    for (const sample of SAMPLES) {
        console.log(`\n🧬 [${sample.label}]`);
        try {
            const result = await processSample(sample);

            if (result.skipped) {
                console.log(`  ⏭️  Omitido: ${result.reason}`);
                evaluations.push({ ...result, pass: null });
                continue;
            }

            const ev = evaluateCriteria(sample.label, result.q, sample.criteria, sample.expectedDominant);
            ev.aimsAnalyzed = result.aimsAnalyzed;
            evaluations.push(ev);

            console.log(`  ${ev.pass ? '✅ PASS' : '❌ FAIL'} — Criterios:`);
            for (const c of ev.checks) {
                console.log(`    ${c.pass ? '✅' : '❌'} ${c.criterion}: ${c.value}`);
            }
            const topPops = Object.entries(result.q).sort((a, b) => b[1] - a[1]).slice(0, 4);
            console.log(`  Q: ${topPops.map(([p, v]) => `${p}=${v.toFixed(1)}%`).join(', ')}`);
        } catch (e) {
            console.error(`  ❌ ERROR: ${e.message}`);
            evaluations.push({ label: sample.label, error: e.message, pass: false, checks: [] });
        }
    }

    // ── Tabla comparativa ────────────────────────────────────────
    console.log('\n' + '═'.repeat(64));
    console.log('📊 TABLA COMPARATIVA — Q-vectores observados vs esperados');
    console.log('═'.repeat(64));
    const colW = 7;
    const header = 'Muestra'.padEnd(32) + POPULATIONS.map(p => p.padStart(colW)).join('') + '  Veredicto';
    console.log(header);
    console.log('─'.repeat(header.length));

    for (const ev of evaluations) {
        if (ev.skipped) {
            console.log(`${'[omitido] ' + ev.label}`.padEnd(32) + '  ⏭️ ');
            continue;
        }
        if (ev.error) {
            console.log(`${ev.label.substring(0,31).padEnd(32)}  ❌ ERROR`);
            continue;
        }
        const row = POPULATIONS.map(p => `${(ev.q[p] ?? 0).toFixed(1)}%`.padStart(colW)).join('');
        console.log(`${ev.label.substring(0,31).padEnd(32)}${row}  ${ev.pass ? '✅' : '❌'}`);
    }

    console.log('─'.repeat(header.length));
    const expected = '(Esperado European)'.padEnd(32) + ['≥55%', '<15%', '<15%', '<15%', '---', '---'].map(v => v.padStart(colW)).join('');
    console.log(expected);

    // ── Veredicto final ──────────────────────────────────────────
    const evaluated = evaluations.filter(e => !e.skipped && !e.error);
    const passing   = evaluated.filter(e => e.pass).length;
    const overallPass = passing === evaluated.length && evaluated.length > 0;

    console.log(`\nVeredicto: ${overallPass ? '✅ PASS' : '❌ FAIL'} (${passing}/${evaluated.length} muestras)`);

    const pendingCount = SAMPLES.length - SAMPLES.filter(s => fs.existsSync(path.join(DATA_DIR, s.file))).length +
        1; // ADN-C siempre pendiente (comentado)
    if (pendingCount > 0) {
        console.log('\n⚠️  ADN-C Greshake pendiente:');
        console.log('   Descargar desde openSNP: https://opensnp.org/users/1');
        console.log('   Guardar como: scripts/test-data/adn-C-greshake.txt');
        console.log('   Descomentar en SAMPLES[] y re-ejecutar.');
    }

    // ── Guardar reporte YAML ─────────────────────────────────────
    const reportPath = path.join(OUT_DIR, `test1.5-report-${Date.now()}.yaml`);
    fs.writeFileSync(reportPath, yaml.dump({
        test_id:            'TEST_1_5_calibration',
        version_algoritmo:  'v4.1-A (minorAllele canónico por SNP)',
        fecha:              new Date().toISOString(),
        veredicto:          overallPass ? 'PASS' : 'FAIL',
        muestras_evaluadas: evaluated.length,
        muestras_pasadas:   passing,
        pendiente:          'ADN-C Greshake (European) — openSNP user 1',
        resultados:         evaluations.map(ev => ({
            label:         ev.label,
            pass:          ev.pass,
            skipped:       ev.skipped || false,
            error:         ev.error || null,
            aimsAnalyzed:  ev.aimsAnalyzed || null,
            q:             ev.q || null,
            criterios:     (ev.checks || []).map(c => ({ ...c }))
        }))
    }));
    console.log(`\n📁 Reporte: ${reportPath}`);
}

main().catch(e => { console.error('\nError fatal:', e.message); process.exit(1); });
