// =================================================================
// [LÓGICO BACKEND] Motor de cálculo IMC (OMS 2004) — sin cambios
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
function _calcIMC(weight, height) {
    const heightM = height / 100;
    return weight / (heightM * heightM);
}

function _imcToMarkerPct(imc) {
    const c = Math.max(10, Math.min(40, imc));
    let pct;
    if (c < 18.5) {
        pct = 2  + ((c - 10)   / (18.5 - 10)) * (25 - 2);
    } else if (c < 25) {
        pct = 25 + ((c - 18.5) / (25 - 18.5)) * (50 - 25);
    } else if (c < 30) {
        pct = 50 + ((c - 25)   / (30 - 25))   * (75 - 50);
    } else {
        pct = 75 + ((c - 30)   / (40 - 30))   * (98 - 75);
    }
    return (Math.round(pct * 10) / 10) + '%';
}

function _imcStatus(imc) {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25)   return 'Peso normal';
    if (imc < 30)   return 'Sobrepeso';
    return 'Obesidad';
}

// =================================================================
// [ARQUITECTO VISUAL — sin modificaciones] Lógica de UI e i18n
// [LÓGICO BACKEND] Firestore read + stale-while-revalidate — 2026-04-02
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

/**
 * Perfil compatible con Motor V2 (Cloud Function).
 * [ESCUDO FARMACOLÓGICO — FIX CRÍTICO]
 * medicamentos[] se extrae SIEMPRE del selector en memoria (NuraMedSelector).
 * El caché AES-GCM puede estar desactualizado si el usuario cambió selección
 * sin recargar. El Set en memoria es la única fuente de verdad fiable.
 */
function _normalizeProfileForMotor(profile) {
    if (!profile) return null;
    const p = { ...profile };

    // Garantizar enfermedades[]
    if (!Array.isArray(p.enfermedades)) p.enfermedades = [];
    if (p.enfermedades.length === 0 && p.pathology && p.pathology !== 'none') {
        p.enfermedades = [p.pathology];
    }

    // [ESCUDO FARMACOLÓGICO] Medicamentos desde la selección VIVA del UI.
    // Si NuraMedSelector ya está inicializado (window o módulo local),
    // sobreescribimos SIEMPRE para que el fetch refleje la selección actual.
    if (typeof NuraMedSelector !== 'undefined' && typeof NuraMedSelector.getSelected === 'function') {
        p.medicamentos = NuraMedSelector.getSelected();
    } else if (!Array.isArray(p.medicamentos)) {
        p.medicamentos = [];
    }

    return p;
}


// =================================================================
// [ESCUDO FARMACOLÓGICO] Selector de Medicamentos V2 — NuraMedSelector
// 24 fármacos con IDs exactos requeridos por clinical-rules.json
// Inicializado al final de DOMContentLoaded
// =================================================================
const NuraMedSelector = (() => {
    // IDs EXACTOS — deben coincidir con clinical-rules.json del backend
    const MED_LIST = [
        // Cardiología / Hipertensión
        { id: 'enalapril',          group: 'cardiologia' },
        { id: 'losartan',           group: 'cardiologia' },
        { id: 'digoxina',           group: 'cardiologia' },
        // Colesterol (Estatinas)
        { id: 'atorvastatina',      group: 'estatinas' },
        { id: 'simvastatina',       group: 'estatinas' },
        { id: 'lovastatina',        group: 'estatinas' },
        // Anticoagulantes
        { id: 'warfarina',          group: 'anticoagulantes' },
        { id: 'acenocumarol',       group: 'anticoagulantes' },
        // Diabetes / Tiroides
        { id: 'metformina',         group: 'diabetes' },
        { id: 'levotiroxina',       group: 'diabetes' },
        // Psiquiatría / Neurología
        { id: 'litio',              group: 'psiquiatria' },
        { id: 'disulfiram',         group: 'psiquiatria' },
        { id: 'fenelzina',          group: 'psiquiatria' },
        { id: 'tranilcipromina',    group: 'psiquiatria' },
        // Antibióticos / Antiparasitarios
        { id: 'ciprofloxacino',     group: 'antibioticos' },
        { id: 'tetraciclina',       group: 'antibioticos' },
        { id: 'doxiciclina',        group: 'antibioticos' },
        { id: 'metronidazol',       group: 'antibioticos' },
        // Inmunosupresores
        { id: 'ciclosporina',       group: 'inmunosupresores' },
        { id: 'tacrolimus',         group: 'inmunosupresores' },
        // Otros
        { id: 'paracetamol',        group: 'otros' },
        { id: 'anticonceptivo_oral',group: 'otros' },
        { id: 'alopurinol',         group: 'otros' },
        { id: 'metotrexato',        group: 'otros' },
    ];

    const STORAGE_KEY = 'nura_medicamentos_v2';
    let _selected = new Set();
    let _statusEl = null;
    let _badgeEl  = null;
    let _countEl  = null;

    // ── Persistencia ─────────────────────────────────────────────
    async function _persist() {
        const arr = [..._selected];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

        const profile = await MedicalStorage.loadProfile();
        if (profile) {
            profile.medicamentos = arr;
            await MedicalStorage.updateCache(profile);
        }

        const auth = window.NuraFirebase && window.NuraFirebase.auth;
        if (!auth) return;
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const { doc, setDoc } = await import(
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
            );
            await setDoc(
                doc(window.NuraFirebase.db, 'users', user.uid),
                { medicamentos: arr, medicamentosUpdatedAt: new Date().toISOString() },
                { merge: true }
            );
        } catch (err) {
            console.warn('[NuraMedSelector] Firestore sync failed:', err.message);
        }
    }

    // ── Status temporal ──────────────────────────────────────────
    function _showStatus(msg) {
        if (!_statusEl) return;
        _statusEl.textContent = msg;
        setTimeout(() => { if (_statusEl) _statusEl.textContent = ''; }, 2500);
    }

    // ── Estado visual de un chip ─────────────────────────────────
    function _setChipState(chip, isActive) {
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', String(isActive));
    }

    // ── Badge global (pie de tarjeta) ────────────────────────────
    function _updateGlobalBadge() {
        if (!_badgeEl || !_countEl) return;
        const n = _selected.size;
        if (n === 0) {
            _badgeEl.style.display = 'none';
        } else {
            _badgeEl.style.display = 'flex';
            _countEl.textContent = `💊 ${n} medicamento${n !== 1 ? 's' : ''} activo${n !== 1 ? 's' : ''}`;
        }
    }

    // ── Refresh chip "Ninguno" ───────────────────────────────────
    function _refreshNoneChip() {
        const noneChip = document.getElementById('med-chip-none');
        if (noneChip) _setChipState(noneChip, _selected.size === 0);
    }

    // ── Click handler ────────────────────────────────────────────
    function _handleClick(medId, chip) {
        if (medId === 'none') {
            _selected.clear();
            MED_LIST.forEach(m => {
                const c = document.getElementById('med-chip-' + m.id);
                if (c) _setChipState(c, false);
            });
            _setChipState(chip, true);
        } else {
            if (_selected.has(medId)) {
                _selected.delete(medId);
                _setChipState(chip, false);
            } else {
                _selected.add(medId);
                _setChipState(chip, true);
            }
            _refreshNoneChip();
        }
        _persist();
        _updateGlobalBadge();
        const n = _selected.size;
        _showStatus(n === 0
            ? '🚫 Sin medicamentos seleccionados.'
            : `✅ ${n} medicamento${n !== 1 ? 's' : ''} activo${n !== 1 ? 's' : ''} — payload listo.`
        );
    }

    // ── Exposición pública de la selección ───────────────────────
    function getSelected() {
        return [..._selected];
    }

    // ── Bootstrap ────────────────────────────────────────────────
    function init() {
        _statusEl = document.getElementById('med-save-status');
        _badgeEl  = document.getElementById('med-active-badge');
        _countEl  = document.getElementById('med-active-count');

        // Cargar selección persistida (migrar clave anterior si existe)
        try {
            const oldKey = localStorage.getItem('nura_medicamentos');
            const newKey = localStorage.getItem(STORAGE_KEY);
            const raw    = newKey || oldKey || '[]';
            JSON.parse(raw).forEach(id => _selected.add(id));
        } catch (_) {}

        // Vincular todos los chips por data-med-id (funciona con la nueva estructura accordion)
        MED_LIST.forEach(({ id }) => {
            const chip = document.getElementById('med-chip-' + id);
            if (!chip) return;
            _setChipState(chip, _selected.has(id));
            chip.addEventListener('click', () => _handleClick(id, chip));
        });

        // Vincular chip "Ninguno"
        const noneChip = document.getElementById('med-chip-none');
        if (noneChip) {
            _setChipState(noneChip, _selected.size === 0);
            noneChip.addEventListener('click', () => _handleClick('none', noneChip));
        }

        _updateGlobalBadge();

        console.log('[NuraMedSelector] Init OK —', _selected.size, 'fármaco(s) cargado(s):', [..._selected]);
    }

    return { init, getSelected };
})();


document.addEventListener('DOMContentLoaded', async () => {

    // ── [ESCUDO FARMACOLÓGICO] Init PRIMERO — antes de cualquier await ────────
    // Esto garantiza que _selected se cargue desde localStorage antes de
    // cualquier llamada a _normalizeProfileForMotor o fetch al backend.
    NuraMedSelector.init();
    window.NuraMedSelector = NuraMedSelector;

    // ── [LÓGICO BACKEND] Guard de sesión ─────────────────────────
    // authStateReady() espera a que Firebase rehidrate el token antes
    // de evaluar currentUser. Crítico para cargas directas (URL, F5)
    // donde currentUser puede ser null transitoriamente.
    const auth = window.NuraFirebase.auth;
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
        console.warn('[Dashboard] Sin sesión activa. Redirigiendo a auth.');
        window.location.href = '../auth/index.html';
        return;
    }


    // ── [LÓGICO BACKEND] Render function ─────────────────────────
    // Extraída para ser llamada tanto desde caché como desde Firestore.
    // Devuelve true si el perfil tenía datos suficientes para renderizar.
    function _renderProfile(profile) {
        if (!profile || profile.weight == null || profile.height == null) return false;

        // Textos estáticos (original del Arquitecto, intacto)
        document.getElementById('title').textContent                = t.pageTitle;
        document.getElementById('subtitle').textContent             = t.pageSubtitle;
        document.getElementById('card-metabolic-title').textContent = t.cardMetabolicTitle;
        document.getElementById('label-weight').textContent         = t.weightLabel;
        document.getElementById('label-height').textContent         = t.heightLabel;
        document.getElementById('bmi-title').textContent            = t.bmiTitle;
        document.getElementById('txt-profile').textContent          = t.actionProfile;
        document.getElementById('txt-meds').textContent             = t.actionMeds;
        document.getElementById('txt-scan').textContent             = t.actionScan;
        
        // Texts scanner
        const inputFoodSearch = document.getElementById('input-food-search');
        if (inputFoodSearch) inputFoodSearch.placeholder = t.searchFoodPlaceholder;
        const txtScanBarcode = document.getElementById('txt-scan-barcode');
        if (txtScanBarcode) txtScanBarcode.textContent = t.btnScanBarcode;
        
        const btnCloseResult = document.getElementById('btn-close-result');
        if (btnCloseResult) btnCloseResult.textContent = t.btnCloseResult;

        // Datos reales del perfil — textContent, nunca innerHTML
        const imc      = _calcIMC(profile.weight, profile.height);
        const imcRound = Math.round(imc * 10) / 10;

        document.getElementById('val-weight').textContent = profile.weight + ' kg';
        document.getElementById('val-height').textContent = profile.height + ' cm';
        document.getElementById('bmi-value').textContent  = imcRound;
        document.getElementById('bmi-status').textContent = _imcStatus(imc);

        // Marcador del slider — solo style.left, transición CSS se activa sola
        document.querySelector('.bmi-marker').style.left = _imcToMarkerPct(imc);

        console.log('[Dashboard] Renderizado.', {
            source: profile._source || 'cache',
            imc:    imcRound,
            status: _imcStatus(imc)
        });
        return true;
    }

    // ── Paso 1: Render instantáneo desde caché local (offline-first) ─
    const cachedProfile     = await MedicalStorage.loadProfile();
    const renderedFromCache = _renderProfile(cachedProfile);

    // ── Paso 2: Firestore — fuente de verdad canónica ────────────
    try {
        const { doc, getDoc } =
            await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        const snap = await getDoc(doc(window.NuraFirebase.db, 'users', user.uid));

        if (snap.exists()) {
            const firestoreData = { ...snap.data(), _source: 'firestore' };

            // ── [LÓGICO BACKEND] Guardia de Ruta — consentimiento legal ──
            const lc = firestoreData.legal_consent;
            if (!lc || lc.legal_version !== LEGAL_VERSION) {
                console.warn(
                    '[Dashboard] legal_consent ausente o desactualizado',
                    { found: lc?.legal_version, required: LEGAL_VERSION }
                );
                window.location.href = '../onboarding/index.html';
                return;
            }
            // ── [FIN Guardia de Ruta] ─────────────────────────────────

            // Sincronizar caché con datos frescos de Firestore
            await MedicalStorage.updateCache(firestoreData);

            // Re-render silencioso — garantiza consistencia multi-dispositivo
            _renderProfile(firestoreData);

        } else if (!renderedFromCache) {
            // Sin datos en Firestore ni en caché → el perfil no existe aún
            console.warn('[Dashboard] Sin datos en Firestore ni caché. Redirigiendo.');
            window.location.href = '../onboarding/index.html';
        }

    } catch (err) {
        console.warn('[Dashboard] Firestore read failed:', err.code, err.message);
        if (!renderedFromCache) {
            // Sin caché de respaldo → no hay datos que mostrar
            window.location.href = '../onboarding/index.html';
        }
        // Con caché: ya renderizado, fallo de red es silencioso (modo offline)
    }
    
    // ── [ARQUITECTO VISUAL] Interacciones Scanner Híbrido ─────────
    const readerDiv = document.getElementById('reader');

    const btnSearchFood = document.getElementById('btn-search-food');
    const inputFoodSearch = document.getElementById('input-food-search');
    const resultCard = document.getElementById('scan-result-card');
    
    if (btnSearchFood && resultCard) {
        btnSearchFood.addEventListener('click', async () => {
            const query = inputFoodSearch.value.trim();
            if (!query) return;

            const render = window.NuraDashboardUI && window.NuraDashboardUI.renderFoodAnalysis;
            if (typeof render !== 'function') {
                console.error('[Dashboard] NuraDashboardUI.renderFoodAnalysis missing (scanner.js before app.js).');
                return;
            }

            resultCard.style.display = 'block';
            document.getElementById('result-product-name').textContent = query;
            document.getElementById('traffic-light-label').textContent = t.analyzingLabel || 'Analizando…';
            document.getElementById('traffic-light').className = 'traffic-light';
            const clearDiag = window.NuraDashboardUI && window.NuraDashboardUI.clearDiagnosisPanel;
            if (typeof clearDiag === 'function') clearDiag();
            const leadDiag = document.getElementById('result-diagnosis-lead');
            if (leadDiag) {
                leadDiag.textContent =
                    t.searchOffMessage || 'Buscando producto y evaluando con el motor clínico Nura…';
            }

            readerDiv.style.display = 'none';

            let profile = _normalizeProfileForMotor(await MedicalStorage.loadProfile());

            if (!profile) {
                render(
                    { productName: query, imageUrl: '', ingredients: [] },
                    {
                        blocked: true,
                        criticalRisk: {
                            message:
                                'No se encontró perfil médico. Completa el Perfil Médico antes de analizar alimentos.'
                        }
                    }
                );
                return;
            }

            console.log('[Dashboard] Payload textSearch — medicamentos:', profile.medicamentos);

            const leadDiag2 = document.getElementById('result-diagnosis-lead');
            if (leadDiag2) {
                leadDiag2.textContent = t.motorRunningMessage || 'Consultando producto y motor clínico…';
            }

            let result;
            try {
                result = await AIMedicalAgent.analyzeFoodByTextQuery(profile, query);
            } catch (err) {
                console.error('[Dashboard] analyzeFoodByTextQuery:', err);
                result = {
                    foodData: { productName: query, imageUrl: '', ingredients: [], sellos: [] },
                    analysis: {
                        blocked: false,
                        overall_risk: 'unknown',
                        recommendation:
                            'No fue posible completar el análisis. Consulte a su médico o nutricionista antes de consumir.',
                        consult_doctor: true,
                        source: 'FALLBACK_CONSERVATIVE'
                    }
                };
            }

            render(result.foodData, result.analysis);

            // ── Motor de Sustitución: activar si riesgo alto ──────
            var riskNormTxt = String((result.analysis && result.analysis.overall_risk) || '').toLowerCase();
            if ((result.analysis && result.analysis.blocked) || riskNormTxt === 'high' || riskNormTxt === 'alto') {
                if (window.NuraDashboardUI && typeof window.NuraDashboardUI.triggerAlternativas === 'function') {
                    window.NuraDashboardUI.triggerAlternativas(result.foodData, result.analysis, profile);
                }
            }
        });

        // Presionar Enter
        inputFoodSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnSearchFood.click();
        });

        const btnCloseResult = document.getElementById('btn-close-result');
        if (btnCloseResult) {
            btnCloseResult.addEventListener('click', () => {
                resultCard.style.display = 'none';
                inputFoodSearch.value = '';
                var altCard = document.getElementById('alternatives-card');
                if (altCard) altCard.parentNode.removeChild(altCard);
            });
        }
    }
    // ── [FIN ARQUITECTO VISUAL] ───────────────────────────────────

    const profileForPathologies = await MedicalStorage.loadProfile();
    if (profileForPathologies && window.NuraPathologyManager) {
        window.NuraPathologyManager.init(profileForPathologies, t);
    }

    // ── Pase de Cuidador ─────────────────────────────────────────
    _initCaregiverModal();

    // ── FIX 2: Edición de peso / altura ──────────────────────────
    _initWeightHeightEdit(user);

    // ── FIX 3: Cargar último examen desde Firestore ───────────────
    _loadLatestExamScore(user);
});

// =================================================================
// 🛡️ Modal "Generar Pase de Cuidador"
// Envía { enfermedades, medicamentos } al backend para crear la sesión.
// Solo muestra PIN + QR al paciente — nunca datos médicos en el modal.
// =================================================================
function _initCaregiverModal() {
    var GENERATE_PIN_URL = 'https://us-central1-nura-33fc1.cloudfunctions.net/generateCaregiverPin';

    var btnOpen    = document.getElementById('btn-caregiver-pin');
    var overlay    = document.getElementById('caregiver-modal-overlay');
    var btnClose   = document.getElementById('btn-close-caregiver-modal');
    var btnRetry   = document.getElementById('btn-retry-caregiver');
    var loadingEl  = document.getElementById('caregiver-pin-loading');
    var contentEl  = document.getElementById('caregiver-pin-content');
    var errorEl    = document.getElementById('caregiver-pin-error');
    var pinText    = document.getElementById('caregiver-pin-text');
    var expiryLbl  = document.getElementById('caregiver-expiry-label');
    var qrContainer = document.getElementById('caregiver-qr');

    if (!btnOpen || !overlay) return;

    btnOpen.addEventListener('click', _openModal);
    btnClose.addEventListener('click', _closeModal);
    if (btnRetry) btnRetry.addEventListener('click', _generatePin);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeModal();
    });

    function _openModal() {
        overlay.classList.remove('hidden');
        _showState('loading');
        _generatePin();
    }

    function _closeModal() {
        overlay.classList.add('hidden');
        // Limpiar QR al cerrar para evitar acumulación de canvases
        if (qrContainer) qrContainer.innerHTML = '';
    }

    async function _generatePin() {
        _showState('loading');

        try {
            // Leer perfil del paciente para enviarlo al backend
            var rawProfile = await MedicalStorage.loadProfile();
            if (!rawProfile) {
                _showState('error');
                return;
            }

            // Construir perfil con medicamentos del selector en memoria
            var enfermedades = Array.isArray(rawProfile.enfermedades) ? rawProfile.enfermedades : [];
            if (enfermedades.length === 0 && rawProfile.pathology && rawProfile.pathology !== 'none') {
                enfermedades = [rawProfile.pathology];
            }
            var medicamentos = (window.NuraMedSelector && typeof window.NuraMedSelector.getSelected === 'function')
                ? window.NuraMedSelector.getSelected()
                : (Array.isArray(rawProfile.medicamentos) ? rawProfile.medicamentos : []);

            var resp = await fetch(GENERATE_PIN_URL, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ profile: { enfermedades, medicamentos } })
            });

            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            var data = await resp.json();
            if (data.status !== 'success' || !data.pin) throw new Error('Respuesta inválida');

            // Mostrar PIN
            pinText.textContent = data.pin;

            // Mostrar expiración
            var expDate = new Date(data.expiresAt);
            expiryLbl.textContent = 'Válido hasta: ' + expDate.toLocaleTimeString('es-CL', {
                hour: '2-digit', minute: '2-digit'
            }) + ' del ' + expDate.toLocaleDateString('es-CL');

            // Generar QR con solo el PIN (sin datos médicos)
            if (qrContainer) {
                qrContainer.innerHTML = '';
                if (typeof QRCode !== 'undefined') {
                    new QRCode(qrContainer, {
                        text:          data.pin,
                        width:         160,
                        height:        160,
                        colorDark:     '#282c34',
                        colorLight:    '#ffffff',
                        correctLevel:  QRCode.CorrectLevel.M
                    });
                }
            }

            _showState('content');

        } catch (err) {
            console.error('[CaregiverModal] generatePin:', err.message);
            _showState('error');
        }
    }

    function _showState(state) {
        loadingEl.classList.add('hidden');
        contentEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        if (state === 'loading') loadingEl.classList.remove('hidden');
        if (state === 'content') contentEl.classList.remove('hidden');
        if (state === 'error')   errorEl.classList.remove('hidden');
    }
}

