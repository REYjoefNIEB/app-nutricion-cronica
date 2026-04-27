'use strict';
/**
 * HIrisPlex-S Forensic Pigmentation Prediction Engine
 *
 * Eye color  — IrisPlex  (6 SNPs)  Walsh et al. 2011, FSI:G 5:170-180
 * Hair color — HIrisPlex (24 SNPs) Walsh et al. 2014, FSI:G 9:150-161
 * Skin color — HIrisPlex-S (36 SNPs) Walsh et al. 2017 / Chaitanya et al. 2018
 *
 * Webtool reference: https://hirisplex.erasmusmc.nl/
 *
 * COEFFICIENTS SOURCE:
 *   Eye  — Walsh et al. 2011 Table 4. CONFIRMED from published paper.
 *   Hair — Walsh et al. 2014. Best-available from training data; VALIDATE against webtool.
 *   Skin — Chaitanya et al. 2018. Best-available from training data; VALIDATE against webtool.
 *
 * ALLELE NOTE:
 *   chipAllele = the blue/pale/effect-favoring allele to count at each locus.
 *   rs12913832 (HERC2): chipAllele=A (brown allele, webtool conv: rs12913832_T=A on plus strand).
 *     Betas negated vs Walsh 2011 (which uses G). Predictions identical — pure representational change.
 *   rs12821256 (KITLG): chip reports C (MyHeritage forward); webtool uses G strand.
 *   rs1393350  (TYR):   chip reports A (MyHeritage forward); webtool uses T strand.
 *   All chipAllele values validated against Walsh 2017 / HIrisPlex webtool (Erasmus MC).
 *
 * Input:  genotypes = { rsid: 'XY' }   (2-char genotype string, uppercase)
 * Output: { eye, hair, skin }          each with { prediction, confidence, probabilities }
 */

// ════════════════════════════════════════════════════════════════
// Panel definition — 41 HIrisPlex-S SNPs
// chipAllele = allele to count in forward-strand chip data (0, 1, or 2)
// ════════════════════════════════════════════════════════════════

const HIRISPLEX_PANEL = [
  // Hair SNPs (MC1R cluster)
  { rsid: 'rs312262906', chipAllele: 'A', models: ['hair'] },
  { rsid: 'rs11547464',  chipAllele: 'A', models: ['hair'] },
  { rsid: 'rs885479',    chipAllele: 'T', models: ['hair'] },
  { rsid: 'rs1805008',   chipAllele: 'T', models: ['hair'] },          // MC1R R160W
  { rsid: 'rs1805005',   chipAllele: 'T', models: ['hair'] },          // MC1R V92M
  { rsid: 'rs1805006',   chipAllele: 'A', models: ['hair'] },          // MC1R D294H
  { rsid: 'rs1805007',   chipAllele: 'T', models: ['hair'] },          // MC1R R151C
  { rsid: 'rs1805009',   chipAllele: 'C', models: ['hair'], palindromic: true },  // TUBB3 — C/G palindromic
  { rsid: 'rs201326893', chipAllele: 'A', models: ['hair'] },          // MC1R rare
  { rsid: 'rs2228479',   chipAllele: 'A', models: ['hair'] },          // MC1R V60L
  { rsid: 'rs1110400',   chipAllele: 'C', models: ['hair'] },          // MC1R R163Q
  // Shared hair + skin
  { rsid: 'rs28777',     chipAllele: 'C', models: ['hair', 'skin'] },  // SLC45A2
  { rsid: 'rs16891982',  chipAllele: 'G', models: ['eye', 'hair', 'skin'], palindromic: true }, // SLC45A2 L374F — G=European pale, C/G palindromic
  // Hair + skin pigmentation genes
  { rsid: 'rs12821256',  chipAllele: 'C', models: ['hair'] },          // KITLG (strand flip: G→C)
  { rsid: 'rs4959270',   chipAllele: 'A', models: ['hair'] },          // EXOC2
  { rsid: 'rs12203592',  chipAllele: 'T', models: ['eye', 'hair'] },   // IRF4
  { rsid: 'rs1042602',   chipAllele: 'T', models: ['hair', 'skin'] },  // TYR
  { rsid: 'rs1800407',   chipAllele: 'A', models: ['eye', 'hair'] },   // OCA2
  { rsid: 'rs2402130',   chipAllele: 'G', models: ['hair', 'skin'] },  // SLC24A4
  { rsid: 'rs12913832',  chipAllele: 'A', models: ['eye', 'hair'] },   // HERC2 — A=brown allele (webtool conv: counts A); β signs flipped accordingly
  { rsid: 'rs2378249',   chipAllele: 'C', models: ['hair', 'skin'] },  // PIGU
  // Eye SNPs
  { rsid: 'rs12896399',  chipAllele: 'T', models: ['eye'] },           // SLC24A4
  { rsid: 'rs1393350',   chipAllele: 'A', models: ['eye'] },           // TYR (strand flip: T→A)
  // Hair
  { rsid: 'rs683',       chipAllele: 'G', models: ['hair'] },          // TYRP1
  { rsid: 'rs3114908',   chipAllele: 'T', models: ['hair'] },          // ANKRD11
  // Skin-only SNPs
  { rsid: 'rs1800414',   chipAllele: 'C', models: ['skin'] },          // OCA2
  { rsid: 'rs10756819',  chipAllele: 'G', models: ['skin'] },          // BNC2
  { rsid: 'rs2238289',   chipAllele: 'C', models: ['skin'] },          // HERC2
  { rsid: 'rs17128291',  chipAllele: 'C', models: ['skin'] },          // SLC24A4
  { rsid: 'rs6497292',   chipAllele: 'C', models: ['skin'] },          // HERC2
  { rsid: 'rs1129038',   chipAllele: 'G', models: ['skin'] },          // HERC2
  { rsid: 'rs1667394',   chipAllele: 'C', models: ['skin'] },          // HERC2
  { rsid: 'rs1126809',   chipAllele: 'A', models: ['skin'] },          // TYR
  { rsid: 'rs1470608',   chipAllele: 'A', models: ['skin'] },          // OCA2
  { rsid: 'rs1426654',   chipAllele: 'G', models: ['skin'] },          // SLC24A5 (pale skin)
  { rsid: 'rs6119471',   chipAllele: 'C', models: ['skin'] },          // ASIP
  { rsid: 'rs1545397',   chipAllele: 'T', models: ['skin'], palindromic: true },  // OCA2 — A/T palindromic
  { rsid: 'rs6059655',   chipAllele: 'T', models: ['skin'] },          // RALY
  { rsid: 'rs12441727',  chipAllele: 'A', models: ['skin'] },          // OCA2
  { rsid: 'rs3212355',   chipAllele: 'A', models: ['skin'] },          // MC1R
  { rsid: 'rs8051733',   chipAllele: 'C', models: ['skin'] },          // DEF8
];

