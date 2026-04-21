// =================================================================
// [BACKEND — Cloud Function] analyzeFoodProxy
//
// PROPÓSITO: Proxy seguro entre el frontend Nura y la API de Anthropic.
//   Recibe el perfil del paciente y los datos del alimento, llama a
//   Claude Haiku (modelo económico y rápido) y retorna el análisis.
//
// SEGURIDAD:
//   La API key NUNCA viaja al cliente. Se lee desde Firebase Secret
//   Manager en runtime. Para configurarla:
//     firebase secrets:set ANTHROPIC_API_KEY
//
// DEPLOY:
//     cd functions && npm install
//     firebase deploy --only functions
// =================================================================

const { onRequest }     = require('firebase-functions/v2/https');
const { defineSecret }  = require('firebase-functions/params');
const Anthropic         = require('@anthropic-ai/sdk');

// ── Firebase Admin SDK — inicializado una sola vez al cargar el módulo ─
const admin = require('firebase-admin');
if (!admin.apps.length) {
    admin.initializeApp();
}

// ── Secretos ─────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
// GENETIC_MASTER_KEY se lee desde process.env cuando está configurado como secret.
// Para habilitarlo: openssl rand -base64 32
//                   firebase functions:secrets:set GENETIC_MASTER_KEY
// Mientras no esté configurado, saveGeneticProfile usa fallback sin cifrado de aplicación.

// ── Módulos de seguridad ──────────────────────────────────────────────
const { encryptGeneticData, decryptGeneticData } = require('./security/encryption');
const { logGeneticAccess }                       = require('./security/audit-log');

// ── Modelo: Claude Haiku (ultra rápido y económico para pruebas) ───
const MODEL      = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// =================================================================
// 🧠 MOTOR DETERMINÍSTICO NURA V2 (100 Patologías)
// =================================================================
const clinicalRules = require('./clinical-rules.json');

const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Obtiene las reglas para una patología específica desde el diccionario cargado.
 */
function _reglasParaPatologia(idPat) {
    const bloque = clinicalRules[idPat];
    if (!bloque || !Array.isArray(bloque.reglas)) {
        return [];
    }
    return bloque.reglas.map((r) => Object.assign({}, r, { id_patologia: idPat }));
}

function _evaluarFeatureIngrediente(regla, ingredientesProducto, foodData) {
    const arr = regla.feature_ingrediente;
    if (!Array.isArray(arr) || arr.length === 0) return false;

    const tokens = arr
        .map((t) => normalize(String(t)))
        .filter((t) => t.length > 0);

    // Buscar en el array de ingredientes parseados.
    // Coincidencia BIDIRECCIONAL: la regla activa si el ingrediente contiene
    // el token OR el token contiene el ingrediente.
    // Ej: regla="espinaca", producto="espinaca fresca" → ing.includes(tok) ✓
    // Ej: regla="espinaca baby", producto="espinaca"   → tok.includes(ing) ✓
    const matchInArray = ingredientesProducto.some((ing) =>
        tokens.some((tok) => {
            if (tok.length <= 3) {
                const regex = new RegExp("(^|[^a-z])" + tok + "($|[^a-z])", "i");
                return regex.test(ing);
            }
            return ing.includes(tok) || tok.includes(ing);
        })
    );

    if (matchInArray) return true;

    // Fallback: buscar en el texto crudo de ingredientes como blob
    if (foodData && foodData.ingredientsText) {
        const blob = normalize(foodData.ingredientsText);
        return tokens.some((tok) => {
            if (tok.length <= 3) {
                const regex = new RegExp("(^|[^a-z])" + tok + "($|[^a-z])", "i");
                return regex.test(blob);
            }
            return blob.includes(tok);
        });
    }

    return false;
}

function _nutrienteAltoSegunSello(featureSello, nf) {
    if (!nf) return false;
    const fs = String(featureSello || '').toLowerCase();
    if (fs === 'sugars' && nf.sugars_100g != null) {
        return Number(nf.sugars_100g) >= 10;
    }
    if (fs === 'fat' && nf.fat_100g != null) {
        return Number(nf.fat_100g) >= 17.5;
    }
    if (fs === 'saturated-fat') {
        const sat =
            nf['saturated-fat_100g'] != null ? nf['saturated-fat_100g'] : nf.saturated_fat_100g;
        if (sat != null) return Number(sat) >= 5;
    }
    if (fs === 'salt') {
        if (nf.salt_100g != null) return Number(nf.salt_100g) >= 1.5;
        if (nf.sodium_100g != null) return Number(nf.sodium_100g) >= 0.6;
    }
    return false;
}

function _evaluarFeatureSello(regla, sellosProducto, foodData) {
    const limite = regla.limite || 'high';
    const nf = (foodData && foodData.nutritionalFacts) || {};
    if (limite === 'high' && _nutrienteAltoSegunSello(regla.feature_sello, nf)) {
        return true;
    }
    const blob = normalize(
        (sellosProducto || []).join(' ') + ' ' + String((foodData && foodData.ingredientsText) || '')
    );
    const fs = String(regla.feature_sello || '').toLowerCase();
    if (fs === 'sugars' && /(alto|high|rich|exceso).{0,48}(azucar|azúcar|sugar)/i.test(blob)) {
        return true;
    }
    if (fs === 'salt' && /(alto|high).{0,48}(sal|salt|sodium|sodio)/i.test(blob)) {
        return true;
    }
    if (fs === 'fat' && /(alto|high).{0,48}(grasa|fat)/i.test(blob)) {
        return true;
    }
    if (fs === 'saturated-fat' && /(alto|high).{0,48}(saturad|saturated)/i.test(blob)) {
        return true;
    }
    return false;
}

function _reglaSeActiva(regla, ingredientesProducto, sellosProducto, foodData) {
    if (regla.feature_ingrediente) {
        return _evaluarFeatureIngrediente(regla, ingredientesProducto, foodData);
    }
    if (regla.feature_sello) {
        return _evaluarFeatureSello(regla, sellosProducto, foodData);
    }
    // Soporte para reglas de alérgenos (feature_alergeno)
    if (regla.feature_alergeno) {
        const allergensBlob = normalize(
            String((foodData && foodData.allergens) || '') + ' ' +
            String((foodData && foodData.ingredientsText) || '')
        );
        const tokens = regla.feature_alergeno
            .map((t) => normalize(String(t)))
            .filter((t) => t.length > 0);
        const matchInAllergens = tokens.some((tok) => allergensBlob.includes(tok));
        const matchInIngredients = ingredientesProducto.some((ing) =>
            tokens.some((tok) => ing.includes(tok))
        );
        return matchInAllergens || matchInIngredients;
    }
    return false;
}

function evaluarProducto(userProfile, foodData) {
    let global_risk = 'low';
    const finalDetails = [];

    const patologiasUsuario = [].concat(userProfile.enfermedades || []);
    if (patologiasUsuario.length === 0 && userProfile.pathology) {
        patologiasUsuario.push(userProfile.pathology);
    }

    // Construir lista de ingredientes desde AMBAS fuentes
    let rawIngredients = (foodData.ingredients || []).map((i) => normalize(i));
    
    // Si el array está vacío pero hay texto crudo, parsearlo
    if (rawIngredients.length === 0 && foodData.ingredientsText) {
        rawIngredients = foodData.ingredientsText
            .split(/[,;()\n]/)
            .map((s) => normalize(s.trim()))
            .filter((s) => s.length > 1);
    }
    
    // Agregar el nombre del producto como fuente de matching
    if (foodData.productName) {
        const normalizedName = normalize(foodData.productName);
        if (normalizedName.length > 1 && !rawIngredients.includes(normalizedName)) {
            rawIngredients.push(normalizedName);
        }
    }
    
    const ingredientesProducto = rawIngredients;
    const sellosProducto = (foodData.sellos || []).map((s) => normalize(s));

    patologiasUsuario.forEach((idPat) => {
        const rules = _reglasParaPatologia(idPat);
        const matchingRules = rules.filter((regla) => 
            _reglaSeActiva(regla, ingredientesProducto, sellosProducto, foodData)
        );

        if (matchingRules.length > 0) {
            let pathRisk = 'low';
            const motivos = [];
            
            const defaultMotivo = "Consulte a su médico sobre el consumo de este ingrediente en su condición.";
            matchingRules.forEach(regla => {
                const severidad = (regla.severidad || '').toLowerCase();
                if (severidad === 'critico') {
                    pathRisk = 'high';
                } else if (severidad === 'moderado' && pathRisk !== 'high') {
                    pathRisk = 'medium';
                }
                const m = regla.motivo || defaultMotivo;
                if (!motivos.includes(m)) {
                    motivos.push(m);
                }
            });

            // Actualizar global_risk
            if (pathRisk === 'high') {
                global_risk = 'high';
            } else if (pathRisk === 'medium' && global_risk !== 'high') {
                global_risk = 'medium';
            }

            const patInfo = clinicalRules[idPat] || {};
            finalDetails.push({
                patologia_id: idPat,
                patologia_nombre: patInfo.nombre || idPat,
                risk: pathRisk,
                motivo: motivos.join(". "), // Agregamos singular para compatibilidad frontend
                motivos: motivos
            });
        }
    });

    // ═══════════════════════════════════════════════════════════
    // ESCUDO FARMACOLÓGICO: Evaluar medicamentos del usuario
    // ═══════════════════════════════════════════════════════════
    var medicamentosUsuario = [].concat(userProfile.medicamentos || []);
    var farmRules = clinicalRules.interacciones_farmacologicas || {};

    medicamentosUsuario.forEach(function(medId) {
        var medNorm = normalize(String(medId));
        var medBloque = farmRules[medNorm];
        if (!medBloque || !Array.isArray(medBloque.reglas)) return;

        var matchingFarmRules = medBloque.reglas.filter(function(regla) {
            return _reglaSeActiva(regla, ingredientesProducto, sellosProducto, foodData);
        });

        if (matchingFarmRules.length > 0) {
            var farmRisk = 'low';
            var farmMotivos = [];
            var farmVentanaHoras = null;
            var farmVentanaTexto = null;

            matchingFarmRules.forEach(function(regla) {
                var sev = (regla.severidad || '').toLowerCase();
                if (sev === 'critico') farmRisk = 'high';
                else if (sev === 'moderado' && farmRisk !== 'high') farmRisk = 'medium';
                var m = regla.motivo || 'Interacción fármaco-nutriente detectada. Consulte a su médico.';
                if (!farmMotivos.includes(m)) farmMotivos.push(m);
                // Tomar la ventana temporal de la primera regla que la defina
                if (regla.ventana_horas != null && farmVentanaHoras === null) {
                    farmVentanaHoras = regla.ventana_horas;
                    farmVentanaTexto = regla.ventana_texto || null;
                }
            });

            if (farmRisk === 'high') global_risk = 'high';
            else if (farmRisk === 'medium' && global_risk !== 'high') global_risk = 'medium';

            finalDetails.push({
                patologia_id: 'farm_' + medNorm,
                patologia_nombre: medBloque.nombre || medId,
                risk: farmRisk,
                tipo: 'interaccion_farmacologica',
                farmaco: medNorm,
                motivo: farmMotivos.join(' | '),
                motivos: farmMotivos,
                ventana_horas: farmVentanaHoras,
                ventana_texto: farmVentanaTexto
            });
        }
    });

    return {
        global_risk,
        details: finalDetails,
        fuente: 'motor_nura_v2',
        timestamp: Date.now()
    };
}
// =================================================================

// ── System Prompt Maestro (espejo del frontend, fuente de verdad) ──
const SYSTEM_PROMPT = `
Eres NuraAI, un asistente de análisis nutricional especializado en pacientes
con enfermedades crónicas. Tu función es ORIENTAR, nunca diagnosticar ni
prescribir. Eres preciso, empático y extremadamente cauteloso.

§1 — ROL Y LÍMITES
- Eres un asistente de apoyo informativo, NO un médico ni nutricionista.
- Tu análisis complementa, no reemplaza, la consulta con el equipo de salud.
- Nunca emitas un diagnóstico. Nunca prescribas dosis ni medicamentos.

§2 — MATRIZ DE CONFLICTOS (evalúa en este orden)
Clasifica cada ingrediente detectado contra el perfil del paciente usando:
  ALTO   — Interacción documentada con evidencia Nivel A/B.
  MEDIO  — Interacción con evidencia Nivel C o dependiente de cantidad.
  BAJO   — Ingrediente a vigilar sin interacción directa documentada.
  NINGUNO — Sin conflicto identificado.

§3 — FORMATO DE SALIDA (OBLIGATORIO — JSON puro, sin markdown)
{
  "overall_risk": "ALTO" | "MEDIO" | "BAJO" | "NINGUNO",
  "conflicts_detected": [
    {
      "ingredient": "nombre",
      "risk_level": "ALTO" | "MEDIO" | "BAJO",
      "reason": "explicación clínica breve (máx. 120 caracteres)",
      "evidence_source": "fuente (FDA, OMS, KDIGO, etc.)"
    }
  ],
  "recommendation": "texto para el paciente (máx. 250 caracteres, lenguaje claro)",
  "consult_doctor": true | false
}

§4 — REGLAS INQUEBRANTABLES
R1. Nunca emitas un diagnóstico médico.
R2. Ante cualquier duda → consult_doctor: true.
R3. Nunca afirmes que un producto es "completamente seguro" para una condición crónica.
R4. Si datos insuficientes → overall_risk: "MEDIO" y consult_doctor: true.
R5. Nunca incluyas texto fuera del JSON en tu respuesta.
`.trim();

const AI_KNOWLEDGE_PROMPT = `
Eres un Experto Culinario y Bioquimico Clinico especializado en gastronomia latinoamericana.
Mision: Estimar la composicion REAL de cualquier alimento, plato o preparacion.

REGLAS CRITICAS:
1. COMPUESTOS BIOQUIMICOS OCULTOS: Si el alimento es naturalmente rico en alguno de estos,
   DEBES incluirlo en ingredients:
   - OXALATOS: espinaca, acelga, ruibarbo, remolacha, nueces, mani, cacao, te negro, te verde, kiwi, camote
   - PURINAS: visceras, sardinas, anchoas, mariscos, carnes rojas, cerveza, levadura
   - POTASIO: platano, aguacate/palta, tomate, papa, naranja, espinaca, legumbres
   - FOSFORO: lacteos, quesos, embutidos, gaseosas cola, chocolate, nueces
   - VITAMINA K: espinaca, kale, brocoli, lechuga, repollo, perejil, te verde
   - FURANOCUMARINAS: pomelo, toronja, grapefruit (SIEMPRE incluir "furanocumarina")
   - TIRAMINA: quesos curados, embutidos fermentados, vino tinto, soja fermentada, kimchi
   Ejemplo: "pomelo" -> ingredients DEBE incluir "pomelo" Y "furanocumarina"
   Ejemplo: "queso roquefort" -> ingredients DEBE incluir "queso curado" Y "tiramina"

2. SODIO - NO INVENTAR: Los alimentos naturales sin procesar tienen sodio MUY bajo.
   - Te, cafe, frutas, verduras, frutos secos SIN SAL, carnes frescas: sodium_100g < 0.05
   - SOLO reporta sodio alto (>0.3) en: productos procesados, embutidos, quesos, pan, salsas, conservas
   - NUNCA pongas sodium_100g > 0.1 para te, cafe, espinacas, nueces sin sal, frutas o verduras frescas

3. FRITURAS: Si es fritura (papa frita, pollo frito, sopaipilla), incluir "fritura", "frito", "aceite".
4. Para platos tipicos, deduce los ingredientes REALES de la receta.
5. Para bebidas alcoholicas, SIEMPRE incluye "alcohol".
6. Si es fruta o verdura natural, NO inventes aditivos ni sodio artificial.

Devuelve UNICAMENTE un JSON puro (sin markdown) con este formato:
{
  "ingredients": ["ingrediente_base", "oxalato", "furanocumarina", "tiramina", etc.],
  "nutritionalFacts": {
    "sodium_100g": 0.0,
    "sugars_100g": 0.0,
    "fat_100g": 0.0,
    "saturated-fat_100g": 0.0
  }
}
`.trim();

