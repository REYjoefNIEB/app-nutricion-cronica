'use strict';

/**
 * Universal DNA file parser.
 * Supported formats: 23andMe (TSV), AncestryDNA (TSV), MyHeritage (CSV), FTDNA/LivingDNA (CSV).
 * ZIP auto-extraction: parseDNABuffer() detects ZIP magic bytes and extracts the inner file.
 */

const AdmZip = require('adm-zip');

// ── Format detection ──────────────────────────────────────────────────────────

function detectFormat(fileContent) {
    const head = fileContent.slice(0, 4000).toLowerCase();

    if (head.includes('myheritage')) return 'myheritage';
    if (head.includes('familytreedna') || head.includes('ftdna') || head.includes('family tree dna')) return 'ftdna';
    if (head.includes('ancestrydna') || head.includes('ancestry.com')) return 'ancestry';
    if (head.includes('23andme')) return '23andme';

    // Heuristic: find first data-looking line and check separator
    const lines = fileContent.split('\n');
    const dataLine = lines.find(l => {
        const t = l.trim();
        return t && !t.startsWith('#') && /^"?rs\d+/i.test(t);
    });
    if (dataLine) {
        if (dataLine.includes('\t')) return '23andme';
        if (dataLine.includes(',')) return 'myheritage';
    }

    return 'unknown';
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

/**
 * Parses a single CSV line, handling double-quoted fields and "" escaped quotes.
 * Does not use a general CSV library — DNA files are simple and performance matters.
 */
function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            parts.push(current);
            current = '';
        } else {
            current += c;
        }
    }
    parts.push(current);
    return parts.map(s => s.trim());
}

// ── Genotype validation ───────────────────────────────────────────────────────

function isValidGenotype(g) {
    if (!g || g.length !== 2) return false;
    if (g === '--' || g === '00' || g === 'NN') return false;  // no-calls
    return /^[ACGTDI]{2}$/i.test(g);
}

// ── Per-format parsers ────────────────────────────────────────────────────────

function parse23andMe(fileContent) {
    const snps = {};
    const lines = fileContent.split('\n');
    let processed = 0, skipped = 0;

    for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#')) { skipped++; continue; }
        const parts = t.split('\t');
        if (parts.length < 4) { skipped++; continue; }
        const [rsid, chromosome, position, rawGt] = parts;
        if (!rsid.startsWith('rs') && !rsid.startsWith('i')) { skipped++; continue; }
        const genotype = rawGt.trim().toUpperCase();
        if (!isValidGenotype(genotype)) { skipped++; continue; }
        snps[rsid] = { chromosome: chromosome.trim(), position: position.trim(), genotype };
        processed++;
    }
    return { snps, metadata: { format: '23andme', totalProcessed: processed, totalSkipped: skipped, totalSnps: processed } };
}

function parseAncestry(fileContent) {
    const snps = {};
    const lines = fileContent.split('\n');
    let processed = 0, skipped = 0;

    for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith('#') || /^rsid\b/i.test(t)) { skipped++; continue; }
        const parts = t.split('\t');
        if (parts.length < 5) { skipped++; continue; }
        const [rsid, chromosome, position, allele1, allele2] = parts;
        if (!rsid.startsWith('rs')) { skipped++; continue; }
        const genotype = (allele1.trim() + allele2.trim()).toUpperCase();
        if (!isValidGenotype(genotype)) { skipped++; continue; }
        snps[rsid] = { chromosome: chromosome.trim(), position: position.trim(), genotype };
        processed++;
    }
    return { snps, metadata: { format: 'ancestry', totalProcessed: processed, totalSkipped: skipped, totalSnps: processed } };
}

