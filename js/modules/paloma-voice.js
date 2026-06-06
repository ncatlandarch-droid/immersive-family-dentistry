/* ═══════════════════════════════════════════════════════════
   PALOMA Voice Engine — Gemini Neural TTS
   Gives PALOMA a natural, warm voice (Aoede).
   Bilingual: EN + ES from day one.
   
   Usage:
     PALOMA_VOICE.speak(text, lang)  — Queue and play
     PALOMA_VOICE.stop()             — Stop current audio
     PALOMA_VOICE.toggleMute()       — Toggle voice on/off
     PALOMA_VOICE.isMuted()          — Check mute state
   ═══════════════════════════════════════════════════════════ */

const PALOMA_VOICE = (() => {
    // ─── State ───
    let muted = localStorage.getItem('paloma-voice-muted') !== 'false'; // Muted by default
    let queue = [];
    let isPlaying = false;
    let currentSource = null;
    let currentCtx = null;

    // ─── Pre-recorded audio map ───
    // Common phrases pre-recorded as WAV for zero latency
    const PRE_RECORDED = {
        'en': {
            'greeting': '/assets/audio/en-greeting.wav',
            'voice-on': '/assets/audio/en-voice-on.wav',
            'lang-switch': '/assets/audio/en-lang-switch.wav',
            'error': '/assets/audio/en-error.wav',
            'goodbye': '/assets/audio/en-goodbye.wav',
        },
        'es': {
            'greeting': '/assets/audio/es-greeting.wav',
            'voice-on': '/assets/audio/es-voice-on.wav',
            'lang-switch': '/assets/audio/es-lang-switch.wav',
            'error': '/assets/audio/es-error.wav',
            'goodbye': '/assets/audio/es-goodbye.wav',
        }
    };

    // Phrases that map to pre-recorded keys
    const PHRASE_MAP = [
        { pattern: /^Hi, I'm Paloma\. I can talk to you now/i, key: 'voice-on' },
        { pattern: /^Hola, soy Paloma\. Ahora puedo hablarte/i, key: 'voice-on' },
        { pattern: /^Great! I'll speak in English now/i, key: 'lang-switch' },
        { pattern: /^Perfecto! Ahora hablaré en español/i, key: 'lang-switch' },
        { pattern: /I'm having trouble connecting/i, key: 'error' },
        { pattern: /problemas para conectarme/i, key: 'error' },
    ];

    // Check if text matches a pre-recorded phrase
    function getPreRecordedPath(text, lang) {
        for (const { pattern, key } of PHRASE_MAP) {
            if (pattern.test(text)) {
                return PRE_RECORDED[lang]?.[key] || null;
            }
        }
        return null;
    }

    // Try to play a pre-recorded file, return true if successful
    async function tryPlayPreRecorded(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) return false;
            const arrayBuffer = await response.arrayBuffer();
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            currentCtx = audioCtx;
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const source = audioCtx.createBufferSource();
            currentSource = source;
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);

            return new Promise((resolve) => {
                source.onended = () => {
                    currentSource = null;
                    currentCtx = null;
                    audioCtx.close();
                    resolve(true);
                };
                source.start();
                document.dispatchEvent(new CustomEvent('paloma-speaking', { detail: { speaking: true } }));
            });
        } catch (e) {
            console.warn('PALOMA Voice: pre-recorded file not found, using live TTS');
            return false;
        }
    }

    // ─── PCM → WAV Conversion (In-Memory) ───
    function pcmToWav(base64Data, mimeType) {
        const raw = atob(base64Data);
        const pcmBytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) pcmBytes[i] = raw.charCodeAt(i);

        const rateMatch = (mimeType || '').match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

        const dataSize = pcmBytes.length;
        const wavBuffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(wavBuffer);
        const writeStr = (off, s) => {
            for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
        };

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);       // PCM format
        view.setUint16(22, 1, true);       // Mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);       // block align
        view.setUint16(34, 16, true);      // bits per sample
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);
        new Uint8Array(wavBuffer, 44).set(pcmBytes);

        return wavBuffer;
    }

    // ─── Play audio buffer ───
    function playAudio(wavBuffer) {
        return new Promise(async (resolve, reject) => {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                currentCtx = audioCtx;

                const audioBuffer = await audioCtx.decodeAudioData(wavBuffer);
                const source = audioCtx.createBufferSource();
                currentSource = source;
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);

                source.onended = () => {
                    currentSource = null;
                    currentCtx = null;
                    audioCtx.close();
                    resolve();
                };

                source.start();

                // Dispatch speaking event
                document.dispatchEvent(new CustomEvent('paloma-speaking', { detail: { speaking: true } }));

            } catch (e) {
                console.warn('PALOMA Voice: playback error', e);
                currentSource = null;
                currentCtx = null;
                reject(e);
            }
        });
    }

    // ─── Process queue sequentially ───
    async function processQueue() {
        if (isPlaying || queue.length === 0) return;
        isPlaying = true;

        while (queue.length > 0) {
            const { text, lang } = queue.shift();

            try {
                // 1. Try pre-recorded audio first (zero latency)
                const preRecordedPath = getPreRecordedPath(text, lang);
                if (preRecordedPath) {
                    const played = await tryPlayPreRecorded(preRecordedPath);
                    if (played) continue; // Success! Skip to next in queue
                }

                // 2. Fall back to live Gemini TTS
                const response = await fetch('/.netlify/functions/paloma-tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, lang })
                });

                if (!response.ok) {
                    console.warn('PALOMA Voice: TTS API returned', response.status);
                    continue;
                }

                const data = await response.json();

                if (data.audio && data.mimeType) {
                    const wavBuffer = pcmToWav(data.audio, data.mimeType);
                    await playAudio(wavBuffer);
                }

            } catch (e) {
                console.warn('PALOMA Voice: error generating speech', e);
            }
        }

        isPlaying = false;
        document.dispatchEvent(new CustomEvent('paloma-speaking', { detail: { speaking: false } }));
    }

    // ─── Public API ───
    return {
        speak(text, lang = 'en') {
            if (muted || !text) return;

            // Clean text for speech (remove markdown, emojis, excessive punctuation)
            let cleanText = text
                .replace(/\*\*(.*?)\*\*/g, '$1')          // Remove markdown bold
                .replace(/\*(.*?)\*/g, '$1')               // Remove markdown italic
                .replace(/#{1,6}\s/g, '')                  // Remove headers
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // Markdown links → text
                .replace(/[🕊️🦷❤️📅💰📋💬⚠️🚨🔍📆🏥👤💵💡🟢🟡🔴⬜✕↺🔬📊📝⚙️📅👥🏆✅🔄]+/g, '') // Remove emojis
                .replace(/\n{2,}/g, '. ')                  // Double newlines → pause
                .replace(/\n/g, ' ')                       // Single newlines → space
                .replace(/\s{2,}/g, ' ')                   // Collapse whitespace
                .trim();

            if (!cleanText || cleanText.length < 3) return;

            // Truncate very long text for faster response
            if (cleanText.length > 800) {
                cleanText = cleanText.substring(0, 800) + '... That\'s the summary. Ask me for more details!';
            }

            queue.push({ text: cleanText, lang });
            processQueue();
        },

        stop() {
            queue = [];
            if (currentSource) {
                try { currentSource.stop(); } catch (e) {}
                currentSource = null;
            }
            if (currentCtx) {
                try { currentCtx.close(); } catch (e) {}
                currentCtx = null;
            }
            isPlaying = false;
            document.dispatchEvent(new CustomEvent('paloma-speaking', { detail: { speaking: false } }));
        },

        isMuted() {
            return muted;
        },

        toggleMute() {
            muted = !muted;
            localStorage.setItem('paloma-voice-muted', muted);
            if (muted) this.stop();

            // Update all voice badges
            document.querySelectorAll('.paloma-voice-badge').forEach(el => {
                el.textContent = muted ? '🔇' : '🔊';
                el.title = muted ? 'Enable PALOMA voice' : 'Mute PALOMA voice';
            });

            // Dispatch event for UI updates
            document.dispatchEvent(new CustomEvent('paloma-voice-toggle', { detail: { muted } }));

            return !muted;
        },

        setMuted(state) {
            muted = state;
            localStorage.setItem('paloma-voice-muted', muted);
            if (muted) this.stop();
        }
    };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PALOMA_VOICE;
}
