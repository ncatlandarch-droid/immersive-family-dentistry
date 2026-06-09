// Quick diagnostic: lists available Gemini models for your API key
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'No API key' }) };
    }

    try {
        // Try both v1 and v1beta
        const results = {};
        
        for (const version of ['v1', 'v1beta']) {
            const resp = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`);
            if (resp.ok) {
                const data = await resp.json();
                results[version] = (data.models || [])
                    .filter(m => m.name.includes('gemini'))
                    .map(m => m.name)
                    .slice(0, 20);
            } else {
                results[version] = `Error ${resp.status}: ${(await resp.text()).substring(0, 200)}`;
            }
        }
        
        // Also log key info (first 4 and last 4 chars)
        results.keyPrefix = apiKey.substring(0, 4);
        results.keySuffix = apiKey.substring(apiKey.length - 4);
        results.keyLength = apiKey.length;
        
        return { statusCode: 200, headers, body: JSON.stringify(results, null, 2) };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
