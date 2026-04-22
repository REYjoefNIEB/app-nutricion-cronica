// ─────────────────────────────────────────────────────────────────────────────
// referenceData_v2.js — NURA ancestry reference data (K=9 sub-populations)
//
// Generated: 2026-04-22T05:04:23.204Z
// Script:    scripts/ancestry-data-v2/03-generate-referenceData-v2.js
// Source:    Verdugo et al 2020 (Biol Res 53:15) + 1000G Phase 3 (Ensembl REST)
//
// DO NOT EDIT MANUALLY — regenerate with the script if source data changes.
//
// LIMITATIONS:
//   - AMR_NAT uses PEL (1000G) as proxy (~77% Andean Amerindian + ~23% European).
//     Does not distinguish Aymara vs Mapuche.
//     Upgrade pending: see documentacion/TODO-upgrade-amerindian-refdata.md
//   - EUR_E (Eastern European/Slavic) excluded — no clean 1000G superpop available.
//   - OCE (Oceanian) excluded — outside scope of CLG panel designed for Chileans.
//     Legacy macro-region mapping returns OCE = 0.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const VERSION = 'v2-CLG141-K9-2026-04-22';

// K=9 sub-populations
const POPULATIONS = [
    'EUR_N', 'EUR_S',
    'AFR_W', 'AFR_E',
    'EAS_CN', 'EAS_JP',
    'SAS',
    'AMR_NAT'
];

const POPULATION_LABELS = {
    EUR_N:   'Europeo Norte/Centro (Germano-Escandinavo)',
    EUR_S:   'Europeo Sur (Ibérico-Italiano)',
    AFR_W:   'Africano Oeste (Yoruba, Mandé, Bantú Oeste)',
    AFR_E:   'Africano Este (Luhya, Kikuyu)',
    EAS_CN:  'Asiático Chino (Han)',
    EAS_JP:  'Asiático Japonés',
    SAS:     'Sur Asiático (Indio, Paquistaní, Sri Lanka)',
    AMR_NAT: 'Amerindio Andino (proxy PEL — Aymara+Mapuche fusionados)'
};

// Sub-population → legacy macro-region (v1 retrocompatibility)
const MACRO_REGION = {
    EUR_N:   'EUR',
    EUR_S:   'EUR',
    AFR_W:   'AFR',
    AFR_E:   'AFR',
    EAS_CN:  'EAS',
    EAS_JP:  'EAS',
    SAS:     'SAS',
    AMR_NAT: 'AMR_NAT'
};

