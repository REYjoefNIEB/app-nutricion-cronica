// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-A)
// Implementación de las 5 fórmulas Tier 1.
//
// Cada calculadora es una función pura que recibe inputs en unidad
// base (mg/dL para creatinina/bilirrubina, g/dL para albúmina) y
// devuelve { value, unit, category, categoryColor, interpretation }
// o { error: string }.
//
// CONVENCIÓN DE TESTING:
//   Las funciones son deterministas. Los casos test en validation-tests.js
//   comparan el output contra valores hardcoded calculados manualmente
//   o validados contra MDCalc por GEroe.
//
// Patrón: script regular. Expone window.NuraTablas.Calculators.
// =================================================================

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // 1) eGFR (CKD-EPI 2021) — sin coeficiente racial
    // Fuente: Inker LA et al. NEJM 2021 (DOI: 10.1056/NEJMoa2102953)
    //
    // Caso de referencia validado contra MDCalc 2026-04-30:
    //   Cr=1.5 mg/dL, Edad=60, Hombre → 53 mL/min/1.73m² · G3a
    //
    // Fórmula:
    //   eGFR = 142 × min(Scr/k, 1)^α × max(Scr/k, 1)^-1.200 × 0.9938^Age × sexFactor
    //   Hombre: k=0.9, α=-0.302, sexFactor=1.0
    //   Mujer:  k=0.7, α=-0.241, sexFactor=1.012
    // ─────────────────────────────────────────────────────────────
    function calc_egfr_ckdepi(inputs) {
        const cr = Number(inputs.creatinine);
        const age = Number(inputs.age);
        const sex = inputs.sex;

        if (!cr || cr <= 0 || !age || age < 18) {
            return { error: 'Datos incompletos o fuera de rango (edad ≥18 años, creatinina >0).' };
        }
        if (sex !== 'M' && sex !== 'F') {
            return { error: 'Sexo debe ser "M" o "F".' };
        }

        const k         = (sex === 'F') ? 0.7    : 0.9;
        const alpha     = (sex === 'F') ? -0.241 : -0.302;
        const sexFactor = (sex === 'F') ? 1.012  : 1;

        const minTerm   = Math.pow(Math.min(cr / k, 1), alpha);
        const maxTerm   = Math.pow(Math.max(cr / k, 1), -1.200);
        const ageFactor = Math.pow(0.9938, age);

        const egfrRaw = 142 * minTerm * maxTerm * ageFactor * sexFactor;
        const egfr    = Math.round(egfrRaw);

        const interp = interpret_egfr_kdigo(egfr);
        return {
            value: egfr,
            unit: 'mL/min/1.73m²',
            category: interp.category,
            categoryColor: interp.color,
            interpretation: interp.interpretation
        };
    }

    function interpret_egfr_kdigo(egfr) {
        if (egfr >= 90) return { category: 'G1',  color: 'success', interpretation: 'Función renal normal o aumentada' };
        if (egfr >= 60) return { category: 'G2',  color: 'success', interpretation: 'Levemente disminuida' };
        if (egfr >= 45) return { category: 'G3a', color: 'warning', interpretation: 'Leve a moderadamente disminuida' };
        if (egfr >= 30) return { category: 'G3b', color: 'warning', interpretation: 'Moderadamente a severamente disminuida' };
        if (egfr >= 15) return { category: 'G4',  color: 'danger',  interpretation: 'Severamente disminuida — derivar nefrología' };
        return            { category: 'G5',  color: 'danger',  interpretation: 'Falla renal — evaluar diálisis' };
    }

    // ─────────────────────────────────────────────────────────────
    // 2) KDIGO — Estadificación de ERC
    // Fuente: KDIGO 2012 Clinical Practice Guideline for CKD
    //
    // Recibe el eGFR ya calculado y devuelve la categoría G.
    // Es esencialmente un wrapper de interpret_egfr_kdigo, con la
    // diferencia de que su resultado tiene `value: <egfr>` para
    // que la UI muestre tanto el número como la categoría.
    // ─────────────────────────────────────────────────────────────
    function calc_kdigo(inputs) {
        const egfr = Number(inputs.egfr);
        if (!egfr || egfr <= 0) {
            return { error: 'Ingresá un valor de eGFR válido (>0).' };
        }
        const interp = interpret_egfr_kdigo(egfr);
        return {
            value: egfr,
            unit: 'mL/min/1.73m²',
            category: interp.category,
            categoryColor: interp.color,
            interpretation: interp.interpretation
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 3) NYHA — Clase funcional Insuficiencia Cardíaca
    // Fuente: NYHA Nomenclature and Criteria for Diagnosis (9th ed, 1994)
    //
    // Mapeo directo del input "symptoms" a clase I/II/III/IV.
    // ─────────────────────────────────────────────────────────────
    function calc_nyha(inputs) {
        const sym = inputs.symptoms;
        const map = {
            'I':   { class: 'I',   color: 'success', interp: 'Sin limitación: actividad física ordinaria sin síntomas.' },
            'II':  { class: 'II',  color: 'success', interp: 'Limitación leve: cómodo en reposo; síntomas con actividad ordinaria.' },
            'III': { class: 'III', color: 'warning', interp: 'Limitación marcada: cómodo en reposo; síntomas con actividad menor a la ordinaria.' },
            'IV':  { class: 'IV',  color: 'danger',  interp: 'Síntomas en reposo: incapaz de realizar actividad sin síntomas.' }
        };
        const m = map[sym];
        if (!m) return { error: 'Selecciona la clase funcional.' };

        return {
            value: m.class,
            unit: '',
            category: 'Clase ' + m.class,
            categoryColor: m.color,
            interpretation: m.interp
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 4) CHA₂DS₂-VASc
    // Fuente: Lip GY et al. CHEST 2010 (PMID: 19762550)
    //
    // Inputs (Sprint M4-A.1 — UX selects Sí/No, no checkboxes):
    //   chf, htn, diabetes, stroke, vascular: 'yes' | 'no'
    //     yes suma: chf=1, htn=1, diabetes=1, stroke=2, vascular=1
    //   ageGroup: 'under65' | '65_74' | '75plus'
    //     under65=0, 65_74=1, 75plus=2 (mutuamente excluyentes by design)
    //   sex: 'M' | 'F'
    //     F suma 1
    // Total 0-9.
    //
    // Interpretación clínica (ESC 2020):
    //   Score 0 (hombre) o 1 (mujer, solo por sexo): no anticoagulación
    //   Score ≥2 (hombre) o ≥3 (mujer): anticoagulación recomendada
    // ─────────────────────────────────────────────────────────────
    function calc_cha2ds2vasc(inputs) {
        const yes = (id, pts) => (inputs[id] === 'yes' ? pts : 0);

        let agePts = 0;
        if (inputs.ageGroup === '75plus')      agePts = 2;
        else if (inputs.ageGroup === '65_74')  agePts = 1;

        const score =
            yes('chf', 1) +
            yes('htn', 1) +
            agePts +
            yes('diabetes', 1) +
            yes('stroke', 2) +
            yes('vascular', 1) +
            (inputs.sex === 'F' ? 1 : 0);

        let color, interp;
        if (score === 0) {
            color = 'success';
            interp = 'Riesgo anual ~0.2%. No anticoagulación.';
        } else if (score === 1) {
            color = 'warning';
            interp = 'Riesgo anual ~0.6%. Considerar anticoagulación (especialmente si el punto no es solo por sexo femenino).';
        } else if (score === 2) {
            color = 'danger';
            interp = 'Riesgo anual ~2.2%. Anticoagulación recomendada (clase I).';
        } else if (score === 3) {
            color = 'danger';
            interp = 'Riesgo anual ~3.2%. Anticoagulación recomendada.';
        } else if (score === 4) {
            color = 'danger';
            interp = 'Riesgo anual ~4.8%. Anticoagulación recomendada.';
        } else if (score === 5) {
            color = 'danger';
            interp = 'Riesgo anual ~7.2%. Anticoagulación recomendada.';
        } else {
            color = 'danger';
            interp = 'Riesgo anual ≥9.7%. Anticoagulación recomendada.';
        }

        return {
            value: score,
            unit: 'puntos',
            category: 'Score ' + score,
            categoryColor: color,
            interpretation: interp
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 5) Child-Pugh (Child-Turcotte-Pugh)
    // Fuente: Pugh RN et al. Br J Surg 1973 (PMID: 4541913)
    //
    // 5 ítems: bilirrubina + albúmina + INR + ascitis + encefalopatía.
    // Cada uno suma 1, 2 o 3 puntos. Total 5-15.
    //   Clase A: 5-6  (bien compensada)
    //   Clase B: 7-9  (compromiso significativo)
    //   Clase C: 10-15 (descompensada)
    //
    // Inputs numéricos esperados en unidad base:
    //   bilirubin: mg/dL — <2: 1pt, 2-3: 2pt, >3: 3pt
    //   albumin:   g/dL  — >3.5: 1pt, 2.8-3.5: 2pt, <2.8: 3pt
    //   inr:             — <1.7: 1pt, 1.7-2.3: 2pt, >2.3: 3pt
    // Inputs categóricos:
    //   ascites:        'absent'|'slight'|'moderate' → 1|2|3
    //   encephalopathy: 'absent'|'1_2'|'3_4'         → 1|2|3
    // ─────────────────────────────────────────────────────────────
    function calc_child_pugh(inputs) {
        const bili = Number(inputs.bilirubin);
        const alb  = Number(inputs.albumin);
        const inr  = Number(inputs.inr);
        const asc  = inputs.ascites;
        const enc  = inputs.encephalopathy;

        if (!isFinite(bili) || bili <= 0 ||
            !isFinite(alb)  || alb <= 0  ||
            !isFinite(inr)  || inr <= 0) {
            return { error: 'Bilirrubina, albúmina e INR deben ser >0.' };
        }
        if (!asc || !enc) {
            return { error: 'Selecciona ascitis y encefalopatía.' };
        }

        // Bilirrubina (mg/dL) — umbrales clásicos Pugh 1973
        let pBili;
        if (bili < 2)      pBili = 1;
        else if (bili <= 3) pBili = 2;
        else                pBili = 3;

        // Albúmina (g/dL)
        let pAlb;
        if (alb > 3.5)        pAlb = 1;
        else if (alb >= 2.8)  pAlb = 2;
        else                  pAlb = 3;

        // INR
        let pInr;
        if (inr < 1.7)         pInr = 1;
        else if (inr <= 2.3)   pInr = 2;
        else                   pInr = 3;

        // Ascitis
        const ascMap = { 'absent': 1, 'slight': 2, 'moderate': 3 };
        const pAsc = ascMap[asc];
        if (!pAsc) return { error: 'Valor de ascitis inválido.' };

        // Encefalopatía
        const encMap = { 'absent': 1, '1_2': 2, '3_4': 3 };
        const pEnc = encMap[enc];
        if (!pEnc) return { error: 'Valor de encefalopatía inválido.' };

        const score = pBili + pAlb + pInr + pAsc + pEnc;

        let cls, color, interp;
        if (score <= 6) {
            cls = 'A'; color = 'success';
            interp = 'Cirrosis bien compensada. Sobrevida 1 año ~100%, 2 años ~85%.';
        } else if (score <= 9) {
            cls = 'B'; color = 'warning';
            interp = 'Compromiso funcional significativo. Sobrevida 1 año ~80%, 2 años ~60%.';
        } else {
            cls = 'C'; color = 'danger';
            interp = 'Enfermedad descompensada. Sobrevida 1 año ~45%, 2 años ~35%. Considerar trasplante.';
        }

        return {
            value: score,
            unit: 'puntos',
            category: 'Clase ' + cls,
            categoryColor: color,
            interpretation: interp,
            breakdown: { pBili, pAlb, pInr, pAsc, pEnc }
        };
    }

    // ═════════════════════════════════════════════════════════════
    // [Sprint M4-B-1] Escalas adicionales: HAS-BLED, MELD-Na, GOLD,
    // CURB-65, Glasgow Coma Scale.
    // ═════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────
    // 6) HAS-BLED — Riesgo sangrado mayor en anticoagulación FA
    // Fuente: Pisters R et al. CHEST 2010 (PMID: 20299623)
    //
    // 9 ítems Sí/No, 1 punto cada uno. Total 0-9.
    // Score ≥3 = riesgo elevado (NO contraindica anticoagulación;
    // implica precaución y vigilancia más estrecha).
    // ─────────────────────────────────────────────────────────────
    function calc_hasbled(inputs) {
        const yes = (id) => (inputs[id] === 'yes' ? 1 : 0);

        const score =
            yes('hypertension') + yes('renalDisease') + yes('liverDisease') +
            yes('stroke')       + yes('bleeding')     + yes('labileINR')    +
            yes('elderly')      + yes('drugs')        + yes('alcohol');

        let color, interp;
        if (score <= 1) {
            color = 'success';
            interp = 'Riesgo bajo de sangrado mayor (~1.13% anual). Anticoagulación segura con vigilancia estándar.';
        } else if (score === 2) {
            color = 'warning';
            interp = 'Riesgo moderado (~1.88% anual). Anticoagulación con vigilancia.';
        } else {
            color = 'danger';
            interp = 'Riesgo alto (≥3 puntos). Considerar precaución y reevaluación periódica. NO contraindica anticoagulación.';
        }

        return {
            value: score,
            unit: 'puntos',
            category: 'Score ' + score,
            categoryColor: color,
            interpretation: interp
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 7) MELD-Na — Mortalidad 90d en cirrosis / priorización trasplante
    // Fuente: Kim WR et al. NEJM 2008 (PMID: 18768945)
    //
    // Fórmula:
    //   MELD = 3.78 × ln(bilirubin) + 11.2 × ln(INR) + 9.57 × ln(creat) + 6.43
    //   MELD-Na = MELD + 1.32 × (137 − Na) − [0.033 × MELD × (137 − Na)]   (solo si Na < 137)
    //
    // Reglas (UNOS 2016):
    //   - Mínimos: bili 1.0, INR 1.0, creat 1.0
    //   - Máximo creat 4.0 (también si en diálisis ≥2x/sem)
    //   - Sodio: clamp 125-137
    //   - Score final: clamp 6-40
    // ─────────────────────────────────────────────────────────────
    function calc_meld_na(inputs) {
        let bili   = Number(inputs.bilirubin);
        let inr    = Number(inputs.inr);
        let creat  = Number(inputs.creatinine);
        let sodium = Number(inputs.sodium);

        if (!isFinite(bili)  || bili  <= 0 ||
            !isFinite(inr)   || inr   <= 0 ||
            !isFinite(creat) || creat <= 0 ||
            !isFinite(sodium)) {
            return { error: 'Bilirrubina, INR, creatinina y sodio deben ser >0.' };
        }

        // Mínimos UNOS
        bili  = Math.max(bili, 1.0);
        inr   = Math.max(inr,  1.0);
        creat = Math.max(creat, 1.0);
        // Tope creatinina (también aplica si está en diálisis)
        creat = Math.min(creat, 4.0);

        // Clamp sodio 125-137
        const naClamped = Math.max(125, Math.min(137, sodium));

        // MELD original
        const meld = 3.78 * Math.log(bili) + 11.2 * Math.log(inr) + 9.57 * Math.log(creat) + 6.43;

        // MELD-Na (corrección sodio solo si Na < 137; UNOS 2016)
        let meldNa;
        if (naClamped >= 137) {
            meldNa = meld;
        } else {
            meldNa = meld + 1.32 * (137 - naClamped) - (0.033 * meld * (137 - naClamped));
        }

        // Clamp final 6-40
        meldNa = Math.max(6, Math.min(40, meldNa));
        const finalScore = Math.round(meldNa);

        let color, interp;
        if (finalScore < 10) {
            color = 'success';
            interp = 'Mortalidad 90d <2%. Manejo ambulatorio.';
        } else if (finalScore < 20) {
            color = 'warning';
            interp = 'Mortalidad 90d ~6-20%. Considerar hospitalización en descompensaciones.';
        } else if (finalScore < 30) {
            color = 'warning';
            interp = 'Mortalidad 90d ~20-50%. Evaluación trasplante.';
        } else if (finalScore < 40) {
            color = 'danger';
            interp = 'Mortalidad 90d ~50-70%. Lista de trasplante.';
        } else {
            color = 'danger';
            interp = 'Mortalidad 90d >70%. Score truncado a 40 (máximo).';
        }

        return {
            value: finalScore,
            unit: '',
            category: 'MELD-Na ' + finalScore,
            categoryColor: color,
            interpretation: interp
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 8) GOLD — Severidad espirométrica EPOC
    // Fuente: Global Initiative for Chronic Obstructive Lung Disease (GOLD) 2024
    //
    // 1 input: FEV1 % del predicho post-broncodilatador.
    // SOLO aplica si FEV1/FVC <0.70 post-BD (diagnóstico EPOC confirmado).
    // ─────────────────────────────────────────────────────────────
    function calc_gold(inputs) {
        const fev1 = Number(inputs.fev1Percent);
        if (!isFinite(fev1) || fev1 < 5) {
            return { error: 'FEV1 debe ser ≥5% del predicho.' };
        }

        let stage, color, interp;
        if (fev1 >= 80) {
            stage = 'GOLD 1'; color = 'success'; interp = 'EPOC leve';
        } else if (fev1 >= 50) {
            stage = 'GOLD 2'; color = 'warning'; interp = 'EPOC moderada';
        } else if (fev1 >= 30) {
            stage = 'GOLD 3'; color = 'danger';  interp = 'EPOC grave';
        } else {
            stage = 'GOLD 4'; color = 'danger';  interp = 'EPOC muy grave';
        }

        return {
            value: stage,
            unit: '',
            category: stage,
            categoryColor: color,
            interpretation: interp
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 9) CURB-65 — Severidad neumonía adquirida en la comunidad
    // Fuente: Lim WS et al. Thorax 2003 (PMID: 12728155)
    //
    // 5 ítems Sí/No, 1 punto cada uno. Score 0-5.
    // Decisión: 0-1 ambulatorio · 2 hospitalización corta · ≥3 UCI.
    // ─────────────────────────────────────────────────────────────
    function calc_curb65(inputs) {
        const yes = (id) => (inputs[id] === 'yes' ? 1 : 0);

        const score =
            yes('confusion') + yes('urea') + yes('respiratoryRate') +
            yes('bloodPressure') + yes('age65');

        let color, interp;
        if (score === 0) {
            color = 'success';
            interp = 'Mortalidad 0.6%. Manejo ambulatorio.';
        } else if (score === 1) {
            color = 'success';
            interp = 'Mortalidad 2.7%. Manejo ambulatorio probable.';
        } else if (score === 2) {
            color = 'warning';
            interp = 'Mortalidad 6.8%. Hospitalización corta.';
        } else if (score === 3) {
            color = 'danger';
            interp = 'Mortalidad 14%. Hospitalización; considerar UCI si comorbilidades.';
        } else {
            color = 'danger';
            interp = 'Mortalidad ~27%. UCI.';
        }

        return {
            value: score,
            unit: 'puntos',
            category: 'Score ' + score,
            categoryColor: color,
            interpretation: interp
        };
    }

    // ─────────────────────────────────────────────────────────────
    // 10) Glasgow Coma Scale (GCS) — Adultos
    // Fuente: Teasdale G, Jennett B. Lancet 1974 (PMID: 4136544)
    //
    // 3 respuestas (ocular 1-4, verbal 1-5, motora 1-6). Total 3-15.
    //   13-15: leve · 9-12: moderado · 3-8: grave / coma
    // ─────────────────────────────────────────────────────────────
    function calc_gcs(inputs) {
        const eye    = parseInt(inputs.eyeResponse, 10);
        const verbal = parseInt(inputs.verbalResponse, 10);
        const motor  = parseInt(inputs.motorResponse, 10);

        if (!eye || !verbal || !motor) {
            return { error: 'Las 3 respuestas (ocular, verbal, motora) son obligatorias.' };
        }
        if (eye < 1 || eye > 4 || verbal < 1 || verbal > 5 || motor < 1 || motor > 6) {
            return { error: 'Valores fuera de rango (E:1-4, V:1-5, M:1-6).' };
        }

        const score = eye + verbal + motor;

        let color, interp;
        if (score >= 13) {
            color = 'success';
            interp = 'TEC leve. Vigilancia neurológica.';
        } else if (score >= 9) {
            color = 'warning';
            interp = 'TEC moderado. Hospitalización + TC cerebral.';
        } else {
            color = 'danger';
            interp = 'TEC grave / coma. Manejo agresivo + UCI.';
        }

        return {
            value: score,
            unit: 'puntos',
            category: 'GCS ' + score + ' (E' + eye + ' V' + verbal + ' M' + motor + ')',
            categoryColor: color,
            interpretation: interp,
            breakdown: { eye, verbal, motor }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Exposición
    // ─────────────────────────────────────────────────────────────
    const api = {
        // Sprint M4-A
        calc_egfr_ckdepi,
        calc_kdigo,
        calc_nyha,
        calc_cha2ds2vasc,
        calc_child_pugh,
        interpret_egfr_kdigo,
        // Sprint M4-B-1
        calc_hasbled,
        calc_meld_na,
        calc_gold,
        calc_curb65,
        calc_gcs
    };

    if (typeof window !== 'undefined') {
        window.NuraTablas = window.NuraTablas || {};
        window.NuraTablas.Calculators = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
