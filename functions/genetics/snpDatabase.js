/**
 * Base de Datos de SNPs para Nura v2.0
 * Cumplimiento: OMS, ACMG, Chile (Ley 20.120, 20.584, 19.628), EU GDPR
 */

const FOOD_INTOLERANCES = {
  rs4988235: {
    name: 'Persistencia de Lactasa',
    category: 'food_intolerance',
    condition: 'intolerancia_lactosa',
    gene: 'MCM6/LCT',
    riskGenotype: ['CC'],
    protectiveGenotype: ['TT', 'CT'],
    severity: 'moderate',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Capacidad de digerir lactosa en adultos',
    action_if_risk: 'Tu perfil indica baja producción de lactasa. Considera limitar lácteos o usar productos sin lactosa.',
    action_if_safe: 'Buena tolerancia a lactosa.',
    linkedFoods: ['leche', 'yogurt', 'quesos_frescos', 'helados', 'crema'],
    nura_action: 'activate_lactose_alerts'
  },
  rs2187668: {
    name: 'HLA-DQ2.5 (Celiaquía tipo 1)',
    category: 'food_intolerance',
    condition: 'predisposicion_celiaca',
    gene: 'HLA-DQA1',
    riskGenotype: ['AA', 'AG'],
    protectiveGenotype: ['GG'],
    severity: 'high',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Principal haplotipo de celiaquía (90-95% de pacientes)',
    action_if_risk: 'Portas HLA-DQ2.5, principal marcador genético de celiaquía. Si tienes síntomas con gluten (digestivos, fatiga, anemia), consulta gastroenterólogo para test de anticuerpos.',
    action_if_safe: 'No portas el haplotipo principal de celiaquía.',
    linkedFoods: ['trigo', 'avena', 'centeno', 'cebada', 'pan', 'pasta', 'cerveza'],
    nura_action: 'suggest_gluten_tracking',
    requires_medical_consult: true
  },
  rs7454108: {
    name: 'HLA-DQ8 (Celiaquía tipo 2)',
    category: 'food_intolerance',
    condition: 'predisposicion_celiaca',
    gene: 'HLA-DQA1',
    riskGenotype: ['CC', 'CT'],
    protectiveGenotype: ['TT'],
    severity: 'high',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Segundo haplotipo de celiaquía (5-10% de casos)',
    action_if_risk: 'Portas HLA-DQ8. Si tienes síntomas con gluten, consulta especialista.',
    action_if_safe: 'No portas HLA-DQ8.',
    linkedFoods: ['trigo', 'avena', 'centeno', 'cebada'],
    nura_action: 'suggest_gluten_tracking',
    requires_medical_consult: true
  },
  rs13119723: {
    name: 'Sensibilidad al Gluten No Celíaca',
    category: 'food_intolerance',
    condition: 'sensibilidad_gluten',
    gene: 'IL12A/IL23R',
    riskGenotype: ['AA', 'AG'],
    protectiveGenotype: ['GG'],
    severity: 'moderate',
    evidence: 'moderate',
    who_recognized: true,
    description: 'Sensibilidad al gluten sin celiaquía',
    action_if_risk: 'Predisposición a sensibilidad al gluten no celíaca. Si tienes hinchazón o fatiga con trigo, prueba dieta sin gluten supervisada.',
    action_if_safe: 'Sin predisposición detectada.',
    linkedFoods: ['trigo', 'centeno', 'cebada', 'productos_procesados_con_gluten'],
    nura_action: 'gluten_sensitivity_mode'
  },
  rs762551: {
    name: 'CYP1A2 (Metabolismo Cafeína)',
    category: 'food_intolerance',
    condition: 'metabolismo_cafeina',
    gene: 'CYP1A2',
    riskGenotype: ['CC'],
    protectiveGenotype: ['AA'],
    severity: 'low',
    evidence: 'high',
    who_recognized: true,
    description: 'Velocidad de metabolismo de cafeína',
    action_if_risk: 'Metabolizador lento de cafeína. Puede causar ansiedad, insomnio o palpitaciones. Limita a 1-2 tazas/día.',
    action_if_safe: 'Metabolizador rápido de cafeína.',
    linkedFoods: ['cafe', 'te_negro', 'bebidas_energeticas', 'chocolate_negro', 'mate'],
    nura_action: 'adjust_caffeine_warnings'
  },
  rs671: {
    name: 'ALDH2 (Metabolismo Alcohol)',
    category: 'food_intolerance',
    condition: 'intolerancia_alcohol',
    gene: 'ALDH2',
    riskGenotype: ['AA', 'GA'],
    protectiveGenotype: ['GG'],
    severity: 'moderate',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Deficiencia ALDH2 (común en asiáticos)',
    action_if_risk: 'Deficiencia ALDH2. El alcohol puede causar enrojecimiento, náuseas, mayor riesgo de cáncer esofágico. OMS recomienda limitar.',
    action_if_safe: 'Metabolismo normal de alcohol.',
    linkedFoods: ['alcohol', 'vino', 'cerveza', 'destilados'],
    nura_action: 'alcohol_warnings'
  },
  rs1049793: {
    name: 'DAO (Diamino Oxidasa)',
    category: 'food_intolerance',
    condition: 'intolerancia_histamina',
    gene: 'AOC1',
    riskGenotype: ['GG'],
    protectiveGenotype: ['CC'],
    severity: 'moderate',
    evidence: 'moderate',
    who_recognized: true,
    description: 'Capacidad de degradar histamina',
    action_if_risk: 'Baja actividad DAO. Alimentos ricos en histamina pueden causar dolores de cabeza, picazón, congestión.',
    action_if_safe: 'Actividad normal de DAO.',
    linkedFoods: ['quesos_curados', 'embutidos', 'vino_tinto', 'pescado_enlatado', 'chucrut', 'tomate', 'fresas'],
    nura_action: 'histamine_warnings'
  },
  rs4343: {
    name: 'ACE (Sensibilidad a Sodio)',
    category: 'food_intolerance',
    condition: 'sensibilidad_sodio',
    gene: 'ACE',
    riskGenotype: ['GG'],
    protectiveGenotype: ['AA'],
    severity: 'moderate',
    evidence: 'moderate',
    who_recognized: true,
    description: 'Sensibilidad genética al sodio',
    action_if_risk: 'Mayor sensibilidad al sodio. OMS: máximo 5g sal/día (2g sodio).',
    action_if_safe: 'Sensibilidad normal al sodio.',
    linkedFoods: ['sal', 'embutidos', 'snacks_salados', 'comida_procesada'],
    nura_action: 'enhanced_sodium_alerts'
  },
  rs429358: {
    name: 'APOE (Metabolismo Lípidos)',
    category: 'food_intolerance',
    condition: 'metabolismo_grasas',
    gene: 'APOE',
    riskGenotype: ['CC'],
    protectiveGenotype: ['TT'],
    severity: 'moderate',
    evidence: 'high',
    who_recognized: true,
    description: 'Metabolismo de grasas saturadas',
    action_if_risk: 'Portas APOE4. OMS: dieta mediterránea, <10% grasas saturadas de calorías totales.',
    action_if_safe: 'Metabolismo normal de grasas.',
    linkedFoods: ['grasas_saturadas', 'carnes_rojas', 'mantequilla', 'aceite_coco'],
    nura_action: 'enhanced_fat_alerts'
  },
  rs1800546: {
    name: 'ALDOB (Intolerancia Fructosa)',
    category: 'food_intolerance',
    condition: 'intolerancia_fructosa',
    gene: 'ALDOB',
    riskGenotype: ['AA'],
    protectiveGenotype: ['GG'],
    severity: 'high',
    evidence: 'high',
    who_recognized: true,
    description: 'Intolerancia hereditaria a fructosa',
    action_if_risk: 'Posible HFI. Si tienes síntomas con frutas dulces o miel (náuseas, hipoglucemia), consulta gastroenterólogo URGENTE.',
    action_if_safe: 'Metabolismo normal de fructosa.',
    linkedFoods: ['miel', 'frutas_dulces', 'jarabe_maiz', 'sorbitol', 'agave'],
    nura_action: 'fructose_warnings',
    requires_medical_consult: true
  }
};

