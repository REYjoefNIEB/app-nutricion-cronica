const fs = require('fs');

async function fetchChileanProducts() {
    console.log("📥 Iniciando descarga masiva de productos de Chile...");
    console.log("⏳ Conectando a la nueva API v2 de Open Food Facts...");
    
    // API v2: Más rápida, más estable y solo pedimos los campos que realmente necesitamos
    const url = "https://world.openfoodfacts.org/api/v2/search?countries_tags_en=chile&fields=code,product_name,product_name_es,nutrient_levels,ingredients_text,ingredients_text_es,allergens&page_size=1000";

    try {
        // Le decimos quiénes somos para que no nos bloqueen
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'NuraApp/1.0 - Proyecto MedTech Chile' 
            }
        });

        // Si el servidor nos manda una página de error, lo detectamos antes de que explote
        if (!response.ok) {
            throw new Error(`El servidor respondió con código de error: ${response.status}`);
        }

        const data = await response.json();

        if (data.products && data.products.length > 0) {
            console.log(`✅ ¡Éxito! Se descargaron ${data.products.length} productos chilenos reales.`);
            
            // Guardamos los productos en el archivo JSON
            fs.writeFileSync('chile_products.json', JSON.stringify(data.products, null, 2));
            console.log("💾 Archivo maestro guardado exitosamente como 'chile_products.json'");
        } else {
            console.log("⚠️ La conexión funcionó, pero no llegaron productos.");
        }

    } catch (error) {
        console.error("❌ Error de conexión:", error.message);
    }
}

// Ejecutar la función
fetchChileanProducts();