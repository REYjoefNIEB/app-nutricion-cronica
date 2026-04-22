# NURA 4.3 — Gamificación: Sistema de Badges y Logros

**Versión objetivo:** v4.3  
**Prioridad:** Media — retención de usuario y engagement sin comprometer tono médico  
**Dependencia previa:** v3.x (todas las funciones de análisis activas)

---

## Filosofía de diseño

NURA es una app médica. Los badges **no deben trivializar** condiciones de salud ni crear competencia entre usuarios.  
El sistema recompensa **acciones preventivas y de conocimiento propio** — no resultados genéticos (un usuario no es "mejor" por tener ciertos genes).

**Principio guía:** Los logros reconocen el recorrido de autoconocimiento, no el destino genético.

---

## Catálogo de badges (v4.3 — 24 badges)

### Categoría: Inicio (4 badges)

| Badge | Nombre | Condición |
|-------|--------|-----------|
| 🧬 | **Explorador Genético** | Subir primer archivo ADN |
| 📋 | **Historia Completa** | Completar onboarding 100% |
| 🌍 | **Raíces Descubiertas** | Ver resultados de ancestría por primera vez |
| 🔒 | **Datos Seguros** | Leer y aceptar política de privacidad completa |

### Categoría: Análisis (6 badges)

| Badge | Nombre | Condición |
|-------|--------|-----------|
| 🧫 | **42 Rasgos** | Ver los 42 rasgos físicos y de personalidad |
| 💪 | **Perfil Deportivo** | Completar análisis de fitness genético |
| 🌿 | **Entorno Analizado** | Configurar ciudad y ver impacto ambiental |
| 🗺️ | **Mapa Ancestral** | Ver mapa de calor de ascendencia |
| ⚕️ | **Consciente Médico** | Leer todos los disclaimers de condiciones médicas |
| 🔁 | **Segunda Opinión** | Subir un segundo archivo ADN (actualización) |

### Categoría: Profundidad (6 badges)

| Badge | Nombre | Condición |
|-------|--------|-----------|
| 📖 | **Lector Genómico** | Abrir el detalle de 20+ rasgos individuales |
| 🌡️ | **Alerta Activa** | Ver alertas de hoy en Geno+Ambiente 3 días seguidos |
| 🥗 | **Plan Nutricional** | Leer plan de nutrición genética completo |
| 🏃 | **Plan de Entrenamiento** | Leer recomendaciones de entrenamiento |
| 🧪 | **Marcadores Revisados** | Ver la lista de SNPs usados en el análisis |
| 📅 | **Constancia** | Abrir la app 7 días consecutivos |

### Categoría: Comunidad (4 badges — requiere Family Link v4.2)

| Badge | Nombre | Condición |
|-------|--------|-----------|
| 👨‍👩‍👧 | **Familia Conectada** | Comparar ADN con un familiar |
| 🤝 | **Puente Familiar** | Ser quien envía la primera invitación familiar |
| 🌱 | **Árbol en Crecimiento** | Tener 3+ familiares conectados |
| 🔬 | **Investigador Familiar** | Ver resultados IBD con 2+ familiares |

### Categoría: Excelencia (4 badges — raros, motivacionales)

| Badge | Nombre | Condición |
|-------|--------|-----------|
| 🏆 | **NURA Completo** | Haber obtenido 15+ badges |
| 💎 | **Pionero** | Ser usuario de los primeros 1000 registrados |
| 🌟 | **Referente de Salud** | Abrir la app durante 30 días en el mismo mes |
| 🧠 | **Maestro Genómico** | Completar todos los análisis y ver todos los módulos |

---

## Diseño técnico

### Modelo de datos Firestore

```
/users/{uid}/badges/{badgeId}
  - earned: true
  - earnedAt: timestamp
  - seenByUser: boolean  ← para mostrar notificación solo una vez
```

### Cloud Function: `checkBadges`

```javascript
// Llamada after: processGeneticData, analyzeAncestry, analyzePhysicalTraits, etc.
// También callable desde frontend cuando el usuario completa una acción de UI

exports.checkBadges = onCall(
    { region: 'us-central1', memory: '128MiB', timeoutSeconds: 30 },
    async (request) => {
        const { action } = request.data;
        const uid = request.auth.uid;

        const toGrant = await evaluateBadges(uid, action);
        if (toGrant.length === 0) return { newBadges: [] };

        const batch = admin.firestore().batch();
        for (const badgeId of toGrant) {
            const ref = admin.firestore()
                .collection('users').doc(uid)
                .collection('badges').doc(badgeId);
            batch.set(ref, { earned: true, earnedAt: admin.firestore.FieldValue.serverTimestamp(), seenByUser: false });
        }
        await batch.commit();

        return { newBadges: toGrant };
    }
);
```

### Trigger actions mapeadas a badges

```javascript
const BADGE_TRIGGERS = {
    'dna_uploaded':      ['explorador_genetico'],
    'ancestry_viewed':   ['raices_descubiertas'],
    'traits_all_viewed': ['42_rasgos'],
    'fitness_viewed':    ['perfil_deportivo'],
    'environment_set':   ['entorno_analizado'],
    'map_viewed':        ['mapa_ancestral'],
    // etc.
};
```

### Frontend — Badge Center

Nueva sección en Dashboard o página dedicada `frontend/badges/index.html`:

```
┌──────────────────────────────────────┐
│  🏆  Tus Logros                       │
│  12 / 24 badges obtenidos             │
│                                       │
│  [🧬 Explorador]  [📋 Historia]  ...  │
│  [🌍 Raíces ✓]   [🔒 Privacidad ✓]  │
│                                       │
│  Próximo logro:                       │
│  📖 Lector Genómico — 14/20 rasgos   │
│  ████████████░░░░░  70%               │
└──────────────────────────────────────┘
```

### Notificación toast al ganar un badge

```javascript
// En cualquier página, al recibir respuesta de Cloud Function
function showBadgeToast(badge) {
    const el = document.createElement('div');
    el.className = 'badge-toast';
    el.innerHTML = `<span>${badge.icon}</span> ¡Logro desbloqueado! <strong>${badge.name}</strong>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}
```

---

## Reglas anti-abuso

- Un badge solo se otorga **una vez por usuario**
- No hay leaderboards públicos — los badges son privados por defecto
- No se muestran badges de otros usuarios (privacidad médica)
- Los badges de "Familia" requieren consentimiento activo (no automáticos)

---

## Localización

Todos los nombres y descripciones de badges deben estar en `i18n.js`:

```javascript
// ES
badges: {
    explorador_genetico: { name: 'Explorador Genético', desc: 'Subiste tu primer archivo ADN.' },
    // ...
}

// EN
badges: {
    explorador_genetico: { name: 'Genetic Explorer', desc: 'You uploaded your first DNA file.' },
    // ...
}
```

---

## Estimación de esfuerzo

- Sistema de evaluación de badges + Cloud Function: **1.5 días**
- Firestore schema + reglas de seguridad: **0.5 días**
- Frontend Badge Center: **1.5 días**
- Toast notifications + i18n: **0.5 días**
- **Total: ~4 días**

---

## Métricas de éxito

| Métrica | Objetivo |
|---------|----------|
| % usuarios con 5+ badges a los 30 días | > 40% |
| Aumento en sesiones/semana por usuario | +20% vs baseline |
| Tasa de completitud del análisis genético | > 70% (todos los módulos) |
| NPS post-badges vs pre-badges | +5 puntos |
