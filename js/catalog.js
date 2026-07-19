'use strict';

/**
 * Pure catalog helpers — unit-tested without a browser.
 * Used by app.js for filtering, recent plays, and HTML safety.
 */

const RECENT_KEY_DEFAULT = 'arcade-hub-recent';
const RECENT_MAX_DEFAULT = 6;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format a catalog game version for UI badges (e.g. "1.2.003" → "v1.2.003").
 * Returns empty string when missing / invalid so cards can omit the badge.
 * @param {unknown} version
 * @returns {string}
 */
function formatGameVersion(version) {
  if (version == null) return '';
  const s = String(version).trim();
  if (!s) return '';
  // Optional leading v; MAJOR.MINOR[.PATCH] with optional pre-release suffix
  const m = s.match(/^v?(\d+\.\d+(?:\.\d+)?(?:[a-z0-9.-]*)?)$/i);
  if (!m) return '';
  return `v${m[1]}`;
}

/**
 * Candidate URLs to probe for a game's GAME_VERSION (relative to its Pages root).
 * Optional game.versionFile overrides the default list (single path or array).
 * @param {{ url?: string, versionFile?: string|string[] }} game
 * @returns {string[]}
 */
function versionProbeUrls(game) {
  const base = String(game && game.url || '').replace(/\/?$/, '/');
  if (!/^https:\/\//i.test(base)) return [];
  let files = game && game.versionFile;
  if (typeof files === 'string' && files.trim()) files = [files.trim()];
  if (!Array.isArray(files) || !files.length) {
    files = ['js/config.js', 'js/config/index.js'];
  }
  return files.map(f => {
    const rel = String(f).replace(/^\.\//, '').replace(/^\//, '');
    return base + rel;
  });
}

/**
 * Extract GAME_VERSION (preferred) or HUB_VERSION from a JS source file.
 * Returns the bare version string (no leading "v"), or null.
 * @param {string} text
 * @returns {string|null}
 */
function parseGameVersionFromSource(text) {
  if (!text || typeof text !== 'string') return null;
  const patterns = [
    /(?:const|let|var)\s+GAME_VERSION\s*=\s*['"]([^'"]+)['"]/,
    /GAME_VERSION\s*=\s*['"]([^'"]+)['"]/,
    /(?:const|let|var)\s+HUB_VERSION\s*=\s*['"]([^'"]+)['"]/,
    /export\s+const\s+GAME_VERSION\s*=\s*['"]([^'"]+)['"]/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const raw = String(m[1]).trim().replace(/^v/i, '');
    if (formatGameVersion(raw)) return raw;
  }
  return null;
}

/**
 * Prefer a live-probed version over the static catalog fallback.
 * @param {unknown} catalogVersion - games.json entry
 * @param {unknown} liveVersion - fetched from the game
 * @returns {string} formatted "vX.Y.Z" or ""
 */
function resolveDisplayVersion(catalogVersion, liveVersion) {
  return formatGameVersion(liveVersion) || formatGameVersion(catalogVersion) || '';
}

function allTags(games) {
  const set = new Set();
  for (const g of games || []) {
    for (const t of g.tags || []) set.add(t);
  }
  return ['All', ...[...set].sort((a, b) => a.localeCompare(b))];
}

function filteredGames(games, activeFilter) {
  const list = Array.isArray(games) ? games : [];
  if (!activeFilter || activeFilter === 'All') return list.slice();
  return list.filter(g => (g.tags || []).includes(activeFilter));
}

function byId(games, id) {
  return (games || []).find(g => g.id === id);
}

function loadRecent(storage, key = RECENT_KEY_DEFAULT) {
  try {
    const raw = storage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(storage, id, {
  key = RECENT_KEY_DEFAULT,
  max = RECENT_MAX_DEFAULT,
} = {}) {
  const next = [id, ...loadRecent(storage, key).filter(x => x !== id)].slice(0, max);
  try { storage.setItem(key, JSON.stringify(next)); }
  catch { /* private mode etc. */ }
  return next;
}

/**
 * Validate a games.json-shaped catalog.
 * Returns { ok: boolean, errors: string[], games: object[] }.
 */
function validateCatalog(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['catalog is not an object'], games: [] };
  }
  if (!data.hub || typeof data.hub !== 'object') {
    errors.push('missing hub metadata');
  } else {
    if (!data.hub.name) errors.push('hub.name required');
  }
  if (!Array.isArray(data.games)) {
    errors.push('games must be an array');
    return { ok: false, errors, games: [] };
  }

  const ids = new Set();
  let featuredCount = 0;
  data.games.forEach((g, i) => {
    const prefix = `games[${i}]`;
    if (!g || typeof g !== 'object') {
      errors.push(`${prefix} is not an object`);
      return;
    }
    if (!g.id || typeof g.id !== 'string') errors.push(`${prefix}.id required`);
    else if (ids.has(g.id)) errors.push(`${prefix}.id duplicate: ${g.id}`);
    else ids.add(g.id);

    if (!g.title) errors.push(`${prefix}.title required`);
    if (!g.url || typeof g.url !== 'string') errors.push(`${prefix}.url required`);
    else if (!/^https:\/\//i.test(g.url)) errors.push(`${prefix}.url must be https: ${g.url}`);

    if (g.cover != null && typeof g.cover !== 'string') {
      errors.push(`${prefix}.cover must be a string path`);
    }
    if (g.tags != null && !Array.isArray(g.tags)) {
      errors.push(`${prefix}.tags must be an array`);
    }
    if (g.featured === true) featuredCount += 1;

    if (g.version != null) {
      if (typeof g.version !== 'string' || !g.version.trim()) {
        errors.push(`${prefix}.version must be a non-empty string`);
      } else if (!formatGameVersion(g.version)) {
        errors.push(`${prefix}.version looks invalid: ${g.version}`);
      }
    }
  });

  if (featuredCount > 1) {
    errors.push(`at most one featured game (found ${featuredCount})`);
  }

  return { ok: errors.length === 0, errors, games: data.games };
}

function parseCatalogJson(text) {
  try {
    return { ok: true, data: JSON.parse(text), error: null };
  } catch (e) {
    return { ok: false, data: null, error: String(e.message || e) };
  }
}

// Node / CommonJS export for tests (harmless in browser if module is undefined)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RECENT_KEY_DEFAULT,
    RECENT_MAX_DEFAULT,
    escapeHtml,
    formatGameVersion,
    versionProbeUrls,
    parseGameVersionFromSource,
    resolveDisplayVersion,
    allTags,
    filteredGames,
    byId,
    loadRecent,
    saveRecent,
    validateCatalog,
    parseCatalogJson,
  };
}
