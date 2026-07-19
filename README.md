# Arcade Hub

One installable home screen for **all** of your GitHub Pages games.

Open it in a browser, tap **Install** / **Add to Home Screen**, and launch VoidRush, Crowd Clash Runner, or anything you add later.

**Live (after you enable Pages):** `https://jmitchell238.github.io/arcade-hub/`

---

## What’s included

| Path | Purpose |
|------|---------|
| `index.html` | Launcher UI |
| `css/style.css` | Neon arcade styling |
| `js/config.js` | **Hub version** (`HUB_VERSION` / `GAME_VERSION`) |
| `js/app.js` | Catalog, filters, PWA install, recent plays |
| `games.json` | **Add new games here** |
| `manifest.webmanifest` + `sw.js` | PWA install + offline shell |
| `art/` + `icons/` | Covers and app icons |

## Tests

```bash
node tests/run.mjs
```

Covers catalog helpers (filter, recent, HTML escape, validation), `games.json` integrity
(covers on disk, https links, one featured game), version/SW sync, and PWA shell files.

## Versioning

Same scheme as VoidRush (`hole-game`):

- `HUB_VERSION` in `js/config.js` — `MAJOR.MINOR.PATCH` (patch zero-padded to 3 digits)
- Also exposed as `GAME_VERSION` for shared update-check patterns
- UI shows `Arcade Hub v…` (corner tag + footer)
- Keep `CACHE` in `sw.js` in sync: `'arcade-hub-' + HUB_VERSION`
- SW + remote `config.js` version check auto-reloads installed PWAs
- Optional mirror: `hub.appVersion` in `games.json`

Games themselves stay on their own repos/Pages. This hub only links to them.

---

## Add a new game

1. Ship the game on GitHub Pages (e.g. `https://jmitchell238.github.io/my-new-game/`).
2. Drop a **3:4 cover image** into `art/covers/` (JPG or PNG, ~800–1200px tall is fine).
3. Append an entry to `games.json`:

```json
{
  "id": "my-new-game",
  "title": "My New Game",
  "subtitle": "One-line pitch",
  "description": "Longer blurb shown in the detail sheet.",
  "url": "https://jmitchell238.github.io/my-new-game/",
  "cover": "art/covers/my-new-game.jpg",
  "accent": "#ff8c42",
  "tags": ["Action", "Puzzle"],
  "featured": false,
  "repo": "my-new-game",
  "version": "1.0.000"
}
```

Set `"version"` to the game’s `GAME_VERSION` so the detail sheet shows e.g. `v1.2.003`
(top of the bottom sheet when you tap a game — not on the library cover cards).

4. List the new cover (and any new asset) in `sw.js` → `ASSETS`, and bump the `CACHE` string so clients pick it up.
5. Commit, push, wait for Pages to rebuild.

Set `"featured": true` on at most one game to put it in the hero banner.

---

## Local preview

Any static server works. From this folder:

```bash
# Python
python3 -m http.server 8080

# or Node
npx --yes serve -p 8080
```

Then open `http://localhost:8080`.

> Service workers and install prompts need **http://localhost** or **https://** — not `file://`.

---

## Deploy to GitHub Pages

```bash
cd arcade-hub
git init
git add .
git commit -m "Initial Arcade Hub"
git branch -M main
git remote add origin git@github.com:jmitchell238/arcade-hub.git
git push -u origin main
```

On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)`**.

Optional: set the custom domain later; otherwise the URL is:

`https://jmitchell238.github.io/arcade-hub/`

---

## Install as a PWA

| Platform | How |
|----------|-----|
| **Chrome / Edge (Android & desktop)** | Address bar install icon, or the in-app **Install** button |
| **Safari (iPhone/iPad)** | Share → **Add to Home Screen** |
| **Already installed** | Opens full-screen without browser chrome |

The hub shell (UI + covers) works offline once visited. Individual games still need network the first time you open them (their own PWAs can cache themselves after that).

---

## Catalog fields

| Field | Required | Notes |
|-------|----------|--------|
| `id` | yes | Stable slug (recent-play storage key) |
| `title` | yes | Display name |
| `url` | yes | Full `https://…github.io/…` game URL |
| `subtitle` | no | Card / hero one-liner |
| `description` | no | Detail sheet body |
| `cover` | no | Relative path under this repo |
| `accent` | no | Hex color for card hover / play button |
| `tags` | no | Filter chips |
| `featured` | no | Hero banner if `true` |
| `repo` | no | GitHub repo name (for your notes) |

---

## Current library

- [VoidRush](https://jmitchell238.github.io/hole-game/) (`hole-game`)
- [Crowd Clash Runner](https://jmitchell238.github.io/crowd-runner/) (`crowd-runner`)
- [Drop & Fuse](https://jmitchell238.github.io/drop-and-fuse/) (`drop-and-fuse`)
- [Neon Autofire](https://jmitchell238.github.io/neon-autofire/) (`neon-autofire`)
- [Ironvale](https://jmitchell238.github.io/ironvale/) (`ironvale`)
- [Bottle Sort](https://jmitchell238.github.io/bottle-sort/) (`bottle-sort`)
- [Maze Adventure](https://jmitchell238.github.io/maze-adventure/) (`maze-adventure`)
- [Animal Tap Zoo](https://jmitchell238.github.io/animal-tap-zoo/) (`animal-tap-zoo`)
- [Bubble Pop Garden](https://jmitchell238.github.io/bubble-pop-garden/) (`bubble-pop-garden`)
- [Color Match Pond](https://jmitchell238.github.io/color-match-pond/) (`color-match-pond`)
- [Hide & Seek Rooms](https://jmitchell238.github.io/hide-seek-rooms/) (`hide-seek-rooms`)
- [Treasure Dig](https://jmitchell238.github.io/treasure-dig/) (`treasure-dig`)
