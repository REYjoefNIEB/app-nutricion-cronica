'use strict';

/**
 * Ancestry EM algorithm — K=9 sub-populations (NURA 4.1-B).
 *
 * Uses ADMIXTURE-style EM with binomial likelihood per AIM.
 * Panel: 141 CLG AIMs (Verdugo et al 2020, Biol Res 53:15).
 * Sub-populations: EUR_N, EUR_S, AFR_W, AFR_E, EAS_CN, EAS_JP, SAS, AMR_NAT.
 */

const crypto  = require('crypto');
const refData = require('./referenceData');
const { AIMS, POPULATIONS, aggregateToMacroRegions, VERSION } = refData;

const K          = POPULATIONS.length;  // 8
const MAX_ITER   = 1000;  // subido de 500: ADNs con >120 AIMs matched pueden requerir >500 iter
const TOLERANCE  = 1e-5;
const REGULARIZE = 0.01;
const MIN_SNPS   = 50;

/**
 * Counts copies of minorAllele in a diploid genotype (0, 1, or 2).
 */
function _countMinorAlleles(genotype, minorAllele) {
    if (!genotype || genotype.length < 2 || !minorAllele) return 0;
    const target = minorAllele.toUpperCase();
    const a = genotype[0].toUpperCase();
    const b = genotype[1].toUpperCase();
    return (a === target ? 1 : 0) + (b === target ? 1 : 0);
}

/**
 * Binomial P(k minor alleles | freq=p, n=2).
 */
function binomialLikelihood(k, p) {
    if (k === 0) return (1 - p) ** 2;
    if (k === 1) return 2 * p * (1 - p);
    if (k === 2) return p * p;
    return 0;
}

/**
 * SHA-256 fingerprint of the first 30 matched AIM genotypes.
 * Unique per user; drives deterministic Q initialization.
 */
