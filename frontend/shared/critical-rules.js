// =================================================================
// [ARQUITECTURA — Capa 1: El Escudo Crítico]
// shared/critical-rules.js
//
// PROPÓSITO: Fail-fast determinístico. Bloquea amenazas letales
//   ANTES de cualquier llamada a IA u otro procesamiento.
//   Ninguna lógica de IA puede anular una regla CRITICAL.
//
// CRITERIO DE INCLUSIÓN EN ESTA CAPA:
//   Solo interacciones con evidencia clínica Nivel A (FDA/EMA/Cochrane)
//   cuya consecuencia potencial sea muerte o daño irreversible.
//
// REGLAS DOCUMENTADAS (para Auditor Médico):
//   CR-01 — Gluten + Celiaquía: destrucción vellositaria, linfoma MALT.
//            Fuente: ESPGHAN Guidelines 2022.
//   CR-02 — Potasio + ERC (TFG < 30): hiperpotasemia → paro cardíaco.
//            Fuente: KDIGO CKD Guidelines 2024.
//   CR-03 — Tiramina + IMAOs: crisis hipertensiva potencialmente fatal.
//            Fuente: FDA Drug Interaction Studies; MAO Inhibitor Advisory.
//   CR-04 — Fenilalanina/Aspartamo + Fenilcetonuria: daño neurológico
//            irreversible por acumulación de fenilalanina.
//            Fuente: NIH PKU Guidelines 2023.
//   CR-05 — Vitamina K (alta) + Anticoagulación oral: antagonismo de
//            warfarina/acenocumarol → tromboembolismo.
//            Fuente: ESC Guidelines on Anticoagulation 2021.
//
// Aprobado Auditor Médico — pendiente revisión v1.3.0
// =================================================================

