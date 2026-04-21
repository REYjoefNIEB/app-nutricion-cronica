/**
 * Base de datos de rasgos físicos predichos por genética — v2.0
 *
 * 27 rasgos en 5 categorías. Cada interpret() devuelve:
 * { value, confidence, note?, position }
 *
 * position: 0-100 para la barra deslizante (0 = sliderMin, 100 = sliderMax).
 *
 * Fuentes: SNPedia, 23andMe Research, GWAS Catalog, Pubmed.
 * IMPORTANTE: Las predicciones son probabilísticas (±15-30%).
 */

const PHYSICAL_TRAITS = {

    // ── APARIENCIA FÍSICA ────────────────────────────────────────────────

    eye_color: {
        name: 'Color de ojos',
        icon: '👁️',
        category: 'appearance',
        evidence: 'high',
        primarySnp: 'rs12913832',
        sliderMin: 'Oscuro (Marrón)',
        sliderMax: 'Claro (Azul/Gris)',
        interpret(genotypes) {
            const g = genotypes['rs12913832'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Azul / gris', confidence: 85, note: 'Variante HERC2 fuertemente asociada con ojos claros en europeos.', position: 90 };
            if (g === 'AG' || g === 'GA') return { value: 'Verde / avellana', confidence: 60, note: 'Genotipo heterocigoto; color intermedio frecuente.', position: 55 };
            if (g === 'AA') return { value: 'Marrón / negro', confidence: 90, note: 'Alelo ancestral. Color más común en el mundo (>79% de la población).', position: 10 };
            return null;
        }
    },

    hair_color: {
        name: 'Color de cabello',
        icon: '💇',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs1805007',
        sliderMin: 'Oscuro',
        sliderMax: 'Claro / Pelirrojo',
        interpret(genotypes) {
            const mc1r = genotypes['rs1805007'];
            if (!mc1r) return null;
            if (mc1r === 'TT') return { value: 'Pelirrojo', confidence: 70, note: 'Homocigoto MC1R. Alta probabilidad de cabello rojo/naranja.', position: 90 };
            if (mc1r === 'CT' || mc1r === 'TC') return { value: 'Pelirrojo / rubio', confidence: 50, note: 'Portador MC1R. Puede tener reflejos rojizos o dorados.', position: 70 };
            const herc2 = genotypes['rs12913832'];
            if (herc2 === 'GG') return { value: 'Rubio / castaño claro', confidence: 60, note: 'HERC2 GG asociado con cabello claro.', position: 65 };
            return { value: 'Castaño / negro', confidence: 75, note: 'Sin variantes de aclaramiento detectadas.', position: 15 };
        }
    },

    hair_texture: {
        name: 'Textura del cabello',
        icon: '〰️',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs3827760',
        sliderMin: 'Fino / Rizado',
        sliderMax: 'Grueso / Lacio',
        interpret(genotypes) {
            const g = genotypes['rs3827760'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Muy grueso y lacio', confidence: 80, note: 'Variante EDAR. Muy común en asiáticos del Este y amerindios. Cabello típicamente oscuro y grueso.', position: 90 };
            if (g === 'AG' || g === 'GA') return { value: 'Grueso / ondulado', confidence: 65, note: 'Efecto intermedio de EDAR.', position: 60 };
            if (g === 'GG') return { value: 'Fino / rizados posibles', confidence: 70, note: 'Sin variante EDAR. Textura más variable, influenciada por otros genes.', position: 20 };
            return null;
        }
    },

    skin_pigmentation: {
        name: 'Tono de piel',
        icon: '🎨',
        category: 'appearance',
        evidence: 'high',
        primarySnp: 'rs1426654',
        sliderMin: 'Piel Oscura',
        sliderMax: 'Piel Clara',
        interpret(genotypes) {
            const g = genotypes['rs1426654'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Piel muy clara', confidence: 85, note: 'SLC24A5 GG. Variante predominante en europeos — pigmentación reducida. Presente en ~100% de europeos.', position: 92 };
            if (g === 'AG' || g === 'GA') return { value: 'Piel intermedia', confidence: 65, note: 'Heterocigoto SLC24A5. Tono intermedio. Frecuente en poblaciones mixtas latinoamericanas.', position: 55 };
            if (g === 'AA') return { value: 'Piel oscura / morena', confidence: 80, note: 'Alelo ancestral SLC24A5. Predominante en africanos subsaharianos y asiáticos del Este.', position: 12 };
            return null;
        }
    },

    height_genetics: {
        name: 'Potencial de estatura genético',
        icon: '📏',
        category: 'appearance',
        evidence: 'low',
        primarySnp: 'rs1834640',
        sliderMin: 'Tendencia menor',
        sliderMax: 'Tendencia mayor',
        interpret(genotypes) {
            const g = genotypes['rs1834640'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Mayor estatura (tendencia)', confidence: 55, note: 'HMGA2 CC. Asociado con mayor altura en estudios GWAS. Recuerda: la estatura depende de +700 genes + nutrición.', position: 78 };
            if (g === 'CG' || g === 'GC') return { value: 'Estatura intermedia', confidence: 45, note: 'Efecto heterocigoto. La estatura final depende de muchos genes y factores ambientales.', position: 50 };
            if (g === 'GG') return { value: 'Tendencia a menor estatura', confidence: 52, note: 'Alelo HMGA2 asociado con menor talla en estudios de GWAS.', position: 25 };
            return null;
        }
    },

    // ── FISIOLOGÍA ────────────────────────────────────────────────────────

    ear_wax: {
        name: 'Tipo de cerumen',
        icon: '👂',
        category: 'physiology',
        evidence: 'very_high',
        primarySnp: 'rs17822931',
        sliderMin: 'Seco (blanco)',
        sliderMax: 'Húmedo (marrón)',
        interpret(genotypes) {
            const g = genotypes['rs17822931'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Seco (blanco/escamoso)', confidence: 95, note: 'ABCC11 TT. Dominante en asiáticos del Este y amerindios. Sin bromhidrosis.', position: 10 };
            if (g === 'CT' || g === 'TC') return { value: 'Mixto / intermedio', confidence: 75, note: 'Heterocigoto. Variable entre tipos.', position: 50 };
            if (g === 'CC') return { value: 'Húmedo (marrón/pegajoso)', confidence: 95, note: 'ABCC11 CC. Dominante en europeos y africanos. Puede haber bromhidrosis axilar.', position: 90 };
            return null;
        }
    },

    asparagus_smell: {
        name: 'Detectas olor a espárragos en orina',
        icon: '🥬',
        category: 'physiology',
        evidence: 'moderate',
        primarySnp: 'rs4481887',
        sliderMin: 'No lo detectas',
        sliderMax: 'Sí, lo detectas',
        interpret(genotypes) {
            const g = genotypes['rs4481887'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Sí, lo detectas', confidence: 70, note: 'Receptor olfativo OR2M7 activado. Detectas el metanotiol que producen los espárragos.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Parcialmente', confidence: 55, position: 50 };
            if (g === 'GG') return { value: 'No lo detectas', confidence: 75, note: 'Sin sensibilidad al metanotiol del espárrago. No detectas el olor.', position: 15 };
            return null;
        }
    },

    pain_sensitivity: {
        name: 'Sensibilidad al dolor y estrés',
        icon: '🧠',
        category: 'physiology',
        evidence: 'moderate',
        primarySnp: 'rs4680',
        sliderMin: 'Baja Sensibilidad',
        sliderMax: 'Alta Sensibilidad',
        interpret(genotypes) {
            const g = genotypes['rs4680'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Baja sensibilidad al dolor', confidence: 65, note: 'COMT Val/Val. Dopamina se degrada rápido; mayor umbral al dolor. Menor sensibilidad al estrés crónico.', position: 20 };
            if (g === 'AG' || g === 'GA') return { value: 'Sensibilidad moderada', confidence: 55, note: 'Heterocigoto COMT. Balance entre tolerancia al dolor y sensibilidad.', position: 50 };
            if (g === 'AA') return { value: 'Alta sensibilidad al dolor', confidence: 65, note: 'COMT Met/Met. Mayor acumulación de dopamina; más sensible al dolor y al estrés crónico.', position: 80 };
            return null;
        }
    },

    inflammatory_tendency: {
        name: 'Tendencia inflamatoria basal',
        icon: '🔥',
        category: 'physiology',
        evidence: 'moderate',
        primarySnp: 'rs1800795',
        sliderMin: 'Baja Inflamación',
        sliderMax: 'Alta Inflamación',
        interpret(genotypes) {
            const g = genotypes['rs1800795'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Baja tendencia inflamatoria', confidence: 60, note: 'IL-6 CC. Menor producción de interleucina-6 ante estímulos.', position: 20 };
            if (g === 'CG' || g === 'GC') return { value: 'Tendencia inflamatoria media', confidence: 50, note: 'Respuesta inflamatoria estándar ante infecciones y lesiones.', position: 50 };
            if (g === 'GG') return { value: 'Mayor tendencia inflamatoria', confidence: 60, note: 'IL-6 GG. Mayor producción de citoquinas. Beneficio extra de antioxidantes y omega-3.', position: 80 };
            return null;
        }
    },

    vitamin_d_synthesis: {
        name: 'Síntesis de Vitamina D',
        icon: '☀️',
        category: 'physiology',
        evidence: 'high',
        primarySnp: 'rs2282679',
        sliderMin: 'Síntesis Deficiente',
        sliderMax: 'Síntesis Normal',
        interpret(genotypes) {
            const g = genotypes['rs2282679'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Síntesis normal', confidence: 70, note: 'GC (Vitamina D binding protein) normal. Exposición solar moderada es suficiente.', position: 85 };
            if (g === 'AC' || g === 'CA') return { value: 'Síntesis reducida', confidence: 60, note: 'Nivel bajo-normal. Suplementa 1.000-2.000 UI/día, especialmente en invierno o latitudes altas.', position: 50 };
            if (g === 'CC') return { value: 'Déficit probable', confidence: 70, note: '⚠️ Alta probabilidad de déficit de vitamina D. Suplementa 2.000-4.000 UI/día. Mide 25-OH-Vitamina D con tu médico.', position: 15 };
            return null;
        }
    },

    // ── GUSTO Y OLFATO ────────────────────────────────────────────────────

    cilantro_soap: {
        name: 'Sabor a jabón del cilantro',
        icon: '🌿',
        category: 'taste',
        evidence: 'high',
        primarySnp: 'rs72921001',
        sliderMin: 'No, sabe fresco',
        sliderMax: 'Sí, sabe a jabón',
        interpret(genotypes) {
            const g = genotypes['rs72921001'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Sí, sabe a jabón', confidence: 70, note: 'OR6A2 CC. Detectas los aldehídos del cilantro como jabonosos. ~15% de la población global.', position: 90 };
            if (g === 'AC' || g === 'CA') return { value: 'Ligeramente jabonoso', confidence: 50, note: 'Efecto intermedio. Puede variar con la cantidad de cilantro.', position: 50 };
            if (g === 'AA') return { value: 'No, sabe fresco / herbal', confidence: 80, note: 'Sin sensibilidad especial al aldehído del cilantro. Lo percibes como un sabor fresco.', position: 10 };
            return null;
        }
    },

    bitter_sensitivity: {
        name: 'Sensibilidad al amargor',
        icon: '🥦',
        category: 'taste',
        evidence: 'high',
        primarySnp: 'rs713598',
        sliderMin: 'No-catador',
        sliderMax: 'Super-catador',
        interpret(genotypes) {
            const g = genotypes['rs713598'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Super-catador', confidence: 80, note: 'TAS2R38 GG. Muy sensible a amargos en brócoli, col de Bruselas, café y cerveza oscura.', position: 90 };
            if (g === 'CG' || g === 'GC') return { value: 'Catador promedio', confidence: 65, note: 'Sensibilidad media al amargor.', position: 50 };
            if (g === 'CC') return { value: 'No-catador', confidence: 80, note: 'Poca sensibilidad al amargor. Toleras mejor vegetales amargos y medicamentos de sabor amargo.', position: 10 };
            return null;
        }
    },

    sweet_preference: {
        name: 'Preferencia por lo dulce',
        icon: '🍰',
        category: 'taste',
        evidence: 'low',
        primarySnp: 'rs35874116',
        sliderMin: 'Baja preferencia',
        sliderMax: 'Alta preferencia',
        interpret(genotypes) {
            const g = genotypes['rs35874116'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Alta preferencia por dulces', confidence: 60, note: 'TAS1R3 TT. Receptor del sabor dulce más sensible. Mayor atracción hacia carbohidratos simples.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Preferencia moderada', confidence: 50, position: 50 };
            if (g === 'CC') return { value: 'Baja preferencia por dulces', confidence: 60, position: 22 };
            return null;
        }
    },

    alcohol_taste: {
        name: 'Velocidad de metabolismo del alcohol',
        icon: '🍷',
        category: 'taste',
        evidence: 'high',
        primarySnp: 'rs2250072',
        sliderMin: 'Lento',
        sliderMax: 'Rápido',
        interpret(genotypes) {
            const g = genotypes['rs2250072'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Rápido (ADH1B*2)', confidence: 75, note: 'ADH1B*2: convierte etanol a acetaldehído muy rápido. Protector contra alcoholismo. Común en asiáticos del Este.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Velocidad intermedia', confidence: 60, note: 'Metabolismo intermedio del etanol.', position: 55 };
            if (g === 'AA') return { value: 'Lento (ADH1B*1)', confidence: 70, note: 'ADH1B ancestral. Metabolismo normal del alcohol. Más común en europeos y africanos.', position: 20 };
            return null;
        }
    },

    // ── METABOLISMO ────────────────────────────────────────────────────────

    caffeine_metabolism: {
        name: 'Metabolismo de la cafeína',
        icon: '☕',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs762551',
        sliderMin: 'Lento',
        sliderMax: 'Rápido',
        interpret(genotypes) {
            const g = genotypes['rs762551'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Metabolizador rápido', confidence: 80, note: 'CYP1A2 *1F. La cafeína se elimina rápido; menor efecto en el sueño. Puedes tomar café hasta más tarde.', position: 90 };
            if (g === 'AC' || g === 'CA') return { value: 'Metabolizador intermedio', confidence: 70, position: 55 };
            if (g === 'CC') return { value: 'Metabolizador lento', confidence: 80, note: 'CYP1A2 normal. La cafeína dura 6-8h. Evita café después de las 14:00 para no afectar el sueño.', position: 15 };
            return null;
        }
    },

    alcohol_flush: {
        name: 'Rubor facial al tomar alcohol',
        icon: '🍺',
        category: 'metabolism',
        evidence: 'very_high',
        primarySnp: 'rs671',
        sliderMin: 'Sin rubor',
        sliderMax: 'Rubor severo',
        interpret(genotypes) {
            const g = genotypes['rs671'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Rubor severo + intolerancia', confidence: 95, note: 'ALDH2*2 homocigoto. Acumulación de acetaldehído. ⚠️ Riesgo aumentado de cáncer esofágico con consumo crónico.', position: 95 };
            if (g === 'AG' || g === 'GA') return { value: 'Rubor moderado', confidence: 85, note: 'ALDH2 heterocigoto. Metabolismo reducido del acetaldehído. Rubor y malestar al beber.', position: 60 };
            if (g === 'GG') return { value: 'Sin rubor (normal)', confidence: 95, note: 'ALDH2 normal. Metabolismo eficiente del alcohol.', position: 10 };
            return null;
        }
    },

    lactose_adult: {
        name: 'Tolerancia a la lactosa de adulto',
        icon: '🥛',
        category: 'metabolism',
        evidence: 'very_high',
        primarySnp: 'rs4988235',
        sliderMin: 'Intolerante',
        sliderMax: 'Tolerante',
        interpret(genotypes) {
            const g = genotypes['rs4988235'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Tolerante (lactasa persistente)', confidence: 90, note: 'MCM6 TT. Produce lactasa en la adultez. Puede digerir productos lácteos normalmente.', position: 90 };
            if (g === 'CT' || g === 'TC') return { value: 'Parcialmente tolerante', confidence: 75, note: 'Un alelo de persistencia. Tolerancia variable; puede haber síntomas con grandes cantidades.', position: 55 };
            if (g === 'CC') return { value: 'Intolerante (lactasa no-persistente)', confidence: 85, note: 'MCM6 CC. La lactasa decrece en la adultez. Síntomas digestivos con productos lácteos.', position: 15 };
            return null;
        }
    },

    celiac_genetic_risk: {
        name: 'Riesgo genético de celiaquía',
        icon: '🌾',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs2187668',
        sliderMin: 'Sin alelo HLA-DQ2',
        sliderMax: 'Alelo HLA-DQ2 presente',
        interpret(genotypes) {
            const g = genotypes['rs2187668'];
            if (!g) return null;
            if (g === 'GG') return { value: 'HLA-DQ2.5 presente (riesgo)', confidence: 70, note: '⚠️ HLA-DQ2.5 presente. Necesario pero no suficiente para celiaquía (~1:100 personas con este HLA desarrolla celiaquía). Ante síntomas digestivos, consulta médico.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Portador parcial (bajo riesgo)', confidence: 55, note: 'Portador de un alelo DQ2. Riesgo bajo. Monitoriza síntomas digestivos.', position: 45 };
            if (g === 'AA') return { value: 'Sin alelo HLA-DQ2.5', confidence: 70, note: 'No portador de HLA-DQ2.5. La celiaquía clásica es muy poco probable.', position: 10 };
            return null;
        }
    },

    diabetes_t2_risk: {
        name: 'Riesgo genético de Diabetes Tipo 2',
        icon: '🩸',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs7903146',
        sliderMin: 'Riesgo Normal',
        sliderMax: 'Riesgo Elevado',
        interpret(genotypes) {
            const g = genotypes['rs7903146'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Riesgo normal', confidence: 75, note: 'TCF7L2 CC. Sin aumento de riesgo genético para diabetes tipo 2.', position: 15 };
            if (g === 'CT' || g === 'TC') return { value: 'Riesgo moderadamente elevado', confidence: 65, note: 'TCF7L2 CT. +30% de riesgo vs. CC. Mantén dieta mediterránea y ejercicio regular.', position: 55 };
            if (g === 'TT') return { value: 'Riesgo significativamente elevado', confidence: 70, note: '⚠️ TCF7L2 TT. +80% de riesgo vs. CC. Dieta baja en azúcares simples, ejercicio aeróbico y chequeo de glucemia anual.', position: 85 };
            return null;
        }
    },

    iron_overload_risk: {
        name: 'Riesgo de sobrecarga de hierro (HFE)',
        icon: '🫀',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs1800562',
        sliderMin: 'Normal',
        sliderMax: 'Riesgo Hemocromatosis',
        interpret(genotypes) {
            const g = genotypes['rs1800562'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Normal (sin mutación HFE)', confidence: 80, note: 'HFE C282Y no detectado. Absorción de hierro normal.', position: 10 };
            if (g === 'AG' || g === 'GA') return { value: 'Portador (un alelo C282Y)', confidence: 70, note: 'Portador de HFE C282Y. Riesgo bajo de hemocromatosis; vigila ferritina periódicamente.', position: 50 };
            if (g === 'AA') return { value: 'Riesgo elevado de hemocromatosis', confidence: 80, note: '⚠️ Homocigoto HFE C282Y. Alta probabilidad de hemocromatosis hereditaria. Mide ferritina y saturación de transferrina con tu médico.', position: 88 };
            return null;
        }
    },

    folate_metabolism: {
        name: 'Metabolismo del folato (MTHFR)',
        icon: '🧬',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs1801133',
        sliderMin: 'Normal',
        sliderMax: 'Reducido',
        interpret(genotypes) {
            const g = genotypes['rs1801133'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Metabolismo normal del folato', confidence: 75, note: 'MTHFR C677C. Conversión eficiente de folato a su forma activa (L-metilfolato).', position: 15 };
            if (g === 'AG' || g === 'GA') return { value: 'Metabolismo reducido (~35%)', confidence: 65, note: 'MTHFR C677T heterocigoto. Actividad enzimática reducida ~35%. Prioriza folato activo (L-metilfolato) en suplementos.', position: 55 };
            if (g === 'AA') return { value: 'Metabolismo muy reducido (~70%)', confidence: 72, note: '⚠️ MTHFR T677T. Actividad reducida ~70%. Riesgo de hiperhomocisteinemia. Suplementa B12 (metilcobalamina) + L-metilfolato y evita ácido fólico sintético.', position: 85 };
            return null;
        }
    },

    // ── FITNESS GENÉTICO ──────────────────────────────────────────────────

    muscle_fiber: {
        name: 'Tipo de fibra muscular dominante',
        icon: '💪',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs1815739',
        sliderMin: 'Resistencia (tipo I)',
        sliderMax: 'Potencia (tipo II)',
        interpret(genotypes) {
            const g = genotypes['rs1815739'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Fibras rápidas (potencia/sprint)', confidence: 75, note: 'ACTN3 RR. Actinina-3 presente. Ventaja para velocidad, HIIT, halterofilia. Élite en sprints.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Mixto (versátil)', confidence: 60, note: 'ACTN3 RX. Puede desarrollar tanto resistencia como potencia. Bueno para deportes mixtos.', position: 50 };
            if (g === 'TT') return { value: 'Fibras lentas (resistencia)', confidence: 75, note: 'ACTN3 XX. Sin actinina-3. Ventaja para maratón, ciclismo de fondo, triatlón.', position: 15 };
            return null;
        }
    },

    aerobic_potential: {
        name: 'Potencial aeróbico (VO2max)',
        icon: '🫁',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs8192678',
        sliderMin: 'Menor potencial',
        sliderMax: 'Alto potencial',
        interpret(genotypes) {
            const g = genotypes['rs8192678'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Alto potencial aeróbico', confidence: 65, note: 'PPARGC1A GG. Buena respuesta al entrenamiento cardiovascular. VO2max puede ser elevado.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Potencial aeróbico moderado', confidence: 55, note: 'Respuesta promedio al cardio. El entrenamiento mejora el VO2max de forma estándar.', position: 50 };
            if (g === 'AA') return { value: 'Potencial aeróbico menor', confidence: 60, note: 'Necesitas mayor volumen de entrenamiento cardio para lograr el mismo VO2max. El esfuerzo compensa la genética.', position: 20 };
            return null;
        }
    },

    tendon_resilience: {
        name: 'Resistencia de tendones y ligamentos',
        icon: '🦵',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs12722',
        sliderMin: 'Mayor riesgo lesión',
        sliderMax: 'Tejido resistente',
        interpret(genotypes) {
            const g = genotypes['rs12722'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Tejido conectivo resistente', confidence: 65, note: 'COL5A1 TT. Menor riesgo de lesión de tendones y ligamentos con carga normal.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Resistencia moderada', confidence: 55, note: 'Riesgo moderado. Enfatiza calentamiento y progresión gradual de carga.', position: 50 };
            if (g === 'CC') return { value: 'Mayor susceptibilidad a lesión', confidence: 65, note: '⚠️ Mayor susceptibilidad a tendinitis y esguinces. Calienta siempre 10+ min, trabaja flexibilidad y ejercicios excéntricos.', position: 15 };
            return null;
        }
    },

    fat_burn_efficiency: {
        name: 'Eficiencia en quema de grasa',
        icon: '🔋',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs1799883',
        sliderMin: 'Prefiere glucógeno',
        sliderMax: 'Quema grasa eficiente',
        interpret(genotypes) {
            const g = genotypes['rs1799883'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Muy eficiente quemando grasa', confidence: 65, note: 'FABP2 AA. Bien adaptado para cardio en ayunas o dieta cetogénica. Buen oxidador de ácidos grasos.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Balance grasa / glucógeno', confidence: 55, note: 'Balance entre oxidación de grasas y glucógeno como combustible.', position: 50 };
            if (g === 'GG') return { value: 'Prefiere glucógeno como combustible', confidence: 65, note: 'Los carbohidratos pre-entreno son especialmente importantes para este perfil.', position: 20 };
            return null;
        }
    },

    cardio_training_response: {
        name: 'Respuesta al entrenamiento cardiovascular',
        icon: '❤️',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs1042713',
        sliderMin: 'Respuesta baja',
        sliderMax: 'Alta respuesta',
        interpret(genotypes) {
            const g = genotypes['rs1042713'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Excelente respuesta al cardio', confidence: 60, note: 'ADRB2 AA. El entrenamiento aeróbico te da grandes ganancias en VO2max y función cardiovascular.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Respuesta promedio', confidence: 50, note: 'Respuesta estándar al entrenamiento cardio.', position: 50 };
            if (g === 'GG') return { value: 'Respuesta baja al cardio', confidence: 60, note: 'Necesitas mayor volumen e intensidad cardiovascular para progresar. Responde mejor al entrenamiento de fuerza.', position: 20 };
            return null;
        }
    },

    // ── CONDICIONES MÉDICAS (con disclaimer obligatorio) ────────────────

    alopecia_androgenetic: {
        name: 'Alopecia androgénica (calvicie)',
        icon: '👨‍🦲',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs6152',
        sliderMin: 'Menor predisposición',
        sliderMax: 'Mayor predisposición',
        interpret(genotypes) {
            const g = genotypes['rs6152'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor predisposición genética', confidence: 70, note: 'Variante AR rs6152. En hombres, fuertemente asociada con inicio temprano de alopecia androgénica.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Predisposición moderada', confidence: 55, note: 'Heterocigoto. Riesgo intermedio, muy influenciado por testosterona y factores ambientales.', position: 50 };
            if (g === 'GG') return { value: 'Menor predisposición genética', confidence: 65, note: 'Genotipo protector frente a alopecia androgénica.', position: 15 };
            return null;
        }
    },

    myopia_risk: {
        name: 'Predisposición a miopía',
        icon: '👓',
        category: 'medical_conditions',
        evidence: 'moderate',
        disclaimer: true,
        primarySnp: 'rs524952',
        sliderMin: 'Menor riesgo',
        sliderMax: 'Mayor riesgo',
        interpret(genotypes) {
            const g = genotypes['rs524952'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor predisposición a miopía', confidence: 55, note: 'Variante GJD2 rs524952. Asociada con mayor eje ocular y miopía en estudios GWAS europeos y asiáticos.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Riesgo moderado', confidence: 45, note: 'El ambiente (tiempo en interiores, lectura) tiene gran impacto adicional.', position: 50 };
            if (g === 'GG') return { value: 'Menor predisposición genética', confidence: 50, note: 'Tiempo al aire libre sigue siendo protector independientemente del genotipo.', position: 20 };
            return null;
        }
    },

    cardiovascular_risk: {
        name: 'Riesgo cardiovascular (9p21.3)',
        icon: '❤️‍🔥',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs10757274',
        sliderMin: 'Menor riesgo genético',
        sliderMax: 'Mayor riesgo genético',
        interpret(genotypes) {
            const g = genotypes['rs10757274'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Mayor predisposición a ECV', confidence: 65, note: 'Locus 9p21.3. Uno de los factores genéticos de riesgo cardiovascular más replicados en GWAS. Aumenta riesgo de IAM ~30% relativo.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Riesgo moderado', confidence: 55, note: 'Heterocigoto 9p21.3. El estilo de vida (dieta, ejercicio, no fumar) reduce el riesgo independientemente del genotipo.', position: 50 };
            if (g === 'AA') return { value: 'Menor riesgo genético', confidence: 60, note: 'Genotipo de menor riesgo en el locus 9p21.3. Los factores ambientales siguen siendo determinantes.', position: 20 };
            return null;
        }
    },

    blood_clotting_risk: {
        name: 'Riesgo de trombosis (Factor V Leiden)',
        icon: '🩸',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs6025',
        sliderMin: 'Sin variante',
        sliderMax: 'Portador / Homocigoto',
        interpret(genotypes) {
            const g = genotypes['rs6025'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Homocigoto Factor V Leiden', confidence: 95, note: '⚠️ CONSULTA MÉDICA URGENTE. Homocigoto rs6025 (Factor V Leiden). Riesgo muy elevado de trombosis venosa profunda y embolismo pulmonar. Requiere evaluación hematológica.', position: 100 };
            if (g === 'AG' || g === 'GA') return { value: 'Portador Factor V Leiden', confidence: 90, note: 'Heterocigoto rs6025. Riesgo 3-8x mayor de trombosis venosa. Comunica a tu médico antes de cirugías, viajes largos o uso de anticonceptivos hormonales.', position: 70 };
            if (g === 'GG') return { value: 'Sin variante Factor V Leiden', confidence: 95, note: 'No se detecta la variante rs6025 (Factor V Leiden). El riesgo de trombosis por este gen es estándar.', position: 5 };
            return null;
        }
    },

    alzheimer_risk_apoe: {
        name: 'Riesgo Alzheimer (APOE)',
        icon: '🧠',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs7412',
        sliderMin: 'Menor riesgo genético',
        sliderMax: 'Mayor riesgo genético',
        interpret(genotypes) {
            const g = genotypes['rs7412'];
            if (!g) return null;
            // rs7412 distingue APOE e2 (alelo protector): TT=e2/e2, CT=e2/e3, CC=e3/e3 (no distingue e4 sin rs429358)
            if (g === 'TT') return { value: 'APOE ε2/ε2 — Menor riesgo', confidence: 70, note: 'APOE ε2 es el alelo protector frente a Alzheimer. Portadores tienen menor riesgo que la media. No elimina el riesgo por otros factores.', position: 15 };
            if (g === 'CT' || g === 'TC') return { value: 'APOE ε2/ε3 — Riesgo reducido', confidence: 60, note: 'Un alelo protector APOE ε2. Riesgo levemente inferior a la media de la población.', position: 30 };
            if (g === 'CC') return { value: 'APOE ε3/ε3 — Riesgo estándar', confidence: 55, note: 'Genotipo más común (≈60% de la población). El riesgo de Alzheimer es el de la población general. Factores de estilo de vida siguen siendo clave.', position: 50 };
            return null;
        }
    },

    hemochromatosis_risk: {
        name: 'Riesgo de hemocromatosis hereditaria',
        icon: '🔴',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs1800562',
        sliderMin: 'Sin variante',
        sliderMax: 'Alto riesgo',
        interpret(genotypes) {
            const g = genotypes['rs1800562'];
            if (!g) return null;
            // rs1800562 = HFE C282Y
            if (g === 'AA') return { value: 'Homocigoto C282Y — Alto riesgo', confidence: 90, note: '⚠️ CONSULTA MÉDICA. Homocigoto HFE C282Y. Causa más común de hemocromatosis hereditaria. Acumulación de hierro puede dañar hígado, corazón y páncreas. Requiere ferritina sérica y evaluación gastroenterológica.', position: 95 };
            if (g === 'AG' || g === 'GA') return { value: 'Portador C282Y — Riesgo bajo-moderado', confidence: 80, note: 'Heterocigoto HFE C282Y. Generalmente no desarrolla la enfermedad solo, pero puede si también porta H63D. Monitorea ferritina periódicamente.', position: 45 };
            if (g === 'GG') return { value: 'Sin variante C282Y', confidence: 85, note: 'No se detecta la variante HFE C282Y. Riesgo de hemocromatosis por esta variante es mínimo.', position: 5 };
            return null;
        }
    },

    malignant_hyperthermia: {
        name: 'Hipertermia maligna (anestesia)',
        icon: '🌡️',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs193922747',
        sliderMin: 'Sin variante conocida',
        sliderMax: 'Portador de riesgo',
        interpret(genotypes) {
            const g = genotypes['rs193922747'];
            if (!g) return null;
            if (g !== 'GG' && g !== 'AA') return { value: 'Posible variante RYR1', confidence: 70, note: '⚠️ INFORMA A TU ANESTESIÓLOGO. Genotipo inusual en RYR1. La hipertermia maligna es una emergencia potencialmente letal con ciertos anestésicos volátiles. Genotipificación confirmatoria recomendada antes de cirugías electivas.', position: 75 };
            return { value: 'Sin variante RYR1 detectada', confidence: 60, note: 'No se detecta la variante rs193922747. Existen otras variantes RYR1 no incluidas en este análisis. Comunica siempre tu historial familiar al anestesiólogo.', position: 10 };
        }
    },

    celiac_predisposition: {
        name: 'Predisposición celíaca (HLA-DQ2/DQ8)',
        icon: '🌾',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs2187668',
        sliderMin: 'Sin haplotipos de riesgo',
        sliderMax: 'Haplotipo de alto riesgo',
        interpret(genotypes) {
            const g = genotypes['rs2187668'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Alta predisposición HLA-DQ2.5', confidence: 80, note: 'Homocigoto HLA-DQ2.5. Presente en >90% de celíacos. El riesgo genético es máximo, pero solo ~3% de portadores desarrollan la enfermedad activa. Ante síntomas, solicita anticuerpos tTG-IgA.', position: 90 };
            if (g === 'CT' || g === 'TC') return { value: 'Predisposición moderada HLA-DQ2.5', confidence: 70, note: 'Portador de un alelo HLA-DQ2.5. Predisposición elevada. El gluten no debe eliminarse sin diagnóstico confirmado.', position: 60 };
            if (g === 'CC') return { value: 'Sin haplotipo HLA-DQ2.5', confidence: 75, note: 'No se detecta HLA-DQ2.5. El riesgo de celiaquía es bajo, aunque HLA-DQ8 y otras variantes no están incluidos en este análisis.', position: 10 };
            return null;
        }
    },

    type2_diabetes_risk: {
        name: 'Riesgo de diabetes tipo 2 (TCF7L2)',
        icon: '🍬',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs7903146',
        sliderMin: 'Menor riesgo',
        sliderMax: 'Mayor riesgo',
        interpret(genotypes) {
            const g = genotypes['rs7903146'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor predisposición DM2', confidence: 70, note: 'Homocigoto TCF7L2 T. Factor de riesgo más replicado para diabetes tipo 2 en GWAS mundiales. El ejercicio y la dieta mediterránea reducen el riesgo hasta en un 70%.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Riesgo moderado DM2', confidence: 60, note: 'Heterocigoto TCF7L2. Riesgo intermedio. Beneficio máximo de estilo de vida saludable.', position: 55 };
            if (g === 'CC') return { value: 'Menor riesgo genético DM2', confidence: 65, note: 'Genotipo de menor riesgo TCF7L2. El estilo de vida sigue siendo el factor protector más importante.', position: 20 };
            return null;
        }
    },

    lactose_intolerance_adult: {
        name: 'Intolerancia a la lactosa adulta',
        icon: '🥛',
        category: 'medical_conditions',
        evidence: 'high',
        disclaimer: false,
        primarySnp: 'rs4988235',
        sliderMin: 'No persistencia (intolerante)',
        sliderMax: 'Persistencia (tolera lactosa)',
        interpret(genotypes) {
            const g = genotypes['rs4988235'];
            if (!g) return null;
            if (g === 'GG') return { value: 'No persistencia de lactasa — Intolerante', confidence: 90, note: 'Homocigoto LCT-13910 CC (rs4988235 GG). La actividad de la lactasa cae tras el destete. Síntomas: hinchazón, diarrea con lácteos. Prueba diagnóstica: H2 expirado.', position: 5 };
            if (g === 'AG' || g === 'GA') return { value: 'Persistencia parcial', confidence: 70, note: 'Heterocigoto. Tolerancia variable. Algunos lácteos fermentados (yogur, queso curado) suelen tolerarse mejor.', position: 50 };
            if (g === 'AA') return { value: 'Persistencia de lactasa — Tolera bien', confidence: 88, note: 'Homocigoto LCT-13910 TT. La variante de persistencia europea. Alta probabilidad de tolerancia a lácteos en la adultez.', position: 95 };
            return null;
        }
    },

    // ── PERSONALIDAD (exploratorio, baja evidencia individual) ──────────

    novelty_seeking: {
        name: 'Búsqueda de novedades (dopamina)',
        icon: '🎯',
        category: 'personality',
        evidence: 'low',
        disclaimer: false,
        primarySnp: 'rs4633',
        sliderMin: 'Conservador / estable',
        sliderMax: 'Explorador / impulsivo',
        interpret(genotypes) {
            const g = genotypes['rs4633'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor tendencia exploradora', confidence: 35, note: 'COMT rs4633 TT. Relacionado con mayor disponibilidad de dopamina prefrontal. Tendencia a buscar estímulos nuevos. Evidencia aún preliminar (p > 0.05 en varios estudios).', position: 75 };
            if (g === 'CT' || g === 'TC') return { value: 'Balance exploración/estabilidad', confidence: 30, note: 'Genotipo intermedio. El temperamento es multifactorial y depende de cientos de variantes.', position: 50 };
            if (g === 'CC') return { value: 'Tendencia más conservadora', confidence: 35, note: 'COMT rs4633 CC. Menor disponibilidad de dopamina prefrontal. Relacionado con mayor estabilidad y cautela. Evidencia preliminar.', position: 25 };
            return null;
        }
    },

    stress_resilience: {
        name: 'Resiliencia al estrés (BDNF)',
        icon: '🧘',
        category: 'personality',
        evidence: 'low',
        disclaimer: false,
        primarySnp: 'rs6265',
        sliderMin: 'Mayor sensibilidad al estrés',
        sliderMax: 'Mayor resiliencia',
        interpret(genotypes) {
            const g = genotypes['rs6265'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Posible mayor sensibilidad al estrés', confidence: 40, note: 'BDNF Val66Met homocigoto Met. Estudios preliminares asocian con mayor sensibilidad al estrés y respuesta emocional. La plasticidad cerebral depende de múltiples genes y del entorno.', position: 25 };
            if (g === 'AG' || g === 'GA') return { value: 'Perfil intermedio', confidence: 35, note: 'Heterocigoto BDNF Val/Met. Evidencia mixta. El ejercicio y las relaciones sociales son los moduladores más potentes del BDNF independientemente del genotipo.', position: 50 };
            if (g === 'GG') return { value: 'Mayor producción de BDNF', confidence: 40, note: 'BDNF Val66Val. Genotipo de mayor expresión de BDNF. Relacionado con mayor plasticidad sináptica. La evidencia individual sigue siendo limitada.', position: 75 };
            return null;
        }
    },

    anxiety_tendency: {
        name: 'Tendencia a la ansiedad (SLC6A4)',
        icon: '😰',
        category: 'personality',
        evidence: 'low',
        disclaimer: false,
        primarySnp: 'rs4570625',
        sliderMin: 'Menor tendencia ansiosa',
        sliderMax: 'Mayor tendencia ansiosa',
        interpret(genotypes) {
            const g = genotypes['rs4570625'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Mayor sensibilidad serotoninérgica', confidence: 35, note: 'TPH2 rs4570625 GG. Relacionado con menor síntesis de serotonina en algunas poblaciones. La ansiedad es multifactorial; este marcador tiene efecto pequeño.', position: 65 };
            if (g === 'GT' || g === 'TG') return { value: 'Perfil intermedio', confidence: 30, note: 'Genotipo heterocigoto. Evidencia débil para predicción individual.', position: 50 };
            if (g === 'TT') return { value: 'Menor tendencia ansiosa genética', confidence: 35, note: 'TPH2 TT. Producción de serotonina prefrontal más eficiente en algunos estudios. La resiliencia se entrena más allá del genotipo.', position: 30 };
            return null;
        }
    },

    // ── ESTILO DE VIDA ────────────────────────────────────────────────────

    chronotype: {
        name: 'Cronotipo (matutino / nocturno)',
        icon: '🌅',
        category: 'lifestyle',
        evidence: 'moderate',
        disclaimer: false,
        primarySnp: 'rs2740390',
        sliderMin: 'Nocturno',
        sliderMax: 'Matutino',
        interpret(genotypes) {
            const g = genotypes['rs2740390'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Tendencia matutina', confidence: 55, note: 'Variante CLOCK rs2740390 CC. Asociada con preferencia por horarios tempranos. Dormir y despertar antes puede mejorar tu concentración y estado de ánimo.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Cronotipo intermedio', confidence: 45, note: 'Genotipo heterocigoto CLOCK. Preferencia ni claramente matutina ni vespertina.', position: 50 };
            if (g === 'TT') return { value: 'Tendencia nocturna', confidence: 55, note: 'Variante CLOCK rs2740390 TT. Asociada con preferencia por horarios tardíos. La higiene del sueño (mismos horarios) puede compensar.', position: 20 };
            return null;
        }
    },

    reward_sensitivity: {
        name: 'Sensibilidad a la recompensa (DRD2)',
        icon: '🎰',
        category: 'lifestyle',
        evidence: 'moderate',
        disclaimer: false,
        primarySnp: 'rs1800497',
        sliderMin: 'Alta densidad DRD2',
        sliderMax: 'Menor densidad DRD2',
        interpret(genotypes) {
            const g = genotypes['rs1800497'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Menor densidad de receptores D2', confidence: 55, note: 'TaqIA A1/A1 (DRD2). Menor densidad de receptores D2 en el estriado. Relacionado con mayor búsqueda de recompensa y mayor susceptibilidad a hábitos compulsivos. El ejercicio físico aumenta la densidad de DRD2 naturalmente.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Densidad DRD2 intermedia', confidence: 45, note: 'Heterocigoto TaqIA. El comportamiento de recompensa es altamente plástico y modificable con hábitos.', position: 50 };
            if (g === 'GG') return { value: 'Alta densidad de receptores D2', confidence: 55, note: 'TaqIA A2/A2. Mayor densidad de receptores D2. El sistema de recompensa responde de manera más regulada.', position: 20 };
            return null;
        }
    },

    caffeine_sensitivity: {
        name: 'Sensibilidad a la cafeína',
        icon: '☕',
        category: 'lifestyle',
        evidence: 'moderate',
        disclaimer: false,
        primarySnp: 'rs762551',
        sliderMin: 'Metabolizador lento (sensible)',
        sliderMax: 'Metabolizador rápido',
        interpret(genotypes) {
            const g = genotypes['rs762551'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Metabolizador lento de cafeína', confidence: 70, note: 'CYP1A2 *1F C. La cafeína persiste más tiempo en sangre. Mayor riesgo de insomnio, palpitaciones y ansiedad con >1-2 tazas/día. Prefiere cafeína antes de las 12:00.', position: 15 };
            if (g === 'AC' || g === 'CA') return { value: 'Metabolizador intermedio', confidence: 55, note: 'Heterocigoto CYP1A2. Tolerancia moderada. La cafeína después de las 14:00 puede afectar el sueño.', position: 50 };
            if (g === 'AA') return { value: 'Metabolizador rápido de cafeína', confidence: 70, note: 'CYP1A2 *1F A. La cafeína se elimina rápido. Puede tolerar más café sin efectos adversos, aunque los riesgos cardiovasculares existen igual con exceso.', position: 85 };
            return null;
        }
    }
};

module.exports = { PHYSICAL_TRAITS };
