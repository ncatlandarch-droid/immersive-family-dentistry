/* ═══════════════════════════════════════════════════════════
   DB Setup — Initialize PostgreSQL tables (V2 Function)
   Run once: GET /.netlify/functions/db-setup
   Uses @netlify/database for auto-connection
   ═══════════════════════════════════════════════════════════ */

const { getDatabase } = require('@netlify/database');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'GET only' }) };
    }

    let sql;
    try {
        const db = getDatabase();
        console.log('[db-setup] Driver:', db.driver, 'Has connectionString:', !!db.connectionString);
        
        if (db.driver === 'serverless' && db.httpClient) {
            sql = db.httpClient;
        } else if (db.pool) {
            // Use pool.query for server driver
            sql = async (strings, ...values) => {
                const parts = [];
                strings.forEach((str, i) => {
                    parts.push(str);
                    if (i < values.length) parts.push('$' + (i + 1));
                });
                const text = parts.join('');
                const res = await db.pool.query(text, values);
                return res.rows;
            };
        } else {
            throw new Error('No usable SQL interface from database');
        }
    } catch (e) {
        console.log('[db-setup] Database error:', e.message);
        // Fallback: try direct env var
        const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
        if (dbUrl) {
            const { neon } = require('@neondatabase/serverless');
            sql = neon(dbUrl);
        } else {
            return { statusCode: 500, headers, body: JSON.stringify({ 
                error: e.message,
                hint: 'Ensure Netlify Database is provisioned and deployed'
            })};
        }
    }

    try {
        // ─── Practice Settings Table ───
        await sql`
            CREATE TABLE IF NOT EXISTS practice_settings (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // ─── Appointments Table ───
        await sql`
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                patient_name TEXT NOT NULL,
                patient_phone TEXT,
                patient_email TEXT,
                reason TEXT,
                preferred_date TEXT,
                insurance_provider TEXT DEFAULT 'None',
                status TEXT DEFAULT 'pending',
                notes TEXT DEFAULT '',
                source TEXT DEFAULT 'paloma-chat',
                lang TEXT DEFAULT 'en',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // ─── Patients Table ───
        await sql`
            CREATE TABLE IF NOT EXISTS patients (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                insurance_provider TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `;

        // ─── Seed Practice Settings (only if empty) ───
        const existing = await sql`SELECT COUNT(*) as count FROM practice_settings`;
        
        if (parseInt(existing[0].count) === 0) {
            // Office Hours
            await sql`
                INSERT INTO practice_settings (key, value) VALUES ('office_hours', ${JSON.stringify({
                    monday: { open: "8:00 AM", close: "5:00 PM", closed: false },
                    tuesday: { open: "8:00 AM", close: "5:00 PM", closed: false },
                    wednesday: { open: "8:00 AM", close: "5:00 PM", closed: false },
                    thursday: { open: "8:00 AM", close: "3:00 PM", closed: false },
                    friday: { open: "", close: "", closed: true },
                    saturday: { open: "", close: "", closed: true },
                    sunday: { open: "", close: "", closed: true },
                })}::jsonb)
            `;

            // Fee Schedule
            await sql`
                INSERT INTO practice_settings (key, value) VALUES ('pricing', ${JSON.stringify([
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
                ])}::jsonb)
            `;

            // Insurance Providers
            await sql`
                INSERT INTO practice_settings (key, value) VALUES ('insurance', ${JSON.stringify([
                    "Delta Dental",
                    "Cigna",
                    "Aetna",
                    "MetLife",
                    "UnitedHealthcare",
                    "Guardian",
                    "BlueCross BlueShield",
                    "Humana",
                    "Principal",
                    "Lincoln Financial",
                ])}::jsonb)
            `;

            // Staff Directory
            await sql`
                INSERT INTO practice_settings (key, value) VALUES ('staff', ${JSON.stringify([
                    { name: "Dr. Christian Brenes", role: "Prosthodontist / Owner", bio: "Board-certified specialist, UNC Chapel Hill graduate, digital dentistry pioneer" },
                    { name: "PALOMA", role: "AI Dental Health Guide", bio: "24/7 bilingual assistant powered by MouthMap" },
                ])}::jsonb)
            `;

            // Contact Info
            await sql`
                INSERT INTO practice_settings (key, value) VALUES ('contact', ${JSON.stringify({
                    phone: "(336) 545-4281",
                    email: "contact@ljfamilydentist.com",
                    address: "Lake Jeanette area, Greensboro, NC",
                    website: "https://immersive-family-dentistry.netlify.app",
                    emergency: "For dental emergencies after hours, call (336) 545-4281 or go to your nearest ER.",
                })}::jsonb)
            `;

            // Practice Info
            await sql`
                INSERT INTO practice_settings (key, value) VALUES ('practice_info', ${JSON.stringify({
                    name: "Lake Jeanette Family & Implant Dentistry",
                    tagline: "Intelligence-Driven Systemic Wellness",
                    new_patient_message: "Welcome! Your first visit includes a comprehensive exam with digital X-rays and a 3D scan. Dr. Brenes will create a personalized treatment plan just for you.",
                    payment_options: [
                        "We accept most major dental insurance plans",
                        "In-house payment plans for major procedures",
                        "CareCredit financing available",
                        "We submit claims on your behalf",
                    ],
                })}::jsonb)
            `;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Database initialized successfully!',
                tables: ['practice_settings', 'appointments', 'patients'],
                seeded: parseInt(existing[0].count) === 0,
            }),
        };

    } catch (error) {
        console.error('DB setup error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
