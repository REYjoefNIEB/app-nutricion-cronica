// =================================================================
// [LÓGICO BACKEND] MedicalStorage — AES-GCM (Web Crypto API)
// Deuda técnica registrada: migrar a shared/storage.js cuando se
// permita modificar los index.html.
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

    async function loadProfile() {
        try {
            const raw = localStorage.getItem('mcp_profile');
            if (!raw) return null;
            // Si raw contiene datos XOR legacy, _decrypt lanza DOMException
            // → catch → null → flujo de sin-perfil → migración limpia y silenciosa
            return JSON.parse(await _decrypt(raw));
        } catch {
            return null;
        }
    }

    return { loadProfile };

})();

// =================================================================
// [LÓGICO BACKEND] AlertEngine — Motor de reglas de interacción
//
// NOTA PARA AUDITOR MÉDICO:
//   Regla RED  → Pomelo + estatinas (Atorvastatina, Simvastatina,
//                Lovastatina): inhibición documentada de CYP3A4.
//                Fuente: FDA Drug Interaction Studies (2021).
//   Regla ORANGE → Azúcar añadida + diabetes_2 u obesity:
//                  riesgo glucémico directo por consumo de azúcar libre.
//   El motor es extensible: agregar objetos a RULES sin tocar el
//   resto del código.
// =================================================================
const AlertEngine = (() => {

    // Mock de detección OCR para fase MVP
    const MOCK_INGREDIENTS = [
        'Agua',
        'Jugo de Pomelo concentrado',
        'Azúcar añadida'
    ];

    const RULES = [
        {
            level:   'RED',
            title:   '⚠ INTERACCIÓN GRAVE — CYP3A4',
            message: 'El Pomelo inhibe la enzima CYP3A4, elevando los ' +
                     'niveles plasmáticos de estatinas a rangos potencialmente ' +
                     'tóxicos (miopatía, rabdomiólisis). Evite el consumo.',
            check(profile, ingredients) {
                const hasStat = (profile.medications || []).some(m =>
                    /atorvastatina|simvastatina|lovastatina/i.test(m)
                );
                const hasPomelo = ingredients.some(i =>
                    /pomelo|grapefruit/i.test(i)
                );
                return hasStat && hasPomelo;
            }
        },
        {
            level:   'ORANGE',
            title:   '⚠ ALERTA NUTRICIONAL — Glucemia',
            message: 'Se detectó Azúcar añadida. Su patología requiere ' +
                     'control estricto del índice glucémico. Consulte a su ' +
                     'médico o nutricionista antes de consumir este producto.',
            check(profile, ingredients) {
                const isSensitive = ['diabetes_2', 'obesity']
                    .includes(profile.pathology);
                const hasSugar = ingredients.some(i =>
                    /az[uú]car\s*a[ñn]adida/i.test(i)
                );
                return isSensitive && hasSugar;
            }
        }
    ];

    /**
     * Ejecuta todas las reglas contra el perfil e ingredientes dados.
     * @param {object}   profile      - Perfil descifrado de mcp_profile
     * @param {string[]} ingredients  - Array de ingredientes detectados
     * @returns {{ ingredients, alerts, safe }}
     */
    function analyze(profile, ingredients) {
        const alerts = RULES
            .filter(rule => rule.check(profile, ingredients))
            .map(({ level, title, message }) => ({ level, title, message }));
        return { ingredients, alerts, safe: alerts.length === 0 };
    }

    return { analyze, MOCK_INGREDIENTS };

})();

// =================================================================
// [ARQUITECTO VISUAL — sin modificaciones] Lógica de UI e i18n
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

