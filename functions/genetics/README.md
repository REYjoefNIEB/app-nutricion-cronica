# functions/genetics/

Módulo de **lógica pura** de genética para Nura. Combina:
- Parser multi-formato de archivos ADN raw (23andMe, AncestryDNA, MyHeritage, FTDNA) con auto-extracción ZIP.
- Motor de análisis SNP → reporte clínico (intolerancias, alergias, metabolismo, cáncer, farmacogenómica).
- Database de 26 SNPs con clasificación clínica (riesgo, protector, indel whitelist).

⚠️ **Sin I/O ni dependencias de Firebase.** No conoce Firestore, no conoce auth, no maneja secrets. La encriptación, persistencia, y autenticación viven en `functions/index.js` (`getGeneticProfile`, `saveGeneticProfile`, `processGeneticData`). Este módulo solo transforma `Buffer/string → reporte`.

## Estructura

| Archivo | Líneas | Propósito |
|---|---|---|
| `parser.js` | 248 | Detección de formato, parseo per-formato, ZIP auto-extract, validación de genotipos |
| `analyzer.js` | 219 | Motor de análisis: `matchesGenotype` (con whitelist `present_indel`), `analyzeUserGenetics`, `generateGeneticReport` |
| `snpDatabase.js` | 529 | 26 SNPs en 5 categorías + estadísticas + cumplimiento legal |

Sin backups ni subdirectorios. Los 3 archivos son código activo.

**Total**: 3 archivos, ~1000 líneas, 26 SNPs.

## Lo que NO está en este módulo

| Componente | Vive en |
|---|---|
| `getGeneticProfile(uid, masterKey)` | `functions/index.js:2389` |
| `saveGeneticProfile(uid, snps, metadata, masterKey)` | `functions/index.js:2366` |
| Encriptación AES-256-GCM con `GENETIC_MASTER_KEY` | `functions/index.js` (en las dos funciones de arriba) |
| Cloud Functions HTTPS (`processGeneticData`, `analyzeAncestry`, etc.) | `functions/index.js` |

La spec de este sprint anticipaba archivos `brcaWhitelist.js` y `getGeneticProfile.js` separados — no existen. La decisión arquitectónica del proyecto es mantener la lógica de I/O / Firestore en `index.js` y dejar `functions/genetics/` como módulo puro reusable desde Cloud Functions, scripts de migración y tests.

## API pública

### `parser.js`

```js
module.exports = {
    parseDNAFile,         // parser principal (acepta string, devuelve {snps, metadata})
    parseDNABuffer,       // wrapper que acepta Buffer + auto-detect ZIP
    parse23andMe,         // parser específico TSV con prefijo i/rs
    parseAncestry,        // parser específico TSV de AncestryDNA (5 columnas, alelos separados)
    parseMyHeritage,      // parser CSV con quotes, también usado para FTDNA
    detectFormat,         // heurística por header + estructura de la primera data line
    extractRelevantSNPs,  // filter snps contra una database (NURA_SNP_DATABASE u otra)
    _internals: { parseCSVLine, isValidGenotype }
};
```

#### `parseDNABuffer(buffer)` — entry point recomendado

Detecta ZIP por magic bytes `0x50 0x4B 0x03 0x04` ("PK\x03\x04"), extrae el archivo `.csv` o `.txt` más grande del ZIP (excluyendo `__MACOSX/`), y delega a `parseDNAFile`. Para archivos planos, decodifica como UTF-8.

#### `parseDNAFile(content)` — parser sobre string

Validaciones de tamaño:
- Mínimo: 1000 bytes (cualquier menos es archivo corrupto)
- Máximo: 50 MB
- Mínimo de SNPs detectados: 100,000 (umbral de "archivo completo")

Si el formato detectado es `unknown`, intenta `parse23andMe` como fallback. Si tampoco produce ≥1000 SNPs, lanza error.

#### Output de los parsers

```js
{
    snps: {
        rs12913832: { chromosome: '15', position: '28365618', genotype: 'AA' },
        i4000377:   { chromosome: '17', position: '41276045', genotype: 'II' },
        ...
    },
    metadata: {
        format:           '23andme' | 'ancestry' | 'myheritage' | 'ftdna' | 'unknown_tsv',
        totalProcessed:   Number,    // SNPs válidos
        totalSkipped:     Number,    // líneas comentario, headers, no-calls
        totalSnps:        Number     // = totalProcessed
    }
}
```

`extractRelevantSNPs(allSnps, nuraDatabase)` filtra los `snps` contra una database de interés y devuelve `{relevantSnps, foundCount, searchedCount, coveragePercent}`.

### `analyzer.js`

