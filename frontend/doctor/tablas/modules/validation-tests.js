// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-A)
// Tests de validación de las 5 escalas (40 casos = 8 por escala).
//
// IMPORTANTE — interpretación honesta:
//   Estos tests verifican AUTO-COHERENCIA del código: que la fórmula
//   implementada produce siempre el mismo resultado para los inputs
//   dados. NO son validación clínica.
//
//   La VALIDACIÓN CLÍNICA (verdad MDCalc) la hace GEroe manualmente:
//   abre MDCalc.com con los mismos inputs, compara resultados,
//   y marca cada caso como `mdcalc.verified = true` si coinciden.
//   Sin esa pasada bilateral, el footer "Validado contra MDCalc" NO
//   se planta en la UI.
//
// Caso de referencia ya validado bilateralmente (2026-04-30):
//   eGFR cr=1.5 mg/dL, age=60, M → 53 mL/min/1.73m² · G3a
//
// Ejecución: `node validation-tests.js` desde el repo root.
//   Salida: REPORT con casos pass/fail. Exit code 0 si 40/40, 1 si fail.
// =================================================================

(function () {
    'use strict';

    // Resolver Calculators tanto en browser como en Node.
    let C;
    if (typeof require === 'function') {
        C = require('./calculators.js');
    } else {
        C = (typeof window !== 'undefined' && window.NuraTablas && window.NuraTablas.Calculators) || null;
    }
    if (!C) throw new Error('[ValidationTests] Calculators no disponibles');

    const validationTests = {

        egfr_ckdepi: [
            {
                id: 'egfr-001',
                name: 'Caso 1: paciente joven sano (score alto, G1)',
                inputs: { creatinine: 0.9, age: 30, sex: 'M' },
                expected: { value: 118, category: 'G1', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-002',
                name: 'Caso 2: mujer 75a en falla renal severa (G5)',
                inputs: { creatinine: 8.0, age: 75, sex: 'F' },
                expected: { value: 5, category: 'G5', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-003',
                name: 'Caso 3: hombre 50a, creatinina alta-normal (umbral G2/G3a)',
                inputs: { creatinine: 1.05, age: 50, sex: 'M' },
                expected: { value: 86, category: 'G2', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-004',
                name: 'Caso 4: hombre 60a (umbral G3a/G3b)',
                inputs: { creatinine: 1.7, age: 60, sex: 'M' },
                expected: { value: 46, category: 'G3a', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-005',
                name: 'Caso 5: hombre 60a creatinina elevada (umbral G3b/G4)',
                inputs: { creatinine: 2.5, age: 60, sex: 'M' },
                expected: { value: 29, category: 'G4', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-006',
                name: 'Caso 6: mujer 50a creatinina límite (G2)',
                inputs: { creatinine: 1.0, age: 50, sex: 'F' },
                expected: { value: 69, category: 'G2', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-007',
                name: 'Caso 7: hombre 65a (G3a típico)',
                inputs: { creatinine: 1.6, age: 65, sex: 'M' },
                expected: { value: 48, category: 'G3a', unit: 'mL/min/1.73m²' },
                mdcalc: { verified: false, valueObserved: null, verifiedDate: null }
            },
            {
                id: 'egfr-ref-mdcalc-2026-04-30',
                name: 'CASO DE REFERENCIA — validado contra MDCalc 2026-04-30',
                inputs: { creatinine: 1.5, age: 60, sex: 'M' },
                expected: { value: 53, category: 'G3a', unit: 'mL/min/1.73m²' },
                mdcalc: {
                    verified: true,
                    valueObserved: 53,
                    verifiedDate: '2026-04-30',
                    notes: 'Validado por GEroe en MDCalc.com con creatinina en mg/dL'
                }
            }
        ],

        kdigo: [
            { id: 'kdigo-001', name: 'Caso 1: G1 normal',                   inputs: { egfr: 120 }, expected: { value: 120, category: 'G1' },  mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-002', name: 'Caso 2: G1 límite inferior (=90)',    inputs: { egfr: 90  }, expected: { value: 90,  category: 'G1' },  mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-003', name: 'Caso 3: G2 límite superior (=89)',    inputs: { egfr: 89  }, expected: { value: 89,  category: 'G2' },  mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-004', name: 'Caso 4: G2 medio',                    inputs: { egfr: 75  }, expected: { value: 75,  category: 'G2' },  mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-005', name: 'Caso 5: G3a típico',                  inputs: { egfr: 50  }, expected: { value: 50,  category: 'G3a' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-006', name: 'Caso 6: G3b típico',                  inputs: { egfr: 35  }, expected: { value: 35,  category: 'G3b' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-007', name: 'Caso 7: G4 severo',                   inputs: { egfr: 20  }, expected: { value: 20,  category: 'G4' },  mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'kdigo-008', name: 'Caso 8: G5 falla renal (diálisis)',   inputs: { egfr: 10  }, expected: { value: 10,  category: 'G5' },  mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        nyha: [
            { id: 'nyha-001', name: 'Caso 1: paciente asintomático (Clase I)',                inputs: { symptoms: 'I'   }, expected: { value: 'I',   category: 'Clase I'   }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-002', name: 'Caso 2: post-tratamiento sin disnea (Clase I)',          inputs: { symptoms: 'I'   }, expected: { value: 'I',   category: 'Clase I'   }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-003', name: 'Caso 3: disnea con actividad ordinaria (Clase II)',      inputs: { symptoms: 'II'  }, expected: { value: 'II',  category: 'Clase II'  }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-004', name: 'Caso 4: fatiga al subir escaleras (Clase II)',           inputs: { symptoms: 'II'  }, expected: { value: 'II',  category: 'Clase II'  }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-005', name: 'Caso 5: síntomas con actividad menor (Clase III)',       inputs: { symptoms: 'III' }, expected: { value: 'III', category: 'Clase III' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-006', name: 'Caso 6: disnea al vestirse (Clase III)',                 inputs: { symptoms: 'III' }, expected: { value: 'III', category: 'Clase III' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-007', name: 'Caso 7: disnea en reposo (Clase IV)',                    inputs: { symptoms: 'IV'  }, expected: { value: 'IV',  category: 'Clase IV'  }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'nyha-008', name: 'Caso 8: incapaz de actividad mínima sin síntomas (IV)',  inputs: { symptoms: 'IV'  }, expected: { value: 'IV',  category: 'Clase IV'  }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        cha2ds2vasc: [
            { id: 'cha-001', name: 'Caso 1: hombre 50a sin factores (score 0, no anticoag)',
              inputs: {}, expected: { value: 0, category: 'Score 0' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-002', name: 'Caso 2: mujer 50a sola sin factores (score 1, solo sexo)',
              inputs: { female: true }, expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-003', name: 'Caso 3: hombre 50a con HTA (score 1)',
              inputs: { htn: true }, expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-004', name: 'Caso 4: hombre HTA + DM (score 2, anticoag clase I)',
              inputs: { htn: true, diabetes: true }, expected: { value: 2, category: 'Score 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-005', name: 'Caso 5: mujer 70a HTA DM (score 4)',
              inputs: { htn: true, diabetes: true, age65_74: true, female: true }, expected: { value: 4, category: 'Score 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-006', name: 'Caso 6: hombre 80a con stroke previo (score 4)',
              inputs: { age75: true, stroke: true }, expected: { value: 4, category: 'Score 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-007', name: 'Caso 7: mujer 80a con múltiples comorbilidades (score 7)',
              inputs: { chf: true, htn: true, age75: true, diabetes: true, vascular: true, female: true }, expected: { value: 7, category: 'Score 7' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-008', name: 'Caso 8: máximo realista — todos los items excluyente edad (score 9)',
              inputs: { chf: true, htn: true, age75: true, diabetes: true, stroke: true, vascular: true, female: true }, expected: { value: 9, category: 'Score 9' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        child_pugh: [
            { id: 'cp-001', name: 'Caso 1: mínimo Clase A (5 pts) — cirrosis bien compensada',
              inputs: { bilirubin: 1.0, albumin: 4.0, inr: 1.1, ascites: 'absent', encephalopathy: 'absent' },
              expected: { value: 5, category: 'Clase A' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-002', name: 'Caso 2: Clase A límite por bilirrubina (6 pts)',
              inputs: { bilirubin: 2.5, albumin: 4.0, inr: 1.1, ascites: 'absent', encephalopathy: 'absent' },
              expected: { value: 6, category: 'Clase A' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-003', name: 'Caso 3: Clase A límite por albúmina (6 pts)',
              inputs: { bilirubin: 1.5, albumin: 3.0, inr: 1.1, ascites: 'absent', encephalopathy: 'absent' },
              expected: { value: 6, category: 'Clase A' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-004', name: 'Caso 4: Clase B típica (8 pts) — compromiso significativo',
              inputs: { bilirubin: 2.5, albumin: 3.0, inr: 1.8, ascites: 'absent', encephalopathy: 'absent' },
              expected: { value: 8, category: 'Clase B' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-005', name: 'Caso 5: Clase B máximo (9 pts) — borde con C',
              inputs: { bilirubin: 2.5, albumin: 2.7, inr: 1.8, ascites: 'absent', encephalopathy: 'absent' },
              expected: { value: 9, category: 'Clase B' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-006', name: 'Caso 6: Clase C inicial (10 pts) — descompensación',
              inputs: { bilirubin: 3.5, albumin: 2.7, inr: 1.8, ascites: 'absent', encephalopathy: 'absent' },
              expected: { value: 10, category: 'Clase C' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-007', name: 'Caso 7: Clase C avanzada (12 pts) — con ascitis',
              inputs: { bilirubin: 4.0, albumin: 2.5, inr: 2.5, ascites: 'slight', encephalopathy: 'absent' },
              expected: { value: 12, category: 'Clase C' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cp-008', name: 'Caso 8: máximo Clase C (15 pts) — falla hepática terminal',
              inputs: { bilirubin: 5.0, albumin: 2.0, inr: 3.0, ascites: 'moderate', encephalopathy: '3_4' },
              expected: { value: 15, category: 'Clase C' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ]
    };

    // ─────────────────────────────────────────────────────────────
    // Runner: ejecuta cada caso, compara con expected, reporta.
    // ─────────────────────────────────────────────────────────────
    const fnMap = {
        egfr_ckdepi: C.calc_egfr_ckdepi,
        kdigo:       C.calc_kdigo,
        nyha:        C.calc_nyha,
        cha2ds2vasc: C.calc_cha2ds2vasc,
        child_pugh:  C.calc_child_pugh
    };

    function runAll() {
        let pass = 0, fail = 0, total = 0;
        const failures = [];

        console.log('\n=== Sprint M4-A — Validación auto-coherencia (40 casos) ===\n');

        for (const scaleId of Object.keys(validationTests)) {
            const fn = fnMap[scaleId];
            if (!fn) {
                console.error(`SKIP: ${scaleId} sin función mapeada`);
                continue;
            }
            console.log(`-- ${scaleId} --`);
            for (const tc of validationTests[scaleId]) {
                total++;
                const r = fn(tc.inputs);
                if (r.error) {
                    fail++;
                    failures.push({ id: tc.id, expected: tc.expected, got: r });
                    console.log(`  [FAIL] ${tc.id}  ${tc.name}`);
                    console.log(`         error: ${r.error}`);
                    continue;
                }
                const okValue = String(r.value) === String(tc.expected.value);
                const okCat   = r.category === tc.expected.category;
                if (okValue && okCat) {
                    pass++;
                    console.log(`  [PASS] ${tc.id}  value=${r.value}  cat=${r.category}`);
                } else {
                    fail++;
                    failures.push({ id: tc.id, expected: tc.expected, got: { value: r.value, category: r.category } });
                    console.log(`  [FAIL] ${tc.id}  ${tc.name}`);
                    console.log(`         expected: value=${tc.expected.value} cat=${tc.expected.category}`);
                    console.log(`         got:      value=${r.value} cat=${r.category}`);
                }
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Total: ${pass}/${total} pass, ${fail} fail`);
        const verifiedCount = Object.values(validationTests)
            .flat()
            .filter(t => t.mdcalc && t.mdcalc.verified).length;
        console.log(`Validados bilateralmente vs MDCalc: ${verifiedCount}/${total} (objetivo M4-A: 10)`);
        console.log('='.repeat(60));

        return { pass, fail, total, failures, mdcalcVerified: verifiedCount };
    }

    // Exposición + auto-run en CLI
    const api = { validationTests, runAll };
    if (typeof window !== 'undefined') {
        window.NuraTablas = window.NuraTablas || {};
        window.NuraTablas.ValidationTests = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    // Si se ejecuta directamente con `node validation-tests.js`, correr.
    if (typeof require !== 'undefined' && require.main === module) {
        const result = runAll();
        process.exitCode = result.fail === 0 ? 0 : 1;
    }
})();
