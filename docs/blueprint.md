# **App Name**: Tour Insights Hub

## Core Features:

- Anonymous Feedback Submission: Allow visitors to submit feedback via a form (Name, Country, Language, Rating, Message, optional Tour, optional photo) without login.
- Feedback Verification: Verify submissions using App Check and reCAPTCHA Enterprise to prevent spam and abuse.
- Feedback Storage: Store submitted feedback, including optional photos, in Firestore with a 'pending' status.
- Admin Review and Approval: Provide an admin interface to review pending feedback, approve or reject submissions, and manage content.
- Public Review Display: Display approved reviews on the website alongside embedded Tripadvisor/Google Reviews.
- AI-Powered Summarization: Use a tool from Genkit/Vertex AI to summarize feedback messages and detect the language.
- Content Management: Admin interface to manage site settings, tour types, and tour teasers.

## Style Guidelines:

- Primary color: A subdued blue (#77B5FE), reminiscent of clear skies, evoking trust and wanderlust.
- Background color: Light, desaturated blue (#F0F8FF) to maintain a bright, airy feel that doesn't distract from the content.
- Accent color: A slightly darker analogous blue (#4682B4) for interactive elements, drawing the user's attention without overwhelming them.
- Font pairing: 'Playfair' (serif) for headlines to bring an elegant and high-end feel, and 'PT Sans' (sans-serif) for body text to maintain readability.
- Use clean, modern icons to represent tour types and other key elements.
- Mobile-first, responsive design to ensure a seamless experience on all devices.
- Subtle transitions and animations to enhance user engagement without being distracting.