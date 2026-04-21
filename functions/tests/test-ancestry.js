/**
 * Test local del algoritmo de ancestría.
 * No requiere Firebase; testea el módulo calculateAncestry() directamente.
 *
 * Perfiles de test:
 *  1. "Europeo puro" — frecuencias alélicas típicas de europeo del norte/sur
 *  2. "Chileno mestizo típico" — ~50% europeo, ~45% amerindio, trazas africanas
 *  3. "Asiático del Este" — frecuencias típicas de Asia oriental
 *
 * Basado en frecuencias del 1000 Genomes Project (no datos reales de individuos).
 */

const { calculateAncestry } = require('../ancestry/calculator');

// ── Perfiles de test ──────────────────────────────────────────────────

// 1. Europeo puro (similar a Manu Sporny / Bastian Greshake)
//    Alelos consistentes con frecuencias europeas en los 26 AIMs
const EUROPEAN_SNPS = {
    rs1426654:  { genotype: 'AA' },  // SLC24A5: casi 100% A en europeos
    rs16891982: { genotype: 'CC' },  // SLC45A2: 97% C en europeos
    rs1042602:  { genotype: 'AA' },  // TYR: 41% A en europeos
    rs12913832: { genotype: 'GG' },  // HERC2: ojos azules (63% G en EUR)
    rs1805007:  { genotype: 'CC' },  // MC1R: 89% CC en europeos
    rs2814778:  { genotype: 'CC' },  // DARC: 0% riesgo malaria (europeos CC)
    rs1834640:  { genotype: 'AC' },  // HMGA2: mezcla europea
    rs2402130:  { genotype: 'AC' },
    rs3827760:  { genotype: 'GG' },  // EDAR: sin variante asiática
    rs2250072:  { genotype: 'AC' },  // ADH1B: bajo en asiáticos, moderado EUR
    rs671:      { genotype: 'GG' },  // ALDH2: sin variante asiática
    rs17822931: { genotype: 'CC' },  // ABCC11: cerumen húmedo (europeo)
    rs4778241:  { genotype: 'AA' },
    rs7554936:  { genotype: 'AC' },
    rs10883099: { genotype: 'AC' },
    rs3794102:  { genotype: 'AC' },
    rs2187668:  { genotype: 'AC' },  // HLA-DQ2.5
    rs9268516:  { genotype: 'AC' },
    rs4988235:  { genotype: 'TT' },  // MCM6: lactasa persistente (72% EUR)
    rs7903146:  { genotype: 'CT' },  // TCF7L2: riesgo diabetes moderado
    rs1800562:  { genotype: 'AG' },  // HFE: portador europeo norte
    rs762551:   { genotype: 'AA' },  // CYP1A2: metabolizador rápido cafeína
    rs1801133:  { genotype: 'CC' },  // MTHFR normal
    rs1800795:  { genotype: 'GG' },  // IL6
    rs2282679:  { genotype: 'AA' },  // GC: vitamina D normal
    rs4680:     { genotype: 'AG' }   // COMT Val/Met
};

// 2. Chileno mestizo típico (europeo sur + amerindio andino)
const CHILEAN_MESTIZO_SNPS = {
    rs1426654:  { genotype: 'AC' },  // SLC24A5: mezcla (EUR heterocigoto)
    rs16891982: { genotype: 'CG' },  // SLC45A2: mezcla
    rs1042602:  { genotype: 'AG' },
    rs12913832: { genotype: 'AG' },  // HERC2: mezcla (ojos intermedios)
    rs1805007:  { genotype: 'CC' },  // MC1R: sin variante pelirroja
    rs2814778:  { genotype: 'CC' },  // DARC
    rs1834640:  { genotype: 'GG' },  // HMGA2: predominio no-europeo
    rs2402130:  { genotype: 'GG' },
    rs3827760:  { genotype: 'AA' },  // EDAR: variante asiática/amerindia (homocigoto)
    rs2250072:  { genotype: 'AA' },  // ADH1B: variante amerindia
    rs671:      { genotype: 'GG' },  // ALDH2: normal
    rs17822931: { genotype: 'TT' },  // ABCC11: cerumen seco (amerindio)
    rs4778241:  { genotype: 'AA' },
    rs7554936:  { genotype: 'AA' },  // alta frecuencia amerindia
    rs10883099: { genotype: 'AA' },
    rs3794102:  { genotype: 'AC' },
    rs2187668:  { genotype: 'GG' },  // sin HLA-DQ2.5
    rs9268516:  { genotype: 'CC' },
    rs4988235:  { genotype: 'CT' },  // MCM6: parcialmente tolerante lactosa
    rs7903146:  { genotype: 'TT' },  // TCF7L2: mayor riesgo diabetes (amerindio)
    rs1800562:  { genotype: 'GG' },  // HFE normal
    rs762551:   { genotype: 'AC' },
    rs1801133:  { genotype: 'CT' },  // MTHFR heterocigoto
    rs1800795:  { genotype: 'GG' },
    rs2282679:  { genotype: 'CC' },  // GC: déficit vitamina D (amerindio)
    rs4680:     { genotype: 'GG' }
};

