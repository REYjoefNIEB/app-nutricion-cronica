// =================================================================
// [LÓGICO BACKEND] BarcodeScanner — Escáner real con html5-qrcode
//                                   + Conexión OpenFoodFacts
// =================================================================
const BarcodeScanner = (() => {

    let _scanner = null;

    /**
     * Obtiene datos nutricionales de OpenFoodFacts por código de barras.
     */
    async function fetchFoodByBarcode(barcode) {
        const res = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
        );
        if (!res.ok) throw new Error(`OpenFoodFacts HTTP ${res.status}`);

        const data = await res.json();
        if (data.status !== 1) return null;

        const p = data.product;
        const n = p.nutriments || {};
        const rawText = p.ingredients_text_es || p.ingredients_text || '';

        return {
            productName:      p.product_name_es || p.product_name || 'Producto sin nombre',
            imageUrl:         p.image_front_url || p.image_url || '',
            ingredientsText:  rawText,
            ingredients:      rawText
                .split(/[,;()\n]/)
                .map(s => s.replace(/\d+%?\s*$/, '').trim())
                .filter(s => s.length > 1),
            nutritionalFacts: {
                sodium_100g:        n['sodium_100g']        ?? null,
                sugars_100g:        n['sugars_100g']        ?? null,
                fat_100g:           n['fat_100g']            ?? null,
                carbohydrates_100g: n['carbohydrates_100g'] ?? null
            }
        };
    }

    /**
     * Inicia el escáner con un deviceId concreto.
     * Detiene automáticamente al detectar el primer código.
     * @param {string}   deviceId  - ID de la cámara (de Html5Qrcode.getCameras())
     * @param {function} onSuccess - cb(barcode: string)
     * @param {function} onError   - cb(err: Error)
     */
    async function start(deviceId, onSuccess, onError) {
        _scanner = new Html5Qrcode('reader', {
            formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E
            ],
            useBarCodeDetectorIfSupported: true
        });
        let _frameCount = 0;
        try {
            await _scanner.start(
                { facingMode: "environment" },
                {
                    fps:         25,
                    aspectRatio: 1.7778
                },
                (decodedText) => {
                    _scanner.stop().catch(() => {});
                    onSuccess(decodedText);
                },
                () => { // errores de frame — frame sin código detectado
                    _frameCount++;
                    if (_frameCount % 50 === 0) {
                        console.debug(`[Scanner] Analizando... frames procesados: ${_frameCount}`);
                    }
                }
            );
        } catch (err) {
            console.error('[Scanner] Fallo crítico de cámara:', err);
            alert('Error nativo: ' + err.name + ' | ' + err.message);
            onError(err);
        }
    }

    async function stop() {
        if (_scanner && _scanner.isScanning) {
            await _scanner.stop().catch(() => {});
        }
    }

    return { start, stop, fetchFoodByBarcode };

})();

// =================================================================
// [ARQUITECTO VISUAL] Lógica de UI e i18n
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

