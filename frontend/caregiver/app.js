// =================================================================
// [CUIDADOR] caregiver/app.js
//
// SEGURIDAD (Zero-Knowledge):
//   - NUNCA usa localStorage para datos médicos del paciente.
//   - No conoce enfermedades ni medicamentos. Solo recibe semáforo
//     y nombres de alternativas del backend.
//   - Las únicas variables de sesión son el PIN validado y el
//     timestamp de expiración (no son datos médicos).
//   - Al expirar la sesión, todas las variables se limpian.
// =================================================================

(function () {

    var VALIDATE_PIN_URL   = 'https://us-central1-nura-33fc1.cloudfunctions.net/validateCaregiverPin';
    var CAREGIVER_SCAN_URL = 'https://us-central1-nura-33fc1.cloudfunctions.net/caregiverScan';
    var TIMEOUT_MS         = 20000;

    // Variables de sesión — sin datos médicos
    var _currentPin  = null;
    var _expiresAt   = null;
    var _expiryTimer = null;
    var _scanner     = null;
    var _isScanning  = false;

    document.addEventListener('DOMContentLoaded', function () {

        var inputPin      = document.getElementById('input-pin');
        var btnValidate   = document.getElementById('btn-validate-pin');
        var pinError      = document.getElementById('pin-error');
        var inputQuery    = document.getElementById('input-food-query');
        var btnSearch     = document.getElementById('btn-search-food');
        var btnActivate   = document.getElementById('btn-activate-scanner');
        var btnScanAgain  = document.getElementById('btn-scan-again');
        var btnGoPin      = document.getElementById('btn-go-pin');

        // ── Formatear PIN en tiempo real ──────────────────────────
        inputPin.addEventListener('input', function () {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
            pinError.classList.add('hidden');
            pinError.textContent = '';
        });

        inputPin.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') btnValidate.click();
        });

        // ── Validar PIN ───────────────────────────────────────────
        btnValidate.addEventListener('click', async function () {
            var pin = inputPin.value.trim();
            if (pin.length !== 6) {
                _showPinError('El PIN debe tener 6 caracteres.');
                return;
            }

            btnValidate.disabled    = true;
            btnValidate.textContent = 'Validando…';
            pinError.classList.add('hidden');

            try {
                var ctrl = new AbortController();
                var tid  = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
                var resp = await fetch(VALIDATE_PIN_URL, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ pin: pin }),
                    signal:  ctrl.signal
                });
                clearTimeout(tid);
                var data = await resp.json();

                if (resp.status === 429) {
                    _showPinError('Demasiados intentos. Espera 1 hora e intenta de nuevo.');
                    return;
                }
                if (!data.valid) {
                    if (data.reason === 'expired') {
                        _showScreen('screen-expired');
                    } else {
                        _showPinError('PIN incorrecto. Verifica el código con el paciente.');
                    }
                    return;
                }

                // PIN válido — guardar solo datos de sesión (no médicos)
                _currentPin = pin;
                _expiresAt  = data.expiresAt;
                _startExpiryCountdown();
                _showScreen('screen-scanner');

            } catch (err) {
                _showPinError(err.name === 'AbortError'
                    ? 'Tiempo de espera agotado. Verifica tu conexión.'
                    : 'Error de conexión. Verifica tu red.');
                console.error('[Cuidador] validatePin:', err.message);
            } finally {
                btnValidate.disabled    = false;
                btnValidate.textContent = 'Validar PIN';
            }
        });

        // ── Búsqueda por texto ────────────────────────────────────
        inputQuery.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') btnSearch.click();
        });

        btnSearch.addEventListener('click', async function () {
            var q = inputQuery.value.trim();
            if (!q) return;
            await _doScan({ query: q });
        });

        // ── Escáner de código de barras ───────────────────────────
        btnActivate.addEventListener('click', async function () {
            if (_isScanning) {
                await _stopScanner();
            } else {
                await _startScanner();
            }
        });

        // ── Escanear otro ─────────────────────────────────────────
        btnScanAgain.addEventListener('click', function () {
            document.getElementById('result-card').classList.add('hidden');
            document.getElementById('result-loading').classList.add('hidden');
            inputQuery.value = '';
        });

        // ── Volver al PIN desde pantalla de expirado ──────────────
        btnGoPin.addEventListener('click', function () {
            _clearSession();
            inputPin.value = '';
            _showScreen('screen-pin');
        });

        // ── Escáner interno ───────────────────────────────────────

        async function _startScanner() {
            var readerDiv = document.getElementById('reader');
            readerDiv.style.display = 'block';
            btnActivate.innerHTML   = '<span>✕ Cancelar</span>';
            _isScanning = true;

            var cameras = [];
            try {
                cameras = await Html5Qrcode.getCameras();
            } catch (e) {
                alert('No se pudo acceder a la cámara. Verifica los permisos.');
                await _stopScanner();
                return;
            }
            if (!cameras.length) {
                alert('No se detectaron cámaras disponibles.');
                await _stopScanner();
                return;
            }

            var backCam = cameras.find(function (c) { return /back|rear|environment/i.test(c.label); });
            var cam     = backCam || cameras[cameras.length - 1];

            _scanner = new Html5Qrcode('reader');
            try {
                await _scanner.start(
                    cam.id,
                    { fps: 20, aspectRatio: 1.5 },
                    async function (barcode) {
                        await _stopScanner();
                        await _doScan({ barcode: barcode });
                    },
                    function () {} // errores de frame — silenciar
                );
            } catch (e) {
                console.error('[Cuidador] startScanner:', e);
                alert('Error al iniciar la cámara.');
                await _stopScanner();
            }
        }

        async function _stopScanner() {
            if (_scanner && _scanner.isScanning) {
                await _scanner.stop().catch(function () {});
            }
            _scanner    = null;
            _isScanning = false;
            var readerDiv = document.getElementById('reader');
            if (readerDiv) readerDiv.style.display = 'none';
            btnActivate.innerHTML =
                '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' +
                ' d="M4 6h.01M4 10h.01M4 14h.01M4 18h.01M20 6h.01M20 10h.01M20 14h.01M20 18h.01M8 4v16M16 4v16"/>' +
                '</svg> Escanear código de barras';
        }

        // ── Llamada principal al backend ──────────────────────────
        async function _doScan(payload) {
            if (!_currentPin) { _showScreen('screen-pin'); return; }
            if (_expiresAt && Date.now() > _expiresAt) { _showScreen('screen-expired'); return; }

            // Mostrar loading y ocultar resultado anterior
            document.getElementById('result-card').classList.add('hidden');
            document.getElementById('result-loading').classList.remove('hidden');

            var body = Object.assign({ pin: _currentPin }, payload);

            try {
                var ctrl = new AbortController();
                var tid  = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
                var resp = await fetch(CAREGIVER_SCAN_URL, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(body),
                    signal:  ctrl.signal
                });
                clearTimeout(tid);
                var data = await resp.json();

                document.getElementById('result-loading').classList.add('hidden');

                if (resp.status === 401) {
                    _clearSession();
                    if (data.reason === 'expired') _showScreen('screen-expired');
                    else _showScreen('screen-pin');
                    return;
                }
                if (!resp.ok) {
                    _showResultError('No se pudo analizar el alimento. Intenta de nuevo.');
                    return;
                }

                _renderResult(data);

            } catch (err) {
                document.getElementById('result-loading').classList.add('hidden');
                _showResultError(err.name === 'AbortError'
                    ? 'Tiempo de espera agotado. Verifica tu conexión.'
                    : 'Error de conexión.');
                console.error('[Cuidador] doScan:', err.message);
            }
        }

        // ── Renderizar resultado ──────────────────────────────────
        function _renderResult(data) {
            var nameEl     = document.getElementById('result-product-name');
            var semaforoEl = document.getElementById('semaforo');
            var altSection = document.getElementById('alternatives-section');
            var altList    = document.getElementById('alternatives-list');
            var resultCard = document.getElementById('result-card');

            nameEl.textContent = data.productName || '—';

            var statusMap = {
                'Peligro':     { cls: 'semaforo-red',    text: '🔴 Peligro — No consumir'       },
                'Precaución':  { cls: 'semaforo-yellow', text: '🟡 Precaución — Consultar'       },
                'Seguro':      { cls: 'semaforo-green',  text: '🟢 Seguro para consumir'         },
                'Desconocido': { cls: 'semaforo-unknown', text: '⚪ Sin datos suficientes'        }
            };
            var info = statusMap[data.status] || statusMap['Desconocido'];
            semaforoEl.className   = 'semaforo ' + info.cls;
            semaforoEl.textContent = info.text;

            // Alternativas sanitizadas: SOLO nombre
            altList.innerHTML = '';
            if (Array.isArray(data.alternativas) && data.alternativas.length > 0) {
                data.alternativas.forEach(function (alt) {
                    var chip = document.createElement('div');
                    chip.className   = 'alt-chip';
                    chip.textContent = alt.nombre || '';
                    altList.appendChild(chip);
                });
                altSection.classList.remove('hidden');
            } else {
                altSection.classList.add('hidden');
            }

            resultCard.classList.remove('hidden');
        }

        function _showResultError(msg) {
            var nameEl = document.getElementById('result-product-name');
            var semEl  = document.getElementById('semaforo');
            nameEl.textContent = msg;
            semEl.className    = 'semaforo semaforo-unknown';
            semEl.textContent  = '';
            document.getElementById('alternatives-section').classList.add('hidden');
            document.getElementById('result-card').classList.remove('hidden');
        }

        // ── Countdown de expiración ───────────────────────────────
        function _startExpiryCountdown() {
            if (_expiryTimer) clearInterval(_expiryTimer);
            _updateExpiryBanner();
            _expiryTimer = setInterval(function () {
                if (!_expiresAt) { clearInterval(_expiryTimer); return; }
                var remaining = _expiresAt - Date.now();
                if (remaining <= 0) {
                    clearInterval(_expiryTimer);
                    _clearSession();
                    _showScreen('screen-expired');
                    return;
                }
                _updateExpiryBanner();
            }, 30000); // revisar cada 30 s
        }

        function _updateExpiryBanner() {
            var banner    = document.getElementById('expiry-banner');
            var ONE_HOUR  = 60 * 60 * 1000;
            var remaining = _expiresAt ? _expiresAt - Date.now() : 0;
            if (remaining > 0 && remaining < ONE_HOUR) {
                var mins = Math.floor(remaining / 60000);
                banner.textContent = '⚠️ Este acceso expira en ' + mins + ' minuto' + (mins !== 1 ? 's' : '') + '.';
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }

        // ── Helpers ───────────────────────────────────────────────

        function _showPinError(msg) {
            pinError.textContent = msg;
            pinError.classList.remove('hidden');
        }

        function _showScreen(id) {
            var screens = document.querySelectorAll('.screen');
            for (var i = 0; i < screens.length; i++) {
                screens[i].classList.add('hidden');
                screens[i].classList.remove('active');
            }
            var target = document.getElementById(id);
            if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
        }

        function _clearSession() {
            _currentPin = null;
            _expiresAt  = null;
            if (_expiryTimer) { clearInterval(_expiryTimer); _expiryTimer = null; }
        }

    }); // DOMContentLoaded

})();