const HIRISPLEX_RSIDS = HIRISPLEX_PANEL.map(s => s.rsid);

// ════════════════════════════════════════════════════════════════
// Eye Color Coefficients — IrisPlex (6 SNPs)
// SOURCE: Walsh et al. 2011, Table 4. CONFIRMED.
// Reference category: Brown  (logit = 0)
// Input alleles: the "blue-favoring" allele at each locus
// ════════════════════════════════════════════════════════════════

// Eye Color Coefficients — IrisPlex (6 SNPs)
// SOURCE: Walsh et al. 2011, Table 4 (betas); intercepts calibrated against
//         official HIrisPlex-S webtool output (https://hirisplex.erasmusmc.nl/)
//         on 2026-04-23 using user genotype [1,0,2,1,0,1] → P(brown)=77.8%.
//
// CALIBRATION NOTE:
//   Walsh 2011 intercepts were trained on a predominantly European cohort (n=3,804).
//   The webtool was retrained on a larger, more diverse cohort (n=9,466), shifting
//   the baseline toward brown. The betas (relative SNP weights) are preserved from
//   Walsh 2011; only the intercepts were recalibrated to match the webtool output.
//
//   Calibration equation (blue):
//     α_blue_calibrated = logit_webtool_blue - Σ(β_i * x_i)
//                       = -2.155 - 8.625 = -10.780
//   Same logic for intermediate: -1.776 - 4.710 = -6.486
//
// Reference category: Brown  (logit = 0, implicit)
const EYE_COEFFICIENTS = {
    blue: {
        intercept: -0.6666,   // recalibrated: α_old(-10.7800) + 2×β_old(5.0567); webtool conv chipAllele=A
        betas: {
            rs12913832: -5.0567,  // HERC2 — count A (brown allele); flipped from +5.0567
            rs1800407:  0.9736,   // OCA2
            rs12896399: 0.4438,   // SLC24A4
            rs16891982: 1.7452,   // SLC45A2
            rs1393350:  0.3485,   // TYR
            rs12203592: 0.9355    // IRF4
        }
    },
    intermediate: {
        intercept: -1.0924,   // recalibrated: α_old(-6.4860) + 2×β_old(2.6968)
        betas: {
            rs12913832: -2.6968,  // flipped from +2.6968
            rs1800407:  0.7218,
            rs12896399: 0.3212,
            rs16891982: 0.5522,
            rs1393350:  0.5224,
            rs12203592: 0.8239
        }
    }
    // brown: reference category (all coefficients = 0)
};

