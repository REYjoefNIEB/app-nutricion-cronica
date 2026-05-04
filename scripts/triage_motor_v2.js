// scripts/triage_motor_v2.js
// Sprint Motor V2 Fase 2 - Componente 1
// Asigna metadata validation a las 186 patologías de clinical-rules.json
//
// Uso:
//   node scripts/triage_motor_v2.js --dry-run   (solo muestra stats, NO escribe)
//   node scripts/triage_motor_v2.js             (aplica cambios al JSON)

const fs = require('fs');
const path = require('path');

const RULES_PATH = path.join(__dirname, '..', 'functions', 'clinical-rules.json');
const TODAY = '2026-05-04';
const DRY_RUN = process.argv.includes('--dry-run');

// === Patologías ya validadas (Fase 1) ===
const VALIDATED = {
    'ic_nyha_3': {
        validatedAgainst: ['AHA/ACC/HFSA 2022', 'SODIUM-HF Lancet 2022'],
        reviewer: 'Sprint Motor V2 Fase 1 (8ad18d4)'
    },
    'ic_nyha_4': {
        validatedAgainst: ['AHA/ACC/HFSA 2022'],
        reviewer: 'Sprint Motor V2 Fase 1 (8ad18d4)'
    },
    'cirrosis_child_b': {
        validatedAgainst: ['AASLD 2014', 'EASL 2019'],
        reviewer: 'Sprint Motor V2 Fase 1 (8ad18d4)'
    },
    'cirrosis_child_c': {
        validatedAgainst: ['ISHEN 2013', 'AASLD 2014'],
        reviewer: 'Sprint Motor V2 Fase 1 (8ad18d4)'
    }
};

// === Patologías de cambio reciente conocido (high_risk forzado) ===
const HIGH_RISK_FORCED = [
    // Metabólicas (cambio terminológico/farmacológico SGLT2/GLP1, targets ESC/EAS, etc.)
    'diabetes_t2', 'diabetes_t1', 'prediabetes', 'sindrome_metabolico',
    'hipertension', 'dislipidemia',
    'higado_graso',
    'diabetes_t2_descompensada', 'obesidad',
    // Renales críticas
    'insuficiencia_renal_cronica', 'erc_estadio_4', 'erc_estadio_5',
    'dialisis', 'nefropatia_diabetica',
    // Digestivas críticas
    'cu_brote_severo', 'crohn_brote_severo',
    // Cardiovascular críticas (Issue 4: solo las legítimas)
    'insuficiencia_cardiaca', 'trombosis',
    // Oncológicas activas (Issue 4: solo las legítimas)
    'cancer_tratamiento', 'cancer_metastasico', 'cancer_inmunosuprimido',
    'cancer_cuidados_paliativos', 'cancer_tratamiento_temprano',
    'caquexia_oncologica', 'quimioterapia_nauseas',
    'cancer_colon', 'cancer_mama_hormonodep'
];

// === Patologías que fuerzan medium_risk (override timeless de cluster alergico) ===
// Issue 2: WHO 2022 cambió criterios mastocitosis;
//          AGA/JTF 2020+ con dupilumab para esofagitis eosinofílica.
const FORCE_MEDIUM_RISK = [
    'mastocitosis', 'esofagitis_eosinofilica'
];

// === Clusters timeless (biología estable) ===
const TIMELESS_CLUSTERS = ['alergico'];

// === Patologías timeless explícitas (más allá del cluster) ===
const TIMELESS_FORCED = [
    'fenilcetonuria', 'galactosemia',
    'intolerancia_lactosa', 'fructosa_malabsorcion', 'histaminosis'
];

// === Mapeo cluster → riskLevel default ===
// Issue 4: cardiovascular y oncologico bajan a medium_risk;
//          patologías legítimamente high_risk se elevan vía HIGH_RISK_FORCED.
// Issue 1: dermatologico, musculoesqueletico, deportivo suben a medium_risk
//          para eliminar low_risk como status válido.
const CLUSTER_RISK = {
    'cardiovascular': 'medium_risk',
    'metabolico': 'high_risk',
    'oncologico': 'medium_risk',
    'renal': 'medium_risk',  // override a high_risk si tiene >=3 reglas críticas
    'hepatico': 'medium_risk',
    'digestivo': 'medium_risk',
    'inflamatorio': 'medium_risk',
    'respiratorio': 'medium_risk',
    'endocrino': 'medium_risk',
    'urologico': 'medium_risk',
    'pediatrico': 'medium_risk',
    'embarazo': 'medium_risk',
    'psiquiatrico': 'medium_risk',
    'neurologico': 'medium_risk',
    'infeccioso': 'medium_risk',
    'hematologico': 'medium_risk',
    'dermatologico': 'medium_risk',
    'musculoesqueletico': 'medium_risk',
    'deportivo': 'medium_risk',
    'control_peso': 'medium_risk',
    'alergico': 'timeless',
    'sin_cluster': 'medium_risk'
};

