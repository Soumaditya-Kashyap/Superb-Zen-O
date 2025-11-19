import PropTypes from 'prop-types';
import './MovieCard.css';

const MovieCard = ({ movie, onClick }) => {
  const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://via.placeholder.com/300x450?text=No+Poster';

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x450?text=No+Poster';
  };

  return (
    <div className="movie-card-dynamic" onClick={() => onClick(movie)}>
      <img 
        src={posterUrl} 
        alt={movie.Title}
        onError={handleImageError}
        loading="lazy"
      />
      <div className="movie-overlay">
        <h3>{movie.Title}</h3>
        <p className="movie-year">{movie.Year}</p>
        <button className="play-btn">▶</button>
      </div>
    </div>
  );
};

MovieCard.propTypes = {
  movie: PropTypes.shape({
    imdbID: PropTypes.string.isRequired,
    Title: PropTypes.string.isRequired,
    Year: PropTypes.string.isRequired,
    Poster: PropTypes.string.isRequired,
    Type: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default MovieCard;
