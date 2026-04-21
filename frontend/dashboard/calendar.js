// =================================================================
// NuraCalendar — Mi Calendario de Salud (Fase 4)
//
// Arquitectura: 100% frontend + Firestore directo.
// Sin Cloud Functions. Sin IA. Preparativos son datos estáticos.
//
// Colección Firestore: calendar_events/{uid}/events/{eventId}
//
// Tipos de evento:
//   cita_medica  → azul    (#3B82F6)
//   examen_lab   → verde   (#10B981)
//   medicamento  → morado  (#8B5CF6)
// =================================================================

// ── Base de datos estática: preparativos de exámenes ─────────────
const PREPARATIVOS_EXAMENES = {
    perfil_bioquimico: {
        nombre:        'Perfil Bioquímico',
        ayuno:         '9 horas',
        instrucciones: 'No comer ni beber nada excepto agua. Ayuno mínimo 9h, máximo 12h.',
        restricciones: null
    },
    perfil_lipidico: {
        nombre:        'Perfil Lipídico (Colesterol, HDL, LDL, Triglicéridos)',
        ayuno:         '9 horas',
        instrucciones: 'Ayuno estricto de 9 horas. No consumir alcohol 48h antes.',
        restricciones: ['alcohol']
    },
    glucosa_basal: {
        nombre:        'Glucosa en Ayunas',
        ayuno:         '8–12 horas',
        instrucciones: 'Ayuno mínimo 8h, máximo 12h. Solo agua.',
        restricciones: null
    },
    glucosa_ptgo: {
        nombre:        'Curva de Tolerancia a la Glucosa (PTGO)',
        ayuno:         '8–12 horas',
        instrucciones: 'Ayuno 8–12h. El examen dura 2–3 horas. Traer algo para leer.',
        restricciones: null
    },
    hemograma: {
        nombre:        'Hemograma Completo',
        ayuno:         'Sin ayuno',
        instrucciones: 'No requiere ayuno. Se puede comer normalmente.',
        restricciones: null
    },
    perfil_hepatico: {
        nombre:        'Perfil Hepático',
        ayuno:         '6 horas',
        instrucciones: 'Ayuno de 6 horas. Evitar alcohol 48h antes.',
        restricciones: ['alcohol']
    },
    hormonas_tiroides: {
        nombre:        'Hormonas Tiroideas (TSH, T3, T4)',
        ayuno:         'Sin ayuno',
        instrucciones: 'No requiere ayuno. Si toma levotiroxina, tomarla ANTES del examen.',
        restricciones: null
    },
    vitamina_d: {
        nombre:        '25-OH Vitamina D',
        ayuno:         '6 horas',
        instrucciones: 'Ayuno de 6 horas.',
        restricciones: null
    },
    vitamina_b12: {
        nombre:        'Vitamina B12',
        ayuno:         '6 horas',
        instrucciones: 'Ayuno de 6 horas.',
        restricciones: null
    },
    creatinina: {
        nombre:        'Creatinina',
        ayuno:         'Sin ayuno',
        instrucciones: 'No requiere ayuno. Evitar ejercicio intenso 24h antes.',
        restricciones: ['ejercicio_intenso']
    },
    orina_completa: {
        nombre:        'Orina Completa',
        ayuno:         'Sin ayuno',
        instrucciones: 'Recoger la primera orina de la mañana. Higiene genital previa. Llevar al lab antes de 2 horas.',
        restricciones: null
    },
    urocultivo: {
        nombre:        'Urocultivo',
        ayuno:         'Sin ayuno',
        instrucciones: 'Primera orina de la mañana. Higiene genital previa. No haber tomado antibióticos en las últimas 48h.',
        restricciones: ['antibioticos_48h']
    },
    psa: {
        nombre:        'Antígeno Prostático (PSA)',
        ayuno:         'Sin ayuno',
        instrucciones: 'No haber tenido actividad sexual ni ciclismo 48h antes. No haber tenido examen rectal reciente.',
        restricciones: ['actividad_sexual_48h', 'ciclismo_48h']
    },
    hemorragias_ocultas: {
        nombre:        'Hemorragias Ocultas en Deposición',
        ayuno:         'Sin ayuno',
        instrucciones: 'No ingerir alcohol, vitamina C ni aspirina durante el período de recolección. Llevar muestra antes de 24h.',
        restricciones: ['alcohol', 'vitamina_c', 'aspirina']
    },
    vhs: {
        nombre:        'VHS (Velocidad de Eritrosedimentación)',
        ayuno:         '4–6 horas',
        instrucciones: 'Ayuno mínimo 4h, máximo 6h.',
        restricciones: null
    },
    acido_folico: {
        nombre:        'Ácido Fólico',
        ayuno:         '6 horas',
        instrucciones: 'Ayuno de 6 horas.',
        restricciones: null
    },
    insulina: {
        nombre:        'Insulina Basal / Curva de Insulina',
        ayuno:         '8–12 horas',
        instrucciones: 'Ayuno 8–12h. No exceder 12h de ayuno.',
        restricciones: null
    },
    cortisol: {
        nombre:        'Cortisol AM',
        ayuno:         'Sin ayuno',
        instrucciones: 'Tomar la muestra entre 7:00 y 9:00 AM. Evitar estrés antes.',
        restricciones: ['estres']
    },
    clearance_creatinina: {
        nombre:        'Clearance de Creatinina (Orina 24h)',
        ayuno:         'Sin ayuno',
        instrucciones: 'Recoger TODA la orina de 24 horas en un frasco limpio. Refrigerar durante la recolección. Llevar al lab al completar.',
        restricciones: null
    },
    pcr: {
        nombre:        'Proteína C Reactiva (PCR)',
        ayuno:         'Sin ayuno',
        instrucciones: 'No requiere ayuno.',
        restricciones: null
    },
    electrolitos: {
        nombre:        'Electrolitos Plasmáticos (Na, K, Cl)',
        ayuno:         'Sin ayuno',
        instrucciones: 'No requiere ayuno.',
        restricciones: null
    }
};

