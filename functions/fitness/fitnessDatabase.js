/**
 * Base de datos de genética deportiva / fitness.
 *
 * Fuentes: GWAS Catalog, Bouchard et al. 2011, MacArthur & North 2004,
 *          Lucia et al. 2005, Bray et al. 2009.
 */

const FITNESS_SNPS = {

    rs1815739: {
        gene:  'ACTN3',
        trait: 'Tipo de fibras musculares',
        icon:  '💪',
        interpret(genotype) {
            if (genotype === 'CC') return {
                type:        'Potencia / Sprint (Fibras tipo IIx)',
                score:       'power',
                description: 'Actinina-3 presente. Ventaja en ejercicios explosivos de alta intensidad.',
                bestSports:  ['Sprints 100-400m', 'Halterofilia', 'CrossFit', 'HIIT', 'Boxeo', 'Artes marciales'],
                training:    ['Entrena con cargas pesadas (≥85% RM)', 'Series cortas, alta potencia', 'Pliometría', 'Sprints'],
                recovery:    'Necesitas 48-72h entre sesiones intensas del mismo grupo muscular'
            };
            if (genotype === 'TT') return {
                type:        'Resistencia (Fibras tipo I)',
                score:       'endurance',
                description: 'Sin actinina-3. Mitocondrias más eficientes. Ventaja en deportes de larga duración.',
                bestSports:  ['Maratón', 'Triatlón', 'Ciclismo de fondo', 'Natación', 'Senderismo'],
                training:    ['Entrena volumen alto y baja intensidad', 'Zona 2 cardio', 'Largas distancias'],
                recovery:    'Recuperas más rápido; puedes entrenar mayor frecuencia'
            };
            return {
                type:        'Mixto / Versátil',
                score:       'mixed',
                description: 'Heterocigoto RX. Versatilidad en ambos tipos de ejercicio.',
                bestSports:  ['Deportes de equipo', 'Fútbol', 'Tenis', 'Crossfit moderado'],
                training:    ['Entrena ambas modalidades para maximizar potencial'],
                recovery:    'Recuperación intermedia'
            };
        }
    },

    rs8192678: {
        gene:  'PPARGC1A',
        trait: 'Capacidad aeróbica (VO2max)',
        icon:  '🫁',
        interpret(genotype) {
            if (genotype === 'GG') return { level: 'Alto potencial aeróbico',   advice: 'Buena respuesta al entrenamiento cardiovascular. VO2max puede ser elevado.' };
            if (genotype === 'AG' || genotype === 'GA') return { level: 'Potencial aeróbico moderado', advice: 'Respuesta promedio al cardio.' };
            if (genotype === 'AA') return { level: 'Potencial aeróbico menor',  advice: 'Necesitas más volumen de entrenamiento cardio para lograr el mismo VO2max.' };
            return null;
        }
    },

    rs12722: {
        gene:  'COL5A1',
        trait: 'Riesgo de lesión de tendones y ligamentos',
        icon:  '🦵',
        interpret(genotype) {
            if (genotype === 'TT') return { risk: 'BAJO',  advice: 'Tejido conectivo resistente. Menor riesgo de lesión de tendones con carga normal.' };
            if (genotype === 'CT' || genotype === 'TC') return { risk: 'MEDIO', advice: 'Riesgo moderado. Enfatiza calentamiento, enfriamiento y progresión gradual de carga.' };
            if (genotype === 'CC') return { risk: 'ALTO',  advice: '⚠️ Mayor susceptibilidad a tendinitis y esguinces. Calienta siempre 10+ min, trabaja flexibilidad y fortalece tendones con ejercicios excéntricos.' };
            return null;
        }
    },

    rs1800795: {
        gene:  'IL6',
        trait: 'Inflamación post-ejercicio y recuperación',
        icon:  '🔥',
        interpret(genotype) {
            if (genotype === 'CC') return { inflammation: 'BAJA',  recovery: 'Rápida', advice: 'Poca inflamación post-ejercicio. Recuperas antes y con menos DOMS.' };
            if (genotype === 'CG' || genotype === 'GC') return { inflammation: 'MEDIA', recovery: 'Normal', advice: 'Respuesta inflamatoria estándar.' };
            if (genotype === 'GG') return { inflammation: 'ALTA',  recovery: 'Lenta', advice: 'Mayor inflamación post-entreno. Prioriza sueño, baños de contraste y nutrición anti-inflamatoria (omega-3, cúrcuma).' };
            return null;
        }
    },

    rs1042713: {
        gene:  'ADRB2',
        trait: 'Respuesta al entrenamiento cardio',
        icon:  '❤️',
        interpret(genotype) {
            if (genotype === 'AA') return { responder: 'ALTO',  description: 'Excelente respuesta al entrenamiento aeróbico. El cardio te da grandes ganancias.' };
            if (genotype === 'AG' || genotype === 'GA') return { responder: 'MEDIO', description: 'Respuesta promedio.' };
            if (genotype === 'GG') return { responder: 'BAJO',  description: 'Necesitas mayor volumen e intensidad cardiovascular para progresar. Responde mejor al entrenamiento de fuerza.' };
            return null;
        }
    },

    rs1799883: {
        gene:  'FABP2',
        trait: 'Oxidación de grasas durante el ejercicio',
        icon:  '🔋',
        interpret(genotype) {
            if (genotype === 'AA') return { burn: 'ALTA',  advice: 'Muy eficiente quemando grasa como combustible. Bien adaptado para cardio en ayunas o keto-adapted.' };
            if (genotype === 'AG' || genotype === 'GA') return { burn: 'MEDIA', advice: 'Balance entre oxidación de grasas y glucógeno.' };
            if (genotype === 'GG') return { burn: 'BAJA',  advice: 'Prefieres glucógeno como combustible. Los carbohidratos pre-entreno son especialmente importantes.' };
            return null;
        }
    },

    rs2282679: {
        gene:  'GC',
        trait: 'Niveles de Vitamina D',
        icon:  '☀️',
        interpret(genotype) {
            if (genotype === 'AA') return { level: 'Normal',    advice: 'Síntesis y transporte eficiente de vitamina D. Exposición solar moderada es suficiente.' };
            if (genotype === 'AC' || genotype === 'CA') return { level: 'Bajo-normal', advice: 'Considera 1.000 UI/día de vitamina D3, especialmente en invierno.' };
            if (genotype === 'CC') return { level: 'Muy bajo',  advice: '⚠️ Alta probabilidad de déficit de vitamina D. Suplementa 2.000-4.000 UI/día y exponte al sol diariamente. Revisa niveles con tu médico.' };
            return null;
        }
    },

    rs4244285: {
        gene:  'CYP2C19',
        trait: 'Metabolismo de antiinflamatorios (AINEs)',
        icon:  '💊',
        interpret(genotype) {
            if (genotype === 'GG') return { type: 'Metabolizador normal', advice: 'Ibuprofeno, naproxeno y AINEs tienen efecto estándar.' };
            if (genotype === 'AG' || genotype === 'GA') return { type: 'Metabolizador intermedio', advice: 'Efecto ligeramente variable en AINEs.' };
            if (genotype === 'AA') return { type: 'Metabolizador lento', advice: '⚠️ Puede acumular AINEs. Usa dosis mínimas efectivas. Consulta médico antes de uso prolongado.' };
            return null;
        }
    }
};

