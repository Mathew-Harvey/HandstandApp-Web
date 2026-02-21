# Landing Page Integration — Consistency Review

This document reviews the Handstand Tracker app (this repo) against the landing page post-purchase integration spec.

---

## 1. Create/find user API (called by the landing page)

**Spec:** POST to `TRACKER_API_URL` (e.g. `https://handstand-web.onrender.com/api/users` or `/api/create-tracker-user`) with `Authorization: Bearer <secret>` or `X-API-Key: <secret>`. Body: `email`, `name`, `temporaryPassword`, `forcePasswordChange`. Create/update user, generate one-time set-password token (e.g. 1h expiry). Response: `setPasswordToken` or `set_password_token`, optional `userId`.

**In this repo:** This is a **backend** responsibility. This repo contains only the **web frontend** and a static server (`server.js`). The app uses `window.API_URL` (e.g. `https://handstand-api.onrender.com`) for API calls, so the create-user endpoint must be implemented on that API service (or the same host if you combine services).

**Consistency:** N/A for this repo. The **tracker API** (wherever it lives) must:

- Expose POST endpoint at a path you configure as `TRACKER_API_URL` (e.g. `/api/users` or `/api/create-tracker-user`).
- Require `Authorization: Bearer <TRACKER_API_SECRET>` or `X-API-Key: <TRACKER_API_SECRET>`; reject missing/wrong secret.
- Accept JSON: `email` (required), `name` (required), `temporaryPassword` (required), `forcePasswordChange` (boolean).
- Create user if no user for that email; otherwise update (idempotent).
- Store temporary password in a verifiable way (e.g. hashed); generate a cryptographically random one-time token (e.g. 32 bytes hex), store it with the user with ~1h expiry.
- Respond with JSON: `setPasswordToken` or `set_password_token`, and optionally `userId`.

---

## 2. Set-password flow (when the user clicks the link in the email)

**Spec:** Route `GET /set-password?token=<one-time-token>`. Validate token → if invalid/expired show error + link to login/Forgot password; if valid log user in (session), show modal to set new password (and confirm). On submit: hash new password, save to user, clear temp password and set-password token, then redirect to main app.

### 2.1 Route and URL

- **Spec:** `GET /set-password?token=...`
- **App:** `getSetPasswordTokenFromUrl()` requires `window.location.pathname === '/set-password'` and reads `token` or `set_password_token` from the query string.
- **Server:** `server.js` uses a catch-all `app.get('*', ...)` that serves `index.html` for any path, so `/set-password?token=...` loads the SPA and the client sees `pathname === '/set-password'` and the token in `search`.

**Consistency:** OK. The landing page can use `https://<tracker-origin>/set-password?token=<setPasswordToken>`.

### 2.2 Token validation and error UX

- **Spec:** If invalid or expired, show a clear error and a link to normal login or “Forgot password?”.
- **App:** On invalid/expired (or API error) it shows: “This link is invalid or has expired.” and “Back to log in” (and on catch, the error message + “Back to log in”). “Forgot password?” was missing on the error view.
- **Change made:** Error view updated to also include “Forgot password?” so it matches the spec.

**Consistency:** OK after adding “Forgot password?” to the error state.

### 2.3 Valid token: log user in (session)

- **Spec:** If valid, log the user in (create session so they are authenticated).
- **App:** Calls `GET /auth/validate-set-password-token?token=...` with `credentials: 'include'`. Expects backend to validate the token and establish session (Set-Cookie). Then sets `currentUser = data.user` and shows the set-password modal.

**Consistency:** OK, assuming the API implements `GET /auth/validate-set-password-token` to validate token, set session cookie, and return `{ user }`.

### 2.4 Modal: new password + confirm

- **Spec:** Show modal (or full-page form) with “New password” + “Confirm password”; no email (user identified by token).
- **App:** Modal in `index.html` (`#setPasswordModal`) with “New password” and “Confirm password”; submit sends `{ token, newPassword }` to `POST /auth/set-password`. Client checks match and min length (6).

**Consistency:** OK.

### 2.5 On submit: hash, save, clear token, redirect

- **Spec:** Hash new password (bcrypt/argon2), save to user, clear temporary password and set-password token; then redirect to main app.
- **App:** Frontend POSTs `{ token, newPassword }` to `/auth/set-password`. After success: close modal, `history.replaceState(..., '/')`, `navigate('/dashboard')`, toast “Password set. Welcome!”.

**Consistency:** OK on the frontend. The **API** must: verify token, hash `newPassword`, save as the user’s permanent password, clear temp password and set-password token, then rely on existing session so the user stays logged in.

---

## 3. Password storage and recovery

- **Spec:** Store only hashed passwords (e.g. bcrypt/argon2). Implement normal “Forgot password?” flow (email → reset link/code → set new password → hash and save).
- **App:** Forgot-password page exists (`#/forgot-password`), form POSTs to `POST /auth/forgot-password` with `{ email }`, shows success message. Login page has “Forgot password?” link.

**Consistency:** Frontend is aligned. Password hashing and the actual reset flow (token generation, email, reset endpoint) must be implemented in the tracker API.

---

## 4. Summary checklist

| Item | Spec | This repo (frontend) | Backend (tracker API) |
|------|------|----------------------|------------------------|
| Create/find user POST | TRACKER_API_URL, Bearer or X-API-Key, body, response with setPasswordToken | N/A | Must implement |
| Set-password URL | GET /set-password?token=... | Uses pathname + query `token` or `set_password_token` | N/A |
| Invalid token UX | Error + login or Forgot password? | Error + “Back to log in” + “Forgot password?” (updated) | N/A |
| Valid token → session | Log user in | GET validate-set-password-token with credentials | Must set session on validate |
| Set-password modal | New + Confirm password | Implemented | N/A |
| Submit new password | Hash, save, clear token | POST /auth/set-password | Must implement |
| Passwords hashed | Yes | N/A | Must implement |
| Forgot password flow | Yes | Page + POST /auth/forgot-password | Must implement |

---

## 5. Recommended backend contract (for tracker API)

So that this frontend and the landing page both work, the tracker API should implement:

1. **POST /api/users** (or path chosen for `TRACKER_API_URL`)  
   - Auth: `Authorization: Bearer <secret>` or `X-API-Key: <secret>`.  
   - Body: `email`, `name`, `temporaryPassword`, `forcePasswordChange`.  
   - Response: `{ setPasswordToken: "<token>", userId?: "<id>" }` (or `set_password_token`).

2. **GET /api/auth/validate-set-password-token?token=...**  
   - Validate token and expiry; if valid, create session (Set-Cookie) and return `{ user }`; else 4xx.

3. **POST /api/auth/set-password**  
   - Body: `{ token, newPassword }`. Verify token, hash new password, update user, clear temp password and set-password token; session already established from validate step.

4. **POST /api/auth/forgot-password**  
   - Body: `{ email }`. Send reset link/code; implement reset flow with hashed password storage.

5. **Password storage:** Only store hashed passwords (e.g. bcrypt or argon2); never store plaintext.

Once the backend matches this contract, the app is consistent with the landing page post-purchase flow.
