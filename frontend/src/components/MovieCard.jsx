import PropTypes from 'prop-types';
import { Play } from 'lucide-react';

const MovieCard = ({ movie, onClick }) => {
  const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://via.placeholder.com/300x450?text=No+Poster';

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x450?text=No+Poster';
  };

  return (
    <div 
      className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gold/20"
      onClick={() => onClick(movie)}
    >
      <img 
        src={posterUrl} 
        alt={movie.Title}
        onError={handleImageError}
        loading="lazy"
        className="w-full h-[350px] object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{movie.Title}</h3>
        <p className="text-gold-light text-sm mb-3">{movie.Year}</p>
        <button className="w-10 h-10 rounded-full bg-gradient-to-r from-gold to-gold-light text-black font-bold flex items-center justify-center hover:scale-110 transition-transform">
          <Play size={16} fill="currentColor" />
        </button>
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
