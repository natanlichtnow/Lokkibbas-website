# GitHub Pages Deployment Checklist

Before pushing to GitHub, verify everything is in order.

## Pre-Deploy Checks ✓

- [x] All HTML pages have proper SEO meta tags (title, description, OG tags, theme-color)
- [x] Contact form works with `mailto:` fallback
- [x] Gallery responds to URL-only dashboard access (no public links)
- [x] Theme toggle works and persists across pages
- [x] Header menu responsive (mobile/desktop)
- [x] All internal links are relative paths
- [x] `robots.txt` and `sitemap.xml` present (update URLs for your repo)
- [x] `.gitignore` excludes `node_modules/`, `uploads/`, `.env`, logs
- [x] No hardcoded server dependencies in public pages
- [x] Demo mode fallbacks work for gallery and dashboard

## GitHub Pages Setup

1. **Create or use a GitHub repository** for this project.
2. **Enable GitHub Pages:**
   - Go to **Settings** → **Pages**
   - Build and deployment source: **Deploy from a branch**
   - Branch: **main** (or your default branch)
   - Folder: **/ (root)**
   - Click **Save**
3. **Wait 1-5 minutes** for GitHub to publish.
4. **Access your site** at: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

## Post-Deploy Tasks

1. **Update SEO files:**
   - Edit `robots.txt`: Replace `YOUR-GITHUB-USERNAME` and `YOUR-REPO-NAME` with actual values.
   - Edit `sitemap.xml`: Replace `YOUR-GITHUB-USERNAME` and `YOUR-REPO-NAME` with actual values.
   - Commit and push changes.

2. **Test the live site:**
   - Verify all pages load.
   - Test theme toggle.
   - Test contact form (opens email draft).
   - Test gallery demo storage (add/remove posts).
   - Test dashboard demo mode (login with `roofboi` / `4251`).

3. **Share the URL with your client:**
   - Example: `https://your-username.github.io/moores-waterproofing/`

## Future Backend Upgrade

When ready to add a real backend:

1. Deploy `server.js` to a hosting service (Render, Railway, Fly.io, VPS).
2. Update environment variables on the host.
3. Optionally keep GitHub Pages pointing to the same origin or migrate to a custom domain.
4. Dashboard and gallery will automatically upgrade to secure server mode.

## Notes

- Static assets (images) should be in `assets/` folder.
- Avoid uploading personal files or credentials to GitHub.
- GitHub Pages enforces HTTPS automatically.
