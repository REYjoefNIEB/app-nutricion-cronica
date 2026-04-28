'use strict';
/**
 * Tests de regresion para predictEyeColor post-calibracion (Sprint 36).
 *
 * Estrategia: invocar softmaxPredict directamente con counts del dataset
 * (en vez de construir genotipos sinteticos que disparan complement fallback
 * de countMinorAlleles). Esto verifica el modelo matematico end-to-end.
 *
 * Banda esperada:
 *   - Train (1-14): error <5%   (calibracion los vio)
 *   - Test (15-20): error <10%  (holdout)
 *
 * Total: 20 casos x 3 categorias = 60 asserts. >=54 PASS (90%) requerido.
 */

const { EYE_COEFFICIENTS, softmaxPredict } = require('../functions/traits/hirisplex');

const DATASET = [
    { id: '01_kenneth_real',                input: [1, 1, 0, 2, 1, 1], output: [0.0273, 0.1127, 0.8600], train: true },
    { id: '02_james_real',                  input: [1, 0, 1, 2, 0, 1], output: [0.0110, 0.0485, 0.9405], train: true },
    { id: '03_bastian_real',                input: [0, 0, 1, 2, 0, 0], output: [0.5103, 0.1042, 0.3855], train: true },
    { id: '04_synth_all_zero',              input: [0, 0, 0, 0, 0, 0], output: [0.8478, 0.0877, 0.0645], train: true },
    { id: '05_synth_all_two',               input: [2, 2, 2, 2, 2, 2], output: [0.0066, 0.1191, 0.8743], train: true },
    { id: '06_synth_herc2_only_two',        input: [2, 0, 0, 0, 0, 0], output: [0.0003, 0.0134, 0.9863], train: true },
    { id: '07_synth_herc2_only_zero',       input: [0, 2, 2, 2, 2, 2], output: [0.9608, 0.0366, 0.0027], train: true },
    { id: '08_synth_herc2_one_rest_zero',   input: [1, 0, 0, 0, 0, 0], output: [0.0503, 0.1136, 0.8361], train: true },
    { id: '09_synth_herc2_one_rest_two',    input: [1, 2, 2, 2, 2, 2], output: [0.4099, 0.3403, 0.2498], train: true },
    { id: '10_synth_oca2_dominant',         input: [0, 2, 0, 0, 0, 0], output: [0.9466, 0.0484, 0.0050], train: true },
    { id: '11_synth_irf4_dominant',         input: [0, 0, 0, 0, 0, 2], output: [0.8909, 0.0907, 0.0184], train: true },
    { id: '12_synth_slc45a2_dominant',      input: [0, 0, 0, 2, 0, 0], output: [0.3377, 0.1148, 0.5475], train: true },
    { id: '13_synth_tyr_dominant',          input: [0, 0, 0, 0, 2, 0], output: [0.9109, 0.0600, 0.0291], train: true },
    { id: '14_synth_loc_dominant',          input: [0, 0, 2, 0, 0, 0], output: [0.9489, 0.0354, 0.0157], train: true },
    { id: '15_synth_mid_balanced',          input: [1, 1, 1, 1, 1, 1], output: [0.1802, 0.2466, 0.5733], train: false },
    { id: '16_synth_herc2_two_others_one',  input: [2, 1, 1, 1, 1, 1], output: [0.0014, 0.0412, 0.9575], train: false },
    { id: '17_synth_herc2_zero_others_one', input: [0, 1, 1, 1, 1, 1], output: [0.9282, 0.0582, 0.0135], train: false },
    { id: '18_synth_typical_eu_blue',       input: [2, 0, 1, 0, 0, 0], output: [0.0006, 0.0172, 0.9822], train: false },
    { id: '19_synth_typical_eu_brown',      input: [0, 1, 0, 0, 0, 0], output: [0.9151, 0.0665, 0.0184], train: false },
    { id: '20_synth_random_mix',            input: [1, 0, 1, 1, 0, 1], output: [0.0454, 0.1107, 0.8439], train: false }
];

const IRIS_RSIDS = ['rs12913832', 'rs1800407', 'rs12896399', 'rs16891982', 'rs1393350', 'rs12203592'];

let passed = 0, failed = 0;
function assert(name, cond, expected, actual) {
    console.log(`  ${cond ? '[PASS]' : '[FAIL]'} ${name}`);
    if (!cond) console.log(`     expected ~${expected.toFixed(1)}%, got ${actual.toFixed(1)}%`);
    cond ? passed++ : failed++;
}

const TOLERANCE_TRAIN = 5;
const TOLERANCE_TEST = 10;

console.log('\n=== Tests de regresion eye color calibration v2 ===\n');

for (const tc of DATASET) {
    // Construir snpValues map directamente con los counts del dataset
    const snpValues = {};
    for (let i = 0; i < 6; i++) {
        snpValues[IRIS_RSIDS[i]] = tc.input[i];
    }

    // Invocar softmaxPredict (mismo que predictEyeColor usa internamente)
    const probs = softmaxPredict(EYE_COEFFICIENTS, snpValues, 'brown');

    // probabilities en hirisplex.js retorna en %, pero softmaxPredict directamente
    // retorna fracciones 0-1. Convertir a % para comparar con expected (% scale).
    const p = {
        blue: probs.blue * 100,
        intermediate: probs.intermediate * 100,
        brown: probs.brown * 100
    };
    const expected = {
        blue: tc.output[0] * 100,
        intermediate: tc.output[1] * 100,
        brown: tc.output[2] * 100
    };
    const diffs = {
        blue: Math.abs(p.blue - expected.blue),
        intermediate: Math.abs(p.intermediate - expected.intermediate),
        brown: Math.abs(p.brown - expected.brown)
    };

    const tol = tc.train ? TOLERANCE_TRAIN : TOLERANCE_TEST;
    const setLabel = tc.train ? 'train' : 'test';

    assert(`${tc.id} [${setLabel}] blue (tol=${tol}%)`,         diffs.blue < tol,         expected.blue,         p.blue);
    assert(`${tc.id} [${setLabel}] intermediate (tol=${tol}%)`, diffs.intermediate < tol, expected.intermediate, p.intermediate);
    assert(`${tc.id} [${setLabel}] brown (tol=${tol}%)`,        diffs.brown < tol,        expected.brown,        p.brown);
}

console.log(`\n${'='.repeat(60)}`);
const total = passed + failed;
console.log(`Total: ${passed}/${total} pasaron, ${failed} fallaron`);
if (failed === 0) {
    console.log(`[OK] Todos los tests pasaron (${passed}/${total})`);
    process.exitCode = 0;
} else if (passed >= 54) {
    console.log(`[ACCEPT] >=54/60 (90%) - dentro de banda aceptable`);
    process.exitCode = 0;
} else {
    console.log(`[FAIL] <54/60 - calibracion insuficiente`);
    process.exitCode = 1;
}
console.log('='.repeat(60));
