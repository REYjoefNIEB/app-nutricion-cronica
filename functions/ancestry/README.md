# functions/ancestry/

Módulo de cálculo de ancestría genética para Nura. Implementa un algoritmo
EM (Expectation-Maximization) estilo ADMIXTURE sobre un panel de AIMs
(Ancestry-Informative Markers) para estimar la composición de ancestría
sub-continental de un usuario a partir de su archivo de ADN raw.

## Estructura

| Archivo | Líneas | Propósito |
|---|---|---|
| `calculator.js` | 313 | EM algorithm, función pura `calculateAncestry` y helper `validateAncestryPrerequisites` |
| `referenceData.js` | 4639 | Datos: 247 AIMs con frecuencias 1000G por sub-población + helpers de mapeo y validación. **Generado automáticamente** — no editar a mano |
| `KNOWN_LIMITATIONS.md` | 87 | Limitaciones científicas del panel (chip compatibility, EM convergence, populaciones no distinguidas). Documenta la versión v2 anterior; algunos detalles están desactualizados (ver "Estado actual del panel" abajo) |
| `calculator_v1_backup.js` | 185 | Backup pre-4.1-B. **Inactivo** — referencia histórica. |
| `referenceData_v1_pre41B.js` | 248 | Backup pre-4.1-B. **Inactivo**. |
| `referenceData_v2_backup.js` | 2650 | Backup v2 (panel CLG141). **Inactivo**. |

Solo `calculator.js` y `referenceData.js` son código activo. Los `*_backup.js` están preservados para auditoría/rollback pero no son requeridos por nadie.

## Estado actual del panel

- **VERSION**: `v3-247AIMs-CLG141+KS106-2026-04-22` (definida en `referenceData.js:21`).
- **Panel**: **247 AIMs** combinando tres fuentes (Verdugo CLG 141 + Kidd 55 + Seldin 128, deduplicados a 247).
- **K**: **8 sub-poblaciones** (`POPULATIONS` en `referenceData.js:23-29`).

⚠️ **Comentarios desactualizados detectados** (no afectan la lógica, solo la documentación inline):
- `calculator.js:4-9` (docstring del archivo) dice "K=9 sub-populations" y "Panel: 141 CLG AIMs". Ambos son obsoletos: K es 8 y el panel es 247 AIMs. La constante `K = POPULATIONS.length` calcula correctamente 8 en runtime.
- `KNOWN_LIMITATIONS.md` está stamped como `v2-CLG141-K9-2026-04-22` y describe el panel anterior. Sigue siendo útil para entender chip-compatibility, pero los conteos de AIMs ya no aplican literalmente.

Para validar la versión activa en runtime: leer `referenceData.VERSION`.

## Modelo científico

### Sub-poblaciones (K=8)

| Código | Descripción |
|---|---|
| `EUR_N` | Europeo Norte/Centro (Germano-Escandinavo) |
| `EUR_S` | Europeo Sur (Ibérico-Italiano) |
| `AFR_W` | Africano Oeste (Yoruba, Mandé, Bantú Oeste) |
| `AFR_E` | Africano Este (Luhya, Kikuyu) |
| `EAS_CN` | Asiático Chino (Han) |
| `EAS_JP` | Asiático Japonés |
| `SAS` | Sur Asiático (Indio, Paquistaní, Sri Lanka) |
| `AMR_NAT` | Amerindio Andino (proxy PEL — Aymara+Mapuche fusionados) |

Etiquetas humanas en `POPULATION_LABELS` (`referenceData.js:31-40`).

### Macro-regiones

`aggregateToMacroRegions(qSubPop)` (`referenceData.js:4630-4637`) suma sub-poblaciones según `MACRO_REGION` (`referenceData.js:42-51`):

```
EUR_N + EUR_S        → EUR
AFR_W + AFR_E        → AFR
EAS_CN + EAS_JP      → EAS
SAS                  → SAS
AMR_NAT              → AMR_NAT
(sin sub-poblaciones)→ OCE  (siempre 0 — Oceanía no modelada)
```

El objeto retornado incluye 6 claves; `OCE` queda en 0 por design.

### Algoritmo

EM (Expectation-Maximization) estilo ADMIXTURE con likelihood binomial por AIM:

