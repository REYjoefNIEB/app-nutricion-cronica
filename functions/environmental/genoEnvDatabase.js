/**
 * Base de datos de interacciones Genética × Ambiente Chile.
 *
 * Cruza variantes genéticas con factores ambientales específicos de Chile:
 * - Calidad del aire (PM2.5, NO2, O3) vía SINCA
 * - Arsénico en agua (Norte Grande)
 * - Índice UV por latitud
 * - Contaminantes mineros (Región de Antofagasta / Atacama)
 *
 * DIFERENCIADOR ÚNICO de Nura vs. apps genómicas internacionales.
 */

// ── SNPs con relevancia ambiental ──────────────────────────────────────
const ENVIRONMENTAL_SNPS = {

    // Detoxificación de contaminantes aéreos
    rs1695: {
        gene:               'GSTP1',
        trait:              'Detoxificación de compuestos tóxicos y humo',
        environmental_factor: 'PM2.5, humo, benzeno, smog',
        icon:               '🌫️',
        interpret(genotype) {
            if (genotype === 'AA') return { activity: 'Alta',    risk: 'BAJO',  advice: 'Eficiente eliminando toxinas aéreas. Riesgo estándar en días de contaminación.' };
            if (genotype === 'AG' || genotype === 'GA') return { activity: 'Reducida', risk: 'MEDIO', advice: 'Detoxificación algo reducida. Usa mascarilla en días de alerta ambiental y evita ejercicio exterior en pre-emergencia.' };
            if (genotype === 'GG') return { activity: 'Baja',    risk: 'ALTO',  advice: '⚠️ Muy vulnerable a contaminación aérea. En días de emergencia ambiental quédate en interior, usa purificador de aire y mascarilla N95 al salir. Evita ejercicio exterior con AQI >100.' };
            return null;
        }
    },

    rs4680: {
        gene:               'COMT',
        trait:              'Detoxificación de catecoles y estrés oxidativo',
        environmental_factor: 'PM2.5, estrés crónico, contaminación urbana',
        icon:               '🏙️',
        interpret(genotype) {
            if (genotype === 'GG') return { metabolism: 'Rápida', risk: 'BAJO',  advice: 'Eliminación eficiente de catecoles. Metabolismo de dopamina normal.' };
            if (genotype === 'AG' || genotype === 'GA') return { metabolism: 'Intermedia', risk: 'MEDIO', advice: 'Balance normal.' };
            if (genotype === 'AA') return { metabolism: 'Lenta',  risk: 'ALTO',  advice: 'COMT lento. Acumulación de catecoles con estrés y contaminación. Mayor sensibilidad al ruido y contaminación crónica. Beneficio mayor de gestión del estrés y antioxidantes.' };
            return null;
        }
    },

    // Metabolismo de arsénico — crítico para Norte de Chile
    rs3740393: {
        gene:               'AS3MT',
        trait:              'Metabolismo de arsénico inorgánico',
        environmental_factor: 'Arsénico en agua potable (Norte Grande de Chile)',
        icon:               '💧',
        interpret(genotype) {
            if (genotype === 'CC') return { efficiency: 'Alta',    risk: 'MODERADO', advice: 'Si vives en Antofagasta, Calama, Tocopilla o Diego de Almagro: riesgo moderado por arsénico en agua. Se recomienda agua filtrada (ósmosis inversa).' };
            if (genotype === 'CG' || genotype === 'GC') return { efficiency: 'Media',    risk: 'ELEVADO',  advice: 'Eficiencia reducida en metabolizar arsénico. Si estás en zona minera del Norte, usa siempre agua filtrada o embotellada para beber y cocinar.' };
            if (genotype === 'GG') return { efficiency: 'Baja',    risk: 'ALTO',     advice: '⚠️ Metabolismo ineficiente del arsénico. En zonas del Norte Grande: NUNCA uses agua de la red para beber o cocinar sin filtrar. Considera filtro de ósmosis inversa certificado NSF/ANSI 58.' };
            return null;
        }
    },

    // Susceptibilidad solar / UV — relevante por diversidad latitudinal Chile
    rs1805007: {
        gene:               'MC1R',
        trait:              'Susceptibilidad a radiación UV y cáncer de piel',
        environmental_factor: 'Índice UV (muy alto en Norte y zonas de alta montaña)',
        icon:               '☀️',
        interpret(genotype) {
            if (genotype === 'TT') return { risk: 'ALTO',  advice: '⚠️ MC1R variante. Alta sensibilidad al UV. FPS 50+ diario obligatorio, especialmente en Norte (Atacama, Antofagasta: UV Index hasta 20+). Evitar sol 11:00-16:00. Revisión dermatológica anual.' };
            if (genotype === 'CT' || genotype === 'TC') return { risk: 'MEDIO', advice: 'Sensibilidad moderada al UV. FPS 30+ diario. Ropa protectora en exposición prolongada.' };
            if (genotype === 'CC') return { risk: 'BAJO',  advice: 'Sin variante MC1R. FPS 15-30 suficiente en exposición normal. Igual aplica protección en altitudes altas (ski, senderismo).' };
            return null;
        }
    },

    // Respuesta respiratoria a contaminación
    rs2069812: {
        gene:               'IL5',
        trait:              'Respuesta inflamatoria respiratoria',
        environmental_factor: 'PM2.5, ozono, humo de leña (Temuco, Osorno, sur)',
        icon:               '🫁',
        interpret(genotype) {
            if (genotype === 'CC') return { risk: 'BAJO',  advice: 'Respuesta inflamatoria respiratoria normal. Riesgo estándar con contaminación.' };
            if (genotype === 'CT' || genotype === 'TC') return { risk: 'MEDIO', advice: 'Respuesta algo exagerada. En ciudades del Sur (Temuco, Osorno, Coyhaique) con alta contaminación de leña en invierno: usa mascarilla en días críticos.' };
            if (genotype === 'TT') return { risk: 'ALTO',  advice: '⚠️ Alta respuesta inflamatoria respiratoria. En días de pre-emergencia o emergencia ambiental: evita ejercicio exterior, cierra ventanas, usa purificador HEPA. Si tienes asma, mantén inhalador de rescate disponible.' };
            return null;
        }
    },

    // Vitamina D y latitud — crítico para extremo sur de Chile
    rs2282679: {
        gene:               'GC',
        trait:              'Síntesis de Vitamina D',
        environmental_factor: 'Latitud (UV solar), especialmente sur de Chile',
        icon:               '🌞',
        interpret(genotype, location) {
            const isHighLatitude = location?.latitude && location.latitude < -38;
            const locationNote   = isHighLatitude ? 'Tu ubicación en el Sur de Chile reduce la síntesis de vitamina D en invierno.' : '';

            if (genotype === 'AA') return { level: 'Normal',    advice: `Síntesis normal. ${locationNote} En invierno austral suplementa 800-1.000 UI/día.` };
            if (genotype === 'AC' || genotype === 'CA') return { level: 'Bajo-normal', advice: `${locationNote} Suplementa 1.000-2.000 UI/día. Exposición solar en mediodía cuando sea posible.` };
            if (genotype === 'CC') return { level: 'Muy bajo',  advice: `⚠️ Alta probabilidad de déficit. ${isHighLatitude ? 'Tu combinación genética + latitud alta es especialmente crítica.' : ''} Suplementa 2.000-4.000 UI/día. Mide nivel de 25-OH-Vitamina D con tu médico.` };
            return null;
        }
    }
};

