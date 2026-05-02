// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-A)
// Orquestación de la página /doctor/tablas/.
//
// Responsabilidades:
//   1. Guard de sesión (auth + profileType === 'doctor')
//   2. Cargar scales.json
//   3. Inicializar UIList con el JSON
//
// El motor de render vive en modules/ui-list.js.
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {

    // ── Guard de sesión + verificación profileType ────────────────
    try {
        const auth = window.NuraFirebase && window.NuraFirebase.auth;
        if (auth) {
            await auth.authStateReady();
            const user = auth.currentUser;
            if (!user) {
                console.warn('[TablasClinicas] Sin sesión activa. Redirigiendo a auth.');
                window.location.href = '../../auth/index.html';
                return;
            }

            // Verificar profileType (defensa adicional)
            const { doc, getDoc } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
            const db = window.NuraFirebase.db;
            const snap = await getDoc(doc(db, 'users', user.uid));
            if (snap.exists()) {
                const data = snap.data();
                if (data.profileType && data.profileType !== 'doctor') {
                    console.warn('[TablasClinicas] Usuario no es médico. Redirigiendo a dashboard paciente.');
                    window.location.href = '../../dashboard/index.html';
                    return;
                }
            }
        }
    } catch (err) {
        console.error('[TablasClinicas] Error en guard de sesión:', err);
        // Fail-open: si Firebase tarda, igual mostramos las tablas (datos no sensibles).
    }

    // ── Cargar scales.json ─────────────────────────────────────────
    let scalesData;
    try {
        const res = await fetch('data/scales.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        scalesData = await res.json();
        console.log('[TablasClinicas] Cargadas', scalesData.scales?.length || 0, 'escalas. Estado validación:', scalesData.validationStatus);
    } catch (err) {
        console.error('[TablasClinicas] Error cargando scales.json:', err);
        const container = document.getElementById('scales-list');
        if (container) {
            container.innerHTML = '<p class="error-text">No se pudieron cargar las escalas. Recargá la página.</p>';
        }
        return;
    }

    // ── Marcar versión visible si está validado ───────────────────
    const versionEl = document.getElementById('tablas-version');
    if (versionEl && scalesData.version) {
        const status = scalesData.validationStatus || 'pending';
        const validated = status === 'verified';
        versionEl.textContent = `v${scalesData.version}` + (validated ? ' · ✓ Validado contra MDCalc' : ' · validación pendiente');
        if (validated) versionEl.classList.add('verified');
    }

    // ── Inicializar Vista Lista ───────────────────────────────────
    const container = document.getElementById('scales-list');
    if (window.NuraTablas?.UIList) {
        window.NuraTablas.UIList.renderList(scalesData, container, scalesData.validationStatus);
    } else {
        console.error('[TablasClinicas] NuraTablas.UIList no está disponible.');
        container.innerHTML = '<p class="error-text">Error de carga de módulos.</p>';
    }
});