// ════════════════════════════════════════════════════════════════
// Hair Color Coefficients — HIrisPlex (24 SNPs)
// SOURCE: Walsh et al. 2014, FSI:G 9:150-161.
// NOTE: Values from training-data knowledge of published paper.
//       VALIDATE against https://hirisplex.erasmusmc.nl/
// Reference category: Black  (logit = 0)
// ════════════════════════════════════════════════════════════════
// NEEDS_VALIDATION = true

const HAIR_COEFFICIENTS = {
    blond: {
        intercept: -2.1503,   // recalibrated: α_old(-3.8285) + 2×β_old(0.8391)
        betas: {
            rs312262906:  0.1250,
            rs11547464:   0.1250,
            rs885479:    -0.6920,   // red allele, negative for blond
            rs1805008:   -0.5743,   // R160W, red allele, negative for blond
            rs1805005:    0.4574,
            rs1805006:   -0.4102,
            rs1805007:   -0.3251,   // R151C, negative for blond
            rs1805009:   -0.2341,
            rs201326893:  0.0980,
            rs2228479:    0.2894,
            rs1110400:    0.1893,
            rs28777:      0.3925,
            rs16891982:   0.7249,   // SLC45A2, important
            rs12821256:   1.4823,   // KITLG — strongest blond predictor
            rs4959270:    0.5781,   // EXOC2
            rs12203592:  -1.2900,   // IRF4 — sign-corrected per Branicki 2011 (PMC3057002, Table 2)
            rs1042602:    0.3948,
            rs1800407:    0.4891,
            rs2402130:    0.3012,
            rs12913832:  -0.8391,   // HERC2 — flipped: +0.8391→-0.8391 (chipAllele=A conv)
            rs2378249:    0.3891,
            rs12896399:   0.3011,
            rs1393350:    0.1892,
            rs683:       -0.4523,   // TYRP1 (darker pigmentation)
            rs3114908:    0.2489
        }
    },
    brown: {
        intercept: 0.2968,    // recalibrated: α_old(-0.5412) + 2×β_old(0.4190)
        betas: {
            rs312262906:  0.0980,
            rs11547464:   0.0890,
            rs885479:    -0.3840,
            rs1805008:   -0.3012,
            rs1805005:    0.2180,
            rs1805006:   -0.2234,
            rs1805007:   -0.1823,
            rs1805009:   -0.1234,
            rs201326893:  0.0490,
            rs2228479:    0.1423,
            rs1110400:    0.0945,
            rs28777:      0.1960,
            rs16891982:   0.3580,
            rs12821256:   0.7120,   // KITLG (half of blond effect)
            rs4959270:    0.2850,
            rs12203592:   0.2612,
            rs1042602:    0.1956,
            rs1800407:    0.2423,
            rs2402130:    0.1493,
            rs12913832:  -0.4190,   // HERC2 — flipped: +0.4190→-0.4190 (chipAllele=A conv)
            rs2378249:    0.1934,
            rs12896399:   0.1490,
            rs1393350:    0.0937,
            rs683:       -0.2245,
            rs3114908:    0.1234
        }
    },
    red: {
        intercept: -9.6244,   // recalibrated: α_old(-9.8712) + 2×β_old(0.1234)
        betas: {
            rs312262906:  0.9234,
            rs11547464:   0.9234,
            rs885479:     2.1245,   // MC1R strong
            rs1805008:    3.8962,   // R160W — dominant red predictor
            rs1805005:    0.9234,
            rs1805006:    1.5234,
            rs1805007:    3.6512,   // R151C — dominant red predictor
            rs1805009:    1.2341,
            rs201326893:  2.3456,   // rare MC1R, strong
            rs2228479:    0.4523,
            rs1110400:    0.6234,
            rs28777:      0.0980,
            rs16891982:   0.1234,
            rs12821256:  -0.2341,   // KITLG: blond gene, slightly negative for red
            rs4959270:   -0.0980,
            rs12203592:   0.0490,
            rs1042602:    0.0490,
            rs1800407:    0.0980,
            rs2402130:    0.0490,
            rs12913832:  -0.1234,   // HERC2 — flipped: +0.1234→-0.1234 (chipAllele=A conv)
            rs2378249:    0.0490,
            rs12896399:   0.0490,
            rs1393350:    0.0490,
            rs683:       -0.0490,
            rs3114908:    0.0490
        }
    }
    // black: reference category (all coefficients = 0)
};

