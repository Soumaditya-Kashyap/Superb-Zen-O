const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    imdbID: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    Title: {
        type: String,
        required: true,
        index: true
    },
    Year: String,
    Rated: String,
    Released: String,
    Runtime: String,
    Genre: {
        type: String,
        index: true
    },
    Director: String,
    Writer: String,
    Actors: String,
    Plot: String,
    Language: {
        type: String,
        index: true
    },
    Country: String,
    Awards: String,
    Poster: String,
    Ratings: [{
        Source: String,
        Value: String
    }],
    Metascore: String,
    imdbRating: String,
    imdbVotes: String,
    Type: {
        type: String,
        enum: ['movie', 'series', 'episode'],
        default: 'movie'
    },
    DVD: String,
    BoxOffice: String,
    Production: String,
    Website: String,
    Response: String,
    // Custom fields for better categorization
    categories: [{
        type: String,
        index: true
    }],
    languages: [{
        type: String,
        index: true
    }],
    // Hero section fields
    isHero: {
        type: Boolean,
        default: false,
        index: true
    },
    heroOrder: {
        type: Number,
        default: 0
    },
    heroSubtitle: {
        type: String,
        default: ''
    },
    heroDescription: {
        type: String,
        default: ''
    },
    heroTags: [{
        type: String
    }],
    scrapedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound indexes for efficient querying
movieSchema.index({ categories: 1, imdbRating: -1 });
movieSchema.index({ languages: 1, imdbRating: -1 });

module.exports = mongoose.model('Movie', movieSchema);