// ── Datos de contaminación por ciudad chilena (promedios históricos SINCA) ──
// Fuente: SINCA — Sistema de Información Nacional de Calidad del Aire
// https://sinca.mma.gob.cl/
// Nota: Estos son valores de referencia; los valores en tiempo real se obtienen via API.
const CHILE_CITY_DATA = {
    'Santiago':        { region: 'Metropolitana', lat: -33.4, pm25Avg: 45, no2Avg: 35, o3Avg: 40, uvi: 9,  arsenicWater: false },
    'Puente Alto':     { region: 'Metropolitana', lat: -33.6, pm25Avg: 50, no2Avg: 30, o3Avg: 45, uvi: 9,  arsenicWater: false },
    'La Florida':      { region: 'Metropolitana', lat: -33.5, pm25Avg: 48, no2Avg: 33, o3Avg: 43, uvi: 9,  arsenicWater: false },
    'Temuco':          { region: 'Araucanía',     lat: -38.7, pm25Avg: 70, no2Avg: 18, o3Avg: 20, uvi: 6,  arsenicWater: false, leña: true },
    'Osorno':          { region: 'Los Lagos',     lat: -40.6, pm25Avg: 65, no2Avg: 15, o3Avg: 18, uvi: 5,  arsenicWater: false, leña: true },
    'Valdivia':        { region: 'Los Ríos',      lat: -39.8, pm25Avg: 55, no2Avg: 15, o3Avg: 20, uvi: 5,  arsenicWater: false, leña: true },
    'Coyhaique':       { region: 'Aysén',         lat: -45.6, pm25Avg: 80, no2Avg: 10, o3Avg: 15, uvi: 4,  arsenicWater: false, leña: true },
    'Antofagasta':     { region: 'Antofagasta',   lat: -23.6, pm25Avg: 25, no2Avg: 30, o3Avg: 35, uvi: 13, arsenicWater: true },
    'Calama':          { region: 'Antofagasta',   lat: -22.5, pm25Avg: 35, no2Avg: 40, o3Avg: 30, uvi: 14, arsenicWater: true, mining: true },
    'Tocopilla':       { region: 'Antofagasta',   lat: -22.1, pm25Avg: 40, no2Avg: 35, o3Avg: 32, uvi: 14, arsenicWater: true },
    'Arica':           { region: 'Arica y Parinacota', lat: -18.5, pm25Avg: 20, no2Avg: 22, o3Avg: 38, uvi: 15, arsenicWater: false },
    'Iquique':         { region: 'Tarapacá',      lat: -20.2, pm25Avg: 22, no2Avg: 28, o3Avg: 40, uvi: 14, arsenicWater: false },
    'Copiapó':         { region: 'Atacama',       lat: -27.4, pm25Avg: 30, no2Avg: 25, o3Avg: 42, uvi: 12, arsenicWater: false, mining: true },
    'La Serena':       { region: 'Coquimbo',      lat: -29.9, pm25Avg: 28, no2Avg: 22, o3Avg: 38, uvi: 11, arsenicWater: false },
    'Valparaíso':      { region: 'Valparaíso',    lat: -33.0, pm25Avg: 30, no2Avg: 28, o3Avg: 32, uvi: 9,  arsenicWater: false },
    'Rancagua':        { region: "O'Higgins",     lat: -34.2, pm25Avg: 42, no2Avg: 28, o3Avg: 38, uvi: 8,  arsenicWater: false },
    'Talca':           { region: 'Maule',         lat: -35.4, pm25Avg: 48, no2Avg: 20, o3Avg: 28, uvi: 7,  arsenicWater: false, leña: true },
    'Concepción':      { region: 'Biobío',        lat: -36.8, pm25Avg: 40, no2Avg: 25, o3Avg: 25, uvi: 6,  arsenicWater: false },
    'Los Ángeles':     { region: 'Biobío',        lat: -37.5, pm25Avg: 55, no2Avg: 18, o3Avg: 22, uvi: 6,  arsenicWater: false, leña: true },
    'Puerto Montt':    { region: 'Los Lagos',     lat: -41.5, pm25Avg: 45, no2Avg: 12, o3Avg: 15, uvi: 4,  arsenicWater: false, leña: true },
    'Punta Arenas':    { region: 'Magallanes',    lat: -53.2, pm25Avg: 35, no2Avg: 10, o3Avg: 10, uvi: 3,  arsenicWater: false, leña: true }
};

