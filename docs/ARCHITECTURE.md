# Architecture

A static site with no build step. Three plain scripts load in order from `index.html`.

## Files

| Path | Contents |
|------|----------|
| `index.html` | Page markup |
| `css/style.css` | Styles |
| `js/config.js` | `HUB_VERSION`, also exported as `GAME_VERSION` |
| `js/catalog.js` | Pure helpers: filtering, tags, recent plays, catalog validation, version parsing. Also loaded by the tests. |
| `js/app.js` | Rendering the grid, hero and detail sheet, input, the install prompt, service worker registration, update checks |
| `games.json` | Game catalog |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | Service worker that caches the hub's own files for offline use |
| `art/`, `icons/` | Covers, background and app icons |
| `tests/run.mjs` | Test runner |

## Catalog

`app.js` fetches `games.json` on startup, validates it with `validateCatalog()` and renders the featured game, filter chips, recently played row and grid. Recently played games are stored in localStorage under `arcade-hub-recent`.

The games themselves live in their own repos and Pages sites. The hub only links to them.

## Game versions

The detail sheet shows each game's live version. `fetchLiveVersion()` tries these files on the game's Pages site, in order, and reads `GAME_VERSION` from the first one that loads:

1. the game's `versionFile`, if set in `games.json`
2. otherwise `js/config.js`, `js/config/index.js`, `js/core/constants.js`, `js/constants.js`

If none of them can be read, it falls back to the `version` field in `games.json`.

## Updates and offline

`sw.js` precaches everything in `ASSETS` under a cache named after the hub version, and removes older caches when it activates. The games aren't cached by the hub; each game handles its own offline support.

`app.js` checks for updates two ways:

- It calls `registration.update()` on load, when the tab regains focus, and every minute. A new service worker takes over immediately and the page reloads.
- Every two minutes it fetches `js/config.js` with caching disabled and reloads if `HUB_VERSION` has changed.
