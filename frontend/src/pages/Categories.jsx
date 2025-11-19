import './Categories.css';

const Categories = () => {
  const categories = [
    { id: 1, name: "Action", icon: "💥", color: "#FF4444" },
    { id: 2, name: "Comedy", icon: "😂", color: "#FFD700" },
    { id: 3, name: "Drama", icon: "🎭", color: "#9370DB" },
    { id: 4, name: "Horror", icon: "👻", color: "#8B0000" },
    { id: 5, name: "Romance", icon: "💕", color: "#FF69B4" },
    { id: 6, name: "Sci-Fi", icon: "🚀", color: "#00CED1" },
    { id: 7, name: "Thriller", icon: "🔪", color: "#DC143C" },
    { id: 8, name: "Documentary", icon: "📽️", color: "#32CD32" },
  ];

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1>Categories</h1>
        <p>Browse content by genre</p>
      </div>

      <div className="categories-grid">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="category-card"
            style={{ '--accent-color': category.color }}
          >
            <span className="category-icon">{category.icon}</span>
            <h3>{category.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
