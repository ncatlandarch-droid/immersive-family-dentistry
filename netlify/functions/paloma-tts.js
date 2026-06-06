const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = 'Aoede'; // Calm, soothing, warm — perfect dental assistant

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'TTS not configured' }) };
    }

    try {
        const { text, voice, lang } = JSON.parse(event.body);

        if (!text || text.length > 2000) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Text required (max 2000 chars)' }) };
        }

        // For Spanish, prepend language instruction
        let ttsText = text;
        if (lang === 'es') {
            ttsText = `Respond in Spanish. ${text}`;
        }

        const voiceName = voice || DEFAULT_VOICE;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: ttsText }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
                        }
                    }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini TTS error:', response.status, errText);
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'TTS generation failed' }) };
        }

        const data = await response.json();
        const audioPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (!audioPart) {
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'No audio returned' }) };
        }

        return {
            statusCode: 200,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audio: audioPart.inlineData.data,
                mimeType: audioPart.inlineData.mimeType
            })
        };

    } catch (error) {
        console.error('TTS function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
    }
};
