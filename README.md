# SMART PUSBEKMATAU — Central Command & Integration System

> **Centre of Excellence** · *Cepat, Tepat, Teliti, dan Aman*

Executive Data Intelligence & Command Center for Pusbekmatau (Pusat Pembekalan Materiel TNI AU).
It unifies 17 backend data modules (Monitoring, Master Data & Penerimaan, SIMMAT 2021–2026, Integrasi Setriksa)
behind one role-based interface: an executive overview, adaptive charts and a data grid that you can edit in place.

The site is **static** and is published on **GitHub Pages**. Login, reading and writing the Google Spreadsheets,
user management and the audit log run in a **Google Apps Script Web App** (`apps-script/Code.gs`).

```
Browser (GitHub Pages, static Next.js)  ──POST /exec──▶  Apps Script Web App  ──▶  17 Google Spreadsheets
        token in localStorage                            verifies token + role      + DB sheet (USERS, AUDIT)
```

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router, **static export**) · React 19 · TypeScript (strict) |
| Styling & motion | Tailwind CSS v4 · Framer Motion · self-hosted Inter / Playfair Display / JetBrains Mono |
| Data grid & charts | TanStack Table v8 · Recharts |
| Backend | Google Apps Script Web App (`apps-script/Code.gs`) — HMAC-signed sessions, salted+iterated SHA-256 password hashes, RBAC, audit log |
| Data | Google Spreadsheets read/written through `SpreadsheetApp` (the script owner needs edit rights) |
| Hosting | GitHub Pages via GitHub Actions (`.github/workflows/pages.yml`) |

## Publish to GitHub Pages

1. Install the backend: follow [`apps-script/README.md`](apps-script/README.md) (≈ 10 minutes) and copy the `/exec` URL.
2. GitHub → **Settings → Secrets and variables → Actions → Variables** → add `APPS_SCRIPT_URL` = that URL.
   *(Using your own domain? Also add `CUSTOM_DOMAIN` = `true` so the site is served from `/` instead of `/<repo>`.)*
3. **Settings → Pages → Source: GitHub Actions.**
4. Merge to the default branch (or run the workflow manually). The site appears at `https://<owner>.github.io/<repo>/`.

> GitHub Pages from a **private** repository needs a paid GitHub plan. The Pages site itself is public to anyone with
> the link; access to data is protected by the login enforced in Apps Script.

## Run locally

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your Apps Script /exec URL
npm run dev                  # http://localhost:3000
```

Quality gates: `npm run typecheck` · `npm run lint` · `npm run build` (writes the static site to `out/`).

## Roles (RBAC)

Enforced in the UI and again, authoritatively, in the Apps Script backend on every request.

| Capability | ADMIN | OPERATOR | VIEWER |
| --- | :-: | :-: | :-: |
| View overview, charts, tables · search / filter / sort | ✔ | ✔ | ✔ |
| Export CSV / Excel | ✔ | ✔ | ✔ |
| Add entries (modal + quick row) · inline cell editing | ✔ | ✔ | 403 |
| Delete rows | ✔ | 403 | 403 |
| Force server sync (cache bypass) | ✔ | — | — |
| User management · Audit log | ✔ | 403 | 403 |

Initial accounts (`admin`, `operator`, `viewer`) are created by running `setup()` in Apps Script, each with a
**random password shown once in the execution log**. There are no default passwords in the repository.

## Data & caching

Each module is read with `getDisplayValues()`; the header row is auto-detected. The backend caches each module
(compressed, 5 min) and the browser keeps it for 5 more minutes; every write invalidates both. When an Administrator
presses *Sinkronisasi*, the cache is bypassed. Writes run one at a time (script lock) and are recorded in the audit log.

## Grid keyboard map

| Key | Action |
| --- | --- |
| Click / arrows | Select a cell |
| Double-click · `Enter` · `F2` · typing | Start editing |
| `Enter` | Save & move down |
| `Tab` / `Shift+Tab` | Save & move right / left |
| `Esc` | Cancel the edit |
| `Delete` / `Backspace` | Clear the cell |
| `Alt+Enter` | New line inside a cell |

Edits are applied right away. The status shows *Menyimpan ke Server…*, then *Tersimpan*, and the cell flashes gold.
If the save fails, the change rolls back automatically.

## Security notes

- GitHub Pages cannot send custom response headers, so the former `X-Frame-Options` / referrer headers are not applied.
- Sessions are HMAC-SHA256 tokens (8 h) kept in `localStorage`; each request is checked against the user list, so a deactivated
  account or a role change takes effect immediately. Logout clears the token in the browser.
- Login is limited to 5 failures per 10 minutes per username; unknown usernames take the same time as wrong passwords.
- Input is validated server-side (unknown columns rejected); cells starting with `= + - @` are stored as text; exports neutralise formula prefixes.
- Never put secrets in this repo or in GitHub variables used by the build: everything with `NEXT_PUBLIC_` ends up in the public site.

## Brand asset

`public/images/logo-pusbekmatau.jpg` is the emblem used in the UI (`src/app/icon.png` is the favicon). Replace both with the
official Pusbekmatau emblem and keep the same file names.
