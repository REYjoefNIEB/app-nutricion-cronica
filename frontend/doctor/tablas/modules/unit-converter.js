// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-A)
// Conversor de unidades para inputs clínicos.
//
// Convención: cada parámetro tiene una "unidad base" (la que usa la
// fórmula). Las unidades alternativas se convierten a la base antes
// de calcular, y desde la base hacia la alternativa al cambiar toggle.
//
// Factores de conversión (estándar internacional):
//   creatinina: 1 mg/dL = 88.4 µmol/L
//   bilirrubina: 1 mg/dL = 17.1 µmol/L
//   albúmina:   1 g/dL  = 10 g/L
//
// Patrón: script regular (no module). Expone window.NuraTablas.UnitConverter.
// =================================================================

(function () {
    'use strict';

    /**
     * Tabla maestra: para cada parámetro, define la unidad base y el factor
     * de conversión hacia cada unidad alternativa. Convención:
     *   valorAlt = valorBase × factor
     *   valorBase = valorAlt / factor
     */
    const UNIT_TABLE = {
        creatinine: {
            base: 'mg/dL',
            units: {
                'mg/dL':  { factor: 1 },
                'umol/L': { factor: 88.4 }
            }
        },
        bilirubin: {
            base: 'mg/dL',
            units: {
                'mg/dL':  { factor: 1 },
                'umol/L': { factor: 17.1 }
            }
        },
        albumin: {
            base: 'g/dL',
            units: {
                'g/dL': { factor: 1 },
                'g/L':  { factor: 10 }
            }
        }
    };

    /**
     * Convierte un valor de la unidad alternativa a la unidad base.
     * @param {number} value - valor numérico
     * @param {string} fromUnit - unidad de origen (ej: 'umol/L')
     * @param {string} paramId - id del parámetro (ej: 'creatinine')
     * @returns {number} valor en unidad base
     */
    function toBase(value, fromUnit, paramId) {
        const param = UNIT_TABLE[paramId];
        if (!param) return value;
        const u = param.units[fromUnit];
        if (!u) return value;
        return value / u.factor;
    }

    /**
     * Convierte un valor desde la unidad base hacia la unidad alternativa.
     * @param {number} value - valor en unidad base
     * @param {string} toUnit - unidad destino
     * @param {string} paramId - id del parámetro
     * @returns {number} valor en unidad destino
     */
    function fromBase(value, toUnit, paramId) {
        const param = UNIT_TABLE[paramId];
        if (!param) return value;
        const u = param.units[toUnit];
        if (!u) return value;
        return value * u.factor;
    }

    /**
     * Convierte directamente entre dos unidades (atajo).
     */
    function convert(value, fromUnit, toUnit, paramId) {
        if (fromUnit === toUnit) return value;
        const base = toBase(value, fromUnit, paramId);
        return fromBase(base, toUnit, paramId);
    }

    /**
     * Devuelve la unidad base de un parámetro.
     */
    function getBaseUnit(paramId) {
        return UNIT_TABLE[paramId]?.base || null;
    }

    const api = { toBase, fromBase, convert, getBaseUnit, UNIT_TABLE };

    // Exposición dual: browser (window) + Node (module.exports) para tests.
    if (typeof window !== 'undefined') {
        window.NuraTablas = window.NuraTablas || {};
        window.NuraTablas.UnitConverter = api;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})();
