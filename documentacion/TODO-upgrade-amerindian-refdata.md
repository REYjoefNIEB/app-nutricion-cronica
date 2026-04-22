# TODO — Upgrade de datos amerindios (AYM/MAP separados)

## Estado actual (post 4.1-B)

El algoritmo usa **PEL** (Peruvians from Lima, 1000G Phase 3) como proxy único de ancestría amerindia (`AMR_NAT`). Esto implica:

- `AMR_NAT` es un bloque único — no se distinguen Aymara vs Mapuche
- PEL contiene ~77% amerindio andino + ~23% europeo → frecuencias levemente "contaminadas" con ancestría europea
- Para un usuario Mapuche puro, el algoritmo puede subestimar ~5-10% la ancestría amerindia del sur

## Upgrade pendiente

Separar `AMR_NAT` en dos sub-poblaciones con datos reales de ChileGenomico:

| Código | Fuente datos | n muestras (paper) |
|--------|-------------|-------------------|
| `AYM`  | Aymara (norte andino de Chile) | 17 individuos Verdugo 2020 |
| `MAP`  | Mapuche/Pehuenche/Huilliche | 31 individuos Verdugo 2020 |

Frecuencias de alelo A1 para cada uno de los 141 SNPs del panel CLG.

## Cómo obtener los datos

### Opción 1 (recomendada) — Contactar al autor del paper

**Autor principal:** Ricardo A. Verdugo  
**Institución:** Programa de Genética Humana del ICBM, Facultad de Medicina, Universidad de Chile  
**Paper:** Verdugo et al. 2020, Biol Res 53:15 — doi:10.1186/s40659-020-00284-5  
**Website lab:** https://digenoma-lab.cl  

**Email sugerido (en español):**

```
Asunto: Solicitud de frecuencias alélicas por población (AYM/MAP) del panel CLG

Estimado Dr. Verdugo,

Le escribo en relación con su publicación "Development of a small panel
of SNPs to infer ancestry in Chileans..." (Biol Res 2020).

Estoy desarrollando Nura, una aplicación de salud personalizada con módulo
de análisis genético para usuarios chilenos. Utilizo el panel CLG de 147 AIMs
para inferir ancestría, y me gustaría distinguir entre las componentes Aymara
y Mapuche en lugar de usar un bloque AMR único.

¿Sería posible acceder a las frecuencias alélicas por población (AYM y MAP)
para los 147 SNPs del panel? El uso es exclusivamente para inferencia de
ancestría en la aplicación, con reconocimiento académico al equipo ChileGenomico
en la documentación y en el app.

El proyecto es de código abierto y no tiene fines comerciales en esta etapa.

Muchas gracias por su tiempo y por el valioso trabajo publicado.

Saludos cordiales,
[Nombre]
[Email]
[Link al proyecto]
```

### Opción 2 (fallback) — Aproximación con HGDP

Si no se puede obtener data de los autores:
- `AYM` ≈ HGDP Karitiana + Surui (amerindios andinos del norte)
- `MAP` ≈ HGDP Mapuche (disponible en subset HGDP-CEPH Bergström 2020)

Acceso: https://www.hagsc.org/hgdp/files.html

## Cómo integrar cuando llegue

### 1. Agregar archivo de datos
```
scripts/ancestry-data-v2/03-clg-populations-verdugo.json
```
Estructura esperada:
```json
{
  "rs12142199": { "AYM": 0.XX, "MAP": 0.XX },
  "rs4908343":  { "AYM": 0.XX, "MAP": 0.XX },
  ...
}
```

### 2. Modificar referenceData.js
- Agregar `AYM` y `MAP` como sub-poblaciones (K pasa de 9 a 10)
- Reemplazar `AMR_NAT` con las frecuencias específicas
- Actualizar `POPULATION_LABELS` y `MACRO_REGION`

### 3. Validar con Test #1.5
- Criterio nuevo: usuario con apellidos mapuches o región de La Araucanía → `MAP > AYM`
- Criterio nuevo: usuario con apellidos aymaras o región de Arica → `AYM > MAP`

## Archivos relacionados

| Archivo | Descripción |
|---------|-------------|
| `scripts/ancestry-data-v2/02-aims-with-populations.json` | AIMs con frecuencias actuales (PEL proxy) |
| `functions/ancestry/referenceData.js` | Archivo que deberá actualizarse |
| `scripts/ancestry-data-v2/01-aims-parsed.json` | Lista base de los 141 AIMs del panel CLG |

## Impacto esperado del upgrade

| Métrica | Antes (PEL proxy) | Después (AYM+MAP reales) |
|---------|------------------|--------------------------|
| Sub-poblaciones amerindias | 1 (AMR_NAT) | 2 (AYM + MAP) |
| Precisión en usuarios andinos | ~80% | ~90% |
| Precisión en usuarios mapuches | ~70% | ~85% |
| K total | 9 | 10 |
