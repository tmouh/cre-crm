# Vanadium OS — Relationship Management

A cloud-backed CRM purpose-built for commercial real estate advisors and brokers. Tracks contacts, companies, deals, reminders, and activity across the full lifecycle of a transaction.

## Features

- **Dashboard** — overdue/today/upcoming reminders, stale contact alerts (Needs Attention), and upcoming reminders by contact
- **Reminders** — task queue organized by urgency with type, priority, and due date filters
- **Contacts** — last-touch tracking, linked companies and deals, assignable owner(s), bulk CSV import, Outlook integration
- **Companies** — owners, tenants, investors, developers, brokers, lenders with related contacts and deals
- **Deals** — acquisition, debt, equity, sale, and construction financing with stage tracking (prospect → closed/dead)
- **Activity Log** — log calls, emails, meetings, tours, proposals, and notes per record with backdatable timestamps
- **Searchable comboboxes** — inline creation of contacts, companies, and properties from any form
- **Soft delete** — 15-day recovery window before permanent deletion
- **Tags** — across all record types for fast filtering
- **Dark mode** — light, dark, and system theme support
- **Multi-user** — team members share one dataset; data is never stored locally

## Stack

- React 18 + Vite
- Tailwind CSS
- React Router v6
- Supabase (PostgreSQL + Auth + Row Level Security)
- Deployed on Vercel (auto-deploys on push to main)

## Local Development

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the project root:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Supabase Setup (first-time only)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema SQL in **Database → SQL Editor** (see `supabase_schema.sql`)
3. Enable Row Level Security and apply the `auth_full` policies for all tables
4. Go to **Authentication → Users** and create accounts for each team member (no self-signup)
5. Copy your **Project URL** and **anon public key** from **Settings → API** into `.env`

## Deployment

Push to GitHub — Vercel auto-deploys on every push. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in your Vercel project settings.

## Access

Login is by invitation only. Accounts must be created by an admin in the Supabase dashboard under **Authentication → Users**.