// =================================================================
// FIX 2: Edición inline de peso / altura
// =================================================================
function _initWeightHeightEdit(user) {
    const btnEdit    = document.getElementById('btn-edit-metrics');
    const editForm   = document.getElementById('metrics-edit-form');
    const btnSave    = document.getElementById('btn-save-metrics');
    const btnCancel  = document.getElementById('btn-cancel-metrics');
    const statusEl   = document.getElementById('metrics-save-status');
    const inputW     = document.getElementById('input-edit-weight');
    const inputH     = document.getElementById('input-edit-height');

    if (!btnEdit || !editForm || !btnSave || !btnCancel) return;

    btnEdit.addEventListener('click', async () => {
        const profile = await MedicalStorage.loadProfile();
        if (profile) {
            if (profile.weight) inputW.value = profile.weight;
            if (profile.height) inputH.value = profile.height;
        }
        editForm.classList.remove('hidden');
        btnEdit.classList.add('hidden');
        inputW.focus();
    });

    btnCancel.addEventListener('click', () => {
        editForm.classList.add('hidden');
        btnEdit.classList.remove('hidden');
        if (statusEl) statusEl.textContent = '';
    });

    btnSave.addEventListener('click', async () => {
        const w = parseFloat(inputW.value);
        const h = parseInt(inputH.value, 10);

        if (isNaN(w) || w < 20 || w > 300) {
            if (statusEl) { statusEl.textContent = 'Peso inválido (20–300 kg).'; statusEl.style.color = 'var(--orange-strong)'; }
            return;
        }
        if (isNaN(h) || h < 50 || h > 250) {
            if (statusEl) { statusEl.textContent = 'Altura inválida (50–250 cm).'; statusEl.style.color = 'var(--orange-strong)'; }
            return;
        }

        btnSave.disabled = true;
        if (statusEl) { statusEl.textContent = 'Guardando…'; statusEl.style.color = 'var(--text-muted)'; }

        try {
            const { doc, setDoc } = await import(
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
            );
            await setDoc(
                doc(window.NuraFirebase.db, 'users', user.uid),
                { weight: w, height: h, updatedAt: new Date().toISOString() },
                { merge: true }
            );
        } catch (err) {
            console.warn('[WeightHeightEdit] Firestore error:', err.message);
            if (statusEl) { statusEl.textContent = 'Error al guardar en la nube.'; statusEl.style.color = 'var(--orange-strong)'; }
            btnSave.disabled = false;
            return;
        }

        await MedicalStorage.updateProfile({ weight: w, height: h });

        // Re-render the metabolic card
        document.getElementById('val-weight').textContent = w + ' kg';
        document.getElementById('val-height').textContent = h + ' cm';
        const imc      = _calcIMC(w, h);
        const imcRound = Math.round(imc * 10) / 10;
        document.getElementById('bmi-value').textContent  = imcRound;
        document.getElementById('bmi-status').textContent = _imcStatus(imc);
        document.querySelector('.bmi-marker').style.left  = _imcToMarkerPct(imc);

        if (statusEl) { statusEl.textContent = 'Guardado.'; statusEl.style.color = 'var(--success)'; }
        setTimeout(() => {
            editForm.classList.add('hidden');
            btnEdit.classList.remove('hidden');
            if (statusEl) statusEl.textContent = '';
            btnSave.disabled = false;
        }, 1200);
    });
}

// =================================================================
// FIX 3: Cargar y mostrar el último score metabólico al iniciar
// =================================================================
async function _loadLatestExamScore(user) {
    try {
        const { collection, query, orderBy, limit, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
        );
        const db      = window.NuraFirebase.db;
        const histRef = collection(db, 'users', user.uid, 'exam_history');
        const q       = query(histRef, orderBy('timestamp', 'desc'), limit(1));
        const snap    = await getDocs(q);

        if (snap.empty) return;

        const d         = snap.docs[0].data();
        const scoreData = _scoreDataFromDoc(d);
        const fecha     = d.fecha_examen || null;

        // Show score section without hiding the main dashboard cards
        const backVerifBtn = document.getElementById('btn-score-back');
        const backDashBtn  = document.getElementById('btn-score-to-dashboard');
        if (backVerifBtn) backVerifBtn.classList.add('hidden');
        if (backDashBtn)  backDashBtn.classList.remove('hidden');

        _renderScoreSection(scoreData, fecha);

    } catch (err) {
        console.warn('[LatestExam] No se pudo cargar historial:', err.message);
    }
}

// =================================================================
// 🔬 LECTOR DE EXÁMENES CLÍNICOS — Fase 3, Paso 2
// Upload a Storage → Cloud Function → Formulario híbrido auto-fill
// NO guarda en Firestore (eso es Paso 3).
// =================================================================

const PROCESS_EXAM_URL = 'https://us-central1-nura-33fc1.cloudfunctions.net/processMedicalExam';

// ── Categorías de biomarcadores (10 grupos) ───────────────────────
const EXAM_CATEGORIES = {
    metabolicos:  ['glucosa', 'hba1c', 'acido_urico', 'insulina_basal', 'peptido_c', 'fructosamina'],
    lipidos:      ['colesterol_total', 'ldl', 'hdl', 'trigliceridos', 'homocisteina'],
    renal:        ['creatinina', 'urea', 'tfg', 'potasio', 'fosforo', 'sodio', 'microalbuminuria'],
    hepatico:     ['got_ast', 'gpt_alt', 'ggt', 'bilirrubina', 'fosfatasa_alcalina', 'albumina', 'proteinas_totales', 'ldh'],
    hematologico: ['hemoglobina', 'hematocrito', 'leucocitos', 'plaquetas', 'hierro_serico', 'ferritina', 'vitamina_b12', 'acido_folico', 'transferrina', 'saturacion_transferrina', 'tibc', 'haptoglobina', 'vitamina_d'],
    tiroides:     ['tsh', 't4_libre', 't3_libre'],
    coagulacion:  ['inr'],
    minerales:    ['calcio', 'magnesio'],
    inflamacion:  ['pcr', 'vhs'],
    hormonal:     ['cortisol', 'psa', 'ceruloplasmina']
};

// Etiquetas legibles para el usuario
const EXAM_LABELS = {
    // Metabólicos
    glucosa:                 'Glucosa basal',
    hba1c:                   'HbA1c',
    acido_urico:             'Ácido Úrico',
    insulina_basal:          'Insulina basal',
    peptido_c:               'Péptido C',
    fructosamina:            'Fructosamina',
    // Lípidos
    colesterol_total:        'Colesterol Total',
    ldl:                     'LDL',
    hdl:                     'HDL',
    trigliceridos:           'Triglicéridos',
    homocisteina:            'Homocisteína',
    // Renal
    creatinina:              'Creatinina',
    urea:                    'BUN / Urea',
    tfg:                     'TFG',
    potasio:                 'Potasio',
    fosforo:                 'Fósforo',
    sodio:                   'Sodio',
    microalbuminuria:        'Microalbuminuria',
    // Hepático
    got_ast:                 'GOT / AST',
    gpt_alt:                 'GPT / ALT',
    ggt:                     'GGT',
    bilirrubina:             'Bilirrubina total',
    fosfatasa_alcalina:      'Fosfatasa Alcalina',
    albumina:                'Albúmina',
    proteinas_totales:       'Proteínas Totales',
    ldh:                     'LDH',
    // Hematológico
    hemoglobina:             'Hemoglobina',
    hematocrito:             'Hematocrito',
    leucocitos:              'Glóbulos Blancos',
    plaquetas:               'Plaquetas',
    hierro_serico:           'Hierro sérico',
    ferritina:               'Ferritina',
    vitamina_b12:            'Vitamina B12',
    acido_folico:            'Ácido Fólico',
    transferrina:            'Transferrina',
    saturacion_transferrina: 'Sat. Transferrina',
    tibc:                    'TIBC',
    haptoglobina:            'Haptoglobina',
    vitamina_d:              'Vitamina D',
    // Tiroides
    tsh:                     'TSH',
    t4_libre:                'T4 Libre',
    t3_libre:                'T3 Libre',
    // Coagulación
    inr:                     'INR',
    // Minerales
    calcio:                  'Calcio sérico',
    magnesio:                'Magnesio',
    // Inflamación
    pcr:                     'PCR',
    vhs:                     'VHS',
    // Hormonal
    cortisol:                'Cortisol',
    psa:                     'PSA',
    ceruloplasmina:          'Ceruloplasmina'
};

// ── Unidades para campos manuales (sin datos de la IA) ────────────
const MANUAL_UNIT = {
    glucosa: 'mg/dL',       hba1c: '%',               acido_urico: 'mg/dL',
    insulina_basal: 'µU/mL',peptido_c: 'ng/mL',       fructosamina: 'µmol/L',
    colesterol_total: 'mg/dL', ldl: 'mg/dL',          hdl: 'mg/dL',
    trigliceridos: 'mg/dL', homocisteina: 'µmol/L',
    creatinina: 'mg/dL',    urea: 'mg/dL',             tfg: 'mL/min',
    potasio: 'mEq/L',       fosforo: 'mg/dL',          sodio: 'mEq/L',
    microalbuminuria: 'mg/L',
    got_ast: 'U/L',         gpt_alt: 'U/L',            ggt: 'U/L',
    bilirrubina: 'mg/dL',   fosfatasa_alcalina: 'U/L', albumina: 'g/dL',
    proteinas_totales: 'g/dL', ldh: 'U/L',
    hemoglobina: 'g/dL',    hematocrito: '%',           leucocitos: '/µL',
    plaquetas: '/µL',       hierro_serico: 'µg/dL',    ferritina: 'ng/mL',
    vitamina_b12: 'pg/mL',  acido_folico: 'ng/mL',     transferrina: 'mg/dL',
    saturacion_transferrina: '%', tibc: 'µg/dL',       haptoglobina: 'mg/dL',
    vitamina_d: 'ng/mL',
    tsh: 'mUI/L',           t4_libre: 'ng/dL',          t3_libre: 'pg/mL',
    inr: '',
    calcio: 'mg/dL',        magnesio: 'mg/dL',
    pcr: 'mg/L',            vhs: 'mm/h',
    cortisol: 'µg/dL',      psa: 'ng/mL',              ceruloplasmina: 'mg/dL'
};

// ── Conversión de unidades para display (mmol/L en locales europeos) ─
const MMOL_LOCALES  = ['en-GB', 'en-IE', 'de', 'fr', 'nl', 'da', 'sv', 'nb', 'fi', 'pl', 'cs', 'hu', 'pt-PT'];
const MGDL_TO_MMOL  = {
    glucosa:          1 / 18.016,
    colesterol_total: 1 / 38.67,
    ldl:              1 / 38.67,
    hdl:              1 / 38.67,
    trigliceridos:    1 / 88.57,
    urea:             1 / 2.801,
    acido_urico:      1 / 16.81
};

function _usesMmol() {
    const lang = (navigator.language || 'es').toLowerCase();
    return MMOL_LOCALES.some((l) => lang.startsWith(l.toLowerCase()));
}

function _displayValue(nombre, valorMgdl) {
    if (_usesMmol() && MGDL_TO_MMOL[nombre]) {
        return parseFloat((valorMgdl * MGDL_TO_MMOL[nombre]).toFixed(3));
    }
    return valorMgdl;
}

function _displayUnit(nombre, unidadBase) {
    if (_usesMmol() && MGDL_TO_MMOL[nombre]) return 'mmol/L';
    return unidadBase;
}

// ── Mapeo de estado → clase de confianza visual ─────────────────
function _estadoToConfClass(estado) {
    if (!estado || estado === 'normal') return 'conf-alta';
    if (estado === 'alto' || estado === 'bajo') return 'conf-media';
    return 'conf-baja'; // critico_alto, critico_bajo, depende_genero
}

function _estadoToConfLabel(estado) {
    if (!estado || estado === 'normal') return '✨';
    if (estado === 'alto' || estado === 'bajo') return 'Verificar';
    return '⚠️ Revisar';
}

// ── Construir un campo de biomarcador ────────────────────────────
// isAutofill = true  → campo rellenado por la IA (borde azul + ✨)
// isAutofill = false → campo vacío para entrada manual
function _buildBiomarkerField(b, isAutofill = false) {
    const label    = EXAM_LABELS[b.nombre] || b.nombre;
    const unit     = b.unidad_base || MANUAL_UNIT[b.nombre] || '';
    const hasValue = b.valor !== null && b.valor !== undefined && b.valor !== '';
    const dispVal  = hasValue ? _displayValue(b.nombre, b.valor) : '';
    const dispUnit = _displayUnit(b.nombre, unit);

    const confClass = isAutofill ? (_estadoToConfClass(b.estado) || '') : '';
    const confLabel = isAutofill ? (_estadoToConfLabel(b.estado) || '') : '';

    const wrapper = document.createElement('div');
    wrapper.className = [
        'exam-field-wrapper',
        isAutofill ? 'exam-field--autofill' : 'exam-field--manual',
        confClass
    ].filter(Boolean).join(' ');
    wrapper.dataset.nombre = b.nombre;

    const hasExpl  = !!EXPLICACIONES[b.nombre];
    const autofillBadge = isAutofill && confLabel
        ? `<span class="exam-autofill-badge" title="Detectado por IA">✨</span><span class="exam-conf-badge exam-conf-badge--${confClass}">${confLabel}</span>`
        : '';
    const rangeHtml = isAutofill && b.rango_normal
        ? `<p class="exam-field-range">Ref: ${b.rango_normal}</p>`
        : '';

    wrapper.innerHTML = `
        <label class="exam-field-label">
            <span class="exam-field-name">${label}</span>
            ${hasExpl ? `<button type="button" class="btn-expl" data-nombre="${b.nombre}" aria-label="Qué es ${label}">ℹ</button>` : ''}
            ${autofillBadge}
        </label>
        <div class="exam-field-row">
            <input
                type="number"
                step="any"
                class="exam-field-input"
                id="exam-input-${b.nombre}"
                name="${b.nombre}"
                ${hasValue ? `value="${dispVal}"` : ''}
                data-valor-mgdl="${b.valor || ''}"
                data-unidad-base="${unit}"
                data-estado="${b.estado || ''}"
                aria-label="${label}"
                placeholder="—"
            >
            <span class="exam-field-unit">${dispUnit}</span>
        </div>
        ${rangeHtml}
    `;
    return wrapper;
}

// ── Rellenar el formulario (siempre muestra todos los campos) ─────
// Los detectados por IA aparecen con borde teal + ✨
// Los no detectados aparecen vacíos para entrada manual.
// Todas las secciones arrancan colapsadas; solo se abren las que tienen valores alterados.

function _populateExamForm(data) {
    const byNombre = {};
    (data.biomarcadores || []).forEach((b) => { byNombre[b.nombre] = b; });

    let totalAI = 0;

    Object.entries(EXAM_CATEGORIES).forEach(([cat, nombres]) => {
        const container = document.getElementById('group-' + cat);
        if (!container) return;
        container.innerHTML = '';

        let filledCount = 0;
        let hasAltered  = false;

        nombres.forEach((nombre) => {
            const bio = byNombre[nombre];
            if (bio) {
                container.appendChild(_buildBiomarkerField(bio, true));
                totalAI++;
                filledCount++;
                if (bio.estado && bio.estado !== 'normal') hasAltered = true;
            } else {
                const emptyBio = {
                    nombre,
                    valor: null,
                    unidad_base: MANUAL_UNIT[nombre] || '',
                    estado: null,
                    rango_normal: ''
                };
                container.appendChild(_buildBiomarkerField(emptyBio, false));
            }
        });

        // Abrir solo si tiene valores alterados detectados por la IA
        const details = container.closest('details');
        if (details) {
            details.open = hasAltered;
        }

        // Actualizar badge de conteo
        const countEl = document.getElementById('count-' + cat);
        if (countEl) {
            countEl.textContent = filledCount > 0
                ? `${filledCount} detectado${filledCount !== 1 ? 's' : ''}`
                : '';
        }
    });

    // Metadatos del examen
    const metaEl = document.getElementById('exam-meta-lab');
    if (metaEl) {
        const parts = [];
        if (data.laboratorio)        parts.push(data.laboratorio);
        if (data.fecha_examen)       parts.push(data.fecha_examen);
        if (data._multiFileCount)    parts.push(`${data._multiFileCount} archivos`);
        if (parts.length > 0)  metaEl.textContent = parts.join(' · ');
        else                   metaEl.textContent = `${totalAI} biomarcadores detectados`;
    }
}

// ── Leer todos los inputs del formulario → objeto plano ─────────
function _collectExamFormData() {
    const inputs = document.querySelectorAll('#exam-verification-form .exam-field-input');
    const result = {};
    inputs.forEach((input) => {
        const nombre = input.name;
        if (!nombre) return;
        const rawVal = parseFloat(input.value);
        if (isNaN(rawVal)) return;

        // Reconvertir a mg/dL si el display estaba en mmol/L
        let valorMgdl = rawVal;
        if (_usesMmol() && MGDL_TO_MMOL[nombre]) {
            valorMgdl = parseFloat((rawVal / MGDL_TO_MMOL[nombre]).toFixed(2));
        }
        result[nombre] = {
            valor_mgdl:   valorMgdl,
            unidad_base:  input.dataset.unidadBase,
            estado:       input.dataset.estado
        };
    });
    return result;
}

// ── Utilidades de secciones del formulario de biomarcadores ──────

function expandAll() {
    document.querySelectorAll('#exam-verification-form details.exam-group').forEach(function(d) {
        d.open = true;
    });
}

function collapseAll() {
    document.querySelectorAll('#exam-verification-form details.exam-group').forEach(function(d) {
        d.open = false;
    });
}

function expandAltered() {
    document.querySelectorAll('#exam-verification-form details.exam-group').forEach(function(d) {
        var hasAltered = d.querySelector('.exam-field--autofill.conf-media, .exam-field--autofill.conf-baja');
        d.open = !!hasAltered;
    });
}

// ── Selector de modo: subir examen vs ingresar manual ────────────

function selectMode(mode) {
    var examSection    = document.getElementById('exam-section');
    var resultsSection = document.getElementById('exam-results-section');
    var modeManual     = document.getElementById('modeManual');

    if (mode === 'manual') {
        // Mostrar formulario vacío directamente
        _populateExamForm({ biomarcadores: [] });
        var metaEl = document.getElementById('exam-meta-lab');
        if (metaEl) metaEl.textContent = 'Introduce los valores manualmente';
        examSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        collapseAll();
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (modeManual) modeManual.style.borderColor = '#14b8a6';
    }
}