document.addEventListener('DOMContentLoaded', () => {

    // ── Inyección de textos i18n ──────────────────────────────────
    document.getElementById('title').textContent        = t.pageTitle;
    document.getElementById('subtitle').textContent     = t.pageSubtitle;
    document.getElementById('btn-activate').textContent = t.btnActivate;
    document.getElementById('panel-title').textContent  = t.panelTitle;
    document.getElementById('panel-status').textContent = t.panelEmpty;

    // ── Referencias DOM ───────────────────────────────────────────
    const btnActivate      = document.getElementById('btn-activate');
    const laser            = document.getElementById('scanner-laser');
    const corners          = document.querySelectorAll('.corner');
    const panelHeader      = document.getElementById('panel-header');
    const interactionPanel = document.getElementById('interaction-panel');
    const readerDiv        = document.getElementById('reader');
    const resultCard       = document.getElementById('result-card');

    let _currentFood     = null;
    let _currentAnalysis = null;

    // ── Toggle del drawer de estado ───────────────────────────────
    panelHeader.addEventListener('click', () => {
        interactionPanel.classList.toggle('expanded');
    });

    // ── Selector de cámaras (inyectado dinámicamente) ─────────────

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

        // Al cambiar de cámara: reiniciar con el deviceId seleccionado
        select.addEventListener('change', async () => {
            _removeErrorMsg();
            await BarcodeScanner.stop();
            await _iniciarConCamera(select.value);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(select);

        // Insertar entre el visor y el botón de activar
        btnActivate.parentNode.insertBefore(wrapper, btnActivate);
    }

    function _removeCameraSelect() {
        const el = document.getElementById('camera-select-wrapper');
        if (el) el.parentNode.removeChild(el);
    }

    // ── Error visual superpuesto dentro de #reader ────────────────

    function _showCameraError() {
        _removeErrorMsg();
        readerDiv.style.position = 'relative';
        readerDiv.style.display  = 'block';

        const errEl         = document.createElement('div');
        errEl.id            = 'scanner-error-msg';
        errEl.textContent   = 'No se pudo iniciar la cámara. Selecciona otra o revisa los permisos.';
        errEl.style.cssText =
            'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
            'color:#e06c75;font-size:0.85rem;text-align:center;padding:1.25rem;line-height:1.6;' +
            'z-index:20;background:rgba(0,0,0,0.84);border-radius:18px;';
        readerDiv.appendChild(errEl);
    }

    function _removeErrorMsg() {
        const el = document.getElementById('scanner-error-msg');
        if (el) el.parentNode.removeChild(el);
    }

    // ── Helpers de estado del visor ───────────────────────────────

    /** Restaura el visor completo (botón + corners + reader). */
    function _resetViewfinder() {
        readerDiv.style.display = 'none';
        _removeErrorMsg();
        _removeCameraSelect();
        corners.forEach(c => c.style.opacity = '1');
        laser.style.display = 'none';
        btnActivate.classList.remove('scanning');
        btnActivate.textContent = t.btnActivate;
        btnActivate.disabled    = false;
    }

    /** Restaura solo el botón y las esquinas, pero deja el reader visible
     *  (para que el mensaje de error dentro de él permanezca visible). */
    function _resetBtnKeepReader() {
        corners.forEach(c => c.style.opacity = '1');
        laser.style.display = 'none';
        btnActivate.classList.remove('scanning');
        btnActivate.textContent = t.btnActivate;
        btnActivate.disabled    = false;
    }

    // ── Botón principal: iniciar / detener escáner ────────────────
    btnActivate.addEventListener('click', async () => {
        if (btnActivate.classList.contains('scanning')) {
            _detenerEscaner();
        } else {
            await _activarEscaner();
        }
    });

    async function _activarEscaner() {
        btnActivate.classList.add('scanning');
        btnActivate.textContent = t.btnScanning;
        btnActivate.disabled    = true;

        corners.forEach(c => c.style.opacity = '0');
        laser.style.display = 'none';
        readerDiv.style.display = 'block';

        _showPanelStatus(t.statusScanning);

        // 1. Obtener lista de cámaras (activa el diálogo de permisos)
        let cameras = [];
        try {
            cameras = await Html5Qrcode.getCameras();
        } catch (err) {
            console.error('[BarcodeScanner] getCameras() error:', err);
            _resetBtnKeepReader();
            _showCameraError();
            _showPanelStatus(t.panelEmpty);
            return;
        }

        if (cameras.length === 0) {
            _resetBtnKeepReader();
            _showCameraError();
            _showPanelStatus(t.panelEmpty);
            return;
        }

        // 2. Elegir cámara trasera por defecto
        const backCam    = cameras.find(c => /back|rear|trasera|environment/i.test(c.label));
        const defaultCam = backCam ?? cameras[cameras.length - 1];

        // 3. Selector si hay más de una cámara
        if (cameras.length > 1) {
            _injectCameraSelect(cameras, defaultCam.id);
        }

        // 4. Iniciar con la cámara elegida
        await _iniciarConCamera(defaultCam.id);

        // Re-habilitar para que el usuario pueda cancelar
        btnActivate.disabled = false;
    }

    /**
     * Inicia html5-qrcode con el deviceId dado.
     * Si falla muestra el error en el visor (sin alert).
     */
    async function _iniciarConCamera(deviceId) {
        await BarcodeScanner.start(
            deviceId,
            async (barcode) => {
                _removeCameraSelect();
                _resetViewfinder();
                await _procesarEscaneo(barcode);
            },
            (err) => {
                console.error('[BarcodeScanner] Error al iniciar cámara:', err);
                // Conservar el selector para que el usuario elija otra cámara
                _resetBtnKeepReader();
                _showCameraError();
                _showPanelStatus(t.panelEmpty);
            }
        );
    }

    async function _detenerEscaner() {
        await BarcodeScanner.stop();
        _resetViewfinder();
        _showPanelStatus(t.panelEmpty);
    }

    // ── Flujo principal post-detección ───────────────────────────
    async function _procesarEscaneo(barcode) {
        _ocultarResultado();
        _showPanelStatus(t.statusFetching);

        let foodData = null;
        try {
            foodData = await BarcodeScanner.fetchFoodByBarcode(barcode);
        } catch (err) {
            console.error('[BarcodeScanner] Error red OpenFoodFacts:', err);
            alert(t.errorNetwork);
            _showPanelStatus(t.panelEmpty);
            return;
        }

        if (!foodData) {
            alert(t.errorProductNotFound);
            _showPanelStatus(t.panelEmpty);
            return;
        }

        const profile = await MedicalStorage.loadProfile();
        if (!profile) {
            _showPanelStatus(t.noProfile);
            interactionPanel.classList.add('expanded');
            return;
        }

        _showPanelStatus(t.statusAnalyzing);
        let analysis;
        try {
            analysis = await AIMedicalAgent.analyzeFood(profile, foodData);
        } catch (err) {
            console.error('[AIMedicalAgent] Error inesperado:', err);
            analysis = {
                blocked:         false,
                overall_risk:    'unknown',
                recommendation:  t.fallbackRecommendation,
                consult_doctor:  true,
                source:          'FALLBACK_CONSERVATIVE'
            };
        }

        _currentFood     = foodData;
        _currentAnalysis = analysis;
        _renderResultCard(foodData, analysis);
        _showPanelStatus(t.statusDone);

        // ── Motor de Sustitución: activar si riesgo alto ──────────
        var riskNorm = String(analysis.overall_risk || '').toLowerCase();
        if (analysis.blocked || riskNorm === 'high' || riskNorm === 'alto') {
            _triggerAlternativas(foodData, analysis, profile);
        }
    }

    // ── Renderizado de la Tarjeta de Resultado ────────────────────
    function _renderResultCard(foodData, analysis) {
        const imgEl = document.getElementById('product-image');
        if (foodData.imageUrl) {
            imgEl.src           = foodData.imageUrl;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }

        document.getElementById('product-name').textContent = foodData.productName;

        const semaforoEl     = document.getElementById('semaforo');
        semaforoEl.className = 'semaforo';

        if (analysis.blocked) {
            semaforoEl.classList.add('semaforo-red');
            semaforoEl.textContent = t.riskDanger;
        } else {
            const risk = (analysis.overall_risk || '').toUpperCase();
            if (risk === 'ALTO') {
                semaforoEl.classList.add('semaforo-red');
                semaforoEl.textContent = t.riskDanger;
            } else if (risk === 'MEDIO') {
                semaforoEl.classList.add('semaforo-yellow');
                semaforoEl.textContent = t.riskCaution;
            } else if (risk === 'BAJO' || risk === 'NINGUNO') {
                semaforoEl.classList.add('semaforo-green');
                semaforoEl.textContent = t.riskSafe;
            } else {
                semaforoEl.classList.add('semaforo-yellow');
                semaforoEl.textContent = t.riskUnknown;
            }
        }

        let recText = analysis.blocked
            ? (analysis.criticalRisk?.message || t.fallbackRecommendation)
            : (analysis.recommendation       || t.fallbackRecommendation);
        document.getElementById('product-recommendation').textContent = recText;

        document.getElementById('btn-register').textContent = t.btnRegister;
        document.getElementById('btn-discard').textContent  = t.btnDiscard;

        resultCard.style.display = 'block';
        resultCard.classList.remove('result-card-visible');
        requestAnimationFrame(() => resultCard.classList.add('result-card-visible'));
    }

    function _ocultarResultado() {
        resultCard.style.display = 'none';
        resultCard.classList.remove('result-card-visible');
        _currentFood     = null;
        _currentAnalysis = null;
        var altCard = document.getElementById('alternatives-card');
        if (altCard) altCard.parentNode.removeChild(altCard);
    }

    // ── Motor de Sustitución ──────────────────────────────────────

    async function _triggerAlternativas(foodData, analysis, userProfile) {
        // Extraer motivos del análisis
        var motivos = [];
        if (analysis.blocked && analysis.criticalRisk && analysis.criticalRisk.message) {
            motivos = [analysis.criticalRisk.message];
        } else if (Array.isArray(analysis.conflicts_detected) && analysis.conflicts_detected.length > 0) {
            motivos = analysis.conflicts_detected;
        }

        // Limpiar tarjeta anterior ANTES del fetch — sin rastro del escaneo previo
        var existingAlt = document.getElementById('alternatives-card');
        if (existingAlt) {
            existingAlt.innerHTML = '';
            existingAlt.parentNode.removeChild(existingAlt);
        }

        // Insertar placeholder de carga debajo de resultCard
        var loadingCard = document.createElement('div');
        loadingCard.id        = 'alternatives-card';
        loadingCard.className = 'alternatives-card alternatives-loading';
        loadingCard.innerHTML = '💡 Buscando alternativas seguras...';
        resultCard.parentNode.insertBefore(loadingCard, resultCard.nextSibling);

        var alternatives = await AIMedicalAgent.suggestAlternatives(
            foodData.productName, motivos, userProfile
        );

        _renderAlternativas(alternatives);
    }

    function _renderAlternativas(alternatives) {
        var card = document.getElementById('alternatives-card');
        if (!card) return;

        // Limpiar contenido de carga antes de inyectar el resultado
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

    // ── Botón: Registrar Consumo ──────────────────────────────────
    document.getElementById('btn-register').addEventListener('click', () => {
        if (!_currentFood) return;
        const log = JSON.parse(localStorage.getItem('consumption_log') || '[]');
        log.unshift({
            productName:  _currentFood.productName,
            overall_risk: _currentAnalysis?.overall_risk || 'unknown',
            timestamp:    new Date().toISOString()
        });
        localStorage.setItem('consumption_log', JSON.stringify(log));
        alert(t.registerSuccess.replace('{name}', _currentFood.productName));
        _ocultarResultado();
        _showPanelStatus(t.panelEmpty);
    });

    // ── Botón: Descartar ──────────────────────────────────────────
    document.getElementById('btn-discard').addEventListener('click', () => {
        _ocultarResultado();
        _showPanelStatus(t.panelEmpty);
    });

    // ── Helper: actualiza el panel de estado ──────────────────────
    function _showPanelStatus(text) {
        const panelBody = document.querySelector('.panel-body');
        while (panelBody.firstChild) panelBody.removeChild(panelBody.firstChild);
        const p = document.createElement('p');
        p.className   = 'panel-muted';
        p.textContent = text;
        panelBody.appendChild(p);
    }

});
