'use strict';
/**
 * Expansion panel — 59 new genetic traits (v2 expansion, 2026-04-22)
 * Sources: SNPedia, GWAS Catalog, PubMed, 23andMe Research.
 * DO NOT EDIT rsids manually. See MD spec for references.
 */

const EXPANSION_TRAITS = {

    // ── APARIENCIA FÍSICA (appearance) ──────────────────────────────────────

    eye_color_intensity: {
        name: 'Intensidad del color de ojos',
        icon: '👁️',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs1800407',
        sliderMin: 'Tono suave / celeste',
        sliderMax: 'Tono intenso / ámbar',
        interpret(genotypes, ancestry = {}) {
            const g = genotypes['rs1800407'];
            if (!g) return null;
            const amr = ancestry.AMR_NAT || 0;
            const isMestizo = amr > 0.20;
            if (g === 'TT') return {
                value: isMestizo ? 'Marrón intenso / ámbar oscuro' : 'Ojos de tonalidad intensa',
                confidence: 55,
                note: isMestizo
                    ? `OCA2 rs1800407 TT. En fondo mestizo (${Math.round(amr * 100)}% AMR), modula la intensidad dentro del espectro marrón — de marrón claro a ámbar oscuro.`
                    : 'OCA2 rs1800407 TT. Modula el espectro dentro del eje azul-marrón hacia tonos más intensos (ámbar, avellana oscura).',
                position: 80
            };
            if (g === 'CT' || g === 'TC') return {
                value: isMestizo ? 'Marrón medio' : 'Tonalidad intermedia',
                confidence: 45,
                note: isMestizo
                    ? `Efecto heterocigoto OCA2. En fondo mestizo (${Math.round(amr * 100)}% AMR), probablemente marrón medio.`
                    : 'Efecto heterocigoto OCA2. Puede contribuir a ojos verde-avellana.',
                position: 50
            };
            if (g === 'CC') return {
                value: isMestizo ? 'Marrón claro / avellana' : 'Ojos de tonalidad suave',
                confidence: 55,
                note: isMestizo
                    ? `OCA2 rs1800407 CC. En fondo mestizo puede aclarar levemente el marrón. No implica ojos azules.`
                    : 'OCA2 rs1800407 CC. Asociado con tonos azul claro o gris en portadores de variante HERC2.',
                position: isMestizo ? 30 : 20
            };
            return null;
        }
    },

    hair_color_blonde_kitlg: {
        name: 'Tendencia al cabello rubio (KITLG)',
        icon: '👱',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs12821256',
        sliderMin: 'Sin efecto rubio',
        sliderMax: 'Rubio probable',
        interpret(genotypes, ancestry = {}) {
            const g = genotypes['rs12821256'];
            if (!g) return null;
            const amr = ancestry.AMR_NAT || 0;
            const isMestizo = amr > 0.20;
            if (g === 'CC') return {
                value: isMestizo ? 'Expresión de rubio muy limitada en fondo mestizo' : 'Mayor probabilidad de cabello rubio',
                confidence: isMestizo ? 45 : 60,
                note: isMestizo
                    ? `KITLG rs12821256 CC. Este locus actúa sobre fondo melanocítico europeo. Con ${Math.round(amr * 100)}% AMR, la alta melanina basal suprime el efecto de aclaramiento.`
                    : 'KITLG rs12821256 CC. Factor de aclaramiento independiente de MC1R/HERC2. Contribuye al tono rubio en europeos (~35% de la varianza en rubio).',
                position: isMestizo ? 20 : 80
            };
            if (g === 'CT' || g === 'TC') return {
                value: isMestizo ? 'Sin efecto de aclaramiento esperable' : 'Leve tendencia al aclaramiento',
                confidence: isMestizo ? 50 : 45,
                position: isMestizo ? 15 : 50
            };
            if (g === 'TT') return { value: 'Sin aclaramiento por KITLG', confidence: 55, note: 'Alelo ancestral. Sin contribución al fenotipo rubio por este locus.', position: 15 };
            return null;
        }
    },

    hair_color_red_mc1r: {
        name: 'Cabello pelirrojo (MC1R R160W)',
        icon: '🦰',
        category: 'appearance',
        evidence: 'high',
        primarySnp: 'rs1805008',
        sliderMin: 'Sin variante pelirroja',
        sliderMax: 'Pelirrojo probable',
        interpret(genotypes, ancestry = {}) {
            const mc1r_r160w = genotypes['rs1805008'];
            const mc1r_r151c = genotypes['rs1805007'];
            if (!mc1r_r160w) return null;
            const amr = ancestry.AMR_NAT || 0;
            const isMestizo = amr > 0.20;
            if (mc1r_r160w === 'TT') return {
                value: isMestizo ? 'Variante MC1R presente — expresión pelirroja improbable en fondo mestizo' : 'Alta probabilidad de cabello rojo',
                confidence: isMestizo ? 60 : 80,
                note: isMestizo
                    ? `MC1R R160W TT. Esta variante requiere fondo de baja eumelanina para expresarse. Con ${Math.round(amr * 100)}% AMR la melanina basal suprime el fenotipo pelirrojo visible.`
                    : 'MC1R R160W TT. Variante recesiva fuertemente asociada con fenotipo pelirrojo. En europeos homocigotos, ~90% tienen cabello rojo/naranja.',
                position: isMestizo ? 25 : 90
            };
            if (mc1r_r160w === 'CT' || mc1r_r160w === 'TC') return {
                value: isMestizo ? 'Portador MC1R — sin efecto visible esperable' : 'Portador MC1R — posibles reflejos rojizos',
                confidence: isMestizo ? 55 : 55,
                note: isMestizo
                    ? `Heterocigoto R160W. En fondo mestizo (${Math.round(amr * 100)}% AMR), los reflejos rojizos son poco probables dado el alto nivel de eumelanina.`
                    : 'Heterocigoto R160W. Puede haber reflejos cobre-rojizos, especialmente con exposición solar.',
                position: isMestizo ? 15 : 55
            };
            if (mc1r_r160w === 'CC') return { value: 'Sin variante R160W', confidence: 70, note: 'No se detecta R160W. El fenotipo pelirrojo por este locus es improbable.', position: 10 };
            return null;
        }
    },

    hair_graying_early: {
        name: 'Canas tempranas (IRF4)',
        icon: '🩶',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs12203592',
        sliderMin: 'Canas tardías (>50)',
        sliderMax: 'Canas tempranas (<35)',
        interpret(genotypes) {
            const g = genotypes['rs12203592'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor tendencia a canas tempranas', confidence: 55, note: 'IRF4 rs12203592 TT. Asociado con aparición de canas antes de los 35 años en estudios GWAS latinoamericanos. Varianza explicada ~10%.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Tendencia intermedia a canas', confidence: 45, position: 50 };
            if (g === 'CC') return { value: 'Canas en edad típica (>50)', confidence: 55, note: 'IRF4 rs12203592 CC. Menor predisposición a encanecimiento temprano.', position: 20 };
            return null;
        }
    },

    hair_waviness: {
        name: 'Ondulación del cabello (TCHH)',
        icon: '〰️',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs11803731',
        sliderMin: 'Lacio',
        sliderMax: 'Muy ondulado / rizado',
        interpret(genotypes) {
            const g = genotypes['rs11803731'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Cabello muy ondulado / rizado', confidence: 60, note: 'TCHH rs11803731 TT. Tricoialina modifica la estructura de la fibra capilar. Alta probabilidad de cabello rizado en europeos portadores.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Cabello ondulado / mixto', confidence: 50, position: 55 };
            if (g === 'CC') return { value: 'Cabello lacio o levemente ondulado', confidence: 55, note: 'TCHH rs11803731 CC. Sin influencia ondulante por este locus.', position: 20 };
            return null;
        }
    },

    beard_density: {
        name: 'Densidad de barba (EDAR)',
        icon: '🧔',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs3827760',
        sliderMin: 'Barba escasa',
        sliderMax: 'Barba densa',
        interpret(genotypes) {
            const g = genotypes['rs3827760'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Densidad de barba típica europea', confidence: 55, note: 'Sin variante EDAR V370A (alelo ancestral). La densidad de barba depende más de andrógenos y AR.', position: 35 };
            if (g === 'AG' || g === 'GA') return { value: 'Densidad de barba intermedia', confidence: 50, position: 50 };
            if (g === 'GG') return { value: 'Barba típicamente densa y oscura', confidence: 65, note: 'Variante EDAR V370A GG. Aumenta la densidad de folículos pilosos. Predominante en asiáticos del Este y amerindios.', position: 85 };
            return null;
        }
    },

    body_hair_amount: {
        name: 'Cantidad de vello corporal (AR)',
        icon: '🦾',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs6152',
        sliderMin: 'Poco vello',
        sliderMax: 'Mucho vello',
        interpret(genotypes) {
            const g = genotypes['rs6152'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor tendencia a vello corporal abundante', confidence: 55, note: 'Receptor de andrógenos AR rs6152. Asociado con mayor sensibilidad androgénica. Mayor cantidad de vello corporal en hombres biológicos.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Vello corporal moderado', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Menor vello corporal', confidence: 55, note: 'AR rs6152 GG. Menor sensibilidad androgénica en este locus.', position: 20 };
            return null;
        }
    },

    skin_pigmentation_slc45a2: {
        name: 'Pigmentación de piel (SLC45A2)',
        icon: '🎨',
        category: 'appearance',
        evidence: 'high',
        primarySnp: 'rs16891982',
        sliderMin: 'Piel oscura / morena',
        sliderMax: 'Piel muy clara',
        interpret(genotypes) {
            const g = genotypes['rs16891982'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Piel muy clara (europeo)', confidence: 80, note: 'SLC45A2 rs16891982 GG. Segundo gen principal de aclaramiento europeo. Casi exclusivo de europeos (>98%). Fuertemente reductor de melanina.', position: 90 };
            if (g === 'CG' || g === 'GC') return { value: 'Pigmentación intermedia', confidence: 65, note: 'Heterocigoto SLC45A2. Mezcla entre aclaramiento y pigmentación ancestral.', position: 55 };
            if (g === 'CC') return { value: 'Pigmentación ancestral preservada', confidence: 80, note: 'SLC45A2 rs16891982 CC. Alelo ancestral. Pigmentación oscura no reducida por este locus. Predominante en africanos, asiáticos del Este y americanos nativos.', position: 15 };
            return null;
        }
    },

    tanning_ability: {
        name: 'Capacidad de bronceado (ASIP)',
        icon: '☀️',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs4911414',
        sliderMin: 'Se quema, no se broncea',
        sliderMax: 'Bronceado fácil y duradero',
        interpret(genotypes, ancestry = {}) {
            const g = genotypes['rs4911414'];
            if (!g) return null;

            if (g === 'TT') {
                return {
                    value: 'Bronceado fácil',
                    confidence: 60,
                    note: 'ASIP rs4911414 TT. ASIP (Agouti Signaling Protein) regula eumelanina vs feomelanina. TT favorece producción de eumelanina inducida por UV → bronceado eficiente.',
                    position: 85
                };
            }
            if (g === 'GT' || g === 'TG') {
                return {
                    value: 'Bronceado moderado',
                    confidence: 50,
                    position: 50
                };
            }

            if (g === 'GG') {
                // ASIP regula la PROPORCIÓN eumelanina/feomelanina, no la cantidad
                // total de melanina. Para personas con pigmentación basal alta
                // (africanos, asiáticos del este, amerindios), la masa total de
                // melanina domina la respuesta UV y el "se quema fácil" no aplica.
                // Detectamos pigmentación basal alta con 3 señales independientes.
                const slc24a5 = genotypes['rs1426654'];
                const afr = (ancestry.AFR_W || 0) + (ancestry.AFR_E || 0);
                const eas = (ancestry.EAS_CN || 0) + (ancestry.EAS_JP || 0);
                const amr = ancestry.AMR_NAT || 0;

                const hasDarkBasalPigmentation = (
                    slc24a5 === 'GG'
                    || afr > 0.40
                    || eas > 0.40
                    || amr > 0.40
                );

                if (hasDarkBasalPigmentation) {
                    const reasons = [];
                    if (slc24a5 === 'GG') reasons.push('SLC24A5 rs1426654 GG (alelo ancestral)');
                    if (afr > 0.40)       reasons.push(`${Math.round(afr * 100)}% ancestría africana`);
                    if (eas > 0.40)       reasons.push(`${Math.round(eas * 100)}% ancestría asiática del este`);
                    if (amr > 0.40)       reasons.push(`${Math.round(amr * 100)}% ancestría amerindia`);

                    return {
                        value: 'ASIP modulado por pigmentación basal alta',
                        confidence: 55,
                        note: `Tu pigmentación basal está dominada por ${reasons.join(' + ')}, lo que indica una cantidad total de melanina alta. ASIP rs4911414 GG modula la proporción eumelanina/feomelanina, pero la cantidad total de melanina es el predictor dominante de respuesta UV en tu fototipo. La recomendación de SPF 50+ basada en ASIP no aplica a tu pigmentación. Tu fototipo de piel determina mejor tu respuesta al sol que esta variante.`,
                        position: 55
                    };
                }

                return {
                    value: 'Se quema fácil, bronceado pobre',
                    confidence: 60,
                    note: 'ASIP rs4911414 GG. Mayor feomelanina. La piel reacciona al UV con quemadura más que con bronceado. Protector solar FPS 50+ siempre.',
                    position: 15
                };
            }

            return null;
        }
    },

    freckles_tendency: {
        name: 'Tendencia a las pecas (MC1R)',
        icon: '🔴',
        category: 'appearance',
        evidence: 'high',
        primarySnp: 'rs1805007',
        sliderMin: 'Sin pecas',
        sliderMax: 'Pecas abundantes',
        interpret(genotypes, ancestry = {}) {
            const g = genotypes['rs1805007'];
            if (!g) return null;
            const amr = ancestry.AMR_NAT || 0;
            const isMestizo = amr > 0.20;
            if (g === 'TT') return {
                value: isMestizo ? 'Variante MC1R presente — pecas muy improbables en piel mestiza' : 'Alta tendencia a pecas',
                confidence: isMestizo ? 65 : 75,
                note: isMestizo
                    ? `MC1R R151C TT. En fondo mestizo (${Math.round(amr * 100)}% AMR), la eumelanina basal elevada suprime la expresión de feomelanina superficial. Pecas visibles muy improbables.`
                    : 'MC1R R151C TT. Homocigoto. Las variantes MC1R producen feomelanina predominante → pecas con exposición solar. Muy frecuente en pelirrojos y piel muy clara.',
                position: isMestizo ? 20 : 90
            };
            if (g === 'CT' || g === 'TC') return {
                value: isMestizo ? 'Sin tendencia a pecas esperable' : 'Pecas moderadas posibles',
                confidence: isMestizo ? 60 : 60,
                note: isMestizo
                    ? `MC1R heterocigoto. Con ${Math.round(amr * 100)}% AMR, la melanina basal suprime la formación de pecas en piel mestiza.`
                    : 'MC1R heterocigoto. Tendencia a pecas, especialmente en nariz y mejillas.',
                position: isMestizo ? 15 : 55
            };
            if (g === 'CC') return { value: 'Poca tendencia a pecas', confidence: 65, note: 'MC1R ancestral CC. Sin el fenotipo de feomelanina dominante. Pecas poco probables.', position: 15 };
            return null;
        }
    },

    moles_density: {
        name: 'Densidad de lunares (MTAP)',
        icon: '🔵',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs4636294',
        sliderMin: 'Pocos lunares',
        sliderMax: 'Muchos lunares',
        interpret(genotypes) {
            const g = genotypes['rs4636294'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor densidad de lunares', confidence: 55, note: 'MTAP rs4636294 AA. El locus MTAP/CDKN2A está ligado a la proliferación de melanocitos. Mayor cantidad de nevos melanocíticos. Photoprotección importante.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Densidad de lunares intermedia', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Pocos lunares (normal)', confidence: 55, position: 20 };
            return null;
        }
    },

    body_odor_intensity: {
        name: 'Intensidad del olor corporal axilar (ABCC11)',
        icon: '👃',
        category: 'appearance',
        evidence: 'high',
        primarySnp: 'rs17822931',
        sliderMin: 'Olor mínimo',
        sliderMax: 'Olor intenso típico',
        interpret(genotypes) {
            const g = genotypes['rs17822931'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Olor axilar mínimo', confidence: 90, note: 'ABCC11 TT. El mismo gen del cerumen seco. Las glándulas apocrinas producen muy poco sustrato de olor. Común en asiáticos del Este y amerindios — bromhidrosis prácticamente ausente.', position: 5 };
            if (g === 'CT' || g === 'TC') return { value: 'Olor axilar moderado', confidence: 70, note: 'Heterocigoto ABCC11. Producción intermedia de compuestos odoríferos axilares.', position: 50 };
            if (g === 'CC') return { value: 'Olor axilar típico / intenso', confidence: 90, note: 'ABCC11 CC. Producción completa de compuestos de olor axilar por glándulas apocrinas. Normal en europeos y africanos.', position: 90 };
            return null;
        }
    },

    height_hmga2: {
        name: 'Potencial de estatura (HMGA2)',
        icon: '📐',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs1042725',
        sliderMin: 'Menor potencial',
        sliderMax: 'Mayor potencial',
        interpret(genotypes) {
            const g = genotypes['rs1042725'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor potencial de estatura', confidence: 55, note: 'HMGA2 rs1042725 TT. Locus entre los más replicados para talla. Contribuye ~0.4cm adicionales por alelo T vs C. Heredabilidad de estatura es ~80% pero depende de >700 loci + nutrición.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Potencial de estatura promedio', confidence: 45, position: 50 };
            if (g === 'CC') return { value: 'Menor potencial por este locus', confidence: 50, note: 'HMGA2 rs1042725 CC. Alelo asociado con menor talla. El efecto individual es pequeño (~0.4cm).', position: 25 };
            return null;
        }
    },

    earlobe_attachment: {
        name: 'Lóbulo de oreja (libre vs adherido)',
        icon: '👂',
        category: 'appearance',
        evidence: 'moderate',
        primarySnp: 'rs1571880',
        sliderMin: 'Adherido',
        sliderMax: 'Libre / colgante',
        interpret(genotypes) {
            const g = genotypes['rs1571880'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Lóbulo libre / colgante probable', confidence: 55, note: 'Locus rs1571880 CC (GWAS Shaffer 2017). Asociado con lóbulo libre, el fenotipo más común en europeos (~74%).', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Forma intermedia o mixta', confidence: 40, position: 50 };
            if (g === 'TT') return { value: 'Lóbulo adherido probable', confidence: 50, note: 'Lóbulo que se une directamente al cuello sin "colgante". Frecuente en asiáticos del Este.', position: 20 };
            return null;
        }
    },

    diastema_axin2: {
        name: 'Hueco entre dientes (diastema)',
        icon: '🦷',
        category: 'appearance',
        evidence: 'low',
        primarySnp: 'rs11196369',
        sliderMin: 'Dientes juntos',
        sliderMax: 'Diastema probable',
        interpret(genotypes) {
            const g = genotypes['rs11196369'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor tendencia a diastema', confidence: 40, note: 'AXIN2 rs11196369 TT. AXIN2 regula la vía WNT en el desarrollo dental. Variante asociada con espaciado entre incisivos centrales. Evidencia moderada-baja.', position: 75 };
            if (g === 'CT' || g === 'TC') return { value: 'Tendencia intermedia', confidence: 30, position: 50 };
            if (g === 'CC') return { value: 'Sin predisposición a diastema', confidence: 40, position: 20 };
            return null;
        }
    },

    // ── GUSTO, OLFATO Y SENTIDOS (taste) ───────────────────────────────────

    umami_perception: {
        name: 'Percepción del sabor umami (TAS1R1)',
        icon: '🍜',
        category: 'taste',
        evidence: 'moderate',
        primarySnp: 'rs34160107',
        sliderMin: 'Baja sensibilidad umami',
        sliderMax: 'Alta sensibilidad umami',
        interpret(genotypes) {
            const g = genotypes['rs34160107'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Alta sensibilidad al umami', confidence: 55, note: 'TAS1R1 rs34160107 GG. Receptor del quinto sabor básico (glutamato). Mayor apreciación de alimentos ricos en umami: carne, quesos, salsa soja, tomate.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Sensibilidad al umami moderada', confidence: 45, position: 50 };
            if (g === 'AA') return { value: 'Menor sensibilidad al umami', confidence: 50, note: 'Receptor umami menos sensible. Puede preferir sabores más intensos para compensar.', position: 20 };
            return null;
        }
    },

    spicy_sensitivity: {
        name: 'Sensibilidad al picante (TRPV1)',
        icon: '🌶️',
        category: 'taste',
        evidence: 'moderate',
        primarySnp: 'rs8065080',
        sliderMin: 'Tolerante al picante',
        sliderMax: 'Muy sensible al picante',
        interpret(genotypes) {
            const g = genotypes['rs8065080'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor sensibilidad al picante', confidence: 55, note: 'TRPV1 rs8065080 TT. Canal de capsaicina más sensible. Baja dosis de chile causa ardor intenso. La tolerancia al picante se adquiere con exposición repetida.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Sensibilidad intermedia al picante', confidence: 45, position: 50 };
            if (g === 'CC') return { value: 'Buena tolerancia al picante', confidence: 55, note: 'TRPV1 rs8065080 CC. Umbral de activación de capsaicina más alto. Mayor tolerancia a comidas picantes.', position: 20 };
            return null;
        }
    },

    photic_sneeze_reflex: {
        name: 'Estornudo por luz (reflejo fótico)',
        icon: '🤧',
        category: 'taste',
        evidence: 'moderate',
        primarySnp: 'rs10427255',
        sliderMin: 'Sin reflejo fótico',
        sliderMax: 'Estornuda con luz brillante',
        interpret(genotypes) {
            const g = genotypes['rs10427255'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Reflejo fótico probable (ACHOO)', confidence: 60, note: 'rs10427255 CC. Locus 2q22 asociado con el síndrome ACHOO (Autosomal Compellent Heliopthalmic Outburst). El cruce de señales entre el nervio óptico y trigeminal provoca estornudos ante luz brillante.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Reflejo fótico posible', confidence: 45, position: 50 };
            if (g === 'TT') return { value: 'Sin reflejo fótico', confidence: 60, note: 'No hay activación trigeminal por estímulo lumínico. La luz solar intensa no provoca estornudos.', position: 10 };
            return null;
        }
    },

    floral_odor_or5a1: {
        name: 'Sensibilidad a olores florales (OR5A1)',
        icon: '🌸',
        category: 'taste',
        evidence: 'low',
        primarySnp: 'rs2382520',
        sliderMin: 'Baja sensibilidad floral',
        sliderMax: 'Alta sensibilidad floral',
        interpret(genotypes) {
            const g = genotypes['rs2382520'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Alta sensibilidad a olores florales', confidence: 40, note: 'OR5A1 rs2382520 AA. Receptor olfativo para notas florales (beta-ionona, violeta). Algunos portadores describen el olor de violetas como intensísimo.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Sensibilidad olfativa intermedia', confidence: 30, position: 50 };
            if (g === 'GG') return { value: 'Sensibilidad floral reducida', confidence: 40, note: 'Menor capacidad de detectar notas florales a bajas concentraciones. Evidencia baja — solo orientativo.', position: 20 };
            return null;
        }
    },

    // ── METABOLISMO Y NUTRICIÓN (metabolism) ───────────────────────────────

    caffeine_adenosine_sensitivity: {
        name: 'Sensibilidad adenosínica a la cafeína (ADORA2A)',
        icon: '☕',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs5751876',
        sliderMin: 'Poco efecto en el sueño',
        sliderMax: 'Muy sensible — insomnio',
        interpret(genotypes) {
            const g = genotypes['rs5751876'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Alta sensibilidad adenosínica', confidence: 60, note: 'ADORA2A rs5751876 TT. El receptor A2A de adenosina es más sensible. Incluso pocas tazas de café pueden provocar ansiedad e insomnio. Limita cafeína a mañana.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Sensibilidad intermedia', confidence: 50, position: 50 };
            if (g === 'CC') return { value: 'Menor sensibilidad adenosínica', confidence: 60, note: 'ADORA2A rs5751876 CC. Menor impacto de la cafeína sobre el sueño vía receptor A2A. El metabolismo hepático (CYP1A2) sigue siendo clave.', position: 15 };
            return null;
        }
    },

    alcohol_fast_metabolism: {
        name: 'Metabolismo rápido del alcohol (ADH1B)',
        icon: '🍺',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs1229984',
        sliderMin: 'Metabolismo lento',
        sliderMax: 'Metabolismo ultra-rápido',
        interpret(genotypes) {
            const g = genotypes['rs1229984'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Metabolismo ultra-rápido del etanol', confidence: 80, note: 'ADH1B*2 AA. Actividad enzimática ~100× mayor que ADH1B*1. Convierte etanol a acetaldehído rapidísimo — protector contra alcoholismo crónico. Muy común en japoneses (70%) y judíos ashkenazi.', position: 95 };
            if (g === 'AG' || g === 'GA') return { value: 'Metabolismo rápido (heterocigoto)', confidence: 65, note: 'ADH1B heterocigoto. Velocidad intermedia de conversión del alcohol.', position: 60 };
            if (g === 'GG') return { value: 'Metabolismo estándar del alcohol', confidence: 75, note: 'ADH1B*1 ancestral. Velocidad normal de conversión etanol→acetaldehído. Predominante en europeos y africanos.', position: 20 };
            return null;
        }
    },

    alcohol_tolerance_adh1c: {
        name: 'Tolerancia general al alcohol (ADH1C)',
        icon: '🥂',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs1693482',
        sliderMin: 'Más sensible al alcohol',
        sliderMax: 'Mayor tolerancia',
        interpret(genotypes) {
            const g = genotypes['rs1693482'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Metabolismo rápido (ADH1C*1)', confidence: 60, note: 'ADH1C rs1693482 AA. Isoforma gamma-1 más activa. Metaboliza alcohol a acetaldehído eficientemente.', position: 75 };
            if (g === 'AG' || g === 'GA') return { value: 'Metabolismo intermedio', confidence: 50, position: 50 };
            if (g === 'GG') return { value: 'Metabolismo más lento (ADH1C*2)', confidence: 60, note: 'ADH1C rs1693482 GG. Isoforma gamma-2 menos activa. El etanol se elimina más despacio.', position: 25 };
            return null;
        }
    },

    b12_absorption_fut2: {
        name: 'Absorción de vitamina B12 (FUT2)',
        icon: '🧪',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs601338',
        sliderMin: 'Absorción reducida',
        sliderMax: 'Absorción normal',
        interpret(genotypes) {
            const g = genotypes['rs601338'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Absorción de B12 reducida', confidence: 60, note: 'FUT2 rs601338 AA (no-secretor). Menor expresión de antígenos intestinales H. Asociado con menores niveles séricos de B12. Considera suplemento B12 activo (metilcobalamina) y monitoreo anual.', position: 20 };
            if (g === 'AG' || g === 'GA') return { value: 'Absorción de B12 parcialmente reducida', confidence: 50, note: 'FUT2 heterocigoto. Absorción intermedia. Niveles de B12 típicamente en rango normal-bajo.', position: 50 };
            if (g === 'GG') return { value: 'Absorción de B12 normal (secretor)', confidence: 60, note: 'FUT2 rs601338 GG (secretor). Expresión intestinal de antígenos H normal. Absorción eficiente de vitamina B12.', position: 85 };
            return null;
        }
    },

    omega3_fads1: {
        name: 'Síntesis endógena de omega-3 (FADS1)',
        icon: '🐟',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs174537',
        sliderMin: 'Baja síntesis endógena',
        sliderMax: 'Alta síntesis endógena',
        interpret(genotypes) {
            const g = genotypes['rs174537'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Alta síntesis endógena de omega-3', confidence: 60, note: 'FADS1 rs174537 GG. Enzima desaturasa de ácidos grasos eficiente. Convierte ALA dietario en EPA y DHA activos. Menor dependencia de pescado graso.', position: 85 };
            if (g === 'GT' || g === 'TG') return { value: 'Síntesis omega-3 intermedia', confidence: 50, position: 50 };
            if (g === 'TT') return { value: 'Baja síntesis endógena de omega-3', confidence: 60, note: 'FADS1 rs174537 TT. Menor actividad desaturasa. Para mantener EPA/DHA adecuados necesitas más fuentes directas: salmón, sardinas, o suplemento omega-3 EPA+DHA.', position: 15 };
            return null;
        }
    },

    fto_obesity_risk: {
        name: 'Riesgo de obesidad (FTO)',
        icon: '⚖️',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs9939609',
        sliderMin: 'Sin riesgo FTO',
        sliderMax: 'Mayor riesgo FTO',
        interpret(genotypes) {
            const g = genotypes['rs9939609'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor tendencia al sobrepeso (FTO)', confidence: 65, note: 'FTO rs9939609 AA. Locus más replicado para IMC/obesidad. Los portadores AA tienen ~1.67kg extra de promedio. El efecto es completamente reversible con actividad física regular (≥150 min/semana).', position: 85 };
            if (g === 'AT' || g === 'TA') return { value: 'Leve tendencia a mayor peso', confidence: 55, note: 'FTO heterocigoto. +0.8kg promedio vs TT. Efectos moderados del estilo de vida.', position: 55 };
            if (g === 'TT') return { value: 'Sin riesgo FTO', confidence: 60, note: 'FTO rs9939609 TT. Sin predisposición genética por este locus al sobrepeso. El peso sigue dependiendo del balance calórico.', position: 15 };
            return null;
        }
    },

    appetite_satiety_mc4r: {
        name: 'Regulación del apetito (MC4R)',
        icon: '🍽️',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs17782313',
        sliderMin: 'Alta saciedad',
        sliderMax: 'Menor saciedad / más apetito',
        interpret(genotypes) {
            const g = genotypes['rs17782313'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Mayor apetito / menor saciedad', confidence: 65, note: 'MC4R rs17782313 CC. El receptor MC4R regula la saciedad hipotalámica. CC asociado con mayor ingesta calórica espontánea y menor señalización de leptina. Dietas estructuradas con horarios fijos ayudan.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Regulación del apetito moderada', confidence: 55, position: 50 };
            if (g === 'TT') return { value: 'Buena regulación del apetito', confidence: 60, note: 'MC4R rs17782313 TT. Señalización de saciedad normal. Mayor sensación de plenitud post-comida.', position: 15 };
            return null;
        }
    },

    triglycerides_apoa5: {
        name: 'Triglicéridos y dieta (APOA5)',
        icon: '🫀',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs662799',
        sliderMin: 'Sin efecto en triglicéridos',
        sliderMax: 'Triglicéridos elevados con grasas',
        interpret(genotypes) {
            const g = genotypes['rs662799'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Mayor riesgo de triglicéridos elevados', confidence: 60, note: 'APOA5 rs662799 CC. Mayor concentración de VLDL en respuesta a grasas dietarias. Reducir grasas saturadas y alcohol es especialmente efectivo. Controla triglicéridos en ayunas anualmente.', position: 80 };
            if (g === 'AC' || g === 'CA') return { value: 'Riesgo intermedio de hipertrigliceridemia', confidence: 50, position: 50 };
            if (g === 'AA') return { value: 'Triglicéridos en rango normal', confidence: 55, note: 'APOA5 rs662799 AA. Menor tendencia a triglicéridos elevados por este locus.', position: 15 };
            return null;
        }
    },

    ldl_apoe_e4: {
        name: 'LDL colesterol y grasas saturadas (APOE)',
        icon: '🩺',
        category: 'metabolism',
        evidence: 'high',
        primarySnp: 'rs429358',
        sliderMin: 'LDL estable con dieta',
        sliderMax: 'LDL sube con grasas saturadas',
        interpret(genotypes) {
            const g = genotypes['rs429358'];
            if (!g) return null;
            if (g === 'CC') return { value: 'LDL sube fuerte con grasas saturadas (APOE ε4)', confidence: 75, note: '⚠️ APOE ε4 (rs429358 CC). El alelo ε4 aumenta la absorción intestinal de colesterol. Dieta mediterránea baja en saturadas reduce LDL más eficientemente que en ε3. También es el principal factor genético de riesgo de Alzheimer.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Respuesta mixta (ε3/ε4 o ε2/ε4)', confidence: 60, note: 'Heterocigoto APOE. Moderada sensibilidad a grasas dietarias. Privilegia grasas insaturadas.', position: 50 };
            if (g === 'TT') return { value: 'LDL estable frente a dieta (ε3/ε3 o ε2)', confidence: 65, note: 'Sin alelo ε4. LDL menos reactivo a grasas saturadas. El estilo de vida sigue siendo el mayor modulador.', position: 15 };
            return null;
        }
    },

    salt_sensitivity_agt: {
        name: 'Sensibilidad a la sal (AGT)',
        icon: '🧂',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs699',
        sliderMin: 'Sin efecto de sal en presión',
        sliderMax: 'Presión sube con sal',
        interpret(genotypes) {
            const g = genotypes['rs699'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Alta sensibilidad a la sal', confidence: 55, note: 'AGT rs699 CC (M235T). Mayor producción de angiotensinógeno. La sal dietaria eleva más la presión arterial en portadores. Limita sodio a <2g/día y controla presión regularmente.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Sensibilidad moderada a la sal', confidence: 45, position: 50 };
            if (g === 'TT') return { value: 'Menor sensibilidad a la sal', confidence: 50, note: 'AGT rs699 TT. Angiotensinógeno ancestral. Menor respuesta presora a sodio dietario.', position: 20 };
            return null;
        }
    },

    bmi_tendency_tmem18: {
        name: 'Tendencia al peso corporal (TMEM18)',
        icon: '📊',
        category: 'metabolism',
        evidence: 'moderate',
        primarySnp: 'rs6548238',
        sliderMin: 'Sin predisposición',
        sliderMax: 'Mayor IMC esperado',
        interpret(genotypes) {
            const g = genotypes['rs6548238'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Mayor tendencia a IMC elevado', confidence: 60, note: 'TMEM18 rs6548238 CC. Segundo locus más reproducible en GWAS de obesidad (luego de FTO). Efecto central hipotalámico. El ejercicio aeróbico regular reduce el efecto casi completamente.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Leve tendencia a mayor IMC', confidence: 50, position: 50 };
            if (g === 'TT') return { value: 'Sin predisposición por TMEM18', confidence: 55, position: 15 };
            return null;
        }
    },

    fructose_intolerance_aldob: {
        name: 'Intolerancia hereditaria a la fructosa (ALDOB)',
        icon: '🍎',
        category: 'metabolism',
        evidence: 'high',
        disclaimer: true,
        primarySnp: 'rs1800546',
        sliderMin: 'Sin variante ALDOB',
        sliderMax: 'Portador / alto riesgo',
        interpret(genotypes) {
            const g = genotypes['rs1800546'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Posible IHF (intolerancia hereditaria)', confidence: 70, note: '⚠️ CONSULTA MÉDICA. ALDOB rs1800546 TT (A149P). Variante causante de intolerancia hereditaria a la fructosa. Acumulación de fructosa-1-P en hígado puede ser tóxica. Evita fructosa libre hasta confirmar con médico.', position: 90 };
            if (g === 'CT' || g === 'TC') return { value: 'Portador ALDOB A149P', confidence: 60, note: 'Heterocigoto ALDOB. Portador de una copia. Sin síntomas habituales, pero no descarta IHF si el otro alelo tiene otra mutación. Monitorea síntomas digestivos con fructosa.', position: 45 };
            if (g === 'CC') return { value: 'Sin variante ALDOB A149P', confidence: 70, note: 'No se detecta la variante A149P. El riesgo de IHF por este alelo es mínimo.', position: 5 };
            return null;
        }
    },

    // ── FITNESS Y DEPORTE (fitness) ─────────────────────────────────────────

    muscle_recovery_il6: {
        name: 'Recuperación muscular post-ejercicio (IL-6)',
        icon: '💪',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs1800795',
        sliderMin: 'Recuperación lenta',
        sliderMax: 'Recuperación rápida',
        interpret(genotypes) {
            const g = genotypes['rs1800795'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Recuperación muscular rápida', confidence: 60, note: 'IL-6 rs1800795 CC. Menor producción de IL-6 post-ejercicio → menos inflamación → recuperación más rápida. Puede tolerar mayor volumen de entrenamiento semanal.', position: 85 };
            if (g === 'CG' || g === 'GC') return { value: 'Recuperación muscular estándar', confidence: 50, position: 50 };
            if (g === 'GG') return { value: 'Recuperación muscular más lenta', confidence: 60, note: 'IL-6 rs1800795 GG. Mayor producción de IL-6 post-ejercicio. Necesitas más días de descanso entre sesiones intensas. Proteína post-entreno y sueño son especialmente importantes.', position: 20 };
            return null;
        }
    },

    acl_injury_col1a1: {
        name: 'Riesgo de lesión LCA (COL1A1)',
        icon: '🦵',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs1800012',
        sliderMin: 'Menor riesgo LCA',
        sliderMax: 'Mayor riesgo LCA',
        interpret(genotypes) {
            const g = genotypes['rs1800012'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor riesgo de lesión ligamentaria', confidence: 55, note: 'COL1A1 Sp1 rs1800012 TT. Colágeno tipo I alterado. Mayor riesgo de ruptura de ligamento cruzado anterior (LCA) y esguinces graves. Refuerza propioceptores con ejercicios de estabilidad. Calienta siempre >10 min.', position: 80 };
            if (g === 'GT' || g === 'TG') return { value: 'Riesgo ligamentario intermedio', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Menor riesgo de lesión LCA', confidence: 55, note: 'COL1A1 rs1800012 GG. Colágeno tipo I normal. Riesgo estándar de lesiones ligamentarias.', position: 15 };
            return null;
        }
    },

    running_economy_ace: {
        name: 'Economía de carrera (ACE)',
        icon: '🏃',
        category: 'fitness',
        evidence: 'moderate',
        primarySnp: 'rs4646994',
        sliderMin: 'Menor eficiencia',
        sliderMax: 'Alta eficiencia de carrera',
        interpret(genotypes) {
            const g = genotypes['rs4646994'];
            if (!g) return null;
            if (g === 'II') return { value: 'Alta eficiencia de carrera (ACE I/I)', confidence: 60, note: 'ACE inserción/inserción. Menor actividad de ECA. Mayor eficiencia cardiovascular y respuesta al entrenamiento de resistencia. Común en élites de maratón.', position: 90 };
            if (g === 'ID' || g === 'DI') return { value: 'Eficiencia de carrera intermedia', confidence: 50, position: 50 };
            if (g === 'DD') return { value: 'Perfil de potencia (ACE D/D)', confidence: 60, note: 'ACE deleción/deleción. Mayor actividad de ECA. Favorece fuerza y potencia sobre resistencia aeróbica pura. Responde bien al entrenamiento de fuerza explosiva.', position: 15 };
            return null;
        }
    },

    lactic_acid_mct1: {
        name: 'Tolerancia al ácido láctico (MCT1)',
        icon: '🔥',
        category: 'fitness',
        evidence: 'low',
        primarySnp: 'rs1049434',
        sliderMin: 'Menor tolerancia',
        sliderMax: 'Mayor tolerancia al lactato',
        interpret(genotypes) {
            const g = genotypes['rs1049434'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mejor transporte de lactato', confidence: 45, note: 'MCT1 rs1049434 AA (T1470). Transportador de monocarboxilato más eficiente. Mejor clearance de lactato entre músculo y sangre. Favorece entrenamientos de alta intensidad sostenida.', position: 75 };
            if (g === 'AT' || g === 'TA') return { value: 'Transporte de lactato intermedio', confidence: 35, position: 50 };
            if (g === 'TT') return { value: 'Menor clearance de lactato', confidence: 45, note: 'MCT1 rs1049434 TT. Transporte de lactato menos eficiente. La acidez muscular puede limitar el rendimiento en zonas 4-5. Entrenamiento intervalado mejora el umbral láctico. Evidencia baja.', position: 25 };
            return null;
        }
    },

    muscle_mass_mstn: {
        name: 'Potencial de masa muscular (MSTN)',
        icon: '🏋️',
        category: 'fitness',
        evidence: 'low',
        primarySnp: 'rs1805086',
        sliderMin: 'Miostatina normal',
        sliderMax: 'Menor miostatina (más músculo)',
        interpret(genotypes) {
            const g = genotypes['rs1805086'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Tendencia a mayor masa muscular', confidence: 40, note: 'MSTN rs1805086 TT. Variante que puede reducir levemente la actividad de la miostatina (freno del crecimiento muscular). Evidencia aún limitada en humanos. El entrenamiento de fuerza sigue siendo el principal determinante.', position: 70 };
            if (g === 'CT' || g === 'TC') return { value: 'Respuesta muscular estándar', confidence: 30, position: 50 };
            if (g === 'CC') return { value: 'Miostatina funcional normal', confidence: 40, note: 'MSTN rs1805086 CC. Ninguna ventaja específica en masa muscular por este locus. Evidencia baja.', position: 30 };
            return null;
        }
    },

    freediving_pde10a: {
        name: 'Curiosidad: adaptación al buceo libre (PDE10A)',
        icon: '🤿',
        category: 'fitness',
        evidence: 'low',
        primarySnp: 'rs2530310',
        sliderMin: 'Sin adaptación',
        sliderMax: 'Posible adaptación',
        interpret(genotypes) {
            const g = genotypes['rs2530310'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Posible adaptación al apnea (curiosidad)', confidence: 30, note: 'PDE10A rs2530310 CC. Estudiado en la etnia Bajau (nadadores nómadas del Mar de Célèbes). Asociado con bazos más grandes que retienen más eritrocitos para apnea. Solo orientativo — evidencia limitada a esa población.', position: 60 };
            if (g === 'CT' || g === 'TC') return { value: 'Sin señal clara en este locus', confidence: 20, position: 50 };
            if (g === 'TT') return { value: 'Sin adaptación específica al apnea', confidence: 30, position: 20 };
            return null;
        }
    },

    // ── SUEÑO Y CRONOTIPO (lifestyle) ──────────────────────────────────────

    chronotype_per2: {
        name: 'Cronotipo matutino — PER2',
        icon: '🌄',
        category: 'lifestyle',
        evidence: 'high',
        primarySnp: 'rs228697',
        sliderMin: 'Nocturno',
        sliderMax: 'Muy matutino',
        interpret(genotypes) {
            const g = genotypes['rs228697'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Tendencia muy matutina', confidence: 65, note: 'PER2 rs228697 TT. Gen del reloj circadiano. Portadores TT adelantan naturalmente su ciclo sueño-vigilia. Máxima energía entre 6-10am. Desempeño cognitivo óptimo a primera hora.', position: 90 };
            if (g === 'CT' || g === 'TC') return { value: 'Cronotipo intermedio-matutino', confidence: 55, position: 60 };
            if (g === 'CC') return { value: 'Tendencia nocturna', confidence: 60, note: 'PER2 rs228697 CC. Ciclo circadiano más tardío. Máxima energía en tarde-noche. Estrategia: exposición a luz brillante en la mañana para adelantar el reloj.', position: 20 };
            return null;
        }
    },

    sleep_duration_abcc9: {
        name: 'Duración de sueño óptima (ABCC9)',
        icon: '😴',
        category: 'lifestyle',
        evidence: 'moderate',
        primarySnp: 'rs11046205',
        sliderMin: 'Pocas horas suficientes',
        sliderMax: 'Necesita muchas horas',
        interpret(genotypes) {
            const g = genotypes['rs11046205'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor necesidad de sueño (~9h)', confidence: 55, note: 'ABCC9 rs11046205 AA. Canal de potasio que regula la profundidad del sueño. Los portadores AA duermen en promedio 30-45 min más que GG. Necesitas más horas para sentirte descansado plenamente.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Necesidad de sueño estándar (~7-8h)', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Funciona bien con menos horas (~6-7h)', confidence: 55, note: 'ABCC9 rs11046205 GG. Menor necesidad biológica de sueño total. No confundir con privar al cerebro de sueño — solo que la "dosis" necesaria es menor.', position: 20 };
            return null;
        }
    },

    short_sleeper_dec2: {
        name: 'Dormidor natural breve (DEC2) — variante rara',
        icon: '⚡',
        category: 'lifestyle',
        evidence: 'high',
        primarySnp: 'rs121912617',
        sliderMin: 'Sueño normal necesario',
        sliderMax: 'Short sleeper natural',
        interpret(genotypes) {
            const g = genotypes['rs121912617'];
            if (!g) return null;
            const isVariant = g !== 'GG';
            if (isVariant) return { value: 'Posible short sleeper natural ⚠️', confidence: 85, note: '⚠️ DEC2 P385R — variante MUY RARA (<0.001%). Las pocas familias portadoras duermen 4-6h y se despiertan completamente recuperadas sin alarma. Si tenés este genotipo, es un hallazgo excepcional. Confirma con tu médico.', position: 95 };
            return { value: 'Sin variante DEC2 P385R', confidence: 75, note: 'DEC2 rs121912617 normal. La necesidad de 7-9h de sueño es biológicamente correcta para ti.', position: 10 };
        }
    },

    insomnia_meis1: {
        name: 'Riesgo de insomnio (MEIS1)',
        icon: '😶',
        category: 'lifestyle',
        evidence: 'moderate',
        primarySnp: 'rs2300478',
        sliderMin: 'Sin riesgo de insomnio',
        sliderMax: 'Mayor riesgo de insomnio',
        interpret(genotypes) {
            const g = genotypes['rs2300478'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Mayor predisposición al insomnio', confidence: 55, note: 'MEIS1 rs2300478 GG. Este locus (también ligado a piernas inquietas/RLS) se ha asociado con insomnio de mantenimiento. Higiene del sueño y reducción de pantallas antes de dormir son especialmente efectivas.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Riesgo moderado de insomnio', confidence: 45, position: 50 };
            if (g === 'AA') return { value: 'Sin predisposición al insomnio', confidence: 55, position: 15 };
            return null;
        }
    },

    jet_lag_per3: {
        name: 'Susceptibilidad al jet lag (PER3)',
        icon: '✈️',
        category: 'lifestyle',
        evidence: 'moderate',
        primarySnp: 'rs2640908',
        sliderMin: 'Adapta rápido al cambio horario',
        sliderMax: 'Jet lag severo',
        interpret(genotypes) {
            const g = genotypes['rs2640908'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Alta susceptibilidad al jet lag', confidence: 55, note: 'PER3 rs2640908 CC. Mayor rigidez del reloj circadiano. Los viajes con ≥6 zonas horarias pueden requerir 4-7 días de adaptación. Fototerapia matinal al llegar y melatonina (0.5mg) la primera semana ayudan.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Jet lag moderado', confidence: 45, position: 50 };
            if (g === 'TT') return { value: 'Adaptación rápida al cambio horario', confidence: 55, note: 'PER3 rs2640908 TT. Reloj circadiano más flexible. Adaptas zonas horarias en 2-3 días.', position: 15 };
            return null;
        }
    },

    snoring_wdr27: {
        name: 'Tendencia al ronquido (WDR27)',
        icon: '😪',
        category: 'lifestyle',
        evidence: 'low',
        primarySnp: 'rs13021497',
        sliderMin: 'Ronquido poco probable',
        sliderMax: 'Tendencia a roncar',
        interpret(genotypes) {
            const g = genotypes['rs13021497'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor tendencia al ronquido', confidence: 40, note: 'WDR27 rs13021497 TT. Locus asociado con ronquido habitual en GWAS (Kollias 2021). Evidencia baja-moderada. El ronquido también depende de anatomía nasal, peso, y posición al dormir.', position: 75 };
            if (g === 'CT' || g === 'TC') return { value: 'Tendencia intermedia al ronquido', confidence: 30, position: 50 };
            if (g === 'CC') return { value: 'Ronquido poco probable por este locus', confidence: 40, position: 20 };
            return null;
        }
    },

    dream_recall_comt: {
        name: 'Recuerdo de sueños / sueños vívidos (COMT)',
        icon: '💭',
        category: 'lifestyle',
        evidence: 'low',
        primarySnp: 'rs4680',
        sliderMin: 'No recuerda sueños',
        sliderMax: 'Sueños vívidos frecuentes',
        interpret(genotypes) {
            const g = genotypes['rs4680'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor probabilidad de sueños vívidos', confidence: 40, note: 'COMT Met/Met (rs4680 AA). Mayor disponibilidad de dopamina prefrontal durante el sueño REM. Asociado con mayor intensidad y recuerdo de sueños. Evidencia preliminar.', position: 75 };
            if (g === 'AG' || g === 'GA') return { value: 'Sueños vívidos moderados', confidence: 30, position: 50 };
            if (g === 'GG') return { value: 'Menor recuerdo de sueños', confidence: 40, note: 'COMT Val/Val (rs4680 GG). Dopamina prefrontal se degrada rápido. Menor retención de memorias oníricas en fase REM. Evidencia baja.', position: 25 };
            return null;
        }
    },

    sleepwalking_hla: {
        name: 'Predisposición al sonambulismo (HLA)',
        icon: '🌙',
        category: 'lifestyle',
        evidence: 'moderate',
        primarySnp: 'rs2071286',
        sliderMin: 'Sin predisposición',
        sliderMax: 'Mayor riesgo de sonambulismo',
        interpret(genotypes) {
            const g = genotypes['rs2071286'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor predisposición al sonambulismo', confidence: 55, note: 'HLA-DQB1 rs2071286 TT. Tag SNP del haplotipo HLA-DQB1*05, asociado con sonambulismo en estudios de familias europeas. El sonambulismo ocurre en fase NREM profunda y tiene alta heredabilidad (50%).', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Predisposición intermedia', confidence: 40, position: 50 };
            if (g === 'CC') return { value: 'Sin predisposición al sonambulismo', confidence: 55, position: 15 };
            return null;
        }
    },

    sleep_apnea_risk: {
        name: 'Riesgo de apnea del sueño (locus 3p22)',
        icon: '😮‍💨',
        category: 'lifestyle',
        evidence: 'low',
        disclaimer: true,
        primarySnp: 'rs12969657',
        sliderMin: 'Sin predisposición genética',
        sliderMax: 'Mayor predisposición',
        interpret(genotypes) {
            const g = genotypes['rs12969657'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Mayor predisposición a apnea del sueño', confidence: 45, note: 'Locus 3p22 rs12969657 GG. Asociado con apnea obstructiva en GWAS (Cade 2016). Evidencia baja. Si roncas fuerte, tienes somnolencia diurna excesiva o paradas respiratorias, consulta a un especialista de sueño para estudio polisomnográfico.', position: 70 };
            if (g === 'AG' || g === 'GA') return { value: 'Predisposición leve a apnea', confidence: 35, position: 50 };
            if (g === 'AA') return { value: 'Sin predisposición genética por este locus', confidence: 45, position: 15 };
            return null;
        }
    },

    // ── PERSONALIDAD Y COMPORTAMIENTO (personality) ─────────────────────────

    comt_warrior_worrier: {
        name: 'Guerrero o Preocupón (COMT dopamina)',
        icon: '⚔️',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs4680',
        sliderMin: 'Guerrero (tolera estrés agudo)',
        sliderMax: 'Preocupón (detallista)',
        interpret(genotypes) {
            const g = genotypes['rs4680'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Perfil "Guerrero" (COMT Val/Val)', confidence: 55, note: 'COMT Val158Met GG. La dopamina se degrada rápido en la corteza prefrontal. Mayor tolerancia bajo estrés agudo e imprevistos. Menor precisión en tareas cognitivas complejas tranquilas. Funciona mejor bajo presión.', position: 15 };
            if (g === 'AG' || g === 'GA') return { value: 'Balance guerrero-preocupón', confidence: 45, note: 'Heterocigoto COMT Val/Met. Perfil intermedio, adapta sus ventajas según el contexto.', position: 50 };
            if (g === 'AA') return { value: 'Perfil "Preocupón" (COMT Met/Met)', confidence: 55, note: 'COMT Met158Met AA. Dopamina prefrontal más estable. Mayor capacidad de atención a detalles, planificación y memoria de trabajo en contextos tranquilos. Puede ser más vulnerable al estrés crónico.', position: 85 };
            return null;
        }
    },

    stress_fkbp5: {
        name: 'Sensibilidad al estrés crónico (FKBP5)',
        icon: '🧘',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs1360780',
        sliderMin: 'Mayor resiliencia al estrés',
        sliderMax: 'Mayor sensibilidad al estrés',
        interpret(genotypes) {
            const g = genotypes['rs1360780'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor sensibilidad al estrés crónico', confidence: 55, note: 'FKBP5 rs1360780 TT. Regulador del eje HPA. La desmetilación del gen FKBP5 en portadores T/T amplifica la respuesta cortisólica. Meditación, ejercicio y técnicas de regulación emocional son especialmente efectivas.', position: 80 };
            if (g === 'CT' || g === 'TC') return { value: 'Sensibilidad al estrés intermedia', confidence: 45, position: 50 };
            if (g === 'CC') return { value: 'Mayor resiliencia al estrés crónico', confidence: 55, note: 'FKBP5 rs1360780 CC. Regulación del eje cortisol más eficiente. El cerebro "regresa a la calma" más rápido post-estrés.', position: 20 };
            return null;
        }
    },

    empathy_oxtr: {
        name: 'Empatía emocional (OXTR — receptor de oxitocina)',
        icon: '🤝',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs53576',
        sliderMin: 'Menor empatía espontánea',
        sliderMax: 'Alta empatía emocional',
        interpret(genotypes) {
            const g = genotypes['rs53576'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Mayor empatía emocional espontánea', confidence: 55, note: 'OXTR rs53576 GG. Receptor de oxitocina más sensible. Mayor reconocimiento intuitivo de emociones ajenas, mayor sensibilidad prosocial. Estudios muestran mejor interpretación de expresiones faciales.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Empatía moderada', confidence: 45, position: 50 };
            if (g === 'AA') return { value: 'Empatía emocional más analítica', confidence: 50, note: 'OXTR rs53576 AA. Menor oxitocina basal. Empatía más "cognitiva" que emocional — puede entender emociones ajenas con razonamiento explícito. ⚠️ La personalidad es multifactorial; esto es solo una pequeña contribución.', position: 20 };
            return null;
        }
    },

    pain_oprm1: {
        name: 'Respuesta al dolor físico (OPRM1)',
        icon: '💊',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs1799971',
        sliderMin: 'Alta tolerancia al dolor',
        sliderMax: 'Mayor sensibilidad al dolor',
        interpret(genotypes) {
            const g = genotypes['rs1799971'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Alta sensibilidad al dolor físico', confidence: 55, note: 'OPRM1 A118G AA (rs1799971 AA). Receptor mu-opioide con menor densidad. Mayor percepción del dolor en procedimientos y lesiones. Los opioides endógenos (endorfinas) tienen menor efecto — el ejercicio y el calor pueden ayudar más.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Sensibilidad al dolor moderada', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Mayor tolerancia al dolor físico', confidence: 55, note: 'OPRM1 A118G GG. Receptor mu-opioide con mayor densidad. Las endorfinas tienen mayor efecto — el ejercicio es especialmente analgésico. Mejor respuesta a placebos activos.', position: 20 };
            return null;
        }
    },

    chronic_pain_scn9a: {
        name: 'Tolerancia al dolor crónico (SCN9A)',
        icon: '⚡',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs6746030',
        sliderMin: 'Mayor tolerancia',
        sliderMax: 'Mayor sensibilidad crónica',
        interpret(genotypes) {
            const g = genotypes['rs6746030'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Canal Nav1.7 más activo — mayor sensibilidad', confidence: 55, note: 'SCN9A rs6746030 AA. El canal de sodio Nav1.7 (principal canal de las neuronas nociceptivas) es más excitable. Mayor tendencia a alodinia y dolor crónico. Muy importante la higiene del sistema nervioso (sueño, estrés, movimiento regular).', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Excitabilidad nociceptiva intermedia', confidence: 40, position: 50 };
            if (g === 'GG') return { value: 'Mayor tolerancia al dolor crónico', confidence: 55, note: 'SCN9A rs6746030 GG. Canal Nav1.7 con umbral de activación más alto. Mejor umbral para dolor crónico.', position: 20 };
            return null;
        }
    },

    motion_sickness_pvrl3: {
        name: 'Mareo en vehículos (cinetosis)',
        icon: '🚗',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs1840597',
        sliderMin: 'Sin cinetosis',
        sliderMax: 'Cinetosis frecuente',
        interpret(genotypes) {
            const g = genotypes['rs1840597'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Alta tendencia a la cinetosis', confidence: 55, note: 'Locus PVRL3 rs1840597 GG (Guo et al 2011). El cerebro integra mal las señales vestibulares y visuales en movimiento. Posición delantera, mirar al horizonte y preparación con jengibre o dimenhidrinato ayudan.', position: 85 };
            if (g === 'AG' || g === 'GA') return { value: 'Cinetosis leve o situacional', confidence: 45, position: 50 };
            if (g === 'AA') return { value: 'Sin predisposición a la cinetosis', confidence: 55, note: 'PVRL3 rs1840597 AA. Integración sensorial vestibular-visual más robusta.', position: 15 };
            return null;
        }
    },

    anxiety_slc6a4: {
        name: 'Tendencia a la ansiedad (SLC6A4 / serotonina)',
        icon: '😤',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs25531',
        sliderMin: 'Serotonina estable',
        sliderMax: 'Mayor reactividad serotoninérgica',
        interpret(genotypes) {
            const g = genotypes['rs25531'];
            if (!g) return null;
            if (g === 'GG') return { value: 'Mayor reactividad serotoninérgica', confidence: 50, note: 'SLC6A4 rs25531 GG (proxy de alelo S de 5-HTTLPR). Menor expresión del transportador de serotonina. La serotonina permanece más tiempo en la sinapsis. Asociado con mayor reactividad emocional y ansiedad ante el estrés. ⚠️ Baja-moderada evidencia individual.', position: 75 };
            if (g === 'AG' || g === 'GA') return { value: 'Perfil serotoninérgico intermedio', confidence: 40, position: 50 };
            if (g === 'AA') return { value: 'Serotonina con recaptura estable', confidence: 50, note: 'SLC6A4 rs25531 AA (proxy alelo L). Mayor expresión del transportador de serotonina. Sistema serotoninérgico más regulado. Menor reactividad ansiosa ante el estrés.', position: 25 };
            return null;
        }
    },

    memory_kibra: {
        name: 'Memoria episódica (KIBRA)',
        icon: '🧠',
        category: 'personality',
        evidence: 'moderate',
        primarySnp: 'rs17070145',
        sliderMin: 'Memoria episódica estándar',
        sliderMax: 'Memoria episódica superior',
        interpret(genotypes) {
            const g = genotypes['rs17070145'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Mayor capacidad de memoria episódica', confidence: 60, note: 'KIBRA rs17070145 TT. KIBRA (Kidney and Brain expressed protein) está involucrado en la señalización de plasticidad sináptica. Portadores TT muestran mejor recuerdo episódico en múltiples estudios (Papassotiropoulos 2006). Efecto pequeño pero replicado.', position: 85 };
            if (g === 'CT' || g === 'TC') return { value: 'Memoria episódica estándar-buena', confidence: 50, position: 55 };
            if (g === 'CC') return { value: 'Memoria episódica estándar', confidence: 55, note: 'KIBRA rs17070145 CC. Capacidad estándar de memoria para eventos autobiográficos. El entrenamiento cognitivo y el sueño REM son los mejores potenciadores.', position: 30 };
            return null;
        }
    },

    // ── FISIOLOGÍA Y CURIOSIDADES POBLACIONALES (physiology) ────────────────

    altitude_resistance_epas1: {
        name: 'Resistencia a la altitud (EPAS1)',
        icon: '🏔️',
        category: 'physiology',
        evidence: 'high',
        primarySnp: 'rs13419896',
        sliderMin: 'Adaptación estándar',
        sliderMax: 'Adaptación superior a altitud',
        interpret(genotypes) {
            const g = genotypes['rs13419896'];
            if (!g) return null;
            if (g === 'CC') return { value: 'Posible adaptación superior a la altitud', confidence: 65, note: 'EPAS1 rs13419896 CC. El gen HIF-2α regula la respuesta a hipoxia. La variante tibetana (EPAS1) reduce la policitemia excesiva y mejora la oxigenación en altitud. Si tus ancestros son amerindios andinos (Aymara, Quechua), esta variante puede estar presente.', position: 85 };
            if (g === 'AC' || g === 'CA') return { value: 'Adaptación intermedia a la altitud', confidence: 50, position: 55 };
            if (g === 'AA') return { value: 'Adaptación estándar a la altitud', confidence: 60, note: 'EPAS1 rs13419896 AA. Respuesta hipóxica estándar. El entrenamiento en altitud sigue siendo efectivo para mejorar la capacidad aeróbica.', position: 20 };
            return null;
        }
    },

    cold_tolerance_ucp1: {
        name: 'Tolerancia al frío (UCP1 grasa parda)',
        icon: '❄️',
        category: 'physiology',
        evidence: 'moderate',
        primarySnp: 'rs1800592',
        sliderMin: 'Frío muy molesto',
        sliderMax: 'Buena tolerancia al frío',
        interpret(genotypes) {
            const g = genotypes['rs1800592'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor termogénesis en frío', confidence: 55, note: 'UCP1 rs1800592 AA. Proteína desacoplante de la grasa parda más activa. Mayor producción de calor en respuesta al frío. Mejor tolerancia a temperaturas bajas y posiblemente mayor gasto calórico basal en invierno.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Termogénesis intermedia', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Menor actividad de grasa parda', confidence: 55, note: 'UCP1 rs1800592 GG. Menor termogénesis espontánea por grasa parda. El frío es más incómodo. Exposición gradual al frío puede activar la grasa parda funcionalmente.', position: 20 };
            return null;
        }
    },

    sweating_abcc11: {
        name: 'Tendencia a sudar (ABCC11)',
        icon: '💧',
        category: 'physiology',
        evidence: 'moderate',
        primarySnp: 'rs17822931',
        sliderMin: 'Sudoración mínima',
        sliderMax: 'Sudoración abundante',
        interpret(genotypes) {
            const g = genotypes['rs17822931'];
            if (!g) return null;
            if (g === 'TT') return { value: 'Sudoración mínima', confidence: 80, note: 'ABCC11 TT. El canal de transporte en glándulas ecrinas y apocrinas transporta menos. Menor volumen de sudoración axilar. Muy común en asiáticos del Este y amerindios.', position: 10 };
            if (g === 'CT' || g === 'TC') return { value: 'Sudoración moderada', confidence: 65, position: 50 };
            if (g === 'CC') return { value: 'Sudoración abundante normal', confidence: 80, note: 'ABCC11 CC. Glándulas sudoríparas totalmente activas. Sudoración eficiente y abundante para termorregulación. Normal en europeos y africanos.', position: 85 };
            return null;
        }
    },

    essential_tremor_lingo1: {
        name: 'Riesgo de temblor esencial (LINGO1)',
        icon: '🖐️',
        category: 'physiology',
        evidence: 'moderate',
        disclaimer: true,
        primarySnp: 'rs9652490',
        sliderMin: 'Sin predisposición',
        sliderMax: 'Mayor predisposición a temblor',
        interpret(genotypes) {
            const g = genotypes['rs9652490'];
            if (!g) return null;
            if (g === 'AA') return { value: 'Mayor predisposición al temblor esencial', confidence: 55, note: 'LINGO1 rs9652490 AA. Locus replicado en múltiples GWAS de temblor esencial. El temblor esencial es el trastorno del movimiento más común (prevalencia 1-5%). Manifiesta en manos con movimiento intencional. Si presentas temblor, consulta neurólogo.', position: 80 };
            if (g === 'AG' || g === 'GA') return { value: 'Predisposición moderada al temblor', confidence: 45, position: 50 };
            if (g === 'GG') return { value: 'Sin predisposición al temblor por LINGO1', confidence: 55, position: 15 };
            return null;
        }
    },

};

module.exports = EXPANSION_TRAITS;
