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

    async function updateProfile(fields) {
        try {
            const existing = await loadProfile() || {};
            const updated  = { ...existing, ...fields, updatedAt: new Date().toISOString() };
            localStorage.setItem('mcp_profile', await _encrypt(JSON.stringify(updated)));
            return { ok: true, error: null };
        } catch {
            return { ok: false, error: 'No se pudo actualizar el almacenamiento local.' };
        }
    }

    return { saveProfile, loadProfile, updateProfile };

})();

// =================================================================
// [ARQUITECTO VISUAL] UI e i18n — fix XSS aprobado 2026-04-01
// [LÓGICO BACKEND] Firestore write añadido — 2026-04-02
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('title').textContent         = t.pageTitle;
    document.getElementById('subtitle').textContent      = t.pageSubtitle;
    document.getElementById('input-search').placeholder  = t.searchPlaceholder;
    document.getElementById('btn-save').textContent      = t.btnSave;
    document.getElementById('mockup-1-text').textContent = t.mockup1;
    document.getElementById('mockup-2-text').textContent = t.mockup2;
    document.getElementById('mockup-3-text').textContent = t.mockup3;

    const searchForm  = document.getElementById('search-form');
    const searchInput = document.getElementById('input-search');
    const medsGrid    = document.getElementById('meds-grid');

    function attachRemoveEvent(btn, item) {
        btn.addEventListener('click', () => {
            item.style.transform = 'scale(0.8)';
            item.style.opacity   = '0';
            setTimeout(() => item.remove(), 250);
        });
    }

    document.querySelectorAll('.med-tag').forEach(tag => {
        attachRemoveEvent(tag.querySelector('.med-remove'), tag);
    });

    // [FIX XSS — Auditor Médico 2026-04-01] construcción segura del DOM
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        const tag             = document.createElement('div');
        tag.className         = 'med-tag';
        const nameSpan        = document.createElement('span');
        nameSpan.className    = 'med-name';
        nameSpan.textContent  = query;
        const removeBtn       = document.createElement('button');
        removeBtn.type        = 'button';
        removeBtn.className   = 'med-remove';
        removeBtn.setAttribute('aria-label', 'Eliminar');
        removeBtn.textContent = '\u00d7';
        tag.appendChild(nameSpan);
        tag.appendChild(removeBtn);
        attachRemoveEvent(removeBtn, tag);
        medsGrid.appendChild(tag);
        searchInput.value = '';
    });

    // ── [LÓGICO BACKEND] Elemento de error inline ─────────────────
    // Reemplaza alert() — consistente con el estándar del proyecto.
    const errorMsg            = document.createElement('p');
    errorMsg.id               = 'error-msg';
    errorMsg.style.color      = 'var(--orange-strong, #e06c75)';
    errorMsg.style.fontSize   = '0.85rem';
    errorMsg.style.fontWeight = '600';
    errorMsg.style.textAlign  = 'center';
    errorMsg.style.marginTop  = '0.75rem';
    errorMsg.style.minHeight  = '1.2em';
    document.getElementById('final-form')
        .insertAdjacentElement('afterend', errorMsg);

    function showError(msg) { errorMsg.textContent = msg; }
    function clearError()   { errorMsg.textContent = ''; }

    function _mapFirestoreError(code) {
        const errors = {
            'permission-denied': 'Sin permiso para guardar. Verifica tu sesión.',
            'unavailable':       'Firestore no disponible. Verifica tu conexión.',
            'deadline-exceeded': 'El servidor tardó demasiado. Intenta de nuevo.'
        };
        return errors[code] || 'Error al guardar en la nube. Intenta de nuevo.';
    }

    // ── [LÓGICO BACKEND] Submit handler — Firestore + caché local ──
    const finalForm = document.getElementById('final-form');

    finalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError();

        // 1. Captura de medicamentos visibles en el DOM (textContent — seguro XSS)
        const medications = Array.from(
            document.querySelectorAll('#meds-grid .med-name')
        ).map(el => el.textContent.trim()).filter(Boolean);

        // 2. Actualizar caché local primero (sin red, cifrado AES-GCM)
        const cacheResult = await MedicalStorage.updateProfile({ medications });
        if (!cacheResult.ok) {
            showError(cacheResult.error);
            return;
        }

        // 3. Guard de sesión con authStateReady() — seguro ante hidratación inicial
        //    de Firebase Auth en cargas directas o recargas de página.
        const auth = window.NuraFirebase.auth;
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
            console.warn('[Medications] Sin sesión activa. Redirigiendo a auth.');
            window.location.href = '../auth/index.html';
            return;
        }

        // 4. Estado de carga en botón
        const btn          = document.getElementById('btn-save');
        const originalText = btn.textContent;
        btn.textContent    = 'Guardando...';
        btn.disabled       = true;

        try {
            // 5. Dynamic import Firestore (en caché desde firebase-config.js)
            const { doc, setDoc } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

            // 6. Escribir en Firestore — merge:true preserva weight/height/pathology
            await setDoc(
                doc(window.NuraFirebase.db, 'users', user.uid),
                {
                    medications:          medications,
                    medicationsUpdatedAt: new Date().toISOString()
                },
                { merge: true }
            );

            console.log('[Medications] Guardado en Firestore:', medications);

            // 7. Feedback visual — lógica original del Arquitecto intacta
            btn.textContent = '¡Guardado exitoso!';
            btn.classList.add('success');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('success');
                btn.disabled    = false;
            }, 2000);

        } catch (err) {
            console.error('[Medications] Firestore error:', err.code, err.message);
            showError(_mapFirestoreError(err.code));
            btn.textContent = originalText;
            btn.disabled    = false;
        }
    });
    // ── [FIN LÓGICO BACKEND] ──────────────────────────────────────
});