// 141 AIMs from the CLG panel (Verdugo et al 2020)
// Each AIM has:
//   rsid, chromosome, position, minorAllele, majorAllele, MAF_chile
//   frequencies: frequency of minorAllele (A1 from CLG) in each sub-population
const AIMS = [
  {
    "rsid": "rs12142199",
    "chromosome": "1",
    "position": 1249187,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.43360000000000004,
    "frequencies": {
      "EUR_N": 0.792208,
      "EUR_S": 0.82243,
      "AFR_W": 0.032129,
      "AFR_E": 0.065657,
      "EAS_CN": 0.021706,
      "EAS_JP": 0.004808,
      "SAS": 0.339573,
      "AMR_NAT": 0.176471
    }
  },
  {
    "rsid": "rs4908343",
    "chromosome": "1",
    "position": 27931698,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1663,
    "frequencies": {
      "EUR_N": 0,
      "EUR_S": 0,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0,
      "AMR_NAT": 0
    }
  },
  {
    "rsid": "rs1298637",
    "chromosome": "1",
    "position": 53958603,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.1933,
    "frequencies": {
      "EUR_N": 0.264828,
      "EUR_S": 0.296729,
      "AFR_W": 0.981326,
      "AFR_E": 0.959596,
      "EAS_CN": 0.465696,
      "EAS_JP": 0.557692,
      "SAS": 0.444875,
      "AMR_NAT": 0.117647
    }
  },
  {
    "rsid": "rs12135529",
    "chromosome": "1",
    "position": 84293113,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.3844,
    "frequencies": {
      "EUR_N": 0.739335,
      "EUR_S": 0.609813,
      "AFR_W": 0.865706,
      "AFR_E": 0.89899,
      "EAS_CN": 0.389367,
      "EAS_JP": 0.278846,
      "SAS": 0.58501,
      "AMR_NAT": 0.235294
    }
  },
  {
    "rsid": "rs10874946",
    "chromosome": "1",
    "position": 96236784,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.41,
    "frequencies": {
      "EUR_N": 0.223036,
      "EUR_S": 0.168224,
      "AFR_W": 0.350674,
      "AFR_E": 0.343434,
      "EAS_CN": 0.358645,
      "EAS_JP": 0.471154,
      "SAS": 0.366143,
      "AMR_NAT": 0.405882
    }
  },
  {
    "rsid": "rs6660743",
    "chromosome": "1",
    "position": 116949306,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.06609000000000001,
    "frequencies": {
      "EUR_N": 0.03441,
      "EUR_S": 0.03271,
      "AFR_W": 0.955965,
      "AFR_E": 0.939394,
      "EAS_CN": 0.055178,
      "EAS_JP": 0.052885,
      "SAS": 0.044907,
      "AMR_NAT": 0.117647
    }
  },
  {
    "rsid": "rs4845584",
    "chromosome": "1",
    "position": 153885261,
    "minorAllele": "A",
    "majorAllele": "C",
    "MAF_chile": 0.2561,
    "frequencies": {
      "EUR_N": 0.029212,
      "EUR_S": 0.03972,
      "AFR_W": 0.027107,
      "AFR_E": 0.020202,
      "EAS_CN": 0.158715,
      "EAS_JP": 0.1875,
      "SAS": 0.18507,
      "AMR_NAT": 0.223529
    }
  },
  {
    "rsid": "rs2814778",
    "chromosome": "1",
    "position": 159174683,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.02876,
    "frequencies": {
      "EUR_N": 0,
      "EUR_S": 0.014019,
      "AFR_W": 0.998843,
      "AFR_E": 1,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0,
      "AMR_NAT": 0.041176
    }
  },
  {
    "rsid": "rs17505819",
    "chromosome": "1",
    "position": 185740656,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.15710000000000002,
    "frequencies": {
      "EUR_N": 0.281811,
      "EUR_S": 0.313084,
      "AFR_W": 0.901713,
      "AFR_E": 0.919192,
      "EAS_CN": 0.03613,
      "EAS_JP": 0.019231,
      "SAS": 0.310992,
      "AMR_NAT": 0.123529
    }
  },
  {
    "rsid": "rs3738800",
    "chromosome": "1",
    "position": 212960866,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4998,
    "frequencies": {
      "EUR_N": 0.85261,
      "EUR_S": 0.796729,
      "AFR_W": 0.988639,
      "AFR_E": 0.964646,
      "EAS_CN": 0.603629,
      "EAS_JP": 0.677885,
      "SAS": 0.791344,
      "AMR_NAT": 0.258824
    }
  },
  {
    "rsid": "rs118023864",
    "chromosome": "1",
    "position": 231987419,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.20090000000000002,
    "frequencies": {
      "EUR_N": 0.005051,
      "EUR_S": 0,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.048081,
      "EAS_JP": 0.115385,
      "SAS": 0.005208,
      "AMR_NAT": 0.152941
    }
  },
  {
    "rsid": "rs622815",
    "chromosome": "1",
    "position": 234358216,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1772,
    "frequencies": {
      "EUR_N": 0.244626,
      "EUR_S": 0.221963,
      "AFR_W": 0.909196,
      "AFR_E": 0.863636,
      "EAS_CN": 0.009616,
      "EAS_JP": 0.019231,
      "SAS": 0.121012,
      "AMR_NAT": 0.105882
    }
  },
  {
    "rsid": "rs6759202",
    "chromosome": "2",
    "position": 2372168,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.3337,
    "frequencies": {
      "EUR_N": 0.045455,
      "EUR_S": 0.028037,
      "AFR_W": 0.20631,
      "AFR_E": 0.272727,
      "EAS_CN": 0.269348,
      "EAS_JP": 0.259615,
      "SAS": 0.137276,
      "AMR_NAT": 0.476471
    }
  },
  {
    "rsid": "rs13021734",
    "chromosome": "2",
    "position": 8118123,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.2036,
    "frequencies": {
      "EUR_N": 0.253635,
      "EUR_S": 0.268692,
      "AFR_W": 0.923236,
      "AFR_E": 0.939394,
      "EAS_CN": 0.360703,
      "EAS_JP": 0.365385,
      "SAS": 0.349833,
      "AMR_NAT": 0.170588
    }
  },
  {
    "rsid": "rs7596222",
    "chromosome": "2",
    "position": 39611382,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.09813000000000001,
    "frequencies": {
      "EUR_N": 0.029212,
      "EUR_S": 0.025701,
      "AFR_W": 0.829997,
      "AFR_E": 0.707071,
      "EAS_CN": 0.086593,
      "EAS_JP": 0.100962,
      "SAS": 0.091929,
      "AMR_NAT": 0.123529
    }
  },
  {
    "rsid": "rs72897942",
    "chromosome": "2",
    "position": 71194556,
    "minorAllele": "C",
    "majorAllele": "A",
    "MAF_chile": 0.03309,
    "frequencies": {
      "EUR_N": 0.031043,
      "EUR_S": 0.051402,
      "AFR_W": 0.765362,
      "AFR_E": 0.641414,
      "EAS_CN": 0.007235,
      "EAS_JP": 0.009615,
      "SAS": 0.113149,
      "AMR_NAT": 0.035294
    }
  },
  {
    "rsid": "rs78509428",
    "chromosome": "2",
    "position": 100134353,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.22870000000000001,
    "frequencies": {
      "EUR_N": 0.026141,
      "EUR_S": 0.016355,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0.015844,
      "AMR_NAT": 0.305882
    }
  },
  {
    "rsid": "rs260699",
    "chromosome": "2",
    "position": 109567445,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.4877,
    "frequencies": {
      "EUR_N": 0.84756,
      "EUR_S": 0.857477,
      "AFR_W": 0.199842,
      "AFR_E": 0.171717,
      "EAS_CN": 0.035945,
      "EAS_JP": 0.033654,
      "SAS": 0.800758,
      "AMR_NAT": 0.182353
    }
  },
  {
    "rsid": "rs1036543",
    "chromosome": "2",
    "position": 133676214,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.4186,
    "frequencies": {
      "EUR_N": 0.049858,
      "EUR_S": 0.046729,
      "AFR_W": 0.725625,
      "AFR_E": 0.671717,
      "EAS_CN": 0.432732,
      "EAS_JP": 0.514423,
      "SAS": 0.039635,
      "AMR_NAT": 0.670588
    }
  },
  {
    "rsid": "rs10497281",
    "chromosome": "2",
    "position": 167016102,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.37220000000000003,
    "frequencies": {
      "EUR_N": 0.0153,
      "EUR_S": 0.004673,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.189667,
      "EAS_JP": 0.144231,
      "SAS": 0.024795,
      "AMR_NAT": 0.588235
    }
  },
  {
    "rsid": "rs58321030",
    "chromosome": "2",
    "position": 202975501,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.2816,
    "frequencies": {
      "EUR_N": 0.04773,
      "EUR_S": 0.046729,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.307582,
      "EAS_JP": 0.360577,
      "SAS": 0.05754,
      "AMR_NAT": 0.217647
    }
  },
  {
    "rsid": "rs849263",
    "chromosome": "2",
    "position": 206278900,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.03866,
    "frequencies": {
      "EUR_N": 0.031635,
      "EUR_S": 0.065421,
      "AFR_W": 0.61986,
      "AFR_E": 0.671717,
      "EAS_CN": 0.026375,
      "EAS_JP": 0.004808,
      "SAS": 0.058315,
      "AMR_NAT": 0.052941
    }
  },
  {
    "rsid": "rs28497373",
    "chromosome": "2",
    "position": 239417840,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.07780000000000001,
    "frequencies": {
      "EUR_N": 0.073871,
      "EUR_S": 0.086449,
      "AFR_W": 0.849965,
      "AFR_E": 0.858586,
      "EAS_CN": 0.220573,
      "EAS_JP": 0.278846,
      "SAS": 0.196138,
      "AMR_NAT": 0.088235
    }
  },
  {
    "rsid": "rs74895924",
    "chromosome": "3",
    "position": 2134399,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3486,
    "frequencies": {
      "EUR_N": 0.04773,
      "EUR_S": 0.042056,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.120203,
      "EAS_JP": 0.105769,
      "SAS": 0.112368,
      "AMR_NAT": 0.241176
    }
  },
  {
    "rsid": "rs1517378",
    "chromosome": "3",
    "position": 6042658,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.22610000000000002,
    "frequencies": {
      "EUR_N": 0.28725,
      "EUR_S": 0.366822,
      "AFR_W": 0.912525,
      "AFR_E": 0.848485,
      "EAS_CN": 0.264355,
      "EAS_JP": 0.346154,
      "SAS": 0.505101,
      "AMR_NAT": 0.105882
    }
  },
  {
    "rsid": "rs2290532",
    "chromosome": "3",
    "position": 31789582,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.3739,
    "frequencies": {
      "EUR_N": 0.501388,
      "EUR_S": 0.63785,
      "AFR_W": 0.967011,
      "AFR_E": 0.979798,
      "EAS_CN": 0.20927,
      "EAS_JP": 0.25,
      "SAS": 0.48249,
      "AMR_NAT": 0.264706
    }
  },
  {
    "rsid": "rs35416537",
    "chromosome": "3",
    "position": 53243913,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.4168,
    "frequencies": {
      "EUR_N": 0.222648,
      "EUR_S": 0.214953,
      "AFR_W": 0.082411,
      "AFR_E": 0.070707,
      "EAS_CN": 0.560125,
      "EAS_JP": 0.697115,
      "SAS": 0.351182,
      "AMR_NAT": 0.329412
    }
  },
  {
    "rsid": "rs7631391",
    "chromosome": "3",
    "position": 64514393,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.4368,
    "frequencies": {
      "EUR_N": 0.012626,
      "EUR_S": 0.009346,
      "AFR_W": 0.124125,
      "AFR_E": 0.085859,
      "EAS_CN": 0.264632,
      "EAS_JP": 0.240385,
      "SAS": 0.044305,
      "AMR_NAT": 0.717647
    }
  },
  {
    "rsid": "rs937878",
    "chromosome": "3",
    "position": 96472739,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4121,
    "frequencies": {
      "EUR_N": 0.173382,
      "EUR_S": 0.196262,
      "AFR_W": 0.970853,
      "AFR_E": 0.959596,
      "EAS_CN": 0.305432,
      "EAS_JP": 0.346154,
      "SAS": 0.251257,
      "AMR_NAT": 0.464706
    }
  },
  {
    "rsid": "rs1920623",
    "chromosome": "3",
    "position": 123941100,
    "minorAllele": "A",
    "majorAllele": "C",
    "MAF_chile": 0.3632,
    "frequencies": {
      "EUR_N": 0.108133,
      "EUR_S": 0.158879,
      "AFR_W": 0.320749,
      "AFR_E": 0.510101,
      "EAS_CN": 0.713708,
      "EAS_JP": 0.769231,
      "SAS": 0.313548,
      "AMR_NAT": 0.441176
    }
  },
  {
    "rsid": "rs6780938",
    "chromosome": "3",
    "position": 129401505,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.29650000000000004,
    "frequencies": {
      "EUR_N": 0.184519,
      "EUR_S": 0.189252,
      "AFR_W": 0.97063,
      "AFR_E": 0.929293,
      "EAS_CN": 0.525821,
      "EAS_JP": 0.5,
      "SAS": 0.235452,
      "AMR_NAT": 0.329412
    }
  },
  {
    "rsid": "rs6764190",
    "chromosome": "3",
    "position": 153258272,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.4963,
    "frequencies": {
      "EUR_N": 0.288545,
      "EUR_S": 0.299065,
      "AFR_W": 0.940892,
      "AFR_E": 0.843434,
      "EAS_CN": 0.377693,
      "EAS_JP": 0.495192,
      "SAS": 0.486358,
      "AMR_NAT": 0.694118
    }
  },
  {
    "rsid": "rs3774061",
    "chromosome": "3",
    "position": 185964708,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.12510000000000002,
    "frequencies": {
      "EUR_N": 0.199671,
      "EUR_S": 0.205607,
      "AFR_W": 0.858136,
      "AFR_E": 0.848485,
      "EAS_CN": 0.091355,
      "EAS_JP": 0.028846,
      "SAS": 0.15893,
      "AMR_NAT": 0.088235
    }
  },
  {
    "rsid": "rs3822225",
    "chromosome": "4",
    "position": 13483049,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.481,
    "frequencies": {
      "EUR_N": 0.659174,
      "EUR_S": 0.75,
      "AFR_W": 0.990163,
      "AFR_E": 0.994949,
      "EAS_CN": 0.398937,
      "EAS_JP": 0.379808,
      "SAS": 0.668222,
      "AMR_NAT": 0.347059
    }
  },
  {
    "rsid": "rs1380815",
    "chromosome": "4",
    "position": 21552230,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.3065,
    "frequencies": {
      "EUR_N": 0.032875,
      "EUR_S": 0.042056,
      "AFR_W": 0.017462,
      "AFR_E": 0.035354,
      "EAS_CN": 0.173324,
      "EAS_JP": 0.100962,
      "SAS": 0.133605,
      "AMR_NAT": 0.311765
    }
  },
  {
    "rsid": "rs4623048",
    "chromosome": "4",
    "position": 41833487,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.13520000000000001,
    "frequencies": {
      "EUR_N": 0.177045,
      "EUR_S": 0.228972,
      "AFR_W": 0.970968,
      "AFR_E": 0.909091,
      "EAS_CN": 0.05994,
      "EAS_JP": 0.048077,
      "SAS": 0.194981,
      "AMR_NAT": 0.129412
    }
  },
  {
    "rsid": "rs1532948",
    "chromosome": "4",
    "position": 63728612,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1177,
    "frequencies": {
      "EUR_N": 0.058275,
      "EUR_S": 0.049065,
      "AFR_W": 0.76717,
      "AFR_E": 0.681818,
      "EAS_CN": 0.280883,
      "EAS_JP": 0.259615,
      "SAS": 0.103627,
      "AMR_NAT": 0.217647
    }
  },
  {
    "rsid": "rs12502954",
    "chromosome": "4",
    "position": 91527074,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.2802,
    "frequencies": {
      "EUR_N": 0.041588,
      "EUR_S": 0.016355,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.086546,
      "EAS_JP": 0.105769,
      "SAS": 0.045893,
      "AMR_NAT": 0.352941
    }
  },
  {
    "rsid": "rs6834049",
    "chromosome": "4",
    "position": 97906295,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.20120000000000002,
    "frequencies": {
      "EUR_N": 0.206201,
      "EUR_S": 0.287383,
      "AFR_W": 0.827765,
      "AFR_E": 0.787879,
      "EAS_CN": 0.117684,
      "EAS_JP": 0.072115,
      "SAS": 0.358729,
      "AMR_NAT": 0.1
    }
  },
  {
    "rsid": "rs4833757",
    "chromosome": "4",
    "position": 122633535,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.4419,
    "frequencies": {
      "EUR_N": 0.764384,
      "EUR_S": 0.792056,
      "AFR_W": 0.824945,
      "AFR_E": 0.772727,
      "EAS_CN": 0.44436,
      "EAS_JP": 0.365385,
      "SAS": 0.770643,
      "AMR_NAT": 0.229412
    }
  },
  {
    "rsid": "rs4577554",
    "chromosome": "4",
    "position": 151531352,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.07975,
    "frequencies": {
      "EUR_N": 0.081789,
      "EUR_S": 0.084112,
      "AFR_W": 0.890085,
      "AFR_E": 0.929293,
      "EAS_CN": 0.245307,
      "EAS_JP": 0.211538,
      "SAS": 0.35892,
      "AMR_NAT": 0.064706
    }
  },
  {
    "rsid": "rs12504267",
    "chromosome": "4",
    "position": 165251843,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.4012,
    "frequencies": {
      "EUR_N": 0.079513,
      "EUR_S": 0.046729,
      "AFR_W": 0.176525,
      "AFR_E": 0.227273,
      "EAS_CN": 0.43969,
      "EAS_JP": 0.375,
      "SAS": 0.305613,
      "AMR_NAT": 0.541176
    }
  },
  {
    "rsid": "rs2574904",
    "chromosome": "4",
    "position": 177844568,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.1691,
    "frequencies": {
      "EUR_N": 0.155955,
      "EUR_S": 0.191589,
      "AFR_W": 0.856577,
      "AFR_E": 0.843434,
      "EAS_CN": 0.043412,
      "EAS_JP": 0.033654,
      "SAS": 0.332022,
      "AMR_NAT": 0.229412
    }
  },
  {
    "rsid": "rs378257",
    "chromosome": "5",
    "position": 2518738,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.1625,
    "frequencies": {
      "EUR_N": 0.176453,
      "EUR_S": 0.266355,
      "AFR_W": 0.950395,
      "AFR_E": 0.924242,
      "EAS_CN": 0.422561,
      "EAS_JP": 0.307692,
      "SAS": 0.254738,
      "AMR_NAT": 0.105882
    }
  },
  {
    "rsid": "rs35397",
    "chromosome": "5",
    "position": 33951116,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.4979,
    "frequencies": {
      "EUR_N": 0.051985,
      "EUR_S": 0.119159,
      "AFR_W": 0.946765,
      "AFR_E": 0.944444,
      "EAS_CN": 0.963962,
      "EAS_JP": 0.971154,
      "SAS": 0.833205,
      "AMR_NAT": 0.829412
    }
  },
  {
    "rsid": "rs17529085",
    "chromosome": "5",
    "position": 60368781,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.33690000000000003,
    "frequencies": {
      "EUR_N": 0.122341,
      "EUR_S": 0.067757,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0.033976,
      "AMR_NAT": 0.447059
    }
  },
  {
    "rsid": "rs2972201",
    "chromosome": "5",
    "position": 72636566,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.2152,
    "frequencies": {
      "EUR_N": 0.221556,
      "EUR_S": 0.224299,
      "AFR_W": 0.970524,
      "AFR_E": 0.924242,
      "EAS_CN": 0.579034,
      "EAS_JP": 0.538462,
      "SAS": 0.167811,
      "AMR_NAT": 0.141176
    }
  },
  {
    "rsid": "rs244430",
    "chromosome": "5",
    "position": 110106634,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.22030000000000002,
    "frequencies": {
      "EUR_N": 0.114663,
      "EUR_S": 0.17757,
      "AFR_W": 0.750679,
      "AFR_E": 0.611111,
      "EAS_CN": 0.271775,
      "EAS_JP": 0.269231,
      "SAS": 0.038261,
      "AMR_NAT": 0.405882
    }
  },
  {
    "rsid": "rs115969489",
    "chromosome": "5",
    "position": 126009267,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.29460000000000003,
    "frequencies": {
      "EUR_N": 0.051245,
      "EUR_S": 0.049065,
      "AFR_W": 0.056283,
      "AFR_E": 0.121212,
      "EAS_CN": 0.531276,
      "EAS_JP": 0.620192,
      "SAS": 0.109698,
      "AMR_NAT": 0.382353
    }
  },
  {
    "rsid": "rs7736578",
    "chromosome": "5",
    "position": 142142348,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.232,
    "frequencies": {
      "EUR_N": 0.084564,
      "EUR_S": 0.156542,
      "AFR_W": 0.979115,
      "AFR_E": 0.989899,
      "EAS_CN": 0.300485,
      "EAS_JP": 0.365385,
      "SAS": 0.261132,
      "AMR_NAT": 0.229412
    }
  },
  {
    "rsid": "rs11134558",
    "chromosome": "5",
    "position": 168522312,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.4409,
    "frequencies": {
      "EUR_N": 0.122489,
      "EUR_S": 0.130841,
      "AFR_W": 0.348123,
      "AFR_E": 0.368687,
      "EAS_CN": 0.276768,
      "EAS_JP": 0.375,
      "SAS": 0.134091,
      "AMR_NAT": 0.464706
    }
  },
  {
    "rsid": "rs6875659",
    "chromosome": "5",
    "position": 175158653,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.07474,
    "frequencies": {
      "EUR_N": 0.061938,
      "EUR_S": 0.121495,
      "AFR_W": 0.979322,
      "AFR_E": 0.924242,
      "EAS_CN": 0.062506,
      "EAS_JP": 0.019231,
      "SAS": 0.085873,
      "AMR_NAT": 0.094118
    }
  },
  {
    "rsid": "rs10793841",
    "chromosome": "6",
    "position": 3285286,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.20700000000000002,
    "frequencies": {
      "EUR_N": 0.093425,
      "EUR_S": 0.140187,
      "AFR_W": 0.94665,
      "AFR_E": 0.89899,
      "EAS_CN": 0.456727,
      "EAS_JP": 0.451923,
      "SAS": 0.380821,
      "AMR_NAT": 0.235294
    }
  },
  {
    "rsid": "rs1535001",
    "chromosome": "6",
    "position": 34927280,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.36210000000000003,
    "frequencies": {
      "EUR_N": 0.230418,
      "EUR_S": 0.36215,
      "AFR_W": 0.982743,
      "AFR_E": 0.984848,
      "EAS_CN": 0.730282,
      "EAS_JP": 0.610577,
      "SAS": 0.41393,
      "AMR_NAT": 0.3
    }
  },
  {
    "rsid": "rs9445980",
    "chromosome": "6",
    "position": 68930738,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.20950000000000002,
    "frequencies": {
      "EUR_N": 0.350039,
      "EUR_S": 0.352804,
      "AFR_W": 0.810693,
      "AFR_E": 0.686869,
      "EAS_CN": 0.127485,
      "EAS_JP": 0.076923,
      "SAS": 0.187899,
      "AMR_NAT": 0.094118
    }
  },
  {
    "rsid": "rs4120910",
    "chromosome": "6",
    "position": 102323696,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.3005,
    "frequencies": {
      "EUR_N": 0.037629,
      "EUR_S": 0.016355,
      "AFR_W": 0.245158,
      "AFR_E": 0.272727,
      "EAS_CN": 0.543412,
      "EAS_JP": 0.524038,
      "SAS": 0.18682,
      "AMR_NAT": 0.488235
    }
  },
  {
    "rsid": "rs9486092",
    "chromosome": "6",
    "position": 105883147,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.2305,
    "frequencies": {
      "EUR_N": 0.39751,
      "EUR_S": 0.42757,
      "AFR_W": 0.969628,
      "AFR_E": 0.969697,
      "EAS_CN": 0.016805,
      "EAS_JP": 0.028846,
      "SAS": 0.42075,
      "AMR_NAT": 0.1
    }
  },
  {
    "rsid": "rs9401838",
    "chromosome": "6",
    "position": 125961396,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1671,
    "frequencies": {
      "EUR_N": 0.246013,
      "EUR_S": 0.292056,
      "AFR_W": 0.874736,
      "AFR_E": 0.853535,
      "EAS_CN": 0.139112,
      "EAS_JP": 0.125,
      "SAS": 0.269973,
      "AMR_NAT": 0.105882
    }
  },
  {
    "rsid": "rs4869782",
    "chromosome": "6",
    "position": 150303241,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.45790000000000003,
    "frequencies": {
      "EUR_N": 0.112536,
      "EUR_S": 0.11215,
      "AFR_W": 0.928648,
      "AFR_E": 0.939394,
      "EAS_CN": 0.692141,
      "EAS_JP": 0.6875,
      "SAS": 0.289766,
      "AMR_NAT": 0.623529
    }
  },
  {
    "rsid": "rs3777722",
    "chromosome": "6",
    "position": 167352104,
    "minorAllele": "A",
    "majorAllele": "C",
    "MAF_chile": 0.3245,
    "frequencies": {
      "EUR_N": 0.12432,
      "EUR_S": 0.079439,
      "AFR_W": 0.03377,
      "AFR_E": 0,
      "EAS_CN": 0.413685,
      "EAS_JP": 0.370192,
      "SAS": 0.324257,
      "AMR_NAT": 0.376471
    }
  },
  {
    "rsid": "rs6463531",
    "chromosome": "7",
    "position": 6255327,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4198,
    "frequencies": {
      "EUR_N": 0.122489,
      "EUR_S": 0.133178,
      "AFR_W": 0.904663,
      "AFR_E": 0.823232,
      "EAS_CN": 0.788766,
      "EAS_JP": 0.807692,
      "SAS": 0.396338,
      "AMR_NAT": 0.641176
    }
  },
  {
    "rsid": "rs1858940",
    "chromosome": "7",
    "position": 20636239,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.443,
    "frequencies": {
      "EUR_N": 0.741314,
      "EUR_S": 0.696262,
      "AFR_W": 0.83267,
      "AFR_E": 0.787879,
      "EAS_CN": 0.24503,
      "EAS_JP": 0.197115,
      "SAS": 0.582314,
      "AMR_NAT": 0.364706
    }
  },
  {
    "rsid": "rs2267740",
    "chromosome": "7",
    "position": 31137003,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.1009,
    "frequencies": {
      "EUR_N": 0.091742,
      "EUR_S": 0.116822,
      "AFR_W": 0.8053,
      "AFR_E": 0.752525,
      "EAS_CN": 0.297596,
      "EAS_JP": 0.110577,
      "SAS": 0.127963,
      "AMR_NAT": 0.123529
    }
  },
  {
    "rsid": "rs10226579",
    "chromosome": "7",
    "position": 64865118,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.4143,
    "frequencies": {
      "EUR_N": 0.129963,
      "EUR_S": 0.203271,
      "AFR_W": 0.546613,
      "AFR_E": 0.429293,
      "EAS_CN": 0.334235,
      "EAS_JP": 0.283654,
      "SAS": 0.204224,
      "AMR_NAT": 0.647059
    }
  },
  {
    "rsid": "rs10488003",
    "chromosome": "7",
    "position": 90747682,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.42710000000000004,
    "frequencies": {
      "EUR_N": 0.175713,
      "EUR_S": 0.133178,
      "AFR_W": 0.277549,
      "AFR_E": 0.237374,
      "EAS_CN": 0.559986,
      "EAS_JP": 0.5,
      "SAS": 0.297832,
      "AMR_NAT": 0.552941
    }
  },
  {
    "rsid": "rs10953286",
    "chromosome": "7",
    "position": 98887802,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.2674,
    "frequencies": {
      "EUR_N": 0.105062,
      "EUR_S": 0.154206,
      "AFR_W": 0.923723,
      "AFR_E": 0.878788,
      "EAS_CN": 0.32485,
      "EAS_JP": 0.307692,
      "SAS": 0.393445,
      "AMR_NAT": 0.182353
    }
  },
  {
    "rsid": "rs10271592",
    "chromosome": "7",
    "position": 119694410,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.028180000000000004,
    "frequencies": {
      "EUR_N": 0.035502,
      "EUR_S": 0.025701,
      "AFR_W": 0.668167,
      "AFR_E": 0.641414,
      "EAS_CN": 0.050462,
      "EAS_JP": 0.038462,
      "SAS": 0.055941,
      "AMR_NAT": 0.041176
    }
  },
  {
    "rsid": "rs344470",
    "chromosome": "7",
    "position": 146413497,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.0974,
    "frequencies": {
      "EUR_N": 0.143079,
      "EUR_S": 0.128505,
      "AFR_W": 0.853746,
      "AFR_E": 0.813131,
      "EAS_CN": 0.129681,
      "EAS_JP": 0.067308,
      "SAS": 0.09327,
      "AMR_NAT": 0.123529
    }
  },
  {
    "rsid": "rs11990310",
    "chromosome": "8",
    "position": 259934,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.07703,
    "frequencies": {
      "EUR_N": 0.08412,
      "EUR_S": 0.123832,
      "AFR_W": 0.783301,
      "AFR_E": 0.757576,
      "EAS_CN": 0.047896,
      "EAS_JP": 0.072115,
      "SAS": 0.173766,
      "AMR_NAT": 0.052941
    }
  },
  {
    "rsid": "rs75644136",
    "chromosome": "8",
    "position": 3545212,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.08934,
    "frequencies": {
      "EUR_N": 0,
      "EUR_S": 0,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.086778,
      "EAS_JP": 0.100962,
      "SAS": 0.007044,
      "AMR_NAT": 0.317647
    }
  },
  {
    "rsid": "rs7012981",
    "chromosome": "8",
    "position": 29383034,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.34940000000000004,
    "frequencies": {
      "EUR_N": 0.469697,
      "EUR_S": 0.504673,
      "AFR_W": 0.976589,
      "AFR_E": 0.919192,
      "EAS_CN": 0.584073,
      "EAS_JP": 0.600962,
      "SAS": 0.501049,
      "AMR_NAT": 0.235294
    }
  },
  {
    "rsid": "rs12545426",
    "chromosome": "8",
    "position": 59453461,
    "minorAllele": "T",
    "majorAllele": "G",
    "MAF_chile": 0.41590000000000005,
    "frequencies": {
      "EUR_N": 0.100159,
      "EUR_S": 0.051402,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.201803,
      "EAS_JP": 0.197115,
      "SAS": 0.076997,
      "AMR_NAT": 0.688235
    }
  },
  {
    "rsid": "rs6995710",
    "chromosome": "8",
    "position": 88852543,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4802,
    "frequencies": {
      "EUR_N": 0.792356,
      "EUR_S": 0.820093,
      "AFR_W": 0.736989,
      "AFR_E": 0.732323,
      "EAS_CN": 0.422561,
      "EAS_JP": 0.504808,
      "SAS": 0.795657,
      "AMR_NAT": 0.352941
    }
  },
  {
    "rsid": "rs1352159",
    "chromosome": "8",
    "position": 91897549,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.41240000000000004,
    "frequencies": {
      "EUR_N": 0.677545,
      "EUR_S": 0.600467,
      "AFR_W": 0.021473,
      "AFR_E": 0.045455,
      "EAS_CN": 0.173,
      "EAS_JP": 0.298077,
      "SAS": 0.624424,
      "AMR_NAT": 0.282353
    }
  },
  {
    "rsid": "rs4871779",
    "chromosome": "8",
    "position": 128279007,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.4314,
    "frequencies": {
      "EUR_N": 0.729826,
      "EUR_S": 0.738318,
      "AFR_W": 0.929639,
      "AFR_E": 0.909091,
      "EAS_CN": 0.139344,
      "EAS_JP": 0.144231,
      "SAS": 0.509872,
      "AMR_NAT": 0.158824
    }
  },
  {
    "rsid": "rs10974844",
    "chromosome": "9",
    "position": 499516,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.040240000000000005,
    "frequencies": {
      "EUR_N": 0.051837,
      "EUR_S": 0.060748,
      "AFR_W": 0.777736,
      "AFR_E": 0.747475,
      "EAS_CN": 0.004854,
      "EAS_JP": 0.009615,
      "SAS": 0.123542,
      "AMR_NAT": 0.023529
    }
  },
  {
    "rsid": "rs1020463",
    "chromosome": "9",
    "position": 22667225,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.2117,
    "frequencies": {
      "EUR_N": 0.00703,
      "EUR_S": 0.011682,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.019233,
      "EAS_JP": 0.081731,
      "SAS": 0.004854,
      "AMR_NAT": 0.264706
    }
  },
  {
    "rsid": "rs7873820",
    "chromosome": "9",
    "position": 24883179,
    "minorAllele": "A",
    "majorAllele": "C",
    "MAF_chile": 0.1106,
    "frequencies": {
      "EUR_N": 0.187738,
      "EUR_S": 0.135514,
      "AFR_W": 0.911994,
      "AFR_E": 0.89899,
      "EAS_CN": 0.228225,
      "EAS_JP": 0.149038,
      "SAS": 0.189261,
      "AMR_NAT": 0.076471
    }
  },
  {
    "rsid": "rs7853515",
    "chromosome": "9",
    "position": 83932430,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3478,
    "frequencies": {
      "EUR_N": 0.648481,
      "EUR_S": 0.614486,
      "AFR_W": 0.984632,
      "AFR_E": 0.969697,
      "EAS_CN": 0.278826,
      "EAS_JP": 0.278846,
      "SAS": 0.702505,
      "AMR_NAT": 0.182353
    }
  },
  {
    "rsid": "rs2768288",
    "chromosome": "9",
    "position": 108316653,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3085,
    "frequencies": {
      "EUR_N": 0.106838,
      "EUR_S": 0.128505,
      "AFR_W": 0.008415,
      "AFR_E": 0.025253,
      "EAS_CN": 0.192279,
      "EAS_JP": 0.197115,
      "SAS": 0.159988,
      "AMR_NAT": 0.305882
    }
  },
  {
    "rsid": "rs1510283",
    "chromosome": "9",
    "position": 109695950,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.1663,
    "frequencies": {
      "EUR_N": 0.093573,
      "EUR_S": 0.102804,
      "AFR_W": 0.873319,
      "AFR_E": 0.858586,
      "EAS_CN": 0.249792,
      "EAS_JP": 0.307692,
      "SAS": 0.096322,
      "AMR_NAT": 0.241176
    }
  },
  {
    "rsid": "rs590086",
    "chromosome": "9",
    "position": 133343659,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.07215,
    "frequencies": {
      "EUR_N": 0.078422,
      "EUR_S": 0.13785,
      "AFR_W": 0.820157,
      "AFR_E": 0.762626,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0.078261,
      "AMR_NAT": 0.070588
    }
  },
  {
    "rsid": "rs28831093",
    "chromosome": "10",
    "position": 24347747,
    "minorAllele": "C",
    "majorAllele": "A",
    "MAF_chile": 0.1039,
    "frequencies": {
      "EUR_N": 0.101195,
      "EUR_S": 0.175234,
      "AFR_W": 0.855367,
      "AFR_E": 0.813131,
      "EAS_CN": 0.072168,
      "EAS_JP": 0.043269,
      "SAS": 0.133884,
      "AMR_NAT": 0.047059
    }
  },
  {
    "rsid": "rs17665075",
    "chromosome": "10",
    "position": 26101206,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.11130000000000001,
    "frequencies": {
      "EUR_N": 0.036538,
      "EUR_S": 0.016355,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.05037,
      "EAS_JP": 0.048077,
      "SAS": 0.014471,
      "AMR_NAT": 0.005882
    }
  },
  {
    "rsid": "rs867768",
    "chromosome": "10",
    "position": 31414304,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.47650000000000003,
    "frequencies": {
      "EUR_N": 0.713139,
      "EUR_S": 0.806075,
      "AFR_W": 0.998894,
      "AFR_E": 1,
      "EAS_CN": 0.675381,
      "EAS_JP": 0.634615,
      "SAS": 0.730468,
      "AMR_NAT": 0.282353
    }
  },
  {
    "rsid": "rs10761835",
    "chromosome": "10",
    "position": 65892071,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1439,
    "frequencies": {
      "EUR_N": 0.158379,
      "EUR_S": 0.13785,
      "AFR_W": 0.918477,
      "AFR_E": 0.949495,
      "EAS_CN": 0.17804,
      "EAS_JP": 0.182692,
      "SAS": 0.210991,
      "AMR_NAT": 0.147059
    }
  },
  {
    "rsid": "rs3814614",
    "chromosome": "10",
    "position": 88128281,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.3163,
    "frequencies": {
      "EUR_N": 0.528268,
      "EUR_S": 0.514019,
      "AFR_W": 0.880741,
      "AFR_E": 0.873737,
      "EAS_CN": 0.761466,
      "EAS_JP": 0.701923,
      "SAS": 0.7637,
      "AMR_NAT": 0.170588
    }
  },
  {
    "rsid": "rs4918288",
    "chromosome": "10",
    "position": 108987492,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3587,
    "frequencies": {
      "EUR_N": 0.070948,
      "EUR_S": 0.067757,
      "AFR_W": 0.022292,
      "AFR_E": 0,
      "EAS_CN": 0.42975,
      "EAS_JP": 0.413462,
      "SAS": 0.373387,
      "AMR_NAT": 0.5
    }
  },
  {
    "rsid": "rs7087634",
    "chromosome": "10",
    "position": 118171016,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.37220000000000003,
    "frequencies": {
      "EUR_N": 0.079069,
      "EUR_S": 0.095794,
      "AFR_W": 0.894587,
      "AFR_E": 0.808081,
      "EAS_CN": 0.432963,
      "EAS_JP": 0.456731,
      "SAS": 0.090696,
      "AMR_NAT": 0.552941
    }
  },
  {
    "rsid": "rs2242458",
    "chromosome": "11",
    "position": 19188122,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3154,
    "frequencies": {
      "EUR_N": 0.372368,
      "EUR_S": 0.406542,
      "AFR_W": 0.99469,
      "AFR_E": 0.974747,
      "EAS_CN": 0.490337,
      "EAS_JP": 0.586538,
      "SAS": 0.419329,
      "AMR_NAT": 0.311765
    }
  },
  {
    "rsid": "rs4755530",
    "chromosome": "11",
    "position": 39889167,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.194,
    "frequencies": {
      "EUR_N": 0.287305,
      "EUR_S": 0.315421,
      "AFR_W": 0.936155,
      "AFR_E": 0.924242,
      "EAS_CN": 0.312575,
      "EAS_JP": 0.163462,
      "SAS": 0.343998,
      "AMR_NAT": 0.088235
    }
  },
  {
    "rsid": "rs523200",
    "chromosome": "11",
    "position": 64532579,
    "minorAllele": "C",
    "majorAllele": "A",
    "MAF_chile": 0.30970000000000003,
    "frequencies": {
      "EUR_N": 0.089614,
      "EUR_S": 0.098131,
      "AFR_W": 0.938387,
      "AFR_E": 0.919192,
      "EAS_CN": 0.384882,
      "EAS_JP": 0.389423,
      "SAS": 0.195456,
      "AMR_NAT": 0.623529
    }
  },
  {
    "rsid": "rs2448265",
    "chromosome": "11",
    "position": 80086923,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.42260000000000003,
    "frequencies": {
      "EUR_N": 0.02936,
      "EUR_S": 0.049065,
      "AFR_W": 0.455727,
      "AFR_E": 0.353535,
      "EAS_CN": 0.494637,
      "EAS_JP": 0.490385,
      "SAS": 0.182266,
      "AMR_NAT": 0.611765
    }
  },
  {
    "rsid": "rs4309121",
    "chromosome": "11",
    "position": 94591289,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4934,
    "frequencies": {
      "EUR_N": 0.157639,
      "EUR_S": 0.147196,
      "AFR_W": 0.019207,
      "AFR_E": 0.010101,
      "EAS_CN": 0.288488,
      "EAS_JP": 0.331731,
      "SAS": 0.255832,
      "AMR_NAT": 0.723529
    }
  },
  {
    "rsid": "rs7927064",
    "chromosome": "11",
    "position": 123261385,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1558,
    "frequencies": {
      "EUR_N": 0.059311,
      "EUR_S": 0.098131,
      "AFR_W": 0.967902,
      "AFR_E": 0.919192,
      "EAS_CN": 0.120203,
      "EAS_JP": 0.0625,
      "SAS": 0.04661,
      "AMR_NAT": 0.1
    }
  },
  {
    "rsid": "rs1793568",
    "chromosome": "11",
    "position": 131106301,
    "minorAllele": "T",
    "majorAllele": "G",
    "MAF_chile": 0.4335,
    "frequencies": {
      "EUR_N": 0.748289,
      "EUR_S": 0.745327,
      "AFR_W": 0.828455,
      "AFR_E": 0.838384,
      "EAS_CN": 0.256842,
      "EAS_JP": 0.173077,
      "SAS": 0.555265,
      "AMR_NAT": 0.270588
    }
  },
  {
    "rsid": "rs4237954",
    "chromosome": "12",
    "position": 15801799,
    "minorAllele": "C",
    "majorAllele": "A",
    "MAF_chile": 0.03568,
    "frequencies": {
      "EUR_N": 0.015596,
      "EUR_S": 0.046729,
      "AFR_W": 0.773959,
      "AFR_E": 0.722222,
      "EAS_CN": 0.10816,
      "EAS_JP": 0.0625,
      "SAS": 0.072393,
      "AMR_NAT": 0.035294
    }
  },
  {
    "rsid": "rs10875961",
    "chromosome": "12",
    "position": 39068198,
    "minorAllele": "T",
    "majorAllele": "G",
    "MAF_chile": 0.44370000000000004,
    "frequencies": {
      "EUR_N": 0.101843,
      "EUR_S": 0.163551,
      "AFR_W": 0.963651,
      "AFR_E": 0.893939,
      "EAS_CN": 0.7138,
      "EAS_JP": 0.740385,
      "SAS": 0.403117,
      "AMR_NAT": 0.605882
    }
  },
  {
    "rsid": "rs7315173",
    "chromosome": "12",
    "position": 45394863,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.4405,
    "frequencies": {
      "EUR_N": 0.142191,
      "EUR_S": 0.119159,
      "AFR_W": 0.294763,
      "AFR_E": 0.272727,
      "EAS_CN": 0.416019,
      "EAS_JP": 0.403846,
      "SAS": 0.197657,
      "AMR_NAT": 0.629412
    }
  },
  {
    "rsid": "rs343092",
    "chromosome": "12",
    "position": 66250940,
    "minorAllele": "T",
    "majorAllele": "G",
    "MAF_chile": 0.1627,
    "frequencies": {
      "EUR_N": 0.133774,
      "EUR_S": 0.21729,
      "AFR_W": 0.985169,
      "AFR_E": 0.949495,
      "EAS_CN": 0.314771,
      "EAS_JP": 0.336538,
      "SAS": 0.44791,
      "AMR_NAT": 0.070588
    }
  },
  {
    "rsid": "rs12229055",
    "chromosome": "12",
    "position": 96328422,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.38830000000000003,
    "frequencies": {
      "EUR_N": 0,
      "EUR_S": 0.004673,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.139436,
      "EAS_JP": 0.100962,
      "SAS": 0.005334,
      "AMR_NAT": 0.629412
    }
  },
  {
    "rsid": "rs16942836",
    "chromosome": "12",
    "position": 113916920,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3103,
    "frequencies": {
      "EUR_N": 0.005051,
      "EUR_S": 0.004673,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.112922,
      "EAS_JP": 0.110577,
      "SAS": 0.058198,
      "AMR_NAT": 0.458824
    }
  },
  {
    "rsid": "rs903770",
    "chromosome": "12",
    "position": 117291957,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.1981,
    "frequencies": {
      "EUR_N": 0.265124,
      "EUR_S": 0.285047,
      "AFR_W": 0.956643,
      "AFR_E": 0.919192,
      "EAS_CN": 0.51172,
      "EAS_JP": 0.504808,
      "SAS": 0.534354,
      "AMR_NAT": 0.094118
    }
  },
  {
    "rsid": "rs9319424",
    "chromosome": "13",
    "position": 28847135,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.303,
    "frequencies": {
      "EUR_N": 0.418267,
      "EUR_S": 0.371495,
      "AFR_W": 0.988107,
      "AFR_E": 0.969697,
      "EAS_CN": 0.547527,
      "EAS_JP": 0.413462,
      "SAS": 0.439431,
      "AMR_NAT": 0.182353
    }
  },
  {
    "rsid": "rs7325962",
    "chromosome": "13",
    "position": 49067103,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.04324,
    "frequencies": {
      "EUR_N": 0.031339,
      "EUR_S": 0.044393,
      "AFR_W": 0.872384,
      "AFR_E": 0.883838,
      "EAS_CN": 0.112876,
      "EAS_JP": 0.149038,
      "SAS": 0.08132,
      "AMR_NAT": 0.041176
    }
  },
  {
    "rsid": "rs2149698",
    "chromosome": "13",
    "position": 77289977,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3563,
    "frequencies": {
      "EUR_N": 0.592926,
      "EUR_S": 0.523364,
      "AFR_W": 0.993689,
      "AFR_E": 0.994949,
      "EAS_CN": 0.593689,
      "EAS_JP": 0.466346,
      "SAS": 0.611295,
      "AMR_NAT": 0.217647
    }
  },
  {
    "rsid": "rs17066642",
    "chromosome": "13",
    "position": 77336326,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.2431,
    "frequencies": {
      "EUR_N": 0.02233,
      "EUR_S": 0.009346,
      "AFR_W": 0.106919,
      "AFR_E": 0.080808,
      "EAS_CN": 0.221452,
      "EAS_JP": 0.399038,
      "SAS": 0.080943,
      "AMR_NAT": 0.217647
    }
  },
  {
    "rsid": "rs1572510",
    "chromosome": "13",
    "position": 105381134,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.0592,
    "frequencies": {
      "EUR_N": 0.026807,
      "EUR_S": 0.056075,
      "AFR_W": 0.928429,
      "AFR_E": 0.838384,
      "EAS_CN": 0.093597,
      "EAS_JP": 0.043269,
      "SAS": 0.184856,
      "AMR_NAT": 0.088235
    }
  },
  {
    "rsid": "rs2255084",
    "chromosome": "13",
    "position": 112889456,
    "minorAllele": "T",
    "majorAllele": "G",
    "MAF_chile": 0.43220000000000003,
    "frequencies": {
      "EUR_N": 0.126799,
      "EUR_S": 0.119159,
      "AFR_W": 0.203944,
      "AFR_E": 0.186869,
      "EAS_CN": 0.519001,
      "EAS_JP": 0.442308,
      "SAS": 0.19097,
      "AMR_NAT": 0.452941
    }
  },
  {
    "rsid": "rs8009296",
    "chromosome": "14",
    "position": 32328112,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.0292,
    "frequencies": {
      "EUR_N": 0.015152,
      "EUR_S": 0.023364,
      "AFR_W": 0.782289,
      "AFR_E": 0.742424,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0.007811,
      "AMR_NAT": 0.047059
    }
  },
  {
    "rsid": "rs8020002",
    "chromosome": "14",
    "position": 48252483,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4297,
    "frequencies": {
      "EUR_N": 0.705757,
      "EUR_S": 0.801402,
      "AFR_W": 0.948228,
      "AFR_E": 0.964646,
      "EAS_CN": 0.622399,
      "EAS_JP": 0.644231,
      "SAS": 0.597667,
      "AMR_NAT": 0.194118
    }
  },
  {
    "rsid": "rs7148230",
    "chromosome": "14",
    "position": 75677699,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.11230000000000001,
    "frequencies": {
      "EUR_N": 0.176601,
      "EUR_S": 0.214953,
      "AFR_W": 0.865124,
      "AFR_E": 0.762626,
      "EAS_CN": 0.052843,
      "EAS_JP": 0.158654,
      "SAS": 0.31868,
      "AMR_NAT": 0.076471
    }
  },
  {
    "rsid": "rs2402480",
    "chromosome": "14",
    "position": 95062298,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4218,
    "frequencies": {
      "EUR_N": 0.687146,
      "EUR_S": 0.672897,
      "AFR_W": 0.945024,
      "AFR_E": 0.984848,
      "EAS_CN": 0.374896,
      "EAS_JP": 0.399038,
      "SAS": 0.494314,
      "AMR_NAT": 0.270588
    }
  },
  {
    "rsid": "rs1273225",
    "chromosome": "14",
    "position": 99609217,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4302,
    "frequencies": {
      "EUR_N": 0.144319,
      "EUR_S": 0.11215,
      "AFR_W": 0.737266,
      "AFR_E": 0.752525,
      "EAS_CN": 0.319903,
      "EAS_JP": 0.326923,
      "SAS": 0.362652,
      "AMR_NAT": 0.452941
    }
  },
  {
    "rsid": "rs12906805",
    "chromosome": "15",
    "position": 24196452,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.3753,
    "frequencies": {
      "EUR_N": 0.486236,
      "EUR_S": 0.516355,
      "AFR_W": 0.953247,
      "AFR_E": 0.909091,
      "EAS_CN": 0.591817,
      "EAS_JP": 0.658654,
      "SAS": 0.591809,
      "AMR_NAT": 0.311765
    }
  },
  {
    "rsid": "rs77145924",
    "chromosome": "15",
    "position": 45167563,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.17830000000000001,
    "frequencies": {
      "EUR_N": 0.005051,
      "EUR_S": 0,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.197319,
      "EAS_JP": 0.177885,
      "SAS": 0.017442,
      "AMR_NAT": 0.164706
    }
  },
  {
    "rsid": "rs1426654",
    "chromosome": "15",
    "position": 48426484,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.4032,
    "frequencies": {
      "EUR_N": 0.010101,
      "EUR_S": 0.004673,
      "AFR_W": 0.949351,
      "AFR_E": 0.924242,
      "EAS_CN": 0.975913,
      "EAS_JP": 0.995192,
      "SAS": 0.319031,
      "AMR_NAT": 0.717647
    }
  },
  {
    "rsid": "rs11635165",
    "chromosome": "15",
    "position": 71139706,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.243,
    "frequencies": {
      "EUR_N": 0.511341,
      "EUR_S": 0.404206,
      "AFR_W": 0.990476,
      "AFR_E": 0.969697,
      "EAS_CN": 0.524133,
      "EAS_JP": 0.471154,
      "SAS": 0.538983,
      "AMR_NAT": 0.117647
    }
  },
  {
    "rsid": "rs45601437",
    "chromosome": "16",
    "position": 10989754,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.4616,
    "frequencies": {
      "EUR_N": 0.010323,
      "EUR_S": 0.007009,
      "AFR_W": 0.048878,
      "AFR_E": 0.075758,
      "EAS_CN": 0.319949,
      "EAS_JP": 0.278846,
      "SAS": 0.06222,
      "AMR_NAT": 0.723529
    }
  },
  {
    "rsid": "rs8050872",
    "chromosome": "16",
    "position": 19803846,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.12840000000000001,
    "frequencies": {
      "EUR_N": 0.155955,
      "EUR_S": 0.175234,
      "AFR_W": 0.945646,
      "AFR_E": 0.883838,
      "EAS_CN": 0.209223,
      "EAS_JP": 0.216346,
      "SAS": 0.318166,
      "AMR_NAT": 0.111765
    }
  },
  {
    "rsid": "rs2058908",
    "chromosome": "16",
    "position": 53806145,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.48190000000000005,
    "frequencies": {
      "EUR_N": 0.272006,
      "EUR_S": 0.172897,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.257351,
      "EAS_JP": 0.245192,
      "SAS": 0.314243,
      "AMR_NAT": 0.694118
    }
  },
  {
    "rsid": "rs7202210",
    "chromosome": "16",
    "position": 75820543,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.327,
    "frequencies": {
      "EUR_N": 0.607189,
      "EUR_S": 0.5,
      "AFR_W": 0.98748,
      "AFR_E": 0.964646,
      "EAS_CN": 0.305201,
      "EAS_JP": 0.365385,
      "SAS": 0.377315,
      "AMR_NAT": 0.141176
    }
  },
  {
    "rsid": "rs2735611",
    "chromosome": "17",
    "position": 8048283,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.46690000000000004,
    "frequencies": {
      "EUR_N": 0.842953,
      "EUR_S": 0.799065,
      "AFR_W": 0.465779,
      "AFR_E": 0.59596,
      "EAS_CN": 0.307721,
      "EAS_JP": 0.269231,
      "SAS": 0.73729,
      "AMR_NAT": 0.241176
    }
  },
  {
    "rsid": "rs78223898",
    "chromosome": "17",
    "position": 13124790,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4761,
    "frequencies": {
      "EUR_N": 0.084416,
      "EUR_S": 0.046729,
      "AFR_W": 0,
      "AFR_E": 0.005051,
      "EAS_CN": 0.483102,
      "EAS_JP": 0.423077,
      "SAS": 0.07958,
      "AMR_NAT": 0.794118
    }
  },
  {
    "rsid": "rs2270662",
    "chromosome": "17",
    "position": 35219205,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.30970000000000003,
    "frequencies": {
      "EUR_N": 0.469012,
      "EUR_S": 0.490654,
      "AFR_W": 0.957292,
      "AFR_E": 0.909091,
      "EAS_CN": 0.526283,
      "EAS_JP": 0.548077,
      "SAS": 0.564235,
      "AMR_NAT": 0.194118
    }
  },
  {
    "rsid": "rs3760332",
    "chromosome": "17",
    "position": 58508618,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.05652000000000001,
    "frequencies": {
      "EUR_N": 0.093425,
      "EUR_S": 0.053738,
      "AFR_W": 0.899042,
      "AFR_E": 0.878788,
      "EAS_CN": 0.156103,
      "EAS_JP": 0.173077,
      "SAS": 0.083494,
      "AMR_NAT": 0.041176
    }
  },
  {
    "rsid": "rs7234530",
    "chromosome": "18",
    "position": 19683998,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3405,
    "frequencies": {
      "EUR_N": 0.055056,
      "EUR_S": 0.058411,
      "AFR_W": 0.244685,
      "AFR_E": 0.186869,
      "EAS_CN": 0.187147,
      "EAS_JP": 0.254808,
      "SAS": 0.19933,
      "AMR_NAT": 0.394118
    }
  },
  {
    "rsid": "rs4799476",
    "chromosome": "18",
    "position": 35762424,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.41200000000000003,
    "frequencies": {
      "EUR_N": 0.124172,
      "EUR_S": 0.116822,
      "AFR_W": 0.014003,
      "AFR_E": 0.005051,
      "EAS_CN": 0.285599,
      "EAS_JP": 0.278846,
      "SAS": 0.264191,
      "AMR_NAT": 0.594118
    }
  },
  {
    "rsid": "rs4891800",
    "chromosome": "18",
    "position": 67683698,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.03404,
    "frequencies": {
      "EUR_N": 0.036686,
      "EUR_S": 0.044393,
      "AFR_W": 0.896535,
      "AFR_E": 0.868687,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0.07042,
      "AMR_NAT": 0.047059
    }
  },
  {
    "rsid": "rs10424345",
    "chromosome": "19",
    "position": 12188317,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.1148,
    "frequencies": {
      "EUR_N": 0.139324,
      "EUR_S": 0.186916,
      "AFR_W": 0.835149,
      "AFR_E": 0.762626,
      "EAS_CN": 0.06951,
      "EAS_JP": 0.115385,
      "SAS": 0.143964,
      "AMR_NAT": 0.082353
    }
  },
  {
    "rsid": "rs76813435",
    "chromosome": "19",
    "position": 24376384,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.23720000000000002,
    "frequencies": {
      "EUR_N": 0.025253,
      "EUR_S": 0,
      "AFR_W": 0,
      "AFR_E": 0,
      "EAS_CN": 0.072168,
      "EAS_JP": 0.134615,
      "SAS": 0.007044,
      "AMR_NAT": 0.164706
    }
  },
  {
    "rsid": "rs7257095",
    "chromosome": "19",
    "position": 45451647,
    "minorAllele": "G",
    "majorAllele": "C",
    "MAF_chile": 0.01267,
    "frequencies": {
      "EUR_N": 0.008566,
      "EUR_S": 0.009346,
      "AFR_W": 0.128782,
      "AFR_E": 0.181818,
      "EAS_CN": 0,
      "EAS_JP": 0,
      "SAS": 0.062791,
      "AMR_NAT": 0.011765
    }
  },
  {
    "rsid": "rs1418029",
    "chromosome": "20",
    "position": 2060151,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.38180000000000003,
    "frequencies": {
      "EUR_N": 0.081992,
      "EUR_S": 0.063084,
      "AFR_W": 0.513333,
      "AFR_E": 0.363636,
      "EAS_CN": 0.846232,
      "EAS_JP": 0.788462,
      "SAS": 0.457245,
      "AMR_NAT": 0.564706
    }
  },
  {
    "rsid": "rs224371",
    "chromosome": "20",
    "position": 34074831,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.2146,
    "frequencies": {
      "EUR_N": 0.195268,
      "EUR_S": 0.329439,
      "AFR_W": 0.992634,
      "AFR_E": 0.974747,
      "EAS_CN": 0.273833,
      "EAS_JP": 0.201923,
      "SAS": 0.516959,
      "AMR_NAT": 0.182353
    }
  },
  {
    "rsid": "rs310612",
    "chromosome": "20",
    "position": 62181508,
    "minorAllele": "G",
    "majorAllele": "A",
    "MAF_chile": 0.1472,
    "frequencies": {
      "EUR_N": 0.215414,
      "EUR_S": 0.205607,
      "AFR_W": 0.996161,
      "AFR_E": 0.989899,
      "EAS_CN": 0.230883,
      "EAS_JP": 0.149038,
      "SAS": 0.461736,
      "AMR_NAT": 0.152941
    }
  },
  {
    "rsid": "rs2823676",
    "chromosome": "21",
    "position": 17611773,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.050050000000000004,
    "frequencies": {
      "EUR_N": 0.071096,
      "EUR_S": 0.067757,
      "AFR_W": 0.86971,
      "AFR_E": 0.772727,
      "EAS_CN": 0.139482,
      "EAS_JP": 0.144231,
      "SAS": 0.047227,
      "AMR_NAT": 0.023529
    }
  },
  {
    "rsid": "rs11700868",
    "chromosome": "21",
    "position": 37873237,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.4726,
    "frequencies": {
      "EUR_N": 0.134717,
      "EUR_S": 0.114486,
      "AFR_W": 0.780378,
      "AFR_E": 0.79798,
      "EAS_CN": 0.66068,
      "EAS_JP": 0.533654,
      "SAS": 0.410116,
      "AMR_NAT": 0.658824
    }
  },
  {
    "rsid": "rs117930146",
    "chromosome": "21",
    "position": 39202275,
    "minorAllele": "G",
    "majorAllele": "T",
    "MAF_chile": 0.2497,
    "frequencies": {
      "EUR_N": 0.025549,
      "EUR_S": 0.016355,
      "AFR_W": 0.004425,
      "AFR_E": 0,
      "EAS_CN": 0.004762,
      "EAS_JP": 0,
      "SAS": 0.030329,
      "AMR_NAT": 0.247059
    }
  },
  {
    "rsid": "rs1056484",
    "chromosome": "22",
    "position": 32908738,
    "minorAllele": "T",
    "majorAllele": "C",
    "MAF_chile": 0.2677,
    "frequencies": {
      "EUR_N": 0.395086,
      "EUR_S": 0.401869,
      "AFR_W": 0.993363,
      "AFR_E": 0.974747,
      "EAS_CN": 0.072215,
      "EAS_JP": 0.110577,
      "SAS": 0.21656,
      "AMR_NAT": 0.217647
    }
  },
  {
    "rsid": "rs11705079",
    "chromosome": "22",
    "position": 44754963,
    "minorAllele": "A",
    "majorAllele": "G",
    "MAF_chile": 0.3781,
    "frequencies": {
      "EUR_N": 0.13333,
      "EUR_S": 0.119159,
      "AFR_W": 0.056644,
      "AFR_E": 0.045455,
      "EAS_CN": 0.254924,
      "EAS_JP": 0.269231,
      "SAS": 0.18882,
      "AMR_NAT": 0.435294
    }
  },
  {
    "rsid": "rs4044210",
    "chromosome": "22",
    "position": 46786315,
    "minorAllele": "C",
    "majorAllele": "T",
    "MAF_chile": 0.1071,
    "frequencies": {
      "EUR_N": 0.145558,
      "EUR_S": 0.186916,
      "AFR_W": 0.750252,
      "AFR_E": 0.772727,
      "EAS_CN": 0.019233,
      "EAS_JP": 0.014423,
      "SAS": 0.140895,
      "AMR_NAT": 0.052941
    }
  }
];

