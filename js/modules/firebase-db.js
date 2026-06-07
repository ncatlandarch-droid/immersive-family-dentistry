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

// ─── Seed Sample Schedule (run once for demo) ───

async function seedScheduleData() {
    const { db } = initFirebase();
    if (!db) return false;

    // Check if appointments already exist
    const existing = await db.collection('appointments').limit(1).get();
    if (!existing.empty) {
        console.log('[Firestore] Schedule data already exists');
        return false;
    }

    console.log('[Firestore] 📅 Seeding schedule data...');
    const batch = db.batch();
    const col = db.collection('appointments');

    // Helper: get a date string for N days from today
    const dateStr = (daysFromNow, hour, min = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + daysFromNow);
        d.setHours(hour, min, 0, 0);
        return d.toISOString();
    };

    // Helper: get day name
    const dayName = (daysFromNow) => {
        const d = new Date();
        d.setDate(d.getDate() + daysFromNow);
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    // Generate 2 weeks of realistic appointments
    const sampleAppointments = [
        // Today
        { patient_name: "Maria Gonzalez", patient_phone: "(336) 555-0101", patient_email: "maria.g@email.com", reason: "Routine Cleaning", preferred_date: dateStr(0, 8, 30), insurance_provider: "Delta Dental", status: "confirmed", duration: 60, notes: "Returning patient, anxious about cleaning" },
        { patient_name: "James Thompson", patient_phone: "(336) 555-0102", patient_email: "jthompson@email.com", reason: "Crown Consultation", preferred_date: dateStr(0, 10, 0), insurance_provider: "Cigna", status: "confirmed", duration: 45, notes: "Tooth #14 needs evaluation" },
        { patient_name: "Aisha Williams", patient_phone: "(336) 555-0103", patient_email: "aisha.w@email.com", reason: "New Patient Exam + X-rays", preferred_date: dateStr(0, 11, 0), insurance_provider: "MetLife", status: "confirmed", duration: 90, notes: "New patient referral from Dr. Patel" },
        { patient_name: "Robert Chen", patient_phone: "(336) 555-0104", patient_email: "rchen@email.com", reason: "Implant Follow-up", preferred_date: dateStr(0, 14, 0), insurance_provider: "UnitedHealthcare", status: "confirmed", duration: 30, notes: "6-month post-implant check" },

        // Tomorrow
        { patient_name: "Patricia Moore", patient_phone: "(336) 555-0105", patient_email: "pmoore@email.com", reason: "Deep Cleaning", preferred_date: dateStr(1, 8, 0), insurance_provider: "Aetna", status: "confirmed", duration: 90, notes: "Upper right quadrant" },
        { patient_name: "Carlos Rodriguez", patient_phone: "(336) 555-0106", patient_email: "carlos.r@email.com", reason: "Emergency - Broken Tooth", preferred_date: dateStr(1, 9, 30), insurance_provider: "None", status: "confirmed", duration: 60, notes: "Called in with broken molar" },
        { patient_name: "Linda Park", patient_phone: "(336) 555-0107", patient_email: "lpark@email.com", reason: "Teeth Whitening", preferred_date: dateStr(1, 13, 0), insurance_provider: "Guardian", status: "confirmed", duration: 60, notes: "In-office whitening treatment" },

        // Day after tomorrow
        { patient_name: "David Martinez", patient_phone: "(336) 555-0108", patient_email: "dmartinez@email.com", reason: "All-on-4 Consultation", preferred_date: dateStr(2, 9, 0), insurance_provider: "BlueCross BlueShield", status: "confirmed", duration: 90, notes: "Comprehensive implant evaluation" },
        { patient_name: "Sarah Johnson", patient_phone: "(336) 555-0109", patient_email: "sjohnson@email.com", reason: "Routine Cleaning", preferred_date: dateStr(2, 11, 0), insurance_provider: "Delta Dental", status: "confirmed", duration: 60, notes: "" },
        { patient_name: "Michael Brown", patient_phone: "(336) 555-0110", patient_email: "mbrown@email.com", reason: "Root Canal", preferred_date: dateStr(2, 14, 0), insurance_provider: "MetLife", status: "confirmed", duration: 90, notes: "Tooth #19, referred from endodontist" },

        // 3 days out
        { patient_name: "Emily Davis", patient_phone: "(336) 555-0111", patient_email: "edavis@email.com", reason: "Veneer Consultation", preferred_date: dateStr(3, 10, 0), insurance_provider: "Cigna", status: "confirmed", duration: 60, notes: "Upper anterior 6 veneers" },
        { patient_name: "Kevin Wilson", patient_phone: "(336) 555-0112", patient_email: "kwilson@email.com", reason: "Night Guard Fitting", preferred_date: dateStr(3, 14, 0), insurance_provider: "Humana", status: "pending", duration: 30, notes: "" },

        // 4 days out
        { patient_name: "Ana Ruiz", patient_phone: "(336) 555-0113", patient_email: "ana.ruiz@email.com", reason: "Limpieza Dental", preferred_date: dateStr(4, 8, 0), insurance_provider: "Principal", status: "confirmed", duration: 60, notes: "Spanish-speaking patient, prefers AM" },
        { patient_name: "William Taylor", patient_phone: "(336) 555-0114", patient_email: "wtaylor@email.com", reason: "Same-Day Crown", preferred_date: dateStr(4, 10, 0), insurance_provider: "Delta Dental", status: "confirmed", duration: 120, notes: "Tooth #30, CEREC crown" },

        // 5 days out
        { patient_name: "Jennifer Lee", patient_phone: "(336) 555-0115", patient_email: "jlee@email.com", reason: "New Patient Exam", preferred_date: dateStr(5, 9, 0), insurance_provider: "Aetna", status: "pending", duration: 90, notes: "Referred by Google search" },
        { patient_name: "Thomas Anderson", patient_phone: "(336) 555-0116", patient_email: "tanderson@email.com", reason: "Dental Implant - Single", preferred_date: dateStr(5, 13, 0), insurance_provider: "BlueCross BlueShield", status: "confirmed", duration: 120, notes: "Stage 2 - abutment placement" },

        // Next week appointments (sparse to show availability)
        { patient_name: "Rachel Kim", patient_phone: "(336) 555-0117", patient_email: "rkim@email.com", reason: "Routine Cleaning", preferred_date: dateStr(7, 8, 30), insurance_provider: "UnitedHealthcare", status: "confirmed", duration: 60, notes: "" },
        { patient_name: "Christopher Patel", patient_phone: "(336) 555-0118", patient_email: "cpatel@email.com", reason: "Extraction - Simple", preferred_date: dateStr(7, 14, 0), insurance_provider: "Guardian", status: "pending", duration: 45, notes: "Wisdom tooth #32" },
        { patient_name: "Laura Sanchez", patient_phone: "(336) 555-0119", patient_email: "lsanchez@email.com", reason: "Porcelain Crown", preferred_date: dateStr(8, 10, 0), insurance_provider: "MetLife", status: "confirmed", duration: 90, notes: "" },
        { patient_name: "Daniel White", patient_phone: "(336) 555-0120", patient_email: "dwhite@email.com", reason: "Digital Smile Design", preferred_date: dateStr(9, 9, 0), insurance_provider: "Cigna", status: "confirmed", duration: 120, notes: "Full cosmetic workup" },
        { patient_name: "Sofia Hernandez", patient_phone: "(336) 555-0121", patient_email: "sofia.h@email.com", reason: "Emergency - Toothache", preferred_date: dateStr(10, 8, 0), insurance_provider: "None", status: "confirmed", duration: 60, notes: "" },
    ];

    for (const appt of sampleAppointments) {
        const ref = col.doc();
        batch.set(ref, {
            ...appt,
            source: 'admin-schedule',
            lang: appt.patient_name.match(/Gonzalez|Rodriguez|Ruiz|Sanchez|Hernandez/) ? 'es' : 'en',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();
    console.log(`[Firestore] ✅ ${sampleAppointments.length} appointments seeded!`);
    return true;
}

// ─── Availability Checker ───

async function getAvailableSlots(daysAhead = 7) {
    const { db } = initFirebase();
    if (!db) return [];

    // Office hours (Mon-Thu open, Fri-Sun closed)
    const officeHours = {
        0: null, // Sunday
        1: { open: 8, close: 17 },  // Monday
        2: { open: 8, close: 17 },  // Tuesday
        3: { open: 8, close: 17 },  // Wednesday
        4: { open: 8, close: 15 },  // Thursday
        5: null, // Friday
        6: null, // Saturday
    };

    // Get existing appointments for the next N days
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    let existingAppts = [];
    try {
        const snapshot = await db.collection('appointments')
            .where('status', 'in', ['confirmed', 'pending'])
            .get();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.preferred_date) {
                existingAppts.push({
                    date: new Date(data.preferred_date),
                    duration: data.duration || 60,
                    reason: data.reason,
                    patient_name: data.patient_name,
                });
            }
        });
    } catch (e) {
        console.warn('[Firestore] Could not load existing appointments:', e.message);
    }

    // Build available slots
    const available = [];
    const slotDuration = 60; // 1 hour slots

    for (let d = 0; d < daysAhead; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        const dayOfWeek = date.getDay();
        const hours = officeHours[dayOfWeek];
        if (!hours) continue; // Closed day

        const dayStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        // Get appointments for this day
        const dayAppts = existingAppts.filter(a => {
            return a.date.toDateString() === date.toDateString();
        });

        // Check each hour slot
        const openSlots = [];
        const bookedSlots = [];
        for (let h = hours.open; h < hours.close; h++) {
            const slotTime = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
            const isBooked = dayAppts.some(a => {
                const apptHour = a.date.getHours();
                return Math.abs(apptHour - h) < 1;
            });
            if (isBooked) {
                const bookedAppt = dayAppts.find(a => Math.abs(a.date.getHours() - h) < 1);
                bookedSlots.push({ time: slotTime, reason: bookedAppt?.reason || 'Booked' });
            } else {
                // Don't include past slots for today
                if (d === 0 && h <= now.getHours()) continue;
                openSlots.push(slotTime);
            }
        }

        if (openSlots.length > 0 || bookedSlots.length > 0) {
            available.push({ day: dayStr, dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }), openSlots, bookedSlots, totalSlots: hours.close - hours.open });
        }
    }

    return available;
}

