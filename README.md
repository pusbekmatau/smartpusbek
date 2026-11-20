# SMART PUSBEKMATAU — Central Command & Integration System

> **Centre of Excellence** · *Cepat, Tepat, Teliti, dan Aman*

Executive Data Intelligence & Command Center for Pusbekmatau (Pusat Pembekalan Materiel TNI AU).
It unifies 17 backend data modules (Monitoring, Master Data & Penerimaan, SIMMAT 2021–2026, Integrasi Setriksa)
behind one secured, role-based interface. The interface has an executive overview, adaptive charts and a data grid that you can edit in place.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| Styling & motion | Tailwind CSS v4 · Framer Motion · self-hosted Inter / Playfair Display / JetBrains Mono |
| Data grid & charts | TanStack Table v8 · Recharts |
| Auth & security | `jose` (HS256 JWT in an HttpOnly cookie) · `bcryptjs` · edge middleware · server-side RBAC |
| Data connector | `@googleapis/sheets` v4 (service account) with a local CSV read + write-overlay fallback |
| Persistence | JSON document store (`data/*.json`), atomic writes, ready to migrate to PostgreSQL/MySQL |
| Validation | `zod` on every mutating endpoint |

## Architecture

```
src/
├─ middleware.ts                 Edge gate: signed-session check for pages & APIs, admin-path guard
├─ app/
│  ├─ page.tsx                   Public hero (landing)
│  ├─ login/                     Login page
│  ├─ dashboard/                 Executive overview, /[slug] module pages, /simmat-comparison
│  ├─ admin/                     /users, /audit-logs (ADMIN only)
│  └─ api/
│     ├─ auth/{login,logout,me}
│     ├─ database/[slug]         GET · POST · PATCH · DELETE
│     ├─ overview (+ /simmat)    Cross-module KPI aggregation
│     ├─ users                   Account CRUD (ADMIN)
│     ├─ audit-logs              Activity history (ADMIN)
│     └─ system/status           Connector mode & server time
├─ components/
│  ├─ layout/    Sidebar, Topbar, HeroSection, Footer, AuthGuard, AppShell, AppProviders, LoadingScreen
│  ├─ dashboard/ KpiCards, ChartsPanel, InteractiveDataGrid, CellEditor, AddRecordModal, MotionWrappers, …
│  ├─ auth/      LoginForm, RoleBadge, UserManagementPanel, AuditLogTable
│  └─ ui/        Button, Modal, Toast, Logo, PillarBar, EyebrowBadge, AmbientBackground, StatusDot
└─ lib/
   ├─ data-sources.config.ts     17 source definitions (server-only, never sent to the browser)
   ├─ data-connector.ts          Read/write engine: live API mode + fallback overlay, caching, locks
   ├─ modules.ts                 Public module catalogue (slugs, titles, groups)
   ├─ auth.ts · session-token.ts · rbac.ts · rate-limit.ts
   ├─ user-store.ts · audit-store.ts · json-store.ts
   ├─ overview.ts · stats.ts     KPI aggregation & column profiling (numeric / categorical detection)
   └─ export.ts · format.ts · api-client.ts · use-remote.ts
```

### Abstraction of the data layer
The browser only sees the internal API: `/api/database/[slug]`, `/api/overview`, and the auth, user and audit routes.
Source identifiers, vendor names and vendor error details stay inside `data-connector.ts` and
`data-sources.config.ts`. Both files are marked `server-only`. Every failure reaches the client as a neutral, structured JSON error:

```json
{ "error": { "code": "SOURCE_RESTRICTED", "message": "Koneksi ke modul basis data ini sedang dibatasi oleh server. …" } }
```

## Roles (RBAC)

The rules are enforced in the UI and again in every API route. The middleware also blocks admin paths at the edge.

| Capability | ADMIN | OPERATOR | VIEWER |
| --- | :-: | :-: | :-: |
| View overview, charts, tables · search / filter / sort | ✔ | ✔ | ✔ |
| Export CSV / Excel | ✔ | ✔ | ✔ |
| Add entries (modal + quick row) · inline cell editing | ✔ | ✔ | 403 |
| Delete rows | ✔ | 403 | 403 |
| Force server sync (cache bypass) | ✔ | — | — |
| User management · Audit log | ✔ | 403 | 403 |

