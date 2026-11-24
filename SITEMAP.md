# Site structure — QUEEN Fashion Group

Every page exists in 6 languages. English is at the site root (`/brands/queen/`), the others under a prefix: `/pl/`, `/de/`, `/ru/`, `/it/`, `/el/` (Greek).
Each page links its translations with `<link rel="alternate" hreflang="…">`. The language switcher keeps the user on the same page.
Translations live in `data/translations.json` (interface strings, filter labels, page texts, brand texts, blog posts); anything missing falls back to English.
Product names, articles and collection names are the same in every language.

| # | Page | URL (EN example) |
|---|---|---|
| 1 | Home — QUEEN Fashion Group | `/en/` |
| 2 | Our Brands | `/en/brands/` |
| 3 | Brand page | `/brands/{brand}/` — queen, elle, eleonora, ricci, velina, nivera, tvoya |
| 4 | Catalogue — one for all brands, brand is the first filter | `/catalogue/?brand=queen&collection=queen-2027` |
| 5 | Model page | `/catalogue/{brand}-{article}/` |
| 6 | About us | `/en/about/` |
| 7 | Blog / article | `/en/blog/`, `/en/blog/{slug}/` |
| 8 | Contacts + wholesale enquiry | `/en/contact/` |

## Navigation
- **Header (desktop):** Brands ▾ · About us · Blog · Contacts | logo | Language ▾ · `Become a partner`
- **Brands mega menu:** all brands, each with *Brand page* and *Catalogue* links, plus "All brands" and the newest collection.
- **Mobile menu:** same items; Brands opens as an accordion; languages and manager contacts at the bottom.
- **Footer:** full list of brands, company pages, partner links, contacts, languages.


## How the site is built
All pages are generated from `data/*.json` by the templates in `lib/render.mjs`:
- `data/models.json` — products · `data/collections.json` — collections · `data/brands.json` — brand pages
- `data/posts.json` — blog · `data/site.json` — texts of every page, contacts, terms, menu and footer
- `node build.mjs` regenerates every page locally (also removes pages of deleted products).

## Admin panel — /admin
Edit products, collections and every page with a live preview, then press **Publish**.

**Switch it on (once), in Vercel → Project → Settings → Environment Variables:**
| Name | Value |
|---|---|
| `GITHUB_TOKEN` | GitHub fine-grained token, repository `test-queen1`, permission **Contents: Read and write** (required) |
| `ADMIN_PASSWORD` | optional — replaces the temporary password (do this before the real launch) |
| `GITHUB_REPO` | optional — defaults to `GritsenkoIvanKPI/test-queen1` |

Then redeploy. Publishing commits the changes to GitHub, and Vercel rebuilds the site in about a minute.
Until `ADMIN_PASSWORD` is set, a temporary password works (only its fingerprint is stored in `lib/admin-api.mjs`).

**Locally:** `node serve.mjs` → http://localhost:3000/admin, password `queen` (works only locally; edits files in this folder).


## SEO

Generated automatically by `node build.mjs` and by every publish from the admin:

- **Every page:** title, description, canonical, hreflang for all 6 languages, Open Graph and Twitter cards (share photo per brand, model and post; `assets/img/og-default.jpg` otherwise), `robots` with large image previews.
- **Structured data (JSON-LD):** Organization (home, about, contact), WebSite (home), BreadcrumbList (all inner pages), BlogPosting (posts).
- **`sitemap.xml`:** all indexable pages with language alternates and photos. `robots.txt` points to it.
- **Catalogue:** the first 24 models are in the HTML, so search engines can follow them without JavaScript.
- **Favicons:** `favicon.ico`, `assets/icons/favicon.svg`, `apple-touch-icon.png`, `site.webmanifest` (icons drawn from the logo's Q).
- **Preview domain:** `*.vercel.app` is sent `noindex`, so only the real domain gets indexed. `SITE_URL` in `lib/render.mjs` must match the final domain.
- **Base CSS:** `assets/css/base.css` is the reset Tailwind generated, saved as a file; the Tailwind CDN script is no longer loaded (faster first paint).
