# SmartCard: Market Research, Roadmap and UI/UX/CX Spec

_Last updated: 2026-11-25_

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

### Phase 2: Reach (built)

| # | Feature | Status |
|---|---|---|
| 2.1 | **Real email delivery** (Resend API, SMTP, or console) for OTPs, **lead alerts**, and contact-update notices. Sent in the background, branded HTML. Fixes audit item B15. | ✅ Needs a `RESEND_API_KEY` |
| 2.2 | **Custom card link** (`/public/view/your-name`) with a live availability check and reserved words. **Old links redirect (301)**, so printed QR codes and NFC tags keep working. | ✅ |
| 2.3 | **Custom links** (up to 20: portfolio, booking, payment) with reordering, shown on the card | ✅ |
| 2.4 | **Email signature generator**: email-safe HTML with avatar, contacts and a QR code, one-tap copy, how-to for Gmail/Outlook/Apple Mail. Views are tracked as source `email`. | ✅ |
| 2.5 | **Apple Wallet (.pkpass) and Google Wallet** passes with your QR. Buttons appear on the card and in the Share kit only when configured. | ✅ Needs Apple/Google credentials |
| 2.6 | **Multiple cards per user** (Work / Personal / …, up to 5). Each card has its own link, QR code, links, design, stats and optional email/phone. One leads inbox across all cards. | ✅ Phase 2b |

**Turning on the parts that need credentials**

