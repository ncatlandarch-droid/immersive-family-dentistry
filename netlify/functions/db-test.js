// Extract the NETLIFY_DB_URL from the internal blob store
exports.handler = async () => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    
    try {
        // Method 1: Try reading from Netlify Blobs (internal env store)
        const token = process.env.NETLIFY_FUNCTIONS_TOKEN;
        const siteId = process.env.SITE_ID;
        
        if (!token || !siteId) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing NETLIFY_FUNCTIONS_TOKEN or SITE_ID' }) };
        }

        // The @netlify/runtime-utils getEnvironment() reads from deploy-scoped blobs
        // Let's try to read the blob store directly
        const blobUrl = `https://api.netlify.com/api/v1/blobs/${siteId}/deploy:environment`;
        
        let blobResult = 'not attempted';
        try {
            const resp = await fetch(blobUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            blobResult = { status: resp.status, body: await resp.text() };
        } catch (e) {
            blobResult = e.message;
        }

        // Method 2: Try the internal deploy config endpoint
        let configResult = 'not attempted';
        try {
            // Netlify runtime-utils reads from a blob store using a special endpoint
            // The token is NETLIFY_FUNCTIONS_TOKEN which scopes to the deploy
            const deployId = process.env.DEPLOY_ID;
            const configUrl = `https://${siteId}--${deployId}.netlify.app/.netlify/functions-internal/environment`;
            const resp2 = await fetch(configUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            configResult = { status: resp2.status, body: (await resp2.text()).substring(0, 500) };
        } catch (e) {
            configResult = e.message;
        }

        // Method 3: Check if @netlify/runtime-utils can get ANY variables
        let runtimeVars = {};
        try {
            const { getEnvironment } = require('@netlify/runtime-utils');
            const env = getEnvironment();
            // Try common DB-related keys
            for (const key of ['NETLIFY_DB_URL', 'DATABASE_URL', 'NETLIFY_DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL']) {
                const val = env.get(key);
                runtimeVars[key] = val ? val.substring(0, 30) + '...' : 'undefined';
            }
            // Try to enumerate
            runtimeVars._has_toObject = typeof env.toObject === 'function';
            if (env.toObject) {
                const all = env.toObject();
                runtimeVars._allKeys = Object.keys(all).sort();
            }
        } catch (e) {
            runtimeVars._error = e.message;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                siteId,
                deployId: process.env.DEPLOY_ID || 'not set',
                blobResult,
                configResult,
                runtimeVars,
                allNetlifyEnv: Object.entries(process.env)
                    .filter(([k]) => k.startsWith('NETLIFY') || k.startsWith('SITE') || k.startsWith('DEPLOY') || k.startsWith('URL'))
                    .map(([k,v]) => [k, v.length > 20 ? v.substring(0,10)+'...' : v])
            }, null, 2)
        };
    } catch (e) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message, stack: e.stack }) };
    }
};