// ── Inicializar la sección del Lector de Exámenes ────────────────
function _initExamUpload() {
    const dropzone      = document.getElementById('exam-dropzone');
    const fileInput     = document.getElementById('exam-file-input');
    const analyzingEl   = document.getElementById('exam-analyzing');
    const errorEl       = document.getElementById('exam-error');
    const errorMsgEl    = document.getElementById('exam-error-msg');
    const retryBtn      = document.getElementById('btn-exam-retry');
    const examSection   = document.getElementById('exam-section');
    const resultsSection= document.getElementById('exam-results-section');
    const backBtn       = document.getElementById('btn-exam-back');
    const continueBtn   = document.getElementById('btn-exam-continue');
    const progressFill  = document.getElementById('exam-progress-fill');

    if (!dropzone || !fileInput) return;

    // ── Estados de la sección de subida ─────────────────────────
    function _showUploadState(state) {
        dropzone.classList.add('hidden');
        analyzingEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        if (state === 'drop')      dropzone.classList.remove('hidden');
        if (state === 'analyzing') analyzingEl.classList.remove('hidden');
        if (state === 'error')     errorEl.classList.remove('hidden');
    }

    function _showError(msg) {
        if (errorMsgEl) errorMsgEl.textContent = msg;
        _showUploadState('error');
    }

    // ── Animación de progreso falso durante análisis ─────────────
    let _progressTimer = null;
    function _startProgress() {
        if (!progressFill) return;
        progressFill.style.width = '0%';
        let pct = 0;
        _progressTimer = setInterval(() => {
            // Avanza rápido hasta 80%, luego se frena esperando la respuesta
            pct += pct < 80 ? 3 : 0.3;
            if (pct > 95) pct = 95;
            progressFill.style.width = pct + '%';
        }, 200);
    }
    function _stopProgress(complete) {
        clearInterval(_progressTimer);
        if (progressFill) progressFill.style.width = complete ? '100%' : '0%';
    }

    // ── Validar archivo antes de procesar ───────────────────────
    function _validateFile(file) {
        const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
        const MAX_BYTES     = 10 * 1024 * 1024;
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Solo se aceptan archivos PDF, JPG o PNG.';
        }
        if (file.size > MAX_BYTES) {
            return 'El archivo supera el límite de 10 MB.';
        }
        return null;
    }

    // ── Subir UN archivo y retornar datos (sin tocar el DOM) ────────
    async function _processSingleFileData(file) {
        const firebase = window.NuraFirebase;
        if (!firebase || !firebase.auth) throw new Error('Firebase no disponible.');

        const currentUser = firebase.auth.currentUser;
        if (!currentUser) throw new Error('Debes iniciar sesión para subir un examen.');

        const idToken = await currentUser.getIdToken();

        const { ref, uploadBytes } = await import(
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js'
        );
        const storage     = window.NuraFirebase.storage;
        const storagePath = `uploads/temp_exams/${currentUser.uid}/${Date.now()}_${file.name}`;
        const storageRef  = ref(storage, storagePath);

        await uploadBytes(storageRef, file, { contentType: file.type });

        const fnResp = await fetch(PROCESS_EXAM_URL, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify({ storagePath })
        });

        if (!fnResp.ok) {
            const errBody = await fnResp.json().catch(() => ({}));
            if (errBody.error === 'documento_no_valido') {
                throw new Error('El documento no parece ser un examen de laboratorio clínico.');
            }
            throw new Error(errBody.error || `Error HTTP ${fnResp.status}`);
        }

        const data = await fnResp.json();

        if (!data.biomarcadores || data.biomarcadores.length === 0) {
            throw new Error('No se detectaron biomarcadores en el examen. Verifica que la imagen sea legible.');
        }

        return data;
    }

    // ── Procesar uno o varios archivos en secuencia ───────────────
    async function _processFileSet(files) {
        for (const f of files) {
            const err = _validateFile(f);
            if (err) { _showError(err); return; }
        }

        _showUploadState('analyzing');
        _startProgress();

        const multiProgress = document.getElementById('exam-multi-progress');

        try {
            if (files.length === 1) {
                // ── Ruta de un solo archivo ─────────────────────
                if (multiProgress) multiProgress.style.display = 'none';
                const data = await _processSingleFileData(files[0]);
                _stopProgress(true);
                _populateExamForm(data);
            } else {
                // ── Ruta multi-archivo ──────────────────────────
                if (multiProgress) multiProgress.style.display = '';
                const allBio = {};
                const meta   = { laboratorio: null, fecha_examen: null };
                let   ok     = 0;

                for (let i = 0; i < files.length; i++) {
                    if (multiProgress) {
                        multiProgress.textContent =
                            `Analizando archivo ${i + 1} de ${files.length}… (${files[i].name})`;
                    }
                    try {
                        const data = await _processSingleFileData(files[i]);
                        ok++;
                        if (data.laboratorio  && !meta.laboratorio)  meta.laboratorio  = data.laboratorio;
                        if (data.fecha_examen && !meta.fecha_examen) meta.fecha_examen = data.fecha_examen;
                        (data.biomarcadores || []).forEach((bio) => {
                            const prev = allBio[bio.nombre];
                            // Preferir el valor con estado alterado, o el más reciente
                            if (!prev || (bio.estado && bio.estado !== 'normal' && (!prev.estado || prev.estado === 'normal'))) {
                                allBio[bio.nombre] = bio;
                            }
                        });
                    } catch (fileErr) {
                        console.warn(`[MultiExam] ${files[i].name}:`, fileErr.message);
                    }
                }

                if (multiProgress) multiProgress.textContent = 'Combinando resultados…';

                if (Object.keys(allBio).length === 0) {
                    throw new Error('No se encontraron biomarcadores en ninguno de los archivos.');
                }

                _stopProgress(true);

                const combined = {
                    ...meta,
                    biomarcadores:   Object.values(allBio),
                    _multiFileCount: ok
                };
                if (multiProgress) {
                    multiProgress.textContent =
                        `¡Listo! Se extrajeron ${Object.keys(allBio).length} biomarcadores de ${ok} archivo${ok !== 1 ? 's' : ''}.`;
                }
                _populateExamForm(combined);
            }

            examSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            console.error('[ExamUpload] Error:', err.message);
            _stopProgress(false);
            _showError(err.message || 'Ocurrió un error al procesar el examen.');
        }
    }

    // ── Eventos Drag & Drop ──────────────────────────────────────
    const fileCountLabel = document.getElementById('exam-file-count-label');

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) _processFileSet(files);
    });

    // ── Clic en la zona abre el selector de archivo ──────────────
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });

    fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files);
        if (fileCountLabel) {
            if (files.length === 1) {
                fileCountLabel.textContent = `1 archivo seleccionado: ${files[0].name}`;
                fileCountLabel.style.display = '';
            } else if (files.length > 1) {
                fileCountLabel.textContent = `${files.length} archivos seleccionados`;
                fileCountLabel.style.display = '';
            }
        }
        if (files.length > 0) { _processFileSet(files); fileInput.value = ''; }
    });

    // ── Botón reintentar ─────────────────────────────────────────
    if (retryBtn) {
        retryBtn.addEventListener('click', () => _showUploadState('drop'));
    }

    // ── Botón Limpiar todo ───────────────────────────────────────
    const clearBtn = document.getElementById('btn-clear-form');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.querySelectorAll('#exam-verification-form .exam-field-input').forEach((inp) => {
                inp.value = '';
                inp.dataset.estado = '';
            });
            const metaEl = document.getElementById('exam-meta-lab');
            if (metaEl) metaEl.textContent = 'Formulario limpio — introduce los valores manualmente';
            // Reset autofill badges
            document.querySelectorAll('.exam-field--autofill').forEach((w) => {
                w.classList.remove('exam-field--autofill');
                w.classList.add('exam-field--manual');
                const badge = w.querySelector('.exam-autofill-badge');
                if (badge) badge.remove();
                const conf = w.querySelector('.exam-conf-badge');
                if (conf) conf.remove();
            });
        });
    }

    // ── Botón volver (desde formulario al dropzone) ──────────────
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            resultsSection.classList.add('hidden');
            examSection.classList.remove('hidden');
            _showUploadState('drop');
            // Restablecer borde de la card manual
            var mm = document.getElementById('modeManual');
            if (mm) mm.style.borderColor = '#e5e7eb';
            examSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // ── Botón Siguiente — guarda en Firestore y muestra Score ────
    if (continueBtn) {
        continueBtn.addEventListener('click', async () => {
            continueBtn.disabled   = true;
            continueBtn.textContent = 'Guardando…';
            try {
                await _saveAndShowScore();
            } catch (err) {
                console.error('[ExamContinue]', err.message);
                continueBtn.disabled   = false;
                continueBtn.textContent = 'Siguiente: Evaluar mi Perfil →';
                _showError('No se pudieron guardar los resultados. Intenta de nuevo.');
                examSection.classList.remove('hidden');
                resultsSection.classList.add('hidden');
            }
        });
    }
}

// =================================================================
// 🧮 FASE 3 PASO 3 — Score Metabólico + Persistencia + Brief
// =================================================================

// ── Penalizaciones por estado clínico ───────────────────────────
const SCORE_PENALTY = {
    bajo:         5,
    alto:         10,
    depende_genero: 5,
    critico_bajo: 20,
    critico_alto: 20
};

// ── Chips legales: sin diagnósticos, solo "Marcador de X" ────────
const CHIP_MAP = {
    glucosa: (estado) => {
        if (estado === 'critico_alto' || estado === 'alto') return 'Marcador de Hiperglucemia';
        if (estado === 'critico_bajo' || estado === 'bajo') return 'Marcador de Hipoglucemia';
        return null;
    },
    hba1c:            (e) => (e !== 'normal') ? 'Marcador de Control Glucémico Alterado' : null,
    colesterol_total: (e) => (e !== 'normal') ? 'Marcador de Perfil Lipídico Alterado'  : null,
    ldl:              (e) => (e !== 'normal') ? 'Marcador de Perfil Lipídico Alterado'  : null,
    hdl:              (e) => (e !== 'normal') ? 'Marcador de HDL Reducido'              : null,
    trigliceridos:    (e) => (e !== 'normal') ? 'Marcador de Hipertrigliceridemia'      : null,
    creatinina:       (e) => (e !== 'normal') ? 'Marcador de Función Renal Alterada'    : null,
    tfg:              (e) => (e !== 'normal') ? 'Marcador de Función Renal Alterada'    : null,
    urea:             (e) => (e !== 'normal') ? 'Marcador de Función Renal Alterada'    : null,
    acido_urico:      (e) => (e !== 'normal') ? 'Marcador de Hiperuricemia'             : null,
    sodio:            (e) => (e !== 'normal') ? 'Marcador de Sodio Alterado'            : null,
    potasio:          (e) => (e !== 'normal') ? 'Marcador de Potasio Alterado'          : null,
    calcio:           (e) => (e !== 'normal') ? 'Marcador de Calcio Alterado'           : null,
    fosforo:          (e) => (e !== 'normal') ? 'Marcador de Fósforo Alterado'          : null,
    hemoglobina:      (e) => (e !== 'normal') ? 'Marcador de Hemoglobina Reducida'      : null,
    hematocrito:      (e) => (e !== 'normal') ? 'Marcador de Hematocrito Reducido'      : null,
    leucocitos:       (e) => (e !== 'normal') ? 'Marcador de Leucocitos Alterados'      : null,
    plaquetas:        (e) => (e !== 'normal') ? 'Marcador de Plaquetas Alteradas'       : null,
    tsh:              (e) => (e !== 'normal') ? 'Marcador de Función Tiroidea Alterada' : null,
    t4_libre:         (e) => (e !== 'normal') ? 'Marcador de Función Tiroidea Alterada' : null,
    vitamina_d:       (e) => (e !== 'normal') ? 'Marcador de Vitamina D Reducida'       : null,
    vitamina_b12:     (e) => (e !== 'normal') ? 'Marcador de Vitamina B12 Reducida'     : null,
    ferritina:        (e) => (e !== 'normal') ? 'Marcador de Ferritina Alterada'        : null,

    // ── Nuevos biomarcadores ─────────────────────────────────────
    insulina_basal:          (e) => (e !== 'normal') ? 'Marcador de Resistencia Insulínica'          : null,
    peptido_c:               (e) => (e !== 'normal') ? 'Marcador de Función de Células Beta Alterada': null,
    fructosamina:            (e) => (e !== 'normal') ? 'Marcador de Control Glucémico Alterado'      : null,
    fosfatasa_alcalina:      (e) => (e !== 'normal') ? 'Marcador de Estrés Hepático u Óseo'         : null,
    albumina:                (e) => (e === 'bajo' || e === 'critico_bajo') ? 'Marcador de Déficit Nutricional o Hepático' : null,
    ldh:                     (e) => (e !== 'normal') ? 'Marcador de Daño Tisular'                    : null,
    inr: (estado) => {
        if (estado === 'alto' || estado === 'critico_alto') return 'Marcador de Anticoagulación Elevada';
        if (estado === 'bajo' || estado === 'critico_bajo') return 'Marcador de Coagulación Aumentada';
        return null;
    },
    hierro_serico: (estado) => {
        if (estado === 'alto' || estado === 'critico_alto') return 'Marcador de Sobrecarga de Hierro';
        if (estado === 'bajo' || estado === 'critico_bajo') return 'Marcador de Déficit de Hierro';
        return null;
    },
    transferrina:            (e) => (e !== 'normal') ? 'Marcador de Transporte de Hierro Alterado'  : null,
    saturacion_transferrina: (e) => (e !== 'normal') ? 'Marcador de Saturación de Transferrina Alterada': null,
    acido_folico:            (e) => (e === 'bajo' || e === 'critico_bajo') ? 'Marcador de Déficit de Folato'         : null,
    t3_libre:                (e) => (e !== 'normal') ? 'Marcador de Función Tiroidea Alterada'       : null,
    magnesio:                (e) => (e === 'bajo' || e === 'critico_bajo') ? 'Marcador de Déficit de Magnesio'       : null,
    microalbuminuria:        (e) => (e === 'alto' || e === 'critico_alto') ? 'Marcador de Nefropatía Incipiente'     : null,
    vhs:                     (e) => (e === 'alto' || e === 'critico_alto') ? 'Marcador de Inflamación Sistémica'     : null,
    psa:                     (e) => (e === 'alto' || e === 'critico_alto') ? 'Marcador Prostático Elevado'           : null,
    cortisol:                (e) => (e === 'alto' || e === 'critico_alto') ? 'Marcador de Estrés Suprarrenal'        : null,
    homocisteina:            (e) => (e === 'alto' || e === 'critico_alto') ? 'Marcador de Riesgo Cardiovascular'     : null,
    ceruloplasmina:          (e) => (e === 'bajo' || e === 'critico_bajo') ? 'Marcador Sugestivo de Enfermedad de Wilson': null
};

// ── Etiquetas legibles para el brief ─────────────────────────────
const ESTADO_LABELS = {
    normal:         'Normal',
    bajo:           'Por debajo del rango',
    alto:           'Por encima del rango',
    depende_genero: 'Depende del sexo biológico',
    critico_bajo:   '⚠ Crítico bajo',
    critico_alto:   '⚠ Crítico alto'
};

// ── Rangos visuales para barra comparadora "Yo vs Rango Ideal" ───
// vMin/vMax: extremos del eje visual. cb/b/a/ca en unidad base (mg/dL o similar).
const RANGOS_BARRA = {
    glucosa:          { vMin: 40,    vMax: 320,     cb: 50,     b: 70,     a: 100,    ca: 300     },
    hba1c:            { vMin: 3.5,   vMax: 11,      cb: null,   b: null,   a: 5.7,    ca: 9       },
    colesterol_total: { vMin: 80,    vMax: 320,     cb: null,   b: null,   a: 200,    ca: 300     },
    ldl:              { vMin: 0,     vMax: 210,     cb: null,   b: null,   a: 100,    ca: 190     },
    hdl:              { vMin: 15,    vMax: 90,      soloMin: 40                                    },
    trigliceridos:    { vMin: 0,     vMax: 550,     cb: null,   b: null,   a: 150,    ca: 500     },
    creatinina:       { vMin: 0.3,   vMax: 11,      cb: null,   b: 0.6,    a: 1.2,    ca: 10      },
    tfg:              { vMin: 0,     vMax: 130,     invertido: true,  b: 60, cb: 15               },
    urea:             { vMin: 0,     vMax: 220,     cb: null,   b: 10,     a: 50,     ca: 200     },
    acido_urico:      { vMin: 1,     vMax: 13,      cb: null,   b: null,   a: 7.0,    ca: 12      },
    sodio:            { vMin: 118,   vMax: 162,     cb: 125,    b: 136,    a: 145,    ca: 155     },
    potasio:          { vMin: 2.0,   vMax: 7.5,     cb: 2.5,    b: 3.5,    a: 5.0,    ca: 6.5     },
    calcio:           { vMin: 5.5,   vMax: 13.5,    cb: 7.0,    b: 8.5,    a: 10.5,   ca: 12      },
    fosforo:          { vMin: 1.0,   vMax: 8,       cb: null,   b: 2.5,    a: 4.5,    ca: 7       },
    hemoglobina:      { vMin: 5,     vMax: 20,      cb: 7,      b: 12.0,   a: 16.0,   ca: null    },
    hematocrito:      { vMin: 14,    vMax: 60,      cb: 20,     b: 36,     a: 46,     ca: null    },
    leucocitos:       { vMin: 1000,  vMax: 32000,   cb: 2000,   b: 4500,   a: 11000,  ca: 30000   },
    plaquetas:        { vMin: 30000, vMax: 1050000, cb: 50000,  b: 150000, a: 400000, ca: 1000000 },
    tsh:              { vMin: 0,     vMax: 11,      cb: 0.01,   b: 0.4,    a: 4.0,    ca: 10      },
    t4_libre:         { vMin: 0.4,   vMax: 3.5,     cb: null,   b: 0.8,    a: 1.8,    ca: 3       },
    vitamina_d:       { vMin: 5,     vMax: 110,     cb: 10,     b: 30,     a: 100,    ca: null    },
    vitamina_b12:     { vMin: 50,    vMax: 1000,    cb: 100,    b: 200,    a: 900,    ca: null    },
    ferritina:        { vMin: 1,     vMax: 450,     cb: 5,      b: 13,     a: 150,    ca: null    }
};

// Strings legibles del rango normal para el caption de la barra
const RANGO_NORMAL_STR = {
    glucosa:          '70–100 mg/dL',
    hba1c:            '< 5.7%',
    colesterol_total: '< 200 mg/dL',
    ldl:              '< 100 mg/dL',
    hdl:              'H: > 40 · M: > 50 mg/dL',
    trigliceridos:    '< 150 mg/dL',
    creatinina:       'H: 0.7–1.3 · M: 0.6–1.1 mg/dL',
    tfg:              '≥ 60 mL/min',
    urea:             '10–50 mg/dL',
    acido_urico:      'H: 3.4–7.0 · M: 2.4–6.0 mg/dL',
    sodio:            '136–145 mEq/L',
    potasio:          '3.5–5.0 mEq/L',
    calcio:           '8.5–10.5 mg/dL',
    fosforo:          '2.5–4.5 mg/dL',
    hemoglobina:      'H: 13.5–17.5 · M: 12.0–16.0 g/dL',
    hematocrito:      'H: 41–53% · M: 36–46%',
    leucocitos:       '4500–11000 /µL',
    plaquetas:        '150000–400000 /µL',
    tsh:              '0.4–4.0 mUI/L',
    t4_libre:         '0.8–1.8 ng/dL',
    vitamina_d:       '30–100 ng/mL',
    vitamina_b12:     '200–900 pg/mL',
    ferritina:        'H: 30–400 · M: 13–150 ng/mL'
};

