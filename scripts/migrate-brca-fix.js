'use strict';
/**
 * scripts/migrate-brca-fix.js
 *
 * Re-procesa los reportes genéticos de usuarios afectados por el bug BRCA
 * falso positivo (commit 710a494). Recalcula el reporte completo usando el
 * código corregido (referenceGenotype con D/I notation) y actualiza
 * Firestore en:
 *   - users/{uid}/genetic_reports/{lastReportId}  — reporte completo
 *   - users/{uid}.geneticProfile                  — perfil compacto (includes medicalConsultsNeeded)
 *
 * Uso:
 *   node scripts/migrate-brca-fix.js              # dry-run (muestra delta, no escribe)
 *   node scripts/migrate-brca-fix.js --write      # ejecuta escritura
 *
 * Requiere:
 *   scripts/nura-33fc1-service-account.json (gitignored)
 *   GENETIC_MASTER_KEY en el entorno
 *
 * Safety:
 *   - Dry-run por defecto.
 *   - Aborta ante error de desencriptación o estructura de reporte inválida.
 *   - Muestra delta de cancer_risks antes/después por cada UID.
 *   - Aborts on first error — no procesa más UIDs si uno falla.
 */

const path   = require('path');
const admin  = require('firebase-admin');

const { decryptGeneticData }         = require(path.join(__dirname, '..', 'functions', 'security', 'encryption'));
const { generateGeneticReport }      = require(path.join(__dirname, '..', 'functions', 'genetics', 'analyzer'));
const { extractRelevantSNPs }        = require(path.join(__dirname, '..', 'functions', 'genetics', 'parser'));
const { NURA_SNP_DATABASE }          = require(path.join(__dirname, '..', 'functions', 'genetics', 'snpDatabase'));

