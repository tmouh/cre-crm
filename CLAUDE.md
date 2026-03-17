# CRE CRM — Claude Instructions

## Auto-deploy
After every change (or batch of related changes):
1. Commit and push to GitHub (`git add`, `git commit`, `git push origin main`). Do not wait for the user to ask. **Current working branch is `main`.**
2. Vercel is connected to the GitHub repo and auto-deploys on every push to `main`. Do NOT run `npx vercel --prod` manually.

## Stack
- React 18 + Vite 5, Tailwind CSS, React Router v6
- Supabase (PostgreSQL + RLS + Auth) as backend
- Context API: CRMContext, AuthContext, ThemeContext, MicrosoftContext
- Vercel serverless functions: `api/linkedin.js` (PDL API proxy), `api/graph-webhook.js` (Microsoft Graph webhook receiver)
- Microsoft Graph API (mail, calendar, files, SharePoint) via MSAL

## Supabase schema migrations
Whenever a new field is added to a data model (e.g. a new column on contacts, companies, etc.), a corresponding column must be added to the Supabase table. The app's `toSnake`/`toCamel` transforms handle naming automatically (camelCase ↔ snake_case), but the column itself must exist in the DB.

When adding a new field, always tell the user to run the following SQL in the Supabase SQL Editor:
```sql
ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <snake_case_column> <TYPE>;
```
Common types: `TEXT` (strings, enums), `NUMERIC` (decimals), `BOOLEAN`, `TIMESTAMPTZ` (dates), `TEXT[]` (arrays), `UUID` (foreign keys), `UUID[]` (UUID arrays), `JSONB` (structured objects).

## Conventions
- DB layer uses snake_case; app uses camelCase — transformation happens in `src/lib/supabase.js`
- Soft delete pattern with 15-day retention (Recently Deleted page)
- Custom hex colors use inline `style={{ }}`, not arbitrary Tailwind values
- Dark mode via `dark` class on `<html>` (ThemeContext); always include `dark:` variants
- Font: Verdana throughout (set in `src/index.css`)

## Key files
- `src/context/CRMContext.jsx` — all data/state logic; loads and exposes contacts, companies, properties, activities, dealActivities, reminders, teamMembers, etc.
- `src/context/MicrosoftContext.jsx` — Microsoft Graph connection, sync loop, webhook polling; calls `syncDealActivities` after every sync
- `src/lib/supabase.js` — DB access layer + seed data; all table CRUD is here
- `src/utils/helpers.js` — all constants (DEAL_TYPES, DEAL_STATUSES, DEAL_TYPE_COLORS, etc.) and formatters
- `src/pages/` — page components (Contacts, Companies, Deals, Pipeline, Dashboard, Reminders, Inbox, Documents, Map, etc.)
- `src/components/ImportModal.jsx` — CSV bulk import for contacts, companies, properties, comps, and deals (with contact-review step)
- `src/components/LinkedInProfile.jsx` — LinkedIn enrichment display
- `src/components/ActivityFeed.jsx` — shared activity log UI; merges manual activities + deal_activity threads
- `src/components/DealActivityItem.jsx` — renders a single deal_activity thread entry with correction UI
- `src/lib/dealActivityScoring.js` — email relevance scoring engine (Tier 1/2/3, SharePoint signal)
- `src/services/dealActivitySync.js` — orchestrates sent-mail scoring and deal_activity creation/update
- `src/services/microsoft.js` — full Microsoft Graph API service layer
- `src/lib/graphClient.js` — legacy Graph client used by OutlookMessages and OutlookImport
- `api/linkedin.js` — serverless PDL enrichment endpoint
- `api/graph-webhook.js` — webhook receiver for Microsoft change notifications
- `vercel.json` — build config + function timeout

## Deal types & statuses
Defined in `src/utils/helpers.js` as `DEAL_TYPES` and `DEAL_STATUSES`. When adding a new type or status, update all three objects: the array, the color map, and the label map in `formatDealType`/`formatDealStatus`.

**Current deal types:** `acquisition`, `note-acquisition`, `recapitalization`, `sale`, `equity-raise`, `preferred-equity`, `mezzanine`, `senior-debt`, `bridge-financing`, `construction-financing`, `development`, `debt-equity`, `full`