function generateUserFingerprint(matchedAims, userSnps) {
    const first30 = matchedAims.slice(0, 30);
    const parts = first30.map(aim => `${aim.rsid}:${userSnps[aim.rsid]?.genotype ?? ''}`);
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * LCG pseudo-random number generator seeded by fingerprint integer.
 * Deterministic: same seed → same sequence.
 */
function seededRandom(seed) {
    let s = seed >>> 0;
    return function () {
        s = (Math.imul(1664525, s) + 1013904223) >>> 0;
        return s / 0xFFFFFFFF;
    };
}

function initializeQFromFingerprint(fingerprint, k) {
    const seed = parseInt(fingerprint.substring(0, 8), 16);
    const rng  = seededRandom(seed);
    const raw  = Array.from({ length: k }, () => rng() + 0.1);
    const total = raw.reduce((s, v) => s + v, 0);
    return raw.map(v => v / total);
}

function l2Distance(a, b) {
    return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

/**
 * One EM iteration with binomial likelihood + L2 regularization toward uniform.
 */
function emStep(qArr, matchedAims, userSnps, regularization) {
    const uniform = 1 / K;
    const counts  = new Array(K).fill(0);

    for (const aim of matchedAims) {
        const gt = userSnps[aim.rsid]?.genotype;
        if (!gt || gt.length < 2) continue;
        const k = _countMinorAlleles(gt, aim.minorAllele);

        const likelihoods = POPULATIONS.map((pop, ki) => {
            const p = aim.frequencies[pop] ?? 0.5;
            return binomialLikelihood(k, p) * qArr[ki];
        });

        const total = likelihoods.reduce((s, v) => s + v, 0);
        if (total < 1e-15) continue;

        for (let ki = 0; ki < K; ki++) {
            counts[ki] += likelihoods[ki] / total;
        }
    }

    // M-step: MLE + L2 pull toward uniform
    const countsTotal = counts.reduce((s, v) => s + v, 0);
    let newQ = counts.map(c => {
        const mle = countsTotal > 0 ? c / countsTotal : uniform;
        return (1 - regularization) * mle + regularization * uniform;
    });

    // Normalize
    const sum = newQ.reduce((s, v) => s + v, 0);
    return newQ.map(v => v / sum);
}

/**
 * Estimate ancestry proportions for a user's genotype data.
 *
 * @param {{ [rsid: string]: { genotype: string } }} userSnps
 * @param {{ maxIter?, tolerance?, regularize? }} opts
 * @returns {{
 *   populations:   { [pop: string]: number },   // K=8 sub-pop Q-vector
 *   macroRegions:  { [region: string]: number }, // K=6 legacy macro-regions
 *   aimsAnalyzed:  number,
 *   totalAimsInDb: number,
 *   iterations:    number,
 *   converged:     boolean,
 *   fingerprint:   string,
 *   version:       string,
 *   confidence:    string,
 *   accuracy:      string
 * }}
 */
function computeAncestry(userSnps, opts = {}) {
    const maxIter    = opts.maxIter    ?? MAX_ITER;
    const tolerance  = opts.tolerance  ?? TOLERANCE;
    const regularize = opts.regularize ?? REGULARIZE;

    const matchedAims = AIMS.filter(aim => {
        const gt = userSnps[aim.rsid]?.genotype;
        return gt && gt !== '--' && gt.length >= 2;
    });

    const aimsAnalyzed = matchedAims.length;
    console.log(`[CALC_ANCESTRY_v2] K=${K} AIMs_found=${aimsAnalyzed}/${AIMS.length} version=${VERSION}`);

    if (aimsAnalyzed < MIN_SNPS) {
        throw new Error(
            `Solo ${aimsAnalyzed} AIMs encontrados (mínimo ${MIN_SNPS}). ` +
            'Archivo ADN con cobertura insuficiente para análisis de ancestría.'
        );
    }

    const fingerprint = generateUserFingerprint(matchedAims, userSnps);
    let qArr = initializeQFromFingerprint(fingerprint, K);

    console.log(
        `[CALC_ANCESTRY_v2] fingerprint=${fingerprint.substring(0, 12)}... ` +
        `Q_init=${POPULATIONS.map((p, i) => p + '=' + (qArr[i] * 100).toFixed(1) + '%').join(' ')}`
    );

    // EM loop
    let iterations = 0;
    let converged  = false;

    for (let iter = 0; iter < maxIter; iter++) {
        const newQ = emStep(qArr, matchedAims, userSnps, regularize);
        const dist = l2Distance(qArr, newQ);
        qArr       = newQ;
        iterations = iter + 1;

        if (dist < tolerance) {
            converged = true;
            console.log(`[CALC_ANCESTRY_v2] converged iter=${iterations} dist=${dist.toExponential(3)}`);
            break;
        }
    }

    if (!converged) {
        console.warn(`[CALC_ANCESTRY_v2] no converged after ${iterations} iterations`);
    }

    // Build K=8 populations object
    const populations = {};
    POPULATIONS.forEach((pop, ki) => {
        populations[pop] = Math.round(qArr[ki] * 1e6) / 1e6;
    });

    // K=6 macro-region aggregation (legacy compatibility)
    const macroRegions = aggregateToMacroRegions(populations);

    console.log(
        `[CALC_ANCESTRY_v2] Q_final=` +
        POPULATIONS.map((p, i) => p + '=' + (qArr[i] * 100).toFixed(1) + '%').join(' ')
    );
    console.log(
        `[CALC_ANCESTRY_v2] macro=` +
        Object.entries(macroRegions).map(([r, v]) => r + '=' + (v * 100).toFixed(1) + '%').join(' ')
    );

    const confidence = aimsAnalyzed >= 100 ? 'high' : aimsAnalyzed >= 60 ? 'medium' : 'low';

    return {
        populations,
        macroRegions,
        aimsAnalyzed,
        totalAimsInDb: AIMS.length,
        iterations,
        converged,
        fingerprint,
        version:  VERSION,
        confidence,
        accuracy: aimsAnalyzed >= 100 ? '±5%' : aimsAnalyzed >= 60 ? '±8%' : '±12%'
    };
}

/**
 * Backward-compatible wrapper for functions/index.js (B5 will update the call site).
 * Maps new output → old array format expected by Firestore + frontend.
 */
function calculateAncestry(userSnps) {
    const result = computeAncestry(userSnps);

    // Convert macro-regions to the old populations array format
    const populationsArr = Object.entries(result.macroRegions)
        .filter(([, v]) => v > 0.003)
        .sort(([, a], [, b]) => b - a)
        .map(([pop, fraction]) => ({
            population:  pop,
            name:        pop,
            nameEs:      pop,
            percentage:  Math.round(fraction * 1000) / 10
        }));

    return {
        populations:    populationsArr,
        macroRegions:   result.macroRegions,
        subPopulations: result.populations,
        aimsAnalyzed:   result.aimsAnalyzed,
        totalAimsInDb:  result.totalAimsInDb,
        confidence:     result.confidence,
        accuracy:       result.accuracy,
        version:        result.version
    };
}

module.exports = {
    computeAncestry,
    calculateAncestry,
    _countMinorAlleles,
    _internals: {
        binomialLikelihood,
        generateUserFingerprint,
        seededRandom,
        initializeQFromFingerprint,
        emStep,
        l2Distance
    }
};