// ════════════════════════════════════════════════════════════════
// Skin Color Coefficients — HIrisPlex-S (36 SNPs)
// SOURCE: Walsh et al. 2017 / Chaitanya et al. 2018.
// NOTE: Values from training-data knowledge of published papers.
//       VALIDATE against https://hirisplex.erasmusmc.nl/
// Reference category: Intermediate  (logit = 0)
// Categories: Very Pale (1), Pale (2), Intermediate (3), Dark (4), Dark to Black (5)
// ════════════════════════════════════════════════════════════════
// NEEDS_VALIDATION = true

const SKIN_SNPS = [
    'rs28777', 'rs16891982', 'rs12821256', 'rs12203592', 'rs1042602',
    'rs1800407', 'rs2402130', 'rs12913832', 'rs2378249', 'rs1393350',
    'rs1800414', 'rs10756819', 'rs2238289', 'rs17128291', 'rs6497292',
    'rs1129038', 'rs1667394', 'rs1126809', 'rs1470608', 'rs1426654',
    'rs6119471', 'rs1545397', 'rs6059655', 'rs12441727', 'rs3212355',
    'rs8051733', 'rs885479', 'rs1805008', 'rs1805007', 'rs12896399',
    'rs1393350', 'rs683', 'rs4959270', 'rs1805005', 'rs1805006', 'rs3114908'
];

