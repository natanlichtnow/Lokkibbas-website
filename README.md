# Moores Waterproofing Website

Production-ready website for real hosting with a secure Node.js backend and owner dashboard.

## Project Files

- Public pages: `index.html`, `services.html`, `about.html`, `gallery.html`, `contact.html`
- Private dashboard page: `onlylokkibans.html`
- Shared frontend logic: `js/main.js`
- Gallery feed logic: `js/gallery.js`
- Dashboard app logic: `js/dashboard.js`
- Optional backend API: `server.js`

## Secure Server Mode

Use this mode for real protected publishing/deleting.

### Run locally

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Open:
   - `http://localhost:3000`

Private dashboard URL:
- `http://localhost:3000/onlylokkibans.html`

### Owner credentials

- Production server mode must use environment variables for owner auth.
- Demo fallback credentials (`roofboi` / `4251`) only apply when the API is unavailable.

## Recommended Production Environment Variables

- `TOKEN_SECRET` (strong random secret)
- `OWNER_USERNAME`
- `OWNER_PASSWORD_SALT`
- `OWNER_PASSWORD_HASH`
- `PORT`

## Admin Authentication Safety (Production)

- Server now fails fast in production if defaults are still in use.
- `TOKEN_SECRET` must be random and at least 32 characters.
- `OWNER_PASSWORD_SALT` must be at least 16 characters.
- `OWNER_PASSWORD_HASH` must be a 64-character hex PBKDF2-SHA256 hash.
- Login endpoint is rate-limited and adds a delay on failed logins.

### Generate a secure password hash

Run this command and keep the printed values private:

```bash
node -e "const crypto=require('crypto'); const password='REPLACE_WITH_STRONG_PASSWORD'; const salt=crypto.randomBytes(24).toString('hex'); const hash=crypto.pbkdf2Sync(password,salt,210000,32,'sha256').toString('hex'); console.log({salt, hash});"
```

Set on your host:

- `OWNER_USERNAME=your_admin_username`
- `OWNER_PASSWORD_SALT=<generated salt>`
- `OWNER_PASSWORD_HASH=<generated hash>`
- `TOKEN_SECRET=<long random secret>`

## Repo Hygiene

- `node_modules/`, `uploads/`, logs, and `.env` are ignored by `.gitignore`.
- Keep secure credentials only in environment variables for production.
