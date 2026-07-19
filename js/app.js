/* Arcade Hub — catalog launcher */
(() => {
  'use strict';

  const RECENT_KEY = (typeof RECENT_KEY_DEFAULT !== 'undefined')
    ? RECENT_KEY_DEFAULT
    : 'arcade-hub-recent';
  const RECENT_MAX = (typeof RECENT_MAX_DEFAULT !== 'undefined')
    ? RECENT_MAX_DEFAULT
    : 6;

  const $ = (sel, root = document) => root.querySelector(sel);

  const els = {
    tagline: $('#tagline'),
    featured: $('#featured'),
    gameGrid: $('#gameGrid'),
    gameCount: $('#gameCount'),
    filterBar: $('#filterBar'),
    emptyState: $('#emptyState'),
    recentSection: $('#recentSection'),
    recentRow: $('#recentRow'),
    installBtn: $('#installBtn'),
    sheet: $('#sheet'),
    sheetBackdrop: $('#sheetBackdrop'),
    sheetClose: $('#sheetClose'),
    sheetCover: $('#sheetCover'),
    sheetTags: $('#sheetTags'),
    sheetTitle: $('#sheetTitle'),
    sheetSub: $('#sheetSub'),
    sheetVersion: $('#sheetVersion'),
    sheetDesc: $('#sheetDesc'),
    playBtn: $('#playBtn'),
    openNewTab: $('#openNewTab'),
    toast: $('#toast'),
  };

  /** @type {{ id: string, title: string, subtitle?: string, description?: string, url: string, cover?: string, accent?: string, tags?: string[], featured?: boolean }[]} */
  let games = [];
  let activeFilter = 'All';
  let activeGame = null;
  let deferredPrompt = null;
  let toastTimer = 0;

  // Prefer shared helpers from catalog.js; fall back if script order breaks.
  const _escapeHtml = typeof escapeHtml === 'function'
    ? escapeHtml
    : (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const _formatGameVersion = typeof formatGameVersion === 'function'
    ? formatGameVersion
    : (v) => {
      if (v == null) return '';
      const s = String(v).trim();
      if (!s) return '';
      return s.charAt(0) === 'v' || s.charAt(0) === 'V' ? s : `v${s}`;
    };
  const _allTags = typeof allTags === 'function'
    ? () => allTags(games)
    : () => {
      const set = new Set();
      for (const g of games) for (const t of g.tags || []) set.add(t);
      return ['All', ...[...set].sort((a, b) => a.localeCompare(b))];
    };
  const _filteredGames = typeof filteredGames === 'function'
    ? () => filteredGames(games, activeFilter)
    : () => activeFilter === 'All' ? games : games.filter(g => (g.tags || []).includes(activeFilter));
  const _byId = typeof byId === 'function'
    ? (id) => byId(games, id)
    : (id) => games.find(g => g.id === id);
  const _loadRecent = typeof loadRecent === 'function'
    ? () => loadRecent(localStorage, RECENT_KEY)
    : () => {
      try {
        const raw = localStorage.getItem(RECENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter(id => typeof id === 'string') : [];
      } catch { return []; }
    };
  const _saveRecent = typeof saveRecent === 'function'
    ? (id) => saveRecent(localStorage, id, { key: RECENT_KEY, max: RECENT_MAX })
    : (id) => {
      const next = [id, ..._loadRecent().filter(x => x !== id)].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    };

  // ---------- utils ----------
  function toast(msg, ms = 2200) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), ms);
  }

  // ---------- render ----------
  function renderFilters() {
    const tags = _allTags();
    els.filterBar.innerHTML = tags.map(t =>
      `<button type="button" class="filter-chip${t === activeFilter ? ' active' : ''}" data-filter="${_escapeHtml(t)}" role="tab" aria-selected="${t === activeFilter}">${_escapeHtml(t)}</button>`
    ).join('');
  }

  function renderFeatured() {
    const featured = games.find(g => g.featured) || games[0];
    if (!featured) {
      els.featured.classList.add('hidden');
      return;
    }
    const ver = _formatGameVersion(featured.version);
    const verBadge = ver
      ? `<span class="game-version featured-version" title="Game version">${_escapeHtml(ver)}</span>`
      : '';
    els.featured.classList.remove('hidden');
    els.featured.tabIndex = 0;
    els.featured.setAttribute('role', 'button');
    els.featured.setAttribute(
      'aria-label',
      ver ? `Featured: ${featured.title} ${ver}` : `Featured: ${featured.title}`,
    );
    els.featured.dataset.id = featured.id;
    els.featured.innerHTML = `
      <div class="featured-bg" style="background-image:url('${_escapeHtml(featured.cover || '')}')"></div>
      <div class="featured-shade"></div>
      <div class="featured-content">
        <div class="featured-badges">
          <span class="badge">Featured</span>
          ${verBadge}
        </div>
        <h3>${_escapeHtml(featured.title)}</h3>
        <p>${_escapeHtml(featured.subtitle || featured.description || '')}</p>
        <button type="button" class="featured-cta" data-play="${_escapeHtml(featured.id)}">▶  Play now</button>
      </div>
    `;
  }

  function cardHtml(g, index) {
    const tags = (g.tags || []).slice(0, 3)
      .map(t => `<span class="tag">${_escapeHtml(t)}</span>`).join('');
    const ver = _formatGameVersion(g.version);
    const verBadge = ver
      ? `<span class="game-version card-version" title="Game version">${_escapeHtml(ver)}</span>`
      : '';
    const delay = Math.min(index * 40, 280);
    const aria = ver
      ? `${g.title}, version ${ver}`
      : g.title;
    return `
      <button type="button" class="game-card" role="listitem" data-id="${_escapeHtml(g.id)}"
        style="--card-accent:${_escapeHtml(g.accent || '#3de7ff')}; animation-delay:${delay}ms"
        aria-label="${_escapeHtml(aria)}">
        <div class="card-cover" style="background-image:url('${_escapeHtml(g.cover || '')}')">
          ${verBadge}
          <span class="card-play" aria-hidden="true">▶</span>
        </div>
        <div class="card-meta">
          <h3>${_escapeHtml(g.title)}</h3>
          <p>${_escapeHtml(g.subtitle || '')}</p>
          <div class="card-tags">${tags}</div>
        </div>
      </button>
    `;
  }

  function renderGrid() {
    const list = _filteredGames();
    els.gameCount.textContent = `${games.length} game${games.length === 1 ? '' : 's'}`;
    els.gameGrid.innerHTML = list.map((g, i) => cardHtml(g, i)).join('');
    els.emptyState.classList.toggle('hidden', list.length > 0);
  }

  function renderRecent() {
    const ids = _loadRecent().filter(id => _byId(id));
    if (!ids.length) {
      els.recentSection.classList.add('hidden');
      return;
    }
    els.recentSection.classList.remove('hidden');
    els.recentRow.innerHTML = ids.map(id => {
      const g = _byId(id);
      return `
        <button type="button" class="recent-chip" data-id="${_escapeHtml(g.id)}" aria-label="Play ${_escapeHtml(g.title)}">
          <span class="recent-thumb" style="background-image:url('${_escapeHtml(g.cover || '')}')"></span>
          ${_escapeHtml(g.title)}
        </button>
      `;
    }).join('');
  }

  function renderAll() {
    renderFeatured();
    renderFilters();
    renderGrid();
    renderRecent();
  }

  // ---------- sheet ----------
  function openSheet(game) {
    activeGame = game;
    els.sheetCover.style.backgroundImage = game.cover ? `url('${game.cover}')` : '';
    els.sheetTags.innerHTML = (game.tags || [])
      .map(t => `<span class="tag">${_escapeHtml(t)}</span>`).join('');
    els.sheetTitle.textContent = game.title;
    els.sheetSub.textContent = game.subtitle || '';
    els.sheetDesc.textContent = game.description || '';
    const ver = _formatGameVersion(game.version);
    if (els.sheetVersion) {
      if (ver) {
        els.sheetVersion.textContent = ver;
        els.sheetVersion.classList.remove('hidden');
      } else {
        els.sheetVersion.textContent = '';
        els.sheetVersion.classList.add('hidden');
      }
    }
    els.playBtn.style.setProperty('--btn-accent', game.accent || '#58d68d');
    els.playBtn.dataset.accent = '1';
    els.openNewTab.href = game.url;
    els.sheet.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    els.sheetClose.focus();
  }

  function closeSheet() {
    els.sheet.classList.add('hidden');
    document.body.style.overflow = '';
    activeGame = null;
  }

  // ---------- play (links out — games are NOT bundled) ----------
  function playGame(game, { newTab = false } = {}) {
    if (!game || !game.url) {
      toast('This game has no URL yet.');
      return false;
    }
    _saveRecent(game.id);
    renderRecent();
    toast(`Launching ${game.title}…`);
    setTimeout(() => {
      if (newTab) {
        window.open(game.url, '_blank', 'noopener');
      } else {
        window.location.href = game.url;
      }
    }, 180);
    return true;
  }

  // ---------- events ----------
  function onClick(e) {
    const t = e.target;

    const chip = t.closest('[data-filter]');
    if (chip && els.filterBar.contains(chip)) {
      activeFilter = chip.dataset.filter;
      renderFilters();
      renderGrid();
      return;
    }

    const playNow = t.closest('[data-play]');
    if (playNow) {
      e.stopPropagation();
      const g = _byId(playNow.dataset.play);
      if (g) playGame(g);
      return;
    }

    if (t.closest('#featured') && !t.closest('[data-play]')) {
      const g = _byId(els.featured.dataset.id);
      if (g) openSheet(g);
      return;
    }

    const card = t.closest('[data-id]');
    if (card && (els.gameGrid.contains(card) || els.recentRow.contains(card))) {
      const g = _byId(card.dataset.id);
      if (!g) return;
      if (els.recentRow.contains(card)) playGame(g);
      else openSheet(g);
      return;
    }

    if (t === els.sheetClose || t === els.sheetBackdrop) {
      closeSheet();
      return;
    }
    if (t === els.playBtn && activeGame) {
      playGame(activeGame);
      return;
    }
    if (t === els.installBtn) {
      promptInstall();
    }
  }

  function onKey(e) {
    if (e.key === 'Escape' && !els.sheet.classList.contains('hidden')) {
      closeSheet();
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === els.featured) {
      e.preventDefault();
      const g = _byId(els.featured.dataset.id);
      if (g) openSheet(g);
    }
  }

  // ---------- PWA install ----------
  function promptInstall() {
    if (!deferredPrompt) {
      toast('Use your browser menu → Add to Home Screen');
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') toast('Arcade Hub installed!');
      deferredPrompt = null;
      els.installBtn.classList.add('hidden');
    });
  }

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      els.installBtn.classList.remove('hidden');
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      els.installBtn.classList.add('hidden');
      toast('Installed on your home screen');
    });

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
    if (isIos && !isStandalone) {
      els.installBtn.classList.remove('hidden');
      els.installBtn.title = 'Share → Add to Home Screen';
    }
  }

  // ---------- version UI ----------
  function applyVersionLabels() {
    const name = (typeof HUB_NAME !== 'undefined' ? HUB_NAME : 'Arcade Hub');
    const label = (typeof HUB_VERSION_LABEL !== 'undefined' ? HUB_VERSION_LABEL : '');
    const full = label ? (name + ' ' + label) : name;
    const tag = document.getElementById('versionTag');
    const line = document.getElementById('versionLine');
    if (tag) tag.textContent = full;
    if (line) line.textContent = full;
  }

  // ---------- PWA + auto-update (same pattern as VoidRush / hole-game) ----------
  function safeReloadForUpdate() {
    if (window.__reloaded) return;
    window.__reloaded = true;
    location.reload();
  }

  function activateWaitingWorker(reg) {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  function watchInstallingWorker(reg) {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (!(location.protocol === 'https:' || location.hostname === 'localhost' ||
          location.hostname === '127.0.0.1')) return;

    navigator.serviceWorker.register('./sw.js').then(reg => {
      activateWaitingWorker(reg);
      if (reg.installing) watchInstallingWorker(reg);
      reg.addEventListener('updatefound', () => watchInstallingWorker(reg));

      const checkForUpdate = () => { reg.update().catch(() => {}); };
      checkForUpdate();
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkForUpdate();
      });
      window.addEventListener('focus', checkForUpdate);
      setInterval(checkForUpdate, 60 * 1000);

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        safeReloadForUpdate();
      });
    }).catch(err => console.warn('[sw] register failed', err));

    function checkRemoteVersion() {
      fetch('js/config.js', { cache: 'no-store' })
        .then(r => r.ok ? r.text() : '')
        .then(text => {
          const m = text.match(/(?:HUB_VERSION|GAME_VERSION)\s*=\s*['"]([^'"]+)['"]/);
          const current = (typeof HUB_VERSION !== 'undefined' ? HUB_VERSION : GAME_VERSION);
          if (m && m[1] && m[1] !== current) safeReloadForUpdate();
        })
        .catch(() => {});
    }
    checkRemoteVersion();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkRemoteVersion();
    });
    setInterval(checkRemoteVersion, 2 * 60 * 1000);
  }

  // ---------- boot ----------
  async function boot() {
    applyVersionLabels();
    setupInstall();
    registerSW();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    els.openNewTab.addEventListener('click', e => {
      if (!activeGame) return;
      e.preventDefault();
      playGame(activeGame, { newTab: true });
    });

    try {
      const res = await fetch('./games.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof validateCatalog === 'function') {
        const v = validateCatalog(data);
        if (!v.ok) console.warn('[hub] catalog issues:', v.errors);
      }
      games = Array.isArray(data.games) ? data.games : [];
      if (data.hub?.tagline) els.tagline.textContent = data.hub.tagline;
      if (data.hub?.name) document.title = data.hub.name;
    } catch (err) {
      console.error(err);
      toast('Could not load games catalog');
      games = [];
    }

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
