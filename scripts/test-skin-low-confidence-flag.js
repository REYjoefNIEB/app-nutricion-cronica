'use strict';
/**
 * Test del flag lowConfidenceAncestry en predictSkinColor.
 * Casos cubiertos:
 *   - Europeo puro + skin pale → NO flag (eur >= 0.50)
 *   - Yoruba puro + skin pale → SÍ flag (eur < 0.50)
 *   - Yoruba puro + skin dark_to_black → NO flag (label correcto, sin riesgo)
 *   - Mestizo 30% EUR + skin pale → SÍ flag
 *   - Sin ancestría → NO flag (fail-safe)
 *   - Ancestría malformada → NO flag (fail-safe)
 *
 * Nota: predictSkinColor exige >=3 SNPs reales para no devolver null. Usamos
 * los genotipos del archivo Kenneth (synthetic_brca_carrier.txt = Kenneth con
 * la línea i4000377 modificada, irrelevante para los 35 SNPs de skin).
 * Kenneth es europeo, así que la predicción será 'pale' o 'very_pale' → ideal
 * para ejercitar las branches del flag.
 */

const fs = require('fs');
const path = require('path');
const { parse23andMe } = require('../functions/genetics/parser');
const { predictSkinColor } = require('../functions/traits/hirisplex');

const KENNETH_PATH = path.join(__dirname, '..', 'dna-test-data', 'synthetic_brca_carrier.txt');
if (!fs.existsSync(KENNETH_PATH)) {
    console.error('FATAL: Kenneth proxy file not found at', KENNETH_PATH);
    process.exit(1);
}
const raw = fs.readFileSync(KENNETH_PATH, 'utf8');
const parsed = parse23andMe(raw);
// Flatten {rsid: {genotype:'CC',...}} → {rsid:'CC'} (same shape index.js feeds to predictPigmentation)
const kennethGenotypes = {};
for (const [rsid, snpData] of Object.entries(parsed.snps)) {
    kennethGenotypes[rsid] = snpData.genotype;
}

let passed = 0, failed = 0;

function assert(name, cond, expected) {
    const ok = cond === expected;
    console.log(`  ${ok ? '[PASS]' : '[FAIL]'} ${name}`);
    if (!ok) console.log(`    expected ${JSON.stringify(expected)}, got ${JSON.stringify(cond)}`);
    ok ? passed++ : failed++;
}

console.log('=== Skin low-confidence-by-ancestry flag tests ===\n');

// === Caso 1: europeo puro ===
const europeoAncestry = { macroRegions: { EUR: 0.95, AFR: 0.02, EAS: 0.01, SAS: 0.01, AMR_NAT: 0.01 } };
const r1 = predictSkinColor(kennethGenotypes, europeoAncestry);
console.log(`Caso 1 — Europeo (EUR=0.95):  predictionKey=${r1.predictionKey}`);
assert('Europeo + cualquier label → NO flag', r1.lowConfidenceAncestry, null);

// === Caso 2: yoruba puro ===
const yorubaAncestry = { macroRegions: { EUR: 0.003, AFR: 0.984, EAS: 0.005, SAS: 0.003, AMR_NAT: 0.005 } };
const r2 = predictSkinColor(kennethGenotypes, yorubaAncestry);
console.log(`\nCaso 2 — Yoruba (EUR=0.003): predictionKey=${r2.predictionKey}`);
if (r2.predictionKey === 'pale' || r2.predictionKey === 'very_pale') {
    assert('Yoruba + label claro → SÍ flag', r2.lowConfidenceAncestry?.flag, true);
    assert('Yoruba + label claro → reason correcto', r2.lowConfidenceAncestry?.reason, 'non_european_ancestry_with_light_skin_prediction');
    assert('Yoruba + label claro → eurFraction redondeado', r2.lowConfidenceAncestry?.eurFraction, 0.003);
} else {
    assert('Yoruba + label oscuro → NO flag', r2.lowConfidenceAncestry, null);
}

// === Caso 3: sin ancestría → fail-safe ===
const r3 = predictSkinColor(kennethGenotypes, null);
console.log(`\nCaso 3 — Sin ancestría:        predictionKey=${r3.predictionKey}`);
assert('Sin ancestría → NO flag (fail-safe)', r3.lowConfidenceAncestry, null);

// === Caso 4: ancestría malformada (objeto sin macroRegions) ===
const r4 = predictSkinColor(kennethGenotypes, { foo: 'bar' });
console.log(`\nCaso 4 — Malformada {foo:bar}: predictionKey=${r4.predictionKey}`);
assert('Ancestría malformada → NO flag (fail-safe)', r4.lowConfidenceAncestry, null);

// === Caso 4b: ancestría con macroRegions vacío ===
const r4b = predictSkinColor(kennethGenotypes, { macroRegions: {} });
console.log(`\nCaso 4b — macroRegions vacío:  predictionKey=${r4b.predictionKey}`);
assert('macroRegions sin EUR → NO flag (fail-safe)', r4b.lowConfidenceAncestry, null);

// === Caso 5: mestizo borderline (29% EUR) ===
const mestizoAncestry = { macroRegions: { EUR: 0.29, AFR: 0.05, EAS: 0.10, SAS: 0.02, AMR_NAT: 0.54 } };
const r5 = predictSkinColor(kennethGenotypes, mestizoAncestry);
console.log(`\nCaso 5 — Mestizo (EUR=0.29):   predictionKey=${r5.predictionKey}`);
if (r5.predictionKey === 'pale' || r5.predictionKey === 'very_pale') {
    assert('Mestizo + label claro → SÍ flag', r5.lowConfidenceAncestry?.flag, true);
} else {
    console.log('  (mestizo dio label distinto a pale/very_pale, skip assert)');
}

// === Caso 6: borderline EUR=0.50 (debe NO disparar — el threshold es <0.50 estricto) ===
const borderlineAncestry = { macroRegions: { EUR: 0.50, AFR: 0.30, EAS: 0.10, SAS: 0.05, AMR_NAT: 0.05 } };
const r6 = predictSkinColor(kennethGenotypes, borderlineAncestry);
console.log(`\nCaso 6 — Borderline (EUR=0.50): predictionKey=${r6.predictionKey}`);
assert('EUR=0.50 exacto → NO flag (umbral estricto <0.50)', r6.lowConfidenceAncestry, null);

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`PASS: TODOS LOS TESTS PASARON (${passed}/${passed + failed})`);
    process.exitCode = 0;
} else {
    console.log(`FAIL: ${failed} TEST(S) FALLARON (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