const FOOD_ALLERGIES = {
  rs2476601: {
    name: 'PTPN22 (Autoinmunidad)',
    category: 'metabolic',
    condition: 'predisposicion_autoinmunidad',
    gene: 'PTPN22',
    riskGenotype: ['AA', 'AG'],
    protectiveGenotype: ['GG'],
    severity: 'moderate',
    evidence: 'moderate',
    who_recognized: true,
    description: 'Predisposición a enfermedades autoinmunes',
    action_if_risk: 'Predisposición a enfermedades autoinmunes (artritis reumatoide, lupus, diabetes T1, tiroiditis). No asociado directamente con alergias alimentarias. Consulta médico si tienes síntomas autoinmunes.',
    action_if_safe: 'Sin predisposición marcada.',
    nura_action: 'autoimmune_watch'
  },
  rs2251746: {
    name: 'FCER1A (Predisposición Alergias IgE)',
    category: 'food_allergy',
    condition: 'predisposicion_alergias_ige',
    gene: 'FCER1A',
    riskGenotype: ['CC'],
    protectiveGenotype: ['TT'],
    severity: 'moderate',
    evidence: 'moderate',
    who_recognized: true,
    description: 'Predisposición general a alergias tipo IgE',
    action_if_risk: 'Predisposición general a alergias tipo IgE. No específico de mariscos. Consulta alergólogo si tienes síntomas alérgicos.',
    action_if_safe: 'Sin predisposición detectada.',
    linkedFoods: ['mariscos', 'pescado', 'frutos_secos', 'huevo'],
    nura_action: 'ige_allergy_watch',
    requires_medical_consult: true
  },
};

