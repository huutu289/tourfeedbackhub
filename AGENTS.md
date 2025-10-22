# Repository Guidelines

## Project Structure & Module Organization
- Next.js App Router bootstraps from `src/app/page.tsx`; keep route folders under `src/app`.
- Place shared UI in `src/components`, custom hooks in `src/hooks`, reusable logic in `src/lib`, and feature helpers in `src/firebase` or `src/ai`.
- Co-locate tests with their subjects or group them in `src/__tests__`; store static assets in `public/asset-name`.
- Use configured path aliases such as `@/lib/example` to avoid brittle relative imports.

## Build, Test, and Development Commands
- `npm run dev` starts the Turbopack dev server on port 9002.
- `npm run build` compiles the production bundle; follow with `npm start` for a local smoke check.
- `npm run lint` runs the Next.js ESLint rules; resolve every warning before pushing.
- `npm run typecheck` executes `tsc --noEmit` to surface typing regressions early.
- `npm run test` (or `vitest run`) runs the Vitest suite.

## Coding Style & Naming Conventions
- Write TypeScript React function components with 2-space indentation and keep lines under 100 characters.
- Name route files `page.tsx`, components `PascalCase.tsx`, utilities `camelCase.ts`, and hooks `useThing.ts`.
- Tailwind classes should remain close to the JSX that uses them; remove unused utilities as you refactor.
- Rely on the repo ESLint/Prettier configuration to format code automatically.

## Testing Guidelines
- Use Vitest with Testing Library for deterministic, isolated UI coverage.
- Match test filenames to their targets (e.g., `TourList.test.tsx`) and keep fixtures beside the tests that consume them.
- Run `npm run test` before every PR and expand coverage whenever you add features or fix regressions.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat: add admin tour upload view`) written in the imperative mood.
- Before opening a PR, rerun `npm run lint` and `npm run typecheck`, summarize changes, link issues (e.g., `Closes #123`), and provide screenshots for UI updates.
- Document any required environment variables or follow-up tasks directly in the PR description.

## Security & Configuration Tips
- Never commit secrets; store runtime credentials in `.env.local` and share securely.
- Key env vars include `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL`, `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY`, and `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY`.
- Validate Firebase rules and indexes with local emulators before deployment, and keep media uploads under `/tours/{tourId}/` with token-based access control.
