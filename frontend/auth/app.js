// =================================================================
// [ARQUITECTO VISUAL] Lógica de UI e i18n — preservada intacta
// [LÓGICO BACKEND] Firebase Authentication — añadido 2026-04-02
//
// NOTA ARQUITECTÓNICA:
//   app.js permanece como script regular (no módulo) para mantener
//   acceso a `translations` definido en i18n.js (mismo scope global).
//   Los métodos de Firebase Auth se importan via dynamic import()
//   dentro del submit handler. firebase-auth.js ya está en caché del
//   browser gracias a firebase-config.js → resolución instantánea.
//
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

document.addEventListener('DOMContentLoaded', () => {

    // ── [ARQUITECTO VISUAL] Inyección de textos — SIN MODIFICAR ──
    document.getElementById('title').textContent           = t.pageTitle;
    document.getElementById('subtitle').textContent        = t.pageSubtitle;
    document.getElementById('label-email').textContent     = t.emailLabel;
    document.getElementById('input-email').placeholder     = t.emailPlaceholder;
    document.getElementById('label-name').textContent      = t.nameLabel;
    document.getElementById('input-name').placeholder      = t.namePlaceholder;
    document.getElementById('label-password').textContent  = t.passwordLabel;
    document.getElementById('input-password').placeholder  = t.passwordPlaceholder;
    document.getElementById('btn-google-text').textContent = t.btnGoogle;
    document.getElementById('divider-text').textContent    = t.dividerText;

    let isLogin = true;

    const btnSubmit  = document.getElementById('btn-submit');
    const promptText = document.getElementById('text-toggle-prompt');
    const btnToggle  = document.getElementById('btn-toggle');
    const groupName  = document.getElementById('group-name');
    const authForm   = document.getElementById('auth-form');

    // [ARQUITECTO VISUAL] Función de estado UI — SIN MODIFICAR
    function updateUIState() {
        if (isLogin) {
            btnSubmit.textContent   = t.btnSignIn;
            promptText.textContent  = t.promptNoAccount;
            btnToggle.textContent   = t.linkSignUp;
            groupName.style.display = 'none';
            document.getElementById('input-name').required = false;
        } else {
            btnSubmit.textContent   = t.btnSignUp;
            promptText.textContent  = t.promptHasAccount;
            btnToggle.textContent   = t.linkSignIn;
            groupName.style.display = 'block';
            document.getElementById('input-name').required = true;
        }
        // Animación sutil — original del Arquitecto, intacta
        authForm.style.opacity = '0.5';
        setTimeout(() => { authForm.style.opacity = '1'; }, 150);
    }

    updateUIState();

    // [ARQUITECTO VISUAL] Toggle — SIN MODIFICAR (+ clearError añadido)
    btnToggle.addEventListener('click', () => {
        isLogin = !isLogin;
        updateUIState();
        clearError(); // [LÓGICO BACKEND] limpiar error al cambiar modo
    });

    // ── [LÓGICO BACKEND] Elemento de error — creado dinámicamente ─
    // Inyectado entre #auth-form y .auth-toggle sin alterar el HTML.
    // minHeight reserva espacio y evita layout shift al mostrar/ocultar.
    const errorMsg            = document.createElement('p');
    errorMsg.id               = 'error-msg';
    errorMsg.style.color      = 'var(--orange-strong)';
    errorMsg.style.fontSize   = '0.85rem';
    errorMsg.style.fontWeight = '600';
    errorMsg.style.textAlign  = 'center';
    errorMsg.style.marginTop  = '0.75rem';
    errorMsg.style.minHeight  = '1.2em';
    authForm.insertAdjacentElement('afterend', errorMsg);

    function showError(msg) { errorMsg.textContent = msg; }
    function clearError()   { errorMsg.textContent = ''; }

    /**
     * Traduce códigos de error de Firebase a mensajes legibles en español.
     * NOTA: 'auth/invalid-credential' es el código unificado en Firebase
     * Auth v10+ que reemplaza 'auth/user-not-found' + 'auth/wrong-password'
     * por seguridad (evita enumerar si un email existe en el sistema).
     * Ambos códigos legacy se mantienen para compatibilidad.
     */
    function _mapFirebaseError(code) {
        const errors = {
            'auth/email-already-in-use':   'Este correo ya está registrado. Intenta ingresar.',
            'auth/invalid-email':          'El formato del correo electrónico no es válido.',
            'auth/weak-password':          'La contraseña debe tener mínimo 6 caracteres.',
            'auth/user-not-found':         'No existe una cuenta con este correo.',
            'auth/wrong-password':         'Contraseña incorrecta. Intenta de nuevo.',
            'auth/invalid-credential':     'Correo o contraseña incorrectos. Verifica tus datos.',
            'auth/too-many-requests':      'Demasiados intentos fallidos. Espera unos minutos.',
            'auth/network-request-failed': 'Error de red. Verifica tu conexión a internet.',
            // ── Códigos específicos de Google OAuth ──────────────
            'auth/popup-blocked':          'El navegador bloqueó la ventana emergente. Permite popups para este sitio.',
            'auth/unauthorized-domain':    'Dominio no autorizado en Firebase. Contacta al administrador.'
        };
        return errors[code] || 'Ocurrió un error inesperado. Intenta de nuevo.';
    }

    // ── [LÓGICO BACKEND] Verificación de consentimiento legal ─────
    // Comprueba si el usuario ya aceptó la versión vigente de los términos.
    // Retorna true  → ir al dashboard.
    // Retorna false → redirigir a onboarding para re-aceptar.
    //
    // Diseño: acepta un objeto `data` ya cargado (Google OAuth, que ya hizo
    // getDoc) para evitar una segunda lectura de Firestore. Si no se pasa
    // `data`, hace la lectura ella misma (flujo email/password).
    async function checkLegalConsent(uid, data = null) {
        try {
            let userData = data;
            if (!userData) {
                const { doc, getDoc } =
                    await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                const snap = await getDoc(doc(window.NuraFirebase.db, 'users', uid));
                if (!snap.exists()) return false;
                userData = snap.data();
            }
            // Lee la ruta canónica legal_consent.version.
            // Si el campo existe y la versión coincide, el resto del objeto
            // (terms_accepted, timestamp) se asume íntegro — el onboarding
            // es la única ruta de escritura y ya lo valida.
            return userData.legal_consent?.legal_version === LEGAL_VERSION;
        } catch (err) {
            // Ante cualquier error de lectura, enviar a onboarding por seguridad
            console.warn('[Auth] checkLegalConsent error — redirigiendo a onboarding:', err.message);
            return false;
        }
    }
    // ── [FIN checkLegalConsent] ───────────────────────────────────

    // ── [LÓGICO BACKEND] Submit handler con Firebase Auth ─────────
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        const email    = document.getElementById('input-email').value.trim();
        const password = document.getElementById('input-password').value;
        const auth     = window.NuraFirebase.auth;

        // Estado de carga — mismo patrón visual del Arquitecto, sin setTimeout mock
        const originalText      = btnSubmit.textContent;
        btnSubmit.textContent   = 'Autenticando...';
        btnSubmit.disabled      = true;
        btnSubmit.style.opacity = '0.7';

        try {
            // Dynamic import: firebase-auth.js ya está en caché del browser
            // gracias a la importación previa en firebase-config.js.
            const { createUserWithEmailAndPassword,
                    signInWithEmailAndPassword,
                    updateProfile } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');

            if (isLogin) {
                // ── Flujo Login ──────────────────────────────────
                const credential = await signInWithEmailAndPassword(auth, email, password);
                // [LÓGICO BACKEND] Verificar que el usuario aceptó la versión
                // vigente de los términos antes de entrar al dashboard.
                const hasConsent = await checkLegalConsent(credential.user.uid);
                window.location.href = hasConsent
                    ? '../dashboard/index.html'
                    : '../onboarding/index.html';

            } else {
                // ── Flujo Registro ───────────────────────────────
                const name       = document.getElementById('input-name').value.trim();
                const credential = await createUserWithEmailAndPassword(auth, email, password);

                // Persistir displayName en el perfil Firebase del usuario
                if (name) {
                    await updateProfile(credential.user, { displayName: name });
                }

                window.location.href = '../onboarding/index.html';
            }

        } catch (err) {
            console.error('[Auth] Firebase error:', err.code, err.message);
            showError(_mapFirebaseError(err.code));

            // Restaurar botón solo en error — en éxito la página redirige
            btnSubmit.textContent   = originalText;
            btnSubmit.disabled      = false;
            btnSubmit.style.opacity = '1';
        }
    });
    // ── [FIN LÓGICO BACKEND] ──────────────────────────────────────

    // ── [LÓGICO BACKEND] Google OAuth — signInWithPopup ───────────
    // Aprobado por Auditor Médico — 2026-04-02
    const btnGoogle     = document.getElementById('btn-google');
    const btnGoogleText = document.getElementById('btn-google-text');

    btnGoogle.addEventListener('click', async () => {
        clearError();

        // Estado de carga — mismo patrón que btnSubmit
        const originalText        = btnGoogleText.textContent;
        btnGoogleText.textContent = 'Conectando...';
        btnGoogle.disabled        = true;

        try {
            // Importar Auth y Firestore en paralelo (ambos en caché desde firebase-config.js)
            const [
                { GoogleAuthProvider, signInWithPopup },
                { doc, getDoc }
            ] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
                import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
            ]);

            const auth     = window.NuraFirebase.auth;
            const db       = window.NuraFirebase.db;
            const provider = new GoogleAuthProvider();

            // 1. Autenticar con Google (abre popup nativo del navegador)
            const result = await signInWithPopup(auth, provider);

            // 2. Enrutamiento inteligente — mismo documento que usa onboarding
            //    Reutilizamos el snap para el chequeo legal sin doble lectura.
            const snap = await getDoc(doc(db, 'users', result.user.uid));

            if (!snap.exists()) {
                // Primera vez con Google → onboarding completo
                console.log('[Auth] Google OK — usuario nuevo. → onboarding');
                window.location.href = '../onboarding/index.html';
            } else {
                // Usuario existente: verificar versión de términos aceptada.
                // Pasamos los datos ya cargados para evitar una segunda lectura.
                const hasConsent = await checkLegalConsent(result.user.uid, snap.data());
                if (hasConsent) {
                    console.log('[Auth] Google OK — consentimiento vigente. → dashboard');
                    window.location.href = '../dashboard/index.html';
                } else {
                    console.log('[Auth] Google OK — términos desactualizados. → onboarding');
                    window.location.href = '../onboarding/index.html';
                }
            }

        } catch (err) {
            // Popup cerrado o cancelado por el usuario — acción intencional, sin mensaje
            if (err.code === 'auth/popup-closed-by-user' ||
                err.code === 'auth/cancelled-popup-request') {
                console.log('[Auth] Google popup cancelado por el usuario.');
            } else {
                // Error real — mostrar en UI mediante el elemento de error compartido
                console.error('[Auth] Google OAuth error:', err.code, err.message);
                showError(_mapFirebaseError(err.code));
            }

            // Restaurar botón en cualquier caso de no-redirección
            btnGoogleText.textContent = originalText;
            btnGoogle.disabled        = false;
        }
    });
    // ── [FIN GOOGLE OAUTH] ────────────────────────────────────────
});
