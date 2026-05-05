#!/usr/bin/env node
/**
 * Test Firestore Rules - Sprint Cleanup Cuentas Separadas
 *
 * Valida que las nuevas rules de firestore.rules cumplan con:
 * 1. profileType inmutable post-asignación
 * 2. doctorProfile solo en cuentas doctor
 * 3. doctorProfile inmutable post-asignación desde cliente
 *
 * USO:
 * 1. Arrancar emulator: firebase emulators:start --only firestore
 * 2. En otra terminal: node scripts/test-firestore-rules-cleanup.js
 *
 * El emulator debe estar corriendo en localhost:8080.
 * El script carga firestore.rules automáticamente.
 */

const {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
    RulesTestEnvironment
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'nura-rules-test';
let testEnv;

// Helper: crea contexto auth de un user
function authedUser(uid) {
    return testEnv.authenticatedContext(uid).firestore();
}

// Helper: setea estado inicial sin pasar por rules
async function setupInitialState(uid, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc(`users/${uid}`).set(data);
    });
}

// Casos de test
const TEST_CASES = [];

function defineTest(name, severity, fn) {
    TEST_CASES.push({ name, severity, fn });
}

// ═══════════════════════════════════════════════════════
// CASOS POSITIVOS (deben PASAR)
// ═══════════════════════════════════════════════════════

defineTest('1. Doctor onboarding (primera asignación profileType + doctorProfile)', 'critical', async () => {
    const uid = 'doctor-onboarding-001';
    await setupInitialState(uid, {
        email: 'doc@test.cl',
        legal_consent: true,
        country: 'CL'
    });

    const db = authedUser(uid);
    await assertSucceeds(
        db.doc(`users/${uid}`).set({
            profileType: 'doctor',
            doctorProfile: {
                tier: 'founder',
                subscriptionStatus: 'trial'
            }
        }, { merge: true })
    );
});

defineTest('2. Person onboarding (primera asignación profileType solo)', 'critical', async () => {
    const uid = 'person-onboarding-001';
    await setupInitialState(uid, {
        email: 'person@test.cl',
        legal_consent: true,
        country: 'CL'
    });

    const db = authedUser(uid);
    await assertSucceeds(
        db.doc(`users/${uid}`).set({
            profileType: 'person'
        }, { merge: true })
    );
});

defineTest('3. Doctor actualiza updatedAt (sin tocar profileType ni doctorProfile)', 'critical', async () => {
    const uid = 'doctor-update-001';
    await setupInitialState(uid, {
        email: 'doc2@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'doctor',
        doctorProfile: { tier: 'founder', subscriptionStatus: 'trial' }
    });

    const db = authedUser(uid);
    await assertSucceeds(
        db.doc(`users/${uid}`).set({
            updatedAt: new Date().toISOString()
        }, { merge: true })
    );
});

defineTest('4. Person actualiza height/weight (sin tocar profileType)', 'critical', async () => {
    const uid = 'person-update-001';
    await setupInitialState(uid, {
        email: 'p2@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'person',
        height: 170
    });

    const db = authedUser(uid);
    await assertSucceeds(
        db.doc(`users/${uid}`).set({
            height: 175,
            weight: 70
        }, { merge: true })
    );
});

defineTest('5. Legacy user (sin profileType) actualiza updatedAt', 'critical', async () => {
    const uid = 'legacy-user-001';
    await setupInitialState(uid, {
        email: 'legacy@test.cl',
        legal_consent: true,
        country: 'CL'
        // NO profileType
    });

    const db = authedUser(uid);
    await assertSucceeds(
        db.doc(`users/${uid}`).set({
            updatedAt: new Date().toISOString()
        }, { merge: true })
    );
});

// ═══════════════════════════════════════════════════════
// CASOS DE ATTACK (deben FALLAR)
// ═══════════════════════════════════════════════════════

defineTest('6. ATTACK: Person → Doctor self-promote', 'security', async () => {
    const uid = 'attacker-promote-001';
    await setupInitialState(uid, {
        email: 'attacker@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'person'
    });

    const db = authedUser(uid);
    await assertFails(
        db.doc(`users/${uid}`).set({
            profileType: 'doctor'
        }, { merge: true })
    );
});