const CriticalShield = (() => {

    /**
     * Cada regla define:
     *   id       — código único para trazabilidad de logs.
     *   pathologyMatch — RegExp contra profile.pathology.
     *   medicationMatch — RegExp contra profile.medications[] (opcional).
     *   ingredientMatch — RegExp contra ingredientes detectados.
     *   level    — siempre 'CRITICAL' en esta capa.
     *   titleKey — clave i18n (fallback: title).
     *   title    — texto de alerta en español.
     *   message  — explicación clínica para el paciente (sin jerga).
     */
    const CRITICAL_RULES = [
        {
            id:              'CR-01',
            level:           'CRITICAL',
            title:           'BLOQUEO — Gluten detectado (Celiaquía)',
            message:         'Se detectó GLUTEN. Su diagnóstico de Celiaquía hace que ' +
                             'cualquier traza de gluten provoque daño intestinal grave e ' +
                             'irreversible. No consuma este producto.',
            ingredientMatch: /gluten|trigo|cebada|centeno|espelta|kamut|triticale|avena(?!\s+sin\s+gluten)/i,
            check(profile, ingredients) {
                const hasPathology = /celiaqu[íi]a|celiaco|enfermedad\s+cel[íi]aca/i.test(
                    profile.pathology || ''
                );
                const hasGluten = ingredients.some(i => this.ingredientMatch.test(i));
                return hasPathology && hasGluten;
            }
        },
        {
            id:              'CR-02',
            level:           'CRITICAL',
            title:           'BLOQUEO — Potasio elevado (Enfermedad Renal Crónica)',
            message:         'Se detectaron SUPLEMENTOS DE POTASIO o alimentos muy ricos ' +
                             'en potasio. Su ERC avanzada impide eliminar el exceso de ' +
                             'potasio, lo que puede causar paro cardíaco. Consulte a su ' +
                             'nefrólogo antes de consumir este producto.',
            ingredientMatch: /cloruro\s+de\s+potasio|suplemento\s+de\s+potasio|potasio\s+(?:100|[2-9]\d{2,})\s*mg/i,
            check(profile, ingredients) {
                const hasPathology = /erc|enfermedad\s+renal\s+cr[óo]nica|insuficiencia\s+renal/i.test(
                    profile.pathology || ''
                );
                const hasHighK = ingredients.some(i => this.ingredientMatch.test(i));
                return hasPathology && hasHighK;
            }
        },
        {
            id:              'CR-03',
            level:           'CRITICAL',
            title:           'BLOQUEO — Tiramina (Inhibidores MAO activos)',
            message:         'Se detectaron alimentos RICOS EN TIRAMINA (quesos curados, ' +
                             'embutidos, alimentos fermentados). Su medicación IMAO inhibe ' +
                             'la degradación de tiramina, provocando crisis hipertensiva ' +
                             'grave. No consuma este producto.',
            ingredientMatch: /queso\s+(?:curado|maduro|añejo|azul|parmesano|roquefort|gorgonzola)|embutido|salami|pepperoni|miso|tempeh|salsa\s+de\s+soja|extracto\s+de\s+levadura/i,
            check(profile, ingredients) {
                const hasMAOI = (profile.medications || []).some(m =>
                    /fenelzina|tranilcipromina|isocarboxazida|selegilina|rasagilina|IMAO/i.test(m)
                );
                const hasTyramine = ingredients.some(i => this.ingredientMatch.test(i));
                return hasMAOI && hasTyramine;
            }
        },
        {
            id:              'CR-04',
            level:           'CRITICAL',
            title:           'BLOQUEO — Fenilalanina/Aspartamo (Fenilcetonuria)',
            message:         'Se detectó FENILALANINA o ASPARTAMO. Su diagnóstico de ' +
                             'Fenilcetonuria (PKU) impide metabolizar esta sustancia, ' +
                             'causando acumulación cerebral con daño neurológico grave. ' +
                             'No consuma este producto.',
            ingredientMatch: /fenilalanina|aspartamo|aspartame|contiene\s+(?:una\s+fuente\s+de\s+)?fenilalanina/i,
            check(profile, ingredients) {
                const hasPathology = /fenilcetonuria|pku/i.test(profile.pathology || '');
                const hasPhe = ingredients.some(i => this.ingredientMatch.test(i));
                return hasPathology && hasPhe;
            }
        },
        {
            id:              'CR-05',
            level:           'CRITICAL',
            title:           'BLOQUEO — Vitamina K alta (Anticoagulación oral)',
            message:         'Se detectó un alimento MUY RICO EN VITAMINA K (espinaca, ' +
                             'kale, brócoli en grandes cantidades). Su medicación ' +
                             'anticoagulante (warfarina/acenocumarol) es antagonizada por ' +
                             'la Vitamina K, aumentando el riesgo de tromboembolismo. ' +
                             'Consulte a su médico antes de consumir.',
            ingredientMatch: /espinaca|kale|col\s+rizada|brócoli|brocoli|acelga|perejil|albahaca|col\s+de\s+bruselas|vitamina\s+k(?:\s+\d+\s*(?:mcg|µg|mg))?/i,
            check(profile, ingredients) {
                const hasAnticoag = (profile.medications || []).some(m =>
                    /warfarina|acenocumarol|sintrom/i.test(m)
                );
                const hasHighVitK = ingredients.some(i => this.ingredientMatch.test(i));
                return hasAnticoag && hasHighVitK;
            }
        }
    ];

    /**
     * Ejecuta todas las reglas críticas en orden.
     * Retorna al primer bloqueo encontrado (fail-fast).
     *
     * @param {object}   profile     - Perfil médico del paciente (de MedicalStorage).
     * @param {string[]} ingredients - Ingredientes detectados por OCR u otra fuente.
     * @returns {{ blocked: boolean, rule: object|null }}
     */
    function checkCriticalRisk(profile, ingredients) {
        if (!profile || !Array.isArray(ingredients)) {
            // Sin perfil no se puede evaluar: bloqueo conservador.
            return {
                blocked: true,
                rule: {
                    id:      'CR-00',
                    level:   'CRITICAL',
                    title:   'PERFIL MÉDICO NO DISPONIBLE',
                    message: 'No se puede evaluar la seguridad del producto sin ' +
                             'un perfil médico completo. Complete su Perfil Médico primero.'
                }
            };
        }

        for (const rule of CRITICAL_RULES) {
            if (rule.check(profile, ingredients)) {
                return {
                    blocked: true,
                    rule: {
                        id:      rule.id,
                        level:   rule.level,
                        title:   rule.title,
                        message: rule.message
                    }
                };
            }
        }

        return { blocked: false, rule: null };
    }

    return { CRITICAL_RULES, checkCriticalRisk };

})();
