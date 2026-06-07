/* ═══════════════════════════════════════════════════════════
   Firebase Database Module — Replaces all Neon serverless functions
   Direct client-side Firestore access 🔥
   
   Collections:
     practice_settings/{key}  → office_hours, pricing, insurance, contact, staff
     appointments/{autoId}    → patient bookings
   ═══════════════════════════════════════════════════════════ */

// ─── Practice Settings ───

async function getSettings(key) {
    const { db } = initFirebase();
    if (!db) return null;
    
    try {
        if (key) {
            const doc = await db.collection('practice_settings').doc(key).get();
            return doc.exists ? doc.data().value : null;
        }
        // Return all settings as object
        const snapshot = await db.collection('practice_settings').get();
        const settings = {};
        snapshot.forEach(doc => {
            settings[doc.id] = doc.data().value;
        });
        return settings;
    } catch (e) {
        console.error('[Firestore] getSettings error:', e);
        return null;
    }
}

async function saveSetting(key, value) {
    const { db } = initFirebase();
    if (!db) return false;
    
    try {
        await db.collection('practice_settings').doc(key).set({
            value,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error('[Firestore] saveSetting error:', e);
        return false;
    }
}

// ─── Appointments ───

async function createAppointment(data) {
    const { db } = initFirebase();
    if (!db) return null;
    
    try {
        const appt = {
            patient_name: data.patient_name || '',
            patient_phone: data.patient_phone || '',
            patient_email: data.patient_email || '',
            reason: data.reason || 'General inquiry',
            preferred_date: data.preferred_date || 'Flexible',
            insurance_provider: data.insurance_provider || 'None',
            status: 'pending',
            notes: '',
            source: data.source || 'paloma-chat',
            lang: data.lang || 'en',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('appointments').add(appt);
        console.log('[Firestore] ✅ Appointment created:', docRef.id);
        return { id: docRef.id, ...appt };
    } catch (e) {
        console.error('[Firestore] createAppointment error:', e);
        return null;
    }
}

async function listAppointments(filters = {}) {
    const { db } = initFirebase();
    if (!db) return [];
    
    try {
        let query = db.collection('appointments').orderBy('created_at', 'desc');
        
        if (filters.status) {
            query = query.where('status', '==', filters.status);
        }
        if (filters.email) {
            query = query.where('patient_email', '==', filters.email);
        }
        if (filters.limit) {
            query = query.limit(filters.limit);
        } else {
            query = query.limit(50);
        }
        
        const snapshot = await query.get();
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        return appointments;
    } catch (e) {
        console.error('[Firestore] listAppointments error:', e);
        return [];
    }
}

// Real-time listener for admin dashboard
function onAppointmentsChanged(callback, filters = {}) {
    const { db } = initFirebase();
    if (!db) return () => {};
    
    let query = db.collection('appointments').orderBy('created_at', 'desc').limit(100);
    
    return query.onSnapshot(snapshot => {
        const appointments = [];
        snapshot.forEach(doc => {
            appointments.push({ id: doc.id, ...doc.data() });
        });
        callback(appointments);
    }, err => {
        console.error('[Firestore] onAppointmentsChanged error:', err);
    });
}

async function updateAppointment(id, updates) {
    const { db } = initFirebase();
    if (!db) return false;
    
    try {
        await db.collection('appointments').doc(id).update({
            ...updates,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('[Firestore] ✅ Appointment updated:', id);
        return true;
    } catch (e) {
        console.error('[Firestore] updateAppointment error:', e);
        return false;
    }
}

async function deleteAppointment(id) {
    const { db } = initFirebase();
    if (!db) return false;
    
    try {
        await db.collection('appointments').doc(id).delete();
        return true;
    } catch (e) {
        console.error('[Firestore] deleteAppointment error:', e);
        return false;
    }
}

// ─── Seed Practice Data (run once from admin) ───

async function seedPracticeData() {
    const { db } = initFirebase();
    if (!db) return false;
    
    const existing = await db.collection('practice_settings').doc('contact').get();
    if (existing.exists) {
        console.log('[Firestore] Practice data already seeded');
        return false;
    }
    
    console.log('[Firestore] 🌱 Seeding practice data...');
    const batch = db.batch();
    const col = db.collection('practice_settings');
    
    batch.set(col.doc('office_hours'), { value: {
        monday: { open: "8:00 AM", close: "5:00 PM", closed: false },
        tuesday: { open: "8:00 AM", close: "5:00 PM", closed: false },
        wednesday: { open: "8:00 AM", close: "5:00 PM", closed: false },
        thursday: { open: "8:00 AM", close: "3:00 PM", closed: false },
        friday: { open: "", close: "", closed: true },
        saturday: { open: "", close: "", closed: true },
        sunday: { open: "", close: "", closed: true },
    }, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    
    batch.set(col.doc('pricing'), { value: [
        { name: "New Patient Exam + X-rays", price: 199, category: "General" },
        { name: "Routine Cleaning", price: 150, category: "General" },
        { name: "Deep Cleaning (per quadrant)", price: 300, category: "General" },
        { name: "Porcelain Crown", price: 1200, category: "Restorative" },
        { name: "Dental Implant (single)", price: 3500, category: "Implants" },
        { name: "All-on-4 Implants", price: 18000, category: "Implants" },
        { name: "All-on-6 Implants", price: 24000, category: "Implants" },
        { name: "Teeth Whitening", price: 350, category: "Cosmetic" },
        { name: "Veneer (per tooth)", price: 1500, category: "Cosmetic" },
        { name: "Digital Smile Design", price: 500, category: "Cosmetic" },
        { name: "Root Canal", price: 900, category: "Restorative" },
        { name: "Night Guard", price: 400, category: "General" },
        { name: "Emergency Visit", price: 175, category: "Emergency" },
        { name: "Same-Day Crown", price: 1400, category: "Restorative" },
        { name: "Bone Graft", price: 800, category: "Implants" },
        { name: "Extraction (simple)", price: 250, category: "General" },
        { name: "Extraction (surgical)", price: 450, category: "General" },
    ], updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    
    batch.set(col.doc('insurance'), { value: [
        "Delta Dental", "Cigna", "Aetna", "MetLife",
        "UnitedHealthcare", "Guardian", "BlueCross BlueShield",
        "Humana", "Principal", "Lincoln Financial",
    ], updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    
    batch.set(col.doc('staff'), { value: [
        { name: "Dr. Christian Brenes", role: "Prosthodontist / Owner", bio: "Board-certified specialist, UNC Chapel Hill graduate, digital dentistry pioneer" },
        { name: "PALOMA", role: "AI Dental Health Guide", bio: "24/7 bilingual assistant powered by MouthMap" },
    ], updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    
    batch.set(col.doc('contact'), { value: {
        phone: "(336) 545-4281",
        email: "contact@ljfamilydentist.com",
        address: "Lake Jeanette area, Greensboro, NC",
        website: "https://immersive-family-dentistry.netlify.app",
        emergency: "For dental emergencies after hours, call (336) 545-4281 or go to your nearest ER.",
    }, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    
    batch.set(col.doc('practice_info'), { value: {
        name: "Lake Jeanette Family & Implant Dentistry",
        tagline: "Intelligence-Driven Systemic Wellness",
        new_patient_message: "Welcome! Your first visit includes a comprehensive exam with digital X-rays and a 3D scan. Dr. Brenes will create a personalized treatment plan just for you.",
        payment_options: [
            "We accept most major dental insurance plans",
            "In-house payment plans for major procedures",
            "CareCredit financing available",
            "We submit claims on your behalf",
        ],
    }, updated_at: firebase.firestore.FieldValue.serverTimestamp() });
    
    await batch.commit();
    console.log('[Firestore] ✅ Practice data seeded successfully!');
    return true;
}

// ─── Auth Helpers ───

async function signInAdmin(email, password) {
    const { auth } = initFirebase();
    if (!auth) return null;
    
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        console.log('[Auth] ✅ Admin signed in:', cred.user.email);
        return cred.user;
    } catch (e) {
        console.error('[Auth] Sign in error:', e.message);
        return null;
    }
}

function signOut() {
    const { auth } = initFirebase();
    if (auth) auth.signOut();
}

function onAuthChanged(callback) {
    const { auth } = initFirebase();
    if (!auth) return () => {};
    return auth.onAuthStateChanged(callback);
}

function getCurrentUser() {
    const { auth } = initFirebase();
    return auth ? auth.currentUser : null;
}
