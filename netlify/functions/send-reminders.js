/* ═══════════════════════════════════════════════════════════
   Send Reminders — Netlify Scheduled Function
   Runs every hour on the hour.
   
   Checks for pending appointments and sends follow-up
   reminder emails at 24h and 48h marks via Resend.
   Updates Firestore docs to track which reminders were sent.
   
   Env vars: RESEND_API_KEY
   ═══════════════════════════════════════════════════════════ */

const FIRESTORE_PROJECT = 'paloma-590b6';
const FIRESTORE_API_KEY = 'AIzaSyBQx0FT_ebBOlAIa97Q9xMUL7lXSgY4xyw';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;

// ─── Schedule: Every hour on the hour ───
exports.config = { schedule: '0 * * * *' };

exports.handler = async (event) => {
    console.log('[send-reminders] ⏰ Triggered at', new Date().toISOString());

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
        console.error('[send-reminders] ❌ RESEND_API_KEY not set');
        return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY not configured' }) };
    }

    try {
        const now = new Date();
        const results = { sent24h: 0, sent48h: 0, errors: 0, skipped: 0 };

        // ─── Fetch all pending appointments ───
        const appointments = await queryPendingAppointments();
        console.log(`[send-reminders] Found ${appointments.length} pending appointment(s) to evaluate`);

        for (const appt of appointments) {
            try {
                const createdAt = new Date(appt.created_at);
                const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
                const reminderSent = appt.reminder_sent || '';

                // Skip if patient has no email
                if (!appt.patient_email) {
                    results.skipped++;
                    continue;
                }

                // ─── 48h Reminder ───
                if (hoursAgo >= 48 && reminderSent === '24h') {
                    console.log(`[send-reminders] Sending 48h reminder to ${appt.patient_name}`);
                    await send48hReminder(appt, RESEND_API_KEY);
                    await updateReminderStatus(appt.id, '48h');
                    results.sent48h++;
                }
                // ─── 24h Reminder ───
                else if (hoursAgo >= 24 && !reminderSent) {
                    console.log(`[send-reminders] Sending 24h reminder to ${appt.patient_name}`);
                    await send24hReminder(appt, RESEND_API_KEY);
                    await updateReminderStatus(appt.id, '24h');
                    results.sent24h++;
                }
                else {
                    results.skipped++;
                }

            } catch (apptErr) {
                console.error(`[send-reminders] Error processing ${appt.patient_name}:`, apptErr.message);
                results.errors++;
            }
        }

        console.log('[send-reminders] ✅ Complete:', JSON.stringify(results));
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, ...results }),
        };

    } catch (error) {
        console.error('[send-reminders] ❌ Error:', error.message, error.stack);
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
 * Query all pending appointments that might need reminders.
 * We fetch all 'pending' status and filter in-code for reminder logic.
 */
async function queryPendingAppointments() {
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
            orderBy: [{ field: { fieldPath: 'created_at' }, direction: 'ASCENDING' }],
            limit: 100,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Firestore query failed: ${response.status} — ${errText}`);
    }

    const results = await response.json();
    return parseFirestoreResults(results);
}

/**
 * Update a Firestore appointment doc to mark reminder as sent.
 * Uses PATCH to update only the reminder_sent and reminder_sent_at fields.
 */
async function updateReminderStatus(docId, level) {
    const url = `${FIRESTORE_BASE}/appointments/${docId}?key=${FIRESTORE_API_KEY}&updateMask.fieldPaths=reminder_sent&updateMask.fieldPaths=reminder_sent_at`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                reminder_sent: { stringValue: level },
                reminder_sent_at: { timestampValue: new Date().toISOString() },
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Firestore update failed for ${docId}: ${response.status} — ${errText}`);
    }

    console.log(`[send-reminders] ✅ Updated ${docId} → reminder_sent: ${level}`);
    return response.json();
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
                reminder_sent: fields.reminder_sent?.stringValue || '',
            };
        });
}


// ═══════════════════════════════════════════════════════════
// Email Templates & Sending
// ═══════════════════════════════════════════════════════════

/**
 * Send the 24-hour follow-up email.
 */
async function send24hReminder(appt, apiKey) {
    const isSpanish = appt.lang === 'es';

    const subject = isSpanish
        ? '🦷 ¡Recibimos su solicitud! — Lake Jeanette Dentistry'
        : '🦷 We received your request! — Lake Jeanette Dentistry';

    const html = build24hEmailHtml(appt, isSpanish);
    return sendEmail({ apiKey, to: appt.patient_email, subject, html });
}