// =================================================================
// 🧠 CLASIFICADOR HEURÍSTICO DE ALIMENTOS (Smart Classifier v2)
// Determina si una búsqueda es comida genérica/casera (→ IA)
// o un producto empaquetado/marca (→ Open Food Facts)
// =================================================================

const RAICES_GENERICAS = {
    masas: ['pan', 'empanada', 'arepa', 'tortilla', 'churrasca', 'sopaipilla',
            'hallulla', 'marraqueta', 'dobladita', 'calzone', 'pizza', 'pasta',
            'tallarines', 'fideos', 'ravioles', 'lasagna', 'gnocchi',
            'crepa', 'panqueque', 'waffle', 'galleta casera', 'bizcocho', 'queque',
            'torta', 'kuchen', 'alfajor', 'churro', 'dona', 'croissant',
            'baguette', 'ciabatta', 'focaccia', 'pita', 'naan', 'bagel'],
    proteinas: ['pollo', 'carne', 'cerdo', 'res', 'vacuno', 'cordero',
                'salmon', 'atun', 'pescado', 'mariscos', 'camaron', 'pulpo',
                'calamar', 'chorizo', 'longaniza', 'salchicha', 'jamon',
                'tocino', 'panceta', 'costilla', 'lomo', 'filete', 'chuleta',
                'milanesa', 'nugget', 'hamburguesa', 'albondiga', 'ceviche',
                'huevo', 'tofu', 'lentejas', 'porotos', 'frijoles', 'garbanzos'],
    latam_street: ['completo', 'italiano', 'chacarero', 'barros luco', 'barros jarpa',
                   'lomito', 'churrasco', 'anticucho', 'choripan', 'taco', 'burrito',
                   'quesadilla', 'enchilada', 'tamales', 'pupusa', 'cachapa',
                   'bandeja paisa', 'ajiaco', 'cazuela', 'pastel de choclo',
                   'humita', 'curanto', 'asado', 'parrillada', 'charquican',
                   'caldillo', 'carbonada', 'porotos granados', 'plateada',
                   'pernil', 'lechon', 'chicharron', 'mote con huesillo',
                   'picarones', 'calzones rotos', 'empanada de pino'],
    bebidas: ['jugo', 'batido', 'smoothie', 'licuado', 'te', 'cafe', 'mate',
              'chicha', 'cerveza', 'vino', 'pisco', 'ron', 'vodka', 'whisky',
              'aguardiente', 'terremoto', 'piscola', 'michelada', 'mojito',
              'sangria', 'horchata', 'agua de panela', 'limonada', 'naranjada',
              'chocolate caliente', 'cola de mono', 'leche'],
    basicos: ['arroz', 'fideo', 'pure', 'ensalada', 'sopa', 'crema', 'caldo',
              'guiso', 'estofado', 'salsa', 'mayonesa', 'mostaza', 'ketchup',
              'mantequilla', 'margarina', 'aceite', 'vinagre', 'mermelada',
              'manjar', 'dulce de leche', 'miel', 'azucar', 'sal', 'pimienta',
              'queso', 'yogurt', 'helado', 'flan', 'gelatina', 'fruta',
              'verdura', 'legumbre', 'avena', 'granola']
};

// FIX 1: Keywords que indican producto empaquetado → siempre Open Food Facts
var KEYWORDS_EMPAQUETADO = [
    'sin gluten', 'sin azucar', 'sin lactosa', 'sin grasa', 'sin sal',
    'light', 'diet', 'zero', 'cero', 'integral', 'descremada', 'descremado',
    'deslactosada', 'deslactosado', 'fortificado', 'fortificada',
    'enriquecido', 'enriquecida', 'organico', 'organica', 'vegano', 'vegana',
    'sin tacc', 'libre de gluten', 'bajo en sodio', 'bajo en grasa',
    'alto en fibra', 'alto en proteina', 'sugar free', 'gluten free',
    'fat free', 'low fat', 'low sodium'
];

// FIX 3: Alimentos que suenan genéricos pero son productos empaquetados
var GENERICOS_EMPAQUETADOS = [
    'barrita', 'barra de cereal', 'barra proteica', 'barra energetica',
    'bebida energetica', 'bebida isotonica', 'suplemento', 'proteina en polvo',
    'batido proteico', 'whey', 'creatina', 'bcaa', 'pre entreno',
    'leche en polvo', 'formula infantil', 'cereal de caja',
    'galleta', 'galletitas', 'cereal', 'muesli'
];

// Marcas conocidas → siempre Open Food Facts
var MARCAS_CONOCIDAS = [
    'nestle', 'soprole', 'colun', 'coca cola', 'coca-cola', 'pepsi', 'fanta',
    'sprite', 'schweppes', 'gatorade', 'powerade', 'redbull', 'red bull',
    'monster', 'kraft', 'unilever', 'danone', 'lider', 'jumbo', 'great value',
    'mccain', 'bimbo', 'carozzi', 'lucchetti', 'costa', 'ideal', 'watts',
    'andina', 'cachantun', 'benedictino', 'vital', 'super8', 'sahne nuss',
    'arcor', 'bonafont', 'kellogs', 'kelloggs', 'quaker', 'mckay', 'mc kay',
    'trident', 'oreo', 'nutella', 'ferrero', 'mars', 'snickers', 'twix',
    'kitkat', 'kit kat', 'lays', 'pringles', 'doritos', 'cheetos',
    'maggi', 'knorr', 'hellmanns', 'lipton', 'nescafe', 'starbucks',
    'mcdonalds', 'burger king', 'subway', 'dominos', 'pizza hut',
    'toblerone', 'milka', 'lindt', 'hershey', 'cadbury'
];

// Cache pre-computado (se construye una sola vez al iniciar la Cloud Function)
var _allRootsNormalized = [];
(function _buildCaches() {
    var cats = Object.keys(RAICES_GENERICAS);
    for (var c = 0; c < cats.length; c++) {
        var arr = RAICES_GENERICAS[cats[c]];
        for (var i = 0; i < arr.length; i++) {
            _allRootsNormalized.push(normalize(arr[i]));
        }
    }
})();

var _brandsNormalized = MARCAS_CONOCIDAS.map(function(b) { return normalize(b); });
var _kwEmpaquetadoNorm = KEYWORDS_EMPAQUETADO.map(function(k) { return normalize(k); });
var _genEmpaquetadoNorm = GENERICOS_EMPAQUETADOS.map(function(g) { return normalize(g); });

/**
 * Clasificador heurístico v2: ¿comida casera/genérica o producto empaquetado?
 * @param {string} texto - Texto de búsqueda del usuario
 * @returns {boolean} true = comida genérica (→ IA), false = producto (→ OFF)
 */
function esComidaGenerica(texto) {
    if (!texto) return false;
    var norm = normalize(texto);
    var palabras = norm.split(/\s+/).filter(function(w) { return w.length > 0; });

    // FILTRO 1: Si contiene una marca → NO genérica, va a Open Food Facts
    for (var b = 0; b < _brandsNormalized.length; b++) {
        if (norm.indexOf(_brandsNormalized[b]) !== -1) return false;
    }

    // FIX 1: Si contiene keywords de producto empaquetado → OFF
    // ("sin gluten", "light", "diet", "zero", "integral", "descremada", etc.)
    for (var k = 0; k < _kwEmpaquetadoNorm.length; k++) {
        if (norm.indexOf(_kwEmpaquetadoNorm[k]) !== -1) return false;
    }

    // FIX 3: Si matchea con genéricos que son productos empaquetados → OFF
    // ("barrita proteica", "bebida energetica", "cereal", "galleta", etc.)
    for (var g = 0; g < _genEmpaquetadoNorm.length; g++) {
        if (norm.indexOf(_genEmpaquetadoNorm[g]) !== -1) return false;
    }

    // FILTRO 2: Si tiene más de 4 palabras → probablemente producto empaquetado
    if (palabras.length > 4) return false;

    // FILTRO 3: Buscar coincidencia con raíces semánticas de comida real
    for (var r = 0; r < _allRootsNormalized.length; r++) {
        var root = _allRootsNormalized[r];
        // Coincidencia exacta
        if (norm === root) return true;
        // Raíz al inicio ("pan amasado")
        if (norm.indexOf(root + ' ') === 0) return true;
        // Raíz al final ("arroz con pollo")
        if (norm.indexOf(' ' + root) === norm.length - root.length - 1 && norm.length > root.length) return true;
        // Raíz como palabra completa en el medio
        if (norm.indexOf(' ' + root + ' ') !== -1) return true;
        // Raíces multi-palabra ("pastel de choclo", "mote con huesillo")
        if (root.indexOf(' ') !== -1 && norm.indexOf(root) !== -1) return true;
    }

    return false;
}

async function _getAiFallbackFoodData(productName) {
    try {
        // FIX 2: Intentar leer del caché de IA antes de llamar a la API
        var db = admin.firestore();
        
        var cacheKey = 'ai_food_' + normalize(productName).replace(/\s+/g, '_').substring(0, 80);
        var cacheDoc = await db.collection('nura_ai_cache').doc(cacheKey).get();
        
        if (cacheDoc.exists) {
            console.log('[AI Fallback] Cache HIT: ' + productName);
            return cacheDoc.data();
        }
        
        console.log('[AI Fallback] Cache MISS. Consultando IA para: ' + productName);
        var client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
        var response = await client.messages.create({
            model: MODEL,
            max_tokens: 512,
            system: AI_KNOWLEDGE_PROMPT,
            messages: [{ role: 'user', content: 'Producto: ' + productName }]
        });

        var rawText = response.content[0].text;
        var jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No se encontró JSON en respuesta de IA');
        
        var data = JSON.parse(jsonMatch[0]);
        var result = {
            barcode: 'AI_FALLBACK',
            productName: productName,
            imageUrl: '',
            ingredientsText: (data.ingredients || []).join(', '),
            ingredients: data.ingredients || [],
            sellos: [],
            nutritionalFacts: data.nutritionalFacts || {}
        };
        
        // FIX 2: Guardar en caché para la próxima vez (TTL implícito por versionado)
        await db.collection('nura_ai_cache').doc(cacheKey).set(result);
        console.log('[AI Fallback] Guardado en caché: ' + cacheKey);
        
        return result;
    } catch (err) {
        console.error('[_getAiFallbackFoodData] Error:', err.message);
        return null;
    }
}

// ── Validación mínima del body entrante ────────────────────────────
function _validateBody(body) {
    if (!body || typeof body !== 'object') return 'Body vacío o no es JSON.';
    if (!body.userProfile || typeof body.userProfile !== 'object') return 'Falta userProfile.';
    if (!body.foodData    || typeof body.foodData    !== 'object') return 'Falta foodData.';
    return null;
}

// ── Cabeceras CORS (browser + Live Server en :5500, producción, etc.) ──
function _setCors(res) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '86400');
}

// ── Cloud Function ─────────────────────────────────────────────────
exports.analyzeFoodProxy = onRequest(
    { cors: true, secrets: [ANTHROPIC_API_KEY], region: 'us-central1' },
    async (req, res) => {

        _setCors(res);

        // Preflight CORS
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Método no permitido.' });
            return;
        }

        // Validar payload
        const validationError = _validateBody(req.body);
        if (validationError) {
            res.status(400).json({ error: validationError });
            return;
        }

        const { userProfile, foodData } = req.body;

        // Construir mensaje de usuario para Claude
        const userMessage = JSON.stringify({
        patient_profile: userProfile || {},
        food_data: foodData || {}
    });

        try {
            const client = new Anthropic({
                apiKey: ANTHROPIC_API_KEY.value()
            });

            const message = await client.messages.create({
                model:      MODEL,
                max_tokens: MAX_TOKENS,
                system:     SYSTEM_PROMPT,
                messages:   [{ role: 'user', content: userMessage }]
            });

            // Retornar la respuesta en el mismo formato que espera el frontend
            res.status(200).json(message);

        } catch (err) {
            console.error('[analyzeFoodProxy] Error Anthropic:', err.message);
            res.status(502).json({ error: 'Error al contactar el modelo de IA.' });
        }
    }
);
// actualizacion saldo
// ---------------------------------------------------------
// 🚀 FUNCIÓN SECRETA DE SUBIDA BATCH (El Repartidor)
// ---------------------------------------------------------


// Si admin no está inicializado arriba en tu index.js, descomenta estas dos líneas:
// if (!admin.apps.length) { admin.initializeApp(); }
// const db = admin.firestore();

exports.uploadMasterDB = onRequest(async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const db = admin.firestore();

        // 1. Leer el archivo local
        const dbPath = path.join(__dirname, 'nura_database.json');
        if (!fs.existsSync(dbPath)) {
            return res.status(404).send("❌ Archivo nura_database.json no encontrado.");
        }

        const rawData = fs.readFileSync(dbPath, 'utf-8');
        const nuraDB = JSON.parse(rawData);

        // 2. Preparar la subida a Firestore
        let batch = db.batch(); // <-- ¡Aquí está el let batch corregido!
        let count = 0;
        let total = 0;

        // 3. Subir los productos en lotes seguros (de 400 en 400)
        for (const [barcode, data] of Object.entries(nuraDB)) {
            const docRef = db.collection('nura_precalc').doc(barcode);
            batch.set(docRef, data);
            count++;
            total++;
            
            // Cuando llegamos a 400, enviamos y creamos un lote nuevo
            if (count === 400) {
                await batch.commit();
                batch = db.batch(); // Reiniciamos el lote
                count = 0; // Reiniciamos el contador del lote
            }
        }

        // Subir los que hayan sobrado al final
        if (count > 0) {
            await batch.commit();
        }

        res.status(200).send(`<h2>✅ ¡Subida Exitosa!</h2><p>Se inyectaron <b>${total}</b> productos a Firestore.</p>`);

    } catch (error) {
        console.error("Error en la subida:", error);
        res.status(500).send("❌ Error crítico subiendo datos: " + error.message);
    }
});
// ---------------------------------------------------------
// ---------------------------------------------------------
// 🧠 EL ESCÁNER MAESTRO (Foso Defensivo + IA Fallback + AutoAprendizaje)
// ---------------------------------------------------------
exports.scanBarcode = onRequest(
    { cors: true, region: 'us-central1' },
    async (req, res) => {
        _setCors(res);

        if (req.method === 'OPTIONS') {
            return res.status(204).send('');
        }

        // Capturamos el código de barras (ya sea por URL o por JSON del celular)
        const barcode = req.query.barcode || (req.body && req.body.barcode);

        if (!barcode) {
            return res.status(400).json({ error: "Falta el código de barras. Envía ?barcode=123456" });
        }

    try {
        const db = admin.firestore();

        console.log(`🔎 Escaneando código: ${barcode}`);

        // ==========================================
        // FASE 1: BÚSQUEDA RÁPIDA (Costo $0)
        // ==========================================
        const docRef = db.collection('nura_precalc').doc(barcode);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            console.log(`✅ [HIT] ¡Producto encontrado en bóveda!: ${barcode}`);
            return res.status(200).json({
                status: "success",
                fuente: "nura_db", // Le decimos al frontend que fue instantáneo
                datos: docSnap.data()
            });
        }

        // ==========================================
        // FASE 2: EVALUACIÓN MOTOR NURA V2 (Costo $0)
        // ==========================================
        console.log(`🧠 [MISS] No en bóveda. Evaluando con Motor Nura V2 para: ${barcode}`);

        const userProfile = req.body.userProfile || {};
        const foodData = req.body.foodData || {};

        // Evaluamos usando el motor determinístico local
        const motorResult = evaluarProducto(userProfile, foodData);
        
        // Asignamos el resultado a la variable que las Fases 3 y 4 ya esperan
        const iaResultJSON = motorResult;

        // ==========================================
        // FASE 3: AUTO-APRENDIZAJE (Guardar para el futuro)
        // ==========================================
        console.log(`💾 Guardando análisis de la IA en la bóveda para la próxima vez...`);
        // Guardamos el JSON de la IA en Firestore usando el código de barras como ID
        await docRef.set(iaResultJSON);

        // ==========================================
        // FASE 4: RESPONDER AL USUARIO
        // ==========================================
        return res.status(200).json({
            status: "success",
            fuente: "anthropic_ai_realtime", // Le decimos al frontend que la IA hizo el trabajo
            datos: iaResultJSON
        });

    } catch (error) {
        console.error("❌ Error Crítico en Escáner Maestro:", error.message);
        return res.status(500).json({ error: "Error procesando el alimento." });
    }
    }
);

