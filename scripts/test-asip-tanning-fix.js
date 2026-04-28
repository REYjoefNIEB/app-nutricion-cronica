'use strict';
/**
 * Tests del fix Hallazgo 3 (ASIP bronceado en pieles oscuras).
 * Estrategia C+ simplificado: rs1426654 + ancestry como señales complementarias.
 */

const { PHYSICAL_TRAITS } = require('../functions/traits/traitsDatabase');

const tanningTrait = PHYSICAL_TRAITS['tanning_ability'];
let passed = 0, failed = 0;

function assert(name, actual, expected) {
    const ok = actual === expected;
    console.log(`  ${ok ? '[PASS]' : '[FAIL]'} ${name}`);
    if (!ok) console.log(`     esperado: ${JSON.stringify(expected)}, recibido: ${JSON.stringify(actual)}`);
    ok ? passed++ : failed++;
}

console.log('\n=== Casos sin cambio (branches TT y TG) ===\n');

// Caso 1: TT cualquier ancestria -> "Bronceado facil"
const r1 = tanningTrait.interpret({ rs4911414: 'TT', rs1426654: 'GG' }, { AFR_W: 0.5 });
assert('TT con AFR alta -> Bronceado facil', r1?.value, 'Bronceado fácil');

// Caso 2: TG europeo -> "Bronceado moderado"
const r2 = tanningTrait.interpret({ rs4911414: 'TG' }, { EUR_N: 0.85 });
assert('TG europeo -> Bronceado moderado', r2?.value, 'Bronceado moderado');

console.log('\n=== Casos GG europeo (sin pigmentacion basal alta) ===\n');

// Caso 3: GG europeo puro -> "Se quema facil, SPF 50+"
const r3 = tanningTrait.interpret({ rs4911414: 'GG', rs1426654: 'AA' }, { EUR_N: 0.85, EUR_S: 0.10 });
assert('GG europeo (rs1426654=AA, EUR alto) -> Se quema facil', r3?.value, 'Se quema fácil, bronceado pobre');

// Caso 4: GG sin ancestria ni rs1426654 -> fallback europeo (seguro)
const r4 = tanningTrait.interpret({ rs4911414: 'GG' }, {});
assert('GG sin ancestria ni rs1426654 -> fallback Se quema facil', r4?.value, 'Se quema fácil, bronceado pobre');

console.log('\n=== Casos GG con pigmentacion basal alta (CAVEAT) ===\n');

// Caso 5: NA18486 Yoruba real (rs1426654=GG, AFR alto)
const r5 = tanningTrait.interpret(
    { rs4911414: 'GG', rs1426654: 'GG' },
    { AFR_W: 0.50, AFR_E: 0.484, EUR_N: 0.001, EUR_S: 0.002 }
);
assert('Yoruba GG/GG -> caveat', r5?.value, 'ASIP modulado por pigmentación basal alta');
assert('Yoruba GG/GG -> confidence 55', r5?.confidence, 55);
assert('Yoruba GG/GG -> position 55 (no extremo)', r5?.position, 55);

// Caso 6: NA18525 Han Chinese (rs1426654=GG, EAS alto)
const r6 = tanningTrait.interpret(
    { rs4911414: 'GG', rs1426654: 'GG' },
    { EAS_CN: 0.50, EAS_JP: 0.341, EUR_N: 0.020 }
);
assert('Han Chinese GG/GG -> caveat', r6?.value, 'ASIP modulado por pigmentación basal alta');

// Caso 7: rs1426654 = GG sin ancestria (senal directa solo SNP)
const r7 = tanningTrait.interpret({ rs4911414: 'GG', rs1426654: 'GG' }, {});
assert('GG/GG sin ancestria -> caveat (senal directa SNP)', r7?.value, 'ASIP modulado por pigmentación basal alta');

// Caso 8: AMR_NAT alto sin rs1426654 = GG (caso amerindio puro)
const r8 = tanningTrait.interpret(
    { rs4911414: 'GG', rs1426654: 'AA' },
    { AMR_NAT: 0.82, EUR_N: 0.025, EUR_S: 0.025 }
);
assert('Amerindio AMR>0.40 con rs1426654=AA -> caveat (ancestria)', r8?.value, 'ASIP modulado por pigmentación basal alta');

console.log('\n=== Casos borderline ===\n');

// Caso 9: AMR=0.40 exacto -> NO caveat (umbral estricto >0.40)
const r9 = tanningTrait.interpret(
    { rs4911414: 'GG', rs1426654: 'AA' },
    { AMR_NAT: 0.40, EUR_N: 0.30, EUR_S: 0.30 }
);
assert('AMR=0.40 exacto -> fallback Se quema facil', r9?.value, 'Se quema fácil, bronceado pobre');

// Caso 10: AMR=0.41 -> SI caveat
const r10 = tanningTrait.interpret(
    { rs4911414: 'GG', rs1426654: 'AA' },
    { AMR_NAT: 0.41, EUR_N: 0.30, EUR_S: 0.29 }
);
assert('AMR=0.41 -> caveat', r10?.value, 'ASIP modulado por pigmentación basal alta');

// Caso 11: SNP no presente -> null
const r11 = tanningTrait.interpret({}, {});
assert('Sin rs4911414 -> null', r11, null);

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`PASS: TODOS LOS TESTS PASARON (${passed}/${passed + failed})`);
    process.exitCode = 0;
} else {
    console.log(`FAIL: ${failed} TEST(S) FALLARON (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
