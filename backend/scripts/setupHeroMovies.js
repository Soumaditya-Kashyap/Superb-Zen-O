/**
 * Script to set up hero movies in the database
 * Run this once to configure the three hero movies
 * 
 * Usage: node scripts/setupHeroMovies.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Movie = require('../models/Movie');

// Hero movies configuration - Using correct MongoDB ObjectIds
const heroMoviesConfig = [
  {
    _id: '69277fc3425be621154e6aae', // Padmavat
    heroOrder: 1,
    heroSubtitle: 'A Royal Saga',
    heroDescription: 'Witness the legendary tale of honor and sacrifice',
    heroTags: ['2h 44min', 'Drama', 'Movie', '2018', '13+']
  },
  {
    _id: '692dddec0037d4ec27574238', // Roi Roi Binale
    heroOrder: 2,
    heroSubtitle: 'The Ultimate Showdown',
    heroDescription: 'An action-packed thriller that keeps you on the edge',
    heroTags: ['2h 15min', 'Action', 'Movie', '2025', '13+']
  },
  {
    _id: '692de074fa827e6c63692986', // How to Train Your Dragon
    heroOrder: 3,
    heroSubtitle: 'The Final Chapter',
    heroDescription: 'Experience the epic conclusion of the beloved trilogy',
    heroTags: ['1h 56min', 'Action', 'Movie', '2025', '6+']
  }
];

async function setupHeroMovies() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_URI, {
      dbName: process.env.DB_NAME || 'superb',
    });
    console.log('✅ Connected to MongoDB');

    // First, clear any existing hero flags
    console.log('\n🔄 Clearing existing hero flags...');
    await Movie.updateMany(
      { isHero: true },
      { $set: { isHero: false, heroOrder: 0 } }
    );
    console.log('✅ Cleared existing hero movies');

    // Update each hero movie
    console.log('\n🎬 Setting up hero movies...\n');
    
    for (const config of heroMoviesConfig) {
      try {
        const result = await Movie.findByIdAndUpdate(
          config._id,
          {
            $set: {
              isHero: true,
              heroOrder: config.heroOrder,
              heroSubtitle: config.heroSubtitle,
              heroDescription: config.heroDescription,
              heroTags: config.heroTags
            }
          },
          { new: true }
        );

        if (result) {
          console.log(`✅ Updated hero movie ${config.heroOrder}: ${result.Title}`);
          console.log(`   📽️  Poster: ${result.Poster?.substring(0, 50)}...`);
          console.log(`   📝 Subtitle: ${config.heroSubtitle}`);
        } else {
          console.log(`⚠️  Movie not found with ID: ${config._id}`);
        }
      } catch (err) {
        console.error(`❌ Error updating movie ${config._id}:`, err.message);
      }
    }

    // Verify the setup
    console.log('\n📊 Verifying hero movies setup...\n');
    const heroMovies = await Movie.find({ isHero: true }).sort({ heroOrder: 1 });
    
    if (heroMovies.length > 0) {
      console.log(`✅ Found ${heroMovies.length} hero movies:\n`);
      heroMovies.forEach((movie, idx) => {
        console.log(`${idx + 1}. ${movie.Title} (Order: ${movie.heroOrder})`);
        console.log(`   IMDb ID: ${movie.imdbID}`);
        console.log(`   Poster: ${movie.Poster ? '✅ Set' : '❌ Missing'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No hero movies found after setup!');
    }

    console.log('\n🎉 Hero movies setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

setupHeroMovies();