- **Email:** create a Resend account, verify your domain, then set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_…` and `EMAIL_FROM="SmartCard <hello@yourdomain.com>"`.
- **Apple Wallet:**
  1. In the Apple Developer account, go to Identifiers → Pass Type IDs and create one.
  2. Create its certificate and export the certificate and its key as PEM.
  3. Download the Apple WWDR G4 certificate (also PEM).
  4. Set the `APPLE_*` variables. Keep the key files out of git.
- **Google Wallet:**
  1. In the Google Pay & Wallet Console, get an issuer ID.
  2. In Google Cloud, enable the Wallet API, create a service account and download its JSON key.
  3. Add the service account as a user in the Wallet console.
  4. Set `GOOGLE_WALLET_ISSUER_ID` and `GOOGLE_WALLET_SA_KEY_PATH`.

### Phase 3: Intelligence (built)

| # | Feature | Status |
|---|---|---|
| 3.1 | **Paper-card scanner**: photograph a card, Claude reads it into a form, you review it, then save it as a contact. It works for cards from people who don't use SmartCard. Without AI configured, the same form lets you type the details in. | ✅ Needs `ANTHROPIC_API_KEY` |
| 3.2 | **AI follow-up drafts** for Email, WhatsApp or LinkedIn. They use your notes, where you met, the time since you met, your goal and a tone. You can edit the draft, then send it through the right app. | ✅ Needs `ANTHROPIC_API_KEY` |
| 3.3 | **Follow-up reminders** (Tomorrow / 3 days / Next week / 2 weeks). The Network tab shows a "N follow-ups due" banner and filter. | ✅ In-app; push notifications need `expo-notifications` and a native rebuild |
| 3.4 | **Where you met**: an event or place plus the date on every contact. You can search it, it's in the CSV export, and the AI uses it. | ✅ Map view needs `expo-location` and `react-native-maps` (native) |
| 3.5 | **Lead → contact**: save a lead into your network in one tap | ✅ |
| 3.6 | **Scan a QR code from a photo**, decoded on the device. Fixes audit item B10b. | ✅ |

**How the AI is used (`backend/app/services/ai_service.py`)**
- Model: `claude-opus-5-5` (change it with `AI_MODEL`).
- Calls go through `client.beta.messages.create` with server-side refusal fallbacks (`fallbacks: "default"`).
- Answers come back as structured JSON (`output_config.format` with a JSON schema), so they always parse.
- Effort is `low` for reading cards and `medium` for drafts.
- Refusals, cut-off answers and provider errors become clear 422/503 messages in the app.
- Photos are auto-rotated and shrunk to 1568 px before upload, and the server never stores them.
- Daily limits per user: 30 scans and 60 drafts (`AI_SCANS_PER_DAY` / `AI_DRAFTS_PER_DAY`).
- Text on cards and in profiles is treated as data, never as instructions to the model.
- Nothing is saved until the user confirms.

**Phase 3 endpoints**

| Method | Path | Purpose |
|---|---|---|
| GET | `/ai/status` | Whether the AI features are switched on |
| POST | `/ai/scan-card` (multipart `file`) | Read a card photo and return the fields (saves nothing) |
| POST | `/contacts/manual` | Save a contact that has no SmartCard |
| GET | `/contacts/reminders?tz_offset=330` | Overdue / today / upcoming follow-ups in the user's local day |
| PATCH | `/contacts/{id}` | Now also takes `met_at`, `met_on`, `follow_up_at` (null clears it) and `follow_up_done` |
| POST | `/contacts/{id}/follow-up-draft` `{channel, tone, goal}` | Write an AI draft |
| POST | `/leads/{id}/to-contact` | Save a lead as a contact |

Migration `d2a7f5c3e9b1` makes `contacts.target_profile_id` nullable and adds `saved_address`, `met_at`, `met_on`, `follow_up_at` and `follow_up_done`. Existing contacts get `met_on` set to the day they were saved.

### Phase 4: Teams, integrations and plans (built; billing deliberately not connected)

| # | Feature | Status |
|---|---|---|
| 4.1 | **Teams**: one team per user. Admins invite by email; an invite can only be accepted by that email address, is single-use and expires after 14 days. Roles are owner, admin and member. | ✅ |
| 4.2 | **Team branding** on every member's public card: logo, accent colour, and the company name when a card has none | ✅ |
| 4.3 | **Team dashboard**: 30-day leaderboard of views and leads per member, plus a CSV export of all the team's leads | ✅ |
| 4.4 | **Webhooks** for Zapier, Make, n8n or your own server. Events are `lead.created` and `contact.saved`. Deliveries are HMAC-signed and retried 3 times, then paused after 20 failures. Private or internal addresses are blocked (SSRF protection). | ✅ |
| 4.5 | **HubSpot CRM sync** using a Private App token (stored encrypted). New leads and contacts are pushed automatically, plus a "sync everything" button. Contacts are upserted by email, so there are no duplicates. | ✅ |
| 4.6 | **Plans and limits** (Free / Pro / Team) in one place (`services/plans.py`): cards, links, AI quotas, insights range, webhooks, CRM and teams. Team members inherit the team's plan. | ✅ Everyone is on the Team plan until billing exists |
| 4.7 | **Push reminders**: follow-up reminders fire as phone notifications (local, no push server) | ✅ Needs a new native build |
| 4.8 | **Brute-force limits** on login (per IP and per account), OTP, register, forgot-password and resend | ✅ |
| 4.9 | **Automated tests + CI**: `backend/tests` (201 end-to-end checks) and GitHub Actions running pytest plus type-checks for the app and web | ✅ |
| 4.10 | Billing (Razorpay/Stripe) | ⏸ Skipped by decision. Set `DEFAULT_PLAN=free` when it's added. |

**Webhook format.** Each delivery is an HTTP `POST` with a JSON body: `{"id": "evt_…", "type": "lead.created", "created_at": "…", "data": {…}}`. The headers are `X-SmartCard-Event`, `X-SmartCard-Delivery` and `X-SmartCard-Signature: t=<unix>,v1=<hex>`. To verify a delivery, compute `HMAC_SHA256(secret, "<t>." + raw_body)` and compare it with `v1`.

**Phase 4 endpoints**

| Method | Path | Purpose |
|---|---|---|
| GET | `/user/plan` | Your plan, its limits and usage |
| GET / POST / PATCH / DELETE | `/teams`, `/teams/me` | Create, view, update or delete your team |
| POST | `/teams/me/invites` · `/teams/join` · `/teams/invites/{id}/accept` | Invite a member, join with a token, or accept an invite |
| PATCH / DELETE | `/teams/me/members/{id}` · POST `/teams/me/leave` | Change roles, remove members, leave |
| GET | `/teams/me/dashboard?days=30` · `/teams/me/leads/export.csv` | Admin stats and the team lead export |
| GET | `/integrations` | Webhooks and HubSpot status |
| POST / PATCH / DELETE | `/integrations/webhooks[/{id}]` · POST `/{id}/test` | Manage webhooks and send a test event |
| PUT / PATCH / DELETE | `/integrations/hubspot` · POST `/integrations/hubspot/sync` | Connect HubSpot, toggle auto-sync, disconnect, sync all |

Migration `e8b3c6d1f4a7` adds `users.plan`, `teams`, `team_members`, `webhooks` and `integrations`.

### Phase 5: Trust, privacy and deeper insight (planned)

These gaps came from comparing a market-research review (2026-11-25) with what is built. Most of that review's suggestions were already done in Phases 1–4. These are the ones that weren't, in priority order.

| # | Feature | Why | Notes |
|---|---|---|---|
| 5.1 | **Delete my account** and **download my data** (JSON + CSV of profile, cards, contacts, leads) | **Required before a store release**: Google Play requires in-app account deletion for apps that create accounts. GDPR and India's DPDP Act also give users both rights. | There's no route for this today. Delete must cascade to cards, contacts, leads, uploads, webhooks and integrations, and handle team ownership (transfer or delete the team). Ask for the password or an OTP before deleting. |
| 5.2 | **Two-factor login** (authenticator app, TOTP) | Protects accounts that hold other people's contact data; expected by team admins | `users.two_factor_enabled` and `two_factor_secret` already exist but nothing uses them. Store the secret encrypted (like integration tokens) and add recovery codes. |
| 5.3 | **Private cards**: an expiry date, a PIN to view, or both | Fits the privacy-first positioning; useful for one-off sharing | Per card. The public page shows a PIN form or an "expired" message. Expired cards keep their stats. |
| 5.4 | **Richer analytics**: country, device type and UTM campaign on each view | Shows where scans come from and which campaigns work | Today a view stores only `source` (qr, nfc, link or email). Derive the country from the IP at request time and **don't store the raw IP**. Add a "Top countries / devices / campaigns" section to Insights. |
| 5.5 | **Auto follow-up email** when a lead arrives (optional, off by default) | Reaches leads while they're fresh | Uses the existing email provider. An editable template per card, and the AI draft (3.2) can suggest it. |
| 5.6 | **Native Salesforce and Pipedrive sync** | Teams on those CRMs today go through Zapier/webhooks | Same pattern as HubSpot (4.5): encrypted token, upsert by email, "sync everything". |
| 5.7 | **Video intro** on the card (a short clip or a YouTube/Vimeo link) | Makes cards stand out and more personal | A link embed first; uploads later (storage cost). |
| 5.8 | **Referral links** | Growth: each card is already a distribution channel | "Made with SmartCard — get yours" on public cards, tracked per referrer. Wait until billing exists to give rewards. |

**Deliberately not planned**
- **AR/VR, NFT or blockchain cards:** high effort, niche demand.
- **Kafka/RabbitMQ, microservices, serverless or a separate analytics warehouse:** FastAPI + Postgres with background tasks and retried webhooks is enough at this stage. Revisit if queue backlogs or slow Insights queries appear.
- **SSO (SAML/OIDC) and audit logs:** only when a larger team customer asks for them.

The market figures in that review (market size, growth rate, latency and carbon claims) weren't verified. Check the original sources before using them publicly.

---

## 3. UI / UX / CX design

### 3.1 Design principles
1. **Two-second rule.** A recipient scans and, within two seconds, sees who you are and how to save you.
2. **One primary action per screen.** It's gold, big, and at the bottom where thumbs reach.
3. **Calm premium.** Near-black and warm gold, generous spacing, no visual noise. It should feel like a metal card.
4. **Privacy is visible.** The user always knows what a stranger can see.
5. **Never a dead end.** Every empty state explains what to do next.

### 3.2 Design tokens (`smart-card-app/constants/design.ts`)

Colours live in `components/context/AppContext.tsx`. **Light is the default** (also before sign-in); Dark only when the user picks it in Settings. Neutrals are warm so they sit with the gold.

| Token | Light (default) | Dark | Use |
|---|---|---|---|
| `bg` | `#F6F3EC` (ivory) | `#0B0B0C` | Screen background |
| `card` | `#FFFFFF` | `#161618` | Surfaces, inputs |
| `elevated` | `#FBF9F4` | `#1E1E21` | Chips, nested surfaces |
| `text` | `#1C1917` | `#F5F5F4` | Primary text |
| `subText` | `#6B6560` | `#A8A29E` | Secondary text |
| `placeholder` | `#A8A29E` | `#6F6A66` | Input placeholders |
| `border` | `#E8E2D6` | `#2A2A2D` | Hairline borders, dividers |
| `primary` | `#94701F` | `#C9A24D` | Brand gold, primary CTA (light gold is darker to pass 4.5:1) |
| `primarySoft` | `rgba(148,112,31,.12)` | `rgba(201,162,77,.14)` | Icon tiles, highlights |
| `onPrimary` | `#FFFFFF` | `#0B0B0C` | Text on gold |
| `success` / `danger` | `#16A34A` / `#DC2626` | `#22C55E` / `#EF4444` | Status |

