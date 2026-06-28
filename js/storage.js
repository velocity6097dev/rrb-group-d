// storage.js — wraps localStorage for syllabus progress + mock test history.
// Everything is namespaced under "rrbprep:" so it never collides with other sites.

const STORE_KEYS = {
  topics: 'rrbprep:completedTopics',     // array of topic ids
  attempts: 'rrbprep:testAttempts',      // array of {testId, title, date, score, total}
  lastCaCheck: 'rrbprep:lastCaCheck'     // ISO timestamp of last current-affairs refresh check
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('Storage read failed for', key, e);
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed for', key, e);
  }
}

const Storage = {
  getCompletedTopics() {
    return new Set(readJSON(STORE_KEYS.topics, []));
  },
  toggleTopic(topicId) {
    const set = Storage.getCompletedTopics();
    if (set.has(topicId)) set.delete(topicId); else set.add(topicId);
    writeJSON(STORE_KEYS.topics, Array.from(set));
    return set;
  },
  isTopicDone(topicId) {
    return Storage.getCompletedTopics().has(topicId);
  },
  getAttempts() {
    return readJSON(STORE_KEYS.attempts, []);
  },
  saveAttempt(attempt) {
    const attempts = Storage.getAttempts();
    attempts.push(attempt);
    writeJSON(STORE_KEYS.attempts, attempts);
  },
  getLastCaCheck() {
    return localStorage.getItem(STORE_KEYS.lastCaCheck);
  },
  setLastCaCheck(iso) {
    localStorage.setItem(STORE_KEYS.lastCaCheck, iso);
  }
};
