// =================================================================
// [AGENTE 01 — Legal & Compliance] Contenido Legal Centralizado
// Cumplimiento: Ley 19.628 (Chile) · Principios GDPR (Europa)
// Versión: 1.2.0 — 2026-04-03 — Auditoría Corporativa Final
// =================================================================

/**
 * Versión de los términos legales vigentes.
 * Al incrementar este valor todos los usuarios existentes serán redirigidos
 * al onboarding para re-aceptar los términos actualizados.
 * MAJOR: cambios sustanciales (política, nuevos usos de datos).
 * MINOR: aclaraciones o nuevas cláusulas. PATCH: correcciones menores.
 */
const LEGAL_VERSION = "1.2.0";

const legalContent = {
  es: {
    // ── Consentimiento Informado ─────────────────────────────────
    consentSectionTitle: "Consentimiento Informado",

    // ── Aviso Médico ─────────────────────────────────────────────
    disclaimerTitle: "⚕️ Aviso Médico Importante",
    disclaimerText:
      "Nura es una herramienta de apoyo informativo y nutricional. " +
      "La información, recomendaciones y alertas generadas por esta aplicación " +
      "—incluyendo las asistidas por inteligencia artificial— NO constituyen " +
      "consejo médico, diagnóstico clínico ni prescripción de tratamiento. " +
      "Siempre consulta a un profesional de la salud calificado antes de tomar " +
      "cualquier decisión relacionada con tu salud. " +
      "En caso de emergencia médica, contacta de inmediato los servicios de " +
      "urgencia de tu localidad.\n\n" +
      "⚠️ Escudo Clínico: Las alertas generadas por Nura se basan en patrones " +
      "estadísticos y bases de datos de referencia que pueden no ser exhaustivas " +
      "ni estar actualizadas. No reemplazan la evaluación clínica individual " +
      "realizada por un profesional de la salud.",

    // ── Política de Privacidad ───────────────────────────────────
    privacyTitle: "🔒 Política de Privacidad",
    privacyText:
      "De acuerdo con la Ley N° 19.628 sobre Protección de la Vida Privada " +
      "(Chile) y los principios generales del GDPR (Europa):\n\n" +
      "• Responsable del tratamiento: Nura SpA, RUT [Pendiente], " +
      "Domicilio: Santiago, Chile. " +
      "Contacto DPO: privacidad@nura-app.com.\n" +
      "• Edad mínima: Esta aplicación está dirigida exclusivamente a mayores de " +
      "18 años. Si eres menor de edad, no debes registrarte.\n" +
      "• Datos recopilados: datos de salud (peso, talla, patología crónica) y " +
      "medicamentos registrados.\n" +
      "• Finalidad: personalizar tu experiencia nutricional y generar alertas de " +
      "interacción fármaco-alimento.\n" +
      "• Base legal: Consentimiento explícito e informado para el tratamiento de " +
      "datos sensibles, conforme al Art. 10 de la Ley 19.628.\n" +
      "• Minimización de datos: Nura aplica el principio de minimización de datos, " +
      "recolectando únicamente la información estrictamente necesaria.\n" +
      "• Transferencia internacional: Las transferencias a servidores en la nube " +
      "(ej. Firebase/Google LLC) se realizan bajo garantías adecuadas conforme a " +
      "estándares internacionales (ISO 27001).\n" +
      "• Seguridad: Tus datos se cifran con AES-GCM 256-bit en reposo y se " +
      "transmiten sobre HTTPS con autenticación Firebase. Se aplican controles de " +
      "acceso, autenticación segura y monitoreo continuo. Nura adopta buenas " +
      "prácticas inspiradas en marcos internacionales de protección de datos de salud.\n" +
      "• Conservación y eliminación: Tus datos se conservan mientras tu cuenta " +
      "esté activa y son eliminados definitivamente 30 días después de solicitar " +
      "la baja. Los datos podrán permanecer en respaldos temporales (backups) por " +
      "razones de seguridad operacional. Los datos previamente seudonimizados y " +
      "utilizados en modelos de IA no podrán ser eliminados de dichos modelos.\n" +
      "• Sucesión empresarial: En caso de venta, fusión o adquisición de Nura SpA, " +
      "los datos de los usuarios podrán ser transferidos bajo los mismos estándares " +
      "de confidencialidad aquí descritos.\n" +
      "• Derechos ARCOP: Tienes derecho de Acceso, Rectificación, Cancelación, " +
      "Oposición y Portabilidad (exportación en formato estructurado JSON/CSV). " +
      "Contáctanos en privacidad@nura-app.com.\n" +
      "• Notificación de brechas de seguridad: En caso de detectar una brecha " +
      "que afecte tus datos personales, serás notificado en un plazo razonable " +
      "conforme a la normativa vigente.",

    // ── Términos de Uso y Responsabilidad ───────────────────────
    termsTitle: "📋 Términos de Uso y Responsabilidad",
    termsText:
      "Al utilizar Nura, aceptas los siguientes términos:\n\n" +
      "• Limitación de responsabilidad: Nura no será responsable por decisiones " +
      "tomadas por el usuario basadas en la información proporcionada por la " +
      "aplicación. El usuario asume la responsabilidad de contrastar toda " +
      "información con un profesional de la salud.\n" +
      "• Jurisdicción: Cualquier controversia derivada del uso de Nura será " +
      "resuelta conforme a la legislación chilena y sometida a los tribunales " +
      "competentes de Santiago de Chile.\n" +
      "• Propiedad intelectual: El código, diseño, algoritmos y contenidos de " +
      "Nura son propiedad exclusiva de Nura SpA y están protegidos por la " +
      "legislación de propiedad intelectual vigente.\n" +
      "• Suspensión de cuentas: Nura SpA se reserva el derecho de suspender o " +
      "cancelar cuentas de usuarios que vulneren estos términos, sin perjuicio " +
      "de las acciones legales que correspondan.",

    // ── Uso de Datos para IA ─────────────────────────────────────
    aiTitle: "🤖 Uso de Datos para Investigación y Desarrollo de IA",
    aiText:
      "Si otorgas este consentimiento opcional, tus datos de salud serán " +
      "sometidos a un proceso de seudonimización bajo estándares de la industria " +
      "—disociando nombre, correo electrónico, UID y cualquier identificador " +
      "personal— antes de ser incorporados a conjuntos de datos de entrenamiento " +
      "del modelo de inteligencia artificial de Nura.\n\n" +
      "No se utilizan datos directamente identificables para el entrenamiento " +
      "de modelos de IA.\n\n" +
      "Este proceso cumple con los estándares ISO/IEC 29101 y los principios de " +
      "minimización de datos del GDPR. Tu participación es completamente " +
      "voluntaria; puedes retirar este consentimiento en cualquier momento desde " +
      "la configuración de tu cuenta, sin que ello afecte el uso normal de la " +
      "aplicación.\n\n" +
      "⚠️ Limitación técnica importante: Una vez que los datos seudonimizados " +
      "hayan sido incorporados a un modelo de IA ya entrenado, no es técnicamente " +
      "posible eliminarlos del modelo resultante. La retirada del consentimiento " +
      "impedirá el uso de tus datos en futuros ciclos de entrenamiento, pero no " +
      "afecta a los modelos previamente generados.",

    // ── Etiquetas y mensajes de UI ───────────────────────────────
    consentTermsLabel:
      "He leído y acepto el Aviso Médico, la Política de Privacidad y los " +
      "Términos de Uso. (Obligatorio)",
    consentAiLabel:
      "Acepto que mis datos, una vez seudonimizados bajo estándares de la " +
      "industria, sean utilizados para mejorar el modelo de IA de Nura, " +
      "entendiendo que no podrán eliminarse del modelo una vez entrenado. " +
      "(Opcional)",

    readMore: "Leer más ▾",
    readLess: "Leer menos ▴",

    errorTermsRequired:
      "Debes aceptar el Aviso Médico, la Política de Privacidad y los Términos " +
      "de Uso para continuar."
  },

  // ── English ──────────────────────────────────────────────────────
  en: {
    consentSectionTitle: "Informed Consent",

    disclaimerTitle: "⚕️ Important Medical Disclaimer",
    disclaimerText:
      "Nura is an informational and nutritional support tool. " +
      "The information, recommendations, and alerts generated by this application " +
      "— including those assisted by artificial intelligence — do NOT constitute " +
      "medical advice, clinical diagnosis, or treatment prescription. " +
      "Always consult a qualified healthcare professional before making any " +
      "health-related decision. " +
      "In case of a medical emergency, contact your local emergency services " +
      "immediately.\n\n" +
      "⚠️ Clinical Shield: Alerts generated by Nura are based on statistical " +
      "patterns and reference databases that may not be exhaustive or up to date. " +
      "They do not replace the individual clinical assessment of a healthcare " +
      "professional.",

    privacyTitle: "🔒 Privacy Policy",
    privacyText:
      "In accordance with Chile's Law No. 19.628 on Protection of Private Life " +
      "and the general principles of the GDPR (Europe):\n\n" +
      "• Data controller: Nura SpA, Tax ID [Pending], " +
      "Address: Santiago, Chile. " +
      "DPO Contact: privacidad@nura-app.com.\n" +
      "• Minimum age: This application is intended exclusively for users aged " +
      "18 and over. If you are a minor, you must not register.\n" +
      "• Data collected: health data (weight, height, chronic pathology) and " +
      "registered medications.\n" +
      "• Purpose: to personalize your nutritional experience and generate " +
      "drug-food interaction alerts.\n" +
      "• Legal basis: Explicit and informed consent for the processing of sensitive " +
      "data, pursuant to Art. 10 of Law 19.628.\n" +
      "• Data minimisation: Nura applies the data minimisation principle, " +
      "collecting only the information that is strictly necessary.\n" +
      "• International transfers: Transfers to cloud servers (e.g. Firebase/Google " +
      "LLC) are carried out under adequate safeguards in accordance with " +
      "international standards (ISO 27001).\n" +
      "• Security: Your data is encrypted with AES-GCM 256-bit at rest and " +
      "transmitted over HTTPS with Firebase authentication. Access controls, " +
      "secure authentication, and continuous monitoring are applied. Nura adopts " +
      "best practices inspired by international health data protection frameworks.\n" +
      "• Retention and deletion: Your data is retained while your account is active " +
      "and permanently deleted 30 days after you request account closure. Data may " +
      "remain in temporary backups for operational security reasons. Data that has " +
      "been pseudonymised and incorporated into AI models cannot be removed from " +
      "those models.\n" +
      "• Business succession: In the event of a sale, merger, or acquisition of " +
      "Nura SpA, user data may be transferred under the same confidentiality " +
      "standards described herein.\n" +
      "• ARCOP rights: You have the right of Access, Rectification, Cancellation, " +
      "Objection, and Portability (export in structured JSON/CSV format). " +
      "Contact us at privacidad@nura-app.com.\n" +
      "• Security breach notification: If a breach affecting your personal data is " +
      "detected, you will be notified within a reasonable timeframe in accordance " +
      "with applicable regulations.",

    termsTitle: "📋 Terms of Use and Liability",
    termsText:
      "By using Nura, you agree to the following terms:\n\n" +
      "• Limitation of liability: Nura shall not be liable for decisions made by " +
      "the user based on information provided by the application. The user is " +
      "responsible for verifying all information with a qualified healthcare " +
      "professional.\n" +
      "• Jurisdiction: Any dispute arising from the use of Nura will be resolved " +
      "in accordance with Chilean law and submitted to the competent courts of " +
      "Santiago, Chile.\n" +
      "• Intellectual property: The code, design, algorithms, and content of Nura " +
      "are the exclusive property of Nura SpA and are protected by applicable " +
      "intellectual property law.\n" +
      "• Account suspension: Nura SpA reserves the right to suspend or terminate " +
      "accounts of users who breach these terms, without prejudice to any legal " +
      "action that may apply.",

    aiTitle: "🤖 Use of Data for AI Research & Development",
    aiText:
      "If you grant this optional consent, your health data will undergo a " +
      "pseudonymisation process under industry standards — dissociating name, " +
      "email, UID, and any personal identifier — before being incorporated into " +
      "Nura's AI model training datasets.\n\n" +
      "No directly identifiable data is used for AI model training.\n\n" +
      "This process complies with ISO/IEC 29101 standards and GDPR data " +
      "minimisation principles. Your participation is completely voluntary; " +
      "you may withdraw this consent at any time from your account settings, " +
      "without affecting your normal use of the application.\n\n" +
      "⚠️ Important technical limitation: Once pseudonymised data has been " +
      "incorporated into a trained AI model, it is not technically possible to " +
      "remove it from the resulting model. Withdrawing consent will prevent your " +
      "data from being used in future training cycles, but does not affect " +
      "previously generated models.",

    consentTermsLabel:
      "I have read and accept the Medical Disclaimer, the Privacy Policy, and " +
      "the Terms of Use. (Required)",
    consentAiLabel:
      "I consent to my data being pseudonymised under industry standards and " +
      "used to improve Nura's AI model, understanding that it cannot be removed " +
      "from the model once trained. (Optional)",

    readMore: "Read more ▾",
    readLess: "Read less ▴",

    errorTermsRequired:
      "You must accept the Medical Disclaimer, the Privacy Policy, and the " +
      "Terms of Use to continue."
  }
};