function clasificar(key, data) {
    const cluster = data.cluster || 'sin_cluster';
    const reglas = Array.isArray(data.reglas) ? data.reglas : [];
    const reglasCriticas = reglas.filter(r => r.severidad === 'critico').length;

    // Caso 1: ya validada en Fase 1
    if (VALIDATED[key]) {
        return {
            status: 'validated',
            validatedAgainst: VALIDATED[key].validatedAgainst,
            lastReviewed: TODAY,
            reviewer: VALIDATED[key].reviewer,
            riskLevel: 'high_risk'
        };
    }

    // Caso 2: force medium_risk (override timeless por cluster alergico)
    // Issue 2: mastocitosis (WHO 2022), esofagitis_eosinofilica (AGA/JTF 2020+).
    if (FORCE_MEDIUM_RISK.includes(key)) {
        return {
            status: 'medium_risk',
            validatedAgainst: null,
            lastReviewed: null,
            reviewer: null,
            riskLevel: 'medium_risk'
        };
    }

    // Caso 3: timeless forzado (genéticas/intolerancias)
    if (TIMELESS_FORCED.includes(key)) {
        return {
            status: 'timeless',
            validatedAgainst: null,
            lastReviewed: TODAY,
            reviewer: 'Triage automático Componente 1',
            riskLevel: 'timeless'
        };
    }

    // Caso 4: cluster timeless
    if (TIMELESS_CLUSTERS.includes(cluster)) {
        return {
            status: 'timeless',
            validatedAgainst: null,
            lastReviewed: TODAY,
            reviewer: 'Triage automático Componente 1',
            riskLevel: 'timeless'
        };
    }

    // Caso 5: high_risk forzado (cambio reciente conocido)
    if (HIGH_RISK_FORCED.includes(key)) {
        return {
            status: 'high_risk',
            validatedAgainst: null,
            lastReviewed: null,
            reviewer: null,
            riskLevel: 'high_risk'
        };
    }

    // Caso 6: cluster renal con muchas críticas → high_risk
    if (cluster === 'renal' && reglasCriticas >= 3) {
        return {
            status: 'high_risk',
            validatedAgainst: null,
            lastReviewed: null,
            reviewer: null,
            riskLevel: 'high_risk'
        };
    }

    // Caso 7: default por cluster
    const riskLevel = CLUSTER_RISK[cluster] || 'medium_risk';
    return {
        status: riskLevel === 'timeless' ? 'timeless' : riskLevel,
        validatedAgainst: null,
        lastReviewed: riskLevel === 'timeless' ? TODAY : null,
        reviewer: riskLevel === 'timeless' ? 'Triage automático Componente 1' : null,
        riskLevel: riskLevel
    };
}

// === Ejecución ===
const data = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
const stats = {
    validated: 0, high_risk: 0, medium_risk: 0, timeless: 0,
    total: 0
};
const lists = {
    validated: [], high_risk: [], medium_risk: [], timeless: []
};
// Tracker para detectar cualquier escape a un status no esperado (defensa contra bugs)
const unexpectedStatuses = {};

// Track inputs that don't exist in JSON (lista de fuerza vs JSON real)
const missingFromJson = {
    HIGH_RISK_FORCED: HIGH_RISK_FORCED.filter(k => !data[k]),
    TIMELESS_FORCED:  TIMELESS_FORCED.filter(k => !data[k]),
    VALIDATED:        Object.keys(VALIDATED).filter(k => !data[k])
};

for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('_')) continue;
    if (!value || typeof value !== 'object') continue;

    const validation = clasificar(key, value);
    value.validation = validation;

    stats.total++;
    if (stats[validation.status] === undefined) {
        unexpectedStatuses[validation.status] = (unexpectedStatuses[validation.status] || 0) + 1;
        continue;
    }
    stats[validation.status]++;
    lists[validation.status].push(key);
}

// Salida
console.log('=== Resultados Triage Componente 1 ' + (DRY_RUN ? '[DRY RUN]' : '[WRITE]') + ' ===');
console.log('Total patologías:', stats.total);
console.log('  validated:    ', stats.validated);
console.log('  high_risk:    ', stats.high_risk);
console.log('  medium_risk:  ', stats.medium_risk);
console.log('  timeless:     ', stats.timeless);
console.log();
console.log('=== Lists ===');
console.log('VALIDATED (', stats.validated, '):');
console.log('  ', lists.validated.join(', '));
console.log();
console.log('HIGH_RISK (', stats.high_risk, '):');
console.log('  ', lists.high_risk.join(', '));
console.log();
console.log('MEDIUM_RISK (', stats.medium_risk, '):');
console.log('  ', lists.medium_risk.slice(0, 30).join(', '), stats.medium_risk > 30 ? '...' : '');
console.log();
console.log('TIMELESS (', stats.timeless, '):');
console.log('  ', lists.timeless.join(', '));
console.log();

// Defensa: si alguna patología cayó a un status fuera de los 4 esperados, reportarlo
if (Object.keys(unexpectedStatuses).length > 0) {
    console.log('=== ⚠ STATUS INESPERADOS DETECTADOS ===');
    for (const [s, c] of Object.entries(unexpectedStatuses)) {
        console.log('  status="' + s + '": ' + c + ' patología(s)');
    }
    console.log();
}

// Reportar inputs de listas de fuerza que no existen en el JSON real
const anyMissing = Object.values(missingFromJson).some(arr => arr.length > 0);
if (anyMissing) {
    console.log('=== AVISO: keys en listas de fuerza que NO existen en clinical-rules.json ===');
    for (const [list, missing] of Object.entries(missingFromJson)) {
        if (missing.length > 0) console.log('  ' + list + ': ' + missing.join(', '));
    }
    console.log();
}

if (DRY_RUN) {
    console.log('=== DRY RUN — clinical-rules.json NO modificado ===');
} else {
    fs.writeFileSync(RULES_PATH, JSON.stringify(data, null, 2));
    console.log('=== clinical-rules.json actualizado ===');
    console.log('Tamaño final:', fs.statSync(RULES_PATH).size, 'bytes');
}
