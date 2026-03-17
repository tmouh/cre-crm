# V23CRM

A private CRM built for commercial real estate dealmakers. Manages contacts, companies, deals, and investor relationships with deep Microsoft 365 integration, AI-driven relationship intelligence, live deal mapping, and a smart shared team Activity Log fed by scored outbound email threads.

**Live:** https://v23crm.vercel.app

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5, Tailwind CSS 3, React Router v6 |
| Backend | Supabase (PostgreSQL + Row-Level Security + Auth) |
| Microsoft | Azure MSAL Browser (PKCE/SPA), Microsoft Graph API |
| AI/Enrichment | People Data Labs (PDL) via Vercel serverless function |
| Maps | Leaflet + React-Leaflet + OpenStreetMap/Nominatim |
| Deploy | Vercel (SPA + serverless functions, auto-deploy from GitHub main) |

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | KPIs, hot deals, stalled contacts, suggested follow-ups, recent activity, pipeline funnel |
| **Contacts (Shared)** | Shared contact list with health scores, bulk selection, share/make-private, duplicate detection, CSV import |
| **My Contacts** | Personal/owned contacts — same features but filtered to owned records |
| **Companies** | Company directory with My/Shared views, bulk selection, visibility column, duplicate detection, CSV import |
| **Deals** | Deal management with status pipeline, deal type, value, linked contacts/companies, stage history, CSV bulk import |
| **Pipeline** | Kanban board across all deal stages with drag-drop, velocity metrics, win rate |
| **Investors** | LP investor company profiles with investment criteria, deal size ranges, related contacts and tracked deals |
| **Comps** | Comparable sales database with CSV import |
| **Map** | Live geocoded deal map with status-colored pins and deal popups |
| **Inbox** | Combined activity log — manual activities + deal activity threads, grouped by date |
| **Documents** | OneDrive/SharePoint file browser linked to Microsoft 365 connection |
| **Reminders** | Task and follow-up queue with priority, snooze, links to contact/company/deal |
| **Automations** | Trigger-based workflows (deal stage change → create reminder) |
| **Reports** | Pipeline analytics by status and type, activity report, contact breakdown, CSV export |
| **Settings** | Microsoft 365 connection, theme (light/dark/system), account preferences |
| **Recently Deleted** | Soft-delete recovery with 15-day retention window and permanent purge |

---

## Relationship Intelligence

Built into every contact and deal via the `useIntelligence` hook:

- **Contact health score (0–100):** Combines recency of last touch, activity frequency, interaction depth, pending tasks, and email volume. Drives the "Needs Attention" dashboard box (threshold: 90 days without contact).
- **Deal momentum score (0–100):** Stage advancement speed, recent activity, staleness. Drives "Hot Deals" and "Stalled Deals" dashboard boxes.
- **Suggested Follow-ups:** Contacts flagged by low health score or stalled deals appear in the Dashboard with one-click reminder creation.

---

## Smart Email → Activity Log

The Activity Log has two distinct layers:

**Outlook Mirror** (`OutlookMessages` component) — a full mailbox-style mirror of all emails to/from a contact. Reference only. Not shown in the shared team log.

**Deal Activity Layer** (`deal_activities` table) — a curated team-visible log of meaningful deal-related email communication. One entry per *thread*, not per email. Shows one thread card even if there are 10 replies in the chain.

### How it works

After every Microsoft sync cycle (every 5 minutes, or triggered by a Graph webhook), the system:

1. Fetches recent sent messages from the `SentItems` folder (last 48h)
2. Scores each new conversation thread using a weighted signal pipeline
3. Creates a `deal_activity` record for Tier 1/2 threads; silently ignores Tier 3

### Scoring signals

| Signal | Score |
|---|---|
| SharePoint reference attachment from deal folder (OM/, UW/, LOI/, etc.) | +55 |
| Recipient is a known CRM contact | +40 |
| Contact or their company is linked to an active deal | +35 |
| Property address or deal name in subject/body | +20 |
| Deal keywords (LOI, PSA, due diligence, etc.) × 2+ | +10 |

- **Tier 1** (score ≥ 70) → auto-created, appears immediately in the Activity Log
- **Tier 2** (score 30–69) → created with `needs_review` status, amber badge, awaits team confirmation
- **Tier 3** (score < 30) → silently excluded

### Thread model

- The *first* qualifying outbound email in a thread creates the `deal_activity`
- Subsequent replies (inbound or outbound) update `messageCount`, `lastMessageAt`, `lastDirection` — they do not create new records
- Keyed on Microsoft Graph `conversationId` (stable across all replies in a thread)

### Correction UI

Each deal_activity card supports:
- Expand to see why it was included (signal badges)
- Confirm ✓ (mark as verified)
- Dismiss ✗ (remove from shared log)
- Change deal → pick a different property from the deal picker
- Multi-deal disambiguation → when multiple deals match, pick the right one

---

## Sharing & Visibility

Contacts and companies have per-record visibility:
- **Private** — visible only to owners (`ownerIds`)
- **Shared** — visible to all team members, or optionally a `sharedWith` whitelist
- Ownerless records are visible to everyone

Both Contacts and Companies have **My** and **Shared** list views. Bulk selection supports **Share** and **Make Private** actions across multiple records at once.

---

## Architecture

