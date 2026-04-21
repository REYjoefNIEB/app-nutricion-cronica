const translations = {
  es: {
    // Cabecera
    pageTitle:   "Escáner de Alimentos",
    pageSubtitle: "Apunta la cámara a un código de barras para analizar el producto.",

    // Botón principal
    btnActivate: "Escanear Código",
    btnScanning: "Apunta al código...",

    // Panel de estado
    panelTitle:      "Análisis de Interacción",
    panelEmpty:      "Esperando escaneo...",
    statusScanning:  "Cámara activa. Apunta al código de barras.",
    statusFetching:  "Buscando producto en la base de datos...",
    statusAnalyzing: "Analizando con NuraAI...",
    statusDone:      "Análisis completado.",

    // Tarjeta de resultado — semáforo
    riskDanger:  "PELIGRO",
    riskCaution: "PRECAUCIÓN",
    riskSafe:    "SEGURO",
    riskUnknown: "SIN DATOS",

    // Tarjeta de resultado — botones
    btnRegister: "Registrar Consumo",
    btnDiscard:  "Descartar",

    // Alertas y mensajes de error
    errorNoCamera:       "No se encontró una cámara disponible. Verifica los permisos del navegador e inténtalo de nuevo.",
    errorNetwork:        "Error de red al consultar la base de datos. Verifica tu conexión e inténtalo de nuevo.",
    errorProductNotFound:"Producto no encontrado. Puede que sea un producto local no registrado en la base de datos global.",
    noProfile:           "No se encontró perfil médico. Completa el Perfil Médico primero.",
    registerSuccess:     "Consumo de \"{name}\" registrado correctamente.",
    fallbackRecommendation: "No fue posible analizar el producto en este momento. Consulte a su médico o nutricionista antes de consumir."
  },
  en: {
    pageTitle:   "Food Scanner",
    pageSubtitle: "Point the camera at a barcode to analyze the product.",

    btnActivate: "Scan Barcode",
    btnScanning: "Point at barcode...",

    panelTitle:      "Interaction Analysis",
    panelEmpty:      "Waiting for scan...",
    statusScanning:  "Camera active. Point at the barcode.",
    statusFetching:  "Looking up product in database...",
    statusAnalyzing: "Analyzing with NuraAI...",
    statusDone:      "Analysis complete.",

    riskDanger:  "DANGER",
    riskCaution: "CAUTION",
    riskSafe:    "SAFE",
    riskUnknown: "NO DATA",

    btnRegister: "Log Consumption",
    btnDiscard:  "Discard",

    errorNoCamera:       "No camera found. Please check your browser permissions and try again.",
    errorNetwork:        "Network error while contacting the database. Check your connection and try again.",
    errorProductNotFound:"Product not found. It may be a local product not registered in the global database.",
    noProfile:           "No medical profile found. Please complete your Medical Profile first.",
    registerSuccess:     "Consumption of \"{name}\" logged successfully.",
    fallbackRecommendation: "Unable to analyze the product at this time. Please consult your doctor or nutritionist before consuming."
  }
};
