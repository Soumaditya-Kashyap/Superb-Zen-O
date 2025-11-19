import './Sparks.css';

const Sparks = () => {
  const sparks = [
    { id: 1, title: "Movie Trivia", thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=300&fit=crop" },
    { id: 2, title: "Behind the Scenes", thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=300&fit=crop" },
    { id: 3, title: "Cast Interviews", thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=300&fit=crop" },
    { id: 4, title: "Fan Theories", thumbnail: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=300&h=300&fit=crop" },
    { id: 5, title: "Movie Facts", thumbnail: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=300&fit=crop" },
    { id: 6, title: "Bloopers", thumbnail: "https://images.unsplash.com/photo-1574267432644-f74e8cee3dd3?w=300&h=300&fit=crop" },
  ];

  return (
    <div className="sparks-page">
      <div className="page-header">
        <h1>Sparks</h1>
        <p>Short clips and fun content</p>
      </div>

      <div className="sparks-grid">
        {sparks.map((spark) => (
          <div key={spark.id} className="spark-card">
            <img src={spark.thumbnail} alt={spark.title} />
            <div className="spark-overlay">
              <h3>{spark.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sparks;
