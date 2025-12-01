import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  MessageCircle,
  Radio,
  LayoutGrid,
  Zap,
  Music,
  Settings,
  HelpCircle
} from 'lucide-react';
import { AiFillStar } from 'react-icons/ai';

const Navbar = () => {
  const navItems = [

    { path: '/', icon: <Home />, label: 'Home' },
    { path: '/watch-together', icon: <Users />, label: 'Watch Together' },
    { path: '/chat', icon: <MessageCircle />, label: 'Chat' },
    { path: '/live', icon: <Radio />, label: 'Live' },
    { path: '/categories', icon: <LayoutGrid />, label: 'Categories' },
    { path: '/sparks', icon: <Zap />, label: 'Sparks' },
    { path: '/music', icon: <Music />, label: 'Music' },
  ];

  const bottomNavItems = [
    { path: '/support', icon: <HelpCircle />, label: 'Support' },
    { path: '/settings', icon: <Settings />, label: 'Settings' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-20 glass-effect flex flex-col items-center py-5 z-[1000] border-r border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-300 hover:w-56 hover:bg-black/60 group">

      {/* Logo Section */}
      <div className="mb-10 w-full px-5">
        <div className="flex items-center gap-3 w-full py-[18px] px-3
             transition-all duration-300">

          {/* Logo Icon */}
          <div className="min-w-[40px] flex items-center justify-center -ml-2">
            <img
              src="https://ik.imagekit.io/tjwfni5wku/icon-for-dark.png"
              alt="Logo"
              className="w-8 h-8 object-contain transition-all duration-300 group-hover:scale-110"
            />
          </div>
          {/* Logo Text / Image */}
          <img
            src="https://ik.imagekit.io/ugweqp16c/images/appLogo/superb-light.png?updatedAt=1764608226250"
            alt="Superb"
            className="w-32 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </div>
      </div>

      {/* Main Navigation */}
      <ul className="list-none p-0 m-0 w-full flex-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <li key={item.path} className="w-full">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center py-[18px] px-5 text-white no-underline transition-all duration-300 relative overflow-hidden ${isActive
                  ? 'bg-gold/20 backdrop-blur-[10px] border-l-[3px] border-gold shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]'
                  : 'hover:bg-gold/15 hover:backdrop-blur-[10px]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-2xl min-w-[40px] flex items-center justify-center transition-all duration-300 ${isActive ? 'text-gold scale-110' : 'group-hover:text-gold group-hover:scale-110'
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

      {/* Bottom Navigation */}
      <div className="w-full border-t border-white/10 pt-4 mt-4">
        <ul className="list-none p-0 m-0 w-full">
          {bottomNavItems.map((item) => (
            <li key={item.path} className="w-full">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center py-[18px] px-5 text-white no-underline transition-all duration-300 relative overflow-hidden ${isActive
                    ? 'bg-gold/20 backdrop-blur-[10px] border-l-[3px] border-gold shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]'
                    : 'hover:bg-gold/15 hover:backdrop-blur-[10px]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`text-2xl min-w-[40px] flex items-center justify-center transition-all duration-300 ${isActive ? 'text-gold scale-110' : 'group-hover:text-gold group-hover:scale-110'
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
      </div>
    </nav>
  );
};

export default Navbar;