// ── Calcular score y lista de alertas ────────────────────────────
// ── Recomendaciones nutricionales por biomarcador alterado ────────
// Formato: { [nombre]: { estados: [...], texto: '...' } }
// Solo aparecen cuando el estado coincide.
const RECOMENDACIONES = [
    {
        nombres: ['glucosa'],
        estados: ['alto', 'critico_alto'],
        icon:    '🍬',
        texto:   'Podrías considerar reducir azúcares refinados y harinas blancas. Prefiere cereales integrales y alimentos con bajo índice glucémico. Consulta a tu médico o nutricionista.'
    },
    {
        nombres: ['glucosa'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🍌',
        texto:   'Podrías considerar no saltarte comidas y mantener fuentes de carbohidratos complejos regulares (avena, legumbres). Consulta con tu médico si los episodios son frecuentes.'
    },
    {
        nombres: ['hba1c'],
        estados: ['alto', 'critico_alto'],
        icon:    '📉',
        texto:   'Podrías considerar una dieta de bajo índice glucémico sostenida, reduciendo ultraprocesados y azúcares simples. Consulta a tu médico o nutricionista.'
    },
    {
        nombres: ['colesterol_total', 'ldl'],
        estados: ['alto', 'critico_alto'],
        icon:    '🥩',
        texto:   'Se sugiere moderar el consumo de grasas saturadas y alimentos ultraprocesados. Podrías incorporar más fibra soluble (avena, legumbres) y grasas saludables (palta, nueces, aceite de oliva).'
    },
    {
        nombres: ['hdl'],
        estados: ['bajo'],
        icon:    '🫒',
        texto:   'Podrías considerar aumentar la actividad física aeróbica y el consumo de grasas saludables (palta, nueces, aceite de oliva extra virgen). Se sugiere evitar grasas trans presentes en alimentos procesados.'
    },
    {
        nombres: ['trigliceridos'],
        estados: ['alto', 'critico_alto'],
        icon:    '🍺',
        texto:   'Se sugiere reducir azúcares, fructosa y alcohol. Los omega-3 (salmón, sardinas, chía) pueden ayudar. Consulta a tu médico o nutricionista.'
    },
    {
        nombres: ['acido_urico'],
        estados: ['alto', 'critico_alto'],
        icon:    '🦐',
        texto:   'Se sugiere moderar carnes rojas, mariscos, vísceras y fructosa. Mantener buena hidratación y evitar el ayuno prolongado.'
    },
    {
        nombres: ['creatinina', 'tfg', 'urea'],
        estados: ['alto', 'critico_alto', 'bajo', 'critico_bajo'],
        icon:    '💧',
        texto:   'Se sugiere controlar el consumo de sodio, fósforo y proteínas concentradas, y mantener una buena hidratación. Consulta a tu médico para evaluar la función renal.'
    },
    {
        nombres: ['tsh'],
        estados: ['alto', 'critico_alto', 'bajo', 'critico_bajo'],
        icon:    '🦋',
        texto:   'Se sugiere verificar el consumo de soja y alimentos con yodo con tu endocrinólogo. Los marcadores tiroideos requieren evaluación médica especializada.'
    },
    {
        nombres: ['t4_libre'],
        estados: ['alto', 'critico_alto', 'bajo', 'critico_bajo'],
        icon:    '🦋',
        texto:   'Podrías considerar consultar a un endocrinólogo para evaluar la función tiroidea. No se recomiendan cambios dietéticos específicos sin diagnóstico previo.'
    },
    {
        nombres: ['potasio'],
        estados: ['alto', 'critico_alto'],
        icon:    '⚠️',
        texto:   'ALERTA: Potasio elevado. Podrías considerar limitar plátano, papa, tomate y palta. Consulta a tu médico urgente.'
    },
    {
        nombres: ['vitamina_d'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '☀️',
        texto:   'Podrías considerar aumentar la exposición solar moderada (10–20 min diarios) y el consumo de alimentos ricos en vitamina D (pescados grasos, huevo, lácteos fortificados). Consulta con tu médico sobre suplementación.'
    },
    {
        nombres: ['vitamina_b12'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🥚',
        texto:   'Podrías considerar incorporar más alimentos de origen animal (carnes, huevos, lácteos). Las personas veganas o vegetarianas estrictas pueden necesitar suplementación. Consulta con tu médico.'
    },
    {
        nombres: ['ferritina', 'hemoglobina'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🫀',
        texto:   'Se sugiere incluir alimentos ricos en hierro (carnes magras, legumbres, espinaca) y evitar té o café inmediatamente después de las comidas, ya que dificultan su absorción.'
    },
    // ── Nuevos biomarcadores ──────────────────────────────────────
    {
        nombres: ['insulina_basal', 'peptido_c'],
        estados: ['alto', 'critico_alto'],
        icon:    '⚡',
        texto:   'Se sugiere reducir azúcares simples y carbohidratos refinados, favorecer alimentos de bajo índice glucémico e incorporar actividad física regular. Consulta a tu médico o nutricionista sobre resistencia insulínica.'
    },
    {
        nombres: ['fructosamina', 'hba1c'],
        estados: ['alto', 'critico_alto'],
        icon:    '📉',
        texto:   'Se sugiere una dieta de bajo índice glucémico sostenida, limitando ultraprocesados y azúcares simples. La fructosamina refleja el control glucémico de las últimas 2–3 semanas. Consulta a tu médico.'
    },
    {
        nombres: ['fosfatasa_alcalina'],
        estados: ['alto', 'critico_alto'],
        icon:    '🫁',
        texto:   'La fosfatasa alcalina elevada puede reflejar estrés hepático u óseo. Se sugiere moderar el alcohol, evitar medicamentos hepatotóxicos sin supervisión médica y consultar con tu médico para descartar causas óseas.'
    },
    {
        nombres: ['albumina'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🥩',
        texto:   'La albúmina baja puede indicar déficit nutricional proteico o compromiso hepático. Se sugiere asegurar un aporte proteico adecuado (legumbres, carnes magras, huevos) y consultar con tu médico.'
    },
    {
        nombres: ['ldh'],
        estados: ['alto', 'critico_alto'],
        icon:    '⚠️',
        texto:   'La LDH elevada puede indicar daño tisular de diversa causa. Requiere evaluación médica para identificar el origen. Evita el ejercicio extenuante sin supervisión.'
    },
    {
        nombres: ['hierro_serico'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🫀',
        texto:   'Se sugiere incluir alimentos ricos en hierro hem (carnes rojas magras, hígado) y no hem (legumbres, espinaca) acompañados de vitamina C para mejorar la absorción. Evita el té o café después de las comidas.'
    },
    {
        nombres: ['hierro_serico'],
        estados: ['alto', 'critico_alto'],
        icon:    '⚠️',
        texto:   'El hierro sérico elevado puede indicar sobrecarga. Se sugiere evitar suplementos de hierro y alimentos muy enriquecidos, y consultar con tu médico para descartar hemocromatosis.'
    },
    {
        nombres: ['acido_folico'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🥦',
        texto:   'Se sugiere aumentar el consumo de vegetales de hoja verde (espinaca, brócoli, espárragos), legumbres y cereales fortificados. Las personas con mayor requerimiento (embarazadas, etc.) pueden necesitar suplementación médica.'
    },
    {
        nombres: ['t3_libre'],
        estados: ['alto', 'critico_alto'],
        icon:    '🦋',
        texto:   'El T3 libre elevado puede indicar hipertiroidismo. Se sugiere consultar a un endocrinólogo. Evita el exceso de yodo (algas, suplementos con yodo) sin indicación médica.'
    },
    {
        nombres: ['t3_libre'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🦋',
        texto:   'El T3 libre bajo puede reflejar hipotiroidismo o restricción calórica severa. Consulta con tu endocrinólogo antes de realizar cambios dietéticos significativos.'
    },
    {
        nombres: ['magnesio'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '🥜',
        texto:   'Se sugiere aumentar el consumo de alimentos ricos en magnesio: semillas de calabaza, almendras, espinaca, legumbres, chocolate negro (≥70%). El déficit de magnesio puede agravar calambres y la resistencia insulínica.'
    },
    {
        nombres: ['microalbuminuria'],
        estados: ['alto', 'critico_alto'],
        icon:    '💧',
        texto:   'La microalbuminuria elevada es un marcador temprano de daño renal. Se sugiere controlar el sodio (menos de 2 g/día), proteínas moderadas y mantener la presión arterial bajo control. Consulta a tu médico.'
    },
    {
        nombres: ['vhs'],
        estados: ['alto', 'critico_alto'],
        icon:    '🔥',
        texto:   'La VHS elevada indica inflamación sistémica inespecífica. Se sugiere privilegiar una dieta antiinflamatoria (omega-3, frutas, verduras, aceite de oliva) y consultar con tu médico para identificar la causa.'
    },
    {
        nombres: ['psa'],
        estados: ['alto', 'critico_alto'],
        icon:    '⚠️',
        texto:   'El PSA elevado requiere evaluación urológica. No se recomiendan cambios dietéticos específicos sin diagnóstico previo. Consulta a tu médico o urólogo.'
    },
    {
        nombres: ['cortisol'],
        estados: ['alto', 'critico_alto'],
        icon:    '😓',
        texto:   'El cortisol elevado puede relacionarse con estrés crónico o patología suprarrenal. Se sugiere manejo del estrés (sueño adecuado, técnicas de relajación), evitar el exceso de cafeína y consultar con tu médico.'
    },
    {
        nombres: ['homocisteina'],
        estados: ['alto', 'critico_alto'],
        icon:    '❤️',
        texto:   'La homocisteína elevada es un factor de riesgo cardiovascular. Se sugiere asegurar un buen aporte de folato (vegetales verdes), vitamina B12 (carnes, huevos) y B6 (aves, plátano, garbanzos). Consulta a tu médico.'
    },
    {
        nombres: ['ceruloplasmina'],
        estados: ['bajo', 'critico_bajo'],
        icon:    '⚠️',
        texto:   'La ceruloplasmina baja puede ser sugestiva de enfermedad de Wilson u otros trastornos del metabolismo del cobre. Requiere evaluación médica especializada. No realices cambios dietéticos sin indicación médica.'
    }
];

function _calcularScore(formData) {
    let score   = 100;
    const chips = new Set();
    const alertas  = [];
    const normales = [];

    Object.entries(formData).forEach(([nombre, datos]) => {
        const estado = datos.estado;
        const entrada = {
            nombre,
            label:         EXAM_LABELS[nombre]  || nombre,
            valor:         _displayValue(nombre, datos.valor_mgdl),
            unidad:        _displayUnit(nombre, datos.unidad_base),
            valor_mgdl_raw: datos.valor_mgdl,
            estado,
            estadoLabel:   ESTADO_LABELS[estado] || estado,
            rango_normal:  datos.rango_normal    || RANGO_NORMAL_STR[nombre] || ''
        };

        if (!estado || estado === 'normal') {
            normales.push(entrada);
            return;
        }

        const penalty = SCORE_PENALTY[estado] || 0;
        score -= penalty;

        const chipLabel = CHIP_MAP[nombre] ? CHIP_MAP[nombre](estado) : null;
        if (chipLabel) chips.add(chipLabel);

        alertas.push(entrada);
    });

    return {
        score:   Math.max(0, score),
        chips:   Array.from(chips),
        alertas,
        normales
    };
}

// ── Correlaciones clínicas entre biomarcadores ────────────────────
// Para cada biomarcador alterado, muestra con qué otros se relaciona.
const CORRELACIONES = {
    glucosa: {
        relacionados: ['hba1c', 'trigliceridos', 'colesterol_total'],
        mensaje: 'La glucosa elevada puede afectar tu perfil lipídico y control glucémico:'
    },
    hba1c: {
        relacionados: ['glucosa', 'trigliceridos', 'colesterol_total'],
        mensaje: 'La HbA1c refleja el control glucémico de los últimos 3 meses. Se relaciona con:'
    },
    colesterol_total: {
        relacionados: ['ldl', 'hdl', 'trigliceridos'],
        mensaje: 'El colesterol total se evalúa junto al perfil lipídico completo:'
    },
    ldl: {
        relacionados: ['colesterol_total', 'hdl', 'trigliceridos'],
        mensaje: 'El LDL ("colesterol malo") se interpreta dentro de este perfil:'
    },
    hdl: {
        relacionados: ['colesterol_total', 'ldl', 'trigliceridos'],
        mensaje: 'El HDL ("colesterol bueno") protege cuando los demás están controlados:'
    },
    trigliceridos: {
        relacionados: ['glucosa', 'hdl', 'colesterol_total'],
        mensaje: 'Los triglicéridos se relacionan con el metabolismo de la glucosa y el HDL:'
    },
    creatinina: {
        relacionados: ['tfg', 'urea', 'potasio', 'fosforo', 'sodio'],
        mensaje: 'La creatinina se interpreta junto a la función renal global:'
    },
    tfg: {
        relacionados: ['creatinina', 'urea', 'potasio', 'fosforo', 'sodio'],
        mensaje: 'La filtración glomerular define el estadio renal. Controla también:'
    },
    urea: {
        relacionados: ['creatinina', 'tfg'],
        mensaje: 'La urea elevada refuerza el seguimiento de la función renal:'
    },
    acido_urico: {
        relacionados: ['creatinina', 'tfg', 'trigliceridos'],
        mensaje: 'El ácido úrico alto puede indicar riesgo renal o metabólico:'
    },
    potasio: {
        relacionados: ['sodio', 'creatinina', 'tfg'],
        mensaje: 'El potasio alterado se evalúa junto al equilibrio electrolítico y renal:'
    },
    sodio: {
        relacionados: ['potasio', 'creatinina'],
        mensaje: 'El sodio alterado se interpreta junto al balance electrolítico:'
    },
    hemoglobina: {
        relacionados: ['hematocrito', 'ferritina', 'vitamina_b12'],
        mensaje: 'La hemoglobina baja puede relacionarse con tus reservas de hierro y vitaminas:'
    },
    hematocrito: {
        relacionados: ['hemoglobina', 'ferritina'],
        mensaje: 'El hematocrito se evalúa junto a la hemoglobina y las reservas de hierro:'
    },
    ferritina: {
        relacionados: ['hemoglobina', 'hematocrito', 'vitamina_b12'],
        mensaje: 'La ferritina mide las reservas de hierro. Se relaciona con:'
    },
    tsh: {
        relacionados: ['t4_libre', 'colesterol_total'],
        mensaje: 'La función tiroidea afecta el metabolismo lipídico. Revisa también:'
    },
    t4_libre: {
        relacionados: ['tsh'],
        mensaje: 'La T4 libre se evalúa siempre junto al TSH:'
    },
    vitamina_d: {
        relacionados: ['calcio', 'fosforo', 'hemoglobina'],
        mensaje: 'La vitamina D regula el metabolismo mineral. Se relaciona con:'
    },
    vitamina_b12: {
        relacionados: ['hemoglobina', 'hematocrito', 'ferritina'],
        mensaje: 'La vitamina B12 baja puede afectar la producción de glóbulos rojos:'
    },
    calcio: {
        relacionados: ['fosforo', 'vitamina_d'],
        mensaje: 'El calcio se regula junto al fósforo y la vitamina D:'
    }
};

// ── Explicaciones clínicas en lenguaje simple ────────────────────
const EXPLICACIONES = {
    glucosa: {
        icono: '🍬',
        organo: 'Páncreas (produce insulina)',
        queEs:   'El nivel de azúcar (glucosa) en sangre tras ≥8 h sin comer.',
        importa: 'Niveles altos sostenidos dañan vasos sanguíneos, riñones, nervios y ojos. Es el marcador central de diabetes.',
        consejo: 'Ayuno de 8 h. Evitar estrés intenso y ejercicio el día del examen.'
    },
    hba1c: {
        icono: '📊',
        organo: 'Globalmente: vasos, riñones, nervios',
        queEs:   'El promedio de glucosa en sangre de los últimos 2–3 meses, "pegada" a la hemoglobina.',
        importa: 'Muestra el control glucémico real en el tiempo. No se altera por lo que comiste el día anterior.',
        consejo: 'No requiere ayuno. La anemia puede alterar el resultado artificialmente.'
    },
    colesterol_total: {
        icono: '🫀',
        organo: 'Sistema cardiovascular (corazón, arterias)',
        queEs:   'La cantidad total de colesterol en sangre: suma del "bueno" (HDL) y el "malo" (LDL).',
        importa: 'El exceso se deposita en las paredes arteriales causando aterosclerosis e infarto.',
        consejo: 'Ayuno de 12 h. LDL y HDL por separado son más informativos para evaluar riesgo.'
    },
    ldl: {
        icono: '🫀',
        organo: 'Arterias y corazón',
        queEs:   'El "colesterol malo": lleva colesterol desde el hígado hacia las arterias, donde puede acumularse.',
        importa: 'Principal factor de riesgo de infarto y ACV. La meta óptima depende de tus antecedentes clínicos.',
        consejo: 'Ayuno de 12 h. La dieta mediterránea y el ejercicio lo reducen eficazmente.'
    },
    hdl: {
        icono: '💚',
        organo: 'Hígado y sistema cardiovascular',
        queEs:   'El "colesterol bueno": recoge el colesterol de las arterias y lo lleva al hígado para eliminarlo.',
        importa: 'Niveles bajos aumentan el riesgo cardiovascular. Es el único colesterol en que más es mejor.',
        consejo: 'El ejercicio aeróbico es la forma más efectiva de subirlo. El tabaco y la obesidad lo reducen.'
    },
    trigliceridos: {
        icono: '🫁',
        organo: 'Hígado y sistema cardiovascular',
        queEs:   'Grasas de almacenamiento que provienen de carbohidratos y azúcares no utilizados de inmediato.',
        importa: 'Niveles altos se asocian a hígado graso, pancreatitis y mayor riesgo cardiovascular.',
        consejo: 'Ayuno de 12 h estricto. Alcohol, azúcar y harinas refinadas los elevan significativamente.'
    },
    creatinina: {
        icono: '🫘',
        organo: 'Riñones',
        queEs:   'Un residuo que producen los músculos al trabajar. Los riñones sanos lo filtran y eliminan por orina.',
        importa: 'Si está elevada, indica que los riñones no filtran bien. Es uno de los primeros signos de daño renal.',
        consejo: 'Evitar ejercicio intenso y exceso de carne 24 h antes. La hidratación también influye.'
    },
    tfg: {
        icono: '🫘',
        organo: 'Riñones',
        queEs:   'La tasa de filtración glomerular: estima cuánta sangre filtran tus riñones por minuto según tu talla.',
        importa: 'Define el estadio de enfermedad renal crónica. Por encima de 60 es el umbral de función considerada normal.',
        consejo: 'No es un examen directo; se calcula automáticamente a partir de creatinina, edad y sexo.'
    },
    urea: {
        icono: '🫘',
        organo: 'Riñones e hígado',
        queEs:   'Producto de la degradación de proteínas en el hígado. Los riñones lo eliminan por orina.',
        importa: 'Elevada junto a creatinina alta confirma daño renal. Sola puede subir por deshidratación o dieta hiperproteica.',
        consejo: 'Dieta alta en proteínas y deshidratación la elevan aunque los riñones estén bien.'
    },
    acido_urico: {
        icono: '🦴',
        organo: 'Riñones y articulaciones',
        queEs:   'Producto de la degradación de purinas (presentes en carnes rojas, mariscos y alcohol).',
        importa: 'Niveles altos causan gota (cristales en articulaciones) y pueden dañar los riñones con el tiempo.',
        consejo: 'Evitar carnes rojas, mariscos y alcohol 24 h antes. La hidratación ayuda a eliminarlo.'
    },
    sodio: {
        icono: '⚡',
        organo: 'Riñones, cerebro y sistema cardiovascular',
        queEs:   'El electrolito más abundante fuera de las células. Regula el equilibrio de agua en el cuerpo.',
        importa: 'Sodio bajo (hiponatremia) puede causar confusión y convulsiones. Alto indica deshidratación.',
        consejo: 'Se ve afectado por hidratación, diuréticos y pérdidas por vómitos o diarrea.'
    },
    potasio: {
        icono: '⚡',
        organo: 'Corazón y riñones',
        queEs:   'Electrolito esencial dentro de las células. Clave para el ritmo cardíaco y la contracción muscular.',
        importa: 'Niveles altos o bajos pueden causar arritmias cardíacas graves. Crítico en enfermedad renal.',
        consejo: 'Ciertos medicamentos (diuréticos, IECAs, AINEs) lo alteran. Los riñones dañados no eliminan el exceso.'
    },
    calcio: {
        icono: '🦴',
        organo: 'Huesos, corazón y glándulas paratiroides',
        queEs:   'El mineral más abundante del cuerpo. Esencial para huesos, coagulación y función muscular.',
        importa: 'Calcio bajo causa calambres y arritmias; alto puede indicar problemas de paratiroides o exceso de vitamina D.',
        consejo: 'Se evalúa junto a fósforo y vitamina D para un cuadro completo del metabolismo óseo.'
    },
    fosforo: {
        icono: '🦴',
        organo: 'Riñones y huesos',
        queEs:   'Mineral que trabaja junto al calcio en la estructura de huesos y dientes.',
        importa: 'En enfermedad renal, el fósforo se acumula y daña vasos sanguíneos y huesos progresivamente.',
        consejo: 'Lácteos, carnes procesadas y refrescos de cola son fuentes altas en fósforo.'
    },
    hemoglobina: {
        icono: '🩸',
        organo: 'Médula ósea (produce glóbulos rojos)',
        queEs:   'La proteína dentro de los glóbulos rojos que transporta oxígeno desde los pulmones a todos los tejidos.',
        importa: 'Baja indica anemia: cansancio, mareos y palidez. Alta puede indicar deshidratación o policitemia.',
        consejo: 'La menstruación y la donación de sangre la bajan temporalmente. El hierro y la B12 son necesarios.'
    },
    hematocrito: {
        icono: '🩸',
        organo: 'Médula ósea',
        queEs:   'El porcentaje del volumen de sangre que ocupan los glóbulos rojos.',
        importa: 'Bajo indica anemia; alto indica hemoconcentración (deshidratación) o policitemia.',
        consejo: 'Se interpreta siempre junto a la hemoglobina y los índices eritrocitarios (VCM, HCM).'
    },
    leucocitos: {
        icono: '🛡️',
        organo: 'Médula ósea y sistema inmune',
        queEs:   'Los glóbulos blancos: las células del sistema inmune que combaten infecciones y amenazas.',
        importa: 'Elevados indican infección o inflamación activa. Bajos pueden indicar inmunosupresión.',
        consejo: 'El estrés, el ejercicio intenso y las infecciones los elevan temporalmente. Los corticoides también.'
    },
    plaquetas: {
        icono: '🩸',
        organo: 'Médula ósea',
        queEs:   'Fragmentos celulares que forman coágulos para detener el sangrado ante una herida.',
        importa: 'Bajas aumentan el riesgo de hemorragia; altas aumentan el riesgo de trombosis.',
        consejo: 'AAS, ibuprofeno y ciertas enfermedades autoinmunes las alteran. Se interpretan en contexto clínico.'
    },
    tsh: {
        icono: '🦋',
        organo: 'Tiroides (cuello, controla metabolismo)',
        queEs:   'La hormona que el cerebro (hipófisis) produce para indicarle a la tiroides que trabaje más o menos.',
        importa: 'TSH alta = tiroides lenta (hipotiroidismo). TSH baja = tiroides acelerada (hipertiroidismo). Es el mejor screening.',
        consejo: 'Si tomas levotiroxina, tómala ANTES del examen. Idealmente en ayunas.'
    },
    t4_libre: {
        icono: '🦋',
        organo: 'Tiroides',
        queEs:   'La hormona activa que produce directamente la tiroides y circula libre en la sangre.',
        importa: 'Confirma si el hipotiroidismo o hipertiroidismo es clínicamente significativo. Siempre se evalúa junto al TSH.',
        consejo: 'No requiere ayuno. Biotina y anticonceptivos orales pueden alterar el resultado.'
    },
    vitamina_d: {
        icono: '☀️',
        organo: 'Huesos, sistema inmune y músculos',
        queEs:   'Una vitamina-hormona producida por la piel con luz solar y obtenida en pescados grasos y huevo.',
        importa: 'Esencial para absorber calcio y mantener huesos fuertes. También regula el sistema inmune y el ánimo.',
        consejo: 'La deficiencia es muy frecuente. Se suplementa fácilmente con gotas o cápsulas de vitamina D3.'
    },
    vitamina_b12: {
        icono: '🧠',
        organo: 'Sistema nervioso y médula ósea',
        queEs:   'Vitamina esencial para producir glóbulos rojos y mantener sano el sistema nervioso.',
        importa: 'Deficiencia causa anemia megaloblástica y daño neurológico (hormigueos, pérdida de memoria). Riesgo elevado en veganos.',
        consejo: 'La metformina y el omeprazol reducen su absorción. Se absorbe en el intestino con "factor intrínseco".'
    },
    ferritina: {
        icono: '⚙️',
        organo: 'Hígado (principal almacén de hierro)',
        queEs:   'La proteína que almacena hierro en el cuerpo. Refleja las reservas totales, no el hierro circulando.',
        importa: 'Baja indica reservas agotadas (anemia ferropénica). Alta puede indicar inflamación, hígado graso o hemocromatosis.',
        consejo: 'Las infecciones y la inflamación la elevan artificialmente aunque las reservas reales estén bajas.'
    }
};

// Abre el modal de explicación clínica para un biomarcador
function _openExplicacion(nombre) {
    const ex = EXPLICACIONES[nombre];
    if (!ex) return;
    const modal = document.getElementById('explicacion-modal');
    if (!modal) return;

    document.getElementById('expl-icono').textContent    = ex.icono;
    document.getElementById('expl-organo').textContent   = ex.organo;
    document.getElementById('expl-nombre').textContent   = EXAM_LABELS[nombre] || nombre;
    document.getElementById('expl-que-es').textContent   = ex.queEs;
    document.getElementById('expl-importa').textContent  = ex.importa;
    document.getElementById('expl-consejo').textContent  = ex.consejo;

    modal.classList.remove('hidden');
    // Foco al panel para accesibilidad
    modal.querySelector('.expl-panel').focus();
}

// ── Intervalos recomendados de re-examen (en días) ───────────────
// critico: estado crítico; alterado: fuera de rango sin ser crítico; normal: dentro del rango
const INTERVALOS_REEXAMEN = {
    glucosa:          { critico: 7,  alterado: 90,  normal: 365 },
    hba1c:            { critico: 14, alterado: 90,  normal: 180 },
    colesterol_total: { critico: 14, alterado: 90,  normal: 365 },
    ldl:              { critico: 14, alterado: 90,  normal: 365 },
    hdl:              { critico: 14, alterado: 90,  normal: 365 },
    trigliceridos:    { critico: 14, alterado: 90,  normal: 365 },
    creatinina:       { critico: 7,  alterado: 90,  normal: 180 },
    tfg:              { critico: 7,  alterado: 90,  normal: 180 },
    urea:             { critico: 7,  alterado: 90,  normal: 180 },
    acido_urico:      { critico: 14, alterado: 90,  normal: 365 },
    sodio:            { critico: 7,  alterado: 30,  normal: 180 },
    potasio:          { critico: 7,  alterado: 30,  normal: 180 },
    calcio:           { critico: 7,  alterado: 90,  normal: 365 },
    fosforo:          { critico: 14, alterado: 90,  normal: 365 },
    hemoglobina:      { critico: 7,  alterado: 90,  normal: 365 },
    hematocrito:      { critico: 7,  alterado: 90,  normal: 365 },
    leucocitos:       { critico: 7,  alterado: 30,  normal: 365 },
    plaquetas:        { critico: 7,  alterado: 30,  normal: 365 },
    tsh:              { critico: 14, alterado: 42,  normal: 365 },
    t4_libre:         { critico: 14, alterado: 42,  normal: 365 },
    vitamina_d:       { critico: 30, alterado: 90,  normal: 365 },
    vitamina_b12:     { critico: 30, alterado: 90,  normal: 365 },
    ferritina:        { critico: 14, alterado: 90,  normal: 365 }
};

// Convierte días a etiqueta legible
function _daysToLabel(days) {
    if (days <= 7)   return '1 semana';
    if (days <= 14)  return '2 semanas';
    if (days <= 30)  return '1 mes';
    if (days <= 42)  return '6 semanas';
    if (days <= 90)  return '3 meses';
    if (days <= 180) return '6 meses';
    return '12 meses';
}

// Calcula la fecha sugerida del próximo control
function _calcularProximoControl(scoreData, fechaExamen) {
    const { alertas, normales } = scoreData;
    const todos = [...alertas, ...normales];
    if (todos.length === 0) return null;

    let minDays   = Infinity;
    let urgentBio = null;

    todos.forEach((b) => {
        const r = INTERVALOS_REEXAMEN[b.nombre];
        if (!r) return;
        const days = b.estado && b.estado.startsWith('critico') ? r.critico
                   : b.estado && b.estado !== 'normal'         ? r.alterado
                   :                                              r.normal;
        if (days < minDays) { minDays = days; urgentBio = b; }
    });

    if (minDays === Infinity || !urgentBio) return null;

    // Base: si la fecha del examen ya pasó (examen antiguo), usar hoy
    const now     = new Date();
    const examDate = fechaExamen ? new Date(fechaExamen + 'T12:00:00') : now;
    const baseDate = examDate > now ? examDate : now;
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + minDays);

    const esCritico = urgentBio.estado && urgentBio.estado.startsWith('critico');
    const nAlter    = alertas.length;

    let motivo;
    if (esCritico) {
        motivo = `Resultado crítico en ${urgentBio.label}. Se recomienda consultar con su médico a la brevedad.`;
    } else if (nAlter > 0) {
        motivo = nAlter === 1
            ? `${urgentBio.label} fuera de rango.`
            : `${nAlter} marcadores fuera de rango (más urgente: ${urgentBio.label}).`;
    } else {
        motivo = 'Todos los marcadores dentro del rango. Control de rutina anual.';
    }

    return { fecha: targetDate, intervalLabel: _daysToLabel(minDays), motivo, esCritico };
}

// Genera y descarga un archivo .ics (iCalendar) con la fecha del control
function _downloadICS(fecha, motivo) {
    const pad    = (n) => String(n).padStart(2, '0');
    const y      = fecha.getFullYear();
    const m      = pad(fecha.getMonth() + 1);
    const d      = pad(fecha.getDate());
    const dtStr  = `${y}${m}${d}`;

    const endDate = new Date(fecha);
    endDate.setDate(endDate.getDate() + 1);
    const ey = endDate.getFullYear();
    const em = pad(endDate.getMonth() + 1);
    const ed = pad(endDate.getDate());
    const dtEnd = `${ey}${em}${ed}`;

    const uid    = `nura-control-${Date.now()}@nura-app`;
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Nura App//Recordatorio Médico//ES',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${dtStr}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        'SUMMARY:Control médico — Nura',
        `DESCRIPTION:${motivo.replace(/,/g, '\\,')}`,
        'BEGIN:VALARM',
        'TRIGGER:-P3D',
        'ACTION:DISPLAY',
        'DESCRIPTION:Recordatorio: Control médico en 3 días — Nura',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'control-medico-nura.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Estado del próximo control activo (para que el botón lo lea)
let _proximoControlActivo = null;

// =================================================================
// 🎯 INNOVACIÓN 8 — Simulador "Qué pasa si"
// =================================================================

// formData del examen actual (para simulaciones en tiempo real)
let _simulatorFormData = null;
// Score original (para mostrar delta)
let _simulatorOrigScore = 0;

// Calcula el estado clínico de un valor en el frontend
// (versión simplificada de la lógica del backend, usando RANGOS_BARRA)
function _calcularEstadoFrontend(nombre, valor) {
    const r = RANGOS_BARRA[nombre];
    if (!r) return 'normal';
    if (r.soloMin) return valor < r.soloMin ? 'bajo' : 'normal';
    if (r.invertido) {
        const { cb, b } = r;
        if (cb != null && valor < cb) return 'critico_bajo';
        if (b  != null && valor < b)  return 'bajo';
        return 'normal';
    }
    const { cb, b, a, ca } = r;
    if (ca != null && valor > ca) return 'critico_alto';
    if (a  != null && valor > a)  return 'alto';
    if (cb != null && valor < cb) return 'critico_bajo';
    if (b  != null && valor < b)  return 'bajo';
    return 'normal';
}

// Determina el rango del slider para un biomarcador alterado
function _getSimuladorRange(nombre, valorActual, estado) {
    const r = RANGOS_BARRA[nombre];
    if (!r) return null;

    let target, direction;

    if (r.soloMin) {
        target = Math.round(r.soloMin * 1.15);
        direction = 'up';
    } else if (r.invertido) {
        target = Math.round(r.b * 1.1);
        direction = 'up';
    } else {
        const { b, a } = r;
        if (estado === 'critico_alto' || estado === 'alto') {
            target    = a ?? (r.ca ? r.ca * 0.85 : valorActual * 0.8);
            direction = 'down';
        } else if (estado === 'critico_bajo' || estado === 'bajo') {
            target    = b ?? (r.cb ? r.cb * 1.15 : valorActual * 1.2);
            direction = 'up';
        } else {
            return null;
        }
    }

    const magnitude = Math.max(Math.abs(valorActual), Math.abs(target));
    const step = magnitude > 50 ? 1 : magnitude > 5 ? 0.1 : 0.01;
    target = parseFloat(target.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0));

    return {
        min:   direction === 'down' ? target    : valorActual,
        max:   direction === 'down' ? valorActual : target,
        value: valorActual,
        step,
        direction
    };
}

// Simula el score reemplazando un biomarcador con un valor nuevo
function _simulateScore(nombre, nuevoValor) {
    if (!_simulatorFormData) return null;
    const sim = {};
    Object.entries(_simulatorFormData).forEach(([k, v]) => { sim[k] = { ...v }; });
    sim[nombre].valor_mgdl = nuevoValor;
    sim[nombre].estado     = _calcularEstadoFrontend(nombre, nuevoValor);
    return _calcularScore(sim);
}

// Handler del slider: recalcula y muestra el delta en texto
function _onSimuladorInput(nombre, sliderVal) {
    const val   = parseFloat(sliderVal);
    const bio   = _simulatorFormData?.[nombre];
    if (!bio) return;

    const origVal  = bio.valor_mgdl;
    const label    = EXAM_LABELS[nombre] || nombre;
    const unit     = _displayUnit(nombre, bio.unidad_base);
    const dispVal  = _displayValue(nombre, val);
    const dispOrig = _displayValue(nombre, origVal);

    // Actualizar el label del valor actual
    const valEl = document.getElementById(`sim-val-${nombre}`);
    if (valEl) valEl.textContent = `${dispVal} ${unit}`;

    // Actualizar el valor en data del botón meta
    const metaBtn = document.querySelector(`.btn-sim-meta[data-nombre="${nombre}"]`);
    if (metaBtn) metaBtn.dataset.value = val;

    const simResult = _simulateScore(nombre, val);
    if (!simResult) return;

    const deltaScore = simResult.score - _simulatorOrigScore;
    const deltaEl    = document.getElementById(`sim-delta-${nombre}`);
    if (!deltaEl) return;

    if (Math.abs(val - origVal) < 0.001) {
        deltaEl.textContent = 'Mueve el slider para simular el impacto.';
        deltaEl.className   = 'sim-delta';
    } else if (deltaScore > 0) {
        deltaEl.innerHTML = `Si cambias tu ${label.toLowerCase()} de <strong>${dispOrig}</strong> a <strong>${dispVal} ${unit}</strong>, tu score subería de <strong>${_simulatorOrigScore}</strong> a <strong>${simResult.score}</strong> (+${deltaScore} puntos).`;
        deltaEl.className = 'sim-delta sim-delta--mejora';
    } else if (deltaScore < 0) {
        deltaEl.innerHTML = `Con este valor, tu score bajaría de <strong>${_simulatorOrigScore}</strong> a <strong>${simResult.score}</strong>.`;
        deltaEl.className = 'sim-delta sim-delta--empeora';
    } else {
        deltaEl.innerHTML = `Valor simulado: <strong>${dispVal} ${unit}</strong>. Sin cambio en el score.`;
        deltaEl.className = 'sim-delta';
    }
}

// Guarda el objetivo en localStorage con feedback visual
function _onSetMeta(nombre, rawValue) {
    const bio   = _simulatorFormData?.[nombre];
    const val   = parseFloat(rawValue);
    if (!bio || isNaN(val)) return;

    const metas = JSON.parse(localStorage.getItem('nura_metas') || '{}');
    metas[nombre] = {
        objetivo:    val,
        unidad_base: bio.unidad_base,
        label:       EXAM_LABELS[nombre] || nombre,
        display:     `${_displayValue(nombre, val)} ${_displayUnit(nombre, bio.unidad_base)}`,
        creado:      new Date().toISOString()
    };
    localStorage.setItem('nura_metas', JSON.stringify(metas));

    const btn = document.querySelector(`.btn-sim-meta[data-nombre="${nombre}"]`);
    if (btn) {
        btn.textContent = '✓ Meta guardada';
        btn.disabled    = true;
        setTimeout(() => { btn.textContent = '📌 Establecer como meta'; btn.disabled = false; }, 2500);
    }
}

// =================================================================
// 📊 INNOVACIÓN 9 — Comparador Poblacional (ENS Chile 2016–2017)
// =================================================================
// Percentiles aproximados por biomarcador y grupo etario.
// Fuente de referencia: ENS Chile 2016–2017 (publicación pública).
// Valores en unidad base (mg/dL, %, g/dL, etc.)
// =================================================================
// COMPARADOR POBLACIONAL — OMS Global Health Observatory
// Fase 1: Promedios nacionales (NCD-RisC / WHO Global Health Obs.)
// Clave: {pais: {SexoLetra_GrupoEdad: promedio_mgdl}}
//   H = Hombre (masculino),  M = Mujer (femenino)
//   Grupos: '18-29', '30-44', '45-59', '60+'
// =================================================================
const PROMEDIOS_OMS = {
    // ── Glucosa en ayunas (mg/dL) — NCD-RisC 2016 ─────────────
    glucosa: {
        CL:  { H_18_29: 89, H_30_44: 95, H_45_59: 102, H_60p: 108,
                M_18_29: 85, M_30_44: 91, M_45_59:  98, M_60p: 104 },
        CO:  { H_18_29: 88, H_30_44: 94, H_45_59: 101, H_60p: 107,
                M_18_29: 84, M_30_44: 90, M_45_59:  97, M_60p: 103 },
        MX:  { H_18_29: 91, H_30_44: 99, H_45_59: 108, H_60p: 114,
                M_18_29: 87, M_30_44: 95, M_45_59: 104, M_60p: 110 },
        PE:  { H_18_29: 87, H_30_44: 93, H_45_59: 100, H_60p: 106,
                M_18_29: 83, M_30_44: 89, M_45_59:  96, M_60p: 102 },
        AR:  { H_18_29: 90, H_30_44: 96, H_45_59: 103, H_60p: 109,
                M_18_29: 86, M_30_44: 92, M_45_59:  99, M_60p: 105 },
        BR:  { H_18_29: 90, H_30_44: 97, H_45_59: 105, H_60p: 111,
                M_18_29: 86, M_30_44: 93, M_45_59: 101, M_60p: 107 },
        EC:  { H_18_29: 88, H_30_44: 94, H_45_59: 101, H_60p: 107,
                M_18_29: 84, M_30_44: 90, M_45_59:  97, M_60p: 103 },
        US:  { H_18_29: 92, H_30_44:100, H_45_59: 108, H_60p: 115,
                M_18_29: 88, M_30_44: 96, M_45_59: 104, M_60p: 111 },
        GB:  { H_18_29: 88, H_30_44: 93, H_45_59:  99, H_60p: 105,
                M_18_29: 84, M_30_44: 89, M_45_59:  95, M_60p: 101 },
        ES:  { H_18_29: 87, H_30_44: 93, H_45_59: 100, H_60p: 106,
                M_18_29: 83, M_30_44: 89, M_45_59:  96, M_60p: 102 },
        DEFAULT: { H_18_29: 89, H_30_44: 95, H_45_59: 103, H_60p: 109,
                   M_18_29: 85, M_30_44: 91, M_45_59:  99, M_60p: 105 }
    },
    // ── Colesterol total (mg/dL) — NCD-RisC 2016 ──────────────
    colesterol_total: {
        CL:  { H_18_29: 175, H_30_44: 195, H_45_59: 210, H_60p: 205,
                M_18_29: 170, M_30_44: 190, M_45_59: 215, M_60p: 220 },
        CO:  { H_18_29: 172, H_30_44: 192, H_45_59: 207, H_60p: 202,
                M_18_29: 168, M_30_44: 188, M_45_59: 212, M_60p: 217 },
        MX:  { H_18_29: 178, H_30_44: 200, H_45_59: 215, H_60p: 210,
                M_18_29: 174, M_30_44: 196, M_45_59: 220, M_60p: 225 },
        PE:  { H_18_29: 168, H_30_44: 186, H_45_59: 200, H_60p: 196,
                M_18_29: 164, M_30_44: 182, M_45_59: 205, M_60p: 210 },
        AR:  { H_18_29: 177, H_30_44: 197, H_45_59: 212, H_60p: 207,
                M_18_29: 172, M_30_44: 192, M_45_59: 217, M_60p: 222 },
        BR:  { H_18_29: 176, H_30_44: 196, H_45_59: 211, H_60p: 206,
                M_18_29: 171, M_30_44: 191, M_45_59: 216, M_60p: 221 },
        US:  { H_18_29: 179, H_30_44: 202, H_45_59: 218, H_60p: 213,
                M_18_29: 175, M_30_44: 198, M_45_59: 223, M_60p: 228 },
        ES:  { H_18_29: 174, H_30_44: 194, H_45_59: 209, H_60p: 204,
                M_18_29: 170, M_30_44: 190, M_45_59: 214, M_60p: 219 },
        DEFAULT: { H_18_29: 175, H_30_44: 195, H_45_59: 210, H_60p: 205,
                   M_18_29: 170, M_30_44: 190, M_45_59: 215, M_60p: 220 }
    },
    // ── Triglicéridos (mg/dL) — NCD-RisC / NHANES ─────────────
    trigliceridos: {
        CL:  { H_18_29: 108, H_30_44: 138, H_45_59: 158, H_60p: 148,
                M_18_29:  88, M_30_44: 112, M_45_59: 135, M_60p: 128 },
        MX:  { H_18_29: 118, H_30_44: 152, H_45_59: 172, H_60p: 162,
                M_18_29:  96, M_30_44: 124, M_45_59: 149, M_60p: 142 },
        US:  { H_18_29: 112, H_30_44: 145, H_45_59: 162, H_60p: 153,
                M_18_29:  90, M_30_44: 116, M_45_59: 140, M_60p: 133 },
        DEFAULT: { H_18_29: 105, H_30_44: 132, H_45_59: 150, H_60p: 143,
                   M_18_29:  85, M_30_44: 108, M_45_59: 130, M_60p: 124 }
    },
    // ── HDL (mg/dL) — WHO / NCD-RisC ──────────────────────────
    hdl: {
        CL:  { H_18_29: 47, H_30_44: 46, H_45_59: 46, H_60p: 47,
                M_18_29: 55, M_30_44: 54, M_45_59: 56, M_60p: 57 },
        MX:  { H_18_29: 43, H_30_44: 42, H_45_59: 42, H_60p: 43,
                M_18_29: 52, M_30_44: 51, M_45_59: 52, M_60p: 54 },
        US:  { H_18_29: 48, H_30_44: 47, H_45_59: 47, H_60p: 48,
                M_18_29: 57, M_30_44: 56, M_45_59: 57, M_60p: 58 },
        DEFAULT: { H_18_29: 46, H_30_44: 45, H_45_59: 45, H_60p: 46,
                   M_18_29: 54, M_30_44: 53, M_45_59: 54, M_60p: 56 }
    },
    // ── HbA1c (%) — WHO / IDF ──────────────────────────────────
    hba1c: {
        DEFAULT: { H_18_29: 5.1, H_30_44: 5.2, H_45_59: 5.4, H_60p: 5.6,
                   M_18_29: 5.0, M_30_44: 5.2, M_45_59: 5.3, M_60p: 5.5 }
    }
};

// Nombres de países para mostrar en la UI
const OMS_PAIS_LABEL = {
    CL: 'Chile', CO: 'Colombia', MX: 'México', PE: 'Perú',
    AR: 'Argentina', BR: 'Brasil', EC: 'Ecuador',
    US: 'EE.UU.', GB: 'Reino Unido', ES: 'España',
    DEFAULT: 'promedio global'
};

// Detecta código de país desde navigator.language ('es-CL' → 'CL')
function _getPaisFromLocale() {
    try {
        const lang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        const parts = lang.split('-');
        if (parts.length >= 2) return parts[parts.length - 1].toUpperCase();
    } catch (_) {}
    return 'DEFAULT';
}

// Devuelve la clave de grupo de edad para PROMEDIOS_OMS
function _getOmsAgeKey(edad) {
    if (edad < 30) return '18_29';
    if (edad < 45) return '30_44';
    if (edad < 60) return '45_59';
    return '60p';
}

// Compara un valor del usuario contra el promedio OMS
// sexKey: 'H' (hombre) o 'M' (mujer)
function _compararConOms(bioNombre, valorMgdl, pais, sexKey, edad) {
    const tabla = PROMEDIOS_OMS[bioNombre];
    if (!tabla) return null;

    const paisData = tabla[pais] || tabla['DEFAULT'];
    if (!paisData) return null;

    const ageKey    = _getOmsAgeKey(edad);
    const dataKey   = sexKey + '_' + ageKey;   // ej. 'H_30_44'
    const promedio  = paisData[dataKey];
    if (!promedio) return null;

    const diffPct = Math.round((valorMgdl - promedio) / promedio * 100);
    const posicion = valorMgdl <= promedio * 0.9  ? 'por debajo'
                   : valorMgdl <= promedio * 1.1  ? 'dentro'
                   :                                 'por encima';

    const paisUsado    = tabla[pais] ? pais : 'DEFAULT';
    const grupoLabel   = { '18_29':'18–29', '30_44':'30–44', '45_59':'45–59', '60p':'60+' }[ageKey];
    const sexoLabel    = sexKey === 'H' ? 'hombres' : 'mujeres';
    const paisLabel    = OMS_PAIS_LABEL[paisUsado] || paisUsado;

    return { promedio, diffPct, posicion, paisUsado, paisLabel, grupoLabel, sexoLabel };
}

// Renderiza el comparador OMS con sexo y edad
function _renderComparadorOms(listEl, allBio, edad, sexKey, pais) {
    listEl.innerHTML = '';

    if (!edad || edad < 18) {
        listEl.innerHTML = '<p class="perc-sin-edad">No se pudo calcular tu edad desde el perfil.</p>';
        return;
    }
    if (!sexKey) {
        listEl.innerHTML = '<p class="perc-sin-edad">Selecciona tu sexo biológico arriba para ver la comparación.</p>';
        return;
    }

    const bioConOms = allBio.filter((b) => PROMEDIOS_OMS[b.nombre]);
    if (bioConOms.length === 0) {
        listEl.innerHTML = '<p class="perc-sin-edad">Sin datos OMS para los biomarcadores de este examen.</p>';
        return;
    }

    bioConOms.forEach((b) => {
        const valMgdl = b.valor_mgdl_raw ?? parseFloat(b.valor);
        if (isNaN(valMgdl)) return;

        const res = _compararConOms(b.nombre, valMgdl, pais, sexKey, edad);
        if (!res) return;

        // Color según posición y si alto-es-bueno (HDL, TFG)
        const altaEsBuena = RANGOS_BARRA[b.nombre]?.soloMin || RANGOS_BARRA[b.nombre]?.invertido;
        let badgeClass, barClass;
        if (res.posicion === 'dentro') {
            badgeClass = 'oms-badge--dentro';
            barClass   = 'oms-bar--ok';
        } else if (res.posicion === 'por encima') {
            badgeClass = altaEsBuena ? 'oms-badge--bueno' : 'oms-badge--alto';
            barClass   = altaEsBuena ? 'oms-bar--ok'      : 'oms-bar--alto';
        } else { // por debajo
            badgeClass = altaEsBuena ? 'oms-badge--bajo'  : 'oms-badge--bueno';
            barClass   = altaEsBuena ? 'oms-bar--alto'    : 'oms-bar--ok';
        }

        const signo    = res.diffPct > 0 ? '+' : '';
        const badgeTxt = res.posicion === 'dentro'
            ? 'Dentro del promedio'
            : `${signo}${res.diffPct}% vs promedio`;

        // Barra comparativa: posición relativa al promedio
        // 0% diff → marcador al 50% | ±50%+ → extremos
        const markerLeft = Math.max(4, Math.min(96, 50 + res.diffPct));

        const item = document.createElement('div');
        item.className = 'oms-item';
        item.innerHTML = `
            <div class="oms-item-header">
                <span class="oms-item-name">${b.label}</span>
                <span class="oms-badge ${badgeClass}">${badgeTxt}</span>
            </div>
            <div class="oms-bar-track">
                <div class="oms-bar-avg" title="Promedio OMS"></div>
                <div class="oms-bar-user ${barClass}" style="left:${markerLeft}%"></div>
            </div>
            <p class="oms-item-text">
                Promedio en ${res.paisLabel} (${res.sexoLabel} ${res.grupoLabel} años):
                <strong>${res.promedio} ${b.unidad}</strong> · Tu valor:
                <strong>${b.valor} ${b.unidad}</strong>
            </p>`;
        listEl.appendChild(item);
    });

    // Disclaimer
    const disc = document.createElement('p');
    disc.className = 'perc-disclaimer';
    disc.textContent = 'Comparación basada en promedios publicados por la OMS (NCD-RisC). Los valores individuales dependen de múltiples factores. Orientativo, no constituye evaluación médica.';
    listEl.appendChild(disc);
}

// =================================================================
// 🫀 CALCULADORA FRAMINGHAM — Riesgo Cardiovascular a 10 años
// Fuente: ATP III / Framingham Heart Study 1998 (datos públicos)
// =================================================================

function _fwPuntosEdad(edad, sexo) {
    const t = sexo === 'hombre'
        ? [-9, -4, 0, 3, 6, 8, 10, 11, 12, 13]
        : [-7, -3,  0, 3, 6, 8, 10, 12, 14, 16];
    const i = edad < 35 ? 0 : edad < 40 ? 1 : edad < 45 ? 2 : edad < 50 ? 3
            : edad < 55 ? 4 : edad < 60 ? 5 : edad < 65 ? 6 : edad < 70 ? 7
            : edad < 75 ? 8 : 9;
    return t[i];
}

function _fwPuntosColesterol(col, edad, sexo) {
    // Columnas: <160, 160-199, 200-239, 240-279, ≥280
    const tabH = [[0,4,7,9,11],[0,3,5,6,8],[0,2,3,4,5],[0,1,1,2,3],[0,0,0,1,1]];
    const tabM = [[0,4,8,11,13],[0,3,6,8,10],[0,2,4,5,7],[0,1,2,3,4],[0,1,1,2,2]];
    const fila = edad < 40 ? 0 : edad < 50 ? 1 : edad < 60 ? 2 : edad < 70 ? 3 : 4;
    const col_i = col < 160 ? 0 : col < 200 ? 1 : col < 240 ? 2 : col < 280 ? 3 : 4;
    return (sexo === 'hombre' ? tabH : tabM)[fila][col_i];
}

function _fwPuntosHDL(hdl) {
    return hdl >= 60 ? -1 : hdl >= 50 ? 0 : hdl >= 40 ? 1 : 2;
}

function _fwPuntosPAS(pas, tratado, sexo) {
    // Columnas: sin tratamiento, con tratamiento
    const tabH = [[0,0],[0,1],[1,2],[1,2],[2,3]];
    const tabM = [[0,0],[1,3],[2,4],[3,5],[4,6]];
    const fila = pas < 120 ? 0 : pas < 130 ? 1 : pas < 140 ? 2 : pas < 160 ? 3 : 4;
    return (sexo === 'hombre' ? tabH : tabM)[fila][tratado ? 1 : 0];
}

function _fwPuntosTabaco(fuma, edad, sexo) {
    if (!fuma) return 0;
    const tabH = [8, 5, 3, 1, 1];
    const tabM = [9, 7, 4, 2, 1];
    const i = edad < 40 ? 0 : edad < 50 ? 1 : edad < 60 ? 2 : edad < 70 ? 3 : 4;
    return (sexo === 'hombre' ? tabH : tabM)[i];
}

function _calcularFramingham({ edad, sexo, col, hdl, pas, htaMed, fuma }) {
    if (!edad || !sexo || !col || !hdl || !pas) return null;

    const total = _fwPuntosEdad(edad, sexo)
                + _fwPuntosColesterol(col, edad, sexo)
                + _fwPuntosHDL(hdl)
                + _fwPuntosPAS(pas, htaMed, sexo)
                + _fwPuntosTabaco(fuma, edad, sexo);

    // Tablas puntos → % riesgo
    let pct;
    if (sexo === 'hombre') {
        const t = { 1:1,2:1,3:1,4:1,5:2,6:2,7:3,8:4,9:5,10:6,11:8,12:10,13:12,14:16,15:20,16:25 };
        pct = total <= 0 ? '<1' : total >= 17 ? '≥30' : String(t[total] ?? '<1');
    } else {
        const t = { 10:1,11:1,12:1,13:2,14:2,15:3,16:4,17:5,18:6,19:8,20:11,21:14,22:17,23:22,24:27 };
        pct = total <= 9 ? '<1' : total >= 25 ? '≥30' : String(t[total] ?? '<1');
    }

    const num   = pct === '<1' ? 0.5 : pct === '≥30' ? 30 : parseInt(pct);
    const nivel = num < 10 ? 'bajo' : num < 20 ? 'moderado' : 'alto';
    return { pct, num, nivel };
}

// Ejecuta el cálculo y actualiza el resultado en pantalla
function _onFraminghamCalc() {
    const errEl = document.getElementById('fw-error');
    const show  = (msg) => { errEl.textContent = msg; errEl.classList.remove('hidden'); };
    errEl.classList.add('hidden');

    const edad = parseInt(document.getElementById('fw-edad')?.value);
    const pas  = parseInt(document.getElementById('fw-pas')?.value);
    const col  = parseFloat(document.getElementById('fw-col-total')?.value);
    const hdl  = parseFloat(document.getElementById('fw-hdl')?.value);

    const sexoEl  = document.querySelector('#fw-sexo .fw-toggle--active');
    const htaEl   = document.querySelector('#fw-hta-med .fw-toggle--active');
    const tabacoEl= document.querySelector('#fw-tabaco .fw-toggle--active');

    if (!sexoEl)                 return show('Selecciona el sexo biológico.');
    if (isNaN(col) || col < 100) return show('Ingresa el colesterol total (mg/dL).');
    if (isNaN(hdl) || hdl < 10)  return show('Ingresa el HDL (mg/dL).');
    if (!htaEl)                  return show('Indica si tomas medicación para la presión arterial.');
    if (!tabacoEl)               return show('Indica si fumas actualmente.');

    const res = _calcularFramingham({
        edad,
        sexo:   sexoEl.dataset.value,
        col,    hdl,    pas,
        htaMed: htaEl.dataset.value === 'si',
        fuma:   tabacoEl.dataset.value === 'si'
    });
    if (!res) return;

    const resultEl  = document.getElementById('fw-result');
    const pctEl     = document.getElementById('fw-result-pct');
    const nivelEl   = document.getElementById('fw-result-nivel');

    pctEl.textContent  = res.pct + '%';
    pctEl.className    = `fw-result-pct fw-result-pct--${res.nivel}`;
    const textoNivel   = res.nivel === 'bajo'     ? 'Riesgo Bajo — < 10%'
                       : res.nivel === 'moderado' ? 'Riesgo Moderado — 10–20%'
                       :                            'Riesgo Alto — > 20%';
    nivelEl.textContent = textoNivel;
    nivelEl.className   = `fw-result-nivel fw-result-nivel--${res.nivel}`;
    resultEl.classList.remove('hidden');
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Determina si un cambio de valor va hacia zona peligrosa ────────
function _esDireccionPeligrosa(nombre, valActual, valPrev) {
    const r = RANGOS_BARRA[nombre];
    if (!r) return valActual !== valPrev;
    if (r.soloMin)   return valActual < valPrev;  // HDL: bajar = peligroso
    if (r.invertido) return valActual < valPrev;  // TFG: bajar = peligroso
    const { b, a } = r;
    if (a != null && valActual > a)  return valActual > valPrev; // ya alto: subir más = peor
    if (b != null && valActual < b)  return valActual < valPrev; // ya bajo: bajar más = peor
    // Dentro del rango normal: ir hacia el borde más cercano
    if (a != null && b != null) {
        return (a - valActual) < (valActual - b)
            ? valActual > valPrev
            : valActual < valPrev;
    }
    if (a != null) return valActual > valPrev;
    if (b != null) return valActual < valPrev;
    return false;
}

// ── Determina si el estado clínico empeoró entre dos exámenes ──────
function _estadoEmpeoró(estadoPrev, estadoActual) {
    const rank = { normal: 0, bajo: 1, alto: 1, depende_genero: 1, critico_bajo: 2, critico_alto: 2 };
    return (rank[estadoActual] || 0) > (rank[estadoPrev] || 0);
}

// ── Calcular tendencias predictivas entre exámenes ─────────────────
// currentFormData: objeto { nombre → { valor_mgdl, unidad_base, estado } }
// prevDocs: array de docs de Firestore ordenados desc (más reciente primero)
function _calcularTendencias(currentFormData, prevDocs) {
    if (!prevDocs || prevDocs.length === 0) return [];

    const doc0 = prevDocs[0];  // examen anterior más reciente
    const doc1 = prevDocs[1] || null;  // el anterior a ese (si existe)

    const prevBio0 = {};
    const prevBio1 = {};
    (doc0.biomarcadores || []).forEach((b) => { prevBio0[b.nombre] = b; });
    if (doc1) (doc1.biomarcadores || []).forEach((b) => { prevBio1[b.nombre] = b; });

    const tendencias = [];

    Object.entries(currentFormData).forEach(([nombre, datos]) => {
        const valActual = Number(datos.valor_mgdl);
        if (isNaN(valActual) || !prevBio0[nombre]) return;

        const valPrev = Number(prevBio0[nombre].valor_mgdl);
        if (isNaN(valPrev) || valPrev === 0) return;

        const pctChange = ((valActual - valPrev) / Math.abs(valPrev)) * 100;
        const absPct    = Math.abs(pctChange);

        const esPeligrosa = _esDireccionPeligrosa(nombre, valActual, valPrev);
        const estadoActual = datos.estado || 'normal';
        const estadoPrev   = prevBio0[nombre].estado || 'normal';
        const empeoró      = _estadoEmpeoró(estadoPrev, estadoActual);

        // Condiciones de alerta: cambio ≥10% en dirección peligrosa, o estado empeoró
        if (!empeoró && (!esPeligrosa || absPct < 10)) return;

        // Tendencia sostenida (3 exámenes en la misma dirección)
        let isSustained = false;
        let valPrev2    = null;
        let fechaPrev2  = null;
        if (doc1 && prevBio1[nombre]) {
            const vp2 = Number(prevBio1[nombre].valor_mgdl);
            if (!isNaN(vp2) && vp2 !== 0) {
                const pct1to0 = ((valPrev - vp2) / Math.abs(vp2)) * 100;
                isSustained = Math.abs(pct1to0) >= 5 &&
                    ((pctChange > 0 && pct1to0 > 0) || (pctChange < 0 && pct1to0 < 0));
                if (isSustained) {
                    valPrev2   = vp2;
                    fechaPrev2 = doc1.fecha_examen || null;
                }
            }
        }

        const unidadBase = datos.unidad_base || prevBio0[nombre].unidad_base || '';
        tendencias.push({
            nombre,
            label:         EXAM_LABELS[nombre] || nombre,
            pctChange:     Math.round(pctChange * 10) / 10,
            absPct:        Math.round(absPct * 10) / 10,
            subeOBaja:     pctChange > 0 ? 'subido'     : 'bajado',
            verboContinuo: pctChange > 0 ? 'ascendente' : 'descendente',
            dispActual:    _displayValue(nombre, valActual),
            dispPrev:      _displayValue(nombre, valPrev),
            dispPrev2:     valPrev2 != null ? _displayValue(nombre, valPrev2) : null,
            dispUnit:      _displayUnit(nombre, unidadBase),
            fechaPrev:     doc0.fecha_examen || null,
            fechaPrev2,
            isSustained,
            empeoró,
            estadoActual
        });
    });

    // Prioridad: estado empeorado → luego por % de cambio descendente
    tendencias.sort((a, b) => {
        if (a.empeoró && !b.empeoró) return -1;
        if (!a.empeoró && b.empeoró) return 1;
        return b.absPct - a.absPct;
    });

    return tendencias;
}

// ── Barra comparadora "Yo vs Rango Ideal" ────────────────────────
function _buildRangeBar(nombre, valorMgdlRaw, displayValStr, displayUnit) {
    const r = RANGOS_BARRA[nombre];
    if (!r || valorMgdlRaw == null || isNaN(Number(valorMgdlRaw))) return '';

    const val  = Number(valorMgdlRaw);
    const { vMin, vMax } = r;
    const span = vMax - vMin;
    if (span <= 0) return '';

    const segments = [];

    if (r.soloMin) {
        // Ej. HDL: por encima del umbral = bien
        const rW = Math.max(0, Math.min((r.soloMin - vMin) / span * 100, 100));
        segments.push({ cls: 'bbar-seg--bajo',   w: rW });
        segments.push({ cls: 'bbar-seg--normal', w: 100 - rW });

    } else if (r.invertido) {
        // Ej. TFG: valor alto = bien
        const { cb, b } = r;
        const critW = cb != null ? Math.max(0, (cb - vMin) / span * 100) : 0;
        const bajW  = Math.max(0, (b - (cb != null ? cb : vMin)) / span * 100);
        const normW = Math.max(0, 100 - critW - bajW);
        if (critW > 0) segments.push({ cls: 'bbar-seg--critico', w: critW });
        segments.push({ cls: 'bbar-seg--bajo',   w: bajW });
        segments.push({ cls: 'bbar-seg--normal', w: normW });

    } else {
        const { cb, b, a, ca } = r;
        const leftCritW  = cb != null ? Math.max(0, (cb - vMin)                  / span * 100) : 0;
        const leftBajW   = b  != null ? Math.max(0, (b  - (cb != null ? cb : vMin)) / span * 100) : 0;
        const normW      = (b != null && a != null) ? Math.max(0, (a - b)        / span * 100) :
                           (a != null)              ? Math.max(0, (a - vMin)     / span * 100) :
                           (b != null)              ? Math.max(0, (vMax - b)     / span * 100) : 100;
        const rightAltW  = (a != null && ca != null) ? Math.max(0, (ca - a)     / span * 100) :
                           (a != null)               ? Math.max(0, (vMax - a)   / span * 100) : 0;
        const rightCritW = ca != null ? Math.max(0, (vMax - ca)                 / span * 100) : 0;

        if (leftCritW  > 0) segments.push({ cls: 'bbar-seg--critico', w: leftCritW  });
        if (leftBajW   > 0) segments.push({ cls: 'bbar-seg--bajo',    w: leftBajW   });
        segments.push(        { cls: 'bbar-seg--normal',               w: normW      });
        if (rightAltW  > 0) segments.push({ cls: 'bbar-seg--alto',    w: rightAltW  });
        if (rightCritW > 0) segments.push({ cls: 'bbar-seg--critico', w: rightCritW });
    }

    const clampedVal = Math.min(Math.max(val, vMin), vMax);
    const markerPct  = ((clampedVal - vMin) / span * 100).toFixed(2);
    const normLabel  = RANGO_NORMAL_STR[nombre] || '';
    const segsHtml   = segments.map((s) =>
        `<div class="bbar-seg ${s.cls}" style="width:${s.w.toFixed(2)}%"></div>`
    ).join('');

    return `<div class="bbar-wrapper">
        <div class="bbar">
            ${segsHtml}
            <div class="bbar-marker" style="left:${markerPct}%">
                <div class="bbar-marker-dot"></div>
            </div>
        </div>
        <p class="bbar-caption">Tu valor: <strong>${displayValStr} ${displayUnit}</strong>${normLabel ? ` &nbsp;|&nbsp; Normal: ${normLabel}` : ''}</p>
    </div>`;
}

// ── Construir la vista de Score ───────────────────────────────────
function _renderScoreSection(scoreData, fechaExamen, tendencias = []) {
    const section        = document.getElementById('exam-score-section');
    const valueEl        = document.getElementById('metabolic-score-value');
    const tierEl         = document.getElementById('score-tier-label');
    const chipsEl        = document.getElementById('score-chips');
    const alertsEl       = document.getElementById('score-alerts-list');
    const ring           = document.getElementById('score-dynamic-ring');
    const printDate      = document.getElementById('print-date');
    const printBody      = document.getElementById('print-table-body');
    const normalDetails  = document.getElementById('score-normal-details');
    const normalCountEl  = document.getElementById('score-normal-count');
    const normalListEl   = document.getElementById('score-normal-list');
    const recsSection    = document.getElementById('score-recommendations');
    const recsList       = document.getElementById('score-rec-list');
    const sinergiaEl     = document.getElementById('score-sinergia');
    const tendenciasEl   = document.getElementById('score-tendencias');
    const corrEl         = document.getElementById('score-correlaciones');
    const reexamenEl     = document.getElementById('score-reexamen');
    const framinghamEl   = document.getElementById('score-framingham');
    const simEl          = document.getElementById('score-simulador');
    const percentilesEl  = document.getElementById('score-percentiles');

    const { score, chips, alertas, normales } = scoreData;

    // ── 4-tier color + estado ─────────────────────────────────────
    let scoreColor, tierText, tierClass;
    if (score >= 90) {
        scoreColor = '#4CAF50'; tierText = 'Score Metabólico Óptimo';   tierClass = 'score-tier--verde';
    } else if (score >= 70) {
        scoreColor = '#2A9D8F'; tierText = 'Score Metabólico Bueno';    tierClass = 'score-tier--teal';
    } else if (score >= 50) {
        scoreColor = '#F4A261'; tierText = 'Score Metabólico Moderado'; tierClass = 'score-tier--naranja';
    } else {
        scoreColor = '#E76F51'; tierText = 'Score Metabólico Crítico';  tierClass = 'score-tier--rojo';
    }

    // Inyectar color como variable CSS global → el anillo y el número la heredan
    document.documentElement.style.setProperty('--current-score-color', scoreColor);

    // Número central
    valueEl.textContent = score;
    valueEl.className   = 'score-value';   // color viene de la CSS var inline

    // Etiqueta de estado
    tierEl.textContent = tierText;
    tierEl.className   = 'score-tier-label ' + tierClass;

    // Anillo dinámico (circunferencia = 2π×40 ≈ 251.2, r=40 del viewBox 100×100)
    if (ring) {
        setTimeout(() => {
            ring.style.strokeDashoffset = String(251.2 - (251.2 * (score / 100)));
        }, 50);
    }

    // Chips
    chipsEl.innerHTML = '';
    if (chips.length === 0) {
        chipsEl.innerHTML = '<span class="score-chip score-chip--ok">Sin alertas detectadas</span>';
    } else {
        chips.forEach((label) => {
            const span = document.createElement('span');
            span.className   = 'score-chip score-chip--alerta';
            span.textContent = label;
            chipsEl.appendChild(span);
        });
    }

    // Lista de alertas detalladas
    alertsEl.innerHTML = '';
    if (alertas.length > 0) {
        const table = document.createElement('table');
        table.className = 'score-alerts-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Biomarcador</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Referencia</th>
                </tr>
            </thead>
            <tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        alertas.forEach((a) => {
            const tr = document.createElement('tr');
            tr.className = 'score-alert-row--' + (
                a.estado.startsWith('critico') ? 'critico' : 'alerta'
            );
            const explBtn = EXPLICACIONES[a.nombre]
                ? `<button type="button" class="btn-expl" data-nombre="${a.nombre}" aria-label="Qué es ${a.label}">ℹ</button>`
                : '';
            tr.innerHTML = `
                <td>${a.label}${explBtn}</td>
                <td><strong>${a.valor}</strong> ${a.unidad}</td>
                <td>${a.estadoLabel}</td>
                <td class="score-ref">${a.rango_normal}</td>`;
            tbody.appendChild(tr);
        });
        alertsEl.appendChild(table);
    }

    // ── Mapa de correlaciones clínicas ───────────────────────────
    if (corrEl) {
        corrEl.innerHTML = '';

        // Índice rápido de TODOS los biomarcadores del examen actual
        const todosBio = {};
        [...alertas, ...normales].forEach((b) => { todosBio[b.nombre] = b; });

        // Construir tarjeta por cada biomarcador alterado que tenga correlaciones
        const corrCards = [];
        alertas.forEach((a) => {
            const def = CORRELACIONES[a.nombre];
            if (!def) return;

            const items = def.relacionados.map((rel) => {
                const bio = todosBio[rel];
                const relLabel = EXAM_LABELS[rel] || rel;
                if (bio) {
                    const esNormal  = bio.estado === 'normal' || !bio.estado;
                    const esCritico = bio.estado && bio.estado.startsWith('critico');
                    const cls = esNormal ? 'corr-item--ok' : esCritico ? 'corr-item--critico' : 'corr-item--alerta';
                    return `<div class="corr-item ${cls}">
                        <span class="corr-item-name">${relLabel}</span>
                        <span class="corr-item-val">${bio.valor} ${bio.unidad}</span>
                        <span class="corr-item-estado">${bio.estadoLabel}</span>
                    </div>`;
                } else {
                    return `<div class="corr-item corr-item--faltante">
                        <span class="corr-item-name">${relLabel}</span>
                        <span class="corr-item-hint">No tenemos dato. Considera pedirlo en tu próximo control.</span>
                    </div>`;
                }
            });

            corrCards.push(`<div class="corr-card">
                <p class="corr-msg"><strong>${a.label}</strong> — ${def.mensaje}</p>
                <div class="corr-items">${items.join('')}</div>
            </div>`);
        });

        if (corrCards.length > 0) {
            corrEl.innerHTML = `<h3 class="corr-title">🔗 Correlaciones Clínicas</h3>${corrCards.join('')}`;
            corrEl.classList.remove('hidden');
        } else {
            corrEl.classList.add('hidden');
        }
    }

    // Preparar brief para impresión
    if (printDate) {
        const now = fechaExamen
            ? new Date(fechaExamen).toLocaleDateString('es-CL')
            : new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
        printDate.textContent = 'Fecha del examen: ' + now + ' · Score Metabólico: ' + score + '/100';
    }
    if (printBody) {
        printBody.innerHTML = '';
        alertas.forEach((a) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.label}</td>
                <td>${a.valor}</td>
                <td>${a.unidad}</td>
                <td>${a.estadoLabel}</td>
                <td>${a.rango_normal}</td>`;
            printBody.appendChild(tr);
        });
        // Si no hay alertas, mostrar mensaje
        if (alertas.length === 0) {
            printBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Todos los biomarcadores dentro del rango normal.</td></tr>';
        }
    }

    // ── Todos los biomarcadores analizados (colapsable) ──────────
    const todos = [...alertas, ...normales];
    if (normalDetails && normalListEl && todos.length > 0) {
        normalCountEl.textContent = `Ver todos los valores analizados (${todos.length})`;
        normalListEl.innerHTML    = '';
        todos.forEach((b) => {
            const esNormal  = b.estado === 'normal' || !b.estado;
            const esCritico = b.estado && b.estado.startsWith('critico');
            const estadoClass = esNormal ? 'score-all-estado--normal'
                : esCritico            ? 'score-all-estado--critico'
                :                        'score-all-estado--alerta';
            const estadoDot = esNormal ? '✓' : esCritico ? '⚠' : '!';

            const card = document.createElement('div');
            card.className = 'bbar-card';
            const cardExplBtn = EXPLICACIONES[b.nombre]
                ? `<button type="button" class="btn-expl btn-expl--inline" data-nombre="${b.nombre}" aria-label="Qué es ${b.label}">ℹ</button>`
                : '';
            card.innerHTML = `
                <div class="score-normal-row">
                    <span class="score-normal-name">${b.label}${cardExplBtn}</span>
                    <span class="score-normal-val"><strong>${b.valor}</strong> ${b.unidad}</span>
                    <span class="score-all-estado ${estadoClass}">${estadoDot} ${b.estadoLabel}</span>
                </div>
                ${_buildRangeBar(b.nombre, b.valor_mgdl_raw, b.valor, b.unidad)}`;
            normalListEl.appendChild(card);
        });
        normalDetails.classList.remove('hidden');
    } else if (normalDetails) {
        normalDetails.classList.add('hidden');
    }

    // ── Recomendaciones nutricionales ─────────────────────────────
    if (recsSection && recsList) {
        recsList.innerHTML = '';
        const alertaNombres = new Set(alertas.map((a) => a.nombre));
        const alertaEstados = {};
        alertas.forEach((a) => { alertaEstados[a.nombre] = a.estado; });

        // Deduplicar: una recomendación puede cubrir varios nombres;
        // se muestra si AL MENOS UNO de sus nombres tiene estado activo.
        const shown = new Set();
        RECOMENDACIONES.forEach((rec) => {
            const recKey = rec.texto.substring(0, 30);
            if (shown.has(recKey)) return;
            const triggered = rec.nombres.some(
                (n) => alertaNombres.has(n) && rec.estados.includes(alertaEstados[n])
            );
            if (!triggered) return;
            shown.add(recKey);

            const card = document.createElement('div');
            card.className = 'score-rec-card';
            card.innerHTML = `
                <span class="score-rec-icon">${rec.icon}</span>
                <div>
                    <p class="score-rec-text">${rec.texto}</p>
                    <p class="score-rec-card-disclaimer">Esta es una sugerencia informativa. No reemplaza la indicación de su médico tratante.</p>
                </div>`;
            recsList.appendChild(card);
        });

        if (recsList.children.length > 0) {
            recsSection.classList.remove('hidden');
        } else {
            recsSection.classList.add('hidden');
        }
    }

    // ── Tendencias predictivas ────────────────────────────────────
    if (tendenciasEl) {
        const tendList = tendenciasEl.querySelector('.tend-list');
        if (tendencias && tendencias.length > 0 && tendList) {
            tendList.innerHTML = '';
            tendencias.forEach((t) => {
                const card = document.createElement('div');
                card.className = 'tend-card' + (t.empeoró ? ' tend-card--empeoro' : '');

                let msg;
                if (t.isSustained) {
                    msg = `Tu ${t.label.toLowerCase()} muestra una tendencia ${t.verboContinuo} sostenida` +
                        ` (~${t.absPct}% por control): ${t.dispPrev2}→${t.dispPrev}→${t.dispActual} ${t.dispUnit}.`;
                } else {
                    const fechaStr = t.fechaPrev
                        ? new Date(t.fechaPrev + 'T12:00:00').toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
                        : 'el último control';
                    msg = `Tu ${t.label.toLowerCase()} ha ${t.subeOBaja} un ${t.absPct}%` +
                        ` desde ${fechaStr} (${t.dispPrev} → ${t.dispActual} ${t.dispUnit}).`;
                    if (t.absPct >= 10) {
                        msg += ` Si esta tendencia continúa, podría salir del rango normal en el próximo examen.`;
                    }
                }

                card.innerHTML = `
                    <span class="tend-icon tend-icon--${t.verboContinuo === 'ascendente' ? 'up' : 'down'}" aria-hidden="true"></span>
                    <div class="tend-body">
                        <p class="tend-msg">${msg}</p>
                        <p class="tend-disclaimer">Seguimiento informativo. Consulte a su médico.</p>
                    </div>`;
                tendList.appendChild(card);
            });
            tendenciasEl.classList.remove('hidden');
        } else {
            tendenciasEl.classList.add('hidden');
        }
    }

    // ── Calculadora Framingham: pre-llenado con datos del examen ──
    if (framinghamEl) {
        const allBio  = [...alertas, ...normales];
        const colBio  = allBio.find((b) => b.nombre === 'colesterol_total');
        const hdlBio  = allBio.find((b) => b.nombre === 'hdl');

        const fwColInput = document.getElementById('fw-col-total');
        const fwHdlInput = document.getElementById('fw-hdl');

        if (fwColInput && colBio?.valor_mgdl_raw != null) {
            fwColInput.value    = Math.round(colBio.valor_mgdl_raw);
            fwColInput.readOnly = true;
            fwColInput.classList.add('fw-input--locked');
            document.getElementById('fw-col-badge')?.classList.remove('hidden');
        }
        if (fwHdlInput && hdlBio?.valor_mgdl_raw != null) {
            fwHdlInput.value    = Math.round(hdlBio.valor_mgdl_raw);
            fwHdlInput.readOnly = true;
            fwHdlInput.classList.add('fw-input--locked');
            document.getElementById('fw-hdl-badge')?.classList.remove('hidden');
            // Quitar aviso de "no encontrado" si existía
            document.getElementById('fw-hdl-hint')?.remove();
        } else if (fwHdlInput) {
            // HDL no provino del examen → mostrar aviso requerido
            const hintId = 'fw-hdl-hint';
            if (!document.getElementById(hintId)) {
                const hint = document.createElement('p');
                hint.id        = hintId;
                hint.className = 'fw-required-hint';
                hint.textContent = 'HDL no encontrado en tu examen. Ingrésalo manualmente para calcular el riesgo. *';
                fwHdlInput.parentElement.insertAdjacentElement('afterend', hint);
            }
        }

        // Pre-llenar edad desde el perfil (async, sin bloquear)
        if (typeof MedicalStorage !== 'undefined') {
            MedicalStorage.loadProfile().then((profile) => {
                if (!profile?.birthdate) return;
                const bdate = new Date(profile.birthdate + 'T12:00:00');
                const today = new Date();
                let age = today.getFullYear() - bdate.getFullYear();
                const m = today.getMonth() - bdate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) age--;
                if (age >= 20 && age <= 79) {
                    const fwEdad = document.getElementById('fw-edad');
                    if (fwEdad) {
                        fwEdad.value = age;
                        const out = document.getElementById('fw-edad-output');
                        if (out) out.value = age;
                        document.getElementById('fw-edad-badge')?.classList.remove('hidden');
                    }
                }
            }).catch(() => {});
        }

        // Resetear resultado y errores cada vez que se abre/recalcula la sección
        document.getElementById('fw-result')?.classList.add('hidden');
        document.getElementById('fw-error')?.classList.add('hidden');

        framinghamEl.classList.remove('hidden');
    }

    // ── Recordatorio de re-examen ─────────────────────────────────
    _proximoControlActivo = null;
    if (reexamenEl) {
        const ctrl = _calcularProximoControl(scoreData, fechaExamen);
        if (ctrl) {
            _proximoControlActivo = ctrl;
            const fechaEl     = document.getElementById('nextControlDate');
            const motivoEl    = document.getElementById('reexamen-motivo');
            const intervaloEl = document.getElementById('reexamen-intervalo');

            if (fechaEl) {
                // Algunos motores JS capitalizan las preposiciones ("De Mayo De").
                // Normalizamos a minúsculas y capitalizamos solo la primera letra.
                const raw = ctrl.fecha.toLocaleDateString('es-CL', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                const lc = raw.toLowerCase();
                fechaEl.textContent = lc.charAt(0).toUpperCase() + lc.slice(1);
            }
            if (motivoEl)    motivoEl.textContent    = ctrl.motivo;
            if (intervaloEl) intervaloEl.textContent = 'En ' + ctrl.intervalLabel;

            reexamenEl.classList.toggle('score-reexamen--urgente', ctrl.esCritico);
            reexamenEl.classList.remove('hidden');
            // Ocultar placeholder del calendario cuando hay fecha
            const placeholderEl = document.getElementById('calendario-placeholder');
            if (placeholderEl) placeholderEl.style.display = 'none';
        } else {
            reexamenEl.classList.add('hidden');
        }
    }

    // ── Simulador "¿Qué pasa si?" ────────────────────────────────
    if (simEl && _simulatorFormData) {
        const simList = document.getElementById('sim-list');
        if (simList) {
            simList.innerHTML = '';
            // Sólo biomarcadores alterados que tengan rango de simulación
            const simBio = alertas.filter((a) => {
                const r = _getSimuladorRange(a.nombre, a.valor_mgdl_raw ?? parseFloat(a.valor), a.estado);
                return r !== null;
            });

            if (simBio.length === 0) {
                simList.innerHTML = '<p class="sim-intro">No hay valores alterados para simular en este examen.</p>';
            } else {
                simBio.forEach((a) => {
                    const r = _getSimuladorRange(a.nombre, a.valor_mgdl_raw ?? parseFloat(a.valor), a.estado);
                    if (!r) return;

                    const card = document.createElement('div');
                    card.className = 'sim-card';
                    card.dataset.nombre = a.nombre;

                    const dispOrig = a.valor;
                    const unit     = a.unidad;

                    card.innerHTML = `
                        <div class="sim-card-header">
                            <span class="sim-card-label">${a.label}</span>
                            <span class="sim-card-val" id="sim-val-${a.nombre}">${dispOrig} ${unit}</span>
                        </div>
                        <div class="sim-track">
                            <input
                                type="range"
                                class="sim-range"
                                data-nombre="${a.nombre}"
                                min="${r.min}"
                                max="${r.max}"
                                step="${r.step}"
                                value="${r.value}"
                                aria-label="Simular ${a.label}"
                            >
                        </div>
                        <p class="sim-delta" id="sim-delta-${a.nombre}">Mueve el slider para ver el impacto en tu score.</p>
                        <button type="button" class="btn-sim-meta" data-nombre="${a.nombre}" data-value="${r.value}">
                            💾 Guardar como meta
                        </button>`;
                    simList.appendChild(card);
                });
            }
        }
        simEl.classList.remove('hidden');
    } else if (simEl) {
        simEl.classList.add('hidden');
    }

    // ── Comparador Poblacional OMS ────────────────────────────────
    if (percentilesEl) {
        const percList = document.getElementById('perc-list');
        const allBio   = [...alertas, ...normales];
        const bioConOms = allBio.filter((b) => PROMEDIOS_OMS[b.nombre]);

        if (percList && bioConOms.length > 0) {
            const pais = _getPaisFromLocale();

            // Leer perfil async para edad; sexo lo elige el usuario en el toggle de la sección
            if (typeof MedicalStorage !== 'undefined') {
                MedicalStorage.loadProfile().then((profile) => {
                    let edad = null;
                    if (profile?.birthdate) {
                        const bdate = new Date(profile.birthdate + 'T12:00:00');
                        const today = new Date();
                        edad = today.getFullYear() - bdate.getFullYear();
                        const m = today.getMonth() - bdate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) edad--;
                    }
                    // Guardar en el contenedor para que el toggle de sexo pueda re-renderizar
                    percentilesEl.dataset.edad = edad ?? '';
                    percentilesEl.dataset.pais = pais;
                    percentilesEl.dataset.allbio = JSON.stringify(
                        allBio.map((b) => ({
                            nombre: b.nombre, label: b.label, unidad: b.unidad,
                            valor:  b.valor,  valor_mgdl_raw: b.valor_mgdl_raw ?? null
                        }))
                    );
                    // Sexo activo actual del toggle (si ya fue seleccionado)
                    const sexActivo = percentilesEl.querySelector('.oms-sex-btn--active')?.dataset.sex || null;
                    _renderComparadorOms(percList, allBio, edad, sexActivo, pais);
                }).catch(() => {
                    _renderComparadorOms(percList, allBio, null, null, pais);
                });
            } else {
                _renderComparadorOms(percList, allBio, null, null, pais);
            }
            percentilesEl.classList.remove('hidden');
        } else if (percentilesEl) {
            percentilesEl.classList.add('hidden');
        }
    }

    // ── Sinergia con Fase 1 ───────────────────────────────────────
    if (sinergiaEl) {
        sinergiaEl.classList.remove('hidden');
    }

    section.classList.remove('hidden');
}

// ── Guardar en Firestore + mostrar score ─────────────────────────
async function _saveAndShowScore() {
    const formData   = _collectExamFormData();
    const scoreData  = _calcularScore(formData);
    const { score, alertas } = scoreData;

    // ── Obtener usuario ───────────────────────────────────────────
    const firebase    = window.NuraFirebase;
    const currentUser = firebase && firebase.auth ? firebase.auth.currentUser : null;
    if (!currentUser) throw new Error('Sesión no disponible.');

    // ── Leer metadatos del formulario (laboratorio, fecha) ────────
    const metaEl      = document.getElementById('exam-meta-lab');
    const metaText    = metaEl ? metaEl.textContent : '';
    const fechaMatch  = metaText.match(/(\d{4}-\d{2}-\d{2})/);
    const fechaExamen = fechaMatch ? fechaMatch[1] : null;

    // ── Importar Firestore SDK ────────────────────────────────────
    const { collection, query, orderBy, limit, getDocs, addDoc } = await import(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
    );
    const db      = firebase.db;
    const histRef = collection(db, 'users', currentUser.uid, 'exam_history');

    // ── Buscar exámenes previos ANTES de guardar (para tendencias) ─
    let prevDocs = [];
    try {
        const prevQ    = query(histRef, orderBy('timestamp', 'desc'), limit(2));
        const prevSnap = await getDocs(prevQ);
        prevSnap.forEach((docSnap) => prevDocs.push(docSnap.data()));
    } catch (e) {
        console.warn('[Tendencias] No se pudo cargar historial previo:', e.message);
    }

    const tendencias = _calcularTendencias(formData, prevDocs);

    // ── Guardar examen actual ─────────────────────────────────────
    const docData = {
        uid:          currentUser.uid,
        timestamp:    Date.now(),
        fecha_examen: fechaExamen,
        score_metabolico: score,
        biomarcadores: Object.entries(formData).map(([nombre, d]) => ({
            nombre,
            valor_mgdl:  d.valor_mgdl,
            unidad_base: d.unidad_base,
            estado:      d.estado
        })),
        alertas_count: alertas.length
    };
    await addDoc(histRef, docData);

    console.info('[ExamSave] Guardado en exam_history. Score:', score,
        '| Tendencias detectadas:', tendencias.length);

    // Actualizar historial en background (sin await — no bloquea la UI)
    _loadExamHistory().catch(() => {});

    // ── Ocultar formulario y mostrar score ────────────────────────
    const resultsSection = document.getElementById('exam-results-section');
    if (resultsSection) resultsSection.classList.add('hidden');

    // Hacer formData disponible para el simulador
    _simulatorFormData  = formData;
    _simulatorOrigScore = score;

    _renderScoreSection(scoreData, fechaExamen, tendencias);
}

// ── Inicializar sección de Score (botones back y print) ──────────
function _initScoreSection() {
    const backBtn  = document.getElementById('btn-score-back');
    const printBtn = document.getElementById('btn-print-brief');

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('exam-score-section').classList.add('hidden');
            document.getElementById('exam-results-section').classList.remove('hidden');
            document.getElementById('exam-results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => _downloadBriefPDF(printBtn));
    }

    const backDashBtn = document.getElementById('btn-score-to-dashboard');
    if (backDashBtn) {
        backDashBtn.addEventListener('click', () => _closeHistoryEntry());
    }

    const calendarBtn = document.getElementById('btn-reexamen-calendar');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', () => {
            if (!_proximoControlActivo) return;
            const { fecha, motivo } = _proximoControlActivo;
            _downloadICS(fecha, motivo);
            calendarBtn.textContent = '✓ Archivo .ics descargado';
            calendarBtn.disabled    = true;
            setTimeout(() => {
                calendarBtn.textContent = '📥 Guardar fecha en Calendario';
                calendarBtn.disabled    = false;
            }, 3000);
        });
    }

    // ── Framingham: sliders edad y PA ───────────────────────────
    const fwEdadSlider = document.getElementById('fw-edad');
    const fwPasSlider  = document.getElementById('fw-pas');
    if (fwEdadSlider) {
        fwEdadSlider.addEventListener('input', () => {
            const out = document.getElementById('fw-edad-output');
            if (out) out.value = fwEdadSlider.value;
        });
    }
    if (fwPasSlider) {
        fwPasSlider.addEventListener('input', () => {
            const out = document.getElementById('fw-pas-output');
            if (out) out.value = fwPasSlider.value;
        });
    }

    // ── Framingham: botón Calcular ───────────────────────────────
    const fwCalcBtn = document.getElementById('btn-fw-calc');
    if (fwCalcBtn) {
        fwCalcBtn.addEventListener('click', _onFraminghamCalc);
    }

    // ── Modal explicación clínica ─────────────────────────────────
    const explModal  = document.getElementById('explicacion-modal');
    const explClose  = document.getElementById('expl-close');
    if (explModal) {
        // Cerrar al hacer clic en el overlay
        explModal.addEventListener('click', (e) => {
            if (e.target === explModal) explModal.classList.add('hidden');
        });
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !explModal.classList.contains('hidden')) {
                explModal.classList.add('hidden');
            }
        });
    }
    if (explClose) {
        explClose.addEventListener('click', () => explModal.classList.add('hidden'));
    }

    // ── Simulador: sliders y botones de meta ──────────────────────
    const scoreSection = document.getElementById('exam-score-section');
    if (scoreSection) {
        scoreSection.addEventListener('input', (e) => {
            const slider = e.target.closest('.sim-range');
            if (slider) {
                _onSimuladorInput(slider.dataset.nombre, parseFloat(slider.value));
            }
        });

        scoreSection.addEventListener('click', (e) => {
            const metaBtn = e.target.closest('.btn-sim-meta');
            if (metaBtn) {
                _onSetMeta(metaBtn.dataset.nombre, metaBtn.dataset.value);
            }
        });
    }
}

// =================================================================
// 📋 HISTORIAL DE EXÁMENES — Verificación 4
// Lee exam_history/{uid} de Firestore y renderiza la lista.
// Se llama al init y también cuando el usuario guarda un nuevo examen.
// =================================================================

// ── Reconstruye scoreData desde un documento de Firestore ────────
function _scoreDataFromDoc(d) {
    const biomarcadores = Array.isArray(d.biomarcadores) ? d.biomarcadores : [];
    // Reconstruir formData compatible con _calcularScore
    const formData = {};
    biomarcadores.forEach((b) => {
        formData[b.nombre] = {
            valor_mgdl:  b.valor_mgdl,
            unidad_base: b.unidad_base,
            estado:      b.estado,
            rango_normal: RANGO_NORMAL_STR[b.nombre] || ''
        };
    });
    return _calcularScore(formData);
}

// ── Abrir un examen histórico en la vista de Score ────────────────
function _openHistoryEntry(d) {
    const scoreData  = _scoreDataFromDoc(d);
    const fechaExamen = d.fecha_examen || null;

    // Ocultar todo el dashboard salvo la sección de score
    const sectionsToHide = [
        'exam-section', 'exam-results-section', 'exam-history-section',
        'dashboard-pathology-field', 'dashboard-med-field'
    ];
    sectionsToHide.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    // Ocultar también las tarjetas estructurales (header, search, main-card, actions)
    document.querySelectorAll(
        '.header, .hybrid-search-container, .main-card, .actions-container, #scan-result-card'
    ).forEach((el) => el.classList.add('history-hidden'));

    // Mostrar botón "Volver al Dashboard" y ocultar botón de volver a verificación
    const backVerifBtn    = document.getElementById('btn-score-back');
    const backDashBtn     = document.getElementById('btn-score-to-dashboard');
    if (backVerifBtn) backVerifBtn.classList.add('hidden');
    if (backDashBtn)  backDashBtn.classList.remove('hidden');

    _renderScoreSection(scoreData, fechaExamen);
    document.getElementById('exam-score-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Restaurar el dashboard desde la vista de examen histórico ─────
function _closeHistoryEntry() {
    const sectionsToHide = [
        'exam-section', 'exam-results-section', 'exam-history-section',
        'dashboard-pathology-field', 'dashboard-med-field'
    ];
    sectionsToHide.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
    document.querySelectorAll('.history-hidden').forEach((el) => el.classList.remove('history-hidden'));

    document.getElementById('exam-score-section').classList.add('hidden');

    const backVerifBtn = document.getElementById('btn-score-back');
    const backDashBtn  = document.getElementById('btn-score-to-dashboard');
    if (backVerifBtn) backVerifBtn.classList.remove('hidden');
    if (backDashBtn)  backDashBtn.classList.add('hidden');

    document.getElementById('exam-history-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function _loadExamHistory() {
    const loadingEl = document.getElementById('history-loading');
    const emptyEl   = document.getElementById('history-empty');
    const errorEl   = document.getElementById('history-error');
    const listEl    = document.getElementById('history-list');

    if (!loadingEl || !listEl) return;

    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    listEl.classList.add('hidden');
    listEl.innerHTML = '';

    try {
        const firebase    = window.NuraFirebase;
        const currentUser = firebase && firebase.auth ? firebase.auth.currentUser : null;
        if (!currentUser) { loadingEl.classList.add('hidden'); return; }

        const { collection, query, orderBy, limit, getDocs, doc, deleteDoc } = await import(
            'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
        );

        const histRef = collection(firebase.db, 'users', currentUser.uid, 'exam_history');
        const q       = query(histRef, orderBy('timestamp', 'desc'), limit(20));
        const snap    = await getDocs(q);

        loadingEl.classList.add('hidden');

        if (snap.empty) { emptyEl.classList.remove('hidden'); return; }

        snap.forEach((docSnap) => {
            const d     = docSnap.data();
            const docId = docSnap.id;

            const fecha = d.fecha_examen
                ? new Date(d.fecha_examen).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
                : new Date(d.timestamp).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });

            const score      = typeof d.score_metabolico === 'number' ? d.score_metabolico : null;
            const scoreClass = score === null ? '' :
                score > 80  ? 'history-score--verde' :
                score >= 60 ? 'history-score--amarillo' : 'history-score--rojo';
            const scoreText  = score !== null ? score + '/100' : '—';

            const alertas     = typeof d.alertas_count === 'number' ? d.alertas_count : 0;
            const alertasText = alertas === 0
                ? '<span class="history-tag history-tag--ok">Sin alertas</span>'
                : `<span class="history-tag history-tag--alerta">${alertas} marcador${alertas > 1 ? 'es' : ''} alterado${alertas > 1 ? 's' : ''}</span>`;

            const li = document.createElement('li');
            li.className   = 'history-item history-item--clickable';
            li.setAttribute('role', 'button');
            li.setAttribute('tabindex', '0');
            li.setAttribute('aria-label', `Ver examen del ${fecha}`);
            li.innerHTML = `
                <div class="history-item-left">
                    <span class="history-item-icon">🔬</span>
                    <div class="history-item-info">
                        <span class="history-item-fecha">${fecha}</span>
                        <span class="history-item-tags">${alertasText}</span>
                    </div>
                </div>
                <div class="history-item-right">
                    <span class="history-score ${scoreClass}">${scoreText}</span>
                    <button type="button" class="btn-history-delete" title="Eliminar registro" aria-label="Eliminar examen del ${fecha}">🗑️</button>
                </div>`;

            // Clic en el ítem → abrir vista de resultados
            li.addEventListener('click', () => _openHistoryEntry(d));
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _openHistoryEntry(d); }
            });

            // Clic en papelera → eliminar (sin propagar al ítem)
            const deleteBtn = li.querySelector('.btn-history-delete');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = window.confirm(
                    '¿Estás seguro de que deseas eliminar este registro médico? Esta acción no se puede deshacer.'
                );
                if (!confirmed) return;

                deleteBtn.disabled   = true;
                deleteBtn.textContent = '…';
                try {
                    const docRef = doc(firebase.db, 'users', currentUser.uid, 'exam_history', docId);
                    await deleteDoc(docRef);
                    await _loadExamHistory();
                } catch (delErr) {
                    console.error('[ExamHistory] Error al eliminar:', delErr.message);
                    deleteBtn.disabled   = false;
                    deleteBtn.textContent = '🗑️';
                    alert('No se pudo eliminar el registro. Intenta de nuevo.');
                }
            });

            listEl.appendChild(li);
        });

        listEl.classList.remove('hidden');

    } catch (err) {
        console.error('[ExamHistory] Error cargando historial:', err.message);
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
    }
}

// =================================================================
// 📄 _downloadBriefPDF — Llama a generateBrief y descarga el PDF
// =================================================================
const GENERATE_BRIEF_URL = 'https://us-central1-nura-33fc1.cloudfunctions.net/generateBrief';

async function _downloadBriefPDF(btn) {
    const labelEl = document.getElementById('btn-print-brief-label');
    const origLabel = labelEl ? labelEl.textContent : 'Brief para Médico';

    btn.disabled = true;
    if (labelEl) labelEl.textContent = 'Generando PDF…';

    try {
        const auth  = window.NuraFirebase.auth;
        const user  = auth.currentUser;
        if (!user) throw new Error('Sesión no disponible.');

        const idToken = await user.getIdToken();

        const resp = await fetch(GENERATE_BRIEF_URL, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify({})
        });

        if (!resp.ok) {
            let msg = 'Error al generar el PDF.';
            try { const d = await resp.json(); msg = d.error || msg; } catch (_) {}
            alert('No se pudo generar el brief: ' + msg);
            return;
        }

        // La función retorna el PDF como binario — crear Blob y descargar
        const blob     = await resp.blob();
        const blobUrl  = URL.createObjectURL(blob);
        const filename = resp.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'brief-nura.pdf';

        const a = document.createElement('a');
        a.href     = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    } catch (err) {
        console.error('[Brief] Error:', err.message);
        alert('Error al generar el brief. Intenta de nuevo.');
    } finally {
        btn.disabled = false;
        if (labelEl) labelEl.textContent = origLabel;
    }
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', function() {
    _initExamUpload();
    _initScoreSection();

    // Delegación global para botones ℹ de explicación clínica
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-expl');
        if (btn) {
            e.stopPropagation();
            e.preventDefault();
            _openExplicacion(btn.dataset.nombre);
        }

        // Toggle buttons de Framingham (sexo, PA meds, tabaco)
        const toggle = e.target.closest('.fw-toggle');
        if (toggle) {
            const group = toggle.closest('.fw-toggle-group');
            if (group) {
                group.querySelectorAll('.fw-toggle').forEach((t) => t.classList.remove('fw-toggle--active'));
                toggle.classList.add('fw-toggle--active');
            }
        }

        // Toggle de sexo del Comparador OMS
        const sexBtn = e.target.closest('.oms-sex-btn');
        if (sexBtn) {
            const container = sexBtn.closest('#score-percentiles');
            if (!container) return;
            container.querySelectorAll('.oms-sex-btn').forEach((b) => b.classList.remove('oms-sex-btn--active'));
            sexBtn.classList.add('oms-sex-btn--active');

            // Re-renderizar con el sexo seleccionado
            const percList = document.getElementById('perc-list');
            if (!percList) return;
            const edad  = parseFloat(container.dataset.edad) || null;
            const pais  = container.dataset.pais || 'DEFAULT';
            const sexKey = sexBtn.dataset.sex;
            let allBio  = [];
            try { allBio = JSON.parse(container.dataset.allbio || '[]'); } catch (_) {}
            _renderComparadorOms(percList, allBio, edad, sexKey, pais);
        }
    });

    // Cargar historial cuando Firebase Auth esté listo
    const authCheckInterval = setInterval(() => {
        const firebase = window.NuraFirebase;
        if (firebase && firebase.auth) {
            clearInterval(authCheckInterval);
            firebase.auth.onAuthStateChanged((user) => {
                if (user) _loadExamHistory();
            });
        }
    }, 100);

    // Botón de refresco manual
    const refreshBtn = document.getElementById('btn-history-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => _loadExamHistory());
    }
});