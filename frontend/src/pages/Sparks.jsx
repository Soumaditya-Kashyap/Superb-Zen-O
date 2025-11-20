

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
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-2">Sparks</h1>
        <p className="text-gray-400 text-lg">Short clips and fun content</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {sparks.map((spark) => (
          <div key={spark.id} className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-gold/20">
            <img src={spark.thumbnail} alt={spark.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <h3 className="text-white font-semibold text-sm">{spark.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sparks;
