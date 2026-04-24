/**
 * scripts/count-users-with-traits.js
 *
 * Diagnóstico read-only: cuenta cuántos usuarios tienen el documento
 * /users/{uid}/physical_traits/result en Firestore.
 *
 * Uso:
 *   node scripts/count-users-with-traits.js
 *
 * Requiere scripts/nura-33fc1-service-account.json (gitignored).
 *
 * NO modifica datos. Solo lee.
 */

const admin = require('firebase-admin');

const sa = require('./nura-33fc1-service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'nura-33fc1' });
}

const db = admin.firestore();

const KNOWN_UIDS = {
  'MfXjpPSRF4Sr8kSX0Js6vFGKgZv1': 'GEroe',
  'bvXEcrq5cgcUxpCwEH6vF2B04Ii1': 'Bastian',
};

(async () => {
  console.log('=== Diagnóstico: usuarios con physical_traits/result ===\n');

  const usersSnap = await db.collection('users').get();
  console.log(`Total de documentos en /users: ${usersSnap.size}`);

  const withTraits = [];
  const withoutTraits = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const traitsDoc = await db
      .collection('users').doc(uid)
      .collection('physical_traits').doc('result')
      .get();

    if (traitsDoc.exists) {
      const data = traitsDoc.data();
      const updatedAt = data?.analyzedAt?.toDate?.() || data?.updatedAt?.toDate?.() || data?.updatedAt || 'sin timestamp';
      withTraits.push({ uid, updatedAt, known: KNOWN_UIDS[uid] || null });
    } else {
      withoutTraits.push(uid);
    }
  }

  console.log(`\nCon physical_traits/result: ${withTraits.length}`);
  console.log(`Sin physical_traits/result:  ${withoutTraits.length}\n`);

  if (withTraits.length > 0) {
    console.log('--- Detalle de usuarios con traits ---');
    for (const entry of withTraits) {
      const label = entry.known ? `[${entry.known}]` : '[UNKNOWN]';
      console.log(`  ${label} ${entry.uid} — updatedAt: ${entry.updatedAt}`);
    }
  }

  const unknownWithTraits = withTraits.filter(e => !e.known);
  console.log('\n=== CONCLUSIÓN ===');
  if (unknownWithTraits.length === 0) {
    console.log('✅ Solo usuarios conocidos (GEroe + Bastian) tienen traits.');
    console.log('   → Próximo sprint NO requiere migración masiva.');
    console.log('   → Arrancar con Bloque 6 bugs UX.');
  } else {
    console.log(`⚠️  Hay ${unknownWithTraits.length} usuario(s) DESCONOCIDO(S) con traits guardados.`);
    console.log('   → Próximo sprint DEBE incluir migración masiva antes que otras tareas.');
    console.log('   → Esos usuarios tienen predicciones hair pre-fix rs12203592 (commit 4e6b9b1).');
    console.log('\n   UIDs desconocidos con traits:');
    for (const entry of unknownWithTraits) {
      console.log(`     - ${entry.uid}`);
    }
  }

  process.exit(0);
})().catch(err => {
  console.error('ERROR ejecutando diagnóstico:', err);
  process.exit(1);
});
