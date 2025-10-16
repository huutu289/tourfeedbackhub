# Repository Guidelines

## Project Structure & Module Organization
- Next.js App Router pages live in `src/app`; `src/app/page.tsx` is the entry and heavy logic should live in `src/lib`.
- UI blocks sit in `src/components` (ShadCN-based) with shared hooks in `src/hooks` and assets in `public/`.
- Firebase client/admin configs belong in `src/firebase`, AI flows in `src/ai`, and docs and config files live at the repo root (`docs/`, `next.config.ts`, `tailwind.config.ts`).
- Prefer path aliases such as `@/lib/example` over nested relative imports.

## Build, Test, and Development Commands
- `npm run dev` starts the Turbopack dev server on port 9002.
- `npm run build` generates the production bundle and `npm start` serves it for smoke tests.
- `npm run lint` enforces Next.js ESLint rules—fix every warning.
- `npm run typecheck` runs `tsc --noEmit` to catch type issues.
- `npm run genkit:dev` runs local Genkit flows during AI work.

## Coding Style & Naming Conventions
- Code in TypeScript with React function components, 2-space indentation, and sub-100-character lines.
- Name routes `page.tsx`, components `PascalCase.tsx`, utilities `camelCase.ts`, and hooks `useSomething.ts`.
- Keep Tailwind classes near their JSX and prefer semantic, minimal utility stacks.
- Default to ASCII; add comments only when clarifying non-obvious intent.

## Testing Guidelines
- Adopt Vitest with Testing Library when introducing coverage.
- Store specs beside sources (`Component.test.tsx`) or under `src/__tests__`.
- Keep tests deterministic and, once Vitest is wired in, expose a `test` script such as `vitest run`.

## Commit & Pull Request Guidelines
- Write concise, imperative commit messages; Conventional Commits (`feat:`, `fix:`, `docs:`) are encouraged.
- PRs should summarize changes, link issues (`Closes #123`), and include UI evidence for visual updates.
- Run `npm run lint` and `npm run typecheck` before review and call out deliberate follow-up tasks.

## Security & Configuration Tips
- Never commit secrets; store environment values in `.env.local` (gitignored) and escape multiline strings with `\n`.
- Key env vars include Firebase credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`) and client keys (`NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL`, `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY`, `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY`).
- Validate `firestore.rules` and index tweaks via Firebase Emulators before deploying.

## Firebase & Deploy Workflows
- Cloud Functions live under `functions/`; build with `cd functions && npm run build` before deploying.
- Deploy functions via `firebase deploy --only functions`; deploy rules with `firebase deploy --only firestore:rules,storage`.
- Media uploads use Cloud Functions (`adminTourUploadDirect`, `adminTourUploadUrl`) and store assets under `/tours/{tourId}/` with token-based access control—verify any rule changes against this contract.
