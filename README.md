# ExamMastery AI — updated web + Android APK build

This overlay includes the updated premium HTML as the GitHub Pages homepage (`index.html`) and as the Android WebView asset, plus a GitHub Actions workflow that builds a debug APK.

## Build APK
1. Upload/extract these files into the root of `theloyal64-code/ExamMastery-AI` and commit them to the `main` branch. Replace the existing `index.html`; add the `app/`, `build.gradle`, `settings.gradle`, `gradle.properties`, and `.github/workflows/android-apk.yml` files/folders.
2. Open the repository's Actions tab and run **Build ExamMastery AI APK** (or wait for the push-triggered build).
3. Open the completed run and download the `ExamMastery-AI-debug-apk` artifact ZIP. Extract `app-debug.apk` and install it on Android.

## Prototype limitations
- The UI, language selector, local PDF text extraction/reader, and demo quiz are from the supplied HTML prototype.
- The Study Tutor is demo-only and is not connected to a live AI backend.
- PDF text extraction depends on PDF.js being available in the browser/WebView; scanned-page OCR is not included.
- This is a debug APK for testing, not a signed Play Store release.
