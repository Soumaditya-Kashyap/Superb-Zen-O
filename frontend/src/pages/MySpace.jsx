import './MySpace.css';

const MySpace = () => {
  const watchHistory = [
    { id: 1, title: "The Dark Knight", progress: 75, thumbnail: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=200&fit=crop" },
    { id: 2, title: "Breaking Bad S1E5", progress: 45, thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=200&fit=crop" },
  ];

  const watchlist = [
    { id: 1, title: "Inception", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=200&fit=crop" },
    { id: 2, title: "The Godfather", thumbnail: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=300&h=200&fit=crop" },
  ];

  return (
    <div className="myspace-page">
      <div className="profile-section">
        <div className="profile-avatar">
          <span>U</span>
        </div>
        <div className="profile-info">
          <h1>User Profile</h1>
          <p>Member since November 2025</p>
        </div>
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
