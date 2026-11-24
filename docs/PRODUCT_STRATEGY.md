# SmartCard: Market Research, Roadmap and UI/UX/CX Spec

_Last updated: 2026-11-24_

---

## 1. Market research

### Who we compete with

| App | Known for | Free plan | Where it's strong | Where it's weak |
|---|---|---|---|---|
| **Blinq** | Teams, HR integrations | Yes: 2 cards, unlimited shares | Polished cards, wallet passes, 80+ HRIS integrations | Lead capture is billed per lead; branding on free cards |
| **Popl** | Event lead capture for sales teams | Trial only / very limited | Badge scanning, CRM sync, event ROI | Opaque, quote-based pricing |
| **HiHello** | Card design variety | Limited | Many card designs per user | Free tier caps features and scans |
| **Wave Connect** | Browser-first, no app needed | Yes | Recipient never sees sign-up nags | Smaller ecosystem |
| **Linq** | Historically NFC + app | n/a | (Reportedly pivoted away from cards in 2025, unverified) | Product future unclear |
| **HeyDrop / SoCard** | Apple Wallet cards | Varies | Wallet-first sharing | Thin CRM/analytics |

### Trends that matter (vendor-reported, so treat the numbers loosely)

1. **Recipients should never need the app.** They scan, see a fast mobile page, and save the contact in one tap. Every leader works this way.
2. **Wallet passes are the fastest-growing way to share.** One vendor puts Apple Wallet at about 35% of shares. A card lives in the Wallet app and is shown like a ticket.
3. **Two-way exchange and lead capture.** The recipient sends their details back, which turns a one-way card into a lead. This is the main reason companies pay.
4. **Analytics.** Views, scans, saves and the source of each (QR / NFC / link). Mostly in paid tiers.
5. **CRM sync** (HubSpot, Salesforce, Pipedrive) and **CSV export**.
6. **Paper-card and badge scanning with OCR/AI**, which some apps pair with AI enrichment or meeting notes.
7. **Email signatures and virtual meeting backgrounds** that carry the QR code.
8. **Live updates:** when the card changes, saved copies refresh. **SmartCard already does this** through the contact snapshot sync, and it's a real differentiator worth marketing.

### Where SmartCard stands today

| Capability | SmartCard (before this work) |
|---|---|
| Digital profile + QR + NFC tag | ✅ |
| Live-updating saved contacts | ✅ (rare, a selling point) |
| Privacy controls (show phone/email) | ✅ (fixed in the audit) |
| Recipient web page | ⚠️ Bare HTML, no "Save contact" |
| Save as vCard | ❌ |
| Two-way exchange / lead capture | ❌ |
| Analytics | ⚠️ Events were logged, but nothing reads them |
| Notes / tags on contacts | ⚠️ Stored, but not editable |
| Export | ❌ |
| Wallet pass, CRM sync, OCR scan, email signature, teams | ❌ |

**Positioning to aim for:** *"The free business card that updates itself, with no app needed for the people you meet."* Lead with the live updates and a free two-way exchange, which competitors charge for.

---

## 2. Feature roadmap

### Phase 1: Core loop (built in this release)
The goal is that every scan turns into either a saved contact or a captured lead, and the owner can see it.

| # | Feature | Why |
|---|---|---|
| 1.1 | **Redesigned public profile page** (recipient CX) | The first impression for everyone you meet |
| 1.2 | **Save contact (.vcf)** button | One tap into the phone's contacts, without the app |
| 1.3 | **Exchange contact**: recipient shares their details back | Lead capture; free, unlike Blinq/Popl |
| 1.4 | **Insights**: views, saves, leads, 14-day trend | Shows the owner the card works |
| 1.5 | **Leads inbox** in the Network tab | Where captured leads land |
| 1.6 | **Edit notes and tags** on saved contacts | Remember where you met someone |
| 1.7 | **Export contacts and leads as CSV** | Move data into any CRM today |
| 1.8 | **Design tokens** + Network screen redesign | Consistent and light-mode safe |

### Phase 2: Reach
- **Apple Wallet and Google Wallet passes.** Needs an Apple Pass Type ID certificate and a Google Wallet issuer account.
- **Email signature generator** (HTML snippet with photo + QR).
- **Real email delivery** (Resend/SendGrid) for OTPs, lead alerts and "X saved your card" notifications. This is the audit's B15 blocker.
- **Custom profile links:** pick your own slug and add unlimited custom links (portfolio, calendar, payment).
- **Multiple cards per user** (work / personal).

### Phase 3: Intelligence
- **Paper-card scanner:** on-device OCR, then a pre-filled contact.
- **AI follow-up drafts** after a meeting, written from the notes and tags.
- **Smart reminders** ("Follow up with Priya. You met 3 days ago").
- **Map of where you met people** (optional location stamp on save).

### Phase 4: Teams and monetization
- Team accounts with brand-locked templates, an admin dashboard and central billing.
- CRM sync (HubSpot first; it has the friendliest API), plus Zapier/webhooks.
- **Pricing idea:** Free (1 card, unlimited shares and leads, basic insights). Pro, about ₹199/month (multiple cards, wallet pass, full insights, CSV/CRM, no branding). Teams per seat.

---

## 3. UI / UX / CX design

### 3.1 Design principles
1. **Two-second rule.** A recipient scans and, within two seconds, sees who you are and how to save you.
2. **One primary action per screen.** It's gold, big, and at the bottom where thumbs reach.
3. **Calm premium.** Near-black and warm gold, generous spacing, no visual noise. It should feel like a metal card.
4. **Privacy is visible.** The user always knows what a stranger can see.
5. **Never a dead end.** Every empty state explains what to do next.

