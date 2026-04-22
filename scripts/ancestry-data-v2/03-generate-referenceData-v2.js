#!/usr/bin/env node
/**
 * Genera functions/ancestry/referenceData_v2.js a partir de:
 *   - scripts/ancestry-data-v2/02-aims-with-populations.json  (141 AIMs + frecuencias 1000G)
 *
 * K=9 sub-poblaciones (EUR_N, EUR_S, AFR_W, AFR_E, EAS_CN, EAS_JP, SAS, AMR_NAT).
 * AMR_NAT usa PEL como proxy (ver TODO-upgrade-amerindian-refdata.md).
 * EUR_E y OCE no incluidos (sin datos 1000G limpios para esta versión).
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, '02-aims-with-populations.json');
const OUTPUT = path.join(__dirname, '..', '..', 'functions', 'ancestry', 'referenceData_v2.js');

const aims = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

const POPULATIONS_K9 = ['EUR_N', 'EUR_S', 'AFR_W', 'AFR_E', 'EAS_CN', 'EAS_JP', 'SAS', 'AMR_NAT'];

// Filtrar: solo AIMs con frecuencias numéricas [0,1] en las 8 sub-pops de K9
const clean = aims.filter(aim => {
    if (!aim.frequencies) return false;
    return POPULATIONS_K9.every(pop => {
        const v = aim.frequencies[pop];
        return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1;
    });
});

console.log(`Input: ${aims.length} AIMs`);
console.log(`Post-filtro K9: ${clean.length} AIMs con datos completos (8/8 sub-pops)`);
if (aims.length - clean.length > 0) {
    const dropped = aims.filter(a => !clean.includes(a)).map(a => a.rsid);
    console.log(`Omitidos: ${dropped.join(', ')}`);
}

// Redondear a 6 decimales (máxima precisión necesaria para EM)
const formattedAims = clean.map(aim => ({
    rsid:         aim.rsid,
    chromosome:   aim.chromosome,
    position:     aim.position,
    minorAllele:  aim.minorAllele,
    majorAllele:  aim.majorAllele,
    MAF_chile:    aim.MAF_chile,
    frequencies: {
        EUR_N:   +aim.frequencies.EUR_N.toFixed(6),
        EUR_S:   +aim.frequencies.EUR_S.toFixed(6),
        AFR_W:   +aim.frequencies.AFR_W.toFixed(6),
        AFR_E:   +aim.frequencies.AFR_E.toFixed(6),
        EAS_CN:  +aim.frequencies.EAS_CN.toFixed(6),
        EAS_JP:  +aim.frequencies.EAS_JP.toFixed(6),
        SAS:     +aim.frequencies.SAS.toFixed(6),
        AMR_NAT: +aim.frequencies.AMR_NAT.toFixed(6)
    }
}));

const version   = `v2-CLG${clean.length}-K9-${new Date().toISOString().slice(0, 10)}`;
const generated = new Date().toISOString();

// Serializar AIMS como JSON inline (no como template string para evitar escaping)
const aimsJson = JSON.stringify(formattedAims, null, 2);

const fileContent =
`// ─────────────────────────────────────────────────────────────────────────────
// referenceData_v2.js — NURA ancestry reference data (K=9 sub-populations)
//
// Generated: ${generated}
// Script:    scripts/ancestry-data-v2/03-generate-referenceData-v2.js
// Source:    Verdugo et al 2020 (Biol Res 53:15) + 1000G Phase 3 (Ensembl REST)
//
// DO NOT EDIT MANUALLY — regenerate with the script if source data changes.
//
// LIMITATIONS:
//   - AMR_NAT uses PEL (1000G) as proxy (~77% Andean Amerindian + ~23% European).
//     Does not distinguish Aymara vs Mapuche.
//     Upgrade pending: see documentacion/TODO-upgrade-amerindian-refdata.md
//   - EUR_E (Eastern European/Slavic) excluded — no clean 1000G superpop available.
//   - OCE (Oceanian) excluded — outside scope of CLG panel designed for Chileans.
//     Legacy macro-region mapping returns OCE = 0.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const VERSION = '${version}';

// K=9 sub-populations
const POPULATIONS = [
    'EUR_N', 'EUR_S',
    'AFR_W', 'AFR_E',
    'EAS_CN', 'EAS_JP',
    'SAS',
    'AMR_NAT'
];

const POPULATION_LABELS = {
    EUR_N:   'Europeo Norte/Centro (Germano-Escandinavo)',
    EUR_S:   'Europeo Sur (Ibérico-Italiano)',
    AFR_W:   'Africano Oeste (Yoruba, Mandé, Bantú Oeste)',
    AFR_E:   'Africano Este (Luhya, Kikuyu)',
    EAS_CN:  'Asiático Chino (Han)',
    EAS_JP:  'Asiático Japonés',
    SAS:     'Sur Asiático (Indio, Paquistaní, Sri Lanka)',
    AMR_NAT: 'Amerindio Andino (proxy PEL — Aymara+Mapuche fusionados)'
};

// Sub-population → legacy macro-region (v1 retrocompatibility)
const MACRO_REGION = {
    EUR_N:   'EUR',
    EUR_S:   'EUR',
    AFR_W:   'AFR',
    AFR_E:   'AFR',
    EAS_CN:  'EAS',
    EAS_JP:  'EAS',
    SAS:     'SAS',
    AMR_NAT: 'AMR_NAT'
};

// ${clean.length} AIMs from the CLG panel (Verdugo et al 2020)
// Each AIM has:
//   rsid, chromosome, position, minorAllele, majorAllele, MAF_chile
//   frequencies: frequency of minorAllele (A1 from CLG) in each sub-population
const AIMS = ${aimsJson};

/**
 * Validate consistency at import time.
 * Returns array of issue strings (empty = OK).
 */