// ── Nombres de meses en español ───────────────────────────────────
const MESES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const MESES_GENITIVO = [
    'enero','febrero','marzo','abril','mayo','junio',
    'julio','agosto','septiembre','octubre','noviembre','diciembre'
];

// ── Estado del módulo ─────────────────────────────────────────────
var _calYear, _calMonth, _selectedDay = null;
var _allEvents   = [];
var _fsApi       = null;
var _calUser     = null;

// =================================================================
// Bootstrap
// =================================================================
document.addEventListener('DOMContentLoaded', function () {
    var now  = new Date();
    _calYear = now.getFullYear();
    _calMonth= now.getMonth(); // 0-indexed

    _renderCalendar();
    _bindNavButtons();
    _bindAddEventButton();
    _bindModalListeners();
    _populateExamenDropdown();

    // Obtener usuario y cargar eventos
    var firebase = window.NuraFirebase;
    if (firebase && firebase.auth) {
        var user = firebase.auth.currentUser;
        if (user) {
            _calUser = user;
            _loadMonthEvents();
        } else {
            firebase.auth.onAuthStateChanged(function (u) {
                if (u) { _calUser = u; _loadMonthEvents(); }
            });
        }
    }
});

// =================================================================
// Renderizado del mini calendario mensual
// =================================================================
function _renderCalendar() {
    var grid  = document.getElementById('cal-grid');
    var label = document.getElementById('cal-month-label');
    if (!grid || !label) return;

    label.textContent = MESES[_calMonth] + ' ' + _calYear;

    // Índice del primer día (lunes=0 … domingo=6)
    var firstDow = new Date(_calYear, _calMonth, 1).getDay();
    firstDow = firstDow === 0 ? 6 : firstDow - 1;

    var daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
    var today       = new Date();
    var isCurMonth  = today.getFullYear() === _calYear && today.getMonth() === _calMonth;

    // Agrupar eventos por día del mes
    var byDay = {};
    _allEvents.forEach(function (ev) {
        if (!ev.fecha) return;
        var d = new Date(ev.fecha);
        if (d.getFullYear() === _calYear && d.getMonth() === _calMonth) {
            var day = d.getDate();
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(ev);
        }
    });

    // Eliminar celdas anteriores (mantener los 7 headers)
    grid.querySelectorAll('.cal-cell').forEach(function (c) { c.remove(); });

    // Celdas vacías antes del primer día
    for (var i = 0; i < firstDow; i++) {
        var blank = document.createElement('div');
        blank.className = 'cal-cell cal-cell--empty';
        grid.appendChild(blank);
    }

    // Celdas de días
    for (var d = 1; d <= daysInMonth; d++) {
        (function (day) {
            var cell = document.createElement('div');
            cell.className = 'cal-cell';
            if (isCurMonth && day === today.getDate()) cell.classList.add('cal-cell--today');
            if (_selectedDay === day) cell.classList.add('cal-cell--selected');

            var num = document.createElement('span');
            num.className   = 'cal-cell-num';
            num.textContent = day;
            cell.appendChild(num);

            var dayEvs = byDay[day] || [];
            if (dayEvs.length > 0) {
                var dots = document.createElement('div');
                dots.className = 'cal-dots';
                var types = [];
                dayEvs.forEach(function (ev) {
                    if (types.indexOf(ev.tipo) === -1) types.push(ev.tipo);
                });
                types.slice(0, 3).forEach(function (tipo) {
                    var dot = document.createElement('span');
                    dot.className = 'cal-dot cal-dot--' + tipo;
                    dots.appendChild(dot);
                });
                cell.appendChild(dots);
            }

            cell.addEventListener('click', function () {
                _selectedDay = day;
                _renderCalendar();
                _renderDayPanel(day, dayEvs);
            });
            grid.appendChild(cell);
        })(d);
    }
}

