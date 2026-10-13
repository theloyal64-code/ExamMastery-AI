# ExamMastery AI — updated web + Android APK build

This overlay includes the updated premium HTML as the GitHub Pages homepage (`index.html`) and as the Android WebView asset, plus a GitHub Actions workflow that builds a debug APK.

## Build APK
1. Upload/extract these files into the root of `theloyal64-code/ExamMastery-AI` and commit them to the `main` branch. Replace the existing `index.html`; add the `app/`, `build.gradle`, `settings.gradle`, `gradle.properties`, and `.github/workflows/android-apk.yml` files/folders.
2. Open the repository's Actions tab and run **Build ExamMastery AI APK** (or wait for the push-triggered build).
3. Open the completed run and download the `ExamMastery-AI-debug-apk` artifact ZIP. Extract `app-debug.apk` and install it on Android.

## Prototype limitations
- The UI, language selector, local PDF text extraction/reader, and demo quiz are from the supplied HTML prototype.
- The Study Tutor uses the backend endpoint when `window.EXAMMASTERY_API_URL` is configured; live answers require an AI provider key on the backend.\n- Email/password signup and login endpoints are implemented in `backend/server.js`; production use requires HTTPS hosting, PostgreSQL `DATABASE_URL`, a strong `JWT_SECRET`, and configuring the frontend API base URL. Passwords are hashed with bcrypt; session tokens expire after 7 days.
- PDF text extraction depends on PDF.js being available in the browser/WebView; scanned-page OCR is not included.
- This is a debug APK for testing, not a signed Play Store release.


## Live AI tutor backend (setup required)

The tutor UI now calls a server-side endpoint when `window.EXAMMASTERY_API_URL` is configured. The API key must remain on the backend and must never be placed in the HTML or Android app.

1. Deploy the `backend/` folder as a Node.js service on a host that supports Node 20+, and attach a PostgreSQL database.
2. Set `OPENAI_API_KEY` in the host's secret/environment settings; optionally set `OPENAI_MODEL` and `ALLOWED_ORIGINS`. Never commit a real API key.
3. Set `window.EXAMMASTERY_API_URL` in `index.html` to the deployed backend's HTTPS base URL (no trailing slash), and mirror the same change into `app/src/main/assets/index.html`.
4. Redeploy GitHub Pages and rebuild the APK. Until a backend is deployed and configured, the tutor will clearly report that it is not connected.

Health check: `GET /health`. Tutor endpoint: `POST /api/tutor` with JSON fields `question`, optional `context`, `grade`, `board`, and `subject`.