// ── Open Food Facts (servidor → sin CORS en el navegador) ─────────────

/**
 * Construye el mismo objeto foodData que el frontend usa con la API producto OFF.
 */
function _buildFoodDataFromOffApi(data, barcode) {
    if (!data || data.status !== 1) return null;
    const p = data.product;
    const n = p.nutriments || {};
    const rawText = p.ingredients_text_es || p.ingredients_text || '';
    const sellos = [];
    if (p.nutrition_grade_fr) sellos.push(String(p.nutrition_grade_fr));
    if (p.labels_tags && Array.isArray(p.labels_tags)) {
        p.labels_tags.forEach((tag) => {
            if (tag) sellos.push(String(tag).replace(/^..:/, ''));
        });
    }
    return {
        barcode: String(barcode),
        productName: p.product_name_es || p.product_name || 'Producto sin nombre',
        imageUrl: p.image_front_url || p.image_url || '',
        ingredientsText: rawText,
        ingredients: rawText.split(/[,;()\n]/).map((s) => s.trim()).filter((s) => s.length > 1),
        sellos,
        nutritionalFacts: {
            sodium_100g: n.sodium_100g ?? null,
            sugars_100g: n.sugars_100g ?? null,
            fat_100g: n.fat_100g ?? null,
            carbohydrates_100g: n.carbohydrates_100g ?? null
        }
    };
}

async function _offFetchJson(url) {
    const r = await fetch(url);
    if (!r.ok) {
        throw new Error(`Open Food Facts HTTP ${r.status}`);
    }
    return r.json();
}

/**
 * BFF: búsqueda por texto en OFF + Motor V2 (mismo contrato que scanBarcode: datos).
 * Body: { textQuery: string, userProfile: object }
 */
exports.searchFoodText = onRequest(
    { cors: true, secrets: [ANTHROPIC_API_KEY], region: 'us-central1' },
    async (req, res) => {
        _setCors(res);

        if (req.method === 'OPTIONS') {
            return res.status(204).send('');
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método no permitido.' });
        }

        const body = req.body || {};
        const textQuery = String(body.textQuery || body.query || '').trim();
        const userProfile = body.userProfile && typeof body.userProfile === 'object'
            ? body.userProfile
            : {};

        if (!textQuery) {
            return res.status(400).json({
                status: 'error',
                error: 'Falta textQuery (texto de búsqueda).'
            });
        }

        try {
            // ── SMART CLASSIFIER: ¿Comida casera o producto empaquetado? ──
            if (esComidaGenerica(textQuery)) {
                console.log('[searchFoodText] Comida generica detectada: "' + textQuery + '" -> Directo a IA');
                var fallbackGeneric = await _getAiFallbackFoodData(textQuery);
                if (fallbackGeneric) {
                    var motorGeneric = evaluarProducto(userProfile, fallbackGeneric);
                    return res.status(200).json({
                        status: 'success',
                        fuente: 'ai_culinary_expert',
                        datos: motorGeneric,
                        foodData: fallbackGeneric,
                        disclaimer: 'Analisis basado en receta tradicional estimada por IA culinaria clinica.'
                    });
                }
                // Si la IA falla, intentamos OFF como respaldo
                console.log('[searchFoodText] IA fallo para generico. Intentando OFF como respaldo.');
            }

            // ── OPEN FOOD FACTS: Productos empaquetados ──
            const searchUrl =
                'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' +
                encodeURIComponent(textQuery) +
                '&search_simple=1&action=process&json=true&page_size=12';

            const searchData = await _offFetchJson(searchUrl);
            const products = searchData.products || [];

            let foodData = null;
            for (const pr of products) {
                const code = pr && pr.code;
                if (!code) continue;
                const prodUrl =
                    'https://world.openfoodfacts.org/api/v0/product/' +
                    encodeURIComponent(code) +
                    '.json';
                const pdata = await _offFetchJson(prodUrl);
                const fd = _buildFoodDataFromOffApi(pdata, code);
                if (fd) {
                    foodData = fd;
                    break;
                }
            }

            if (!foodData) {
                // Si no hay resultados en OFF, intentamos el fallback de IA directamente
                console.log(`[searchFoodText] No en OFF. Iniciando fallback de IA para: ${textQuery}`);
                const fallbackData = await _getAiFallbackFoodData(textQuery);
                if (fallbackData) {
                    const motorResult = evaluarProducto(userProfile, fallbackData);
                    return res.status(200).json({
                        status: 'success',
                        fuente: 'ai_knowledge_fallback',
                        datos: motorResult,
                        foodData: fallbackData,
                        disclaimer: "Nota: Análisis basado en composición estándar del producto estimado por IA."
                    });
                }

                return res.status(200).json({
                    status: 'not_found',
                    error: 'No se encontró un producto coincidente en Open Food Facts ni en el conocimiento de IA.'
                });
            }

            const motorResult = evaluarProducto(userProfile, foodData);

            return res.status(200).json({
                status: 'success',
                fuente: 'openfoodfacts_search+motor_nura_v2',
                datos: motorResult,
                foodData
            });
        } catch (err) {
            console.error('[searchFoodText] Falló OFF, intentando fallback de IA:', err.message);
            
            const fallbackData = await _getAiFallbackFoodData(textQuery);
            if (fallbackData) {
                const motorResult = evaluarProducto(userProfile, fallbackData);
                return res.status(200).json({
                    status: 'success',
                    fuente: 'ai_knowledge_fallback',
                    datos: motorResult,
                    foodData: fallbackData,
                    disclaimer: "Nota: Análisis basado en composición estándar del producto estimado por IA debido a indisponibilidad de la base de datos global."
                });
            }

            return res.status(200).send({
              success: false,
              errorType: "EXTERNAL_API_DOWN",
              message: "No se pudo obtener información del producto. La base de datos global está en mantenimiento y el conocimiento de respaldo de IA no pudo activarse."
            });
        }
    }
);

// =================================================================
// 💡 MOTOR DE SUSTITUCIÓN INTELIGENTE (suggestAlternatives)
// Recibe un alimento bloqueado + motivos clínicos y devuelve
// 3 alternativas seguras con caché en Firestore.
// =================================================================
exports.suggestAlternatives = onRequest(
    { cors: true, secrets: [ANTHROPIC_API_KEY], region: 'us-central1' },
    async (req, res) => {
        _setCors(res);

        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

        const body = req.body || {};
        const comidaBloqueada = String(body.comidaBloqueada || '').trim();
        const motivosBloqueo  = Array.isArray(body.motivosBloqueo) ? body.motivosBloqueo : [];
        const userProfile     = (body.userProfile && typeof body.userProfile === 'object')
            ? body.userProfile
            : {};

        if (!comidaBloqueada) {
            return res.status(400).json({ error: 'Falta comidaBloqueada.' });
        }

        try {
            const db = admin.firestore();

            // Generar ID de caché con SHA-256: combina nombre + motivos ordenados.
            // Si los motivos cambian (sodio → vitamina K), el hash cambia y se ignora la caché vieja.
            const crypto = require('crypto');
            const motivosSorted = motivosBloqueo
                .map((m) => normalize(String(m)))
                .sort()
                .join('|');
            const hashInput  = normalize(comidaBloqueada) + '::' + motivosSorted;
            const digest     = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
            const cacheKey   = 'sub_' + digest;

            // ── Revisar caché ──────────────────────────────────────
            const cacheSnap = await db.collection('substitutionCache').doc(cacheKey).get();
            if (cacheSnap.exists) {
                console.log('[suggestAlternatives] Cache HIT: ' + cacheKey);
                return res.status(200).json({
                    status:       'success',
                    alternatives: cacheSnap.data().alternatives,
                    fuente:       'cache'
                });
            }

            // ── Llamada a IA ───────────────────────────────────────
            console.log('[suggestAlternatives] Cache MISS. Consultando IA para: ' + comidaBloqueada);
            const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

            const promptText =
                `El usuario no puede consumir "${comidaBloqueada}". ` +
                `El sistema médico lo bloqueó específicamente por estos motivos: ${JSON.stringify(motivosBloqueo)}. ` +
                `Perfil médico: ${JSON.stringify(userProfile)}. ` +
                `Devuelve un array JSON (sin markdown) con 3 alimentos alternativos 100% seguros ` +
                `que esquiven estos bloqueos, que cumplan una función culinaria similar, ` +
                `y fáciles de comprar en supermercados de Chile (Lider, Jumbo). ` +
                `Formato: [{ "nombre": "...", "razon_seguridad": "..." }]`;

            const response = await client.messages.create({
                model:      MODEL,
                max_tokens: 512,
                messages:   [{ role: 'user', content: promptText }]
            });

            const rawText   = response.content[0].text;
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) throw new Error('No se encontró JSON en respuesta de IA');

            const alternatives = JSON.parse(jsonMatch[0]);

            // ── Guardar en caché ───────────────────────────────────
            await db.collection('substitutionCache').doc(cacheKey).set({
                alternatives,
                comidaBloqueada,
                motivosBloqueo,
                timestamp: Date.now()
            });
            console.log('[suggestAlternatives] Guardado en caché: ' + cacheKey);

            return res.status(200).json({ status: 'success', alternatives, fuente: 'anthropic_ai' });

        } catch (err) {
            console.error('[suggestAlternatives] Error:', err.message);
            return res.status(500).json({ error: 'No se pudieron generar alternativas.' });
        }
    }
);

// =================================================================
// 🛡️ MODO CUIDADOR — Fase 2 (Zero-Knowledge)
//
// ARQUITECTURA DE SEGURIDAD:
//   El cuidador NUNCA recibe datos médicos del paciente.
//   enfermedades[] y medicamentos[] viven EXCLUSIVAMENTE en Firestore.
//   El dispositivo del cuidador solo recibe: semáforo + nombres de alternativas.
// =================================================================

// ── Helper: PIN alfanumérico de 6 chars (sin 0/O/1/I para legibilidad) ──
function _generatePin() {
    const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf   = require('crypto').randomBytes(6);
    let pin = '';
    for (let i = 0; i < 6; i++) pin += CHARS[buf[i] % CHARS.length];
    return pin;
}

// ── Helper: hash SHA-256 del PIN (nunca se guarda el PIN en texto claro) ──
function _hashPin(pin) {
    return require('crypto').createHash('sha256').update(pin.toUpperCase()).digest('hex');
}

// ── Helper: rate limiting por IP (máx 5 intentos/hora) ──────────────────
async function _checkRateLimit(db, ip) {
    const MAX   = 5;
    const WINDOW = 60 * 60 * 1000; // 1 hora
    const now   = Date.now();
    const docId = 'ip_' + ip.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 80);
    const ref   = db.collection('pin_attempts').doc(docId);

    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({ count: 1, windowStart: now, blockedUntil: 0 });
        return { blocked: false };
    }

    const d = snap.data();
    if (d.blockedUntil && now < d.blockedUntil) {
        return { blocked: true, retryAfter: d.blockedUntil };
    }
    if (now - d.windowStart > WINDOW) {
        // Nueva ventana
        await ref.set({ count: 1, windowStart: now, blockedUntil: 0 });
        return { blocked: false };
    }
    if (d.count >= MAX) {
        const blockedUntil = d.windowStart + WINDOW;
        await ref.update({ blockedUntil });
        return { blocked: true, retryAfter: blockedUntil };
    }
    await ref.update({ count: d.count + 1 });
    return { blocked: false };
}

// ── 1. generateCaregiverPin ──────────────────────────────────────────────
// Recibe el perfil del PACIENTE desde su dashboard (su propio dispositivo).
// Almacena enfermedades[] y medicamentos[] en Firestore bajo el hash del PIN.
// Devuelve solo { pin, expiresAt } — nunca datos médicos de vuelta.
// ─────────────────────────────────────────────────────────────────────────
exports.generateCaregiverPin = onRequest(
    { cors: true, region: 'us-central1' },
    async (req, res) => {
        _setCors(res);
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido.' });

        const body    = req.body || {};
        const profile = (body.profile && typeof body.profile === 'object') ? body.profile : null;
        if (!profile || !Array.isArray(profile.enfermedades)) {
            return res.status(400).json({ error: 'Falta perfil médico válido.' });
        }

        try {
            const db = admin.firestore();

            const pin       = _generatePin();
            const pinHash   = _hashPin(pin);
            const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas

            // Guardar sesión — solo el backend accede a estos datos médicos
            await db.collection('caregiver_sessions').doc(pinHash).set({
                enfermedades: profile.enfermedades || [],
                medicamentos: profile.medicamentos || [],
                expiresAt,
                createdAt: Date.now()
            });

            console.log('[generateCaregiverPin] Sesión creada. Expira: ' + new Date(expiresAt).toISOString());
            return res.status(200).json({ status: 'success', pin, expiresAt });

        } catch (err) {
            console.error('[generateCaregiverPin] Error:', err.message);
            return res.status(500).json({ error: 'No se pudo generar el PIN.' });
        }
    }
);

// ── 2. validateCaregiverPin ──────────────────────────────────────────────
// Solo devuelve { valid: true, expiresAt } o { valid: false, reason }.
// CERO datos médicos en la respuesta.
// ─────────────────────────────────────────────────────────────────────────
exports.validateCaregiverPin = onRequest(
    { cors: true, region: 'us-central1' },
    async (req, res) => {
        _setCors(res);
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido.' });

        const pin = String((req.body || {}).pin || '').trim().toUpperCase();
        if (!pin || pin.length !== 6) {
            return res.status(400).json({ valid: false, reason: 'invalid' });
        }

        try {
            const db = admin.firestore();

            const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
            const rl = await _checkRateLimit(db, ip);
            if (rl.blocked) {
                return res.status(429).json({ valid: false, reason: 'rate_limited', retryAfter: rl.retryAfter });
            }

            const snap = await db.collection('caregiver_sessions').doc(_hashPin(pin)).get();
            if (!snap.exists) {
                return res.status(200).json({ valid: false, reason: 'invalid' });
            }
            const session = snap.data();
            if (Date.now() > session.expiresAt) {
                return res.status(200).json({ valid: false, reason: 'expired' });
            }

            // Solo validez + expiración — NUNCA datos médicos al cliente
            return res.status(200).json({ valid: true, expiresAt: session.expiresAt });

        } catch (err) {
            console.error('[validateCaregiverPin] Error:', err.message);
            return res.status(500).json({ error: 'Error al validar el PIN.' });
        }
    }
);

