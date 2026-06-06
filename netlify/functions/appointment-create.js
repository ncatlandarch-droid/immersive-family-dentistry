/* ═══════════════════════════════════════════════════════════
   Appointment Create API
   POST — Book a new appointment
   Called by PALOMA chat or patient portal
   ═══════════════════════════════════════════════════════════ */

const { getSQL } = require('./db-helper');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST only' }) };
    }

    let sql;
    try { sql = getSQL(); } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }

    try {
        const {
            patient_name,
            patient_phone,
            patient_email,
            reason,
            preferred_date,
            insurance_provider,
            source,
            lang,
        } = JSON.parse(event.body);

        if (!patient_name) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'patient_name is required' }) };
        }

        const result = await sql`
            INSERT INTO appointments (
                patient_name, patient_phone, patient_email,
                reason, preferred_date, insurance_provider,
                source, lang, status
            ) VALUES (
                ${patient_name},
                ${patient_phone || ''},
                ${patient_email || ''},
                ${reason || 'General inquiry'},
                ${preferred_date || 'Flexible'},
                ${insurance_provider || 'None'},
                ${source || 'paloma-chat'},
                ${lang || 'en'},
                'pending'
            )
            RETURNING id, created_at
        `;

        const appointment = result[0];

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                appointment_id: appointment.id,
                created_at: appointment.created_at,
                message: `Appointment request #${appointment.id} created successfully`,
            }),
        };

    } catch (error) {
        console.error('Appointment create error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
