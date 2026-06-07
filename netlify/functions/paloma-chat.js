/* ═══════════════════════════════════════════════════════════
   PALOMA Chat — Netlify Serverless Function
   Proxies chat requests to Gemini API with practice context.
   
   Environment variable required: GEMINI_API_KEY
   ═══════════════════════════════════════════════════════════ */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
- We believe in showing patients their data — transparency builds trust

APPOINTMENT BOOKING — THIS IS YOUR MOST IMPORTANT JOB:
When a patient wants to book an appointment, DO NOT just tell them to call. Instead, actively help them:
1. Ask for their full name
2. Ask for their phone number or email
3. Ask what they need (cleaning, emergency, consultation, etc.)
4. Ask for their preferred days/times (our hours are Mon-Wed 8am-5pm, Thu 8am-3pm)
5. Ask if they have dental insurance and which provider
6. Once you have this info, confirm it back to them and say: "I've got everything! Our front desk team will reach out within 1 business day to confirm your appointment. You can also call us directly at (336) 545-4281 if you'd like to confirm sooner."

For EMERGENCY situations, skip the booking flow and say: "If you're in pain right now, please call us immediately at (336) 545-4281. If it's after hours or a severe emergency, please go to your nearest emergency room."

For NEW PATIENTS, mention: "Welcome! As a new patient, your first visit will include a comprehensive exam with digital X-rays and a 3D scan. Dr. Brenes will create a personalized treatment plan just for you."

PATIENT PORTAL UPSELL — MENTION THIS NATURALLY:
When it feels natural in conversation (especially after helping someone or during booking), let them know:
"By the way — once you become a patient, I'll have access to your personal MouthMap through our patient portal. That means I can help you with YOUR specific dental history, upcoming appointments, treatment plans, and insurance details. I become your personal dental assistant who knows exactly what's going on with your teeth!"
Don't force this — work it in naturally when they're engaged. The goal is to make them excited about becoming a patient.`;


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
        const { message, history = [], lang = 'en', scheduleContext = '', mode = 'patient', patientContext = '' } = JSON.parse(event.body);

        if (!message || typeof message !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Message is required' }),
            };
        }

        // ─── Build System Prompt Based on Mode ───
        let basePrompt;
        if (mode === 'admin') {
            basePrompt = `You are PALOMA (Patient Advocacy & Lifecycle Oral Map Assistant), operating in CLINICAL ASSISTANT MODE for Dr. Christian Brenes at Lake Jeanette Family & Implant Dentistry.

ROLE: You are Dr. Brenes' intelligent clinical assistant. He is a board-certified Prosthodontist (UNC Chapel Hill). You help him with:
- Quick patient lookups ("Tell me about Maria Gonzalez's next appointment")
- Schedule summaries ("Who do I have today?", "What's my week look like?")
- Treatment planning notes ("What procedures are scheduled for tomorrow?")
- Patient history context ("When was Robert Chen's last visit?")
- Clinical reminders ("Any pending appointments I need to confirm?")

PERSONALITY: Professional but personable. Use clinical language when appropriate. Be efficient — Dr. Brenes is busy. Give concise, actionable answers. Use bullet points for lists. Bold important info.

RULES:
1. Reference ONLY the patient data and schedule provided below — do NOT fabricate patient information.
2. If asked about a patient not in the data, say: "I don't have records for that patient in the current system."
3. Keep responses brief and clinical — 2-3 paragraphs max.
4. When summarizing schedules, format as a clean timeline.
5. Highlight anything urgent (emergencies, pending confirmations).
6. You can suggest schedule optimizations or flag conflicts.

PRACTICE INFO:
- Hours: Mon-Wed 8am-5pm, Thu 8am-3pm, Fri-Sun Closed
- Phone: (336) 545-4281
- Team: Dr. Brenes + dental assistants Missie, Logan, Emily, Michelle, Cameron` + patientContext;
        } else {
            basePrompt = SYSTEM_PROMPT;
        }

        // ─── Enhanced System Prompt with Live Schedule Data ───
        const enhancedPrompt = basePrompt + scheduleContext + `

APPOINTMENT BOOKING SYSTEM:
You can ACTUALLY book appointments now! When you have collected ALL the required info from a patient (name, phone/email, reason, preferred date/time), include this special tag at the END of your response:

