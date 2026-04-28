'use strict';
/**
 * Tests del helper validateAncestryPrerequisites.
 * Verifica que la lógica extraída del refactor mantiene exactamente
 * el comportamiento original de analyzeAncestry (pre-Sprint 2).
 */

const path = require('path');
const fs = require('fs');
const { validateAncestryPrerequisites } = require('../functions/ancestry/calculator');
const { AIMS } = require('../functions/ancestry/referenceData');
const { parse23andMe } = require('../functions/genetics/parser');

let passed = 0, failed = 0;

function assert(name, cond, expectedDesc) {
    console.log(`  ${cond ? '[PASS]' : '[FAIL]'} ${name}`);
    if (!cond && expectedDesc) console.log(`     ${expectedDesc}`);
    cond ? passed++ : failed++;
}

console.log('\n=== Tests validateAncestryPrerequisites ===\n');

// ── Caso 1: snps vacío sin metadata → invalid-argument (totalSnps=0 < 100000) ──
const r1 = validateAncestryPrerequisites({});
assert('snps vacío → valid: false', r1.valid === false);
assert('snps vacío → matchedAimsCount: 0', r1.matchedAimsCount === 0);
assert('snps vacío → errorCode: invalid-argument', r1.errorCode === 'invalid-argument');
assert('snps vacío → errorMessage menciona "incompleto"', /incompleto/i.test(r1.errorMessage));

// ── Caso 2: snps null/undefined → defensive ──
const r2 = validateAncestryPrerequisites(null);
assert('snps null → valid: false', r2.valid === false);
assert('snps null → matchedAimsCount: 0', r2.matchedAimsCount === 0);

// ── Caso 3: 100+ AIMs presentes (snps suficientes) → valid ──
const manyAimsSnps = {};
for (let i = 0; i < 100; i++) {
    manyAimsSnps[AIMS[i].rsid] = { genotype: 'AA' };
}
const r3 = validateAncestryPrerequisites(manyAimsSnps);
assert('100 AIMs presentes → valid: true', r3.valid === true);
assert('100 AIMs presentes → matchedAimsCount: 100', r3.matchedAimsCount === 100);
assert('100 AIMs presentes → sin errorCode', !r3.errorCode);

// ── Caso 4: pocos AIMs + totalSnpsInFile bajo → invalid-argument ──
const fewAims = {};
for (let i = 0; i < 10; i++) fewAims[AIMS[i].rsid] = { genotype: 'AA' };
const r4 = validateAncestryPrerequisites(fewAims, { totalSnpsInFile: 500 });
assert('10 AIMs + 500 totalSnps → invalid-argument', r4.errorCode === 'invalid-argument');
assert('10 AIMs + 500 totalSnps → mensaje incompleto', /incompleto/i.test(r4.errorMessage));

// ── Caso 5: pocos AIMs + totalSnpsInFile alto → failed-precondition (chip insuficiente) ──
const r5 = validateAncestryPrerequisites(fewAims, { totalSnpsInFile: 700000, fileFormat: '23andMe' });
assert('10 AIMs + 700K totalSnps → failed-precondition', r5.errorCode === 'failed-precondition');
assert('10 AIMs + 700K totalSnps → mensaje "chip"', /chip/i.test(r5.errorMessage));
assert('10 AIMs + 700K totalSnps → menciona formato', /23andMe/.test(r5.errorMessage));
assert('10 AIMs + 700K totalSnps → menciona el conteo', /\b10\b/.test(r5.errorMessage));

// ── Caso 6: borderline en el umbral (MIN_SNPS = 50) ──
const exact49 = {};
for (let i = 0; i < 49; i++) exact49[AIMS[i].rsid] = { genotype: 'AA' };
const r6 = validateAncestryPrerequisites(exact49, { totalSnpsInFile: 700000 });
assert('49 AIMs (umbral - 1) → invalid', r6.valid === false);
assert('49 AIMs → matchedAimsCount: 49', r6.matchedAimsCount === 49);

const exact50 = {};
for (let i = 0; i < 50; i++) exact50[AIMS[i].rsid] = { genotype: 'AA' };
const r7 = validateAncestryPrerequisites(exact50, { totalSnpsInFile: 700000 });
assert('50 AIMs (umbral exacto) → valid', r7.valid === true);
assert('50 AIMs → matchedAimsCount: 50', r7.matchedAimsCount === 50);

// ── Caso 7: archivo real Kenneth (23andMe v3) → valid ──
const KENNETH_PATH = 'C:/Users/joefj/Downloads/genome_Kenneth_Reitz_v3_Full.txt';
if (fs.existsSync(KENNETH_PATH)) {
    const raw = fs.readFileSync(KENNETH_PATH, 'utf8');
    const parsed = parse23andMe(raw);
    const r8 = validateAncestryPrerequisites(parsed.snps, {
        totalSnpsInFile: parsed.metadata?.totalSnps,
        fileFormat:      parsed.metadata?.format
    });
    console.log(`  (Kenneth: ${r8.matchedAimsCount} AIMs detectados, totalSnps=${parsed.metadata?.totalSnps})`);
    assert('Kenneth real → valid: true', r8.valid === true);
    assert('Kenneth real → matchedAimsCount >> 50', r8.matchedAimsCount > 50);
} else {
    console.log('  (Kenneth file not available, skipping caso 7)');
}

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`[OK] Tests pasados: ${passed}/${passed + failed}`);
    process.exitCode = 0;
} else {
    console.log(`[FAIL] ${failed} test(s) fallaron (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
