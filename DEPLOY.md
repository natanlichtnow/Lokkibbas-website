# Production Deployment Guide (Real Host)

This guide is for deploying this website on a real Node.js host (not GitHub Pages).

## 1. Choose a host

Use a host that supports:

- Node.js 20+
- HTTPS
- Persistent filesystem (for `uploads/` and `data/posts.json`)
- Environment variables

Recommended options for Canadian deployments:

1. DigitalOcean Droplet (Toronto region) - strong control, predictable pricing.
2. AWS Lightsail or EC2 (`ca-central-1`, Montreal) - enterprise-grade and Canadian region.
3. OVHcloud VPS Public Cloud (Canada) - Canadian datacenter option with good value.
4. Render Web Service + persistent disk - easiest managed flow (confirm region/latency needs).

## 2. Prepare local project

From the project root:

```bash
npm install
node --check server.js
```

Optional quick smoke test:

```bash
npm start
```

Then open `http://localhost:3000`.

## 3. Generate secure admin credentials

Run once (replace with your real strong password):

```bash
node -e "const crypto=require('crypto'); const password='REPLACE_WITH_STRONG_PASSWORD'; const salt=crypto.randomBytes(24).toString('hex'); const hash=crypto.pbkdf2Sync(password,salt,210000,32,'sha256').toString('hex'); console.log({salt, hash});"
```

Save the generated `salt` and `hash` securely.

## 4. Set production environment variables on host

Set these values in your hosting dashboard:

- `NODE_ENV=production`
- `PORT=3000` (or host-provided port)
- `TOKEN_SECRET=<random string, 32+ chars>`
- `OWNER_USERNAME=<admin username>`
- `OWNER_PASSWORD_SALT=<generated salt>`
- `OWNER_PASSWORD_HASH=<generated hash>`
- `GOOGLE_CLIENT_ID=<optional, for Google-verified contact flow>`
- `GMAIL_USER=<optional, for contact email sending>`
- `GMAIL_APP_PASSWORD=<optional, for contact email sending>`
- `CONTACT_TO_EMAIL=<destination inbox>`

Important:

- The server will not start in production if insecure default admin values are detected.

## 5. Deploy code to host

Use one of these methods:

1. Git-based deploy (connect repo and deploy branch `main`).
2. SSH deploy (clone repo on server and run with PM2/systemd).
3. Container deploy (Dockerfile + host runtime).

Start command:

```bash
npm start
```

## 6. Configure persistent storage

Because gallery uploads are written to disk:

- Ensure the app can write to `uploads/` and `data/`.
- On ephemeral platforms, attach a persistent disk/volume.

## 7. Point domain and enable HTTPS

1. Add your domain in host settings.
2. Point DNS (`A`/`CNAME`) to the host.
3. Enable SSL/TLS certificate.
4. Force HTTPS redirects.

## 8. Update SEO files with your real domain

Replace placeholders in:

- `robots.txt`
- `sitemap.xml`

Example domain: `https://www.yourdomain.com`

## 9. Post-deploy verification checklist

1. Public pages load: `/`, `/services.html`, `/about.html`, `/gallery.html`, `/contact.html`.
2. Dashboard login works: `/onlylokkibans.html`.
3. Add and delete a gallery post from dashboard.
4. Uploaded images persist after service restart.
5. Contact flow works in the configured mode.
6. Security headers present (Helmet enabled).

## 10. Handover package for client

Deliver these items:

1. Live URL and admin dashboard URL.
2. Host provider and project/service name.
3. DNS registrar and DNS records summary.
4. Environment variable inventory (without secret values in plain text).
5. Admin credential rotation date and recovery process.
6. Basic rollback note (previous deploy version).
