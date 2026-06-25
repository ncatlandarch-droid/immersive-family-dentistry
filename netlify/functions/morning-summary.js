/* ═══════════════════════════════════════════════════════════
   Morning Summary — Netlify Scheduled Function
   Runs daily at 7 AM EST (11:00 UTC)
   
   Queries Firestore for after-hours appointment submissions,
   generates a Gemini-powered briefing, and emails it via Resend.
   
   Env vars: GEMINI_API_KEY, RESEND_API_KEY, ADMIN_EMAIL
   ═══════════════════════════════════════════════════════════ */

const FIRESTORE_PROJECT = 'paloma-590b6';
const FIRESTORE_API_KEY = process.env.FIREBASE_API_KEY;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ─── Schedule: 7 AM EST = 11:00 UTC ───
exports.config = { schedule: '0 11 * * *' };

exports.handler = async (event) => {
    console.log('[morning-summary] ⏰ Triggered at', new Date().toISOString());

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '')
        .split(',').map(e => e.trim()).filter(Boolean);

    if (!RESEND_API_KEY) {
        console.error('[morning-summary] ❌ RESEND_API_KEY not set');
        return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY not configured' }) };
    }
    if (!GEMINI_API_KEY) {
        console.error('[morning-summary] ❌ GEMINI_API_KEY not set');
        return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY not configured' }) };
    }

    try {
        // ─── Calculate Time Window ───
        // After-hours = 6 PM yesterday to 7 AM today (EST)
        const now = new Date();
        const todayEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        
        // 7 AM today EST in UTC
        const today7am = new Date(todayEST);
        today7am.setHours(7, 0, 0, 0);
        const today7amUTC = new Date(today7am.getTime() + getESTOffset(today7am) * 60000);

        // 6 PM yesterday EST in UTC
        const yesterday6pm = new Date(todayEST);
        yesterday6pm.setDate(yesterday6pm.getDate() - 1);
        yesterday6pm.setHours(18, 0, 0, 0);
        const yesterday6pmUTC = new Date(yesterday6pm.getTime() + getESTOffset(yesterday6pm) * 60000);

        console.log('[morning-summary] Window:', yesterday6pmUTC.toISOString(), '→', today7amUTC.toISOString());

        // ─── Query Firestore for After-Hours Appointments ───
        const appointments = await queryFirestoreAppointments(yesterday6pmUTC, today7amUTC);
        console.log(`[morning-summary] Found ${appointments.length} after-hours appointment(s)`);

        // ─── Also get total pending count ───
        const allPending = await queryFirestorePendingAppointments();
        console.log(`[morning-summary] Total pending appointments: ${allPending.length}`);

        // ─── Generate Briefing with Gemini ───
        const briefingHtml = await generateBriefing(appointments, allPending, GEMINI_API_KEY);

        // ─── Send Email via Resend ───
        const dateStr = todayEST.toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        const emailResult = await sendEmail({
            apiKey: RESEND_API_KEY,
            to: ADMIN_EMAIL,
            subject: `🦷 Morning Briefing — ${dateStr}`,
            html: briefingHtml,
        });

        console.log('[morning-summary] ✅ Email sent:', emailResult.id);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                afterHoursCount: appointments.length,
                pendingCount: allPending.length,
                emailId: emailResult.id,
            }),
        };

    } catch (error) {
        console.error('[morning-summary] ❌ Error:', error.message, error.stack);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};


// ═══════════════════════════════════════════════════════════
// Firestore REST API Helpers
// ═══════════════════════════════════════════════════════════

/**
 * Query appointments created between two timestamps.
 * Uses Firestore's runQuery (structured query) REST endpoint.
 */