```js
module.exports = {
    analyzeUserGenetics,                  // recibe userSnps, devuelve resultados por categoría
    analyzeSingleSNP,                     // analiza un SNP individual contra config
    generatePersonalizedRecommendations,  // genera lista de recomendaciones priorizadas
    generateGeneticReport,                // entry point: combina los anteriores + summary + disclaimer
    matchesGenotype                       // helper de comparación con whitelist present_indel
};
```

#### `generateGeneticReport(userSnps, userProfile = {})` — entry point

Llamado desde `processGeneticData` en `functions/index.js`. Devuelve:

```js
{
    generated_at: ISO timestamp,
    user_id: string | null,
    version: '2.0',
    summary: {
        total_snps_analyzed: Number,
        food_summary:    { total, risks },
        allergy_summary: { total, risks },
        metabolic_summary: { total, risks },
        cancer_summary:    { total_tested, variants_detected, requires_consult },
        pharma_summary:    { total, affected },
        overall_alerts:    { high_priority, medical_consults_recommended }
    },
    detailed_results: {
        food_intolerances: [...],
        food_allergies: [...],
        metabolic_risks: [...],
        cancer_risks: [...],
        pharmacogenomics: [...]
    },
    recommendations: [...],
    disclaimer: { legal, genetic, cancer_specific, who_reference }
}
```

#### `matchesGenotype(userGenotype, targetGenotypes, referenceGenotypes?, riskAlleles?)`

Helper central que compara un genotipo del usuario contra targets. **Tres modos**:

1. **Match directo** — `targetGenotypes` lista genotipos como strings (`['AA', 'AT']`). Match exacto previo `sort` (orden-insensitive).
2. **`'present'`** — para variantes raras: marca riesgo si `userGenotype` NO matchea ninguno de `referenceGenotypes` (alelos ancestrales normales). Fail-safe: sin `referenceGenotypes` definido, no marca como riesgo.
3. **`'present_indel'`** — whitelist explícita para indels (D/I notation). **Requiere** `riskAlleles` array (ej. `['DI', 'ID', 'II']` para inserciones, `['DI', 'ID', 'DD']` para deleciones). Fail-safe: si falta config, loggea error y retorna `false` (no flaggear).

El modo `present_indel` es la decisión clave del Sprint BRCA Parte A (commit `9872b62`): evita el peligroso default-to-risk del modo `'present'` cuando llegan genotipos inesperados.

### `snpDatabase.js`

```js
module.exports = {
    NURA_SNP_DATABASE,    // unión de las 5 categorías
    FOOD_INTOLERANCES,    // 5 SNPs (lactasa, celiaquía DQ2/DQ8, gluten no celíaca, cafeína)
    FOOD_ALLERGIES,       // por categoría
    METABOLIC_RISKS,      // por categoría
    CANCER_PREDISPOSITION,// 5 SNPs incluyendo i4000377 (BRCA1 185delAG)
    PHARMACOGENOMICS,     // por categoría
    DATABASE_STATS        // { total_snps, version, last_updated, compliance: {...} }
};
```

26 SNPs distribuidos en las 5 categorías. El `NURA_SNP_DATABASE` es el merge usado por `analyzer.js` para iterar.

## Estructura de una entrada SNP

Extraída del código real (ej. `i4000377` de `CANCER_PREDISPOSITION`):

```js
{
    name: 'BRCA1 185delAG',
    category: 'cancer_risk' | 'food_intolerance' | 'food_allergy' | 'metabolic' | 'pharmacogenomics',
    condition: 'predisposicion_cancer_mama_ovario',
    gene: 'BRCA1',
    riskGenotype: ['present_indel'],        // o array de genotipos exactos como ['CC', 'CT']
    riskAlleles: ['DI', 'ID', 'DD'],        // requerido si riskGenotype incluye 'present_indel'
    referenceGenotype: ['II'],              // alelos normales (para 'present' y 'present_indel')
    protectiveGenotype: ['TT', 'CT'],       // opcional
    severity: 'low' | 'moderate' | 'high' | 'very_high',
    evidence: 'low' | 'moderate' | 'high' | 'very_high',
    who_recognized: boolean,
    acmg_classification: 'Pathogenic' | 'Likely Pathogenic' | ...,  // solo en cancer_risk
    description: string,
    action_if_risk: string,
    action_if_safe: string,
    linkedFoods: [string, ...],              // opcional
    affected_drugs: [string, ...],           // opcional, en pharmacogenomics
    nura_action: string,
    requires_medical_consult: boolean,       // opcional
    high_alert: boolean,                     // opcional
    referral_specialty: 'oncogenetista' | etc, // opcional
    crossref_with_labs: [...],               // opcional
    disclaimer_required: boolean             // opcional
}
```

## Formatos soportados