**Current deal statuses:** `prospect`, `engaged`, `under-loi`, `under-contract`, `due-diligence`, `closed`, `dead`

## properties table — extra columns (added)
In addition to the core deal fields, the `properties` table has these additional columns:
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_group TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state TEXT;
```
These map to `dealGroup`, `city`, `state` in camelCase and are used by the deals bulk import.

## Bulk import — deals
`ImportModal` supports `entity="deals"` with CSV columns: `name*, group, city/region, state, stage, property type, deal type, amount, contact, company, notes, tags`. After preview, if any contact names don't match existing records, a contact-review step prompts the user to add all, select specific, or skip unmatched names before importing.

## Email / Activity Log architecture (important — do not break this)

### Two distinct layers:
1. **Outlook mirror** (`email_interactions` table, `OutlookMessages.jsx`) — raw reference surface. Shows all emails to/from a contact. NOT shown in the shared Activity Log.
2. **Deal Activity Layer** (`deal_activities` table, `DealActivityItem.jsx`) — curated team-visible log of meaningful deal-related communication. One record per email thread (keyed on `conversationId`), NOT one record per email.

### How deal activities are created:
- `MicrosoftContext.sync()` triggers `syncDealActivities()` (in `src/services/dealActivitySync.js`) after every sync cycle
- `syncDealActivities` fetches recent sent messages (SentItems, last 48h) and scores each new thread
- Scoring uses `scoreEmail()` from `src/lib/dealActivityScoring.js`
- Tier 1 (score ≥ 70) → `status: 'auto'`, auto-appears in Activity Log
- Tier 2 (score 30–69) → `status: 'needs_review'`, appears with amber badge
- Tier 3 (score < 30) → excluded entirely

### Scoring signals (highest to lowest weight):
- SharePoint reference attachment from deal folder (OM/, UW/, LOI/, etc.) → +55
- Recipient is a known CRM contact → +40
- Contact/company linked to an active deal → +35
- Property address/name found in subject or body → +20
- Deal keywords (LOI, PSA, due diligence, etc.) × 2+ → +10

### Thread continuity:
- First qualifying outbound email in a thread creates a `deal_activity`
- Subsequent messages in the same thread (inbound or outbound) update `messageCount`, `lastMessageAt`, `lastDirection` — they do NOT create new records
- Keyed on Microsoft Graph `conversationId` (unique per thread, stable across replies)

### deal_activities table columns:
`id`, `conversation_id` (UNIQUE), `subject`, `contact_id`, `company_id`, `property_id`, `candidate_property_ids` (UUID[]), `status` (auto/needs_review/confirmed/dismissed), `confidence` (high/medium/low), `relevance_signals` (JSONB), `message_count`, `outbound_count`, `inbound_count`, `first_message_at`, `last_message_at`, `last_direction`, `participant_contact_ids` (UUID[]), `reviewed_by`, `reviewed_at`, `override_notes`, `created_at`

### email_interactions table extra columns (added):
`conversation_id` (TEXT), `deal_activity_id` (UUID FK → deal_activities)

### CRMContext exports for deal activities:
- `dealActivities` — full array loaded at init
- `dealActivitiesFor(field, id)` — filter by contactId/companyId/propertyId, newest first, excludes dismissed
- `addDealActivity(obj)` — insert + update state
- `updateDealActivity(id, patch)` — update + update state

## Microsoft Graph — key notes
- `MicrosoftProvider` is nested inside `CRMProvider` in `App.jsx`, so `useCRM()` is safe to call inside `MicrosoftProvider`
- A `crmDataRef` in `MicrosoftContext` holds fresh CRM data for use in the sync callback without adding to its dependency array
- Webhook subscriptions auto-created on `me/messages` and `me/events`; renewed every 6h
- `getSentMessages(count, daysBack)` — fetches from SentItems folder
- `getMessageAttachmentsWithSource(messageId)` — fetches attachment list including `sourceUrl` for SharePoint reference attachments (the key field for deal-folder detection)
- `graphClient.js` (legacy) is used by `OutlookMessages.jsx` and `OutlookImport.jsx`; `microsoft.js` is the primary service

## Context provider nesting order (App.jsx)
```
ThemeProvider
  AuthProvider
    CRMProvider          ← loads all CRM data
      MicrosoftProvider  ← can call useCRM() safely
        AppShell
```
