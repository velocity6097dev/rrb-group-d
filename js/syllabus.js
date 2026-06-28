// syllabus.js — renders the combined NTPC + Group D syllabus with completion checkboxes.

const Syllabus = {
  data: null,

  async render() {
    const container = document.getElementById('syllabus-content');
    if (!this.data) this.data = await Data.getSyllabus();
    const completed = Storage.getCompletedTopics();

    let totalTopics = 0, totalDone = 0;
    this.data.subjects.forEach(s => s.topics.forEach(t => {
      totalTopics++;
      if (completed.has(t.id)) totalDone++;
    }));

    const overallPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

    let html = `
      <div class="card">
        <h2>Your syllabus — NTPC &amp; Group D combined</h2>
        <p class="muted">${totalDone} of ${totalTopics} topics marked complete (${overallPct}%).</p>
        <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${overallPct}%"></div></div>
      </div>
    `;

    this.data.subjects.forEach(subject => {
      const subDone = subject.topics.filter(t => completed.has(t.id)).length;
      html += `
        <details class="card subject-card" open>
          <summary>
            <span>${subject.name} <span class="muted">(${subDone}/${subject.topics.length})</span></span>
            <span class="chev">›</span>
          </summary>
          <div class="topic-list">
            ${subject.topics.map(t => this.topicRow(t, completed.has(t.id))).join('')}
          </div>
        </details>
      `;
    });

    container.innerHTML = html;
    this.wireEvents(container);
  },

  topicRow(topic, done) {
    return `
      <div class="topic-row ${done ? 'done' : ''}" data-topic-id="${topic.id}">
        <input type="checkbox" ${done ? 'checked' : ''} data-action="toggle" aria-label="Mark ${topic.name} complete">
        <div class="topic-body">
          <div class="topic-name" data-action="expand">${topic.name}</div>
          <div class="topic-notes">${topic.notes}</div>
        </div>
      </div>
    `;
  },

  wireEvents(container) {
    container.querySelectorAll('.topic-row').forEach(row => {
      const id = row.dataset.topicId;
      row.querySelector('[data-action="toggle"]').addEventListener('change', () => {
        Storage.toggleTopic(id);
        row.classList.toggle('done');
        this.refreshCounts(container);
      });
      row.querySelector('[data-action="expand"]').addEventListener('click', () => {
        row.classList.toggle('expanded');
      });
    });
  },

  refreshCounts(container) {
    // Lightweight re-render of just the counts/progress bars without losing expanded state.
    const completed = Storage.getCompletedTopics();
    let totalTopics = 0, totalDone = 0;
    this.data.subjects.forEach(s => s.topics.forEach(t => {
      totalTopics++;
      if (completed.has(t.id)) totalDone++;
    }));
    const overallPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;
    const headerCard = container.querySelector('.card .progress-bar-inner');
    if (headerCard) headerCard.style.width = `${overallPct}%`;
    const headerText = container.querySelector('.card .muted');
    if (headerText) headerText.textContent = `${totalDone} of ${totalTopics} topics marked complete (${overallPct}%).`;

    container.querySelectorAll('.subject-card').forEach((card, i) => {
      const subject = this.data.subjects[i];
      const subDone = subject.topics.filter(t => completed.has(t.id)).length;
      const span = card.querySelector('summary .muted');
      if (span) span.textContent = `(${subDone}/${subject.topics.length})`;
    });
  }
};
