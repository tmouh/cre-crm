# Architecture & Inner Workings

Technical documentation covering non-obvious logic, priorities, and data flow in V23CRM.

---

## Data Flow & Context

All CRM data lives in **CRMContext** (`src/context/CRMContext.jsx`). On mount, it loads everything from Supabase into memory and all CRUD operations update both the database and local state simultaneously.

**Auth** is handled by **AuthContext** (`src/context/AuthContext.jsx`). On sign-in, `syncTeamMember` upserts the user into the `team_members` table with their `display_name` from Google/OAuth metadata. This is how team member names show up instead of emails.

**Theme** is managed by **ThemeContext** (`src/context/ThemeContext.jsx`), stored in localStorage.

---

## Routes

```
/                    → Dashboard
/login               → Login
/contacts            → Shared contacts list
/contacts/:id        → Contact detail
/personal/contacts   → My (owned) contacts list
/personal/contacts/:id → Personal contact detail
/companies           → Companies (My + Shared)
/companies/:id       → Company detail
/deals               → Deals list (bulk import button here)
/deals/:id           → Deal detail
/pipeline            → Kanban board
/investors           → Investor company profiles
/investors/:id       → Investor detail
/comps               → Comparables database
/comps/:id           → Comp detail
/reminders           → Full reminder queue
/inbox               → Combined activity log (manual + deal threads)
/documents           → OneDrive/SharePoint file browser
/reports             → Pipeline analytics + export
/automations         → Workflow automation rules
/settings            → User preferences + Microsoft 365 connection
/map                 → Geocoded deal map
/recently-deleted    → Soft-deleted items (15-day trash)
/properties          → Redirects to /deals (backward compat)
/properties/:id      → Redirects to /deals/:id
```

---

## Last Touch / Last Contacted

`lastContacted` is a timestamp on each contact record that drives the **Needs Attention** dashboard box.

**What updates it:**
- **Completing a reminder** — `completeReminder()` sets `lastContacted` to the current time
- **Logging an activity** — `addActivity()` sets `lastContacted` to the activity's date (which can be backdated)

**Priority rule:** Both actions only update `lastContacted` if the new date is **more recent** than the existing value. This prevents a backdated activity from overriding a more recent touch.

**Needs Attention threshold:** Contacts appear in the dashboard's "Needs Attention" box if `lastContacted` is null or older than **90 days (3 months)**.

**Last Type column:** Shows the type (call, email, meeting, etc.) of the most recently completed reminder for that contact, not the most recent activity.

---

## Relationship Intelligence (`useIntelligence` hook)

Computed in memory on every render — not stored in the DB (except `healthOverride` and `momentumOverride` for manual overrides).

**Contact health score (0–100):** Combines recency of last touch, activity frequency, interaction depth, pending reminders, and email volume from email_interactions.

**Deal momentum score (0–100):** Stage advancement speed, recent activity count, days since last activity, and staleness penalty.

**Dashboard surfaces:**
- **Hot Deals** — momentum ≥ 75
- **Stalled Deals** — momentum < 25, deal value > threshold
- **Needs Attention** — contacts with health < threshold or last touch > 90 days
- **Suggested Follow-ups** — ranked by health + open reminders
- **Win Rate** — closed / (closed + dead) from pipeline history

---

## Sharing & Visibility Model

Contacts and companies have a per-record visibility system:

| State | Who sees it |
|---|---|
| `visibility = 'private'`, `ownerIds` set | Only owners |
| `visibility = 'shared'`, `sharedWith = null` | All team members |
| `visibility = 'shared'`, `sharedWith = [userId…]` | Only listed users |
| No `ownerIds` (ownerless) | Everyone (treated as shared) |

**List views:** Contacts and Companies each have a **My** view (owned by me) and a **Shared** view (shared with me or everyone).

**Bulk actions:** Both lists support row selection with bulk **Share** and **Make Private** actions. Companies also have a Visibility column showing current state.

---

## Duplicate Detection

Two mechanisms, both using the `useDuplicates` hook:

1. **On-create check** — `DuplicateCheckModal` runs before saving a new contact or company, shows potential matches, and lets the user proceed or cancel.
2. **Bulk scan** — `DuplicateScanModal` scans all existing records for similarity and presents merge options.

Similarity matching is fuzzy (normalized name comparison, not exact).

---

## Phone Icon in Contacts List

The phone icon in the contacts table shows if **either** `phone` (office) **or** `mobile` is set. The `tel:` link prefers office phone when available, falling back to mobile.

---

## camelCase / snake_case Transforms

The app uses camelCase internally (JavaScript convention) but Supabase uses snake_case (PostgreSQL convention). All conversions happen in `src/lib/supabase.js`:

