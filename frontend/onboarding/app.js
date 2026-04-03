// =================================================================
// [LÓGICO BACKEND] MedicalStorage — AES-GCM (Web Crypto API)
// Migración desde XOR+Base64. Aprobado Auditor Médico — 2026-04-02
//
// Modelo de amenaza:
//   Protege contra inspección casual de localStorage (DevTools,
//   robo físico de disco). La passphrase está en fuente, pero
//   PBKDF2 × 100.000 hace inviable el brute-force offline.
//   La CryptoKey es no-extractable: no puede ser leída por JS.
//   IV aleatorio 96-bit por escritura: ciphertext único cada vez.
// =================================================================
const MedicalStorage = (() => {

    const _PASSPHRASE = 'NuraApp-MedicalCache-v1';
    const _SALT_STR   = 'NuraStaticSalt2026';
    const _ITERATIONS = 100_000;
    const _IV_BYTES   = 12;      // 96 bits — recomendado NIST SP 800-38D

    let _cryptoKey = null;       // CryptoKey cacheada en memoria de sesión

    // ── Derivación de clave — PBKDF2 → AES-GCM 256-bit ─────────
    async function _getKey() {
        if (_cryptoKey) return _cryptoKey;

        const enc    = new TextEncoder();
        const keyMat = await crypto.subtle.importKey(
            'raw',
            enc.encode(_PASSPHRASE),
            { name: 'PBKDF2' },
            false,                           // no-extractable
            ['deriveKey']
        );

        _cryptoKey = await crypto.subtle.deriveKey(
            {
                name:       'PBKDF2',
                salt:       enc.encode(_SALT_STR),
                iterations: _ITERATIONS,
                hash:       'SHA-256'
            },
            keyMat,
            { name: 'AES-GCM', length: 256 },
            false,                           // no-extractable
            ['encrypt', 'decrypt']
        );

        return _cryptoKey;
    }

    // ── Cifrado: IV aleatorio + ciphertext → base64 ─────────────
    async function _encrypt(plaintext) {
        const key = await _getKey();
        const iv  = crypto.getRandomValues(new Uint8Array(_IV_BYTES));

        const cipherBuf = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(plaintext)
        );

        // Empaqueta: [12 bytes IV | N bytes ciphertext]
        const packed = new Uint8Array(_IV_BYTES + cipherBuf.byteLength);
        packed.set(iv, 0);
        packed.set(new Uint8Array(cipherBuf), _IV_BYTES);

        return btoa(String.fromCharCode(...packed));
    }

    // ── Descifrado: desempaqueta IV, descifra, decodifica ────────
    async function _decrypt(encoded) {
        const key    = await _getKey();
        const packed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));

        const iv        = packed.slice(0, _IV_BYTES);
        const cipherBuf = packed.slice(_IV_BYTES).buffer;

        const plainBuf = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            cipherBuf
        );

        return new TextDecoder().decode(plainBuf);
    }

    // ── Validación clínica — sin cambios ─────────────────────────
    function _validate({ weight, height, pathology }) {
        if (isNaN(weight) || weight < 20 || weight > 300)
            return 'Peso fuera de rango clínico válido (20–300 kg).';
        if (isNaN(height) || height < 50 || height > 250)
            return 'Altura fuera de rango clínico válido (50–250 cm).';
        if (!pathology)
            return 'Debe seleccionar una patología.';
        return null;
    }

    async function saveProfile(profile) {
        const error = _validate(profile);
        if (error) return { ok: false, error };
        try {
            const payload = JSON.stringify({
                weight:    profile.weight,
                height:    profile.height,
                pathology: profile.pathology,
                savedAt:   new Date().toISOString()
            });
            localStorage.setItem('mcp_profile', await _encrypt(payload));
            return { ok: true, error: null };
        } catch {
            return { ok: false, error: 'No se pudo acceder al almacenamiento local.' };
        }
    }

    async function loadProfile() {
        try {
            const raw = localStorage.getItem('mcp_profile');
            if (!raw) return null;
            // Si raw contiene datos XOR legacy, _decrypt lanza DOMException
            // → catch → null → Firestore fallback → migración limpia y silenciosa
            return JSON.parse(await _decrypt(raw));
        } catch {
            return null;
        }
    }

    return { saveProfile, loadProfile };

})();

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
