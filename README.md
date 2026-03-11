# Vanadium CRM

A lightweight CRM built for commercial real estate outreach. Tracks contacts, companies, and properties with follow-up reminders tied to deals. Multi-user, cloud-backed, and login-protected.

## Features

- **Dashboard** — overdue/today/upcoming follow-ups at a glance, stale contact alerts
- **Follow-ups** — reminder queue organized by urgency, filterable by type and priority
- **Contacts** — last-touch tracking, linked company and properties, assignable owner(s)
- **Companies** — owners, tenants, investors, developers with related contacts and properties
- **Properties** — office, industrial, retail, land, multifamily with status, rent, and key contacts
- **Activity log** — log calls, emails, meetings, and notes per record
- **Bulk CSV import** — import contacts, companies, or properties from a spreadsheet
- **Inline company creation** — create a new company on the fly while adding a contact
- **Tags** — across all record types for fast filtering
- **Multi-user** — all team members share one dataset; data is never stored locally

## Stack

- React 18 + Vite
- Tailwind CSS
- React Router v6
- Supabase (PostgreSQL + Auth)
- Deployed on Vercel

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
   Vite will print the local URL (typically `http://localhost:5173`).

## Supabase Setup (first-time only)

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema SQL in **Database → SQL Editor** (see `supabase_schema.sql` or the setup guide)
3. Enable Row Level Security and apply the `auth_full` policies for all tables
4. Go to **Authentication → Users** and create accounts for each team member (no self-signup)
5. Copy your **Project URL** and **anon public key** from **Settings → API** into `.env`

## Deployment (Vercel)

Push to GitHub — Vercel auto-deploys on every push. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in your Vercel project settings.

## Access

Login is by invitation only. Accounts must be created by an admin in the Supabase dashboard under **Authentication → Users**.
