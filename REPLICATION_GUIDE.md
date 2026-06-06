# MouthMap + PALOMA — Replication Guide 🕊️

> **Fork. Configure. Deploy. Any dental practice in 30 minutes.**

This guide walks you through replicating the MouthMap + PALOMA platform for a new dental practice. The system is designed to be modular — swap the data files, update the config, and deploy.

---

## Quick Start

```bash
# 1. Fork this repo
git clone https://github.com/your-org/mouthmap-dental-platform.git my-dental-practice
cd my-dental-practice

# 2. Install Netlify CLI (if not already)
npm install -g netlify-cli

# 3. Set your Gemini API key
netlify env:set GEMINI_API_KEY "your-gemini-api-key"

# 4. Deploy
netlify deploy --prod
```

---

## Step 1: Update Site Configuration

Edit `data/site-config.json` with the new practice's information:

```json
{
  "practice": {
    "name": "Your Practice Name",
    "doctor": "Dr. Your Name, DDS",
    "phone": "(XXX) XXX-XXXX",
    "email": "contact@yourpractice.com",
    "address": {
      "street": "123 Main St",
      "city": "Your City",
      "state": "NC",
      "zip": "27000"
    },
    "hours": { ... },
    "social": { ... }
  },
  "paloma": {
    "name": "PALOMA",
    "greeting_en": "Hi! I'm PALOMA, your dental health guide at Your Practice. 🕊️",
    "greeting_es": "¡Hola! Soy PALOMA, tu guía de salud dental en Your Practice. 🕊️",
    "personality": "warm, knowledgeable, reassuring"
  },
  "branding": {
    "primaryColor": "#0D4F4F",
    "accentColor": "#C4A35A",
    "logoPath": "/images/logo.png"
  }
}
```

## Step 2: Update Practice Data Files

| File | What to Change |
|------|---------------|
| `data/services-catalog.json` | Services offered, pricing, CDT codes |
| `data/insurance-plans.json` | Accepted insurance plans, coverage tiers |
| `data/faq-knowledge.json` | Practice-specific FAQs in EN + ES |
| `data/staff-directory.json` | Doctor bio, team members, credentials |
| `data/financial-summary.json` | Remove demo data, connect to PMS |

## Step 3: Update PALOMA's System Prompt

Edit `netlify/functions/paloma-chat.js` and update the `SYSTEM_PROMPT` constant with:
- Practice name and contact info
- Doctor credentials and specialties
- Services and pricing
- Insurance plans accepted
- Unique selling points

## Step 4: Update Branding

### Colors (CSS)
Edit `css/style.css` design tokens (lines 1-50):
```css
:root {
    --color-deep-ocean: #YOUR_DARK_COLOR;
    --color-cyan: #YOUR_PRIMARY_ACCENT;
    --color-coral: #YOUR_SECONDARY_ACCENT;
}
```

### PALOMA Widget Colors
Edit `css/paloma-widget.css`:
```css
:root {
    --paloma-teal: #YOUR_PRIMARY;
    --paloma-gold: #YOUR_ACCENT;
}
```

### Logo
Replace `images/logo.png` with the practice's logo.

### PALOMA Avatar
Replace `images/paloma/paloma-avatar.png` with the practice's preferred avatar, or keep the default.

## Step 5: Update HTML Content

In `index.html`, search and replace:
- Practice name (appears ~15 times)
- Phone number
- Address
- Doctor name
- Meta descriptions
- Structured data (JSON-LD)

## Step 6: Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password Authentication**
3. Create 3 user accounts:
   - Admin (Dr. + office manager)
   - Staff (dental assistants)
   - Patient (beta tester)
4. Update Firebase config in:
   - `portal/portal.js`
   - `admin/admin.js`

## Step 7: Patient Data

Create patient records in `data/patients/[patient-id]/`:
```
data/patients/john-doe/
├── records.json        # Demographics, insurance, allergies
├── dental-chart.json   # 32-tooth chart with AI findings
├── treatment-plan.json # Pending procedures + costs
└── timeline.json       # Visit history
```

## Step 8: Deploy to Netlify

```bash
# Link to Netlify
netlify init

# Set environment variable
netlify env:set GEMINI_API_KEY "your-key"

# Deploy
netlify deploy --prod
```

---

## Directory Structure

```
your-practice/
├── index.html              # Main website
├── netlify.toml            # Netlify config
├── css/
│   ├── style.css           # Main styles + design tokens
│   └── paloma-widget.css   # PALOMA chat widget styles
├── js/
│   ├── main.js             # Main site interactions
│   └── modules/
│       └── paloma-widget.js # PALOMA chat widget
├── portal/                  # Patient Portal ("My MouthMap")
│   ├── index.html
│   ├── portal.css
│   ├── portal.js
│   └── mouth-viewer.js     # Three.js 3D viewer
├── admin/                   # Admin Dashboard
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── staff/                   # Staff Quick-View
│   └── index.html
├── data/                    # Knowledge Base (JSON)
│   ├── site-config.json
│   ├── services-catalog.json
│   ├── insurance-plans.json
│   ├── faq-knowledge.json
│   ├── staff-directory.json
│   ├── financial-summary.json
│   ├── integration-map.json
│   └── patients/
│       └── [patient-id]/
│           ├── records.json
│           ├── dental-chart.json
│           ├── treatment-plan.json
│           └── timeline.json
├── netlify/
│   └── functions/
│       └── paloma-chat.js   # Gemini API proxy
└── images/
    ├── paloma/
    │   ├── paloma-avatar.png
    │   └── paloma-icon.png
    └── ...
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for PALOMA |
| `FIREBASE_API_KEY` | ✅ | Firebase project API key |
| `FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |

---

## Support

Built by [Think! Design and Planning, LLC](https://thinkdesignplan.com)

For SaaS licensing, white-label deployment, or custom integrations, contact:
- Email: chris@thinkdesignplan.com
- Website: thinkdesignplan.com
