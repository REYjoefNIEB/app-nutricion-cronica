// =================================================================
// [LÓGICO BACKEND] firebase-config.js
// Puente de conexión a Firebase — NuraApp
// Versión SDK: Firebase JS v10.12.2 (pinned — evita breaking changes)
//
// NOTA PARA AUDITOR MÉDICO:
//   1. API KEY: Las claves web de Firebase son identificadores
//      públicos por diseño (no secretos). La seguridad real se
//      aplica mediante Firebase Security Rules en la consola.
//      ACCIÓN REQUERIDA: Verificar que las reglas de Firestore
//      y Auth NO estén en modo `allow read, write: if true`.
//
//   2. GITIGNORE: El proyecto no tiene .gitignore. Esta clave
//      quedará expuesta en control de versiones. Se recomienda
//      crear .gitignore o usar Firebase App Check en producción.
//
//   3. CARGA EN HTML: Este archivo es un ES Module y debe
//      incluirse con <script type="module" src="..."> en cada
//      index.html. Los app.js regulares leen window.NuraFirebase
//      dentro de DOMContentLoaded, respetando el orden de carga.
// =================================================================

import { initializeApp } from
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

import { getFirestore } from
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { getAuth } from
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// -----------------------------------------------------------------
// Configuración del proyecto Firebase (provisionada por CEO)
// Aprobado por Auditor Médico — 2026-04-02
// -----------------------------------------------------------------
const firebaseConfig = {
    apiKey:            'AIzaSyBHbW2MhsykW-sILe3b_l3BxlwOhU592hY',
    authDomain:        'nura-33fc1.firebaseapp.com',
    projectId:         'nura-33fc1',
    storageBucket:     'nura-33fc1.firebasestorage.app',
    messagingSenderId: '633661739137',
    appId:             '1:633661739137:web:bd808ce441f731a9f37d80'
};

// -----------------------------------------------------------------
// Inicialización de servicios Firebase
// -----------------------------------------------------------------
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// -----------------------------------------------------------------
// Exportación al scope global
// Patrón: window.NuraFirebase — permite que los app.js regulares
// (no-módulos) accedan a los servicios sin necesidad de import.
// Leer SIEMPRE dentro de DOMContentLoaded para respetar el orden
// de ejecución del módulo diferido.
// -----------------------------------------------------------------
window.NuraFirebase = Object.freeze({ app, db, auth });

console.log('[NuraFirebase] Servicios inicializados:', {
    projectId: firebaseConfig.projectId,
    auth:  !!auth,
    db:    !!db
});
