/**
 * Poblaciones de referencia y marcadores AIM para cálculo de ancestría.
 *
 * Fuentes:
 *   - 1000 Genomes Project Phase 3 (https://www.internationalgenome.org/)
 *   - Human Genome Diversity Project (HGDP)
 *   - Publicaciones GWAS sobre ancestría latinoamericana (Price et al. 2007, 2010)
 *
 * Los AIMs (Ancestry Informative Markers) son SNPs con frecuencias alélicas
 * muy divergentes entre poblaciones, lo que permite estimar proporciones de ancestría.
 *
 * Frecuencias de alelo de referencia (frecuencia del alelo en la base de 1000 Genomes).
 * Valor 0-1 donde 1 = alelo presente en casi todos los individuos de esa población.
 */

// ── Marcadores AIM — 26 SNPs con alta diferenciación entre poblaciones ──
//
// minorAllele: alelo que popFreq cuantifica (el alelo AIM-informativo).
// majorAllele: alelo complementario (más común globalmente o ancestral).
// popFreq:     frecuencia del minorAllele en cada población de referencia (0-1).
//
// TODO 4.1-B: rs3794102 trackea alelo A (correcto para SAS=0.65); Ensembl minor=G.
//             rs1800795 trackea alelo C (correcto para AFR=0.55); Ensembl minor=G.
//             Estandarizar criterio de selección de alelo cuando se agreguen los ~200 AIMs nuevos.
const AIM_SNPS = {
    // ─ Pigmentación / Melanina ──────────────────────────────────────────
    rs1426654: {
        gene: 'SLC24A5', description: 'Pigmentación clara',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.99, AFR: 0.07, EAS: 0.07, AMR_NAT: 0.45, SAS: 0.75, OCE: 0.18 }
    },
    rs16891982: {
        gene: 'SLC45A2', description: 'Pigmentación europea',
        minorAllele: 'G', majorAllele: 'C',
        popFreq: { EUR: 0.97, AFR: 0.03, EAS: 0.13, AMR_NAT: 0.22, SAS: 0.45, OCE: 0.10 }
    },
    rs1042602: {
        gene: 'TYR', description: 'Pigmentación cutánea',
        minorAllele: 'A', majorAllele: 'C',
        popFreq: { EUR: 0.41, AFR: 0.01, EAS: 0.01, AMR_NAT: 0.18, SAS: 0.08, OCE: 0.05 }
    },
    rs12913832: {
        gene: 'HERC2', description: 'Color de ojos azul',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.63, AFR: 0.03, EAS: 0.02, AMR_NAT: 0.08, SAS: 0.10, OCE: 0.04 }
    },
    rs1805007: {
        gene: 'MC1R', description: 'Cabello pelirrojo / susceptibilidad UV',
        minorAllele: 'A', majorAllele: 'C',
        popFreq: { EUR: 0.11, AFR: 0.00, EAS: 0.00, AMR_NAT: 0.01, SAS: 0.01, OCE: 0.00 }
    },

    // ─ Marcadores africanos ─────────────────────────────────────────────
    rs2814778: {
        gene: 'DARC', description: 'Resistencia a Plasmodium vivax (malaria)',
        minorAllele: 'C', majorAllele: 'T',
        popFreq: { EUR: 0.00, AFR: 0.99, EAS: 0.01, AMR_NAT: 0.02, SAS: 0.03, OCE: 0.02 }
    },
    rs1834640: {
        gene: 'HMGA2', description: 'Marcador de diferenciación África',
        minorAllele: 'G', majorAllele: 'A',
        popFreq: { EUR: 0.23, AFR: 0.98, EAS: 0.03, AMR_NAT: 0.12, SAS: 0.28, OCE: 0.08 }
    },
    rs2402130: {
        gene: 'HBB', description: 'Marcador africano occidental',
        minorAllele: 'G', majorAllele: 'A',
        popFreq: { EUR: 0.13, AFR: 0.97, EAS: 0.23, AMR_NAT: 0.45, SAS: 0.42, OCE: 0.15 }
    },

    // ─ Marcadores asiáticos del Este ────────────────────────────────────
    rs3827760: {
        gene: 'EDAR', description: 'Cabello grueso y glándulas sudoríparas asiáticas',
        minorAllele: 'C', majorAllele: 'A',
        popFreq: { EUR: 0.00, AFR: 0.00, EAS: 0.87, AMR_NAT: 0.75, SAS: 0.05, OCE: 0.20 }
    },
    rs2250072: {
        gene: 'ADH1B', description: 'Metabolismo del alcohol (asiático)',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.23, AFR: 0.02, EAS: 0.89, AMR_NAT: 0.75, SAS: 0.30, OCE: 0.45 }
    },
    rs671: {
        gene: 'ALDH2', description: 'Deficiencia ALDH2 (asiático/amerindio)',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.00, AFR: 0.00, EAS: 0.30, AMR_NAT: 0.12, SAS: 0.02, OCE: 0.10 }
    },
    rs17822931: {
        gene: 'ABCC11', description: 'Tipo de cerumen y bromhidrosis',
        minorAllele: 'T', majorAllele: 'C',
        popFreq: { EUR: 0.03, AFR: 0.02, EAS: 0.87, AMR_NAT: 0.70, SAS: 0.20, OCE: 0.45 }
    },

    // ─ Marcadores amerindios ────────────────────────────────────────────
    rs4778241: {
        gene: 'OCA2', description: 'Diferenciación amerindia',
        minorAllele: 'A', majorAllele: 'C',
        popFreq: { EUR: 0.43, AFR: 0.01, EAS: 0.22, AMR_NAT: 0.35, SAS: 0.15, OCE: 0.20 }
    },
    rs7554936: {
        gene: 'ABCG2', description: 'Marcador diferenciación amerindia',
        minorAllele: 'C', majorAllele: 'T',
        popFreq: { EUR: 0.10, AFR: 0.05, EAS: 0.28, AMR_NAT: 0.55, SAS: 0.12, OCE: 0.30 }
    },
    rs10883099: {
        gene: 'COMT', description: 'Frecuencia diferencial amerindia',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.47, AFR: 0.32, EAS: 0.68, AMR_NAT: 0.72, SAS: 0.55, OCE: 0.60 }
    },

    // ─ Marcadores del Sur de Asia ───────────────────────────────────────
    rs3794102: {
        gene: 'HLA-region', description: 'Marcador sur-asiático HLA',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.25, AFR: 0.18, EAS: 0.12, AMR_NAT: 0.08, SAS: 0.65, OCE: 0.15 }
    },
    rs2187668: {
        gene: 'HLA-DQA1', description: 'HLA-DQ2.5 (también celiaquía)',
        minorAllele: 'T', majorAllele: 'C',
        popFreq: { EUR: 0.20, AFR: 0.05, EAS: 0.02, AMR_NAT: 0.05, SAS: 0.22, OCE: 0.03 }
    },

    // ─ Marcadores de Oceanía / Polinesio ────────────────────────────────
    rs9268516: {
        gene: 'HLA-C', description: 'Marcador diferenciación oceánica',
        minorAllele: 'T', majorAllele: 'C',
        popFreq: { EUR: 0.30, AFR: 0.25, EAS: 0.35, AMR_NAT: 0.20, SAS: 0.28, OCE: 0.72 }
    },

    // ─ Marcadores metabólicos con fuerte diferenciación ─────────────────
    rs4988235: {
        gene: 'MCM6', description: 'Persistencia de lactasa (europeos vs otros)',
        minorAllele: 'G', majorAllele: 'A',
        popFreq: { EUR: 0.72, AFR: 0.15, EAS: 0.05, AMR_NAT: 0.10, SAS: 0.30, OCE: 0.08 }
    },
    rs7903146: {
        gene: 'TCF7L2', description: 'Riesgo diabetes T2 diferencial',
        minorAllele: 'T', majorAllele: 'C',
        popFreq: { EUR: 0.28, AFR: 0.35, EAS: 0.07, AMR_NAT: 0.12, SAS: 0.25, OCE: 0.15 }
    },
    rs1800562: {
        gene: 'HFE', description: 'Hemocromatosis (europeo norte)',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.07, AFR: 0.00, EAS: 0.00, AMR_NAT: 0.01, SAS: 0.01, OCE: 0.00 }
    },
    rs762551: {
        gene: 'CYP1A2', description: 'Metabolismo cafeína diferencial',
        minorAllele: 'A', majorAllele: 'C',
        popFreq: { EUR: 0.68, AFR: 0.42, EAS: 0.55, AMR_NAT: 0.58, SAS: 0.60, OCE: 0.50 }
    },
    rs1801133: {
        gene: 'MTHFR', description: 'MTHFR C677T diferenciación',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.34, AFR: 0.12, EAS: 0.40, AMR_NAT: 0.45, SAS: 0.28, OCE: 0.30 }
    },

    // ─ Marcadores de cromosoma Y/mtDNA-like SNPs autosómicos ligados ────
    rs1800795: {
        gene: 'IL6', description: 'Respuesta inflamatoria IL-6',
        minorAllele: 'C', majorAllele: 'G',
        popFreq: { EUR: 0.40, AFR: 0.55, EAS: 0.32, AMR_NAT: 0.38, SAS: 0.42, OCE: 0.35 }
    },
    rs2282679: {
        gene: 'GC', description: 'Vitamina D binding protein',
        minorAllele: 'G', majorAllele: 'T',
        popFreq: { EUR: 0.28, AFR: 0.62, EAS: 0.18, AMR_NAT: 0.25, SAS: 0.35, OCE: 0.22 }
    },
    rs4680: {
        gene: 'COMT', description: 'COMT Val158Met',
        minorAllele: 'A', majorAllele: 'G',
        popFreq: { EUR: 0.50, AFR: 0.28, EAS: 0.65, AMR_NAT: 0.55, SAS: 0.48, OCE: 0.50 }
    }
};