1. **Filtrar AIMs disponibles**: incluir solo aquellos cuya `genotype` no es `'--'` y tiene length ≥ 2.
2. **Generar fingerprint determinista**: SHA-256 sobre los primeros 30 AIMs matchados (`generateUserFingerprint` en `calculator.js:46-50`).
3. **Inicializar Q-vector**: LCG seeded por los primeros 8 hex chars del fingerprint (`initializeQFromFingerprint` en `calculator.js:64-70`). Misma semilla → misma secuencia → resultado determinista para el mismo input.
4. **Loop EM** (`emStep` en `calculator.js:79-111`): hasta `MAX_ITER = 1000` iteraciones. En cada iteración, E-step calcula likelihoods binomiales por sub-población usando `binomialLikelihood(k, p)` donde `k` ∈ {0,1,2} y `p` es la frecuencia 1000G; M-step normaliza con regularización L2 hacia uniforme (`REGULARIZE = 0.01`). Termina cuando `l2Distance(qNew, qOld) < TOLERANCE = 1e-5`.
5. **Output**: vector Q de K=8 entradas (sub-poblaciones), agregado opcionalmente a 6 macro-regiones.

### Constantes (`calculator.js:15-19`)

| Constante | Valor | Significado |
|---|---|---|
| `K` | `POPULATIONS.length` (= 8) | Número de sub-poblaciones |
| `MAX_ITER` | `1000` | Tope de iteraciones EM |
| `TOLERANCE` | `1e-5` | Umbral de convergencia (L2 distance entre Q vectors) |
| `REGULARIZE` | `0.01` | Peso del pull L2 hacia uniforme en M-step |
| `MIN_SNPS` | `50` | Umbral mínimo de AIMs matchados |

## API pública

`module.exports` de `calculator.js`:

```js
{
  computeAncestry,
  calculateAncestry,
  validateAncestryPrerequisites,
  _countMinorAlleles,
  _internals: { binomialLikelihood, generateUserFingerprint, seededRandom,
                initializeQFromFingerprint, emStep, l2Distance }
}
```

Los `_internals` están expuestos para tests pero no para callers normales.

### `calculateAncestry(snps)` — wrapper backward-compatible

**Inputs**:
```js
snps = {
  rs12142199: { genotype: 'AA' },
  rs1426654:  { genotype: 'GG' },
  ...
}
```

**Outputs**:
```js
{
  populations:    [{ population: 'EUR', name: 'EUR', nameEs: 'EUR', percentage: 93.6 }, ...],  // legacy array, sólo macro >0.3% ordenado descendente
  macroRegions:   { EUR: 0.936, AFR: 0.012, EAS: 0.019, SAS: 0.016, AMR_NAT: 0.018, OCE: 0 },  // fracciones 0-1
  subPopulations: { EUR_N: 0.782, EUR_S: 0.154, AFR_W: 0.006, AFR_E: 0.006, EAS_CN: 0.009, EAS_JP: 0.010, SAS: 0.016, AMR_NAT: 0.018 },
  aimsAnalyzed:   149,
  totalAimsInDb:  247,
  confidence:     'high',     // 'high' si AIMs >= 100, 'medium' si >= 60, 'low' si < 60
  accuracy:       '±5%',      // '±5%' / '±8%' / '±12%' por el mismo umbral
  version:        'v3-247AIMs-CLG141+KS106-2026-04-22'
}
```

**Comportamiento**:
- Función pura: sin I/O, sin auth, sin Firestore. La persistencia la hace el caller.
- Throws `Error` (no `HttpsError`) si AIMs matchados < `MIN_SNPS`. Los callers en `functions/index.js` traducen este error a `HttpsError` apropiado, **pero** se recomienda llamar `validateAncestryPrerequisites` antes para obtener mensajes específicos por tipo de fallo.
- Determinista: mismo `snps` → mismo Q vector (gracias al fingerprint SHA-256 + LCG seeded).

### `computeAncestry(userSnps, opts = {})` — variante low-level

Devuelve la representación interna sin convertir a array legacy. `calculateAncestry` lo envuelve.

**Opciones** (`opts`):
- `maxIter` (default `1000`)
- `tolerance` (default `1e-5`)
- `regularize` (default `0.01`)

Útil para tests o experimentos que quieran cambiar parámetros del EM.

### `validateAncestryPrerequisites(snps, opts = {})`

