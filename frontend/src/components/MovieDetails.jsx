import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import MovieService from '../services/movieService';
import './MovieDetails.css';

const MovieDetails = ({ imdbId, onClose }) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const response = await MovieService.getMovieDetails(imdbId);
        if (response.success) {
          setMovie(response.movie);
        } else {
          setError(response.error);
        }
      } catch (err) {
        setError('Failed to load movie details');
      } finally {
        setLoading(false);
      }
    };

    if (imdbId) {
      fetchMovieDetails();
    }
  }, [imdbId]);

  if (loading) {
    return (
      <div className="movie-details-modal" onClick={onClose}>
        <div className="movie-details-content loading" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner"></div>
          <p>Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="movie-details-modal" onClick={onClose}>
        <div className="movie-details-content error" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>✕</button>
          <p>Error: {error || 'Movie not found'}</p>
        </div>
      </div>
    );
  }

  const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://via.placeholder.com/400x600?text=No+Poster';

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/400x600?text=No+Poster';
  };

  return (
    <div className="movie-details-modal" onClick={onClose}>
      <div className="movie-details-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        
        <div className="movie-details-layout">
          <div className="movie-poster-section">
            <img 
              src={posterUrl} 
              alt={movie.Title}
              onError={handleImageError}
            />
          </div>

          <div className="movie-info-section">
            <h1>{movie.Title}</h1>
            <div className="movie-meta">
              <span className="meta-item">{movie.Year}</span>
              <span className="meta-separator">•</span>
              <span className="meta-item">{movie.Rated}</span>
              <span className="meta-separator">•</span>
              <span className="meta-item">{movie.Runtime}</span>
            </div>

            <div className="movie-genre">{movie.Genre}</div>

            <div className="movie-ratings">
              {movie.Ratings && movie.Ratings.map((rating, index) => (
                <div key={index} className="rating-item">
                  <span className="rating-source">{rating.Source}</span>
                  <span className="rating-value">{rating.Value}</span>
                </div>
              ))}
              {movie.imdbRating && (
                <div className="rating-item highlight">
                  <span className="rating-source">IMDb</span>
                  <span className="rating-value">⭐ {movie.imdbRating}</span>
                </div>
              )}
            </div>

            <div className="movie-plot">
              <h3>Plot</h3>
              <p>{movie.Plot}</p>
            </div>

            <div className="movie-details-grid">
              <div className="detail-item">
                <strong>Director:</strong>
                <span>{movie.Director}</span>
              </div>
              <div className="detail-item">
                <strong>Actors:</strong>
                <span>{movie.Actors}</span>
              </div>
              <div className="detail-item">
                <strong>Writers:</strong>
                <span>{movie.Writer}</span>
              </div>
              <div className="detail-item">
                <strong>Language:</strong>
                <span>{movie.Language}</span>
              </div>
              <div className="detail-item">
                <strong>Country:</strong>
                <span>{movie.Country}</span>
              </div>
              {movie.Awards && movie.Awards !== 'N/A' && (
                <div className="detail-item">
                  <strong>Awards:</strong>
                  <span>{movie.Awards}</span>
                </div>
              )}
              {movie.BoxOffice && movie.BoxOffice !== 'N/A' && (
                <div className="detail-item">
                  <strong>Box Office:</strong>
                  <span>{movie.BoxOffice}</span>
                </div>
              )}
            </div>

            <div className="action-buttons">
              <button className="btn-primary">
                <span>▶</span> Watch Now
              </button>
              <button className="btn-secondary">
                <span>👥</span> Watch Together
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

MovieDetails.propTypes = {
  imdbId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default MovieDetails;
