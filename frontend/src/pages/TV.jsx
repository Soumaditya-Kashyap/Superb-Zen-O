import { useState, useEffect } from 'react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';
import './TV.css';

const TV = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShow, setSelectedShow] = useState(null);

  useEffect(() => {
    const fetchTVShows = async () => {
      try {
        setLoading(true);
        // Search for TV series
        const response = await MovieService.searchMovies('series', 1, 'series');
        setShows(response.movies || []);
      } catch (error) {
        console.error('Error fetching TV shows:', error);
        setShows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTVShows();
  }, []);

  const handleShowClick = (show) => {
    setSelectedShow(show.imdbID);
  };

  const handleCloseDetails = () => {
    setSelectedShow(null);
  };

  return (
    <div className="tv-page">
      <div className="page-header">
        <h1>TV Shows</h1>
        <p>Binge-watch your favorite series together</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading TV shows...</p>
        </div>
      ) : (
        <div className="shows-grid">
          {shows.length > 0 ? (
            shows.map((show) => (
              <div key={show.imdbID} className="show-card-wrapper">
                <MovieCard movie={show} onClick={handleShowClick} />
              </div>
            ))
          ) : (
            <div className="no-shows">
              <p>No TV shows available</p>
            </div>
          )}
        </div>
      )}

      {/* Show Details Modal */}
      {selectedShow && (
        <MovieDetails 
          imdbId={selectedShow} 
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};

export default TV;
