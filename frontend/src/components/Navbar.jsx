import { NavLink } from 'react-router-dom';
import { Home, Search, Film, Tv, Trophy, Zap, Grid, User } from 'lucide-react';
import { 
  AiFillHome, 
  AiOutlineSearch, 
  AiFillStar 
} from 'react-icons/ai';
import { 
  BiSolidCameraMovie, 
  BiSolidCategory 
} from 'react-icons/bi';
import { 
  MdSports, 
  MdLiveTv, 
  MdAccountCircle
} from 'react-icons/md';
import { RiSparklingFill } from 'react-icons/ri';

const Navbar = () => {
  const navItems = [
    { path: '/', icon: <AiFillHome />, label: 'Home' },
    { path: '/search', icon: <AiOutlineSearch />, label: 'Search' },
    { path: '/tv', icon: <MdLiveTv />, label: 'TV' },
    { path: '/movies', icon: <BiSolidCameraMovie />, label: 'Movies' },
    { path: '/sports', icon: <MdSports />, label: 'Sports' },
    { path: '/sparks', icon: <RiSparklingFill />, label: 'Sparks' },
    { path: '/categories', icon: <BiSolidCategory />, label: 'Categories' },
    { path: '/myspace', icon: <MdAccountCircle />, label: 'My Space' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-20 glass-effect flex flex-col items-center py-5 z-[1000] border-r border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-300 hover:w-56 hover:bg-black/60 group">
      <div className="mb-10 flex items-center justify-center gap-2.5 w-full px-5">
        <AiFillStar className="text-[32px] text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
        <span className="text-lg font-bold text-gold opacity-0 whitespace-nowrap transition-opacity duration-300 group-hover:opacity-100">
          SUPERB
        </span>
      </div>
      
      <ul className="list-none p-0 m-0 w-full flex-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <li key={item.path} className="w-full">
            <NavLink 
              to={item.path} 
              className={({ isActive }) => 
                `flex items-center py-[18px] px-5 text-white no-underline transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'bg-gold/20 backdrop-blur-[10px] border-l-[3px] border-gold shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]'
                    : 'hover:bg-gold/15 hover:backdrop-blur-[10px]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-2xl min-w-[40px] flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'text-gold scale-110' : 'group-hover:text-gold group-hover:scale-110'
                  }`}>
                    {item.icon}
                  </span>
                  <span className="ml-[15px] text-[15px] font-medium opacity-0 whitespace-nowrap transition-opacity duration-300 tracking-[0.3px] group-hover:opacity-100">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