// =================================================================
// Panel de eventos del día seleccionado
// =================================================================
function _renderDayPanel(day, events) {
    var panel = document.getElementById('cal-day-events');
    var title = document.getElementById('cal-day-title');
    var list  = document.getElementById('cal-events-list');
    if (!panel || !list) return;

    title.textContent = day + ' de ' + MESES_GENITIVO[_calMonth];
    list.innerHTML = '';

    if (!events || events.length === 0) {
        list.innerHTML = '<p class="cal-no-events">Sin eventos este día.</p>';
    } else {
        events.forEach(function (ev) {
            list.appendChild(_buildEventCard(ev));
        });
    }
    panel.classList.remove('hidden');
}

// ── Tarjeta de evento individual ─────────────────────────────────
function _buildEventCard(ev) {
    var card = document.createElement('div');
    card.className = 'cal-event-card cal-event--' + ev.tipo;

    var hora = '';
    if (ev.fecha) {
        try {
            hora = new Date(ev.fecha).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {}
    }

    var DOT = { cita_medica: '🔵', examen_lab: '🟢', medicamento: '🟣' };

    // Preparativo (solo exámenes)
    var prepHtml = '';
    if (ev.tipo === 'examen_lab' && ev.metadata && ev.metadata.preparativo) {
        var prep = PREPARATIVOS_EXAMENES[ev.metadata.preparativo];
        if (prep) {
            prepHtml = '<p class="cal-event-prep"><strong>🕐 Ayuno:</strong> ' + prep.ayuno + '</p>' +
                       '<p class="cal-event-instrucciones">' + prep.instrucciones + '</p>';
        }
    }

    // Horarios (medicamentos recurrentes)
    var horariosHtml = '';
    if (ev.tipo === 'medicamento' && ev.horarios && ev.horarios.length > 0) {
        horariosHtml = '<p class="cal-event-horarios">🕐 ' + ev.horarios.join(' · ') + ' — ' + (ev.frecuencia || 'diario') + '</p>';
    }

    var switchHtml = '';
    if (ev.tipo === 'medicamento') {
        switchHtml = '<label class="cal-switch" title="' + (ev.activo ? 'Activa' : 'Pausada') + '">' +
                     '<input type="checkbox" class="cal-switch-input" ' + (ev.activo ? 'checked' : '') + ' data-id="' + ev._id + '">' +
                     '<span class="cal-switch-track"></span>' +
                     '</label>';
    }

    card.innerHTML =
        '<div class="cal-event-header">' +
            '<span class="cal-event-emoji">' + (DOT[ev.tipo] || '⚪') + '</span>' +
            '<div class="cal-event-info">' +
                '<strong class="cal-event-title">' + (ev.titulo || 'Evento') + '</strong>' +
                (hora ? '<span class="cal-event-hora">' + hora + '</span>' : '') +
            '</div>' +
            switchHtml +
            '<button class="cal-event-delete" title="Eliminar" aria-label="Eliminar evento">✕</button>' +
        '</div>' +
        prepHtml +
        horariosHtml +
        '<div class="cal-event-actions">' +
            '<button class="cal-event-ics" title="Descargar .ics">📥 Agregar a calendario</button>' +
            '<a class="cal-event-gcal" href="' + _googleCalendarURL(ev) + '" target="_blank" rel="noopener">📅 Google Calendar</a>' +
        '</div>';

    // Event listeners
    var delBtn = card.querySelector('.cal-event-delete');
    if (delBtn) {
        delBtn.addEventListener('click', function () { _deleteEvent(ev._id); });
    }
    var icsBtn = card.querySelector('.cal-event-ics');
    if (icsBtn) {
        icsBtn.addEventListener('click', function () { _downloadICS(ev); });
    }
    var sw = card.querySelector('.cal-switch-input');
    if (sw) {
        sw.addEventListener('change', function (e) { _toggleAlarm(ev._id, e.target.checked); });
    }

    return card;
}

// =================================================================
// Navegación del calendario (← →)
// =================================================================
function _bindNavButtons() {
    var prevBtn = document.getElementById('cal-prev');
    var nextBtn = document.getElementById('cal-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            _calMonth--;
            if (_calMonth < 0) { _calMonth = 11; _calYear--; }
            _selectedDay = null;
            var panel = document.getElementById('cal-day-events');
            if (panel) panel.classList.add('hidden');
            _loadMonthEvents();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            _calMonth++;
            if (_calMonth > 11) { _calMonth = 0; _calYear++; }
            _selectedDay = null;
            var panel = document.getElementById('cal-day-events');
            if (panel) panel.classList.add('hidden');
            _loadMonthEvents();
        });
    }
}

