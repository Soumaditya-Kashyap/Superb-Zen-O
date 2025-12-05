/**
 * Stats Controller
 * Handles database statistics
 */

const Movie = require('../../models/movie');

/**
 * Get database statistics
 * GET /api/admin/stats
 */
exports.getStats = async (req, res) => {
    try {
        const totalMovies = await Movie.countDocuments();
        const byCategory = await Movie.aggregate([
            { $unwind: '$categories' },
            { $group: { _id: '$categories', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        const byLanguage = await Movie.aggregate([
            { $unwind: '$languages' },
            { $group: { _id: '$languages', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            success: true,
            stats: {
                totalMovies,
                byCategory,
                byLanguage
            }
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats'
        });
    }
};
