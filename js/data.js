// data.js — fetches the static JSON data files (syllabus, mock tests, current affairs)
// and caches them in memory for the session.

const Data = {
  _cache: {},

  async _load(path, cacheBust) {
    const url = cacheBust ? `${path}?t=${Date.now()}` : path;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  },

  async getSyllabus() {
    if (!this._cache.syllabus) {
      this._cache.syllabus = await this._load('data/syllabus.json');
    }
    return this._cache.syllabus;
  },

  async getMockTests() {
    if (!this._cache.mocktests) {
      this._cache.mocktests = await this._load('data/mocktests.json');
    }
    return this._cache.mocktests;
  },

  // Current affairs is re-fetched (cache-busted) so the page picks up whatever
  // the backend automation script has most recently committed.
  async getCurrentAffairs(forceRefresh) {
    if (!this._cache.currentAffairs || forceRefresh) {
      this._cache.currentAffairs = await this._load('data/current_affairs.json', true);
    }
    return this._cache.currentAffairs;
  }
};
