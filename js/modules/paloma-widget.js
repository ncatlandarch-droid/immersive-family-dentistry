/* ═══════════════════════════════════════════════════════════
   PALOMA Chat Widget — JavaScript Module
   Patient Advocacy & Lifecycle Oral Map Assistant 🕊️
   
   Self-contained ES module. Handles:
   - Chat UI injection
   - Conversation state management
   - Gemini API integration via Netlify Function proxy
   - Bilingual EN/ES with auto-detect
   - Smart suggestion chips
   - HIPAA disclaimer
   ═══════════════════════════════════════════════════════════ */

const PALOMA_VERSION = '2.1'; // Increment to clear stale localStorage

const PALOMA_CONFIG = {
    avatarPath: '/images/paloma/paloma-hero.png',
    iconPath: '/images/paloma/paloma-icon.png',
    apiEndpoint: '/.netlify/functions/paloma-chat',
    storageKey: 'paloma-chat-history',
    versionKey: 'paloma-version',
    langKey: 'paloma-lang',
};

const STRINGS = {
    en: {
        name: 'PALOMA',
        subtitle: 'Your AI Dental Health Guide',
        disclaimer: '🔒 This is an AI assistant, not medical advice. For emergencies, call (336) 545-4281 or 911.',
        placeholder: 'Ask PALOMA anything...',
        greeting: `¡Hola! I'm PALOMA, your dental health guide at Lake Jeanette Dentistry. 🕊️

I can help with questions about our services, insurance, scheduling, or dental health tips. How can I help you today?`,
        suggestions: [
            '🦷 What services do you offer?',
            '💰 Do you accept my insurance?',
            '📅 How do I book an appointment?',
            '🔬 Tell me about your technology',
        ],
        poweredBy: 'Powered by',
        thinking: 'PALOMA is thinking',
        sendAria: 'Send message',
        errorMsg: 'I apologize, I\'m having trouble connecting right now. Please call us directly at (336) 545-4281 and our team will be happy to help!',
    },
    es: {
        name: 'PALOMA',
        subtitle: 'Tu Guía de Salud Dental con IA',
        disclaimer: '🔒 Este es un asistente de IA, no consejo médico. Para emergencias, llame al (336) 545-4281 o 911.',
        placeholder: 'Pregúntale a PALOMA...',
        greeting: `¡Hola! Soy PALOMA, tu guía de salud dental en Lake Jeanette Dentistry. 🕊️

Puedo ayudarte con preguntas sobre nuestros servicios, seguros, citas, o consejos de salud dental. ¿En qué puedo ayudarte hoy?`,
        suggestions: [
            '🦷 ¿Qué servicios ofrecen?',
            '💰 ¿Aceptan mi seguro dental?',
            '📅 ¿Cómo puedo hacer una cita?',
            '🔬 Cuéntame sobre su tecnología',
        ],
        poweredBy: 'Desarrollado por',
        thinking: 'PALOMA está pensando',
        sendAria: 'Enviar mensaje',
        errorMsg: '¡Disculpa! Tengo problemas para conectarme. Por favor llama directamente al (336) 545-4281 y nuestro equipo estará encantado de ayudarte.',
    }
};