| Formato | Detección | Separador | Output `metadata.format` |
|---|---|---|---|
| **23andMe** | header `'23andme'` o data line con `\t` | TAB | `'23andme'` |
| **AncestryDNA** | header `'ancestrydna'` o `'ancestry.com'` | TAB (5 cols: rsid, chr, pos, allele1, allele2) | `'ancestry'` |
| **MyHeritage** | header `'myheritage'` o data line con `,` | CSV con quotes | `'myheritage'` |
| **FTDNA** | header `'familytreedna'`, `'ftdna'`, `'family tree dna'` | CSV (delegado a `parseMyHeritage`) | `'ftdna'` |
| **Fallback** | nada de lo anterior | intenta TSV `parse23andMe` | `'unknown_tsv'` (si parsea ≥1000 SNPs) |

ZIP detection por magic bytes `0x50 0x4B 0x03 0x04` antes de cualquier detección de formato textual.

**Validación de genotipos** (`isValidGenotype`):
- Length exacto: 2 caracteres
- Excluidos: `'--'`, `'00'`, `'NN'` (no-calls)
- Permitidos: `[ACGTDI]{2}` (case-insensitive)
- `D`/`I` para indels (deletion/insertion notation de 23andMe)

**rsids aceptados**:
- `rs<digits>` (estándar dbSNP)
- `i<digits>` (IDs internos de 23andMe, ej. `i4000377` para BRCA1 185delAG)

## Detección de cáncer (BRCA + APC + MUTYH)

5 SNPs en `CANCER_PREDISPOSITION`:

| rsid | Variante | Clasificación ACMG | Convención indel |
|---|---|---|---|
| `i4000377` | BRCA1 185delAG (founder Ashkenazí) | Pathogenic | Deleción: `II`=wildtype, `DI/DD`=riesgo |
| `rs80357906` | BRCA1 5382insC (c.5266dupC) | Pathogenic | **Inserción**: `DD`=wildtype, `DI/II`=riesgo (opuesto a deleciones) |
| `rs80359550` | BRCA2 6174delT | Pathogenic | Deleción: `II`=wildtype, `DI/DD`=riesgo |
| `rs1801155` | APC I1307K (cáncer colorrectal) | High evidence | Match directo: `AT/TA/AA`=riesgo |
| `rs36053993` | MUTYH G396D | (verificar entrada) | Match directo |

⚠️ **Convención D/I crítica**: para inserciones (`rs80357906`) la wildtype es `DD` (sin inserción presente, ambos alelos normales), mientras que para deleciones (`i4000377`, `rs80359550`) la wildtype es `II` (alelo intacto, sin deleción). Confundirlos genera falsos positivos masivos. El fix Parte A (commit `9872b62`) corrigió este mislabel para `rs80357906`.

`rs80357713` fue **explícitamente removido** del database (comment línea 379-383). Razón: fue fusionado en `rs80357783` en dbSNP build 136 (2010) y tiene anotaciones inconsistentes entre bases de datos. Ahora 5382insC se detecta correctamente vía `rs80357906`.

## Casos edge documentados en el código

| Input | Comportamiento |
|---|---|
| Archivo < 1000 bytes | `parseDNAFile` lanza "Archivo demasiado pequeño" |
| Archivo > 50 MB | lanza "Archivo demasiado grande" |
| < 100,000 SNPs detectados | lanza "Archivo posiblemente truncado" |
| ZIP sin .csv ni .txt adentro | lanza error específico |
| Formato `unknown_tsv` con < 1000 SNPs | lanza "Formato no reconocido" |
| Genotipo `'--'`, `'NN'`, `'00'` | skipeado (no-call) |
| `riskGenotype: ['present_indel']` sin `riskAlleles` | error log + retorna false (fail-safe, no flaggea) |
| `riskGenotype: ['present']` sin `referenceGenotype` | retorna false (fail-safe) |
| Build 36 (chips pre-2013) vs build 37 (post-2013) | parsers preservan posición tal cual; mismatch documentado en comments de SNPs específicos |

## Conventions

- **Genotypes** en formato concatenado de 2 chars (`'AT'`, no `['A','T']`).
- **Order-insensitive**: `matchesGenotype` normaliza con `g.split('').sort().join('')`. `'AT'` y `'TA'` son equivalentes.
- **Indels** en formato D/I de 23andMe (no `+`, no `INSERT`). El parser acepta los chars `D` y `I` en `isValidGenotype`.
- **rsids** lowercase con prefijo `rs` o `i`.
- **No-call** representado como `'--'` (también `'00'`, `'NN'` se aceptan en validación).

## Decisiones de diseño

### 1. Módulo de lógica pura

Sin Firestore, sin auth, sin secrets, sin imports de `firebase-admin`. Decisión arquitectónica para que el código sea reusable desde:
- Cloud Functions (`processGeneticData`)
- Scripts de migración offline (ej. `scripts/migrate-brca-fix.js`)
- Tests unitarios

La encriptación + persistencia + auth quedan en `functions/index.js` como capa de aplicación.

