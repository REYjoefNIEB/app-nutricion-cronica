#!/usr/bin/env node
/**
 * Generates extended referenceData.js (v3) combining:
 *   - 141 CLG AIMs (Verdugo et al 2020)
 *   - new Kidd+Seldin AIMs from 01-fetch-new-aims.js
 *
 * Run: node scripts/ancestry-data-v3/02-generate-extended-panel.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const CLG_MODULE = require('../../functions/ancestry/referenceData');
const CLG_AIMS   = CLG_MODULE.AIMS;

const newAims = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'new-aims-enriched.json'), 'utf8')
);

// Deduplicate: skip any new AIM already in CLG
const clgSet  = new Set(CLG_AIMS.map(a => a.rsid));
const addAims = newAims.filter(a => !clgSet.has(a.rsid));
if (addAims.length < newAims.length) {
    console.warn(`Removed ${newAims.length - addAims.length} duplicates already in CLG`);
}

const extendedAims = [...CLG_AIMS, ...addAims];
const VERSION      = `v3-${extendedAims.length}AIMs-CLG${CLG_AIMS.length}+KS${addAims.length}-2026-04-22`;

console.log(`CLG AIMs:       ${CLG_AIMS.length}`);
console.log(`Kidd+Seldin:    ${addAims.length}`);
console.log(`Panel extended: ${extendedAims.length}`);

const header = `\
// ─────────────────────────────────────────────────────────────────────────────
// referenceData.js — NURA ancestry reference data (v3 extended panel)
//
// Generated: ${new Date().toISOString()}
// Script:    scripts/ancestry-data-v3/02-generate-extended-panel.js
// Sources:
//   - Verdugo et al 2020 (Biol Res 53:15) — 141 CLG AIMs
//   - Kidd et al 2014 (Forensic Sci Int Genetics 10:23) — 55 Kidd AIMs
//   - Kosoy/Seldin et al 2009 (Human Mutation 30:69) — 128 Seldin AIMs
//   - Population frequencies: 1000G Phase 3 via Ensembl REST (fetched 2026-04-22)
//
// Panel: ${extendedAims.length} AIMs total (${CLG_AIMS.length} CLG + ${addAims.length} Kidd+Seldin)
//   - 23andMe (modern chip): ~57-90 AIMs matched
//   - AncestryDNA: ~50-80 AIMs matched
//   - MyHeritage GSA: ~120-150 AIMs matched (was 36 with CLG-only panel)
//
// DO NOT EDIT MANUALLY — regenerate with the script if source data changes.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const VERSION = '${VERSION}';

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

const AIMS = ${JSON.stringify(extendedAims, null, 2)};

function validate() {
    const issues = [];
    for (const aim of AIMS) {
        if (!aim.minorAllele) issues.push(aim.rsid + ': missing minorAllele');
        if (!aim.majorAllele) issues.push(aim.rsid + ': missing majorAllele');
        if (!aim.frequencies) { issues.push(aim.rsid + ': missing frequencies'); continue; }
        for (const pop of POPULATIONS) {
            const v = aim.frequencies[pop];
            if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 1) {
                issues.push(aim.rsid + ': invalid freq ' + pop + '=' + v);
            }
        }
    }
    if (issues.length > 0) {
        const pct = (issues.length / AIMS.length * 100).toFixed(1);
        console.warn('[REF_DATA_V3] ' + issues.length + ' issues (' + pct + '% of AIMs)');
        if (issues.length <= 10) console.warn('[REF_DATA_V3]', issues);
        else console.warn('[REF_DATA_V3] First 10:', issues.slice(0, 10));
    }
    return issues;
}

function aggregateToMacroRegions(qSubPop) {
    const macro = { EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR_NAT: 0, OCE: 0 };
    for (const [subpop, value] of Object.entries(qSubPop)) {
        const m = MACRO_REGION[subpop];
        if (m) macro[m] = (macro[m] || 0) + value;
    }
    return macro;
}

module.exports = { VERSION, POPULATIONS, POPULATION_LABELS, MACRO_REGION, AIMS, validate, aggregateToMacroRegions };
`;

const outPath = path.join(__dirname, '..', '..', 'functions', 'ancestry', 'referenceData.js');

// Backup existing file
const backupPath = outPath.replace('.js', '_v2_backup.js');
if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(outPath, backupPath);
    console.log(`Backup: ${backupPath}`);
}

fs.writeFileSync(outPath, header, 'utf8');
console.log(`\n✅ Written: ${outPath}`);
console.log(`   VERSION: ${VERSION}`);
console.log(`   AIMS: ${extendedAims.length}`);
