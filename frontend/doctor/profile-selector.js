// =================================================================
// [SPRINT M1] Selector de perfil persona/médico
// [AGENTE 03 — Geo Detection] (Sprint M3) Gate país != CL para perfil médico.
// Ejecutado post-onboarding para decidir qué tipo de cuenta crear.
// =================================================================

document.addEventListener('DOMContentLoaded', async () => {

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
    const doctorGateOverlay = document.getElementById('doctor-gate-overlay');
    const doctorGateMessage = document.getElementById('doctor-gate-message');
    const btnOpenWaitlist   = document.getElementById('btn-open-waitlist');

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

    // ── [AGENTE 03 — Geo Detection] (Sprint M3) Gate país + Waitlist ──
    /**
     * Captura email del usuario en waitlist Doctor para su país.
     */
    async function addToDoctorWaitlist(uid, email, country, displayName) {
        console.log('[ProfileSelector] Adding to waitlist:', { country, email });
        try {
            const { collection, addDoc, serverTimestamp } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
            await addDoc(collection(window.NuraFirebase.db, 'doctor_waitlist'), {
                uid,
                email,
                country: country.toUpperCase(),
                displayName: displayName || null,
                createdAt: serverTimestamp(),
                source: 'profile-selector'
            });
            console.log('[ProfileSelector] Waitlist entry created');
            return { success: true };
        } catch (err) {
            console.error('[ProfileSelector] Error adding to waitlist:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Bloquea la tarjeta médica visualmente y prepara handler de waitlist.
     */
    function activateDoctorGate(country, user) {
        if (!doctorGateOverlay || !optionDoctor) return;

        const countryName = window.NuraCountriesConfig?.getCountryName(country) || country;
        if (doctorGateMessage) {
            doctorGateMessage.textContent =
                `Nura Doctor aún no llegó a ${countryName}. Sumate a la waitlist y te avisamos cuando esté disponible.`;
        }

        // Visual: tarjeta deshabilitada + overlay visible
        optionDoctor.disabled = true;
        optionDoctor.classList.add('doctor-gated');
        doctorGateOverlay.classList.remove('hidden');

        // Modal listeners
        const modalOverlay = document.getElementById('waitlist-modal-overlay');
        const modalClose   = document.getElementById('waitlist-modal-close');
        const emailInput   = document.getElementById('waitlist-email');
        const btnConfirm   = document.getElementById('btn-waitlist-confirm');
        const waitlistErr  = document.getElementById('waitlist-error');
        const waitlistOk   = document.getElementById('waitlist-success');
        const countryNameEl = document.getElementById('waitlist-country-name');

        function openModal() {
            if (countryNameEl) countryNameEl.textContent = countryName;
            if (emailInput) emailInput.value = user.email || '';
            if (waitlistErr) { waitlistErr.style.display = 'none'; waitlistErr.textContent = ''; }
            if (waitlistOk)  { waitlistOk.style.display  = 'none'; }
            if (btnConfirm)  { btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar'; }
            modalOverlay?.classList.remove('hidden');
        }

        function closeModal() {
            modalOverlay?.classList.add('hidden');
        }

        btnOpenWaitlist?.addEventListener('click', openModal);
        modalClose?.addEventListener('click', closeModal);
        modalOverlay?.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        btnConfirm?.addEventListener('click', async () => {
            const email = emailInput?.value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (waitlistErr) {
                    waitlistErr.textContent = 'Ingresa un email válido.';
                    waitlistErr.style.display = 'block';
                }
                return;
            }
            btnConfirm.disabled = true;
            btnConfirm.textContent = 'Guardando...';
            if (waitlistErr) waitlistErr.style.display = 'none';

            const res = await addToDoctorWaitlist(user.uid, email, country, user.displayName);
            if (res.success) {
                if (waitlistOk) waitlistOk.style.display = 'block';
                btnConfirm.textContent = '¡Listo!';
                // Auto-cerrar después de 1.5s
                setTimeout(closeModal, 1500);
            } else {
                if (waitlistErr) {
                    waitlistErr.textContent = 'No pudimos guardar tu email. Intenta de nuevo.';
                    waitlistErr.style.display = 'block';
                }
                btnConfirm.disabled = false;
                btnConfirm.textContent = 'Confirmar';
            }
        });
    }

    // ── Lectura inicial: chequear país del usuario ────────────────
    /**
     * Lee el doc del usuario, obtiene country (auto-detect + write si falta),
     * y aplica el gate si country !== CL.
     */
    async function applyCountryGate() {
        try {
            const auth = window.NuraFirebase.auth;
            await auth.authStateReady();
            const user = auth.currentUser;
            if (!user) {
                console.warn('[ProfileSelector] Sin sesión — skip gate, redirigiendo a auth.');
                window.location.href = '../auth/index.html';
                return;
            }

            const { doc, getDoc, setDoc } =
                await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
            const db = window.NuraFirebase.db;
            const snap = await getDoc(doc(db, 'users', user.uid));
            const data = snap.exists() ? snap.data() : {};

            let country = data.country;

            // Si el doc no tiene country, intentar auto-detect (Estrategia C)
            if (!country && window.NuraGeoDetection) {
                console.log('[ProfileSelector] No country in doc, auto-detecting...');
                const geoResult = await window.NuraGeoDetection.detectCountryByIP();
                if (geoResult.success) {
                    country = geoResult.country;
                    // Fire-and-forget: persistir country sin bloquear
                    setDoc(
                        doc(db, 'users', user.uid),
                        { country, countryAutoDetectedAt: new Date().toISOString() },
                        { merge: true }
                    ).catch(err => console.warn('[ProfileSelector] Failed to save auto-detected country:', err));
                }
            }

            if (country && !window.NuraCountriesConfig?.isDoctorAllowed(country)) {
                console.log('[ProfileSelector] Country not allowed for Doctor:', country);
                activateDoctorGate(country, user);
            } else if (!country) {
                // Sin país y auto-detect falló — modo conservador: bloquear doctor
                console.warn('[ProfileSelector] No country available, blocking doctor option as fallback');
                activateDoctorGate('XX', user);
            } else {
                console.log('[ProfileSelector] Country allowed for Doctor:', country);
            }
        } catch (err) {
            console.error('[ProfileSelector] Error in applyCountryGate:', err);
            // No bloquear flujo si la lectura falla; fail-open (sin gate) es preferible
            // a fail-close (bloquear a usuarios chilenos legítimos por error de red).
        }
    }

    await applyCountryGate();
    // ── [FIN gate país] ───────────────────────────────────────────

    // ── Listeners ──────────────────────────────────────────────────
    optionPerson.addEventListener('click', () => handleProfileSelection('person'));
    optionDoctor.addEventListener('click', () => {
        // Defensa: si gate está activo, no proceder (botón debería estar disabled, pero por si acaso)
        if (optionDoctor.disabled) return;
        handleProfileSelection('doctor');
    });
});
