<div align="center">

# CCCWAYS Nexus · Alt Season Black Login

Google OAuth + Firebase identity layer powering the CCCWAYS Nexus cockpit with a cinematic Alt Season background.

</div>

## ⭐️ Highlights

- **Next.js 14 + Tailwind 4** with RTL-friendly Arabic typography (Cinzel / Montserrat / Share Tech Mono).
- **Google Identity Services (GIS)** popup flow with `/api/auth/google/start`, `/callback`, `/refresh`, and `/logout` routes.
- **Firebase Admin + Firestore** auto-registers users, encrypts tokens using AES-256-GCM, and stores profiles for downstream agents.
- **Silent session restore** on `/login` attempts to refresh cookies automatically for frictionless re-entry.
- **Alt Season Black UI** with a procedurally animated Three.js background, consent notice, and future-ready email/password placeholders.

## 🚀 Getting Started

1. **Install dependencies**
	```bash
	npm install
	```
2. **Configure environment** (copy `.env.example` → `.env`) and provide:
	- Google OAuth Web Client (ID, secret, redirect URI).
	- Firebase Admin service account (project id, client email, private key).
	- Frontend Firebase config (NEXT_PUBLIC_FIREBASE_*).
	- `TOKEN_ENCRYPTION_KEY` (32 chars) + `SESSION_SECRET` (JWT signing key).
3. **Run the dev server**
	```bash
	npm run dev
	```
4. Open [http://localhost:3000/login](http://localhost:3000/login) to experience the Alt Season login wall.

## 🔐 Auth Flow Overview

1. `/api/auth/google/start` returns `{ clientId, scope }` for GIS.
2. GIS popup exchanges the code via `/api/auth/google/callback` → tokens + Google profile.
3. Firestore `users` collection stores the profile alongside encrypted `accessToken` and `refreshToken`.
4. Signed JWT + refresh token cookies (`cccways_session`, `cccways_refresh`) are issued.
5. `/api/auth/google/refresh` can silently rehydrate the session when cookies exist (triggered automatically on `/login`).
6. `/api/auth/logout` wipes cookies for manual exit.

## 🗂️ Key Folders

| Path | Purpose |
| --- | --- |
| `src/app/login/page.tsx` | Server component that loads GIS script and renders `LoginHero`. |
| `src/components/auth/LoginHero.tsx` | Client UI + silent refresh logic + CTA copy. |
| `src/components/auth/LoginBackground.tsx` | Three.js infinity tube + glyph sprites. |
| `src/hooks/useGoogleLogin.ts` | GIS popup integration + state wiring. |
| `src/lib` | Environment loader, Firebase admin, token helpers, Google auth utilities. |
| `src/app/api/auth/*` | REST endpoints for start/callback/refresh/logout. |

## 🔧 Environment Reference

See `.env.example` for the full list. Critical entries:

| Variable | Notes |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth Web Client (Authorized origin must include app base URL). |
| `GOOGLE_REDIRECT_URI` | Should match `https://<host>/api/auth/google/callback`. |
| `FIREBASE_PRIVATE_KEY` | Keep escaped (`\n`) when storing inside `.env`. |
| `TOKEN_ENCRYPTION_KEY` | 32-character string used by AES-256-GCM to encrypt tokens before Firestore writes. |
| `SESSION_SECRET` | JWT signing secret for session cookies. |

## 🎨 Customizing the Alt Season Background

- Modify `src/components/auth/LoginBackground.tsx` to change geometry, sprite palettes, or bloom intensity.
- All Three.js resources are lazily imported, and cleanup disposes of meshes/materials to avoid GPU leaks.
- Foreground colors are sourced from the CSS variables in `src/app/globals.css`.

## 📊 Enterprise-Grade Charts

- `plotly.js` + `react-plotly.js` power the institutional visualization layer (candlesticks, volume profiles, KPI sparklines).
- Reusable components live under `src/components/charts/`:
	- `CandlestickChart.tsx` → full Plotly candlestick with dark-mode theming and responsive resizing.
	- `MetricSparkline.tsx` → compact metric tile with smooth spline sparkline and variance coloring.
- Visit `/charts-demo` while running `npm run dev` to preview both components with mock data.
- Pass real OHLCV arrays or KPI series from your agents to these components to instantly level-up dashboards.

## ✅ Next Steps

- Wire the authenticated session into the forthcoming dashboard routes.
- Expand the GIS data set (organization name, locale preferences) and push to Firestore for agent orchestration.
- Replace the placeholder email/password form with institutional SSO once ready.

Happy hacking! ✨
