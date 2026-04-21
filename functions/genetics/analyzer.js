const { NURA_SNP_DATABASE } = require('./snpDatabase');

function matchesGenotype(userGenotype, targetGenotypes, referenceGenotypes = null) {
  if (!userGenotype || userGenotype === '--') return false;
  const normalizedUser = userGenotype.split('').sort().join('');

  for (const target of targetGenotypes) {
    if (target === 'present') {
      // Variantes raras (BRCA1/2, MUTYH...): comparar contra genotipo de referencia ancestral.
      // Solo es riesgo si el genotipo del usuario NO es el alelo de referencia normal.
      if (referenceGenotypes && Array.isArray(referenceGenotypes) && referenceGenotypes.length > 0) {
        const isReference = referenceGenotypes.some(ref => {
          const normRef = ref.split('').sort().join('');
          return normalizedUser === normRef;
        });
        if (isReference) return false; // Genotipo normal — no es riesgo
        return true;                   // Diferente del normal — posible variante
      }
      // Sin referencia definida: por seguridad no marcar como riesgo
      return false;
    }

    const normalizedTarget = target.split('').sort().join('');
    if (normalizedUser === normalizedTarget) return true;
  }
  return false;
}

function analyzeSingleSNP(userSnp, snpConfig) {
  const userGenotype = userSnp.genotype;
  const isRisk = matchesGenotype(userGenotype, snpConfig.riskGenotype || [], snpConfig.referenceGenotype || null);
  const isProtective = snpConfig.protectiveGenotype ? matchesGenotype(userGenotype, snpConfig.protectiveGenotype) : false;
  let status = 'neutral';
  if (isRisk) status = 'risk';
  else if (isProtective) status = 'protective';

  return {
    rsid: snpConfig.rsid || '',
    name: snpConfig.name,
    gene: snpConfig.gene,
    category: snpConfig.category,
    condition: snpConfig.condition,
    userGenotype,
    riskGenotype: snpConfig.riskGenotype,
    status,
    severity: snpConfig.severity,
    evidence: snpConfig.evidence,
    description: snpConfig.description,
    action: status === 'risk' ? snpConfig.action_if_risk : snpConfig.action_if_safe,
    linkedFoods: snpConfig.linkedFoods || [],
    affectedDrugs: snpConfig.affected_drugs || [],
    nuraAction: snpConfig.nura_action,
    requiresMedicalConsult: snpConfig.requires_medical_consult || false,
    highAlert: snpConfig.high_alert || false,
    referralSpecialty: snpConfig.referral_specialty || null,
    acmgClassification: snpConfig.acmg_classification || null,
    crossrefLabs: snpConfig.crossref_with_labs || []
  };
}

function analyzeUserGenetics(userSnps) {
  const results = {
    food_intolerances: [],
    food_allergies: [],
    metabolic_risks: [],
    cancer_risks: [],
    pharmacogenomics: [],
    summary: { total_analyzed: 0, found_in_user: 0, risks_detected: 0, high_alerts: 0, requires_medical_consult: 0 }
  };

  for (const [rsid, snpConfig] of Object.entries(NURA_SNP_DATABASE)) {
    results.summary.total_analyzed++;
    if (userSnps[rsid]) {
      results.summary.found_in_user++;
      const analysis = analyzeSingleSNP(userSnps[rsid], { ...snpConfig, rsid });

      switch (snpConfig.category) {
        case 'food_intolerance':  results.food_intolerances.push(analysis);  break;
        case 'food_allergy':      results.food_allergies.push(analysis);     break;
        case 'metabolic':         results.metabolic_risks.push(analysis);    break;
        case 'cancer_risk':       results.cancer_risks.push(analysis);       break;
        case 'pharmacogenomics':  results.pharmacogenomics.push(analysis);   break;
      }

      if (analysis.status === 'risk') {
        results.summary.risks_detected++;
        if (analysis.highAlert) results.summary.high_alerts++;
        if (analysis.requiresMedicalConsult) results.summary.requires_medical_consult++;
      }
    }
  }
  return results;
}

