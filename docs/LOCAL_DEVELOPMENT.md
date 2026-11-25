# SmartCard: Local Development Guide and Engineering Plan

_Last updated: 2026-11-25_

How to run the backend and the mobile app on one Windows PC with an Android
phone, what to check when the app says **"Network Error"**, and the engineering
work planned next. For the product roadmap, see
[PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md).

---

## 1. How the pieces connect

```
Android phone (Expo Go)  ──Wi-Fi──▶  PC :8081  Metro bundler (npx expo start)
          │
          └──────────────Wi-Fi──▶  PC :8000  FastAPI backend (Docker or run.ps1)
                                              │
                                              └──▶ Supabase Postgres (cloud)
```

- The phone downloads the JavaScript from Metro (port **8081**) and then calls
  the API on port **8000**. These are two separate connections, so the app can
  load while every API call fails.
- The API address is set at bundle time from `smart-card-app/.env`:
  `EXPO_PUBLIC_API_URL`. If it's not set, the app falls back to the Render
  deployment (`services/api.ts`).
- `localhost` on the phone means the phone itself, never the PC. Always use
  the PC's Wi-Fi IP (or `adb reverse`, see section 4).

---

## 2. Run it

### 2.1 Backend in Docker (recommended)

From `backend/`:

| What | Command |
|---|---|
| Start (build if needed) | `docker compose up -d --build` |
| Watch logs (OTP codes print here) | `docker compose logs -f backend` |
| Stop | `docker compose down` |

- The compose project is named `businesscard` on purpose. Without that, Docker
  names it after the folder (`backend`) and mixes it with other projects'
  containers on this PC.
- `backend/.env` is read at runtime and **never copied into the image**
  (`.dockerignore`).
- `app/` is mounted into the container, so Python changes reload without a
  rebuild. Rebuild only when `requirements.txt` changes.
- `uploads/` is mounted from the PC, so uploaded avatars survive restarts.

### 2.2 Backend without Docker

From `backend/`: `.\run.ps1`. It activates `venv`, checks dependencies and runs
uvicorn on `0.0.0.0:8000`.

If the venv is broken (no `venv\Scripts\Activate.ps1`, or
`No module named 'pydantic_settings'`), rebuild it:

```powershell
Remove-Item -Recurse -Force venv
& "C:\Program Files\Python312\python.exe" -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

**Run only one backend at a time.** Docker and `run.ps1` can both bind port
8000 on Windows without an error. Requests then go to whichever one wins, and
the logs you're watching may not be the server that answered.

### 2.3 Mobile app

From `smart-card-app/`:

```powershell
npx expo start -c
```

`-c` clears the cache. Use it after any change to `.env`, because
`EXPO_PUBLIC_*` values are baked into the bundle. Press `r` in the terminal to
reload the app on the phone.

`smart-card-app/.env` for Wi-Fi development:

```
EXPO_PUBLIC_API_URL=http://<PC Wi-Fi IP>:8000
```

Find the PC's IP with:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*").IPAddress
```

The IP can change when you reconnect to Wi-Fi or change networks. Update
`.env` and restart Expo with `-c` when it does.

### 2.4 Email OTP in development

`EMAIL_PROVIDER` defaults to `console`, so verification codes are **not
emailed**. They're printed in the backend log:
`[EMAIL][console] ... is your SmartCard code`.

---

## 3. "Network Error" checklist

Axios reports `Network Error` when **no HTTP response came back at all**. It's
never a 4xx/5xx from the backend. Work through these in order:

| # | Check | How | Fix |
|---|---|---|---|
| 1 | Backend is running | `docker compose ps`, or open `http://localhost:8000/docs` on the PC | Start it (section 2) |
| 2 | It listens on all interfaces, not only 127.0.0.1 | Log says `Uvicorn running on http://0.0.0.0:8000` | `--host 0.0.0.0` |
| 3 | `.env` IP matches the PC | Compare with `Get-NetIPAddress` | Update `.env`, `npx expo start -c` |
| 4 | **Phone browser opens `http://<PC IP>:8000/docs`** | This is the key test: it takes the app's code out of the picture | If it fails, it's network (rows 5–7), not code |
| 5 | Phone and PC are on the same Wi-Fi | Phone IP starts with the same 3 numbers as the PC | Same network, VPN off |
| 6 | Windows Firewall allows port 8000 | Wi-Fi profile is often "Public" | Admin PowerShell, see below |
| 7 | Third-party firewall (Kaspersky on this PC) | Kaspersky → Firewall → Packet rules | Allow TCP inbound port 8000, local subnet only |

