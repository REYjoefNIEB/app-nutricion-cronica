'use strict';
/**
 * e2e-hirisplex-geroe.js
 *
 * Test end-to-end con genotipos reales de GEroe:
 *   1. Lee hirisplex_genotypes.json (extraído hoy de Firestore con masterKey)
 *   2. Llama a predictEyeColor, predictHairColor, predictSkinColor del módulo LOCAL
 *   3. Compara contra valores de referencia del brief actual en producción
 *   4. Reporta deltas — criterios de aceptación:
 *       eye brown  Δ < 0.1%
 *       hair brown Δ < 0.5%
 *       skin       Δ < 1.0% por categoría
 */
const path = require('path');
const { predictEyeColor, predictHairColor, predictSkinColor } =
    require(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex'));

// ── Genotipos reales GEroe (de Firestore, extraídos hoy) ─────────────────────
const geno_data = require('./validation-data/hirisplex_genotypes.json');
const genotypes  = geno_data.GEroe.genotypes;

// ── Valores de referencia (producción antes del fix) ────────────────────────
const REF = {
    eye:  { brown: 77.8, intermediate: 13.2, blue: 9.0 },
    hair: { brown: 66.0, black: 16.8, blond: 17.2, red: 0.0 },  // post-palindromic-fix baseline (rs1805009 GG→count=0 correcto)
    skin: null,  // no baseline disponible para skin — se reporta sin delta
};

const TOLERANCE = { eye: 0.1, hair: 0.5, skin: 1.0 };

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  e2e-hirisplex-geroe.js — test end-to-end post-fix          ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(`Genotipos disponibles: ${geno_data.GEroe.present}/41 SNPs`);
console.log(`Faltantes: ${geno_data.GEroe.missing.join(', ')}\n`);

let totalFail = 0;

// ── EYE ──────────────────────────────────────────────────────────────────────
console.log('─── Eye Color ──────────────────────────────────────────────────\n');
const eyeResult = predictEyeColor(genotypes);
if (!eyeResult) {
    console.log('❌ predictEyeColor returned null — rs12913832 missing?');
    totalFail++;
} else {
    const { prediction, probabilities, snpsUsed, snpsTotal } = eyeResult;
    console.log(`Predicción: ${prediction} (${snpsUsed}/${snpsTotal} SNPs)`);
    console.log(`  blue=${probabilities.blue}%  intermediate=${probabilities.intermediate}%  brown=${probabilities.brown}%`);

    for (const [cat, ref] of Object.entries(REF.eye)) {
        const actual = parseFloat(probabilities[cat]);
        const delta  = Math.abs(actual - ref);
        const ok     = delta <= TOLERANCE.eye;
        if (!ok) totalFail++;
        console.log(`  ${ok ? '✅' : '🔴'} ${cat}: actual=${actual}% | ref=${ref}% | Δ=${delta.toFixed(2)}% (tol ±${TOLERANCE.eye}%)`);
    }
}

// ── HAIR ─────────────────────────────────────────────────────────────────────
console.log('\n─── Hair Color ─────────────────────────────────────────────────\n');
const hairResult = predictHairColor(genotypes);
if (!hairResult) {
    console.log('❌ predictHairColor returned null');
    totalFail++;
} else {
    const { prediction, probabilities, snpsUsed, snpsTotal } = hairResult;
    console.log(`Predicción: ${prediction} (${snpsUsed}/${snpsTotal} SNPs)`);
    console.log(`  black=${probabilities.black}%  brown=${probabilities.brown}%  blond=${probabilities.blond}%  red=${probabilities.red}%`);

    for (const [cat, ref] of Object.entries(REF.hair)) {
        const actual = parseFloat(probabilities[cat]);
        const delta  = Math.abs(actual - ref);
        const ok     = delta <= TOLERANCE.hair;
        if (!ok) totalFail++;
        console.log(`  ${ok ? '✅' : '🔴'} ${cat}: actual=${actual}% | ref=${ref}% | Δ=${delta.toFixed(2)}% (tol ±${TOLERANCE.hair}%)`);
    }
}

// ── SKIN ─────────────────────────────────────────────────────────────────────
console.log('\n─── Skin Color ─────────────────────────────────────────────────\n');
const skinResult = predictSkinColor(genotypes);
if (!skinResult) {
    console.log('❌ predictSkinColor returned null');
    totalFail++;
} else {
    const { prediction, probabilities, snpsUsed, snpsTotal } = skinResult;
    console.log(`Predicción: ${prediction} (${snpsUsed}/${snpsTotal} SNPs)`);
    for (const [cat, pct] of Object.entries(probabilities)) {
        console.log(`  ${cat}: ${pct}%`);
    }
    console.log('  (sin baseline de producción — reportado sin delta)');
}

// ── Resultado ─────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
if (totalFail === 0) {
    console.log('✅ END-TO-END PASS — todos los deltas dentro de tolerancia');
    console.log('   LISTO PARA DEPLOY selectivo.');
} else {
    console.log(`🔴 END-TO-END FAIL — ${totalFail} check(s) fuera de tolerancia`);
    console.log('   NO deployar.');
}
process.exit(totalFail > 0 ? 1 : 0);