// =================================================================
// Firestore: carga de eventos del mes
// =================================================================
async function _loadMonthEvents() {
    if (!_calUser) { _renderCalendar(); return; }
    try {
        var api = await _getFirestoreApi();
        var db  = window.NuraFirebase.db;
        var ref = api.collection(db, 'calendar_events', _calUser.uid, 'events');
        var snap = await api.getDocs(ref);
        _allEvents = [];
        snap.forEach(function (docSnap) {
            _allEvents.push(Object.assign({ _id: docSnap.id }, docSnap.data()));
        });
    } catch (e) {
        console.warn('[NuraCalendar] No se pudo cargar eventos:', e.message);
    }
    _renderCalendar();
    // Re-render panel si había un día seleccionado
    if (_selectedDay !== null) {
        var dayEvs = _allEvents.filter(function (ev) {
            if (!ev.fecha) return false;
            var d = new Date(ev.fecha);
            return d.getDate() === _selectedDay && d.getMonth() === _calMonth && d.getFullYear() === _calYear;
        });
        _renderDayPanel(_selectedDay, dayEvs);
    }
}

// ── Guardar evento ────────────────────────────────────────────────
async function _saveEvent(eventData) {
    if (!_calUser) throw new Error('Sesión no disponible. Inicia sesión para guardar eventos.');
    var api = await _getFirestoreApi();
    var db  = window.NuraFirebase.db;
    var ref = api.collection(db, 'calendar_events', _calUser.uid, 'events');
    var docRef = await api.addDoc(ref, Object.assign({}, eventData, {
        created_at: new Date().toISOString()
    }));
    return docRef.id;
}

// ── Eliminar evento ───────────────────────────────────────────────
async function _deleteEvent(eventId) {
    if (!_calUser) return;
    if (!confirm('¿Eliminar este evento?')) return;
    try {
        var api = await _getFirestoreApi();
        var db  = window.NuraFirebase.db;
        await api.deleteDoc(api.doc(db, 'calendar_events', _calUser.uid, 'events', eventId));
        await _loadMonthEvents();
    } catch (e) {
        console.error('[NuraCalendar] Error al eliminar:', e.message);
        alert('No se pudo eliminar el evento. Verifica tu conexión.');
    }
}

