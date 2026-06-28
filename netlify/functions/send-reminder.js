/* ═══════════════════════════════════════════════════════════
   Send Reminder — Manual Reminder Netlify Function
   
   POST endpoint called from the admin Reminders view
   to send individual reminder emails via the Resend API.
   
   POST body: {
     patientName, patientEmail, subject, messageBody,
     reminderType, appointmentDate, appointmentTime,
     practiceName, practicePhone
   }
   
   Returns: { success: true, messageId: '...' }
   
   Env vars: RESEND_API_KEY
   ═══════════════════════════════════════════════════════════ */

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
        console.error('[send-reminder] ❌ RESEND_API_KEY not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const {
            patientName = 'Patient',
            patientEmail,
            subject = '🦷 Appointment Reminder — Lake Jeanette Dentistry',
            messageBody = '',
            reminderType = 'manual',
            appointmentDate = '',
            appointmentTime = '',
            practiceName = 'Lake Jeanette Family & Implant Dentistry',
            practicePhone = '(336) 545-4281',
        } = payload;

        if (!patientEmail) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'patientEmail is required' }),
            };
        }

        // Build the HTML email
        const html = buildReminderEmail({
            patientName,
            messageBody,
            reminderType,
            appointmentDate,
            appointmentTime,
            practiceName,
            practicePhone,
        });

        // Send via Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${practiceName} <onboarding@resend.dev>`,
                to: [patientEmail],
                subject,
                html,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[send-reminder] ❌ Resend API error ${response.status}:`, errText);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: `Email service error: ${response.status}`,
                }),
            };
        }

        const result = await response.json();
        console.log(`[send-reminder] ✅ Email sent to ${patientEmail}: ${result.id}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messageId: result.id,
            }),
        };

    } catch (error) {
        console.error('[send-reminder] ❌ Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: error.message }),
        };
    }
};


// ═══════════════════════════════════════════════════════════
// HTML Email Builder
// ═══════════════════════════════════════════════════════════

function buildReminderEmail({
    patientName,
    messageBody,
    reminderType,
    appointmentDate,
    appointmentTime,
    practiceName,
    practicePhone,
}) {
    const firstName = patientName.split(' ')[0] || 'there';

    // Determine greeting based on reminder type
    let typeLabel = 'Reminder';
    let accentColor = '#14B8A6'; // teal
    if (reminderType === '48h' || reminderType === '48-Hour') {
        typeLabel = '48-Hour Reminder';
        accentColor = '#3B82F6'; // blue
    } else if (reminderType === '24h' || reminderType === '24-Hour') {
        typeLabel = '24-Hour Reminder';
        accentColor = '#8B5CF6'; // purple
    } else if (reminderType === '2h' || reminderType === '2-Hour') {
        typeLabel = 'Final Reminder — 2 Hours';
        accentColor = '#F59E0B'; // amber
    }

    // Format the message body for HTML (convert newlines to <br>)
    const htmlBody = messageBody
        ? messageBody.replace(/\n/g, '<br>')
        : `Hi ${firstName},<br><br>This is a friendly reminder about your upcoming appointment at <strong>${practiceName}</strong>.`;

    // Appointment details block (only show if we have date/time)
    const appointmentBlock = (appointmentDate || appointmentTime)
        ? `<div style="background:rgba(20,184,166,0.08);border-left:4px solid ${accentColor};padding:15px 20px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B3A5C;font-weight:600;">📋 Appointment Details:</p>
            ${appointmentDate ? `<p style="margin:4px 0;color:#555;"><strong>📅 Date:</strong> ${appointmentDate}</p>` : ''}
            ${appointmentTime ? `<p style="margin:4px 0;color:#555;"><strong>🕐 Time:</strong> ${appointmentTime}</p>` : ''}
            <p style="margin:4px 0;color:#555;"><strong>📍 Location:</strong> 3810 North Elm St, Suite 201, Greensboro, NC 27455</p>
           </div>`
        : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0B0F19,#1e293b);padding:25px 30px;text-align:center;">
    <div style="display:inline-block;background:linear-gradient(135deg,${accentColor},#0d9488);border-radius:50%;width:48px;height:48px;line-height:48px;text-align:center;margin-bottom:10px;">
        <span style="font-size:24px;">🕊️</span>
    </div>
    <h1 style="color:#fff;margin:0;font-size:20px;">${practiceName}</h1>
    <p style="color:${accentColor};margin:5px 0 0;font-size:13px;">Dr. Christian Brenes — Prosthodontist | Greensboro, NC</p>
    <div style="margin-top:10px;display:inline-block;background:rgba(255,255,255,0.1);padding:4px 16px;border-radius:20px;">
        <span style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;letter-spacing:0.05em;">${typeLabel.toUpperCase()}</span>
    </div>
</td></tr>

<!-- Body -->
<tr><td style="padding:30px;">
    <p style="font-size:16px;line-height:1.7;color:#333;">
        ${htmlBody}
    </p>

    ${appointmentBlock}

    <!-- CTA Buttons -->
    <div style="text-align:center;margin:28px 0;">
        <a href="tel:${practicePhone.replace(/[^0-9]/g, '')}" style="display:inline-block;background:linear-gradient(135deg,${accentColor},#0d9488);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:4px;">
            📞 Confirm — ${practicePhone}
        </a>
    </div>
    <div style="text-align:center;">
        <a href="tel:${practicePhone.replace(/[^0-9]/g, '')}" style="color:${accentColor};font-size:13px;text-decoration:underline;">
            Need to reschedule? Call us
        </a>
    </div>
</td></tr>

<!-- Contact Info -->
<tr><td style="background:#f8f9fa;padding:20px 30px;border-top:1px solid #eee;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td style="color:#888;font-size:13px;line-height:1.5;">
            📍 3810 North Elm St, Suite 201, Greensboro, NC 27455<br>
            📞 <a href="tel:${practicePhone.replace(/[^0-9]/g, '')}" style="color:#1B3A5C;text-decoration:none;">${practicePhone}</a><br>
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
<tr><td style="padding:15px 30px;text-align:center;background:#0B0F19;">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">
        🕊️ Sent by PALOMA — Your AI Dental Assistant<br>
        <a href="https://www.instagram.com/lakejeanettedentistry" style="color:${accentColor};text-decoration:none;">@lakejeanettedentistry</a>
    </p>
    <p style="color:rgba(255,255,255,0.3);font-size:10px;margin:8px 0 0;">
        If you no longer wish to receive reminders, please call our office at ${practicePhone}.
    </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
