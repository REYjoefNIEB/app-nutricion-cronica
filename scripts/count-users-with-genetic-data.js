'use strict';
/**
 * scripts/count-users-with-genetic-data.js
 *
 * Diagnóstico read-only: lista usuarios con datos genéticos cifrados en
 * /users/{uid}/genetic_data/profile, que son candidatos a re-procesar
 * tras el fix BRCA del commit 710a494.
 *
 * Uso:
 *   node scripts/count-users-with-genetic-data.js
 *
 * NO modifica datos.
 */

const admin = require('firebase-admin');
const path  = require('path');

const sa = require('./nura-33fc1-service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'nura-33fc1' });
}
const db = admin.firestore();

const KNOWN_UIDS = {
    'MfXjpPSRF4Sr8kSX0Js6vFGKgZv1': 'GEroe',
    'bvXEcrq5cgcUxpCwEH6vF2B04Ii1': 'Bastian',
    'JdE9gpJFx9ZJv8DyuHb7JPxuY2l2': 'test@admin.com',
    'Qd3cl9SezKZO1mXzhzZDRRhcZyF2': 'padre@padre.com',
    't5vJ1snmCqOdMJ8NT3i4svSByS02': 'manu@manu.com',
};

(async () => {
    console.log('=== Diagnóstico: usuarios con datos genéticos ===\n');

    const usersSnap = await db.collection('users').get();
    console.log(`Total usuarios en /users: ${usersSnap.size}`);

    const withGenetic = [];

    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();

        const geneticDoc = await db
            .collection('users').doc(uid)
            .collection('genetic_data').doc('profile')
            .get();

        if (geneticDoc.exists) {
            const gData = geneticDoc.data();
            const updatedAt = gData?.updatedAt?.toDate?.() || 'sin timestamp';
            const encrypted = gData?.encrypted ?? false;
            const lastReport = userData?.lastGeneticReport || null;
            withGenetic.push({ uid, updatedAt, encrypted, lastReport, known: KNOWN_UIDS[uid] || null });
        }
    }

    console.log(`\nUsuarios con genetic_data/profile: ${withGenetic.length}\n`);
    console.log('--- Detalle ---');
    for (const e of withGenetic) {
        const label = e.known ? `[${e.known}]` : '[UNKNOWN]';
        console.log(`  ${label} ${e.uid}`);
        console.log(`    updatedAt:   ${e.updatedAt}`);
        console.log(`    encrypted:   ${e.encrypted}`);
        console.log(`    lastReport:  ${e.lastReport || '(ninguno)'}`);
    }

    process.exit(0);
})().catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});
