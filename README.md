# AMC10

A private AMC10 practice arena: concepts, drills, past papers, and progress tracking. Designed to be deployed to Cloudflare Pages.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS + a custom Cyber Anime / Persona-style design system
- Vitest + Testing Library for unit tests
- `@cloudflare/next-on-pages` for Cloudflare Pages deploy (D1 wired in a later milestone)

## Local development

```bash
npm install --legacy-peer-deps   # required: react@19 stable vs Next 15.0.3 peer dep
npm run dev                      # http://localhost:3000
npm test                         # 17 unit tests
npm run build                    # next build
```

## Deploy

Auto-deployed to Cloudflare Pages on push to `main`. Build settings:

- Build command: `npx @cloudflare/next-on-pages`
- Build output directory: `.vercel/output/static`
- Node version: 22
- `nodejs_compat` compatibility flag (set in `wrangler.toml`)

## Roadmap

See `docs/superpowers/specs/` for the full design spec and `docs/superpowers/plans/` for per-milestone implementation plans.

| Plan | Scope | Status |
|------|-------|--------|
| 1 | Scaffolding + theme + home page | done |
| 2 | MDX content layer, concept pages | next |
| 3 | Google sign-in, D1, account allowlist | |
| 4 | Practice modes, past papers, bookmarks | |
| 5 | Progress dashboard + inactivity reminders | |