[BOOK_APPOINTMENT]
name: Patient Full Name
phone: their phone
email: their email
reason: what they need
preferred_date: when they want
insurance: their insurance or None
[/BOOK_APPOINTMENT]

This will automatically save the appointment to our system. ALWAYS confirm the details with the patient BEFORE including this tag. After booking, tell them their appointment request has been received and the front desk will confirm within 1 business day.

SCHEDULING INTELLIGENCE:
When a patient asks to book an appointment or asks about availability:
1. Check the CURRENT SCHEDULE & AVAILABILITY section above
2. Suggest SPECIFIC available times: "I see we have openings on [day] at [time] and [time]. Which works best for you?"
3. If they ask for a time that's booked, say: "That time is already taken, but I have [nearest available] open. Would that work?"
4. If they're flexible, recommend the earliest available slot
5. Always mention the day AND time when suggesting slots
6. For urgent/emergency cases, offer the earliest available slot and also mention calling (336) 545-4281`;

        // Build conversation contents for Gemini
        const contents = [];

        // Add conversation history (exclude the current message if it got included)
        for (const msg of history.slice(-8)) {
            if (msg.content === message && msg.role === 'user') continue; // Skip duplicate
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

        // Call Gemini API with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout (Netlify max is 26s)

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: enhancedPrompt }],
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.9,
                        topK: 40,
                        maxOutputTokens: 800,
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    ],
                }),
            });
            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', response.status, errorText);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        reply: `I'm having a moment — please try again, or call us directly at (336) 545-4281! 🕊️`,
                        debug: `API ${response.status}`
                    }),
                };
            }

            const data = await response.json();
            let reply = data.candidates?.[0]?.content?.parts?.[0]?.text
                || (lang === 'es'
                    ? 'Disculpa, no pude procesar tu solicitud. ¿Puedes intentar de nuevo?'
                    : 'I apologize, I couldn\'t process that. Could you try again?');

            // ─── Detect & Process Appointment Booking ───
            let bookingData = null;
            const bookingMatch = reply.match(/\[BOOK_APPOINTMENT\]([\s\S]*?)\[\/BOOK_APPOINTMENT\]/);
            if (bookingMatch) {
                try {
                    const bookingText = bookingMatch[1];
                    const getField = (field) => {
                        const match = bookingText.match(new RegExp(`${field}:\\s*(.+)`, 'i'));
                        return match ? match[1].trim() : '';
                    };

                    bookingData = {
                        patient_name: getField('name'),
                        patient_phone: getField('phone'),
                        patient_email: getField('email'),
                        reason: getField('reason'),
                        preferred_date: getField('preferred_date'),
                        insurance_provider: getField('insurance') || 'None',
                        source: 'paloma-chat',
                        lang,
                    };

                    // Strip the booking tag from the visible reply
                    reply = reply.replace(/\[BOOK_APPOINTMENT\][\s\S]*?\[\/BOOK_APPOINTMENT\]/, '').trim();
                    reply += `\n\n✅ **Appointment request received!** Our front desk will reach out within 1 business day to confirm your time.`;
                    console.log('PALOMA parsed booking:', JSON.stringify(bookingData));
                } catch (bookErr) {
                    console.error('Booking parse error:', bookErr.message);
                    reply = reply.replace(/\[BOOK_APPOINTMENT\][\s\S]*?\[\/BOOK_APPOINTMENT\]/, '').trim();
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ reply, bookingData }),
            };

        } catch (fetchError) {
            clearTimeout(timeout);
            if (fetchError.name === 'AbortError') {
                console.error('Gemini API timeout after 8s');
            } else {
                console.error('Gemini fetch error:', fetchError.message);
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    reply: lang === 'es'
                        ? 'Disculpa, estoy tardando un poco. ¿Puedes intentar de nuevo? O llámanos al (336) 545-4281. 🕊️'
                        : 'I took a little too long there — please try again! Or call us at (336) 545-4281. 🕊️',
                    debug: fetchError.name === 'AbortError' ? 'timeout' : fetchError.message
                }),
            };
        }

    } catch (error) {
        console.error('PALOMA function error:', error.message, error.stack);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                reply: 'I\'m having a moment — please try again, or call us directly at (336) 545-4281! 🕊️',
                debug: error.message
            }),
        };
    }
};