// ── Definición de poblaciones y sub-poblaciones ────────────────────────
const POPULATIONS = {
    EUR: {
        name:  'Europeo',
        nameEs: 'Europeo',
        flag:  '🇪🇺',
        color: '#AFA9EC',
        subpopulations: {
            EUR_SOUTH: { name: 'Europa del Sur (España, Italia, Portugal)', flag: '🇪🇸🇮🇹' },
            EUR_WEST:  { name: 'Europa del Oeste (Francia, Alemania, Reino Unido)', flag: '🇫🇷🇩🇪' },
            EUR_NORTH: { name: 'Europa del Norte (Escandinavia)', flag: '🇸🇪🇳🇴🇩🇰' },
            EUR_EAST:  { name: 'Europa del Este', flag: '🇵🇱🇺🇦🇷🇴' }
        }
    },
    AFR: {
        name: 'Africano',
        nameEs: 'Africano',
        flag: '🌍',
        color: '#F4A6A6',
        subpopulations: {
            AFR_WEST:  { name: 'África Occidental', flag: '🇳🇬🇬🇭🇸🇳' },
            AFR_EAST:  { name: 'África Oriental', flag: '🇰🇪🇪🇹🇹🇿' },
            AFR_NORTH: { name: 'África del Norte', flag: '🇲🇦🇪🇬🇩🇿' },
            AFR_SOUTH: { name: 'África del Sur', flag: '🇿🇦' }
        }
    },
    EAS: {
        name: 'Asiático del Este',
        nameEs: 'Asiático del Este',
        flag: '🌏',
        color: '#FFD77A',
        subpopulations: {
            EAS_CHN: { name: 'China', flag: '🇨🇳' },
            EAS_JPN: { name: 'Japón', flag: '🇯🇵' },
            EAS_KOR: { name: 'Corea', flag: '🇰🇷' },
            EAS_VIE: { name: 'Vietnam / Sudeste Asiático', flag: '🇻🇳🇹🇭' }
        }
    },
    SAS: {
        name: 'Sur de Asia',
        nameEs: 'Sur de Asia',
        flag: '🌏',
        color: '#FDB5B5',
        subpopulations: {
            SAS_IND: { name: 'India', flag: '🇮🇳' },
            SAS_PAK: { name: 'Pakistán / Bangladés', flag: '🇵🇰🇧🇩' },
            SAS_SRI: { name: 'Sri Lanka', flag: '🇱🇰' }
        }
    },
    AMR_NAT: {
        name: 'Amerindio',
        nameEs: 'Amerindio / Nativo Americano',
        flag: '🌎',
        color: '#A8E6CF',
        subpopulations: {
            AMR_CHILE:  { name: 'Pueblos de Chile (Mapuche, Aymara, Diaguita, Rapa Nui)', flag: '🇨🇱' },
            AMR_ANDES:  { name: 'Andino (Quechua, Aymara, Inca)', flag: '🇵🇪🇧🇴' },
            AMR_AMAZON: { name: 'Amazónico', flag: '🌳' },
            AMR_MESO:   { name: 'Mesoamericano (Maya, Azteca, Nahua)', flag: '🇲🇽🇬🇹' },
            AMR_NORTH:  { name: 'Nativo Norteamericano', flag: '🇺🇸🇨🇦' }
        }
    },
    OCE: {
        name: 'Oceánico',
        nameEs: 'Oceánico',
        flag: '🌊',
        color: '#B5D8F5',
        subpopulations: {
            OCE_POL: { name: 'Polinesio (Rapa Nui, Hawaii, Nueva Zelanda)', flag: '🌺' },
            OCE_MEL: { name: 'Melanesio (Papua Nueva Guinea, Fiji)', flag: '🇵🇬' },
            OCE_AUS: { name: 'Australiano-aborígen', flag: '🇦🇺' }
        }
    }
};

module.exports = { AIM_SNPS, POPULATIONS };
