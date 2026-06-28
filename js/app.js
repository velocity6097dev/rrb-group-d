// app.js — home page + app bootstrap. Wires up the router to each page module.

const Home = {
  async render() {
    const container = document.getElementById('home-content');
    const syllabus = await Data.getSyllabus();
    const completed = Storage.getCompletedTopics();
    const attempts = Storage.getAttempts();

    let totalTopics = 0, totalDone = 0;
    syllabus.subjects.forEach(s => s.topics.forEach(t => {
      totalTopics++;
      if (completed.has(t.id)) totalDone++;
    }));
    const pct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

    container.innerHTML = `
      <div class="card">
        <h2>Welcome aboard 🚆</h2>
        <p class="muted">Your prep, end to end — syllabus, mock tests, current affairs and progress, all in one place for RRB NTPC &amp; Group D.</p>
        <div class="progress-bar-outer" style="margin-top:10px;"><div class="progress-bar-inner" style="width:${pct}%"></div></div>
        <p class="muted" style="margin-top:6px;">${pct}% of your syllabus covered so far.</p>
      </div>
      <div class="card">
        <h3>Jump back in</h3>
        <div class="btn-row">
          <button class="btn" data-go="syllabus">Continue syllabus</button>
          <button class="btn secondary" data-go="mock-tests">Take a mock test</button>
          <button class="btn secondary" data-go="current-affairs">Today's current affairs</button>
        </div>
      </div>
      <div class="card">
        <h3>Quick stats</h3>
        <div class="stat-grid">
          <div class="stat-box"><div class="num">${totalDone}/${totalTopics}</div><div class="label">Topics done</div></div>
          <div class="stat-box"><div class="num">${attempts.length}</div><div class="label">Tests taken</div></div>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', () => Router.goTo(btn.dataset.go));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Router.register('home', () => Home.render());
  Router.register('syllabus', () => Syllabus.render());
  Router.register('current-affairs', () => CurrentAffairs.render());
  Router.register('mock-tests', () => MockTest.render());
  Router.register('progress', () => Progress.render());
  Router.init();
});
