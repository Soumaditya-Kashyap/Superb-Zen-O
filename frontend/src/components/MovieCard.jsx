import PropTypes from 'prop-types';
import { Play, Star, Sparkles } from 'lucide-react';

const MovieCard = ({ movie, onClick, isPersonalized = false }) => {
  const posterUrl = movie.Poster && movie.Poster !== 'N/A' 
    ? movie.Poster 
    : 'https://placehold.co/300x450/1a1a1a/666?text=No+Poster';

  const handleImageError = (e) => {
    e.target.src = 'https://placehold.co/300x450/1a1a1a/666?text=No+Poster';
  };

  return (
    <div 
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gold/30 bg-gray-900"
      onClick={() => onClick(movie)}
    >
      <img 
        src={posterUrl} 
        alt={movie.Title}
        onError={handleImageError}
        loading="lazy"
        className="w-full h-[350px] object-cover transition-transform duration-500 group-hover:scale-110"
      />
      
      {/* Rating Badge */}
      {movie.imdbRating && movie.imdbRating !== 'N/A' && (
        <div className="absolute top-3 right-3 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg border border-gold/20">
          <Star className="w-4 h-4 text-gold fill-gold" />
          <span className="text-white text-sm font-bold">{movie.imdbRating}</span>
        </div>
      )}

      {/* Personalized Badge */}
      {isPersonalized && (
        <div className="absolute top-3 left-3 bg-gradient-to-r from-gold to-gold-light px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
          <Sparkles className="w-3 h-3 text-black" />
          <span className="text-black text-xs font-bold">For You</span>
        </div>
      )}
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
        <h3 className="text-white font-bold text-lg mb-1.5 line-clamp-2 drop-shadow-lg">{movie.Title}</h3>
        <div className="flex items-center justify-between mb-3">
          <p className="text-gold-light text-sm font-medium">{movie.Year}</p>
          {movie.Genre && (
            <span className="text-white/80 text-xs bg-white/10 px-2 py-0.5 rounded-full">
              {movie.Genre.split(',')[0].trim()}
            </span>
          )}
        </div>
        <button className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-gold-light text-black font-bold flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
          <Play size={18} fill="currentColor" />
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
    Genre: PropTypes.string,
    imdbRating: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  isPersonalized: PropTypes.bool,
};

export default MovieCard;
