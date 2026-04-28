# functions/traits/

Módulo de análisis de rasgos físicos para Nura. Combina:
- Trait database custom (~102 rasgos puntuales basados en SNPs específicos)
- Modelo forense **HIrisPlex / HIrisPlex-S** (color de ojos, cabello, piel)
- Lógica ancestry-aware (caveats y flags para usuarios no-europeos)

## Estructura

| Archivo | Líneas | Propósito |
|---|---|---|
| `traitsDatabase.js` | 910 | Base de **44 traits legacy** + merge con la expansión. Export oficial del módulo (`PHYSICAL_TRAITS`). |
| `traitsDatabase_v2_expansion.js` | 1237 | **58 traits adicionales** (apariencia ampliada, fitness, sueño, personalidad, etc.). Export `EXPANSION_TRAITS`. |
| `hirisplex.js` | 754 | Modelo forense de pigmentación (3 modelos softmax: eye/hair/skin) + slot `lowConfidenceAncestry` agregado en Sprint Hallazgo 1. |

Sin backups en este directorio. Los 3 archivos son código activo.

**Total**: 102 traits + 3 modelos forenses HIrisPlex.

### Cómo se mergean

`traitsDatabase.js` al final hace:
```js
const EXPANSION_TRAITS = require('./traitsDatabase_v2_expansion');
const ALL_TRAITS = { ...PHYSICAL_TRAITS, ...EXPANSION_TRAITS };
module.exports = { PHYSICAL_TRAITS: ALL_TRAITS };
```

→ El consumidor (`functions/index.js`) importa `PHYSICAL_TRAITS` y obtiene los 102 traits combinados. Si dos archivos definen el mismo trait_id, gana el de la expansión (spread order).

## Modelos científicos

### HIrisPlex (eye + hair color)

Implementado en `hirisplex.js`. Modelo forense de Walsh et al.:
- **Eye color** — IrisPlex (6 SNPs), Walsh et al. 2011 (FSI:G 5:170-180). **Coeficientes confirmados** desde el paper.
- **Hair color** — HIrisPlex (24 SNPs), Walsh et al. 2014 (FSI:G 9:150-161). Coeficientes "best-available from training data" — el comment del archivo recomienda validar contra el webtool oficial.
- **Skin color** — HIrisPlex-S, Walsh et al. 2017 / Chaitanya et al. 2018. **Aproximados** según el comment.

Webtool de referencia oficial: https://hirisplex.erasmusmc.nl/

### HIrisPlex-S Panel (41 SNPs)

`HIRISPLEX_PANEL` (líneas 33-81 de `hirisplex.js`) define los 41 SNPs con su `chipAllele` (alelo a contar en strand forward). Cada entrada lleva un campo `models` indicando para qué modelos se usa (`['eye']`, `['hair']`, `['skin']`, o combinaciones). Ejemplos:
- `rs12913832` (HERC2) — `['eye', 'hair']`
- `rs1426654` (SLC24A5, pale skin) — `['skin']`
- `rs1805008` (MC1R R160W) — `['hair']`
- `rs1805009` (MC1R D294H) — `['hair']`, marcado `palindromic: true`

Hay 4 SNPs flagged `palindromic: true` (C/G o A/T donde el complement matchea el chip allele) que requieren tratamiento especial en `countMinorAlleles` para no contar mal por strand flip.

### Trait database (genética puntual, 102 traits)

Cada trait es una entrada con la siguiente shape (extraída del código real):

```js
trait_id: {
    name: 'Texto display',
    icon: '👁️' | 'lucide-icon-name' | etc,
    category: 'appearance' | 'physiology' | 'taste' | 'metabolism' |
              'fitness' | 'medical_conditions' | 'personality' | 'lifestyle',
    evidence: 'high' | 'moderate' | 'low',
    primarySnp: 'rsXXXXXX',
    sliderMin: 'Texto extremo izquierdo',
    sliderMax: 'Texto extremo derecho',
    interpret(genotypes, ancestry = {}) {
        // retorna { value, confidence, note?, position } o null
    }
}
```

Algunos traits tienen campos extra (ej. `hirisplex` agregado por el callsite con probabilidades + flags), pero la shape mínima es esa.

### Distribución por categoría

