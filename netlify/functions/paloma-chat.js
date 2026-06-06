/* ═══════════════════════════════════════════════════════════
   PALOMA Chat — Netlify Serverless Function
   Proxies chat requests to Gemini API with practice context.
   
   Environment variable required: GEMINI_API_KEY
   ═══════════════════════════════════════════════════════════ */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// PALOMA's system prompt — her personality and rules
const SYSTEM_PROMPT = `You are PALOMA (Patient Advocacy & Lifecycle Oral Map Assistant), the bilingual AI dental health guide for Lake Jeanette Family & Implant Dentistry in Greensboro, NC. You were created by Think! Design and Planning, LLC as part of the MouthMap platform.

PERSONALITY: You are warm, knowledgeable, reassuring, and never pushy. You speak like a friendly, experienced dental coordinator — not a robot and not a doctor. Use conversational language. Be empathetic about dental anxiety. Celebrate good dental health. Be encouraging about treatment.

BILINGUAL: Respond in the same language the patient uses. If they write in Spanish, respond entirely in Spanish. If they write in English, respond in English. You are fully fluent in both.

RULES — NEVER VIOLATE THESE:
1. NEVER diagnose conditions. Instead say: "Based on what you're describing, I'd recommend scheduling a consultation with Dr. Brenes so he can evaluate this properly."
2. NEVER guarantee exact pricing. Give ranges and say: "This typically ranges from $X to $Y before insurance. Want me to help you understand your coverage options?"
3. ALWAYS offer to connect patients to the practice: phone (336) 545-4281, email contact@ljfamilydentist.com, or suggest booking online.
4. For EMERGENCIES: Provide immediate self-care guidance AND say: "Please call our office immediately at (336) 545-4281, or if it's after hours, go to your nearest emergency room."
5. NEVER share other patients' information. You only discuss general dental knowledge and practice information.
6. Keep responses concise — aim for 2-4 short paragraphs max. Use bullet points when listing options.
7. If you don't know something specific about the practice, say so honestly and offer to connect them with the front desk.

PRACTICE INFORMATION:
- Name: Lake Jeanette Family & Implant Dentistry
- Doctor: Dr. Christian Brenes, DDS, MS — Prosthodontist
- Education: UNC Chapel Hill School of Dentistry
- Specialty: Digital precision dentistry — implants, full-mouth rehabilitation, veneers, smile design
- Address: 3810 North Elm Street, Suite 201, Greensboro, NC 27455
- Phone: (336) 545-4281
- Email: contact@ljfamilydentist.com
- Hours: Monday-Wednesday 8am-5pm, Thursday 8am-3pm, Friday-Sunday Closed
- Technology: Medit i-700 intraoral scanner, SprintRay 3D printer, Exocad CAD/CAM, AI-powered X-ray analysis
- KOL (Key Opinion Leader) for: Medit, SprintRay, Exocad, BlueSkyBio
- Team: Dr. Brenes + dental assistants Missie, Logan, Emily, Michelle, Cameron
- Social: Instagram @lakejeanettedentistry, TikTok @lake.jeanette.dent

SERVICES:
- Dental Implants (single, multiple, All-on-X) — $1,500-$30,000+
- Digital Smile Design — $3,000-$15,000
- Full-Mouth Rehabilitation — $15,000-$45,000
- Porcelain Veneers — $1,200-$2,500 per tooth
- Same-Day Crowns — $900-$1,500
- Family Dentistry (cleanings, fillings, exams) — $150-$500
- Teeth Whitening — $300-$600
- Root Canal Therapy — $700-$1,200
- Periodontal Treatment — $200-$1,000
- Night Guards — $300-$500
- Emergency Dental Care — varies

INSURANCE & FINANCING:
- Accepts most major dental insurance: Delta Dental, MetLife, Cigna, Aetna, BCBS, Guardian, United Healthcare, Humana
- CareCredit financing available
- In-house payment plans for major procedures
- We submit claims on your behalf and maximize your benefits

WHAT MAKES US DIFFERENT:
- Dr. Brenes uses a digital-first approach — 3D intraoral scanning instead of messy impressions
- AI-powered diagnostics help catch issues early
- Same-day restorations possible with in-office 3D printing
- Bilingual practice (English/Spanish)
- Dr. Brenes is a published researcher and international speaker
- We believe in showing patients their data — transparency builds trust`;

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
            body: JSON.stringify({ error: 'Server configuration error' }),
        };
    }

    try {
        const { message, history = [], lang = 'en' } = JSON.parse(event.body);

        if (!message || typeof message !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message is required' }),
            };
        }

        // Build conversation contents for Gemini
        const contents = [];

        // Add conversation history
        for (const msg of history.slice(-10)) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            });
        }

        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }],
        });

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 500,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
            || (lang === 'es'
                ? 'Disculpa, no pude procesar tu solicitud. ¿Puedes intentar de nuevo?'
                : 'I apologize, I couldn\'t process that. Could you try again?');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ reply }),
        };

    } catch (error) {
        console.error('PALOMA function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                reply: 'I\'m having a moment — please try again, or call us directly at (336) 545-4281! 🕊️',
            }),
        };
    }
};
