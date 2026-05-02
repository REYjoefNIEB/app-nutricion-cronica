// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-A)
// Vista Lista — render acordeón + búsqueda + calculadora reactiva.
//
// Patrón: script regular. Expone window.NuraTablas.UIList.
// Dependencias: window.NuraTablas.Calculators y .UnitConverter.
// =================================================================

(function () {
    'use strict';

    /**
     * Estado compartido por la vista. Se reinicia con renderList().
     */
    const state = {
        scales: [],          // array de scale objects (de scales.json)
        currentInputs: {},   // { [scaleId]: { [inputId]: { rawValue, currentUnit } } }
        expandedId: null,    // id de la escala actualmente expandida
        validationStatus: 'pending'  // 'pending' | 'verified'
    };

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────
    function el(tag, attrs, children) {
        const e = document.createElement(tag);
        if (attrs) {
            for (const k of Object.keys(attrs)) {
                if (k === 'class')      e.className = attrs[k];
                else if (k === 'text')  e.textContent = attrs[k];
                else if (k === 'html')  e.innerHTML = attrs[k];
                else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
                else                    e.setAttribute(k, attrs[k]);
            }
        }
        if (children) {
            for (const c of children) {
                if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
            }
        }
        return e;
    }

    function debounce(fn, ms) {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    function normalize(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function matchesQuery(scale, q) {
        if (!q) return true;
        const nq = normalize(q);
        const haystack = [
            scale.name,
            scale.fullName,
            scale.description,
            scale.specialtyDisplay,
            ...(scale.synonyms || [])
        ].map(normalize).join(' ');
        return haystack.includes(nq);
    }

    // ─────────────────────────────────────────────────────────────
    // Render principal
    // ─────────────────────────────────────────────────────────────
    function renderList(scalesData, container, validationStatus) {
        state.scales = scalesData.scales || [];
        state.validationStatus = validationStatus || scalesData.validationStatus || 'pending';
        state.currentInputs = {};
        state.expandedId = null;

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                renderScales(container, e.target.value);
            }, 200));
        }

        renderScales(container, '');
    }

    function renderScales(container, query) {
        container.innerHTML = '';
        const filtered = state.scales.filter(s => matchesQuery(s, query));

        if (filtered.length === 0) {
            container.appendChild(el('p', { class: 'no-results', text: `No se encontraron escalas para "${query}".` }));
            return;
        }

        filtered.forEach(scale => container.appendChild(renderScaleCard(scale)));
    }

    function renderScaleCard(scale) {
        const isExpanded = state.expandedId === scale.id;

        const header = el('button', {
            class: 'scale-header' + (isExpanded ? ' expanded' : ''),
            type: 'button',
            'aria-expanded': isExpanded ? 'true' : 'false',
            onclick: () => toggleExpand(scale.id)
        }, [
            el('div', { class: 'scale-header-main' }, [
                el('span', { class: 'scale-arrow', text: isExpanded ? '▾' : '▸' }),
                el('span', { class: 'scale-name', text: scale.name })
            ]),
            el('span', { class: 'scale-specialty', text: scale.specialtyDisplay })
        ]);

        const card = el('div', { class: 'scale-card', 'data-scale-id': scale.id }, [header]);

        if (isExpanded) {
            card.appendChild(renderScaleBody(scale));
        }

        return card;
    }

    function toggleExpand(scaleId) {
        state.expandedId = (state.expandedId === scaleId) ? null : scaleId;
        const container = document.getElementById('scales-list');
        const search = document.getElementById('search-input');
        renderScales(container, search ? search.value : '');
    }

    function renderScaleBody(scale) {
        const body = el('div', { class: 'scale-body' });

        // Descripción
        if (scale.description) {
            body.appendChild(el('p', { class: 'scale-description', text: scale.description }));
        }

        // Tabla de referencia
        body.appendChild(renderReferenceTable(scale));

        // Calculadora (si tiene inputs)
        if (scale.inputs && scale.inputs.length > 0) {
            body.appendChild(renderCalculator(scale));
        }

        // Footer (paper + validación)
        body.appendChild(renderScaleFooter(scale));

        return body;
    }

    function renderReferenceTable(scale) {
        const wrap = el('div', { class: 'reference-table-wrap' });
        wrap.appendChild(el('h4', { class: 'section-title', text: 'Tabla de referencia' }));
        const table = el('table', { class: 'reference-table' });
        const thead = el('thead', null, [
            el('tr', null, [
                el('th', { text: 'Categoría' }),
                el('th', { text: 'Rango' }),
                el('th', { text: 'Interpretación' })
            ])
        ]);
        table.appendChild(thead);
        const tbody = el('tbody');
        (scale.referenceTable || []).forEach(row => {
            tbody.appendChild(el('tr', { class: `ref-row ref-${row.color || 'neutral'}` }, [
                el('td', { class: 'ref-label', text: row.label }),
                el('td', { class: 'ref-range', text: row.range }),
                el('td', { class: 'ref-interp', text: row.interpretation })
            ]));
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        return wrap;
    }

    function renderCalculator(scale) {
        const wrap = el('div', { class: 'calculator-wrap' });
        wrap.appendChild(el('h4', { class: 'section-title', text: 'Calculadora' }));

        const inputsContainer = el('div', { class: 'calc-inputs' });
        const resultContainer = el('div', { class: 'calc-result' });

        // Inicializar estado de inputs para esta escala
        state.currentInputs[scale.id] = state.currentInputs[scale.id] || {};

        scale.inputs.forEach(input => {
            inputsContainer.appendChild(renderInput(scale, input, () => {
                recalculate(scale, resultContainer);
            }));
        });

        wrap.appendChild(inputsContainer);
        wrap.appendChild(resultContainer);

        // Cálculo inicial con defaults
        setTimeout(() => recalculate(scale, resultContainer), 0);

        return wrap;
    }

    function renderInput(scale, input, onChange) {
        const group = el('div', { class: 'input-group' });
        group.appendChild(el('label', { for: `input-${scale.id}-${input.id}`, text: input.label }));

        const wrapper = el('div', { class: 'input-with-units' });

        if (input.type === 'number') {
            const numInput = el('input', {
                type: 'number',
                id: `input-${scale.id}-${input.id}`,
                min: input.min,
                max: input.max,
                step: input.step,
                value: input.default
            });
            numInput.addEventListener('input', () => {
                const v = parseFloat(numInput.value);
                const cur = state.currentInputs[scale.id][input.id] || {};
                cur.rawValue = v;
                cur.currentUnit = cur.currentUnit || (input.unitDefault || input.unit);
                state.currentInputs[scale.id][input.id] = cur;
                checkRangeWarning(input, numInput, group, cur.currentUnit);
                onChange();
            });
            wrapper.appendChild(numInput);

            // Inicializar estado
            state.currentInputs[scale.id][input.id] = {
                rawValue: input.default,
                currentUnit: input.unitDefault || input.unit
            };

            // Toggle de unidades (si aplica)
            if (input.unitOptions && input.unitOptions.length > 1) {
                const sel = el('select', { class: 'unit-toggle', id: `unit-${scale.id}-${input.id}` });
                input.unitOptions.forEach(u => {
                    sel.appendChild(el('option', { value: u.value, text: u.label }));
                });
                sel.value = input.unitDefault;
                sel.addEventListener('change', () => {
                    const cur = state.currentInputs[scale.id][input.id];
                    const oldUnit = cur.currentUnit;
                    const newUnit = sel.value;
                    if (oldUnit !== newUnit) {
                        const converter = window.NuraTablas.UnitConverter;
                        const converted = converter.convert(cur.rawValue, oldUnit, newUnit, input.id);
                        const rounded = Math.round(converted * 100) / 100;
                        cur.rawValue = rounded;
                        cur.currentUnit = newUnit;
                        numInput.value = rounded;
                        checkRangeWarning(input, numInput, group, newUnit);
                        onChange();
                    }
                });
                wrapper.appendChild(sel);
            } else if (input.unit) {
                wrapper.appendChild(el('span', { class: 'unit-label', text: input.unit }));
            }
        } else if (input.type === 'select') {
            const sel = el('select', { id: `input-${scale.id}-${input.id}` });
            input.options.forEach(o => {
                sel.appendChild(el('option', { value: o.value, text: o.label }));
            });
            sel.value = input.default;
            state.currentInputs[scale.id][input.id] = { rawValue: input.default };
            sel.addEventListener('change', () => {
                state.currentInputs[scale.id][input.id].rawValue = sel.value;
                onChange();
            });
            wrapper.appendChild(sel);
        } else if (input.type === 'checkbox') {
            const lbl = el('label', { class: 'checkbox-inline' });
            const cb = el('input', { type: 'checkbox', id: `input-${scale.id}-${input.id}` });
            if (input.default) cb.checked = true;
            state.currentInputs[scale.id][input.id] = { rawValue: !!input.default };
            cb.addEventListener('change', () => {
                state.currentInputs[scale.id][input.id].rawValue = cb.checked;
                // Manejo de exclusión (CHA2DS2-VASc: age75 vs age65_74)
                if (cb.checked && input.exclusiveWith) {
                    const otherId = input.exclusiveWith;
                    const otherEl = document.getElementById(`input-${scale.id}-${otherId}`);
                    if (otherEl && otherEl.checked) {
                        otherEl.checked = false;
                        if (state.currentInputs[scale.id][otherId]) {
                            state.currentInputs[scale.id][otherId].rawValue = false;
                        }
                    }
                }
                onChange();
            });
            const pointsBadge = (input.points !== undefined) ? ` (+${input.points})` : '';
            lbl.appendChild(cb);
            lbl.appendChild(document.createTextNode(' ' + input.label + pointsBadge));
            wrapper.appendChild(lbl);
        }

        group.appendChild(wrapper);

        if (input.helpText) {
            group.appendChild(el('p', { class: 'help-text', text: input.helpText }));
        }
        if (input.examples) {
            group.appendChild(el('p', { class: 'examples-text', text: input.examples }));
        }

        const warningEl = el('div', { class: 'warning-out-of-range', hidden: 'hidden' });
        group.appendChild(warningEl);

        return group;
    }

    function checkRangeWarning(input, numInputEl, groupEl, currentUnit) {
        const warningEl = groupEl.querySelector('.warning-out-of-range');
        if (!warningEl || !input.warningRange) return;

        const v = parseFloat(numInputEl.value);
        if (!isFinite(v)) {
            warningEl.hidden = true;
            return;
        }

        // Si la unidad actual difiere de la base, convertir el valor a base para chequear
        let valueInBase = v;
        const baseUnit = (input.unitOptions && input.unitOptions[0]?.value) || input.unit;
        if (currentUnit && baseUnit && currentUnit !== baseUnit && window.NuraTablas?.UnitConverter) {
            valueInBase = window.NuraTablas.UnitConverter.toBase(v, currentUnit, input.id);
        }

        const wr = input.warningRange;
        let isOut = false;
        if (wr.below !== undefined && valueInBase < wr.below) isOut = true;
        if (wr.above !== undefined && valueInBase > wr.above) isOut = true;

        if (isOut) {
            warningEl.textContent = '⚠ ' + (wr.message || 'Valor fuera de rango clínico habitual.');
            warningEl.hidden = false;
        } else {
            warningEl.hidden = true;
        }
    }

    function recalculate(scale, resultContainer) {
        const fnName = scale.calculatorFn;
        const fn = window.NuraTablas.Calculators[fnName];
        if (!fn) {
            resultContainer.innerHTML = '';
            resultContainer.appendChild(el('p', { class: 'calc-error', text: `Calculadora no implementada: ${fnName}` }));
            return;
        }

        const cur = state.currentInputs[scale.id] || {};
        const inputsForFn = {};
        const converter = window.NuraTablas.UnitConverter;

        scale.inputs.forEach(inputDef => {
            const entry = cur[inputDef.id];
            if (!entry) return;
            let v = entry.rawValue;
            // Convertir a unidad base si aplica
            if (inputDef.type === 'number' && inputDef.unitOptions && entry.currentUnit) {
                const baseUnit = inputDef.unitOptions[0].value;
                if (entry.currentUnit !== baseUnit && converter) {
                    v = converter.toBase(v, entry.currentUnit, inputDef.id);
                }
            }
            inputsForFn[inputDef.id] = v;
        });

        const r = fn(inputsForFn);
        renderResult(scale, r, resultContainer);
    }

    function renderResult(scale, result, container) {
        container.innerHTML = '';

        if (result.error) {
            container.appendChild(el('p', { class: 'calc-error', text: '⚠ ' + result.error }));
            return;
        }

        const card = el('div', { class: 'result-card result-' + (result.categoryColor || 'neutral') });
        const valLine = el('div', { class: 'result-value' }, [
            el('span', { class: 'result-num', text: String(result.value) }),
            result.unit ? el('span', { class: 'result-unit', text: ' ' + result.unit }) : null
        ]);
        card.appendChild(valLine);
        card.appendChild(el('div', { class: 'result-category-line' }, [
            el('span', { class: 'badge badge-' + (result.categoryColor || 'neutral'), text: result.category })
        ]));
        card.appendChild(el('p', { class: 'result-interpretation', text: result.interpretation }));

        if (scale.clinicalDisclaimer) {
            card.appendChild(el('p', { class: 'result-disclaimer', text: scale.clinicalDisclaimer }));
        }
        if (state.validationStatus === 'verified' && scale.footerNote) {
            card.appendChild(el('p', { class: 'result-validation', text: '✓ ' + scale.footerNote }));
        }

        container.appendChild(card);
    }

    function renderScaleFooter(scale) {
        const footer = el('div', { class: 'scale-footer' });
        if (scale.reference) {
            const link = el('a', {
                href: scale.reference.url || '#',
                target: '_blank',
                rel: 'noopener noreferrer',
                class: 'paper-link',
                text: scale.reference.paper
            });
            footer.appendChild(el('p', { class: 'paper-cite' }, [
                el('span', { text: 'Fuente: ' }),
                link
            ]));
        }
        return footer;
    }

    // ─────────────────────────────────────────────────────────────
    // [Sprint M4-B-1] API pública: expandScale(scaleId)
    //
    // Expande la escala identificada por `scaleId` y hace scroll suave
    // a su posición. Reusable desde Command Palette (Ctrl+K) y futuro
    // workflow de patología (M4-B-2).
    //
    // Contrato:
    //   - Si scaleId existe en state.scales: cambia state.expandedId,
    //     re-renderiza, hace scrollIntoView smooth, y devuelve true.
    //   - Si scaleId NO existe: loggea warning y devuelve false (no rompe).
    //   - Si renderList aún no fue llamado (state.scales vacío): devuelve false.
    //
    // @param {string} scaleId - id de la escala a expandir
    // @returns {boolean} true si se expandió, false si scaleId inválido
    // ─────────────────────────────────────────────────────────────
    function expandScale(scaleId) {
        if (!scaleId) return false;
        if (!state.scales || state.scales.length === 0) {
            console.warn('[UIList] expandScale: lista vacía, todavía no inicializada');
            return false;
        }
        const exists = state.scales.some(s => s.id === scaleId);
        if (!exists) {
            console.warn('[UIList] expandScale: scaleId no existe:', scaleId);
            return false;
        }
        state.expandedId = scaleId;
        const container = document.getElementById('scales-list');
        const searchInput = document.getElementById('search-input');
        // Limpiar búsqueda para asegurar que la escala sea visible (no filtrada).
        if (searchInput) searchInput.value = '';
        renderScales(container, '');

        // Scroll suave al elemento expandido (post-render)
        setTimeout(() => {
            const target = document.querySelector(`[data-scale-id="${scaleId}"]`);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);

        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // Exposición
    // ─────────────────────────────────────────────────────────────
    if (typeof window !== 'undefined') {
        window.NuraTablas = window.NuraTablas || {};
        window.NuraTablas.UIList = { renderList, expandScale };
    }
})();
