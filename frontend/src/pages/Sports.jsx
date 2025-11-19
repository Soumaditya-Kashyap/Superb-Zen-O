import './Sports.css';

const Sports = () => {
  const sports = [
    { id: 1, title: "IND vs SA 2nd Test", date: "Nov 22, 2025", live: true, thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=250&fit=crop" },
    { id: 2, title: "Premier League", date: "Nov 23, 2025", live: false, thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop" },
    { id: 3, title: "NBA Finals", date: "Nov 24, 2025", live: false, thumbnail: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=250&fit=crop" },
    { id: 4, title: "Formula 1", date: "Nov 25, 2025", live: false, thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32664f986?w=400&h=250&fit=crop" },
  ];

  return (
    <div className="sports-page">
      <div className="page-header">
        <h1>Sports</h1>
        <p>Watch live sports with friends</p>
      </div>

      <div className="sports-grid">
        {sports.map((sport) => (
          <div key={sport.id} className="sport-card">
            {sport.live && <span className="live-badge">🔴 LIVE</span>}
            <img src={sport.thumbnail} alt={sport.title} />
            <div className="sport-info">
              <h3>{sport.title}</h3>
              <p className="sport-date">{sport.date}</p>
              <button className="watch-btn">👥 Watch Together</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sports;
