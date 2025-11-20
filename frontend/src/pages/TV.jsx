import { useState, useEffect } from 'react';
import MovieService from '../services/movieService';
import MovieCard from '../components/MovieCard';
import MovieDetails from '../components/MovieDetails';

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
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-2">TV Shows</h1>
        <p className="text-gray-400 text-lg">Binge-watch your favorite series together</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="loading-spinner"></div>
          <p className="text-white/60 mt-4">Loading TV shows...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {shows.length > 0 ? (
            shows.map((show) => (
              <MovieCard key={show.imdbID} movie={show} onClick={handleShowClick} />
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <p className="text-white/60 text-lg">No TV shows available</p>
            </div>
          )}
        </div>
      )}

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
