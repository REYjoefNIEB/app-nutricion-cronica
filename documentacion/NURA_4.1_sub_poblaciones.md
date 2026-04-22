# NURA 4.1 — Expansión a Sub-Poblaciones Genéticas (22 grupos)

**Versión objetivo:** v4.1  
**Prioridad:** Alta — mejora directa de precisión de la funcionalidad principal  
**Dependencia previa:** v3.x (arquitectura EM actual con 6 macro-poblaciones)

---

## Problema que resuelve

La versión 3.x estima ascendencia con 6 macro-poblaciones (EUR, AFR, EAS, SAS, AMR_NAT, OCE).  
Esto oculta diferencias significativas: un usuario 80% EUR puede ser 80% ibérico o 80% nórdico — genéticamente distintos.  
El mapa amCharts colorea regiones enteras sin granularidad sub-nacional.

---

## Diseño técnico

### 22 sub-poblaciones objetivo

| Macro | Sub-poblaciones |
|-------|----------------|
| EUR (5) | Iberian (IBS), Northern_European (CEU/FIN), Southern_European (TSI), Eastern_European (GBR/PEL), Ashkenazi_Jewish |
| AFR (5) | West_African (YRI/GWD), East_African (LWK/MSL), Bantu (ESN), North_African (MKK), Cape_Verdean |
| EAS (4) | Han_Chinese (CHB/CHS), Japanese (JPT), Korean, Southeast_Asian (KHV/CDX) |
| SAS (3) | South_Indian (ITU/STU), North_Indian (PJL/GIH), Sri_Lankan |
| AMR_NAT (3) | Andean (PEL-native), Mesoamerican (MXL-native), Caribbean_Native |
| OCE (2) | Melanesian, Polynesian |

### Algoritmo EM ampliado

```javascript
// functions/ancestry/calculator.js
const K = 22;  // sub-poblaciones en lugar de 6

// Requiere ~120 AIMs (actualmente 26) para resolución a K=22
// SNPs adicionales: buscar en catálogo 1000 Genomes Phase 3
// Fst mínimo entre sub-poblaciones: 0.15 para discriminación confiable

const AIM_SNPS_EXTENDED = {
  // ... 120 SNPs con popFreq para 22 sub-poblaciones
};
```

### Agrupación de resultados para display

Las 22 sub-poblaciones se agregan en dos niveles:
1. **Nivel macro** (backward-compatible con v3): suma simple de sub-pops del mismo grupo
2. **Nivel sub** (nuevo): muestra porcentajes granulares cuando > 5%

```javascript
function aggregateResults(Q22) {
  const macro = { EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR_NAT: 0, OCE: 0 };
  const MACRO_MAP = {
    Iberian: 'EUR', Northern_European: 'EUR', /* ... */
  };
  for (const [pop, val] of Object.entries(Q22)) {
    macro[MACRO_MAP[pop]] += val;
  }
  return { macro, sub: Q22 };
}
```

### Mapa amCharts — granularidad mejorada

- Sub-poblaciones ibéricas → colorean ES, PT más intensamente
- Sub-poblaciones nórdicas → NO, SE, DK, FI, IS
- Han vs Japonés → CN distinto de JP en el mapa
- Reemplaza `POPULATION_TO_COUNTRIES` por `SUB_POPULATION_TO_COUNTRIES` con 22 entradas

---

## Cambios de archivos

| Archivo | Cambio |
|---------|--------|
| `functions/ancestry/calculator.js` | K=22, AIM_SNPS_EXTENDED (~120 SNPs), nuevo `aggregateResults()` |
| `functions/ancestry/aimDatabase.js` | Nuevo archivo: 120 AIMs con frecuencias para 22 pops (fuente: 1000G Phase 3) |
| `frontend/ancestry/index.html` | Nuevo panel "Sub-Poblaciones" con tabla granular + mapa actualizado |
| `functions/index.js` | `analyzeAncestry` retorna `{ macro, sub }` (backward compatible) |

---

## Fuente de datos SNPs

- 1000 Genomes Project Phase 3: `ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/`
- Criterio de selección AIM: Fst > 0.3 entre al menos 2 pares de sub-poblaciones
- Herramienta de cálculo Fst: `vcftools --weir-fst-pop`
- Catálogos de referencia: Kidd et al. (2014) "Identification of an African-specific SNP panel"

---

## Estimación de esfuerzo

- Recopilación de frecuencias SNP (120 AIMs × 22 pops): **3–5 días**
- Modificación del algoritmo EM: **1 día** (misma arquitectura, K diferente)
- Frontend + mapa: **1 día**
- Validación cruzada con ground truth (23andMe comparisons): **2 días**
- **Total: ~1 semana**

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Fst insuficiente entre sub-pops europeas | Usar haplotipos en lugar de SNPs individuales |
| Over-fitting con K=22 y solo 120 AIMs | Regularización Dirichlet con prior α=0.1 |
| Costo computacional O(K×N) mayor | Aceptable: 22×120 = 2640 ops, <5ms |
| Licencia datos 1000G en app comercial | 1000G es CC0 — sin restricciones |
