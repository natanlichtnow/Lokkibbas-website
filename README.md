# Moore's Waterproofing Website

This workspace contains a static website for **Moore's Waterproofing** (based loosely on https://www.mooresexteriors.com/).

## Structure & BEM Organization

The project follows the **Block-Element-Modifier (BEM)** methodology along with a simple **OOP-style component loader** in JavaScript. Each visual block is kept in its own folder/file to promote separation of concerns.

```
/ (root)
├─ index.html            # entry point; placeholders for blocks
├─ README.md
├─ assets/               # images, fonts, etc.
├─ css/
│  ├─ main.css           # imports all block styles plus global resets
│  └─ blocks/            # one CSS file per BEM block
│     ├─ header.css
│     ├─ hero.css
│     ├─ services.css
│     ├─ about.css
│     ├─ contact.css
│     └─ footer.css
├─ components/           # HTML snippets for each block
│     ├─ header.html
│     ├─ hero.html
│     ├─ services.html
│     ├─ about.html
│     ├─ contact.html
│     └─ footer.html
└─ js/
   └─ main.js            # JavaScript responsible for loading component HTML
```

Each CSS file uses BEM class names such as `header__nav`, `services__item`, etc.  Blocks may contain elements (`__`) and modifiers (`--`).

The JavaScript demonstrates a simple OOP pattern with a `ComponentLoader` class that fetches each block's HTML and injects it into the DOM.

## Usage

1. Place your own hero image in `assets/hero.jpg` or adjust the CSS background path.
2. Open `index.html` in a browser; the page will assemble dynamically.
3. Customize text, add more blocks, or extend styles following BEM naming.

---

Feel free to expand or refactor as needed. The current layout is minimal but demonstrates the requested methodologies.

## Secure Owner Dashboard + Server Gallery

The project now includes:

- Public read-only gallery page: [gallery.html](gallery.html)
- Protected owner dashboard: [onlylokkibans.html](onlylokkibans.html)
- Server API with protected post creation/deletion: [server.js](server.js)

### Run locally

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Open:
   - `http://localhost:3000`

### Owner credentials

- Username: `roofboi`
- Password: `4251`

The server stores a PBKDF2 hash of the password (not plaintext) and uses JWT auth for dashboard actions.

### Recommended production env overrides

Set these environment variables in production:

- `TOKEN_SECRET` (strong random secret)
- `OWNER_USERNAME`
- `OWNER_PASSWORD_SALT`
- `OWNER_PASSWORD_HASH`
- `PORT`