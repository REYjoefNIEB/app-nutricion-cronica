Coloca aquí el archivo: brief-v3.1.html

El archivo HTML debe contener los siguientes placeholders,
que la Cloud Function generateBrief reemplazará con datos reales:

  {{PATIENT_NAME}}        → Nombre del paciente (displayName)
  {{PATIENT_AGE}}         → Edad calculada desde birthdate
  {{PATIENT_WEIGHT}}      → Peso (ej. "72 kg")
  {{PATIENT_HEIGHT}}      → Altura (ej. "170 cm")
  {{PATIENT_BMI}}         → IMC calculado (ej. "24.9")
  {{PATHOLOGIES}}         → Enfermedades del perfil, separadas por coma
  {{EXAM_DATE}}           → Fecha del examen más reciente
  {{SCORE_VALUE}}         → Score metabólico (0–100)
  {{BIOMARKERS_TABLE}}    → Filas <tr> de la tabla de biomarcadores
  {{COMPARISON_SECTION}}  → Sección HTML de comparativa (vacía si 1 examen)
  {{GENERATED_AT}}        → Fecha y hora de generación del brief

Ejemplo de uso en el HTML:
  <p>Paciente: {{PATIENT_NAME}}, {{PATIENT_AGE}} años</p>
  <table><tbody>{{BIOMARKERS_TABLE}}</tbody></table>
