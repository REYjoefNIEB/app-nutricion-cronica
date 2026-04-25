'use strict';
/**
 * scripts/test-brca-indel-logic.js
 *
 * Valida la lógica de genotipos indel (D/I notation de 23andMe) para las
 * variantes BRCA1/BRCA2, usando el nuevo modo 'present_indel' con whitelist explícita.
 *
 * Historia de bugs:
 *   - Commit 710a494: añadió 'II' a referenceGenotype de rs80357906. Incorrecto porque
 *     rs80357906 es una INSERCIÓN (5382insC) donde wildtype=DD, no wildtype=II.
 *   - Este fix: reemplaza 'present' por 'present_indel' + riskAlleles explícito.
 *     Kenneth Reitz y James Bradach (DD=wildtype) ya no son falsos positivos.
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

// ── matchesGenotype unit tests — modo 'present_indel' ─────────────────────────

console.log('\n=== matchesGenotype — modo present_indel ===\n');

// rs80357906 = BRCA1 5382insC (INSERCIÓN)
// wildtype: DD (sin inserción). Risk: DI, ID, II.
const riskAlleles_5382insC = ['DI', 'ID', 'II'];

console.log('BRCA1 5382insC (rs80357906) — INSERCIÓN, wildtype=DD:');
assert('DD  = wildtype → NO riesgo',          matchesGenotype('DD', ['present_indel'], null, riskAlleles_5382insC), false);
assert('DI  = portador → SÍ riesgo',          matchesGenotype('DI', ['present_indel'], null, riskAlleles_5382insC), true);
assert('ID  = portador (sorted) → SÍ riesgo', matchesGenotype('ID', ['present_indel'], null, riskAlleles_5382insC), true);
assert('II  = afectado → SÍ riesgo',          matchesGenotype('II', ['present_indel'], null, riskAlleles_5382insC), true);
assert('AA  = nucleotídico wildtype → NO',     matchesGenotype('AA', ['present_indel'], null, riskAlleles_5382insC), false);
assert('GG  = nucleotídico → NO riesgo',       matchesGenotype('GG', ['present_indel'], null, riskAlleles_5382insC), false);
assert('TT  = nucleotídico → NO riesgo',       matchesGenotype('TT', ['present_indel'], null, riskAlleles_5382insC), false);
assert('--  = no-call → NO riesgo',            matchesGenotype('--', ['present_indel'], null, riskAlleles_5382insC), false);
assert('undefined → NO riesgo',               matchesGenotype(undefined, ['present_indel'], null, riskAlleles_5382insC), false);

// rs80359550 = BRCA2 6174delT (DELECIÓN)
// wildtype: II (alelo intacto). Risk: DI, ID, DD.
const riskAlleles_6174delT = ['DI', 'ID', 'DD'];

console.log('\nBRCA2 6174delT (rs80359550) — DELECIÓN, wildtype=II:');
assert('II  = wildtype → NO riesgo',           matchesGenotype('II',  ['present_indel'], null, riskAlleles_6174delT), false);
assert('DI  = portador → SÍ riesgo',           matchesGenotype('DI',  ['present_indel'], null, riskAlleles_6174delT), true);
assert('ID  = portador (sorted) → SÍ riesgo',  matchesGenotype('ID',  ['present_indel'], null, riskAlleles_6174delT), true);
assert('DD  = afectado → SÍ riesgo',           matchesGenotype('DD',  ['present_indel'], null, riskAlleles_6174delT), true);
assert('AA  = nucleotídico wildtype → NO',      matchesGenotype('AA',  ['present_indel'], null, riskAlleles_6174delT), false);
assert('GG  = nucleotídico → NO riesgo',        matchesGenotype('GG',  ['present_indel'], null, riskAlleles_6174delT), false);
assert('--  = no-call → NO riesgo',             matchesGenotype('--',  ['present_indel'], null, riskAlleles_6174delT), false);
assert('undefined → NO riesgo',                matchesGenotype(undefined, ['present_indel'], null, riskAlleles_6174delT), false);

// Fail-safe: riskAlleles vacío → no flaggear
console.log('\nFail-safe (riskAlleles vacío o ausente):');
assert('DI sin riskAlleles → NO riesgo (fail-safe)', matchesGenotype('DI', ['present_indel'], null, []),   false);
assert('DI sin riskAlleles null → NO riesgo',        matchesGenotype('DI', ['present_indel'], null, null), false);

// ── analyzeSingleSNP con NURA_SNP_DATABASE ────────────────────────────────────

console.log('\n=== analyzeSingleSNP con NURA_SNP_DATABASE ===\n');

const cfg_5382 = NURA_SNP_DATABASE['rs80357906'];
const cfg_6174 = NURA_SNP_DATABASE['rs80359550'];

if (!cfg_5382) {
    console.log('  ❌ FATAL: rs80357906 no encontrado en NURA_SNP_DATABASE');
    failed++;
} else {
    console.log('rs80357906 (BRCA1 5382insC):');
    const r_DD = analyzeSingleSNP({ genotype: 'DD' }, { ...cfg_5382, rsid: 'rs80357906' });
    assert('DD → status !== risk (wildtype para inserción)', r_DD.status !== 'risk', true);

    const r_DI = analyzeSingleSNP({ genotype: 'DI' }, { ...cfg_5382, rsid: 'rs80357906' });
    assert('DI → status === risk (portador)',                r_DI.status === 'risk', true);

    const r_II = analyzeSingleSNP({ genotype: 'II' }, { ...cfg_5382, rsid: 'rs80357906' });
    assert('II → status === risk (afectado homocigoto)',     r_II.status === 'risk', true);

    const r_AA = analyzeSingleSNP({ genotype: 'AA' }, { ...cfg_5382, rsid: 'rs80357906' });
    assert('AA → status !== risk (genotipo nucleotídico)',   r_AA.status !== 'risk', true);

    const r_nc = analyzeSingleSNP({ genotype: '--' }, { ...cfg_5382, rsid: 'rs80357906' });
    assert('-- → status !== risk (no-call)',                 r_nc.status !== 'risk', true);
}

if (!cfg_6174) {
    console.log('  ❌ FATAL: rs80359550 no encontrado en NURA_SNP_DATABASE');
    failed++;
} else {
    console.log('\nrs80359550 (BRCA2 6174delT):');
    const r_II = analyzeSingleSNP({ genotype: 'II' }, { ...cfg_6174, rsid: 'rs80359550' });
    assert('II → status !== risk (wildtype para deleción)',  r_II.status !== 'risk', true);

    const r_DI = analyzeSingleSNP({ genotype: 'DI' }, { ...cfg_6174, rsid: 'rs80359550' });
    assert('DI → status === risk (portador)',                r_DI.status === 'risk', true);

    const r_DD = analyzeSingleSNP({ genotype: 'DD' }, { ...cfg_6174, rsid: 'rs80359550' });
    assert('DD → status === risk (afectado homocigoto)',     r_DD.status === 'risk', true);

    const r_AA = analyzeSingleSNP({ genotype: 'AA' }, { ...cfg_6174, rsid: 'rs80359550' });
    assert('AA → status !== risk (genotipo nucleotídico)',   r_AA.status !== 'risk', true);

    const r_nc = analyzeSingleSNP({ genotype: '--' }, { ...cfg_6174, rsid: 'rs80359550' });
    assert('-- → status !== risk (no-call)',                 r_nc.status !== 'risk', true);
}

// ── Verificar que rs80357713 fue eliminado ─────────────────────────────────────

console.log('\n=== Verificación de entradas eliminadas ===\n');
assert('rs80357713 eliminado de NURA_SNP_DATABASE', NURA_SNP_DATABASE['rs80357713'], undefined);

// ── Resumen ───────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`✅ TODOS LOS TESTS PASARON (${passed}/${passed + failed})`);
    console.log('   Kenneth y James (DD en rs80357906) ya no son falsos positivos.');
    console.log('   5382insC detectada correctamente vía present_indel whitelist.');
} else {
    console.log(`❌ ${failed} TEST(S) FALLARON (${passed}/${passed + failed} OK)`);
    console.log('   PARAR — no deployar hasta resolver fallos.');
}
console.log('════════════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