// ── 3. caregiverScan ─────────────────────────────────────────────────────
// Input cuidador:  { pin, barcode? | query? }
// Backend interno: carga perfil médico desde Firestore por hash del PIN,
//                  evalúa con Motor Nura V2, genera alternativas.
// Output cuidador: { status, productName, alternativas: [{nombre}] }
//                  Sin patologías, sin medicamentos, sin motivos clínicos.
// ─────────────────────────────────────────────────────────────────────────
exports.caregiverScan = onRequest(
    { cors: true, secrets: [ANTHROPIC_API_KEY], region: 'us-central1' },
    async (req, res) => {
        _setCors(res);
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido.' });

        const body    = req.body || {};
        const pin     = String(body.pin    || '').trim().toUpperCase();
        const barcode = body.barcode ? String(body.barcode).trim() : null;
        const query   = body.query   ? String(body.query).trim()   : null;

        if (!pin || pin.length !== 6)  return res.status(400).json({ error: 'PIN requerido.' });
        if (!barcode && !query)         return res.status(400).json({ error: 'Se requiere barcode o query.' });

        try {
            const db = admin.firestore();

            // Rate limiting
            const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
            const rl = await _checkRateLimit(db, ip);
            if (rl.blocked) {
                return res.status(429).json({ error: 'Demasiados intentos. Intenta en 1 hora.' });
            }

            // Validar sesión y cargar perfil INTERNAMENTE — nunca viaja al cliente
            const pinHash     = _hashPin(pin);
            const sessionSnap = await db.collection('caregiver_sessions').doc(pinHash).get();
            if (!sessionSnap.exists) {
                return res.status(401).json({ error: 'PIN inválido.', reason: 'invalid' });
            }
            const session = sessionSnap.data();
            if (Date.now() > session.expiresAt) {
                return res.status(401).json({ error: 'PIN expirado.', reason: 'expired' });
            }

            // Perfil médico — SOLO uso interno del motor, nunca en la respuesta
            const internalProfile = {
                enfermedades: session.enfermedades || [],
                medicamentos: session.medicamentos || [],
                pathology:    (session.enfermedades || [])[0] || ''
            };

            // ── Obtener datos del alimento ─────────────────────────
            let foodData    = null;
            let motorResult = null;
            let productName = barcode || query || '—';

            if (barcode) {
                const precalcSnap = await db.collection('nura_precalc').doc(barcode).get();
                if (precalcSnap.exists) {
                    motorResult = precalcSnap.data();
                } else {
                    try {
                        const offResp = await fetch(
                            'https://world.openfoodfacts.org/api/v0/product/' + encodeURIComponent(barcode) + '.json'
                        );
                        if (offResp.ok) {
                            const offData = await offResp.json();
                            foodData = _buildFoodDataFromOffApi(offData, barcode);
                        }
                    } catch (e) { /* continúa con fallback */ }
                    if (!foodData) foodData = await _getAiFallbackFoodData(barcode);
                    if (foodData) {
                        productName = foodData.productName || barcode;
                        motorResult = evaluarProducto(internalProfile, foodData);
                    }
                }
            } else {
                if (esComidaGenerica(query)) {
                    foodData = await _getAiFallbackFoodData(query);
                } else {
                    try {
                        const searchUrl =
                            'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' +
                            encodeURIComponent(query) + '&search_simple=1&action=process&json=true&page_size=5';
                        const searchData = await (await fetch(searchUrl)).json();
                        for (const pr of (searchData.products || [])) {
                            if (!pr || !pr.code) continue;
                            const pData = await _offFetchJson(
                                'https://world.openfoodfacts.org/api/v0/product/' + encodeURIComponent(pr.code) + '.json'
                            );
                            const fd = _buildFoodDataFromOffApi(pData, pr.code);
                            if (fd) { foodData = fd; break; }
                        }
                    } catch (e) { /* continúa con fallback */ }
                    if (!foodData) foodData = await _getAiFallbackFoodData(query);
                }
                if (foodData) {
                    productName = foodData.productName || query;
                    motorResult = evaluarProducto(internalProfile, foodData);
                }
            }

            if (!motorResult) {
                return res.status(200).json({
                    status: 'Desconocido',
                    productName,
                    alternativas: [],
                    message: 'No se encontró información del producto.'
                });
            }

            // ── Mapear riesgo a semáforo del cuidador ──────────────
            const RISK_MAP = { high: 'Peligro', medium: 'Precaución', low: 'Seguro' };
            const status   = RISK_MAP[motorResult.global_risk] || 'Desconocido';

            // ── Alternativas sanitizadas: SOLO nombre ──────────────
            let alternativasSanitizadas = [];
            if (motorResult.global_risk === 'high') {
                const crypto      = require('crypto');
                const motivos     = (motorResult.details || []).map((d) => d.motivo || '').filter(Boolean);
                const motivosSorted = motivos.map((m) => normalize(m)).sort().join('|');
                const digest      = crypto.createHash('sha256')
                    .update(normalize(productName) + '::' + motivosSorted).digest('hex').substring(0, 16);
                const cacheKey    = 'sub_' + digest;

                const altSnap = await db.collection('substitutionCache').doc(cacheKey).get();
                if (altSnap.exists) {
                    alternativasSanitizadas = (altSnap.data().alternatives || [])
                        .map((a) => ({ nombre: a.nombre })); // borrar razon_seguridad
                } else {
                    try {
                        const client     = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
                        const promptText = `El usuario no puede consumir "${productName}". Motivos: ${JSON.stringify(motivos)}. ` +
                            `Devuelve un array JSON con 3 alternativas seguras, fáciles de comprar en supermercados de Chile. ` +
                            `Formato: [{"nombre":"...","razon_seguridad":"..."}]`;
                        const aiResp = await client.messages.create({
                            model: MODEL, max_tokens: 512,
                            messages: [{ role: 'user', content: promptText }]
                        });
                        const match = aiResp.content[0].text.match(/\[[\s\S]*\]/);
                        if (match) {
                            const parsed = JSON.parse(match[0]);
                            await db.collection('substitutionCache').doc(cacheKey).set({
                                alternatives: parsed, comidaBloqueada: productName,
                                motivosBloqueo: motivos, timestamp: Date.now()
                            });
                            alternativasSanitizadas = parsed.map((a) => ({ nombre: a.nombre }));
                        }
                    } catch (e) {
                        console.error('[caregiverScan] alternatives error:', e.message);
                    }
                }
            }

            // ── Log de auditoría (interno, no llega al cuidador) ───
            await db.collection('caregiver_audit').add({
                pinHash,
                timestamp:      Date.now(),
                productScanned: productName,
                statusResult:   status,
                inputType:      barcode ? 'barcode' : 'query'
            });

            return res.status(200).json({ status, productName, alternativas: alternativasSanitizadas });

        } catch (err) {
            console.error('[caregiverScan] Error crítico:', err.message);
            return res.status(500).json({ error: 'Error al procesar el escaneo.' });
        }
    }
);

// =================================================================
// 🔬 LECTOR DE EXÁMENES CLÍNICOS — processMedicalExam
// Fase 3, Paso 1 — Nura App
//
// Recibe: { storagePath: "uploads/temp_exams/{uid}/{filename}" }
// Descarga el archivo (PDF/JPG/PNG) con Admin SDK, lo envía a
// Claude Haiku (visión o documento), extrae hasta 23 biomarcadores,
// valida rangos fisiológicos, convierte unidades y calcula estado.
// El archivo se elimina SIEMPRE en el bloque finally{}.
// =================================================================

// ── Prompt de extracción ──────────────────────────────────────────
const EXAM_EXTRACTION_PROMPT = `Eres un asistente médico especializado en interpretar exámenes de laboratorio clínico.
Analiza el documento proporcionado y extrae ÚNICAMENTE los siguientes biomarcadores si están presentes:

METABÓLICO/GLUCOSA: glucosa, hba1c, insulina_basal, peptido_c, fructosamina
LÍPIDOS: colesterol_total, ldl, hdl, trigliceridos
RENAL: creatinina, tfg, urea, acido_urico, microalbuminuria
ELECTROLITOS: sodio, potasio, calcio, fosforo, magnesio
HEMATOLÓGICO: hemoglobina, hematocrito, leucocitos, plaquetas
HEPÁTICO: fosfatasa_alcalina, albumina, proteinas_totales, ldh
COAGULACIÓN: inr
TIROIDES: tsh, t4_libre, t3_libre
VITAMINAS/MINERALES: vitamina_d, vitamina_b12, acido_folico
HIERRO: ferritina, hierro_serico, transferrina, saturacion_transferrina, tibc
INFLAMACIÓN: vhs
CARDIOVASCULAR/OTROS: homocisteina, haptoglobina, ceruloplasmina, cortisol, psa

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "laboratorio": "nombre del laboratorio o null",
  "fecha_examen": "YYYY-MM-DD o null",
  "biomarcadores": [
    {
      "nombre": "nombre_exacto_del_biomarcador",
      "valor": número_o_null,
      "unidad": "unidad_como_aparece_en_el_examen"
    }
  ]
}

Reglas:
- nombre debe ser exactamente uno de los 45 biomarcadores listados (en minúsculas con guión bajo)
- valor debe ser un número (sin unidades), null si no se puede leer
- unidad debe ser el string exacto del documento (ej: "mg/dL", "mmol/L", "g/dL")
- Si el documento NO es un examen de laboratorio clínico, devuelve: {"error": "documento_no_valido"}
- No inventes valores. Si un biomarcador no aparece, no lo incluyas.
- No incluyas texto explicativo, solo el JSON.`;

// ── Rangos fisiológicos mínimos y máximos aceptables ─────────────
// Valores fuera de este rango son rechazados como errores de OCR.
const RANGOS_FISIOLOGICOS = {
    glucosa:          { min: 20,    max: 800,    unidad_base: 'mg/dL'          },
    hba1c:            { min: 3,     max: 20,     unidad_base: '%'              },
    colesterol_total: { min: 50,    max: 700,    unidad_base: 'mg/dL'          },
    ldl:              { min: 10,    max: 500,    unidad_base: 'mg/dL'          },
    hdl:              { min: 5,     max: 150,    unidad_base: 'mg/dL'          },
    trigliceridos:    { min: 20,    max: 3000,   unidad_base: 'mg/dL'          },
    creatinina:       { min: 0.1,   max: 30,     unidad_base: 'mg/dL'          },
    tfg:              { min: 1,     max: 200,    unidad_base: 'mL/min/1.73m²'  },
    urea:             { min: 5,     max: 500,    unidad_base: 'mg/dL'          },
    acido_urico:      { min: 0.5,   max: 20,     unidad_base: 'mg/dL'          },
    sodio:            { min: 100,   max: 180,    unidad_base: 'mEq/L'          },
    potasio:          { min: 1,     max: 9,      unidad_base: 'mEq/L'          },
    calcio:           { min: 4,     max: 15,     unidad_base: 'mg/dL'          },
    fosforo:          { min: 0.5,   max: 15,     unidad_base: 'mg/dL'          },
    hemoglobina:      { min: 3,     max: 25,     unidad_base: 'g/dL'           },
    hematocrito:      { min: 10,    max: 70,     unidad_base: '%'              },
    leucocitos:       { min: 500,   max: 100000, unidad_base: '/µL'            },
    plaquetas:        { min: 10000, max: 1500000,unidad_base: '/µL'            },
    tsh:              { min: 0.001, max: 200,    unidad_base: 'mUI/L'          },
    t4_libre:         { min: 0.1,   max: 10,     unidad_base: 'ng/dL'          },
    vitamina_d:       { min: 1,     max: 200,    unidad_base: 'ng/mL'          },
    vitamina_b12:     { min: 50,    max: 3000,   unidad_base: 'pg/mL'          },
    ferritina:        { min: 1,     max: 10000,  unidad_base: 'ng/mL'          },

    // ── TIER 1: Clínicamente esenciales (nuevos) ─────────────────
    // Hepático expandido
    fosfatasa_alcalina:      { min: 5,    max: 2000,  unidad_base: 'U/L'       },
    albumina:                { min: 0.5,  max: 7.0,   unidad_base: 'g/dL'      },
    // Coagulación
    inr:                     { min: 0.5,  max: 10.0,  unidad_base: 'ratio'     },
    // Metabolismo hierro expandido
    hierro_serico:           { min: 5,    max: 500,   unidad_base: 'ug/dL'     },
    acido_folico:            { min: 0.5,  max: 50,    unidad_base: 'ng/mL'     },
    transferrina:            { min: 50,   max: 600,   unidad_base: 'mg/dL'     },
    saturacion_transferrina: { min: 1,    max: 100,   unidad_base: '%'         },
    tibc:                    { min: 100,  max: 600,   unidad_base: 'ug/dL'     },
    // Tiroides expandido
    t3_libre:                { min: 0.5,  max: 15.0,  unidad_base: 'pg/mL'     },
    // Minerales
    magnesio:                { min: 0.5,  max: 5.0,   unidad_base: 'mg/dL'     },
    // Renal expandido
    microalbuminuria:        { min: 0,    max: 1000,  unidad_base: 'mg/L'      },
    // Inflamación expandido
    vhs:                     { min: 0,    max: 150,   unidad_base: 'mm/h'      },
    // Diabetes expandido
    insulina_basal:          { min: 0.5,  max: 300,   unidad_base: 'uU/mL'     },
    peptido_c:               { min: 0.1,  max: 20,    unidad_base: 'ng/mL'     },
    fructosamina:            { min: 100,  max: 500,   unidad_base: 'umol/L'    },

    // ── TIER 2: Importantes (nuevos) ─────────────────────────────
    ldh:                     { min: 50,   max: 3000,  unidad_base: 'U/L'       },
    proteinas_totales:       { min: 2.0,  max: 12.0,  unidad_base: 'g/dL'      },
    psa:                     { min: 0.01, max: 200,   unidad_base: 'ng/mL'     },
    homocisteina:            { min: 1,    max: 100,   unidad_base: 'umol/L'    },
    cortisol:                { min: 0.5,  max: 60,    unidad_base: 'ug/dL'     },
    ceruloplasmina:          { min: 5,    max: 100,   unidad_base: 'mg/dL'     },
    haptoglobina:            { min: 1,    max: 500,   unidad_base: 'mg/dL'     }
};

// ── Factores de conversión mmol/L → mg/dL ────────────────────────
const CONVERSION_MMOL_TO_MG = {
    glucosa:          18.016,
    colesterol_total: 38.67,
    ldl:              38.67,
    hdl:              38.67,
    trigliceridos:    88.57,
    urea:             2.801,
    acido_urico:      16.81,
    calcio:           4.008,
    magnesio:         2.431
};

// ── Rangos normales clínicos (referencia adulto) ──────────────────
const RANGOS_NORMALES = {
    glucosa:          { bajo: 70,    alto: 100,    critico_bajo: 50,    critico_alto: 300    },
    hba1c:            { bajo: 0,     alto: 5.7,    critico_bajo: null,  critico_alto: 9      },
    colesterol_total: { bajo: 0,     alto: 200,    critico_bajo: null,  critico_alto: 300    },
    ldl:              { bajo: 0,     alto: 100,    critico_bajo: null,  critico_alto: 190    },
    hdl:              { solo_min: 40 },
    trigliceridos:    { bajo: 0,     alto: 150,    critico_bajo: null,  critico_alto: 500    },
    creatinina:       { bajo: 0.6,   alto: 1.2,    critico_bajo: null,  critico_alto: 10     },
    tfg:              { invertido: true, bajo: 60, critico_bajo: 15                          },
    urea:             { bajo: 10,    alto: 50,     critico_bajo: null,  critico_alto: 200    },
    acido_urico:      { hombre: { alto: 7.0 }, mujer: { alto: 6.0 }, critico_alto: 12       },
    sodio:            { bajo: 136,   alto: 145,    critico_bajo: 125,   critico_alto: 155    },
    potasio:          { bajo: 3.5,   alto: 5.0,    critico_bajo: 2.5,   critico_alto: 6.5    },
    calcio:           { bajo: 8.5,   alto: 10.5,   critico_bajo: 7.0,   critico_alto: 12     },
    fosforo:          { bajo: 2.5,   alto: 4.5,    critico_bajo: null,  critico_alto: 7      },
    hemoglobina:      { hombre: { bajo: 13.5, alto: 17.5 }, mujer: { bajo: 12.0, alto: 16.0 }, critico_bajo: 7 },
    hematocrito:      { hombre: { bajo: 41,   alto: 53   }, mujer: { bajo: 36,   alto: 46   }, critico_bajo: 20 },
    leucocitos:       { bajo: 4500,  alto: 11000,  critico_bajo: 2000,  critico_alto: 30000  },
    plaquetas:        { bajo: 150000,alto: 400000, critico_bajo: 50000, critico_alto: 1000000},
    tsh:              { bajo: 0.4,   alto: 4.0,    critico_bajo: 0.01,  critico_alto: 10     },
    t4_libre:         { bajo: 0.8,   alto: 1.8,    critico_bajo: null,  critico_alto: 3      },
    vitamina_d:       { bajo: 30,    alto: 100,    critico_bajo: 10,    critico_alto: null   },
    vitamina_b12:     { bajo: 200,   alto: 900,    critico_bajo: 100,   critico_alto: null   },
    ferritina:        { hombre: { bajo: 30, alto: 400 }, mujer: { bajo: 13, alto: 150 }, critico_bajo: 5 },

    // ── Nuevos Tier 1 ────────────────────────────────────────────
    fosfatasa_alcalina:      { bajo: 44,  alto: 147,  critico_alto: 500                              },
    albumina:                { bajo: 3.5, alto: 5.0,  critico_bajo: 2.0                              },
    inr:                     { bajo: 0.8, alto: 1.2,  critico_alto: 5.0                              },
    hierro_serico:           { bajo: 60,  alto: 170,  critico_bajo: 30,   critico_alto: null         },
    acido_folico:            { bajo: 3,   alto: 17,   critico_bajo: 1.5,  critico_alto: null         },
    transferrina:            { bajo: 200, alto: 360,  critico_bajo: 100,  critico_alto: null         },
    saturacion_transferrina: { bajo: 20,  alto: 50,   critico_bajo: 10,   critico_alto: 70           },
    tibc:                    { bajo: 250, alto: 370,  critico_bajo: null, critico_alto: null         },
    t3_libre:                { bajo: 2.0, alto: 4.4,  critico_bajo: null, critico_alto: 8.0          },
    magnesio:                { bajo: 1.7, alto: 2.2,  critico_bajo: 1.0,  critico_alto: 4.0          },
    microalbuminuria:        { bajo: 0,   alto: 30,   critico_alto: 300                              },
    vhs:                     { bajo: 0,   alto: 20,   critico_alto: 100                              },
    insulina_basal:          { bajo: 2,   alto: 25,   critico_alto: 100                              },
    peptido_c:               { bajo: 0.8, alto: 3.1,  critico_alto: 6.0                              },
    fructosamina:            { bajo: 205, alto: 285,  critico_alto: 360                              },

    // ── Nuevos Tier 2 ────────────────────────────────────────────
    ldh:                     { bajo: 140, alto: 280,  critico_alto: 1000                             },
    proteinas_totales:       { bajo: 6.0, alto: 8.3,  critico_bajo: 4.0                              },
    psa:                     { bajo: 0,   alto: 4.0,  critico_alto: 10                               },
    homocisteina:            { bajo: 5,   alto: 15,   critico_alto: 30                               },
    cortisol:                { bajo: 6,   alto: 23,   critico_bajo: 2,    critico_alto: 50           },
    ceruloplasmina:          { bajo: 20,  alto: 60,   critico_bajo: 10                               },
    haptoglobina:            { bajo: 30,  alto: 200,  critico_bajo: 5                                }
};

