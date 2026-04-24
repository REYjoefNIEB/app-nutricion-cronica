'use strict';
/**
 * verify-rs12913832-rule.js
 *
 * Verifica que countMinorAlleles para rs12913832 produzca:
 *   AA → 2 (brown máximo, alelo A = brown-favoring)
 *   AG → 1 (GEroe, webtool Test B = 77.8% brown)
 *   GA → 1 (orden inverso)
 *   GG → 0 (Bastian, webtool Test B = 91.1% blue)
 *
 * countMinorAlleles no está exportada → se reconstruye inline con la lógica
 * exacta de functions/traits/hirisplex.js para usar el snpEntry real del panel.
 */
const path = require('path');
const fs   = require('fs');

// ── Reconstruir countMinorAlleles inline (copia exacta de hirisplex.js) ───────
const COMPLEMENT = { A: 'T', T: 'A', C: 'G', G: 'C' };

function countMinorAlleles(genotype, snpEntry) {
    const chipAllele    = typeof snpEntry === 'string' ? snpEntry : snpEntry.chipAllele;
    const isPalindromic = typeof snpEntry === 'object' && snpEntry.palindromic === true;
    if (!genotype || genotype === '--' || genotype === 'NA' || genotype === '00' || genotype.length !== 2) return null;
    const a  = chipAllele.toUpperCase();
    const ac = COMPLEMENT[a] || a;
    const g  = genotype.toUpperCase();
    let direct = 0, complement = 0;
    for (const ch of g) {
        if (ch === a)  direct++;
        if (ch === ac) complement++;
    }
    if (direct > 0) return direct;
    if (isPalindromic) return 0;
    if (complement > 0) return complement;
    return 0;
}

// ── Extraer snpEntry real de HIRISPLEX_PANEL vía source parse ──────────────────
const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'traits', 'hirisplex.js'), 'utf8');
const panelMatch = src.match(/const HIRISPLEX_PANEL\s*=\s*\[([\s\S]*?)\];/);
let snpEntry = null;
if (panelMatch) {
    const blockRe = /\{[^}]+\}/g;
    let m;
    while ((m = blockRe.exec(panelMatch[1])) !== null) {
        const block = m[0];
        const rsid  = (block.match(/rsid:\s*['"`](\w+)['"`]/))?.[1];
        if (rsid === 'rs12913832') {
            const chip = (block.match(/chipAllele:\s*['"`](\w)['"`]/))?.[1];
            const pal  = /palindromic:\s*true/.test(block);
            snpEntry = { rsid, chipAllele: chip, palindromic: pal };
            break;
        }
    }
}

if (!snpEntry) { console.error('ERROR: rs12913832 no encontrado en HIRISPLEX_PANEL'); process.exit(1); }

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  verify-rs12913832-rule.js — chipAllele audit   ║');
console.log('╚══════════════════════════════════════════════════╝\n');
console.log(`snpEntry extraído: chipAllele='${snpEntry.chipAllele}', palindromic=${snpEntry.palindromic}\n`);

const TESTS = [
    { genotype: 'AA', expected: 2, note: 'AA → count=2 (brown máximo, A=brown allele)' },
    { genotype: 'AG', expected: 1, note: 'AG → count=1 (GEroe, webtool 77.8% brown)' },
    { genotype: 'GA', expected: 1, note: 'GA → count=1 (orden inverso)' },
    { genotype: 'GG', expected: 0, note: 'GG → count=0 (Bastian, webtool 91.1% blue)' },
];

let pass = 0, fail = 0;
for (const t of TESTS) {
    const result = countMinorAlleles(t.genotype, snpEntry);
    const ok = result === t.expected;
    ok ? pass++ : fail++;
    console.log(`${ok ? '✅' : '🔴'} ${t.genotype}: got=${result}, expected=${t.expected} — ${t.note}`);
}

console.log(`\n${pass}/${TESTS.length} pass, ${fail} fail`);

if (fail > 0) {
    console.log('\n══ DIAGNÓSTICO ══════════════════════════════════\n');
    console.log(`chipAllele actual = '${snpEntry.chipAllele}'`);
    console.log(`  Webtool esperado: cuenta alelo A (T en minus strand)`);
    console.log(`  rs12913832 alelos: A (ancestral/brown) y G (derived/blue-favoring)`);
    if (snpEntry.chipAllele === 'G') {
        console.log('\n  Efecto actual (chipAllele=G):');
        console.log('    GG → count=2  (debería ser 0)');
        console.log('    AG → count=1  (correcto por simetría de heterocigoto)');
        console.log('    AA → count=0  (debería ser 2)');
        console.log('\n  Fix requerido: chipAllele G → A');
        console.log('\n  ⚠ ATENCIÓN — fix chipAllele SOLO no es suficiente:');
        console.log('    Cambiar chipAllele=A sin ajustar betas/intercepts ROMPE');
        console.log('    predicciones para homocigotos GG/AA. Requiere también:');
        console.log('    - Flip de signo en betas de rs12913832 (todos los modelos)');
        console.log('    - Ajuste de intercepts: α_new = α_old + 2*β_old');
        console.log('    Esta transformación es matemáticamente equivalente:');
        console.log('    predice IDÉNTICO para GEroe (AG), Bastian (GG), y todos.');
        console.log('\n  Alcance del fix completo:');
        console.log('    EYE  blue:         intercept -10.7800 → -0.6666, beta 5.0567 → -5.0567');
        console.log('    EYE  intermediate: intercept  -6.4860 → -1.0924, beta 2.6968 → -2.6968');
        console.log('    HAIR blond:        intercept  -3.8285 → -2.1503, beta 0.8391 → -0.8391');
        console.log('    HAIR brown:        intercept  -0.5412 → +0.2968, beta 0.4190 → -0.4190');
        console.log('    HAIR red:          intercept  -9.8712 → -9.6244, beta 0.1234 → -0.1234');
        console.log('    SKIN very_pale:    intercept  -4.2341 → -3.1873, beta 0.5234 → -0.5234');
        console.log('    SKIN pale:         intercept  -1.4523 → -0.8055, beta 0.3234 → -0.3234');
        console.log('    SKIN dark:         intercept  +0.8000 → +0.1532, beta -0.3234 → +0.3234');
        console.log('    SKIN dark_to_black:intercept  -1.5000 → -2.5468, beta -0.5234 → +0.5234');
    }
}

process.exit(fail > 0 ? 1 : 0);
