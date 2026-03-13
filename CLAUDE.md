# CRE CRM — Claude Instructions

## Auto-deploy
After every change (or batch of related changes):
1. Run `npx vercel --prod` to deploy to production. Do not wait for the user to ask. The project is already linked to Vercel.
2. Commit and push to GitHub (`git add`, `git commit`, `git push origin main`). Do not wait for the user to ask.

## Stack
- React 18 + Vite 5, Tailwind CSS, React Router v6
- Supabase (PostgreSQL + RLS + Auth) as backend
- Context API: CRMContext, AuthContext, ThemeContext
- Vercel serverless function: `api/linkedin.js` (PDL API proxy — PDL_API_KEY set in Vercel env vars)

## Supabase schema migrations
Whenever a new field is added to a data model (e.g. a new column on contacts, companies, etc.), a corresponding column must be added to the Supabase table. The app's `toSnake`/`toCamel` transforms handle naming automatically (camelCase ↔ snake_case), but the column itself must exist in the DB.

When adding a new field, always tell the user to run the following SQL in the Supabase SQL Editor:
```sql
ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <snake_case_column> <TYPE>;
```
Common types: `TEXT` (strings, enums), `NUMERIC` (decimals), `BOOLEAN`, `TIMESTAMPTZ` (dates), `TEXT[]` (arrays), `UUID` (foreign keys).

## Conventions
- DB layer uses snake_case; app uses camelCase — transformation happens in `src/lib/supabase.js`
- Soft delete pattern with 15-day retention (Recently Deleted page)
- Custom hex colors use inline `style={{ }}`, not arbitrary Tailwind values
- Dark mode via `dark` class on `<html>` (ThemeContext); always include `dark:` variants
- Font: Verdana throughout (set in `src/index.css`)

## Key files
- `src/context/CRMContext.jsx` — all data/state logic
- `src/lib/supabase.js` — DB access + seed data
- `src/pages/` — page components (Contacts, Companies, Properties, Dashboard, Reminders, Map)
- `src/components/LinkedInProfile.jsx` — LinkedIn enrichment display
- `api/linkedin.js` — serverless PDL enrichment endpoint
- `vercel.json` — build config + function timeout