// ── Toggle alarma de medicamento ──────────────────────────────────
async function _toggleAlarm(eventId, active) {
    if (!_calUser || !eventId) return;
    try {
        var api = await _getFirestoreApi();
        var db  = window.NuraFirebase.db;
        await api.updateDoc(api.doc(db, 'calendar_events', _calUser.uid, 'events', eventId), { activo: active });
        var ev = _allEvents.find(function (e) { return e._id === eventId; });
        if (ev) ev.activo = active;
        console.info('[NuraCalendar] Alarma', eventId, active ? 'activada' : 'pausada');
    } catch (e) {
        console.error('[NuraCalendar] Error toggle alarma:', e.message);
    }
}

// =================================================================
// Exportación ICS
// =================================================================
function _generateICS(ev) {
    var pad    = function (n) { return String(n).padStart(2, '0'); };
    var fecha  = ev.fecha ? new Date(ev.fecha) : new Date();
    var y = fecha.getFullYear(), mo = fecha.getMonth() + 1, d = fecha.getDate();
    var h = fecha.getHours(), mi = fecha.getMinutes();
    var dtStart = '' + y + pad(mo) + pad(d) + 'T' + pad(h) + pad(mi) + '00';

    var fechaFin = new Date(fecha.getTime() + 60 * 60 * 1000);
    var yf = fechaFin.getFullYear(), mof = fechaFin.getMonth() + 1, df = fechaFin.getDate();
    var hf = fechaFin.getHours(), mif = fechaFin.getMinutes();
    var dtEnd = '' + yf + pad(mof) + pad(df) + 'T' + pad(hf) + pad(mif) + '00';

    var uid  = 'nura-' + (ev._id || Date.now()) + '@nura-app';
    var desc = '';
    if (ev.tipo === 'examen_lab' && ev.metadata && ev.metadata.preparativo) {
        var prep = PREPARATIVOS_EXAMENES[ev.metadata.preparativo];
        if (prep) desc = prep.instrucciones;
    } else if (ev.metadata && ev.metadata.lugar) {
        desc = ev.metadata.lugar;
    }

    // Alarma: 2h antes para citas/exámenes, sin alarma para medicamentos
    var alarmBlock = '';
    if (ev.tipo !== 'medicamento') {
        alarmBlock = 'BEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Recordatorio: ' + (ev.titulo || 'Evento Nura') + '\r\nEND:VALARM';
    }

    var lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Nura App//Calendario de Salud//ES',
        'BEGIN:VEVENT',
        'UID:' + uid,
        'DTSTART:' + dtStart,
        'DTEND:' + dtEnd,
        'SUMMARY:' + (ev.titulo || 'Evento Nura'),
        desc      ? 'DESCRIPTION:' + desc.replace(/\n/g, '\\n') : '',
        ev.metadata && ev.metadata.lugar ? 'LOCATION:' + ev.metadata.lugar : '',
        alarmBlock,
        'END:VEVENT',
        'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    return lines;
}

