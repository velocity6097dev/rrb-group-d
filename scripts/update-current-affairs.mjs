import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.NEWSDATA_API_KEY;
const DATA_FILE = path.join(__dirname, '../data/current_affairs.json');

if (!API_KEY) {
  console.error('ERROR: NEWSDATA_API_KEY environment variable is not set');
  process.exit(1);
}

const queries = [
  'RRB railway recruitment',
  'NTPC Group D exam',
  'Indian railway news',
  'government jobs India',
  'national affairs India',
  'defence news India',
  'sports news India',
  'science technology India',
  'business economics India',
  'award appointment India'
];

const categoryMap = {
  'railway': 'National Affairs',
  'recruitment': 'National Affairs',
  'government': 'National Affairs',
  'job': 'National Affairs',
  'exam': 'National Affairs',
  'defence': 'Defence & Security',
  'defense': 'Defence & Security',
  'military': 'Defence & Security',
  'security': 'Defence & Security',
  'sports': 'Sports',
  'cricket': 'Sports',
  'science': 'Science & Technology',
  'technology': 'Science & Technology',
  'space': 'Science & Technology',
  'isro': 'Science & Technology',
  'business': 'Business & Economy',
  'economy': 'Business & Economy',
  'market': 'Business & Economy',
  'stock': 'Business & Economy',
  'award': 'Awards & Appointments',
  'appointment': 'Awards & Appointments',
  'appointment': 'Awards & Appointments',
  'international': 'International Relations',
  'diplomacy': 'International Relations'
};

function categorizeNews(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (text.includes(keyword)) {
      return category;
    }
  }
  
  return 'National Affairs'; // Default category
}

async function fetchCurrentAffairs() {
  try {
    console.log('Fetching current affairs from newsdata.io...');
    
    const allNews = [];
    
    for (const query of queries) {
      try {
        console.log(`  Fetching: ${query}`);
        
        const url = new URL('https://newsdata.io/api/1/news');
        url.searchParams.append('q', query);
        url.searchParams.append('country', 'in');
        url.searchParams.append('language', 'en');
        url.searchParams.append('apikey', API_KEY);
        url.searchParams.append('sortby', 'published_at');
        url.searchParams.append('size', '10');
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          console.error(`  Error for "${query}": ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach(article => {
            const newsItem = {
              date: article.pubDate.split('T')[0], // Extract date from ISO string
              category: categorizeNews(article.title, article.description || ''),
              title: article.title.substring(0, 100), // Limit title length
              description: (article.description || article.content || 'Latest news on this topic').substring(0, 200),
              source: article.source_id,
              link: article.link
            };
            
            allNews.push(newsItem);
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.warn(`  Warning fetching "${query}":`, error.message);
      }
    }
    
    console.log(`SUCCESS: Fetched ${allNews.length} news articles`);
    return allNews;
    
  } catch (error) {
    console.error('ERROR fetching from newsdata.io:', error.message);
    throw error;
  }
}

async function updateCurrentAffairs() {
  try {
    let existingData = {
      lastUpdated: new Date().toISOString(),
      items: []
    };

    if (fs.existsSync(DATA_FILE)) {
      try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (e) {
        console.warn('Warning: Could not parse existing data file');
      }
    }

    const newArticles = await fetchCurrentAffairs();

    if (newArticles.length === 0) {
      console.warn('No new articles fetched, keeping existing data');
      return;
    }

    // Combine new with existing
    const allArticles = [...newArticles, ...existingData.items];

    // Remove duplicates based on title
    const seen = new Set();
    const uniqueArticles = allArticles.filter(item => {
      const key = `${item.date}-${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Keep only last 500 items and sort by date (newest first)
    const finalData = uniqueArticles
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 500);

    const updatedData = {
      lastUpdated: new Date().toISOString(),
      items: finalData
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2));
    
    console.log(`SUCCESS: Updated ${DATA_FILE}`);
    console.log(`Total items: ${finalData.length}`);
    console.log(`Last updated: ${updatedData.lastUpdated}`);
    
  } catch (error) {
    console.error('ERROR: Failed to update current affairs:', error.message);
    process.exit(1);
  }
}

updateCurrentAffairs();
