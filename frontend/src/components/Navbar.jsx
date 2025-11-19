import { NavLink } from 'react-router-dom';
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
import './Navbar.css';

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
    <nav className="navbar">
      <div className="navbar-logo">
        <AiFillStar className="logo-icon" />
      </div>
      
      <ul className="navbar-menu">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink 
              to={item.path} 
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
