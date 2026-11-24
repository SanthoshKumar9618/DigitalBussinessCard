# Project Audit — Digital Business Card

Date: 2026-11-24 · Scope: `backend/` (FastAPI), `smart-card-app/` (Expo), `smartcard-web/` (Vite)

Legend: `[x]` fixed in code · `[ ]` open · **(YOU)** = needs your action or decision, can't be done in code

---

## 🔴 Critical — Security

- [ ] **S1 (YOU) Secrets committed to git and pushed to GitHub.** Rotate all of them; deleting the files is not enough.
  - Gmail app password + address hardcoded in `backend/app/config/email_config.py` → revoke the app password in your Google account.
  - Supabase DB password hardcoded in `backend/alembic.ini` → reset the database password in Supabase.
  - `.env` was committed in the initial commit (`27d4dcf`) and is still in history → change `JWT_SECRET` and the DB DSN.
  - Optional: rewrite git history (`git filter-repo`) and force-push. Only after rotating.
  - [x] Code part: removed the hardcoded values from the repo.
- [x] **S2 JWT secret and every bearer token printed to logs** (`utils/jwt_handler.py` `get_current_user`).
- [x] **S3 OTP codes logged in plain text, including in production** (`utils/notification.py`, `utils/email.py`).
- [x] **S4 OTPs can be brute-forced:** no attempt limit, 6 digits, and generated with `random`, which is not secure. Now uses `secrets`, and an OTP is invalidated after 5 wrong attempts.
- [x] **S5 Password-reset OTPs stored in plain text** in the `otps` table. The reset flow now uses the bcrypt-hashed OTP on the user record.
- [x] **S6 Email change swapped the email *before* verification** (`routes/user.py`). A typo locked the user out, because unverified users can't log in. The email now changes only after the OTP is verified.
- [x] **S7 IDOR on `/nfc/assign`:** any user could bind an NFC tag to *anyone's* profile. Re-using a tag UID also caused a 500 error.
- [x] **S8 Stored XSS** in `/public/view/{slug}`: profile fields went into the HTML unescaped.
- [x] **S9 Privacy settings ignored:**
  - `public_profile=false` still served the profile through `/public` and NFC resolve.
  - Saving a contact copied email and phone even when `show_email` / `show_phone` were off.
- [x] **S10 CORS used `allow_origins=["*"]` with `allow_credentials=True`.** Origins are now configurable through `CORS_ORIGINS`, and credentials are off (the app uses bearer tokens).
- [x] **S11 Avatar upload had no size limit and no content check** (only the extension was checked). Now capped at 5 MB and the file must be a real image.
- [x] **S12 Login revealed whether an account exists:** "Email not verified" came back before the password check.
- [x] **S13 Refresh token was sent in the URL query string**, so it ends up in access logs. Now sent in the JSON body.
- [x] **S14 No rate limiting on auth endpoints** (fixed in Phase 4: per-IP and per-account limits) (login, register, forgot-password). Put it behind Render/Cloudflare rate limits or add `slowapi`.
- [ ] **S15 (YOU) Tokens last 7 days and logout doesn't revoke them.** Consider shorter access tokens plus refresh in the app.

## 🟠 High — Bugs / crashes

- [x] **B1 Login with a wrong password returned 500** instead of 401 (`token` was `None`).
- [x] **B2 Google social login always crashed:**
  - `create_access_token` was given a dict.
  - It used a `google_id` column that doesn't exist.
  - `name` (required) was never set.
  - It leaked a DB session.
  - It didn't check `email_verified`.
  - [ ] **(YOU)** Client IDs are still placeholders (`WEB_CLIENT_ID...`). Set `GOOGLE_CLIENT_ID` in the backend `.env` and the real IDs in `smart-card-app/services/googleAuth.ts`.
- [x] **B3 `/auth/verify-email` crashed with a 500** when `otp_expires_at` was empty.
- [x] **B4 Saving a contact for a missing profile returned 500** instead of 404.
- [x] **B5 `/profile-card/card` crashed with a 500** for users without a profile.
- [x] **B6 Registration showed "Registration failed" after it succeeded.** The app called `login(undefined)` after moving to the verify screen.
- [x] **B7 Logout called itself recursively** (the local `logout` shadowed the imported one), so the backend logout never ran.
- [x] **B8 The axios interceptor forced `Content-Type: application/json` on every request**, which broke multipart uploads (avatar, QR image).
- [x] **B9 Every shared link and QR code pointed to the placeholder `https://yourapp.com/...`.** There's now one `PUBLIC_PROFILE_URL` helper; by default it points to the backend's `/public/view/{slug}` page.
  - [ ] **(YOU)** Swap in your real domain once the web app is deployed.
- [x] **B10 The contact detail screen called `GET /contacts/{id}`, which didn't exist.** Endpoint added.
  - [x] **B10b** (fixed in Phase 3: decoded on the device) `POST /qr/decode` (scan a QR from the gallery) doesn't exist either. Adding it needs a native decoder library (pyzbar/zbar) on the server, or decoding on the device.