- `toSnake()` — converts outgoing objects before insert/update
- `toCamel()` — converts incoming rows after select
- `clean()` — strips `undefined` AND empty strings before sending to Supabase (critical: empty strings break UUID and numeric columns)

---

## Soft Delete & Undo Stack

Contacts, companies, properties, and reminders use soft delete. Deleting a record sets `deleted_at` to the current timestamp instead of removing the row. The **Recently Deleted** page shows items deleted in the last 15 days with options to restore or permanently purge.

`getAll()` queries filter out rows where `deleted_at` is not null (controlled by `trackDeleted: true` on the table helper).

**Undo stack:** CRMContext keeps the last 10 deletions in memory. A toast appears briefly after deletion with an Undo button that calls `undoLastDelete()` — restoring the record without needing the Recently Deleted page.

---

## Stage History & Automations

Every time a deal's status changes via `updatePropertyWithStage()`, the system:
1. Appends `{ from, to, at }` to the deal's `stageHistory` array
2. Updates `stageChangedAt` to the current timestamp
3. Runs any matching **Automations** — rules that trigger on a specific stage value and execute an action (currently: create a reminder with configurable title, type, priority, and days-from-now offset)

This powers Pipeline velocity metrics (average time per stage) and Reports analytics.

---

## Searchable Comboboxes

`SearchableSelect` (`src/components/SearchableSelect.jsx`) is a reusable searchable dropdown with inline creation. Used in:
- **Reminder form** — Contact, Company, Property fields
- **Deal form** — Owner/Sponsor and Borrower/Tenant fields

When a user types a name that doesn't exist and clicks "Create", the component calls the `onCreate` callback which creates the record in the database and returns the new ID. Contact creation splits the typed name into first/last name. Property creation uses the typed text as the address.

---

## Reminder Type Dropdowns

All reminder type dropdowns sort options alphabetically but always place **"Other" at the bottom**. This is done by filtering out 'other', sorting the rest, then appending 'other' as a separate `<option>`.

---

## Deal Types & Statuses

Deals (stored in the `properties` table) have two classification systems:

**Deal Types** (what kind of transaction):
`acquisition`, `note-acquisition`, `recapitalization`, `sale`, `equity-raise`, `preferred-equity`, `mezzanine`, `senior-debt`, `bridge-financing`, `construction-financing`, `development`, `debt-equity`, `full`

- `development` — ground-up or value-add development (distinct from construction financing)
- `debt-equity` — combined debt and equity structure
- `full` — full property sale/acquisition

**Deal Statuses** (where it is in the pipeline):
`prospect` → `engaged` → `under-loi` → `under-contract` → `due-diligence` → `closed` / `dead`

Each has its own color mapping defined in `src/utils/helpers.js`.

---

## Bulk Import — Deals

The Deals list has an **Import** button that opens `ImportModal` with `entity="deals"`. The importer maps these CSV columns (case-insensitive, order-independent):

`name*`, `group`, `city/region`, `state`, `stage`, `property type`, `deal type`, `amount`, `contact`, `company`, `notes`, `tags`

- `contact` is matched case-insensitively against `firstName + " " + lastName` in the existing contacts list
- `company` is matched against the existing companies list by name
- Tags are semicolon-separated

**Contact-review step:** After the preview, if any contact names in the CSV don't match an existing contact, the importer pauses with three options:
- **Add all** — creates minimal contact records (first + last name) for all unmatched names
- **Select which** — checkbox list to pick individual names to create
- **Skip all** — imports deals without linking those contacts

**DB columns required for deals import:**
```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deal_group TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state TEXT;
```

---

## Number Formatting

Size and Deal Value inputs use `type="text"` with `inputMode="numeric"` to allow comma formatting while typing. The display value uses `toLocaleString()` for commas, but the stored value is the raw number. Deal value also supports decimals.

---

## Activity Log Date & Time

Activities have a date and time picker (defaults to current date/time). The `createdAt` field is set to the selected date+time, allowing users to backdate activities. The activity timeline sorts by `createdAt` descending (most recent first).

---

## Team Member Display

User display prioritizes in this order:
1. `user.user_metadata.full_name` (from OAuth/Google sign-in)
2. `user.user_metadata.name`
3. `user.email`

The sidebar shows the full name. The `team_members` table stores `display_name` which is synced on every sign-in via `syncTeamMember()` in AuthContext.

---

## Seed Data

On first load, if the `app_config` table's `seeded` key is false, `seedDatabase()` runs and populates sample companies, contacts, properties, reminders, and activities. After seeding, `markSeeded()` prevents it from running again.

---

## Color System

All badges use a consistent color mapping defined in `helpers.js`:

