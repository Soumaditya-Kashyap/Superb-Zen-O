import { NavLink, useNavigate } from 'react-router-dom';
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
  MdAccountCircle,
  MdLogout 
} from 'react-icons/md';
import { RiSparklingFill } from 'react-icons/ri';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <AiFillStar className="logo-icon" />
        <span className="navbar-brand">SUPERB</span>
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