async function queryFirestoreAppointments(startTime, endTime) {
    const url = `${FIRESTORE_BASE}:runQuery?key=${FIRESTORE_API_KEY}`;
    
    const query = {
        structuredQuery: {
            from: [{ collectionId: 'appointments' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: 'created_at' },
                                op: 'GREATER_THAN_OR_EQUAL',
                                value: { timestampValue: startTime.toISOString() },
                            },
                        },
                        {
                            fieldFilter: {
                                field: { fieldPath: 'created_at' },
                                op: 'LESS_THAN',
                                value: { timestampValue: endTime.toISOString() },
                            },
                        },
                    ],
                },
            },
            orderBy: [{ field: { fieldPath: 'created_at' }, direction: 'DESCENDING' }],
            limit: 50,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[morning-summary] Firestore query error:', response.status, errText);
        throw new Error(`Firestore query failed: ${response.status}`);
    }

    const results = await response.json();
    return parseFirestoreResults(results);
}

/**
 * Query all pending appointments (status = 'pending').
 */
async function queryFirestorePendingAppointments() {
    const url = `${FIRESTORE_BASE}:runQuery?key=${FIRESTORE_API_KEY}`;
    
    const query = {
        structuredQuery: {
            from: [{ collectionId: 'appointments' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'status' },
                    op: 'EQUAL',
                    value: { stringValue: 'pending' },
                },
            },
            limit: 100,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
    });

    if (!response.ok) {
        console.warn('[morning-summary] Pending query failed:', response.status);
        return [];
    }

    const results = await response.json();
    return parseFirestoreResults(results);
}

/**
 * Parse Firestore REST API runQuery results into plain objects.
 */
function parseFirestoreResults(results) {
    if (!Array.isArray(results)) return [];

    return results
        .filter((r) => r.document)
        .map((r) => {
            const doc = r.document;
            const fields = doc.fields || {};
            const id = doc.name.split('/').pop();
            return {
                id,
                patient_name: fields.patient_name?.stringValue || 'Unknown',
                patient_phone: fields.patient_phone?.stringValue || '',
                patient_email: fields.patient_email?.stringValue || '',
                reason: fields.reason?.stringValue || 'General inquiry',
                preferred_date: fields.preferred_date?.stringValue || 'Flexible',
                insurance_provider: fields.insurance_provider?.stringValue || 'None',
                source: fields.source?.stringValue || 'unknown',
                lang: fields.lang?.stringValue || 'en',
                status: fields.status?.stringValue || 'pending',
                created_at: fields.created_at?.timestampValue || fields.created_at?.stringValue || '',
            };
        });
}


// ═══════════════════════════════════════════════════════════
// Gemini Briefing Generator
// ═══════════════════════════════════════════════════════════

async function generateBriefing(afterHoursAppts, allPending, apiKey) {
    const apptSummary = afterHoursAppts.length > 0
        ? afterHoursAppts.map((a, i) => 
            `${i + 1}. ${a.patient_name} — ${a.reason} (preferred: ${a.preferred_date}) | Phone: ${a.patient_phone || 'N/A'} | Email: ${a.patient_email || 'N/A'} | Insurance: ${a.insurance_provider} | Source: ${a.source} | Language: ${a.lang}`
        ).join('\n')
        : 'No after-hours appointment requests received.';

    const prompt = `You are PALOMA, the AI assistant for Lake Jeanette Family & Implant Dentistry (Dr. Christian Brenes, Prosthodontist, Greensboro NC).

Generate an HTML email morning briefing for the office team. Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

DATA:
- After-hours appointment requests (received between 6 PM yesterday and 7 AM today):
${apptSummary}

- Total pending appointments awaiting confirmation: ${allPending.length}

REQUIREMENTS:
1. Generate ONLY the inner HTML content (no <html>, <head>, or <body> tags — I'll wrap it)
2. Use a clean, professional design with these colors: #1B3A5C (navy), #D4A853 (gold), #2D8F5C (green for positive), #C0392B (red for urgent)
3. Include sections:
   - Header greeting with date and a dental emoji
   - 📋 NEW AFTER-HOURS REQUESTS: List each appointment with patient details in a styled card
   - 📊 ACTIVITY SUMMARY: Quick stats (after-hours count, total pending, sources breakdown)
   - ⚡ ACTION ITEMS: Prioritized to-do list (e.g., "Call back Maria Garcia — requested implant consultation", "Confirm 3 pending appointments")
   - If no after-hours appointments, show a calm "All quiet overnight" message instead
4. Use inline CSS styles (for email compatibility)
5. Make it scannable — the team should understand everything in 10 seconds
6. End with a brief motivational note from PALOMA
7. Keep it concise but beautiful`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 2000,
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[morning-summary] Gemini error:', response.status, errText);
        // Fallback to static HTML
        return buildFallbackHtml(afterHoursAppts, allPending);
    }

    const data = await response.json();
    let htmlContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences if Gemini wraps it
    htmlContent = htmlContent.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

    // Wrap in full email template
    return wrapEmailHtml(htmlContent);
}

