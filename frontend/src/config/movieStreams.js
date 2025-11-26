/**
 * Movie Stream Configuration
 * Maps movie IDs (imdbID) to their CloudFront HLS streaming paths
 * 
 * To add a new movie:
 * 1. Upload HLS files to S3/CloudFront
 * 2. Add the mapping below with the imdbID as key
 */

// Direct CloudFront HLS URL - using full URL since only one movie is configured
const DEFAULT_CLOUDFRONT_STREAM = 'https://d2k6afcpy0ja0m.cloudfront.net/movie-hls1/master.m3u8';

// Movie ID to HLS URL mapping (full URLs for now)
const movieStreamPaths = {
  // For now, all movies use the same demo stream
  // Add specific movie mappings as you upload more to CloudFront
};

/**
 * Get the CloudFront HLS URL for a movie
 * @param {string} movieId - The IMDb ID of the movie
 * @returns {string} - Full CloudFront URL (defaults to demo stream)
 */
export const getMovieStreamUrl = (movieId) => {
  // Check if movie has a specific stream
  const specificUrl = movieStreamPaths[movieId];
  
  if (specificUrl) {
    console.log(`🎬 Stream URL for ${movieId}: ${specificUrl}`);
    return specificUrl;
  }
  
  // Use default CloudFront stream for all movies
  console.log(`🎬 Using default CloudFront stream for ${movieId}: ${DEFAULT_CLOUDFRONT_STREAM}`);
  return DEFAULT_CLOUDFRONT_STREAM;
};

/**
 * Check if a movie has a CloudFront stream available
 * @param {string} movieId - The IMDb ID of the movie
 * @returns {boolean} - Always true since we have a default stream
 */
export const hasCloudFrontStream = (movieId) => {
  return true; // All movies use CloudFront now
};

/**
 * Get the default CloudFront stream URL
 * @returns {string}
 */
export const getDefaultStreamUrl = () => DEFAULT_CLOUDFRONT_STREAM;

/**
 * Add a new movie stream URL (for dynamic additions)
 * @param {string} movieId - The IMDb ID
 * @param {string} url - The full HLS URL
 */
export const addMovieStreamUrl = (movieId, url) => {
  movieStreamPaths[movieId] = url;
};

export default {
  getMovieStreamUrl,
  hasCloudFrontStream,
  getDefaultStreamUrl,
  addMovieStreamUrl,
};