| Category | Colors |
|----------|--------|
| **Priority** | high=red, medium=yellow, low=gray |
| **Activity/Reminder type** | call=purple, email=blue, meeting=indigo, tour=teal, proposal=orange, note=gray, follow-up=pink |
| **Deal status** | prospect=gray, engaged=blue, under-loi=indigo, under-contract=yellow, due-diligence=purple, closed=green, dead=red |
| **Deal type** | acquisition=blue, note-acquisition=cyan, recapitalization=violet, sale=emerald, equity-raise=amber, preferred-equity=orange, mezzanine=pink, senior-debt=teal, bridge-financing=rose, construction-financing=lime, development=fuchsia, debt-equity=sky, full=indigo |
| **Company type** | owner=blue, tenant=green, investor=purple, developer=orange, broker=teal, lender=yellow |
| **Investor status** | contacted=slate, reviewing=blue, interested=indigo, site-visit=teal, bidding=amber, passed=red, awarded=green |

All colors include dark mode variants.

---

## Bulk Selection — Contacts & Companies

Both the **My Contacts** and **Shared Contacts** lists support row-level bulk selection. Selecting one or more rows reveals a bulk action toolbar with context-specific actions (delete, share/make private, assign owner).

The **Companies** list (My and Shared) supports the same with **Share** and **Make Private** bulk actions, plus a **Visibility** column showing each company's current sharing state.

---

## File Structure

```
src/
  context/
    AuthContext.jsx       — authentication state & team member sync
    CRMContext.jsx        — all CRUD operations & data state; exports dealActivities helpers
    MicrosoftContext.jsx  — Microsoft 365 sync loop, webhook polling, triggers dealActivitySync
    ThemeContext.jsx      — light/dark/system theme
  pages/
    Dashboard.jsx         — KPIs, pipeline summary, reminders, needs attention
    Contacts.jsx          — Shared contacts list & detail (activity, reminders, Outlook mirror)
    PersonalContacts.jsx  — My (owned) contacts list & detail
    Companies.jsx         — Companies list & detail (My + Shared, bulk selection)
    Deals.jsx             — Deals list & detail (bulk import, pipeline view)
    Properties.jsx        — Properties alternate entry (redirects to deals routes)
    Pipeline.jsx          — Kanban board across deal stages with velocity metrics
    Investors.jsx         — Investor company profiles with investment criteria tracking
    Comps.jsx             — Comparable sales database
    Reminders.jsx         — Full reminder queue with filters
    Reports.jsx           — Pipeline analytics, activity report, CSV export
    Map.jsx               — Geocoded deal map
    Inbox.jsx             — Combined activity log (manual + deal threads)
    Documents.jsx         — OneDrive/SharePoint file browser
    Automations.jsx       — Trigger-based workflow rules
    Settings.jsx          — User preferences, Microsoft connection
    RecentlyDeleted.jsx   — Soft-deleted items with restore/purge
    Login.jsx             — Auth
  components/
    ActivityFeed.jsx      — Shared activity log (manual entries + deal thread cards)
    DealActivityItem.jsx  — Single deal_activity card with signal badges + correction UI
    ImportModal.jsx       — CSV bulk import (contacts, companies, properties, comps, deals)
    LinkedInProfile.jsx   — PDL LinkedIn enrichment display
    OutlookMessages.jsx   — Raw Outlook mirror (contact-level reference, not in shared log)
    OutlookAttachments.jsx — Attachment list viewer
    CommunicationHeatmap.jsx — Visual communication frequency matrix
    DuplicateCheckModal.jsx — On-create duplicate detection UI
    DuplicateScanModal.jsx  — Bulk duplicate scan & merge UI
    ShareModal.jsx        — Share contact/company with specific team members
    SearchableSelect.jsx  — Searchable dropdown with inline creation
    CompanyCombobox.jsx   — Company-specific searchable combobox
    TagInput.jsx          — Multi-tag input
    Modal.jsx             — Reusable modal wrapper
    ReminderList.jsx      — Reminder list per entity
    GlobalSearch.jsx      — Global search results component
    layout/
      AppShell.jsx        — Main layout shell
      Sidebar.jsx         — Navigation with badge counts
      CommandPalette.jsx  — Global keyboard search (⌘K)
  hooks/
    useIntelligence.js    — Health scores, momentum, suggested follow-ups, pipeline stats
  lib/
    supabase.js           — DB client, transforms (toSnake/toCamel/clean), seed data
    dealActivityScoring.js — Email relevance scoring engine (Tier 1/2/3)
    msalConfig.js         — MSAL configuration and scope definitions
    graphClient.js        — Legacy Graph client (used by OutlookMessages)
  services/
    microsoft.js          — Full Microsoft Graph API service layer
    dealActivitySync.js   — Sent-mail scoring orchestrator
  utils/
    helpers.js            — Constants (DEAL_TYPES, DEAL_STATUSES, colors), formatters
api/
  linkedin.js             — Vercel serverless: PDL API proxy
  graph-webhook.js        — Vercel serverless: Microsoft Graph change notification receiver
```
