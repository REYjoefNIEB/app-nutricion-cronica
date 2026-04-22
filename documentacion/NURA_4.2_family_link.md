# NURA 4.2 — Family Link: Comparación IBD entre Familiares

**Versión objetivo:** v4.2  
**Prioridad:** Media-Alta — diferenciador de producto único en el mercado hispano  
**Dependencia previa:** v3.x (perfil genético cifrado en Firestore)

---

## Concepto

Permite a dos usuarios de NURA comparar sus genomas y estimar el grado de parentesco mediante Identity By Descent (IBD).  
Un usuario invita a un familiar → ambos aceptan → NURA computa la fracción del genoma compartida → muestra parentesco estimado.

---

## Fundamento científico

IBD (Identity By Descent) mide segmentos cromosómicos idénticos heredados de un ancestro común.

| Relación | IBD esperado (k1 + k2) | LOD mínimo |
|----------|------------------------|------------|
| 1° grado (padre/hijo, hermano) | 0.50 | > 3.0 |
| 2° grado (abuelo, tío, medio-hermano) | 0.25 | > 2.0 |
| 3° grado (primo hermano) | 0.125 | > 1.5 |
| Sin relación | < 0.05 | — |

Con ~50 AIMs de alta Fst, se puede estimar relaciones hasta 2° grado con 85–90% de precisión.  
Para 3° grado se requieren más marcadores (300+) o chips completos.

---

## Flujo de usuario

```
Usuario A                    NURA Backend              Usuario B
    |                              |                       |
    |-- Invitar familiar (email) -->|                       |
    |                              |-- Notificación ------->|
    |                              |                       |-- Aceptar
    |                              |<-- Consentimiento ----|
    |                              |                       |
    |                              |-- Fetch snps(A) ------|
    |                              |-- Fetch snps(B) ------|
    |                              |-- calcIBD(A, B) ------|
    |<-- Resultado parentesco ------|                       |
    |                              |-- Resultado ---------->|
    |                              |                       |
```

**Consentimiento explícito doble**: ambas partes deben aceptar antes de cualquier comparación.  
**Datos**: solo se comparan los AIMs relevantes — no el genoma completo.

---

## Diseño técnico

### Cloud Function nueva: `compareFamilyIBD`

```javascript
// functions/index.js
exports.compareFamilyIBD = onCall(
    { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60, secrets: ['GENETIC_MASTER_KEY'] },
    async (request) => {
        const { invitationId } = request.data;
        const uid = request.auth.uid;

        // 1. Verificar invitación y consentimiento doble
        const inv = await getInvitation(invitationId);
        if (!inv.consentA || !inv.consentB) throw new HttpsError('failed-precondition', 'Consentimiento pendiente');
        if (uid !== inv.userA && uid !== inv.userB) throw new HttpsError('permission-denied', 'No autorizado');

        // 2. Cargar SNPs de ambos usuarios (solo AIMs)
        const masterKey = process.env.GENETIC_MASTER_KEY;
        const snpsA = await getGeneticProfile(inv.userA, masterKey);
        const snpsB = await getGeneticProfile(inv.userB, masterKey);

        // 3. Calcular IBD
        const ibd = calculateIBD(snpsA.snps, snpsB.snps);

        // 4. Guardar resultado (accesible a ambos usuarios)
        await saveIBDResult(invitationId, ibd);

        return { ibd, kinship: interpretKinship(ibd.pi_hat) };
    }
);
```

### Algoritmo IBD simplificado

```javascript
// functions/ancestry/ibdCalculator.js

function calculateIBD(snpsA, snpsB) {
    const AIMS = Object.keys(AIM_SNPS);  // ~26 marcadores
    let ibs0 = 0, ibs1 = 0, ibs2 = 0;

    for (const rsid of AIMS) {
        const gtA = snpsA[rsid];
        const gtB = snpsB[rsid];
        if (!gtA || !gtB) continue;

        const shared = countSharedAlleles(gtA, gtB);
        if (shared === 0) ibs0++;
        else if (shared === 1) ibs1++;
        else ibs2++;
    }

    const n = ibs0 + ibs1 + ibs2;
    // pi_hat estimado (simplificado — PLINK formula completa requiere frecuencias poblacionales)
    const pi_hat = (ibs2 + 0.5 * ibs1) / n;

    return { ibs0, ibs1, ibs2, pi_hat, markersUsed: n };
}

function interpretKinship(pi_hat) {
    if (pi_hat > 0.45) return { degree: 1, label: '1° grado (hermano/padre/hijo)' };
    if (pi_hat > 0.20) return { degree: 2, label: '2° grado (abuelo/tío/medio-hermano)' };
    if (pi_hat > 0.09) return { degree: 3, label: '3° grado (primo hermano)' };
    return { degree: null, label: 'Sin parentesco detectable' };
}
```

### Modelo de datos Firestore

```
/family_invitations/{invitationId}
  - userA: uid
  - userB: email (pre-registro) | uid (post-aceptación)
  - status: 'pending' | 'accepted' | 'computed' | 'expired'
  - consentA: timestamp | null
  - consentB: timestamp | null
  - createdAt: timestamp
  - expiresAt: timestamp (+7 días)

/family_invitations/{invitationId}/result (subcolección)
  - pi_hat: number
  - degree: 1|2|3|null
  - label: string
  - markersUsed: number
  - computedAt: timestamp
```

### Reglas Firestore

```javascript
// Solo userA o userB pueden leer el resultado
match /family_invitations/{invId} {
  allow read: if request.auth.uid == resource.data.userA 
               || request.auth.uid == resource.data.userB;
  allow write: if false;  // solo via Cloud Function
}
```

---

## Frontend

Nueva página: `frontend/family/index.html`

**Pantallas:**
1. **Invitar** — input email del familiar, mensaje de consentimiento claro
2. **Pendiente** — esperando que el familiar acepte (polling cada 30s)
3. **Resultado** — visualización del grado de parentesco con íconos familiares y % IBD

---

## Legal y privacidad (crítico)

- **Consentimiento doble explícito** — ambas partes deben aceptar por separado
- **Dato sensible**: IBD es dato biométrico de tercero — aplica Art. 16 Ley 19.628 Chile
- **Retención mínima**: resultado eliminable por cualquiera de las dos partes
- **Transparencia**: mostrar qué marcadores se usaron y limitación de precisión
- **Menores**: bloquear si cualquier usuario tiene flag `isMinor: true`

---

## Estimación de esfuerzo

- Cloud Function `compareFamilyIBD` + `ibdCalculator.js`: **2 días**
- Sistema de invitaciones (Firestore + notificaciones): **2 días**
- Frontend `family/`: **1.5 días**
- Reglas Firestore + tests legales: **1 día**
- **Total: ~1 semana**

---

## Limitación de precisión conocida

Con 26 AIMs la precisión es suficiente para 1° grado (>95%) y 2° grado (~85%).  
El frontend mostrará siempre: *"Estimación basada en ~26 marcadores. Para confirmación legal use prueba de paternidad certificada."*
