/* Arcade Hub — catalog launcher */
(() => {
  'use strict';

  const RECENT_KEY = 'arcade-hub-recent';
  const RECENT_MAX = 6;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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

  // ---------- utils ----------
  function toast(msg, ms = 2200) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add('hidden'), ms);
  }

  function loadRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter(id => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  function saveRecent(id) {
    const next = [id, ...loadRecent().filter(x => x !== id)].slice(0, RECENT_MAX);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); }
    catch { /* private mode etc. */ }
    return next;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function byId(id) {
    return games.find(g => g.id === id);
  }

  // ---------- render ----------
  function allTags() {
    const set = new Set();
    for (const g of games) {
      for (const t of g.tags || []) set.add(t);
    }
    return ['All', ...[...set].sort((a, b) => a.localeCompare(b))];
  }

  function filteredGames() {
    if (activeFilter === 'All') return games;
    return games.filter(g => (g.tags || []).includes(activeFilter));
  }

  function renderFilters() {
    const tags = allTags();
    els.filterBar.innerHTML = tags.map(t =>
      `<button type="button" class="filter-chip${t === activeFilter ? ' active' : ''}" data-filter="${escapeHtml(t)}" role="tab" aria-selected="${t === activeFilter}">${escapeHtml(t)}</button>`
    ).join('');
  }

  function renderFeatured() {
    const featured = games.find(g => g.featured) || games[0];
    if (!featured) {
      els.featured.classList.add('hidden');
      return;
    }
    els.featured.classList.remove('hidden');
    els.featured.tabIndex = 0;
    els.featured.setAttribute('role', 'button');
    els.featured.setAttribute('aria-label', `Featured: ${featured.title}`);
    els.featured.dataset.id = featured.id;
    els.featured.innerHTML = `
      <div class="featured-bg" style="background-image:url('${escapeHtml(featured.cover || '')}')"></div>
      <div class="featured-shade"></div>
      <div class="featured-content">
        <span class="badge">Featured</span>
        <h3>${escapeHtml(featured.title)}</h3>
        <p>${escapeHtml(featured.subtitle || featured.description || '')}</p>
        <button type="button" class="featured-cta" data-play="${escapeHtml(featured.id)}">▶  Play now</button>
      </div>
    `;
  }

  function cardHtml(g, index) {
    const tags = (g.tags || []).slice(0, 3)
      .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    const delay = Math.min(index * 40, 280);
    return `
      <button type="button" class="game-card" role="listitem" data-id="${escapeHtml(g.id)}"
        style="--card-accent:${escapeHtml(g.accent || '#3de7ff')}; animation-delay:${delay}ms"
        aria-label="${escapeHtml(g.title)}">
        <div class="card-cover" style="background-image:url('${escapeHtml(g.cover || '')}')">
          <span class="card-play" aria-hidden="true">▶</span>
        </div>
        <div class="card-meta">
          <h3>${escapeHtml(g.title)}</h3>
          <p>${escapeHtml(g.subtitle || '')}</p>
          <div class="card-tags">${tags}</div>
        </div>
      </button>
    `;
  }

  function renderGrid() {
    const list = filteredGames();
    els.gameCount.textContent = `${games.length} game${games.length === 1 ? '' : 's'}`;
    els.gameGrid.innerHTML = list.map((g, i) => cardHtml(g, i)).join('');
    els.emptyState.classList.toggle('hidden', list.length > 0);
  }

  function renderRecent() {
    const ids = loadRecent().filter(id => byId(id));
    if (!ids.length) {
      els.recentSection.classList.add('hidden');
      return;
    }
    els.recentSection.classList.remove('hidden');
    els.recentRow.innerHTML = ids.map(id => {
      const g = byId(id);
      return `
        <button type="button" class="recent-chip" data-id="${escapeHtml(g.id)}" aria-label="Play ${escapeHtml(g.title)}">
          <span class="recent-thumb" style="background-image:url('${escapeHtml(g.cover || '')}')"></span>
          ${escapeHtml(g.title)}
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
      .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    els.sheetTitle.textContent = game.title;
    els.sheetSub.textContent = game.subtitle || '';
    els.sheetDesc.textContent = game.description || '';
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

  // ---------- play ----------
  function playGame(game, { newTab = false } = {}) {
    if (!game || !game.url) {
      toast('This game has no URL yet.');
      return;
    }
    saveRecent(game.id);
    renderRecent();
    toast(`Launching ${game.title}…`);
    // Brief pause so the toast is visible, then navigate.
    setTimeout(() => {
      if (newTab) {
        window.open(game.url, '_blank', 'noopener');
      } else {
        window.location.href = game.url;
      }
    }, 180);
  }

  // ---------- events ----------
  function onClick(e) {
    const t = e.target;

    // Filters
    const chip = t.closest('[data-filter]');
    if (chip && els.filterBar.contains(chip)) {
      activeFilter = chip.dataset.filter;
      renderFilters();
      renderGrid();
      return;
    }

    // Featured play CTA
    const playNow = t.closest('[data-play]');
    if (playNow) {
      e.stopPropagation();
      const g = byId(playNow.dataset.play);
      if (g) playGame(g);
      return;
    }

    // Featured card body → sheet
    if (t.closest('#featured') && !t.closest('[data-play]')) {
      const g = byId(els.featured.dataset.id);
      if (g) openSheet(g);
      return;
    }

    // Game cards / recent
    const card = t.closest('[data-id]');
    if (card && (els.gameGrid.contains(card) || els.recentRow.contains(card))) {
      const g = byId(card.dataset.id);
      if (!g) return;
      // Recent chips launch immediately; library cards open detail sheet.
      if (els.recentRow.contains(card)) playGame(g);
      else openSheet(g);
      return;
    }

    // Sheet controls
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
      const g = byId(els.featured.dataset.id);
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

    // iOS hint: standalone check
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
    if (isIos && !isStandalone) {
      els.installBtn.classList.remove('hidden');
      els.installBtn.title = 'Share → Add to Home Screen';
    }
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed', err);
    });
  }

  // ---------- boot ----------
  async function boot() {
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
