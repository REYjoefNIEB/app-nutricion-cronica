# Pipeline — Problemas conocidos y decisiones de diseño

## 1. Staleness del perfil genético en Firestore cuando cambia _NEEDED_SNPS

**Descubierto:** 2026-04-23  
**Investigación:** ~4 horas de diagnóstico (logs HIrisPlex STEP1/STEP2)

### Descripción

Cuando se agrega un nuevo conjunto de rsids a `_NEEDED_SNPS` (por ejemplo, `HIRISPLEX_RSIDS` en el commit `e63ca8d`), los perfiles genéticos existentes en Firestore **no se actualizan automáticamente**. El perfil de cada usuario solo contiene los SNPs que estaban en `_NEEDED_SNPS` en el momento en que subió su archivo ADN original.

Síntoma observado: la tarjeta HIrisPlex-S mostraba "4/6 SNPs" y predicciones incorrectas (`87.9% marrón`) en lugar de `6/6 SNPs` y `77.8% marrón` (valor correcto del webtool oficial).

### Causa raíz

`processGeneticData` llama a `_filterNeededSnps(parseResult.snps)` antes de guardar en Firestore. Si los rsids nuevos no estaban en `_NEEDED_SNPS` cuando el usuario subió su archivo, no se guardaron — aunque el chip sí los contenía.

El archivo raw se elimina al terminar el procesamiento (línea ~2565, compliance Ley 20.120), así que no hay forma de re-parsear sin que el usuario re-suba.

### Resolución actual

El usuario debe **re-subir su archivo ADN** para que `processGeneticData` corra con el `_NEEDED_SNPS` actualizado y sobrescriba el perfil en Firestore.

### Resolución futura recomendada

Considerar una de estas opciones cuando se haga el próximo cambio de panel:

- **Botón "Re-parsear ADN"** en la UI que permita al usuario re-subir sin pasar por el flujo completo de onboarding.
- **Versión de `_NEEDED_SNPS`**: guardar junto al perfil en Firestore la versión del panel con que fue procesado (e.g. `snpPanelVersion: "v3-388"`). Si la versión actual es mayor, mostrar un banner "Tu perfil fue procesado con un panel anterior — re-subí tu archivo para actualizar X rasgos nuevos."
- **Script de migración** (solo viable si el archivo raw NO se elimina, lo cual viola Ley 20.120 — **no aplicable en Nura**).

### Archivos relevantes

- `functions/index.js` → `_NEEDED_SNPS`, `_filterNeededSnps`, `processGeneticData`
- `functions/traits/hirisplex.js` → `HIRISPLEX_RSIDS` (41 rsids, agregados en `e63ca8d`)
