# Runbook: Handling Feedback Spam Spikes

This runbook covers immediate steps when automated feedback submissions spike unexpectedly.

## 1. Assess the spike
- Check Firebase Functions and Firestore metrics for traffic anomalies (compare to trailing 7-day average).
- Review reCAPTCHA Enterprise risk scores; note any drop below the configured pass threshold.
- Confirm whether submissions are reaching moderation or being blocked upstream.

## 2. Increase protection thresholds
- In the Firebase Console, open **reCAPTCHA Enterprise → Assessments** and raise the allow threshold by 0.1–0.2 for the `feedback_submit` action.
- Save changes and monitor acceptance rate for 10–15 minutes.
- Notify the content moderation team about potential delays while the stricter threshold is active.

## 3. Tighten rate limiting
- In Cloud Functions, deploy an updated configuration that halves the per-IP quota for `feedback-submit` and `admin-feedback-approve` endpoints (e.g. reduce 60/min → 30/min).
- If using an API Gateway or CDN, add a rule that blocks IPs exceeding the adjusted limits for 15 minutes.
- Record blocked IP ranges in the security log for future allow/deny decisions.

## 4. Temporarily disable intake (if abuse continues)
- Toggle the `FEEDBACK_SUBMISSIONS_ENABLED` flag to `false` in project configuration (environment variables or Firestore site settings) to short-circuit the submission endpoint.
- Display a maintenance toast/message in the UI notifying users that feedback submissions are temporarily paused.
- Coordinate with support to capture legitimate reviews manually while the endpoint is offline.

## 5. Recovery
- After traffic normalises for at least 30 minutes, gradually roll back thresholds and rate limits to baseline.
- Re-enable the submission endpoint and confirm the UI toast is cleared.
- Run a retro: document attack vectors, efficacy of controls, and any automation gaps.