// Categorías de índice de contaminación
const PM25_CATEGORIES = [
    { max: 12,  label: 'Buena',            color: '#4BA876', icon: '🟢' },
    { max: 35,  label: 'Moderada',         color: '#D89E4F', icon: '🟡' },
    { max: 55,  label: 'Dañina sensibles', color: '#E87A3A', icon: '🟠' },
    { max: 150, label: 'Dañina todos',     color: '#D45D5D', icon: '🔴' },
    { max: 250, label: 'Muy dañina',       color: '#8B3A8B', icon: '🟣' },
    { max: Infinity, label: 'Peligrosa',   color: '#7B1A1A', icon: '⚫' }
];

function categorizePM25(pm25) {
    return PM25_CATEGORIES.find(c => pm25 <= c.max) || PM25_CATEGORIES[PM25_CATEGORIES.length - 1];
}

// ── Datos de calidad del aire por país/ciudad (valores de referencia históricos) ──
// Fuentes: OMS Air Quality Database, IQAir World Air Quality Report 2023, EPA
const WORLD_CITY_DATA = {
    // ── LATINOAMÉRICA ────────────────────────────────────────────────────
    'Argentina': {
        'Buenos Aires': { lat: -34.6, pm25Avg: 22, uvi: 8,  arsenicWater: false },
        'Córdoba':      { lat: -31.4, pm25Avg: 18, uvi: 9,  arsenicWater: false },
        'Rosario':      { lat: -32.9, pm25Avg: 20, uvi: 8,  arsenicWater: false },
        'Mendoza':      { lat: -32.9, pm25Avg: 15, uvi: 10, arsenicWater: false },
        'Tucumán':      { lat: -26.8, pm25Avg: 18, uvi: 11, arsenicWater: false },
        'Mar del Plata':{ lat: -38.0, pm25Avg: 10, uvi: 7,  arsenicWater: false },
        'Salta':        { lat: -24.8, pm25Avg: 16, uvi: 12, arsenicWater: false },
    },
    'Bolivia': {
        'La Paz':       { lat: -16.5, pm25Avg: 35, uvi: 14, arsenicWater: false },
        'Santa Cruz':   { lat: -17.8, pm25Avg: 28, uvi: 12, arsenicWater: false },
        'Cochabamba':   { lat: -17.4, pm25Avg: 22, uvi: 13, arsenicWater: false },
        'Oruro':        { lat: -17.9, pm25Avg: 30, uvi: 14, arsenicWater: false },
    },
    'Brasil': {
        'São Paulo':      { lat: -23.5, pm25Avg: 28, uvi: 9,  arsenicWater: false },
        'Rio de Janeiro': { lat: -22.9, pm25Avg: 22, uvi: 10, arsenicWater: false },
        'Brasília':       { lat: -15.8, pm25Avg: 15, uvi: 12, arsenicWater: false },
        'Manaus':         { lat: -3.1,  pm25Avg: 12, uvi: 14, arsenicWater: false },
        'Salvador':       { lat: -12.9, pm25Avg: 14, uvi: 12, arsenicWater: false },
        'Fortaleza':      { lat: -3.7,  pm25Avg: 14, uvi: 13, arsenicWater: false },
        'Curitiba':       { lat: -25.4, pm25Avg: 16, uvi: 9,  arsenicWater: false },
        'Porto Alegre':   { lat: -30.0, pm25Avg: 18, uvi: 8,  arsenicWater: false },
        'Belo Horizonte': { lat: -19.9, pm25Avg: 20, uvi: 11, arsenicWater: false },
    },
    'Colombia': {
        'Bogotá':         { lat: 4.7,  pm25Avg: 25, uvi: 12, arsenicWater: false },
        'Medellín':       { lat: 6.2,  pm25Avg: 35, uvi: 12, arsenicWater: false },
        'Cali':           { lat: 3.4,  pm25Avg: 28, uvi: 13, arsenicWater: false },
        'Barranquilla':   { lat: 11.0, pm25Avg: 22, uvi: 13, arsenicWater: false },
        'Cartagena':      { lat: 10.4, pm25Avg: 18, uvi: 13, arsenicWater: false },
    },
    'Ecuador': {
        'Quito':          { lat: -0.2, pm25Avg: 22, uvi: 14, arsenicWater: false },
        'Guayaquil':      { lat: -2.2, pm25Avg: 18, uvi: 13, arsenicWater: false },
        'Cuenca':         { lat: -2.9, pm25Avg: 15, uvi: 13, arsenicWater: false },
    },
    'México': {
        'Ciudad de México': { lat: 19.4, pm25Avg: 30, uvi: 10, arsenicWater: false },
        'Guadalajara':      { lat: 20.7, pm25Avg: 22, uvi: 11, arsenicWater: false },
        'Monterrey':        { lat: 25.7, pm25Avg: 28, uvi: 9,  arsenicWater: false },
        'Cancún':           { lat: 21.2, pm25Avg: 12, uvi: 13, arsenicWater: false },
        'Puebla':           { lat: 19.0, pm25Avg: 22, uvi: 10, arsenicWater: false },
        'Tijuana':          { lat: 32.5, pm25Avg: 18, uvi: 8,  arsenicWater: false },
        'León':             { lat: 21.1, pm25Avg: 20, uvi: 11, arsenicWater: false },
        'Mérida':           { lat: 20.9, pm25Avg: 14, uvi: 12, arsenicWater: false },
    },
    'Paraguay': {
        'Asunción':       { lat: -25.3, pm25Avg: 18, uvi: 10, arsenicWater: false },
        'Ciudad del Este':{ lat: -25.5, pm25Avg: 16, uvi: 10, arsenicWater: false },
    },
    'Perú': {
        'Lima':           { lat: -12.0, pm25Avg: 28, uvi: 10, arsenicWater: false },
        'Arequipa':       { lat: -16.4, pm25Avg: 20, uvi: 12, arsenicWater: false },
        'Cusco':          { lat: -13.5, pm25Avg: 15, uvi: 13, arsenicWater: false },
        'Trujillo':       { lat: -8.1,  pm25Avg: 22, uvi: 11, arsenicWater: false },
        'Piura':          { lat: -5.2,  pm25Avg: 18, uvi: 12, arsenicWater: false },
    },
    'Uruguay': {
        'Montevideo':     { lat: -34.9, pm25Avg: 14, uvi: 7, arsenicWater: false },
        'Punta del Este': { lat: -34.9, pm25Avg: 10, uvi: 7, arsenicWater: false },
    },
    'Venezuela': {
        'Caracas':        { lat: 10.5, pm25Avg: 20, uvi: 12, arsenicWater: false },
        'Maracaibo':      { lat: 10.6, pm25Avg: 22, uvi: 13, arsenicWater: false },
        'Valencia (VE)':  { lat: 10.2, pm25Avg: 18, uvi: 12, arsenicWater: false },
    },
    // ── EUROPA ──────────────────────────────────────────────────────────
    'Alemania': {
        'Berlín':         { lat: 52.5, pm25Avg: 12, uvi: 4, arsenicWater: false },
        'Múnich':         { lat: 48.1, pm25Avg: 14, uvi: 4, arsenicWater: false },
        'Hamburgo':       { lat: 53.6, pm25Avg: 13, uvi: 3, arsenicWater: false },
        'Colonia':        { lat: 50.9, pm25Avg: 14, uvi: 4, arsenicWater: false },
        'Fráncfort':      { lat: 50.1, pm25Avg: 15, uvi: 4, arsenicWater: false },
    },
    'España': {
        'Madrid':         { lat: 40.4, pm25Avg: 18, uvi: 7, arsenicWater: false },
        'Barcelona':      { lat: 41.4, pm25Avg: 15, uvi: 6, arsenicWater: false },
        'Sevilla':        { lat: 37.4, pm25Avg: 12, uvi: 8, arsenicWater: false },
        'Valencia':       { lat: 39.5, pm25Avg: 14, uvi: 7, arsenicWater: false },
        'Bilbao':         { lat: 43.3, pm25Avg: 14, uvi: 5, arsenicWater: false },
        'Málaga':         { lat: 36.7, pm25Avg: 12, uvi: 8, arsenicWater: false },
        'Zaragoza':       { lat: 41.7, pm25Avg: 14, uvi: 6, arsenicWater: false },
    },
    'Francia': {
        'París':          { lat: 48.9, pm25Avg: 14, uvi: 4, arsenicWater: false },
        'Lyon':           { lat: 45.7, pm25Avg: 18, uvi: 4, arsenicWater: false },
        'Marsella':       { lat: 43.3, pm25Avg: 15, uvi: 6, arsenicWater: false },
        'Toulouse':       { lat: 43.6, pm25Avg: 14, uvi: 5, arsenicWater: false },
        'Niza':           { lat: 43.7, pm25Avg: 13, uvi: 6, arsenicWater: false },
    },
    'Italia': {
        'Roma':           { lat: 41.9, pm25Avg: 20, uvi: 6, arsenicWater: false },
        'Milán':          { lat: 45.5, pm25Avg: 28, uvi: 5, arsenicWater: false },
        'Nápoles':        { lat: 40.8, pm25Avg: 22, uvi: 6, arsenicWater: false },
        'Turín':          { lat: 45.1, pm25Avg: 25, uvi: 5, arsenicWater: false },
        'Bolonia':        { lat: 44.5, pm25Avg: 22, uvi: 5, arsenicWater: false },
        'Florencia':      { lat: 43.8, pm25Avg: 18, uvi: 6, arsenicWater: false },
        'Palermo':        { lat: 38.1, pm25Avg: 15, uvi: 7, arsenicWater: false },
    },
    'Países Bajos': {
        'Ámsterdam':      { lat: 52.4, pm25Avg: 14, uvi: 3, arsenicWater: false },
        'Rotterdam':      { lat: 51.9, pm25Avg: 16, uvi: 3, arsenicWater: false },
        'La Haya':        { lat: 52.1, pm25Avg: 13, uvi: 3, arsenicWater: false },
    },
    'Polonia': {
        'Varsovia':       { lat: 52.2, pm25Avg: 22, uvi: 4, arsenicWater: false },
        'Cracovia':       { lat: 50.1, pm25Avg: 30, uvi: 4, arsenicWater: false },
        'Gdansk':         { lat: 54.4, pm25Avg: 18, uvi: 3, arsenicWater: false },
    },
    'Portugal': {
        'Lisboa':         { lat: 38.7, pm25Avg: 12, uvi: 7, arsenicWater: false },
        'Oporto':         { lat: 41.2, pm25Avg: 12, uvi: 6, arsenicWater: false },
        'Faro':           { lat: 37.0, pm25Avg: 10, uvi: 8, arsenicWater: false },
    },
    'Reino Unido': {
        'Londres':        { lat: 51.5, pm25Avg: 12, uvi: 3, arsenicWater: false },
        'Manchester':     { lat: 53.5, pm25Avg: 14, uvi: 3, arsenicWater: false },
        'Edimburgo':      { lat: 55.9, pm25Avg: 10, uvi: 2, arsenicWater: false },
        'Birmingham':     { lat: 52.5, pm25Avg: 13, uvi: 3, arsenicWater: false },
        'Glasgow':        { lat: 55.9, pm25Avg: 11, uvi: 2, arsenicWater: false },
        'Bristol':        { lat: 51.5, pm25Avg: 12, uvi: 3, arsenicWater: false },
    },
    // ── NORTEAMÉRICA ──────────────────────────────────────────────────────
    'Canadá': {
        'Toronto':        { lat: 43.7, pm25Avg: 10, uvi: 4, arsenicWater: false },
        'Vancouver':      { lat: 49.3, pm25Avg: 8,  uvi: 4, arsenicWater: false },
        'Montreal':       { lat: 45.5, pm25Avg: 10, uvi: 4, arsenicWater: false },
        'Calgary':        { lat: 51.0, pm25Avg: 8,  uvi: 4, arsenicWater: false },
        'Ottawa':         { lat: 45.4, pm25Avg: 9,  uvi: 4, arsenicWater: false },
    },
    'Estados Unidos': {
        'Los Ángeles':    { lat: 34.1, pm25Avg: 18, uvi: 8, arsenicWater: false },
        'Nueva York':     { lat: 40.7, pm25Avg: 12, uvi: 5, arsenicWater: false },
        'Chicago':        { lat: 41.9, pm25Avg: 14, uvi: 5, arsenicWater: false },
        'Miami':          { lat: 25.8, pm25Avg: 10, uvi: 9, arsenicWater: false },
        'Houston':        { lat: 29.8, pm25Avg: 14, uvi: 8, arsenicWater: false },
        'Dallas':         { lat: 32.8, pm25Avg: 12, uvi: 7, arsenicWater: false },
        'San Francisco':  { lat: 37.8, pm25Avg: 12, uvi: 6, arsenicWater: false },
        'Seattle':        { lat: 47.6, pm25Avg: 8,  uvi: 4, arsenicWater: false },
        'Atlanta':        { lat: 33.7, pm25Avg: 12, uvi: 7, arsenicWater: false },
        'Boston':         { lat: 42.4, pm25Avg: 10, uvi: 5, arsenicWater: false },
        'Phoenix':        { lat: 33.4, pm25Avg: 15, uvi: 9, arsenicWater: false },
        'Denver':         { lat: 39.7, pm25Avg: 12, uvi: 7, arsenicWater: false },
    },
    // ── ASIA ─────────────────────────────────────────────────────────────
    'China': {
        'Pekín':          { lat: 40.0, pm25Avg: 40, uvi: 5, arsenicWater: false },
        'Shanghái':       { lat: 31.2, pm25Avg: 35, uvi: 6, arsenicWater: false },
        'Cantón':         { lat: 23.1, pm25Avg: 38, uvi: 8, arsenicWater: false },
        'Shenzhen':       { lat: 22.5, pm25Avg: 30, uvi: 9, arsenicWater: false },
        'Chengdu':        { lat: 30.7, pm25Avg: 45, uvi: 6, arsenicWater: false },
    },
    'India': {
        'Delhi':          { lat: 28.7, pm25Avg: 90, uvi: 8,  arsenicWater: false },
        'Bombay':         { lat: 19.1, pm25Avg: 45, uvi: 10, arsenicWater: false },
        'Bangalore':      { lat: 12.9, pm25Avg: 30, uvi: 11, arsenicWater: false },
        'Calcuta':        { lat: 22.6, pm25Avg: 55, uvi: 9,  arsenicWater: false },
        'Chennai':        { lat: 13.1, pm25Avg: 35, uvi: 11, arsenicWater: false },
        'Hyderabad':      { lat: 17.4, pm25Avg: 32, uvi: 10, arsenicWater: false },
    },
    'Japón': {
        'Tokio':          { lat: 35.7, pm25Avg: 12, uvi: 6, arsenicWater: false },
        'Osaka':          { lat: 34.7, pm25Avg: 15, uvi: 6, arsenicWater: false },
        'Kioto':          { lat: 35.0, pm25Avg: 12, uvi: 5, arsenicWater: false },
        'Yokohama':       { lat: 35.4, pm25Avg: 13, uvi: 6, arsenicWater: false },
        'Sapporo':        { lat: 43.1, pm25Avg: 9,  uvi: 4, arsenicWater: false },
        'Fukuoka':        { lat: 33.6, pm25Avg: 14, uvi: 6, arsenicWater: false },
    },
    'Corea del Sur': {
        'Seúl':           { lat: 37.6, pm25Avg: 25, uvi: 5, arsenicWater: false },
        'Busan':          { lat: 35.2, pm25Avg: 22, uvi: 6, arsenicWater: false },
        'Incheon':        { lat: 37.5, pm25Avg: 24, uvi: 5, arsenicWater: false },
    },
    'Singapur': {
        'Singapur':       { lat: 1.4,  pm25Avg: 18, uvi: 12, arsenicWater: false },
    },
    'Tailandia': {
        'Bangkok':        { lat: 13.8, pm25Avg: 45, uvi: 11, arsenicWater: false },
        'Chiang Mai':     { lat: 18.8, pm25Avg: 55, uvi: 10, arsenicWater: false },
        'Phuket':         { lat: 7.9,  pm25Avg: 20, uvi: 12, arsenicWater: false },
    },
    'Emiratos Árabes': {
        'Dubái':          { lat: 25.2, pm25Avg: 35, uvi: 10, arsenicWater: false },
        'Abu Dhabi':      { lat: 24.5, pm25Avg: 30, uvi: 10, arsenicWater: false },
    },
    'Turquía': {
        'Estambul':       { lat: 41.0, pm25Avg: 28, uvi: 6, arsenicWater: false },
        'Ankara':         { lat: 39.9, pm25Avg: 22, uvi: 6, arsenicWater: false },
        'Esmirna':        { lat: 38.4, pm25Avg: 20, uvi: 7, arsenicWater: false },
    },
    // ── OCEANÍA ──────────────────────────────────────────────────────────
    'Australia': {
        'Sídney':         { lat: -33.9, pm25Avg: 8,  uvi: 11, arsenicWater: false },
        'Melbourne':      { lat: -37.8, pm25Avg: 8,  uvi: 9,  arsenicWater: false },
        'Brisbane':       { lat: -27.5, pm25Avg: 8,  uvi: 12, arsenicWater: false },
        'Perth':          { lat: -31.9, pm25Avg: 7,  uvi: 11, arsenicWater: false },
        'Adelaida':       { lat: -34.9, pm25Avg: 8,  uvi: 10, arsenicWater: false },
        'Canberra':       { lat: -35.3, pm25Avg: 7,  uvi: 9,  arsenicWater: false },
    },
    'Nueva Zelanda': {
        'Auckland':       { lat: -36.9, pm25Avg: 6,  uvi: 9,  arsenicWater: false },
        'Wellington':     { lat: -41.3, pm25Avg: 6,  uvi: 8,  arsenicWater: false },
        'Christchurch':   { lat: -43.5, pm25Avg: 8,  uvi: 7,  arsenicWater: false },
    },
    // ── AFRICA ───────────────────────────────────────────────────────────
    'Egipto': {
        'El Cairo':       { lat: 30.1, pm25Avg: 60, uvi: 9,  arsenicWater: false },
        'Alejandría':     { lat: 31.2, pm25Avg: 40, uvi: 8,  arsenicWater: false },
    },
    'Nigeria': {
        'Lagos':          { lat: 6.5,  pm25Avg: 55, uvi: 12, arsenicWater: false },
        'Abuja':          { lat: 9.1,  pm25Avg: 35, uvi: 12, arsenicWater: false },
    },
    'Sudáfrica': {
        'Ciudad del Cabo':   { lat: -33.9, pm25Avg: 12, uvi: 10, arsenicWater: false },
        'Johannesburgo':     { lat: -26.2, pm25Avg: 20, uvi: 9,  arsenicWater: false },
        'Durban':            { lat: -29.9, pm25Avg: 15, uvi: 10, arsenicWater: false },
        'Pretoria':          { lat: -25.7, pm25Avg: 18, uvi: 9,  arsenicWater: false },
    },
    'Kenia': {
        'Nairobi':        { lat: -1.3, pm25Avg: 22, uvi: 12, arsenicWater: false },
        'Mombasa':        { lat: -4.0, pm25Avg: 18, uvi: 12, arsenicWater: false },
    },
    'Marruecos': {
        'Casablanca':     { lat: 33.6, pm25Avg: 25, uvi: 8, arsenicWater: false },
        'Rabat':          { lat: 34.0, pm25Avg: 20, uvi: 8, arsenicWater: false },
        'Marrakech':      { lat: 31.6, pm25Avg: 22, uvi: 9, arsenicWater: false },
    },
};

module.exports = { ENVIRONMENTAL_SNPS, CHILE_CITY_DATA, WORLD_CITY_DATA, categorizePM25 };
