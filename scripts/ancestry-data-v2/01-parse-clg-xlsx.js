#!/usr/bin/env node
'use strict';
const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const INPUT  = path.join(__dirname, 'CLG-panel-147-aims.xls');
const OUTPUT = path.join(__dirname, '01-aims-parsed.json');

const wb   = XLSX.readFile(INPUT);
const sheet = wb.Sheets[wb.SheetNames[0]];

// Print raw headers to understand column names
const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
console.log('Hoja activa:', wb.SheetNames[0]);
console.log('Fila 1 (headers):', JSON.stringify(raw[0]));
console.log('Fila 2 (primera data):', JSON.stringify(raw[1]));
console.log('Total filas:', raw.length);
console.log();

const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

// Detectar nombre exacto de columnas
const sample = rows[0] || {};
console.log('Columnas detectadas:', Object.keys(sample));
console.log('Ejemplo fila 1:', JSON.stringify(sample));
console.log();

const aims = rows
    .filter(r => {
        // El rsid puede estar en columna 'rsID', 'rsid', 'SNP', 'SNPID', etc.
        const id = r.rsID || r.rsid || r.SNP || r.snp || r.SNPID || '';
        return typeof id === 'string' && id.trim().startsWith('rs');
    })
    .map(r => {
        const rsid = (r.rsID || r.rsid || r.SNP || r.snp || r.SNPID || '').trim();

        // Chr: puede ser "1p", "2q", "Xp", etc. — extraer número/letra
        const chrRaw  = String(r.Chr || r.chr || r.CHR || r.Chromosome || '');
        const chrMatch = chrRaw.match(/^(\d+|X|Y|MT)/i);
        const chromosome = chrMatch ? chrMatch[1].toUpperCase() : chrRaw;

        // Posición
        const position = Number(r.bp || r.pos || r.position || r.BP || 0);

        // Alelos: A1/A2 en formato "A/G" o columnas separadas A1 y A2
        let minorAllele = '', majorAllele = '';
        const a1a2 = String(r['A1/A2'] || r.A1A2 || '');
        if (a1a2.includes('/')) {
            [minorAllele, majorAllele] = a1a2.split('/').map(s => s.trim().toUpperCase());
        } else {
            minorAllele = String(r.A1 || r.a1 || r.minor || '').trim().toUpperCase();
            majorAllele = String(r.A2 || r.a2 || r.major || '').trim().toUpperCase();
        }

        // MAF (chileno)
        const MAF_chile = parseFloat(r.MAF || r.maf || r.freq || 0) || null;

        return { rsid, chromosome, chrOriginal: chrRaw, position, minorAllele, majorAllele, MAF_chile };
    })
    .filter(a => a.rsid && a.minorAllele && a.majorAllele);

fs.writeFileSync(OUTPUT, JSON.stringify(aims, null, 2));
console.log(`✅ Parseados ${aims.length} AIMs del XLSX`);
console.log('Ejemplo primero:', JSON.stringify(aims[0], null, 2));
console.log('Ejemplo último:', JSON.stringify(aims[aims.length - 1], null, 2));

// Validaciones básicas
const sinChr = aims.filter(a => !a.chromosome).length;
const sinPos = aims.filter(a => !a.position).length;
const sinMAF = aims.filter(a => !a.MAF_chile).length;
console.log(`\nValidación:`);
console.log(`  Sin cromosoma: ${sinChr}`);
console.log(`  Sin posición:  ${sinPos}`);
console.log(`  Sin MAF:       ${sinMAF}`);