Agregada en commit `d9e2400` (Sprint 2 race-condition fix de 2026-04-27). Replica el pre-check que vivía inline en `analyzeAncestry` para que `analyzePhysicalTraits` pueda usar la misma lógica al computar ancestría on-the-fly.

**Inputs**:
- `snps` — mismo shape que `calculateAncestry`.
- `opts.totalSnpsInFile` — número total de SNPs en el archivo del usuario (de `geneticProf.totalSnps`). Default `0`.
- `opts.fileFormat` — formato detectado (`'23andme'`, `'ancestry'`, etc., de `geneticProf.format`). Default `'desconocido'`.

**Outputs**:
```js
// caso ok
{ valid: true, matchedAimsCount: 149 }

// archivo truncado (totalSnps < 100K + AIMs < 50)
{
  valid: false,
  matchedAimsCount: 5,
  errorCode: 'invalid-argument',
  errorMessage: 'Tu archivo ADN parece incompleto (500 SNPs registrados). ...'
}

// chip insuficiente (totalSnps >= 100K + AIMs < 50)
{
  valid: false,
  matchedAimsCount: 12,
  errorCode: 'failed-precondition',
  errorMessage: 'Tu archivo ADN se procesó correctamente (700,000 SNPs, formato 23andMe), pero tu chip solo cubre 12 de los 247 marcadores ...'
}
```

**Branches**:
1. `matchedAimsCount >= MIN_SNPS` → válido.
2. `matchedAimsCount < MIN_SNPS && totalSnpsInFile < 100000` → archivo incompleto/corrupto.
3. `matchedAimsCount < MIN_SNPS && totalSnpsInFile >= 100000` → chip con cobertura insuficiente.

Los callers traducen `errorCode` directamente a `HttpsError` con el `errorMessage` del helper.

## Flujos típicos

### Flujo 1 — `analyzeAncestry` (Cloud Function dedicada)

```
[frontend/ancestry/index.html]   loadAncestry()
        │
        ▼  httpsCallable('analyzeAncestry')
[functions/index.js:2692]    analyzeAncestry(request)
        │
        ▼  getGeneticProfile(uid, masterKey)
        ▼  validateAncestryPrerequisites(geneticProf.snps, {totalSnpsInFile, fileFormat})
        │     └─ if !valid: throw HttpsError(errorCode, errorMessage)
        ▼  calculateAncestry(geneticProf.snps)
        ▼  Firestore .set('ancestry/result', { ...ancestryData, analyzedAt })
        ▼  return { success, ancestry, disclaimer }
```

### Flujo 2 — `analyzePhysicalTraits` con on-the-fly compute

Cuando el usuario va directo a `/traits` sin haber pasado por `/ancestry`, este flujo computa ancestría server-side automáticamente (Sprint 2 race condition fix, commit `d9e2400`):

```
[frontend/traits/index.html]   loadTraits()
        │
        ▼  httpsCallable('analyzePhysicalTraits')
[functions/index.js:2766]    analyzePhysicalTraits(request)
        │
        ▼  getGeneticProfile(uid, masterKey)
        ▼  Firestore .get('ancestry/result')
        │
        ├─ si exists: usar ancestría guardada (caso normal)
        │
        └─ si NO exists:
                console.warn('[Traits] RACE_CONDITION ...')
                ▼  validateAncestryPrerequisites(geneticProf.snps, opts)
                │     └─ if !valid: throw HttpsError → frontend muestra mensaje, redirige a /ancestry
                ▼  calculateAncestry(geneticProf.snps)
                ▼  Firestore .set('ancestry/result', {
                       ...ancestryData,
                       analyzedAt:       serverTimestamp(),
                       computedBy:       'analyzePhysicalTraits',
                       matchedAimsCount: validation.matchedAimsCount
                   })
                console.log('[Traits] ancestry computed and persisted on-the-fly')
        │
        ▼  procede con análisis de rasgos
```

El `computedBy` distingue documentos auto-computados de los iniciados explícitamente desde `/ancestry`.

## Persistencia en Firestore

Path: `users/{uid}/ancestry/result`.

Estructura del doc (set por `analyzeAncestry`):

