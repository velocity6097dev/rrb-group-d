// router.js — minimal hash-based "page" switcher for the bottom nav.

const Router = {
  routes: {},
  register(name, onShow) {
    this.routes[name] = onShow;
  },
  goTo(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const page = document.getElementById(`page-${name}`);
    const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
    if (page) page.classList.add('active');
    if (btn) btn.classList.add('active');
    window.scrollTo(0, 0);
    if (this.routes[name]) this.routes[name]();
    history.replaceState(null, '', `#${name}`);
  },
  init() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.goTo(btn.dataset.page));
    });
    const initial = (location.hash || '#home').replace('#', '');
    this.goTo(this.routes[initial] !== undefined || document.getElementById(`page-${initial}`) ? initial : 'home');
  }
};
