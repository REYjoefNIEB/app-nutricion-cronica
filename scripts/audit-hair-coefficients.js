'use strict';
/**
 * audit-hair-coefficients.js
 *
 * Compares extracted webtool coefficients (audit-only) vs Nura's current
 * HAIR_COEFFICIENTS in functions/traits/hirisplex.js.
 *
 * Outputs: scripts/validation-data/hair_coefficients_audit_report.md
 *
 * Convention adjustments applied before comparison:
 *   rs16891982: extracted (per C) is negated to match Nura (per G).
 *               Intercept is corrected: α_nura_equiv = α_ext + 2×β_ext_rs16891982
 */
const path = require('path');
const fs   = require('fs');

// ── Paths ─────────────────────────────────────────────────────────────────────
const EXTRACTED_JSON = path.join(__dirname, 'validation-data', 'hair_coefficients_extracted.json');
const GEROE_CSV      = path.join(__dirname, 'validation-data', 'geroe_webtool.csv');
const HIRISPLEX_JS   = path.join(__dirname, '..', 'functions', 'traits', 'hirisplex.js');
const REPORT_MD      = path.join(__dirname, 'validation-data', 'hair_coefficients_audit_report.md');

// ── Load extracted coefficients ────────────────────────────────────────────────
const extractedData = JSON.parse(fs.readFileSync(EXTRACTED_JSON, 'utf8'));
const ext           = extractedData.coefficients;  // { blond: { intercept, betas }, brown: ..., red: ... }

// ── Load Nura's current HAIR_COEFFICIENTS via source parse ─────────────────────
// We evaluate the HAIR_COEFFICIENTS block from the source using Function().
// This is safe: the file contains only numeric literals in that block.
const src = fs.readFileSync(HIRISPLEX_JS, 'utf8');

// Extract the HAIR_COEFFICIENTS object literal
const hairMatch = src.match(/const HAIR_COEFFICIENTS\s*=\s*(\{[\s\S]*?\n\});/);
if (!hairMatch) { console.error('Cannot find HAIR_COEFFICIENTS in hirisplex.js'); process.exit(1); }

let HAIR_COEFS;
try {
    HAIR_COEFS = new Function('return ' + hairMatch[1])();
} catch (e) {
    console.error('Cannot eval HAIR_COEFFICIENTS:', e.message);
    process.exit(1);
}

// ── Convention adjustment for rs16891982 ──────────────────────────────────────
// Webtool oracle counts C allele; Nura counts G allele (opposite).
// To compare: negate extracted beta for rs16891982.
// Adjust intercept: α_nura_equiv = α_ext + 2 × β_ext_rs16891982
const CATS     = ['blond', 'brown', 'red'];
const adjExt   = {};

for (const cat of CATS) {
    const rawBeta16 = ext[cat].betas['rs16891982'];
    const adjIntercept = rawBeta16 !== null
        ? +(ext[cat].intercept + 2 * rawBeta16).toFixed(4)
        : ext[cat].intercept;

    const adjBetas = {};
    for (const [rsid, val] of Object.entries(ext[cat].betas)) {
        adjBetas[rsid] = (rsid === 'rs16891982' && val !== null) ? +(-val).toFixed(4) : val;
    }

    adjExt[cat] = { intercept: adjIntercept, betas: adjBetas };
}

// ── Comparison helpers ─────────────────────────────────────────────────────────
function diff(a, b) {
    if (a === null || b === null || b === undefined) return null;
    return +(a - b).toFixed(4);
}
function pctDiff(a, b) {
    if (a === null || b === null || b === undefined || b === 0) return null;
    return +((Math.abs(a - b) / Math.abs(b)) * 100).toFixed(2);
}
function absD(a, b) {
    if (a === null || b === null || b === undefined) return null;
    return +Math.abs(a - b).toFixed(4);
}

// ── Collect all deltas ─────────────────────────────────────────────────────────
const allDeltas = [];  // { cat, snp, ext, nura, abs_diff, pct_diff }

for (const cat of CATS) {
    const nuCat  = HAIR_COEFS[cat];
    const exCat  = adjExt[cat];
    if (!nuCat) continue;

    // Intercept
    allDeltas.push({
        cat, snp: '__intercept__',
        ext: exCat.intercept, nura: nuCat.intercept,
        abs_diff: absD(exCat.intercept, nuCat.intercept),
        pct_diff: pctDiff(exCat.intercept, nuCat.intercept),
    });

    // Betas
    for (const [rsid, extVal] of Object.entries(exCat.betas)) {
        const nuraVal = nuCat.betas?.[rsid];
        if (nuraVal === undefined) continue;
        allDeltas.push({
            cat, snp: rsid,
            ext: extVal, nura: nuraVal,
            abs_diff: absD(extVal, nuraVal),
            pct_diff: pctDiff(extVal, nuraVal),
        });
    }
}

