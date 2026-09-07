const fetch = require('node-fetch');
const Movie = require('../models/movie');

// Get API key dynamically
const getApiKey = () => process.env.OMDB_API_KEY;

// Genre mapping - ONLY these 8 categories as per requirements
const GENRE_SEARCH_TERMS = {
    action: ['action', 'mission', 'war', 'fight', 'assassin', 'agent', 'soldier', 'combat', 'battle', 'spy'],
    comedy: ['comedy', 'funny', 'humor', 'laugh', 'hilarious', 'fun', 'silly', 'joke', 'parody', 'crazy'],
    drama: ['life', 'story', 'truth', 'family', 'human', 'real', 'american', 'last', 'man', 'girl'],
    horror: ['horror', 'scary', 'terror', 'nightmare', 'ghost', 'evil', 'dead', 'zombie', 'vampire', 'demon'],
    romance: ['love', 'romance', 'wedding', 'romantic', 'heart', 'couple', 'affair', 'passion', 'relationship', 'valentine'],
    scifi: ['space', 'future', 'alien', 'robot', 'time', 'galaxy', 'planet', 'science', 'star', 'universe'],
    thriller: ['thriller', 'suspense', 'tension', 'edge', 'dark', 'psychological', 'intense', 'dangerous', 'escape', 'chase'],
    documentary: ['documentary', 'true', 'history', 'world', 'america', 'war', 'life', 'story', 'planet', 'earth']
};

// Language search terms - ONLY these 20 languages as per requirements
const LANGUAGE_SEARCH_TERMS = {
    hindi: ['shah rukh', 'salman', 'aamir', 'hrithik', 'akshay', 'khan', 'kapoor', 'kumar', 'bachchan', 'bollywood'],
    tamil: ['rajinikanth', 'kamal', 'vijay', 'ajith', 'suriya', 'dhanush', 'kollywood', 'tamil', 'chennai', 'madras'],
    telugu: ['mahesh', 'prabhas', 'allu', 'ram', 'jr ntr', 'nagarjuna', 'tollywood', 'telugu', 'hyderabad', 'bahubali'],
    bengali: ['uttam', 'satyajit', 'bengali', 'kolkata', 'calcutta', 'bengal', 'prosenjit', 'dev', 'tollygunge', 'tollywood'],
    marathi: ['marathi', 'mumbai', 'pune', 'maharashtra', 'maratha', 'sairat', 'natsamrat', 'shwaas'],
    gujarati: ['gujarati', 'gujarat', 'ahmedabad', 'surat', 'dhollywood', 'gujju'],
    kannada: ['yash', 'sudeep', 'puneeth', 'upendra', 'darshan', 'sandalwood', 'kannada', 'karnataka', 'bangalore', 'kgf'],
    malayalam: ['mohanlal', 'mammootty', 'fahadh', 'prithviraj', 'nivin', 'dulquer', 'malayalam', 'kerala', 'mollywood', 'kochi'],
    english: ['english', 'hollywood', 'american', 'british', 'uk', 'usa'],
    spanish: ['spanish', 'espanol', 'mexico', 'spain', 'latino'],
    french: ['french', 'paris', 'france', 'francais'],
    german: ['german', 'germany', 'deutsch', 'berlin'],
    japanese: ['japanese', 'japan', 'tokyo', 'anime', 'samurai', 'yakuza'],
    korean: ['korean', 'korea', 'seoul', 'kdrama', 'parasite'],
    chinese: ['chinese', 'china', 'hong kong', 'mandarin', 'beijing'],
    italian: ['italian', 'italy', 'rome', 'italiano'],
    portuguese: ['portuguese', 'brazil', 'portugal', 'brasileiro'],
    russian: ['russian', 'russia', 'moscow', 'soviet'],
    arabic: ['arabic', 'arab', 'middle east', 'dubai'],
    turkish: ['turkish', 'turkey', 'istanbul', 'turkiye']
};

class MovieScraper {
    
