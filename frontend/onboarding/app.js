// =================================================================
// [ARQUITECTO VISUAL — sin modificaciones] Lógica de UI e i18n
// [LÓGICO BACKEND] Submit handler migrado a Firestore — 2026-04-02
// [AGENTE 01 — Legal & Compliance] Consentimiento Informado — 2026-04-02
// [LÓGICO BACKEND] SHA-256 consent hash + banner dinámico — 2026-04-03
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================

/**
 * Genera un hash SHA-256 del contenido textual visible del documento legal.
 * Se usa como huella de integridad del consentimiento guardada en Firestore.
 * @returns {Promise<string>} Hash hex de 64 caracteres.
 */
async function _hashLegalText() {
    const legalEl = document.getElementById('legal-document-text');
    const text    = legalEl ? legalEl.textContent.trim() : '';
    const encoded = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
const currentLang = 'es';
const t  = translations[currentLang];
const lc = legalContent[currentLang];

document.addEventListener('DOMContentLoaded', () => {

    // ── [LÓGICO BACKEND] Banner dinámico por zona horaria ────────
    // Si el usuario está en Chile → número de emergencias local (131).
    // En cualquier otra zona horaria → mensaje genérico internacionalizado.
    const bannerSpan = document.querySelector('#emergency-banner span');
    if (bannerSpan) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz === 'America/Santiago') {
            bannerSpan.textContent =
                'Nura no atiende emergencias. Llama al 131 si estás en crisis.';
        } else {
            bannerSpan.textContent =
                'Nura does not handle emergencies. ' +
                'Call your local emergency services (e.g. 911) if you are in crisis.';
        }
    }
    // ── [FIN BANNER DINÁMICO] ─────────────────────────────────────

    // Inyección de textos (original del Arquitecto, intacto)
    document.getElementById('title').textContent           = t.pageTitle;
    document.getElementById('subtitle').textContent        = t.pageSubtitle;
    document.getElementById('label-birthdate').textContent = t.birthdateLabel;
    document.getElementById('label-weight').textContent    = t.weightLabel;
    document.getElementById('input-weight').placeholder    = t.weightPlaceholder;
    document.getElementById('label-height').textContent    = t.heightLabel;
    document.getElementById('input-height').placeholder    = t.heightPlaceholder;
    document.getElementById('label-pathology').textContent = t.pathologyLabel;

    const selectPathology = document.getElementById('select-pathology');
    const defaultOption   = document.createElement('option');
    defaultOption.text     = t.pathologyPlaceholder;
    defaultOption.value    = '';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    selectPathology.appendChild(defaultOption);

    t.pathologyOptions.forEach(opt => {
        const option       = document.createElement('option');
        option.value       = opt.value;
        option.textContent = opt.label;
        selectPathology.appendChild(option);
    });

    // ── Buscador de patologías (chips + select oculto para validación y guardado) ──
    const pathologySearch = document.getElementById('pathology-search');
    const suggestionsList = document.getElementById('pathology-suggestions');
    const chipsContainer  = document.getElementById('pathology-chips');

    if (pathologySearch && suggestionsList && chipsContainer) {
        pathologySearch.placeholder = t.pathologySearchPlaceholder;

        const _optByValue = (value) =>
            Array.from(selectPathology.options).find(o => o.value === String(value));

        function getAvailableOptions() {
            return Array.from(selectPathology.options)
                .filter(opt => opt.value !== '' && !opt.disabled)
                .map(opt => ({ value: opt.value, label: opt.textContent.trim() }));
        }

        function deselectPlaceholder() {
            const ph = selectPathology.querySelector('option[value=""]');
            if (ph) ph.selected = false;
        }

        function reselectPlaceholderIfEmpty() {
            const hasReal = Array.from(selectPathology.selectedOptions).some(o => o.value !== '');
            if (!hasReal) {
                const ph = selectPathology.querySelector('option[value=""]');
                if (ph) ph.selected = true;
            }
        }

        function setSuggestionsOpen(open) {
            pathologySearch.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        function renderFasesPanel() {
            const panel = document.getElementById('onboarding-fases-panel');
            if (!panel) return;
            const FASES = window.NURA_FASES_CLINICAS || {};
            const FASE_PARENT = window.NURA_FASE_PARENT || {};

            const selectedValues = Array.from(selectPathology.selectedOptions)
                .map(o => o.value).filter(v => v !== '');

            const parentsToShow = {};
            selectedValues.forEach(val => {
                if (FASES[val]) {
                    if (!(val in parentsToShow)) parentsToShow[val] = null;
                } else if (FASE_PARENT[val]) {
                    parentsToShow[FASE_PARENT[val]] = val;
                }
            });

            const parentIds = Object.keys(parentsToShow);
            if (parentIds.length === 0) {
                panel.classList.add('hidden');
                panel.innerHTML = '';
                return;
            }

            panel.innerHTML = '';
            panel.classList.remove('hidden');

            parentIds.forEach(parentId => {
                const config = FASES[parentId];
                if (!config) return;
                const selectedFaseId = parentsToShow[parentId];

                const section = document.createElement('div');
                section.className = 'fases-section';

                const title = document.createElement('p');
                title.className = 'fases-panel-title';
                title.textContent = config.titulo;

                const clsf = document.createElement('span');
                clsf.className = 'fases-panel-clasificacion';
                clsf.textContent = config.clasificacion;

                const wrap = document.createElement('div');
                wrap.className = 'fases-chips-wrap';

                config.fases.forEach(fase => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'fase-chip' + (selectedFaseId === fase.id ? ' selected' : '');
                    btn.dataset.fase = fase.id;
                    btn.dataset.parent = parentId;

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = fase.label;
                    btn.appendChild(nameSpan);

                    if (fase.desc) {
                        const desc = document.createElement('span');
                        desc.className = 'fase-chip-desc';
                        desc.textContent = fase.desc;
                        btn.appendChild(desc);
                    }
                    wrap.appendChild(btn);
                });

                const noSeBtn = document.createElement('button');
                noSeBtn.type = 'button';
                noSeBtn.className = 'fase-chip fase-no-se' + (selectedFaseId === null ? ' selected' : '');
                noSeBtn.dataset.fase = '__parent__';
                noSeBtn.dataset.parent = parentId;
                noSeBtn.textContent = t.fasesNoSeLabel || 'No sé mi estadio';
                wrap.appendChild(noSeBtn);

                section.appendChild(title);
                section.appendChild(clsf);
                section.appendChild(wrap);
                panel.appendChild(section);
            });

            panel.onclick = (e) => {
                const btn = e.target.closest('.fase-chip');
                if (!btn) return;
                const faseId = btn.dataset.fase;
                const parentId = btn.dataset.parent;
                const config = (window.NURA_FASES_CLINICAS || {})[parentId];
                if (!config) return;

                if (faseId === '__parent__') {
                    const parentOpt = _optByValue(parentId);
                    if (parentOpt) { parentOpt.selected = true; deselectPlaceholder(); }
                    config.fases.forEach(f => {
                        const o = _optByValue(f.id);
                        if (o) o.selected = false;
                    });
                } else {
                    const faseOpt = _optByValue(faseId);
                    if (faseOpt) { faseOpt.selected = true; deselectPlaceholder(); }
                    const parentOpt = _optByValue(parentId);
                    if (parentOpt) parentOpt.selected = false;
                    config.fases.forEach(f => {
                        if (f.id !== faseId) {
                            const o = _optByValue(f.id);
                            if (o) o.selected = false;
                        }
                    });
                }
                renderChips();
            };
        }

        function renderChips() {
            chipsContainer.innerHTML = '';
            Array.from(selectPathology.selectedOptions).forEach(opt => {
                if (opt.value === '') return;
                const chip = document.createElement('div');
                chip.className = 'pathology-chip';

                const label = document.createElement('span');
                label.className = 'pathology-chip-label';
                label.textContent = opt.textContent;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'pathology-chip-remove';
                btn.dataset.value = opt.value;
                btn.setAttribute('aria-label', t.pathologyChipRemoveAria);
                btn.innerHTML = '\u00D7';

                chip.appendChild(label);
                chip.appendChild(btn);
                chipsContainer.appendChild(chip);
            });
            renderFasesPanel();
        }

        chipsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.pathology-chip-remove');
            if (!btn) return;
            const valueToRemove = btn.getAttribute('data-value');
            const optionToDeselect = _optByValue(valueToRemove);
            if (optionToDeselect) optionToDeselect.selected = false;
            // Cleanup related fases or parent
            const FASES = window.NURA_FASES_CLINICAS || {};
            const FASE_PARENT = window.NURA_FASE_PARENT || {};
            if (FASES[valueToRemove]) {
                FASES[valueToRemove].fases.forEach(f => {
                    const o = _optByValue(f.id);
                    if (o) o.selected = false;
                });
            } else if (FASE_PARENT[valueToRemove]) {
                const parentOpt = _optByValue(FASE_PARENT[valueToRemove]);
                if (parentOpt) parentOpt.selected = false;
            }
            reselectPlaceholderIfEmpty();
            renderChips();
        });

        pathologySearch.addEventListener('input', () => {
            const raw = pathologySearch.value;
            const query = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            suggestionsList.innerHTML = '';

            if (query.length === 0) {
                suggestionsList.classList.add('hidden');
                setSuggestionsOpen(false);
                return;
            }

            const filtered = getAvailableOptions().filter(opt => {
                const cleanLabel = opt.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const o = _optByValue(opt.value);
                const isNotSelected = o && !o.selected;
                return cleanLabel.includes(query) && isNotSelected;
            });

            if (filtered.length > 0) {
                filtered.forEach(opt => {
                    const li = document.createElement('li');
                    li.className = 'pathology-suggestion-item';
                    li.setAttribute('role', 'option');
                    li.textContent = opt.label;
                    li.addEventListener('mousedown', (ev) => ev.preventDefault());
                    li.addEventListener('click', () => {
                        const o = _optByValue(opt.value);
                        if (o) {
                            o.selected = true;
                            deselectPlaceholder();
                        }
                        pathologySearch.value = '';
                        suggestionsList.classList.add('hidden');
                        setSuggestionsOpen(false);
                        renderChips();
                    });
                    suggestionsList.appendChild(li);
                });
                suggestionsList.classList.remove('hidden');
                setSuggestionsOpen(true);
            } else {
                suggestionsList.classList.add('hidden');
                setSuggestionsOpen(false);
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-wrapper')) {
                suggestionsList.classList.add('hidden');
                setSuggestionsOpen(false);
            }
        });

        renderChips();
    }

    document.getElementById('btn-submit').textContent  = t.submitBtn;
    document.getElementById('btn-export').textContent  = t.exportBtn;
    document.getElementById('footer-text').textContent = t.footerText;

    // ── [AGENTE 04] Exportación de Datos (JSON) ────────────────
    const btnExport = document.getElementById('btn-export');
    btnExport.addEventListener('click', async () => {
        try {
            const profileData = await MedicalStorage.loadProfile();
            const exportData = profileData || { error: "No hay datos para exportar." };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const anchor = document.createElement('a');
            anchor.href = dataStr;
            anchor.download = "Nura_Exportacion_Medica.json";
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        } catch (e) {
            console.error("Error al exportar:", e);
        }
    });

    // ── [AGENTE 01] Inyección de contenido legal ──────────────────
    document.getElementById('consent-title').textContent     = lc.consentSectionTitle;
    document.getElementById('disclaimer-title').textContent  = lc.disclaimerTitle;
    document.getElementById('disclaimer-text').textContent   = lc.disclaimerText;
    document.getElementById('privacy-title').textContent     = lc.privacyTitle;
    document.getElementById('privacy-text').textContent      = lc.privacyText;
    document.getElementById('terms-title').textContent       = lc.termsTitle;
    document.getElementById('terms-text').textContent        = lc.termsText;
    document.getElementById('ai-title').textContent          = lc.aiTitle;
    document.getElementById('ai-text').textContent           = lc.aiText;
    document.getElementById('label-terms').textContent       = lc.consentTermsLabel;
    document.getElementById('label-ai-training').textContent = lc.consentAiLabel;

    // Acordeones de texto legal (toggle show/hide)
    function _setupToggle(btnId, bodyId) {
        const btn  = document.getElementById(btnId);
        const body = document.getElementById(bodyId);
        btn.addEventListener('click', () => {
            const isHidden = body.hidden;
            body.hidden = !isHidden;
            btn.setAttribute('aria-expanded', String(isHidden));
        });
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', bodyId);
    }
    _setupToggle('toggle-disclaimer', 'body-disclaimer');
    _setupToggle('toggle-privacy',    'body-privacy');
    _setupToggle('toggle-terms',      'body-terms');
    _setupToggle('toggle-ai',         'body-ai');

    // Habilita el botón submit solo cuando el checkbox obligatorio está marcado
    const checkTerms = document.getElementById('check-terms');
    const btnSubmit  = document.getElementById('btn-submit');
    checkTerms.addEventListener('change', () => {
        btnSubmit.disabled = !checkTerms.checked;
    });
    // ── [FIN AGENTE 01] ───────────────────────────────────────────

    // ── [LÓGICO BACKEND] Elemento de error inline ─────────────────
    // Reemplaza el alert() nativo. Inyectado entre el form y el footer
    // sin tocar el HTML del Arquitecto Visual.
    const errorMsg            = document.createElement('p');
    errorMsg.id               = 'error-msg';
    errorMsg.style.color      = 'var(--orange-strong, #e06c75)';
    errorMsg.style.fontSize   = '0.85rem';
    errorMsg.style.fontWeight = '600';
    errorMsg.style.textAlign  = 'center';
    errorMsg.style.marginTop  = '0.75rem';
    errorMsg.style.minHeight  = '1.2em';
    document.getElementById('onboarding-form')
        .insertAdjacentElement('afterend', errorMsg);

    function showError(msg) { errorMsg.textContent = msg; }
    function clearError()   { errorMsg.textContent = ''; }

    function _mapFirestoreError(code) {
        const errors = {
            'permission-denied': 'Sin permiso para guardar. Verifica tu sesión.',
            'unavailable':       'Firestore no disponible. Verifica tu conexión.',
            'deadline-exceeded': 'El servidor tardó demasiado. Intenta de nuevo.',
            'unauthenticated':   'Sesión expirada. Redirigiendo...'
        };
        return errors[code] || 'Error al guardar en la nube. Intenta de nuevo.';
    }

    // ── [LÓGICO BACKEND] Submit handler — Firestore + caché local ──
    const form = document.getElementById('onboarding-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        // [AGENTE 01] Guardia de consentimiento obligatorio
        if (!document.getElementById('check-terms').checked) {
            showError(lc.errorTermsRequired);
            document.getElementById('check-terms').focus();
            return;
        }

        // 1. Captura de datos del formulario y validación de edad
        const birthdateStr = document.getElementById('input-birthdate').value;
        const birthdate = new Date(birthdateStr);
        const today = new Date();
        let age = today.getFullYear() - birthdate.getFullYear();
        const m = today.getMonth() - birthdate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
            age--;
        }
        
        if (age < 18) {
            // BLINDAJE DE DATOS: el bloqueo ocurre aquí, antes de cualquier
            // llamada a MedicalStorage o Firestore. Ningún dato de un menor
            // llega al caché local ni a la nube.
            showError("Debes ser mayor de 18 años para utilizar esta aplicación.");
            document.getElementById('input-birthdate').focus();
            return;
        }

        // Capturamos todas las opciones seleccionadas del select múltiple (excl. placeholder)
        const selectPathology = document.getElementById('select-pathology');
        const selectedValues = Array.from(selectPathology.selectedOptions)
            .map(opt => opt.value)
            .filter(v => v !== '');

        const profile = {
            birthdate: birthdateStr,
            weight: parseFloat(document.getElementById('input-weight').value),
            height: parseInt(document.getElementById('input-height').value, 10),
            pathology: selectedValues.length > 0 ? selectedValues[0] : 'none', // Mantiene la compatibilidad con código viejo
            enfermedades: selectedValues // Guarda la lista completa de enfermedades
        };

        // 2. Guard de sesión PRIMERO — antes de cualquier operación costosa
        //    authStateReady() garantiza que Firebase rehidrata el token
        //    en cargas directas (URL, F5) donde currentUser puede ser null.
        const auth = window.NuraFirebase.auth;
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
            console.warn('[Onboarding] Sin sesión activa. Redirigiendo a auth.');
            window.location.href = '../auth/index.html';
            return;
        }

        // 3. Validación clínica + cifrado AES-GCM en caché local
        //    Si falla validación, abortar antes de cualquier llamada de red.
        const cacheResult = await MedicalStorage.saveProfile(profile);
        if (!cacheResult.ok) {
            showError(cacheResult.error);
            return;
        }

        // 4. Estado de carga en botón
        const btn          = document.getElementById('btn-submit');
        const originalText = btn.textContent;
        btn.textContent    = 'Guardando...';
        btn.disabled       = true;

        try {
            // 5. Dynamic import de Firestore (en caché desde firebase-config.js)
            const { doc, setDoc } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

            const db = window.NuraFirebase.db;

            // 6. Payload estructurado para Firestore
            //    setDoc con merge:true preserva campos existentes del documento
            //    (ej. medications[] que guarda el módulo de medicamentos).
            //
            //    NOTA: email e displayName permiten identificar registros en la
            //    consola Firebase. Las Security Rules deben garantizar que solo
            //    uid == request.auth.uid pueda leer/escribir su documento.
            // [AGENTE 01] Objeto legal_consent — estructura canónica auditada.
            // Guardado como sub-objeto para separación semántica clara en Firestore
            // y facilitar consultas de cumplimiento (ej. todos los users en v1.x.x).
            const consentTimestamp = new Date().toISOString();

            // SHA-256 del texto legal visible — huella de integridad del consentimiento.
            // Permite auditar en el futuro que el usuario aceptó exactamente esta versión.
            const legalHash = await _hashLegalText();

            const payload = {
                uid:         user.uid,
                email:       user.email,
                displayName: user.displayName || null,
                birthdate:   profile.birthdate,
                weight:      profile.weight,
                height:      profile.height,
                pathology:   profile.pathology,
                enfermedades: profile.enfermedades,
                legal_consent: {
                    terms_accepted:     true,
                    ai_training_opt_in: document.getElementById('check-ai-training').checked,
                    user_agent:         navigator.userAgent,
                    legal_version:      LEGAL_VERSION,
                    accepted_at:        consentTimestamp,
                    legal_hash:         legalHash   // SHA-256 del texto legal aceptado
                },
                updatedAt: consentTimestamp
            };

            await setDoc(
                doc(db, 'users', user.uid),
                payload,
                { merge: true }     // ← preserva medications[] y otros campos
            );

            console.log('[Onboarding] Perfil guardado en Firestore:', {
                uid:          user.uid,
                pathology:  profile.pathology,
                enfermedades: profile.enfermedades
            });

            // 7. Éxito — redirigir al dashboard
            window.location.href = '../dashboard/index.html';

        } catch (err) {
            console.error('[Onboarding] Firestore error:', err.code, err.message);
            showError(_mapFirestoreError(err.code));

            // Restaurar botón solo en error — en éxito la página redirige
            btn.textContent = originalText;
            btn.disabled    = false;
        }
    });
    // ── [FIN LÓGICO BACKEND] ──────────────────────────────────────
});