function validate() {
    const issues = [];
    for (const aim of AIMS) {
        if (!aim.minorAllele) issues.push(aim.rsid + ': missing minorAllele');
        if (!aim.majorAllele) issues.push(aim.rsid + ': missing majorAllele');
        if (!aim.frequencies) {
            issues.push(aim.rsid + ': missing frequencies');
            continue;
        }
        for (const pop of POPULATIONS) {
            const v = aim.frequencies[pop];
            if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 1) {
                issues.push(aim.rsid + ': invalid freq ' + pop + '=' + v);
            }
        }
    }
    if (issues.length > 0) {
        const pct = (issues.length / AIMS.length * 100).toFixed(1);
        console.warn('[REF_DATA_V2] ' + issues.length + ' issues (' + pct + '% of AIMs)');
        if (issues.length <= 10) console.warn('[REF_DATA_V2]', issues);
        else console.warn('[REF_DATA_V2] First 10:', issues.slice(0, 10));
    }
    return issues;
}

/**
 * Aggregate K=9 sub-population Q-vector to legacy K=6 macro-regions.
 * @param {Object} qSubPop  e.g. { EUR_N: 0.4, EUR_S: 0.3, AMR_NAT: 0.3, ... }
 * @returns {Object}         e.g. { EUR: 0.7, AFR: 0, EAS: 0, SAS: 0, AMR_NAT: 0.3, OCE: 0 }
 */
function aggregateToMacroRegions(qSubPop) {
    const macro = { EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR_NAT: 0, OCE: 0 };
    for (const [subpop, value] of Object.entries(qSubPop)) {
        const m = MACRO_REGION[subpop];
        if (m) macro[m] = (macro[m] || 0) + value;
    }
    return macro;
}

