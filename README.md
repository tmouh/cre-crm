# Vanadium OS — CRE CRM

A private CRM built for commercial real estate dealmakers. Manages contacts, companies, deals, and investor relationships with deep Microsoft 365 integration, AI-driven relationship intelligence, and live deal mapping.

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
| Deploy | Vercel (SPA + serverless functions) |

---

## Features

| Page | Description |
|---|---|
| **Dashboard** | KPIs, deal pipeline summary, upcoming reminders, recent activity |
| **Contacts** | Full contact list with health scores, last-touch tracking, LinkedIn enrichment |
| **Companies** | Company directory with type classification and contact associations |
| **Deals** | Deal management with status pipeline, comps, and document tracking |
| **Pipeline** | Kanban board view across all deal stages |
| **Investors** | LP investor company tracking with contact associations |
| **Comps** | Comparable sales database with CSV import |
| **Map** | Live geocoded deal map with status pin colors and popups |
| **Inbox** | Microsoft 365 email and calendar integration per contact |
| **Documents** | OneDrive/SharePoint file access linked to contacts |
| **Reminders** | Task and follow-up management with priority levels |
| **Automations** | Trigger-based workflows (e.g., deal stage → create reminder) |
| **Reports** | Pipeline analytics, activity reports, contacts report with CSV export |
| **Settings** | Microsoft 365 connection, theme, and account preferences |
| **Recently Deleted** | Soft-delete recovery with 15-day retention window |

---

## Architecture

```
src/
  context/
    AuthContext.jsx          # Supabase auth session
    CRMContext.jsx           # All CRM data and CRUD operations
    MicrosoftContext.jsx     # Microsoft 365 connection + sync state
    ThemeContext.jsx         # Dark/light mode
  hooks/
    useIntelligence.js       # Relationship health scores, stale contact detection
  lib/
    supabase.js              # DB client, data fetchers, camelCase↔snake_case transforms
    graphClient.js           # Microsoft Graph API client (token management + fetchers)
    msalConfig.js            # MSAL configuration and scope definitions
  pages/                     # Page components (one per route)
  components/                # Shared UI components
  utils/
    helpers.js               # Formatters, constants, utility functions
api/
  linkedin.js                # Vercel serverless function — PDL API proxy
```

**Data flow:** Supabase is the source of truth for all CRM data. Microsoft Graph is fetched live (client-side MSAL, PKCE flow) and cached in React state, refreshed every 5 minutes. Geocoding results are cached in `localStorage`.

**DB conventions:** Supabase stores snake_case columns; the app uses camelCase. `src/lib/supabase.js` transforms automatically. Soft deletes use a `deleted_at` timestamp with a 15-day UI retention window.

---

## Environment Variables

### Vercel Dashboard (Settings → Environment Variables)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_AZURE_CLIENT_ID` | Azure App Registration — Application (client) ID |
| `VITE_AZURE_TENANT_ID` | Azure Directory (tenant) ID, or `common` |
| `PDL_API_KEY` | People Data Labs API key (server-side only, no VITE_ prefix) |

### Local Development (`.env.local` — not committed)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AZURE_CLIENT_ID=your-azure-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
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

```bash
npx vercel --prod
```

The project is linked to Vercel. All `VITE_*` variables are injected at build time.

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

Core tables: `contacts`, `companies`, `properties` (deals), `reminders`, `activities`, `automations`, `comps`

All tables use soft-delete pattern:
```sql
ALTER TABLE <table> ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
```

See `src/lib/supabase.js` for full field mappings.

---

## Access

Invitation-only. Users are created in the Supabase Auth dashboard. No public sign-up.
