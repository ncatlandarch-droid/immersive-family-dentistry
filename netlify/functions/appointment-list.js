/* ═══════════════════════════════════════════════════════════
   Appointment List API
   GET — List appointments
   Query params:
     ?status=pending,confirmed  (filter by status)
     ?email=x@y.com            (filter by patient email)
     ?limit=50                  (limit results)
   ═══════════════════════════════════════════════════════════ */

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'GET only' }) };
    }

    const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!dbUrl) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database not configured' }) };
    }

    const sql = neon(dbUrl);
    const params = event.queryStringParameters || {};

    try {
        let appointments;

        if (params.email) {
            // Patient view — filter by email
            appointments = await sql`
                SELECT * FROM appointments
                WHERE patient_email = ${params.email}
                ORDER BY created_at DESC
                LIMIT ${parseInt(params.limit) || 50}
            `;
        } else if (params.status) {
            // Admin view — filter by status
            const statuses = params.status.split(',');
            appointments = await sql`
                SELECT * FROM appointments
                WHERE status = ANY(${statuses})
                ORDER BY created_at DESC
                LIMIT ${parseInt(params.limit) || 50}
            `;
        } else {
            // Admin view — all appointments
            appointments = await sql`
                SELECT * FROM appointments
                ORDER BY created_at DESC
                LIMIT ${parseInt(params.limit) || 50}
            `;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                appointments,
                count: appointments.length,
            }),
        };

    } catch (error) {
        console.error('Appointment list error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
