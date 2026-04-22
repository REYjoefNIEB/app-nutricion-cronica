/**
 * Algoritmo de estimación de ancestría por Maximum Likelihood (EM).
 *
 * Implementación del algoritmo ADMIXTURE simplificado (Alexander et al. 2009).
 * Dado un set de SNPs AIM del usuario, estima las proporciones q_k de cada
 * población ancestral que maximizan la verosimilitud del genotipo observado.
 *
 * Limitación conocida: ~26 SNPs disponibles vs ~10.000 que usa ADMIXTURE real.
 * Precisión estimada: ±8-12% para componentes mayores, ±5% para mezcla obvia.
 * Para mayor precisión se requieren más AIMs (expansión futura de la DB).
 */

const { AIM_SNPS, POPULATIONS } = require('./referenceData');

const POPULATIONS_LIST = Object.keys(POPULATIONS);
const K                = POPULATIONS_LIST.length;
const MAX_ITERATIONS   = 1000;
const CONVERGENCE      = 0.0001;
const MIN_SNPS         = 8; // mínimo de AIMs encontrados para dar resultado confiable

/**
 * Cuenta cuántas copias del minorAllele canónico hay en el genotipo (0, 1 ó 2).
 * @param {string} genotype  — dos caracteres, ej. "AG", "GG", "CT"
 * @param {string} minorAllele — alelo AIM-informativo específico del SNP, ej. "A", "G", "T"
 */
function _countMinorAlleles(genotype, minorAllele) {
    if (!genotype || genotype.length < 2 || !minorAllele) return 0;
    const target = minorAllele.toUpperCase();
    const a = genotype[0].toUpperCase();
    const b = genotype[1].toUpperCase();
    return (a === target ? 1 : 0) + (b === target ? 1 : 0);
}

/**
 * Algoritmo EM para estimar proporciones de ancestría.
 * @param {{ [rsid]: { genotype: string } }} userSnps
 * @returns {Array<{ population, name, flag, percentage, color, subpopulations }>}
 */
