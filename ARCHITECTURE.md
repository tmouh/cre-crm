# Architecture & Inner Workings

Technical documentation covering non-obvious logic, priorities, and data flow in the Vanadium OS CRE deal tracker.

---

## Data Flow & Context

All CRM data lives in **CRMContext** (`src/context/CRMContext.jsx`). On mount, it loads everything from Supabase into memory and all CRUD operations update both the database and local state simultaneously.

**Auth** is handled by **AuthContext** (`src/context/AuthContext.jsx`). On sign-in, `syncTeamMember` upserts the user into the `team_members` table with their `display_name` from Google/OAuth metadata. This is how team member names show up instead of emails.

**Theme** is managed by **ThemeContext** (`src/context/ThemeContext.jsx`), stored in localStorage.

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

## Phone Icon in Contacts List

The phone icon in the contacts table shows if **either** `phone` (office) **or** `mobile` is set. The `tel:` link prefers office phone when available, falling back to mobile.

---

## camelCase / snake_case Transforms

The app uses camelCase internally (JavaScript convention) but Supabase uses snake_case (PostgreSQL convention). All conversions happen in `src/lib/supabase.js`:

- `toSnake()` — converts outgoing objects before insert/update
- `toCamel()` — converts incoming rows after select
- `clean()` — strips `undefined` AND empty strings before sending to Supabase (critical: empty strings break UUID and numeric columns)

---

## Soft Delete

Contacts, companies, properties, and reminders use soft delete. Deleting a record sets `deleted_at` to the current timestamp instead of removing the row. The **Recently Deleted** page shows items deleted in the last 15 days with options to restore or permanently purge.

`getAll()` queries filter out rows where `deleted_at` is not null (controlled by `trackDeleted: true` on the table helper).

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
`acquisition`, `note-acquisition`, `recapitalization`, `sale`, `equity-raise`, `preferred-equity`, `mezzanine`, `senior-debt`, `bridge-financing`, `construction-financing`

**Deal Statuses** (where it is in the pipeline):
`prospect` → `engaged` → `under-loi` → `under-contract` → `due-diligence` → `closed` / `dead`

Each has its own color mapping defined in `src/utils/helpers.js`.

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

## File Structure

```
src/
  context/
    AuthContext.jsx      — authentication state & team member sync
    CRMContext.jsx       — all CRUD operations & data state
    ThemeContext.jsx      — light/dark/system theme
  pages/
    Dashboard.jsx        — stats, reminders, needs attention, upcoming
    Contacts.jsx         — contact list & detail with activity/reminders
    Companies.jsx        — company list & detail
    Properties.jsx       — deal list & detail
    Reminders.jsx        — full reminder queue with filters
    Settings.jsx         — user preferences (theme, defaults)
    RecentlyDeleted.jsx  — soft-deleted items with restore/purge
    Login.jsx            — email/password authentication
  components/
    Layout.jsx           — main layout with sidebar
    Sidebar.jsx          — navigation with badge counts
    ActivityFeed.jsx     — activity timeline with add/edit forms
    ReminderList.jsx     — reminder list per entity
    SearchableSelect.jsx — searchable dropdown with inline creation
    Modal.jsx            — reusable modal wrapper
    PageHeader.jsx       — consistent page headers
    TagInput.jsx         — multi-tag input
    EmptyState.jsx       — empty list placeholder
    ImportModal.jsx      — CSV bulk import
    ...
  lib/
    supabase.js          — database client, transforms, seed data
  utils/
    helpers.js           — constants, formatters, date utilities
```

---

## Color System

All badges use a consistent color mapping defined in `helpers.js`:

| Category | Colors |
|----------|--------|
| **Priority** | high=red, medium=yellow, low=gray |
| **Activity/Reminder type** | call=purple, email=blue, meeting=indigo, tour=teal, proposal=orange, note=gray, follow-up=pink |
| **Deal status** | prospect=gray, engaged=blue, under-loi=indigo, under-contract=yellow, due-diligence=purple, closed=green, dead=red |
| **Company type** | owner=blue, tenant=green, investor=purple, developer=orange, broker=teal, lender=yellow |

All colors include dark mode variants.
