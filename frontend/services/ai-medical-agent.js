// =================================================================
// [ARQUITECTURA — Capa 2: El Cerebro de IA]
// services/ai-medical-agent.js
//
// PROPÓSITO: Análisis nutricional vía Motor Nura V2 (reglas clínicas en backend)
//   y escudo crítico local. La Cloud Function prioriza nura_db + evaluación
//   determinística; solo se invoca Capa 1 (CriticalShield) antes del motor.
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

var AIMedicalAgent = (() => {

    // ── Configuración ────────────────────────────────────────────
    var AI_PROXY_ENDPOINT = 'https://scanbarcode-45ippmos6q-uc.a.run.app';
    var _agentFsApi = null; // caché del SDK Firestore (carga lazy)
    // Tras deploy, sustituye la URL en código o define window.NURA_SEARCH_FOOD_URL en el HTML antes de este script.
    var SEARCH_FOOD_TEXT_ENDPOINT =
        (typeof window !== 'undefined' && window.NURA_SEARCH_FOOD_URL) ||
        'https://searchfoodtext-45ippmos6q-uc.a.run.app';
    var SUGGEST_ALTERNATIVES_ENDPOINT =
        (typeof window !== 'undefined' && window.NURA_SUGGEST_ALTERNATIVES_URL) ||
        'https://us-central1-nura-33fc1.cloudfunctions.net/suggestAlternatives';
    var TIMEOUT_MS = 15000;   // 15 s — razonable para móvil

    /**
     * Enriquece pathology (texto) con ids de enfermedades[] para que CriticalShield
     * detecte celiaquía, ERC, etc. cuando solo viene el arreglo del onboarding.
     */
    function _augmentProfileForShield(profile) {
        if (!profile || typeof profile !== 'object') return profile;
        var copy = Object.assign({}, profile);
        var pathology = copy.pathology ? String(copy.pathology) : '';
        var ids = Array.isArray(copy.enfermedades) ? copy.enfermedades : [];
        var extra = ids.filter(function (id) { return id && id !== 'none'; })
            .map(function (id) { return String(id).replace(/_/g, ' '); })
            .join(' ');
        copy.pathology = [pathology, extra].filter(Boolean).join(' ').trim();
        return copy;
    }

    // ── Fallback Conservador ──────────────────────────────────────
    var CONSERVATIVE_FALLBACK = Object.freeze({
        overall_risk:       'unknown',
        conflicts_detected: [],
        recommendation:     'No fue posible analizar el producto en este momento. ' +
                            'Ante la duda, consulte a su médico o nutricionista antes de consumir.',
        consult_doctor:     true,
        source:             'FALLBACK_CONSERVATIVE'
    });

    // ── [ESCUDO FARMACOLÓGICO — FIX NUCLEAR] ───────────────────────────────
    // Construye el objeto userProfile que se envía en el body JSON del fetch.
    // medicamentos[] se lee de window.NuraMedSelector.getSelected() EN EL MOMENTO
    // del fetch — nunca de un caché AES-GCM que puede estar desactualizado.
    // ────────────────────────────────────────────────────────────────────────
    function _buildUserProfilePayload(userProfile) {
        var base = userProfile && typeof userProfile === 'object' ? userProfile : {};

        // Enfermedades: del perfil (ya normalizado por _normalizeProfileForMotor)
        var enfermedades = Array.isArray(base.enfermedades) ? base.enfermedades : [];
        if (enfermedades.length === 0 && base.pathology && base.pathology !== 'none') {
            enfermedades = [base.pathology];
        }

        // Medicamentos: SIEMPRE desde el selector UI en tiempo real
        var meds = [];
        if (window.NuraMedSelector && typeof window.NuraMedSelector.getSelected === 'function') {
            meds = window.NuraMedSelector.getSelected();
        } else if (Array.isArray(base.medicamentos)) {
            meds = base.medicamentos;
        }

        return {
            weight:       base.weight       || null,
            height:       base.height       || null,
            pathology:    base.pathology    || '',
            enfermedades: enfermedades,
            medicamentos: meds,
            birthdate:    base.birthdate    || null
        };
    }

    // ── Llamada al proxy backend (scanBarcode) ────────────────────
    async function _callClaudeProxy(userProfile, foodData) {
        var controller = new AbortController();
        var timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            // Construir payload limpio con medicamentos[] en tiempo real
            var profilePayload = _buildUserProfilePayload(userProfile);
            // [FIX PAYLOAD] Re-leer del selector en el momento exacto del fetch,
            // ignorando cualquier valor cacheado que pueda traer userProfile.
            profilePayload.medicamentos = (window.NuraMedSelector && typeof window.NuraMedSelector.getSelected === 'function')
                ? window.NuraMedSelector.getSelected()
                : (profilePayload.medicamentos || []);
            var bodyPayload = {
                barcode:     foodData.barcode,
                userProfile: profilePayload,
                foodData:    foodData
            };

            // Log EXACTO de lo que va al backend — puede verificarse en Network tab
            console.log('[AIMedicalAgent][scanBarcode] userProfile enviado:', JSON.stringify(profilePayload));

            var response = await fetch(AI_PROXY_ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(bodyPayload),
                signal:  controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Proxy HTTP ' + response.status);
            }

            var data = await response.json();

            if (data.status !== 'success' || !data.datos) {
                throw new Error('Formato de respuesta incorrecto desde Nura DB.');
            }

            console.log('⚡ Fuente de la evaluación: ' + data.fuente);
            return data.datos;

        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Mapea la respuesta cruda del motor (datos) al objeto de análisis de la UI.
     */
    function _mapMotorDatosToAnalysis(aiResult, fuenteServidor) {
        var conflicts = [];
        // [FIX RENDERIZADO] Leer global_risk SIEMPRE del resultado del motor,
        // antes de iterar details, para que nunca quede en 'low' por defecto
        // cuando solo hay interacciones farmacológicas sin patologías comunes.
        var maxRisk = (aiResult && aiResult.global_risk) ? aiResult.global_risk : 'low';

        if (aiResult.details && Array.isArray(aiResult.details)) {
            for (var i = 0; i < aiResult.details.length; i++) {
                var detalle = aiResult.details[i];

                // ── [ESCUDO FARMACOLÓGICO] Alertas de interacción fármaco-alimento ──
                // Estos objetos vienen con tipo === 'interaccion_farmacologica'.
                // NO deben ser bloqueados por ningún condicional: se imprimen siempre.
                var tipo = detalle.tipo || '';
                if (tipo === 'interaccion_farmacologica') {
                    var farmaco = String(detalle.patologia_id || 'FÁRMACO')
                        .replace(/^farm_/, '').replace(/_/g, ' ').toUpperCase();
                    var motivoF = detalle.motivo || (Array.isArray(detalle.motivos)
                        ? detalle.motivos.join('. ') : '');
                    if (!motivoF) motivoF = 'Interacción detectada entre este fármaco y el alimento.';

                    // ── Ventana de Seguridad Temporal ──────────────────────────────
                    // Si el frontend calculó hora_segura (última toma encontrada en calendario):
                    var ventanaMsg = '';
                    if (detalle.hora_segura) {
                        var horaSegura = new Date(detalle.hora_segura);
                        var horaStr = horaSegura.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                        if (detalle.ventana_activa) {
                            // Aún dentro de la ventana de riesgo: mostrar hora segura exacta
                            ventanaMsg = ' ⏰ Podrás consumir este producto a partir de las ' + horaStr + '.';
                        }
                        // Si la ventana ya pasó: solo mostrar la regla general
                    } else if (detalle.ventana_texto) {
                        // Sin alarmas configuradas: mostrar regla estática de los prospectos
                        ventanaMsg = ' ℹ️ ' + detalle.ventana_texto;
                    }
                    // ────────────────────────────────────────────────────────────────

                    conflicts.push('💊 INTERACCIÓN FARMACOLÓGICA — ' + farmaco + ': ' + motivoF + ventanaMsg);
                    continue;
                }

                // ── Alertas de patología (comportamiento original) ──────────────
                var pKey = detalle.patologia || detalle.patologia_nombre || detalle.patologia_id || 'PATOLOGÍA';
                var nombrePatologia = String(pKey).replace(/_/g, ' ').toUpperCase();

                var textoMotivo = detalle.motivo;
                if (!textoMotivo && detalle.motivos && Array.isArray(detalle.motivos)) {
                    textoMotivo = detalle.motivos.join('. ');
                }
                if (!textoMotivo) {
                    textoMotivo = 'Riesgo detectado para esta patología.';
                }

                conflicts.push('Alerta ' + nombrePatologia + ': ' + textoMotivo);
            }
        }

        if (!aiResult || !aiResult.global_risk) {
            throw new Error('Estructura de respuesta inválida desde el servidor.');
        }

        var recommendation;
        if (conflicts.length > 0) {
            // Diferenciar si hay alertas farmacológicas específicas
            var hayFarma = conflicts.some(function (c) { return c.indexOf('💊') === 0; });
            if (hayFarma) {
                recommendation = 'El motor clínico Nura detectó interacciones farmacológicas activas para tu perfil. Consulta a tu médico antes de consumir:';
            } else {
                recommendation = 'Según el motor clínico Nura, hay alertas activas para su perfil. Revise el detalle:';
            }
        } else if (maxRisk === 'high') {
            recommendation = 'Alto riesgo clínico según las reglas configuradas en el motor Nura. Evite su consumo y consulte a su equipo de salud.';
        } else if (maxRisk === 'medium') {
            recommendation = 'Precaución: posible conflicto con su perfil según las reglas clínicas. Revise la etiqueta y consulte a su equipo de salud si tiene dudas.';
        } else {
            recommendation = 'No se activaron alertas prioritarias del motor clínico para su perfil y los datos del producto. Mantenga siempre las indicaciones de su médico o nutricionista.';
        }

        return {
            blocked: false,
            source: aiResult.fuente || fuenteServidor || 'NURA_ENGINE_V2',
            overall_risk: maxRisk,
            conflicts_detected: conflicts,
            recommendation: recommendation,
            consult_doctor: maxRisk === 'high' || maxRisk === 'medium'
        };
    }


    // ── API Pública ───────────────────────────────────────────────
    async function analyzeFood(userProfile, foodData) {
        // ── Capa 1: Escudo Crítico (fail-fast) ──────────────────
        // Sintaxis antigua y segura en lugar de ?.
        var ingredientes = (foodData && foodData.ingredients) ? foodData.ingredients : [];
        var shieldResult = CriticalShield.checkCriticalRisk(
            _augmentProfileForShield(userProfile),
            ingredientes
        );

        if (shieldResult.blocked) {
            return {
                blocked:      true,
                criticalRisk: shieldResult.rule,
                source:       'CRITICAL_SHIELD'
            };
        }

        // ── Capa 2: Análisis (Motor Nura V2) ─────────────────────
        try {
            var aiResult = await _callClaudeProxy(userProfile, foodData);
            // ── Ventanas Temporales: enriquecer con última toma del calendario ──
            await _enrichWithTemporalWindows(aiResult);
            return _mapMotorDatosToAnalysis(aiResult, null);

        } catch (error) {
            console.error('[AIMedicalAgent] Fallo en análisis V2: ' + error.message);
            return {
                blocked: false,
                overall_risk: CONSERVATIVE_FALLBACK.overall_risk,
                conflicts_detected: CONSERVATIVE_FALLBACK.conflicts_detected,
                recommendation: CONSERVATIVE_FALLBACK.recommendation,
                consult_doctor: CONSERVATIVE_FALLBACK.consult_doctor,
                source: CONSERVATIVE_FALLBACK.source
            };
        }
    }

    /**
     * Búsqueda por texto: Cloud Function hace OFF + motor; aquí solo escudo crítico y mapeo UI.
     * @returns {{ foodData: object, analysis: object }}
     */
    async function analyzeFoodByTextQuery(userProfile, textQuery) {
        var q = String(textQuery || '').trim();
        var emptyFood = {
            productName: q || '—',
            imageUrl: '',
            ingredients: [],
            sellos: []
        };

        if (!q) {
            return {
                foodData: emptyFood,
                analysis: {
                    blocked: false,
                    overall_risk: 'unknown',
                    recommendation: 'Escribe un término de búsqueda.',
                    consult_doctor: false,
                    source: 'CLIENT_VALIDATION'
                }
            };
        }

        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

        try {
            // Construir payload con medicamentos[] frescos del selector UI
            var profilePayload = _buildUserProfilePayload(userProfile);
            // [FIX PAYLOAD] Re-leer del selector en el momento exacto del fetch,
            // ignorando cualquier valor cacheado que pueda traer userProfile.
            profilePayload.medicamentos = (window.NuraMedSelector && typeof window.NuraMedSelector.getSelected === 'function')
                ? window.NuraMedSelector.getSelected()
                : (profilePayload.medicamentos || []);
            var textBody = { query: q, userProfile: profilePayload };

            // Log EXACTO — verificable en Network > Payload
            console.log('[AIMedicalAgent][searchFoodText] userProfile enviado:', JSON.stringify(profilePayload));

            var response = await fetch(SEARCH_FOOD_TEXT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(textBody),
                signal: controller.signal
            });

            var data = await response.json().catch(function () { return {}; });

            if (!response.ok) {
                throw new Error('searchFoodText HTTP ' + response.status);
            }

            // Manejo de error controlado del backend (ej: Open Food Facts 503)
            if (data.success === false) {
                if (data.message) alert(data.message);
                return {
                    foodData: emptyFood,
                    analysis: {
                        blocked: false,
                        overall_risk: 'unknown',
                        recommendation: data.message || 'La base de datos global de alimentos está en mantenimiento.',
                        consult_doctor: true,
                        source: data.errorType || 'EXTERNAL_API_DOWN'
                    }
                };
            }

            if (data.status === 'not_found') {
                return {
                    foodData: emptyFood,
                    analysis: {
                        blocked: false,
                        overall_risk: 'unknown',
                        recommendation: data.error ||
                            'No encontramos una ficha coincidente. Prueba otro nombre o escanea el código.',
                        consult_doctor: false,
                        source: 'OFF_NOT_FOUND'
                    }
                };
            }

            if (data.status === 'error') {
                throw new Error(data.error || 'Error en búsqueda');
            }

            if (data.status !== 'success' || !data.foodData || !data.datos) {
                throw new Error('Respuesta inválida del servidor de búsqueda.');
            }

            var foodData = data.foodData;
            var ingredientes = foodData.ingredients || [];
            var shieldResult = CriticalShield.checkCriticalRisk(
                _augmentProfileForShield(userProfile),
                ingredientes
            );

            if (shieldResult.blocked) {
                return {
                    foodData: foodData,
                    analysis: {
                        blocked: true,
                        criticalRisk: shieldResult.rule,
                        source: 'CRITICAL_SHIELD'
                    }
                };
            }

            // ── Ventanas Temporales: enriquecer con última toma del calendario ──
            await _enrichWithTemporalWindows(data.datos);
            var analysis = _mapMotorDatosToAnalysis(data.datos, data.fuente);
            return { foodData: foodData, analysis: analysis };
        } catch (err) {
            console.error('[AIMedicalAgent] analyzeFoodByTextQuery: ' + err.message);
            return {
                foodData: emptyFood,
                analysis: {
                    blocked: false,
                    overall_risk: CONSERVATIVE_FALLBACK.overall_risk,
                    conflicts_detected: CONSERVATIVE_FALLBACK.conflicts_detected,
                    recommendation: 'No se pudo completar la búsqueda o el análisis. ' +
                        'Verifica tu conexión o intenta de nuevo. ' + CONSERVATIVE_FALLBACK.recommendation,
                    consult_doctor: CONSERVATIVE_FALLBACK.consult_doctor,
                    source: CONSERVATIVE_FALLBACK.source
                }
            };
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // =================================================================
    // VENTANAS DE SEGURIDAD TEMPORAL
    // Enriquece los detalles farmacológicos del motor con la hora exacta
    // de la última toma registrada en el Calendario de Salud del usuario.
    // Si no hay alarmas configuradas, muestra la regla estática del prospecto.
    // =================================================================

    /**
     * Carga lazy del SDK Firestore — mismo patrón que calendar.js.
     */
    async function _getFirestoreApiForAgent() {
        if (_agentFsApi) return _agentFsApi;
        _agentFsApi = await import(
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
        );
        return _agentFsApi;
    }

    /**
     * Busca el evento de medicamento más reciente en calendar_events que
     * coincida con el nombre normalizado del fármaco (medNorm).
     *
     * Coincidencia: el título del evento contiene el id del fármaco
     *   ej: titulo "Ciprofloxacino 500mg" ↔ medNorm "ciprofloxacino" ✓
     *
     * @param {string} medNorm  - Clave del fármaco en clinical-rules (sin acentos, minúsculas)
     * @param {string} uid      - UID del usuario autenticado
     * @returns {object|null}   - Evento más reciente o null
     */
    async function _getLastMedDose(medNorm, uid) {
        try {
            var api = await _getFirestoreApiForAgent();
            var db  = window.NuraFirebase.db;
            var ref  = api.collection(db, 'calendar_events', uid, 'events');
            var snap = await api.getDocs(ref);

            var _normalize = function (s) {
                return String(s || '').toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            };
            var medKey = _normalize(medNorm);

            var medEvents = [];
            snap.forEach(function (docSnap) {
                var ev = docSnap.data();
                if (ev.tipo !== 'medicamento' || !ev.fecha) return;
                var titulo = _normalize(ev.titulo);
                // Coincidencia: título contiene la clave del fármaco
                if (titulo.indexOf(medKey) !== -1) {
                    medEvents.push(ev);
                }
            });

            if (medEvents.length === 0) return null;

            // Ordenar por fecha descendente — tomar la más reciente
            medEvents.sort(function (a, b) {
                return new Date(b.fecha) - new Date(a.fecha);
            });
            return medEvents[0];

        } catch (e) {
            console.warn('[AIMedicalAgent] _getLastMedDose:', e.message);
            return null;
        }
    }

    /**
     * Enriquece in-place los detalles farmacológicos de aiResult que tengan
     * ventana_horas, añadiendo hora_segura y ventana_activa cuando hay
     * alarmas de medicamentos registradas en el calendario del usuario.
     *
     * @param {object} aiResult - Resultado del motor Nura V2 (mutado in-place)
     */
    async function _enrichWithTemporalWindows(aiResult) {
        if (!aiResult || !Array.isArray(aiResult.details)) return;

        var temporalDetails = aiResult.details.filter(function (d) {
            return d.tipo === 'interaccion_farmacologica' && d.ventana_horas != null;
        });
        if (temporalDetails.length === 0) return;

        // Necesitamos al usuario para leer su calendario
        var firebase = window.NuraFirebase;
        if (!firebase || !firebase.auth) return;
        var user = firebase.auth.currentUser;
        if (!user) return;

        var now = new Date();

        for (var i = 0; i < temporalDetails.length; i++) {
            var detail = temporalDetails[i];
            var lastDose = await _getLastMedDose(detail.farmaco || '', user.uid);
            if (!lastDose) continue; // sin alarmas → fallback a ventana_texto estático

            var lastDoseTime = new Date(lastDose.fecha);
            var ventanaMs    = detail.ventana_horas * 60 * 60 * 1000;
            var horaSegura   = new Date(lastDoseTime.getTime() + ventanaMs);

            detail.ultima_toma   = lastDoseTime.toISOString();
            detail.hora_segura   = horaSegura.toISOString();
            detail.ventana_activa = now < horaSegura; // true = aún en ventana de riesgo
        }
    }

    /**
     * Solicita al backend 3 alternativas seguras para un alimento bloqueado.
     * Usa caché en Firestore (vía Cloud Function).
     *
     * @param {string}   comidaBloqueada  - Nombre del alimento bloqueado
     * @param {string[]} motivosBloqueo   - Lista de motivos clínicos del bloqueo
     * @param {object}   userProfile      - Perfil del paciente
     * @returns {Promise<Array<{nombre: string, razon_seguridad: string}>>}
     */
    async function suggestAlternatives(comidaBloqueada, motivosBloqueo, userProfile) {
        var controller = new AbortController();
        var timeoutId  = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
        try {
            var profilePayload = _buildUserProfilePayload(userProfile);
            var response = await fetch(SUGGEST_ALTERNATIVES_ENDPOINT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    comidaBloqueada: comidaBloqueada,
                    motivosBloqueo:  motivosBloqueo,
                    userProfile:     profilePayload
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('suggestAlternatives HTTP ' + response.status);
            var data = await response.json();
            if (data.status !== 'success' || !Array.isArray(data.alternatives)) {
                throw new Error('Respuesta inválida desde suggestAlternatives');
            }
            return data.alternatives;
        } catch (err) {
            console.error('[AIMedicalAgent] suggestAlternatives: ' + err.message);
            return [];
        } finally {
            clearTimeout(timeoutId);
        }
    }

    return {
        analyzeFood:          analyzeFood,
        analyzeFoodByTextQuery: analyzeFoodByTextQuery,
        suggestAlternatives:  suggestAlternatives
    };

})();