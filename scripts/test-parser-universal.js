#!/usr/bin/env node
/**
 * Unit tests for the universal DNA parser.
 * Run from project root: node scripts/test-parser-universal.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { parseDNAFile, parseDNABuffer, detectFormat, _internals } = require('../functions/genetics/parser');
const { parseCSVLine, isValidGenotype } = _internals;

let pass = 0, fail = 0;

function assert(name, actual, expected, opts = {}) {
    const { op = 'eq', tolerance } = opts;
    let ok;
    if (op === 'gte')      ok = actual >= expected;
    else if (op === 'lte') ok = actual <= expected;
    else                   ok = actual === expected;

    if (ok) {
        console.log(`  ✅ ${name}: ${actual}`);
        pass++;
    } else {
        console.log(`  ❌ ${name}: got ${actual}, expected ${op === 'eq' ? expected : op + ' ' + expected}`);
        fail++;
    }
}

// ── Unit: parseCSVLine ────────────────────────────────────────────────────────
console.log('\n=== parseCSVLine ===');
{
    const r1 = parseCSVLine('"rs547237130","1","72526","AA"');
    assert('field 0', r1[0], 'rs547237130');
    assert('field 3', r1[3], 'AA');

    const r2 = parseCSVLine('"rs1","1","100","AG"');
    assert('AG genotype', r2[3], 'AG');

    // Escaped quote inside field
    const r3 = parseCSVLine('"rs1","chr1","100","AA""B"');
    assert('escaped quote parses', r3.length, 4);
}

// ── Unit: isValidGenotype ─────────────────────────────────────────────────────
console.log('\n=== isValidGenotype ===');
{
    assert('AA valid',  isValidGenotype('AA'), true);
    assert('AG valid',  isValidGenotype('AG'), true);
    assert('DD valid',  isValidGenotype('DD'), true);
    assert('-- invalid', isValidGenotype('--'), false);
    assert('NN invalid', isValidGenotype('NN'), false);
    assert('0 invalid',  isValidGenotype('0'),  false);
    assert('XY invalid', isValidGenotype('XY'), false);
}

// ── Integration: real files ───────────────────────────────────────────────────
const SAMPLES = [
    {
        name: 'Corpas padre (23andMe TSV)',
        path: path.join(__dirname, 'test-data', 'adn-A-corpas-padre.txt'),
        expectedFormat: '23andme',
        minSnps: 400000
    },
    {
        name: 'Sporny 23andMe v1',
        path: path.join(__dirname, 'test-data', 'adn-B-sporny.txt'),
        expectedFormat: '23andme',
        minSnps: 400000
    },
    {
        name: 'MyHeritage CSV (GSA chip)',
        path: path.join(__dirname, 'myheritage-format-check', 'MyHeritage_raw_dna_data.csv'),
        expectedFormat: 'myheritage',
        minSnps: 500000
    }
];

let { AIMS } = (() => { try { return require('../functions/ancestry/referenceData'); } catch(_) { return { AIMS: [] }; } })();
const clgSet = new Set(AIMS.map(a => a.rsid));

for (const s of SAMPLES) {
    console.log(`\n=== ${s.name} ===`);

    if (!fs.existsSync(s.path)) {
        console.log(`  ⚠️  Archivo no encontrado: ${s.path}`);
        continue;
    }

    const content = fs.readFileSync(s.path, 'utf8');
    let result;
    try {
        result = parseDNAFile(content);
    } catch (e) {
        console.log(`  ❌ parseDNAFile error: ${e.message}`);
        fail++;
        continue;
    }

    assert('format', result.metadata.format, s.expectedFormat);
    assert('SNPs >= ' + s.minSnps, result.metadata.totalSnps, s.minSnps, { op: 'gte' });

    if (AIMS.length > 0) {
        const matched = Object.keys(result.snps).filter(r => clgSet.has(r)).length;
        console.log(`  CLG AIMs matched: ${matched}/${AIMS.length}`);
    }

    // Sample 5 rsids
    const sample = Object.entries(result.snps).slice(0, 5);
    sample.forEach(([r, d]) => console.log(`    ${r} = ${d.genotype}`));
}

// ── ZIP test (synthetic) ──────────────────────────────────────────────────────
console.log('\n=== parseDNABuffer (synthetic ZIP) ===');
{
    const AdmZip = (() => { try { return require('../functions/node_modules/adm-zip'); } catch(_) { return null; } })();
    if (AdmZip) {
        const mhPath = path.join(__dirname, 'myheritage-format-check', 'MyHeritage_raw_dna_data.csv');
        if (fs.existsSync(mhPath)) {
            const zip = new AdmZip();
            zip.addFile('MyHeritage_raw_dna_data.csv', fs.readFileSync(mhPath));
            const zipBuffer = zip.toBuffer();

            try {
                const result = parseDNABuffer(zipBuffer);
                assert('ZIP: format', result.metadata.format, 'myheritage');
                assert('ZIP: SNPs >= 500000', result.metadata.totalSnps, 500000, { op: 'gte' });
            } catch (e) {
                console.log(`  ❌ parseDNABuffer ZIP error: ${e.message}`);
                fail++;
            }
        } else {
            console.log('  ⚠️  MyHeritage CSV not found for ZIP test');
        }
    } else {
        console.log('  ⚠️  adm-zip not available for ZIP test');
    }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log(`  RESULTADO: ${fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL / ${pass} PASS`}`);
console.log('══════════════════════════════════════════════');

if (fail > 0) process.exit(1);
