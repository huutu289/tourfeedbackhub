# TourFeedbackHub Cloud Functions

This directory contains all Firebase Cloud Functions (v2) for the TourFeedbackHub application.

## Functions Overview

### 1. `feedback-submit`
**Endpoint:** `POST /feedback-submit`

Handles anonymous feedback submission with comprehensive security checks.

**Features:**
- App Check token verification
- reCAPTCHA Enterprise validation (score ≥ 0.7)
- IP-based rate limiting (10 requests/hour)
- Input sanitization & spam detection
- Signed URL generation for photo uploads

**Request Body:**
```json
{
  "name": "John Doe",
  "country": "United States",
  "language": "en",
  "rating": 5,
  "message": "Great tour!",
  "tourId": "tour-id-optional",
  "recaptchaToken": "...",
  "hasAttachment": true,
  "attachmentMetadata": {
    "fileName": "photo.jpg",
    "contentType": "image/jpeg",
    "size": 1024000
  }
}
```

**Response:**
```json
{
  "success": true,
  "feedbackId": "abc123",
  "uploadDetails": {
    "uploadUrl": "https://storage.googleapis.com/...",
    "method": "PUT",
    "headers": { "Content-Type": "image/jpeg" },
    "uploadId": "xyz789"
  }
}
```

### 2. `feedback-upload-complete`
**Endpoint:** `POST /feedback-upload-complete`

Confirms photo upload and attaches URL to feedback document.

**Request Body:**
```json
{
  "feedbackId": "abc123",
  "uploadId": "xyz789"
}
```

**Response:**
```json
{
  "success": true,
  "photoUrl": "gs://bucket/uploads/tmp/abc123/xyz789_photo.jpg"
}
```

### 3. `admin-feedback-approve`
**Endpoint:** `POST /admin-feedback-approve`

Approves pending feedback and creates public review.

**Features:**
- Admin authentication via custom claims
- PII removal (emails, phones, URLs)
- Display name normalization
- Photo migration (tmp → public)
- Tour name resolution

**Request Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Request Body:**
```json
{
  "feedbackId": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "reviewId": "review-xyz"
}
```

### 4. `admin-feedback-reject`
**Endpoint:** `POST /admin-feedback-reject`

Rejects pending feedback and cleans up temporary files.

**Request Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Request Body:**
```json
{
  "feedbackId": "abc123",
  "reason": "Spam content" // optional
}
```

**Response:**
```json
{
  "success": true
}
```

## Development

### Install Dependencies
```bash
npm install
```

### Build TypeScript
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Local Testing with Emulators
```bash
# From project root
firebase emulators:start

# Functions will be available at:
# http://localhost:5001/tourfeedbackhub-474704/us-central1/<function-name>
```

### Deploy Functions
```bash
# From project root
firebase deploy --only functions

# Or use the deployment script
./scripts/deploy.sh --functions
```

## Environment Configuration

Functions require these environment variables (set via Firebase CLI):

```bash
firebase functions:config:set \
  recaptcha.site_key="your-recaptcha-site-key" \
  recaptcha.api_key="your-recaptcha-api-key"
```

View current config:
```bash
firebase functions:config:get
```

## File Structure

```
functions/
├── src/
│   ├── index.ts                     # Entry point, exports all functions
│   ├── feedback-submit.ts           # Feedback submission handler
│   ├── feedback-upload-complete.ts  # Photo upload confirmation
│   ├── admin-feedback-approve.ts    # Approval workflow
│   ├── admin-feedback-reject.ts     # Rejection workflow
│   ├── utils.ts                     # Security & validation utilities
│   └── types.ts                     # TypeScript type definitions
├── lib/                             # Compiled JavaScript (gitignored)
├── package.json
├── tsconfig.json
└── README.md                        # This file
```

## Security Features

All functions implement:
- ✅ CORS headers
- ✅ Method validation (POST only)
- ✅ Request validation
- ✅ Error handling
- ✅ Comprehensive logging

### Rate Limiting
Simple in-memory rate limiting (10 requests/hour per IP). For production scale, consider:
- Redis (via Firebase Extension)
- Firestore-based rate limiting
- Cloud Armor