// ── Statistics per category ────────────────────────────────────────────────────
function stats(deltas) {
    const valid = deltas.filter(d => d.abs_diff !== null);
    if (!valid.length) return { mean: 0, max: 0, worstSnp: 'N/A' };
    const absDiffs = valid.map(d => d.abs_diff);
    const mean = +(absDiffs.reduce((s, v) => s + v, 0) / absDiffs.length).toFixed(4);
    const max  = +Math.max(...absDiffs).toFixed(4);
    const worstSnp = valid[absDiffs.indexOf(Math.max(...absDiffs))].snp;
    return { mean, max, worstSnp };
}

const catStats = {};
for (const cat of CATS) {
    const betaDeltas = allDeltas.filter(d => d.cat === cat && d.snp !== '__intercept__');
    catStats[cat] = {
        betas:     stats(betaDeltas),
        intercept: allDeltas.find(d => d.cat === cat && d.snp === '__intercept__'),
    };
}

// ── Top 5 SNPs with largest abs_diff (across all cats) ────────────────────────
const top5 = [...allDeltas]
    .filter(d => d.abs_diff !== null)
    .sort((a, b) => b.abs_diff - a.abs_diff)
    .slice(0, 5);

// ── GEroe comparative prediction ───────────────────────────────────────────────
// Load GEroe webtool counts from geroe_webtool.csv
const csvLines  = fs.readFileSync(GEROE_CSV, 'utf8').trim().split('\n');
const wt_header = csvLines[0].split(',');
const wt_vals   = csvLines[1].split(',');

// Build webtool-convention snpValues map
const wt_map = {};
wt_header.forEach((col, i) => {
    const v = wt_vals[i];
    wt_map[col.split('_')[0]] = (v === 'NA' || v === undefined) ? null : parseInt(v, 10);
});

// Softmax prediction given coefficients object and snpValues
function softmaxHair(coefs, snpVals, convention) {
    // convention: 'nura' or 'webtool'
    // For 'nura': snpVals are in our G-allele convention for rs16891982
    // For 'webtool': snpVals are in webtool C-allele convention for rs16891982
    const logits  = {};
    for (const cat of CATS) {
        const params = coefs[cat];
        if (!params) { logits[cat] = 0; continue; }
        let lgt = params.intercept || 0;
        for (const [rsid, beta] of Object.entries(params.betas || {})) {
            const val = snpVals[rsid];
            if (val !== null && val !== undefined && beta) lgt += beta * val;
        }
        logits[cat] = lgt;
    }
    logits['black'] = 0;  // reference category

    const expL = {};
    let sumExp = 0;
    for (const [cat, lgt] of Object.entries(logits)) {
        expL[cat] = Math.exp(lgt);
        sumExp += expL[cat];
    }
    const probs = {};
    for (const [cat, e] of Object.entries(expL)) probs[cat] = +(e / sumExp * 100).toFixed(2);
    return probs;
}

// Nura prediction: uses HAIR_COEFS with nura snpValues
// GEroe's webtool counts are in webtool convention.
// For rs16891982: webtool has C count; nura needs G count.
// Since rs16891982 = het (C=1 in webtool) → G=1 in nura (het is symmetric).
// In general for non-palindromic: nura_count = webtool_count (same allele for most SNPs).
// For rs16891982: nura_G = 2 - webtool_C (since G + C = 2 for diploid).
const nura_snpVals = { ...wt_map };
if (wt_map['rs16891982'] !== null) {
    nura_snpVals['rs16891982'] = 2 - wt_map['rs16891982'];
}

const geroe_nura = softmaxHair(HAIR_COEFS,  nura_snpVals, 'nura');
// Extracted prediction uses adjExt (already adjusted to nura G-convention)
const geroe_ext  = softmaxHair(adjExt, nura_snpVals, 'nura');

// ── Determine recommendation ──────────────────────────────────────────────────
const maxBetaDiff = Math.max(...CATS.map(c => catStats[c].betas.max));
const meanBetaDiff = +(CATS.reduce((s, c) => s + catStats[c].betas.mean, 0) / CATS.length).toFixed(4);

let recommendation;
if (maxBetaDiff < 0.05) {
    recommendation = '**MANTENER** coeficientes actuales — divergencia dentro de ruido estadístico.';
} else if (maxBetaDiff < 0.2) {
    recommendation = '**AJUSTE MANUAL PUNTUAL** recomendado para los SNPs con mayor divergencia usando literatura pública.';
} else {
    recommendation = '**DIVERGENCIA SIGNIFICATIVA** — evaluar ajuste manual extensivo o licenciamiento del Walsh lab.';
}

// ── Generate markdown report ──────────────────────────────────────────────────
const now = new Date().toISOString().split('T')[0];

