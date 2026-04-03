// =================================================================
// [ARQUITECTO VISUAL — sin modificaciones] Lógica de UI e i18n
// [LÓGICO BACKEND] Submit handler migrado a Firestore — 2026-04-02
// [AGENTE 01 — Legal & Compliance] Consentimiento Informado — 2026-04-02
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
const currentLang = 'es';
const t  = translations[currentLang];
const lc = legalContent[currentLang];

document.addEventListener('DOMContentLoaded', () => {

    // Inyección de textos (original del Arquitecto, intacto)
    document.getElementById('title').textContent           = t.pageTitle;
    document.getElementById('subtitle').textContent        = t.pageSubtitle;
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

    document.getElementById('btn-submit').textContent  = t.submitBtn;
    document.getElementById('footer-text').textContent = t.footerText;

    // ── [AGENTE 01] Inyección de contenido legal ──────────────────
    document.getElementById('consent-title').textContent    = lc.consentSectionTitle;
    document.getElementById('disclaimer-title').textContent = lc.disclaimerTitle;
    document.getElementById('disclaimer-text').textContent  = lc.disclaimerText;
    document.getElementById('privacy-title').textContent    = lc.privacyTitle;
    document.getElementById('privacy-text').textContent     = lc.privacyText;
    document.getElementById('ai-title').textContent         = lc.aiTitle;
    document.getElementById('ai-text').textContent          = lc.aiText;
    document.getElementById('label-terms').textContent      = lc.consentTermsLabel;
    document.getElementById('label-ai-training').textContent = lc.consentAiLabel;

    // Acordeones de texto legal (toggle show/hide)
    function _setupToggle(btnId, bodyId) {
        const btn  = document.getElementById(btnId);
        const body = document.getElementById(bodyId);
        const span = btn.querySelector('span');
        btn.addEventListener('click', () => {
            const isHidden = body.hidden;
            body.hidden = !isHidden;
            // Actualiza la etiqueta del botón para accesibilidad
            btn.setAttribute('aria-expanded', String(isHidden));
        });
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', bodyId);
    }
    _setupToggle('toggle-disclaimer', 'body-disclaimer');
    _setupToggle('toggle-privacy',    'body-privacy');
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

        // 1. Captura de datos del formulario
        const profile = {
            weight:    parseFloat(document.getElementById('input-weight').value),
            height:    parseInt(document.getElementById('input-height').value, 10),
            pathology: document.getElementById('select-pathology').value
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
            const payload = {
                uid:         user.uid,
                email:       user.email,
                displayName: user.displayName || null,
                weight:      profile.weight,
                height:      profile.height,
                pathology:   profile.pathology,
                legal_consent: {
                    terms_accepted:     true,
                    ai_training_opt_in: document.getElementById('check-ai-training').checked,
                    user_agent:         navigator.userAgent,
                    legal_version:      LEGAL_VERSION,
                    accepted_at:        consentTimestamp
                },
                updatedAt: consentTimestamp
            };

            await setDoc(
                doc(db, 'users', user.uid),
                payload,
                { merge: true }     // ← preserva medications[] y otros campos
            );

            console.log('[Onboarding] Perfil guardado en Firestore:', {
                uid:       user.uid,
                pathology: profile.pathology
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
