/**
 * Cifrado AES-256-GCM a nivel de aplicación.
 * Adicional al cifrado Firebase en reposo.
 * Asegura que un acceso directo a Firestore no expone datos genéticos en claro.
 *
 * SETUP (una sola vez):
 *   openssl rand -base64 32
 *   firebase functions:secrets:set GENETIC_MASTER_KEY  ← pegar el valor generado
 *
 * Las Cloud Functions que llaman a estas funciones deben declarar el secreto:
 *   exports.myFn = onCall({ secrets: ['GENETIC_MASTER_KEY'] }, async (request) => {
 *     const key = process.env.GENETIC_MASTER_KEY;
 *     const encrypted = encryptGeneticData(data, userId, key);
 *   });
 */

const crypto = require('crypto');

const ALGORITHM      = 'aes-256-gcm';
const IV_LENGTH      = 16;
const SCHEMA_VERSION = 1;

/**
 * Deriva una clave específica por usuario usando PBKDF2.
 * Cada usuario tiene una clave diferente, derivada del master key + uid.
 */
function _deriveUserKey(userId, masterKeyBase64) {
    const masterKeyBuf = Buffer.from(masterKeyBase64, 'base64');
    return crypto.pbkdf2Sync(
        masterKeyBuf,
        userId,   // salt único por usuario
        100000,   // iteraciones
        32,       // 256 bits
        'sha256'
    );
}

/**
 * Cifra un objeto genético.
 * @param {object} data          — datos a cifrar (se serializan a JSON)
 * @param {string} userId        — uid del usuario (para derivación de clave)
 * @param {string} masterKeyB64  — valor del secreto GENETIC_MASTER_KEY (base64)
 * @returns {{ ciphertext, iv, authTag, algorithm, version }}
 */
function encryptGeneticData(data, userId, masterKeyB64) {
    if (!masterKeyB64) throw new Error('GENETIC_MASTER_KEY no configurado');

    const userKey  = _deriveUserKey(userId, masterKeyB64);
    const iv       = crypto.randomBytes(IV_LENGTH);
    const cipher   = crypto.createCipheriv(ALGORITHM, userKey, iv);
    const payload  = JSON.stringify(data);

    const encrypted = Buffer.concat([
        cipher.update(payload, 'utf8'),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString('base64'),
        iv:         iv.toString('base64'),
        authTag:    authTag.toString('base64'),
        algorithm:  ALGORITHM,
        version:    SCHEMA_VERSION
    };
}

/**
 * Descifra un objeto genético previamente cifrado con encryptGeneticData.
 * @param {{ ciphertext, iv, authTag }} encrypted
 * @param {string} userId
 * @param {string} masterKeyB64
 * @returns {object}
 */
function decryptGeneticData(encrypted, userId, masterKeyB64) {
    if (!masterKeyB64) throw new Error('GENETIC_MASTER_KEY no configurado');

    const userKey    = _deriveUserKey(userId, masterKeyB64);
    const iv         = Buffer.from(encrypted.iv,         'base64');
    const authTag    = Buffer.from(encrypted.authTag,    'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Genera hash SHA-256 de un valor para búsquedas sin revelar contenido.
 */
function hashForSearch(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = { encryptGeneticData, decryptGeneticData, hashForSearch };