const md = `# Auditoría HAIR_COEFFICIENTS — ${now}

> **CONFIDENCIAL — SOLO USO INTERNO**
> Los coeficientes extraídos son obtenidos por ingeniería inversa del webtool HIrisPlex-S.
> Copyright EP2195448 (Walsh lab / Erasmus MC). NO compartir ni publicar.

## Resumen ejecutivo

| Categoría | Intercept actual | Intercept ref (adj) | Δ intercept | Media Δβ | Max Δβ | Peor SNP |
|-----------|-----------------|---------------------|-------------|----------|--------|----------|
${CATS.map(cat => {
    const ic = catStats[cat].intercept;
    return `| ${cat.padEnd(6)} | ${ic?.nura ?? 'N/A'} | ${ic?.ext ?? 'N/A'} | ${ic?.abs_diff ?? 'N/A'} | ${catStats[cat].betas.mean} | ${catStats[cat].betas.max} | ${catStats[cat].betas.worstSnp} |`;
}).join('\n')}

- **Divergencia media global (betas):** ${meanBetaDiff}
- **Divergencia máxima global (betas):** ${maxBetaDiff}

## Top 5 SNPs con mayor divergencia

| Categoría | SNP | Actual (Nura) | Extraído (ref) | Diff abs | Diff % |
|-----------|-----|---------------|----------------|----------|--------|
${top5.map(d =>
    `| ${d.cat} | ${d.snp} | ${d.nura} | ${d.ext} | ${d.abs_diff} | ${d.pct_diff ?? 'N/A'}% |`
).join('\n')}

## Predicción GEroe comparativa

Genotipos: ${Object.entries(wt_map).filter(([, v]) => v !== null && v > 0).map(([r, v]) => `${r}=${v}`).join(', ')}

| Categoría | Nura actual | Referencia extraída | Diff pp |
|-----------|-------------|---------------------|---------|
${['blond', 'brown', 'red', 'black'].map(cat =>
    `| ${cat.padEnd(6)} | ${geroe_nura[cat]}% | ${geroe_ext[cat]}% | ${Math.abs((geroe_nura[cat] || 0) - (geroe_ext[cat] || 0)).toFixed(2)}pp |`
).join('\n')}

## Notas de convención

- **rs16891982**: Webtool cuenta alelo C; Nura cuenta alelo G (opuesto). Beta extraída negada antes de comparar. Intercept ajustado: α_adj = α_ext + 2×β_ext_C.
- **rs12821256**: Webtool cuenta G; MyHeritage reporta C (strand flip). Mismo alelo → comparación directa.
- **rs1393350**: Webtool cuenta T; MyHeritage reporta A (strand flip). Mismo alelo → comparación directa.
- **rs12913832**: Webtool cuenta T (minus strand); Nura cuenta A (plus strand). Mismo alelo → comparación directa.

## Detalle completo por categoría

${CATS.map(cat => {
    const rows = allDeltas
        .filter(d => d.cat === cat)
        .sort((a, b) => (b.abs_diff || 0) - (a.abs_diff || 0));
    return `### ${cat}

| SNP | Nura actual | Referencia | Diff abs |
|-----|-------------|------------|----------|
${rows.map(d =>
    `| ${d.snp.padEnd(15)} | ${d.nura ?? 'N/A'} | ${d.ext ?? 'N/A'} | ${d.abs_diff ?? 'N/A'} |`
).join('\n')}`;
}).join('\n\n')}

## Recomendación

${recommendation}

${maxBetaDiff >= 0.05 && maxBetaDiff < 0.2 ? `
### SNPs candidatos para ajuste manual

Los siguientes SNPs presentan |Δβ| > 0.05 en alguna categoría:

${allDeltas
    .filter(d => d.abs_diff !== null && d.abs_diff >= 0.05 && d.snp !== '__intercept__')
    .sort((a, b) => b.abs_diff - a.abs_diff)
    .map(d => `- **${d.snp}** (${d.cat}): Nura=${d.nura} vs ref=${d.ext} → Δ=${d.abs_diff}`)
    .join('\n')}

Para ajustar, buscar valores publicados en Walsh et al. 2011, Supplementary Table 4,
o en el paper de validación extendida (Chaitanya et al. 2018 / Walsh et al. 2013).
NO usar los valores extraídos directamente.
` : ''}

---
*Generado por scripts/audit-hair-coefficients.js | ${extractedData.extractedAt}*
*Fuente de referencia: ${extractedData.source}*
`;

fs.writeFileSync(REPORT_MD, md);
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  audit-hair-coefficients.js                                 ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');
console.log(`✅ Report → ${REPORT_MD}\n`);
console.log(`  Max Δβ global:  ${maxBetaDiff}`);
console.log(`  Mean Δβ global: ${meanBetaDiff}`);
console.log(`\n  GEroe hair prediction:`);
console.log(`    Nura:  blond=${geroe_nura.blond}% brown=${geroe_nura.brown}% red=${geroe_nura.red}% black=${geroe_nura.black}%`);
console.log(`    Ref:   blond=${geroe_ext.blond}% brown=${geroe_ext.brown}% red=${geroe_ext.red}% black=${geroe_ext.black}%`);
console.log(`\n  Recomendación: ${recommendation}`);
