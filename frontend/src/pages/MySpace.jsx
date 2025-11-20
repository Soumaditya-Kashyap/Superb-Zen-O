import { useNavigate } from 'react-router-dom';
import { MdLogout, MdAccountCircle } from 'react-icons/md';
import './MySpace.css';

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
    <div className="myspace-page">
      <div className="profile-section">
        <div className="profile-avatar">
          <span>{getInitials(user.name)}</span>
        </div>
        <div className="profile-info">
          <h1>{user.name || 'User Profile'}</h1>
          <p className="profile-nickname">@{user.nickName || 'username'}</p>
          <p className="profile-email">{user.email || 'email@example.com'}</p>
          <p className="profile-member">Member since {formatDate(user.createdAt)}</p>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          <MdLogout className="logout-icon" />
          <span>Logout</span>
        </button>
      </div>

      <section className="space-section">
        <h2>Continue Watching</h2>
        <div className="content-grid">
          {watchHistory.map((item) => (
            <div key={item.id} className="content-card">
              <img src={item.thumbnail} alt={item.title} />
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${item.progress}%` }}></div>
              </div>
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="space-section">
        <h2>My Watchlist</h2>
        <div className="content-grid">
          {watchlist.map((item) => (
            <div key={item.id} className="content-card">
              <img src={item.thumbnail} alt={item.title} />
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MySpace;
