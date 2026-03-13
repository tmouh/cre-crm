# CRE CRM — Claude Instructions

## Auto-deploy
After every change (or batch of related changes), run `vercel --prod` to deploy to production. Do not wait for the user to ask. The project is already linked to Vercel.

## Stack
- React 18 + Vite 5, Tailwind CSS, React Router v6
- Supabase (PostgreSQL + RLS + Auth) as backend
- Context API: CRMContext, AuthContext, ThemeContext
- Vercel serverless function: `api/linkedin.js` (PDL API proxy — PDL_API_KEY set in Vercel env vars)

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
