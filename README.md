# Tour Insights Hub

Đây là một ứng dụng Next.js được xây dựng bằng Firebase Studio. Nó là một nền tảng để thu thập và hiển thị phản hồi của người dùng cho các chuyến tham quan khác nhau.

## Tính năng chính

- 🎫 **Quản lý Tour**: Tạo, chỉnh sửa và quản lý thông tin các chuyến tour đã hoàn thành
- 📸 **Upload Media**: Hỗ trợ upload hình ảnh (lên đến 10MB) và video (lên đến 100MB)
- ⭐ **Thu thập đánh giá**: Cho phép khách hàng gửi đánh giá và phản hồi với AI tóm tắt
- 🔐 **Xác thực Admin**: Hệ thống đăng nhập với Custom Claims và Remember Me
- 🖼️ **Hiển thị Media**: Tự động tạo URL công khai với token-based access control
- 🛡️ **App Check**: Bảo vệ Cloud Functions và Firestore khỏi spam và lạm dụng
- 🎨 **Giao diện hiện đại**: Sử dụng ShadCN UI components với Tailwind CSS

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

## Cài đặt và Chạy

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build production
npm run build

# Chạy production server
npm start
```

Server sẽ chạy tại `http://localhost:9002`

## Upload Media cho Tour

Ứng dụng hỗ trợ upload hình ảnh và video cho các tour với cơ chế token-based access control:

### Cách thức hoạt động:

1. **Upload nhỏ (< 8MB)**: Sử dụng base64 encoding và Cloud Function `adminTourUploadDirect`
2. **Upload lớn (>= 8MB)**: Sử dụng signed URL từ Cloud Function `adminTourUploadUrl`

### Định dạng hỗ trợ:

- **Hình ảnh**: JPEG, PNG, WebP, HEIC (tối đa 10MB)
- **Video**: MP4, QuickTime, WebM (tối đa 100MB)

### Storage Rules:

Các file được lưu tại đường dẫn `/tours/{tourId}/` trong Firebase Storage và tự động được gán public download token để cho phép truy cập công khai mà không cần authentication.

## Xác thực Admin

### Đăng nhập:

- Truy cập `/admin/login`
- Sử dụng email và password
- Chọn "Remember Me" để lưu trạng thái đăng nhập

### Phân quyền:

Admin được xác định thông qua Custom Claims (`admin: true`). Để cấp quyền admin cho user:

```javascript
// Sử dụng Firebase Admin SDK
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

## Cloud Functions

Dự án sử dụng Firebase Cloud Functions Gen 2:

- `feedbackSubmit`: Xử lý feedback từ khách hàng
- `feedbackUploadComplete`: Xác nhận hoàn tất upload feedback photo
- `adminFeedbackApprove`: Phê duyệt feedback
- `adminFeedbackReject`: Từ chối feedback
- `adminTourUploadDirect`: Upload media trực tiếp (base64)
- `adminTourUploadUrl`: Tạo signed URL cho upload lớn

### Deploy Functions:

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Firestore Security Rules

Để deploy Firestore và Storage rules:

```bash
# Deploy cả hai
firebase deploy --only firestore:rules,storage

# Hoặc riêng lẻ
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Genkit AI

Dự án sử dụng Genkit với Google AI (Gemini 2.5 Flash) để:

- Tóm tắt feedback của khách hàng
- Phát hiện ngôn ngữ feedback

```bash
# Chạy Genkit dev server
npm run genkit:dev
```