defineTest('7. ATTACK: Doctor → Person downgrade', 'security', async () => {
    const uid = 'attacker-demote-001';
    await setupInitialState(uid, {
        email: 'attacker2@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'doctor',
        doctorProfile: { tier: 'founder' }
    });

    const db = authedUser(uid);
    await assertFails(
        db.doc(`users/${uid}`).set({
            profileType: 'person'
        }, { merge: true })
    );
});

defineTest('8. ATTACK: Person crea doctorProfile sin profileType=doctor', 'security', async () => {
    const uid = 'attacker-fantom-001';
    await setupInitialState(uid, {
        email: 'attacker3@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'person'
    });

    const db = authedUser(uid);
    await assertFails(
        db.doc(`users/${uid}`).set({
            doctorProfile: {
                tier: 'founder',
                subscriptionStatus: 'paid' // ← intento de bypass de pagos
            }
        }, { merge: true })
    );
});

defineTest('9. ATTACK: Doctor modifica su doctorProfile (bypass pagos futuro)', 'security', async () => {
    const uid = 'attacker-upgrade-001';
    await setupInitialState(uid, {
        email: 'attacker4@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'doctor',
        doctorProfile: {
            tier: 'founder',
            subscriptionStatus: 'trial' // está en trial
        }
    });

    const db = authedUser(uid);
    await assertFails(
        db.doc(`users/${uid}`).set({
            doctorProfile: {
                tier: 'founder',
                subscriptionStatus: 'paid' // ← intento de bypass: trial → paid sin pagar
            }
        }, { merge: true })
    );
});

defineTest('10. ATTACK: User intenta modificar legal_consent', 'security', async () => {
    const uid = 'attacker-consent-001';
    await setupInitialState(uid, {
        email: 'attacker5@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'person'
    });

    const db = authedUser(uid);
    await assertFails(
        db.doc(`users/${uid}`).set({
            legal_consent: false
        }, { merge: true })
    );
});

defineTest('11. ATTACK: User intenta leer otro usuario', 'security', async () => {
    const uid = 'attacker-read-001';
    const otherUid = 'victim-001';

    await setupInitialState(otherUid, {
        email: 'victim@test.cl',
        legal_consent: true,
        country: 'CL',
        profileType: 'person'
    });

    const db = authedUser(uid);
    await assertFails(
        db.doc(`users/${otherUid}`).get()
    );
});

// ═══════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Test Firestore Rules - Sprint Cleanup Cuentas Separadas  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    // Cargar rules desde firestore.rules
    const rulesPath = path.join(__dirname, '..', 'firestore.rules');
    if (!fs.existsSync(rulesPath)) {
        console.error('❌ firestore.rules no encontrado en', rulesPath);
        process.exit(1);
    }

    const rules = fs.readFileSync(rulesPath, 'utf8');

    try {
        testEnv = await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                rules: rules,
                host: '127.0.0.1',
                port: 8080
            }
        });
    } catch (err) {
        console.error('❌ No se pudo conectar al emulator. ¿Está corriendo?');
        console.error('   Ejecutar: firebase emulators:start --only firestore');
        console.error();
        console.error('Error:', err.message);
        process.exit(1);
    }

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const testCase of TEST_CASES) {
        process.stdout.write(`  [${testCase.severity.toUpperCase()}] ${testCase.name}... `);

        await testEnv.clearFirestore(); // limpiar entre tests

        try {
            await testCase.fn();
            console.log('✅ PASS');
            passed++;
        } catch (err) {
            console.log('❌ FAIL');
            console.log(`     Error: ${err.message}`);
            failures.push({ name: testCase.name, error: err.message });
            failed++;
        }
    }

    console.log();
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  RESULTADOS: ${passed}/${TEST_CASES.length} passed`);
    console.log('═══════════════════════════════════════════════════════');

    if (failed > 0) {
        console.log();
        console.log('FAILURES:');
        failures.forEach(f => {
            console.log(`  ❌ ${f.name}`);
            console.log(`     ${f.error}`);
        });
        console.log();
        console.log('⚠️  Tests fallidos detectados. NO COMMIT.');
        await testEnv.cleanup();
        process.exit(1);
    }

    console.log();
    console.log('✅ Todos los tests passed. Rules listas para commit.');

    await testEnv.cleanup();
    process.exit(0);
}

main().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