function calculateAncestry(userSnps) {
    // Filtrar solo los AIMs que el usuario tiene
    const userAims = {};
    for (const rsid of Object.keys(AIM_SNPS)) {
        if (userSnps[rsid] && userSnps[rsid].genotype && userSnps[rsid].genotype !== '--') {
            userAims[rsid] = userSnps[rsid].genotype;
        }
    }

    const aimCount = Object.keys(userAims).length;
    console.log(`[ANCESTRY] AIMs encontrados: ${aimCount}/${Object.keys(AIM_SNPS).length}`);
    console.log(`[ANCESTRY] AIMs detectados: ${Object.keys(userAims).join(', ')}`);
    for (const [rsid, gt] of Object.entries(userAims)) {
        console.log(`[ANCESTRY]   ${rsid}: ${gt}`);
    }
    console.log(`[CALC_ANCESTRY_v2] algoritmo v2 — minorAllele canónico por SNP activo`);

    if (aimCount < MIN_SNPS) {
        throw new Error(`Solo se encontraron ${aimCount} marcadores AIM (mínimo ${MIN_SNPS}). Verifica que el archivo tenga suficiente cobertura.`);
    }

    // Log per-SNP allele counts with canonical minorAllele for debug
    const alleleCounts = Object.entries(userAims).map(([rsid, gt]) => {
        const snpDef = AIM_SNPS[rsid];
        const count = _countMinorAlleles(gt, snpDef?.minorAllele);
        return `${rsid}(${snpDef?.minorAllele ?? '?'})=${count}`;
    });
    console.log(`[CALC_ANCESTRY_v2] allele_counts: ${alleleCounts.join(' ')}`);

    // Inicialización determinista basada en similitud observada con cada población
    // Evita que diferentes usuarios converjan al mismo mínimo local
    const q = {};
    const rawSim = {};
    for (const pop of POPULATIONS_LIST) {
        let sim = 0;
        let n = 0;
        for (const [rsid, gt] of Object.entries(userAims)) {
            const snpDef = AIM_SNPS[rsid];
            const freq = snpDef?.popFreq?.[pop];
            if (freq === undefined) continue;
            const minor = _countMinorAlleles(gt, snpDef.minorAllele);
            const expected = freq * 2; // diploid expected minor allele count
            sim += 1 - Math.abs(minor - expected) / 2;
            n++;
        }
        rawSim[pop] = n > 0 ? sim / n : 1 / K;
    }
    const simTotal = POPULATIONS_LIST.reduce((s, p) => s + rawSim[p], 0);
    POPULATIONS_LIST.forEach(pop => { q[pop] = simTotal > 0 ? rawSim[pop] / simTotal : 1 / K; });
    console.log(`[ANCESTRY] Q inicial: ${POPULATIONS_LIST.map(p => `${p}=${(q[p]*100).toFixed(1)}%`).join(', ')}`);

    // ── Algoritmo EM ────────────────────────────────────────────────────
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const qOld = { ...q };

        // E-step: calcular counts esperados de ancestría por alelo
        const expectedCounts = {};
        POPULATIONS_LIST.forEach(pop => { expectedCounts[pop] = 0; });
        let totalAlleles = 0;

        for (const rsid of Object.keys(userAims)) {
            const snp      = AIM_SNPS[rsid];
            const genotype = userAims[rsid];
            const minorCount = _countMinorAlleles(genotype, snp.minorAllele);

            // Para cada uno de los 2 alelos
            for (let alleleIdx = 0; alleleIdx < 2; alleleIdx++) {
                const isMinor = alleleIdx < minorCount;
                totalAlleles++;

                // Probabilidad total de observar este alelo dada la mezcla actual
                let totalProb = 0;
                for (const pop of POPULATIONS_LIST) {
                    const p_k = snp.popFreq[pop] !== undefined ? snp.popFreq[pop] : 0.5;
                    totalProb += (isMinor ? p_k : (1 - p_k)) * q[pop];
                }

                if (totalProb < 1e-10) continue;

                // Asignar fracción de este alelo a cada población
                for (const pop of POPULATIONS_LIST) {
                    const p_k = snp.popFreq[pop] !== undefined ? snp.popFreq[pop] : 0.5;
                    expectedCounts[pop] += ((isMinor ? p_k : (1 - p_k)) * q[pop]) / totalProb;
                }
            }
        }

        // M-step: actualizar q
        for (const pop of POPULATIONS_LIST) {
            q[pop] = totalAlleles > 0 ? expectedCounts[pop] / totalAlleles : 1 / K;
        }

        // Normalizar (suma = 1)
        const total = POPULATIONS_LIST.reduce((s, p) => s + q[p], 0);
        if (total > 0) POPULATIONS_LIST.forEach(pop => { q[pop] /= total; });

        // Verificar convergencia
        const maxDiff = POPULATIONS_LIST.reduce((m, pop) => Math.max(m, Math.abs(q[pop] - qOld[pop])), 0);
        if (maxDiff < CONVERGENCE) {
            console.log(`[ANCESTRY] EM convergió en iteración ${iter + 1}`);
            break;
        }
    }

    console.log(`[ANCESTRY] Q final: ${POPULATIONS_LIST.map(p => `${p}=${(q[p]*100).toFixed(1)}%`).join(', ')}`);
    return _formatResults(q, aimCount);
}

function _formatResults(q, aimsUsed) {
    const results = [];

    for (const pop of POPULATIONS_LIST) {
        if (q[pop] > 0.003) { // ignorar < 0.3%
            results.push({
                population:     pop,
                name:           POPULATIONS[pop].name,
                nameEs:         POPULATIONS[pop].nameEs,
                flag:           POPULATIONS[pop].flag,
                color:          POPULATIONS[pop].color,
                percentage:     Math.round(q[pop] * 1000) / 10,
                subpopulations: POPULATIONS[pop].subpopulations
            });
        }
    }

    // Ordenar por porcentaje descendente
    results.sort((a, b) => b.percentage - a.percentage);

    // Renormalizar a exactamente 100%
    const totalPct = results.reduce((s, r) => s + r.percentage, 0);
    if (totalPct > 0 && totalPct !== 100) {
        results.forEach(r => { r.percentage = Math.round((r.percentage / totalPct) * 1000) / 10; });
        // Ajustar el primero para que sume exactamente 100
        const diff = 100 - results.reduce((s, r) => s + r.percentage, 0);
        if (results.length > 0) results[0].percentage = Math.round((results[0].percentage + diff) * 10) / 10;
    }

    return {
        populations:   results,
        aimsAnalyzed:  aimsUsed,
        totalAimsInDb: Object.keys(AIM_SNPS).length,
        confidence:    aimsUsed >= 20 ? 'high' : aimsUsed >= 12 ? 'medium' : 'low',
        accuracy:      `±${aimsUsed >= 20 ? '6' : aimsUsed >= 12 ? '10' : '15'}%`
    };
}

module.exports = { calculateAncestry };