module.exports = {
    VERSION,
    POPULATIONS,
    POPULATION_LABELS,
    MACRO_REGION,
    AIMS,
    validate,
    aggregateToMacroRegions
};
`;

fs.writeFileSync(OUTPUT, fileContent);

const sizeKb = Math.round(fileContent.length / 1024);
console.log(`\n✅ Generado: ${OUTPUT}`);
console.log(`   AIMs: ${clean.length}  |  K=9  |  Tamaño: ~${sizeKb} KB`);

// ── Smoke test — importar y validar ──────────────────────────────────────
console.log('\n🧪 Smoke test — importando el archivo generado...');
delete require.cache[require.resolve(OUTPUT)];
const generated_module = require(OUTPUT);

console.log(`   VERSION:     ${generated_module.VERSION}`);
console.log(`   POPULATIONS: ${generated_module.POPULATIONS.join(', ')}`);
console.log(`   AIMS count:  ${generated_module.AIMS.length}`);

const issues = generated_module.validate();
console.log(`   validate():  ${issues.length} issues`);

// ── Check 1: rs2814778 (DARC — marcador africano clásico) ────────────────
console.log('\n── Check 1: rs2814778 (DARC, esperado AFR_W≥0.9)');
const darc = generated_module.AIMS.find(a => a.rsid === 'rs2814778');
if (darc) {
    const f = darc.frequencies;
    console.log(`   AFR_W=${f.AFR_W.toFixed(4)} AFR_E=${f.AFR_E.toFixed(4)} EUR_N=${f.EUR_N.toFixed(4)} EUR_S=${f.EUR_S.toFixed(4)}`);
    const ok = f.AFR_W >= 0.9 && f.EUR_N < 0.05;
    console.log(`   Resultado: ${ok ? '✅ OK' : '❌ FALLO BIOLÓGICO'}`);
} else {
    console.log('   ❌ rs2814778 no encontrado en AIMS');
}

// ── Check 2: AIM con mayor freq EUR_N+EUR_S ─────────────────────────────
console.log('\n── Check 2: Top AIM europeo (EUR_N + EUR_S)');
const topEur = [...generated_module.AIMS].sort((a, b) =>
    (b.frequencies.EUR_N + b.frequencies.EUR_S) - (a.frequencies.EUR_N + a.frequencies.EUR_S)
)[0];
if (topEur) {
    console.log(`   ${topEur.rsid}: EUR_N=${topEur.frequencies.EUR_N.toFixed(4)} EUR_S=${topEur.frequencies.EUR_S.toFixed(4)} AMR_NAT=${topEur.frequencies.AMR_NAT.toFixed(4)} AFR_W=${topEur.frequencies.AFR_W.toFixed(4)}`);
    const total = topEur.frequencies.EUR_N + topEur.frequencies.EUR_S;
    console.log(`   EUR_N+EUR_S = ${total.toFixed(4)} ${total > 0.9 ? '✅' : '⚠️  < 0.9'}`);
}

// ── Check 2b: AIM con mayor freq AMR_NAT ────────────────────────────────
console.log('\n── Check 2b: Top AIM amerindio (AMR_NAT)');
const topAmr = [...generated_module.AIMS].sort((a, b) =>
    b.frequencies.AMR_NAT - a.frequencies.AMR_NAT
)[0];
if (topAmr) {
    console.log(`   ${topAmr.rsid}: AMR_NAT=${topAmr.frequencies.AMR_NAT.toFixed(4)} EUR_N=${topAmr.frequencies.EUR_N.toFixed(4)} AFR_W=${topAmr.frequencies.AFR_W.toFixed(4)}`);
}

// ── Check 3: Summary stats por sub-población ────────────────────────────
console.log('\n── Check 3: Summary stats (min/max/mean por sub-población)');
const headers = ['Sub-pop', 'min', 'max', 'mean', 'n>0.5', 'Discrimina?'];
const rows = [];
for (const pop of generated_module.POPULATIONS) {
    const freqs = generated_module.AIMS.map(a => a.frequencies[pop]);
    const min  = Math.min(...freqs);
    const max  = Math.max(...freqs);
    const mean = freqs.reduce((s, v) => s + v, 0) / freqs.length;
    const high = freqs.filter(v => v > 0.5).length;
    const ok   = max > 0.7 && min < 0.3;
    rows.push({ pop, min: min.toFixed(3), max: max.toFixed(3), mean: mean.toFixed(3), high, ok });
    console.log(`   ${pop.padEnd(9)} min=${min.toFixed(3)} max=${max.toFixed(3)} mean=${mean.toFixed(3)} AIMs>0.5: ${String(high).padStart(3)}  ${ok ? '✅' : '⚠️ '}`);
}

const allDiscriminate = rows.every(r => r.ok);
console.log(`\n   Discriminación general: ${allDiscriminate ? '✅ TODAS las sub-pops discriminan' : '⚠️  Alguna sub-pop tiene discriminación baja'}`);

// ── Resumen final ────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(55));
console.log(`B2 resultado: ${issues.length === 0 && (!darc || darc.frequencies.AFR_W >= 0.9) ? '✅ PASS' : '❌ REVISAR'}`);
console.log('═'.repeat(55));
