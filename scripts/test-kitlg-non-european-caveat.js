'use strict';
/**
 * Tests del caveat de hair_color_blonde_kitlg para usuarios no-europeos.
 * Hallazgo 2 — trait #1.
 */

const { PHYSICAL_TRAITS } = require('../functions/traits/traitsDatabase');

const trait = PHYSICAL_TRAITS['hair_color_blonde_kitlg'];
let passed = 0, failed = 0;

function assert(name, cond) {
    console.log(`  ${cond ? '[PASS]' : '[FAIL]'} ${name}`);
    cond ? passed++ : failed++;
}

console.log('\n=== Casos europeos (sin caveat) ===\n');

// Caso 1: Kenneth-like (EUR alto, TT) -> branch europeo, sin caveat
const r1 = trait.interpret(
    { rs12821256: 'TT' },
    { EUR_N: 0.85, EUR_S: 0.10, AFR_W: 0.01, AFR_E: 0.01, EAS_CN: 0.01, EAS_JP: 0.01, SAS: 0.005, AMR_NAT: 0.005 }
);
assert('Europeo TT -> "Sin aclaramiento por KITLG"', r1?.value === 'Sin aclaramiento por KITLG');
assert('Europeo TT -> SIN flag nonInformativeForAncestry', !r1?.nonInformativeForAncestry);
assert('Europeo TT -> note SIN caveat', !r1?.note?.includes('no informativa'));

// Caso 2: Bastian-like (EUR alto, CT) -> branch CT sin cambio
const r2 = trait.interpret(
    { rs12821256: 'CT' },
    { EUR_N: 0.90, EUR_S: 0.05, AFR_W: 0.01, AFR_E: 0.01, EAS_CN: 0.01, EAS_JP: 0.01, SAS: 0.005, AMR_NAT: 0.005 }
);
assert('Europeo CT -> branch existente devuelve algo', r2?.value !== undefined);
assert('Europeo CT -> SIN flag nonInformativeForAncestry', !r2?.nonInformativeForAncestry);

console.log('\n=== Casos no-europeos en branch TT (CON caveat) ===\n');

// Caso 3: Yoruba (EUR ~0.003, TT) -> caveat
const r3 = trait.interpret(
    { rs12821256: 'TT' },
    { EUR_N: 0.001, EUR_S: 0.002, AFR_W: 0.500, AFR_E: 0.484, EAS_CN: 0.003, EAS_JP: 0.002, SAS: 0.003, AMR_NAT: 0.005 }
);
assert('Yoruba TT -> mantiene value "Sin aclaramiento por KITLG"', r3?.value === 'Sin aclaramiento por KITLG');
assert('Yoruba TT -> flag nonInformativeForAncestry true', r3?.nonInformativeForAncestry === true);
assert('Yoruba TT -> note CON caveat', r3?.note?.includes('no informativa'));
assert('Yoruba TT -> note menciona KITLG', r3?.note?.includes('KITLG'));

// Caso 4: Han Chinese (EUR ~0.034, TT) -> caveat
const r4 = trait.interpret(
    { rs12821256: 'TT' },
    { EUR_N: 0.020, EUR_S: 0.014, AFR_W: 0.005, AFR_E: 0.006, EAS_CN: 0.500, EAS_JP: 0.341, SAS: 0.077, AMR_NAT: 0.036 }
);
assert('Han Chinese TT -> caveat dispara', r4?.nonInformativeForAncestry === true);

// Caso 5: HG01565 Peruano (EUR ~0.05, TT) -> caveat
const r5 = trait.interpret(
    { rs12821256: 'TT' },
    { EUR_N: 0.025, EUR_S: 0.025, AFR_W: 0.005, AFR_E: 0.005, EAS_CN: 0.05, EAS_JP: 0.05, SAS: 0.014, AMR_NAT: 0.825 }
);
assert('Peruano TT -> caveat dispara', r5?.nonInformativeForAncestry === true);

console.log('\n=== Casos no-europeos en branches CT/CC (SIN caveat) ===\n');

// Caso 6: No-europeo con CT -> SIN caveat (CT es informativo)
const r6 = trait.interpret(
    { rs12821256: 'CT' },
    { EUR_N: 0.001, EUR_S: 0.002, AFR_W: 0.500, AFR_E: 0.484, EAS_CN: 0.003, EAS_JP: 0.002, SAS: 0.003, AMR_NAT: 0.005 }
);
assert('Yoruba CT -> SIN flag nonInformativeForAncestry', !r6?.nonInformativeForAncestry);

// Caso 7: No-europeo con CC -> SIN caveat
const r7 = trait.interpret(
    { rs12821256: 'CC' },
    { EUR_N: 0.001, EUR_S: 0.002, AFR_W: 0.500, AFR_E: 0.484, EAS_CN: 0.003, EAS_JP: 0.002, SAS: 0.003, AMR_NAT: 0.005 }
);
assert('Yoruba CC -> SIN flag nonInformativeForAncestry', !r7?.nonInformativeForAncestry);

console.log('\n=== Casos borderline ===\n');

// Caso 8: EUR exacto 0.50 -> SIN caveat (estricto, no inclusivo)
const r8 = trait.interpret(
    { rs12821256: 'TT' },
    { EUR_N: 0.30, EUR_S: 0.20, AFR_W: 0.30, AFR_E: 0.20 }
);
assert('EUR=0.50 exacto -> SIN caveat (threshold estricto)', !r8?.nonInformativeForAncestry);

// Caso 9: EUR 0.49 -> CON caveat
const r9 = trait.interpret(
    { rs12821256: 'TT' },
    { EUR_N: 0.30, EUR_S: 0.19, AFR_W: 0.30, AFR_E: 0.21 }
);
assert('EUR=0.49 -> CON caveat', r9?.nonInformativeForAncestry === true);

// Caso 10: ancestry vacio -> SIN caveat (no-data != no-europeo)
const r10 = trait.interpret({ rs12821256: 'TT' }, {});
assert('ancestry={} -> SIN caveat (no-data, no asumir non-EU)', !r10?.nonInformativeForAncestry);

// Caso 11: SNP no presente -> null
const r11 = trait.interpret({}, { EUR_N: 0.001, EUR_S: 0.002 });
assert('Sin rs12821256 -> null', r11 === null);

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`[OK] Tests pasados: ${passed}/${passed + failed}`);
    process.exitCode = 0;
} else {
    console.log(`[FAIL] ${failed} test(s) fallaron (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
