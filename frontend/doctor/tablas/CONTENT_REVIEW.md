# Content Review — Sprint M4-B-1.1

**Estado:** `draft-1` ⏳
**Fecha:** 2026-05-02
**Total piezas:** 60 (10 escalas × 3 secciones × [summary + details]) + 10 referencias

## Cómo revisar

Para cada fila:
1. Leer **Contenido propuesto (resumen)** y abrir `CLINICAL_CONTENT_DRAFT.json` para texto completo.
2. Verificar columna **Capa 1 (Motor V2)**:
   - ✅ coincide
   - ⚠️ parcial
   - ➖ no aplica (motor no cubre — capa 2 obligatoria)
3. Verificar columna **Reglas motor citadas** (cuando capa 1 = ✅).
4. Verificar columna **Capa 2 (Fuente oficial)**: si hay duda, ejecutar prompt correspondiente en `EXTERNAL_AI_PROMPTS.md` (ChatGPT + Gemini).
5. Marcar columna **Acción GEroe**: `OK` / `CORREGIR: <texto>` / `ELIMINAR`.

## Conflictos detectados motor V2 vs guideline oficial

_Vacío en este draft. Si surge alguno tras validación capa 2, agregar acá con el patrón:_
> ⚠️ CONFLICTO DETECTADO:
> - Motor Nura V2 (regla R-XXX): "..."
> - Guideline oficial (sección Y.Y): "..."
> - Acción GEroe: decidir cuál fuente prevalece + considerar actualizar motor en sprint posterior

## Tabla 60 piezas

