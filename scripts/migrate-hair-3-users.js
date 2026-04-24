'use strict';
/**
 * scripts/migrate-hair-3-users.js
 *
 * Migración one-shot: recalcula traits.hair_color para los 3 usuarios
 * desconocidos con predicciones pre-fix commit 4e6b9b1 (rs12203592 blond sign).
 *
 * Uso:
 *   node scripts/migrate-hair-3-users.js           # dry-run (solo muestra delta)
 *   node scripts/migrate-hair-3-users.js --write   # ejecuta escritura
 *
 * Requiere scripts/nura-33fc1-service-account.json (gitignored) y
 * GENETIC_MASTER_KEY en el entorno.
 *
 * Safety:
 *   - Dry-run por defecto.
 *   - Aborta ante NaN, valores inválidos, o brown < 20%.
 *   - Solo actualiza traits.hair_color — NO toca el resto del documento.
 *   - Aborts on first error — no procesa más UIDs si uno falla.
 */
const path  = require('path');
const admin = require('firebase-admin');
const { decryptGeneticData } = require(path.join(__dirname, '..', 'functions', 'security', 'encryption'));
const { predictHairColor }   = require(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex'));

const sa = require('./nura-33fc1-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'nura-33fc1' });

const TARGET_UIDS = [
    'JdE9gpJFx9ZJv8DyuHb7JPxuY2l2',
    'Qd3cl9SezKZO1mXzhzZDRRhcZyF2',
    't5vJ1snmCqOdMJ8NT3i4svSByS02',
];

const WRITE_MODE = process.argv.includes('--write');

// ── Helpers ────────────────────────────────────────────────────────────────────
function validateHair(p, uid) {
    for (const [k, v] of Object.entries(p)) {
        if (typeof v !== 'number' || isNaN(v)) throw new Error(`NaN in hair.${k} for ${uid}`);
    }
    const sum = p.black + p.brown + p.blond + p.red;
    if (Math.abs(sum - 100) > 1) throw new Error(`Probabilities don't sum to 100 (${sum}) for ${uid}`);
    if (p.brown < 0 || p.blond < 0 || p.black < 0 || p.red < 0) throw new Error(`Negative probability for ${uid}`);
}

function d(label, before, after) {
    const delta = (after - before).toFixed(1);
    const sign  = delta >= 0 ? '+' : '';
    return `  ${label.padEnd(8)} ${String(before).padStart(5)}% → ${String(after).padStart(5)}%   ${sign}${delta}pp`;
}

// ── Per-UID processing ─────────────────────────────────────────────────────────
async function processUser(uid, masterKey, db) {
    console.log(`\n─── UID: ${uid} ───────────────────────────────────────────────`);

    // 1. Leer doc actual
    const traitsSnap = await db
        .collection('users').doc(uid)
        .collection('physical_traits').doc('result')
        .get();

    if (!traitsSnap.exists) {
        console.log('  ⚠  No tiene physical_traits/result — saltando.');
        return { uid, skipped: true };
    }

    const traitsDoc  = traitsSnap.data();
    const curHair    = traitsDoc.traits?.hair_color;
    const curProbs   = curHair?.hirisplex?.probabilities || {};
    // True if old document has actual hirisplex probabilities (not legacy format)
    const hasOldHirisplex = typeof curProbs.brown === 'number';

    console.log('  Actual en Firestore:');
    console.log(`    brown=${curProbs.brown ?? 'N/A'}%  black=${curProbs.black ?? 'N/A'}%  blond=${curProbs.blond ?? 'N/A'}%  red=${curProbs.red ?? 'N/A'}%  [hirisplex: ${hasOldHirisplex ? 'yes' : 'no — legacy format'}]`);

    // 2. Leer y descifrar genotipos
    const geneSnap = await db
        .collection('users').doc(uid)
        .collection('genetic_data').doc('profile')
        .get();

    if (!geneSnap.exists) {
        throw new Error(`genetic_data/profile no existe para ${uid} pese a tener physical_traits/result — inconsistencia de datos`);
    }

    const raw     = geneSnap.data();
    const profile = (raw.encrypted && masterKey)
        ? decryptGeneticData(raw, uid, masterKey)
        : raw.data;

    if (!profile?.snps) throw new Error(`No se pudo descifrar el perfil genético de ${uid}`);

    const genotypes = {};
    for (const [rsid, val] of Object.entries(profile.snps)) {
        genotypes[rsid] = typeof val === 'string' ? val : (val?.genotype ?? null);
    }
    console.log(`  SNPs disponibles: ${Object.keys(genotypes).length}`);

    // 3. Recalcular con código post-fix
    const hairResult = predictHairColor(genotypes);
    if (!hairResult) throw new Error(`predictHairColor devolvió null para ${uid} — ¿falta rs12913832?`);

    const { prediction, confidence, probabilities: p, snpsUsed, snpsTotal, position, isAboveThreshold, validated } = hairResult;
    validateHair(p, uid);

    console.log('  Nuevo (post-fix):');
    console.log(`    brown=${p.brown}%  black=${p.black}%  blond=${p.blond}%  red=${p.red}%`);

    // 4. Delta
    const cats     = ['black', 'brown', 'blond', 'red'];
    let maxDelta   = 0;
    console.log('  Delta:');
    for (const cat of cats) {
        const before = curProbs[cat] ?? 0;
        const after  = p[cat];
        const delta  = Math.abs(after - before);
        if (delta > maxDelta) maxDelta = delta;
        console.log(d(cat, before, after));
    }

    // 5. Escalation check: delta > 30pp es sospechoso — ONLY when old doc has hirisplex data.
    //    If old doc is legacy format (no hirisplex field), delta vs 0 is meaningless.
    if (hasOldHirisplex && maxDelta > 30) {
        throw new Error(`Delta máximo ${maxDelta.toFixed(1)}pp > 30pp para ${uid} — cambio inesperadamente grande, abort`);
    }
    if (!hasOldHirisplex) {
        console.log('  ℹ  Documento antiguo sin campo hirisplex — primera inserción de predicción HIrisPlex.');
    }

    // 6. Construir nuevo objeto hair_color (mismo formato que analyzePhysicalTraits)
    const probNote  = `${p.black}% negro · ${p.brown}% castaño · ${p.blond}% rubio · ${p.red}% pelirrojo`;
    const newHairColor = {
        name:      'Color de cabello',
        icon:      '💇',
        category:  'appearance',
        evidence:  'high',
        sliderMin: 'Negro',
        sliderMax: 'Rubio',
        value:     prediction,
        confidence,
        note:      `HIrisPlex (${snpsUsed}/${snpsTotal} SNPs): ${probNote}.${validated ? '' : ' Coeficientes aproximados — validar con webtool.'}`,
        position,
        hirisplex: { probabilities: p, isAboveThreshold },
    };

    // 7. Escribir solo si --write
    if (WRITE_MODE) {
        await db
            .collection('users').doc(uid)
            .collection('physical_traits').doc('result')
            .update({
                'traits.hair_color': newHairColor,
                'analyzedAt': admin.firestore.FieldValue.serverTimestamp(),
            });
        console.log('  ✅ Escrito a Firestore (solo traits.hair_color).');
    } else {
        console.log('  🔍 Dry-run — NO escrito.');
    }

    return { uid, maxDelta, written: WRITE_MODE, skipped: false };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
    const masterKey = process.env.GENETIC_MASTER_KEY;
    if (!masterKey) { console.error('ERROR: GENETIC_MASTER_KEY no cargada'); process.exit(1); }

    const db = admin.firestore();

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  migrate-hair-3-users.js                                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`  Modo  : ${WRITE_MODE ? '⚠  WRITE (--write activo)' : '🔍 DRY-RUN'}`);
    console.log(`  UIDs  : ${TARGET_UIDS.length}`);
    console.log(`  Fix   : rs12203592 blond −1.29 (commit 4e6b9b1)\n`);

    const results = [];
    for (const uid of TARGET_UIDS) {
        try {
            const r = await processUser(uid, masterKey, db);
            results.push(r);
        } catch (err) {
            console.error(`\n❌ ERROR en ${uid}: ${err.message}`);
            console.error('   Abortando — no se procesan más UIDs.');
            process.exit(1);
        }
    }

    // ── Resumen ────────────────────────────────────────────────────────────────
    const processed  = results.filter(r => !r.skipped);
    const significant = processed.filter(r => r.maxDelta > 1);
    const negligible  = processed.filter(r => r.maxDelta <= 1);
    const skipped     = results.filter(r => r.skipped);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('  Resumen');
    console.log(`  Procesados              : ${processed.length}`);
    console.log(`  Delta > 1pp (relevante) : ${significant.length}`);
    console.log(`  Delta ≤ 1pp (trivial)   : ${negligible.length}`);
    console.log(`  Saltados (sin traits)   : ${skipped.length}`);

    if (!WRITE_MODE && processed.length > 0) {
        console.log('\n  Para ejecutar la escritura:');
        console.log('  node scripts/migrate-hair-3-users.js --write');
    }
    if (WRITE_MODE && processed.length > 0) {
        console.log('\n✅ Migración completada. Verificar con:');
        console.log('   node scripts/count-users-with-traits.js');
    }
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
