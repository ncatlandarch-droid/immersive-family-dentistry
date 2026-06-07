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

// Auto-initialize and seed on page load
document.addEventListener('DOMContentLoaded', () => {
    const fb = initFirebase();
    if (fb && fb.db) {
        // Auto-seed practice data if Firestore is empty
        if (typeof seedPracticeData === 'function') {
            seedPracticeData().then(seeded => {
                if (seeded) console.log('[Firebase] 🌱 Practice data seeded on first load!');
            }).catch(e => console.log('[Firebase] Seed check:', e.message));
        }
    }
});
