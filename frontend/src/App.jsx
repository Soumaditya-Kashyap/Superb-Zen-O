import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Search from './pages/Search';
import TV from './pages/TV';
import Movies from './pages/Movies';
import Sports from './pages/Sports';
import Sparks from './pages/Sparks';
import Categories from './pages/Categories';
import MySpace from './pages/MySpace';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/tv" element={<TV />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/sports" element={<Sports />} />
            <Route path="/sparks" element={<Sparks />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/myspace" element={<MySpace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