| # | Escala | Sección | Pieza | Contenido propuesto (resumen) | Capa 1 (Motor V2) | Reglas motor citadas | Capa 2 (Fuente oficial) | Capa 3 (GEroe) | Acción |
|---|---|---|---|---|---|---|---|---|---|
| 1 | eGFR | whenToUse | summary | "Apropiado ≥18a con marcadores daño renal/función disminuida >3m; NO en AKI" | ➖ no aplica | — | KDIGO 2024 §2.1.2; Inker NEJM 2021 | ⏳ | ⏳ |
| 2 | eGFR | whenToUse | details | "CKD-EPI 2021 race-free; 2 mediciones >90d; cistatina C en sarcopenia/hepatopatía/amputados; AINEs/contraste/iECA-ARAII bajan transitoriamente" | ➖ no aplica | — | KDIGO 2024 §2.1-2.2; Inker NEJM 2021 §Methods | ⏳ | ⏳ |
| 3 | eGFR | actionsByResult | summary | "G1-G2 vigilancia; G3a ajuste fármacos+Na/P; G3b derivar nefro; G4 preparar TRR; G5 diálisis/TX (GES 18)" | ✅ parcial nutrición | bloque2:erc_estadio_3a/3b/4/5.reglas[*] | KDIGO 2024 §3; GES 18 MINSAL 2017 | ⏳ | ⏳ |
| 4 | eGFR | actionsByResult | details | "G3a iECA/ARAII+SGLT2i (KDIGO 1A)+evitar metformina<30/AINEs+ajuste antibióticos+Na<2g+P<1g; G3b derivar nefro+K+proteínas; G4 vacunas (HepB+influenza+PCV13/PPSV23)+fístula+Ca/P/PTH+K<2g; G5 diálisis/TX. GES 18." | ✅ parcial nutrición; ⚠️ fármacos/derivación motor no cubre | bloque2:erc_estadio_3a-5; clinical-rules:insuficiencia_renal_cronica/dialisis/nefropatia_diabetica | KDIGO 2024 §3-4; GES 18 MINSAL | ⏳ | ⏳ |
| 5 | eGFR | pearls | summary | "CKD-EPI 2021 race-free reemplaza 2009; cistatina C cuando creat engaña" | ➖ no aplica | — | Inker NEJM 2021; KDIGO 2024 §2.2 | ⏳ | ⏳ |
| 6 | eGFR | pearls | details | "1) Algunos labs CL aún 2009. 2) Sarcopenia/amputado→cistatina C. 3) Obesidad→ajustar SC. 4) eGFR aislado no Dx ERC. 5) ⚠ Nura V2 CR-02: ERC<30+K → paro cardíaco" | ✅ pearl #5 (CR-02) | critical-rules.js:CR-02 | KDIGO 2024 §2.1-2.2; Inker NEJM 2021; FDA/Cochrane (CR-02) | ⏳ | ⏳ |
| 7 | KDIGO | whenToUse | summary | "Estadiaje completo G+A requiere eGFR + albuminuria; esta tabla cubre solo G; complementar con ACR" | ➖ no aplica | — | KDIGO 2024 §1.1, §1.4 | ⏳ | ⏳ |
| 8 | KDIGO | whenToUse | details | "Diagnóstico ERC = persistencia >3m de eGFR<60 o eGFR≥60 con marcadores daño; heat map G+A; G2A3 = riesgo G3" | ➖ no aplica | — | KDIGO 2024 §1.1, §1.4 (heat map) | ⏳ | ⏳ |
| 9 | KDIGO | actionsByResult | summary | "Acciones idénticas a eGFR según G; albuminuria amplifica riesgo: G2A3=G3 cardiovascular; GES 18 cubre G4-G5" | ✅ parcial nutrición | bloque2:erc_estadio_3a-5 | KDIGO 2024 §3, §1.4; GES 18 | ⏳ | ⏳ |
| 10 | KDIGO | actionsByResult | details | "A1<30/A2 30-300/A3>300 mg/g; G2A3 maneja como G3; iECA/ARAII+SGLT2i en albuminuria persistente ≥A2; GES 18 G4-G5" | ✅ parcial nutrición | bloque2:erc_estadio_3a-5; clinical-rules:erc_estadio_*  | KDIGO 2024 §3, §1.4; GES 18 MINSAL | ⏳ | ⏳ |
| 11 | KDIGO | pearls | summary | "Heat map G+A es sistema completo; eGFR aislado sin ACR subestima riesgo; albuminuria = marcador más temprano" | ➖ no aplica | — | KDIGO 2024 §1.4-2.3 | ⏳ | ⏳ |
| 12 | KDIGO | pearls | details | "1) ACR matinal estándar. 2) Screening anual ACR en DM/HTA. 3) Falsos positivos: ITU/ejercicio/fiebre/IC. 4) ≥A2 indica iECA+SGLT2i (1A). 5) ⚠ Nura V2 CR-02" | ✅ pearl #5 | critical-rules.js:CR-02 | KDIGO 2024 §1.4-2.3 | ⏳ | ⏳ |
| 13 | NYHA | whenToUse | summary | "Clasificación funcional IC por SÍNTOMAS; aplica FEVI reducida o preservada; subjetiva, reevaluable post-tto" | ➖ no aplica | — | AHA/ACC/HFSA 2022 §6.1 | ⏳ | ⏳ |
| 14 | NYHA | whenToUse | details | "Complementario a FEVI + etapas ACC/AHA A-D; reevaluar 3-6 meses post GDMT; alta variabilidad inter-observador; complementar caminata 6 min + NT-proBNP" | ➖ no aplica | — | AHA/ACC/HFSA 2022 §6.1 | ⏳ | ⏳ |
| 15 | NYHA | actionsByResult | summary | "I: GDMT preventiva si factores. II-III: cuádruple (BB+iECA/ARAII/ARNI+MRA+SGLT2i). IV: + dispositivos/trasplante. GES 79 cubre IC" | ✅ parcial nutrición | bloque2:ic_nyha_1-4 | AHA/ACC 2022 §7-9; ESC 2021 HF | ⏳ | ⏳ |
| 16 | NYHA | actionsByResult | details | "Cuádruple GDMT (1A): iECA/ARAII/ARNI + BB (carvedilol/biso/metoprolol) + MRA + SGLT2i; Na<2g (Nura V2: <1.5g II-III); IV: CRT QRS≥130+FEVI≤35, ICD post-3m, trasplante/LVAD; GES 79" | ✅ Na coincide; ⚠️ fármacos motor no cubre | bloque2:ic_nyha_2/3/4 (sodio, líquidos, cafeína) | AHA/ACC 2022 §7-9; ESC 2021; GES 79 | ⏳ | ⏳ |
| 17 | NYHA | pearls | summary | "NYHA subjetivo; alta variabilidad inter-observador; reevaluable; complementar FEVI+biomarcadores" | ➖ no aplica | — | AHA/ACC 2022 §6.1 | ⏳ | ⏳ |
| 18 | NYHA | pearls | details | "1) Subjetivo, documentar criterios. 2) Mejora 1-2 clases con GDMT 3-6m. 3) Combinar FEVI+NT-proBNP. 4) IC aguda: reevaluar tras estabilización. 5) ⚠ Nura V2 ic_nyha_3-4: Na<1.5g + líquidos<1.5L + cafeína contraindicada" | ✅ pearl #5 | bloque2:ic_nyha_3.reglas[0,1,2]; ic_nyha_4.reglas[0,1,2,3] | AHA/ACC 2022 §6.1 | ⏳ | ⏳ |
| 19 | CHA₂DS₂-VASc | whenToUse | summary | "Riesgo embólico en FA NO valvular para decisión anticoagulación; NO en estenosis mitral severa o prótesis mecánica" | ➖ no aplica | — | ESC 2020 §11.2 | ⏳ | ⏳ |
| 20 | CHA₂DS₂-VASc | whenToUse | details | "FA no valvular paroxística/persistente/permanente; valvulopatía mitral severa o prótesis mecánica = warfarina (no DOAC); reevaluar score periódicamente" | ➖ no aplica | — | ESC 2020 §11.2 | ⏳ | ⏳ |
| 21 | CHA₂DS₂-VASc | actionsByResult | summary | "Hombre 0 / mujer 1 (solo sexo): NO anticoag. Hombre ≥2 / mujer ≥3: clase I (DOAC preferible)" | ➖ no aplica | — | ESC 2020 §11.4-11.5; AHA/ACC/HRS 2023 | ⏳ | ⏳ |
| 22 | CHA₂DS₂-VASc | actionsByResult | details | "DOACs: apixabán 5mg c/12h, rivaroxabán 20mg/d, dabigatrán 150mg c/12h, edoxabán 60mg/d (ajuste renal); Chile: DOAC no en GES, warfarina INR 2-3 con control mensual" | ➖ no aplica | — | ESC 2020 §11.4-11.5; AHA/ACC/HRS 2023 §10 | ⏳ | ⏳ |
| 23 | CHA₂DS₂-VASc | pearls | summary | "CHA₂DS₂-VASc separado de HAS-BLED; score alto NO contraindica; alto HAS-BLED = vigilancia, no abstención; DOAC > warfarina en FA no valvular" | ➖ no aplica | — | ESC 2020 §11.4 | ⏳ | ⏳ |
| 24 | CHA₂DS₂-VASc | pearls | details | "1) Combinar con HAS-BLED (vigilancia, no abstención). 2) Score alto = más beneficio. 3) Sexo F aislado: no indicación. 4) Mitral/prótesis = warfarina. 5) Reevaluar con cambios. 6) ⚠ Nura V2 CR-05: vit K antagoniza warfarina" | ✅ pearl #6 | critical-rules.js:CR-05 | ESC 2020 §11.4 | ⏳ | ⏳ |
| 25 | Child-Pugh | whenToUse | summary | "Severidad y pronóstico cirrosis confirmada; NO en hepatopatía aguda; preferir MELD-Na para trasplante" | ➖ no aplica | — | AASLD 2018 §3.1; EASL 2018 | ⏳ | ⏳ |
| 26 | Child-Pugh | whenToUse | details | "5 parámetros (bili+alb+INR+ascitis+encefalopatía) → A/B/C; reevaluable post-tto descompensación; MELD-Na más objetivo para trasplante" | ➖ no aplica | — | AASLD 2018 §3.1; EASL 2018 | ⏳ | ⏳ |
| 27 | Child-Pugh | actionsByResult | summary | "A: ambulatorio + screening varices/HCC. B: + diuréticos+profilaxis varicosa. C: hospitalización + evaluar trasplante (MELD-Na)" | ✅ parcial nutrición | bloque2:cirrosis_child_a/b/c | AASLD 2018 §3-7; EASL 2018 | ⏳ | ⏳ |
| 28 | Child-Pugh | actionsByResult | details | "A: ECO+AFP semestral, EDA varices, vacunas, abstinencia alcohol/AINEs. B: espironolactona±furo, Na<2g, BB no selectivo profilaxis varicosa, lactulosa si EH. C: hospitalizar, MELD-Na, profilaxis PBE prot<1.5, lactulosa+rifaximina; hierro contraindicado avanzada" | ✅ Na+alcohol+hierro coinciden; ⚠️ fármacos motor no cubre | bloque2:cirrosis_child_a (alcohol crítico, sodio mod), child_b (Na crítico, alcohol, hierro mod), child_c (Na estricto, alcohol, hierro crítico, proteínas) | AASLD 2018 §3-7; EASL 2018 | ⏳ | ⏳ |
| 29 | Child-Pugh | pearls | summary | "Semicuantitativo (subjetividad ascitis/encefalopatía); MELD-Na preferible para trasplante" | ➖ no aplica | — | AASLD 2018 §3.1 | ⏳ | ⏳ |
| 30 | Child-Pugh | pearls | details | "1) Componentes subjetivos. 2) MELD-Na más objetivo. 3) Útil pronóstico/perioperatorio. 4) Reevaluar post-tto. 5) Tto etiológico crítico (antivirales, abstinencia). 6) ⚠ Nura V2 cirrosis_child_*: alcohol contraindicado todas clases, hierro contraindicado B-C" | ✅ pearl #6 | bloque2:cirrosis_child_a/b/c (alcohol, hierro, proteínas) | AASLD 2018 §3.1 | ⏳ | ⏳ |
| 31 | HAS-BLED | whenToUse | summary | "Riesgo sangrado mayor en FA + anticoagulación; score alto NO contraindica — implica vigilancia" | ➖ no aplica | — | ESC 2020 §11.5; Pisters CHEST 2010 | ⏳ | ⏳ |
| 32 | HAS-BLED | whenToUse | details | "9 ítems (Nura) basado en Pisters 2010 ampliado; score ≥3 alto riesgo + corrección factores modificables (HTA, INR lábil, alcohol, fármacos); reevaluar al inicio y periódicamente" | ➖ no aplica | — | ESC 2020 §11.5 | ⏳ | ⏳ |
| 33 | HAS-BLED | actionsByResult | summary | "0-2: vigilancia estándar. ≥3: identificar+corregir modificables, vigilar más estrechamente; NO suspender" | ➖ no aplica | — | ESC 2020 §11.5; Pisters CHEST 2010 | ⏳ | ⏳ |
| 34 | HAS-BLED | actionsByResult | details | "≥3 (~3.7%/año): control HTA<140/90, INR lábil→DOAC si TTR<60%, suspender AINEs/antiagregantes innecesarios, alcohol<8u/sem, evitar caídas; vigilar Hb+función renal+sangrado oculto. NO suspender por score alto" | ➖ no aplica | — | ESC 2020 §11.5 | ⏳ | ⏳ |
| 35 | HAS-BLED | pearls | summary | "Identifica vigilancia, NO contraindica; factores modificables (HTA, INR lábil, alcohol, drogas) son blanco terapéutico" | ➖ no aplica | — | ESC 2020 §11.5 | ⏳ | ⏳ |
| 36 | HAS-BLED | pearls | details | "1) ERROR: no usar para 'decidir si anticoagular'. 2) TTR<60% → DOAC. 3) Alcohol ≥8u/sem es modificable. 4) AINEs duplican riesgo. 5) Caídas no contraindican. 6) ⚠ Nura V2 CR-05: vit K antagoniza warfarina, escáner alerta" | ✅ pearl #6 | critical-rules.js:CR-05 | ESC 2020 §11.5; Man-Son-Hing JAMA 1999 | ⏳ | ⏳ |
| 37 | MELD-Na | whenToUse | summary | "Priorización trasplante hepático y mortalidad 90d; cirrosis avanzada con descompensación" | ➖ no aplica | — | AASLD 2018 §7; UNOS Policy 9 | ⏳ | ⏳ |
| 38 | MELD-Na | whenToUse | details | "UNOS Policy 9 (2016): MELD+sodio; ≥15 beneficio TX, ≥20 prioridad alta; MELD exception points (HCC, hepatopulmonar); diálisis ≥2x/sem → creat=4.0" | ➖ no aplica | — | AASLD 2018 §7; UNOS Policy 9; Kim NEJM 2008 | ⏳ | ⏳ |
| 39 | MELD-Na | actionsByResult | summary | "<10 ambulatorio. 10-19 hospitalización selectiva. 20-29 evaluar TX. 30-39 lista activa. ≥40 UNOS 1A (UCI)" | ➖ no aplica | — | AASLD 2018 §7; UNOS Policy 9 §3 | ⏳ | ⏳ |
| 40 | MELD-Na | actionsByResult | details | "20-29: derivar centro TX (eco-cardio, TC, screening infeccioso, eval social). 30-39: lista activa, descompensaciones agresivas, profilaxis PBE, vacunas. ≥40: UCI hepatología, TX urgente. Chile sin GES TX hepático, criterios MELD-Na similares en hospitales públicos" | ✅ parcial (compartido cirrosis) | bloque2:cirrosis_child_a/b/c (manejo descompensación) | AASLD 2018 §7; UNOS Policy 9 §3 | ⏳ | ⏳ |
| 41 | MELD-Na | pearls | summary | "Truncado 6-40; sodio clamp 125-137; diálisis = creat 4.0; hiponatremia <125 amplifica" | ➖ no aplica | — | AASLD 2018 §7; UNOS Policy 9 | ⏳ | ⏳ |
| 42 | MELD-Na | pearls | details | "1) Clamps: bili/INR/creat min 1.0; creat max 4.0. 2) Sodio 125-137. 3) Score 6-40. 4) MELD exception (HCC Milán). 5) MELD 3.0 (2023) sexo+albúmina, UNOS migró 2023. 6) Nura V1 implementa MELD-Na 2016, MELD 3.0 versión futura" | ➖ no aplica | — | AASLD 2018 §7; UNOS Policy 9; Kim NEJM 2008; Kim Gastroenterology 2021 (MELD 3.0) | ⏳ | ⏳ |
| 43 | GOLD | whenToUse | summary | "Severidad espirométrica EPOC con obstrucción confirmada (FEV1/FVC<0.70 post-BD); NO en asma" | ➖ no aplica | — | GOLD 2024 Report §2.3 | ⏳ | ⏳ |
| 44 | GOLD | whenToUse | details | "GOLD 2024 spirometric (1-4) basado en FEV1% predicho post-BD; complementar con GOLD ABCD (mMRC/CAT + exacerbaciones) para tratamiento; Nura V1 solo espirométrico, ABCD versión futura" | ➖ no aplica | — | GOLD 2024 Report §2.3 | ⏳ | ⏳ |
| 45 | GOLD | actionsByResult | summary | "1-2 (≥50%): SABA + LABA/LAMA. 3-4 (<50%): + ICS si exacerbaciones, O2 si SatO2<88%. GES 25 cubre EPOC ambulatorio en Chile" | ✅ parcial nutrición | bloque2:epoc_gold_1-4 | GOLD 2024 §3-4; GES 25 MINSAL | ⏳ | ⏳ |
| 46 | GOLD | actionsByResult | details | "1: SABA prn, cesación tabáquica, vacunas. 2: + LABA o LAMA mono o LABA+LAMA, rehab pulmonar. 3: triple LABA+LAMA+ICS si exacerbaciones, O2 si SatO2<88%. 4: + reducción volumen pulmonar, trasplante. GES 25 broncodilatadores+espirometría+control neumólogo" | ✅ parcial nutrición; ⚠️ fármacos motor no cubre | bloque2:epoc_gold_1-4 (productos pro-inflamatorios) | GOLD 2024 §3-4; GES 25 MINSAL | ⏳ | ⏳ |
| 47 | GOLD | pearls | summary | "Estadio espirométrico ≠ severidad clínica; GOLD ABCD guía tratamiento; cesación tabáquica = más eficaz" | ➖ no aplica | — | GOLD 2024 Report | ⏳ | ⏳ |
| 48 | GOLD | pearls | details | "1) GOLD spirometric vs ABCD complementarios. 2) Cesación tabáquica > farmacoterapia en mortalidad. 3) Espirometría anual: progresión >50mL/año. 4) Reversibilidad >12% +200mL = sospechar asma/ACO. 5) Vacunas reducen exacerbaciones. 6) ⚠ Nura V2 epoc_gold_3-4: aditivos pro-inflamatorios alertan en escáner" | ✅ pearl #6 | bloque2:epoc_gold_3/4 | GOLD 2024 Report | ⏳ | ⏳ |
| 49 | CURB-65 | whenToUse | summary | "Severidad NAC en adultos; NO en NAC nosocomial, NAC asociada a ventilación, ni niños" | ➖ no aplica (motor no cubre) | — | IDSA/ATS 2019 §VIII; Lim Thorax 2003 | ⏳ | ⏳ |
| 50 | CURB-65 | whenToUse | details | "Adultos con NAC clínico-radiográfico; complementa PSI/PORT y SCAP; juicio clínico considera comorbilidades, SatO2, gases; PSI más sensible ambulatorio, CURB-65 más simple en urgencias" | ➖ no aplica | — | IDSA/ATS 2019 §VIII | ⏳ | ⏳ |
| 51 | CURB-65 | actionsByResult | summary | "0-1: ambulatorio + amoxi/macrólido. 2: hospital corto + betalactámico+macrólido. 3-5: hospital + UCI si shock/falla respiratoria" | ➖ no aplica | — | IDSA/ATS 2019 §VIII-IX | ⏳ | ⏳ |
| 52 | CURB-65 | actionsByResult | details | "0-1: amoxi 1g c/8h 5-7d (sano) o amoxi/clav+azitro si comorbilidades. 2: ceftriaxona 1-2g/d IV+azitro IV. 3: hospital+UCI si shock. 4-5: UCI+ceftriaxona+azitro o levo, soporte ventilatorio, vasopresores. Vacunas+cesación post-alta" | ➖ no aplica | — | IDSA/ATS 2019 §VIII-IX | ⏳ | ⏳ |
| 53 | CURB-65 | pearls | summary | "CURB-65 complementa juicio clínico; considerar SatO2, comorbilidades, contexto social en decisión final" | ➖ no aplica | — | IDSA/ATS 2019 §VIII | ⏳ | ⏳ |
| 54 | CURB-65 | pearls | details | "1) No incluye SatO2/hipoxemia. 2) Contexto social cuenta (red apoyo, fragilidad). 3) Comorbilidades excluidas (IC, cirrosis, ERC, oncológico, IS) elevan riesgo. 4) Confusión = AMTS≤8 o desorientación nueva. 5) Antibiótico <4h reduce mortalidad. 6) PSI/PORT más completo (20 var); complementa CURB-65" | ➖ no aplica | — | IDSA/ATS 2019 §VIII; Fine NEJM 1997 (PSI) | ⏳ | ⏳ |
| 55 | GCS | whenToUse | summary | "Nivel conciencia en TEC, encefalopatías agudas, postoperatorio, intoxicaciones; reportar E_V_M_ no solo total" | ➖ no aplica (motor no cubre) | — | BTF 2016; Teasdale Lancet Neurol 2014 | ⏳ | ⏳ |
| 56 | GCS | whenToUse | details | "Apropiado en cualquier alteración conciencia; reportar componentes individuales E_V_M_ + total; intubados V='T', total no comparable; sedados evaluar pre-sedación; reevaluar c/1-4hrs en agudo" | ➖ no aplica | — | BTF 2016; Teasdale Lancet Neurol 2014 | ⏳ | ⏳ |
| 57 | GCS | actionsByResult | summary | "13-15: leve, vigilancia. 9-12: moderado, hospitalización + TC. 3-8: grave, UCI + intubación + TC + manejo PIC" | ➖ no aplica | — | BTF 2016 §3-5 | ⏳ | ⏳ |
| 58 | GCS | actionsByResult | details | "13-15: vigilancia 4-6h, TC si edad≥65/anticoag/déficit/vómitos/amnesia>30min. 9-12: hospitalización+TC inmediata+neurocirugía c/1-2h. 3-8: UCI+intubación si GCS≤8/pérdida reflejos, TC, monitoreo PIC, manejo HIC (cabeza 30°, manitol/SS, sedación, PaCO2 35-40), craniectomía descompresiva por BTF 2016 umbrales" | ➖ no aplica | — | BTF 2016 §3-5; AANS Severe TBI 2007 | ⏳ | ⏳ |
| 59 | GCS | pearls | summary | "Reportar E_V_M_ siempre; intubados V='T'; mejor componente motor predice pronóstico; reevaluar pre/post-sedación" | ➖ no aplica | — | BTF 2016 §1; Teasdale Lancet Neurol 2014 | ⏳ | ⏳ |
| 60 | GCS | pearls | details | "1) E_V_M_ siempre (ej GCS 9 = E2 V3 M4). 2) Intubado V='T', total no comparable. 3) Sedados: pre-sedación o suspensión transitoria. 4) Motor mejor predictor (M1-3 grave, M4-6 leve-mod). 5) Variabilidad V3 vs V2. 6) <5a usar pGCS pediátrico. 7) Motor unilateral: usar el mejor lado, no promediar (BTF 2016)" | ➖ no aplica | — | BTF 2016 §1; Teasdale Lancet Neurol 2014 | ⏳ | ⏳ |

