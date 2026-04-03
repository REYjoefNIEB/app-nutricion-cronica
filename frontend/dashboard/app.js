
// =================================================================
// [LÓGICO BACKEND] Motor de cálculo IMC (OMS 2004) — sin cambios
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
function _calcIMC(weight, height) {
    const heightM = height / 100;
    return weight / (heightM * heightM);
}

function _imcToMarkerPct(imc) {
    const c = Math.max(10, Math.min(40, imc));
    let pct;
    if (c < 18.5) {
        pct = 2  + ((c - 10)   / (18.5 - 10)) * (25 - 2);
    } else if (c < 25) {
        pct = 25 + ((c - 18.5) / (25 - 18.5)) * (50 - 25);
    } else if (c < 30) {
        pct = 50 + ((c - 25)   / (30 - 25))   * (75 - 50);
    } else {
        pct = 75 + ((c - 30)   / (40 - 30))   * (98 - 75);
    }
    return (Math.round(pct * 10) / 10) + '%';
}

function _imcStatus(imc) {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25)   return 'Peso normal';
    if (imc < 30)   return 'Sobrepeso';
    return 'Obesidad';
}

// =================================================================
// [ARQUITECTO VISUAL — sin modificaciones] Lógica de UI e i18n
// [LÓGICO BACKEND] Firestore read + stale-while-revalidate — 2026-04-02
// Aprobado por Auditor Médico — 2026-04-02
// =================================================================
const currentLang = 'es';
const t = translations[currentLang];

document.addEventListener('DOMContentLoaded', async () => {

    // ── [LÓGICO BACKEND] Guard de sesión ─────────────────────────
    // authStateReady() espera a que Firebase rehidrate el token antes
    // de evaluar currentUser. Crítico para cargas directas (URL, F5)
    // donde currentUser puede ser null transitoriamente.
    const auth = window.NuraFirebase.auth;
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) {
        console.warn('[Dashboard] Sin sesión activa. Redirigiendo a auth.');
        window.location.href = '../auth/index.html';
        return;
    }

    // ── [LÓGICO BACKEND] Render function ─────────────────────────
    // Extraída para ser llamada tanto desde caché como desde Firestore.
    // Devuelve true si el perfil tenía datos suficientes para renderizar.
    function _renderProfile(profile) {
        if (!profile || profile.weight == null || profile.height == null) return false;

        // Textos estáticos (original del Arquitecto, intacto)
        document.getElementById('title').textContent                = t.pageTitle;
        document.getElementById('subtitle').textContent             = t.pageSubtitle;
        document.getElementById('card-metabolic-title').textContent = t.cardMetabolicTitle;
        document.getElementById('label-weight').textContent         = t.weightLabel;
        document.getElementById('label-height').textContent         = t.heightLabel;
        document.getElementById('bmi-title').textContent            = t.bmiTitle;
        document.getElementById('txt-profile').textContent          = t.actionProfile;
        document.getElementById('txt-meds').textContent             = t.actionMeds;
        document.getElementById('txt-scan').textContent             = t.actionScan;

        // Datos reales del perfil — textContent, nunca innerHTML
        const imc      = _calcIMC(profile.weight, profile.height);
        const imcRound = Math.round(imc * 10) / 10;

        document.getElementById('val-weight').textContent = profile.weight + ' kg';
        document.getElementById('val-height').textContent = profile.height + ' cm';
        document.getElementById('bmi-value').textContent  = imcRound;
        document.getElementById('bmi-status').textContent = _imcStatus(imc);

        // Marcador del slider — solo style.left, transición CSS se activa sola
        document.querySelector('.bmi-marker').style.left = _imcToMarkerPct(imc);

        console.log('[Dashboard] Renderizado.', {
            source: profile._source || 'cache',
            imc:    imcRound,
            status: _imcStatus(imc)
        });
        return true;
    }

    // ── Paso 1: Render instantáneo desde caché local (offline-first) ─
    const cachedProfile     = await MedicalStorage.loadProfile();
    const renderedFromCache = _renderProfile(cachedProfile);

    // ── Paso 2: Firestore — fuente de verdad canónica ────────────
    try {
        const { doc, getDoc } =
            await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        const snap = await getDoc(doc(window.NuraFirebase.db, 'users', user.uid));

        if (snap.exists()) {
            const firestoreData = { ...snap.data(), _source: 'firestore' };

            // ── [LÓGICO BACKEND] Guardia de Ruta — consentimiento legal ──
            // Bloqueante: si legal_consent está ausente o la versión no
            // coincide con LEGAL_VERSION, el usuario debe re-aceptar los
            // términos vigentes antes de acceder al dashboard.
            // El caché ya renderizado se deja visible para no generar un
            // flash de contenido vacío, pero la redirección es inmediata.
            const lc = firestoreData.legal_consent;
            if (!lc || lc.legal_version !== LEGAL_VERSION) {
                console.warn(
                    '[Dashboard] legal_consent ausente o desactualizado',
                    { found: lc?.legal_version, required: LEGAL_VERSION }
                );
                window.location.href = '../onboarding/index.html';
                return;
            }
            // ── [FIN Guardia de Ruta] ─────────────────────────────────

            // Sincronizar caché con datos frescos de Firestore
            await MedicalStorage.updateCache(firestoreData);

            // Re-render silencioso — garantiza consistencia multi-dispositivo
            _renderProfile(firestoreData);

        } else if (!renderedFromCache) {
            // Sin datos en Firestore ni en caché → el perfil no existe aún
            console.warn('[Dashboard] Sin datos en Firestore ni caché. Redirigiendo.');
            window.location.href = '../onboarding/index.html';
        }

    } catch (err) {
        console.warn('[Dashboard] Firestore read failed:', err.code, err.message);
        if (!renderedFromCache) {
            // Sin caché de respaldo → no hay datos que mostrar
            window.location.href = '../onboarding/index.html';
        }
        // Con caché: ya renderizado, fallo de red es silencioso (modo offline)
    }
    // ── [FIN LÓGICO BACKEND] ──────────────────────────────────────
});
