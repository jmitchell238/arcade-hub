#!/usr/bin/env node
/**
 * Arcade Hub — automated tests (no browser deps).
 * Run: node tests/run.mjs
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
    process.stdout.write('.');
    return;
  }
  failed++;
  failures.push(msg);
  console.error('\n  ✗', msg);
}

function assertEq(a, b, msg) {
  assert(Object.is(a, b), `${msg} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

function section(name) {
  process.stdout.write('\n• ' + name + ' ');
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function loadCatalogModule() {
  // catalog.js uses CommonJS export
  return require(path.join(root, 'js/catalog.js'));
}

// -------------------- catalog pure logic --------------------
section('catalog helpers');
{
  const cat = loadCatalogModule();

  assertEq(cat.escapeHtml('<script>"&</script>'),
    '&lt;script&gt;&quot;&amp;&lt;/script&gt;',
    'escapeHtml escapes XSS-prone chars');

  assertEq(cat.formatGameVersion('1.2.003'), 'v1.2.003', 'formatGameVersion prefixes v');
  assertEq(cat.formatGameVersion('v2.0.0'), 'v2.0.0', 'formatGameVersion keeps existing v');
  assertEq(cat.formatGameVersion(''), '', 'formatGameVersion empty');
  assertEq(cat.formatGameVersion(null), '', 'formatGameVersion null');
  assertEq(cat.formatGameVersion('not-a-version'), '', 'formatGameVersion rejects junk');

  // Live version probing helpers
  const probes = cat.versionProbeUrls({ url: 'https://jmitchell238.github.io/hole-game/' });
  assert(probes[0].endsWith('/js/config.js'), 'probe default config.js');
  assert(probes.some(u => u.endsWith('/js/config/index.js')), 'probe config/index.js');
  assertEq(cat.versionProbeUrls({ url: 'http://bad/' }).length, 0, 'reject non-https probe');
  const custom = cat.versionProbeUrls({
    url: 'https://jmitchell238.github.io/x/',
    versionFile: 'app/version.js',
  });
  assertEq(custom.join(','), 'https://jmitchell238.github.io/x/app/version.js', 'custom versionFile');

  assertEq(
    cat.parseGameVersionFromSource("const GAME_VERSION = '2.43.014';"),
    '2.43.014',
    'parse GAME_VERSION'
  );
  assertEq(
    cat.parseGameVersionFromSource("export const GAME_VERSION = '1.2.006';"),
    '1.2.006',
    'parse export GAME_VERSION'
  );
  assertEq(
    cat.parseGameVersionFromSource("const HUB_VERSION = '1.1.000';"),
    '1.1.000',
    'parse HUB_VERSION fallback'
  );
  assertEq(cat.parseGameVersionFromSource('// no version here'), null, 'parse missing');
  // Prefer live over stale catalog
  assertEq(cat.resolveDisplayVersion('2.43.005', '2.43.014'), 'v2.43.014', 'live wins over catalog');
  assertEq(cat.resolveDisplayVersion('1.0.000', null), 'v1.0.000', 'catalog fallback');
  assertEq(cat.resolveDisplayVersion(null, null), '', 'empty when neither');

  const games = [
    { id: 'a', title: 'A', tags: ['Puzzle', 'Casual'] },
    { id: 'b', title: 'B', tags: ['Action'] },
    { id: 'c', title: 'C', tags: ['Puzzle'] },
  ];
  assertEq(cat.allTags(games).join(','), 'All,Action,Casual,Puzzle', 'allTags sorted with All first');
  assertEq(cat.filteredGames(games, 'All').length, 3, 'filter All returns all');
  assertEq(cat.filteredGames(games, 'Puzzle').map(g => g.id).join(','), 'a,c', 'filter Puzzle');
  assertEq(cat.filteredGames(games, 'Missing').length, 0, 'unknown filter empty');
  assertEq(cat.byId(games, 'b').title, 'B', 'byId finds game');
  assertEq(cat.byId(games, 'nope'), undefined, 'byId missing');

  const store = {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
  };
  assertEq(cat.loadRecent(store).length, 0, 'empty recent');
  assertEq(cat.saveRecent(store, 'a').join(','), 'a', 'save recent a');
  assertEq(cat.saveRecent(store, 'b').join(','), 'b,a', 'recent b then a');
  assertEq(cat.saveRecent(store, 'a').join(','), 'a,b', 'replaying a moves to front');
  // max cap
  for (const id of ['1', '2', '3', '4', '5', '6', '7']) cat.saveRecent(store, id, { max: 6 });
  assertEq(cat.loadRecent(store).length, 6, 'recent capped at 6');
  assertEq(cat.loadRecent(store)[0], '7', 'most recent first');

  // corrupt storage
  store.setItem(cat.RECENT_KEY_DEFAULT, '{not-json');
  assertEq(cat.loadRecent(store).length, 0, 'corrupt recent returns []');
}

section('catalog validation');
{
  const cat = loadCatalogModule();
  const bad = cat.validateCatalog(null);
  assertEq(bad.ok, false, 'null catalog invalid');

  const noGames = cat.validateCatalog({ hub: { name: 'X' } });
  assertEq(noGames.ok, false, 'missing games array invalid');

  const ok = cat.validateCatalog({
    hub: { name: 'Arcade Hub' },
    games: [
      { id: 'g1', title: 'One', url: 'https://example.com/a/', tags: ['A'], featured: true },
      { id: 'g2', title: 'Two', url: 'https://example.com/b/', cover: 'art/x.jpg' },
    ],
  });
  assertEq(ok.ok, true, 'valid catalog ok');
  assertEq(ok.errors.length, 0, 'no errors');

  const http = cat.validateCatalog({
    hub: { name: 'X' },
    games: [{ id: 'g', title: 'T', url: 'http://insecure.example/' }],
  });
  assert(http.errors.some(e => e.includes('https')), 'http urls rejected');

  const dup = cat.validateCatalog({
    hub: { name: 'X' },
    games: [
      { id: 'g', title: 'T', url: 'https://a/' },
      { id: 'g', title: 'T2', url: 'https://b/' },
    ],
  });
  assert(dup.errors.some(e => e.includes('duplicate')), 'duplicate ids rejected');

  const twoFeat = cat.validateCatalog({
    hub: { name: 'X' },
    games: [
      { id: 'a', title: 'A', url: 'https://a/', featured: true },
      { id: 'b', title: 'B', url: 'https://b/', featured: true },
    ],
  });
  assert(twoFeat.errors.some(e => e.includes('featured')), 'multiple featured rejected');
}

// -------------------- live games.json --------------------
section('games.json integrity');
{
  const cat = loadCatalogModule();
  const text = read('games.json');
  const parsed = cat.parseCatalogJson(text);
  assert(parsed.ok, 'games.json parses as JSON');
  const v = cat.validateCatalog(parsed.data);
  if (!v.ok) v.errors.forEach(e => failures.push(e));
  assert(v.ok, 'games.json passes schema validation: ' + v.errors.join('; '));

  const data = parsed.data;
  assert(data.games.length >= 3, 'at least 3 games in catalog');
  assert(data.hub.appVersion, 'hub.appVersion present');

  // required known games
  const ids = data.games.map(g => g.id);
  for (const id of ['voidrush', 'crowd-clash', 'drop-and-fuse']) {
    assert(ids.includes(id), `catalog includes ${id}`);
  }

  // covers exist on disk; URLs look like github pages; versions shown on cards
  for (const g of data.games) {
    if (g.cover) {
      assert(exists(g.cover), `cover exists: ${g.cover}`);
    }
    assert(/^https:\/\/jmitchell238\.github\.io\//.test(g.url),
      `${g.id} links to github pages: ${g.url}`);
    // hub only links — cover must not embed game code
    assert(!g.bundle && !g.embed, `${g.id} is a link entry (not bundled)`);
    // Catalog version is optional fallback; live GAME_VERSION is preferred at runtime
    if (g.version != null) {
      assert(typeof g.version === 'string' && g.version.trim(),
        `${g.id} catalog version is non-empty string when present`);
      assert(!!cat.formatGameVersion(g.version),
        `${g.id} catalog version formats for UI: ${g.version}`);
    }
    assert(cat.versionProbeUrls(g).length >= 1,
      `${g.id} has version probe URLs from game url`);
  }

  const featured = data.games.filter(g => g.featured);
  assertEq(featured.length, 1, 'exactly one featured game');
}

// -------------------- versioning --------------------
section('version sync');
{
  const config = read('js/config.js');
  const sw = read('sw.js');
  const gamesJson = JSON.parse(read('games.json'));

  const m = config.match(/HUB_VERSION\s*=\s*['"]([^'"]+)['"]/);
  assert(!!m, 'HUB_VERSION defined in config.js');
  const ver = m[1];
  assert(/^\d+\.\d+\.\d{3}$/.test(ver), `HUB_VERSION format MAJOR.MINOR.PPP (${ver})`);

  assert(config.includes(`GAME_VERSION = HUB_VERSION`) || config.includes("GAME_VERSION ="),
    'GAME_VERSION alias exists');
  assert(sw.includes(`arcade-hub-${ver}`), `sw CACHE includes version ${ver}`);

  // optional mirror
  if (gamesJson.hub?.appVersion) {
    assertEq(gamesJson.hub.appVersion, ver, 'games.json hub.appVersion matches HUB_VERSION');
  }

  // SW precaches catalog.js
  assert(sw.includes("js/catalog.js") || sw.includes('./js/catalog.js'),
    'sw precaches catalog.js');
}

// -------------------- PWA / HTML shell --------------------
section('PWA shell + HTML');
{
  const html = read('index.html');
  const man = JSON.parse(read('manifest.webmanifest'));

  assert(html.includes('manifest.webmanifest'), 'html links manifest');
  assert(html.includes('js/config.js'), 'loads config.js');
  assert(html.includes('js/catalog.js'), 'loads catalog.js');
  assert(html.includes('js/app.js'), 'loads app.js');
  assert(html.includes('id="versionTag"'), 'versionTag element');
  assert(html.includes('id="versionLine"'), 'versionLine footer');
  assert(html.includes('id="gameGrid"'), 'game grid');
  assert(html.includes('id="playBtn"'), 'play button in sheet');
  assert(html.includes('id="sheetVersion"'), 'sheet version element');
  assert(html.includes('apple-mobile-web-app-capable'), 'iOS PWA meta');

  const app = read('js/app.js');
  assert(app.includes('formatGameVersion') || app.includes('_formatGameVersion'),
    'app formats game versions');
  assert(app.includes('sheetVersion'), 'sheet version element is wired');
  // Versions belong on the detail sheet only (not library cards — they covered titles/art on iPad)
  assert(!app.includes('card-version'), 'version badge is NOT on library cards');
  assert(app.includes('sheet-cover-img') || app.includes('sheetCover'),
    'sheet cover image path is wired');
  assert(app.includes('card-cover-img'), 'library cards use <img> covers');
  assert(app.includes('hydrateLiveVersions') || app.includes('fetchLiveVersion'),
    'app hydrates live GAME_VERSION from each game');
  assert(app.includes('liveVersion') || app.includes('parseGameVersionFromSource'),
    'app prefers live version over catalog');
  assert(app.includes('touchend') || app.includes('onTouchEnd'),
    'touch handlers for iPad/iOS card taps');

  assertEq(man.display, 'standalone', 'manifest standalone');
  assert(Array.isArray(man.icons) && man.icons.length >= 2, 'manifest has icons');
  for (const icon of man.icons) {
    assert(exists(icon.src), `manifest icon exists: ${icon.src}`);
  }
  assert(exists('apple-touch-icon.png'), 'apple-touch-icon present');
  assert(exists('icons/icon-192.png'), 'icon-192 present');
  assert(exists('icons/icon-512.png'), 'icon-512 present');
  assert(exists('art/bg.jpg'), 'background art present');
  // script order: config → catalog → app
  const iConfig = html.indexOf('js/config.js');
  const iCat = html.indexOf('js/catalog.js');
  const iApp = html.indexOf('js/app.js');
  assert(iConfig < iCat && iCat < iApp, 'script order config → catalog → app');
}

// -------------------- SW assets exist --------------------
section('service worker asset list');
{
  const sw = read('sw.js');
  const assets = [...sw.matchAll(/'(\.\/[^']+)'/g)].map(m => m[1]);
  assert(assets.length > 5, 'SW lists precache assets');
  for (const a of assets) {
    if (a === './' || a === './index.html') continue;
    const rel = a.replace(/^\.\//, '');
    assert(exists(rel), `SW asset on disk: ${rel}`);
  }
  assert(sw.includes('skipWaiting'), 'SW skipWaiting for updates');
  assert(sw.includes('clients.claim') || sw.includes('claim()'), 'SW claims clients');
}

// -------------------- filter/render integration smoke (vm) --------------------
section('catalog render smoke');
{
  const cat = loadCatalogModule();
  const data = JSON.parse(read('games.json'));
  const tags = cat.allTags(data.games);
  assert(tags[0] === 'All', 'tags start with All');
  assert(tags.length > 1, 'has real tags');

  for (const t of tags) {
    const list = cat.filteredGames(data.games, t);
    if (t === 'All') assertEq(list.length, data.games.length, 'All size');
    else assert(list.every(g => (g.tags || []).includes(t)), `all results tagged ${t}`);
  }

  // XSS: malicious title escaped when building card-like strings
  const evil = { id: 'x', title: '<img onerror=alert(1)>', subtitle: 'a"b', tags: [] };
  const safe = `<h3>${cat.escapeHtml(evil.title)}</h3>`;
  assert(!safe.includes('<img'), 'escaped title not raw HTML');
}

// -------------------- summary --------------------
console.log('\n\n────────────────────────────');
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed) {
  console.error('\nFailures:');
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('All Arcade Hub tests passed.\n');