| Categoría | Legacy | Expansión | Total |
|---|---|---|---|
| `appearance` | 6 | 15 | **21** |
| `metabolism` | 7 | 12 | **19** |
| `lifestyle` | 3 | 9 | **12** |
| `fitness` | 6 | 6 | **12** |
| `personality` | 3 | 8 | **11** |
| `medical_conditions` | 10 | 0 | **10** |
| `physiology` | 5 | 4 | **9** |
| `taste` | 4 | 4 | **8** |
| **TOTAL** | **44** | **58** | **102** |

`medical_conditions` y `personality` están filtradas en el frontend (`frontend/traits/index.html` los excluye del render por decisión de UX médica).

## API pública

### `hirisplex.js`

```js
module.exports = {
    predictPigmentation,    // entry point — wrapper que llama a los 3
    predictEyeColor,
    predictHairColor,
    predictSkinColor,       // único que recibe ancestry
    HIRISPLEX_RSIDS         // array de los 41 rsids del panel
};
```

#### `predictPigmentation(genotypes, ancestry = null)`

Orquestador que devuelve los 3 outputs juntos:

```js
{
    eye:  predictEyeColor(genotypes),     // { prediction, confidence, probabilities, ... } o null
    hair: predictHairColor(genotypes),    // idem
    skin: predictSkinColor(genotypes, ancestry),  // idem + lowConfidenceAncestry
    model: 'HIrisPlex-S',
    version: '1.0.0',
    references: [...],
    webtool: 'https://hirisplex.erasmusmc.nl/'
}
```

`ancestry` solo se reenvía a `predictSkinColor`. Eye y hair no consultan ancestría.

#### `predictSkinColor(genotypes, ancestry = null)`

Modelo softmax sobre `SKIN_SNPS_LIST` (35 entradas en código actual; el comment dice "36 SNPs" — leve discrepancia, ver "Discrepancias detectadas"). Devuelve:

```js
{
    probabilities: { very_pale, pale, intermediate, dark, dark_to_black },  // % redondeados a 1 decimal
    prediction:    'Muy clara / Tipo I-II' | 'Clara / Tipo II-III' | ...,   // español
    predictionKey: 'very_pale' | 'pale' | 'intermediate' | 'dark' | 'dark_to_black',
    confidence:    Math.round(maxProb * 100),
    isAboveThreshold: maxProb >= 0.60,
    snpsUsed:    Number,
    snpsTotal:   35,
    source:      'HIrisPlex-S — Chaitanya et al. 2018 (approx.)',
    validated:   false,
    position:    Number 0-100,
    lowConfidenceAncestry: null | {
        flag: true,
        reason: 'non_european_ancestry_with_light_skin_prediction',
        eurFraction: Number,
        message: 'Modelo no calibrado para tu ancestría: HIrisPlex-S fue desarrollado con muestras europeas...'
    }
}
```

Si los SNPs disponibles del panel skin son menos de 3, retorna `null` (cobertura insuficiente).

### `traitsDatabase.js`

```js
module.exports = { PHYSICAL_TRAITS: ALL_TRAITS };
```

Donde `ALL_TRAITS = { ...PHYSICAL_TRAITS, ...EXPANSION_TRAITS }` — el merge mencionado arriba.

### `traitsDatabase_v2_expansion.js`

```js
module.exports = EXPANSION_TRAITS;
```

(Sin wrapper. Importado por `traitsDatabase.js` para el merge.)

## Flujos típicos

### Flujo HIrisPlex (override sobre traits legacy de pigmentación)

```
[functions/index.js:2766]  analyzePhysicalTraits
    │
    ▼  PHYSICAL_TRAITS loop (102 traits) → traits['eye_color']/['hair_color']/['skin_pigmentation'] inicializados con interpret() legacy
    │
    ▼  predictPigmentation(genotypes, ancestry)
    │     ├─ predictEyeColor   → traits['eye_color']    SOBREESCRITO con label HIrisPlex
    │     ├─ predictHairColor  → traits['hair_color']   SOBREESCRITO con label HIrisPlex
    │     └─ predictSkinColor  → traits['skin_pigmentation'] SOBREESCRITO + slot hirisplex.lowConfidenceAncestry
    │
    ▼  Firestore .set('physical_traits/result', { traits, analyzed, found, analyzedAt })
```

