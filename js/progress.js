// progress.js — dashboard combining syllabus completion and mock test history.

const Progress = {
  async render() {
    const container = document.getElementById('progress-content');
    const syllabus = await Data.getSyllabus();
    const completed = Storage.getCompletedTopics();
    const attempts = Storage.getAttempts();

    let totalTopics = 0, totalDone = 0;
    syllabus.subjects.forEach(s => s.topics.forEach(t => {
      totalTopics++;
      if (completed.has(t.id)) totalDone++;
    }));

    const testsTaken = attempts.length;
    const avgPct = testsTaken
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / testsTaken)
      : 0;
    const bestAttempt = testsTaken
      ? attempts.reduce((best, a) => (a.score / a.total > best.score / best.total ? a : best), attempts[0])
      : null;

    container.innerHTML = `
      <div class="card">
        <h2>Your progress</h2>
        <div class="stat-grid">
          <div class="stat-box"><div class="num">${totalDone}/${totalTopics}</div><div class="label">Topics done</div></div>
          <div class="stat-box"><div class="num">${testsTaken}</div><div class="label">Tests taken</div></div>
          <div class="stat-box"><div class="num">${avgPct}%</div><div class="label">Avg. score</div></div>
          <div class="stat-box"><div class="num">${bestAttempt ? Math.round((bestAttempt.score / bestAttempt.total) * 100) : 0}%</div><div class="label">Best score</div></div>
        </div>
      </div>

      <div class="card">
        <h3>Syllabus completion by subject</h3>
        ${syllabus.subjects.map(s => {
          const done = s.topics.filter(t => completed.has(t.id)).length;
          const pct = Math.round((done / s.topics.length) * 100);
          return `
            <div class="bar-row">
              <span class="bar-label">${s.name}</span>
              <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${pct}%"></div></div>
              <span class="bar-pct">${pct}%</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card">
        <h3>Mock test history</h3>
        ${attempts.length ? `
          <div class="track">
            ${attempts.slice(-12).map(a => {
              const pct = (a.score / a.total) * 100;
              const cls = pct >= 70 ? 'done' : pct >= 40 ? 'partial' : '';
              return `<div class="track-stop ${cls}" title="${a.title}: ${a.score}/${a.total} on ${new Date(a.date).toLocaleDateString()}"></div>`;
            }).join('')}
          </div>
          <table style="width:100%;font-size:0.85rem;border-collapse:collapse;margin-top:8px;">
            ${attempts.slice().reverse().slice(0, 8).map(a => `
              <tr style="border-top:1px solid var(--line);">
                <td style="padding:6px 4px;">${a.title}</td>
                <td style="padding:6px 4px;" class="muted">${new Date(a.date).toLocaleDateString()}</td>
                <td style="padding:6px 4px;text-align:right;font-family:'JetBrains Mono',monospace;">${a.score}/${a.total}</td>
              </tr>
            `).join('')}
          </table>
        ` : `
          <div class="empty-state"><p>No mock tests taken yet. Head to the Mock Tests tab to get started.</p></div>
        `}
      </div>
    `;
  }
};
