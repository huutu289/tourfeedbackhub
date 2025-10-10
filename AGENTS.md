# Repository Guidelines

## Project Structure & Module Organization
- App routes/pages: `src/app` (Next.js App Router)
- Reusable UI: `src/components`; global styles: `src/app/globals.css`
- Domain logic/helpers: `src/lib` (types, utils, services)
- Firebase client/admin: `src/firebase` (config, hooks, admin helpers)
- React hooks: `src/hooks`
- AI/Genkit flows: `src/ai`
- Docs/config: `docs/`, `next.config.ts`, `tailwind.config.ts`, `firebase.json`, `firestore.rules`
- Path alias: import via `@/...` mapped to `src/*` (see `tsconfig.json`).

## Build, Test, and Development Commands
- `npm run dev` — Start Next.js dev server (Turbopack) on port 9002.
- `npm run build` — Production build.
- `npm start` — Run the built app.
- `npm run lint` — Lint with Next/ESLint rules.
- `npm run typecheck` — TypeScript type checking only.
- `npm run genkit:dev` / `npm run genkit:watch` — Run Genkit flows locally.

## Coding Style & Naming Conventions
- Language: TypeScript + React (function components). Indentation: 2 spaces; keep lines <100 chars when practical.
- Filenames: pages use kebab-case `page.tsx` under route dirs; components PascalCase (e.g., `MyWidget.tsx`).
- Imports: prefer `@/...` absolute paths.
- Tailwind: co-locate classes in JSX; keep semantic, minimal utility sets.
- Fix lint warnings before PR.

## Testing Guidelines
- No test framework configured yet. If adding tests, use Vitest + Testing Library.
- Place tests next to sources as `*.test.ts(x)` or under `src/__tests__`.
- Keep tests deterministic; focus on lib functions and critical pages.
- Add a `test` script if you introduce Vitest (e.g., `vitest` or `vitest run`).

## Commit & Pull Request Guidelines
- Commits: concise, imperative; Conventional Commits encouraged (e.g., `feat:`, `fix:`, `docs:`).
- PRs: include a clear description, linked issues (e.g., `Closes #123`), and screenshots/GIFs for UI changes.
- Keep PRs focused and small; note any follow-ups.

## Security & Configuration Tips
- Do not commit secrets. Use `/.env.local` (gitignored). For multiline keys, wrap in quotes and escape newlines (`\n`).
- Validate Firestore rules (`firestore.rules`) and indexes before deploy; optionally use Firebase Emulators locally.

## Architecture Overview
- Next.js App Router for routing; Firebase for auth/data; Genkit for AI flows. Client code in `src/app`; shared logic in `src/lib`; platform integrations in `src/firebase` and `src/ai`.

## Agent-Specific Instructions
- Follow this AGENTS.md across the repo scope. Prefer minimal, focused diffs and keep style consistent.
- Use `apply_patch` for edits; avoid unrelated refactors. Update docs when touching behavior.
- Favor `@/...` imports, and run `npm run lint` and `npm run typecheck` before proposing PRs.