const METABOLIC_RISKS = {
  rs7903146: {
    name: 'TCF7L2 (Diabetes Tipo 2)',
    category: 'metabolic',
    condition: 'riesgo_diabetes_t2',
    gene: 'TCF7L2',
    riskGenotype: ['TT'],
    protectiveGenotype: ['CC'],
    severity: 'moderate',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Predictor genético más fuerte de diabetes T2',
    action_if_risk: 'Mayor predisposición a diabetes T2. OMS: dieta baja en azúcares, 150 min ejercicio/semana, control glicemia anual.',
    action_if_safe: 'Riesgo estándar.',
    linkedFoods: ['azucar_refinado', 'harinas_blancas', 'bebidas_azucaradas'],
    nura_action: 'diabetes_prevention_mode',
    crossref_with_labs: ['glucosa', 'hba1c', 'insulina']
  },
  rs1799752: {
    name: 'ACE I/D (Hipertensión)',
    category: 'metabolic',
    condition: 'riesgo_hipertension',
    gene: 'ACE',
    riskGenotype: ['DD'],
    protectiveGenotype: ['II'],
    severity: 'moderate',
    evidence: 'high',
    who_recognized: true,
    description: 'Predisposición a hipertensión',
    action_if_risk: 'Mayor predisposición a hipertensión. OMS: dieta DASH, máximo 5g sal/día, ejercicio.',
    action_if_safe: 'Riesgo estándar.',
    linkedFoods: ['sodio', 'alimentos_procesados'],
    nura_action: 'hypertension_prevention_mode'
  },
  rs6511720: {
    name: 'LDLR (Colesterol LDL)',
    category: 'metabolic',
    condition: 'riesgo_colesterol_alto',
    gene: 'LDLR',
    riskGenotype: ['GG'],
    protectiveGenotype: ['TT'],
    severity: 'low',
    evidence: 'high',
    who_recognized: true,
    description: 'Regulación de colesterol LDL',
    action_if_risk: 'Variante común en europeos asociada con LDL ligeramente elevado. Impacto clínico individual menor. Dieta mediterránea como prevención general.',
    action_if_safe: 'Regulación normal.',
    linkedFoods: ['grasas_trans', 'grasas_saturadas', 'frituras'],
    nura_action: 'cholesterol_alerts',
    crossref_with_labs: ['colesterol_total', 'ldl', 'hdl']
  },
  rs1801133: {
    name: 'MTHFR C677T',
    category: 'metabolic',
    condition: 'deficiencia_folato',
    gene: 'MTHFR',
    riskGenotype: ['TT'],
    protectiveGenotype: ['CC'],
    severity: 'moderate',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Metabolismo de folato y homocisteína',
    action_if_risk: 'Metabolismo reducido de folato. Aumentar vegetales verdes, legumbres. Importante en embarazo.',
    action_if_safe: 'Metabolismo normal.',
    linkedFoods: ['vegetales_verdes', 'legumbres'],
    nura_action: 'folate_recommendations'
  },
  rs1800562: {
    name: 'HFE C282Y (Hemocromatosis)',
    category: 'metabolic',
    condition: 'riesgo_hemocromatosis',
    gene: 'HFE',
    riskGenotype: ['AA'],
    protectiveGenotype: ['GG'],
    severity: 'high',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Sobrecarga de hierro hereditaria',
    action_if_risk: 'Alto riesgo de hemocromatosis. Evitar suplementos de hierro y vitamina C alta. Consultar hematólogo.',
    action_if_safe: 'Metabolismo normal de hierro.',
    linkedFoods: ['carnes_rojas', 'suplementos_hierro'],
    nura_action: 'iron_warnings',
    requires_medical_consult: true,
    crossref_with_labs: ['ferritina', 'hierro']
  },
  rs1801282: {
    name: 'PPARG (Sensibilidad Insulina)',
    category: 'metabolic',
    condition: 'resistencia_insulina',
    gene: 'PPARG',
    riskGenotype: ['CC'],
    protectiveGenotype: ['GG'],
    severity: 'low',
    evidence: 'high',
    who_recognized: true,
    description: 'Sensibilidad a insulina',
    action_if_risk: 'Predisposición a resistencia a insulina. Variante común en europeos (~85%). Impacto individual menor. Dieta de bajo índice glucémico como prevención general.',
    action_if_safe: 'Sensibilidad normal.',
    linkedFoods: ['azucares', 'carbohidratos_refinados'],
    nura_action: 'insulin_sensitivity_mode'
  }
};