/**
 * Genera el perfil deportivo completo del usuario.
 * @param {{ [rsid]: string }} genotypes — mapa rsid → genotipo
 * @returns {object}
 */
function generateFitnessProfile(genotypes) {
    const profile = {
        fibers:         null,
        aerobic:        null,
        injury_risk:    null,
        recovery:       null,
        cardio_response: null,
        fat_oxidation:  null,
        vitamin_d:      null,
        pharma:         null,
        analyzed:       0,
        found:          0
    };

    const snpKeys = Object.keys(FITNESS_SNPS);
    profile.analyzed = snpKeys.length;

    for (const rsid of snpKeys) {
        const genotype = genotypes[rsid];
        if (!genotype || genotype === '--') continue;
        profile.found++;

        const snp    = FITNESS_SNPS[rsid];
        const result = snp.interpret(genotype);
        if (!result) continue;

        result.gene   = snp.gene;
        result.trait  = snp.trait;
        result.icon   = snp.icon;
        result.rsid   = rsid;

        switch (rsid) {
            case 'rs1815739':  profile.fibers          = result; break;
            case 'rs8192678':  profile.aerobic         = result; break;
            case 'rs12722':    profile.injury_risk     = result; break;
            case 'rs1800795':  profile.recovery        = result; break;
            case 'rs1042713':  profile.cardio_response = result; break;
            case 'rs1799883':  profile.fat_oxidation   = result; break;
            case 'rs2282679':  profile.vitamin_d       = result; break;
            case 'rs4244285':  profile.pharma          = result; break;
        }
    }

    profile.training_recommendations = _generateTrainingPlan(profile);
    profile.nutrition_plan           = _generateNutritionPlan(profile);
    profile.risk_alerts              = generateRiskAlerts(profile);
    return profile;
}

