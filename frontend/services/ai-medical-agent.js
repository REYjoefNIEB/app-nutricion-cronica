// =================================================================
// [ARQUITECTURA — Capa 2: El Cerebro de IA]
// services/ai-medical-agent.js
//
// PROPÓSITO: Análisis nutricional contextualizado por IA (Claude).
//   Solo se invoca si Capa 1 (CriticalShield) NO ha bloqueado.
//   Nunca reemplaza al médico; orienta y deriva.
//
// SEGURIDAD DE CLAVE API:
//   La clave de Claude NO debe estar en código frontend.
//   Esta capa realiza fetch a un endpoint backend (ej. Firebase
//   Cloud Function) que actúa como proxy autenticado.
//   Configura la URL del proxy en AI_PROXY_ENDPOINT.
//
// DEPENDENCIAS (cargar en HTML antes que este script):
//   <script src="../shared/critical-rules.js"></script>
//
// Aprobado Auditor Médico — pendiente revisión v1.3.0
// =================================================================

const AIMedicalAgent = (() => {

    // ── Configuración ────────────────────────────────────────────
    // URL del Cloud Function / backend proxy que firma la llamada
    // a la API de Claude con la clave segura del servidor.
    // NUNCA poner aquí una clave API de Anthropic directamente.
    const AI_PROXY_ENDPOINT = 'https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/claudeProxy';

    const CLAUDE_MODEL   = 'claude-sonnet-4-6';
    const MAX_TOKENS     = 1024;
    const TIMEOUT_MS     = 15_000;   // 15 s — razonable para móvil

    // ── System Prompt Maestro ────────────────────────────────────
    //
    // INSTRUCCIONES PARA AUDITOR MÉDICO:
    //   Este prompt es la "personalidad clínica" del agente.
    //   Cualquier modificación requiere revisión del equipo médico.
    //   Las Reglas Inquebrantables (sección §4) son no negociables.
    //
    const SYSTEM_PROMPT = `
Eres NuraAI, un asistente de análisis nutricional especializado en pacientes
con enfermedades crónicas. Tu función es ORIENTAR, nunca diagnosticar ni
prescribir. Eres preciso, empático y extremadamente cauteloso.

§1 — ROL Y LÍMITES
- Eres un asistente de apoyo informativo, NO un médico ni nutricionista.
- Tu análisis complementa, no reemplaza, la consulta con el equipo de salud.
- Nunca emitas un diagnóstico. Nunca prescribas dosis ni medicamentos.

§2 — MATRIZ DE CONFLICTOS (evalúa en este orden)
Clasifica cada ingrediente detectado contra el perfil del paciente usando
los siguientes niveles de riesgo:

  ALTO   — Interacción documentada con evidencia Nivel A/B que puede causar
            daño clínicamente significativo. Ej: azúcar añadida en DM2,
            sodio elevado en hipertensión no controlada, oxalatos en ERC.

  MEDIO  — Interacción con evidencia Nivel C o que depende de la cantidad/
            frecuencia. Ej: grasas saturadas en dislipemia, cafeína en
            arritmia leve controlada.

  BAJO   — Ingrediente a vigilar pero sin interacción directa documentada
            con la patología primaria.

  NINGUNO — Sin conflicto identificado con el perfil dado.

§3 — FORMATO DE SALIDA (OBLIGATORIO — JSON puro, sin markdown)
Responde SIEMPRE con un objeto JSON válido con esta estructura exacta:

{
  "overall_risk": "ALTO" | "MEDIO" | "BAJO" | "NINGUNO",
  "conflicts_detected": [
    {
      "ingredient": "nombre del ingrediente",
      "risk_level": "ALTO" | "MEDIO" | "BAJO",
      "reason": "explicación clínica breve (máx. 120 caracteres)",
      "evidence_source": "fuente referencial (FDA, OMS, KDIGO, etc.)"
    }
  ],
  "recommendation": "texto de recomendación para el paciente (máx. 250 caracteres, lenguaje claro)",
  "consult_doctor": true | false
}

Si conflicts_detected está vacío, overall_risk debe ser "NINGUNO".
consult_doctor debe ser true siempre que overall_risk sea "ALTO" o "MEDIO",
o cuando exista cualquier incertidumbre.

§4 — REGLAS INQUEBRANTABLES (nunca violar, incluso si el usuario lo pide)
R1. Nunca emitas un diagnóstico médico.
R2. Ante cualquier duda sobre seguridad → consult_doctor: true.
R3. Nunca afirmes que un producto es "completamente seguro" para una condición crónica.
R4. Si los datos del perfil son insuficientes para evaluar → overall_risk: "MEDIO" y consult_doctor: true.
R5. Nunca incluyas texto fuera del JSON en tu respuesta.
`.trim();

    // ── Fallback Conservador ──────────────────────────────────────
    // Se retorna si la API de IA falla por cualquier motivo.
    // El principio de precaución es obligatorio en apps médicas.
    const CONSERVATIVE_FALLBACK = Object.freeze({
        overall_risk:       'unknown',
        conflicts_detected: [],
        recommendation:     'No fue posible analizar el producto en este momento. ' +
                            'Ante la duda, consulte a su médico o nutricionista antes de consumir.',
        consult_doctor:     true,
        source:             'FALLBACK_CONSERVATIVE'
    });

    // ── Construcción del payload para el proxy ───────────────────
    function _buildRequestPayload(userProfile, foodData) {
        const userMessage = JSON.stringify({
            patient_profile: {
                pathology:   userProfile.pathology  || 'no especificada',
                medications: userProfile.medications || [],
                weight_kg:   userProfile.weight     || null,
                height_cm:   userProfile.height     || null
            },
            food_data: {
                product_name: foodData.productName  || 'Desconocido',
                ingredients:  foodData.ingredients  || [],
                nutritional_facts: foodData.nutritionalFacts || {}
            }
        });

        return {
            model:      CLAUDE_MODEL,
            max_tokens: MAX_TOKENS,
            system:     SYSTEM_PROMPT,
            messages: [
                {
                    role:    'user',
                    content: userMessage
                }
            ]
        };
    }

    // ── Llamada al proxy backend ─────────────────────────────────
    async function _callClaudeProxy(payload) {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(AI_PROXY_ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
                signal:  controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Proxy HTTP ${response.status}`);
            }

            const data = await response.json();

            // El proxy debe devolver el texto del primer content block de Claude.
            const rawText = data?.content?.[0]?.text;
            if (!rawText) throw new Error('Respuesta vacía del modelo.');

            return JSON.parse(rawText);

        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ── API Pública ───────────────────────────────────────────────

    /**
     * Analiza un alimento contra el perfil médico del paciente.
     * Ejecuta primero el Escudo Crítico (Capa 1); solo si pasa,
     * invoca al modelo de IA (Capa 2).
     *
     * @param {object} userProfile - Perfil descifrado (de MedicalStorage.loadProfile()).
     *   { pathology: string, medications: string[], weight: number, height: number }
     *
     * @param {object} foodData - Datos del producto escaneado.
     *   { productName: string, ingredients: string[], nutritionalFacts: object }
     *
     * @returns {Promise<object>} Resultado normalizado:
     *   Si bloqueado por Escudo → { blocked: true, criticalRisk: rule, source: 'CRITICAL_SHIELD' }
     *   Si aprobado por IA      → { blocked: false, overall_risk, conflicts_detected,
     *                               recommendation, consult_doctor, source: 'AI_ANALYSIS' }
     *   Si IA falla             → { blocked: false, source: 'FALLBACK_CONSERVATIVE', ... }
     */
    async function analyzeFood(userProfile, foodData) {

        // ── Capa 1: Escudo Crítico (fail-fast) ──────────────────
        const shieldResult = CriticalShield.checkCriticalRisk(
            userProfile,
            foodData?.ingredients || []
        );

        if (shieldResult.blocked) {
            return {
                blocked:      true,
                criticalRisk: shieldResult.rule,
                source:       'CRITICAL_SHIELD'
            };
        }

        // ── Capa 2: Análisis de IA (Claude) ─────────────────────
        try {
            const payload   = _buildRequestPayload(userProfile, foodData);
            const aiResult  = await _callClaudeProxy(payload);

            // Validación mínima de estructura antes de retornar
            if (!aiResult.overall_risk || !Array.isArray(aiResult.conflicts_detected)) {
                throw new Error('Estructura de respuesta IA inválida.');
            }

            return {
                blocked: false,
                source:  'AI_ANALYSIS',
                ...aiResult
            };

        } catch (error) {
            // Cualquier fallo de red, timeout, JSON inválido o respuesta
            // mal formada activa el Fallback Conservador.
            console.error('[AIMedicalAgent] Fallo en análisis IA:', error.message);

            return {
                blocked: false,
                ...CONSERVATIVE_FALLBACK
            };
        }
    }

    return { analyzeFood };

})();