function _downloadICS(ev) {
    var ics  = _generateICS(ev);
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'nura-' + (ev.titulo || 'evento').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =================================================================
// URL de Google Calendar
// =================================================================
function _googleCalendarURL(ev) {
    if (!ev.fecha) return '#';
    try {
        var pad   = function (n) { return String(n).padStart(2, '0'); };
        var fecha = new Date(ev.fecha);
        var y = fecha.getFullYear(), mo = fecha.getMonth() + 1, d = fecha.getDate();
        var h = fecha.getHours(), mi = fecha.getMinutes();
        var fechaFin = new Date(fecha.getTime() + 60 * 60 * 1000);
        var yf = fechaFin.getFullYear(), mof = fechaFin.getMonth() + 1, df = fechaFin.getDate();
        var hf = fechaFin.getHours(), mif = fechaFin.getMinutes();
        var dates = '' + y + pad(mo) + pad(d) + 'T' + pad(h) + pad(mi) + '00' +
                    '/' + yf + pad(mof) + pad(df) + 'T' + pad(hf) + pad(mif) + '00';

        var desc = '';
        if (ev.tipo === 'examen_lab' && ev.metadata && ev.metadata.preparativo) {
            var prep = PREPARATIVOS_EXAMENES[ev.metadata.preparativo];
            if (prep) desc = prep.instrucciones;
        }

        var params = new URLSearchParams({
            text:     ev.titulo || 'Evento Nura',
            dates:    dates,
            details:  desc,
            location: (ev.metadata && ev.metadata.lugar) ? ev.metadata.lugar : ''
        });
        return 'https://calendar.google.com/calendar/r/eventedit?' + params.toString();
    } catch (e) {
        return '#';
    }
}

// =================================================================
// Modal de nuevo evento
// =================================================================
function _bindAddEventButton() {
    var btn = document.getElementById('btn-add-event');
    if (btn) btn.addEventListener('click', _openModal);
}

function _openModal() {
    var modal = document.getElementById('cal-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    _calSwitchTab('cita_medica');

    // Fecha por defecto: día seleccionado o hoy
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var defDay  = _selectedDay || new Date().getDate();
    var defDate = _calYear + '-' + pad(_calMonth + 1) + '-' + pad(defDay);
    modal.querySelectorAll('.cal-input-date').forEach(function (el) { el.value = defDate; });
    modal.querySelectorAll('.cal-input-time').forEach(function (el) { if (!el.value) el.value = '09:00'; });

    _prefillMedicamentos();
}

function _closeModal() {
    var modal = document.getElementById('cal-modal');
    if (modal) modal.classList.add('hidden');
}

function _bindModalListeners() {
    var closeBtn = document.getElementById('cal-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', _closeModal);

    var overlay = document.getElementById('cal-modal');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) _closeModal();
        });
    }

    // Tabs
    document.querySelectorAll('.cal-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            _calSwitchTab(tab.dataset.tab);
        });
    });

    // Selector de tipo de examen → mostrar preparativo
    var examenSel = document.getElementById('cal-examen-tipo');
    if (examenSel) examenSel.addEventListener('change', _updatePreparativoPreview);

    // Sugerencia de medicamento desde perfil
    var medSugeridos = document.getElementById('cal-med-sugeridos');
    if (medSugeridos) {
        medSugeridos.addEventListener('change', function () {
            var input = document.getElementById('cal-med-nombre');
            if (input && medSugeridos.value) {
                input.value = medSugeridos.value.charAt(0).toUpperCase() + medSugeridos.value.slice(1);
            }
        });
    }

    // Guardar evento
    var saveBtn = document.getElementById('btn-save-event');
    if (saveBtn) saveBtn.addEventListener('click', _handleSaveEvent);
}