// Alertas de riesgo — solo riesgos clínicos/lesión, NO nutrición ni entrenamiento
function generateRiskAlerts(profile) {
    const alerts = [];

    if (profile.injury_risk?.risk === 'ALTO') {
        alerts.push({
            severity: 'CRITICAL', icon: '🦵',
            title:   'Riesgo genético de lesión tendinosa',
            message: 'Variante COL5A1 reduce resistencia del tejido conectivo. Calentamiento 10+ min OBLIGATORIO, progresión gradual de carga, ejercicios excéntricos preventivos (protocolo Alfredson).'
        });
    } else if (profile.injury_risk?.risk === 'MEDIO') {
        alerts.push({
            severity: 'MEDIUM', icon: '🦵',
            title:   'Riesgo moderado de lesión tendinosa',
            message: 'Enfatiza calentamiento completo y enfriamiento activo. Aumenta cargas con no más de un 10% semanal.'
        });
    }

    if (profile.recovery?.inflammation === 'ALTA') {
        alerts.push({
            severity: 'HIGH', icon: '🔥',
            title:   'Alta inflamación post-entrenamiento',
            message: 'Variante IL6 eleva la respuesta inflamatoria al ejercicio intenso. No entrenes el mismo grupo muscular en días consecutivos. Descansa mínimo 48-72h entre sesiones de alta intensidad.'
        });
    }

    if (profile.vitamin_d?.level === 'Muy bajo') {
        alerts.push({
            severity: 'HIGH', icon: '☀️',
            title:   'Alto riesgo de déficit de Vitamina D',
            message: 'Variante GC reduce transporte de vitamina D. El déficit crónico disminuye fuerza muscular y aumenta riesgo de fracturas por estrés. Consulta tu médico para suplementación y análisis sérico.'
        });
    }

    if (profile.pharma?.type === 'Metabolizador lento') {
        alerts.push({
            severity: 'MEDIUM', icon: '💊',
            title:   'Metabolizador lento de AINEs (CYP2C19)',
            message: 'Los antiinflamatorios (ibuprofeno, naproxeno) se acumulan más en tu organismo. Usa la dosis mínima efectiva y consulta a tu médico antes de uso prolongado post-lesión.'
        });
    }

    return alerts;
}

function _generateTrainingPlan(profile) {
    const recs = [];

    if (profile.fibers?.score === 'power') {
        recs.push({ priority: 'high', text: 'Tu genética favorece la potencia explosiva. Incluye sprints y entrenamiento de fuerza con cargas altas (≥85% RM).' });
        recs.push({ priority: 'medium', text: 'Series cortas (3-6 reps), alta potencia, pliometría y periodos de descanso completos (2-3 min).' });
    } else if (profile.fibers?.score === 'endurance') {
        recs.push({ priority: 'high', text: 'Tu genética favorece la resistencia. Los deportes de fondo son tu fuerte natural.' });
        recs.push({ priority: 'medium', text: 'Prioriza cardio en zona 2 (60-70% FCmax), largas distancias y volumen alto de entrenamiento.' });
    } else {
        recs.push({ priority: 'medium', text: 'Perfil mixto: combina fuerza (2-3 días) y cardio (2-3 días) para explotar tu versatilidad.' });
    }

    if (profile.cardio_response?.responder === 'BAJO') {
        recs.push({ priority: 'medium', text: 'Tu respuesta al cardio es genéticamente menor. Necesitas mayor volumen e intensidad cardiovascular para obtener adaptaciones similares.' });
    } else if (profile.cardio_response?.responder === 'ALTO') {
        recs.push({ priority: 'low', text: 'Excelente respuesta genética al entrenamiento aeróbico. El cardio produce en ti grandes adaptaciones con volumen moderado.' });
    }

    return recs;
}

// Plan nutricional para rendimiento — separado de alertas de riesgo
function _generateNutritionPlan(profile) {
    const plan = [];

    if (profile.fat_oxidation?.burn === 'ALTA') {
        plan.push({ category: 'Combustible', text: 'Eres eficiente quemando grasas. Cardio en ayunas o con baja carga de carbohidratos puede maximizar tu oxidación lipídica.' });
    } else if (profile.fat_oxidation?.burn === 'BAJA') {
        plan.push({ category: 'Combustible', text: 'Prefieres glucógeno como combustible. Carbohidratos de absorción media (avena, arroz) antes del entrenamiento son clave para tu rendimiento.' });
    }

    if (profile.aerobic?.level === 'Potencial aeróbico menor') {
        plan.push({ category: 'Resistencia', text: 'Para compensar tu menor potencial aeróbico, la periodización nutricional es clave: carbohidratos estratégicos los días de entreno duro, menor ingesta los días de descanso.' });
    }

    if (profile.recovery?.inflammation === 'ALTA') {
        plan.push({ category: 'Recuperación', text: 'Antiinflamatorios naturales son prioritarios en tu dieta: omega-3 (salmón, sardinas, chía), cúrcuma con pimienta, cerezas ácidas post-entreno.' });
    }

    if (profile.vitamin_d?.level === 'Muy bajo' || profile.vitamin_d?.level === 'Bajo-normal') {
        plan.push({ category: 'Micronutrientes', text: 'Aumenta alimentos ricos en vitamina D: salmón, sardinas, huevo (yema), leche enriquecida. La suplementación con D3+K2 puede ser necesaria (consulta médico).' });
    }

    return plan;
}

module.exports = { FITNESS_SNPS, generateFitnessProfile, generateRiskAlerts };