### Default accounts (seeded on first boot)

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `kepo` | Administrator |
| `operator` | `kepo2` | Operator |
| `viewer` | `kepo3` | Viewer |

> **Change these immediately after first login** (Manajemen Pengguna → Atur ulang kata sandi), or set
> `SEED_*_PASSWORD` before the first boot. Credentials are shown on the login page **only** when `NODE_ENV=development`.

## Data connector modes

### 1. Primary — two-way live sync (service account)
1. In Google Cloud Console, create a project and enable the **Google Sheets API**.
2. Create a **Service Account** and add a JSON key.
3. Share **each of the 17 source documents** with the service account e-mail as **Editor**.
4. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` in `.env.local`, then restart the server.

Reads use `values.get`. Inserts use `values.append` with `RAW` input, which blocks formula injection. Edits use cell-precise `values.batchUpdate` calls, and deletes use `deleteDimension`.

> Some sources are uploaded `.xlsx` files rather than native documents (for example Monitoring 2026, Warranty, FMS and SIMMAT).
> The API can only write to native documents. Open each one and choose **File → Save as Google Sheets**, then update its
> `documentId` in `src/lib/data-sources.config.ts`. If a write is refused, the UI rolls back and shows a neutral error.

### 2. Fallback — local sync (no credentials)
- **Reads** use each source's public CSV export, so each source must be shared as *Anyone with the link → Viewer*.
- **Writes** go to `data/overlay-store.json`. It holds added rows, cell edits and deleted row IDs, and it is merged into every `GET`.
- The Topbar shows **"Sinkronisasi lokal"**, and administrators see a notice on the user-management page.

### Caching
Each module is cached in memory for `DATA_CACHE_TTL_SECONDS` (default 300 s). Concurrent requests share one fetch.
Every `POST`, `PATCH` or `DELETE` invalidates the cache, and writes to a module run one at a time.
When an Administrator presses **Sinkronisasi**, the cache is bypassed (`?refresh=1`) and the action is recorded in the audit log.

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

## Running locally

```bash
npm install
cp .env.example .env.local   # set AUTH_SECRET at minimum
npm run dev                  # http://localhost:3000
```

Quality gates:

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

### VPS / on-premise (recommended: persistent disk)
```bash
npm ci && npm run build
AUTH_SECRET=… DATA_DIR=/var/lib/smart-pusbekmatau npm start   # behind Nginx/Caddy with HTTPS
```
Run it with a process manager (systemd / pm2). Back up `DATA_DIR`, which holds the users, the audit log and the overlay.

### Vercel
1. Import the repository and set the environment variables from `.env.example`.
2. Vercel's filesystem is **ephemeral**, so the user store, audit log and overlay will not persist there. Use the VPS deployment,
   or move `json-store.ts` to a managed database such as Postgres, which needs no API changes. Use the primary live-sync mode for data writes.

### Push to GitHub
```bash
git add -A && git commit -m "SMART PUSBEKMATAU command center"
git push -u origin <branch>
```

## Security notes
- Sessions are HS256 JWTs in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production) and last 8 hours. Each request is also checked
  against the user store, so a deactivated account or a role change takes effect immediately.
- Passwords are hashed with bcrypt (cost 11). Unknown usernames get the same timing as wrong passwords. Login attempts are limited to 5 failures per 10 minutes per IP and username.
- Every mutating endpoint validates its input with zod and rejects unknown columns. Exports neutralise formula-injection prefixes.
- Security headers are set: `X-Frame-Options: DENY`, `nosniff` and a strict referrer policy.

## Brand asset
`public/images/logo-pusbekmatau.png` (also used as `src/app/icon.png`) is currently a **provisional emblem** created for this
system. Replace both files with the official Pusbekmatau emblem (transparent PNG, ≥512 px) and keep the same file names.
