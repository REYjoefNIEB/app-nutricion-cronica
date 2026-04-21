# POLÍTICA DE PRIVACIDAD — NURA HEALTHTECH

**Última actualización:** 21 de abril de 2026
**Versión:** 1.0

---

## 1. INTRODUCCIÓN

Nura HealthTech ("Nura", "nosotros") se compromete a proteger su privacidad. Esta Política describe cómo recopilamos, usamos, almacenamos y protegemos su información personal y genética, de conformidad con:

- **Ley 21.719 (Chile)** — Protección de Datos Personales
- **Ley 19.628 (Chile)** — Protección de la Vida Privada
- **Ley 20.120 (Chile)** — Investigación Científica Biomédica
- **GDPR (UE)** — Reglamento General de Protección de Datos
- **HIPAA (EE.UU.)** — Portabilidad y Responsabilidad de Seguros de Salud
- **UNESCO 2003** — Declaración Internacional sobre Datos Genéticos Humanos

---

## 2. DATOS QUE RECOPILAMOS

### 2.1 Datos de cuenta
- Correo electrónico (autenticación)
- Nombre (opcional, para personalización)
- Fecha de nacimiento (para validar edad mínima de 18 años)
- País/región (para contexto ambiental)

### 2.2 Datos de salud (declarados voluntariamente)
- Enfermedades crónicas declaradas
- Medicamentos actuales
- Peso, talla (opcionales)
- Resultados de exámenes clínicos (opcionales, cargados por el usuario)

### 2.3 Datos genéticos (categoría especial, máxima protección)
- Archivo de ADN en formato 23andMe, AncestryDNA o MyHeritage
- Genotipos analizados (~26 SNPs clínicos + marcadores de ancestría y rasgos)
- Resultados del análisis (predisposiciones, ancestría, rasgos, fitness)

### 2.4 Datos de uso y técnicos
- Logs de acceso a la aplicación (sin datos genéticos)
- Tipo de dispositivo y sistema operativo
- Idioma preferido
- Timestamp de consentimiento (auditoría legal)

---

## 3. CÓMO USAMOS SUS DATOS

| Dato | Finalidad | Base legal |
|------|-----------|------------|
| Correo electrónico | Autenticación y notificaciones | Ejecución de contrato |
| Datos de salud | Personalización del análisis | Consentimiento expreso |
| Datos genéticos | Análisis genético informativo | Consentimiento expreso (Art. 9 GDPR) |
| Logs de acceso | Seguridad y auditoría | Interés legítimo (GDPR Art. 6.1.f) |
| Datos de uso | Mejora del servicio | Interés legítimo |

**NUNCA usamos sus datos para:**
- Publicidad dirigida
- Perfilado automático con efectos jurídicos
- Toma de decisiones automatizadas sobre su salud sin supervisión humana

---

## 4. CON QUIÉN COMPARTIMOS SUS DATOS

### 4.1 Terceros autorizados (infraestructura técnica únicamente)

| Proveedor | Propósito | País | Garantías |
|-----------|-----------|------|-----------|
| Google Firebase | Autenticación, base de datos, funciones | EE.UU. | SCCs GDPR · ISO 27001 |
| Google Cloud | Almacenamiento cifrado | EE.UU. | SCCs GDPR · SOC 2 |

Estos proveedores actúan como **encargados del tratamiento** (procesadores), NO como co-responsables. Solo procesan datos según nuestras instrucciones y están sujetos a acuerdos de procesamiento de datos.

### 4.2 Nunca compartimos con

- ❌ Aseguradoras de salud o de vida
- ❌ Empleadores o recruiters
- ❌ Gobiernos o agencias de inteligencia (salvo orden judicial)
- ❌ Farmacéuticas o laboratorios clínicos
- ❌ Plataformas de publicidad o marketing
- ❌ Otras startups, socios comerciales o inversores

---

## 5. CÓMO PROTEGEMOS SUS DATOS

### 5.1 Cifrado

- **En reposo:** Cifrado AES-256-GCM a nivel de aplicación (adicional al cifrado de Firebase)
- **En tránsito:** TLS 1.3 obligatorio
- **Claves:** Derivación de clave por usuario usando PBKDF2 (100.000 iteraciones, SHA-256)
- **Gestión de secretos:** Firebase Secret Manager (no en código fuente)

### 5.2 Control de acceso

- Solo el usuario autenticado puede leer sus datos (reglas Firestore)
- Las Cloud Functions que escriben datos genéticos no son accesibles directamente por el cliente
- Logs de auditoría inmutables para todos los accesos a datos genéticos

### 5.3 Pruebas de seguridad

- Revisión de reglas Firestore en cada deploy
- Política de divulgación responsable de vulnerabilidades activa

---

## 6. SUS DERECHOS

De acuerdo con la Ley 21.719 de Chile y el GDPR:

