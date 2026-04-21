(function () {
    var FASES_CLINICAS = {
        insuficiencia_renal_cronica: {
            titulo: '¿Cuál es tu estadio de ERC?',
            clasificacion: 'KDIGO',
            fases: [
                { id: 'erc_estadio_1',  label: 'Estadio 1',  desc: 'TFG >90' },
                { id: 'erc_estadio_2',  label: 'Estadio 2',  desc: 'TFG 60-89' },
                { id: 'erc_estadio_3a', label: 'Estadio 3a', desc: 'TFG 45-59' },
                { id: 'erc_estadio_3b', label: 'Estadio 3b', desc: 'TFG 30-44' },
                { id: 'erc_estadio_4',  label: 'Estadio 4',  desc: 'TFG 15-29' },
                { id: 'erc_estadio_5',  label: 'Estadio 5',  desc: 'TFG <15' }
            ]
        },
        insuficiencia_cardiaca: {
            titulo: '¿Cuál es tu clase funcional?',
            clasificacion: 'NYHA',
            fases: [
                { id: 'ic_nyha_1', label: 'Clase I',   desc: 'Sin síntomas' },
                { id: 'ic_nyha_2', label: 'Clase II',  desc: 'Síntomas con esfuerzo' },
                { id: 'ic_nyha_3', label: 'Clase III', desc: 'Mínimo esfuerzo' },
                { id: 'ic_nyha_4', label: 'Clase IV',  desc: 'En reposo' }
            ]
        },
        cirrosis: {
            titulo: '¿Cuál es tu clasificación de cirrosis?',
            clasificacion: 'Child-Pugh',
            fases: [
                { id: 'cirrosis_child_a', label: 'Child A', desc: 'Compensada' },
                { id: 'cirrosis_child_b', label: 'Child B', desc: 'Moderada' },
                { id: 'cirrosis_child_c', label: 'Child C', desc: 'Severa' }
            ]
        },
        diabetes_t2: {
            titulo: '¿Tienes alguna complicación diabética?',
            clasificacion: 'Complicación',
            fases: [
                { id: 'diabetes_t2_con_nefropatia',    label: 'Nefropatía',     desc: 'Daño renal' },
                { id: 'diabetes_t2_con_neuropatia',    label: 'Neuropatía',     desc: 'Daño nervioso' },
                { id: 'diabetes_t2_con_retinopatia',   label: 'Retinopatía',    desc: 'Daño ocular' },
                { id: 'diabetes_t2_con_gastroparesia', label: 'Gastroparesia',  desc: 'Vaciamiento lento' },
                { id: 'diabetes_t2_descompensada',     label: 'Descompensada',  desc: 'HbA1c >9%' }
            ]
        },
        epoc: {
            titulo: '¿Cuál es tu estadio GOLD?',
            clasificacion: 'GOLD',
            fases: [
                { id: 'epoc_gold_1', label: 'GOLD 1', desc: 'Leve (FEV1 ≥80%)' },
                { id: 'epoc_gold_2', label: 'GOLD 2', desc: 'Moderado (50-79%)' },
                { id: 'epoc_gold_3', label: 'GOLD 3', desc: 'Grave (30-49%)' },
                { id: 'epoc_gold_4', label: 'GOLD 4', desc: 'Muy grave (<30%)' }
            ]
        },
        crohn: {
            titulo: '¿Cómo está tu Crohn actualmente?',
            clasificacion: 'Actividad',
            fases: [
                { id: 'crohn_remision',       label: 'Remisión',       desc: 'Sin síntomas' },
                { id: 'crohn_brote_leve',     label: 'Brote leve',     desc: '' },
                { id: 'crohn_brote_severo',   label: 'Brote severo',   desc: '' },
                { id: 'crohn_posquirurgico',  label: 'Post-quirúrgico', desc: '' }
            ]
        },
        colitis_ulcerosa: {
            titulo: '¿Cómo está tu Colitis Ulcerosa?',
            clasificacion: 'Mayo Score',
            fases: [
                { id: 'cu_remision',            label: 'Remisión',           desc: 'Sin síntomas' },
                { id: 'cu_brote_leve_moderado', label: 'Brote leve/moderado', desc: '' },
                { id: 'cu_brote_severo',        label: 'Brote severo',       desc: '' }
            ]
        },
        cancer_tratamiento: {
            titulo: '¿En qué etapa estás?',
            clasificacion: 'Estadio',
            fases: [
                { id: 'cancer_tratamiento_temprano', label: 'Tratamiento temprano', desc: '' },
                { id: 'cancer_metastasico',          label: 'Metastásico',          desc: '' },
                { id: 'cancer_remision_vigilancia',  label: 'Remisión/Vigilancia',  desc: '' },
                { id: 'cancer_cuidados_paliativos',  label: 'Cuidados paliativos',  desc: '' }
            ]
        },
        embarazo: {
            titulo: '¿En qué etapa estás?',
            clasificacion: 'Trimestre',
            fases: [
                { id: 'embarazo_t1',        label: '1er Trimestre',      desc: 'Semanas 1-13' },
                { id: 'embarazo_t2',        label: '2do Trimestre',      desc: 'Semanas 14-27' },
                { id: 'embarazo_t3',        label: '3er Trimestre',      desc: 'Semanas 28-40' },
                { id: 'puerperio_lactancia', label: 'Puerperio/Lactancia', desc: 'Post-parto' }
            ]
        },
        artritis_reumatoide: {
            titulo: '¿Cómo está tu artritis actualmente?',
            clasificacion: 'DAS28',
            fases: [
                { id: 'ar_remision',                 label: 'Remisión',              desc: 'Sin actividad' },
                { id: 'ar_actividad_moderada_alta',  label: 'Actividad moderada/alta', desc: '' }
            ]
        },
        lupus: {
            titulo: '¿Cómo está tu Lupus actualmente?',
            clasificacion: 'SLEDAI',
            fases: [
                { id: 'lupus_remision',     label: 'Remisión',        desc: '' },
                { id: 'lupus_brote',        label: 'Brote activo',    desc: '' },
                { id: 'lupus_con_nefritis', label: 'Con nefritis',    desc: 'Daño renal' }
            ]
        },
        dialisis: {
            titulo: '¿Qué tipo de diálisis recibes?',
            clasificacion: 'Modalidad',
            fases: [
                { id: 'dialisis_hemodialisis', label: 'Hemodiálisis',       desc: '' },
                { id: 'dialisis_peritoneal',   label: 'Diálisis peritoneal', desc: '' }
            ]
        },
        transplante_renal: {
            titulo: '¿Cuánto tiempo desde el trasplante?',
            clasificacion: 'Tiempo',
            fases: [
                { id: 'trasplante_post_inmediato',  label: '<3 meses',     desc: 'Post-operatorio' },
                { id: 'trasplante_estable',         label: '3-12 meses',   desc: 'Estable' },
                { id: 'trasplante_mantenimiento',   label: '>12 meses',    desc: 'Mantenimiento' }
            ]
        }
    };

    // Reverse map: faseId → parentId
    var FASE_PARENT = {};
    Object.keys(FASES_CLINICAS).forEach(function (parentId) {
        FASES_CLINICAS[parentId].fases.forEach(function (f) {
            FASE_PARENT[f.id] = parentId;
        });
    });

    window.NURA_FASES_CLINICAS = FASES_CLINICAS;
    window.NURA_FASE_PARENT    = FASE_PARENT;
})();
