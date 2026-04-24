'use strict';
/**
 * extract-hair-coefficients-audit.js
 *
 * Extracts HAIR_COEFFICIENTS from webtool oracle responses.
 * Reference category: black (logit = 0).
 *
 * α_k  = log(P_k_Q0 / P_black_Q0)                   (from baseline query)
 * β_ki = log(P_k_het_i / P_black_het_i) − α_k       (from single-SNP het query)
 *
 * NOTE: rs16891982 convention mismatch.
 *   Webtool counts C alleles (rs16891982_C).
 *   Nura counts G alleles (chipAllele=G, European allele).
 *   Extracted beta_rs16891982 is per C allele = −β_our per G allele.
 *   The stored value is the raw extracted (per C). The audit script handles
 *   sign adjustment when comparing to Nura's G-allele convention.
 *
 * AUDIT ONLY — do NOT copy values to functions/traits/hirisplex.js.
 * Copyright HIrisPlex-S: EP2195448.
 */
const path = require('path');
const fs   = require('fs');

const RESULTS_JSON   = path.join(__dirname, 'validation-data', 'hirisplex_oracle_results.json');
const EXTRACTED_JSON = path.join(__dirname, 'validation-data', 'hair_coefficients_extracted.json');

const HAIR_SNPS = [
    'rs312262906', 'rs11547464', 'rs885479',  'rs1805008',
    'rs1805005',   'rs1805006',  'rs1805007',  'rs1805009',
    'rs201326893', 'rs2228479',  'rs1110400',  'rs28777',
    'rs16891982',  'rs12821256', 'rs4959270',  'rs12203592',
    'rs1042602',   'rs1800407',  'rs2402130',  'rs12913832',
    'rs2378249',   'rs12896399', 'rs1393350',  'rs683',
];

const CATS = ['blond', 'brown', 'red'];

function logR(p, q) {
    if (!p || !q || p <= 0 || q <= 0) return null;
    return Math.log(p / q);
}

function r4(x) { return x === null ? null : Math.round(x * 10000) / 10000; }

const results = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf8'));
const base    = results['Q0_baseline'];
if (!base) { console.error('Missing Q0_baseline'); process.exit(1); }

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  extract-hair-coefficients-audit.js  (AUDIT ONLY)           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const extracted = {};

for (const cat of CATS) {
    const lr_base = logR(base[cat], base.black);
    if (lr_base === null) {
        console.error(`Cannot compute baseline logit for ${cat} — P=${base[cat]} P_black=${base.black}`);
        process.exit(1);
    }

    extracted[cat] = {
        intercept: r4(lr_base),
        betas: {},
    };

    let missing = 0;
    for (let i = 0; i < HAIR_SNPS.length; i++) {
        const rsid   = HAIR_SNPS[i];
        const hetKey = `Q${i + 1}_het_${rsid}`;
        const het    = results[hetKey];

        if (!het) {
            extracted[cat].betas[rsid] = null;
            missing++;
            continue;
        }

        const lr_het = logR(het[cat], het.black);
        extracted[cat].betas[rsid] = r4(lr_het === null ? null : lr_het - lr_base);
    }

    console.log(`  ${cat.padEnd(6)}: intercept=${extracted[cat].intercept}  missing_betas=${missing}`);
}

const output = {
    extractedAt:        new Date().toISOString(),
    source:             'https://hirisplex.erasmusmc.nl/ — predict_phenotype.php oracle',
    note:               'AUDIT ONLY. Do not copy to production. Copyright EP2195448.',
    reference_category: 'black',
    convention_notes: {
        rs16891982:  'Webtool counts C allele; Nura counts G allele. Extracted beta is per C = −β_Nura.',
        rs12821256:  'Webtool counts G; MyHeritage chip reports C (strand flip). Same allele = direct compare.',
        rs1393350:   'Webtool counts T; MyHeritage chip reports A (strand flip). Same allele = direct compare.',
        rs12913832:  'Webtool counts T (minus strand A); Nura counts A (plus strand). Same allele = direct compare.',
    },
    coefficients: extracted,
};

fs.writeFileSync(EXTRACTED_JSON, JSON.stringify(output, null, 2));
console.log(`\n✅ Saved → ${EXTRACTED_JSON}`);
console.log('   AUDIT ONLY — not for production use');