### PII Detection
The `removePII()` utility detects and removes:
- Email addresses
- Phone numbers (various formats)
- Suspicious URLs (non-whitelisted domains)

## Monitoring

### View Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only feedback-submit

# Follow logs in real-time
firebase functions:log --follow
```

### Firebase Console
View logs, metrics, and errors:
https://console.firebase.google.com/project/tourfeedbackhub-474704/functions

## Error Codes

### feedback-submit
- `method_not_allowed` - Only POST allowed
- `rate_limit_exceeded` - Too many requests
- `app_check_failed` - Invalid App Check token
- `missing_fields` - Required fields missing
- `invalid_rating` - Rating not 1-5
- `invalid_message_length` - Message too short/long
- `missing_recaptcha` - reCAPTCHA token missing
- `recaptcha_failed` - reCAPTCHA score too low
- `spam_detected` - Spam keywords found
- `invalid_file` - File validation failed

### feedback-upload-complete
- `app_check_failed`
- `missing_fields`
- `feedback_not_found`
- `upload_id_mismatch`
- `file_not_found`

### admin-feedback-approve
- `unauthorized` - Not logged in
- `forbidden` - Not admin
- `missing_fields`
- `feedback_not_found`
- `invalid_status` - Already approved/rejected

### admin-feedback-reject
- Same as approve

## Testing

### Manual Testing with curl

**Submit Feedback:**
```bash
curl -X POST \
  https://us-central1-tourfeedbackhub-474704.cloudfunctions.net/feedback-submit \
  -H "Content-Type: application/json" \
  -H "X-Firebase-AppCheck: <app-check-token>" \
  -H "X-Recaptcha-Token: <recaptcha-token>" \
  -d '{
    "name": "Test User",
    "country": "US",
    "language": "en",
    "rating": 5,
    "message": "This is a test feedback",
    "recaptchaToken": "<token>",
    "hasAttachment": false
  }'
```

**Approve Feedback (Admin):**
```bash
curl -X POST \
  https://us-central1-tourfeedbackhub-474704.cloudfunctions.net/admin-feedback-approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <firebase-id-token>" \
  -d '{
    "feedbackId": "abc123"
  }'
```

## Performance

### Cold Start Optimization
- Functions use 256MB-512MB memory allocation
- Max instances: 10 (to control costs)
- Region: us-central1 (same as Firestore)

### Typical Response Times
- `feedback-submit`: 200-500ms (cold), 50-150ms (warm)
- `feedback-upload-complete`: 100-300ms
- `admin-feedback-approve`: 500-1000ms (includes photo ops)
- `admin-feedback-reject`: 200-500ms

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf lib node_modules
npm install
npm run build
```

### Deployment Issues
```bash
# Check Firebase login
firebase login

# Check project selection
firebase use tourfeedbackhub-474704

# Deploy with verbose logging
firebase deploy --only functions --debug
```

### Runtime Errors
- Check logs: `firebase functions:log`
- Verify environment config: `firebase functions:config:get`
- Check Firebase Console for detailed stack traces

## Cost Optimization

Current configuration is cost-effective for Phase 1:
- Max 10 instances per function
- 256-512MB memory allocation
- us-central1 region (cheapest)

Firebase Free Tier includes:
- 125K function invocations/month
- 40K GB-seconds of compute time/month

For production scale, consider:
- Monitoring cold starts
- Adjusting memory allocation
- Using Cloud Run for high-traffic endpoints

## Next Steps

1. **Genkit Integration** (optional)
   - Call Genkit AI flows from `admin-feedback-approve`
   - Auto-generate review summaries
   - Language detection

2. **Email Notifications** (optional)
   - Send email on new feedback (SendGrid/Firebase Extension)
   - Send email on approval/rejection

3. **Advanced Rate Limiting**
   - Redis-based rate limiting
   - Per-user rate limits (for authenticated users)

4. **Monitoring & Alerts**
   - Set up Firebase Alerts for errors
   - Create dashboards in Cloud Monitoring
   - Track success/failure rates

## Resources

- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Functions v2 Reference](https://firebase.google.com/docs/reference/functions)
- [App Check Docs](https://firebase.google.com/docs/app-check)
- [reCAPTCHA Enterprise](https://cloud.google.com/recaptcha-enterprise/docs)
