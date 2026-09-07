const fetch = require('node-fetch');

// Scrape all 8 categories
async function scrapeAllGenres() {
  console.log('\n🚀 Starting genre scraping...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/scrape/genres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('✅ Genre scraping completed!');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error scraping genres:', error.message);
  }
}

// Scrape all 20 languages
async function scrapeAllLanguages() {
  console.log('\n🌐 Starting language scraping...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/scrape/languages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('✅ Language scraping completed!');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Error scraping languages:', error.message);
  }
}

// Get database stats
async function getStats() {
  console.log('\n📊 Fetching database statistics...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/stats');
    const data = await response.json();
    
    console.log('📊 Database Statistics:');
    console.log('Total Movies:', data.stats.totalMovies);
    console.log('\nBy Category:');
    data.stats.byCategory.forEach(cat => {
      console.log(`  ${cat._id.padEnd(15)}: ${cat.count} movies`);
    });
    console.log('\nBy Language:');
    data.stats.byLanguage.forEach(lang => {
      console.log(`  ${lang._id.padEnd(15)}: ${lang.count} movies`);
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('🎬 MOVIE DATABASE POPULATION SCRIPT');
  console.log('='.repeat(60));
  
  // Step 1: Scrape genres (8 categories × 10 terms × 12 movies = ~960 movies)
  await scrapeAllGenres();
  
  console.log('\n⏳ Waiting 10 seconds before language scraping...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Step 2: Scrape languages (20 languages × 8 terms × 15 movies = ~2400 movies)
  await scrapeAllLanguages();
  
  console.log('\n⏳ Waiting 5 seconds before fetching stats...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 3: Get final stats
  await getStats();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SCRAPING COMPLETE!');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
