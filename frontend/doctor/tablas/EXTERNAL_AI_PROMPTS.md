# External AI Prompts — Sprint M4-B-1.1

## Cómo usar

1. Abrí ChatGPT (https://chat.openai.com) y Gemini (https://gemini.google.com) en pestañas separadas.
2. Para cada prompt, pegá el texto en ambas IAs y guardá las respuestas.
3. Comparalo contra el contenido propuesto en `CLINICAL_CONTENT_DRAFT.json`.
4. Anotá hallazgos en `CONTENT_REVIEW.md` columna "Capa 2 (Fuente oficial)" y "Capa 3 (GEroe)".

## Política

- **OBLIGATORIO**: 10 prompts (1 por escala — sección `actionsByResult`). Riesgo legal si afirmación incorrecta.
- **OPCIONAL**: 20 prompts (2 por escala — `whenToUse` + `pearls`). Solo si tenés duda específica o falta cita textual de capa 2.

---

# OBLIGATORIOS — Acciones según resultado

## 1. eGFR — Acciones

> Estoy validando contenido clínico para una app médica chilena. La afirmación es:
>
> "En ERC G3a (eGFR 45-59): iniciar iECA/ARAII si HTA o albuminuria; en G2-G4 con albuminuria o diabetes considerar SGLT2i (dapagliflozina, empagliflozina) — KDIGO 2024 recomendación 1A; ajustar/evitar metformina (suspender si eGFR <30), evitar AINEs, ajustar antibióticos por eGFR; restricción dietética sodio <2 g/día y fósforo <1 g/día. En G3b (30-44): derivar a nefrólogo, vigilar potasio, restricción proteica 0.6-0.8 g/kg/día. En G4 (15-29): preparar TRR — vacunas (hepatitis B, influenza anual, neumococo PCV13 + PPSV23), fístula AV, manejo Ca/P/PTH, K+ <2 g/día. En G5 (<15): diálisis o trasplante. En Chile, GES 18 cubre etapas 4 y 5."
>
> Respondé:
> 1. ¿Es correcta esta afirmación según KDIGO 2024 Clinical Practice Guideline?
> 2. ¿KDIGO 2024 recomienda SGLT2i en ERC con albuminuria? Citar la recomendación exacta y el grado.
> 3. ¿Las 3 vacunas mencionadas (hepatitis B, influenza, neumococo PCV13+PPSV23) son las recomendadas pre-diálisis?
> 4. ¿GES 18 (Chile) cubre etapas 4 y 5 de ERC?
> 5. ¿Hay afirmación controversial o desactualizada?

## 2. KDIGO — Acciones

> Validando contenido clínico:
>
> "Acciones por etapa coinciden con eGFR (KDIGO 2024 §3). La estratificación A: A1 (ACR <30 mg/g) bajo, A2 (30-300) moderado, A3 (>300) alto. La presencia de albuminuria amplifica el riesgo de cualquier categoría G — ej. G2A3 se maneja como G3 desde el punto de vista cardiovascular y nefroprotector (iECA/ARAII + SGLT2i indicados). En Chile, GES 18 garantiza acceso a diálisis o trasplante en etapas 4-5; la derivación oportuna a nefrólogo en G3b-G4 permite preparación adecuada de TRR (vacunas, fístula, evaluación pre-trasplante)."
>
> Respondé:
> 1. ¿Heat map G+A KDIGO 2024 es la categorización correcta?
> 2. ¿G2A3 efectivamente se maneja como G3 cardiovascular?
> 3. ¿La derivación oportuna G3b-G4 está respaldada por KDIGO 2024?

## 3. NYHA — Acciones

> Validando contenido clínico:
>
> "Cuádruple terapia básica en IC NYHA II-III: (a) iECA/ARAII o sacubitril/valsartán (ARNI), (b) betabloqueador (carvedilol/bisoprolol/metoprolol succinato), (c) MRA (espironolactona/eplerenona), (d) SGLT2i (dapagliflozina/empagliflozina) — AHA/ACC 2022 recomendación 1A. Restricción sodio <2 g/día. Diuréticos de asa para congestión. Clase IV: optimizar terapia + evaluar opciones avanzadas — CRT si QRS ≥130 ms y FEVI ≤35%, ICD si FEVI ≤35% post-3 meses GDMT, considerar trasplante o LVAD. En Chile, GES 79 garantiza control cardiológico, ecocardio y fármacos básicos."
>
> Respondé:
> 1. ¿Cuádruple terapia (iECA/ARAII/ARNI + BB + MRA + SGLT2i) es recomendación 1A AHA/ACC 2022?
> 2. ¿Umbrales CRT (QRS ≥130, FEVI ≤35%) e ICD (FEVI ≤35% post-3m) son correctos?
> 3. ¿GES 79 (Chile) cubre IC?

## 4. CHA₂DS₂-VASc — Acciones

> Validando contenido clínico:
>
> "Score 0 hombres / 1 mujeres (solo punto por sexo femenino aislado): NO anticoagulación rutinaria. Score 1 hombres / 2 mujeres con factor adicional al sexo: considerar anticoagulación según preferencias paciente y riesgo de sangrado (HAS-BLED). Score ≥2 hombres / ≥3 mujeres: anticoagulación recomendada (clase I, evidencia A) — DOAC preferible salvo contraindicación. DOACs disponibles: apixabán 5 mg c/12h, rivaroxabán 20 mg/día, dabigatrán 150 mg c/12h, edoxabán 60 mg/día (ajuste según función renal). En Chile, DOACs no están en GES; warfarina con INR 2-3 sigue siendo opción válida."
>
> Respondé:
> 1. ¿Umbrales 0/1 hombre, 2/3 mujer son correctos según ESC 2020 y AHA/ACC/HRS 2023?
> 2. ¿Las dosis estándar de DOACs son correctas?
> 3. ¿Es correcta la afirmación "DOACs no están en GES Chile"?

## 5. Child-Pugh — Acciones

> Validando contenido clínico:
>
> "Clase A: control ambulatorio cada 6 meses, ECO + AFP semestral para tamizaje HCC, EDA tamizaje varices, vacunación (hepatitis A/B, neumococo, influenza), abstinencia alcohólica absoluta, evitar AINEs. Clase B: + diuréticos (espironolactona ± furosemida) y restricción sodio <2 g/día para ascitis, BB no selectivo (propranolol/carvedilol) profilaxis varicosa, lactulosa si encefalopatía. Restricción proteica NO se recomienda rutinariamente — preferir proteína vegetal/láctea si EH. Clase C: hospitalización en descompensación, evaluación urgente trasplante (MELD-Na para listing), profilaxis antibiótica PBE si ascitis con proteínas <1.5 g/dL, manejo agresivo EH (lactulosa + rifaximina). Hierro suplementario contraindicado en cirrosis avanzada."
>
> Respondé:
> 1. ¿Las recomendaciones de tamizaje HCC (ECO+AFP semestral) y varices (EDA) son correctas según AASLD 2018?
> 2. ¿La afirmación 'restricción proteica NO se recomienda rutinariamente' es correcta?
> 3. ¿Profilaxis PBE con proteínas <1.5 g/dL es el umbral correcto?

## 6. HAS-BLED — Acciones

> Validando contenido clínico:
>
> "Score ≥3 (alto, ~3.7%/año o más): identificar factores modificables — control HTA estricto (<140/90), evaluar INR lábil (cambiar a DOAC si TTR <60% en warfarina), suspender o reducir AINEs/antiagregantes innecesarios, consejería sobre alcohol (<8 unidades/semana), evitar caídas. NO contraindica anticoagulación: el riesgo de stroke por NO anticoagular suele superar el de sangrado."
>
> Respondé:
> 1. ¿Esta interpretación 'NO contraindica' es correcta según ESC 2020?
> 2. ¿TTR <60% en warfarina es el umbral para considerar cambio a DOAC?
> 3. ¿Hay afirmación controversial sobre alcohol (<8 unidades/semana)?

## 7. MELD-Na — Acciones

> Validando contenido clínico:
>
> "Score <10: cirrosis bien compensada — manejo ambulatorio. Score 10-19: descompensación o riesgo creciente — hospitalizar en descompensaciones, intensificar tratamiento etiológico. Score 20-29: cirrosis avanzada — derivar a centro de trasplante. Score 30-39: lista activa de trasplante. Score ≥40 (truncado): prioridad UNOS Status 1A — trasplante urgente, manejo en UCI hepatología. En Chile, no hay GES de trasplante hepático; el sistema usa criterios MELD-Na similares al UNOS para priorización."
>
> Respondé:
> 1. ¿Los umbrales de derivación (≥15 beneficio TX, ≥20 prioridad alta) son correctos según AASLD 2018 y UNOS Policy 9?
> 2. ¿Es correcta la afirmación 'no hay GES de trasplante hepático en Chile'?
> 3. ¿UNOS Status 1A aplica a MELD ≥40 truncado?

## 8. GOLD — Acciones

> Validando contenido clínico:
>
> "GOLD 1 (≥80%): SABA prn (salbutamol), cesación tabáquica, vacunas (influenza anual, neumococo PCV13/PPSV23). GOLD 2 (50-79%): + LABA o LAMA mono o LABA+LAMA si síntomas, rehab pulmonar. GOLD 3 (30-49%): triple LABA+LAMA+ICS si exacerbaciones frecuentes (≥2/año o 1 hospitalización), oxigenoterapia si SatO2 <88% en reposo. GOLD 4 (<30%): + considerar reducción volumen pulmonar, trasplante pulmonar en candidatos. En Chile, GES 25 cubre broncodilatadores básicos, espirometría anual y control neumológico."
>
> Respondé:
> 1. ¿La triple terapia LABA+LAMA+ICS está indicada solo con exacerbaciones frecuentes (≥2/año o 1 hospitalización)? GOLD 2024.
> 2. ¿Umbral SatO2 <88% para oxigenoterapia es correcto?
> 3. ¿GES 25 (Chile) cubre EPOC ambulatorio como descrito?

## 9. CURB-65 — Acciones

> Validando contenido clínico:
>
> "Score 0-1: manejo ambulatorio. Antibiótico: amoxicilina 1 g c/8h × 5-7 días (paciente sano sin comorbilidades) o amoxicilina/clavulánico + macrólido (azitromicina 500 mg/día × 3-5 días) si comorbilidades. Score 2: hospitalización corta — ceftriaxona 1-2 g/día IV + azitromicina 500 mg/día IV. Score 3: hospitalización + considerar UCI si shock séptico o falla respiratoria. Score 4-5: UCI obligatorio — ceftriaxona + azitromicina o levofloxacino, soporte ventilatorio, vasopresores si shock."
>
> Respondé:
> 1. ¿Las dosis y duración de antibióticos son correctas según IDSA/ATS 2019?
> 2. ¿Score 3 ya indica considerar UCI o solo hospitalización general?
> 3. ¿Levofloxacino monoterapia es alternativa válida en UCI?

## 10. Glasgow Coma Scale — Acciones

> Validando contenido clínico:
>
> "GCS 13-15 (leve): vigilancia neurológica horaria por 4-6 horas, TC cerebral si hay factores de riesgo (edad ≥65, anticoagulación, déficit focal, vómitos persistentes, amnesia >30 min). GCS 9-12 (moderado): hospitalización obligatoria + TC cerebral inmediata + neurocirugía consultada. GCS 3-8 (grave): UCI obligatoria + considerar intubación orotraqueal (especialmente si GCS ≤8 o pérdida de reflejos protectores), TC cerebral inmediata, monitoreo PIC si signos de hipertensión intracraneal, manejo agresivo de HIC (cabeza 30°, manitol/SS hipertónica, sedación, PaCO2 35-40)."
>
> Respondé:
> 1. ¿Los umbrales 13-15 / 9-12 / 3-8 y conducta correspondiente coinciden con Brain Trauma Foundation 2016?
> 2. ¿La regla 'GCS ≤8 → considerar intubación' es estándar?
> 3. ¿PaCO2 35-40 es el rango correcto para manejo PIC?

---

# OPCIONALES — Cuándo usar (10 prompts)

Solo ejecutar si tenés duda específica sobre la pieza correspondiente.

## eGFR — Cuándo usar
> "Validando: 'CKD-EPI 2021 race-free es apropiado en ≥18a con marcadores de daño renal o función disminuida >3 meses; NO usar en AKI; en sarcopenia/amputados/desnutrición severa considerar cistatina C.' ¿Correcto según KDIGO 2024 e Inker NEJM 2021? ¿Hay caso clínico donde NO se debería usar CKD-EPI 2021 que falte mencionar?"

## KDIGO — Cuándo usar
> "Validando: 'Diagnóstico ERC requiere persistencia >3 meses de eGFR<60 o eGFR≥60 con marcadores daño (albuminuria ≥30 mg/g, hematuria glomerular, alteraciones imagenológicas/histológicas). Heat map G+A: G2A3 ≈ G3 cardiovascular.' ¿Correcto según KDIGO 2024 §1.4?"

## NYHA — Cuándo usar
> "Validando: 'NYHA es clasificación funcional IC basada en SÍNTOMAS, complementaria a FEVI; aplica IC con FEVI reducida o preservada; reevaluar 3-6 meses post-GDMT; alta variabilidad inter-observador.' ¿Correcto según AHA/ACC/HFSA 2022?"

## CHA₂DS₂-VASc — Cuándo usar
> "Validando: 'CHA₂DS₂-VASc aplicable a FA no valvular paroxística/persistente/permanente; NO se aplica a estenosis mitral severa o prótesis valvular mecánica — estos casos requieren warfarina (no DOAC).' ¿Correcto según ESC 2020?"

## Child-Pugh — Cuándo usar
> "Validando: 'Child-Pugh apropiado en cirrosis confirmada para evaluación basal y seguimiento; NO sustituye MELD-Na para decisiones de trasplante (MELD-Na más objetivo y mejor predictor de mortalidad 90 días).' ¿Correcto según AASLD 2018?"

## HAS-BLED — Cuándo usar
> "Validando: 'HAS-BLED estima riesgo de sangrado mayor a 1 año en pacientes con FA en anticoagulación oral; score ≥3 alto riesgo + corrección factores modificables; reevaluar al inicio y periódicamente.' ¿Correcto según ESC 2020?"

## MELD-Na — Cuándo usar
> "Validando: 'MELD-Na (UNOS Policy 9, 2016) usado para asignación de hígados de cadáver; score ≥15 indica beneficio potencial de trasplante; ≥20 prioridad alta; pacientes en diálisis ≥2x/sem usar creat=4.0.' ¿Correcto según UNOS Policy 9?"

## GOLD — Cuándo usar
> "Validando: 'GOLD 2024 spirometric clasifica EPOC en 4 estadios según FEV1% predicho post-BD, en pacientes con obstrucción confirmada (FEV1/FVC<0.70 post-BD); NO aplica si no hay obstrucción confirmada.' ¿Correcto según GOLD 2024?"

## CURB-65 — Cuándo usar
> "Validando: 'CURB-65 apropiado en adultos con NAC clínico-radiográfico; NO usar en NAC nosocomial, NAC asociada a ventilación, ni en niños; PSI más sensible ambulatorio, CURB-65 más simple en urgencias.' ¿Correcto según IDSA/ATS 2019?"

## Glasgow Coma Scale — Cuándo usar
> "Validando: 'GCS apropiado en cualquier alteración del nivel de conciencia (TEC, ACV, encefalopatía metabólica/hepática, intoxicación, postoperatorio); reportar como E_V_M_ no solo total; en intubados V='T'; en sedados evaluar pre-sedación si posible.' ¿Correcto según Brain Trauma Foundation 2016 y Teasdale Lancet Neurol 2014?"

---

# OPCIONALES — Pearls (10 prompts)

Solo ejecutar si tenés duda específica.

## eGFR — Pearls
> "Validando 5 pearls eGFR: 1) Algunos labs CL aún 2009. 2) Sarcopenia/amputado→cistatina C. 3) Obesidad→ajustar SC. 4) eGFR aislado no Dx ERC. 5) Nura V2 CR-02: ERC<30+K=paro cardíaco. ¿Correctos según KDIGO 2024 / Inker NEJM 2021?"

## KDIGO — Pearls
> "Validando 5 pearls KDIGO: 1) ACR matinal estándar > 24h. 2) Screening anual ACR en DM/HTA. 3) Falsos positivos: ITU/ejercicio/fiebre/IC. 4) ≥A2 indica iECA+SGLT2i (1A). 5) Nura V2 CR-02. ¿Correctos según KDIGO 2024?"

## NYHA — Pearls
> "Validando 5 pearls NYHA: 1) Subjetivo, documentar criterios. 2) Mejora 1-2 clases con GDMT 3-6m. 3) Combinar FEVI+NT-proBNP. 4) IC aguda: reevaluar tras estabilización. 5) Nura V2 ic_nyha_3-4: Na<1.5g + líquidos<1.5L + cafeína contraindicada. ¿Correctos según AHA/ACC 2022?"

## CHA₂DS₂-VASc — Pearls
> "Validando 6 pearls CHA₂DS₂-VASc: 1) Combinar con HAS-BLED. 2) Score alto = más beneficio. 3) Sexo F aislado: no indicación. 4) Mitral/prótesis = warfarina. 5) Reevaluar con cambios. 6) Nura V2 CR-05: vit K antagoniza warfarina. ¿Correctos según ESC 2020?"

## Child-Pugh — Pearls
> "Validando 6 pearls Child-Pugh: 1) Subjetivos (ascitis, EH). 2) MELD-Na más objetivo TX. 3) Útil pronóstico/perioperatorio. 4) Reevaluar post-tto. 5) Tto etiológico crítico. 6) Nura V2 cirrosis_child_*: alcohol contraindicado todas clases, hierro contraindicado B-C. ¿Correctos según AASLD 2018?"

## HAS-BLED — Pearls
> "Validando 6 pearls HAS-BLED: 1) ERROR: no usar para 'decidir si anticoagular'. 2) TTR<60% → DOAC. 3) Alcohol ≥8u/sem modificable. 4) AINEs duplican riesgo. 5) Caídas no contraindican. 6) Nura V2 CR-05. ¿Correctos según ESC 2020?"

## MELD-Na — Pearls
> "Validando 6 pearls MELD-Na: 1) Clamps bili/INR/creat min 1.0, creat max 4.0. 2) Sodio 125-137. 3) Score 6-40. 4) MELD exception (HCC Milán). 5) MELD 3.0 (2023) sexo+albúmina, UNOS migró 2023. 6) Nura V1 implementa MELD-Na 2016. ¿Correctos según UNOS Policy 9 y Kim NEJM 2008?"

## GOLD — Pearls
> "Validando 6 pearls GOLD: 1) Spirometric vs ABCD complementarios. 2) Cesación tabáquica > farmacoterapia en mortalidad. 3) Espirometría anual: progresión >50mL/año. 4) Reversibilidad >12% +200mL = sospechar asma/ACO. 5) Vacunas reducen exacerbaciones. 6) Nura V2 epoc_gold_3-4. ¿Correctos según GOLD 2024?"

## CURB-65 — Pearls
> "Validando 6 pearls CURB-65: 1) No incluye SatO2. 2) Contexto social cuenta. 3) Comorbilidades excluidas elevan riesgo. 4) Confusión = AMTS≤8. 5) Antibiótico <4h reduce mortalidad. 6) PSI/PORT más completo (20 var). ¿Correctos según IDSA/ATS 2019?"

## Glasgow Coma Scale — Pearls
> "Validando 7 pearls GCS: 1) E_V_M_ siempre. 2) Intubado V='T', total no comparable. 3) Sedados: pre-sedación o post-suspensión. 4) Motor mejor predictor. 5) Variabilidad V3 vs V2. 6) <5a usar pGCS pediátrico. 7) Motor unilateral: usar mejor lado, no promediar (BTF 2016). ¿Correctos según BTF 2016 y Teasdale Lancet Neurol 2014?"

---

## Resumen

- **OBLIGATORIOS**: 10 prompts (Acciones × 10 escalas)
- **OPCIONALES**: 20 prompts (Cuándo usar × 10 + Pearls × 10)
- **Total**: 30 prompts disponibles
- **Tiempo estimado obligatorios**: 30-40 min (ChatGPT + Gemini en paralelo)
- **Tiempo total si todos ejecutados**: 60-90 min
