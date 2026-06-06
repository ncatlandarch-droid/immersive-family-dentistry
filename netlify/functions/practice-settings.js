/* ═══════════════════════════════════════════════════════════
   Practice Settings API
   GET  — Read all settings (public)
   PUT  — Update a setting (admin)
   ═══════════════════════════════════════════════════════════ */

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    const dbUrl = process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!dbUrl) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Database not configured' }) };
    }

    const sql = neon(dbUrl);

    try {
        // ─── GET: Read all settings ───
        if (event.httpMethod === 'GET') {
            const rows = await sql`SELECT key, value FROM practice_settings`;
            const settings = {};
            for (const row of rows) {
                settings[row.key] = row.value;
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(settings),
            };
        }

        // ─── PUT: Update a setting ───
        if (event.httpMethod === 'PUT') {
            const { key, value } = JSON.parse(event.body);
            
            if (!key || value === undefined) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'key and value required' }) };
            }

            await sql`
                INSERT INTO practice_settings (key, value, updated_at)
                VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
                ON CONFLICT (key) DO UPDATE
                SET value = ${JSON.stringify(value)}::jsonb, updated_at = NOW()
            `;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, key }),
            };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    } catch (error) {
        console.error('Practice settings error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};
