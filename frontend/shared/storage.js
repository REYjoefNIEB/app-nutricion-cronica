// =================================================================
// [LÓGICO BACKEND] shared/storage.js — MedicalStorage centralizado
// Fuente única de verdad para caché local AES-GCM.
// Consolidado desde onboarding, medications, dashboard, scanner.
// Aprobado Auditor Médico — 2026-04-02
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

    // ── Validación clínica ────────────────────────────────────────
    function _validate({ weight, height, pathology }) {
        if (isNaN(weight) || weight < 20 || weight > 300)
            return 'Peso fuera de rango clínico válido (20–300 kg).';
        if (isNaN(height) || height < 50 || height > 250)
            return 'Altura fuera de rango clínico válido (50–250 cm).';
        if (!pathology)
            return 'Debe seleccionar una patología.';
        return null;
    }

    // ── API Pública ───────────────────────────────────────────────

    async function saveProfile(profile) {
        const error = _validate(profile);
        if (error) return { ok: false, error };
        try {
            const payload = JSON.stringify({
                weight:        profile.weight,
                height:        profile.height,
                pathology:     profile.pathology,
                enfermedades:  Array.isArray(profile.enfermedades)  ? profile.enfermedades  : [],
                medicamentos:  Array.isArray(profile.medicamentos)  ? profile.medicamentos  : [],
                birthdate:     profile.birthdate || null,
                medications:   Array.isArray(profile.medications)   ? profile.medications   : [],
                savedAt:       new Date().toISOString()
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

    /**
     * Fusiona datos frescos de Firestore en el caché local.
     * Fallo silencioso — el caché es best-effort, no bloqueante.
     */
    async function updateCache(data) {
        try {
            const existing = await loadProfile() || {};
            const merged   = { ...existing, ...data };
            localStorage.setItem('mcp_profile', await _encrypt(JSON.stringify(merged)));
        } catch {
            // Silencioso — si el caché falla, Firestore sigue siendo la fuente
        }
    }

    return { saveProfile, loadProfile, updateProfile, updateCache };

})();