### 3.2 Design tokens (`smart-card-app/constants/design.ts`)

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#0B0B0B` | `#FFFFFF` | Screen background |
| `card` | `#111827` | `#F3F4F6` | Surfaces |
| `elevated` | `#1A2230` | `#FFFFFF` | Sheets, inputs |
| `text` | `#FFFFFF` | `#111827` | Primary text |
| `subText` | `#9CA3AF` | `#6B7280` | Secondary text |
| `border` | `#1F2937` | `#E5E7EB` | Dividers |
| `primary` | `#C9A24D` | `#B08A35` | Brand gold, primary CTA |
| `primarySoft` | `rgba(201,162,77,.14)` | `rgba(176,138,53,.12)` | Chips, highlights |
| `onPrimary` | `#0B0B0B` | `#FFFFFF` | Text on gold |
| `success` / `danger` | `#22C55E` / `#EF4444` | `#16A34A` / `#DC2626` | Status |

- **Spacing:** 4 · 8 · 12 · 16 · 24 · 32
- **Radius:** 8 (chips) · 14 (inputs, cards) · 22 (sheets) · 999 (pills)
- **Type:** 28/700 display · 22/700 title · 16/600 heading · 15/400 body · 13/400 caption · 11/600 label (uppercase, tracking 0.6)
- **Touch targets:** at least 44 px. Contrast: text at least 4.5:1 (gold on near-black is about 8:1).

### 3.3 Recipient journey (CX)

```
Scan QR / tap NFC / open link
        │
        ▼
Public profile page (no app, loads in under 1 s, server-rendered)
   ├── [Save contact]  → .vcf download → phone contacts      (event: vcard_download)
   ├── Call / WhatsApp / Email / Website / LinkedIn         (event: link_click)
   └── [Share my details back] → 4-field form → thank-you   (event: lead_submitted)
                                     │
                                     ▼
                     Owner: Leads inbox + Insights counters
```

### 3.4 Screen specs

**A. Public profile page** (`/public/view/{slug}`, server-rendered)
```
┌──────────────────────────────┐
│        ▓▓ gold gradient ▓▓    │
│           ( avatar )          │
│         Priya Sharma          │
│   Product Lead · Acme Corp    │
│   "Short bio, two lines max"  │
│                               │
│  [📞]   [💬]   [✉️]   [🌐]     │  ← round quick actions, only ones that exist
│                               │
│  ┌─────────────────────────┐  │
│  │   ⬇  Save contact       │  │  ← primary gold CTA
│  └─────────────────────────┘  │
│  ┌─────────────────────────┐  │
│  │   ⇄  Share my details   │  │  ← secondary outline CTA, opens form
│  └─────────────────────────┘  │
│  in LinkedIn   𝕏 Twitter  …   │  ← social rows
│        Powered by SmartCard   │
└──────────────────────────────┘
```
- Form fields: name (required), email or phone (one required), company, short note. A honeypot field catches bots, and submissions are rate-limited per IP.
- Respects `public_profile` (404 when private) and `show_phone` / `show_email`.

**B. Network tab** (redesigned)
```
My Network                         [📊] [⤓]
┌ Contacts (24) │ Leads (3 •) ┐            ← segmented control, dot = unread
[🔍 Search name, company, tag…]
[All] [Investor] [Founder] …               ← chips built from your real tags
┌──────────────────────────────┐
│ (av) Priya Sharma        QR › │
│      Product Lead @ Acme      │
│      #investor                │
└──────────────────────────────┘
Empty: "No contacts yet. Scan a QR or tap an NFC card to save someone." [Scan]
```
- 📊 opens Insights and ⤓ exports CSV. Pull to refresh.

**C. Leads list:** a card per lead with name, company, the note in italics and a relative time. An unread lead has a gold left border. Tapping it opens actions: Call · Email · WhatsApp · Mark read · Delete.

**D. Insights**
```
Insights                       7d | 30d
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 128  │ │  41  │ │  12  │ │  9   │
│Views │ │Saves │ │Leads │ │Saved │
└──────┘ └──────┘ └──────┘ └──────┘
Views · last 14 days
▁▂▅▃▇▆▂▁▃▅▆▇█▅        ← simple bar chart
Where views came from: QR 60% · NFC 25% · Link 15%
```

**E. Contact detail:** adds an editable **Notes** box ("Met at TechSummit, interested in API") and a **Tag** chip input, saved through `PATCH /contacts/{id}`.

### 3.5 Shipping Phase 1 (deploy notes)

1. Backend: `pip install -r requirements.txt` (it now includes `jinja2`), then run **`alembic upgrade head`** to create the `leads` table.
2. Set `APP_DOMAIN` to the public URL of the API (for example `https://digitalbussinesscard-backend.onrender.com`). QR codes, vCards and links are built from it.
3. Mobile: no new native modules, so rebuild the dev client only if you already needed to.

**New API endpoints**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/public/view/{slug}?src=qr\|nfc\|link` | — | Recipient page (counts a view) |
| GET | `/public/{slug}/vcard` | — | Download the `.vcf` |
| POST | `/public/{slug}/lead` | — | Submit "Share my details" (rate-limited, with a honeypot) |
| GET | `/leads` · `/leads/export.csv` | ✅ | Leads inbox and CSV |
| PATCH / DELETE | `/leads/{id}` | ✅ | Mark a lead read / delete it |
| GET | `/analytics/summary?days=7` | ✅ | Insights |
| PATCH | `/contacts/{id}` | ✅ | Edit notes and tag |
| GET | `/contacts/export.csv` | ✅ | Contacts CSV |

### 3.6 Accessibility and quality bar
- Every icon-only button has an `accessibilityLabel`.
- The public page works with JavaScript off (the form posts natively) and passes WCAG AA contrast.
- Every list has a loading state, an empty state and an error state with a retry.