function generatePersonalizedRecommendations(geneticResults, userPathologies = []) {
  const recommendations = [];

  const foodRisks = geneticResults.food_intolerances.filter(s => s.status === 'risk');
  if (foodRisks.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'alimentacion',
      title: 'Ajustes alimentarios recomendados',
      description: `${foodRisks.length} sensibilidades alimentarias detectadas.`,
      items: foodRisks.map(r => ({ condition: r.condition, action: r.action, severity: r.severity }))
    });
  }

  const allergies = geneticResults.food_allergies.filter(s => s.status === 'risk');
  if (allergies.length > 0) {
    recommendations.push({
      priority: 'very_high',
      category: 'alergias',
      title: 'Predisposiciones alérgicas detectadas',
      description: 'Variantes asociadas a alergias alimentarias. Consulta alergólogo si tienes síntomas.',
      items: allergies.map(a => ({ condition: a.condition, foods: a.linkedFoods, action: a.action }))
    });
  }

  const metabolicRisks = geneticResults.metabolic_risks.filter(s => s.status === 'risk');
  for (const risk of metabolicRisks) {
    const relatedPathology = userPathologies.find(p =>
      risk.condition.includes(p) || p.includes(risk.condition.replace('riesgo_', ''))
    );
    if (relatedPathology) {
      recommendations.push({
        priority: 'very_high',
        category: 'patologia_confirmada',
        title: `Cruce genético: ${risk.name}`,
        description: `Tu genética confirma ${relatedPathology} declarada.`,
        action: risk.action,
        crossref: risk.crossrefLabs
      });
    } else {
      recommendations.push({
        priority: 'medium',
        category: 'prevencion',
        title: `Predisposición: ${risk.name}`,
        description: risk.description,
        action: risk.action
      });
    }
  }

  const cancerRisks = geneticResults.cancer_risks.filter(s => s.status === 'risk');
  if (cancerRisks.length > 0) {
    recommendations.push({
      priority: 'very_high',
      category: 'consulta_medica_obligatoria',
      title: 'Hallazgo que requiere evaluación oncogenética',
      description: 'OMS/NCCN recomiendan evaluación por oncogenetista. NO es diagnóstico de cáncer.',
      mandatory_disclaimer: true,
      items: cancerRisks.map(c => ({ gene: c.gene, name: c.name, description: c.description, specialty: c.referralSpecialty, acmg: c.acmgClassification }))
    });
  }

  const pharmaRisks = geneticResults.pharmacogenomics.filter(s => s.status === 'risk');
  if (pharmaRisks.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'medicamentos',
      title: 'Variantes farmacogenómicas',
      description: 'Tu genética afecta metabolismo de medicamentos. Informa a tu médico.',
      items: pharmaRisks.map(p => ({ gene: p.gene, drugs: p.affectedDrugs, action: p.action }))
    });
  }

  return recommendations;
}

function generateGeneticReport(userSnps, userProfile = {}) {
  const geneticResults = analyzeUserGenetics(userSnps);
  const recommendations = generatePersonalizedRecommendations(geneticResults, userProfile.pathologies || []);

  return {
    generated_at: new Date().toISOString(),
    user_id: userProfile.uid || null,
    version: '2.0',
    summary: {
      total_snps_analyzed: geneticResults.summary.found_in_user,
      total_snps_in_database: geneticResults.summary.total_analyzed,
      food_summary:     { total: geneticResults.food_intolerances.length, risks: geneticResults.food_intolerances.filter(s => s.status === 'risk').length },
      allergy_summary:  { total: geneticResults.food_allergies.length,    risks: geneticResults.food_allergies.filter(s => s.status === 'risk').length },
      metabolic_summary:{ total: geneticResults.metabolic_risks.length,   risks: geneticResults.metabolic_risks.filter(s => s.status === 'risk').length },
      cancer_summary:   {
        total_tested: geneticResults.cancer_risks.length,
        variants_detected: geneticResults.cancer_risks.filter(s => s.status === 'risk').length,
        requires_consult: geneticResults.cancer_risks.filter(s => s.requiresMedicalConsult).length
      },
      pharma_summary: { total: geneticResults.pharmacogenomics.length, affected: geneticResults.pharmacogenomics.filter(s => s.status === 'risk').length },
      overall_alerts: {
        high_priority: geneticResults.summary.high_alerts,
        medical_consults_recommended: geneticResults.summary.requires_medical_consult
      }
    },
    detailed_results: geneticResults,
    recommendations,
    disclaimer: {
      legal: 'Información orientativa, no diagnóstico. Ley 20.584.',
      genetic: 'Tests consumer no reemplazan evaluación clínica.',
      cancer_specific: 'Hallazgos de cáncer requieren oncogenetista (OMS/NCCN).',
      who_reference: 'Basado en guías OMS, ACMG y Declaración Universal del Genoma Humano.'
    }
  };
}

module.exports = { analyzeUserGenetics, analyzeSingleSNP, generatePersonalizedRecommendations, generateGeneticReport, matchesGenotype };
