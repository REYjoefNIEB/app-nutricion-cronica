// =================================================================
// [LÓGICO BACKEND] dashboard/scanner.js
// Widget de escaneo de código de barras integrado al Dashboard.
//
// Flujo:
//   Botón "Escanear Código"
//   → getCameras() → selector dinámico si hay >1 cámara
//   → Html5Qrcode con deviceId elegido
//   → OpenFoodFacts API → AIMedicalAgent.analyzeFood()
//   → Renderizado en #scan-result-card con #traffic-light
//
// Dependencias: html5-qrcode CDN, storage.js, critical-rules.js,
//               ai-medical-agent.js
// =================================================================

(function () {

    const RISK_TO_LIGHT = {
        'ALTO':    { cls: 'red',    label: 'Peligro — No Consumir'  },
        'MEDIO':   { cls: 'yellow', label: 'Precaución Media'        },
        'BAJO':    { cls: 'green',  label: 'Seguro para tu Perfil'   },
        'NINGUNO': { cls: 'green',  label: 'Sin Conflictos'          },
        'unknown': { cls: 'yellow', label: 'Sin Datos Suficientes'   }
    };

    // Referencias guardadas al iniciar para evitar getElementById repetidos
    let _scanner    = null;
    let _isScanning = false;
    let _btnEl      = null;
    let _readerDiv  = null;

    // ── OpenFoodFacts ─────────────────────────────────────────────
    async function _fetchFoodByBarcode(barcode) {
        const res = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
        );
        if (!res.ok) throw new Error(`OpenFoodFacts HTTP ${res.status}`);
        const data = await res.json();
        if (data.status !== 1) return null;

        const p = data.product;
        const n = p.nutriments || {};
        const rawText = p.ingredients_text_es || p.ingredients_text || '';
        const sellos = [];
        if (p.nutrition_grade_fr) sellos.push(String(p.nutrition_grade_fr));
        if (p.labels_tags && Array.isArray(p.labels_tags)) {
            p.labels_tags.forEach(tag => { if (tag) sellos.push(String(tag).replace(/^..:/, '')); });
        }
        return {
            barcode:         String(barcode),
            productName:     p.product_name_es || p.product_name || 'Producto sin nombre',
            imageUrl:        p.image_front_url  || p.image_url    || '',
            ingredientsText: rawText,
            ingredients:     rawText.split(/[,;()\n]/).map(s => s.trim()).filter(s => s.length > 1),
            sellos:          sellos,
            nutritionalFacts: {
                sodium_100g:        n['sodium_100g']        ?? null,
                sugars_100g:        n['sugars_100g']        ?? null,
                fat_100g:           n['fat_100g']            ?? null,
                carbohydrates_100g: n['carbohydrates_100g'] ?? null
            }
        };
    }

    // ── Selector de cámaras ───────────────────────────────────────

    /**
     * Inyecta un <select> encima del visor con las cámaras disponibles.
     * El change del select detiene la cámara actual y reinicia con el
     * deviceId elegido.
     */
    function _injectCameraSelect(cameras, defaultId) {
        _removeCameraSelect();

        const wrapper     = document.createElement('div');
        wrapper.id        = 'camera-select-wrapper';
        wrapper.className = 'camera-select-wrapper';

        const label       = document.createElement('label');
        label.htmlFor     = 'camera-select';
        label.className   = 'camera-select-label';
        label.textContent = 'Cámara:';

        const select      = document.createElement('select');
        select.id         = 'camera-select';
        select.className  = 'camera-select';

        cameras.forEach(cam => {
            const opt       = document.createElement('option');
            opt.value       = cam.id;
            opt.textContent = cam.label || `Cámara ${cam.id.slice(-4)}`;
            if (cam.id === defaultId) opt.selected = true;
            select.appendChild(opt);
        });

        // Al cambiar de cámara: detener la actual y reiniciar con la nueva
        select.addEventListener('change', async () => {
            _removeErrorMsg();
            await _stopScanner(/* keepSelect= */ true);
            await _startCamera(select.value);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(select);

        // Insertar encima del visor #reader
        _readerDiv.parentNode.insertBefore(wrapper, _readerDiv);
    }

    function _removeCameraSelect() {
        const el = document.getElementById('camera-select-wrapper');
        if (el) el.parentNode.removeChild(el);
    }

    // ── Error visual dentro del visor ─────────────────────────────

    /** Muestra el mensaje de error superpuesto dentro de #reader. */
    function _showCameraError() {
        _removeErrorMsg();
        // Necesitamos position:relative en el contenedor para el overlay absoluto
        _readerDiv.style.position = 'relative';
        _readerDiv.style.display  = 'block';

        const errEl         = document.createElement('div');
        errEl.id            = 'scanner-error-msg';
        errEl.textContent   = 'No se pudo iniciar la cámara. Selecciona otra o revisa los permisos.';
        errEl.style.cssText =
            'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
            'color:#e06c75;font-size:0.85rem;text-align:center;padding:1.25rem;line-height:1.6;' +
            'z-index:20;background:rgba(0,0,0,0.84);border-radius:12px;';
        _readerDiv.appendChild(errEl);
    }

    function _removeErrorMsg() {
        const el = document.getElementById('scanner-error-msg');
        if (el) el.parentNode.removeChild(el);
    }

    // ── Gestión del scanner ───────────────────────────────────────

    /**
     * Inicia Html5Qrcode con un deviceId concreto.
     * Si falla, muestra el error visual en el visor (sin alert).
     */
    async function _startCamera(deviceId) {
        _removeErrorMsg();
        _scanner = new Html5Qrcode('reader');
        try {
            await _scanner.start(
                deviceId,
                { fps: 10, qrbox: { width: 240, height: 120 } },
                async (barcode) => {
                    // Barcode detectado: detener y procesar
                    await _stopScanner(/* keepSelect= */ false);
                    await _procesarBarcode(barcode);
                },
                () => {} // errores de frame — silenciar
            );
            _isScanning = true;
        } catch (err) {
            console.error('[DashboardScanner] _startCamera() error:', err);
            _isScanning = false;
            _resetBtn();
            _showCameraError();
        }
    }

    /**
     * Detiene el scanner y limpia la UI del visor.
     * @param {boolean} keepSelect - Si true, conserva el <select> para
     *   permitir que el usuario cambie de cámara sin perder la lista.
     */
    async function _stopScanner(keepSelect = false) {
        if (_scanner && _scanner.isScanning) {
            await _scanner.stop().catch(() => {});
        }
        _isScanning              = false;
        _readerDiv.style.display = 'none';
        _removeErrorMsg();
        if (!keepSelect) _removeCameraSelect();
        _resetBtn();
    }

    function _resetBtn() {
        if (_btnEl) { _btnEl.style.background = ''; _btnEl.style.color = ''; }
    }

    // ── Punto de entrada del flujo de escaneo ─────────────────────

    /**
     * Solicita la lista de cámaras, construye el selector si hay >1,
     * y arranca el scanner con la cámara apropiada.
     */
    async function _activarEscaner() {
        // Feedback visual inmediato mientras se piden permisos
        _readerDiv.style.display = 'block';
        if (_btnEl) { _btnEl.style.background = 'var(--orange-strong)'; _btnEl.style.color = '#fff'; }

        // Ocultar resultado y alternativas anteriores si existían
        const resultCard = document.getElementById('scan-result-card');
        if (resultCard) resultCard.style.display = 'none';
        var prevAlt = document.getElementById('alternatives-card');
        if (prevAlt) prevAlt.parentNode.removeChild(prevAlt);

        // 1. Obtener lista de cámaras (activa el diálogo de permisos del browser)
        let cameras = [];
        try {
            cameras = await Html5Qrcode.getCameras();
        } catch (err) {
            console.error('[DashboardScanner] getCameras() error:', err);
            _resetBtn();
            _showCameraError();
            return;
        }

        if (cameras.length === 0) {
            _resetBtn();
            _showCameraError();
            return;
        }

        // 2. Elegir cámara por defecto
        //    Preferir cámara trasera (back/rear/trasera) si existe.
        //    Si no hay coincidencia por etiqueta, usar la última de la lista
        //    (en móviles la trasera suele ser la última devuelta por el browser).
        const backCam    = cameras.find(c => /back|rear|trasera|environment/i.test(c.label));
        const defaultCam = backCam ?? cameras[cameras.length - 1];

        // 3. Si hay más de una cámara, mostrar selector
        if (cameras.length > 1) {
            _injectCameraSelect(cameras, defaultCam.id);
        }

        // 4. Iniciar scanner con la cámara elegida
        await _startCamera(defaultCam.id);
    }

    /**
     * Normaliza riesgo del Motor V2 (low|medium|high) a claves de semáforo (BAJO|MEDIO|ALTO).
     */
    function _normalizeMotorRisk(risk) {
        if (risk == null || risk === '') return 'unknown';
        const r = String(risk).toLowerCase();
        if (r === 'high') return 'ALTO';
        if (r === 'medium') return 'MEDIO';
        if (r === 'low') return 'BAJO';
        if (r === 'ninguno' || r === 'none') return 'NINGUNO';
        const u = String(risk).toUpperCase();
        if (u === 'ALTO' || u === 'MEDIO' || u === 'BAJO' || u === 'NINGUNO') return u;
        return 'unknown';
    }

    const _PLACEHOLDER_PHOTO_SVG =
        '<svg width="32" height="32" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h18v18H3zM8 3v18m8-18v18M3 8h18m-18 8h18"></path></svg>';

    function _clearDiagnosisPanel() {
        const leadEl = document.getElementById('result-diagnosis-lead');
        const ulEl   = document.getElementById('result-conflicts-list');
        const srcEl  = document.getElementById('result-diagnosis-source');
        if (leadEl) leadEl.textContent = '';
        if (ulEl) {
            ulEl.innerHTML = '';
            ulEl.classList.add('hidden');
        }
        if (srcEl) srcEl.textContent = '';
    }

    // ── Renderizado de resultado ──────────────────────────────────
    function _renderResultCard(foodData, analysis) {
        const photoEl = document.getElementById('product-photo');
        if (photoEl) {
            while (photoEl.firstChild) photoEl.removeChild(photoEl.firstChild);
            if (foodData.imageUrl) {
                const img = document.createElement('img');
                img.src           = foodData.imageUrl;
                img.alt           = foodData.productName || '';
                img.style.cssText = 'width:64px;height:64px;object-fit:contain;border-radius:8px;';
                photoEl.appendChild(img);
            } else {
                photoEl.innerHTML = _PLACEHOLDER_PHOTO_SVG;
            }
        }

        const nameEl = document.getElementById('result-product-name');
        if (nameEl) nameEl.textContent = foodData.productName || '—';

        const riskKey  = analysis.blocked ? 'ALTO' : _normalizeMotorRisk(analysis.overall_risk);
        const riskInfo = RISK_TO_LIGHT[riskKey] || RISK_TO_LIGHT['unknown'];

        const trafficEl = document.getElementById('traffic-light');
        if (trafficEl) trafficEl.className = `traffic-light ${riskInfo.cls}`;

        const labelEl = document.getElementById('traffic-light-label');
        if (labelEl) labelEl.textContent = riskInfo.label;

        const leadEl = document.getElementById('result-diagnosis-lead');
        const ulEl   = document.getElementById('result-conflicts-list');
        const srcEl  = document.getElementById('result-diagnosis-source');

        if (leadEl) {
            leadEl.textContent = analysis.blocked
                ? (analysis.criticalRisk?.message || 'Interacción crítica. Consulte a su médico.')
                : (analysis.recommendation || 'No fue posible analizar. Consulte a su médico antes de consumir.');
        }

        if (ulEl) {
            ulEl.innerHTML = '';
            if (!analysis.blocked && analysis.conflicts_detected &&
                Array.isArray(analysis.conflicts_detected) && analysis.conflicts_detected.length > 0) {
                analysis.conflicts_detected.forEach(function (c) {
                    const li = document.createElement('li');
                    li.textContent = c;
                    ulEl.appendChild(li);
                });
                ulEl.classList.remove('hidden');
            } else {
                ulEl.classList.add('hidden');
            }
        }

        if (srcEl) {
            if (!analysis.blocked && analysis.source && analysis.source !== 'FALLBACK_CONSERVATIVE') {
                srcEl.textContent = '(Fuente: ' + analysis.source + ')';
            } else {
                srcEl.textContent = '';
            }
        }

        const card = document.getElementById('scan-result-card');
        if (card) card.style.display = 'block';
    }

    window.NuraDashboardUI = Object.freeze({
        renderFoodAnalysis:  _renderResultCard,
        normalizeMotorRisk:  _normalizeMotorRisk,
        clearDiagnosisPanel: _clearDiagnosisPanel,
        triggerAlternativas: _triggerAlternativas
    });

    // ── Flujo principal post-detección ────────────────────────────
    async function _procesarBarcode(barcode) {
        const nameEl     = document.getElementById('result-product-name');
        const trafficEl  = document.getElementById('traffic-light');
        const resultCard = document.getElementById('scan-result-card');

        // Limpiar alternativas del escaneo anterior ANTES del nuevo fetch
        var prevAlt = document.getElementById('alternatives-card');
        if (prevAlt) { prevAlt.innerHTML = ''; prevAlt.parentNode.removeChild(prevAlt); }

        if (nameEl)     nameEl.textContent  = 'Buscando producto...';
        _clearDiagnosisPanel();
        if (trafficEl)  trafficEl.className = 'traffic-light';
        if (resultCard) resultCard.style.display = 'block';

        let foodData = null;
        try {
            foodData = await _fetchFoodByBarcode(barcode);
        } catch (err) {
            console.error('[DashboardScanner] Error red OpenFoodFacts:', err);
            alert('Error de red al consultar la base de datos. Verifica tu conexión.');
            if (resultCard) resultCard.style.display = 'none';
            return;
        }

        if (!foodData) {
            alert('Producto no encontrado en la base de datos global. Intenta con otro código.');
            if (resultCard) resultCard.style.display = 'none';
            return;
        }

        const rawProfile = await MedicalStorage.loadProfile();
        if (!rawProfile) {
            if (nameEl) nameEl.textContent = foodData.productName;
            const diagEl = document.getElementById('result-diagnosis-lead');
            if (diagEl) diagEl.textContent = 'No se encontró perfil médico. Completa el Perfil Médico primero.';
            return;
        }

        // [ESCUDO FARMACOLÓGICO — FIX CRÍTICO] Perfil con medicamentos desde la selección VIVA.
        // Construimos el perfil a mano para garantizar que medicamentos[] nunca sea undefined ni vacío erróneo.
        const profile = Object.assign({}, rawProfile);
        if (!Array.isArray(profile.enfermedades)) profile.enfermedades = [];
        if (profile.enfermedades.length === 0 && profile.pathology && profile.pathology !== 'none') {
            profile.enfermedades = [profile.pathology];
        }
        // Siempre sobreescribir medicamentos desde el selector en memoria
        profile.medicamentos = (window.NuraMedSelector && typeof window.NuraMedSelector.getSelected === 'function')
            ? window.NuraMedSelector.getSelected()
            : (Array.isArray(rawProfile.medicamentos) ? rawProfile.medicamentos : []);
        console.log('[DashboardScanner] Payload barcode — medicamentos:', profile.medicamentos);


        if (nameEl) nameEl.textContent = foodData.productName;

        let analysis;
        try {
            analysis = await AIMedicalAgent.analyzeFood(profile, foodData);
        } catch (err) {
            analysis = {
                blocked:        false,
                overall_risk:   'unknown',
                recommendation: 'No fue posible analizar el producto. Consulte a su médico antes de consumir.',
                consult_doctor: true,
                source:         'FALLBACK_CONSERVATIVE'
            };
        }

        _renderResultCard(foodData, analysis);

        // ── Motor de Sustitución: activar si riesgo alto ──────────
        var riskNorm = String(analysis.overall_risk || '').toLowerCase();
        if (analysis.blocked || riskNorm === 'high' || riskNorm === 'alto') {
            _triggerAlternativas(foodData, analysis, profile);
        }
    }

    // ── Motor de Sustitución ──────────────────────────────────────

    async function _triggerAlternativas(foodData, analysis, userProfile) {
        var motivos = [];
        if (analysis.blocked && analysis.criticalRisk && analysis.criticalRisk.message) {
            motivos = [analysis.criticalRisk.message];
        } else if (Array.isArray(analysis.conflicts_detected) && analysis.conflicts_detected.length > 0) {
            motivos = analysis.conflicts_detected;
        }

        // Limpiar tarjeta anterior ANTES del fetch — sin rastro del escaneo previo
        var existingAlt = document.getElementById('alternatives-card');
        if (existingAlt) { existingAlt.innerHTML = ''; existingAlt.parentNode.removeChild(existingAlt); }

        var resultCard = document.getElementById('scan-result-card');
        var loadingCard = document.createElement('div');
        loadingCard.id        = 'alternatives-card';
        loadingCard.className = 'alternatives-card alternatives-loading';
        loadingCard.innerHTML = '💡 Buscando alternativas seguras...';
        if (resultCard && resultCard.parentNode) {
            resultCard.parentNode.insertBefore(loadingCard, resultCard.nextSibling);
        }

        var alternatives = await AIMedicalAgent.suggestAlternatives(
            foodData.productName, motivos, userProfile
        );

        _renderAlternativas(alternatives);
    }

    function _renderAlternativas(alternatives) {
        var card = document.getElementById('alternatives-card');
        if (!card) return;

        // Limpiar estado de carga antes de inyectar el resultado
        card.innerHTML = '';
        card.className = 'alternatives-card';

        if (!alternatives || alternatives.length === 0) {
            card.parentNode.removeChild(card);
            return;
        }

        var header = document.createElement('div');
        header.className = 'alternatives-header';
        header.innerHTML = '<span class="alternatives-icon">💡</span><span>Alternativas seguras para ti</span>';
        card.appendChild(header);

        var list = document.createElement('div');
        list.className = 'alternatives-list';

        alternatives.forEach(function (alt) {
            var item = document.createElement('div');
            item.className = 'alternative-item';

            var nombre = document.createElement('strong');
            nombre.className   = 'alternative-name';
            nombre.textContent = alt.nombre || '—';

            var razon = document.createElement('p');
            razon.className   = 'alternative-reason';
            razon.textContent = alt.razon_seguridad || '';

            item.appendChild(nombre);
            item.appendChild(razon);
            list.appendChild(item);
        });

        card.appendChild(list);
    }

    // ── Bootstrap ─────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        _btnEl     = document.getElementById('btn-scan-barcode');
        _readerDiv = document.getElementById('reader');
        if (!_btnEl || !_readerDiv) return;

        _btnEl.addEventListener('click', async () => {
            if (_isScanning) {
                await _stopScanner(/* keepSelect= */ false);
            } else {
                await _activarEscaner();
            }
        });

        // Detener cámara al salir de la página (evita stream huérfano)
        window.addEventListener('pagehide', () => {
            if (_scanner && _scanner.isScanning) _scanner.stop().catch(() => {});
        });
    });

})();