class PalomaWidget {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.messages = [];
        this.lang = localStorage.getItem(PALOMA_CONFIG.langKey) || 'en';
        this.loadHistory();
        this.render();
        this.attachListeners();
    }

    get strings() {
        return STRINGS[this.lang];
    }

    // ─── Render ───
    render() {
        // Mascot bubble — large portrait
        this.fab = document.createElement('button');
        this.fab.className = 'paloma-fab';
        this.fab.setAttribute('aria-label', 'Chat with PALOMA');
        this.fab.id = 'paloma-fab';
        this.fab.innerHTML = `<img src="/images/paloma/paloma-hero.png" alt="PALOMA" />`;

        // Name label under the bubble
        this.fabLabel = document.createElement('div');
        this.fabLabel.className = 'paloma-fab-label';
        this.fabLabel.textContent = 'PALOMA';

        // Voice badge
        this.fabVoice = document.createElement('span');
        this.fabVoice.className = 'paloma-fab-voice paloma-voice-badge';
        const voiceMuted = typeof PALOMA_VOICE !== 'undefined' ? PALOMA_VOICE.isMuted() : true;
        this.fabVoice.textContent = voiceMuted ? '🔇' : '🔊';
        this.fabVoice.title = voiceMuted ? 'Enable voice' : 'Mute voice';
        this.fabVoice.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof PALOMA_VOICE !== 'undefined') {
                const isNowOn = PALOMA_VOICE.toggleMute();
                if (isNowOn) {
                    const greeting = this.lang === 'es'
                        ? 'Hola, soy Paloma. Ahora puedo hablarte. ¿En qué puedo ayudarte?'
                        : 'Hi, I\'m Paloma. I can talk to you now! How can I help?';
                    PALOMA_VOICE.speak(greeting, this.lang);
                }
            }
        });

        // Notification badge
        this.fabNotif = document.createElement('span');
        this.fabNotif.className = 'paloma-fab-notif';
        this.fabNotif.textContent = '1';

        // Chat panel
        this.panel = document.createElement('div');
        this.panel.className = 'paloma-panel';
        this.panel.id = 'paloma-panel';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-label', 'Chat with PALOMA');
        this.panel.innerHTML = this.buildPanelHTML();

        document.body.appendChild(this.panel);
        document.body.appendChild(this.fab);
        document.body.appendChild(this.fabLabel);
        document.body.appendChild(this.fabVoice);
        document.body.appendChild(this.fabNotif);

        // Welcome tooltip — friendly first-visit greeting
        if (!sessionStorage.getItem('paloma-tooltip-shown')) {
            this.fabTooltip = document.createElement('div');
            this.fabTooltip.className = 'paloma-fab-tooltip';
            this.fabTooltip.innerHTML = 'Hi! I\'m <strong>PALOMA</strong> 🕊️ Can I help?';
            document.body.appendChild(this.fabTooltip);
            sessionStorage.setItem('paloma-tooltip-shown', 'true');

            // Auto-hide after 6 seconds
            setTimeout(() => {
                if (this.fabTooltip && this.fabTooltip.parentNode) {
                    this.fabTooltip.style.transition = 'opacity 0.5s';
                    this.fabTooltip.style.opacity = '0';
                    setTimeout(() => this.fabTooltip?.remove(), 500);
                }
            }, 6000);
        }

        // Cache DOM refs
        this.messagesEl = this.panel.querySelector('.paloma-messages');
        this.inputEl = this.panel.querySelector('.paloma-input');
        this.sendBtn = this.panel.querySelector('.paloma-send');
        this.suggestionsEl = this.panel.querySelector('.paloma-suggestions');
        this.avatarEl = this.panel.querySelector('.paloma-header__avatar');

        // Render existing messages or greeting
        if (this.messages.length === 0) {
            this.addBotMessage(this.strings.greeting);
        } else {
            this.renderHistory();
        }
    }

    buildPanelHTML() {
        const s = this.strings;
        const voiceMuted = typeof PALOMA_VOICE !== 'undefined' ? PALOMA_VOICE.isMuted() : true;
        return `
            <div class="paloma-header">
                <img class="paloma-header__avatar" src="${PALOMA_CONFIG.iconPath}" alt="PALOMA" />
                <div class="paloma-header__info">
                    <p class="paloma-header__name">${s.name}</p>
                    <p class="paloma-header__subtitle">${s.subtitle}</p>
                </div>
                <div class="paloma-header__actions">
                    <button class="paloma-voice-toggle paloma-voice-badge" title="${voiceMuted ? 'Enable PALOMA voice' : 'Mute PALOMA voice'}">${voiceMuted ? '🔇' : '🔊'}</button>
                    <div class="paloma-header__lang">
                        <button class="${this.lang === 'en' ? 'active' : ''}" data-lang="en">EN</button>
                        <button class="${this.lang === 'es' ? 'active' : ''}" data-lang="es">ES</button>
                    </div>
                </div>
            </div>
            <div class="paloma-disclaimer">${s.disclaimer}</div>
            <div class="paloma-messages" aria-live="polite"></div>
            <div class="paloma-suggestions">
                ${s.suggestions.map(text => `<button class="paloma-chip">${text}</button>`).join('')}
            </div>
            <div class="paloma-input-area">
                <button class="paloma-mic" aria-label="Speak to PALOMA" title="Tap to speak">🎤</button>
                <input class="paloma-input" type="text" placeholder="${s.placeholder}" aria-label="${s.placeholder}" />
                <button class="paloma-send" aria-label="${s.sendAria}">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
            <div class="paloma-footer">
                ${s.poweredBy} <a href="https://thinkdesignplan.com" target="_blank" rel="noopener">Think! Design & Planning</a> × MouthMap
            </div>
        `;
    }

    // ─── Event Listeners ───
    attachListeners() {
        // FAB toggle
        this.fab.addEventListener('click', () => this.toggle());

        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Suggestion chips
        this.suggestionsEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('paloma-chip')) {
                this.inputEl.value = e.target.textContent;
                this.sendMessage();
            }
        });

        // Language toggle
        this.panel.querySelectorAll('.paloma-header__lang button').forEach(btn => {
            btn.addEventListener('click', () => this.setLanguage(btn.dataset.lang));
        });

        // Voice toggle
        this.panel.querySelector('.paloma-voice-toggle')?.addEventListener('click', () => {
            if (typeof PALOMA_VOICE !== 'undefined') {
                const isNowOn = PALOMA_VOICE.toggleMute();
                if (isNowOn) {
                    // First voice interaction — speak a greeting
                    const greeting = this.lang === 'es'
                        ? 'Hola, soy Paloma. Ahora puedo hablarte. ¿En qué puedo ayudarte?'
                        : 'Hi, I\'m Paloma. I can talk to you now! How can I help?';
                    PALOMA_VOICE.speak(greeting, this.lang);
                }
            }
        });

        // Speaking animation listener
        document.addEventListener('paloma-speaking', (e) => {
            if (e.detail.speaking) {
                this.avatarEl?.classList.add('paloma-header__avatar--speaking');
                this.fab?.classList.add('paloma-fab--speaking');
            } else {
                this.avatarEl?.classList.remove('paloma-header__avatar--speaking');
                this.fab?.classList.remove('paloma-fab--speaking');
            }
        });

        // 🎤 Microphone — Speech-to-Text
        const micBtn = this.panel.querySelector('.paloma-mic');
        if (micBtn) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false;
                this.recognition.interimResults = true;
                this.recognition.lang = this.lang === 'es' ? 'es-US' : 'en-US';
                this.isListening = false;

                micBtn.addEventListener('click', () => {
                    if (this.isListening) {
                        this.recognition.stop();
                        return;
                    }
                    this.recognition.lang = this.lang === 'es' ? 'es-US' : 'en-US';
                    this.recognition.start();
                    this.isListening = true;
                    micBtn.classList.add('paloma-mic--active');
                    micBtn.textContent = '🔴';
                    this.inputEl.placeholder = this.lang === 'es' ? 'Escuchando...' : 'Listening...';
                });

                this.recognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    this.inputEl.value = transcript;
                };

                this.recognition.onend = () => {
                    this.isListening = false;
                    micBtn.classList.remove('paloma-mic--active');
                    micBtn.textContent = '🎤';
                    this.inputEl.placeholder = this.strings.placeholder;
                    // Auto-send if there's text
                    if (this.inputEl.value.trim()) {
                        this.sendMessage();
                    }
                };

                this.recognition.onerror = (event) => {
                    console.warn('Speech recognition error:', event.error);
                    this.isListening = false;
                    micBtn.classList.remove('paloma-mic--active');
                    micBtn.textContent = '🎤';
                    this.inputEl.placeholder = this.strings.placeholder;
                };
            } else {
                // Browser doesn't support speech recognition
                micBtn.style.display = 'none';
            }
        }

        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.toggle();
        });
    }

    // ─── Toggle Panel ───
    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.classList.toggle('paloma-panel--open', this.isOpen);
        this.fab.classList.toggle('paloma-fab--close', this.isOpen);
        document.body.classList.toggle('paloma-open', this.isOpen);

        // Hide mascot extras when panel is open
        const extrasDisplay = this.isOpen ? 'none' : '';
        this.fabLabel.style.display = extrasDisplay;
        this.fabVoice.style.display = extrasDisplay;
        this.fabNotif.style.display = 'none'; // Always hide after first open
        if (this.fabTooltip) this.fabTooltip.remove();

        if (this.isOpen) {
            this.inputEl.focus();
            this.scrollToBottom();

            // Speak welcome greeting on first open (user click satisfies Chrome autoplay)
            if (!this._hasGreeted && typeof PALOMA_VOICE !== 'undefined' && !PALOMA_VOICE.isMuted()) {
                this._hasGreeted = true;
                const welcome = this.lang === 'es'
                    ? 'Hola! Bienvenido a Lake Jeanette Family and Implant Dentistry. Soy Paloma, tu guía de salud dental. ¿En qué puedo ayudarte hoy?'
                    : 'Hi! Welcome to Lake Jeanette Family and Implant Dentistry. I\'m Paloma, your dental health guide. How can I help you today?';
                PALOMA_VOICE.speak(welcome, this.lang);
            }
        } else {
            // Stop speaking when panel closes
            if (typeof PALOMA_VOICE !== 'undefined') {
                PALOMA_VOICE.stop();
            }
        }
    }

    // ─── Language ───
    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem(PALOMA_CONFIG.langKey, lang);

        // Update header
        this.panel.querySelector('.paloma-header__name').textContent = this.strings.name;
        this.panel.querySelector('.paloma-header__subtitle').textContent = this.strings.subtitle;
        this.panel.querySelector('.paloma-disclaimer').textContent = this.strings.disclaimer;
        this.inputEl.placeholder = this.strings.placeholder;

        // Update lang buttons
        this.panel.querySelectorAll('.paloma-header__lang button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        // Update suggestions
        this.suggestionsEl.innerHTML = this.strings.suggestions
            .map(text => `<button class="paloma-chip">${text}</button>`)
            .join('');

        // Update footer
        this.panel.querySelector('.paloma-footer').innerHTML = `
            ${this.strings.poweredBy} <a href="https://thinkdesignplan.com" target="_blank" rel="noopener">Think! Design & Planning</a> × MouthMap
        `;

        // Send language change message
        if (this.messages.length > 0) {
            this.addBotMessage(lang === 'es'
                ? '¡Perfecto! Ahora hablaré en español. ¿En qué puedo ayudarte? 🕊️'
                : 'Great! I\'ll speak in English now. How can I help you? 🕊️'
            );
        }
    }

    // ─── Send Message ───
    async sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text || this.isLoading) return;

        // Auto-detect language
        const detectedLang = this.detectLanguage(text);
        if (detectedLang !== this.lang) {
            this.setLanguage(detectedLang);
        }

        this.addUserMessage(text);
        this.inputEl.value = '';
        this.hideSuggestions();
        this.setLoading(true);

        try {
            const response = await this.callAPI(text);
            this.addBotMessage(response);
        } catch (error) {
            console.error('PALOMA API error:', error);
            this.addBotMessage(this.strings.errorMsg);
        } finally {
            this.setLoading(false);
        }
    }

    // ─── API Call ───
    async callAPI(message) {
        // Build clean history — strip emojis and limit content length
        const history = this.messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-PALOMA_CONFIG.maxHistory)
            .map(m => ({
                role: m.role,
                content: (m.content || '').substring(0, 500),
            }));

        // Fetch live schedule context from Firestore
        let scheduleContext = '';
        try {
            if (typeof getScheduleContext === 'function') {
                scheduleContext = await getScheduleContext();
            }
        } catch (e) {
            console.warn('PALOMA: Could not load schedule context:', e.message);
        }

        let body;
        try {
            body = JSON.stringify({ message, history, lang: this.lang, scheduleContext });
        } catch (e) {
            // If history can't be serialized, send without it
            console.warn('PALOMA: History serialization failed, sending without history');
            body = JSON.stringify({ message, history: [], lang: this.lang });
        }

        const response = await fetch(PALOMA_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });

        const data = await response.json();
        if (data.debug) console.warn('PALOMA debug:', data.debug);

        // If PALOMA booked an appointment, save it to Firestore
        if (data.bookingData && typeof createAppointment === 'function') {
            try {
                const saved = await createAppointment(data.bookingData);
                if (saved) console.log('[PALOMA] ✅ Appointment saved to Firestore:', saved.id);
            } catch (e) {
                console.warn('[PALOMA] Could not save appointment:', e.message);
            }
        }

        return data.reply || this.strings.errorMsg;
    }

    // ─── Message Management ───
    addUserMessage(text) {
        const msg = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(msg);
        this.renderMessage(msg);
        this.saveHistory();
        this.scrollToBottom();
    }

    addBotMessage(text) {
        const msg = { role: 'assistant', content: text, timestamp: Date.now() };
        this.messages.push(msg);
        this.renderMessage(msg);
        this.saveHistory();
        this.scrollToBottom();

        // Speak the response if voice is enabled
        if (typeof PALOMA_VOICE !== 'undefined' && !PALOMA_VOICE.isMuted()) {
            PALOMA_VOICE.speak(text, this.lang);
        } else {
            // Brief visual speaking animation (fallback when voice is off)
            this.avatarEl.classList.add('paloma-header__avatar--speaking');
            setTimeout(() => {
                this.avatarEl.classList.remove('paloma-header__avatar--speaking');
            }, 2000);
        }
    }

    renderMessage(msg) {
        const div = document.createElement('div');
        div.className = `paloma-msg paloma-msg--${msg.role === 'user' ? 'user' : 'bot'}`;
        div.innerHTML = this.formatMessage(msg.content);
        this.messagesEl.appendChild(div);
    }

    renderHistory() {
        this.messagesEl.innerHTML = '';
        this.messages.forEach(msg => this.renderMessage(msg));
    }

    formatMessage(text) {
        // Basic markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    // ─── UI Helpers ───
    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;

        if (loading) {
            this.typingEl = document.createElement('div');
            this.typingEl.className = 'paloma-typing';
            this.typingEl.setAttribute('aria-label', this.strings.thinking);
            this.typingEl.innerHTML = '<span></span><span></span><span></span>';
            this.messagesEl.appendChild(this.typingEl);
            this.scrollToBottom();
            this.avatarEl.classList.add('paloma-header__avatar--speaking');
        } else {
            if (this.typingEl) {
                this.typingEl.remove();
                this.typingEl = null;
            }
            this.avatarEl.classList.remove('paloma-header__avatar--speaking');
        }
    }

    hideSuggestions() {
        this.suggestionsEl.style.display = 'none';
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        });
    }

    // ─── Language Detection ───
    detectLanguage(text) {
        const spanishPatterns = /\b(hola|gracias|por favor|buenos|buenas|cómo|qué|dónde|cuánto|necesito|tengo|puedo|quiero|ayuda|dolor|diente|muela|cita|seguro|dentista)\b/i;
        return spanishPatterns.test(text) ? 'es' : 'en';
    }

    // ─── Persistence ───
    saveHistory() {
        try {
            const trimmed = this.messages.slice(-PALOMA_CONFIG.maxHistory);
            localStorage.setItem(PALOMA_CONFIG.storageKey, JSON.stringify(trimmed));
        } catch (e) {
            // Storage full — clear and continue
            localStorage.removeItem(PALOMA_CONFIG.storageKey);
        }
    }

    loadHistory() {
        try {
            // Version check — clear stale data from old versions
            const storedVersion = localStorage.getItem(PALOMA_CONFIG.versionKey);
            if (storedVersion !== PALOMA_VERSION) {
                console.log('PALOMA: Clearing stale data (version mismatch)');
                localStorage.removeItem(PALOMA_CONFIG.storageKey);
                localStorage.removeItem('paloma-history'); // Old key cleanup
                localStorage.setItem(PALOMA_CONFIG.versionKey, PALOMA_VERSION);
                this.messages = [];
                return;
            }

            const stored = localStorage.getItem(PALOMA_CONFIG.storageKey);
            this.messages = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('PALOMA: Failed to load history, starting fresh');
            localStorage.removeItem(PALOMA_CONFIG.storageKey);
            this.messages = [];
        }
    }
}

// ─── Initialize ───
function initPaloma() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new PalomaWidget());
    } else {
        new PalomaWidget();
    }
}

// Auto-init if loaded as a script tag (not module)
if (typeof window !== 'undefined' && !window.__PALOMA_INIT) {
    window.__PALOMA_INIT = true;
    initPaloma();
}