/**
 * Validate consistency at import time.
 * Returns array of issue strings (empty = OK).
 */
function validate() {
    const issues = [];
    for (const aim of AIMS) {
        if (!aim.minorAllele) issues.push(aim.rsid + ': missing minorAllele');
        if (!aim.majorAllele) issues.push(aim.rsid + ': missing majorAllele');
        if (!aim.frequencies) {
            issues.push(aim.rsid + ': missing frequencies');
            continue;
        }
        for (const pop of POPULATIONS) {
            const v = aim.frequencies[pop];
            if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > 1) {
                issues.push(aim.rsid + ': invalid freq ' + pop + '=' + v);
            }
        }
    }
    if (issues.length > 0) {
        const pct = (issues.length / AIMS.length * 100).toFixed(1);
        console.warn('[REF_DATA_V2] ' + issues.length + ' issues (' + pct + '% of AIMs)');
        if (issues.length <= 10) console.warn('[REF_DATA_V2]', issues);
        else console.warn('[REF_DATA_V2] First 10:', issues.slice(0, 10));
    }
    return issues;
}

/**
 * Aggregate K=9 sub-population Q-vector to legacy K=6 macro-regions.
 * @param {Object} qSubPop  e.g. { EUR_N: 0.4, EUR_S: 0.3, AMR_NAT: 0.3, ... }
 * @returns {Object}         e.g. { EUR: 0.7, AFR: 0, EAS: 0, SAS: 0, AMR_NAT: 0.3, OCE: 0 }
 */
function aggregateToMacroRegions(qSubPop) {
    const macro = { EUR: 0, AFR: 0, EAS: 0, SAS: 0, AMR_NAT: 0, OCE: 0 };
    for (const [subpop, value] of Object.entries(qSubPop)) {
        const m = MACRO_REGION[subpop];
        if (m) macro[m] = (macro[m] || 0) + value;
    }
    return macro;
}

module.exports = {
    VERSION,
    POPULATIONS,
    POPULATION_LABELS,
    MACRO_REGION,
    AIMS,
    validate,
    aggregateToMacroRegions
};