function _calSwitchTab(tab) {
    document.querySelectorAll('.cal-tab').forEach(function (t) {
        t.classList.toggle('cal-tab--active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.cal-tab-content').forEach(function (c) {
        c.classList.toggle('hidden', c.dataset.tab !== tab);
    });
    if (tab === 'examen_lab') _updatePreparativoPreview();
}

function _updatePreparativoPreview() {
    var sel  = document.getElementById('cal-examen-tipo');
    var prev = document.getElementById('cal-preparativo-preview');
    if (!sel || !prev) return;
    var prep = PREPARATIVOS_EXAMENES[sel.value];
    if (prep) {
        prev.innerHTML =
            '<strong>🕐 Ayuno:</strong> ' + prep.ayuno + '<br>' +
            '<span>' + prep.instrucciones + '</span>';
        prev.classList.remove('hidden');
    } else {
        prev.classList.add('hidden');
    }
}

// ── Poblar dropdown de exámenes ───────────────────────────────────
function _populateExamenDropdown() {
    var sel = document.getElementById('cal-examen-tipo');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleccionar examen —</option>';
    Object.entries(PREPARATIVOS_EXAMENES).forEach(function (entry) {
        var id = entry[0], data = entry[1];
        var opt = document.createElement('option');
        opt.value       = id;
        opt.textContent = data.nombre;
        sel.appendChild(opt);
    });
}

// ── Prefill medicamentos desde Escudo Farmacológico ───────────────
function _prefillMedicamentos() {
    var sel = document.getElementById('cal-med-sugeridos');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Seleccionar del perfil —</option>';
    if (window.NuraMedSelector && typeof window.NuraMedSelector.getSelected === 'function') {
        var meds = window.NuraMedSelector.getSelected();
        meds.forEach(function (med) {
            var opt = document.createElement('option');
            opt.value       = med;
            opt.textContent = med.charAt(0).toUpperCase() + med.slice(1);
            sel.appendChild(opt);
        });
    }
}

// ── Guardar evento desde modal ────────────────────────────────────
async function _handleSaveEvent() {
    var activeTab = document.querySelector('.cal-tab--active');
    if (!activeTab) return;
    var tab = activeTab.dataset.tab;

    var btn = document.getElementById('btn-save-event');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

    try {
        var eventData = null;
        var pad = function (n) { return String(n).padStart(2, '0'); };

        if (tab === 'cita_medica') {
            var fecha  = document.getElementById('cal-cita-fecha')?.value;
            var hora   = document.getElementById('cal-cita-hora')?.value  || '09:00';
            var titulo = (document.getElementById('cal-cita-titulo')?.value || '').trim() || 'Cita médica';
            var doctor = document.getElementById('cal-cita-doctor')?.value || '';
            var lugar  = document.getElementById('cal-cita-lugar')?.value  || '';

            if (!fecha) throw new Error('Indica la fecha de la cita.');
            var fechaISO = fecha + 'T' + hora + ':00';
            var alarm1   = new Date(new Date(fechaISO).getTime() - 86400000).toISOString(); // 24h antes
            var alarm2   = new Date(new Date(fechaISO).getTime() -  7200000).toISOString(); //  2h antes

            eventData = {
                tipo: 'cita_medica', titulo, fecha: fechaISO,
                recurrente: false, frecuencia: null, activo: true,
                hora_alarma_1: alarm1, hora_alarma_2: alarm2,
                metadata: { doctor, lugar, especialidad: '', examen_tipo: null, preparativo: null }
            };

        } else if (tab === 'examen_lab') {
            var fechaE = document.getElementById('cal-examen-fecha')?.value;
            var horaE  = document.getElementById('cal-examen-hora')?.value  || '08:00';
            var tipo   = document.getElementById('cal-examen-tipo')?.value;
            var prep   = tipo ? PREPARATIVOS_EXAMENES[tipo] : null;
            var tituloE= prep ? prep.nombre : 'Examen de laboratorio';

            if (!fechaE) throw new Error('Indica la fecha del examen.');
            var fechaISOE = fechaE + 'T' + horaE + ':00';
            var alarm1E   = new Date(new Date(fechaISOE).getTime() - 86400000).toISOString();

            eventData = {
                tipo: 'examen_lab', titulo: tituloE, fecha: fechaISOE,
                recurrente: false, frecuencia: null, activo: true,
                hora_alarma_1: alarm1E,
                metadata: { examen_tipo: tipo || null, preparativo: tipo || null }
            };

        } else if (tab === 'medicamento') {
            var nombre     = (document.getElementById('cal-med-nombre')?.value || '').trim();
            var hora1      = document.getElementById('cal-med-hora1')?.value;
            var hora2      = document.getElementById('cal-med-hora2')?.value;
            var frecuencia = document.getElementById('cal-med-frecuencia')?.value || 'diario';
            var fechaM     = document.getElementById('cal-med-fecha')?.value;

            if (!nombre) throw new Error('Indica el nombre del medicamento.');
            if (!hora1)  throw new Error('Indica al menos un horario de toma.');

            var horarios  = [hora1, hora2].filter(Boolean);
            var today2    = new Date();
            var defFecha  = fechaM || (today2.getFullYear() + '-' + pad(today2.getMonth() + 1) + '-' + pad(today2.getDate()));
            var fechaISOM = defFecha + 'T' + hora1 + ':00';

            eventData = {
                tipo: 'medicamento', titulo: nombre, fecha: fechaISOM,
                recurrente: true, frecuencia, activo: true,
                horarios,
                metadata: {
                    medicamento_id: nombre.toLowerCase().replace(/\s+/g, '_'),
                    examen_tipo: null, preparativo: null
                }
            };
        }

        if (!eventData) throw new Error('Tipo de evento no reconocido.');

        await _saveEvent(eventData);
        _closeModal();
        await _loadMonthEvents();

    } catch (e) {
        alert(e.message || 'Error al guardar el evento. Verifica tu conexión.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar evento'; }
    }
}

// =================================================================
// Carga lazy del SDK de Firestore (mismo patrón que app.js)
// =================================================================
async function _getFirestoreApi() {
    if (_fsApi) return _fsApi;
    var mod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    _fsApi = mod;
    return _fsApi;
}
