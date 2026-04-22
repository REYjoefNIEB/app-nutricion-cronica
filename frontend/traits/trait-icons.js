/* Trait ID → Lucide icon name (80+ traits mapeados) */
const TRAIT_ICONS = {
    // APPEARANCE — ojos
    eye_color:                    'eye',
    eye_color_intensity:          'eye',
    eye_color_blue_brown:         'eye',

    // APPEARANCE — cabello
    hair_color:                   'palette',
    hair_color_blonde:            'palette',
    hair_color_blonde_kitlg:      'palette',
    hair_color_red:               'flame',
    hair_color_red_mc1r:          'flame',
    hair_graying_early:           'star',
    hair_texture:                 'waves',
    hair_waviness:                'waves',
    hair_thickness:               'git-branch',
    male_pattern_baldness:        'user-round',
    beard_density:                'circle-dashed',
    body_hair_amount:             'sparkles',
    monobrow_pax3:                'minus',

    // APPEARANCE — piel
    skin_pigmentation:            'palette',
    skin_pigmentation_slc45a2:    'palette',
    tanning_ability:              'sun',
    freckles_tendency:            'sparkles',
    moles_density:                'circle-dot',

    // APPEARANCE — rasgos físicos
    height_genetics:              'ruler',
    height_hmga2:                 'ruler',
    height_polygenic:             'ruler',
    earlobe_attachment:           'ear',
    ear_shape:                    'ear',
    diastema:                     'smile',
    diastema_axin2:               'smile',
    dimples:                      'smile-plus',

    // PHYSIOLOGY
    earwax_type:                  'droplet',
    ear_wax:                      'droplet',
    body_odor_intensity:          'wind',
    sweating_tendency_abcc11:     'droplets',
    sweating_abcc11:              'droplets',
    sweating_tendency:            'droplets',
    inflammation_baseline:        'flame',
    inflammatory_tendency:        'flame',
    asparagus_urine_smell:        'leaf',
    asparagus_smell:              'leaf',
    essential_tremor_risk:        'hand',
    essential_tremor_lingo1:      'hand',
    pain_sensitivity:             'activity',
    vitamin_d_synthesis:          'sun',
    altitude_resistance_epas1:    'mountain',
    cold_tolerance_ucp1:          'snowflake',

    // TASTE
    cilantro_soapy_taste:         'leaf',
    cilantro_soap:                'leaf',
    bitter_taste_ptc:             'leaf',
    bitter_sensitivity:           'leaf',
    sweet_taste_perception:       'cake',
    sweet_preference:             'cake',
    umami_perception:             'utensils',
    spicy_sensitivity:            'flame',
    alcohol_taste:                'wine',
    photic_sneeze_reflex:         'sun',
    floral_odor_sensitivity:      'flower-2',
    floral_odor_or5a1:            'flower-2',

    // METABOLISM
    lactose_intolerance_adult:    'droplet',
    lactose_adult:                'droplet',
    celiac_predisposition:        'ban',
    celiac_genetic_risk:          'ban',
    caffeine_metabolism_rate:     'coffee',
    caffeine_metabolism:          'coffee',
    caffeine_sensitivity:         'coffee',
    caffeine_adenosine_sensitivity: 'coffee',
    alcohol_asian_flush:          'wine',
    alcohol_flush:                'wine',
    alcohol_fast_metabolism:      'wine',
    alcohol_overall_tolerance:    'wine',
    alcohol_tolerance_adh1c:      'wine',
    folate_metabolism_mthfr:      'pill',
    folate_metabolism:            'pill',
    b12_absorption:               'pill',
    b12_absorption_fut2:          'pill',
    vitamin_d_levels:             'sun',
    omega3_endogenous:            'fish',
    omega3_fads1:                 'fish',
    fructose_tolerance:           'apple',
    fructose_intolerance_aldob:   'apple',
    diet_low_carb_response:       'scale',
    appetite_satiety:             'utensils',
    appetite_satiety_mc4r:        'utensils',
    bmi_tendency_polygenic:       'scale',
    bmi_tendency_tmem18:          'scale',
    tmem18_bmi:                   'trending-up',
    triglycerides_diet_response:  'trending-up',
    triglycerides_apoa5:          'trending-up',
    ldl_cholesterol_saturated_fat:'heart-pulse',
    ldl_apoe_e4:                  'heart-pulse',
    salt_sensitivity_bp:          'test-tube',
    salt_sensitivity_agt:         'test-tube',
    obesity_risk_fto:             'scale',
    fto_obesity_risk:             'scale',
    iron_overload_risk:           'hexagon',
    diabetes_t2_risk:             'droplets',

    // FITNESS
    muscle_power_vs_endurance:    'zap',
    muscle_fiber:                 'zap',
    muscle_fiber_composition:     'zap',
    vo2max_genetic:               'heart',
    aerobic_potential:            'heart',
    aerobic_training_response:    'activity',
    cardio_training_response:     'heart-pulse',
    cardio_response:              'heart-pulse',
    muscle_recovery_rate:         'refresh-ccw',
    muscle_recovery_il6:          'refresh-ccw',
    acl_injury_risk:              'triangle-alert',
    acl_injury_col1a1:            'triangle-alert',
    achilles_tendon_risk:         'triangle-alert',
    lactic_acid_tolerance:        'battery-low',
    lactic_acid_mct1:             'battery-low',
    running_economy:              'move',
    running_economy_ace:          'move',
    muscle_mass_potential:        'dumbbell',
    muscle_mass_mstn:             'dumbbell',
    exercise_fatigue_il6:         'battery-low',
    grip_strength:                'hand',
    tendon_resistance:            'shield',
    tendon_resilience:            'shield',
    fat_burn_efficiency:          'flame',
    freediving_pde10a:            'waves',

    // LIFESTYLE / SLEEP
    chronotype_morning_evening:   'sunrise',
    chronotype:                   'sunrise',
    chronotype_per2:              'sunrise',
    sleep_duration_optimal:       'bed',
    sleep_duration_abcc9:         'bed',
    short_sleeper_natural:        'zap',
    short_sleeper_dec2:           'zap',
    insomnia_risk:                'moon',
    insomnia_meis1:               'moon',
    jet_lag_susceptibility:       'plane',
    jet_lag_per3:                 'plane',
    snoring_tendency:             'volume-2',
    snoring_wdr27:                'volume-2',
    sleep_apnea_predisposition:   'alert-circle',
    sleep_apnea_risk:             'alert-circle',
    dream_recall_vivid:           'cloud',
    dream_recall_comt:            'cloud',
    sleepwalking_risk:            'move',
    sleepwalking_hla:             'move',
    reward_processing_drd2:       'target',
    reward_sensitivity:           'target',
};

/* Category meta: icon + label for category headers */
const CATEGORY_META = {
    appearance: { label: 'Apariencia Física',  icon: 'palette'  },
    physiology: { label: 'Fisiología',         icon: 'activity' },
    taste:      { label: 'Gusto y Olfato',     icon: 'utensils' },
    metabolism: { label: 'Metabolismo',        icon: 'flame'    },
    fitness:    { label: 'Fitness Genético',   icon: 'dumbbell' },
    lifestyle:  { label: 'Estilo de Vida',     icon: 'leaf'     },
};

function getIconForTrait(traitId, category) {
    if (TRAIT_ICONS[traitId]) return TRAIT_ICONS[traitId];
    return CATEGORY_META[category]?.icon || 'dna';
}

if (typeof window !== 'undefined') {
    window.TRAIT_ICONS     = TRAIT_ICONS;
    window.CATEGORY_META   = CATEGORY_META;
    window.getIconForTrait = getIconForTrait;
}
if (typeof module !== 'undefined') {
    module.exports = { TRAIT_ICONS, CATEGORY_META, getIconForTrait };
}
