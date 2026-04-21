const fs = require('fs');

// ---------------------------------------------------------
// 1. EL DICCIONARIO CLÍNICO MAESTRO
// ---------------------------------------------------------
const clinicalRules = {
    diabetes_t2: {
        reglas: [
            { feature_sello: 'sugars', limite: 'high', severidad: 'critico', motivo: 'Sello ALTO EN AZÚCARES.' },
            { feature_ingrediente: ['azucar', 'jarabe', 'fructosa', 'glucosa', 'maltodextrina'], severidad: 'critico', motivo: 'Azúcares añadidos.' },
            { feature_ingrediente: ['aspartamo', 'sucralosa', 'sacarina', 'acesulfamo'], severidad: 'moderado', motivo: 'Edulcorantes (precaución).' }
        ]
    },
    hipertension: {
        reglas: [
            { feature_sello: 'salt', limite: 'high', severidad: 'critico', motivo: 'Sello ALTO EN SODIO.' },
            { feature_sello: 'salt', limite: 'moderate', severidad: 'moderado', motivo: 'Sodio medio.' }
        ]
    },
    dislipidemia: { 
        reglas: [
            { feature_sello: 'saturated-fat', limite: 'high', severidad: 'critico', motivo: 'Sello ALTO EN GRASAS SATURADAS.' },
            { feature_sello: 'fat', limite: 'high', severidad: 'moderado', motivo: 'Alto en grasas.' },
            { feature_ingrediente: ['aceite de palma', 'manteca', 'grasa hidrogenada'], severidad: 'critico', motivo: 'Grasas nocivas.' }
        ]
    },
    celiaquia: {
        reglas: [
            { feature_alergeno: ['gluten', 'trigo', 'cebada', 'centeno'], severidad: 'critico', motivo: 'Contiene Gluten.' },
            { feature_ingrediente: ['trigo', 'cebada', 'centeno', 'malta'], severidad: 'critico', motivo: 'Cereales con gluten.' },
            { feature_ingrediente: ['avena'], severidad: 'moderado', motivo: 'Avena (Verificar certificación).' }
        ]
    },
    intolerancia_lactosa: {
        reglas: [
            { feature_alergeno: ['milk', 'leche', 'lait', 'lactosa'], severidad: 'critico', motivo: 'Lácteos.' },
            { feature_ingrediente: ['leche', 'lactosa', 'suero', 'caseinato'], severidad: 'critico', motivo: 'Derivados lácteos.' }
        ]
    }
};

// Utilidad para limpiar textos
const normalizeText = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ---------------------------------------------------------
// 2. LA FUNCIÓN EVALUADORA (Evalúa 1 producto contra TODAS las enfermedades)
// ---------------------------------------------------------
function evaluateProduct(product) {
    const name = product.product_name_es || product.product_name || 'Desconocido';
    const hasNutrients = product.nutrient_levels && Object.keys(product.nutrient_levels).length > 0;
    const hasIngredients = !!(product.ingredients_text_es || product.ingredients_text);
    
    // Objeto final que guardaremos en la base de datos para este producto
    let finalEvaluation = {
        nombre: name,
        evaluaciones: {} // Aquí guardaremos el resultado por cada enfermedad
    };

    // Filtro de basura
    if (!hasNutrients && !hasIngredients) {
        finalEvaluation.global_risk = "unknown";
        return finalEvaluation;
    }

    const ingredientsText = normalizeText(product.ingredients_text_es || product.ingredients_text || '');
    const allergensText = normalizeText(product.allergens || '');
    const nutrientLevels = product.nutrient_levels || {};

    // Evaluamos cada enfermedad de nuestro diccionario
    for (const [patologia, config] of Object.entries(clinicalRules)) {
        let severidadFinal = 'seguro';
        const motivosRiesgo = new Set();

        for (const regla of config.reglas) {
            let match = false;

            if (regla.feature_sello && nutrientLevels[regla.feature_sello] === regla.limite) {
                match = true;
            } else if (regla.feature_alergeno && regla.feature_alergeno.some(a => allergensText.includes(a))) {
                match = true;
            } else if (regla.feature_ingrediente) {
                match = regla.feature_ingrediente.some(keyword => {
                    const kw = normalizeText(keyword);
                    const regex = new RegExp(`\\b${kw}\\b`, 'i');
                    return regex.test(ingredientsText);
                });
            }

            if (match) {
                motivosRiesgo.add(regla.motivo);
                if (regla.severidad === 'critico') severidadFinal = 'critico';
                else if (regla.severidad === 'moderado' && severidadFinal !== 'critico') severidadFinal = 'moderado';
            }
        }

        // Guardamos el resultado para esta enfermedad específica
        finalEvaluation.evaluaciones[patologia] = {
            risk: severidadFinal === 'critico' ? 'high' : (severidadFinal === 'moderado' ? 'medium' : 'low'),
            message: severidadFinal === 'seguro' ? 'Seguro según etiqueta.' : Array.from(motivosRiesgo).join(' ')
        };
    }

    return finalEvaluation;
}

// ---------------------------------------------------------
// 3. PROCESAMIENTO BATCH MASIVO (DATOS REALES)
// ---------------------------------------------------------
console.log("🚀 Iniciando Motor de Evaluación Batch (Datos Reales)...");

try {
    // 1. Leer los productos descargados de Open Food Facts
    console.log("📖 Leyendo archivo chile_products.json...");
    const rawData = fs.readFileSync('chile_products.json', 'utf-8');
    const productosReales = JSON.parse(rawData);

    console.log(`📦 Cruzando ${productosReales.length} productos contra las reglas médicas...`);

    const resultadosFinales = {};
    let procesados = 0;
    let ignorados = 0;

    // 2. Evaluar cada producto a la velocidad de la luz
    productosReales.forEach(prod => {
        // Obtenemos el código de barras real
        const barcode = prod.code || prod.id || prod._id;
        if (!barcode) return; // Si no tiene código de barras, no nos sirve

        const evaluacion = evaluateProduct(prod);

        // Solo guardamos en nuestra Tabla Maestra los que tienen datos útiles
        if (evaluacion.global_risk !== "unknown") {
            resultadosFinales[barcode] = evaluacion;
            procesados++;
        } else {
            ignorados++; // Llevamos cuenta de los productos "fantasma"
        }
    });

    // 3. Guardar la Tabla Maestra Definitiva
    fs.writeFileSync('nura_database.json', JSON.stringify(resultadosFinales, null, 2));

    console.log(`\n✅ ¡Batch completado con éxito!`);
    console.log(`📊 Productos procesados e indexados: ${procesados}`);
    console.log(`👻 Productos ignorados (sin datos nutricionales): ${ignorados}`);
    console.log(`💾 Tu base de datos inteligente se guardó como: 'nura_database.json'`);

} catch (error) {
    console.error("❌ Error procesando los archivos:", error.message);
    console.log("💡 Asegúrate de que el archivo 'chile_products.json' esté en esta misma carpeta.");
}