Por eso `eye_color`, `hair_color` y `skin_pigmentation` siempre muestran el output HIrisPlex final, no las predicciones simples del trait database legacy. Los traits legacy de esas mismas IDs sirven como fallback si HIrisPlex falla (try/catch en index.js:2890).

### Flujo trait database (resto de los 99 traits)

```
[functions/index.js:2812]  for (traitKey, trait of Object.entries(PHYSICAL_TRAITS)):
    if (genotypes[trait.primarySnp]) {
        const result = trait.interpret(genotypes, ancestry);
        if (result) {
            traits[traitKey] = { name, icon, category, evidence, sliderMin, sliderMax, ...result };
        }
    }
```

Si `primarySnp` no está en los genotipos del usuario, el trait se salta. Si `interpret()` devuelve null (ej. genotipo `'--'`), tampoco se incluye. El frontend ignora los traits no incluidos.

## Persistencia en Firestore

Path: `users/{uid}/physical_traits/result`.

```js
{
    traits: {
        eye_color: { name, icon, category, evidence, sliderMin, sliderMax, value, confidence, note, position, hirisplex: {...} },
        hair_color: { ... },
        skin_pigmentation: { ..., hirisplex: { probabilities, isAboveThreshold, lowConfidenceAncestry } },
        // + ~95 traits más (los que se renderizan)
    },
    analyzed: 102,    // cuántos traits se intentaron
    found: Number,    // cuántos tenían primarySnp en los genotipos del usuario
    analyzedAt: <serverTimestamp>
}
```

## Conventions

- Trait IDs en `snake_case`.
- `interpret()` es función pura (no I/O), retorna objeto con `value` / `confidence` / `note?` / `position` o `null`.
- Genotypes en formato `{ [rsid]: 'AA' | 'AT' | ... }` — string concatenado de 2 chars, NO array. Order-insensitive: la lógica normaliza con `g.split('').sort().join('')` cuando importa.
- Ancestry shape: **plana** `{ EUR_N, EUR_S, AFR_W, AFR_E, EAS_CN, EAS_JP, SAS, AMR_NAT }`, no nested. (Construida en `functions/index.js:2785-2807` desde el doc Firestore — los traits no leen Firestore directamente.)
- `position` en slider 0-100 (donde 0 = `sliderMin`, 100 = `sliderMax`).
- `confidence` 0-100 (% de seguridad de la predicción).
- Los traits con genotipos `'--'`, ausentes, o de length distinto a 2 retornan `null`.

## Decisiones de diseño relevantes

### 1. Hybrid approach: HIrisPlex + custom traits

HIrisPlex es un modelo forense **validado** y publicado para 3 features (eye, hair, skin). El resto de los rasgos físicos (~99 traits) no tienen modelos forenses disponibles, así que se usan reglas más simples por SNP/genotipo. Tener ambos sistemas conviviendo permite usar la mejor evidencia disponible en cada caso.

### 2. Ancestry-aware vs genotype-only

Algunos traits modulan output por ancestría (patrón `isMestizo = ancestry.AMR_NAT > 0.20`), otros son puramente genotípicos (ej. `ear_wax`, `lactose_adult`). La decisión es biológica: cuando un fenotipo depende de pigmentación basal o admixture, la ancestría es informativa; cuando depende de un único SNP con efecto mendeliano (ej. ABO, ABCC11), la ancestría no aporta.

Aproximadamente la mitad de los traits consultan `ancestry`. Los grep de `ancestry.AMR_NAT|isMestizo|hasDarkBasalPigmentation` devuelven ~40 ocurrencias por archivo.

### 3. `lowConfidenceAncestry` flag (Hallazgo 1, commits `29f17a1` + `c3667bf`)

Decisión: NO sobrescribir la predicción de HIrisPlex-S para usuarios no-europeos, sino agregar un caveat visible que advierta que el modelo está calibrado predominantemente con muestras europeas. Razones:
- El modelo sigue siendo el mejor disponible — descartarlo dejaría a los usuarios no-europeos sin predicción.
- La transparencia es éticamente preferible al silencio o al override.
- Slot `trait.hirisplex.lowConfidenceAncestry` leído por `renderTraitCard` en `frontend/traits/index.html`.

