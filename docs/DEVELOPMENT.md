# Development

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

Covers the catalog helpers (filtering, recent plays, HTML escaping, validation), `games.json` integrity (covers exist, links are HTTPS, at most one featured game), version sync, and the PWA shell files.

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
| `id` | yes | Stable slug, also used to remember recently played games |
| `title` | yes | Display name |
| `url` | yes | Full HTTPS URL to the game |
| `subtitle` | no | One-liner on the card and hero |
| `description` | no | Detail sheet text |
| `cover` | no | Path to the portrait cover used on library cards |
| `featuredDesktop` | no | 16:9 gameplay frame for the hero on wide screens |
| `featuredMobile` | no | 4:3 gameplay frame for the hero on phones |
| `accent` | no | Hex color for hover and the play button |
| `tags` | no | Filter chips |
| `featured` | no | Pins the game in the hero banner, overriding the weekly rotation. One game at most. |
| `rotate` | no | Puts the game in the weekly featured rotation. Rotation changes each Monday; a `featured` game overrides it. |
| `repo` | no | Repo name, for reference |
| `version` | no | Fallback version for the detail sheet |
| `versionFile` | no | Where to read the live version from, if it isn't one of the usual paths (see [ARCHITECTURE.md](ARCHITECTURE.md#game-versions)) |

## Versioning

`HUB_VERSION` in `js/config.js` uses `MAJOR.MINOR.PATCH` with a three-digit patch (e.g. `1.1.052`). When bumping it, also update:

- `CACHE` in `sw.js` (`'arcade-hub-' + HUB_VERSION`)
- `hub.appVersion` in `games.json`

The tests fail if either one is out of sync.
