// =================================================================
// [Dashboard] Mis Patologías — chips + autocompletado + fases clínicas
// Persistencia: MedicalStorage + Firestore (enfermedades, pathology) sin pasar por onboarding.
// =================================================================

(function () {
    const DEBOUNCE_MS = 550;
    let _saveTimer = null;
    let _select = null;
    let _strings = null;
    let _outsideClickBound = false;

    function _mapFirestoreError(code) {
        const errors = {
            'permission-denied': 'Sin permiso para guardar. Verifica tu sesión.',
            unavailable: 'Firestore no disponible. Verifica tu conexión.',
            'deadline-exceeded': 'El servidor tardó demasiado. Intenta de nuevo.'
        };
        return errors[code] || 'Error al guardar en la nube. Intenta de nuevo.';
    }

    function _optByValue(select, value) {
        return Array.from(select.options).find(function (o) {
            return o.value === String(value);
        });
    }

    function _showStatus(el, msg, isError) {
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? 'var(--orange-strong, #e06c75)' : 'var(--success, #98c379)';
    }

    async function _persist(select) {
        const statusEl = document.getElementById('pathology-save-status');
        const values = Array.from(select.selectedOptions)
            .map(function (o) { return o.value; })
            .filter(function (v) { return v !== ''; });

        const pathology = values.length > 0 ? values[0] : 'none';
        const enfermedades = values;

        const cacheResult = await MedicalStorage.updateProfile({ pathology: pathology, enfermedades: enfermedades });
        if (!cacheResult.ok) {
            _showStatus(statusEl, cacheResult.error || _strings.pathologySaveError, true);
            return;
        }

        const auth = window.NuraFirebase.auth;
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
            _showStatus(statusEl, _strings.pathologySaveError, true);
            return;
        }

        try {
            const { doc, setDoc } = await import(
                'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
            );
            await setDoc(
                doc(window.NuraFirebase.db, 'users', user.uid),
                {
                    pathology: pathology,
                    enfermedades: enfermedades,
                    pathologyUpdatedAt: new Date().toISOString()
                },
                { merge: true }
            );
            _showStatus(statusEl, _strings.pathologySaveOk, false);
            setTimeout(function () {
                if (statusEl) statusEl.textContent = '';
            }, 2500);
        } catch (err) {
            console.error('[PathologyManager] Firestore:', err.code, err.message);
            _showStatus(statusEl, _mapFirestoreError(err.code), true);
        }
    }

    function _schedulePersist() {
        if (_saveTimer) clearTimeout(_saveTimer);
        const statusEl = document.getElementById('pathology-save-status');
        if (statusEl) {
            statusEl.textContent = _strings.pathologySaving;
            statusEl.style.color = 'var(--text-muted)';
        }
        _saveTimer = setTimeout(function () {
            _persist(_select);
        }, DEBOUNCE_MS);
    }

    // ── Fases Clínicas helpers ──────────────────────────────────────

    function _getFases() { return window.NURA_FASES_CLINICAS || {}; }
    function _getFaseParent() { return window.NURA_FASE_PARENT || {}; }

    function _renderFasesPanel(selectEl, noSeLabel) {
        const panel = document.getElementById('dashboard-fases-panel');
        if (!panel) return;

        const FASES = _getFases();
        const FASE_PARENT = _getFaseParent();

        const selectedValues = Array.from(selectEl.selectedOptions)
            .map(function (o) { return o.value; })
            .filter(function (v) { return v !== ''; });

        // parentId → selectedFaseId | null (null = parent itself selected = "no sé")
        const parentsToShow = {};
        selectedValues.forEach(function (val) {
            if (FASES[val]) {
                if (!(val in parentsToShow)) parentsToShow[val] = null;
            } else if (FASE_PARENT[val]) {
                parentsToShow[FASE_PARENT[val]] = val;
            }
        });

        const parentIds = Object.keys(parentsToShow);
        if (parentIds.length === 0) {
            panel.classList.add('hidden');
            panel.innerHTML = '';
            return;
        }

        panel.innerHTML = '';
        panel.classList.remove('hidden');

        parentIds.forEach(function (parentId, idx) {
            const config = FASES[parentId];
            if (!config) return;
            const selectedFaseId = parentsToShow[parentId];

            const section = document.createElement('div');
            section.className = 'fases-section';

            const title = document.createElement('p');
            title.className = 'fases-panel-title';
            title.textContent = config.titulo;

            const clsf = document.createElement('span');
            clsf.className = 'fases-panel-clasificacion';
            clsf.textContent = config.clasificacion;

            const wrap = document.createElement('div');
            wrap.className = 'fases-chips-wrap';

            config.fases.forEach(function (fase) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'fase-chip' + (selectedFaseId === fase.id ? ' selected' : '');
                btn.dataset.fase = fase.id;
                btn.dataset.parent = parentId;

                const nameSpan = document.createElement('span');
                nameSpan.textContent = fase.label;
                btn.appendChild(nameSpan);

                if (fase.desc) {
                    const desc = document.createElement('span');
                    desc.className = 'fase-chip-desc';
                    desc.textContent = fase.desc;
                    btn.appendChild(desc);
                }
                wrap.appendChild(btn);
            });

            const noSeBtn = document.createElement('button');
            noSeBtn.type = 'button';
            noSeBtn.className = 'fase-chip fase-no-se' + (selectedFaseId === null ? ' selected' : '');
            noSeBtn.dataset.fase = '__parent__';
            noSeBtn.dataset.parent = parentId;
            noSeBtn.textContent = noSeLabel || 'No sé mi estadio';
            wrap.appendChild(noSeBtn);

            section.appendChild(title);
            section.appendChild(clsf);
            section.appendChild(wrap);
            panel.appendChild(section);
        });

        panel.onclick = function (e) {
            const btn = e.target.closest('.fase-chip');
            if (!btn) return;
            const faseId = btn.dataset.fase;
            const parentId = btn.dataset.parent;
            const config = _getFases()[parentId];
            if (!config) return;

            if (faseId === '__parent__') {
                // "No sé mi estadio" → select parent, deselect all its fases
                const parentOpt = _optByValue(selectEl, parentId);
                if (parentOpt) { parentOpt.selected = true; deselectPlaceholder(); }
                config.fases.forEach(function (f) {
                    const o = _optByValue(selectEl, f.id);
                    if (o) o.selected = false;
                });
            } else {
                // Select fase, deselect parent and sibling fases
                const faseOpt = _optByValue(selectEl, faseId);
                if (faseOpt) { faseOpt.selected = true; deselectPlaceholder(); }
                const parentOpt = _optByValue(selectEl, parentId);
                if (parentOpt) parentOpt.selected = false;
                config.fases.forEach(function (f) {
                    if (f.id !== faseId) {
                        const o = _optByValue(selectEl, f.id);
                        if (o) o.selected = false;
                    }
                });
            }

            renderChips();
            _schedulePersist();
        };
    }

    // placeholder helpers (need outer-scope refs, bound after init)
    let deselectPlaceholder = function () {};
    let reselectPlaceholderIfEmpty = function () {};

    function renderChips() {
        if (!_select) return;
        const chipsContainer = document.getElementById('dashboard-pathology-chips');
        if (!chipsContainer) return;
        chipsContainer.innerHTML = '';
        Array.from(_select.selectedOptions).forEach(function (opt) {
            if (opt.value === '') return;
            const chip = document.createElement('div');
            chip.className = 'pathology-chip';
            const label = document.createElement('span');
            label.className = 'pathology-chip-label';
            label.textContent = opt.textContent;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pathology-chip-remove';
            btn.dataset.value = opt.value;
            btn.setAttribute('aria-label', _strings ? _strings.pathologyChipRemoveAria : '×');
            btn.innerHTML = '\u00D7';
            chip.appendChild(label);
            chip.appendChild(btn);
            chipsContainer.appendChild(chip);
        });
        _renderFasesPanel(_select, _strings ? _strings.fasesNoSeLabel : 'No sé mi estadio');
    }

    /**
     * @param {object} profile — perfil ya fusionado (caché / Firestore)
     * @param {object} i18n — claves: pathologyOptions, pathologySearchPlaceholder, ...
     */
    function init(profile, i18n) {
        _strings = i18n;
        const titleEl = document.getElementById('pathology-card-title');
        const hintEl = document.getElementById('pathology-card-hint');
        if (titleEl) titleEl.textContent = i18n.cardPathologiesTitle || '';
        if (hintEl) hintEl.textContent = i18n.cardPathologiesHint || '';

        const selectPathology = document.getElementById('dashboard-select-pathology');
        const pathologySearch = document.getElementById('dashboard-pathology-search');
        const suggestionsList = document.getElementById('dashboard-pathology-suggestions');
        const chipsContainer = document.getElementById('dashboard-pathology-chips');

        if (!selectPathology || !pathologySearch || !suggestionsList || !chipsContainer) return;

        _select = selectPathology;

        while (selectPathology.firstChild) selectPathology.removeChild(selectPathology.firstChild);

        const defaultOption = document.createElement('option');
        defaultOption.text = i18n.pathologyPlaceholder;
        defaultOption.value = '';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        selectPathology.appendChild(defaultOption);

        (i18n.pathologyOptions || []).forEach(function (opt) {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            selectPathology.appendChild(option);
        });

        pathologySearch.placeholder = i18n.pathologySearchPlaceholder;

        deselectPlaceholder = function () {
            const p = selectPathology.querySelector('option[value=""]');
            if (p) p.selected = false;
        };

        reselectPlaceholderIfEmpty = function () {
            const hasReal = Array.from(selectPathology.selectedOptions).some(function (o) {
                return o.value !== '';
            });
            if (!hasReal) {
                const p = selectPathology.querySelector('option[value=""]');
                if (p) p.selected = true;
            }
        };

        // Restore saved selections
        const ids = Array.isArray(profile.enfermedades) ? profile.enfermedades.slice() : [];
        if (ids.length === 0 && profile.pathology && profile.pathology !== 'none') {
            ids.push(profile.pathology);
        }
        const ph = selectPathology.querySelector('option[value=""]');
        if (ph) ph.selected = false;
        ids.forEach(function (id) {
            const o = _optByValue(selectPathology, id);
            if (o) o.selected = true;
        });
        if (Array.from(selectPathology.selectedOptions).filter(function (o) {
            return o.value !== '';
        }).length === 0 && ph) {
            ph.selected = true;
        }

        function getAvailableOptions() {
            return Array.from(selectPathology.options)
                .filter(function (opt) { return opt.value !== '' && !opt.disabled; })
                .map(function (opt) { return { value: opt.value, label: opt.textContent.trim() }; });
        }

        function setSuggestionsOpen(open) {
            pathologySearch.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        chipsContainer.onclick = function (e) {
            const btn = e.target.closest('.pathology-chip-remove');
            if (!btn) return;
            const valueToRemove = btn.getAttribute('data-value');
            const optionToDeselect = _optByValue(selectPathology, valueToRemove);
            if (optionToDeselect) optionToDeselect.selected = false;
            // If removed value is a parent, also deselect its fases; if a fase, also deselect parent
            const FASES = _getFases();
            const FASE_PARENT = _getFaseParent();
            if (FASES[valueToRemove]) {
                FASES[valueToRemove].fases.forEach(function (f) {
                    const o = _optByValue(selectPathology, f.id);
                    if (o) o.selected = false;
                });
            } else if (FASE_PARENT[valueToRemove]) {
                const parentOpt = _optByValue(selectPathology, FASE_PARENT[valueToRemove]);
                if (parentOpt) parentOpt.selected = false;
            }
            reselectPlaceholderIfEmpty();
            renderChips();
            _schedulePersist();
        };

        pathologySearch.oninput = function () {
            const raw = pathologySearch.value;
            const query = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            suggestionsList.innerHTML = '';

            if (query.length === 0) {
                suggestionsList.classList.add('hidden');
                setSuggestionsOpen(false);
                return;
            }

            const filtered = getAvailableOptions().filter(function (opt) {
                const cleanLabel = opt.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const o = _optByValue(selectPathology, opt.value);
                return cleanLabel.includes(query) && o && !o.selected;
            });

            if (filtered.length > 0) {
                filtered.forEach(function (opt) {
                    const li = document.createElement('li');
                    li.className = 'pathology-suggestion-item';
                    li.setAttribute('role', 'option');
                    li.textContent = opt.label;
                    li.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
                    li.addEventListener('click', function () {
                        const o = _optByValue(selectPathology, opt.value);
                        if (o) {
                            o.selected = true;
                            deselectPlaceholder();
                        }
                        pathologySearch.value = '';
                        suggestionsList.classList.add('hidden');
                        setSuggestionsOpen(false);
                        renderChips();
                        _schedulePersist();
                    });
                    suggestionsList.appendChild(li);
                });
                suggestionsList.classList.remove('hidden');
                setSuggestionsOpen(true);
            } else {
                suggestionsList.classList.add('hidden');
                setSuggestionsOpen(false);
            }
        };

        if (!_outsideClickBound) {
            _outsideClickBound = true;
            document.addEventListener('click', function (e) {
                if (!e.target.closest('#dashboard-pathology-field')) {
                    const sug = document.getElementById('dashboard-pathology-suggestions');
                    const inp = document.getElementById('dashboard-pathology-search');
                    if (sug) sug.classList.add('hidden');
                    if (inp) inp.setAttribute('aria-expanded', 'false');
                }
            });
        }

        renderChips();
    }

    window.NuraPathologyManager = { init: init };
})();
