# Rasgos genéticos no implementables en Nura

Este documento registra los 3 rasgos que fueron pedidos originalmente pero no se
implementaron por limitaciones científicas o técnicas. Quedan aquí documentados
para que el equipo pueda revisarlos cuando la evidencia avance.

---

## 1. Hoyuelos en mejillas (dimples)

**Estado:** No implementado — evidencia insuficiente

**Por qué no se implementa:**
No existe un rsid único validado con replicación consistente en GWAS mayores.
La literatura menciona "heredabilidad observacional" estimada en ~40-65%, pero
los loci candidatos tienen tamaños de efecto muy pequeños y no han sido replicados
en cohortes independientes de forma convincente.

**Alternativa futura:**
Revisar GWAS de rasgos faciales de Tan et al. 2024 y actualizaciones de UK Biobank
(N > 100k). Si aparece un locus con OR > 1.5 replicado, es candidato a agregar.

---

## 2. Forma del pabellón auricular

**Estado:** No implementado — evidencia insuficiente

**Por qué no se implementa:**
EDAR rs3827760 está asociado a grosor de cabello y forma de dientes (ya implementado
como `hair_texture`), pero no a forma auricular. Los GWAS disponibles de morfología
auricular identifican loci con tamaños de efecto marginales (OR < 1.2) que no son
predictivos a nivel individual.

**Estado:** Esperando evidencia más sólida. Revisar literatura de "ear morphology GWAS"
con N > 50k y OR > 1.4.

---

## 3. Capacidad de digerir almidón (AMY1 copy number variation)

**Estado:** No implementable — limitación tecnológica del chip de ADN

**Por qué no se implementa:**
AMY1 es una **Copy Number Variation (CNV)**, no un SNP bialélico. Los chips de ADN
de consumidor (23andMe, AncestryDNA, MyHeritage, FTDNA) **no detectan CNVs** — solo
genotizan SNPs en posiciones fijas del genoma. Para medir el número de copias de AMY1
se requiere:
- qPCR específico para AMY1, o
- Secuenciación de genoma completo (WGS) a cobertura ≥ 10×

**Estado:** Imposible con datos de chip. Requiere tecnología distinta a la usada por Nura.
Si en el futuro Nura acepta datos de WGS, AMY1 CNV es candidato prioritario a agregar.

---

## Resumen

| Rasgo | Motivo | Revisable cuando |
|-------|--------|-----------------|
| Hoyuelos (dimples) | Sin rsid validado replicado | GWAS N>100k con OR>1.5 |
| Forma pabellón auricular | Tamaño de efecto marginal | GWAS N>50k con OR>1.4 |
| AMY1 CNV (almidón) | Tecnología incompatible (CNV ≠ SNP) | Cuando Nura acepte WGS |

---

**Generado:** 2026-04-22  
**Panel genético activo:** v3-247AIMs-CLG141+KS106  
**Total rasgos implementados actualmente:** 102  
**Rasgos visibles en UI:** ~81 (102 menos 21 ocultos: medical_conditions + personality)
