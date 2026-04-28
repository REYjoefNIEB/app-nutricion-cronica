'use strict';
/**
 * Tests del fix MC1R compuesto (Hallazgo previo: solo R160W detectado).
 * Panel: 6 R alleles alta penetrancia. Conteo simple: het = 1, homo = 2.
 */

const { PHYSICAL_TRAITS } = require('../functions/traits/traitsDatabase');

const trait = PHYSICAL_TRAITS['hair_color_red_mc1r'];
let passed = 0, failed = 0;

function assert(name, actual, expected) {
    const ok = actual === expected;
    console.log(`  ${ok ? '[PASS]' : '[FAIL]'} ${name}`);
    if (!ok) console.log(`     esperado: ${JSON.stringify(expected)}, recibido: ${JSON.stringify(actual)}`);
    ok ? passed++ : failed++;
}

console.log('\n=== Casos sin variantes (ancestral homocigoto) ===\n');

// Kenneth/James/Bastian: todos ancestrales en los 6 SNPs
const ancestralAll = {
    rs1805007: 'CC', rs1805008: 'CC', rs1805009: 'GG',
    rs1805006: 'CC', rs11547464: 'GG', rs1110400: 'TT'
};
const r1 = trait.interpret(ancestralAll, {});
assert('Sin variantes (6/6 ancestrales)', r1?.value, 'Sin variantes RHC detectadas');
assert('Sin variantes - confidence 70', r1?.confidence, 70);
assert('Sin variantes - position 10', r1?.position, 10);

// Caso real Kenneth: chip no cubre rs1805009. 5 ancestrales + 1 ausente
const kennethReal = {
    rs1805007: 'CC', rs1805008: 'CC',
    rs1805006: 'CC', rs11547464: 'GG', rs1110400: 'TT'
};
const r2 = trait.interpret(kennethReal, {});
assert('Kenneth real (5 ancestrales, 1 ausente)', r2?.value, 'Sin variantes RHC detectadas');

console.log('\n=== Casos heterocigoto simple (totalVariants = 1) ===\n');

const heteroR160W = { ...ancestralAll, rs1805008: 'CT' };
const r3 = trait.interpret(heteroR160W, {});
assert('R160W heterocigoto solo', r3?.value, 'Portador MC1R — posibles reflejos rojizos');

const heteroR151C = { ...ancestralAll, rs1805007: 'CT' };
const r4 = trait.interpret(heteroR151C, {});
assert('R151C heterocigoto solo (caso fix nuevo)', r4?.value, 'Portador MC1R — posibles reflejos rojizos');

const heteroI155T = { ...ancestralAll, rs1110400: 'TC' };
const r5 = trait.interpret(heteroI155T, {});
assert('I155T heterocigoto solo', r5?.value, 'Portador MC1R — posibles reflejos rojizos');

const heteroR160W_inverse = { ...ancestralAll, rs1805008: 'TC' };
const r6 = trait.interpret(heteroR160W_inverse, {});
assert('R160W heterocigoto orden inverso (TC)', r6?.value, 'Portador MC1R — posibles reflejos rojizos');

console.log('\n=== Casos compuesto / homocigoto (totalVariants >= 2) ===\n');

const homoR160W = { ...ancestralAll, rs1805008: 'TT' };
const r7 = trait.interpret(homoR160W, {});
assert('R160W homocigoto', r7?.value, 'Alta probabilidad de cabello rojo');
assert('R160W homo - confidence 80', r7?.confidence, 80);

const compound1 = { ...ancestralAll, rs1805007: 'CT', rs1805008: 'CT' };
const r8 = trait.interpret(compound1, {});
assert('R151C het + R160W het (compound)', r8?.value, 'Alta probabilidad de cabello rojo');

const compound2 = { ...ancestralAll, rs11547464: 'GA', rs1110400: 'TC' };
const r9 = trait.interpret(compound2, {});
assert('R142H het + I155T het (compound)', r9?.value, 'Alta probabilidad de cabello rojo');

const triple = {
    ...ancestralAll,
    rs1805007: 'CT',
    rs1805008: 'CT',
    rs1805009: 'GC'
};
const r10 = trait.interpret(triple, {});
assert('Triple heterocigoto', r10?.value, 'Alta probabilidad de cabello rojo');
assert('Triple het - note menciona R151C', r10?.note?.includes('R151C heterocigoto'), true);
assert('Triple het - note menciona R160W', r10?.note?.includes('R160W heterocigoto'), true);
assert('Triple het - note menciona D294H', r10?.note?.includes('D294H heterocigoto'), true);

console.log('\n=== Casos edge ===\n');

const withNoCall = { ...ancestralAll, rs1805008: '--' };
const r11 = trait.interpret(withNoCall, {});
assert('R160W = -- → no cuenta como variante', r11?.value, 'Sin variantes RHC detectadas');

const weirdGenotype = { ...ancestralAll, rs1805007: 'AA' };
const r12 = trait.interpret(weirdGenotype, {});
assert('Genotipo raro AA → no cuenta', r12?.value, 'Sin variantes RHC detectadas');

const onlyOneSnp = { rs1805008: 'CC' };
const r13 = trait.interpret(onlyOneSnp, {});
assert('Solo 1 SNP ancestral', r13?.value, 'Sin variantes RHC detectadas');
assert('Solo 1 SNP - panel 1/6', r13?.note?.includes('1/6'), true);

const r14 = trait.interpret({}, {});
assert('Sin ningún SNP analizable → null', r14, null);

console.log(`\n${'='.repeat(60)}`);
if (failed === 0) {
    console.log(`[OK] TODOS LOS TESTS PASARON (${passed}/${passed + failed})`);
    process.exitCode = 0;
} else {
    console.log(`[FAIL] ${failed} TEST(S) FALLARON (${passed}/${passed + failed} OK)`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
