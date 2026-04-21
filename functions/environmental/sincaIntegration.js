/**
 * Integración con datos de calidad del aire — Chile y ciudades globales.
 *
 * Para Chile: datos SINCA (históricos por defecto).
 * Para otras ciudades: datos de referencia OMS/IQAir.
 */

const { CHILE_CITY_DATA, WORLD_CITY_DATA, categorizePM25 } = require('./genoEnvDatabase');

/**
 * Obtiene datos de calidad del aire para una ciudad.
 * @param {string} ciudad — nombre de ciudad
 * @param {string} [country='Chile'] — país
 */
async function getAirQuality(ciudad, country) {
    const normalizedCountry = country || 'Chile';

    if (normalizedCountry === 'Chile') {
        const cityData = CHILE_CITY_DATA[ciudad];
        if (!cityData) return _getDefaultQuality(ciudad, normalizedCountry);
        const liveData = await _fetchSincaLive(ciudad).catch(() => null);
        if (liveData) return liveData;
        return _buildFromHistorical(ciudad, cityData, normalizedCountry);
    }

    const countryData = WORLD_CITY_DATA[normalizedCountry];
    if (!countryData) return _getDefaultQuality(ciudad, normalizedCountry);
    const cityData = countryData[ciudad];
    if (!cityData) return _getDefaultQuality(ciudad, normalizedCountry);
    return _buildFromWorldData(ciudad, cityData, normalizedCountry);
}

async function _fetchSincaLive(ciudad) {
    // SINCA no tiene API REST pública documentada al 2026-04.
    throw new Error('SINCA live API not implemented yet');
}

function _buildFromHistorical(ciudad, cityData, country) {
    const month    = new Date().getMonth();
    const isWinter = month >= 5 && month <= 8;

    let pm25Factor = 1.0;
    if (isWinter && cityData.leña) pm25Factor = 1.6;

    const pm25   = Math.round(cityData.pm25Avg * pm25Factor);
    const cat    = categorizePM25(pm25);
    const season = isWinter ? 'invierno' : 'verano/primavera';

    return {
        ciudad, country,
        region:       cityData.region,
        lat:          cityData.lat,
        pm25,
        no2:          cityData.no2Avg,
        o3:           cityData.o3Avg,
        uvi:          cityData.uvi,
        arsenicWater: cityData.arsenicWater || false,
        mining:       cityData.mining  || false,
        leña:         cityData.leña    || false,
        category:     cat.label,
        color:        cat.color,
        icon:         cat.icon,
        isLive:       false,
        season,
        note: cityData.leña && isWinter
            ? `Alerta: en ${ciudad} la quema de leña en invierno eleva el PM2.5 significativamente (estimado ${pm25} µg/m³).`
            : null,
        source: 'Promedios históricos SINCA (Chile)'
    };
}

function _buildFromWorldData(ciudad, cityData, country) {
    const month    = new Date().getMonth();
    const isWinter = (cityData.lat < 0) ? (month >= 5 && month <= 8) : (month >= 11 || month <= 1);
    const season   = isWinter ? 'invierno' : 'verano/primavera';

    const pm25 = cityData.pm25Avg;
    const cat  = categorizePM25(pm25);

    return {
        ciudad, country,
        lat:          cityData.lat,
        pm25,
        uvi:          cityData.uvi,
        arsenicWater: cityData.arsenicWater || false,
        category:     cat.label,
        color:        cat.color,
        icon:         cat.icon,
        isLive:       false,
        season,
        note:         null,
        source:       'Datos de referencia OMS / IQAir World Air Quality Report'
    };
}

function _getDefaultQuality(ciudad, country) {
    return {
        ciudad,
        country: country || 'Desconocido',
        pm25:     25,
        uvi:      7,
        arsenicWater: false,
        category: 'Moderada',
        color:    '#D89E4F',
        icon:     '🟡',
        isLive:   false,
        note:     'Ciudad no encontrada. Se muestran valores de referencia globales OMS.',
        source:   'Valor de referencia (ciudad no en base de datos)'
    };
}

function getAvailableCities() {
    return Object.keys(CHILE_CITY_DATA).sort();
}

function getAvailableCountries() {
    return ['Chile', ...Object.keys(WORLD_CITY_DATA).sort()];
}

function getCitiesForCountry(country) {
    if (country === 'Chile') return Object.keys(CHILE_CITY_DATA).sort();
    const data = WORLD_CITY_DATA[country];
    return data ? Object.keys(data).sort() : [];
}

module.exports = { getAirQuality, getAvailableCities, getAvailableCountries, getCitiesForCountry };
