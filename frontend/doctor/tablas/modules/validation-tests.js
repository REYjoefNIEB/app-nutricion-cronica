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
              inputs: { chf:'no',  htn:'no',  diabetes:'no',  stroke:'no',  vascular:'no',  ageGroup:'under65', sex:'M' },
              expected: { value: 0, category: 'Score 0' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-002', name: 'Caso 2: mujer 50a sola sin factores (score 1, solo sexo)',
              inputs: { chf:'no',  htn:'no',  diabetes:'no',  stroke:'no',  vascular:'no',  ageGroup:'under65', sex:'F' },
              expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-003', name: 'Caso 3: hombre 50a con HTA (score 1)',
              inputs: { chf:'no',  htn:'yes', diabetes:'no',  stroke:'no',  vascular:'no',  ageGroup:'under65', sex:'M' },
              expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-004', name: 'Caso 4: hombre HTA + DM (score 2, anticoag clase I)',
              inputs: { chf:'no',  htn:'yes', diabetes:'yes', stroke:'no',  vascular:'no',  ageGroup:'under65', sex:'M' },
              expected: { value: 2, category: 'Score 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-005', name: 'Caso 5: mujer 70a HTA DM (score 4)',
              inputs: { chf:'no',  htn:'yes', diabetes:'yes', stroke:'no',  vascular:'no',  ageGroup:'65_74',   sex:'F' },
              expected: { value: 4, category: 'Score 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-006', name: 'Caso 6: hombre 80a con stroke previo (score 4)',
              inputs: { chf:'no',  htn:'no',  diabetes:'no',  stroke:'yes', vascular:'no',  ageGroup:'75plus',  sex:'M' },
              expected: { value: 4, category: 'Score 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-007', name: 'Caso 7: mujer 80a con múltiples comorbilidades (score 7)',
              inputs: { chf:'yes', htn:'yes', diabetes:'yes', stroke:'no',  vascular:'yes', ageGroup:'75plus',  sex:'F' },
              expected: { value: 7, category: 'Score 7' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'cha-008', name: 'Caso 8: máximo realista — todos los items con edad ≥75 (score 9)',
              inputs: { chf:'yes', htn:'yes', diabetes:'yes', stroke:'yes', vascular:'yes', ageGroup:'75plus',  sex:'F' },
              expected: { value: 9, category: 'Score 9' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
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
        ],

        // ─── Sprint M4-B-1 ───────────────────────────────────────

        hasbled: [
            { id: 'hb-001', name: 'Caso 1: paciente sin factores (score 0)',
              inputs: {},
              expected: { value: 0, category: 'Score 0' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-002', name: 'Caso 2: solo edad >65 (score 1)',
              inputs: { elderly: 'yes' },
              expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-003', name: 'Caso 3: HTA + edad >65 (score 2 — umbral moderado)',
              inputs: { hypertension: 'yes', elderly: 'yes' },
              expected: { value: 2, category: 'Score 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-004', name: 'Caso 4: HTA + edad + INR lábil (score 3 — umbral alto)',
              inputs: { hypertension: 'yes', elderly: 'yes', labileINR: 'yes' },
              expected: { value: 3, category: 'Score 3' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-005', name: 'Caso 5: múltiples factores (score 5)',
              inputs: { hypertension: 'yes', renalDisease: 'yes', stroke: 'yes', bleeding: 'yes', elderly: 'yes' },
              expected: { value: 5, category: 'Score 5' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-006', name: 'Caso 6: alto riesgo (score 7)',
              inputs: { hypertension: 'yes', renalDisease: 'yes', liverDisease: 'yes', stroke: 'yes', bleeding: 'yes', labileINR: 'yes', elderly: 'yes' },
              expected: { value: 7, category: 'Score 7' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-007', name: 'Caso 7: máximo (score 9 — todo positivo)',
              inputs: { hypertension: 'yes', renalDisease: 'yes', liverDisease: 'yes', stroke: 'yes', bleeding: 'yes', labileINR: 'yes', elderly: 'yes', drugs: 'yes', alcohol: 'yes' },
              expected: { value: 9, category: 'Score 9' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'hb-008', name: 'Caso 8: solo HTA (score 1)',
              inputs: { hypertension: 'yes' },
              expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        meld_na: [
            { id: 'meld-001', name: 'Caso 1: mínimo (todos truncados a 1, Na 137)',
              inputs: { bilirubin: 1.0, inr: 1.0, creatinine: 1.0, sodium: 137 },
              expected: { value: 6, category: 'MELD-Na 6' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-002', name: 'Caso 2: moderado (bili 2, INR 1.5, creat 1.5, Na 135)',
              inputs: { bilirubin: 2.0, inr: 1.5, creatinine: 1.5, sodium: 135 },
              expected: { value: 19, category: 'MELD-Na 19' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-003', name: 'Caso 3: alto con Na bajo (bili 4, INR 2, creat 2, Na 130)',
              inputs: { bilirubin: 4.0, inr: 2.0, creatinine: 2.0, sodium: 130 },
              expected: { value: 29, category: 'MELD-Na 29' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-004', name: 'Caso 4: Na alto >137 (sin corrección sodio)',
              inputs: { bilirubin: 2.0, inr: 1.5, creatinine: 1.5, sodium: 140 },
              expected: { value: 17, category: 'MELD-Na 17' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-005', name: 'Caso 5: diálisis (creat 8 → trunca a 4)',
              inputs: { bilirubin: 3.0, inr: 2.5, creatinine: 8.0, sodium: 135 },
              expected: { value: 35, category: 'MELD-Na 35' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-006', name: 'Caso 6: valores normales-bajos (INR/creat truncan a 1)',
              inputs: { bilirubin: 1.2, inr: 0.9, creatinine: 0.9, sodium: 140 },
              expected: { value: 7, category: 'MELD-Na 7' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-007', name: 'Caso 7: máximo (score truncado a 40)',
              inputs: { bilirubin: 20, inr: 10, creatinine: 10, sodium: 120 },
              expected: { value: 40, category: 'MELD-Na 40' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'meld-008', name: 'Caso 8: edge — sodio en límite inferior (=125)',
              inputs: { bilirubin: 1.5, inr: 1.3, creatinine: 1.3, sodium: 125 },
              expected: { value: 24, category: 'MELD-Na 24' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        gold: [
            { id: 'gold-001', name: 'Caso 1: GOLD 1 normal (FEV1 85%)',           inputs: { fev1Percent: 85 }, expected: { value: 'GOLD 1', category: 'GOLD 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-002', name: 'Caso 2: GOLD 1 límite inferior (FEV1 80%)',  inputs: { fev1Percent: 80 }, expected: { value: 'GOLD 1', category: 'GOLD 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-003', name: 'Caso 3: GOLD 2 medio (FEV1 65%)',            inputs: { fev1Percent: 65 }, expected: { value: 'GOLD 2', category: 'GOLD 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-004', name: 'Caso 4: GOLD 2 límite inferior (FEV1 50%)',  inputs: { fev1Percent: 50 }, expected: { value: 'GOLD 2', category: 'GOLD 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-005', name: 'Caso 5: GOLD 3 medio (FEV1 40%)',            inputs: { fev1Percent: 40 }, expected: { value: 'GOLD 3', category: 'GOLD 3' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-006', name: 'Caso 6: GOLD 3 límite inferior (FEV1 30%)',  inputs: { fev1Percent: 30 }, expected: { value: 'GOLD 3', category: 'GOLD 3' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-007', name: 'Caso 7: GOLD 4 severo (FEV1 20%)',           inputs: { fev1Percent: 20 }, expected: { value: 'GOLD 4', category: 'GOLD 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gold-008', name: 'Caso 8: GOLD 4 muy bajo (FEV1 15%)',         inputs: { fev1Percent: 15 }, expected: { value: 'GOLD 4', category: 'GOLD 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        curb65: [
            { id: 'curb-001', name: 'Caso 1: sin factores (score 0)',             inputs: {},                                                                                                  expected: { value: 0, category: 'Score 0' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-002', name: 'Caso 2: solo confusión (score 1)',           inputs: { confusion: 'yes' },                                                                                expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-003', name: 'Caso 3: confusión + urea (score 2 — umbral hospitalización corta)', inputs: { confusion: 'yes', urea: 'yes' },                                            expected: { value: 2, category: 'Score 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-004', name: 'Caso 4: + frecuencia respiratoria alta (score 3 — umbral UCI)', inputs: { confusion: 'yes', urea: 'yes', respiratoryRate: 'yes' },                        expected: { value: 3, category: 'Score 3' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-005', name: 'Caso 5: + PA baja (score 4)',                inputs: { confusion: 'yes', urea: 'yes', respiratoryRate: 'yes', bloodPressure: 'yes' },                     expected: { value: 4, category: 'Score 4' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-006', name: 'Caso 6: máximo (score 5 — todo positivo)',   inputs: { confusion: 'yes', urea: 'yes', respiratoryRate: 'yes', bloodPressure: 'yes', age65: 'yes' },        expected: { value: 5, category: 'Score 5' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-007', name: 'Caso 7: solo edad ≥65 (score 1)',            inputs: { age65: 'yes' },                                                                                    expected: { value: 1, category: 'Score 1' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'curb-008', name: 'Caso 8: edad + PA baja (score 2)',           inputs: { age65: 'yes', bloodPressure: 'yes' },                                                              expected: { value: 2, category: 'Score 2' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ],

        gcs: [
            { id: 'gcs-001', name: 'Caso 1: máximo 15 (E4 V5 M6) — paciente alerta',
              inputs: { eyeResponse: '4', verbalResponse: '5', motorResponse: '6' },
              expected: { value: 15, category: 'GCS 15 (E4 V5 M6)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-002', name: 'Caso 2: mínimo 3 (E1 V1 M1) — coma profundo',
              inputs: { eyeResponse: '1', verbalResponse: '1', motorResponse: '1' },
              expected: { value: 3, category: 'GCS 3 (E1 V1 M1)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-003', name: 'Caso 3: leve límite inferior (13) — TEC leve',
              inputs: { eyeResponse: '4', verbalResponse: '4', motorResponse: '5' },
              expected: { value: 13, category: 'GCS 13 (E4 V4 M5)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-004', name: 'Caso 4: moderado típico (11)',
              inputs: { eyeResponse: '3', verbalResponse: '3', motorResponse: '5' },
              expected: { value: 11, category: 'GCS 11 (E3 V3 M5)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-005', name: 'Caso 5: moderado-grave límite (9)',
              inputs: { eyeResponse: '2', verbalResponse: '2', motorResponse: '5' },
              expected: { value: 9, category: 'GCS 9 (E2 V2 M5)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-006', name: 'Caso 6: grave (8) — TEC grave',
              inputs: { eyeResponse: '1', verbalResponse: '2', motorResponse: '5' },
              expected: { value: 8, category: 'GCS 8 (E1 V2 M5)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-007', name: 'Caso 7: coma profundo (6)',
              inputs: { eyeResponse: '1', verbalResponse: '1', motorResponse: '4' },
              expected: { value: 6, category: 'GCS 6 (E1 V1 M4)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } },
            { id: 'gcs-008', name: 'Caso 8: decorticación (7) — postura anormal',
              inputs: { eyeResponse: '2', verbalResponse: '2', motorResponse: '3' },
              expected: { value: 7, category: 'GCS 7 (E2 V2 M3)' }, mdcalc: { verified: false, valueObserved: null, verifiedDate: null } }
        ]
    };

    // ─────────────────────────────────────────────────────────────
    // Runner: ejecuta cada caso, compara con expected, reporta.
    // ─────────────────────────────────────────────────────────────
    const fnMap = {
        // Sprint M4-A
        egfr_ckdepi: C.calc_egfr_ckdepi,
        kdigo:       C.calc_kdigo,
        nyha:        C.calc_nyha,
        cha2ds2vasc: C.calc_cha2ds2vasc,
        child_pugh:  C.calc_child_pugh,
        // Sprint M4-B-1
        hasbled:     C.calc_hasbled,
        meld_na:     C.calc_meld_na,
        gold:        C.calc_gold,
        curb65:      C.calc_curb65,
        gcs:         C.calc_gcs
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
