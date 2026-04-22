/* Trait ID → Lucide icon name */
const TRAIT_ICONS = {
    // Apariencia — cabello
    hair_color_blonde:          'palette',
    hair_color_red:             'flame',
    hair_graying_early:         'star',
    hair_texture:               'waves',
    hair_thickness:             'git-branch',
    male_pattern_baldness:      'user-round',
    beard_density:              'circle-dashed',
    body_hair_amount:           'sparkles',

    // Apariencia — ojos / piel
    eye_color_intensity:        'eye',
    eye_color_blue_brown:       'eye',
    skin_pigmentation:          'palette',
    skin_pigmentation_slc45a2:  'palette',
    tanning_ability:            'sun',
    freckles_tendency:          'sparkles',
    moles_density:              'circle-dot',

    // Apariencia — rasgos físicos
    monobrow:                   'minus',
    dimples:                    'smile',
    earlobe_attachment:         'ear',
    diastema:                   'smile-plus',
    ear_shape:                  'ear',
    height_polygenic:           'ruler',

    // Fisiología
    earwax_type:                'droplet',
    body_odor_intensity:        'wind',
    sweating_tendency_abcc11:   'droplets',
    inflammation_baseline:      'flame',
    asparagus_urine_smell:      'leaf',
    essential_tremor_risk:      'hand',

    // Gusto y percepción
    cilantro_soapy_taste:       'leaf',
    bitter_taste_ptc:           'leaf',
    sweet_taste_perception:     'cake',
    umami_perception:           'utensils',
    spicy_sensitivity:          'flame',
    photic_sneeze_reflex:       'sun',
    floral_odor_sensitivity:    'flower-2',

    // Metabolismo
    lactose_intolerance_adult:  'droplet',
    celiac_predisposition:      'ban',
    caffeine_metabolism_rate:   'coffee',
    caffeine_sensitivity:       'coffee',
    alcohol_asian_flush:        'wine',
    alcohol_fast_metabolism:    'wine',
    alcohol_overall_tolerance:  'wine',
    folate_metabolism_mthfr:    'pill',
    b12_absorption:             'pill',
    vitamin_d_levels:           'sun',
    omega3_endogenous:          'fish',
    fructose_tolerance:         'apple',
    diet_low_carb_response:     'scale',
    appetite_satiety:           'utensils',
    bmi_tendency_polygenic:     'scale',
    triglycerides_diet_response:'trending-up',
    ldl_cholesterol_saturated_fat: 'heart-pulse',
    salt_sensitivity_bp:        'test-tube',
    obesity_risk_fto:           'scale',
    tmem18_bmi:                 'trending-up',
    iron_overload_risk:         'beaker',
    folate_metabolism:          'pill',

    // Fitness
    muscle_power_vs_endurance:  'zap',
    vo2max_genetic:             'heart',
    aerobic_training_response:  'activity',
    muscle_recovery_rate:       'refresh-ccw',
    acl_injury_risk:            'triangle-alert',
    achilles_tendon_risk:       'triangle-alert',
    lactic_acid_tolerance:      'flame',
    running_economy:            'move',
    muscle_fiber_composition:   'zap',
    muscle_mass_potential:      'dumbbell',
    exercise_fatigue_il6:       'battery-low',
    grip_strength:              'hand',
    tendon_resistance:          'shield',
    cardio_response:            'heart-pulse',

    // Estilo de vida / sueño
    chronotype_morning_evening: 'sunrise',
    sleep_duration_optimal:     'bed',
    short_sleeper_natural:      'zap',
    insomnia_risk:              'moon',
    jet_lag_susceptibility:     'plane',
    snoring_tendency:           'volume-2',
    sleep_apnea_predisposition: 'alert-circle',
    dream_recall_vivid:         'cloud',
    sleepwalking_risk:          'move',
    reward_processing_drd2:     'target',
    altitude_resistance_epas1:  'mountain',
    cold_tolerance_ucp1:        'snowflake',
    sweating_tendency:          'droplets',
};

function getIconForTrait(traitId) {
    return TRAIT_ICONS[traitId] || 'dna';
}

if (typeof window !== 'undefined') {
    window.TRAIT_ICONS      = TRAIT_ICONS;
    window.getIconForTrait  = getIconForTrait;
}