/**
 * Send the 48-hour follow-up email.
 */
async function send48hReminder(appt, apiKey) {
    const isSpanish = appt.lang === 'es';

    const subject = isSpanish
        ? '🕊️ Actualización sobre su cita — Lake Jeanette Dentistry'
        : '🕊️ Update on your appointment — Lake Jeanette Dentistry';

    const html = build48hEmailHtml(appt, isSpanish);
    return sendEmail({ apiKey, to: appt.patient_email, subject, html });
}

/**
 * Send email via Resend API.
 */
async function sendEmail({ apiKey, to, subject, html }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Lake Jeanette Dentistry <onboarding@resend.dev>',
            to: [to],
            subject,
            html,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    console.log(`[send-reminders] 📧 Email sent to ${to}: ${result.id}`);
    return result;
}


// ═══════════════════════════════════════════════════════════
// HTML Email Templates
// ═══════════════════════════════════════════════════════════

function build24hEmailHtml(appt, isSpanish) {
    const greeting = isSpanish
        ? `¡Hola ${appt.patient_name.split(' ')[0]}!`
        : `Hi ${appt.patient_name.split(' ')[0]}!`;

    const body = isSpanish ? `
        <p style="font-size:16px;line-height:1.6;color:#333;">
            Gracias por solicitar una cita con nosotros en <strong>Lake Jeanette Family & Implant Dentistry</strong>.
            Queríamos confirmarle que hemos recibido su solicitud y nuestro equipo está trabajando para encontrar el mejor horario para usted.
        </p>
        <div style="background:#f0f7f4;border-left:4px solid #2D8F5C;padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B3A5C;font-weight:600;">📋 Su Solicitud:</p>
            <p style="margin:4px 0;color:#555;"><strong>Motivo:</strong> ${appt.reason}</p>
            <p style="margin:4px 0;color:#555;"><strong>Fecha preferida:</strong> ${appt.preferred_date}</p>
            <p style="margin:4px 0;color:#555;"><strong>Seguro:</strong> ${appt.insurance_provider}</p>
        </div>
        <p style="font-size:15px;color:#333;">
            <strong>Missie</strong>, nuestra coordinadora de pacientes, se comunicará con usted pronto para confirmar su cita.
            Si desea adelantarse, puede llamarnos directamente:
        </p>
    ` : `
        <p style="font-size:16px;line-height:1.6;color:#333;">
            Thank you for requesting an appointment with us at <strong>Lake Jeanette Family & Implant Dentistry</strong>!
            We wanted to let you know that we've received your request and our team is working to find the perfect time for you.
        </p>
        <div style="background:#f0f7f4;border-left:4px solid #2D8F5C;padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B3A5C;font-weight:600;">📋 Your Request:</p>
            <p style="margin:4px 0;color:#555;"><strong>Reason:</strong> ${appt.reason}</p>
            <p style="margin:4px 0;color:#555;"><strong>Preferred date:</strong> ${appt.preferred_date}</p>
            <p style="margin:4px 0;color:#555;"><strong>Insurance:</strong> ${appt.insurance_provider}</p>
        </div>
        <p style="font-size:15px;color:#333;">
            <strong>Missie</strong>, our patient coordinator, will be reaching out soon to confirm your appointment.
            If you'd like to get ahead of the game, feel free to call us directly:
        </p>
    `;

    const cta = isSpanish ? 'Llámenos' : 'Call Us';
    const closing = isSpanish
        ? '¡Estamos emocionados de recibirle como parte de nuestra familia dental! 🦷'
        : 'We\'re excited to welcome you to our dental family! 🦷';

    return wrapPatientEmail(greeting, body, cta, closing);
}