### 6.1 Derecho de acceso (Art. 15 GDPR · Art. 12 Ley 21.719)
Puede solicitar en cualquier momento una copia de todos sus datos personales.
**Cómo ejercerlo:** Sección "Mi Cuenta" → "Descargar mis datos"

### 6.2 Derecho de rectificación (Art. 16 GDPR · Art. 13 Ley 21.719)
Puede corregir datos inexactos.
**Cómo ejercerlo:** Editar perfil o contactar a soporte@nura.health

### 6.3 Derecho de eliminación / "Derecho al olvido" (Art. 17 GDPR · Art. 14 Ley 21.719)
Puede eliminar todos sus datos permanentemente.
**Cómo ejercerlo:** Sección "Datos Genéticos" → "Eliminar todos mis datos" (permanente e irreversible)
**Plazo:** Los backups se eliminan en máximo 30 días.

### 6.4 Derecho de portabilidad (Art. 20 GDPR · Art. 17 Ley 21.719)
Puede exportar sus datos en formato JSON estructurado.
**Cómo ejercerlo:** Sección "Mi Cuenta" → "Exportar mis datos"

### 6.5 Derecho de oposición (Art. 21 GDPR)
Puede retirar el consentimiento al análisis genético en cualquier momento sin que esto afecte la licitud del tratamiento anterior.

### 6.6 Respuesta a solicitudes
Respondemos en máximo **30 días hábiles** (plazo GDPR: 1 mes). Puede contactarnos en privacidad@nura.health

---

## 7. COOKIES Y TRACKING

### 7.1 Cookies técnicas (estrictamente necesarias)
- Sesión de autenticación Firebase
- Preferencias de idioma
- No requieren consentimiento

### 7.2 Cookies analíticas
Nura actualmente **no usa** cookies analíticas de terceros (Google Analytics, etc.). Si esto cambia, se actualizará esta política y se solicitará consentimiento.

### 7.3 Sin tracking cross-site
No usamos píxeles de seguimiento, fingerprinting ni tecnologías de rastreo entre sitios.

---

## 8. MENORES DE EDAD

Nura **no recopila intencionalmente datos de menores de 18 años**. El análisis genético requiere verificación de edad mínima de 18 años en el proceso de consentimiento.

Si descubrimos que hemos recopilado datos de un menor sin consentimiento parental verificado, los eliminaremos inmediatamente.

---

## 9. TRANSFERENCIAS INTERNACIONALES

Los datos se almacenan en servidores de Google Firebase/Cloud ubicados en:
- **EE.UU.** (región us-central1)

Para usuarios en la **Unión Europea**: Las transferencias están protegidas por Cláusulas Contractuales Estándar (SCCs) aprobadas por la Comisión Europea (Decisión 2021/914).

Para usuarios en **Chile**: De acuerdo con Art. 28 Ley 21.719, los datos solo se transfieren a países con nivel adecuado de protección o con garantías contractuales equivalentes.

---

## 10. RETENCIÓN DE DATOS

| Tipo de dato | Período de retención |
|-------------|---------------------|
| Datos de cuenta | Mientras la cuenta esté activa |
| Datos genéticos | Mientras la cuenta esté activa o hasta solicitud de eliminación |
| Logs de auditoría | 5 años (requerimiento legal) |
| Registros de consentimiento | 5 años (evidencia legal) |
| Backups | 30 días tras solicitud de eliminación |
| Cuentas inactivas | Eliminadas a los 24 meses con aviso previo de 30 días |

---

## 11. RESPONSABLE DEL TRATAMIENTO Y DPO

**Responsable del tratamiento:**
Nura HealthTech
Santiago, Chile
legal@nura.health

**Data Protection Officer (DPO):**
Para consultas específicas sobre protección de datos:
privacidad@nura.health

Tiempo de respuesta: máximo 30 días hábiles.

---

## 12. ACTUALIZACIONES DE ESTA POLÍTICA

Notificaremos cambios sustanciales con al menos **30 días de antelación** mediante:
- Notificación en la aplicación
- Correo electrónico a la dirección registrada

El uso continuado de Nura tras esos 30 días implica aceptación de la política actualizada.

---

## 13. RECLAMACIONES

Si considera que no hemos gestionado correctamente sus datos, puede presentar una reclamación ante:

- **Chile:** Agencia de Protección de Datos Personales (www.agenciadatos.cl)
- **Unión Europea:** Autoridad de control de su país miembro
- **EE.UU.:** Federal Trade Commission (ftc.gov)

Preferimos resolver cualquier inquietud directamente: privacidad@nura.health

---

*Nura HealthTech — Comprometidos con la privacidad genética*
*Marco legal: OMS · UNESCO · ACMG · GDPR · HIPAA · Leyes Chilenas 20.120, 20.584, 19.628, 21.719*
