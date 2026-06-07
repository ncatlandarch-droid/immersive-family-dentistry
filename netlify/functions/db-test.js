// Minimal test: just try @netlify/database
exports.handler = async () => {
    try {
        const { getDatabase, getConnectionString } = require('@netlify/database');
        
        // Try getConnectionString first
        let connStr;
        try {
            connStr = getConnectionString();
        } catch (e) {
            connStr = 'getConnectionString failed: ' + e.message;
        }
        
        // Try getDatabase
        let dbInfo;
        try {
            const db = getDatabase();
            dbInfo = { driver: db.driver, hasPool: !!db.pool, hasHttp: !!db.httpClient, connStr: db.connectionString ? 'present' : 'missing' };
        } catch (e) {
            dbInfo = 'getDatabase failed: ' + e.message;
        }
        
        // Check what @netlify/runtime-utils sees
        let envInfo;
        try {
            const { getEnvironment } = require('@netlify/runtime-utils');
            const env = getEnvironment();
            envInfo = {
                NETLIFY_DB_URL: env.get('NETLIFY_DB_URL') ? 'present' : 'missing',
                NETLIFY_DB_DRIVER: env.get('NETLIFY_DB_DRIVER') || 'not set',
                NETLIFY_FUNCTIONS_TOKEN: env.get('NETLIFY_FUNCTIONS_TOKEN') ? 'present' : 'missing',
            };
        } catch (e) {
            envInfo = 'runtime-utils failed: ' + e.message;
        }
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connStr, dbInfo, envInfo, processEnvKeys: Object.keys(process.env).filter(k => k.startsWith('NETLIFY')).sort() }, null, 2)
        };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message, stack: e.stack }) };
    }
};
