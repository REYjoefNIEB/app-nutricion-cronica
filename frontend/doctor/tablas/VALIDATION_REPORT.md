# Reporte de Validación — Sprint M4-A

**Estado:** `verified` ✅
**Fecha:** 2026-05-02
**Casos automatizados:** 40/40 PASS
**Casos validados bilateralmente contra MDCalc:** 10/10 ✅

## Resumen del proceso

Las 5 escalas del Sprint M4-A fueron validadas en 2 niveles:

1. **Auto-coherencia (40 casos):** ejecutados con
   `node frontend/doctor/tablas/modules/validation-tests.js`. 40/40 PASS.

2. **Validación clínica bilateral (10 casos):** GEroe ingresó casos en
   MDCalc.com manualmente y comparó contra el output de Nura. Todos los
   casos coincidieron clínicamente.

## Casos validados manualmente contra MDCalc.com

### eGFR (CKD-EPI 2021) — 6/6 ✅
- Caso de referencia: Cr 1.5 mg/dL, 60 años, M → Nura 53 G3a · MDCalc 53 Stage IIIa
- Caso 2: Cr 1.5 mg/dL, 28 años, M → Nura 65 G2 · MDCalc 65 Stage II
- Casos 3-6: 4 casos adicionales con valores intermedios y extremos
- Notas: implementación CKD-EPI 2021 sin coeficiente racial coincide con
  MDCalc cuando ambos usan unidades mg/dL.

### KDIGO — 1/1 ✅
- eGFR 19 mL/min → Nura G4 · MDCalc Stage IV
- Notación G4 = Stage IV (mismo concepto, distinta convención)

### NYHA — 1/1 ✅
- Síntomas con actividad ordinaria (sin reposo, sin esfuerzo menor) →
- Nura Clase II · MDCalc Clase II (descripciones equivalentes)

### CHA₂DS₂-VASc — 1/1 ✅
- Mujer 78a + IC + HTA + DM + stroke previo + femenino →
- Nura 8 pts · MDCalc 8 pts
- Nota: requirió mini-fix M4-A.1 (UX dropdowns Sí/No) para clarificar
  inputs antes de poder validar contra MDCalc.

### Child-Pugh — 1/1 ✅
- Bilirrubina 2.5 mg/dL, Albúmina 3.0 g/dL, INR 1.5, Ascitis Leve,
  Encefalopatía Ausente
- Nura 8 pts Clase B · MDCalc 8 pts Class B
- Nota: primera validación dio discrepancia (Nura 8 vs MDCalc 9) que
  resultó ser error humano de input en MDCalc (selección incorrecta del
  rango de INR). Re-validado correctamente.

## Hallazgos durante validación bilateral

Durante el proceso bilateral se descubrieron 2 mejoras de UX que se
aplicaron antes de marcar `verified`:

| Sprint | Hallazgo | Resolución |
|---|---|---|
| M4-A.1 | CHA₂DS₂-VASc usaba checkboxes sueltos confusos | Cambiado a dropdowns Sí/No explícitos |
| M4-A.2 | Inputs numéricos demasiado estrechos junto al toggle de unidades | CSS fix: input toma 70-80% del ancho |

Ambos hallazgos validan que el proceso de validación bilateral encuentra
problemas que las pruebas automáticas no detectan.

## Sprints commit history

- `sprint-m4a-complete` (5a70251) — implementación inicial 5 escalas + Vista Lista
- `sprint-m4a1-complete` (81f1982) — fix UX CHA₂DS₂-VASc dropdowns
- `sprint-m4a2-complete` (548e5cf) — fix CSS inputs/toggle balance
- `sprint-m4a-validated` (este commit) — activación footer Validado

## Conclusión

Las 5 escalas implementadas (eGFR, KDIGO, NYHA, CHA₂DS₂-VASc, Child-Pugh)
producen resultados clínicamente equivalentes a MDCalc.com. El footer
"✓ Validado contra MDCalc · v1.0" se activa en producción a partir de
este commit.
