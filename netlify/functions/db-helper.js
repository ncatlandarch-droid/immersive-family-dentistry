/* ═══════════════════════════════════════════════════════════
   Database Helper — Gets a SQL query function
   Uses @netlify/database (auto-connects in Netlify runtime)
   Falls back to @neondatabase/serverless with env vars for local dev
   ═══════════════════════════════════════════════════════════ */

function getSQL() {
    // Try Netlify built-in database first (@netlify/database)
    try {
        const { getDatabase } = require('@netlify/database');
        const db = getDatabase();
        console.log('[db-helper] Connected via @netlify/database, driver:', db.driver);
        // In serverless mode: httpClient is the neon() tagged template function
        // In server mode: pool is a pg.Pool
        if (db.driver === 'serverless' && db.httpClient) {
            return db.httpClient;
        }
        // For server driver, we need raw SQL via pool
        if (db.pool) {
            // Wrap pool.query to match neon's tagged template interface
            return async function sql(strings, ...values) {
                const text = strings.reduce((prev, curr, i) => prev + '$' + i + curr);
                const result = await db.pool.query(text, values);
                return result.rows;
            };
        }
        throw new Error('Unknown database driver');
    } catch (e) {
        console.log('[db-helper] @netlify/database failed:', e.message);
    }

    // Fallback: direct Neon connection via environment variable
    const dbUrl = process.env.NETLIFY_DB_URL
        || process.env.NETLIFY_DATABASE_URL
        || process.env.DATABASE_URL
        || process.env.NEON_DATABASE_URL;

    if (dbUrl) {
        console.log('[db-helper] Using direct Neon connection');
        const { neon } = require('@neondatabase/serverless');
        return neon(dbUrl);
    }

    // List available env vars for debugging
    const dbEnvs = Object.keys(process.env).filter(k => 
        k.includes('DB') || k.includes('DATABASE') || k.includes('NEON') || k.includes('PG')
    );
    throw new Error(`No database connection available. DB-related env vars: [${dbEnvs.join(', ')}]`);
}

module.exports = { getSQL };
