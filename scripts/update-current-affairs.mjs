#!/usr/bin/env node
/**
 * update-current-affairs.mjs
 * ---------------------------------------------------------------------------
 * Runs every 5 hours (via the GitHub Actions workflow in
 * .github/workflows/update-current-affairs.yml). It asks Gemini — with
 * Google Search grounding turned on — for the latest RRB-exam-relevant
 * current affairs from the last few hours, then appends them to
 * data/current_affairs.json under the current month's key. The workflow
 * commits the updated file, so the live site (GitHub Pages) picks it up
 * the next time someone opens it.
 *
 * Requires the GEMINI_API_KEY environment variable (set as a GitHub
 * Actions secret — see README.md for setup instructions). Never commit
 * your API key to the repository.
 * ---------------------------------------------------------------------------
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'data', 'current_affairs.json');

// gemini-3.5-flash is the current GA flash model (fast + cheap, good for this
// small recurring job). If you'd rather always ride the newest flash release,
// you can swap this for the alias "gemini-flash-latest" instead.
const MODEL = 'gemini-3.5-flash';

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

async function callGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Add it as a GitHub Actions secret.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `It is ${today}. Search the web for genuinely new current-affairs items from roughly the last 5-8 hours that would be relevant to Indian competitive exam aspirants (RRB NTPC / RRB Group D General Awareness section). Cover categories like: national affairs & government, defence, sports, science & space, government schemes/economy, appointments, awards, and India-relevant international relations.

Return STRICTLY a JSON array of 2 to 6 short self-contained factual sentences (no markdown, no code fences, no preamble, no commentary) — each sentence should end with the date in parentheses, e.g. "ISRO launched a new satellite (12 Jun 2026)." If you find nothing genuinely new and exam-relevant, return an empty JSON array: []`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  if (!candidate) {
    throw new Error(`Gemini returned no candidates: ${JSON.stringify(data)}`);
  }
  const text = (candidate.content?.parts || [])
    .map(part => part.text || '')
    .join('\n')
    .trim();

  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();

  let items;
  try {
    items = JSON.parse(cleaned);
  } catch (e) {
    console.error('Could not parse model output as JSON:\n', text);
    throw e;
  }
  if (!Array.isArray(items)) throw new Error('Model did not return a JSON array.');
  return items.filter(i => typeof i === 'string' && i.trim().length > 0);
}

async function main() {
  const newItems = await callGemini();
  console.log(`Fetched ${newItems.length} new item(s).`);

  const raw = await readFile(DATA_PATH, 'utf-8');
  const db = JSON.parse(raw);

  const now = new Date();
  const key = monthKey(now);
  if (!db.monthly[key]) db.monthly[key] = [];

  let added = 0;
  for (const item of newItems) {
    const alreadyExists = db.monthly[key].some(existing => existing.trim() === item.trim());
    if (!alreadyExists) {
      db.monthly[key].push(item);
      added++;
    }
  }

  db.lastUpdated = now.toISOString();
  db.lastUpdatedNote = `Auto-updated by GitHub Actions (Gemini) on ${now.toISOString()}. Added ${added} new item(s) to ${key}.`;

  await writeFile(DATA_PATH, JSON.stringify(db, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${added} new item(s) to ${key}. Total in that month: ${db.monthly[key].length}.`);
}

main().catch(err => {
  console.error('update-current-affairs failed:', err);
  process.exit(1);
});

