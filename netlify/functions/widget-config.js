// Widget Config API — Returns practice-specific settings for the embed widget
// GET /.netlify/functions/widget-config?practice=brenes

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    // Fallback — use application default credentials
    admin.initializeApp();
  }
}

const db = admin.firestore();

// Default config for practices that haven't customized yet
const DEFAULT_CONFIG = {
  name: 'PALOMA',
  avatar: 'dove',
  greeting_en: "¡Hola! I'm PALOMA, your dental health guide. I can help with questions about services, insurance, scheduling, or dental health tips. How can I help you today?",
  greeting_es: '¡Hola! Soy PALOMA, tu guía de salud dental. Puedo ayudarte con preguntas sobre servicios, seguros, citas, o consejos de salud dental. ¿En qué puedo ayudarte hoy?',
  personality: 'friendly',
  primary_color: '#2dd4bf',
  phone: '',
  practice_name: '',
  chips_en: ['🦷 What services do you offer?', '💰 Do you accept my insurance?', '📅 How do I book an appointment?', '🔬 Tell me about your technology'],
  chips_es: ['🦷 ¿Qué servicios ofrecen?', '💰 ¿Aceptan mi seguro dental?', '📅 ¿Cómo puedo hacer una cita?', '🔬 Cuéntame sobre su tecnología'],
  languages: ['en', 'es']
};

exports.handler = async function(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'  // Cache for 5 minutes
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const practiceId = event.queryStringParameters?.practice;

  if (!practiceId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing practice parameter' })
    };
  }

  try {
    // Fetch practice document
    const practiceDoc = await db.collection('practices').doc(practiceId).get();
    
    if (!practiceDoc.exists) {
      // Practice not found — return defaults
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(DEFAULT_CONFIG)
      };
    }

    const practice = practiceDoc.data();

    // Fetch avatar config if it exists
    let avatarConfig = {};
    try {
      const avatarDoc = await db.collection('practices').doc(practiceId)
        .collection('config').doc('avatar').get();
      if (avatarDoc.exists) {
        avatarConfig = avatarDoc.data();
      }
    } catch (e) {
      // Avatar config not set — use defaults
    }

    // Build response
    const config = {
      name: avatarConfig.avatar_name || DEFAULT_CONFIG.name,
      avatar: avatarConfig.avatar_style || DEFAULT_CONFIG.avatar,
      avatar_url: avatarConfig.avatar_url || null,
      greeting_en: avatarConfig.avatar_greeting || DEFAULT_CONFIG.greeting_en,
      greeting_es: DEFAULT_CONFIG.greeting_es,
      personality: avatarConfig.personality || DEFAULT_CONFIG.personality,
      primary_color: practice.branding?.primary_color || DEFAULT_CONFIG.primary_color,
      phone: practice.branding?.practice_phone || DEFAULT_CONFIG.phone,
      practice_name: practice.name || DEFAULT_CONFIG.practice_name,
      chips_en: DEFAULT_CONFIG.chips_en,
      chips_es: DEFAULT_CONFIG.chips_es,
      languages: DEFAULT_CONFIG.languages,
      plan: practice.plan || 'starter',
      status: practice.status || 'active'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config)
    };

  } catch (error) {
    console.error('[widget-config] Error:', error);
    return {
      statusCode: 200,  // Return defaults on error, don't break the widget
      headers,
      body: JSON.stringify(DEFAULT_CONFIG)
    };
  }
};
