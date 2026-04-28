'use strict';
/**
 * Tests del override HERC2 para eye_color_intensity.
 * Hallazgo 2 — trait #2.
 */

const { PHYSICAL_TRAITS } = require('../functions/traits/traitsDatabase');
const trait = PHYSICAL_TRAITS['eye_color_intensity'];
let passed = 0, failed = 0;

function assert(name, cond) {
    console.log(`  ${cond ? '[PASS]' : '[FAIL]'} ${name}`);
    cond ? passed++ : failed++;
}

const ancEU  = { EUR_N: 0.85, EUR_S: 0.10, AFR_W: 0.01, AFR_E: 0.01, EAS_CN: 0.01, EAS_JP: 0.01, SAS: 0.005, AMR_NAT: 0.005 };
const ancAFR = { EUR_N: 0.001, EUR_S: 0.002, AFR_W: 0.500, AFR_E: 0.484, EAS_CN: 0.003, EAS_JP: 0.002, SAS: 0.003, AMR_NAT: 0.005 };
const ancEAS = { EUR_N: 0.020, EUR_S: 0.014, AFR_W: 0.005, AFR_E: 0.006, EAS_CN: 0.500, EAS_JP: 0.341, SAS: 0.077, AMR_NAT: 0.036 };
const ancAMR = { EUR_N: 0.025, EUR_S: 0.025, AFR_W: 0.005, AFR_E: 0.005, EAS_CN: 0.05, EAS_JP: 0.05, SAS: 0.014, AMR_NAT: 0.825 };

console.log('\n=== Casos europeos (path rs1800407 preservado, sin override) ===\n');

const r1 = trait.interpret({ rs1800407: 'CC', rs12913832: 'AG' }, ancEU);
assert('Europeo CC + HERC2 AG -> branch original CC (no override)', r1?.primarySnpUsed !== 'rs12913832');
assert('Europeo CC -> ancestryAware no seteado', !r1?.ancestryAware);
assert('Europeo CC -> sin nonInformativeForAncestry', !r1?.nonInformativeForAncestry);

const r2 = trait.interpret({ rs1800407: 'CT', rs12913832: 'AG' }, ancEU);
assert('Europeo CT -> branch original CT', r2?.primarySnpUsed !== 'rs12913832');
assert('Europeo CT -> value contiene "intermedia"', r2?.value?.includes('intermedia') || r2?.value?.includes('Marrón medio'));

const r3 = trait.interpret({ rs1800407: 'TT', rs12913832: 'GG' }, ancEU);
assert('Europeo TT -> branch original TT', r3?.primarySnpUsed !== 'rs12913832');
assert('Europeo TT -> position 80', r3?.position === 80);

console.log('\n=== Casos no-europeos con HERC2 disponible (override activado) ===\n');

const r4 = trait.interpret({ rs1800407: 'CC', rs12913832: 'AA' }, ancAFR);
assert('Yoruba HERC2 AA -> "Ojos oscuros"', r4?.value === 'Ojos oscuros');
assert('Yoruba HERC2 AA -> primarySnpUsed=rs12913832', r4?.primarySnpUsed === 'rs12913832');
assert('Yoruba HERC2 AA -> position 90', r4?.position === 90);
assert('Yoruba HERC2 AA -> confidence 75', r4?.confidence === 75);
assert('Yoruba HERC2 AA -> ancestryAware true', r4?.ancestryAware === true);
assert('Yoruba HERC2 AA -> note menciona HERC2', r4?.note?.includes('HERC2'));

const r5 = trait.interpret({ rs1800407: 'CC', rs12913832: 'AA' }, ancEAS);
assert('Han Chinese HERC2 AA -> "Ojos oscuros"', r5?.value === 'Ojos oscuros');
assert('Han Chinese HERC2 AA -> primarySnpUsed=rs12913832', r5?.primarySnpUsed === 'rs12913832');

const r6 = trait.interpret({ rs1800407: 'CC', rs12913832: 'AG' }, ancAMR);
assert('Peruano HERC2 AG -> value menciona "intermedia"', r6?.value?.includes('intermedia'));
assert('Peruano HERC2 AG -> primarySnpUsed=rs12913832', r6?.primarySnpUsed === 'rs12913832');
assert('Peruano HERC2 AG -> position 50', r6?.position === 50);
assert('Peruano HERC2 AG -> confidence 70', r6?.confidence === 70);

const r7 = trait.interpret({ rs1800407: 'CC', rs12913832: 'GG' }, ancAFR);
assert('Yoruba HERC2 GG (raro) -> value menciona "claros"', r7?.value?.includes('claros'));
assert('Yoruba HERC2 GG -> position 10', r7?.position === 10);
assert('Yoruba HERC2 GG -> note menciona admixture', r7?.note?.includes('admixture'));

const r8 = trait.interpret({ rs1800407: 'CC', rs12913832: 'GA' }, ancAFR);
assert('HERC2 GA (orden invertido) -> branch AG (intermedia)', r8?.value?.includes('intermedia'));

console.log('\n=== Casos fallback: no-europeo SIN HERC2 ===\n');

const r9 = trait.interpret({ rs1800407: 'CC' }, ancAFR);
assert('Yoruba sin HERC2 -> cae a rs1800407', r9?.primarySnpUsed !== 'rs12913832');
assert('Yoruba sin HERC2 -> output no-null', r9 !== null);
assert('Yoruba sin HERC2 -> nonInformativeForAncestry true', r9?.nonInformativeForAncestry === true);
assert('Yoruba sin HERC2 -> note CON warning', r9?.note?.includes('⚠️'));

console.log('\n=== Casos edge ===\n');

const r10 = trait.interpret({ rs1800407: 'CC', rs12913832: 'AA' }, {});
assert('ancestry={} -> NO override (sin data)', r10?.primarySnpUsed !== 'rs12913832');
assert('ancestry={} -> sin nonInformativeForAncestry', !r10?.nonInformativeForAncestry);

const r11 = trait.interpret({}, ancEU);
assert('Europeo sin SNPs -> null', r11 === null);

const r12 = trait.interpret({ rs12913832: 'GG' }, ancEU);
assert('Europeo solo con HERC2 (sin rs1800407) -> null', r12 === null);

const r13 = trait.interpret({ rs12913832: 'AA' }, ancAFR);
assert('Yoruba solo con HERC2 -> override funciona', r13?.value === 'Ojos oscuros');
assert('Yoruba solo HERC2 -> primarySnpUsed=rs12913832', r13?.primarySnpUsed === 'rs12913832');

const r14 = trait.interpret(
    { rs1800407: 'CC', rs12913832: 'AA' },
    { EUR_N: 0.30, EUR_S: 0.20, AFR_W: 0.30, AFR_E: 0.20 }
);
assert('EUR=0.50 exacto -> NO override (estricto)', r14?.primarySnpUsed !== 'rs12913832');

const r15 = trait.interpret(
    { rs1800407: 'CC', rs12913832: 'AA' },
    { EUR_N: 0.30, EUR_S: 0.19, AFR_W: 0.30, AFR_E: 0.21 }
);
assert('EUR=0.49 -> override activa', r15?.primarySnpUsed === 'rs12913832');

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`[OK] Tests pasados: ${passed}/${passed + failed}`);
    process.exitCode = 0;
} else {
    console.log(`[FAIL] ${failed} test(s) fallaron (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