// ── Strings de rango normal legibles para el frontend ────────────
const _RANGO_NORMAL_STRINGS = {
    glucosa:          '70–100 mg/dL (ayuno)',
    hba1c:            '< 5.7%',
    colesterol_total: '< 200 mg/dL',
    ldl:              '< 100 mg/dL',
    hdl:              '> 40 mg/dL (H) / > 50 mg/dL (M)',
    trigliceridos:    '< 150 mg/dL',
    creatinina:       '0.6–1.2 mg/dL',
    tfg:              '≥ 60 mL/min/1.73m²',
    urea:             '10–50 mg/dL',
    acido_urico:      '< 7.0 mg/dL (H) / < 6.0 mg/dL (M)',
    sodio:            '136–145 mEq/L',
    potasio:          '3.5–5.0 mEq/L',
    calcio:           '8.5–10.5 mg/dL',
    fosforo:          '2.5–4.5 mg/dL',
    hemoglobina:      '13.5–17.5 g/dL (H) / 12.0–16.0 g/dL (M)',
    hematocrito:      '41–53% (H) / 36–46% (M)',
    leucocitos:       '4,500–11,000 /µL',
    plaquetas:        '150,000–400,000 /µL',
    tsh:              '0.4–4.0 mUI/L',
    t4_libre:         '0.8–1.8 ng/dL',
    vitamina_d:       '30–100 ng/mL',
    vitamina_b12:     '200–900 pg/mL',
    ferritina:        '30–400 ng/mL (H) / 13–150 ng/mL (M)',

    // ── Nuevos Tier 1 ────────────────────────────────────────────
    fosfatasa_alcalina:      '44–147 U/L',
    albumina:                '3.5–5.0 g/dL',
    inr:                     '0.8–1.2',
    hierro_serico:           '60–170 µg/dL',
    acido_folico:            '3–17 ng/mL',
    transferrina:            '200–360 mg/dL',
    saturacion_transferrina: '20–50%',
    tibc:                    '250–370 µg/dL',
    t3_libre:                '2.0–4.4 pg/mL',
    magnesio:                '1.7–2.2 mg/dL',
    microalbuminuria:        '< 30 mg/L',
    vhs:                     '< 15 mm/h (H) / < 20 mm/h (M)',
    insulina_basal:          '2–25 µU/mL',
    peptido_c:               '0.8–3.1 ng/mL',
    fructosamina:            '205–285 µmol/L',

    // ── Nuevos Tier 2 ────────────────────────────────────────────
    ldh:                     '140–280 U/L',
    proteinas_totales:       '6.0–8.3 g/dL',
    psa:                     '< 4.0 ng/mL',
    homocisteina:            '5–15 µmol/L',
    cortisol:                '6–23 µg/dL (matutino)',
    ceruloplasmina:          '20–60 mg/dL',
    haptoglobina:            '30–200 mg/dL'
};

// ── Helper: detectar tipo de contenido desde la ruta ─────────────
function _detectContentType(storagePath) {
    const lower = storagePath.toLowerCase();
    if (lower.endsWith('.pdf'))  return 'application/pdf';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png'))  return 'image/png';
    return null;
}

// ── Helper: convertir unidades a la unidad base del biomarcador ──
function _convertirUnidades(nombre, valor, unidad) {
    if (!unidad || valor === null || valor === undefined) return valor;

    // Normalizar unidad: quitar espacios, Unicode µ/μ → u
    const u = unidad.trim().replace(/[µμ]/g, 'u');

    // mmol/L → mg/dL para biomarcadores con factor definido
    if (u.toLowerCase() === 'mmol/l') {
        const factor = CONVERSION_MMOL_TO_MG[nombre];
        if (factor) return parseFloat((valor * factor).toFixed(2));
    }

    // Creatinina: umol/L → mg/dL (÷ 88.4)
    if (nombre === 'creatinina' && u.toLowerCase() === 'umol/l') {
        return parseFloat((valor / 88.4).toFixed(3));
    }

    // Vitamina B12: pmol/L → pg/mL (× 1.355)
    if (nombre === 'vitamina_b12' && u.toLowerCase() === 'pmol/l') {
        return parseFloat((valor * 1.355).toFixed(2));
    }

    // T4 libre: pmol/L → ng/dL (÷ 12.87)
    if (nombre === 't4_libre' && u.toLowerCase() === 'pmol/l') {
        return parseFloat((valor / 12.87).toFixed(3));
    }

    // Vitamina D: nmol/L → ng/mL (÷ 2.496)
    if (nombre === 'vitamina_d' && u.toLowerCase() === 'nmol/l') {
        return parseFloat((valor / 2.496).toFixed(2));
    }

    // Ferritina: pmol/L → ng/mL (÷ 2.247)
    if (nombre === 'ferritina' && u.toLowerCase() === 'pmol/l') {
        return parseFloat((valor / 2.247).toFixed(2));
    }

    // Hierro sérico: umol/L → ug/dL (µg/dL) (× 5.585)
    if (nombre === 'hierro_serico' && u.toLowerCase() === 'umol/l') {
        return parseFloat((valor * 5.585).toFixed(2));
    }

    return valor;
}

// ── Helper: calcular estado clínico del biomarcador ──────────────
function _calcularEstado(nombre, valor) {
    const r = RANGOS_NORMALES[nombre];
    if (!r) return 'desconocido';

    // TFG: lógica invertida (más bajo = peor)
    if (nombre === 'tfg') {
        if (valor < r.critico_bajo) return 'critico_bajo';
        if (valor < r.bajo)         return 'bajo';
        return 'normal';
    }

    // HDL: solo mínimo (más alto = mejor)
    if (nombre === 'hdl') {
        if (valor < r.solo_min) return 'bajo';
        return 'normal';
    }

    // Ácido úrico: umbrales por género — usar femenino (más estricto)
    if (nombre === 'acido_urico') {
        if (r.critico_alto && valor >= r.critico_alto) return 'critico_alto';
        if (valor >= r.mujer.alto) return 'alto';
        return 'normal';
    }

    // Hemoglobina / hematocrito: rangos por género
    if (nombre === 'hemoglobina' || nombre === 'hematocrito') {
        if (r.critico_bajo !== undefined && valor <= r.critico_bajo) return 'critico_bajo';
        if (valor < r.mujer.bajo)  return 'bajo';
        if (valor > r.hombre.alto) return 'alto';
        if (valor > r.mujer.alto && valor <= r.hombre.alto) return 'depende_genero';
        return 'normal';
    }

    // Ferritina: rangos por género
    if (nombre === 'ferritina') {
        if (r.critico_bajo !== undefined && valor <= r.critico_bajo) return 'critico_bajo';
        if (valor < r.mujer.bajo)  return 'bajo';
        if (valor > r.hombre.alto) return 'alto';
        if (valor > r.mujer.alto && valor <= r.hombre.alto) return 'depende_genero';
        return 'normal';
    }

    // Biomarcadores simétricos (bajo / normal / alto / críticos)
    if (r.critico_bajo !== null && r.critico_bajo !== undefined && valor <= r.critico_bajo) {
        return 'critico_bajo';
    }
    if (r.critico_alto !== null && r.critico_alto !== undefined && valor >= r.critico_alto) {
        return 'critico_alto';
    }
    if (r.bajo  !== undefined && r.bajo  !== null && valor < r.bajo)  return 'bajo';
    if (r.alto  !== undefined && r.alto  !== null && valor > r.alto)  return 'alto';
    return 'normal';
}

// ── Cloud Function: processMedicalExam ───────────────────────────
exports.processMedicalExam = onRequest(
    {
        region:        'us-central1',
        secrets:       [ANTHROPIC_API_KEY],
        timeoutSeconds: 120,
        memory:        '512MiB'
    },
    async (req, res) => {
        // ── CORS ─────────────────────────────────────────────────
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido.' });

        const { storagePath } = req.body || {};

        // ── Validar autenticación ────────────────────────────────
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autorizado.' });
        }

        // ── Validar storagePath ──────────────────────────────────
        if (!storagePath || typeof storagePath !== 'string') {
            return res.status(400).json({ error: 'storagePath requerido.' });
        }
        // El path DEBE comenzar con uploads/temp_exams/ para evitar
        // acceso arbitrario al bucket.
        if (!storagePath.startsWith('uploads/temp_exams/')) {
            return res.status(400).json({ error: 'Ruta de archivo inválida.' });
        }

        const bucket      = admin.storage().bucket();
        const storageFile = bucket.file(storagePath);
        let   fileBuffer  = null;

        try {
            // ── Verificar existencia ─────────────────────────────
            const [exists] = await storageFile.exists();
            if (!exists) {
                return res.status(404).json({ error: 'Archivo no encontrado.' });
            }

            // ── Detectar tipo ────────────────────────────────────
            const contentType = _detectContentType(storagePath);
            if (!contentType) {
                return res.status(400).json({ error: 'Tipo de archivo no soportado.' });
            }

            // ── Descargar a memoria (máx 10 MB por storage.rules) ─
            const [contents] = await storageFile.download();
            fileBuffer = contents;
            const fileBase64 = fileBuffer.toString('base64');

            // ── Construir bloque multimodal para Claude ───────────
            const mediaBlock = contentType === 'application/pdf'
                ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
                : { type: 'image',    source: { type: 'base64', media_type: contentType,        data: fileBase64 } };

            // ── Llamar a Claude Haiku ────────────────────────────
            const client  = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
            const aiResp  = await client.messages.create({
                model:      MODEL,
                max_tokens: 2048,
                messages: [{
                    role:    'user',
                    content: [
                        mediaBlock,
                        { type: 'text', text: EXAM_EXTRACTION_PROMPT }
                    ]
                }]
            });

            // ── Parsear JSON de la respuesta ─────────────────────
            const rawText   = aiResp.content[0].text.trim();
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return res.status(422).json({ error: 'Respuesta inesperada del modelo.' });
            }
            const extracted = JSON.parse(jsonMatch[0]);

            if (extracted.error === 'documento_no_valido') {
                return res.status(422).json({ error: 'documento_no_valido' });
            }

            const rawBiomarcadores = Array.isArray(extracted.biomarcadores)
                ? extracted.biomarcadores : [];

            // ── Procesar, validar y convertir cada biomarcador ────
            const biomarcadoresProcesados = [];

            for (const b of rawBiomarcadores) {
                const nombre = (b.nombre || '').toLowerCase().trim();
                if (!RANGOS_FISIOLOGICOS[nombre]) continue;

                const valorRaw = b.valor;
                if (valorRaw === null || valorRaw === undefined || isNaN(Number(valorRaw))) continue;

                const valorConv = _convertirUnidades(nombre, Number(valorRaw), b.unidad || '');
                const rango     = RANGOS_FISIOLOGICOS[nombre];

                // Rechazar valores fuera de límites fisiológicos (OCR erróneo)
                if (valorConv < rango.min || valorConv > rango.max) continue;

                biomarcadoresProcesados.push({
                    nombre,
                    valor:        valorConv,
                    unidad_base:  rango.unidad_base,
                    estado:       _calcularEstado(nombre, valorConv),
                    rango_normal: _RANGO_NORMAL_STRINGS[nombre] || ''
                });
            }

            return res.status(200).json({
                status:       'ok',
                laboratorio:  extracted.laboratorio  || null,
                fecha_examen: extracted.fecha_examen || null,
                biomarcadores: biomarcadoresProcesados,
                disclaimer:   'Este análisis es orientativo y no reemplaza la interpretación médica profesional.'
            });

        } catch (err) {
            console.error('[processMedicalExam] Error:', err.message);
            return res.status(500).json({ error: 'Error interno al procesar el examen.' });

        } finally {
            // ── Eliminación garantizada — se ejecuta SIEMPRE ──────
            // fileBuffer !== null confirma que la descarga ocurrió
            // y que el archivo existe en Storage para ser eliminado.
            if (fileBuffer !== null) {
                try {
                    await storageFile.delete();
                    console.info('[processMedicalExam] Archivo eliminado:', storagePath);
                } catch (delErr) {
                    console.error('[processMedicalExam] ERROR al eliminar archivo:', delErr.message);
                }
            }
        }
    }
);

// =================================================================
// 📄 generateBrief — Genera PDF del Brief Médico desde exam_history
// Template: functions/templates/brief-v3.1.html
// Autenticación: Bearer token (Firebase ID Token)
// Memory: 1GiB — Chromium requiere RAM adicional
//
// Placeholders en el template HTML:
//   {{PATIENT_NAME}}       Nombre del paciente
//   {{PATIENT_AGE}}        Edad calculada desde birthdate
//   {{PATIENT_WEIGHT}}     Peso en kg
//   {{PATIENT_HEIGHT}}     Altura en cm
//   {{PATIENT_BMI}}        IMC calculado (kg/m²)
//   {{PATHOLOGIES}}        Enfermedades del perfil (separadas por coma)
//   {{EXAM_DATE}}          Fecha del examen más reciente
//   {{GENERATED_AT}}       Timestamp de generación del brief
//   {{SCORE_VALUE}}        Score metabólico (0–100)
//   {{BIOMARKERS_TABLE}}   Tabla HTML con biomarcadores y estados
//   {{COMPARISON_SECTION}} Sección de comparativa (vacía si 1 solo examen)
// =================================================================
const fs   = require('fs');
const path = require('path');

