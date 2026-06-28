const CurrentAffairs = (() => {
  const CACHE_KEY        = 'currentAffairsData';
  const REFRESH_INTERVAL = 5 * 60 * 60 * 1000; // 5 hours
  let refreshTimeout;

  const elements = {
    container:    null,
    refreshBtn:   null,
    lastSyncTime: null,
    searchInput:  null,
    filterSelect: null,
  };

  const state = {
    isLoading:      false,
    data:           null,
    searchQuery:    '',
    activeCategory: 'All',
  };

  // ─── Scaffold ──────────────────────────────────────────────────────────────
  const injectScaffold = () => {
    const shell = document.getElementById('ca-content');
    if (!shell) {
      console.error('Current Affairs: #ca-content not found in the DOM.');
      return false;
    }

    shell.innerHTML = `
      <div class="ca-header">
        <div class="ca-header-top">
          <div class="ca-title-row">
            <h2 class="ca-title">Current Affairs</h2>
            <span id="last-sync-time" class="ca-sync-time"></span>
          </div>
          <button id="refresh-current-affairs-btn" class="ca-refresh-btn" aria-label="Refresh current affairs">
            <svg class="ca-refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
        <div class="ca-controls">
          <div class="ca-search-wrap">
            <svg class="ca-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="ca-search"
              class="ca-search-input"
              type="search"
              placeholder="Search current affairs…"
              autocomplete="off"
              aria-label="Search current affairs"
            />
          </div>
          <select id="ca-filter" class="ca-filter-select" aria-label="Filter by category">
            <option value="All">All categories</option>
          </select>
        </div>
      </div>

      <div id="ca-fetch-error" class="ca-fetch-error" role="alert" style="display:none;">
        <span id="ca-fetch-error-msg"></span>
        <button id="ca-fetch-retry" class="ca-retry-btn">Try again</button>
      </div>

      <div id="current-affairs-container" class="ca-list" role="feed" aria-label="Current affairs articles"></div>
    `;

    injectStyles();
    return true;
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const injectStyles = () => {
    if (document.getElementById('ca-styles')) return;
    const style = document.createElement('style');
    style.id = 'ca-styles';
    style.textContent = `
      .ca-header {
        position: sticky; top: 0; z-index: 100;
        background: #fff; border-bottom: 1px solid #ebebeb;
        padding: 14px 16px 12px;
      }
      .ca-header-top {
        display: flex; align-items: center;
        justify-content: space-between; gap: 10px; margin-bottom: 12px;
      }
      .ca-title-row {
        display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;
      }
      .ca-title {
        margin: 0; font-size: 18px; font-weight: 700;
        color: #1a1a2e; letter-spacing: -0.3px;
      }
      .ca-sync-time { font-size: 11px; color: #aaa; white-space: nowrap; }

      /* Refresh button */
      .ca-refresh-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; background: #4f46e5; color: #fff;
        border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
        cursor: pointer; white-space: nowrap; flex-shrink: 0;
        transition: background 0.18s, transform 0.1s;
      }
      .ca-refresh-btn:hover:not(:disabled)  { background: #4338ca; }
      .ca-refresh-btn:active:not(:disabled) { transform: scale(0.97); }
      .ca-refresh-btn:disabled              { background: #a5b4fc; cursor: not-allowed; }
      .ca-refresh-icon { width: 14px; height: 14px; flex-shrink: 0; }
      .ca-refresh-btn.loading .ca-refresh-icon { animation: ca-spin 0.8s linear infinite; }

      /* Controls */
      .ca-controls { display: flex; gap: 8px; flex-wrap: wrap; }
      .ca-search-wrap { position: relative; flex: 1; min-width: 160px; }
      .ca-search-icon {
        position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
        width: 15px; height: 15px; color: #aaa; pointer-events: none;
      }
      .ca-search-input {
        width: 100%; padding: 8px 10px 8px 32px; border: 1px solid #e0e0e0;
        border-radius: 8px; font-size: 13px; color: #333; background: #fafafa;
        outline: none; box-sizing: border-box; transition: border-color 0.15s, background 0.15s;
      }
      .ca-search-input:focus { border-color: #4f46e5; background: #fff; }
      .ca-filter-select {
        padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 8px;
        font-size: 13px; color: #333; background: #fafafa; outline: none;
        cursor: pointer; max-width: 170px; transition: border-color 0.15s;
      }
      .ca-filter-select:focus { border-color: #4f46e5; }

      /* Error banner */
      .ca-fetch-error {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; margin: 12px 16px 0; padding: 10px 14px;
        background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
        font-size: 13px; color: #b91c1c;
      }
      .ca-retry-btn {
        padding: 5px 12px; background: #ef4444; color: #fff;
        border: none; border-radius: 6px; font-size: 12px;
        font-weight: 600; cursor: pointer; white-space: nowrap;
        flex-shrink: 0; transition: background 0.15s;
      }
      .ca-retry-btn:hover { background: #dc2626; }

      /* List */
      .ca-list { padding: 16px; }

      /* Category section */
      .ca-category-section {
        margin-bottom: 20px; background: #fff;
        border-radius: 10px; overflow: hidden;
        box-shadow: 0 1px 4px rgba(0,0,0,0.07); border: 1px solid #f0f0f0;
      }
      .ca-category-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 11px 16px; background: #fafafa; border-bottom: 1px solid #ebebeb;
      }
      .ca-category-badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 3px 10px; border-radius: 20px; font-size: 11px;
        font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #fff;
      }
      .ca-category-count { font-size: 11px; color: #aaa; font-weight: 500; }

      /* Article row */
      .ca-item {
        display: flex; gap: 14px; padding: 13px 16px;
        border-bottom: 1px solid #f5f5f5; transition: background 0.15s;
      }
      .ca-item:last-child { border-bottom: none; }
      .ca-item:hover      { background: #f9f8ff; }
      .ca-item.ca-item-link { cursor: pointer; }
      .ca-item-date {
        flex-shrink: 0; font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.4px;
        min-width: 68px; text-align: right; padding-top: 3px; line-height: 1.4;
      }
      .ca-item-body { flex: 1; min-width: 0; }
      .ca-item-title {
        margin: 0 0 5px; font-size: 14px; font-weight: 600;
        color: #1a1a2e; line-height: 1.45;
      }
      .ca-item-desc {
        margin: 0; font-size: 12px; color: #777; line-height: 1.6;
        display: -webkit-box; -webkit-line-clamp: 2;
        -webkit-box-orient: vertical; overflow: hidden;
      }
      .ca-item-source {
        display: inline-block; margin-top: 5px; font-size: 10px;
        color: #bbb; font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px;
      }

      /* Empty states */
      .ca-empty {
        text-align: center; padding: 48px 24px; color: #999;
        background: #fafafa; border-radius: 10px; border: 1px dashed #e0e0e0;
      }
      .ca-empty-icon  { font-size: 36px; margin-bottom: 12px; }
      .ca-empty-title { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: #555; }
      .ca-empty-sub   { margin: 0; font-size: 13px; }
      .ca-no-results  { text-align: center; padding: 32px 20px; color: #aaa; font-size: 14px; }

      /* Toast */
      .ca-toast {
        position: fixed; top: 20px; right: 20px; padding: 12px 18px;
        border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600;
        z-index: 99999; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        animation: ca-slide-in 0.28s cubic-bezier(0.34,1.56,0.64,1);
        max-width: 320px;
      }
      .ca-toast-success { background: #22c55e; }
      .ca-toast-error   { background: #ef4444; }
      .ca-toast-out     { animation: ca-slide-out 0.25s ease-in forwards; }

      @keyframes ca-spin      { to { transform: rotate(360deg); } }
      @keyframes ca-slide-in  { from { transform: translateX(360px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes ca-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(360px); opacity: 0; } }

      @media (prefers-reduced-motion: reduce) {
        .ca-refresh-btn.loading .ca-refresh-icon,
        .ca-toast { animation: none; }
      }
      @media (max-width: 480px) {
        .ca-header { padding: 12px 12px 10px; }
        .ca-list   { padding: 12px; }
        .ca-item   { flex-direction: column; gap: 4px; }
        .ca-item-date { text-align: left; min-width: unset; }
        .ca-filter-select { max-width: 100%; }
      }
    `;
    document.head.appendChild(style);
  };

  // ─── Element wiring ────────────────────────────────────────────────────────
  const findElements = () => {
    elements.container    = document.getElementById('current-affairs-container');
    elements.refreshBtn   = document.getElementById('refresh-current-affairs-btn');
    elements.lastSyncTime = document.getElementById('last-sync-time');
    elements.searchInput  = document.getElementById('ca-search');
    elements.filterSelect = document.getElementById('ca-filter');
    return !!(elements.container && elements.refreshBtn);
  };

  // ─── Init ──────────────────────────────────────────────────────────────────
  const init = () => {
    if (!injectScaffold()) return false;
    if (!findElements()) {
      console.error('Current Affairs: scaffold injected but elements still not found.');
      return false;
    }

    loadCachedData();
    populateCategoryFilter();

    elements.refreshBtn.addEventListener('click', handleRefresh);

    const retryBtn = document.getElementById('ca-fetch-retry');
    if (retryBtn) retryBtn.addEventListener('click', handleRefresh);

    elements.searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      render();
    });

    elements.filterSelect.addEventListener('change', e => {
      state.activeCategory = e.target.value;
      render();
    });

    scheduleAutoRefresh();
    render();

    // Auto-fetch on first load if no cached data
    if (!state.data || !state.data.items || state.data.items.length === 0) {
      console.log('Current Affairs: no cached data — auto-fetching on load…');
      handleRefresh({ preventDefault: () => {} });
    }

    return true;
  };

  // ─── Cache ─────────────────────────────────────────────────────────────────
  const loadCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) state.data = JSON.parse(cached);
    } catch {
      console.warn('Current Affairs: failed to parse cached data.');
      state.data = null;
    }
  };

  const populateCategoryFilter = () => {
    if (!elements.filterSelect || !state.data?.items?.length) return;
    const cats = ['All', ...new Set(state.data.items.map(i => i.category))].sort((a, b) =>
      a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)
    );
    elements.filterSelect.innerHTML = cats
      .map(c => `<option value="${c}"${c === state.activeCategory ? ' selected' : ''}>${c === 'All' ? 'All categories' : c}</option>`)
      .join('');
  };

  // ─── Error banner ──────────────────────────────────────────────────────────
  const setErrorBanner = (message) => {
    const banner = document.getElementById('ca-fetch-error');
    const msg    = document.getElementById('ca-fetch-error-msg');
    if (!banner) return;
    if (message) {
      if (msg) msg.textContent = message;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  };

  // ─── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = async (e) => {
    if (state.isLoading) return;
    if (e?.preventDefault) e.preventDefault();

    state.isLoading = true;
    setErrorBanner(null);

    const btn = elements.refreshBtn;
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
      btn.innerHTML = `
        <svg class="ca-refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Refreshing…
      `;
    }

    try {
      const res = await fetch('/data/current_affairs.json?t=' + Date.now());

      if (!res.ok) {
        // Give a clear hint about what's wrong
        if (res.status === 404) {
          throw new Error(
            'current_affairs.json not found. Run the update script first:\n' +
            'node scripts/update-current-affairs.mjs'
          );
        }
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const newData = await res.json();

      // Validate the shape we expect
      if (!newData || !Array.isArray(newData.items)) {
        throw new Error('current_affairs.json has an unexpected format.');
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
      state.data = newData;

      populateCategoryFilter();
      render();
      showToast(`✓ ${newData.items.length} articles loaded`, 'success');

      clearTimeout(refreshTimeout);
      scheduleAutoRefresh();

    } catch (err) {
      console.error('Current Affairs: refresh failed —', err);

      const isNetworkErr = err instanceof TypeError && err.message === 'Failed to fetch';
      const userMsg = isNetworkErr
        ? 'Could not reach the server. Check your connection.'
        : err.message;

      setErrorBanner(userMsg);

      if (state.data?.items?.length) {
        showToast('Refresh failed — showing cached data', 'error');
      }
      render(); // still render whatever is cached
    } finally {
      state.isLoading = false;
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = `
          <svg class="ca-refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        `;
      }
    }
  };

  const scheduleAutoRefresh = () => {
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      console.log('Current Affairs: auto-refreshing…');
      handleRefresh();
    }, REFRESH_INTERVAL);
  };

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `ca-toast ca-toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('ca-toast-out');
      setTimeout(() => toast.remove(), 280);
    }, 3500);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  const CATEGORY_COLORS = [
    '#4f46e5','#0ea5e9','#10b981','#f59e0b',
    '#ef4444','#8b5cf6','#ec4899','#14b8a6',
  ];
  const colorCache = {};
  let colorIdx = 0;
  const categoryColor = (cat) => {
    if (!colorCache[cat]) colorCache[cat] = CATEGORY_COLORS[colorIdx++ % CATEGORY_COLORS.length];
    return colorCache[cat];
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return dateStr; }
  };

  const updateSyncTime = () => {
    if (!elements.lastSyncTime || !state.data?.lastUpdated) return;
    const diffMs   = Date.now() - new Date(state.data.lastUpdated);
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHrs  = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    elements.lastSyncTime.textContent =
      diffMins < 1  ? 'Synced just now' :
      diffMins < 60 ? `Synced ${diffMins}m ago` :
      diffHrs  < 24 ? `Synced ${diffHrs}h ago` :
                      `Synced ${diffDays}d ago`;
  };

  const getFilteredItems = () => {
    if (!state.data?.items?.length) return [];
    return state.data.items.filter(item => {
      if (state.activeCategory !== 'All' && item.category !== state.activeCategory) return false;
      if (!state.searchQuery) return true;
      return `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(state.searchQuery);
    });
  };

  const render = () => {
    if (!elements.container) return;
    updateSyncTime();

    if (!state.data?.items?.length) {
      elements.container.innerHTML = `
        <div class="ca-empty">
          <div class="ca-empty-icon">📰</div>
          <p class="ca-empty-title">No current affairs yet</p>
          <p class="ca-empty-sub">Run the update script on your server, then tap <strong>Refresh</strong>.</p>
        </div>`;
      return;
    }

    const filtered = getFilteredItems();
    if (!filtered.length) {
      elements.container.innerHTML = `
        <div class="ca-no-results">
          No articles match <strong>"${state.searchQuery || state.activeCategory}"</strong>.
        </div>`;
      return;
    }

    // Group by category
    const byCategory = filtered.reduce((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {});

    const frag = document.createDocumentFragment();

    Object.entries(byCategory).forEach(([category, items]) => {
      const color   = categoryColor(category);
      const section = document.createElement('div');
      section.className = 'ca-category-section';

      const header = document.createElement('div');
      header.className = 'ca-category-header';
      header.innerHTML = `
        <span class="ca-category-badge" style="background:${color}">${category}</span>
        <span class="ca-category-count">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
      `;
      section.appendChild(header);

      const list = document.createElement('div');
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'ca-item' + (item.link ? ' ca-item-link' : '');

        if (item.link) {
          row.setAttribute('role', 'link');
          row.setAttribute('tabindex', '0');
          row.title = 'Open article';
          const open = () => window.open(item.link, '_blank', 'noopener,noreferrer');
          row.addEventListener('click', open);
          row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
        }

        const date = document.createElement('div');
        date.className = 'ca-item-date';
        date.style.color = color;
        date.textContent = formatDate(item.date);

        const body = document.createElement('div');
        body.className = 'ca-item-body';

        const title = document.createElement('p');
        title.className = 'ca-item-title';
        title.textContent = item.title;

        const desc = document.createElement('p');
        desc.className = 'ca-item-desc';
        desc.textContent = item.description;

        body.appendChild(title);
        body.appendChild(desc);

        if (item.source) {
          const src = document.createElement('span');
          src.className = 'ca-item-source';
          src.textContent = item.source;
          body.appendChild(src);
        }

        row.appendChild(date);
        row.appendChild(body);
        list.appendChild(row);
      });

      section.appendChild(list);
      frag.appendChild(section);
    });

    elements.container.innerHTML = '';
    elements.container.appendChild(frag);
  };

  // ─── Public API ────────────────────────────────────────────────────────────
  return { init, refresh: handleRefresh, render };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CurrentAffairs.init());
} else {
  CurrentAffairs.init();
}
