# DNA test data — Validación cross-étnica

Archivos de ADN público usados para validar el módulo genético de Nura.

## Archivos

### `NA18525_HanChinese_1000G.txt`

- **Individuo**: NA18525 — Han Chinese de Beijing (población CHB)
- **Fuente**: 1000 Genomes Phase 3, chip Illumina Omni 2.5M
- **Build**: GRCh37 / hg19
- **Formato**: 23andMe v4 plain text (4 columnas tab-separated)
- **SNPs totales**: 713,653
- **Generado con**: `scripts/vcf-to-23andme.py` (streaming desde FTP 1000 Genomes)

## Uso

Subir el archivo `.txt` en la app web Nura como si fuera un archivo 23andMe normal.
El sistema lo procesará igual que cualquier upload de usuario.

## Cobertura HIrisPlex

22 de 41 SNPs del modelo HIrisPlex-S presentes:

| SNP | Genotipo | Modelo | Estado |
|-----|----------|--------|--------|
| rs12913832 | AA | Eye + Hair (HERC2) | ✅ presente |
| rs1800407  | CC | Eye (OCA2) | ✅ presente |
| rs12203592 | CC | Hair (IRF4) | ✅ presente |
| rs1426654  | GG | Skin (SLC24A5) | ✅ presente |
| rs1042602  | CC | Hair (TYR) | ✅ presente |
| rs885479   | AA | Hair/Skin | ✅ presente |
| rs16891982 | — | Skin/Hair (SLC45A2) | ❌ ausente del chip |
| rs1545397  | — | Eye (OCA2) | ❌ ausente del chip |
| rs1805009  | — | Hair MC1R | ❌ ausente del chip |
| rs28777    | — | Skin (SLC45A2) | ❌ ausente del chip |

Los SNPs ausentes corresponden a variantes MC1R raras (rs312262906, rs201326893)
y SNPs de SLC45A2 que el Omni 2.5M no genotipó. No afectan la predicción para
ancestría asiática del este (esas variantes son monomórficas o casi en CHB).

## Fenotipo esperado para NA18525

- **Ojos**: marrón (rs12913832=AA → probabilidad marrón muy alta)
- **Cabello**: negro (CHB, sin alelos MC1R, IRF4 CC)
- **Piel**: intermedia-oscura para asiático del este (rs1426654 GG)
- **Ancestría**: 100% asiático del este

## Limitaciones conocidas

- El chip Omni 2.5M cubre ~713K SNPs con rsID de los 2.4M totales del array.
- No cubre exactamente los mismos loci que 23andMe v4/v5, pero overlap suficiente
  para validar el pipeline de predicción.
- Los 19 SNPs HIrisPlex ausentes son principalmente MC1R raros y SLC45A2 —
  su ausencia no impide la predicción para ancestría asiática del este.

## Fuente original (pública)

```
http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/supporting/hd_genotype_chip/
ALL.chip.omni_broad_sanger_combined.20140818.snps.genotypes.vcf.gz
```

Datos de acceso libre, sin restricciones de uso para investigación.