```
src/
  context/
    AuthContext.jsx          # Supabase auth session
    CRMContext.jsx           # All CRM data, CRUD, dealActivities state
    MicrosoftContext.jsx     # Microsoft 365 connection + sync; triggers deal activity scoring
    ThemeContext.jsx         # Dark/light mode
  lib/
    supabase.js              # DB client, data fetchers, camelCase↔snake_case transforms
    graphClient.js           # Microsoft Graph client (legacy — used by OutlookMessages)
    msalConfig.js            # MSAL configuration and scope definitions
    dealActivityScoring.js   # Email relevance scoring engine (Tier 1/2/3)
  services/
    microsoft.js             # Full Microsoft Graph API service layer
    dealActivitySync.js      # Sent-mail scoring orchestrator
  hooks/
    useIntelligence.js       # Health scores, momentum scores, suggested actions
  pages/                     # Page components (one per route)
  components/
    ActivityFeed.jsx         # Shared activity log — manual entries + deal thread cards
    DealActivityItem.jsx     # Single deal_activity thread card with correction UI
    ImportModal.jsx          # CSV bulk import (contacts, companies, properties, comps, deals)
    OutlookMessages.jsx      # Raw Outlook email mirror (contact-level reference)
    ...
  utils/
    helpers.js               # Formatters, constants, utility functions
api/
  linkedin.js                # Vercel serverless — PDL API proxy
  graph-webhook.js           # Vercel serverless — Microsoft Graph change notification receiver
```

**Provider nesting order (App.jsx):**
```
ThemeProvider → AuthProvider → CRMProvider → MicrosoftProvider → AppShell
```
`MicrosoftProvider` is nested inside `CRMProvider`, so it can safely call `useCRM()` to access and update CRM state from within the sync loop.

**Data flow:** Supabase is the source of truth for all CRM data including deal activities. Microsoft Graph is fetched live (client-side MSAL, PKCE flow) and cached in React state, refreshed every 5 minutes. Geocoding results are cached in `localStorage`.

**DB conventions:** Supabase stores snake_case columns; the app uses camelCase. `src/lib/supabase.js` transforms automatically. Soft deletes use a `deleted_at` timestamp with a 15-day UI retention window.

---

## Environment Variables

### Vercel Dashboard (Settings → Environment Variables)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (for Graph webhook serverless function) |
| `VITE_AZURE_CLIENT_ID` | Azure App Registration — Application (client) ID |
| `VITE_AZURE_TENANT_ID` | Azure Directory (tenant) ID, or `common` |
| `VITE_GRAPH_WEBHOOK_SECRET` | Shared secret for Graph webhook validation |
| `PDL_API_KEY` | People Data Labs API key (server-side only, no VITE_ prefix) |

### Local Development (`.env.local` — not committed)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AZURE_CLIENT_ID=your-azure-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_GRAPH_WEBHOOK_SECRET=vanadium-crm
PDL_API_KEY=your-pdl-key
```

---

## Local Development

```bash
npm install
npm run dev        # http://localhost:5173
```

---

## Deployment

The project auto-deploys via Vercel on every push to `main`. No manual deploy command needed.

All `VITE_*` variables are injected at build time from Vercel's environment variable settings.

---

## Azure AD Setup (Microsoft 365 Integration)

1. **Azure Portal → App registrations → New registration**
   - Name: `Vanadium OS`
   - Supported account types: *Single tenant* (or multi-tenant if needed)

2. **Authentication → Add a platform → Single-page application**
   - Redirect URIs: `https://v23crm.vercel.app` and `http://localhost:5173`
   - Enable: *Access tokens*, *ID tokens*

3. **API permissions → Add** (all Delegated):
   `User.Read`, `Mail.Read`, `Calendars.Read`, `Contacts.Read`, `Files.Read`,
   `Sites.Read.All`, `People.Read`, `User.ReadBasic.All`, `Presence.Read`,
   `Team.ReadBasic.All`, `Chat.Read`, `OnlineMeetings.Read.All`, `offline_access`

4. Add `VITE_AZURE_CLIENT_ID` and `VITE_AZURE_TENANT_ID` to Vercel environment variables and redeploy.

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema SQL in **Database → SQL Editor**
3. Enable Row Level Security on all tables with `auth_full` policies
4. Go to **Authentication → Users** and create accounts for each team member (no self-signup)
5. Copy **Project URL** and **anon public key** from **Settings → API** into environment variables

### Core tables

`contacts`, `companies`, `properties` (deals), `reminders`, `activities`, `automations`, `comps`, `deal_investors`

Recent column additions to `properties`:
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_group TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state TEXT;
```

### Microsoft integration tables

`email_interactions`, `calendar_interactions`, `microsoft_connections`, `graph_subscriptions`, `webhook_notifications`

### Deal activity tables

`deal_activities` — the smart email-to-activity layer. One row per email thread (keyed on `conversation_id`).

```sql
-- Required migrations for deal activity system
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL UNIQUE,
  subject TEXT,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  candidate_property_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'auto',
  confidence TEXT,
  relevance_signals JSONB DEFAULT '[]',
  message_count INT DEFAULT 1,
  outbound_count INT DEFAULT 1,
  inbound_count INT DEFAULT 0,
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  last_direction TEXT DEFAULT 'outbound',
  participant_contact_ids UUID[] DEFAULT '{}',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  override_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_interactions ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE email_interactions ADD COLUMN IF NOT EXISTS deal_activity_id UUID REFERENCES deal_activities(id) ON DELETE SET NULL;
```

All tables use soft-delete pattern:
```sql
ALTER TABLE <table> ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

See `src/lib/supabase.js` for full field mappings.

---

## Access

Invitation-only. Users are created in the Supabase Auth dashboard. No public sign-up.
