# Backend / API handoff — tester feedback

This doc is for the **backend developer**. The frontend has been updated to address auth UX; the items below are for API, security, and server behaviour.

---

## 1. Root URL must not show “Set your password”

- **Expected:** Visiting the app root (e.g. `https://yourapp.com/`) should show **login** for unauthenticated users, not a “Set your password” form.
- **Frontend:** The SPA now only shows the set-password flow when the URL is `/set-password?token=...` (e.g. from the email link). Root with no hash sends unauthenticated users to `#/login`.
- **Backend / DevOps:** Ensure the app root serves the SPA `index.html` and does **not** redirect to `/set-password`. If you have a redirect rule for “invite” or “first login”, it must not apply to plain `/`.

---

## 2. Auth state and “Set your password”

- **Expected:** A user who has not yet set their password (e.g. invite flow) should not be treated as fully authenticated for app chrome (nav, dashboard).
- **Backend:** `GET /api/auth/me` should return `authenticated: true` and a `user` object **only** when the user has a set password and a valid session. If the session is from a “set-password” token only (not yet completed), do **not** return `authenticated: true` so the frontend does not show the main app nav.

---

## 3. API security — password-set and auth endpoints

Please confirm or implement:

| Item | What to do |
|------|------------|
| **Password-set endpoint** | `POST /api/auth/set-password` must require a valid single-use token (e.g. from email). It must **not** accept requests without a valid token or with an expired one. Return 400/401 with a clear message for invalid/expired token. |
| **Token/session** | After successful set-password, set the session cookie (or return token) so the next `GET /api/auth/me` returns `authenticated: true`. |
| **Rate limiting** | Apply rate limiting to auth endpoints: login, register, forgot-password, set-password. This prevents brute force and abuse. |
| **CSRF** | If the app uses cookie-based sessions and same-origin is not guaranteed, consider CSRF tokens for state-changing auth requests (login, set-password, etc.). |

---

## 4. Validation and error messages

- **Mismatched passwords:** When `POST /api/auth/set-password` (or register) receives non-matching `newPassword` and confirm field, return a **clear** error message (e.g. `"Passwords do not match"`) so the frontend can show it.
- **Empty/weak password:** Reject passwords that don’t meet your rules (e.g. min length) with a clear message (e.g. `"Password must be at least 6 characters"`). The frontend already shows “Minimum 6 characters” and validates length; backend should enforce the same and return a consistent message.

---

## 5. Logout

- **Expected:** `POST /api/auth/logout` clears the session (and any server-side token). The frontend then redirects to login and hides nav.
- **Backend:** Ensure logout invalidates the session/token so that a subsequent `GET /api/auth/me` returns unauthenticated.

---

## 6. Navigation while unauthenticated

- **Frontend:** Protected routes (e.g. `#/dashboard`, `#/progress`) now trigger an auth check; if unauthenticated, the user is redirected to `#/login`. The nav bar is hidden until the user is authenticated.
- **Backend:** Protected API routes (e.g. `/api/dashboard`, `/api/levels`, `/api/log`) should return **401** when the session is missing or invalid so the frontend can redirect to login and not leak data.

---

## 7. Optional: loading / cold start

- If the app is behind a service that has long cold starts (e.g. Render free tier), consider a simple health/readiness endpoint so the frontend could show “Loading…” while waiting. The frontend already shows a loading state during the initial auth check.

---

## Quick checklist for backend

- [ ] Root URL serves SPA; no redirect to set-password for anonymous users.
- [ ] `GET /api/auth/me` returns `authenticated: true` only when the user has set a password and has a valid session.
- [ ] `POST /api/auth/set-password` requires a valid single-use token; reject invalid/expired with clear error.
- [ ] Rate limiting on login, register, forgot-password, set-password.
- [ ] Clear error messages for password validation (mismatch, too short, etc.).
- [ ] `POST /api/auth/logout` invalidates session; `GET /api/auth/me` then returns unauthenticated.
- [ ] Protected API routes return 401 when session is missing or invalid.
