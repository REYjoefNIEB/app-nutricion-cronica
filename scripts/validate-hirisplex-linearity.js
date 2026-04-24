'use strict';
/**
 * validate-hirisplex-linearity.js
 *
 * Validates that the HIrisPlex webtool hair model is additive (multinomial logit).
 *
 * Check 1 — intra-SNP linearity: β_from_het ≈ β_from_hom/2
 * Check 2 — inter-SNP additivity: predicted(A+B) ≈ baseline + β_A + β_B
 *
 * If FAIL: model has epistasis / is not additive → extracted coefficients are
 *          approximate and the audit report should note uncertainty.
 */
const path = require('path');
const fs   = require('fs');

const RESULTS_JSON = path.join(__dirname, 'validation-data', 'hirisplex_oracle_results.json');
const TOLERANCE    = 0.01;

const HAIR_SNPS = [
    'rs312262906', 'rs11547464', 'rs885479',  'rs1805008',
    'rs1805005',   'rs1805006',  'rs1805007',  'rs1805009',
    'rs201326893', 'rs2228479',  'rs1110400',  'rs28777',
    'rs16891982',  'rs12821256', 'rs4959270',  'rs12203592',
    'rs1042602',   'rs1800407',  'rs2402130',  'rs12913832',
    'rs2378249',   'rs12896399', 'rs1393350',  'rs683',
];

const LINEAR_PAIRS = [
    [0,  19, 'rs312262906', 'rs12913832'],
    [13,  7, 'rs12821256',  'rs1805009'],
    [12, 14, 'rs16891982',  'rs4959270'],
];

const CATS = ['blond', 'brown', 'red'];

function logR(p, q) {
    if (!p || !q || p <= 0 || q <= 0) return null;
    return Math.log(p / q);
}

const results = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf8'));
const base    = results['Q0_baseline'];
if (!base) { console.error('Missing Q0_baseline in results'); process.exit(1); }

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  validate-hirisplex-linearity.js                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(`  Baseline: blond=${base.blond} brown=${base.brown} red=${base.red} black=${base.black}\n`);

// ─── Check 1: β_het ≈ β_hom/2 ────────────────────────────────────────────────
console.log('─── Check 1: intra-SNP linearity (β_het ≈ β_hom/2) ─────────────\n');

let check1Pass = 0, check1Fail = 0, check1Skip = 0;
const check1Errors = [];

for (let i = 0; i < HAIR_SNPS.length; i++) {
    const rsid   = HAIR_SNPS[i];
    const hetKey = `Q${i + 1}_het_${rsid}`;
    const homKey = `Q${i + 25}_hom_${rsid}`;
    const het    = results[hetKey];
    const hom    = results[homKey];

    if (!het || !hom) {
        check1Skip++;
        console.log(`  ⚠ SKIP ${rsid}: missing oracle data`);
        continue;
    }

    let maxDelta = 0;
    for (const cat of CATS) {
        const lr_base = logR(base[cat], base.black);
        const lr_het  = logR(het[cat],  het.black);
        const lr_hom  = logR(hom[cat],  hom.black);
        if (lr_base === null || lr_het === null || lr_hom === null) continue;
        const beta_het = lr_het - lr_base;
        const beta_hom = (lr_hom - lr_base) / 2;
        const delta    = Math.abs(beta_het - beta_hom);
        if (delta > maxDelta) maxDelta = delta;
    }

    const ok = maxDelta < TOLERANCE;
    ok ? check1Pass++ : check1Fail++;
    if (!ok) check1Errors.push({ rsid, maxDelta: maxDelta.toFixed(4) });
    console.log(`  ${ok ? '✅' : '🔴'} ${rsid.padEnd(14)} maxΔ=${maxDelta.toFixed(4)} (tol ${TOLERANCE})`);
}

console.log(`\n  Result: ${check1Pass}/${HAIR_SNPS.length - check1Skip} pass | ${check1Fail} fail | ${check1Skip} skip\n`);

// ─── Check 2: inter-SNP additivity ───────────────────────────────────────────
console.log('─── Check 2: inter-SNP additivity (A+B ≈ β_A + β_B) ────────────\n');

let check2Pass = 0, check2Fail = 0;

const LINEAR_KEYS = [
    'Q49_linear_rs312262906_rs12913832',
    'Q50_linear_rs12821256_rs1805009',
    'Q51_linear_rs16891982_rs4959270',
];

for (let li = 0; li < LINEAR_PAIRS.length; li++) {
    const [a, b, rA, rB] = LINEAR_PAIRS[li];
    const hetA = results[`Q${a + 1}_het_${rA}`];
    const hetB = results[`Q${b + 1}_het_${rB}`];
    const lin  = results[LINEAR_KEYS[li]];

    if (!hetA || !hetB || !lin) {
        console.log(`  ⚠ SKIP ${rA}+${rB}: missing oracle data`);
        continue;
    }

    let maxDelta = 0;
    for (const cat of CATS) {
        const lr_base  = logR(base[cat], base.black);
        const beta_A   = logR(hetA[cat], hetA.black) - lr_base;
        const beta_B   = logR(hetB[cat], hetB.black) - lr_base;
        const expected = lr_base + beta_A + beta_B;
        const observed = logR(lin[cat], lin.black);
        if (expected === null || observed === null) continue;
        const delta = Math.abs(expected - observed);
        if (delta > maxDelta) maxDelta = delta;
    }

    const ok = maxDelta < TOLERANCE;
    ok ? check2Pass++ : check2Fail++;
    console.log(`  ${ok ? '✅' : '🔴'} ${rA} + ${rB}: maxΔ=${maxDelta.toFixed(4)} (tol ${TOLERANCE})`);
}

console.log(`\n  Result: ${check2Pass}/3 pass | ${check2Fail} fail\n`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('════════════════════════════════════════════════════════════════');
const totalFail = check1Fail + check2Fail;
if (totalFail === 0) {
    console.log('✅ LINEARITY PASS — model is additive. Oracle valid for extraction.');
    console.log('   Proceed with extract-hair-coefficients-audit.js');
} else {
    console.log(`⚠  ${totalFail} linearity check(s) failed — model may have minor non-linearity`);
    if (check1Errors.length) {
        console.log('   Intra-SNP issues:');
        check1Errors.forEach(e => console.log(`     ${e.rsid}: maxΔ=${e.maxDelta}`));
    }
    console.log('   Extraction will proceed; audit report will note uncertainty.');
}
process.exit(0);  // non-zero linearity is a warning, not a blocker for audit
