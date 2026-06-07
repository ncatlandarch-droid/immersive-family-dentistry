/* ═══════════════════════════════════════════════════════════
   Firebase Configuration — Paloma Dental Platform 🕊️🔥
   Project: paloma-590b6
   Account: chris@thinkdesignplanning.com
   ═══════════════════════════════════════════════════════════ */

const firebaseConfig = {
    apiKey: "AIzaSyBQx0FT_ebBOlAIa97Q9xMUL7lXSgY4xyw",
    authDomain: "paloma-590b6.firebaseapp.com",
    projectId: "paloma-590b6",
    storageBucket: "paloma-590b6.firebasestorage.app",
    messagingSenderId: "585497796477",
    appId: "1:585497796477:web:c068e748ea534f7854f614",
    measurementId: "G-QF3KST2DNW"
};

// Singleton instances
let _app, _db, _auth;

function initFirebase() {
    if (_app) return { app: _app, db: _db, auth: _auth };

    if (typeof firebase === 'undefined') {
        console.error('[Firebase] SDK not loaded yet');
        return null;
    }

    _app = firebase.initializeApp(firebaseConfig);
    _db = firebase.firestore();
    _auth = firebase.auth();

    console.log('[Firebase] ✅ Initialized — project:', firebaseConfig.projectId);
    return { app: _app, db: _db, auth: _auth };
}

// Expose globally
window.firebaseConfig = firebaseConfig;
window.initFirebase = initFirebase;

// Auto-initialize (no auto-seed — dashboard uses its own demo data)
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
});
