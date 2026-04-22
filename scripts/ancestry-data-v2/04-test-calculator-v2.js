#!/usr/bin/env node
/**
 * Unit tests for functions/ancestry/calculator.js (B3, K=9).
 * Run from project root: node scripts/ancestry-data-v2/04-test-calculator-v2.js
 */
'use strict';

const path = require('path');
const { computeAncestry, _countMinorAlleles, _internals } = require(
    path.join(__dirname, '..', '..', 'functions', 'ancestry', 'calculator')
);
const { AIMS, POPULATIONS } = require(
    path.join(__dirname, '..', '..', 'functions', 'ancestry', 'referenceData_v2')
);
const { binomialLikelihood, generateUserFingerprint, seededRandom } = _internals;

// ── Helpers ──────────────────────────────────────────────────────────────────

function pass(name) { console.log(`  ✅ ${name}`); }
function fail(name, msg) { console.log(`  ❌ ${name}: ${msg}`); process.exitCode = 1; }

function assert(condition, testName, msg) {
    condition ? pass(testName) : fail(testName, msg);
}

/**
 * Build a synthetic SNP map that looks like a 100% member of targetPop.
 * For each AIM: if freq(targetPop) > 0.5 → homozygous minor; else → homozygous major.
 */
function makeSyntheticSnps(targetPop, aimSubset = null) {
    const snps = {};
    const source = aimSubset ?? AIMS;
    for (const aim of source) {
        const freq = aim.frequencies[targetPop] ?? 0.5;
        const gt   = freq > 0.5
            ? aim.minorAllele + aim.minorAllele
            : aim.majorAllele + aim.majorAllele;
        snps[aim.rsid] = { genotype: gt };
    }
    return snps;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

let total = 0;

function runTest(name, fn) {
    total++;
    console.log(`\nTEST ${total}: ${name}`);
    try {
        fn();
    } catch (e) {
        fail(name, 'threw unexpectedly: ' + e.message);
    }
}

// ── TEST 1: Synthetic 100% European → EUR macro-region > 50% ─────────────────
runTest('Synthetic EUR_N genotype → macroRegions.EUR > 0.50', () => {
    const snps   = makeSyntheticSnps('EUR_N');
    const result = computeAncestry(snps);
    const eur    = result.macroRegions.EUR ?? 0;
    assert(eur > 0.50, 'macroRegions.EUR > 0.50', `got EUR=${(eur * 100).toFixed(1)}%`);
    console.log(`     EUR=${(eur * 100).toFixed(1)}%  AFR=${((result.macroRegions.AFR ?? 0) * 100).toFixed(1)}%  AMR_NAT=${((result.macroRegions.AMR_NAT ?? 0) * 100).toFixed(1)}%`);
});

// ── TEST 2: Synthetic 100% African (AFR_W) → AFR macro-region > 50% ──────────
runTest('Synthetic AFR_W genotype → macroRegions.AFR > 0.50', () => {
    const snps   = makeSyntheticSnps('AFR_W');
    const result = computeAncestry(snps);
    const afr    = result.macroRegions.AFR ?? 0;
    assert(afr > 0.50, 'macroRegions.AFR > 0.50', `got AFR=${(afr * 100).toFixed(1)}%`);
    console.log(`     AFR=${(afr * 100).toFixed(1)}%  EUR=${((result.macroRegions.EUR ?? 0) * 100).toFixed(1)}%`);
});

// ── TEST 3: Determinism — same input produces identical output ────────────────
runTest('Determinism: same input → same output', () => {
    const snps    = makeSyntheticSnps('SAS');
    const result1 = computeAncestry(snps);
    const result2 = computeAncestry(snps);

    const same = POPULATIONS.every(pop =>
        result1.populations[pop] === result2.populations[pop]
    );
    assert(same,
        'all sub-pop proportions identical across two runs',
        'mismatch: ' + POPULATIONS
            .filter(p => result1.populations[p] !== result2.populations[p])
            .map(p => `${p}: ${result1.populations[p]} vs ${result2.populations[p]}`)
            .join(', ')
    );
    assert(result1.fingerprint === result2.fingerprint,
        'fingerprint identical',
        `${result1.fingerprint} vs ${result2.fingerprint}`
    );
});

// ── TEST 4: Two different users → different fingerprints ─────────────────────
runTest('Two distinct inputs → different fingerprints', () => {
    const snpsA = makeSyntheticSnps('EUR_N');
    const snpsB = makeSyntheticSnps('AFR_W');
    const fpA   = generateUserFingerprint(AIMS.slice(0, 30), snpsA);
    const fpB   = generateUserFingerprint(AIMS.slice(0, 30), snpsB);
    assert(fpA !== fpB, 'fingerprints differ', `both = ${fpA}`);
    console.log(`     fpA=${fpA.substring(0, 12)}...  fpB=${fpB.substring(0, 12)}...`);
});

// ── TEST 5: Input with <50 AIMs → throws error ────────────────────────────────
runTest('Sparse input (<50 AIMs) → throws MIN_SNPS error', () => {
    const fewAims = AIMS.slice(0, 20);
    const snps    = makeSyntheticSnps('EUR_N', fewAims);
    let threw = false;
    let msg   = '';
    try {
        computeAncestry(snps);
    } catch (e) {
        threw = true;
        msg   = e.message;
    }
    assert(threw, 'throws when AIMs < MIN_SNPS', 'no error thrown');
    assert(msg.includes('50'), 'error mentions minimum (50)', `got: "${msg}"`);
});

// ── TEST 6: Sum of all populations === 1.0 (within floating point) ────────────
runTest('Sum of populations Q-vector === 1.0', () => {
    const snps   = makeSyntheticSnps('EAS_CN');
    const result = computeAncestry(snps);
    const sum    = Object.values(result.populations).reduce((s, v) => s + v, 0);
    // Tolerance 1e-5: rounding each of 8 sub-pops to 6 decimals accumulates up to 8*0.5e-6 = 4e-6
    const ok     = Math.abs(sum - 1.0) < 1e-5;
    assert(ok, `sum ≈ 1.0 (got ${sum.toFixed(10)})`, `deviation: ${Math.abs(sum - 1).toExponential(3)}`);
    console.log(`     sum=${sum.toFixed(10)}`);
});

// ── Bonus: binomialLikelihood sanity ─────────────────────────────────────────
runTest('binomialLikelihood sanity check', () => {
    const sum0 = binomialLikelihood(0, 0.3) + binomialLikelihood(1, 0.3) + binomialLikelihood(2, 0.3);
    assert(Math.abs(sum0 - 1.0) < 1e-12, 'P(0)+P(1)+P(2) = 1 at p=0.3', `got ${sum0}`);
    assert(binomialLikelihood(2, 1.0) === 1.0, 'P(2|p=1)=1', `got ${binomialLikelihood(2, 1.0)}`);
    assert(binomialLikelihood(0, 0.0) === 1.0, 'P(0|p=0)=1', `got ${binomialLikelihood(0, 0.0)}`);
});

// ── Bonus: _countMinorAlleles ─────────────────────────────────────────────────
runTest('_countMinorAlleles correctness', () => {
    assert(_countMinorAlleles('AG', 'A') === 1, 'AG,A → 1', '');
    assert(_countMinorAlleles('AA', 'A') === 2, 'AA,A → 2', '');
    assert(_countMinorAlleles('GG', 'A') === 0, 'GG,A → 0', '');
    assert(_countMinorAlleles('GG', 'G') === 2, 'GG,G → 2', '');
    assert(_countMinorAlleles('--', 'A') === 0, '--,A → 0', '');
    assert(_countMinorAlleles('CT', 'C') === 1, 'CT,C → 1', '');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(55));
const exitCode = process.exitCode ?? 0;
console.log(`B3 resultado: ${exitCode === 0 ? '✅ PASS — todos los tests OK' : '❌ REVISAR — ver fallos arriba'}`);
console.log('═'.repeat(55));
