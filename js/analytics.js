/* ═══════════════════════════════════════════════════════════
   Site Analytics Tracker — Paloma Dental Platform 🕊️📊
   Lightweight Firestore-based pageview tracker.
   No third-party analytics SDKs needed.
   
   Writes to: analytics/pageviews/events/{auto-id}
   Aggregates: analytics/daily/{YYYY-MM-DD}/summary
   ═══════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // Don't track admin or portal pages
    const path = window.location.pathname;
    if (path.startsWith('/admin') || path.startsWith('/portal')) return;

    // Don't track bots
    const ua = navigator.userAgent || '';
    if (/bot|crawl|spider|slurp|facebook|twitter|whatsapp/i.test(ua)) return;

    // Don't track more than once per page per session
    const sessionKey = 'paloma_tracked_' + path;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    // Generate or retrieve persistent visitor ID
    let visitorId = localStorage.getItem('paloma_vid');
    if (!visitorId) {
        visitorId = 'v_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('paloma_vid', visitorId);
    }

    // Wait for Firebase to be available
    function waitForFirebase(cb, attempts) {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            cb();
        } else if (attempts < 20) {
            setTimeout(() => waitForFirebase(cb, attempts + 1), 300);
        }
    }

    waitForFirebase(function() {
        const db = firebase.firestore();
        const now = new Date();
        const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // Determine traffic source
        const ref = document.referrer || '';
        let source = 'direct';
        if (ref) {
            try {
                const refHost = new URL(ref).hostname.replace('www.', '');
                if (refHost.includes('google')) source = 'google';
                else if (refHost.includes('facebook') || refHost.includes('fb.')) source = 'facebook';
                else if (refHost.includes('instagram')) source = 'instagram';
                else if (refHost.includes('yelp')) source = 'yelp';
                else if (refHost.includes('linkedin')) source = 'linkedin';
                else if (refHost !== window.location.hostname.replace('www.', '')) source = refHost;
            } catch(e) { source = 'unknown'; }
        }

        // Record pageview event
        db.collection('analytics').doc('pageviews')
          .collection('events').add({
            page: path || '/',
            source: source,
            visitorId: visitorId,
            date: dateKey,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            screenWidth: window.innerWidth,
            language: navigator.language || 'en',
            userAgent: ua.substring(0, 200)
        }).catch(() => {}); // Silent fail — analytics should never break the site

        // Aggregate daily counter
        const dailyRef = db.collection('analytics').doc('daily')
                           .collection(dateKey).doc('summary');
        
        db.runTransaction(async (tx) => {
            const doc = await tx.get(dailyRef);
            if (doc.exists) {
                const data = doc.data();
                const pages = data.pages || {};
                const sources = data.sources || {};
                pages[path || '/'] = (pages[path || '/'] || 0) + 1;
                sources[source] = (sources[source] || 0) + 1;
                tx.update(dailyRef, {
                    pageviews: (data.pageviews || 0) + 1,
                    pages: pages,
                    sources: sources
                });
            } else {
                tx.set(dailyRef, {
                    pageviews: 1,
                    pages: { [path || '/']: 1 },
                    sources: { [source]: 1 },
                    date: dateKey
                });
            }
        }).catch(() => {}); // Silent fail

    }, 0);
})();