**Shared components** (use these instead of styling screens by hand): `components/ui/Button.tsx` (primary / secondary / ghost / danger, loading state), `TextField.tsx` (label, icon, error, password toggle), `CodeInput.tsx` (OTP boxes), `AuthLayout.tsx` (sign-in frame), and `kit.tsx`: `ScreenHeader`, `IconButton`, `Surface`, `SectionLabel`, `ListRow`, `Avatar`, `Chip`, `Segmented`, `OptionSheet`, `EmptyState`, `Loading`, `Badge`.

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

**Phase 2 endpoints**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/profile/share-kit` | ✅ | All share URLs for the app |
| GET / PUT | `/profile/slug/check?slug=` · `/profile/slug` | ✅ | Check / change the card link |
| GET / POST | `/profile/links` | ✅ | List / add custom links |
| PUT / DELETE | `/profile/links/{id}` · PUT `/profile/links/order` | ✅ | Edit, remove, reorder |
| GET | `/public/{slug}/qr.png?src=&size=` | — | QR image |
| GET | `/public/{slug}/signature` | — | Email signature builder page |
| GET | `/public/{slug}/wallet/apple` · `/wallet/google` | — | Wallet passes (503 until configured) |

Run `alembic upgrade head` again: migration `b7e2d4f1c8a3` adds `profile_links` and `slug_aliases`.

**Phase 2b: multiple cards**

The app sends `X-Card-Id: <card id>` to say which card a request is about. Without the header the **primary** card is used, so older app versions keep working unchanged.

| Method | Path | Purpose |
|---|---|---|
| GET | `/cards` | List your cards (primary first) |
| POST | `/cards` `{label, copy_from?, blank?}` | New card, copied from another card by default (max 5) |
| PATCH | `/cards/{id}` `{label?, contact_email?, contact_phone?}` | Rename, or set the card's own email/phone (`""` clears) |
| POST | `/cards/{id}/primary` | Make primary (exactly one; enforced by a unique index) |
| DELETE | `/cards/{id}` | Delete a non-primary card (details below) |

What deleting a card does:
- Its link and old links **redirect to the primary card**.
- Its NFC tags move to the primary card.
- People who saved it keep you as a contact, now pointing at your primary card.
- Its own links, design, leads and stats are deleted.

Per-card endpoints (they follow `X-Card-Id`): `/profile/me`, `PUT /profile/`, `/profile/avatar`, `/profile-card/card`, `/profile/links*`, `/profile/slug*`, `/profile/share-kit`, `/analytics/summary`. `/leads` covers **all** cards, and each lead has `card_label`.

Migration `c4d8e1a6b9f2` adds `label`, `is_primary` and `contact_email`/`contact_phone` to `profiles`. It makes each user's oldest card their primary card.

Also fixed: `alembic upgrade` crashed when the database password contained `%` (for example `%40`), because Alembic's config parser treats `%` as special. `alembic/env.py` now escapes it.

### 3.6 Accessibility and quality bar
- Every icon-only button has an `accessibilityLabel`.
- The public page works with JavaScript off (the form posts natively) and passes WCAG AA contrast.
- Every list has a loading state, an empty state and an error state with a retry.
