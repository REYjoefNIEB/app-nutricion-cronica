// =================================================================
// [SPRINT M1] Dashboard médico stub — placeholders para futuras fases
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {

    // ── Helpers ────────────────────────────────────────────────────
    const trialBadge          = document.getElementById('trial-badge');
    const trialDaysRemaining  = document.getElementById('trial-days-remaining');
    const welcomeMessage      = document.getElementById('welcome-message');
    const btnSwitchToPerson   = document.getElementById('btn-switch-to-person');

    // ── Guard de sesión ────────────────────────────────────────────
    const auth = window.NuraFirebase.auth;
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
        console.warn('[DoctorDashboard] Sin sesión activa. Redirigiendo a auth.');
        window.location.href = '../../auth/index.html';
        return;
    }

    // ── Cargar datos del usuario ──────────────────────────────────
    try {
        const { doc, getDoc } =
            await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const db = window.NuraFirebase.db;

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            console.warn('[DoctorDashboard] Usuario sin documento Firestore. Redirigiendo a onboarding.');
            window.location.href = '../../onboarding/index.html';
            return;
        }

        const userData = userDoc.data();

        // Verificar que efectivamente es médico
        if (userData.profileType !== 'doctor') {
            console.warn('[DoctorDashboard] Usuario no es médico. Redirigiendo a dashboard paciente.');
            window.location.href = '../../dashboard/index.html';
            return;
        }

        // Mostrar nombre en welcome
        // [AGENTE 04 — Tablas Clínicas] (Sprint M4-A) Fallback 'colega' en lugar de email username:
        // antes: si displayName y user.displayName eran null, mostraba la parte previa al @ del email
        // (ej. "Hola Dr./Dra. chile" para chile@*.cl). Ahora cae a "colega" más natural.
        const displayName = userData.displayName || user.displayName || 'colega';
        welcomeMessage.textContent = `Hola Dr./Dra. ${displayName}, tu asistente clínico está listo. Estas son las herramientas que tendrás disponibles.`;

        // Calcular días restantes de trial
        if (userData.doctorProfile && userData.doctorProfile.subscriptionStatus === 'trial') {
            const expiry = new Date(userData.doctorProfile.subscriptionExpiresAt);
            const now = new Date();
            const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

            if (daysLeft > 0) {
                trialBadge.textContent = 'Trial';
                trialDaysRemaining.textContent = `${daysLeft} días restantes`;
            } else {
                trialBadge.textContent = 'Trial expirado';
                trialBadge.classList.add('expired');
                trialDaysRemaining.textContent = 'Renueva tu suscripción';
            }
        }

    } catch (err) {
        console.error('[DoctorDashboard] Error cargando datos:', err);
        // No bloqueamos la UI, mostramos placeholders genéricos
    }

    // ── Listener para cambiar a modo paciente ─────────────────────
    btnSwitchToPerson.addEventListener('click', () => {
        window.location.href = '../../dashboard/index.html';
    });
});