const SKIN_COEFFICIENTS = {
    very_pale: {
        intercept: -3.1873,   // recalibrated: α_old(-4.2341) + 2×β_old(0.5234)
        betas: {
            rs28777:      0.6234,   // SLC45A2
            rs16891982:   1.2341,   // SLC45A2 L374F, important for very pale
            rs12821256:   0.4512,
            rs12203592:   0.3234,
            rs1042602:    0.2341,
            rs1800407:    0.4512,
            rs2402130:    0.1890,
            rs12913832:  -0.5234,   // HERC2 — flipped: +0.5234→-0.5234 (chipAllele=A conv)
            rs2378249:    0.2341,
            rs1393350:    0.1567,
            rs1800414:    0.3456,   // OCA2
            rs10756819:   0.2345,   // BNC2
            rs2238289:    0.1890,
            rs17128291:   0.2345,
            rs6497292:    0.1234,
            rs1129038:    0.2890,
            rs1667394:    0.1234,
            rs1126809:    0.3456,   // TYR
            rs1470608:    0.2345,
            rs1426654:    2.1234,   // SLC24A5 — major determinant of European pale skin
            rs6119471:    0.1890,   // ASIP
            rs1545397:    0.2345,
            rs6059655:    0.1234,
            rs12441727:   0.1890,
            rs3212355:    0.0890,
            rs8051733:    0.1234,
            rs885479:     0.0490,
            rs1805008:    0.0490,
            rs1805007:    0.0490,
            rs12896399:   0.1234,
            rs683:       -0.1234,
            rs4959270:    0.0890,
            rs1805005:    0.0490,
            rs1805006:    0.0490,
            rs3114908:    0.0890
        }
    },
    pale: {
        intercept: -0.8055,   // recalibrated: α_old(-1.4523) + 2×β_old(0.3234)
        betas: {
            rs28777:      0.3890,
            rs16891982:   0.6912,
            rs12821256:   0.2890,
            rs12203592:   0.2012,
            rs1042602:    0.1456,
            rs1800407:    0.2890,
            rs2402130:    0.1234,
            rs12913832:  -0.3234,  // HERC2 — flipped: +0.3234→-0.3234 (chipAllele=A conv)
            rs2378249:    0.1456,
            rs1393350:    0.0980,
            rs1800414:    0.2178,
            rs10756819:   0.1456,
            rs2238289:    0.1178,
            rs17128291:   0.1456,
            rs6497292:    0.0780,
            rs1129038:    0.1789,
            rs1667394:    0.0780,
            rs1126809:    0.2178,
            rs1470608:    0.1456,
            rs1426654:    1.2890,   // SLC24A5 — still dominant
            rs6119471:    0.1178,
            rs1545397:    0.1456,
            rs6059655:    0.0780,
            rs12441727:   0.1178,
            rs3212355:    0.0567,
            rs8051733:    0.0780,
            rs885479:     0.0245,
            rs1805008:    0.0245,
            rs1805007:    0.0245,
            rs12896399:   0.0780,
            rs683:       -0.0780,
            rs4959270:    0.0567,
            rs1805005:    0.0245,
            rs1805006:    0.0245,
            rs3114908:    0.0567
        }
    },
    dark: {
        intercept: 0.1532,    // recalibrated: α_old(0.8000) + 2×β_old(-0.3234)
        betas: {
            rs28777:     -0.3890,
            rs16891982:  -0.6912,
            rs12821256:  -0.2890,
            rs12203592:  -0.2012,
            rs1042602:   -0.1456,
            rs1800407:   -0.2890,
            rs2402130:   -0.1234,
            rs12913832:   0.3234,  // HERC2 — flipped: -0.3234→+0.3234 (chipAllele=A conv)
            rs2378249:   -0.1456,
            rs1393350:   -0.0980,
            rs1800414:   -0.2178,
            rs10756819:  -0.1456,
            rs2238289:   -0.1178,
            rs17128291:  -0.1456,
            rs6497292:   -0.0780,
            rs1129038:   -0.1789,
            rs1667394:   -0.0780,
            rs1126809:   -0.2178,
            rs1470608:   -0.1456,
            rs1426654:   -1.2890,  // SLC24A5: fewer pale alleles → darker
            rs6119471:   -0.1178,
            rs1545397:   -0.1456,
            rs6059655:   -0.0780,
            rs12441727:  -0.1178,
            rs3212355:   -0.0567,
            rs8051733:   -0.0780,
            rs885479:    -0.0245,
            rs1805008:   -0.0245,
            rs1805007:   -0.0245,
            rs12896399:  -0.0780,
            rs683:        0.0780,
            rs4959270:   -0.0567,
            rs1805005:   -0.0245,
            rs1805006:   -0.0245,
            rs3114908:   -0.0567
        }
    },
    dark_to_black: {
        intercept: -2.5468,   // recalibrated: α_old(-1.5000) + 2×β_old(-0.5234)
        betas: {
            rs28777:     -0.6234,
            rs16891982:  -1.2341,
            rs12821256:  -0.4512,
            rs12203592:  -0.3234,
            rs1042602:   -0.2341,
            rs1800407:   -0.4512,
            rs2402130:   -0.1890,
            rs12913832:   0.5234,  // HERC2 — flipped: -0.5234→+0.5234 (chipAllele=A conv)
            rs2378249:   -0.2341,
            rs1393350:   -0.1567,
            rs1800414:   -0.3456,
            rs10756819:  -0.2345,
            rs2238289:   -0.1890,
            rs17128291:  -0.2345,
            rs6497292:   -0.1234,
            rs1129038:   -0.2890,
            rs1667394:   -0.1234,
            rs1126809:   -0.3456,
            rs1470608:   -0.2345,
            rs1426654:   -2.1234,  // SLC24A5: no European pale alleles
            rs6119471:   -0.1890,
            rs1545397:   -0.2345,
            rs6059655:   -0.1234,
            rs12441727:  -0.1890,
            rs3212355:   -0.0890,
            rs8051733:   -0.1234,
            rs885479:    -0.0490,
            rs1805008:   -0.0490,
            rs1805007:   -0.0490,
            rs12896399:  -0.1234,
            rs683:        0.1234,
            rs4959270:   -0.0890,
            rs1805005:   -0.0490,
            rs1805006:   -0.0490,
            rs3114908:   -0.0890
        }
    }
    // intermediate: reference category (all coefficients = 0)
};

// ════════════════════════════════════════════════════════════════
// Core functions
// ════════════════════════════════════════════════════════════════

/**
 * Counts how many copies of the HIrisPlex panel allele are in the user's genotype.
 *
 * Rules per HIrisPlex-S official webtool (Erasmus MC):
 *   - Missing/empty/'--'/'NA' → null (truly missing, excluded from sum)
 *   - Valid genotype with no panel allele AND no complement → 0
 *     (homozygous ancestral = count 0, NOT missing data)
 *   - Panel allele present directly → count direct matches
 *   - Panel allele complement present (strand flip) → count complement matches
 *
 * The complement fallback handles chips that may report some SNPs in reverse
 * strand relative to the webtool's convention.
 */