    // Fetch full movie details by IMDb ID
    static async fetchMovieDetails(imdbID) {
        try {
            const apiKey = getApiKey();
            const url = `http://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}&plot=full`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.Response === 'True') {
                return data;
            }
            if (data.Error) {
                console.error(`      ❌ API Error: ${data.Error}`);
            }
            return null;
        } catch (error) {
            console.error(`❌ Error fetching details for ${imdbID}:`, error.message);
            return null;
        }
    }

    // Search movies by term and fetch full details
    static async searchAndFetchMovies(searchTerm, maxResults = 10) {
        try {
            console.log(`🔍 Searching for: "${searchTerm}"`);
            
            const movies = [];
            const pages = Math.ceil(maxResults / 10); // OMDb returns max 10 results per page
            
            for (let page = 1; page <= pages; page++) {
                const apiKey = getApiKey();
                const searchUrl = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(searchTerm)}&page=${page}&type=movie`;
                const response = await fetch(searchUrl);
                const data = await response.json();
                
                if (data.Response === 'True' && data.Search) {
                    console.log(`   📄 Page ${page}: Found ${data.Search.length} results`);
                    
                    // Fetch full details for each movie
                    for (const movie of data.Search) {
                        if (movies.length >= maxResults) break;
                        
                        const details = await this.fetchMovieDetails(movie.imdbID);
                        if (details) {
                            movies.push(details);
                            console.log(`      ✅ ${details.Title} (${details.Year})`);
                            await this.delay(200); // Rate limiting - important!
                        }
                    }
                }
                
                if (movies.length >= maxResults) break;
                await this.delay(300); // Rate limiting between pages
            }
            
            console.log(`✅ Total found for "${searchTerm}": ${movies.length} movies\n`);
            return movies;
            
        } catch (error) {
            console.error(`❌ Error searching for "${searchTerm}":`, error.message);
            return [];
        }
    }

    // Scrape movies for a specific genre
    static async scrapeGenre(genre, moviesPerTerm = 10) {
        const searchTerms = GENRE_SEARCH_TERMS[genre] || [genre];
        const allMovies = [];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎬 Starting to scrape ${genre.toUpperCase()} genre...`);
        console.log(`📝 Using ${searchTerms.length} search terms: ${searchTerms.join(', ')}`);
        console.log('='.repeat(60) + '\n');
        
        for (const term of searchTerms) {
            const movies = await this.searchAndFetchMovies(term, moviesPerTerm);
            allMovies.push(...movies);
        }
        
        // Remove duplicates based on imdbID
        const uniqueMovies = this.removeDuplicates(allMovies);
        
        console.log(`🎉 Total unique ${genre} movies: ${uniqueMovies.length}`);
        
        // Save to MongoDB
        const savedCount = await this.saveMoviesToDB(uniqueMovies, [genre]);
        
        console.log(`💾 Saved ${savedCount} ${genre} movies to database`);
        console.log('='.repeat(60) + '\n');
        
        return savedCount;
    }

    // Scrape movies for a specific language
    static async scrapeLanguage(language, moviesPerTerm = 10) {
        const searchTerms = LANGUAGE_SEARCH_TERMS[language] || [language];
        const allMovies = [];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🌍 Starting to scrape ${language.toUpperCase()} movies...`);
        console.log(`📝 Using ${searchTerms.length} search terms: ${searchTerms.join(', ')}`);
        console.log('='.repeat(60) + '\n');
        
        for (const term of searchTerms) {
            const movies = await this.searchAndFetchMovies(term, moviesPerTerm);
            allMovies.push(...movies);
        }
        
        const uniqueMovies = this.removeDuplicates(allMovies);
        
        console.log(`🎉 Total unique ${language} movies: ${uniqueMovies.length}`);
        
        const savedCount = await this.saveMoviesToDB(uniqueMovies, [], [language]);
        
        console.log(`💾 Saved ${savedCount} ${language} movies to database`);
        console.log('='.repeat(60) + '\n');
        
        return savedCount;
    }

    // Save movies to MongoDB Atlas
    static async saveMoviesToDB(movies, categories = [], languages = []) {
        let savedCount = 0;
        let updatedCount = 0;
        
        for (const movieData of movies) {
            try {
                // Extract languages from movie data
                const movieLanguages = movieData.Language ? 
                    movieData.Language.split(',').map(l => l.trim().toLowerCase()) : [];
                
                // Extract genres/categories from movie data
                const movieGenres = movieData.Genre ? 
                    movieData.Genre.split(',').map(g => g.trim().toLowerCase()) : [];
                
                // Combine with provided categories and languages
                const allCategories = [...new Set([...categories, ...movieGenres])];
                const allLanguages = [...new Set([...languages, ...movieLanguages])];
                
                // Check if movie exists
                const existingMovie = await Movie.findOne({ imdbID: movieData.imdbID });
                
                // Update or create movie (upsert)
                await Movie.findOneAndUpdate(
                    { imdbID: movieData.imdbID },
                    {
                        ...movieData,
                        categories: allCategories,
                        languages: allLanguages,
                        scrapedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
                
                if (existingMovie) {
                    updatedCount++;
                } else {
                    savedCount++;
                }
                
            } catch (error) {
                console.error(`❌ Error saving "${movieData.Title}":`, error.message);
            }
        }
        
        console.log(`   💾 New movies: ${savedCount}, Updated: ${updatedCount}`);
        return savedCount + updatedCount;
    }

    // Remove duplicate movies by imdbID
    static removeDuplicates(movies) {
        const seen = new Set();
        return movies.filter(movie => {
            if (seen.has(movie.imdbID)) {
                return false;
            }
            seen.add(movie.imdbID);
            return true;
        });
    }

    // Delay helper for rate limiting
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Scrape ALL genres (100+ movies per genre)
    static async scrapeAllGenres(moviesPerTerm = 12) {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 Starting FULL GENRE SCRAPING...');
        console.log('='.repeat(60) + '\n');
        
        const genres = Object.keys(GENRE_SEARCH_TERMS);
        const results = {};
        
        let genreCount = 0;
        for (const genre of genres) {
            genreCount++;
            console.log(`\n📊 Progress: ${genreCount}/${genres.length} genres\n`);
            const count = await this.scrapeGenre(genre, moviesPerTerm);
            results[genre] = count;
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎊 GENRE SCRAPING COMPLETE!');
        console.log('='.repeat(60));
        console.log('📊 Results Summary:');
        Object.entries(results).forEach(([genre, count]) => {
            console.log(`   ${genre.padEnd(15)}: ${count} movies`);
        });
        const total = Object.values(results).reduce((a, b) => a + b, 0);
        console.log(`   ${'─'.repeat(15)}   ${'─'.repeat(10)}`);
        console.log(`   ${'TOTAL'.padEnd(15)}: ${total} movies`);
        console.log('='.repeat(60) + '\n');
        
        return results;
    }

    // Scrape ALL languages
    static async scrapeAllLanguages(moviesPerTerm = 15) {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 Starting FULL LANGUAGE SCRAPING...');
        console.log('='.repeat(60) + '\n');
        
        const languages = Object.keys(LANGUAGE_SEARCH_TERMS);
        const results = {};
        
        let langCount = 0;
        for (const language of languages) {
            langCount++;
            console.log(`\n📊 Progress: ${langCount}/${languages.length} languages\n`);
            const count = await this.scrapeLanguage(language, moviesPerTerm);
            results[language] = count;
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎊 LANGUAGE SCRAPING COMPLETE!');
        console.log('='.repeat(60));
        console.log('📊 Results Summary:');
        Object.entries(results).forEach(([language, count]) => {
            console.log(`   ${language.padEnd(15)}: ${count} movies`);
        });
        const total = Object.values(results).reduce((a, b) => a + b, 0);
        console.log(`   ${'─'.repeat(15)}   ${'─'.repeat(10)}`);
        console.log(`   ${'TOTAL'.padEnd(15)}: ${total} movies`);
        console.log('='.repeat(60) + '\n');
        
        return results;
    }
}

module.exports = MovieScraper;