/**
 * Fallback static HTML if Gemini is unavailable.
 */
function buildFallbackHtml(afterHoursAppts, allPending) {
    const rows = afterHoursAppts.map((a) => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${a.patient_name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${a.reason}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${a.preferred_date}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${a.patient_phone || a.patient_email || '—'}</td>
        </tr>
    `).join('');

    const content = `
        <div style="text-align:center;padding:20px;">
            <h1 style="color:#1B3A5C;margin:0;">🦷 Morning Briefing</h1>
            <p style="color:#888;margin:5px 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="padding:20px;">
            <h2 style="color:#1B3A5C;border-bottom:2px solid #D4A853;padding-bottom:8px;">📋 After-Hours Requests (${afterHoursAppts.length})</h2>
            ${afterHoursAppts.length > 0 ? `
                <table style="width:100%;border-collapse:collapse;margin:10px 0;">
                    <tr style="background:#f8f9fa;">
                        <th style="padding:8px;text-align:left;">Patient</th>
                        <th style="padding:8px;text-align:left;">Reason</th>
                        <th style="padding:8px;text-align:left;">Preferred Date</th>
                        <th style="padding:8px;text-align:left;">Contact</th>
                    </tr>
                    ${rows}
                </table>
            ` : '<p style="color:#2D8F5C;font-style:italic;">✅ All quiet overnight — no new requests.</p>'}
            <h2 style="color:#1B3A5C;border-bottom:2px solid #D4A853;padding-bottom:8px;">📊 Summary</h2>
            <p>Total pending appointments: <strong>${allPending.length}</strong></p>
        </div>
        <div style="text-align:center;padding:15px;color:#888;font-size:13px;">
            🕊️ Sent by PALOMA — your AI dental assistant
        </div>
    `;

    return wrapEmailHtml(content);
}

/**
 * Wrap inner HTML in a responsive email template.
 */
function wrapEmailHtml(innerHtml) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1B3A5C,#2a5580);padding:20px 30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">🕊️ PALOMA — Morning Briefing</h1>
    <p style="color:#D4A853;margin:5px 0 0;font-size:14px;">Lake Jeanette Family & Implant Dentistry</p>
</td></tr>
<tr><td style="padding:20px 30px;">
${innerHtml}
</td></tr>
<tr><td style="background:#f8f9fa;padding:15px 30px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#999;font-size:12px;margin:0;">Automated by PALOMA 🕊️ | Lake Jeanette Family & Implant Dentistry</p>
    <p style="color:#bbb;font-size:11px;margin:5px 0 0;">3810 North Elm Street, Suite 201, Greensboro, NC 27455 | (336) 545-4281</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════
// Email via Resend API
// ═══════════════════════════════════════════════════════════

async function sendEmail({ apiKey, to, subject, html }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'PALOMA <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API error ${response.status}: ${errText}`);
    }

    return response.json();
}


// ═══════════════════════════════════════════════════════════
// Timezone Helper
// ═══════════════════════════════════════════════════════════

/**
 * Get EST/EDT offset in minutes from UTC.
 * Returns the number of minutes to ADD to local time to get UTC.
 * EST = +300 (UTC-5), EDT = +240 (UTC-4)
 */
function getESTOffset(date) {
    // Create a date string in the US Eastern timezone and compare
    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const eastern = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return (utc - eastern) / 60000;
}
