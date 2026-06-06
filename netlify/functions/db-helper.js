/* ═══════════════════════════════════════════════════════════
   Database Helper — Gets a SQL query function
   Uses @netlify/database for auto-connection in Netlify runtime
   Falls back to @neondatabase/serverless with env vars
   ═══════════════════════════════════════════════════════════ */

function getSQL() {
    // Method 1: @netlify/database (auto-connects via Netlify runtime)
    try {
        const { getDatabase } = require('@netlify/database');
        const db = getDatabase();
        console.log('[db-helper] Connected via @netlify/database, driver:', db.driver);
        
        if (db.driver === 'serverless' && db.httpClient) {
            return db.httpClient;
        }
        if (db.pool) {
            return async (strings, ...values) => {
                const parts = [];
                strings.forEach((str, i) => {
                    parts.push(str);
                    if (i < values.length) parts.push('$' + (i + 1));
                });
                const text = parts.join('');
                const res = await db.pool.query(text, values);
                return res.rows;
            };
        }
    } catch (e) {
        console.log('[db-helper] @netlify/database failed:', e.message);
    }

    // Method 2: Direct Neon connection via environment variable
    const dbUrl = process.env.NETLIFY_DATABASE_URL
        || process.env.NETLIFY_DB_URL
        || process.env.DATABASE_URL
        || process.env.NEON_DATABASE_URL;

    if (dbUrl) {
        console.log('[db-helper] Using direct Neon connection via env var');
        const { neon } = require('@neondatabase/serverless');
        return neon(dbUrl);
    }

    throw new Error('No database connection available. Set DATABASE_URL env var or ensure Netlify Database is provisioned.');
}

module.exports = { getSQL };
