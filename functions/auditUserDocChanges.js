const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Inicializar admin si no está ya
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Audit log para cambios sensibles en /users/{uid}.
 *
 * Post-Sprint Cleanup Cuentas Separadas, las Firestore rules bloquean:
 * 1. Cambios en profileType (self-promote)
 * 2. Creación de doctorProfile en cuentas non-doctor
 * 3. Cambios en doctorProfile desde cliente
 *
 * Si esta función se dispara con cambios en estos campos, indica:
 * - Cambio legítimo desde Cloud Function con Admin SDK (esperado para Sprint M21)
 * - Bypass exitoso de las rules (CRITICAL - investigar)
 * - Migración manual desde Firebase Console (admin)
 *
 * Ley 19.628 + 21.719 chilenas exigen trazabilidad de cambios
 * en datos de identidad profesional.
 */
exports.auditUserDocChanges = onDocumentUpdated(
    {
        document: 'users/{userId}',
        region: 'us-central1'
    },
    async (event) => {
        const before = event.data.before.data() || {};
        const after = event.data.after.data() || {};

        const changes = [];

        // 1. profileType cambió
        if (before.profileType !== after.profileType) {
            changes.push({
                field: 'profileType',
                before: before.profileType || null,
                after: after.profileType || null,
                severity: before.profileType ? 'CRITICAL' : 'INFO' // INFO si primera asignación
            });
        }

        // 2. doctorProfile agregado o modificado
        const beforeDoctor = before.doctorProfile;
        const afterDoctor = after.doctorProfile;
        const doctorProfileChanged = JSON.stringify(beforeDoctor || null) !== JSON.stringify(afterDoctor || null);

        if (doctorProfileChanged) {
            // Distinguir entre creación inicial vs modificación
            const isCreation = !beforeDoctor && !!afterDoctor;
            const isDeletion = !!beforeDoctor && !afterDoctor;

            changes.push({
                field: 'doctorProfile',
                action: isCreation ? 'CREATED' : (isDeletion ? 'DELETED' : 'MODIFIED'),
                before: beforeDoctor || null,
                after: afterDoctor || null,
                severity: isCreation ? 'INFO' : 'CRITICAL' // primera creación es esperada, modificación post-asignación NO
            });
        }

        // Si no hay cambios sensibles, no loguear
        if (changes.length === 0) {
            return null;
        }

        const auditLog = {
            userId: event.params.userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            action: 'sensitive_field_change',
            changes: changes,
            highestSeverity: changes.some(c => c.severity === 'CRITICAL') ? 'CRITICAL' : 'INFO',
            note: 'Sprint Cleanup Cuentas Separadas: Firestore rules bloquean cambios desde cliente. CRITICAL severity sugiere Admin SDK (legitimo) o bypass (investigar).'
        };

        try {
            await admin.firestore()
                .collection('audit_logs')
                .add(auditLog);

            if (auditLog.highestSeverity === 'CRITICAL') {
                console.error('[AUDIT-CRITICAL]', JSON.stringify(auditLog, null, 2));
            } else {
                console.log('[AUDIT-INFO]', JSON.stringify(auditLog));
            }
        } catch (err) {
            console.error('[AUDIT-FAILED]', err.message, JSON.stringify(auditLog));
        }

        return null;
    }
);
