# RRB Prep — NTPC & Group D Exam Companion

A complete, self-contained exam-prep website: combined syllabus with revision notes
and completion tracking, timed mock tests with auto-grading, a progress dashboard,
and a current affairs archive (2000–present) that keeps itself updated every 5 hours.

No build step, no framework, no paid hosting required — it's plain HTML/CSS/JS plus
one small Node script for the automation.

---

## 1. How it's structured

```
index.html                          ← the whole app shell
css/styles.css                      ← all styling
js/                                 ← app logic (one file per feature)
data/
  syllabus.json                     ← combined NTPC + Group D topics & notes
  mocktests.json                    ← mock test questions
  current_affairs.json              ← the current affairs archive
scripts/
  update-current-affairs.mjs        ← fetches fresh current affairs via the Gemini API
  package.json
.github/workflows/
  update-current-affairs.yml        ← GitHub Action that runs the script every 5 hours
```

Progress (completed topics, mock test scores) is stored in **your browser's
localStorage** — it's personal to your device/browser and isn't sent anywhere.

## 2. Deploying it (GitHub Pages — free)

1. Create a new GitHub repository and push this entire folder to it.
2. In the repo, go to **Settings → Pages**, set "Source" to your main branch, root folder. Save.
3. After a minute, GitHub gives you a URL like `https://<your-username>.github.io/<repo-name>/` — that's your live site.

That's the whole frontend deployment. Anyone with the link can use it; your data
files update in place as the automation runs.

## 3. Setting up the real 5-hour automation (the part that runs even when nobody has the site open)

This is the piece that needed an actual backend, explained earlier in chat — here's
how to turn it on, using a free Gemini API key:

1. **Get a Gemini API key**: go to aistudio.google.com/app/apikey → sign in with a Google account → "Create API key". Google AI Studio has a free tier (rate-limited; check the dashboard for current limits, they change over time). New keys are created as "auth keys" by default — if yours instead shows as an unrestricted "Standard" key, click it and restrict it to the Generative Language API, since Google has been phasing out unrestricted standard keys through 2026.
2. **Add it as a GitHub secret**: in your repo, go to **Settings → Secrets and variables → Actions → New repository secret**. Name it `GEMINI_API_KEY`, paste the key, save. (Never put the key directly in any file in the repo.)
3. **Make sure Actions can write to your repo**: **Settings → Actions → General → Workflow permissions** → select "Read and write permissions" → Save.
4. That's it. The workflow in `.github/workflows/update-current-affairs.yml` will now run automatically every 5 hours (00:00, 05:00, 10:00, 15:00, 20:00 UTC), call Gemini with Google Search grounding to find new RRB-relevant current affairs, and commit them into `data/current_affairs.json`.
5. To test it immediately instead of waiting: go to your repo's **Actions** tab → "Update current affairs" workflow → **Run workflow** button.

The website itself just re-fetches `data/current_affairs.json` whenever you open the
Current Affairs tab (and again every 5 hours if you leave the tab open) — so it
always shows whatever the backend has most recently committed, with a visible
"last synced" timestamp and a manual refresh button as backup. None of this
involves the frontend ever touching your API key — it only lives in the GitHub
secret, used by the scheduled workflow.

## 4. Being upfront about what's seeded vs. what's a starting point

Per your instruction not to have anything quietly cut down — here's exactly what's real and what's a v1 starting point:

- **Current affairs 2024–2026**: researched and written from real sources (month-by-month), covering national affairs, defence, sports, science, schemes, appointments and awards.
- **Current affairs 2000–2023**: yearly highlights based on well-established historical facts (elections, major disasters, Olympics, key legislation, etc.) — not individually search-verified line by line. Worth a final read-through before you rely on any single date/figure for the exam.
- **Syllabus**: all 69 topics across Maths, Reasoning, Science and General Awareness for both exams are listed with concise revision notes (formulas/key facts) — this is a solid first pass, not exhaustive textbook-length material.
- **Mock tests**: 2 full tests (49 questions total) covering NTPC and Group D proportions, fully auto-graded with explanations. This is a starter set, structured so more tests/questions can be added easily (just append to `data/mocktests.json`).

If you want me to keep expanding any of these — more mock tests, deeper notes on a specific topic, or tightening up the older current-affairs years — just ask in the chat and I'll extend the same files.

## 5. Customizing

- **Add syllabus topics/notes**: edit `data/syllabus.json` — each topic is `{id, name, notes}` inside a subject's `topics` array.
- **Add mock test questions**: edit `data/mocktests.json` — each question is `{subject, question, options[], correctIndex, explanation}`.
- **Change the automation frequency**: edit the `cron` line in `.github/workflows/update-current-affairs.yml` (cron syntax is `minute hour day month weekday`, all in UTC).
- **Colours/fonts**: all design tokens are CSS variables at the top of `css/styles.css`.
