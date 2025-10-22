# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
##rule when work with github
Always ensure:

.env, .env.local, .env.production, firebase-service-account.json, and similar files are excluded in .gitignore.

Any hardcoded keys or secrets must be replaced with environment variables (e.g., process.env.API_KEY).

Before commit, run a quick scan (like git diff) to confirm no secret values appear.

Do not include any .env values in the commit message, PR description, or comments.

If needed, create placeholder values ("YOUR_API_KEY_HERE") for clarity.

⚠️ If you detect sensitive tokens, remove them immediately and regenerate new keys.

Goal: push only safe, clean code with configuration handled through environment variables or secret managers.
“Before pushing, verify that .gitignore correctly excludes all secret files and ensure no sensitive keys appear in commits.”
Never commit or push sensitive information (API keys, .env, service accounts). 
Ensure .env and credentials are listed in .gitignore. 
Use environment variables instead of hardcoding. 
Push only clean, non-sensitive code.



## Project Overview

Tour Insights Hub (TourFeedbackHub) is a Next.js 15 application for collecting and managing tour feedback. It allows anonymous users to submit reviews, which are then moderated by admins before being displayed publicly. The app integrates Firebase (Firestore + Auth), Genkit AI for feedback summarization, and uses ShadCN UI components with Tailwind CSS.

## Development Commands

### Running the Application
```bash
npm run dev              # Start Next.js dev server on port 9002 with Turbopack
npm run build           # Production build (NODE_ENV=production)
npm start               # Start production server
```

### AI/Genkit Development
```bash
npm run genkit:dev      # Start Genkit development server
npm run genkit:watch    # Start Genkit with file watching
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run typecheck       # Run TypeScript type checking (tsc --noEmit)
```

**Note**: The Next.js config currently ignores TypeScript and ESLint errors during builds (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). This should be addressed before production.

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: ShadCN UI + Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore, Authentication, App Check)
- **AI**: Genkit with Google AI (Gemini 2.5 Flash)
- **Forms**: React Hook Form + Zod validation
- **Date Formatting**: date-fns

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard routes
│   │   ├── dashboard/     # Admin overview
│   │   ├── reviews/       # Review moderation
│   │   ├── tours/         # Tour management
│   │   └── settings/      # Site settings
│   ├── feedback/          # Public feedback submission form
│   ├── reviews/           # Public review display
│   └── page.tsx           # Homepage
├── components/
│   ├── admin/             # Admin-specific components
│   └── ui/                # ShadCN UI components
├── firebase/              # Firebase integration layer
│   ├── provider.tsx       # React context for Firebase services
│   ├── firestore/         # Custom Firestore hooks (useDoc, useCollection)
│   ├── non-blocking-*.tsx # Async Firebase operations
│   └── config.ts          # Firebase initialization
├── ai/                    # Genkit AI flows
│   ├── genkit.ts          # Genkit configuration (Gemini 2.5 Flash)
│   ├── flows/             # AI flow definitions
│   │   ├── summarize-feedback.ts      # Feedback summarization
│   │   └── detect-feedback-language.ts # Language detection
│   └── dev.ts             # Genkit dev server entry
├── lib/
│   ├── actions.ts         # Server actions (submitFeedback, approveReview, etc.)
│   ├── types.ts           # TypeScript interfaces (Tour, Review)
│   └── data.ts            # Mock/placeholder data
└── hooks/                 # Custom React hooks
```

### Data Model (Firestore Collections)

All collections have public read access but require App Check tokens for writes:

- **`/feedback/{feedbackId}`**: User-submitted feedback
  - Fields: name, country, language, rating, message, tourId?, photoUrl?, status (pending/approved/rejected), submittedAt, feedbackSummary?, detectedLanguage?

- **`/tours/{tourId}`**: Tour information
  - Fields: id, name, typeId, description, teaser, imageUrl

- **`/tour_types/{tourTypeId}`**: Tour categories
  - Fields: id, name, description

- **`/site_settings/{siteSettingsId}`**: Global site settings (singleton)
  - Fields: primaryColor, backgroundColor, accentColor, fontHeadline, fontBody

### Firebase Integration Pattern

The app uses a custom Firebase provider pattern:

1. **FirebaseProvider** (`src/firebase/provider.tsx`): Wraps the app and provides Firebase services + auth state via React Context
2. **Custom Hooks**:
   - `useFirebase()`: Access firebaseApp, firestore, auth, user state
   - `useFirestore()`, `useAuth()`, `useFirebaseApp()`: Individual service access
   - `useUser()`: Get current user authentication state
   - `useDoc()`, `useCollection()`: Real-time Firestore data subscriptions

3. **Non-blocking Operations**:
   - `non-blocking-login.tsx`: Background authentication
   - `non-blocking-updates.tsx`: Async Firestore writes with error handling via `error-emitter.ts`

### Server Actions

All server actions are in `src/lib/actions.ts`:
- `submitFeedback(formData)`: Validates and stores feedback with Zod schema
- `approveReview(reviewId)`: Approves pending feedback
- `rejectReview(reviewId)`: Rejects pending feedback
- `summarizeReview(feedbackMessage)`: Calls Genkit AI flow for summarization

### AI Flows (Genkit)

AI configuration uses Google AI with Gemini 2.5 Flash model (`src/ai/genkit.ts`):
- `summarizeFeedback`: Generates concise feedback summaries and detects language
- Entry point for Genkit dev server: `src/ai/dev.ts`

### Security Model

**App Check Protection**: All Firestore write operations require valid App Check tokens (see `firestore.rules`). This prevents spam and unauthorized modifications. Read operations are public.

**Authentication**: The app supports password and anonymous Firebase Auth providers.

### Styling

- **Primary Color**: `#77B5FE` (subdued blue)
- **Background**: `#F0F8FF` (light desaturated blue)
- **Accent**: `#4682B4` (darker blue for interactive elements)
- **Fonts**: 'Playfair' (serif headlines), 'PT Sans' (sans-serif body)
- **Design Philosophy**: Mobile-first, clean and modern, subtle animations

### Image Handling

Next.js image optimization is configured for:
- `placehold.co`
- `images.unsplash.com`
- `picsum.photos`

Placeholder images are managed via `src/lib/placeholder-images.json`.

## Firebase Environment Setup

Firebase configuration requires environment variables (not in repo, see `.env*` in `.gitignore`). Set up:
- Firebase project credentials
- App Check configuration
- Genkit API keys for Google AI

## Known Issues / TODOs

1. **Build Configuration**: TypeScript and ESLint errors are currently ignored during builds (see `next.config.ts`). These should be resolved before production deployment.
2. **Photo Upload**: File upload logic is stubbed in `submitFeedback()` (line 26-28 in `actions.ts`)
3. **App Check/reCAPTCHA**: Integration commented out in `submitFeedback()` (line 30 in `actions.ts`)
4. **Review Actions**: `approveReview()` and `rejectReview()` are simulated with delays instead of actual Firestore updates (lines 51-71 in `actions.ts`)

## Testing Workflow

Currently no test framework is configured. When adding tests:
- Unit tests for server actions and AI flows
- Integration tests for Firestore operations
- Component tests for admin interfaces

## Deployment

The project includes `apphosting.yaml` for Firebase App Hosting deployment. Ensure:
1. All environment variables are configured
2. Firestore rules are deployed (`firestore.rules`)
3. App Check is properly configured for production
4. Build errors are resolved before deployment