## Resumen estadístico

| Métrica | Valor |
|---|---|
| Piezas totales | 60 |
| Piezas con ✅ capa 1 (motor cubre nutrición/CR-XX) | 16 |
| Piezas con ➖ capa 1 (motor no cubre — capa 2 obligatoria) | 44 |
| Escalas con CR-XX cross-reference en pearls | eGFR (CR-02), KDIGO (CR-02), NYHA (ic_nyha_3-4), CHA₂DS₂-VASc (CR-05), Child-Pugh (cirrosis_child_*), HAS-BLED (CR-05), GOLD (epoc_gold_3-4) — **7 de 10** |
| Escalas con GES Chile inline | eGFR, KDIGO, NYHA, GOLD — **4 de 10** (correcto según spec) |
| Conflictos detectados | 0 (en draft-1) |
| Total referencias | 27 únicas |

## Procedimiento siguiente

1. **GEroe revisa cada fila** (60) y marca columna "Acción": OK / CORREGIR: <texto> / ELIMINAR.
2. **Para piezas marcadas como `actionsByResult`** y dudosas, ejecutar prompt obligatorio en `EXTERNAL_AI_PROMPTS.md` (10 prompts totales — 1 por escala).
3. **Para piezas marcadas como `whenToUse` o `pearls`** y dudosas, ejecutar prompts opcionales (20 prompts totales — 2 por escala).
4. **Devolver tabla a Claude Code** con marcas finales.
5. **Claude Code aplica cambios al `scales.json`** (consume `CLINICAL_CONTENT_DRAFT.json` + correcciones).
6. **Claude Code extiende `ui-list.js` + `styles.css`** para renderizar las 3 secciones.
7. **80/80 + 354/354 verificaciones** automáticas.
8. **Tests funcionales locales** + commit + tag `sprint-m4b11-complete`.
