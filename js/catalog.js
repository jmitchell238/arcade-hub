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
    allTags,
    filteredGames,
    byId,
    loadRecent,
    saveRecent,
    validateCatalog,
    parseCatalogJson,
  };
}