```js
{
  // campos de calculateAncestry()
  populations:    [...],                // legacy array
  macroRegions:   { EUR, AFR, EAS, SAS, AMR_NAT, OCE },
  subPopulations: { EUR_N, EUR_S, AFR_W, AFR_E, EAS_CN, EAS_JP, SAS, AMR_NAT },
  aimsAnalyzed:   number,
  totalAimsInDb:  number,
  confidence:     'high' | 'medium' | 'low',
  accuracy:       '±5%' | '±8%' | '±12%',
  version:        'v3-247AIMs-...',

  // metadata agregada por el caller
  analyzedAt:     <serverTimestamp>
}
```

Cuando el doc lo crea `analyzePhysicalTraits` (Flujo 2), se agregan dos campos extra:

```js
{
  ..., // mismos campos de arriba
  computedBy:        'analyzePhysicalTraits',
  matchedAimsCount:  number
}
```

Consumers (frontend `/ancestry`, otros traits que usan `subPopulations`) no diferencian estos casos — leen las mismas claves.

## Conventions

- Inputs en formato `{[rsid]: {genotype: 'AA' | 'AG' | ...}}`. Genotipos con length distinto a 2 o iguales a `'--'` se ignoran (no contribuyen al EM ni al conteo de AIMs).
- Outputs en formato `{subPopulations, macroRegions, aimsAnalyzed, ...}`. Las fracciones están en rango 0-1, no en porcentaje. La conversión a porcentaje la hace el caller (frontend o backend).
- Funciones puras (sin side effects, sin I/O) — la persistencia la hace el caller.
- Errores: `calculateAncestry` lanza `Error` plano si AIMs < `MIN_SNPS` (sin diferenciar tipo de fallo). Para diferenciación con mensajes específicos, llamar `validateAncestryPrerequisites` antes y manejar `errorCode` explícitamente.
- Los AIMs en `referenceData.AIMS` están en orden estable; el cálculo del fingerprint depende del orden de iteración (que es estable bajo `Object.keys` para objetos no-numéricos).

## Decisiones de diseño relevantes

### 1. EM con likelihood binomial

Cada genotipo se modela como dos draws Bernoulli con probabilidad `p` igual a la frecuencia del minor allele en la sub-población candidata. Para diploides, `P(k | p) = C(2,k) p^k (1-p)^(2-k)` con k ∈ {0,1,2}. Es estilo ADMIXTURE / FRAPPE adaptado a un panel pequeño.

### 2. K=8 sub-poblaciones (no K=9)

El docstring de `calculator.js:4-9` dice "K=9", pero la constante `K = POPULATIONS.length` evalúa a **8**. La `K=9` parece un residuo de un panel anterior (posiblemente con una sub-pop adicional como Aymara separada de Mapuche, ahora colapsadas en `AMR_NAT` per `KNOWN_LIMITATIONS.md`). Confiar siempre en `K = POPULATIONS.length`, no en el comment.

### 3. Inicialización determinista por fingerprint

El Q-vector inicial NO es aleatorio — viene de SHA-256 de los primeros 30 AIMs del usuario, alimentando un LCG. Esto garantiza:
- Mismo usuario → mismo resultado entre invocaciones, sin necesidad de cachear estado.
- Tests reproducibles sin mock de RNG.

### 4. Regularización L2 hacia uniforme (`REGULARIZE = 0.01`)

El M-step mezcla la MLE con un pull suave hacia distribución uniforme (1/K por sub-pop). Evita colapso a una sola población cuando hay pocos AIMs informativos para alguna sub-pop. Valor pequeño (1%) para no distorsionar resultados con cobertura buena.

### 5. Umbral `MIN_SNPS = 50` (sobre 247 panel total)

Decisión empírica documentada en `KNOWN_LIMITATIONS.md`. Por debajo de 50 AIMs, el resultado deja de ser estadísticamente confiable. Con 23andMe v3+ se matchean ~150 AIMs típicamente; con Omni 2.5M (1000G chip) ~120 AIMs.

### 6. Helper `validateAncestryPrerequisites` compartido (Sprint 2, 2026-04-27)

Originalmente la lógica de pre-check vivía inline en `analyzeAncestry` (`functions/index.js`, líneas 2706-2737 del estado pre-Sprint-2). Cuando el race condition fix necesitó reusar la misma validación desde `analyzePhysicalTraits`, se extrajo el helper acá. Comportamiento de `analyzeAncestry` quedó idéntico (verificado vía test integración con 5 archivos reales).

### 7. Función pura `calculateAncestry`

