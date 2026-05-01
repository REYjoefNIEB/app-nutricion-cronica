// =================================================================
// [AGENTE 03 — Geo Detection] (Sprint M3)
// Configuración de países soportados en Nura.
//   Personal: 22 países (Latam hispano + ES + BR + US).
//   Doctor:   solo CL en V1; resto → waitlist.
//
// Patrón: script regular (no module) — expone window.NuraCountriesConfig.
// Cargar antes del app.js de cada página que lo necesite.
// =================================================================

// Países permitidos para Nura Personal V1 (22 países)
const PERSONAL_ALLOWED_COUNTRIES = [
    // Latam hispano (19)
    { code: 'CL', name: 'Chile',                flag: '🇨🇱' },
    { code: 'AR', name: 'Argentina',            flag: '🇦🇷' },
    { code: 'MX', name: 'México',               flag: '🇲🇽' },
    { code: 'CO', name: 'Colombia',             flag: '🇨🇴' },
    { code: 'PE', name: 'Perú',                 flag: '🇵🇪' },
    { code: 'UY', name: 'Uruguay',              flag: '🇺🇾' },
    { code: 'EC', name: 'Ecuador',              flag: '🇪🇨' },
    { code: 'BO', name: 'Bolivia',              flag: '🇧🇴' },
    { code: 'PY', name: 'Paraguay',             flag: '🇵🇾' },
    { code: 'VE', name: 'Venezuela',            flag: '🇻🇪' },
    { code: 'CR', name: 'Costa Rica',           flag: '🇨🇷' },
    { code: 'PA', name: 'Panamá',               flag: '🇵🇦' },
    { code: 'DO', name: 'República Dominicana', flag: '🇩🇴' },
    { code: 'GT', name: 'Guatemala',            flag: '🇬🇹' },
    { code: 'SV', name: 'El Salvador',          flag: '🇸🇻' },
    { code: 'HN', name: 'Honduras',             flag: '🇭🇳' },
    { code: 'NI', name: 'Nicaragua',            flag: '🇳🇮' },
    { code: 'CU', name: 'Cuba',                 flag: '🇨🇺' },
    { code: 'PR', name: 'Puerto Rico',          flag: '🇵🇷' },
    // Otros mercados
    { code: 'ES', name: 'España',               flag: '🇪🇸' },
    { code: 'BR', name: 'Brasil',               flag: '🇧🇷' },
    { code: 'US', name: 'Estados Unidos',       flag: '🇺🇸' }
];

// Países permitidos para Nura Doctor V1 (solo Chile)
const DOCTOR_ALLOWED_COUNTRIES = ['CL'];

/**
 * Verifica si un código de país está soportado para Nura Personal.
 */
function isPersonalAllowed(countryCode) {
    if (!countryCode) return false;
    return PERSONAL_ALLOWED_COUNTRIES.some(c => c.code === countryCode.toUpperCase());
}

/**
 * Verifica si un código de país está soportado para Nura Doctor.
 */
function isDoctorAllowed(countryCode) {
    if (!countryCode) return false;
    return DOCTOR_ALLOWED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Obtiene el nombre del país por su código (fallback al código si no está en la lista).
 */
function getCountryName(countryCode) {
    if (!countryCode) return '';
    const country = PERSONAL_ALLOWED_COUNTRIES.find(c => c.code === countryCode.toUpperCase());
    return country ? country.name : countryCode;
}

window.NuraCountriesConfig = {
    PERSONAL_ALLOWED_COUNTRIES,
    DOCTOR_ALLOWED_COUNTRIES,
    isPersonalAllowed,
    isDoctorAllowed,
    getCountryName
};