### 2. Whitelist BRCA explícita (`present_indel`, Sprint Parte A — commit `9872b62`)

Antes el código usaba el modo `'present'` para indels, lo que generaba default-to-risk para genotipos inesperados (ej. wildtype `II` reportado como riesgo). El modo nuevo `'present_indel'` requiere una whitelist explícita `riskAlleles` por entrada. Si la config falta, el fail-safe es NO flaggear (línea 13-16 de `analyzer.js`).

### 3. Reconocimiento de IDs con prefijo `i` (Sprint Parte B — commit `9d7380a`)

23andMe usa IDs internos con prefijo `i` (no `rs`) para algunos indels y variantes raras. El parser aceptaba solo `rs*` originalmente, dejando inaccesible la entrada `i4000377` (BRCA1 185delAG, founder Ashkenazí ~26% de variantes patogénicas BRCA en esa población). El fix permite ambos prefijos en `parse23andMe` (línea 87) y `parseMyHeritage` (línea 133), abriendo la detección.

### 4. Database SNP versionada con compliance flags

`DATABASE_STATS.compliance` lista explícitamente: WHO guidelines, ACMG standards, Chile Ley 20.120 / 20.584 / 19.628, EU GDPR. Diseño defensivo: si en el futuro hay auditoría, el flag está en código.

### 5. Categorías clínicas vs traits físicos

Este módulo SOLO maneja categorías de uso clínico (intolerancias, alergias, metabolismo, cáncer, fármacos). Los rasgos físicos puramente fenotípicos (color de ojos, cabello, etc.) viven en `functions/traits/` con otra estructura (HIrisPlex + trait database).

## Tests y validación

No hay tests unitarios dedicados en `scripts/test-*.js` para este módulo (los sprints del 27 abril enfocaron tests en `traits/`). La validación se hace por integración:

- **Sprints BRCA**: validación empírica con archivos sintéticos (Kenneth + i4000377 II→DI, en `dna-test-data/synthetic_brca_carrier.txt`).
- **Migración**: `scripts/migrate-brca-fix.js` re-procesa reportes existentes con la lógica corregida.
- **Smoke tests**: `scripts/smoke-test-node22.js`.

Sería razonable agregar tests dedicados `scripts/test-genetics-parser.js` y `scripts/test-brca-whitelist.js` en sprint futuro, pero no es bloqueante.

## Discrepancias detectadas (deuda baja, no afectan lógica)

Análogo a las discrepancias detectadas en los READMEs anteriores (`ancestry/`, `traits/`):

1. **`snpDatabase.js:379-383`** — Comment removed-block dice `"185delAG pendiente de rs80357914 (Parte B, SPRINT_07)"`. **El fix YA está completo**: `i4000377` BRCA1 185delAG se agregó en commit `9d7380a` con entrada explícita (líneas 311-349). El comment "pendiente" quedó stale.
2. **`parser.js:5`** — Header docstring lista formatos soportados incluyendo "FTDNA/LivingDNA". `parseFTDNA` solo wrappea `parseMyHeritage` (línea 149-153) — no hay parser específico FTDNA, y LivingDNA tampoco tiene rama propia. La cobertura para esos formatos depende de que sean variantes CSV similares a MyHeritage.

Ninguna afecta lógica — son comments anotativos. Sprint trivial cuando convenga.

## Historial relevante

- **2026-04-27** Sprint BRCA Parte A (commit `9872b62`): nuevo modo `'present_indel'` en `matchesGenotype` con whitelist `riskAlleles`. Corrección del label `rs80357906` (era erróneamente "185delAG", ahora correctamente "5382insC"). Fail-safe: si falta config, no flaggea.
- **2026-04-27** Sprint BRCA Parte B (commit `9d7380a`): parser acepta IDs con prefijo `i` (no solo `rs`). Habilita detección de `i4000377` (BRCA1 185delAG founder Ashkenazí). Entrada agregada en `CANCER_PREDISPOSITION` con commentary detallado de convención D/I.
- **2026-04-27** Sprint chore migration (commit `6ea4a60`): re-procesado de reportes existentes en producción para aplicar las correcciones BRCA.

## Referencias

- **dbSNP** (NCBI) — para validación de rsids y posiciones.
- **ClinVar** — clasificaciones ACMG (Pathogenic, Likely Pathogenic, etc.). Ej. VCV000056295 para BRCA1 185delAG, VCV000017677 para BRCA1 5382insC.
- **GeneReviews** — PMID:20301425 sobre founder mutations BRCA en población Ashkenazí.
- **WHO + ACMG guidelines** — base de las clasificaciones de evidencia y severity.
- **Munz et al. 2015** (Genome Medicine) — análisis de inconsistencias en rsids fusionados (motivo de remoción de `rs80357713`).

Las referencias específicas por SNP están en los comments de `snpDatabase.js` cuando aplica.
