/* ═══════════════════════════════════════════════════════════
   Financial Analyze — Netlify Serverless Function
   AI-powered dental practice financial report analysis.
   
   Environment variable required: GEMINI_API_KEY
   ═══════════════════════════════════════════════════════════ */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_FALLBACK_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `You are a dental practice financial analyst AI for Lake Jeanette Family & Implant Dentistry. You analyze uploaded financial reports and provide actionable insights.

DENTAL PRACTICE FINANCIAL BENCHMARKS (use these to evaluate performance):
- Target collection rate: 95-98% of production
- Target overhead: 55-65% of collections
- Staff costs: 25-30% of production
- Lab costs: 8-12% of production
- Facility costs: 5-8% of production
- Supply costs: 5-7% of production
- Marketing costs: 3-5% of production
- Target new patients: 20-30 per month for a single-doctor practice
- Average production per patient visit: $350-$600
- Hygiene production: 30-33% of total production
- Case acceptance rate: 80-90%
- Accounts receivable over 90 days: should be under 15% of total AR

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact structure (no markdown, no code fences, just raw JSON):
{
  "summary": "A 2-3 sentence executive summary of the financial health",
  "kpis": {
    "production": { "value": 0, "label": "Monthly Production" },
    "collectionRate": { "value": 0, "label": "Collection Rate %" },
    "outstandingAR": { "value": 0, "label": "Outstanding AR" },
    "expenseRatio": { "value": 0, "label": "Expense Ratio %" }
  },
  "trends": [
    { "metric": "Metric Name", "direction": "up|down|flat", "percentage": 0, "detail": "Brief explanation" }
  ],
  "alerts": [
    { "severity": "warning|critical|info", "title": "Alert Title", "message": "Detail about the concern" }
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ]
}

RULES:
1. Extract actual numbers from the uploaded data when available
2. Compare metrics to the benchmarks above
3. Flag anything outside benchmark ranges as alerts
4. Provide specific, actionable recommendations
5. Be direct and professional — this is for the practice owner
6. If data is unclear or partial, note what's missing and analyze what's available
7. Always return valid JSON — never include markdown formatting`;

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY environment variable not set');
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server configuration error — GEMINI_API_KEY not set' }),
        };
    }

    try {
        const { fileContent, fileType, reportType } = JSON.parse(event.body);

        if (!fileContent) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'fileContent is required' }),
            };
        }

        // Build the user message with the file data
        const userMessage = `Analyze this ${reportType || 'financial report'} (${fileType || 'unknown format'}) for our dental practice. Here is the file content:\n\n${fileContent}`;

        const requestBody = JSON.stringify({
            system_instruction: {
                parts: [{ text: SYSTEM_PROMPT }],
            },
            contents: [{
                role: 'user',
                parts: [{ text: userMessage.substring(0, 30000) }], // Cap input size
            }],
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2000,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ],
        });

        // Try primary model, fallback to 2.0-flash on 503/429
        let response;
        try {
            const controller1 = new AbortController();
            const timeout1 = setTimeout(() => controller1.abort(), 15000);
            response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller1.signal,
                body: requestBody,
            });
            clearTimeout(timeout1);

            if (response.status === 503 || response.status === 429) {
                console.warn(`Primary model returned ${response.status}, trying fallback...`);
                const controller2 = new AbortController();
                const timeout2 = setTimeout(() => controller2.abort(), 15000);
                response = await fetch(`${GEMINI_FALLBACK_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller2.signal,
                    body: requestBody,
                });
                clearTimeout(timeout2);
            }
        } catch (fetchErr) {
            if (fetchErr.name === 'AbortError') {
                console.warn('Primary model timed out, trying fallback...');
                const controller3 = new AbortController();
                const timeout3 = setTimeout(() => controller3.abort(), 15000);
                response = await fetch(`${GEMINI_FALLBACK_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller3.signal,
                    body: requestBody,
                });
                clearTimeout(timeout3);
            } else {
                throw fetchErr;
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    error: 'AI analysis failed',
                    summary: 'Unable to analyze the report at this time. Please try again.',
                    kpis: {},
                    trends: [],
                    alerts: [{ severity: 'warning', title: 'Analysis Unavailable', message: 'The AI service returned an error. Please try again in a moment.' }],
                    recommendations: ['Try uploading the report again in a few minutes.'],
                }),
            };
        }

        const data = await response.json();
        let rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Strip markdown code fences if present
        rawReply = rawReply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        // Try to parse as JSON
        let result;
        try {
            result = JSON.parse(rawReply);
        } catch (parseErr) {
            console.error('Failed to parse Gemini response as JSON:', rawReply.substring(0, 500));
            result = {
                summary: rawReply.substring(0, 500),
                kpis: {},
                trends: [],
                alerts: [{ severity: 'info', title: 'Partial Analysis', message: 'AI returned unstructured text — displaying summary only.' }],
                recommendations: [],
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('Financial analyze function error:', error.message, error.stack);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                error: error.message,
                summary: 'An error occurred during analysis.',
                kpis: {},
                trends: [],
                alerts: [{ severity: 'critical', title: 'System Error', message: error.message }],
                recommendations: ['Check server logs and try again.'],
            }),
        };
    }
};
