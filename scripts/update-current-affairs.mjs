import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const API_KEY   = process.env.NEWSDATA_API_KEY;
const DATA_FILE = path.join(__dirname, '../data/current_affairs.json');
const DATA_DIR  = path.dirname(DATA_FILE);

// ─── Guard ───────────────────────────────────────────────────────────────────
if (!API_KEY) {
  console.error('ERROR: NEWSDATA_API_KEY environment variable is not set.');
  console.error('  Set it with: export NEWSDATA_API_KEY=your_key_here');
  process.exit(1);
}

// ─── Config ──────────────────────────────────────────────────────────────────
//
//  Free plan  = 200 credits/day, 10 results per call → max 20 calls/day safely.
//  We run ONE batched query using OR logic so we spend only ~3 credits total
//  and stay well within the free limit even if you run this multiple times.
//
const BATCH_QUERY = [
  'railway OR NTPC OR "Group D"',
  'India government OR defence OR ISRO',
  'India sports OR economy OR award OR appointment',
].join(' ');

// Single focused query — change to an array of strings if you upgrade to a
// paid plan and want per-topic fetches.
const QUERIES = [
  { q: 'railway OR NTPC OR "Group D" recruitment India', label: 'Railway & Jobs' },
  { q: 'India defence military security news',            label: 'Defence'        },
  { q: 'India sports cricket award appointment 2025',     label: 'Sports & Awards'},
  { q: 'India science technology ISRO space 2025',        label: 'Science & Tech' },
  { q: 'India economy business market government policy', label: 'Economy'        },
];

const MAX_RESULTS_PER_QUERY = 10; // newsdata.io free max
const MAX_STORED_ITEMS      = 500;
const DELAY_MS              = 1200; // stay safely under rate limits

// ─── Category map ────────────────────────────────────────────────────────────
const CATEGORY_MAP = [
  { keywords: ['railway', 'rrb', 'ntpc', 'group d', 'recruitment', 'job', 'exam', 'sarkari'], category: 'National Affairs' },
  { keywords: ['defence', 'defense', 'military', 'army', 'navy', 'airforce', 'security', 'border'], category: 'Defence & Security' },
  { keywords: ['cricket', 'sports', 'olympic', 'football', 'hockey', 'medal', 'tournament', 'championship'], category: 'Sports' },
  { keywords: ['science', 'technology', 'isro', 'space', 'satellite', 'research', 'ai', 'artificial intelligence'], category: 'Science & Technology' },
  { keywords: ['economy', 'business', 'market', 'stock', 'gdp', 'rbi', 'budget', 'finance', 'inflation', 'rupee'], category: 'Business & Economy' },
  { keywords: ['award', 'appointment', 'padma', 'nobel', 'bharat ratna', 'governor', 'minister', 'elected', 'appointed'], category: 'Awards & Appointments' },
  { keywords: ['international', 'diplomacy', 'treaty', 'bilateral', 'foreign', 'united nations', 'g20', 'brics'], category: 'International Relations' },
];

function categorize(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  for (const { keywords, category } of CATEGORY_MAP) {
    if (keywords.some(k => text.includes(k))) return category;
  }
  return 'National Affairs';
}

// ─── Fetch ───────────────────────────────────────────────────────────────────
async function fetchQuery({ q, label }) {
  const url = new URL('https://newsdata.io/api/1/news');
  url.searchParams.set('q',        q);
  url.searchParams.set('country',  'in');
  url.searchParams.set('language', 'en');
  url.searchParams.set('apikey',   API_KEY);
  url.searchParams.set('size',     String(MAX_RESULTS_PER_QUERY));

  console.log(`  → Fetching [${label}]…`);

  const res = await fetch(url.toString());

  // Surface the actual API error message so you can debug quota issues
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let hint = '';
    try {
      const parsed = JSON.parse(body);
      hint = parsed?.results?.message || parsed?.message || body;
    } catch {
      hint = body.slice(0, 200);
    }
    throw new Error(`HTTP ${res.status} for "${label}": ${hint}`);
  }

  const data = await res.json();

  // newsdata.io wraps errors in a 200 response sometimes
  if (data.status === 'error') {
    throw new Error(`API error for "${label}": ${data.results?.message || JSON.stringify(data)}`);
  }

  const results = data.results ?? [];
  console.log(`     ✓ ${results.length} articles`);
  return results;
}