const sa = require('./nura-33fc1-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'nura-33fc1' });

const WRITE_MODE = process.argv.includes('--write');

// ── Inline _extractGeneticProfile (equivalente al privado de index.js) ────────
function extractGeneticProfile(fullReport) {
    const profile = {
        foodIntolerances: [], foodAllergies: [], metabolicSensitivities: [],
        flags: {
            lactoseIntolerant: false, celiacRisk: false, glutenSensitive: false,
            slowCaffeine: false, alcoholSensitive: false, histamineSensitive: false,
            sodiumSensitive: false, fructoseIntolerant: false,
            peanutAllergy: false, seafoodAllergy: false, eggMilkAllergy: false,
            diabetesRisk: false, hypertensionRisk: false, cholesterolRisk: false,
            ironOverload: false, apoeE4Carrier: false
        },
        pharmaAlerts: [], medicalConsultsNeeded: []
    };
    for (const r of fullReport.detailed_results.food_intolerances) {
        if (r.status !== 'risk') continue;
        profile.foodIntolerances.push({ condition: r.condition, severity: r.severity, foods: r.linkedFoods });
        if (r.condition === 'intolerancia_lactosa')    profile.flags.lactoseIntolerant = true;
        if (r.condition === 'predisposicion_celiaca')  profile.flags.celiacRisk = true;
        if (r.condition === 'sensibilidad_gluten')     profile.flags.glutenSensitive = true;
        if (r.condition === 'metabolismo_cafeina')     profile.flags.slowCaffeine = true;
        if (r.condition === 'intolerancia_alcohol')    profile.flags.alcoholSensitive = true;
        if (r.condition === 'intolerancia_histamina')  profile.flags.histamineSensitive = true;
        if (r.condition === 'sensibilidad_sodio')      profile.flags.sodiumSensitive = true;
        if (r.condition === 'intolerancia_fructosa')   profile.flags.fructoseIntolerant = true;
        if (r.gene === 'APOE' && r.userGenotype === 'CC') profile.flags.apoeE4Carrier = true;
    }
    for (const r of fullReport.detailed_results.food_allergies) {
        if (r.status !== 'risk') continue;
        profile.foodAllergies.push({ condition: r.condition, severity: r.severity, foods: r.linkedFoods });
        if (r.condition === 'predisposicion_alergia_mani')      profile.flags.peanutAllergy = true;
        if (r.condition === 'predisposicion_alergia_mariscos')  profile.flags.seafoodAllergy = true;
        if (r.condition === 'predisposicion_alergia_huevo')     profile.flags.eggMilkAllergy = true;
    }
    for (const r of fullReport.detailed_results.metabolic_risks) {
        if (r.status !== 'risk') continue;
        profile.metabolicSensitivities.push({ condition: r.condition, severity: r.severity, gene: r.gene });
        if (r.condition === 'riesgo_diabetes_t2')      profile.flags.diabetesRisk = true;
        if (r.condition === 'riesgo_hipertension')     profile.flags.hypertensionRisk = true;
        if (r.condition === 'riesgo_colesterol_alto')  profile.flags.cholesterolRisk = true;
        if (r.condition === 'riesgo_hemocromatosis')   profile.flags.ironOverload = true;
    }
    for (const r of fullReport.detailed_results.pharmacogenomics) {
        if (r.status !== 'risk') continue;
        profile.pharmaAlerts.push({ gene: r.gene, drugs: r.affectedDrugs, action: r.action });
    }
    for (const cat of ['food_intolerances', 'food_allergies', 'metabolic_risks', 'cancer_risks']) {
        for (const r of fullReport.detailed_results[cat]) {
            if (r.status === 'risk' && r.requiresMedicalConsult) {
                profile.medicalConsultsNeeded.push({
                    gene: r.gene, condition: r.condition,
                    specialty: r.referralSpecialty, severity: r.severity
                });
            }
        }
    }
    return profile;
}

// ── Per-UID processing ─────────────────────────────────────────────────────────
async function processUser(uid, masterKey, db) {
    console.log(`\n─── UID: ${uid} ─────────────────────────────────────────`);

    // 1. Leer perfil genético cifrado
    const geneSnap = await db.collection('users').doc(uid)
        .collection('genetic_data').doc('profile').get();

    if (!geneSnap.exists) {
        console.log('  ⚠  Sin genetic_data/profile — saltando.');
        return { uid, skipped: true };
    }

    const raw     = geneSnap.data();
    const profile = (raw.encrypted && masterKey)
        ? decryptGeneticData(raw, uid, masterKey)
        : raw.data;

    if (!profile?.snps) throw new Error(`No se pudo descifrar perfil para ${uid}`);

    const snpCount = Object.keys(profile.snps).length;
    console.log(`  SNPs en genetic_data/profile: ${snpCount}`);

    // 2. Leer usuario para patologías/medicamentos
    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap.data() || {};
    const userProfile = {
        uid,
        pathologies: userData.enfermedades || [],
        medications:  userData.medications  || {}
    };
    const lastReportId = userData.lastGeneticReport;
    if (!lastReportId) {
        console.log('  ⚠  Sin lastGeneticReport en usuario — saltando.');
        return { uid, skipped: true };
    }

    // 3. Leer reporte actual (para comparar delta)
    const oldReportSnap = await db.collection('users').doc(uid)
        .collection('genetic_reports').doc(lastReportId).get();

    const oldCancerRisks = oldReportSnap.exists
        ? (oldReportSnap.data()?.detailed_results?.cancer_risks || [])
        : [];

    const oldBRCA = oldCancerRisks.filter(r =>
        r.status === 'risk' && (r.gene === 'BRCA1' || r.gene === 'BRCA2')
    );

    console.log(`  Reporte actual: ${lastReportId}`);
    console.log(`  BRCA antes:     ${oldBRCA.length > 0
        ? oldBRCA.map(r => `${r.name} (${r.acmgClassification})`).join(', ')
        : 'ninguno (o ya corregido)'}`);

    // 4. Recalcular con código post-fix
    const { relevantSnps, foundCount } = extractRelevantSNPs(profile.snps, NURA_SNP_DATABASE);
    console.log(`  SNPs relevantes: ${foundCount}/${Object.keys(NURA_SNP_DATABASE).length}`);

    const newReport = generateGeneticReport(relevantSnps, userProfile);

    const newCancerRisks = newReport.detailed_results.cancer_risks.filter(r => r.status === 'risk');
    const newBRCA = newCancerRisks.filter(r => r.gene === 'BRCA1' || r.gene === 'BRCA2');

    console.log(`  BRCA después:   ${newBRCA.length > 0
        ? newBRCA.map(r => `${r.name} (${r.acmgClassification})`).join(', ')
        : 'ninguno ✅'}`);

    const brcaFixed = oldBRCA.length > 0 && newBRCA.length === 0;
    const brcaStillPresent = newBRCA.length > 0;
    if (brcaStillPresent) {
        console.log(`  ⚠⚠  BRCA SIGUE PRESENTE post-fix — revisar genotipo.`);
        // Mostrar genotipos BRCA para inspección
        const brcaRsids = ['rs80357906', 'rs80357713', 'rs80359550'];
        for (const rsid of brcaRsids) {
            const snp = profile.snps[rsid];
            if (snp) console.log(`     ${rsid}: ${snp.genotype ?? snp}`);
            else     console.log(`     ${rsid}: no genotipado por chip`);
        }
    }

    // 5. Escribir (solo con --write)
    if (WRITE_MODE) {
        const newGeneticProfile = extractGeneticProfile(newReport);

        await db.collection('users').doc(uid)
            .collection('genetic_reports').doc(lastReportId)
            .update({
                'summary':          newReport.summary,
                'recommendations':  newReport.recommendations,
                'detailed_results': newReport.detailed_results,
                'disclaimer':       newReport.disclaimer,
                'migratedAt':       admin.firestore.FieldValue.serverTimestamp(),
                'migratedBy':       'migrate-brca-fix.js (commit 710a494)'
            });

        await db.collection('users').doc(uid).update({
            'geneticProfile':    newGeneticProfile,
            'geneticReportDate': admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`  ✅ Reporte y geneticProfile actualizados en Firestore.`);
    } else {
        console.log(`  🔍 Dry-run — NO escrito.`);
    }

    return { uid, brcaFixed, brcaStillPresent, oldBRCA: oldBRCA.length, newBRCA: newBRCA.length, skipped: false };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
    const masterKey = process.env.GENETIC_MASTER_KEY;
    if (!masterKey) { console.error('ERROR: GENETIC_MASTER_KEY no cargada'); process.exit(1); }

    const db = admin.firestore();

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  migrate-brca-fix.js                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`  Modo : ${WRITE_MODE ? '⚠  WRITE (--write activo)' : '🔍 DRY-RUN'}`);
    console.log(`  Fix  : referenceGenotype D/I notation (commit 710a494)\n`);

    // Descubrir todos los UIDs con genetic_data/profile
    const usersSnap = await db.collection('users').get();
    const targetUids = [];
    for (const userDoc of usersSnap.docs) {
        const gDoc = await db.collection('users').doc(userDoc.id)
            .collection('genetic_data').doc('profile').get();
        if (gDoc.exists) targetUids.push(userDoc.id);
    }
    console.log(`  UIDs con genetic data: ${targetUids.length}\n`);

    const results = [];
    for (const uid of targetUids) {
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
    const processed   = results.filter(r => !r.skipped);
    const fixed       = processed.filter(r => r.brcaFixed);
    const stillWrong  = processed.filter(r => r.brcaStillPresent);
    const clean       = processed.filter(r => !r.brcaFixed && !r.brcaStillPresent);
    const skipped     = results.filter(r => r.skipped);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('  Resumen');
    console.log(`  Procesados             : ${processed.length}`);
    console.log(`  BRCA falso positivo → corregido: ${fixed.length}`);
    console.log(`  BRCA sigue presente (revisar): ${stillWrong.length}`);
    console.log(`  Sin BRCA (ya estaban bien):   ${clean.length}`);
    console.log(`  Saltados:              ${skipped.length}`);

    if (stillWrong.length > 0) {
        console.log('\n  ⚠⚠  ATENCIÓN: algunos usuarios siguen con BRCA flagueado.');
        console.log('       Revisar genotipos arriba — puede ser portador real.');
    }

    if (!WRITE_MODE && processed.length > 0) {
        console.log('\n  Para ejecutar la escritura:');
        console.log('  GENETIC_MASTER_KEY=... node scripts/migrate-brca-fix.js --write');
    }
    if (WRITE_MODE && processed.length > 0) {
        console.log('\n✅ Migración completada. Verificar con:');
        console.log('   node scripts/count-users-with-genetic-data.js');
    }
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); });