exports.generateBrief = onRequest(
    { cors: true, region: 'us-central1', memory: '1GiB', timeoutSeconds: 120 },
    async (req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST')    return res.status(405).json({ error: 'Método no permitido.' });

        // ── Verificar token ──────────────────────────────────────
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autorizado.' });
        }
        let uid;
        try {
            const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
            uid = decoded.uid;
        } catch (e) {
            return res.status(401).json({ error: 'Token inválido o expirado.' });
        }

        const db = admin.firestore();

        // ── Leer perfil del usuario ───────────────────────────────
        const userSnap = await db.collection('users').doc(uid).get();
        if (!userSnap.exists) {
            return res.status(404).json({ error: 'Perfil no encontrado.' });
        }
        const userData = userSnap.data();

        // ── Leer últimos 3 exámenes ──────────────────────────────
        const examSnap = await db.collection('users').doc(uid)
            .collection('exam_history')
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();

        if (examSnap.empty) {
            return res.status(400).json({ error: 'No hay exámenes disponibles para generar el brief.' });
        }

        const exams = examSnap.docs.map(d => d.data());
        const latest = exams[0];

        // ── Calcular edad ────────────────────────────────────────
        let age = '—';
        if (userData.birthdate) {
            const bdate = new Date(userData.birthdate + 'T12:00:00');
            const today = new Date();
            let a = today.getFullYear() - bdate.getFullYear();
            const m = today.getMonth() - bdate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) a--;
            age = String(a);
        }

        // ── Calcular IMC ─────────────────────────────────────────
        const w   = parseFloat(userData.weight) || 0;
        const h   = parseInt(userData.height, 10) || 0;
        const bmi = (w > 0 && h > 0) ? (w / ((h / 100) ** 2)).toFixed(1) : '—';
        const bmiStatus = bmi !== '—'
            ? (parseFloat(bmi) < 18.5 ? 'Bajo peso' : parseFloat(bmi) < 25 ? 'Peso normal' : parseFloat(bmi) < 30 ? 'Sobrepeso' : 'Obesidad')
            : '—';

        // ── Score y biomarcadores ─────────────────────────────────
        const score = latest.score_metabolico != null ? String(latest.score_metabolico) : '—';
        const rawBios = Array.isArray(latest.biomarcadores) ? latest.biomarcadores : [];

        // Enriquecer cada bio con briefStatus calculado desde valor_mgdl
        const bios = rawBios.map(b => ({ ...b, briefStatus: _evalBioStatus(b.nombre, b.valor_mgdl) }));

        // ── Flags (contadores de estado) ──────────────────────────
        const flagsOk    = bios.filter(b => b.briefStatus === 'ok').length;
        const flagsWarn  = bios.filter(b => b.briefStatus === 'warn').length;
        const flagsAlert = bios.filter(b => b.briefStatus === 'alert').length;

        // ── Patologías y medicamentos ─────────────────────────────
        const rawEnf = Array.isArray(userData.enfermedades) && userData.enfermedades.length > 0
            ? userData.enfermedades
            : (userData.pathology && userData.pathology !== 'none' ? [userData.pathology] : []);
        const patologias = rawEnf.length > 0
            ? rawEnf.map(_formatPathologyId).join(', ')
            : 'Ninguna';
        const medicamentos = Array.isArray(userData.medicamentos) && userData.medicamentos.length > 0
            ? userData.medicamentos.map(_formatPathologyId).join(', ')
            : 'Sin registros';

        // ── Fecha del examen ──────────────────────────────────────
        const examDate = latest.fecha_examen
            || (latest.timestamp ? new Date(latest.timestamp).toLocaleDateString('es-CL') : '—');

        // ── Birthdate formateada ──────────────────────────────────
        let birthdateFmt = '—';
        if (userData.birthdate) {
            const [yyyy, mm, dd] = userData.birthdate.split('-');
            birthdateFmt = `${dd}.${mm}.${yyyy}`;
        }

        // ── Brief ID único ────────────────────────────────────────
        const now = new Date();
        const briefId = `NR-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
        const generatedAt = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} CLT`;

        // ── Biomarkers table HTML (con clases del template) ────────
        const hasComparison = exams.length >= 2;
        const currentExamDate = exams[0].fecha_examen || '';
        const previousExamDate = hasComparison ? (exams[1].fecha_examen || '') : '';
        const bioTable  = _buildBriefBioTable(bios, hasComparison ? (exams[1].biomarcadores || []) : [], currentExamDate, previousExamDate);
        const bioTitle  = hasComparison
            ? 'Biomarcadores — Comparativa con examen anterior'
            : 'Biomarcadores';

        // ── Índices calculados ────────────────────────────────────
        const indicesHtml = _buildIndicesHtml(bios, bmi, bmiStatus);

        // ── Observaciones clínicas ────────────────────────────────
        const obsText = _buildObservations(bios, patologias, medicamentos, score, hasComparison);

        // ── Leer template ─────────────────────────────────────────
        const templatePath = path.join(__dirname, 'templates', 'brief-v3.1.html');
        let html;
        try {
            html = fs.readFileSync(templatePath, 'utf8');
        } catch (e) {
            return res.status(500).json({ error: 'Template no encontrado. Coloca brief-v3.1.html en functions/templates/' });
        }

        // ── Sustituir todos los tokens ────────────────────────────
        html = html
            .replace(/\{\{BRIEF_ID\}\}/g,              briefId)
            .replace(/\{\{GENERATED_AT\}\}/g,           generatedAt)
            .replace(/\{\{PATIENT_NAME\}\}/g,           userData.displayName || 'Paciente')
            .replace(/\{\{PATIENT_AGE\}\}/g,            age)
            .replace(/\{\{PATIENT_BIRTHDATE\}\}/g,      birthdateFmt)
            .replace(/\{\{PATIENT_ANTHROPOMETRY\}\}/g,  h && w ? `${(h/100).toFixed(2)} m · ${w} kg` : '—')
            .replace(/\{\{PATIENT_BMI\}\}/g,            bmi)
            .replace(/\{\{EXAM_DATE\}\}/g,              examDate)
            .replace(/\{\{PATHOLOGIES\}\}/g,            patologias)
            .replace(/\{\{MEDICATIONS\}\}/g,            medicamentos)
            .replace(/\{\{FLAGS_OK\}\}/g,               String(flagsOk))
            .replace(/\{\{FLAGS_WARN\}\}/g,             String(flagsWarn))
            .replace(/\{\{FLAGS_ALERT\}\}/g,            String(flagsAlert))
            .replace(/\{\{BIOMARKERS_TITLE\}\}/g,       bioTitle)
            .replace(/\{\{BIOMARKERS_TABLE\}\}/g,       bioTable)
            .replace(/\{\{INDICES_SECTION\}\}/g,        indicesHtml)
            .replace(/\{\{CLINICAL_OBSERVATIONS\}\}/g,  obsText);

        // ── Generar PDF y retornar como binario ───────────────────
        // No usamos Storage para evitar errores de signBlob IAM.
        // El PDF se envía directamente en el cuerpo de la respuesta.
        let pdfBuffer;
        try {
            const htmlPdf = require('html-pdf-node');
            pdfBuffer = await htmlPdf.generatePdf(
                { content: html },
                {
                    format:          'A4',
                    margin:          { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
                    printBackground: true,
                    args:            ['--no-sandbox', '--disable-setuid-sandbox']
                }
            );
        } catch (e) {
            console.error('[generateBrief] PDF generation error:', e.message);
            return res.status(500).json({ error: 'Error al generar el PDF.' });
        }

        const filename = `brief-nura-${briefId}.pdf`;
        console.info('[generateBrief] PDF listo para uid:', uid, '| score:', score, '| bytes:', pdfBuffer.length);

        res.set('Content-Type',        'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.set('Content-Length',      String(pdfBuffer.length));
        return res.status(200).send(pdfBuffer);
    }
);

// ── Helpers para generateBrief ────────────────────────────────────

const BRIEF_RANGES = {
    glucosa:            { min: 70,     max: 100    },
    acido_urico:        { min: 2.4,    max: 7.0    },
    colesterol_total:   { min: 0,      max: 200    },
    ldl:                { min: 0,      max: 130    },
    hdl:                { min: 40,     max: 100    },
    trigliceridos:      { min: 0,      max: 150    },
    creatinina:         { min: 0.6,    max: 1.2    },
    potasio:            { min: 3.5,    max: 5.0    },
    microalbuminuria:   { min: 0,      max: 30     },
    got_ast:            { min: 0,      max: 40     },
    gpt_alt:            { min: 0,      max: 41     },
    ggt:                { min: 0,      max: 60     },
    bilirrubina:        { min: 0.1,    max: 1.2    },
    fosfatasa_alcalina: { min: 40,     max: 130    },
    hemoglobina:        { min: 12.0,   max: 17.5   },
    hematocrito:        { min: 36,     max: 54     },
    plaquetas:          { min: 150000, max: 400000 },
    vhs:                { min: 0,      max: 20     },
    urea:               { min: 10,     max: 50     },
    fosforo:            { min: 2.5,    max: 4.5    },
    albumina:           { min: 3.5,    max: 5.0    },
    proteinas_totales:  { min: 6.0,    max: 8.3    },
    ldh:                { min: 120,    max: 246    },
    tsh:                { min: 0.4,    max: 4.0    },
    t4_libre:           { min: 0.8,    max: 1.8    },
    inr:                { min: 0.8,    max: 1.2    },
    calcio:             { min: 8.5,    max: 10.5   },
};

function _evalBioStatus(nombre, valor) {
    const r = BRIEF_RANGES[nombre];
    if (!r || valor == null || isNaN(Number(valor))) return 'warn';
    const v = Number(valor);
    const { min, max } = r;
    if (v >= min && v <= max) return 'ok';
    const span = max - min;
    const margin = span > 0 ? span * 0.1 : max * 0.1;
    if (v >= min - margin && v <= max + margin) return 'warn';
    return 'alert';
}

function formatBiomarkerName(name) {
    if (!name || typeof name !== 'string') return name || '';
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function _formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return '';
    // Handles YYYY-MM-DD or DD/MM/YYYY or DD.MM.YYYY
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
    return dateStr;
}

function _buildBriefBioTable(current, previous, currentDateRaw, previousDateRaw) {
    if (!Array.isArray(current) || current.length === 0) {
        return '<p style="color:#888;font-size:12px;padding:12px 0;">Sin datos de biomarcadores.</p>';
    }
    const hasComp = Array.isArray(previous) && previous.length > 0;
    const prevMap = {};
    if (hasComp) previous.forEach(b => { prevMap[b.nombre] = b; });

    const curDateLabel  = currentDateRaw  ? ` <span style="font-size:9px;font-weight:400;opacity:0.75;">(${_formatDateDDMMYYYY(currentDateRaw)})</span>`  : '';
    const prevDateLabel = previousDateRaw ? ` <span style="font-size:9px;font-weight:400;opacity:0.75;">(${_formatDateDDMMYYYY(previousDateRaw)})</span>` : '';

    const cols = hasComp
        ? `<th style="width:25%;">Parámetro</th><th style="width:18%;">ACTUAL${curDateLabel}</th><th style="width:18%;">ANTERIOR${prevDateLabel}</th><th style="width:18%;">Cambio</th><th style="width:21%;">Tendencia</th>`
        : `<th style="width:40%;">Parámetro</th><th style="width:25%;">Valor</th><th style="width:20%;">Unidad</th><th style="width:15%;">Estado</th>`;

    const rows = current.map(b => {
        const status   = b.briefStatus || _evalBioStatus(b.nombre, b.valor_mgdl);
        const barClass = status; // 'ok' | 'warn' | 'alert'
        const cur = b.valor_mgdl != null ? b.valor_mgdl : '—';
        const unit = b.unidad_base || '';
        const displayName = formatBiomarkerName(b.nombre);

        if (hasComp) {
            const prev = prevMap[b.nombre];
            const pre  = prev ? (prev.valor_mgdl != null ? prev.valor_mgdl : '—') : '—';
            let changeHtml = '<td>—</td><td>—</td>';
            if (pre !== '—' && cur !== '—') {
                const delta = (((parseFloat(cur) - parseFloat(pre)) / parseFloat(pre)) * 100).toFixed(1);
                const up = parseFloat(cur) > parseFloat(pre);
                const eq = parseFloat(cur) === parseFloat(pre);
                const arrowClass = eq ? '' : up ? 'up' : 'down';
                const arrow = eq ? '→' : up ? '↑' : '↓';
                const tendencia = eq ? 'Estable' : up ? 'Sube' : 'Baja';
                const tendColor = eq ? 'var(--ink-60)' : up ? 'var(--alert)' : 'var(--ok)';
                changeHtml = `<td><div class="bio-compare-change"><span class="change-arrow ${arrowClass}">${arrow}</span><span class="change-percent ${arrowClass}">${up?'+':''}${delta}%</span></div></td><td style="text-align:center;font-size:10px;color:${tendColor};font-weight:600;">${tendencia}</td>`;
            }
            return `<tr><td><div class="bio-param-name"><div class="bio-bar-tiny ${barClass}"></div>${displayName}</div></td><td class="bio-compare-col">${cur} ${unit}</td><td class="bio-compare-col">${pre !== '—' ? pre + ' ' + unit : '—'}</td>${changeHtml}</tr>`;
        } else {
            const estadoLabel = status === 'ok' ? '✓ Normal' : status === 'warn' ? '⚠ Limítrofe' : '⬆ Fuera de rango';
            const estadoColor = status === 'ok' ? 'var(--ok)' : status === 'warn' ? '#E8830A' : 'var(--alert)';
            return `<tr><td><div class="bio-param-name"><div class="bio-bar-tiny ${barClass}"></div>${displayName}</div></td><td class="bio-compare-col">${cur}</td><td class="bio-compare-col">${unit}</td><td style="font-weight:600;color:${estadoColor};font-size:11px;">${estadoLabel}</td></tr>`;
        }
    }).join('\n');

    return `<table class="biomarker-compare-table"><thead><tr>${cols}</tr></thead><tbody>${rows}</tbody></table>`;
}