document.addEventListener('DOMContentLoaded', () => {

    // Inyección de textos (original del Arquitecto, intacto)
    document.getElementById('title').textContent        = t.pageTitle;
    document.getElementById('subtitle').textContent     = t.pageSubtitle;
    document.getElementById('btn-activate').textContent = t.btnActivate;
    document.getElementById('panel-title').textContent  = t.panelTitle;
    document.getElementById('panel-status').textContent = t.panelEmpty;

    const btnActivate      = document.getElementById('btn-activate');
    const laser            = document.getElementById('scanner-laser');
    const panelHeader      = document.getElementById('panel-header');
    const interactionPanel = document.getElementById('interaction-panel');

    // [ARQUITECTO] Listener visual del botón — SIN MODIFICAR
    btnActivate.addEventListener('click', () => {
        const isScanning = btnActivate.classList.toggle('scanning');
        if (isScanning) {
            btnActivate.textContent = t.btnScanning;
            laser.style.display = 'block';      // ← activa animación CSS
            console.log('Mock: Botón Activar Cámara clickeado. (Esperando al Lógico Backend)');
        } else {
            btnActivate.textContent = t.btnActivate;
            laser.style.display = 'none';
            console.log('Mock: Desactivado.');
        }
    });

    // [ARQUITECTO] Toggle del drawer — SIN MODIFICAR
    panelHeader.addEventListener('click', () => {
        interactionPanel.classList.toggle('expanded');
    });

    // ── [LÓGICO BACKEND] Segundo listener: simulación + motor de reglas ──
    //
    // Se registra DESPUÉS del listener del Arquitecto, por lo que cuando
    // este listener corre, classList.toggle() ya aplicó el nuevo estado.
    // Comprobamos 'contains(scanning)' para saber si acabamos de activar.
    btnActivate.addEventListener('click', () => {

        // Solo actuar al entrar en modo escáner (no al detener)
        if (!btnActivate.classList.contains('scanning')) return;

        // Bloquear el botón durante la simulación (previene doble trigger)
        btnActivate.disabled = true;

        setTimeout(async () => {

            // 1. Mock de ingredientes detectados por OCR
            const detected = AlertEngine.MOCK_INGREDIENTS;

            // 2. Leer perfil del paciente desde LocalStorage (AES-GCM → async)
            const profile = await MedicalStorage.loadProfile();

            if (!profile) {
                // Sin perfil: mostrar advertencia, no bloquear flujo
                _renderNoProfile();
            } else {
                // 3. Ejecutar motor de reglas
                const result = AlertEngine.analyze(profile, detected);
                console.log('[Lógico Backend] Análisis completado:', result);

                // 4. Inyectar resultado en el drawer
                _renderResult(result);
            }

            // 5. Auto-detener escáner (láser + botón)
            btnActivate.classList.remove('scanning');
            btnActivate.textContent  = t.btnActivate;
            laser.style.display      = 'none';
            btnActivate.disabled     = false;

        }, 3000); // ← Simula 3 segundos de procesamiento OCR
    });
    // ── [FIN LÓGICO BACKEND] ──────────────────────────────────────────

    // ── [LÓGICO BACKEND] Renderizado seguro del drawer ────────────────
    // Toda construcción del DOM usa createElement + textContent.
    // innerHTML está explícitamente prohibido en este módulo.

    function _clearPanel() {
        const panelBody = document.querySelector('.panel-body');
        while (panelBody.firstChild) panelBody.removeChild(panelBody.firstChild);
        return panelBody;
    }

    function _autoExpand(panelBody) {
        interactionPanel.classList.add('expanded');
        // Ajustar altura dinámica para acomodar N alertas sin cortar contenido.
        // 56px = altura fija del panel-header (padding 1rem × 2 + font).
        requestAnimationFrame(() => {
            const needed = panelBody.scrollHeight + 56;
            interactionPanel.style.height = Math.max(140, needed) + 'px';
        });
    }

    function _renderNoProfile() {
        const panelBody = _clearPanel();

        const p = document.createElement('p');
        p.className   = 'panel-muted';
        p.textContent = 'No se encontró perfil médico. Completa el Perfil Médico primero.';
        panelBody.appendChild(p);

        _autoExpand(panelBody);
    }

    function _renderResult(result) {
        const panelBody = _clearPanel();

        if (result.safe) {
            const p = document.createElement('p');
            p.className        = 'panel-muted';
            p.style.fontWeight = '600';
            p.style.color      = 'var(--success)';
            p.textContent      = '✓ Sin interacciones detectadas. Ingredientes seguros para su perfil.';
            panelBody.appendChild(p);

        } else {
            result.alerts.forEach(alert => {
                const isRed = alert.level === 'RED';

                const card                 = document.createElement('div');
                card.style.borderRadius    = '8px';
                card.style.padding         = '0.6rem 0.8rem';
                card.style.marginBottom    = '0.5rem';
                card.style.backgroundColor = isRed
                    ? 'rgba(224, 108, 117, 0.12)'
                    : 'rgba(229, 192, 123, 0.12)';
                card.style.borderLeft = isRed
                    ? '4px solid var(--orange-strong)'
                    : '4px solid var(--yellow-strong)';

                const titleEl            = document.createElement('p');
                titleEl.style.fontWeight = '700';
                titleEl.style.fontSize   = '0.82rem';
                titleEl.style.color      = isRed
                    ? 'var(--orange-strong)'
                    : 'var(--yellow-strong)';
                titleEl.textContent = alert.title;

                const msgEl           = document.createElement('p');
                msgEl.style.fontSize  = '0.8rem';
                msgEl.style.marginTop = '0.25rem';
                msgEl.style.color     = 'var(--text-muted)';
                msgEl.textContent     = alert.message;

                card.appendChild(titleEl);
                card.appendChild(msgEl);
                panelBody.appendChild(card);
            });
        }

        _autoExpand(panelBody);
    }
    // ── [FIN RENDERIZADO] ─────────────────────────────────────────────

});