Threshold actual: se activa cuando `eurFraction < 0.50` AND `predictionKey ∈ {very_pale, pale}`. Acepta dos shapes de `ancestry` (objeto plano `{EUR_N, EUR_S, ...}` o nested `{macroRegions: {EUR}}`) — el hotfix `c3667bf` agregó el fallback a la shape plana después que el commit original `29f17a1` quedó inerte en producción.

### 4. ASIP caveat estrategia C+ (Hallazgo 3, commit `c0c8bc9`)

`tanning_ability` (rs4911414) decía "Se quema fácil, SPF 50+ siempre" para todos los GG, ignorando que ASIP modula la **proporción** eumelanina/feomelanina, no la **cantidad total**. Para personas con pigmentación basal alta (africanos, asiáticos del este, amerindios), el SPF 50+ no es lo más relevante.

Solución: 3 señales independientes para detectar pigmentación basal alta:
- `rs1426654 = GG` (SLC24A5 ancestral, señal directa)
- `ancestry.AFR_W + ancestry.AFR_E > 0.40`
- `ancestry.EAS_CN + ancestry.EAS_JP > 0.40`
- `ancestry.AMR_NAT > 0.40`

Si `rs4911414 = GG` AND alguna señal de pigmentación basal alta → caveat reemplaza el output original con explicación de que ASIP es secundario en su fototipo.

### 5. MC1R compuesto: 6 R alleles (commit `a4cc785`)

`hair_color_red_mc1r` antes solo leía `rs1805008` (R160W). Reescrito para leer **6 R alleles de alta penetrancia** validados en literatura: R151C, R160W, D294H, D84E, R142H, I155T.

Lógica de conteo: heterocigoto = 1 punto, homocigoto = 2 puntos. Total ≥ 2 → "Alta probabilidad de cabello rojo". Total = 1 → "Portador". Total = 0 → "Sin variantes RHC detectadas (panel N/6)".

Excluye los 3 r alleles de baja penetrancia (V60L, V92M, R163Q) por efecto bidireccional reportado.

Card renombrada de "Cabello pelirrojo (MC1R R160W)" a "Cabello pelirrojo (MC1R)".

Referencias: Beaumont 2007 (PMID:17616515), Lichtenwalter 2019 (PMID:30657907), M-SKIP 2015.

## Casos edge documentados

| Input | Comportamiento |
|---|---|
| Genotype null o `'--'` | trait retorna `null` (no se renderiza) |
| Genotype con orden inverso (ej. `'TC'` en lugar de `'CT'`) | normalizado por sort interno (donde la lógica lo necesita) |
| SNPs ausentes en chip | trait retorna `null`. HIrisPlex marca `snpsUsed`/`snpsTotal` |
| Ancestry vacío `{}` | fallback a comportamiento sin ancestry-aware (todas las branches `isMestizo=false`) |
| HIrisPlex skin: < 3 SNPs disponibles del panel | retorna `null` (no hay predicción) |
| HIrisPlex eye: rs12913832 ausente | retorna `null` (HERC2 es mandatorio per spec HIrisPlex) |

## Validación cross-étnica

| Archivo | Ancestría | Uso típico |
|---|---|---|
| Kenneth Reitz (23andMe v3) | EUR ~93.6% | Caso negativo de Hallazgo 1 (sin flag), Hallazgo 3 (rs4911414=TT sin caveat) |
| James Bradach (23andMe v3/v5) | EUR | Caso clínico barba rojiza — sin variantes R en panel (documentado como caso abierto) |
| Bastian Greshake (23andMe build36) | EUR | Validación de heterocigotos (rs4911414=GT) |
| HG01565 (Omni 2.5M, PEL) | AMR ~82% | Caso amerindio — rs4911414=TT no dispara ASIP caveat |
| NA18486 (Omni 2.5M, YRI) | AFR ~98% | Caso positivo de Hallazgo 1 (skin flag), Hallazgo 3 (ASIP caveat) |
| NA18525 (Omni 2.5M, CHB) | EAS ~84% | Caso positivo Hallazgo 1 + Hallazgo 3 |
| `dna-test-data/synthetic_brca_carrier.txt` | EUR | Validación BRCA1 185delAG (Sprint BRCA-B) |
| `dna-test-data/synthetic_mc1r_carrier.txt` | EUR | Sintético Kenneth + R160W CT — único caso que dispara "Portador MC1R" |

