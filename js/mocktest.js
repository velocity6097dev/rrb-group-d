// mocktest.js — mock test list, timed question flow, auto-grading and review.

const MockTest = {
  data: null,
  current: null,     // the test currently being taken
  answers: [],        // selected option index per question, or null
  timerInterval: null,
  secondsLeft: 0,
  submitted: false,

  async render() {
    const container = document.getElementById('mocktest-content');
    if (!this.data) this.data = await Data.getMockTests();
    const attempts = Storage.getAttempts();

    container.innerHTML = `
      <div class="card">
        <h2>Mock tests</h2>
        <p class="muted">Timed, auto-graded tests with explanations. This is a starter set — more tests will be added over time.</p>
      </div>
      ${this.data.tests.map(t => this.testCard(t, attempts)).join('')}
    `;

    container.querySelectorAll('[data-action="start-test"]').forEach(btn => {
      btn.addEventListener('click', () => this.startTest(btn.dataset.testId));
    });
  },

  testCard(test, attempts) {
    const best = attempts.filter(a => a.testId === test.id).sort((a, b) => b.score - a.score)[0];
    return `
      <div class="card test-card">
        <div>
          <h3>${test.title}</h3>
          <p class="muted">${test.questions.length} questions · ${test.durationMinutes} min${best ? ` · Best score: ${best.score}/${best.total}` : ''}</p>
        </div>
        <button class="btn" data-action="start-test" data-test-id="${test.id}">Start</button>
      </div>
    `;
  },

  startTest(testId) {
    this.current = this.data.tests.find(t => t.id === testId);
    this.answers = new Array(this.current.questions.length).fill(null);
    this.submitted = false;
    this.secondsLeft = this.current.durationMinutes * 60;
    this.renderTestRunner();
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tick(), 1000);
  },

  tick() {
    this.secondsLeft--;
    const el = document.getElementById('test-timer');
    if (el) el.textContent = this.formatTime(this.secondsLeft);
    if (this.secondsLeft <= 0) {
      clearInterval(this.timerInterval);
      this.submit();
    }
  },

  formatTime(s) {
    const m = Math.max(0, Math.floor(s / 60));
    const sec = Math.max(0, s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  },

  renderTestRunner() {
    const container = document.getElementById('mocktest-content');
    container.innerHTML = `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
        <h2>${this.current.title}</h2>
        <span id="test-timer" class="timer-display mono">${this.formatTime(this.secondsLeft)}</span>
      </div>
      <div id="question-list">
        ${this.current.questions.map((q, i) => this.questionBlock(q, i)).join('')}
      </div>
      <div class="card">
        <button class="btn" id="submit-test-btn">Submit test</button>
        <button class="btn secondary" id="exit-test-btn">Exit without submitting</button>
      </div>
    `;
    this.wireRunnerEvents(container);
  },

  questionBlock(q, i) {
    return `
      <div class="card question-block" data-qindex="${i}">
        <div class="qnum">Question ${i + 1} · ${q.subject}</div>
        <p>${q.question}</p>
        <div class="options">
          ${q.options.map((opt, oi) => `
            <button class="option-btn" data-action="select" data-qi="${i}" data-oi="${oi}">${opt}</button>
          `).join('')}
        </div>
        <div class="explain-box" style="display:none;"></div>
      </div>
    `;
  },

  wireRunnerEvents(container) {
    container.querySelectorAll('[data-action="select"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.submitted) return;
        const qi = parseInt(btn.dataset.qi, 10);
        const oi = parseInt(btn.dataset.oi, 10);
        this.answers[qi] = oi;
        const block = container.querySelector(`.question-block[data-qindex="${qi}"]`);
        block.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    document.getElementById('submit-test-btn').addEventListener('click', () => {
      clearInterval(this.timerInterval);
      this.submit();
    });
    document.getElementById('exit-test-btn').addEventListener('click', () => {
      clearInterval(this.timerInterval);
      this.render();
    });
  },

  submit() {
    this.submitted = true;
    let score = 0;
    const container = document.getElementById('mocktest-content');
    this.current.questions.forEach((q, i) => {
      const block = container.querySelector(`.question-block[data-qindex="${i}"]`);
      const buttons = block.querySelectorAll('.option-btn');
      const selected = this.answers[i];
      if (selected === q.correctIndex) score++;
      buttons.forEach((b, oi) => {
        b.disabled = true;
        if (oi === q.correctIndex) b.classList.add('correct');
        else if (oi === selected) b.classList.add('incorrect');
      });
      const explainBox = block.querySelector('.explain-box');
      explainBox.style.display = 'block';
      explainBox.textContent = q.explanation;
    });

    Storage.saveAttempt({
      testId: this.current.id,
      title: this.current.title,
      date: new Date().toISOString(),
      score,
      total: this.current.questions.length
    });

    const timerEl = document.getElementById('test-timer');
    if (timerEl) timerEl.textContent = 'Done';

    const submitBtn = document.getElementById('submit-test-btn');
    if (submitBtn) submitBtn.remove();
    const exitBtn = document.getElementById('exit-test-btn');
    if (exitBtn) exitBtn.textContent = 'Back to mock tests';

    const resultCard = document.createElement('div');
    resultCard.className = 'card';
    resultCard.innerHTML = `<h2>Score: ${score} / ${this.current.questions.length}</h2><p class="muted">Review the highlighted answers and explanations below for each question.</p>`;
    document.getElementById('question-list').before(resultCard);
    window.scrollTo(0, 0);
  }
};
