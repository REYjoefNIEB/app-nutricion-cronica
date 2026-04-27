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

// === Casos con shape PLANA (objeto que el callsite real pasa) ===

console.log('\n=== Tests con shape plana (sub-populations) ===\n');

// Caso 7: Europeo plano (EUR_N + EUR_S = 0.95) + label pale → NO flag
const europeoPlano = { EUR_N: 0.85, EUR_S: 0.10, AFR_W: 0.01, AFR_E: 0.01, EAS_CN: 0.01, EAS_JP: 0.01, SAS: 0.005, AMR_NAT: 0.005 };
const r7 = predictSkinColor(kennethGenotypes, europeoPlano);
console.log('Caso 7 — Europeo plano (EUR_N+EUR_S=0.95):', r7?.predictionKey);
assert('Europeo plano + label pale → NO flag', r7?.lowConfidenceAncestry, null);

// Caso 8: Yoruba plano (EUR_N + EUR_S ≈ 0.003) + label pale → SÍ flag
const yorubaPlano = { EUR_N: 0.001, EUR_S: 0.002, AFR_W: 0.500, AFR_E: 0.484, EAS_CN: 0.003, EAS_JP: 0.002, SAS: 0.003, AMR_NAT: 0.005 };
const r8 = predictSkinColor(kennethGenotypes, yorubaPlano);
console.log('Caso 8 — Yoruba plano (EUR=0.003):', r8?.predictionKey);
if (r8?.predictionKey === 'pale' || r8?.predictionKey === 'very_pale') {
    assert('Yoruba plano + label claro → SÍ flag',          r8.lowConfidenceAncestry?.flag, true);
    assert('Yoruba plano: eurFraction reconstruido correcto', Math.abs(r8.lowConfidenceAncestry.eurFraction - 0.003) < 0.001, true);
} else {
    console.log('  (Yoruba plano dio label distinto, skip assert flag)');
}

// Caso 9: Mestizo plano EUR=0.29 + label pale → SÍ flag
const mestizoPlano = { EUR_N: 0.15, EUR_S: 0.14, AFR_W: 0.025, AFR_E: 0.025, EAS_CN: 0.05, EAS_JP: 0.05, SAS: 0.02, AMR_NAT: 0.54 };
const r9 = predictSkinColor(kennethGenotypes, mestizoPlano);
console.log('Caso 9 — Mestizo plano (EUR=0.29):', r9?.predictionKey);
if (r9?.predictionKey === 'pale' || r9?.predictionKey === 'very_pale') {
    assert('Mestizo plano + label claro → SÍ flag', r9.lowConfidenceAncestry?.flag, true);
} else {
    console.log('  (mestizo plano dio label distinto, skip assert flag)');
}

// Caso 10: Fallback hardcodeado de index.js:2785 (TODOS en 0) → SÍ flag (caso degenerado, esperado)
// Documentado: este es el bug de orden onboarding, NO se ataca en este sprint.
// El flag SE activaría incorrectamente para usuarios europeos en este caso, pero
// el bug raíz es que ancestry no fue calculado, no la lógica del flag.
const fallbackPlano = { EUR_N: 0, EUR_S: 0, AFR_W: 0, AFR_E: 0, EAS_CN: 0, EAS_JP: 0, SAS: 0, AMR_NAT: 0 };
const r10 = predictSkinColor(kennethGenotypes, fallbackPlano);
console.log('Caso 10 — Fallback plano (todo 0):', r10?.predictionKey);
if (r10?.predictionKey === 'pale' || r10?.predictionKey === 'very_pale') {
    // Documentar comportamiento: el flag se activa porque eurFraction=0 < 0.50.
    // Esto es esperable y se cubre con el sprint futuro de orden onboarding.
    console.log('  NOTA: con fallback=0, flag se activa. Deuda documentada del orden onboarding (no se arregla en este sprint).');
    assert('Fallback (todo 0) → flag activado (comportamiento documentado)', r10.lowConfidenceAncestry?.flag, true);
} else {
    console.log('  (label no es pale/very_pale, skip assert)');
}

// Caso 11: Shape vacía sin keys conocidas → NO flag (fail-safe)
const r11 = predictSkinColor(kennethGenotypes, { random: 'data' });
assert('Shape sin EUR_N/EUR_S/macroRegions → NO flag', r11?.lowConfidenceAncestry, null);

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`PASS: TODOS LOS TESTS PASARON (${passed}/${passed + failed})`);
    process.exitCode = 0;
} else {
    console.log(`FAIL: ${failed} TEST(S) FALLARON (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