async function fetchAllCurrentAffairs() {
  console.log('\n📡 Fetching current affairs from newsdata.io…');
  console.log(`   Queries: ${QUERIES.length} | Max per query: ${MAX_RESULTS_PER_QUERY}\n`);

  const allNews  = [];
  let totalCalls = 0;
  let errors     = 0;

  for (const query of QUERIES) {
    try {
      const results = await fetchQuery(query);
      totalCalls++;

      for (const article of results) {
        // Skip articles with missing critical fields
        if (!article.title || !article.pubDate) continue;

        // pubDate can be "2025-06-27 10:30:00" or "2025-06-27T10:30:00Z"
        const rawDate = article.pubDate.replace(' ', 'T');
        const date    = rawDate.split('T')[0];

        allNews.push({
          date,
          category:    categorize(article.title, article.description),
          title:       article.title.trim().substring(0, 120),
          description: (article.description || article.content || '').trim().substring(0, 250),
          source:      article.source_id  ?? '',
          link:        article.link       ?? '',
        });
      }

      // Polite delay between calls
      if (QUERIES.indexOf(query) < QUERIES.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }

    } catch (err) {
      errors++;
      console.error(`  ✗ ${err.message}`);

      // If it looks like a quota/auth error, abort early to avoid burning credits
      if (err.message.includes('401') || err.message.includes('403') ||
          err.message.toLowerCase().includes('quota') ||
          err.message.toLowerCase().includes('limit')) {
        console.error('\n⚠️  API quota or auth error detected — stopping early.');
        console.error('   Check your API key and daily credit usage at https://newsdata.io/dashboard\n');
        break;
      }
    }
  }

  console.log(`\n   Total API calls: ${totalCalls} | Errors: ${errors} | Articles fetched: ${allNews.length}`);
  return allNews;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function updateCurrentAffairs() {
  // Ensure the output directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  }

  // Load existing data (to merge, not overwrite)
  let existingItems = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw  = fs.readFileSync(DATA_FILE, 'utf8');
      const prev = JSON.parse(raw);
      existingItems = Array.isArray(prev.items) ? prev.items : [];
      console.log(`📂 Loaded ${existingItems.length} existing articles from disk.`);
    } catch {
      console.warn('⚠️  Could not parse existing data file — starting fresh.');
    }
  }

  const newArticles = await fetchAllCurrentAffairs();

  if (newArticles.length === 0) {
    console.warn('\n⚠️  No new articles fetched.');
    if (existingItems.length > 0) {
      console.log('   Keeping existing data unchanged.');
    } else {
      console.error('   No existing data either — data file will be empty.');
      // Write an empty-but-valid file so the frontend shows the empty state
      fs.writeFileSync(DATA_FILE, JSON.stringify({ lastUpdated: new Date().toISOString(), items: [] }, null, 2));
    }
    return;
  }

  // Merge new + existing, deduplicate by (date + normalised title)
  const normalise = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const seen      = new Set(existingItems.map(i => `${i.date}|${normalise(i.title)}`));

  const merged = [...newArticles.filter(a => {
    const key = `${a.date}|${normalise(a.title)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }), ...existingItems];

  // Sort newest-first, cap at MAX_STORED_ITEMS
  const finalItems = merged
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_STORED_ITEMS);

  const output = {
    lastUpdated: new Date().toISOString(),
    items: finalItems,
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Saved to: ${DATA_FILE}`);
  console.log(`   New articles added : ${newArticles.length}`);
  console.log(`   Total stored       : ${finalItems.length}`);
  console.log(`   Last updated       : ${output.lastUpdated}\n`);
}

updateCurrentAffairs().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
