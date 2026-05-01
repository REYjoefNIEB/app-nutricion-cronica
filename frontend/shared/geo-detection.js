// =================================================================
// [AGENTE 03 — Geo Detection] (Sprint M3)
// Detección de país por IP usando ipapi.co (free tier 1.000 req/día).
// Sin API key, sin signup — endpoint público.
//
// Patrón: script regular (no module) — expone window.NuraGeoDetection.
// Cargar antes del app.js de cada página que lo necesite.
// =================================================================

/**
 * Detecta el país del usuario llamando a ipapi.co.
 *
 * @returns {Promise<{success: boolean, country: string|null, error: string|null}>}
 *   success: true si la detección funcionó
 *   country: ISO alpha-2 (ej: 'CL', 'AR') o null si falló
 *   error: mensaje de error o null si OK
 */
async function detectCountryByIP() {
    console.log('[GeoDetection] Detecting country by IP...');
    try {
        const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.country_code) {
            console.warn('[GeoDetection] No country_code in response, falling back to manual selection');
            return { success: false, country: null, error: 'No country in response' };
        }

        const country = data.country_code.toUpperCase();
        console.log('[GeoDetection] Country detected:', country);
        return { success: true, country, error: null };

    } catch (err) {
        console.error('[GeoDetection] Error detecting country:', err);
        return { success: false, country: null, error: err.message };
    }
}

window.NuraGeoDetection = { detectCountryByIP };
