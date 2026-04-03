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