// 3. Asiático del Este
const EAST_ASIAN_SNPS = {
    rs1426654:  { genotype: 'GG' },  // SLC24A5: sin alelo europeo
    rs16891982: { genotype: 'GG' },
    rs1042602:  { genotype: 'GG' },
    rs12913832: { genotype: 'AA' },  // HERC2: ojos marrones
    rs1805007:  { genotype: 'CC' },
    rs2814778:  { genotype: 'CC' },
    rs1834640:  { genotype: 'GG' },
    rs2402130:  { genotype: 'GG' },
    rs3827760:  { genotype: 'AA' },  // EDAR: variante asiática homocigota
    rs2250072:  { genotype: 'AA' },  // ADH1B: alta en asiáticos
    rs671:      { genotype: 'AG' },  // ALDH2*2 heterocigoto (común en Asia)
    rs17822931: { genotype: 'TT' },  // ABCC11: cerumen seco
    rs4778241:  { genotype: 'GG' },
    rs7554936:  { genotype: 'AA' },
    rs10883099: { genotype: 'AA' },
    rs3794102:  { genotype: 'GG' },
    rs2187668:  { genotype: 'GG' },
    rs9268516:  { genotype: 'CC' },
    rs4988235:  { genotype: 'CC' },  // MCM6: intolerante lactosa
    rs7903146:  { genotype: 'CT' },
    rs1800562:  { genotype: 'GG' },
    rs762551:   { genotype: 'AC' },
    rs1801133:  { genotype: 'CT' },
    rs1800795:  { genotype: 'GG' },
    rs2282679:  { genotype: 'AC' },
    rs4680:     { genotype: 'AA' }
};

// ── Ejecutar tests ─────────────────────────────────────────────────────

function runTest(label, snps, expectedTop) {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: ' + label);
    console.log('='.repeat(60));

    try {
        const result = calculateAncestry(snps);
        console.log('AIMs analizados: ' + result.aimsAnalyzed + '/' + result.totalAimsInDb);
        console.log('Confianza: ' + result.confidence + ' (' + result.accuracy + ')');
        console.log('\nResultados:');

        let pass = true;
        result.populations.forEach(function(pop) {
            const marker = pop.population === expectedTop ? ' ← PRINCIPAL' : '';
            console.log('  ' + pop.flag + ' ' + pop.nameEs + ': ' + pop.percentage + '%' + marker);
        });

        const top = result.populations[0];
        if (top.population === expectedTop) {
            console.log('\n✅ PASS: Población principal correcta (' + top.population + ' ' + top.percentage + '%)');
        } else {
            console.log('\n❌ FAIL: Se esperaba ' + expectedTop + ' pero obtuvo ' + top.population);
            pass = false;
        }

        return { label, result, pass };
    } catch (err) {
        console.log('❌ ERROR: ' + err.message);
        return { label, result: null, pass: false, error: err.message };
    }
}

const results = [
    runTest('Europeo puro (perfil Manu Sporny / Bastian Greshake)', EUROPEAN_SNPS, 'EUR'),
    runTest('Chileno mestizo típico', CHILEAN_MESTIZO_SNPS, 'AMR_NAT'),
    runTest('Asiático del Este', EAST_ASIAN_SNPS, 'EAS')
];

console.log('\n' + '='.repeat(60));
console.log('RESUMEN DE TESTS');
console.log('='.repeat(60));
const passed = results.filter(function(r) { return r.pass; }).length;
console.log(passed + '/' + results.length + ' tests pasaron');

// Guardar resultados detallados
const fs = require('fs');
const output = {
    generated_at:    new Date().toISOString(),
    algorithm:       'EM (ADMIXTURE-inspired), 26 AIMs, 1000 Genomes reference',
    tests_run:       results.length,
    tests_passed:    passed,
    results:         results.map(function(r) {
        return {
            label: r.label,
            pass:  r.pass,
            populations: r.result ? r.result.populations : null,
            confidence:  r.result ? r.result.confidence : null,
            accuracy:    r.result ? r.result.accuracy : null,
            aimsAnalyzed: r.result ? r.result.aimsAnalyzed : null
        };
    })
};

fs.writeFileSync(
    __dirname + '/test-results-ancestry.json',
    JSON.stringify(output, null, 2)
);
console.log('\nResultados guardados en tests/test-results-ancestry.json');
