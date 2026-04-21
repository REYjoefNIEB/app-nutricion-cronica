/**
 * Registro de auditoría para accesos a datos genéticos.
 * Requerido por GDPR Art. 30, HIPAA, Ley 20.120 Chile.
 *
 * Los logs son inmutables desde el cliente (reglas Firestore: write: false).
 * Solo las Cloud Functions (Admin SDK) pueden escribir.
 */

const admin = require('firebase-admin');

/**
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.action    — 'READ' | 'WRITE' | 'DELETE' | 'EXPORT' | 'CONSENT'
 * @param {string} params.resource  — 'genetic_profile' | 'ancestry' | 'traits' | 'fitness' | 'geno_env' | 'all_genetic_data'
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {string} params.result    — 'SUCCESS' | 'INITIATED' | 'DENIED' | 'ERROR'
 * @param {string} [params.details]
 */
async function logGeneticAccess({ userId, action, resource, ipAddress, userAgent, result, details }) {
    if (!userId) return;

    const entry = {
        userId,
        action,
        resource,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ipAddress:  ipAddress  || null,
        userAgent:  userAgent  || null,
        result,
        details:    details    || null
    };

    try {
        await admin.firestore()
            .collection('audit_logs')
            .doc(`${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
            .set(entry);

        if (result === 'DENIED') {
            await _sendSecurityAlert(entry);
        }
    } catch (err) {
        // El log no debe bloquear la operación principal
        console.error('[AuditLog] Error escribiendo log:', err.message);
    }
}

async function _sendSecurityAlert(entry) {
    try {
        await admin.firestore()
            .collection('users').doc(entry.userId)
            .collection('security_alerts')
            .add({
                ...entry,
                status:     'UNREAD',
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });
    } catch (err) {
        console.error('[AuditLog] Error enviando alerta de seguridad:', err.message);
    }
}

module.exports = { logGeneticAccess };
