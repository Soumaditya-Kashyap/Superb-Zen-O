

import { Users, Radio } from 'lucide-react';

const Sports = () => {
  const sports = [
    { id: 1, title: "IND vs SA 2nd Test", date: "Nov 22, 2025", live: true, thumbnail: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=250&fit=crop" },
    { id: 2, title: "Premier League", date: "Nov 23, 2025", live: false, thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=250&fit=crop" },
    { id: 3, title: "NBA Finals", date: "Nov 24, 2025", live: false, thumbnail: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=250&fit=crop" },
    { id: 4, title: "Formula 1", date: "Nov 25, 2025", live: false, thumbnail: "https://images.unsplash.com/photo-1540747913346-19e32664f986?w=400&h=250&fit=crop" },
  ];

  return (
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="mb-10">
        <h1 className="text-5xl font-bold text-white mb-2">Sports</h1>
        <p className="text-gray-400 text-lg">Watch live sports with friends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sports.map((sport) => (
          <div key={sport.id} className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-gold/20">
            {sport.live && (
              <span className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full flex items-center gap-1.5 animate-pulse">
                <Radio size={14} /> LIVE
              </span>
            )}
            <img src={sport.thumbnail} alt={sport.title} className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
              <h3 className="text-white font-bold text-xl mb-1">{sport.title}</h3>
              <p className="text-gold-light text-sm mb-3">{sport.date}</p>
              <button className="w-full py-2.5 bg-gradient-to-r from-gold to-gold-light text-black font-semibold rounded-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
                <Users size={18} /> Watch Together
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sports;
