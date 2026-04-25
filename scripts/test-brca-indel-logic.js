'use strict';
/**
 * scripts/test-brca-indel-logic.js
 *
 * Valida que la lógica de genotipos indel (D/I notation de 23andMe)
 * funcione correctamente para las variantes BRCA1/BRCA2.
 *
 * El bug original: referenceGenotype usaba notación SNP ('CC', 'TT', 'AA')
 * pero 23andMe reporta wildtype como 'II' (deleción) o 'DD' (inserción).
 * Resultado: todos los usuarios 23andMe recibían falso positivo BRCA.
 *
 * Uso:
 *   node scripts/test-brca-indel-logic.js
 */

const path = require('path');
const { matchesGenotype, analyzeSingleSNP } = require(path.join(__dirname, '..', 'functions', 'genetics', 'analyzer'));
const { NURA_SNP_DATABASE } = require(path.join(__dirname, '..', 'functions', 'genetics', 'snpDatabase'));

let passed = 0;
let failed = 0;

function assert(description, actual, expected) {
    if (actual === expected) {
        console.log(`  ✅ ${description}`);
        passed++;
    } else {
        console.log(`  ❌ ${description}`);
        console.log(`     Expected: ${expected}, Got: ${actual}`);
        failed++;
    }
}

// ── matchesGenotype unit tests ─────────────────────────────────────────────────

console.log('\n=== matchesGenotype — lógica \'present\' con D/I notation ===\n');

// BRCA1 185delAG (rs80357906): deletion → wildtype=II, carrier=DI, affected=DD
const ref_brca1_185 = ['CC', 'II'];

console.log('BRCA1 185delAG:');
assert('II  = wildtype 23andMe → NO riesgo', matchesGenotype('II',  ['present'], ref_brca1_185), false);
assert('DI  = carrier 23andMe  → SÍ riesgo', matchesGenotype('DI',  ['present'], ref_brca1_185), true);
assert('ID  = carrier (sorted) → SÍ riesgo', matchesGenotype('ID',  ['present'], ref_brca1_185), true);
assert('DD  = affected 23andMe → SÍ riesgo', matchesGenotype('DD',  ['present'], ref_brca1_185), true);
assert('CC  = normal SNP-notation → NO riesgo', matchesGenotype('CC', ['present'], ref_brca1_185), false);
assert('--  = no-call → NO riesgo',            matchesGenotype('--', ['present'], ref_brca1_185), false);
assert('undefined → NO riesgo',               matchesGenotype(undefined, ['present'], ref_brca1_185), false);

// BRCA1 5382insC (rs80357713): insertion → wildtype=DD, carrier=DI, affected=II
const ref_brca1_5382 = ['TT', 'DD'];

console.log('\nBRCA1 5382insC:');
assert('DD  = wildtype 23andMe → NO riesgo',  matchesGenotype('DD', ['present'], ref_brca1_5382), false);
assert('DI  = carrier 23andMe  → SÍ riesgo',  matchesGenotype('DI', ['present'], ref_brca1_5382), true);
assert('II  = affected 23andMe → SÍ riesgo',  matchesGenotype('II', ['present'], ref_brca1_5382), true);
assert('TT  = normal SNP-notation → NO riesgo', matchesGenotype('TT', ['present'], ref_brca1_5382), false);
assert('--  = no-call → NO riesgo',             matchesGenotype('--', ['present'], ref_brca1_5382), false);

// BRCA2 6174delT (rs80359550): deletion → wildtype=II, carrier=DI, affected=DD
const ref_brca2_6174 = ['AA', 'II'];

console.log('\nBRCA2 6174delT:');
assert('II  = wildtype 23andMe → NO riesgo',  matchesGenotype('II',  ['present'], ref_brca2_6174), false);
assert('DI  = carrier 23andMe  → SÍ riesgo',  matchesGenotype('DI',  ['present'], ref_brca2_6174), true);
assert('DD  = affected 23andMe → SÍ riesgo',  matchesGenotype('DD',  ['present'], ref_brca2_6174), true);
assert('AA  = normal SNP-notation → NO riesgo', matchesGenotype('AA', ['present'], ref_brca2_6174), false);
assert('--  = no-call → NO riesgo',             matchesGenotype('--', ['present'], ref_brca2_6174), false);

// ── Integration test: analyzeSingleSNP con config del database ─────────────────

console.log('\n=== analyzeSingleSNP con NURA_SNP_DATABASE ===\n');

const brca1_185 = NURA_SNP_DATABASE['rs80357906'];
const brca2_6174 = NURA_SNP_DATABASE['rs80359550'];

// Wildtype 23andMe: no debe ser riesgo
const r1 = analyzeSingleSNP({ genotype: 'II' }, { ...brca1_185, rsid: 'rs80357906' });
assert('BRCA1 185delAG + II → status !== risk', r1.status !== 'risk', true);

const r2 = analyzeSingleSNP({ genotype: 'II' }, { ...brca2_6174, rsid: 'rs80359550' });
assert('BRCA2 6174delT + II → status !== risk', r2.status !== 'risk', true);

// Carrier 23andMe: sí debe ser riesgo
const r3 = analyzeSingleSNP({ genotype: 'DI' }, { ...brca1_185, rsid: 'rs80357906' });
assert('BRCA1 185delAG + DI → status === risk', r3.status === 'risk', true);

const r4 = analyzeSingleSNP({ genotype: 'DI' }, { ...brca2_6174, rsid: 'rs80359550' });
assert('BRCA2 6174delT + DI → status === risk', r4.status === 'risk', true);

// No-call: no debe ser riesgo
const r5 = analyzeSingleSNP({ genotype: '--' }, { ...brca1_185, rsid: 'rs80357906' });
assert('BRCA1 185delAG + -- → status !== risk', r5.status !== 'risk', true);

// ── Resumen ────────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`✅ TODOS LOS TESTS PASARON (${passed}/${passed + failed})`);
    console.log('   El fix de referenceGenotype D/I notation está correcto.');
} else {
    console.log(`❌ ${failed} TEST(S) FALLARON (${passed}/${passed + failed} OK)`);
    console.log('   Revisar el fix antes de deployar.');
}
console.log('════════════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
