// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-B-1)
// Command Palette Ctrl+K (Cmd+K en Mac).
//
// Atajo de búsqueda rápida de escalas. Reusable desde dashboard y
// página de tablas. En M4-B-2 se extenderá con patologías.
//
// Patrón: script regular. Expone window.NuraCommandPalette.
// API: { init(scales), open(), close(), toggle() }.
// =================================================================

(function () {
    'use strict';

    let palette = null;
    let scales = [];
    let selectedIndex = 0;
    let initialized = false;

    /**
     * Inicializa el palette con la lista de escalas. Debe llamarse una
     * vez tras cargar scales.json. Si se llama varias veces, sobrescribe.
     *
     * @param {Array} scalesList - lista de objetos scale (de scales.json)
     */
    function init(scalesList) {
        scales = Array.isArray(scalesList) ? scalesList : [];
        if (initialized) return;
        initialized = true;

        document.addEventListener('keydown', (e) => {
            // Ctrl+K (Win/Linux) o Cmd+K (Mac)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                toggle();
                return;
            }
            // Esc cierra (solo si está abierto)
            if (e.key === 'Escape' && palette && palette.classList.contains('active')) {
                close();
            }
        });

        console.log('[CommandPalette] Initialized with', scales.length, 'escalas');
    }

    function build() {
        palette = document.createElement('div');
        palette.id = 'command-palette';
        palette.className = 'command-palette';
        palette.setAttribute('role', 'dialog');
        palette.setAttribute('aria-modal', 'true');
        palette.setAttribute('aria-label', 'Buscar escala');

        const overlay = document.createElement('div');
        overlay.className = 'command-palette-overlay';

        const box = document.createElement('div');
        box.className = 'command-palette-box';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'command-palette-input';
        input.placeholder = 'Buscá una escala (KDIGO, NYHA, MELD, GCS, HAS-BLED...)';
        input.autocomplete = 'off';
        input.spellcheck = false;

        const results = document.createElement('div');
        results.className = 'command-palette-results';

        const hint = document.createElement('div');
        hint.className = 'command-palette-hint';
        hint.innerHTML = '<kbd>↑</kbd><kbd>↓</kbd> navegar · <kbd>↵</kbd> abrir · <kbd>Esc</kbd> cerrar';

        box.appendChild(input);
        box.appendChild(results);
        box.appendChild(hint);
        palette.appendChild(overlay);
        palette.appendChild(box);
        document.body.appendChild(palette);

        input.addEventListener('input', renderResults);
        input.addEventListener('keydown', handleKeyNav);
        overlay.addEventListener('click', close);
    }

    function open() {
        if (!palette) build();
        palette.classList.add('active');
        const input = palette.querySelector('.command-palette-input');
        input.value = '';
        input.focus();
        selectedIndex = 0;
        renderResults();
    }

    function close() {
        if (palette) palette.classList.remove('active');
    }

    function toggle() {
        if (!palette) build();
        if (palette.classList.contains('active')) close();
        else open();
    }

    function normalize(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function filteredScales(query) {
        if (!query) return scales;
        const nq = normalize(query);
        return scales.filter(s => {
            const haystack = [
                s.name, s.fullName, s.specialtyDisplay,
                ...(s.synonyms || [])
            ].map(normalize).join(' ');
            return haystack.includes(nq);
        });
    }

    function renderResults() {
        const input = palette.querySelector('.command-palette-input');
        const results = palette.querySelector('.command-palette-results');
        const list = filteredScales(input.value.trim()).slice(0, 8);

        if (list.length === 0) {
            results.innerHTML = '<div class="command-palette-empty">Sin resultados</div>';
            return;
        }

        // Cap selectedIndex al rango visible
        if (selectedIndex >= list.length) selectedIndex = list.length - 1;
        if (selectedIndex < 0) selectedIndex = 0;

        results.innerHTML = list.map((s, i) => {
            const sel = (i === selectedIndex) ? ' selected' : '';
            return `<div class="command-palette-item${sel}" data-id="${s.id}">
                <div class="command-palette-item-name">${s.name}</div>
                <div class="command-palette-item-meta">${s.fullName} · ${s.specialtyDisplay}</div>
            </div>`;
        }).join('');

        results.querySelectorAll('.command-palette-item').forEach((el) => {
            el.addEventListener('click', () => goToScale(el.dataset.id));
        });
    }

    function handleKeyNav(e) {
        const items = palette.querySelectorAll('.command-palette-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            renderResults();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            renderResults();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = items[selectedIndex];
            if (item) goToScale(item.dataset.id);
        }
    }

    function goToScale(scaleId) {
        close();
        const onTablasPage = window.location.pathname.includes('/doctor/tablas');
        if (onTablasPage) {
            // Estamos en /doctor/tablas/: usar API expuesta por UIList para expandir.
            const ui = window.NuraTablas && window.NuraTablas.UIList;
            if (ui && typeof ui.expandScale === 'function') {
                ui.expandScale(scaleId);
            } else {
                console.warn('[CommandPalette] UIList.expandScale no disponible — fallback a anchor');
                window.location.hash = scaleId;
            }
        } else {
            // Estamos en otra página (dashboard): redirigir a tablas con anchor.
            // Path relativo desde frontend/doctor/dashboard/ a frontend/doctor/tablas/
            window.location.href = '../tablas/index.html#' + scaleId;
        }
    }

    if (typeof window !== 'undefined') {
        window.NuraCommandPalette = { init, open, close, toggle };
    }
})();