- [x] **B11 Contact-update notifications never ran:** a sync function was `await`ed. The link also used `yourapp.com`.
- [x] **B12 Changing to a phone number another user already has caused a 500 error.**
- [x] **B13 The web app's API URL was hardcoded to a LAN IP** (`192.168.68.106`), and a 404 rendered a blank profile. Now uses `VITE_API_BASE_URL` and shows "not found".
- [x] **B14 3 TypeScript errors** in `hooks/use-theme-color.ts`: an unused Expo template file, now deleted.
- [x] **B16 (found while fixing) "Resend OTP" always failed with 422.** The backend expected `user_id` as a query param; the app sends JSON.
- [x] **B17 (found while fixing) Creating a profile with a website crashed.** A Pydantic `HttpUrl` object was passed straight to the DB.
- [x] **B18 (found while fixing) `ProfileView.tsx` called hooks after an early return** (rules of hooks). The profile screen could crash with "Rendered more hooks than during the previous render" once settings finished loading.
- [x] **B15 Emails are now sent through Resend once `RESEND_API_KEY` is set (Phase 2). SMS still has no provider.** Originally: emails and SMS were never actually sent. `send_email` and `send_otp_email` are mocks, so in production users **cannot get their OTP and cannot finish registering**. Pick a provider (Resend / SendGrid / Brevo over HTTPS, since Render blocks SMTP) and I'll wire it in.

## 🟡 Medium — Hygiene / maintainability

- [x] **H1 Accidental zero-byte files in git:** `backend/8.4`, `backend/[19`, `backend/cd`, `backend/numpy`, `backend/pip`, `backend/{`, `smart-card-app/cd`, `smart-card-app/eas`, `smart-card-app/res`.
- [x] **H2 18 `__pycache__/*.pyc` files tracked in git** despite `.gitignore`.
- [x] **H3 Junk npm dependency `expo-xxx@0.0.0`** in the mobile app. Supply-chain risk; it isn't used anywhere.
- [x] **H4 Dead code:**
  - `app/core/config.py`, `app/config/email_config.py`
  - Empty `utils/helpers.py`, `nfc_utils.py`, `qr_generator.py`
  - Duplicate `ResetPassword` schema
  - Unused `OTP`-table code path
  - About 50 lines of commented-out settings
- [x] **H5 `debug_test.py` crashed:** it read `settings.POSTGRES_HOST`, which doesn't exist.
- [x] **H6 `run.bat` checked for `venv\` but activated `.venv311\`.**
- [x] **H7 `print()` debugging scattered through the backend.** Replaced with `logging`.
- [x] **H8 `datetime.utcnow()` mixed with timezone-aware DB columns.**
- [x] **H9 No automated tests** (fixed in Phase 4: `backend/tests` plus GitHub Actions CI) for the backend or either frontend.
- [ ] **H10 (YOU) `app.json` cleanup:** (RECORD_AUDIO removed in Phase 4; the package id and deep-link host still need your real values)
  - The package id is `com.anonymous.smartcardapp`.
  - It asks for `RECORD_AUDIO` but never uses it.
  - The deep-link host is `yourapp.com`.
- [ ] **H11 `backend/.git` is an empty nested repo** with no commits. It's harmless but confusing; delete the folder if you don't use it.
- [ ] **H12 Root `package.json`** only contains `react-router-dom`, which belongs to `smartcard-web`. Probably installed in the wrong folder.
- [ ] **H13 `GET /contacts` writes to the DB on every list call** to sync snapshots. It works, but it's a write on every read; consider syncing on profile update instead.

---

## Fix log

**Verification**
- Backend: 35 end-to-end checks pass. They ran against a throwaway in-memory SQLite DB, not Supabase, and cover every backend `[x]` item above.
- `smartcard-web`: `tsc -b` and `eslint` are clean.
- `smart-card-app`: `tsc --noEmit` is clean.
- Not tested: the mobile app on a real device.

**API changes the app/web already match**
- `POST /auth/refresh` now takes the token in a JSON body: `{ "refresh_token": "..." }`.
- `POST /auth/resend-email-otp` now takes a JSON body: `{ "user_id": "..." }`.
- `POST /user/email/verify-otp` now needs both values: `{ "email": "...", "otp": "..." }`.
- `POST /auth/forgot-password` always returns 200.
- New endpoint: `GET /contacts/{id}`.
- QR codes and links point to `{APP_DOMAIN}/public/view/{slug}` (backend) or to `EXPO_PUBLIC_PROFILE_BASE_URL` (app).

**New config**
- Backend: `CORS_ORIGINS` and `GOOGLE_CLIENT_ID`. See `backend/.env.example`.
- App: `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_PROFILE_BASE_URL`.
- Web: `VITE_API_BASE_URL`.

**Deploy note:** set `ENVIRONMENT=production` on Render so OTPs are never logged. No DB migration is needed.
