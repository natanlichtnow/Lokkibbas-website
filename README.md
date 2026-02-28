# Moores Waterproofing Website

Production-ready website with two operating modes:

- **GitHub Pages demo mode** (no backend required)
- **Secure server mode** (owner authentication + server-stored gallery posts)

## Project Files

- Public pages: `index.html`, `services.html`, `about.html`, `gallery.html`, `contact.html`
- Private dashboard page: `onlylokkibans.html`
- Shared frontend logic: `js/main.js`
- Gallery feed logic: `js/gallery.js`
- Dashboard app logic: `js/dashboard.js`
- Optional backend API: `server.js`

## GitHub Pages Demo Mode

Use this mode for client showcase.

### Behavior

- Public gallery works from browser demo storage when no API is present.
- Private dashboard works in demo mode with local storage fallback.
- Contact form opens a pre-filled email draft (`mailto:`).

### Deploy

1. Push repository to GitHub.
2. Enable **GitHub Pages** in repository settings.
3. Open your generated Pages URL.

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

- Username: `roofboi`
- Password: `4251`

## Recommended Production Environment Variables

- `TOKEN_SECRET` (strong random secret)
- `OWNER_USERNAME`
- `OWNER_PASSWORD_SALT`
- `OWNER_PASSWORD_HASH`
- `PORT`

## Repo Hygiene

- `node_modules/`, `uploads/`, logs, and `.env` are ignored by `.gitignore`.
- Keep secure credentials only in environment variables for production.
