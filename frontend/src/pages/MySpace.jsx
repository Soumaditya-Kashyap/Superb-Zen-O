import { useNavigate } from 'react-router-dom';
import { MdLogout, MdAccountCircle } from 'react-icons/md';

const MySpace = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const watchHistory = [
    { id: 1, title: "The Dark Knight", progress: 75, thumbnail: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=200&fit=crop" },
    { id: 2, title: "Breaking Bad S1E5", progress: 45, thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=200&fit=crop" },
  ];

  const watchlist = [
    { id: 1, title: "Inception", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=200&fit=crop" },
    { id: 2, title: "The Godfather", thumbnail: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=300&h=200&fit=crop" },
  ];

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/auth');
      window.location.reload();
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="glass-effect-dark rounded-2xl p-8 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-black text-3xl font-bold">
            {getInitials(user.name)}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{user.name || 'User Profile'}</h1>
            <p className="text-gold-light text-lg mb-1">@{user.nickName || 'username'}</p>
            <p className="text-white/60">{user.email || 'email@example.com'}</p>
            <p className="text-white/40 text-sm mt-2">Member since {formatDate(user.createdAt)}</p>
          </div>
        </div>
        <button 
          className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          onClick={handleLogout}
        >
          <MdLogout size={20} />
          <span>Logout</span>
        </button>
      </div>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Continue Watching</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {watchHistory.map((item) => (
            <div key={item.id} className="group relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105">
              <img src={item.thumbnail} alt={item.title} className="w-full h-48 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                <div className="h-full bg-gradient-to-r from-gold to-gold-light" style={{ width: `${item.progress}%` }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <h3 className="text-white font-semibold">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-6">My Watchlist</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {watchlist.map((item) => (
            <div key={item.id} className="group relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105">
              <img src={item.thumbnail} alt={item.title} className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <h3 className="text-white font-semibold">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MySpace;