function parseMyHeritage(fileContent) {
    const snps = {};
    const lines = fileContent.split('\n');
    let processed = 0, skipped = 0;

    for (const line of lines) {
        const t = line.trim();
        if (!t) { skipped++; continue; }

        // Skip comment lines (# and ##) and header row (with or without quotes)
        if (t.startsWith('#') || /^"?RSID"?[,\t]/i.test(t)) { skipped++; continue; }

        const parts = t.includes(',') ? parseCSVLine(t) : t.split('\t').map(s => s.trim());
        if (parts.length < 4) { skipped++; continue; }

        const [rawRsid, rawChrom, rawPos, rawGt] = parts;
        const rsid = rawRsid.replace(/"/g, '').trim();
        if (!rsid.startsWith('rs') && !rsid.startsWith('i')) { skipped++; continue; }

        const genotype = rawGt.replace(/"/g, '').trim().toUpperCase();
        if (!isValidGenotype(genotype)) { skipped++; continue; }

        snps[rsid] = {
            chromosome: rawChrom.replace(/"/g, '').trim(),
            position:   rawPos.replace(/"/g, '').trim(),
            genotype
        };
        processed++;
    }
    return { snps, metadata: { format: 'myheritage', totalProcessed: processed, totalSkipped: skipped, totalSnps: processed } };
}

// FTDNA CSV format is similar to MyHeritage CSV
function parseFTDNA(fileContent) {
    const result = parseMyHeritage(fileContent);
    result.metadata.format = 'ftdna';
    return result;
}

// ── Main entry points ─────────────────────────────────────────────────────────

function parseDNAFile(fileContent) {
    if (!fileContent || typeof fileContent !== 'string') throw new Error('Archivo inválido');
    if (fileContent.length < 1000) throw new Error('Archivo demasiado pequeño');
    if (fileContent.length > 50 * 1024 * 1024) throw new Error('Archivo demasiado grande (máx 50MB)');

    const format = detectFormat(fileContent);
    console.log(`[PARSER] Formato detectado: ${format} (${Math.round(fileContent.length / 1024)} KB)`);

    let result;
    switch (format) {
        case '23andme':    result = parse23andMe(fileContent);   break;
        case 'ancestry':   result = parseAncestry(fileContent);  break;
        case 'myheritage': result = parseMyHeritage(fileContent); break;
        case 'ftdna':      result = parseFTDNA(fileContent);     break;
        default:
            // Unknown: try 23andMe TSV as last resort
            result = parse23andMe(fileContent);
            if (result.metadata.totalSnps < 1000) {
                throw new Error('Formato no reconocido. Formatos soportados: 23andMe, AncestryDNA, MyHeritage, FTDNA. Se puede subir .txt, .csv o .zip.');
            }
            result.metadata.format = 'unknown_tsv';
    }

    console.log(`[PARSER] SNPs válidos: ${result.metadata.totalSnps} | skipped: ${result.metadata.totalSkipped}`);

    if (result.metadata.totalSnps < 100000) {
        throw new Error(`Pocos SNPs detectados (${result.metadata.totalSnps}). Se requieren al menos 100,000 SNPs. Archivo posiblemente truncado o en formato incorrecto.`);
    }

    return result;
}

/**
 * Entry point for Cloud Functions — accepts a Buffer directly.
 * Auto-detects ZIP by magic bytes and extracts the inner DNA file.
 * Falls back to UTF-8 text for plain .txt/.csv files.
 */
function parseDNABuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) throw new Error('Se esperaba un Buffer');

    // ZIP magic bytes: PK\x03\x04
    if (buffer.length >= 4 &&
        buffer[0] === 0x50 && buffer[1] === 0x4B &&
        buffer[2] === 0x03 && buffer[3] === 0x04) {

        console.log('[PARSER] ZIP detectado — extrayendo archivo interno...');
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries()
            .filter(e => !e.isDirectory && !e.entryName.startsWith('__MACOSX'))
            .filter(e => /\.(csv|txt)$/i.test(e.entryName))
            .sort((a, b) => b.header.size - a.header.size);  // largest file first

        if (entries.length === 0) {
            throw new Error('El ZIP no contiene ningún archivo .csv o .txt con datos de ADN.');
        }

        const entry = entries[0];
        console.log(`[PARSER] Extrayendo: ${entry.entryName} (${Math.round(entry.header.size / 1024)} KB)`);
        const content = entry.getData().toString('utf8');
        return parseDNAFile(content);
    }

    // Plain text file (23andMe, MyHeritage CSV, AncestryDNA)
    const content = buffer.toString('utf8');
    return parseDNAFile(content);
}

// ── Utility ───────────────────────────────────────────────────────────────────

function extractRelevantSNPs(allSnps, nuraDatabase) {
    const relevant = {};
    for (const rsid of Object.keys(nuraDatabase)) {
        if (allSnps[rsid]) relevant[rsid] = allSnps[rsid];
    }
    return {
        relevantSnps:    relevant,
        foundCount:      Object.keys(relevant).length,
        searchedCount:   Object.keys(nuraDatabase).length,
        coveragePercent: (Object.keys(relevant).length / Object.keys(nuraDatabase).length * 100).toFixed(1)
    };
}

module.exports = {
    parseDNAFile,
    parseDNABuffer,
    parse23andMe,
    parseAncestry,
    parseMyHeritage,
    detectFormat,
    extractRelevantSNPs,
    _internals: { parseCSVLine, isValidGenotype }
};
