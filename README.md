# Tour Insights Hub

Đây là một ứng dụng Next.js được xây dựng bằng Firebase Studio. Nó là một nền tảng để thu thập và hiển thị phản hồi của người dùng cho các chuyến tham quan khác nhau.

Để bắt đầu, hãy xem `src/app/page.tsx`.

## Công nghệ sử dụng

Dự án này được xây dựng với một bộ công nghệ full-stack TypeScript hiện đại:

*   **Framework**: [Next.js](https://nextjs.org/) (sử dụng App Router)
*   **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/)
*   **Giao diện người dùng (UI)**: [ShadCN UI](https://ui.shadcn.com/)
*   **Tạo kiểu (Styling)**: [Tailwind CSS](https://tailwindcss.com/)
*   **Biểu tượng (Icons)**: [Lucide React](https://lucide.dev/)
*   **Backend & Cơ sở dữ liệu**: [Firebase](https://firebase.google.com/) (Firestore, Firebase Authentication)
*   **Trí tuệ nhân tạo (AI)**: [Genkit](https://firebase.google.com/docs/genkit) (với Google AI/Gemini)
*   **Quản lý biểu mẫu**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
*   **Định dạng ngày**: [date-fns](https://date-fns.org/)

## Biến môi trường

Sao chép `.env.example` (nếu có) hoặc đặt trực tiếp trong Firebase App Hosting:

| Biến | Mô tả |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Project ID cho Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Client email của service account |
| `FIREBASE_PRIVATE_KEY` | Private key của service account (dùng `\n` cho xuống dòng) |
| `FIREBASE_STORAGE_BUCKET` | Tên bucket Storage (ví dụ `project-id.appspot.com`) |
| `NEXT_PUBLIC_CLOUD_FUNCTIONS_BASE_URL` | URL gốc Cloud Functions gen2 (ví dụ `https://region-project.cloudfunctions.net`) |
| `NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY` | App Check reCAPTCHA Enterprise site key |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY` | reCAPTCHA Enterprise key dùng trên web |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | (Tùy chọn) GA4 Measurement ID |
| `NEXT_PUBLIC_SEARCH_CONSOLE_VERIFICATION` | (Tùy chọn) mã xác minh Search Console |
| `NEXT_PUBLIC_TRIPADVISOR_WIDGET_URL` | (Tùy chọn) URL iframe Tripadvisor |
| `NEXT_PUBLIC_GOOGLE_REVIEWS_WIDGET_URL` | (Tùy chọn) URL iframe Google Reviews |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (ví dụ `https://tourfeedbackhub.com`) |
