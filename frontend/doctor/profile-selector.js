// =================================================================
// [SPRINT M1] Selector de perfil persona/médico
// Ejecutado post-onboarding para decidir qué tipo de cuenta crear.
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ── Banner dinámico por zona horaria (consistente con onboarding) ──
    const bannerSpan = document.querySelector('#emergency-banner span');
    if (bannerSpan) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz === 'America/Santiago') {
            bannerSpan.textContent = 'Nura no atiende emergencias. Llama al 131 si estás en crisis.';
        } else {
            bannerSpan.textContent = 'Nura does not handle emergencies. Call your local emergency services (e.g. 911) if you are in crisis.';
        }
    }

    // ── Helpers de UI ──────────────────────────────────────────────
    const errorMsg = document.getElementById('error-msg');
    const loading  = document.getElementById('loading');
    const optionPerson = document.getElementById('option-person');
    const optionDoctor = document.getElementById('option-doctor');

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    }

    function clearError() {
        errorMsg.textContent = '';
        errorMsg.style.display = 'none';
    }

    function showLoading() {
        loading.classList.remove('hidden');
        optionPerson.disabled = true;
        optionDoctor.disabled = true;
    }

    function hideLoading() {
        loading.classList.add('hidden');
        optionPerson.disabled = false;
        optionDoctor.disabled = false;
    }

    // ── Calcular fecha expiración trial (14 días desde ahora) ──────
    function _calcTrialExpiry() {
        const now = new Date();
        const expiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        return expiry.toISOString();
    }

    // ── Handler común: guarda profileType en Firestore y redirige ──
    async function handleProfileSelection(profileType) {
        clearError();
        showLoading();

        try {
            // 1. Guard de sesión
            const auth = window.NuraFirebase.auth;
            await auth.authStateReady();
            const user = auth.currentUser;
            if (!user) {
                console.warn('[ProfileSelector] Sin sesión activa. Redirigiendo a auth.');
                window.location.href = '../auth/index.html';
                return;
            }

            // 2. Dynamic import de Firestore
            const { doc, setDoc } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

            const db = window.NuraFirebase.db;

            // 3. Construir payload según el perfil elegido
            const nowISO = new Date().toISOString();
            const payload = {
                profileType: profileType,
                profileTypeSetAt: nowISO,
                updatedAt: nowISO
            };

            if (profileType === 'doctor') {
                // Stub de doctorProfile — solo trial sin pago real (Sprint M4 hará el pago)
                payload.doctorProfile = {
                    declaredAt: nowISO,
                    consentTermsVersion: '1.0',
                    subscriptionTier: 'founder',
                    subscriptionStatus: 'trial',
                    subscriptionStartedAt: nowISO,
                    subscriptionExpiresAt: _calcTrialExpiry(),
                    isFounderTier: true,
                    founderNumber: null,        // se asigna server-side cuando se confirme pago en Sprint M21
                    trialUsed: false,
                    paymentProvider: null,
                    paymentMethodId: null,
                    declaredProfession: null,   // se completa en onboarding médico V2
                    rutMedico: null,
                    colmedNumber: null,
                    professionalTitle: null
                };
            }

            // 4. Guardar en Firestore con merge:true (preserva datos del onboarding)
            await setDoc(
                doc(db, 'users', user.uid),
                payload,
                { merge: true }
            );

            console.log('[ProfileSelector] Perfil guardado:', { uid: user.uid, profileType });

            // 5. Redirigir según perfil
            if (profileType === 'doctor') {
                window.location.href = './dashboard/index.html';
            } else {
                window.location.href = '../dashboard/index.html';
            }

        } catch (err) {
            console.error('[ProfileSelector] Error:', err.code, err.message);
            hideLoading();

            const errorMessages = {
                'permission-denied': 'Sin permiso para guardar. Verifica tu sesión.',
                'unavailable':       'Firestore no disponible. Verifica tu conexión.',
                'deadline-exceeded': 'El servidor tardó demasiado. Intenta de nuevo.',
                'unauthenticated':   'Sesión expirada. Redirigiendo...'
            };
            showError(errorMessages[err.code] || 'Error al guardar tu perfil. Intenta de nuevo.');
        }
    }

    // ── Listeners ──────────────────────────────────────────────────
    optionPerson.addEventListener('click', () => handleProfileSelection('person'));
    optionDoctor.addEventListener('click', () => handleProfileSelection('doctor'));
});
