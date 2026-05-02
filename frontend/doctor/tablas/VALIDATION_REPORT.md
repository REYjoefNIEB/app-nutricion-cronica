# Reporte de Validación — Sprint M4-A

**Estado:** `pending` (auto-coherencia 40/40 ✅, validación bilateral GEroe+MDCalc pendiente)
**Fecha de generación:** 2026-04-30
**Casos automatizados:** 40/40 PASS (`node frontend/doctor/tablas/modules/validation-tests.js`)

---

## ¿Qué significa "auto-coherencia" vs "validación clínica"?

- **Auto-coherencia (40/40 ✅):** la fórmula implementada produce de forma determinística los valores hardcoded en `validation-tests.js`. Si alguien modifica una fórmula, los tests detectan la regresión. Esto es lo que Claude Code puede verificar solo.

- **Validación clínica (PENDIENTE):** confirmación de que la fórmula coincide con la implementación de referencia (MDCalc.com). Esto sólo lo puede ejecutar GEroe abriendo MDCalc en el browser e ingresando los inputs uno a uno.

**El footer "✓ Validado contra MDCalc · v1.0" en la UI NO se muestra hasta que `scales.json.validationStatus = "verified"`.** Eso se cambia recién cuando los 10 casos bilaterales de abajo estén `mdcalc.verified = true`.

---

## Caso de referencia ya validado (2026-04-30)

| Escala | Inputs | Nura | MDCalc | Estado |
|---|---|---|---|---|
| eGFR (CKD-EPI 2021) | Cr=1.5 mg/dL, Edad=60, M | **53 mL/min · G3a** | **53 mL/min · G3a** | ✅ verified |

Marcado en `validation-tests.js` como `egfr-ref-mdcalc-2026-04-30` con `mdcalc.verified = true`.

---

## Validaciones bilaterales pendientes (10 casos = 2 al azar × 5 escalas)

GEroe debe completar esta tabla abriendo https://mdcalc.com y comparando.

### eGFR (CKD-EPI 2021)
- 1 caso ya validado (referencia 2026-04-30) — falta 1 más al azar entre `egfr-001`..`egfr-007`.

| Caso | Inputs | Nura espera | MDCalc dio | Coincide |
|---|---|---|---|---|
| egfr-ref-mdcalc-2026-04-30 | Cr 1.5, Edad 60, M | 53 / G3a | 53 / G3a | ✅ |
| `(elegir 1 al azar)` | | | | |

### KDIGO
| Caso | Inputs | Nura espera | MDCalc dio | Coincide |
|---|---|---|---|---|
| `(elegir 2 al azar)` | | | | |

### NYHA
| Caso | Inputs | Nura espera | MDCalc dio | Coincide |
|---|---|---|---|---|
| `(elegir 2 al azar)` | | | | |

### CHA₂DS₂-VASc
| Caso | Inputs | Nura espera | MDCalc dio | Coincide |
|---|---|---|---|---|
| `(elegir 2 al azar)` | | | | |

### Child-Pugh
| Caso | Inputs | Nura espera | MDCalc dio | Coincide |
|---|---|---|---|---|
| `(elegir 2 al azar)` | | | | |

---

## Procedimiento para completar la validación

1. Elegir 2 casos al azar de cada escala (excepto eGFR donde ya hay 1 — elegir 1 más).
2. Para cada uno: abrir MDCalc.com, buscar la calculadora correspondiente, ingresar los `inputs` exactos.
   - **Atención unidades**: MDCalc por defecto usa mg/dL en EEUU. Verificar el toggle.
3. Comparar resultado MDCalc vs `expected.value` y `expected.category` de `validation-tests.js`.
4. Si coincide:
   - Editar el caso en `validation-tests.js` y poner `mdcalc.verified = true` con `valueObserved` y `verifiedDate`.
   - Anotar la fila en este MD.
5. Si no coincide:
   - Reportar a Claude Code la discrepancia (cuál escala, cuál caso, qué dio MDCalc).
   - Claude Code investiga la fórmula y corrige.
6. Cuando los 10 casos estén ✅: editar `scales.json` y poner `"validationStatus": "verified"` + `"validationDate": "2026-04-30"`.
7. Re-cargar `/doctor/tablas/` — el footer "✓ Validado contra MDCalc · v1.0" se planta automáticamente en cada calculadora.

---

## Calculadoras MDCalc para cada escala

- **eGFR (CKD-EPI 2021)**: https://www.mdcalc.com/calc/3939/ckd-epi-equations-glomerular-filtration-rate-gfr
- **KDIGO**: usar el mismo cálculo de eGFR + categoría G (no tiene calculadora separada en MDCalc, usar tabla del paper KDIGO).
- **NYHA**: https://www.mdcalc.com/calc/3987/new-york-heart-association-nyha-functional-classification-heart-failure
- **CHA₂DS₂-VASc**: https://www.mdcalc.com/calc/801/cha2ds2-vasc-score-atrial-fibrillation-stroke-risk
- **Child-Pugh**: https://www.mdcalc.com/calc/340/child-pugh-score-cirrhosis-mortality

---

## Discrepancias encontradas (si las hubo)

_(Vacío hasta que aparezca alguna durante la validación bilateral)_

---

## Notas técnicas

- Las pruebas automáticas se corren con: `node frontend/doctor/tablas/modules/validation-tests.js`
- 40/40 casos verde como auto-coherencia interna (no validación clínica).
- 1/40 ya con `mdcalc.verified = true` (referencia eGFR).
- Falta marcar 9 más para completar el objetivo M4-A.
