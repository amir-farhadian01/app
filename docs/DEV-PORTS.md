# Local dev ports checklist (Node + Vite)

Use this to confirm each URL shows the **correct** shell. Values assume default `.env.example` (`PORT=8077`, `ADMIN_PORT=9090`, `VITE_APP_PORT=8077`, `VITE_ADMIN_PORT=9090`).

| Port | Intended surface | Correct behavior | Wrong behavior |
|------|------------------|------------------|----------------|
| **8077** | **Customer marketplace + API** (`PORT` / `VITE_APP_PORT`) | `/` shows **CustomerHome**; `/orders`, `/services`, etc. work; **same-origin** `/api/*` hits this Node process. Staff roles (`platform_admin`, …) hitting `/dashboard` are **redirected** to the admin port. | `/dashboard` shows **AdminDashboard** while staying on 8077. |
| **9090** | **Platform admin React only** (`ADMIN_PORT` / `VITE_ADMIN_PORT`) | Minimal chrome (avatar + sign-out); `/dashboard` loads **AdminDashboard** for staff roles. | Full customer header/footer on every page (means `VITE_ADMIN_PORT` does not match the browser port). |
| **9088** | **Flutter web** (if you run `flutter run -d chrome` or project web script) | Flutter customer shell — **not** this Node+Vite app. | Treating 9088 as the Node admin or customer React app. |

## Env alignment (required)

- `PORT` and `VITE_APP_PORT` must refer to the **same** host port (customer + API).
- `ADMIN_PORT` and `VITE_ADMIN_PORT` must refer to the **same** host port (admin UI).
- All four must be set correctly before `npm run dev`; Vite inlines `VITE_*` at dev start.

## Docker note

If `docker compose` publishes **9090** or **3000→8077**, host `npm run dev` can conflict. Stop the web container or change `ADMIN_PORT` / `PORT` in `.env` so host and container do not bind the same ports.
