// =================================================================
// [ARQUITECTO VISUAL — sin modificaciones] Lógica de UI e i18n
// [LÓGICO BACKEND] Submit handler migrado a Firestore — 2026-04-02
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

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
            const payload = {
                uid:         user.uid,
                email:       user.email,
                displayName: user.displayName || null,
                weight:      profile.weight,
                height:      profile.height,
                pathology:   profile.pathology,
                updatedAt:   new Date().toISOString()
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