No conoce Firestore ni auth ni request shape. Solo transforma `snps → ancestryData`. Esto permite reusarla desde múltiples callers (Cloud Functions, scripts de análisis offline, tests) sin acoplar el módulo a I/O.

## Casos edge documentados

| Input | Comportamiento |
|---|---|
| `snps` vacío `{}` | `validateAncestryPrerequisites` → `valid: false`, `matchedAimsCount: 0`, `errorCode: 'invalid-argument'` |
| `snps` con < 50 AIMs + `totalSnpsInFile < 100K` | `errorCode: 'invalid-argument'` "archivo incompleto" |
| `snps` con < 50 AIMs + `totalSnpsInFile >= 100K` | `errorCode: 'failed-precondition'` "chip insuficiente" |
| `snps` con >= 50 AIMs | `valid: true`; `calculateAncestry` procede |
| Algún genotipo es `'--'` o length distinto a 2 | El AIM se ignora silenciosamente en EM (no contribuye al conteo) |
| EM no converge dentro de `MAX_ITER` | Se devuelve el último Q calculado con `converged: false`. La diferencia con la solución convergida es típicamente <0.5% por sub-pop |

## Validación cross-étnica (panel de archivos test)

Confirmado empíricamente con `dna-test-data/_validate-race-condition-fix.js`:

| Archivo | totalSnps | AIMs matched | Confianza | Resultado |
|---|---|---|---|---|
| Kenneth Reitz (23andMe v3, EUR) | 927,768 | 149/247 | high (±5%) | EUR=93.6%, AFR=1.2%, EAS=1.9%, SAS=1.6%, AMR=1.8% |
| Bastian Greshake (23andMe build36, EUR) | 931,701 | 151/247 | high (±5%) | EUR=91.4% (EUR_S=56.1%, EUR_N=35.3%), SAS=5.0% |
| HG01565 (Omni 2.5M, PEL Peru) | 710,165 | 121/247 | high (±5%) | AMR_NAT=82.5%, EAS=10.6%, EUR=4.9% |
| NA18486 (Omni 2.5M, YRI Nigeria) | 711,264 | 121/247 | high (±5%) | AFR=98.4% (AFR_W=66.3%, AFR_E=32.1%) |
| NA18525 (Omni 2.5M, CHB Han Chinese) | 710,613 | 121/247 | high (±5%) | EAS=84.1% (EAS_CN=54.8%, EAS_JP=29.3%), SAS=7.7% |

Todos los archivos del panel test pasan el threshold de 50 AIMs. La branch `failed-precondition` de `validateAncestryPrerequisites` solo se activaría con chips muy limitados (MyHeritage GSA antiguo, FTDNA reducido) si aparecen.

## Tests

- `functions/tests/test-ancestry.js` — tests internos del módulo (importa `calculateAncestry`).
- `scripts/test-validate-ancestry-prerequisites.js` — 21 asserts del helper, agregado en Sprint 2 (commit `d9e2400`). Cubre snps vacío/null, 100 AIMs sintéticos, ambas branches de error, borderline 49 vs 50, y archivo Kenneth real.

## Historial relevante

- **2026-04-22**: regeneración del panel a v3 (247 AIMs combinando CLG141 + Kidd + Seldin), `referenceData.js` actualizado.
- **2026-04-27** (Sprint 2 race condition, commit `d9e2400`): extracción de `validateAncestryPrerequisites` desde inline en `analyzeAncestry`, agregado al `module.exports`. Habilitó el flujo on-the-fly en `analyzePhysicalTraits`.

## Referencias

- Verdugo RA et al. 2020 — *Development of a small panel of SNPs to infer ancestry in Chileans*. Biological Research 53:15. DOI: 10.1186/s40659-020-00284-5 (panel CLG, 141 AIMs).
- Kidd KK et al. 2014 — *Progress toward an efficient panel of SNPs for ancestry inference*. Forensic Sci Int Genetics 10:23 (panel Kidd, 55 AIMs).
- Kosoy R / Seldin MF et al. 2009 — *Ancestry informative marker sets for determining continental origin and admixture proportions in common populations in America*. Human Mutation 30:69 (panel Seldin, 128 AIMs).
- 1000 Genomes Project Phase 3, Ensembl REST API (frecuencias allelic, fetched 2026-04-22).
- Algoritmo: ADMIXTURE-style EM con binomial likelihood y L2 regularization (λ=0.01), maxIter=1000.