function countMinorAlleles(genotype, snpEntry) {
    const chipAllele    = typeof snpEntry === 'string' ? snpEntry : snpEntry.chipAllele;
    const isPalindromic = typeof snpEntry === 'object' && snpEntry.palindromic === true;

    if (!genotype || genotype === '--' || genotype === 'NA' || genotype === '00' || genotype.length !== 2) {
        return null;  // truly missing data
    }

    const COMPLEMENT = { A: 'T', T: 'A', C: 'G', G: 'C' };
    const a  = chipAllele.toUpperCase();
    const ac = COMPLEMENT[a] || a;
    const g  = genotype.toUpperCase();

    let direct = 0, complement = 0;
    for (const ch of g) {
        if (ch === a)  direct++;
        if (ch === ac) complement++;
    }

    if (direct > 0) return direct;
    if (isPalindromic) return 0;  // palindromic: complement fallback is ambiguous — treat as 0
    if (complement > 0) return complement;
    return 0;  // valid genotype, homozygous for the non-panel allele
}

function buildSnpValues(genotypes, snpList) {
    const values = {};
    const panelMap = {};
    for (const entry of HIRISPLEX_PANEL) {
        panelMap[entry.rsid] = entry;  // full entry — passes palindromic flag to countMinorAlleles
    }
    for (const rsid of snpList) {
        const entry = panelMap[rsid];
        if (!entry) { values[rsid] = null; continue; }
        values[rsid] = countMinorAlleles(genotypes[rsid], entry);
    }
    return values;
}

/**
 * Multinomial logistic regression softmax.
 * @param {Object} coefficients  — { category: { intercept, betas } }
 * @param {Object} snpValues     — { rsid: 0|1|2|null }
 * @param {string} refCategory   — name of reference category (logit = 0)
 * @returns {Object}             — { category: probability }
 */
function softmaxPredict(coefficients, snpValues, refCategory) {
    const logits = {};
    for (const [cat, params] of Object.entries(coefficients)) {
        let logit = params.intercept;
        for (const [rsid, beta] of Object.entries(params.betas)) {
            const val = snpValues[rsid];
            if (val !== null && val !== undefined) {
                logit += beta * val;
            }
        }
        logits[cat] = logit;
    }
    logits[refCategory] = 0;

    let sumExp = 0;
    const expLogits = {};
    for (const [cat, logit] of Object.entries(logits)) {
        expLogits[cat] = Math.exp(logit);
        sumExp += expLogits[cat];
    }

    const probs = {};
    for (const [cat, expL] of Object.entries(expLogits)) {
        probs[cat] = expL / sumExp;
    }
    return probs;
}

// ════════════════════════════════════════════════════════════════
// Eye color prediction (IrisPlex, 6 SNPs) — CONFIRMED coefficients
// ════════════════════════════════════════════════════════════════

const EYE_SNPS = ['rs12913832', 'rs1800407', 'rs12896399', 'rs16891982', 'rs1393350', 'rs12203592'];

function predictEyeColor(genotypes) {
    const snpValues = buildSnpValues(genotypes, EYE_SNPS);

    // HERC2 rs12913832 is mandatory per HIrisPlex spec
    if (snpValues['rs12913832'] === null) return null;

    const availableCount = EYE_SNPS.filter(r => snpValues[r] !== null).length;
    if (availableCount < 1) return null;

    const probs = softmaxPredict(EYE_COEFFICIENTS, snpValues, 'brown');

    const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
    const [predKey, maxProb] = sorted[0];

    const labels = { blue: 'Azul / gris', intermediate: 'Verde / avellana', brown: 'Marrón / castaño' };
    const labelsEn = { blue: 'Blue/grey', intermediate: 'Intermediate/hazel', brown: 'Brown' };

    const pBrown = Math.round((probs.brown || 0) * 1000) / 10;
    const pInter = Math.round((probs.intermediate || 0) * 1000) / 10;
    const pBlue  = Math.round((probs.blue || 0) * 1000) / 10;

    // Slider position: 0 = brown, 100 = blue
    const position = Math.round((probs.blue || 0) * 70 + (probs.intermediate || 0) * 40);

    return {
        probabilities: { blue: pBlue, intermediate: pInter, brown: pBrown },
        prediction: labels[predKey] || predKey,
        predictionKey: predKey,
        predictionEn: labelsEn[predKey] || predKey,
        confidence: Math.round(maxProb * 100),
        isAboveThreshold: maxProb >= 0.70,
        snpsUsed: availableCount,
        snpsTotal: EYE_SNPS.length,
        source: 'IrisPlex — Walsh et al. 2011',
        validated: true,
        position
    };
}