Narrow Windows Firewall rule (port 8000, local network only, nothing else
opened):

```powershell
New-NetFirewallRule -DisplayName "BusinessCard backend 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -RemoteAddress LocalSubnet -Profile Public -Action Allow
```

Remove it with
`Remove-NetFirewallRule -DisplayName "BusinessCard backend 8000"`.

Requests from the phone appear in the backend log with the phone's IP, for
example `192.168.68.103 - "POST /auth/register" 201`. If the phone's IP never
appears, the request never reached the PC.

### Docker Desktop stuck on "starting"

If `docker version` returns `500 Internal Server Error`, Docker Desktop never
finished starting. Quit Docker Desktop, run `wsl --shutdown`, and start Docker
Desktop again. Note that `wsl --shutdown` also stops any other WSL distros.

---

## 4. Fallbacks when Wi-Fi won't work

| Option | When | Notes |
|---|---|---|
| **USB + adb reverse** | Work/guest Wi-Fi blocks device-to-device traffic | `adb reverse tcp:8000 tcp:8000` and `adb reverse tcp:8081 tcp:8081`, set `EXPO_PUBLIC_API_URL=http://localhost:8000`. Needs USB debugging and a **data** cable. Redo after every re-plug. |
| **Phone hotspot** | Wi-Fi isolates devices | Connect the PC to the phone's hotspot and use the PC's new IP |
| **Render backend** | Testing deployed code | Remove `EXPO_PUBLIC_API_URL`. The free instance sleeps; the first request can take ~30s. |
| **Public tunnel** (e.g. Cloudflare Tunnel) | Nothing else works | Anyone with the URL reaches the dev backend and its real database. Use only briefly. |

---

## 5. Code rules learned the hard way

- **Import navigation hooks from `expo-router`, never from
  `@react-navigation/native`.** expo-router 58 bundles its own React
  Navigation, so hooks from the separate package find no navigation context
  and crash with *"Couldn't find a navigation object"*. This applies to
  `useFocusEffect`, `useNavigation` and similar hooks.
- All API calls go through `smart-card-app/services/api.ts`. Don't create
  another axios instance or hard-code a host.
- Never put secrets in `smart-card-app/.env`. Every `EXPO_PUBLIC_*` value
  ships inside the app bundle.

---

## 6. Engineering plan (next steps)

Ordered by what unblocks the most work. Product features are in
[PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md).

### 6.1 Developer experience

- [ ] **Remove the stray `backend/.git`.** It's an empty repository with no
      commits inside the main repo; the root repository already tracks
      `backend/`. Tools that look for the nearest `.git` get confused by it.
- [ ] **Remove `backend/.venv311/`** if nothing uses it (an old Python 3.11
      environment).
- [ ] Add a `backend/.env.docker.example` (or document) which `.env` keys the
      container needs, so a new machine can start with one copy-and-fill.
- [ ] Document that tests need `pip install -r requirements-dev.txt`
      (pytest and httpx for FastAPI's `TestClient`). `run.ps1` and the Docker
      image install only `requirements.txt`.
- [ ] Optional: a local Postgres service in `docker-compose.yml` for offline
      work, so development doesn't write to the shared Supabase database.

### 6.2 Mobile app

- [ ] **Move from Expo Go to a development build** (`npx expo run:android` or
      EAS). Push notifications don't work in Expo Go on Android since SDK 53,
      which is the `expo-notifications` warning in every log.
- [ ] Replace the placeholder Android app link host (`yourapp.com` in
      `app.json`) and package name (`com.anonymous.smartcardapp`) before any
      store build.
- [ ] Show a clear "Can't reach the server" message in the UI for
      `Network Error`, instead of only logging it in `__DEV__`.

### 6.3 Backend and deployment

- [ ] **Bring the Render deployment back online**, or move to another host,
      so the app works without the PC.
- [ ] Configure a real email provider (`EMAIL_PROVIDER=resend` or `smtp`)
      for anything beyond local testing.
- [ ] Set `CORS_ORIGINS` to the real web domains in production (it's `*` now,
      which is fine for local development).
- [ ] Add a production Docker setup: no `--reload`, no source mount,
      healthcheck, non-root user.