function _formatPathologyId(id) {
    if (!id || typeof id !== 'string') return id;
    return id
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function _buildIndicesHtml(bios, bmi, bmiStatus) {
    const bioMap = {};
    bios.forEach(b => {
        const key = (b.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        bioMap[key] = parseFloat(b.valor_mgdl);
    });

    const na = '<div class="index-value" style="color:#8A8A8F;">No disponible</div><div class="index-interpretation" style="color:#8A8A8F;font-style:italic;">Datos insuficientes en este examen</div>';

    // 1. IMC
    const imcCard = bmi !== '—'
        ? `<div class="index-value">${bmi} kg/m²</div><div class="index-interpretation"><strong>${bmiStatus}</strong> · ${
            parseFloat(bmi) < 18.5 ? 'BMI &lt; 18.5 indica bajo peso' :
            parseFloat(bmi) < 25   ? 'BMI 18.5–24.9 es rango normal' :
            parseFloat(bmi) < 30   ? 'BMI 25.0–29.9 indica sobrepeso' :
                                     'BMI ≥ 30 indica obesidad'}</div>`
        : na;

    // 2. Framingham (requiere datos que rara vez están en el examen de laboratorio)
    const framCard = na.replace('Datos insuficientes en este examen', 'Requiere PA, lípidos y datos clínicos adicionales');

    // 3. eGFR desde creatinina
    const creat = bioMap['creatinina'] || bioMap['creatinina serica'] || bioMap['creatinina sérica'];
    const egfrCard = (creat && creat > 0)
        ? (() => {
            const egfr = Math.round(186 * Math.pow(creat, -1.154));
            const label = egfr >= 90 ? 'Función renal normal (Estadio 1 KDIGO)' :
                          egfr >= 60 ? 'Leve reducción (Estadio 2 KDIGO)' :
                          egfr >= 45 ? 'Reducción moderada (Estadio 3a)' :
                                       'Reducción importante — consultar nefrólogo';
            return `<div class="index-value">${egfr} mL/min</div><div class="index-interpretation"><strong>${label}</strong></div>`;
          })()
        : na;

    // 4. HOMA-IR desde glucosa + insulina
    const glucosa  = bioMap['glucosa'] || bioMap['glucosa en ayunas'] || bioMap['glucosa ayunas'];
    const insulina = bioMap['insulina'];
    const homaCard = (glucosa && insulina)
        ? (() => {
            const homa = ((glucosa * insulina) / 405).toFixed(2);
            const interp = parseFloat(homa) < 1.8 ? 'Sensibilidad insulínica normal' :
                           parseFloat(homa) < 2.9 ? 'Resistencia leve — monitorear' :
                                                    'Resistencia insulínica significativa';
            return `<div class="index-value">${homa}</div><div class="index-interpretation"><strong>${interp}</strong> · &lt; 1.8 es normal</div>`;
          })()
        : na;

    return [
        `<div class="index-card"><div class="index-label">Índice de Masa Corporal</div>${imcCard}</div>`,
        `<div class="index-card"><div class="index-label">Riesgo Cardiovascular (Framingham 10y)</div>${framCard}</div>`,
        `<div class="index-card"><div class="index-label">Tasa Filtración Glomerular (eGFR)</div>${egfrCard}</div>`,
        `<div class="index-card"><div class="index-label">Índice HOMA-IR (Resistencia Insulina)</div>${homaCard}</div>`,
    ].join('\n');
}

function _buildObservations(bios, patologias, medicamentos, score, hasComparison) {
    const total    = bios.length;
    const normales = bios.filter(b => (b.briefStatus || _evalBioStatus(b.nombre, b.valor_mgdl)) === 'ok').length;
    const alertas  = bios.filter(b => (b.briefStatus || _evalBioStatus(b.nombre, b.valor_mgdl)) === 'alert');

    let obs = '';
    if (patologias !== 'Ninguna') {
        obs += `Paciente con ${patologias}. `;
    }
    if (medicamentos !== 'Sin registros') {
        obs += `Medicación activa: ${medicamentos}. `;
    }

    if (total === 0) {
        obs += 'Sin datos de biomarcadores en este examen.';
        return obs.trim();
    }

    obs += `${normales} de ${total} biomarcadores en rango normal. `;

    if (alertas.length > 0) {
        const nombresAlerta = alertas.map(b => formatBiomarkerName(b.nombre)).join(', ');
        obs += `Valores fuera de rango: ${nombresAlerta}. `;
    } else {
        obs += 'Sin valores fuera de rango. ';
    }

    if (score !== '—') {
        const sc = parseInt(score, 10);
        const tier = sc >= 80 ? 'Control metabólico excelente.' :
                     sc >= 60 ? 'Control metabólico bueno, con margen de mejora.' :
                     sc >= 40 ? 'Control metabólico moderado. Se recomienda revisión clínica.' :
                                'Control metabólico deficiente. Se recomienda consulta médica urgente.';
        obs += `${tier} `;
    }

    if (hasComparison) {
        obs += 'Se incluye comparativa con examen anterior. ';
    }

    obs += 'Documento orientativo — no constituye diagnóstico médico conforme a Ley 20.584.';
    return obs.trim();
}

// =================================================================
// 🧬 GENÉTICA v2.0 — 3 Cloud Functions
// Cumplimiento: OMS, ACMG, Chile Ley 20.120 / 20.584 / 19.628, GDPR
// =================================================================

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { parseDNAFile, extractRelevantSNPs } = require('./genetics/parser');
const { generateGeneticReport }             = require('./genetics/analyzer');
const { NURA_SNP_DATABASE }                 = require('./genetics/snpDatabase');

// SNPs necesarios para todas las funciones de análisis genético (ancestría, rasgos, fitness, ambiente, clínico).
// Filtrar a este set antes de guardar en Firestore evita el límite de 10 MB por documento gRPC.
const _NEEDED_SNPS = new Set([
    // Ancestry AIMs (26)
    'rs1426654','rs16891982','rs1042602','rs12913832','rs1805007','rs2814778',
    'rs1834640','rs2402130','rs3827760','rs2250072','rs671','rs17822931',
    'rs4778241','rs7554936','rs10883099','rs3794102','rs2187668','rs9268516',
    'rs4988235','rs7903146','rs1800562','rs762551','rs1801133','rs1800795',
    'rs2282679','rs4680',
    // Fitness
    'rs1815739','rs8192678','rs12722','rs1042713','rs1799883','rs4244285',
    // Environmental
    'rs1695','rs1049793','rs3740393','rs36053993',
    // Traits (SNPs not already listed above)
    'rs72921001','rs713598','rs4481887','rs35874116',
    // Clinical (SNPs not already listed above)
    'rs1801155','rs1801282','rs2476601','rs6511720','rs2251746',
    'rs13119723','rs4343','rs429358','rs80357713','rs80357906','rs80359550',
    'rs3892097','rs9923231','rs2069812','rs1799752','rs7454108','rs1800546',
    // Medical conditions traits (new EXP A)
    'rs6152','rs524952','rs10757274','rs6025','rs7412','rs193922747',
    // Personality / lifestyle traits (new EXP A)
    'rs4633','rs6265','rs4570625','rs2740390','rs1800497',
]);

/** Filtra un mapa de SNPs a solo los que necesitan las funciones genéticas. */
function _filterNeededSnps(allSnps) {
    const out = {};
    for (const id of _NEEDED_SNPS) {
        if (allSnps[id]) out[id] = allSnps[id];
    }
    return out;
}

// ── Helpers de perfil genético cifrado ───────────────────────────────

/**
 * Guarda los SNPs crudos cifrados en genetic_data/profile.
 * Usado por las funciones de ancestría, rasgos y fitness.
 * Si GENETIC_MASTER_KEY no está configurado, omite cifrado con advertencia.
 */
async function saveGeneticProfile(userId, snps, metadata, masterKey) {
    const payload = { snps, savedAt: new Date().toISOString(), ...metadata };

    let docData;
    if (masterKey) {
        const encrypted = encryptGeneticData(payload, userId, masterKey);
        docData = { ...encrypted, encrypted: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    } else {
        // TODO: Remove plaintext fallback once GENETIC_MASTER_KEY is set in all envs
        console.warn('[Security] GENETIC_MASTER_KEY no configurado — guardando sin cifrado de aplicación');
        docData = { data: payload, encrypted: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    }

    await admin.firestore()
        .collection('users').doc(userId)
        .collection('genetic_data').doc('profile')
        .set(docData);
}

/**
 * Lee y descifra el perfil genético de un usuario.
 * Devuelve { snps, ... } o null si no existe.
 */
async function getGeneticProfile(userId, masterKey) {
    const doc = await admin.firestore()
        .collection('users').doc(userId)
        .collection('genetic_data').doc('profile')
        .get();

    if (!doc.exists) return null;
    const data = doc.data();

    if (data.encrypted && masterKey) {
        return decryptGeneticData(data, userId, masterKey);
    }
    return data.data || null;
}

// ── Helper: extrae perfil genético compacto del reporte completo ──
function _extractGeneticProfile(fullReport) {
    const profile = {
        foodIntolerances: [],
        foodAllergies: [],
        metabolicSensitivities: [],
        flags: {
            lactoseIntolerant: false, celiacRisk: false, glutenSensitive: false,
            slowCaffeine: false, alcoholSensitive: false, histamineSensitive: false,
            sodiumSensitive: false, fructoseIntolerant: false,
            peanutAllergy: false, seafoodAllergy: false, eggMilkAllergy: false,
            diabetesRisk: false, hypertensionRisk: false, cholesterolRisk: false,
            ironOverload: false, apoeE4Carrier: false
        },
        pharmaAlerts: [],
        medicalConsultsNeeded: []
    };

    for (const r of fullReport.detailed_results.food_intolerances) {
        if (r.status === 'risk') {
            profile.foodIntolerances.push({ condition: r.condition, severity: r.severity, foods: r.linkedFoods });
            if (r.condition === 'intolerancia_lactosa')    profile.flags.lactoseIntolerant = true;
            if (r.condition === 'predisposicion_celiaca')  profile.flags.celiacRisk = true;
            if (r.condition === 'sensibilidad_gluten')     profile.flags.glutenSensitive = true;
            if (r.condition === 'metabolismo_cafeina')     profile.flags.slowCaffeine = true;
            if (r.condition === 'intolerancia_alcohol')    profile.flags.alcoholSensitive = true;
            if (r.condition === 'intolerancia_histamina')  profile.flags.histamineSensitive = true;
            if (r.condition === 'sensibilidad_sodio')      profile.flags.sodiumSensitive = true;
            if (r.condition === 'intolerancia_fructosa')   profile.flags.fructoseIntolerant = true;
            if (r.gene === 'APOE' && r.userGenotype === 'CC') profile.flags.apoeE4Carrier = true;
        }
    }
    for (const r of fullReport.detailed_results.food_allergies) {
        if (r.status === 'risk') {
            profile.foodAllergies.push({ condition: r.condition, severity: r.severity, foods: r.linkedFoods });
            if (r.condition === 'predisposicion_alergia_mani')      profile.flags.peanutAllergy = true;
            if (r.condition === 'predisposicion_alergia_mariscos')  profile.flags.seafoodAllergy = true;
            if (r.condition === 'predisposicion_alergia_huevo')     profile.flags.eggMilkAllergy = true;
        }
    }
    for (const r of fullReport.detailed_results.metabolic_risks) {
        if (r.status === 'risk') {
            profile.metabolicSensitivities.push({ condition: r.condition, severity: r.severity, gene: r.gene });
            if (r.condition === 'riesgo_diabetes_t2')      profile.flags.diabetesRisk = true;
            if (r.condition === 'riesgo_hipertension')     profile.flags.hypertensionRisk = true;
            if (r.condition === 'riesgo_colesterol_alto')  profile.flags.cholesterolRisk = true;
            if (r.condition === 'riesgo_hemocromatosis')   profile.flags.ironOverload = true;
        }
    }
    for (const r of fullReport.detailed_results.pharmacogenomics) {
        if (r.status === 'risk') {
            profile.pharmaAlerts.push({ gene: r.gene, drugs: r.affectedDrugs, action: r.action });
        }
    }
    for (const cat of ['food_intolerances', 'food_allergies', 'metabolic_risks', 'cancer_risks']) {
        for (const r of fullReport.detailed_results[cat]) {
            if (r.status === 'risk' && r.requiresMedicalConsult) {
                profile.medicalConsultsNeeded.push({
                    gene: r.gene, condition: r.condition,
                    specialty: r.referralSpecialty, severity: r.severity
                });
            }
        }
    }
    return profile;
}

// ── processGeneticData — lee archivo de Storage, parsea y analiza ─
exports.processGeneticData = onCall(
    { region: 'us-central1', memory: '2GiB', timeoutSeconds: 300, secrets: ['GENETIC_MASTER_KEY'] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid = request.auth.uid;
        const { storagePath, fileName, fileSize } = request.data || {};

        if (!storagePath) throw new HttpsError('invalid-argument', 'storagePath requerido');

        // Seguridad: el path debe pertenecer al propio usuario
        if (!storagePath.startsWith(`genetic-raw/${uid}/`)) {
            throw new HttpsError('permission-denied', 'Acceso denegado al archivo');
        }

        await logGeneticAccess({
            userId:    uid,
            action:    'WRITE',
            resource:  'genetic_profile',
            ipAddress: request.rawRequest?.ip,
            userAgent: request.rawRequest?.headers?.['user-agent'],
            result:    'INITIATED',
            details:   { fileName, fileSize }
        });

        const bucket     = admin.storage().bucket();
        const storageFile = bucket.file(storagePath);

        try {
            // 0. Invalidar análisis derivados del ADN anterior — evita servir caché de otro usuario
            for (const col of ['ancestry', 'physical_traits', 'fitness_profile', 'geno_environment']) {
                await admin.firestore().collection('users').doc(uid).collection(col).doc('result').delete().catch(() => {});
            }
            console.log(`[PROCESS_GENETIC] Cache de análisis previos limpiado para uid:${uid}`);

            // 1. Verificar que el archivo existe en Storage
            const [exists] = await storageFile.exists();
            if (!exists) throw new HttpsError('not-found', 'Archivo no encontrado en Storage');

            // 2. Descargar contenido desde Storage (sin límite de payload)
            console.log(`[Genetics] Descargando ${storagePath}...`);
            const [contents] = await storageFile.download();
            const textContent = contents.toString('utf-8');
            console.log(`[Genetics] Descargado: ${textContent.length} bytes`);

            const parseResult = parseDNAFile(textContent);
            const { relevantSnps, foundCount, coveragePercent } = extractRelevantSNPs(parseResult.snps, NURA_SNP_DATABASE);

            const userDoc = await admin.firestore().collection('users').doc(uid).get();
            const userProfile = {
                uid,
                pathologies: userDoc.data()?.enfermedades || [],
                medications: userDoc.data()?.medications  || {}
            };

            const report   = generateGeneticReport(relevantSnps, userProfile);
            const reportId = `genetic_report_${Date.now()}`;

            // 3. Guardar perfil genético cifrado — solo los SNPs necesarios (evita límite gRPC Firestore)
            const masterKey = process.env.GENETIC_MASTER_KEY || null;
            const filteredSnps = _filterNeededSnps(parseResult.snps);
            console.log(`[Genetics] SNPs filtrados: ${Object.keys(filteredSnps).length} de ${parseResult.metadata.totalSnps}`);
            await saveGeneticProfile(uid, filteredSnps, {
                format:     parseResult.metadata.format,
                totalSnps:  parseResult.metadata.totalSnps,
                reportId
            }, masterKey);

            await admin.firestore()
                .collection('users').doc(uid)
                .collection('genetic_reports').doc(reportId)
                .set({
                    ...report,
                    reportId,
                    fileName:           fileName || 'unknown',
                    fileFormat:         parseResult.metadata.format,
                    totalSnpsInFile:    parseResult.metadata.totalSnps,
                    relevantSnpsFound:  foundCount,
                    coveragePercent:    parseFloat(coveragePercent),
                    createdAt:          admin.firestore.FieldValue.serverTimestamp(),
                    consentGiven:       true,
                    consentTimestamp:   admin.firestore.FieldValue.serverTimestamp()
                });

            const geneticProfile = _extractGeneticProfile(report);
            await admin.firestore().collection('users').doc(uid).update({
                geneticProfile,
                hasGeneticData:     true,
                lastGeneticReport:  reportId,
                geneticReportDate:  admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`[Genetics] Reporte generado uid:${uid} | formato:${parseResult.metadata.format} | SNPs:${parseResult.metadata.totalSnps} | relevantes:${foundCount}`);

            // 4. Eliminar archivo raw de Storage (Ley 20.120 — datos crudos no deben persistir)
            await storageFile.delete();
            console.log(`[Genetics] Archivo raw eliminado: ${storagePath}`);

            await logGeneticAccess({ userId: uid, action: 'WRITE', resource: 'genetic_profile', result: 'SUCCESS' });

            return {
                success: true,
                reportId,
                summary:          report.summary,
                recommendations:  report.recommendations,
                disclaimer:       report.disclaimer,
                detailed_results: report.detailed_results,
                metadata: {
                    totalSnpsInFile:   parseResult.metadata.totalSnps,
                    relevantSnpsFound: foundCount,
                    coveragePercent,
                    format:            parseResult.metadata.format
                }
            };
        } catch (error) {
            console.error('[Genetics] Error:', error.message);

            // Intentar eliminar el archivo raw aunque haya habido error
            try { await storageFile.delete(); } catch (_) {}

            await logGeneticAccess({ userId: uid, action: 'WRITE', resource: 'genetic_profile', result: 'ERROR', details: error.message });
            if (error.code) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);

// ── getGeneticReport — devuelve el último reporte guardado ───────
exports.getGeneticReport = onCall(
    { region: 'us-central1' },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid = request.auth.uid;
        await logGeneticAccess({ userId: uid, action: 'READ', resource: 'genetic_profile', result: 'INITIATED' });
        try {
            const snap = await admin.firestore()
                .collection('users').doc(uid).collection('genetic_reports')
                .orderBy('createdAt', 'desc').limit(1).get();
            if (snap.empty) return { hasReport: false };
            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'genetic_profile', result: 'SUCCESS' });
            return { hasReport: true, report: snap.docs[0].data() };
        } catch (error) {
            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'genetic_profile', result: 'ERROR', details: error.message });
            throw new HttpsError('internal', error.message);
        }
    }
);

// ── deleteGeneticData — eliminación permanente (GDPR Art.17 · Ley 19.628 · Ley 21.719)
exports.deleteGeneticData = onCall(
    { region: 'us-central1' },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid = request.auth.uid;

        await logGeneticAccess({
            userId:    uid,
            action:    'DELETE',
            resource:  'all_genetic_data',
            ipAddress: request.rawRequest?.ip,
            userAgent: request.rawRequest?.headers?.['user-agent'],
            result:    'INITIATED'
        });

        try {
            // 1. Eliminar reportes genéticos
            const reportsSnap = await admin.firestore()
                .collection('users').doc(uid).collection('genetic_reports').get();
            const batch = admin.firestore().batch();
            reportsSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            // 2. Eliminar perfil cifrado (SNPs crudos)
            await admin.firestore()
                .collection('users').doc(uid)
                .collection('genetic_data').doc('profile')
                .delete().catch(() => {});

            // 3. Eliminar colecciones de análisis derivados (FASE 1-4)
            for (const col of ['ancestry', 'physical_traits', 'fitness_profile', 'geno_environment']) {
                const snap = await admin.firestore()
                    .collection('users').doc(uid).collection(col).get();
                const b = admin.firestore().batch();
                snap.forEach(doc => b.delete(doc.ref));
                if (!snap.empty) await b.commit();
            }

            // 4. Limpiar campos en documento principal
            await admin.firestore().collection('users').doc(uid).update({
                geneticProfile:    admin.firestore.FieldValue.delete(),
                hasGeneticData:    false,
                lastGeneticReport: admin.firestore.FieldValue.delete(),
                geneticReportDate: admin.firestore.FieldValue.delete()
            });

            // 5. Programar eliminación de backups en 30 días
            await admin.firestore().collection('backup_deletion_queue').add({
                userId:        uid,
                scheduledFor:  Date.now() + (30 * 24 * 60 * 60 * 1000),
                status:        'PENDING',
                requestedAt:   admin.firestore.FieldValue.serverTimestamp()
            });

            await logGeneticAccess({ userId: uid, action: 'DELETE', resource: 'all_genetic_data', result: 'SUCCESS' });
            console.log(`[Genetics] Datos eliminados uid:${uid}`);

            return {
                success: true,
                message: 'Datos genéticos eliminados permanentemente conforme a GDPR Art.17, Ley 21.719 y Ley 19.628.',
                backupDeletionScheduled: '30 días'
            };
        } catch (error) {
            await logGeneticAccess({ userId: uid, action: 'DELETE', resource: 'all_genetic_data', result: 'ERROR', details: error.message });
            throw new HttpsError('internal', error.message);
        }
    }
);
// =================================================================
// 🌍 FASE 1 — ANCESTRÍA
// =================================================================
const { calculateAncestry }    = require('./ancestry/calculator');

exports.analyzeAncestry = onCall(
    { region: 'us-central1', memory: '512MiB', timeoutSeconds: 120, secrets: ['GENETIC_MASTER_KEY'] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid = request.auth.uid;

        await logGeneticAccess({ userId: uid, action: 'READ', resource: 'ancestry', result: 'INITIATED' });

        try {
            const masterKey   = process.env.GENETIC_MASTER_KEY || null;
            const geneticProf = await getGeneticProfile(uid, masterKey);
            if (!geneticProf?.snps) throw new HttpsError('not-found', 'No se encontraron datos genéticos. Sube tu archivo ADN primero.');

            const ancestryData = calculateAncestry(geneticProf.snps);

            await admin.firestore()
                .collection('users').doc(uid)
                .collection('ancestry').doc('result')
                .set({ ...ancestryData, analyzedAt: admin.firestore.FieldValue.serverTimestamp() });

            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'ancestry', result: 'SUCCESS' });

            return {
                success:    true,
                ancestry:   ancestryData,
                disclaimer: 'Estimación estadística basada en ~26 marcadores AIM del proyecto 1000 Genomes. Precisión aproximada. No reemplaza pruebas genealógicas oficiales.'
            };
        } catch (error) {
            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'ancestry', result: 'ERROR', details: error.message });
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);

