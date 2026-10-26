# Site structure — QUEEN Fashion Group

Every page exists in 6 languages under a language prefix: `en` (default), `pl`, `de`, `ru`, `it`, `el` (Greek).
Each page links its translations with `<link rel="alternate" hreflang="…">`. The language switcher keeps the user on the same page.

| # | Page | URL (EN example) |
|---|---|---|
| 1 | Home — QUEEN Fashion Group | `/en/` |
| 2 | Our Brands | `/en/brands/` |
| 3 | Brand page | `/en/brands/{brand}/` — queen, elle, eleonora, lorenzo-ricci, velina, nivera, tvoya |
| 4 | Brand catalogue (filter by collection +) | `/en/brands/{brand}/catalogue/` (`?collection=queen-2027`) |
| 5 | Product page | `/en/brands/{brand}/catalogue/{article}/` |
| 6 | About us | `/en/about/` |
| 7 | Blog / article | `/en/blog/`, `/en/blog/{slug}/` |
| 8 | Contacts + wholesale enquiry | `/en/contact/` |

## Navigation
- **Header (desktop):** Brands ▾ · About us · Blog · Contacts | logo | Language ▾ · `Become a partner`
- **Brands mega menu:** all brands, each with *Brand page* and *Catalogue* links, plus "All brands" and the newest collection.
- **Mobile menu:** same items; Brands opens as an accordion; languages and manager contacts at the bottom.
- **Footer:** full list of brands, company pages, partner links, contacts, languages.

On the homepage prototype, nav items scroll to the matching homepage section until the inner pages exist.
