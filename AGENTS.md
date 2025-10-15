Repository Guidelines
=====================

Project Structure & Module Organization
---------------------------------------
- Core app routes/pages live under `src/app` (Next.js App Router). Keep page components lean and move logic into helpers.
- Reusable UI elements sit in `src/components`; global styling is managed in `src/app/globals.css`.
- Domain logic and utilities belong in `src/lib`; prefer colocated types and helpers.
- Firebase integrations reside in `src/firebase` (client/admin configs and hooks). React hooks go in `src/hooks`.
- AI and Genkit flows stay in `src/ai`. Documentation and project-wide configs are in `docs/`, `next.config.ts`, `tailwind.config.ts`, `firebase.json`, and `firestore.rules`.
- Use path aliases (`@/...`) defined in `tsconfig.json` instead of relative paths.

Build, Test, and Development Commands
-------------------------------------
- `npm run dev` — Launches the Next.js dev server (Turbopack) on port 9002.
- `npm run build` — Creates a production build; run before deploying.
- `npm start` — Serves the output from `npm run build`.
- `npm run lint` — Runs Next.js/ESLint rules; resolve all warnings before committing.
- `npm run typecheck` — Executes TypeScript checks without emitting build artifacts.
- `npm run genkit:dev` / `npm run genkit:watch` — Run Genkit flows locally for AI development.

Coding Style & Naming Conventions
---------------------------------
- Language stack: TypeScript + React function components with 2-space indentation and sub-100-char lines when practical.
- Name route files `page.tsx` inside their route directories; components use PascalCase (e.g., `MyWidget.tsx`).
- Co-locate Tailwind classes within JSX; favor semantic naming and minimal utility combinations.
- Default to ASCII characters unless a file already uses Unicode. Keep comments focused and only when clarifying non-obvious logic.

Testing Guidelines
------------------
- Tests are not yet configured. When adding coverage, use Vitest with Testing Library.
- Store tests adjacent to sources (`Component.test.tsx`) or under `src/__tests__`.
- Ensure tests remain deterministic; add a `test` script (e.g., `vitest run`) if you introduce Vitest.

Commit & Pull Request Guidelines
--------------------------------
- Use concise, imperative commits; Conventional Commits (`feat:`, `fix:`, `docs:`) are encouraged.
- Pull requests should explain the change, link issues (`Closes #123`), and include UI screenshots or GIFs when applicable.
- Keep PRs focused, fix lint and type errors, and highlight follow-up work separately.

Security & Configuration Tips
-----------------------------
- Never commit secrets. Store environment values in `.env.local` (gitignored); wrap multiline secrets in quotes and escape newlines as `\n`.
- Validate Firestore rules (`firestore.rules`) and indexes before deploys. Use Firebase Emulators when practical for local validation.

Architecture Overview
---------------------
- Next.js App Router handles routing and rendering. Firebase powers authentication and data access. Genkit supports AI/automation flows.
- Client-facing code resides in `src/app`, shared logic in `src/lib`, while integrations live in `src/firebase` and `src/ai`. Follow this separation to keep responsibilities clear.

Agent-Specific Instructions
---------------------------
- Prefer minimal, focused diffs and maintain existing conventions. Use `apply_patch` for edits whenever feasible.
- Favor `@/...` imports, run `npm run lint` and `npm run typecheck` before proposing changes, and avoid reverting user-authored modifications.
