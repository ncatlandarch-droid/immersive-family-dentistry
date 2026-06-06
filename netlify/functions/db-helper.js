/* ═══════════════════════════════════════════════════════════
   Database Helper — Gets a SQL query function
   Uses @netlify/database (auto-connects in Netlify runtime)
   Falls back to @neondatabase/serverless with env vars for local dev
   ═══════════════════════════════════════════════════════════ */

function getSQL() {
    // Try Netlify built-in database first
    try {
        const { getDatabase } = require('@netlify/database');
        const db = getDatabase();
        // The Netlify DB returns a `httpClient` which is a neon() SQL tagged template
        return db.httpClient || db.sql;
    } catch (e) {
        // Fall back to direct Neon connection via env var
        const dbUrl = process.env.NETLIFY_DB_URL
            || process.env.NETLIFY_DATABASE_URL
            || process.env.DATABASE_URL
            || process.env.NEON_DATABASE_URL;

        if (!dbUrl) {
            throw new Error('No database connection available');
        }

        const { neon } = require('@neondatabase/serverless');
        return neon(dbUrl);
    }
}

module.exports = { getSQL };