const CANCER_PREDISPOSITION = {
  i4000377: {
    // BRCA1 185delAG — DELECIÓN c.68_69delAG.
    // Founder mutation Ashkenazí (~1% en esa población, ~26% de las variantes
    // patogénicas BRCA detectadas en Ashkenazí). dbSNP rs80357914, ClinVar VCV000056295.
    //
    // IMPORTANTE: 23andMe usa el ID interno 'i4000377' (NO el rsid moderno rs80357914
    // de dbSNP). Verificado empíricamente en 5 archivos 23andMe de distintas versiones:
    //   Kenneth Reitz v3 (build 37), James Bradach v3+v5 (build 37),
    //   Bastian Greshake v2 (build 36), A-corpas-padre v2, B-sporny v2.
    // El parser de Nura acepta IDs con prefijo 'i' (parser.js:87).
    //
    // Posiciones reportadas:
    //   Build 37: chr17:41276045 (chips post-2013, v3/v4/v5)
    //   Build 36: chr17:38529571 (chips pre-2013, v2)
    //
    // Convención D/I 23andMe para DELECIONES (igual que rs80359550 BRCA2 6174delT):
    //   II = wildtype (alelos intactos, sin deleción) ← NO riesgo
    //   DI = portador heterocigoto                    ← RIESGO
    //   DD = afectado homocigoto                      ← RIESGO
    name: 'BRCA1 185delAG',
    category: 'cancer_risk',
    condition: 'predisposicion_cancer_mama_ovario',
    gene: 'BRCA1',
    riskGenotype: ['present_indel'],
    riskAlleles: ['DI', 'ID', 'DD'],
    referenceGenotype: ['II'],
    severity: 'very_high',
    evidence: 'very_high',
    who_recognized: true,
    acmg_classification: 'Pathogenic',
    description: 'Deleción patogénica founder Ashkenazí. Una de las tres founder mutations BRCA más estudiadas (~26% de variantes patogénicas BRCA en población Ashkenazí, GeneReviews PMID: 20301425).',
    action_if_risk: 'HALLAZGO IMPORTANTE: Requiere test clínico completo BRCA1/BRCA2. OMS/NCCN recomiendan oncogenetista. NO es diagnóstico.',
    action_if_safe: 'No portas esta variante.',
    nura_action: 'mandatory_medical_referral',
    requires_medical_consult: true,
    high_alert: true,
    referral_specialty: 'oncogenetista',
    disclaimer_required: true
  },
  rs80357906: {
    // ETIQUETA CORREGIDA: este rsid es BRCA1 5382insC (INSERCIÓN), NO 185delAG.
    // Fuente: dbSNP rs80357906, ClinVar VCV000017677, SNPedia BRCA1.
    // Aliases: c.5266dupC, 5382insC, 5385insC.
    //
    // Convención D/I 23andMe para INSERCIONES (opuesto a deleciones):
    //   DD = wildtype (sin inserción, ambos alelos normales) — Kenneth Reitz, James Bradach: DD ✓
    //   DI = portador heterocigoto  ← RIESGO
    //   II = afectado homocigoto    ← RIESGO
    name: 'BRCA1 5382insC',
    category: 'cancer_risk',
    condition: 'predisposicion_cancer_mama_ovario',
    gene: 'BRCA1',
    riskGenotype: ['present_indel'],
    riskAlleles: ['DI', 'ID', 'II'],
    referenceGenotype: ['DD'],
    severity: 'very_high',
    evidence: 'very_high',
    who_recognized: true,
    acmg_classification: 'Pathogenic',
    description: 'Inserción patogénica founder Ashkenazí. También conocida como c.5266dupC.',
    action_if_risk: 'HALLAZGO IMPORTANTE: Requiere test clínico completo BRCA1/BRCA2. OMS/NCCN recomiendan oncogenetista. NO es diagnóstico.',
    action_if_safe: 'No portas esta variante.',
    nura_action: 'mandatory_medical_referral',
    requires_medical_consult: true,
    high_alert: true,
    referral_specialty: 'oncogenetista',
    disclaimer_required: true
  },
  // REMOVED: rs80357713
  // Este rsid fue fusionado en rs80357783 en dbSNP build 136 (2010) y tiene 12
  // anotaciones inconsistentes entre bases de datos (Munz et al. 2015, Genome Medicine).
  // NO es seguro para uso clínico en producción. 5382insC se detecta correctamente
  // vía rs80357906 (entrada anterior). 185delAG se detecta vía i4000377 (entrada arriba).
  rs80359550: {
    // BRCA2 6174delT — DELECIÓN (convención opuesta a la inserción de rs80357906).
    // Convención D/I 23andMe para DELECIONES:
    //   II = wildtype (alelo intacto en ambos cromosomas, sin deleción) ← NO riesgo
    //   DI = portador heterocigoto  ← RIESGO
    //   DD = afectado homocigoto    ← RIESGO
    name: 'BRCA2 6174delT',
    category: 'cancer_risk',
    condition: 'predisposicion_cancer_mama_ovario',
    gene: 'BRCA2',
    riskGenotype: ['present_indel'],
    riskAlleles: ['DI', 'ID', 'DD'],
    referenceGenotype: ['II'],
    severity: 'very_high',
    evidence: 'very_high',
    who_recognized: true,
    acmg_classification: 'Pathogenic',
    description: 'Variante fundadora BRCA2',
    action_if_risk: 'HALLAZGO IMPORTANTE: Requiere oncogenetista. Incluye riesgo masculino (próstata, mama).',
    action_if_safe: 'No portas esta variante.',
    nura_action: 'mandatory_medical_referral',
    requires_medical_consult: true,
    high_alert: true,
    referral_specialty: 'oncogenetista',
    disclaimer_required: true
  },
  rs1801155: {
    name: 'APC I1307K',
    category: 'cancer_risk',
    condition: 'predisposicion_cancer_colorrectal',
    gene: 'APC',
    riskGenotype: ['AT', 'TA', 'AA'],
    protectiveGenotype: ['TT'],
    severity: 'moderate',
    evidence: 'high',
    who_recognized: true,
    acmg_classification: 'Likely Pathogenic',
    description: 'Riesgo moderado de cáncer colorrectal',
    action_if_risk: 'Portas APC I1307K. OMS/NCCN: colonoscopía desde los 40 años. Consulta oncogenetista.',
    action_if_safe: 'No portas esta variante.',
    nura_action: 'colonoscopy_reminder',
    requires_medical_consult: true,
    referral_specialty: 'oncogenetista_o_gastroenterologo'
  },
  rs36053993: {
    name: 'MUTYH G396D',
    category: 'cancer_risk',
    condition: 'predisposicion_cancer_colorrectal',
    gene: 'MUTYH',
    riskGenotype: ['TT'],
    severity: 'high',
    evidence: 'high',
    who_recognized: true,
    acmg_classification: 'Pathogenic',
    description: 'Poliposis MUTYH (MAP)',
    action_if_risk: 'MUTYH en homocigosis: poliposis y riesgo elevado de cáncer colorrectal. Consulta oncogenetista.',
    action_if_safe: 'No portas esta variante.',
    nura_action: 'mandatory_medical_referral',
    requires_medical_consult: true,
    high_alert: true,
    referral_specialty: 'oncogenetista'
  }
};