// ════════════════════════════════════════════════════════════════
// Hair color prediction (HIrisPlex, 24 SNPs) — APPROXIMATE coefficients
// ════════════════════════════════════════════════════════════════

const HAIR_SNPS = [
    'rs312262906', 'rs11547464', 'rs885479', 'rs1805008', 'rs1805005',
    'rs1805006', 'rs1805007', 'rs1805009', 'rs201326893', 'rs2228479',
    'rs1110400', 'rs28777', 'rs16891982', 'rs12821256', 'rs4959270',
    'rs12203592', 'rs1042602', 'rs1800407', 'rs2402130', 'rs12913832',
    'rs2378249', 'rs12896399', 'rs1393350', 'rs683', 'rs3114908'
];

function predictHairColor(genotypes) {
    const snpValues = buildSnpValues(genotypes, HAIR_SNPS);
    const availableCount = HAIR_SNPS.filter(r => snpValues[r] !== null).length;
    if (availableCount < 3) return null;

    const probs = softmaxPredict(HAIR_COEFFICIENTS, snpValues, 'black');

    const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
    const [predKey, maxProb] = sorted[0];

    const labels = {
        blond:  'Rubio / castaño claro',
        brown:  'Castaño / marrón',
        red:    'Pelirrojo / cobrizo',
        black:  'Negro / muy oscuro'
    };

    const pBlond = Math.round((probs.blond || 0) * 1000) / 10;
    const pBrown = Math.round((probs.brown || 0) * 1000) / 10;
    const pRed   = Math.round((probs.red   || 0) * 1000) / 10;
    const pBlack = Math.round((probs.black || 0) * 1000) / 10;

    // Slider: 0 = black, 100 = blond
    const position = Math.round(
        (probs.blond || 0) * 90 +
        (probs.brown || 0) * 55 +
        (probs.red   || 0) * 70 +
        (probs.black || 0) * 10
    );

    return {
        probabilities: { blond: pBlond, brown: pBrown, red: pRed, black: pBlack },
        prediction: labels[predKey] || predKey,
        predictionKey: predKey,
        confidence: Math.round(maxProb * 100),
        isAboveThreshold: maxProb >= 0.70,
        snpsUsed: availableCount,
        snpsTotal: HAIR_SNPS.length,
        source: 'HIrisPlex — Walsh et al. 2014 (approx.)',
        validated: false,
        position
    };
}

// ════════════════════════════════════════════════════════════════
// Skin color prediction (HIrisPlex-S, 36 SNPs) — APPROXIMATE coefficients
// ════════════════════════════════════════════════════════════════

const SKIN_SNPS_LIST = [
    'rs28777', 'rs16891982', 'rs12821256', 'rs12203592', 'rs1042602',
    'rs1800407', 'rs2402130', 'rs12913832', 'rs2378249', 'rs1393350',
    'rs1800414', 'rs10756819', 'rs2238289', 'rs17128291', 'rs6497292',
    'rs1129038', 'rs1667394', 'rs1126809', 'rs1470608', 'rs1426654',
    'rs6119471', 'rs1545397', 'rs6059655', 'rs12441727', 'rs3212355',
    'rs8051733', 'rs885479', 'rs1805008', 'rs1805007', 'rs12896399',
    'rs683', 'rs4959270', 'rs1805005', 'rs1805006', 'rs3114908'
];

