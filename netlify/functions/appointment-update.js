/* ═══════════════════════════════════════════════════════════
   Appointment Update API
   PUT — Update appointment status/notes
   Body: { id, status?, notes? }
   ═══════════════════════════════════════════════════════════ */

const { getSQL } = require('./db-helper');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'PUT only' }) };
    }

    let sql;
    try { sql = getSQL(); } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }

    try {
        const { id, status, notes } = JSON.parse(event.body);

        if (!id) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Appointment id required' }) };
        }

        // Build update dynamically
        if (status && notes !== undefined) {
            await sql`
                UPDATE appointments
                SET status = ${status}, notes = ${notes}, updated_at = NOW()
                WHERE id = ${id}
            `;
        } else if (status) {
            await sql`
                UPDATE appointments
                SET status = ${status}, updated_at = NOW()
                WHERE id = ${id}
            `;
        } else if (notes !== undefined) {
            await sql`
                UPDATE appointments
                SET notes = ${notes}, updated_at = NOW()
                WHERE id = ${id}
            `;
        }

        // Return updated appointment
        const result = await sql`SELECT * FROM appointments WHERE id = ${id}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                appointment: result[0],
            }),
        };

    } catch (error) {
        console.error('Appointment update error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