const PHARMACOGENOMICS = {
  rs3892097: {
    name: 'CYP2D6 *4',
    category: 'pharmacogenomics',
    condition: 'metabolizador_lento_cyp2d6',
    gene: 'CYP2D6',
    riskGenotype: ['AA'],
    severity: 'moderate',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Metabolismo del ~25% de medicamentos',
    action_if_risk: 'Metabolizador lento CYP2D6. Afecta: codeína, tramadol, tamoxifeno, antidepresivos. Informa a tu médico.',
    action_if_safe: 'Metabolismo normal.',
    affected_drugs: ['codeina', 'tramadol', 'amitriptilina', 'tamoxifeno', 'metoprolol'],
    nura_action: 'drug_metabolism_alerts',
    requires_medical_consult: true
  },
  rs4244285: {
    name: 'CYP2C19 *2',
    category: 'pharmacogenomics',
    condition: 'metabolizador_clopidogrel',
    gene: 'CYP2C19',
    riskGenotype: ['AA'],
    severity: 'high',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Eficacia de clopidogrel y omeprazol',
    action_if_risk: 'Metabolizador lento CYP2C19. Clopidogrel (Plavix) menos efectivo - crítico con stent. Informa cardiólogo.',
    action_if_safe: 'Metabolismo normal.',
    affected_drugs: ['clopidogrel', 'omeprazol', 'esomeprazol', 'citalopram'],
    nura_action: 'drug_metabolism_alerts',
    requires_medical_consult: true
  },
  rs9923231: {
    name: 'VKORC1 (Warfarina)',
    category: 'pharmacogenomics',
    condition: 'sensibilidad_warfarina',
    gene: 'VKORC1',
    riskGenotype: ['TT'],
    severity: 'high',
    evidence: 'very_high',
    who_recognized: true,
    description: 'Dosis de anticoagulantes',
    action_if_risk: 'Alta sensibilidad a warfarina. Requieres dosis menores. CRÍTICO con anticoagulantes.',
    action_if_safe: 'Respuesta normal.',
    affected_drugs: ['warfarina', 'acenocumarol'],
    nura_action: 'anticoagulant_alerts',
    requires_medical_consult: true
  }
};

const NURA_SNP_DATABASE = {
  ...FOOD_INTOLERANCES,
  ...FOOD_ALLERGIES,
  ...METABOLIC_RISKS,
  ...CANCER_PREDISPOSITION,
  ...PHARMACOGENOMICS
};

const DATABASE_STATS = {
  total_snps: Object.keys(NURA_SNP_DATABASE).length,
  version: '2.0',
  last_updated: '2026-04-21',
  compliance: {
    who_guidelines: true,
    acmg_standards: true,
    chile_ley_20_120: true,
    chile_ley_20_584: true,
    chile_ley_19_628: true,
    eu_gdpr: true
  }
};

module.exports = {
  NURA_SNP_DATABASE,
  FOOD_INTOLERANCES,
  FOOD_ALLERGIES,
  METABOLIC_RISKS,
  CANCER_PREDISPOSITION,
  PHARMACOGENOMICS,
  DATABASE_STATS
};
