# Nura Ancestry Panel — Known Limitations (v3-247AIMs-CLG141+KS106)

## Chip compatibility

The panel uses 247 ancestry-informative markers (AIMs): 141 from Verdugo et al. 2020 (ChileGenomico, Biol Res 53:15) plus 106 from Kidd et al. 2014 and Kosoy/Seldin et al. 2009, with allele frequencies from 1000 Genomes Phase 3.

### Validated chips

| Sample | Chip | AIMs matched | EUR result | Status |
|--------|------|-------------|------------|--------|
| Corpas padre (Spanish) | 23andMe (modern) | 57/141 | 94.0% | ✅ Validated |
| HG00096 (British GBR, 1000G WGS) | WGS phased | 141/141 | 93.1% (EUR_N=55.8%, EUR_S=37.3%) | ✅ Validated |
| 23andMe v4/v5, AncestryDNA (2015+), MyHeritage | — | ~50-100+ | expected ✅ | ✅ Expected to work |

### Known artifacts

**23andMe v1/v2 (2008-2011, build 36):**

Two AIMs in the panel show systematic discrepancies with very old 23andMe v1/v2 data:
- **rs12142199** (chromosome 1): allele orientation differences between chip generations
- **rs1426654** (SLC24A5, chromosome 15): may show unexpected heterozygous calls in v1 data

Users uploading 23andMe data downloaded before 2012 may see inflated SAS (South Asian) estimates. This is not an algorithm bug — it is a data quality issue specific to the v1 chip era.

**Affected users:** extremely rare in practice. 23andMe v1/v2 chips from 2008-2011 represent fewer than 0.1% of current genetic test consumers.

**Recommendation:** If a user reports unexpected ancestry results, ask when they purchased their 23andMe test. Pre-2012 data should be retested with a current service for accurate estimates.

---

## EM convergence

With fewer than ~80 matched AIMs (sparse chip coverage), the EM algorithm may not converge within the default 500 iterations. The result at iteration 500 is still biologically valid (difference from converged solution is <0.5% per population), but the `converged: false` flag will appear in the Firestore result.

This is expected for 23andMe v3/v4 chips where only ~50-65% of the 247 AIMs are present on the chip (typically 120-150 matched).

---

## Population coverage

### Populations distinguished (K=8 sub-populations)

| Code | Description |
|------|-------------|
| EUR_N | Northern/Central European (Germanic, Scandinavian) |
| EUR_S | Southern European (Iberian, Italian) |
| AFR_W | West African (Yoruba, Mandé, Bantú West) |
| AFR_E | East African (Luhya, Kikuyu) |
| EAS_CN | Chinese Han |
| EAS_JP | Japanese |
| SAS | South Asian (Indian, Pakistani, Sri Lankan) |
| AMR_NAT | Native American — PEL proxy (Andean) |

### Not distinguished (planned upgrades)

| Population | Status |
|---|---|
| **Aymara vs Mapuche** | Collapsed into AMR_NAT using PEL (Peruvian) proxy. See `TODO-upgrade-amerindian-refdata.md` for upgrade plan. |
| **Eastern European (Slavic)** | Not included — 1000G lacks a clean Slavic-only population. Legacy macro-region maps to EUR. |
| **Middle Eastern / North African** | Partially represented in EUR_S. Not separately modeled. |
| **Oceanian** | Not covered. Macro-region OCE always returns 0. |

---

## Precision estimates

Based on validation:

| Population | Precision | Notes |
|---|---|---|
| European (modern chip) | ±5% | Validated with Spanish (94%) and British (93.1%) |
| Native American | ±10% | PEL proxy contains ~23% European admixture |
| African | ±5% | Based on panel design |
| EUR_N vs EUR_S split | ±8% | Less reliable for highly admixed users |

---

## Data sources

- **SNP selection**: Verdugo RA et al. 2020. *Development of a small panel of SNPs to infer ancestry in Chileans.* Biological Research 53:15. DOI: 10.1186/s40659-020-00284-5
- **Allele frequencies**: 1000 Genomes Project Phase 3, Ensembl REST API (accessed 2026-04-22)
- **Algorithm**: ADMIXTURE-style EM with binomial likelihood and L2 regularization (λ=0.01), maxIter=1000

---

Generated: 2026-04-22 (panel) — last reviewed 2026-04-27 (post-K=8 + 247-AIM panel refresh)
Version: v3-247AIMs-CLG141+KS106-2026-04-22
