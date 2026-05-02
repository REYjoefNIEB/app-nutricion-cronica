// =================================================================
// [AGENTE 04 — Tablas Clínicas] (Sprint M4-B-1)
// Modal flotante reusable para Tablas Clínicas (vía iframe).
//
// Decisión técnica: usar iframe que carga /doctor/tablas/.
//   - Pro: cero duplicación de lógica, sandboxing automático, mismo
//     comportamiento que la página dedicada.
//   - Trade-off: pequeño overhead de carga del iframe (aceptable MVP).
//
// Uso desde otros módulos:
//   window.NuraTablasModal.open();
//   window.NuraTablasModal.close();
//
// Patrón: script regular. Construye el DOM al primer open(); persiste
// el iframe entre open/close para conservar estado del usuario.
// =================================================================

(function () {
    'use strict';

    let modal = null;

    function build() {
        modal = document.createElement('div');
        modal.id = 'tablas-modal-overlay';
        modal.className = 'tablas-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Tablas Clínicas');

        const content = document.createElement('div');
        content.className = 'tablas-modal-content';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'tablas-modal-close';
        closeBtn.setAttribute('aria-label', 'Cerrar');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', close);

        const iframe = document.createElement('iframe');
        iframe.className = 'tablas-modal-iframe';
        iframe.title = 'Tablas Clínicas';
        // Path relativo desde el dashboard (frontend/doctor/dashboard/) → frontend/doctor/tablas/
        iframe.src = '../tablas/index.html';

        content.appendChild(closeBtn);
        content.appendChild(iframe);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Cerrar al click sobre el overlay (fuera del content)
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        // Cerrar con Esc (listener global, se mantiene activo porque es ligero)
        document.addEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            close();
        }
    }

    function open() {
        if (!modal) build();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('[TablasModal] Opened');
    }

    function close() {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            console.log('[TablasModal] Closed');
        }
    }

    if (typeof window !== 'undefined') {
        window.NuraTablasModal = { open, close };
    }
})();
