// currentaffairs.js — renders the current affairs archive and handles the
// "auto-update" behaviour: re-fetches data/current_affairs.json (which the
// backend automation script commits to every 5 hours) on page load, and
// again on a 5-hour timer if the tab is left open.

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

const CurrentAffairs = {
  data: null,
  activeTab: 'recent', // 'recent' (month-wise 2024-2026) or 'archive' (year-wise 2000-2023)
  refreshTimer: null,

  async render(forceRefresh) {
    const container = document.getElementById('ca-content');
    this.data = await Data.getCurrentAffairs(forceRefresh);
    Storage.setLastCaCheck(new Date().toISOString());
    this.armAutoRefresh();

    container.innerHTML = `
      ${this.syncBadge()}
      <div class="ca-tabs">
        <button class="ca-tab ${this.activeTab === 'recent' ? 'active' : ''}" data-tab="recent">2024 – 2026 (month-wise)</button>
        <button class="ca-tab ${this.activeTab === 'archive' ? 'active' : ''}" data-tab="archive">2000 – 2023 (year-wise)</button>
      </div>
      <input type="search" id="ca-search" class="ca-search" placeholder="Search current affairs…" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;margin-bottom:14px;font-size:0.9rem;">
      <div id="ca-list"></div>
    `;

    container.querySelectorAll('.ca-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        container.querySelectorAll('.ca-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderList('');
      });
    });
    document.getElementById('ca-search').addEventListener('input', (e) => this.renderList(e.target.value.trim().toLowerCase()));

    this.renderList('');
  },

  syncBadge() {
    const last = this.data.lastUpdated ? new Date(this.data.lastUpdated) : null;
    const ageMs = last ? Date.now() - last.getTime() : Infinity;
    const stale = ageMs > FIVE_HOURS_MS;
    const lastStr = last ? last.toLocaleString() : 'unknown';
    return `
      <div class="sync-badge">
        <span class="sync-dot ${stale ? 'stale' : ''}"></span>
        <span>Last synced: ${lastStr}. Syncs automatically every 5 hours via the backend, plus on page load.</span>
        <button class="btn ghost" id="ca-refresh-btn" style="margin-left:auto;">Refresh now</button>
      </div>
    `;
  },

  armAutoRefresh() {
    clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      if (document.getElementById('page-current-affairs')?.classList.contains('active')) {
        this.render(true);
      }
    }, FIVE_HOURS_MS);
    // Wire the manual refresh button each render.
    setTimeout(() => {
      const btn = document.getElementById('ca-refresh-btn');
      if (btn) btn.addEventListener('click', () => this.render(true));
    }, 0);
  },

  renderList(query) {
    const list = document.getElementById('ca-list');
    if (!list) return;
    const source = this.activeTab === 'recent' ? this.data.monthly : this.data.yearly;
    const entries = Object.entries(source)
      .sort((a, b) => {
        if (a[0] === 'awards') return 1;   // always show the awards block last
        if (b[0] === 'awards') return -1;
        return b[0].localeCompare(a[0]);   // newest first
      });

    let html = '';
    entries.forEach(([key, items]) => {
      const filtered = query ? items.filter(i => i.toLowerCase().includes(query)) : items;
      if (!filtered.length) return;
      html += `
        <div class="ca-month-block">
          <h3>${this.formatKey(key)}</h3>
          <ul>${filtered.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      `;
    });

    list.innerHTML = html || `<div class="empty-state"><p>No matching entries found.</p></div>`;
  },

  formatKey(key) {
    if (key === 'awards') return 'Awards & Honours (2024–2026)';
    if (/^\d{4}-\d{2}$/.test(key)) {
      const [y, m] = key.split('-');
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${months[parseInt(m, 10) - 1]} ${y}`;
    }
    return key; // plain year
  }
};