// Format schedule context for PALOMA's system prompt
async function getScheduleContext() {
    try {
        const slots = await getAvailableSlots(10);
        if (!slots || slots.length === 0) return '';

        let ctx = '\n\nCURRENT SCHEDULE & AVAILABILITY (use this to suggest appointment times):\n';
        ctx += `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.\n\n`;

        for (const day of slots) {
            ctx += `📅 ${day.day}:\n`;
            if (day.openSlots.length > 0) {
                ctx += `  ✅ Available: ${day.openSlots.join(', ')}\n`;
            }
            if (day.bookedSlots.length > 0) {
                ctx += `  ❌ Booked: ${day.bookedSlots.map(b => `${b.time} (${b.reason})`).join(', ')}\n`;
            }
            ctx += '\n';
        }

        ctx += `\nWhen suggesting times, recommend the AVAILABLE slots. If a patient asks for a time that's booked, politely suggest the nearest available time. Always confirm the day and time with the patient.\n`;
        return ctx;
    } catch (e) {
        console.warn('[getScheduleContext] error:', e.message);
        return '';
    }
}

// ─── Patient Context for Admin PALOMA ───

async function getPatientContext() {
    try {
        const appointments = await listAppointments({ limit: 100 });
        if (!appointments || appointments.length === 0) return '';

        // Group by patient
        const patients = {};
        for (const a of appointments) {
            const name = a.patient_name || 'Unknown';
            if (!patients[name]) {
                patients[name] = {
                    phone: a.patient_phone,
                    email: a.patient_email,
                    insurance: a.insurance_provider,
                    appointments: [],
                };
            }
            patients[name].appointments.push({
                date: a.preferred_date,
                reason: a.reason,
                status: a.status,
                duration: a.duration || 60,
                notes: a.notes || '',
                source: a.source,
            });
        }

        let ctx = '\n\nPATIENT DATABASE:\n';
        for (const [name, data] of Object.entries(patients)) {
            ctx += `\n👤 ${name}`;
            ctx += ` | Phone: ${data.phone || 'N/A'} | Email: ${data.email || 'N/A'} | Insurance: ${data.insurance || 'None'}\n`;
            for (const appt of data.appointments) {
                const d = appt.date ? new Date(appt.date) : null;
                const dateStr = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';
                ctx += `   - ${dateStr}: ${appt.reason} (${appt.status}, ${appt.duration}min)`;
                if (appt.notes) ctx += ` — Notes: ${appt.notes}`;
                ctx += '\n';
            }
        }

        ctx += `\nTotal patients: ${Object.keys(patients).length} | Total appointments: ${appointments.length}\n`;
        return ctx;
    } catch (e) {
        console.warn('[getPatientContext] error:', e.message);
        return '';
    }
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

