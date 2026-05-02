// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-A.1)
// Patrones de inputs reusables para escalas binarias/categóricas.
//
// PROBLEMA QUE RESUELVE:
//   Durante la validación bilateral del Sprint M4-A se detectó que la UX
//   con checkboxes sueltos (estilo "marcá si tiene HTA") es ambigua para
//   un médico apurado: deja la opción "vacía" como default, lo que se
//   parece a "todavía no contestaste" más que a "no". MDCalc.com usa
//   toggles Sí/No explícitos por cada criterio — ese es el patrón
//   estándar de la industria.
//
// PATRÓN ELEGIDO PARA NURA DOCTOR:
//   - Cada criterio binario es un select { No (0pts), Sí (+Npts) }
//     con default = "no". Esto fuerza al médico a confirmar explícita-
//     mente cada criterio (no asume "no" por omisión visual).
//   - Las edades agrupadas que en el paper original son "edad ≥75"
//     y "edad 65-74" (mutuamente excluyentes) se modelan como un único
//     select con 3 opciones: <65, 65-74, ≥75. Elimina la posibilidad
//     de que alguien marque ambas por error.
//   - El sexo se modela como select Masculino/Femenino (no checkbox
//     "Sexo femenino"). Esto evita la lectura potencialmente incómoda
//     "marcá si la paciente es mujer".
//
// ESCALAS QUE YA APLICAN ESTE PATRÓN (Sprint M4-A.1):
//   - CHA₂DS₂-VASc (cardiología, FA)
//
// ESCALAS QUE LO APLICARÁN EN M4-B (binarias con riesgo de ambigüedad):
//   - HAS-BLED (cardiología, sangrado en anticoagulación) — 7 ítems Sí/No
//   - Wells TVP (cardiología, riesgo TVP) — 9 ítems Sí/No con un score
//     final que puede ser negativo (alternativa "no", −1pts en uno de
//     ellos = "diagnóstico alternativo más probable")
//   - CURB-65 (neumología, severidad NAC) — 5 ítems Sí/No + edad ≥65
//
// HELPERS:
//   buildYesNoOption(points): construye opciones { value, label } para
//     un toggle binario con label que muestra los puntos al usuario.
//   buildAgeGroupOptions(thresholds, points): construye opciones para
//     un select de grupo etario mutuamente excluyente.
//
// Patrón: script regular. Expone window.NuraTablas.InputPatterns.
// =================================================================

(function () {
    'use strict';

    /**
     * Construye las options de un select binario Sí/No con visualización
     * de puntos en el label.
     *
     * @param {number} pointsIfYes - puntos que suma "Sí" en el score
     * @returns {Array} [{ value:'no', label:'No' }, { value:'yes', label:'Sí (+N)' }]
     */
    function buildYesNoOptions(pointsIfYes) {
        const sign = pointsIfYes >= 0 ? '+' : '';
        return [
            { value: 'no',  label: 'No' },
            { value: 'yes', label: `Sí (${sign}${pointsIfYes})` }
        ];
    }

    /**
     * Construye las options de un select de grupo etario mutuamente excluyente.
     * Ej: para CHA₂DS₂-VASc → [{<65, 0pts}, {65-74, 1pt}, {≥75, 2pts}].
     *
     * @param {Array<{label:string, points:number, value:string}>} groups
     * @returns {Array} options listas para un select
     */
    function buildAgeGroupOptions(groups) {
        return groups.map(g => {
            const sign = g.points > 0 ? '+' : '';
            const ptsLabel = g.points === 0 ? '(0)' : `(${sign}${g.points})`;
            return {
                value: g.value,
                label: `${g.label} ${ptsLabel}`
            };
        });
    }

    /**
     * Helper para sumar puntos en una calculadora basada en este patrón.
     * Devuelve `pts` si inputs[id] === 'yes', si no 0.
     *
     * @param {Object} inputs
     * @param {string} id
     * @param {number} pts
     */
    function yesScore(inputs, id, pts) {
        return inputs[id] === 'yes' ? pts : 0;
    }

    /**
     * Helper para resolver puntos de un select de grupo etario por mapa.
     * Ej: ageGroupScore(inputs, 'ageGroup', { under65: 0, '65_74': 1, '75plus': 2 })
     */
    function ageGroupScore(inputs, fieldId, pointsMap) {
        const v = inputs[fieldId];
        return (v && (v in pointsMap)) ? pointsMap[v] : 0;
    }

    const api = {
        buildYesNoOptions,
        buildAgeGroupOptions,
        yesScore,
        ageGroupScore
    };

    if (typeof window !== 'undefined') {
        window.NuraTablas = window.NuraTablas || {};
        window.NuraTablas.InputPatterns = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