// =================================================================
// 🧬 FASE 2 — RASGOS FÍSICOS
// =================================================================
const { PHYSICAL_TRAITS } = require('./traits/traitsDatabase');

exports.analyzePhysicalTraits = onCall(
    { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, secrets: ['GENETIC_MASTER_KEY'] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid = request.auth.uid;

        await logGeneticAccess({ userId: uid, action: 'READ', resource: 'physical_traits', result: 'INITIATED' });

        try {
            const masterKey   = process.env.GENETIC_MASTER_KEY || null;
            const geneticProf = await getGeneticProfile(uid, masterKey);
            if (!geneticProf?.snps) throw new HttpsError('not-found', 'No se encontraron datos genéticos.');

            const genotypes = {};
            for (const [rsid, snpData] of Object.entries(geneticProf.snps)) {
                genotypes[rsid] = snpData.genotype;
            }

            const traits = {};
            let analyzed = 0, found = 0;

            for (const [traitKey, trait] of Object.entries(PHYSICAL_TRAITS)) {
                analyzed++;
                if (genotypes[trait.primarySnp]) {
                    found++;
                    const result = trait.interpret(genotypes);
                    if (result) {
                        traits[traitKey] = {
                            name:     trait.name,
                            icon:     trait.icon,
                            category: trait.category,
                            evidence: trait.evidence,
                            ...result
                        };
                    }
                }
            }

            const data = { traits, analyzed, found, analyzedAt: admin.firestore.FieldValue.serverTimestamp() };
            await admin.firestore()
                .collection('users').doc(uid)
                .collection('physical_traits').doc('result')
                .set(data);

            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'physical_traits', result: 'SUCCESS' });

            return {
                success:    true,
                traits,
                analyzed,
                found,
                disclaimer: 'Los rasgos son predicciones probabilísticas. La expresión real depende de múltiples genes, epigenética y ambiente.'
            };
        } catch (error) {
            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'physical_traits', result: 'ERROR', details: error.message });
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);

// =================================================================
// 🏋️ FASE 3 — GENÉTICA DEPORTIVA
// =================================================================
const { generateFitnessProfile } = require('./fitness/fitnessDatabase');

exports.analyzeFitness = onCall(
    { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, secrets: ['GENETIC_MASTER_KEY'] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid = request.auth.uid;

        await logGeneticAccess({ userId: uid, action: 'READ', resource: 'fitness_profile', result: 'INITIATED' });

        try {
            const masterKey   = process.env.GENETIC_MASTER_KEY || null;
            const geneticProf = await getGeneticProfile(uid, masterKey);
            if (!geneticProf?.snps) throw new HttpsError('not-found', 'No se encontraron datos genéticos.');

            const genotypes = {};
            for (const [rsid, snpData] of Object.entries(geneticProf.snps)) {
                genotypes[rsid] = snpData.genotype;
            }

            const fitnessProfile = generateFitnessProfile(genotypes);

            await admin.firestore()
                .collection('users').doc(uid)
                .collection('fitness_profile').doc('result')
                .set({ ...fitnessProfile, analyzedAt: admin.firestore.FieldValue.serverTimestamp() });

            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'fitness_profile', result: 'SUCCESS' });

            return {
                success:    true,
                profile:    fitnessProfile,
                disclaimer: 'El perfil de fitness es orientativo. Entrenamiento, nutricion y habitos de sueno impactan igual o mas que la genetica.'
            };
        } catch (error) {
            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'fitness_profile', result: 'ERROR', details: error.message });
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);

// =================================================================
// 🌱 FASE 4 — GENÉTICA + AMBIENTE CHILE
// =================================================================
const { ENVIRONMENTAL_SNPS } = require('./environmental/genoEnvDatabase');
const { getAirQuality, getAvailableCities, getAvailableCountries } = require('./environmental/sincaIntegration');

exports.analyzeGenoEnvironment = onCall(
    { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, secrets: ['GENETIC_MASTER_KEY'] },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'No autenticado');
        const uid     = request.auth.uid;
        const country = (request.data && request.data.country) ? request.data.country : 'Chile';
        const ciudad  = (request.data && (request.data.city || request.data.ciudad)) ? (request.data.city || request.data.ciudad) : 'Santiago';

        await logGeneticAccess({ userId: uid, action: 'READ', resource: 'geno_environment', result: 'INITIATED' });

        try {
            const masterKey   = process.env.GENETIC_MASTER_KEY || null;
            const geneticProf = await getGeneticProfile(uid, masterKey);
            if (!geneticProf?.snps) throw new HttpsError('not-found', 'No se encontraron datos genéticos.');

            const genotypes = {};
            for (const [rsid, snpData] of Object.entries(geneticProf.snps)) {
                genotypes[rsid] = snpData.genotype;
            }

            const airData    = await getAirQuality(ciudad, country);
            const cityCoords = { latitude: airData.lat, ciudad };

            const personalizedRisks = [];
            for (const [rsid, envSnp] of Object.entries(ENVIRONMENTAL_SNPS)) {
                const genotype = genotypes[rsid];
                if (!genotype || genotype === '--') continue;
                const result = envSnp.interpret(genotype, cityCoords);
                if (result) {
                    personalizedRisks.push({
                        rsid,
                        gene:                 envSnp.gene,
                        trait:                envSnp.trait,
                        environmental_factor: envSnp.environmental_factor,
                        icon:                 envSnp.icon,
                        ...result
                    });
                }
            }

            const todayAlerts            = _generateTodayAlerts(personalizedRisks, airData, ciudad);
            const longTermRecommendations = _generateLongTermRecommendations(personalizedRisks, airData);

            const data = {
                ciudad, country, airQuality: airData, personalizedRisks,
                todayAlerts, longTermRecommendations,
                analyzedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await admin.firestore()
                .collection('users').doc(uid)
                .collection('geno_environment').doc('result')
                .set(data);

            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'geno_environment', result: 'SUCCESS' });

            return {
                success:          true,
                ciudad,
                country,
                airQuality:       airData,
                personalizedRisks,
                todayAlerts,
                longTermRecommendations,
                availableCities:  getAvailableCities(),
                availableCountries: getAvailableCountries(),
                disclaimer:       'Los datos de contaminacion son promedios historicos. Para datos en tiempo real consulta https://sinca.mma.gob.cl/'
            };
        } catch (error) {
            await logGeneticAccess({ userId: uid, action: 'READ', resource: 'geno_environment', result: 'ERROR', details: error.message });
            if (error instanceof HttpsError) throw error;
            throw new HttpsError('internal', error.message);
        }
    }
);

// Alertas inmediatas accionables HOY según condiciones actuales del entorno
function _generateTodayAlerts(risks, air, ciudad) {
    const alerts = [];

    const gstp1 = risks.find(function(r) { return r.gene === 'GSTP1'; });
    if (gstp1 && gstp1.activity === 'Baja' && air.pm25 > 35) {
        alerts.push({
            severity: 'HIGH', icon: '⚠️',
            title:   'Alta vulnerabilidad al aire contaminado HOY',
            message: 'Tu variante GSTP1 (detoxificacion baja) + PM2.5 elevado = usa mascarilla N95 al salir y evita ejercicio exterior.'
        });
    }

    if (air.arsenicWater) {
        const as3mt = risks.find(function(r) { return r.gene === 'AS3MT'; });
        const sev   = as3mt && as3mt.efficiency === 'Baja' ? 'CRITICAL' : as3mt && as3mt.efficiency === 'Media' ? 'HIGH' : 'MEDIUM';
        alerts.push({
            severity: sev, icon: '💧',
            title:   'Riesgo de arsenico en agua en ' + ciudad,
            message: as3mt ? as3mt.advice : 'Zona con presencia de arsenico en agua. Usa agua filtrada para beber y cocinar.'
        });
    }

    const mc1r = risks.find(function(r) { return r.gene === 'MC1R'; });
    if (mc1r && mc1r.risk === 'ALTO' && air.uvi >= 11) {
        alerts.push({
            severity: 'HIGH', icon: '☀️',
            title:   'UV extremo + piel sensible HOY',
            message: 'UV Index ' + air.uvi + ' + variante MC1R = FPS 50+ diario, evita sol 11:00-16:00.'
        });
    }

    if (air.leña && air.pm25 > 50) {
        const il5 = risks.find(function(r) { return r.gene === 'IL5'; });
        if (il5 && il5.risk === 'ALTO') {
            alerts.push({
                severity: 'HIGH', icon: '🫁',
                title:   'Alta sensibilidad respiratoria — temporada de lena',
                message: 'Contaminacion por lena + variante IL5 = cierra ventanas, usa purificador HEPA.'
            });
        }
    }

    return alerts;
}

// Recomendaciones estructurales a largo plazo según perfil genético + entorno crónico
function _generateLongTermRecommendations(risks, air) {
    const recs = [];

    const gstp1 = risks.find(function(r) { return r.gene === 'GSTP1'; });
    if (gstp1 && gstp1.activity === 'Baja') {
        recs.push({
            category: 'Detoxificación',
            icon: '🧬',
            title: 'Apoya tu sistema de detoxificación',
            message: 'Tu variante GSTP1 reduce la eliminación de toxinas ambientales. Aumenta crucíferas (brócoli, coliflor) que activan vías GST alternativas. Considera antioxidantes: vitamina C, glutatión reducido.'
        });
    }

    const comt = risks.find(function(r) { return r.gene === 'COMT'; });
    if (comt && comt.metabolism === 'Lento') {
        recs.push({
            category: 'Estrés y exposición química',
            icon: '🧠',
            title: 'Metabolismo COMT lento — gestión del estrés crónico',
            message: 'Tu variante COMT procesa más lentamente catecolaminas y xenoestrógenos. Minimiza plásticos (BPA), pesticidas y estrés sostenido. La meditación y el ejercicio moderado regulan tu dopamina de forma natural.'
        });
    }

    const as3mt = risks.find(function(r) { return r.gene === 'AS3MT'; });
    if (as3mt && (as3mt.efficiency === 'Baja' || as3mt.efficiency === 'Media')) {
        recs.push({
            category: 'Metilación del arsénico',
            icon: '💧',
            title: 'Optimiza tu dieta para metilar arsénico',
            message: 'Tu variante AS3MT afecta la metilación del arsénico inorgánico. Asegura ingesta adecuada de folatos, B12, metionina y colina. Evita agua sin filtrar en zonas mineras. Aumenta alimentos ricos en selenio (nueces de Brasil, mariscos).'
        });
    }

    const gc = risks.find(function(r) { return r.gene === 'GC'; });
    if (gc && gc.level === 'Bajo') {
        recs.push({
            category: 'Vitamina D y exposición solar',
            icon: '☀️',
            title: 'Optimiza la vitamina D a largo plazo',
            message: 'Tu variante GC reduce la proteína transportadora de vitamina D. Exponte moderadamente al sol (10-15 min diarios). Suplementa vitamina D3 con K2 (consulta médico). Monitorea niveles séricos 25-OH-D cada 6 meses.'
        });
    }

    const mc1r = risks.find(function(r) { return r.gene === 'MC1R'; });
    if (mc1r && mc1r.risk === 'ALTO') {
        recs.push({
            category: 'Protección UV crónica',
            icon: '🧴',
            title: 'Rutina diaria de fotoprotección',
            message: 'Tu variante MC1R aumenta sensibilidad al daño UV acumulado. Usa FPS 50+ todos los días (no solo en verano). Revisión dermatológica anual. Evita camas solares. Antioxidantes tópicos (vitamina C) protegen el ADN cutáneo.'
        });
    }

    if (air.pm25 > 25) {
        recs.push({
            category: 'Calidad del aire crónica',
            icon: '🌿',
            title: 'Estrategias para zona de contaminación moderada-alta',
            message: 'Vivir en zona con PM2.5 > 25 µg/m³ aumenta el riesgo cardiovascular y respiratorio a largo plazo. Considera purificador HEPA en dormitorio, plantas filtradoras (clorofito, pothos) y ejercicio preferentemente en interiores o mañanas tempranas.'
        });
    }

    return recs;
}
