# CRE Desk — Follow-up CRM

A lightweight CRM built for commercial real estate outreach. Tracks contacts, companies, and properties with follow-up reminders tied to deals.

## Features

- **Dashboard** — overdue/today/upcoming follow-ups, stale contact alerts
- **Follow-ups** — reminder queue organized by urgency, filterable by type and priority
- **Contacts** — with last-touch tracking, linked company and properties
- **Companies** — owners, tenants, investors, developers with related contacts and properties
- **Properties** — office, industrial, retail, land, multifamily with status, rent, and key contacts
- **Activity log** — log calls, emails, meetings, and notes per record
- **Tags** — across all record types for fast filtering
- All data stored locally in the browser (no backend required)

## Stack

- React + Vite
- Tailwind CSS
- React Router
- localStorage (no database)

## Getting Started

```bash
npm install
npm run dev
```

Vite will display the local URL in the terminal after running npm run dev. 

The app loads with sample CRE data so you can see it working immediately. Clear it via browser DevTools → Application → Local Storage when ready to use for real.