## Tests

- `scripts/test-asip-tanning-fix.js` — **13 casos** (Hallazgo 3): branches TT/TG/GG, fallback, casos AMR borderline, fail-safes
- `scripts/test-mc1r-compound-fix.js` — **21 casos**: 6 ancestrales, hetero simple, compound, homocigoto, triple het, edge (no-call, panel parcial, null)
- `scripts/test-skin-low-confidence-flag.js` — **15 casos** (Hallazgo 1): europeo, yoruba, mestizo, fail-safes con shape macroRegions y plana

Total tests del módulo traits: **49 casos** (todos pasan al cierre de 2026-04-27).

Helpers locales (no commiteados, en `dna-test-data/`):
- `_validate-skin-flag.js` — end-to-end del Hallazgo 1
- `_validate-asip-fix.js` — end-to-end del Hallazgo 3
- `_validate-mc1r-fix.js` — end-to-end del MC1R compuesto

## Discrepancias detectadas (deuda baja, no afectan lógica)

Análogo a las discrepancias detectadas en `functions/ancestry/README.md`:

1. **`hirisplex.js:732-753`** — Bloque comentario `KNOWN ISSUE` dice que la race condition entre `analyzeAncestry` y `analyzePhysicalTraits` está **NOT FIXED** y referencia `SPRINT_14_handoff`. **El bug ya fue arreglado** en commit `d9e2400` (Sprint 2 race-condition fix, 2026-04-27) con estrategia C híbrida. El comment quedó stale al cerrar el sprint. Conviene removerlo en próxima limpieza para no confundir mantenedores futuros.
2. **`hirisplex.js:615`** — Comment del bloque skin dice `"Skin color prediction (HIrisPlex-S, 36 SNPs)"`, pero `SKIN_SNPS_LIST` (líneas 618-626) tiene **35 entradas**. Por eso `snpsTotal: SKIN_SNPS_LIST.length` reporta `35`, no `36`. Discrepancia de 1 SNP entre comment histórico y panel actual.

Ninguna de las dos afecta la lógica — son comments anotativos. Sprint trivial cuando convenga.

## Historial relevante

- **2026-04-27** Sprint Hallazgo 1 (commits `29f17a1` + hotfix `c3667bf`): `predictSkinColor` recibe `ancestry`, devuelve `lowConfidenceAncestry`. `predictPigmentation` forwards. Frontend renderiza warning amarillo.
- **2026-04-27** Sprint Hallazgo 3 (commit `c0c8bc9`): `tanning_ability.interpret` recibe `ancestry`, lógica de pigmentación basal alta con 3 señales. Caveat reemplaza el output GG cuando aplica.
- **2026-04-27** Sprint MC1R compuesto (commit `a4cc785`): `hair_color_red_mc1r` reescrito con panel 6-R-alleles + conteo het/homo. Variable muerta `mc1r_r151c` removida. Card renombrada.
- **2026-04-27** Sprint 20 etiquetas hirisplex (commit `08b2502`): `rs1805009` corregido a `MC1R D294H`, `rs1110400` corregido a `MC1R I155T` (eran "TUBB3" y "MC1R R163Q" — ambos errados per dbSNP/ClinVar).

## Referencias

- **HIrisPlex eye** — Walsh S et al. 2011. *IrisPlex: a sensitive DNA tool for accurate prediction of blue and brown eye colour in the absence of ancestry information*. Forensic Sci Int Genetics 5:170-180.
- **HIrisPlex hair** — Walsh S et al. 2014. *Global skin colour prediction from DNA*. Forensic Sci Int Genetics 9:150-161.
- **HIrisPlex-S skin** — Walsh S et al. 2017 (Hum Genet 136:847) y Chaitanya L et al. 2018 (FSI:G 35:123).
- **HIrisPlex webtool** (Erasmus MC) — https://hirisplex.erasmusmc.nl/
- **MC1R R alleles** — Beaumont KA et al. 2007 (PMID:17616515); Lichtenwalter J et al. 2019 (PMID:30657907); M-SKIP project 2015.
- **Liu et al. 2009** (AJHG 85:6) — base IrisPlex.

Las referencias específicas por SNP están en los notes de cada `interpret()` cuando el coeficiente o la asociación viene de un paper concreto.