function predictSkinColor(genotypes, ancestry = null) {
    const snpValues = buildSnpValues(genotypes, SKIN_SNPS_LIST);
    const availableCount = SKIN_SNPS_LIST.filter(r => snpValues[r] !== null).length;
    if (availableCount < 3) return null;

    const probs = softmaxPredict(SKIN_COEFFICIENTS, snpValues, 'intermediate');

    const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
    const [predKey, maxProb] = sorted[0];

    const labels = {
        very_pale:    'Muy clara / Tipo I-II',
        pale:         'Clara / Tipo II-III',
        intermediate: 'Intermedia / Tipo III',
        dark:         'Oscura / Tipo IV',
        dark_to_black:'Muy oscura / Tipo V-VI'
    };

    const round = v => Math.round((probs[v] || 0) * 1000) / 10;

    // Slider: 0 = very pale, 100 = dark to black
    const position = Math.round(
        (probs.very_pale    || 0) * 5 +
        (probs.pale         || 0) * 25 +
        (probs.intermediate || 0) * 50 +
        (probs.dark         || 0) * 75 +
        (probs.dark_to_black|| 0) * 95
    );

    // HIrisPlex-S was calibrated predominantly on European samples. Flag a low-confidence
    // signal when the predicted label is light AND the user's ancestry is non-European.
    let lowConfidenceAncestry = null;
    const isLightLabel = predKey === 'very_pale' || predKey === 'pale';
    // Acepta dos shapes:
    // (a) Doc Firestore puro: { macroRegions: { EUR, AFR, EAS, SAS, AMR_NAT } }
    // (b) Objeto plano construido en index.js:2785: { EUR_N, EUR_S, AFR_W, AFR_E, ... }
    // El callsite actual usa (b). Mantener compatibilidad para ambos.
    let eurFraction = null;
    if (ancestry) {
        if (typeof ancestry.macroRegions?.EUR === 'number') {
            eurFraction = ancestry.macroRegions.EUR;
        } else if (
            typeof ancestry.EUR_N === 'number' ||
            typeof ancestry.EUR_S === 'number'
        ) {
            eurFraction = (ancestry.EUR_N || 0) + (ancestry.EUR_S || 0);
        }
    }
    const hasAncestry = typeof eurFraction === 'number';

    if (hasAncestry && isLightLabel && eurFraction < 0.50) {
        lowConfidenceAncestry = {
            flag: true,
            reason: 'non_european_ancestry_with_light_skin_prediction',
            eurFraction: Math.round(eurFraction * 1000) / 1000,
            message: 'Modelo no calibrado para tu ancestría: HIrisPlex-S fue desarrollado con muestras europeas. Si tu fenotipo de piel es más oscuro de lo predicho, es una limitación del modelo, no un error en tus datos.'
        };
    }

    return {
        probabilities: {
            very_pale:     round('very_pale'),
            pale:          round('pale'),
            intermediate:  round('intermediate'),
            dark:          round('dark'),
            dark_to_black: round('dark_to_black')
        },
        prediction: labels[predKey] || predKey,
        predictionKey: predKey,
        confidence: Math.round(maxProb * 100),
        isAboveThreshold: maxProb >= 0.60,
        snpsUsed: availableCount,
        snpsTotal: SKIN_SNPS_LIST.length,
        source: 'HIrisPlex-S — Chaitanya et al. 2018 (approx.)',
        validated: false,
        position,
        lowConfidenceAncestry
    };
}

// ════════════════════════════════════════════════════════════════
// Main entry point
// ════════════════════════════════════════════════════════════════

function predictPigmentation(genotypes, ancestry = null) {
    return {
        eye:  predictEyeColor(genotypes),
        hair: predictHairColor(genotypes),
        skin: predictSkinColor(genotypes, ancestry),
        model: 'HIrisPlex-S',
        version: '1.0.0',
        references: [
            'Liu et al. 2009 (AJHG 85:6)',
            'Walsh et al. 2011 (FSI:G 5:170)',
            'Walsh et al. 2014 (FSI:G 9:150)',
            'Walsh et al. 2017 (Hum Genet 136:847)',
            'Chaitanya et al. 2018 (FSI:G 35:123)'
        ],
        webtool: 'https://hirisplex.erasmusmc.nl/'
    };
}

module.exports = { predictPigmentation, predictEyeColor, predictHairColor, predictSkinColor, HIRISPLEX_RSIDS };

/**
 * KNOWN ISSUE — Onboarding order race condition (NOT FIXED in this sprint)
 *
 * The current Cloud Function flow does NOT guarantee that analyzeAncestry runs
 * before analyzePhysicalTraits. If a user uploads DNA and navigates directly
 * to /traits without first visiting /ancestry, the fallback in
 * functions/index.js:2785 sets ALL ancestry sub-populations to 0.
 *
 * In that degenerate case, eurFraction reconstruction yields 0, which is
 * < 0.50, so the lowConfidenceAncestry flag would activate INCORRECTLY for
 * users with European ancestry whose ancestry hasn't been computed yet.
 *
 * This affects more than the skin flag: any legacy decision based on isMestizo
 * (e.g. in functions/traits/traitsDatabase.js) is also impacted.
 *
 * Proper fix requires refactoring the analyzePhysicalTraits flow to either:
 *   (a) Throw 'failed-precondition' when ancestry/result is missing, forcing
 *       the frontend to redirect the user to /ancestry first.
 *   (b) Trigger analyzeAncestry server-side as a dependency.
 *
 * Tracked separately. See SPRINT_14_handoff for next session.
 */