function build48hEmailHtml(appt, isSpanish) {
    const greeting = isSpanish
        ? `Hola ${appt.patient_name.split(' ')[0]},`
        : `Hello ${appt.patient_name.split(' ')[0]},`;

    const body = isSpanish ? `
        <p style="font-size:16px;line-height:1.6;color:#333;">
            Solo queríamos hacer un seguimiento de su solicitud de cita. Sabemos que la vida está ocupada,
            y no queremos que se quede sin la atención que necesita.
        </p>
        <div style="background:#FFF8E7;border-left:4px solid #D4A853;padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;color:#1B3A5C;font-weight:600;">⏰ Su cita aún está pendiente de confirmación</p>
            <p style="margin:8px 0 0;color:#555;">
                Nuestro equipo ha estado intentando comunicarse con usted. Por favor llámenos al
                <strong>(336) 545-4281</strong> para que podamos confirmar su horario.
            </p>
        </div>
        <div style="background:#f8f9fa;padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B3A5C;font-weight:600;">📋 Recordatorio de su solicitud:</p>
            <p style="margin:4px 0;color:#555;"><strong>Motivo:</strong> ${appt.reason}</p>
            <p style="margin:4px 0;color:#555;"><strong>Fecha preferida:</strong> ${appt.preferred_date}</p>
        </div>
        <p style="font-size:15px;color:#333;">
            ¿Tiene preguntas sobre seguros o costos? Missie estará encantada de ayudarle a
            maximizar sus beneficios fuera de red. También ofrecemos opciones de financiamiento a través de
            <strong>CareCredit</strong> y <strong>Sunbit</strong>.
        </p>
    ` : `
        <p style="font-size:16px;line-height:1.6;color:#333;">
            Just wanted to follow up on your appointment request. We know life gets busy,
            and we don't want you to miss out on the care you need.
        </p>
        <div style="background:#FFF8E7;border-left:4px solid #D4A853;padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0;color:#1B3A5C;font-weight:600;">⏰ Your appointment is still pending confirmation</p>
            <p style="margin:8px 0 0;color:#555;">
                Our team has been trying to reach you. Please give us a call at
                <strong>(336) 545-4281</strong> so we can lock in your time.
            </p>
        </div>
        <div style="background:#f8f9fa;padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B3A5C;font-weight:600;">📋 Your request reminder:</p>
            <p style="margin:4px 0;color:#555;"><strong>Reason:</strong> ${appt.reason}</p>
            <p style="margin:4px 0;color:#555;"><strong>Preferred date:</strong> ${appt.preferred_date}</p>
        </div>
        <p style="font-size:15px;color:#333;">
            Have questions about insurance or costs? Missie will be happy to help you
            maximize your out-of-network benefits. We also offer financing through
            <strong>CareCredit</strong> and <strong>Sunbit</strong>.
        </p>
    `;

    const cta = isSpanish ? 'Confirmar Mi Cita' : 'Confirm My Appointment';
    const closing = isSpanish
        ? 'Esperamos verle pronto — su sonrisa es nuestra prioridad. 🕊️'
        : 'We look forward to seeing you soon — your smile is our priority. 🕊️';

    return wrapPatientEmail(greeting, body, cta, closing);
}

/**
 * Wraps patient-facing email content in a branded template.
 */
function wrapPatientEmail(greeting, body, ctaText, closing) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#1B3A5C,#2a5580);padding:25px 30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">Lake Jeanette Family & Implant Dentistry</h1>
    <p style="color:#D4A853;margin:5px 0 0;font-size:13px;">Dr. Christian Brenes — Prosthodontist | Greensboro, NC</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:30px;">
    <h2 style="color:#1B3A5C;margin:0 0 15px;font-size:20px;">${greeting}</h2>
    ${body}

    <!-- CTA Button -->
    <div style="text-align:center;margin:25px 0;">
        <a href="tel:3365454281" style="display:inline-block;background:#D4A853;color:#1B3A5C;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
            📞 ${ctaText} — (336) 545-4281
        </a>
    </div>

    <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-top:20px;">
        ${closing}
    </p>
</td></tr>

<!-- Contact Info -->
<tr><td style="background:#f8f9fa;padding:20px 30px;border-top:1px solid #eee;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td style="color:#888;font-size:13px;line-height:1.5;">
            📍 3810 North Elm St, Suite 201, Greensboro, NC 27455<br>
            📞 <a href="tel:3365454281" style="color:#1B3A5C;text-decoration:none;">(336) 545-4281</a><br>
            📧 <a href="mailto:Contact@LJFamilyDentist.com" style="color:#1B3A5C;text-decoration:none;">Contact@LJFamilyDentist.com</a>
        </td>
        <td style="text-align:right;color:#888;font-size:13px;">
            <strong>Hours:</strong><br>
            Mon–Wed: 8am–5pm<br>
            Thu: 8am–3pm<br>
            Fri–Sun: Closed
        </td>
    </tr>
    </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:15px 30px;text-align:center;background:#1B3A5C;">
    <p style="color:rgba(255,255,255,0.6);font-size:11px;margin:0;">
        🕊️ Sent by PALOMA — Your AI Dental Assistant | 
        <a href="https://www.instagram.com/lakejeanettedentistry" style="color:#D4A853;text-decoration:none;">@lakejeanettedentistry</a>
    </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
