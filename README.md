# Arcade Hub

A launcher for my GitHub Pages games. Install it as a PWA and every game is one tap away from the home screen.

Live at https://jmitchell238.github.io/arcade-hub/

## Games

- [VoidRush](https://jmitchell238.github.io/hole-game/) (`hole-game`)
- [Blockbound](https://jmitchell238.github.io/blockbound/) (`blockbound`)
- [Orb Merge Run](https://jmitchell238.github.io/orb-merge-run/) (`orb-merge-run`)
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
- [Shape Train](https://jmitchell238.github.io/shape-train/) (`shape-train`)
- [Dress-Up Dino](https://jmitchell238.github.io/dress-up-dino/) (`dress-up-dino`)
- [Number Caterpillar](https://jmitchell238.github.io/number-caterpillar/) (`number-caterpillar`)
- [Letter Picnic](https://jmitchell238.github.io/letter-picnic/) (`letter-picnic`)
- [Cozy Racers](https://jmitchell238.github.io/cozy-racers/) (`cozy-racers`)
- [Mermaid Dress-Up](https://jmitchell238.github.io/dress-up-mermaid/) (`dress-up-mermaid`)

Each game lives in its own repo and deploys to its own Pages site. The hub only links to them.

## Layout

| Path | Purpose |
|------|---------|
| `index.html` | Launcher UI |
| `css/style.css` | Styles |
| `js/config.js` | `HUB_VERSION` |
| `js/app.js` | Catalog, filters, install prompt, recently played |
| `games.json` | Game catalog |
| `manifest.webmanifest`, `sw.js` | PWA manifest and offline shell |
| `art/`, `icons/` | Cover art and app icons |
| `tests/run.mjs` | Test runner |

## Running locally

Serve the folder with any static server:

```bash
python3 -m http.server 8080
# or
npx --yes serve -p 8080
```

Then open http://localhost:8080. The service worker and install prompt need `localhost` or HTTPS, so opening `index.html` from disk won't work.

## Tests

```bash
node tests/run.mjs
```

Covers the catalog helpers (filtering, recent plays, HTML escaping, validation), `games.json` integrity (covers exist, links are HTTPS, only one featured game), version sync, and the PWA shell files.

## Adding a game

1. Deploy the game to GitHub Pages.
2. Add a 3:4 cover to `art/covers/` (JPG or PNG, 800–1200px tall).
3. Add an entry to `games.json`:

   ```json
   {
     "id": "my-new-game",
     "title": "My New Game",
     "subtitle": "One-line pitch",
     "description": "Longer blurb for the detail sheet.",
     "url": "https://jmitchell238.github.io/my-new-game/",
     "cover": "art/covers/my-new-game.jpg",
     "accent": "#ff8c42",
     "tags": ["Action", "Puzzle"],
     "featured": false,
     "repo": "my-new-game",
     "version": "1.0.000"
   }
   ```

4. Add the cover to `ASSETS` in `sw.js` and bump the hub version (see below).
5. Push to `main`. Pages redeploys on its own.

### Catalog fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | Stable slug, also the recently-played storage key |
| `title` | yes | Display name |
| `url` | yes | Full HTTPS URL to the game |
| `subtitle` | no | One-liner on the card and hero |
| `description` | no | Detail sheet text |
| `cover` | no | Path to the cover in this repo |
| `accent` | no | Hex color for hover and the play button |
| `tags` | no | Filter chips |
| `featured` | no | Puts the game in the hero banner. One game at most. |
| `repo` | no | Repo name, for reference |
| `version` | no | Fallback version for the detail sheet |
| `versionFile` | no | Where to read the live version from, if it isn't `js/config.js` or `js/config/index.js` |

The hub reads each game's live `GAME_VERSION` from its Pages site and shows that. `version` is only used until that loads, or if it can't be read.

## Versioning

`HUB_VERSION` in `js/config.js` uses `MAJOR.MINOR.PATCH` with a three-digit patch (e.g. `1.1.052`). It's also exported as `GAME_VERSION` so the hub uses the same update check as the games.

When bumping it, also update:

- `CACHE` in `sw.js` (`'arcade-hub-' + HUB_VERSION`)
- `hub.appVersion` in `games.json`

The tests fail if either one is out of sync. Installed copies pick up the new service worker, see the version change, and reload.

## Installing

| Platform | How |
|----------|-----|
| Chrome / Edge (Android, desktop) | Install icon in the address bar, or the Install button in the hub |
| Safari (iPhone, iPad) | Share → Add to Home Screen |

Once it's been opened, the hub UI and covers work offline. Each game needs a connection the first time it's opened; after that it depends on whether the game caches itself.
