import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdLogout, MdAccountCircle } from 'react-icons/md';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_LINK || 'http://localhost:5000';

const MySpace = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  // Fetch latest user data with preferences
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          // Update localStorage with latest data
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const watchHistory = [
    { id: 1, title: "The Dark Knight", progress: 75, thumbnail: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=300&h=200&fit=crop" },
    { id: 2, title: "Breaking Bad S1E5", progress: 45, thumbnail: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&h=200&fit=crop" },
  ];

  const watchlist = [
    { id: 1, title: "Inception", thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&h=200&fit=crop" },
    { id: 2, title: "The Godfather", thumbnail: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=300&h=200&fit=crop" },
  ];

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };


  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fileInputRef = useRef(null);
  const handleProfileUpload = async (e) => {
    try {

      const file = e.target.files[0];

      if (!file) return;

      console.log("Selected File:", file);

      const formData = new FormData();

      formData.append("image", file);

      const response = await fetch(
        `${API_URL}/api/profile/upload-profile`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
          credentials: "include",
        }
      );


      // upload
      const data = await response.json();

      console.log("Upload Response:", data);

      if (data.success) {

        alert("Profile picture uploaded successfully");

        const updatedUser = {
          ...user,
          profilePicture: data.imageUrl,
        };

        setUser(updatedUser);

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );

      } else {

        alert(data.message || "Upload failed");
      }

    } catch (error) {

      console.log("FULL ERROR:", error);

      if (error.response) {
        console.log("Response Error:", error.response.data);
      }

      alert(error.message);
    }
  };

  return (
    <div className="px-10 py-10 min-h-screen bg-black">
      <div className="glass-effect-dark rounded-2xl p-8 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-6">





          <div className="relative group w-fit">
            {/* Profile Circle */}
            <div
              onClick={() => user.profilePicture ? setIsPreviewOpen(!isPreviewOpen) : fileInputRef.current.click()}
              className={`
      w-24 h-24 rounded-full overflow-hidden border-2 border-gold 
      flex items-center justify-center bg-gradient-to-br from-gold to-gold-light 
      cursor-pointer transition-all duration-300 z-20 relative
      ${isPreviewOpen ? 'scale-[2.5] translate-y-12 shadow-2xl ring-4 ring-black/20' : 'hover:scale-105'}
    `}
            >
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-black text-3xl font-bold">{getInitials(user.name)}</span>
              )}
            </div>

            {/* Overlay to close preview when clicking outside */}
            {isPreviewOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsPreviewOpen(false)} />
            )}

            {/* Change Photo Button - Hidden when previewing */}
            {user.profilePicture && !isPreviewOpen && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 px-3 py-1 rounded-lg bg-gold text-black text-xs font-semibold shadow-lg z-30"
              >
                Change Photo
              </button>
            )}

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleProfileUpload} className="hidden" />
          </div>



          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{user.name || 'User Profile'}</h1>
            <p className="text-gold-light text-lg mb-1">@{user.nickName || 'username'}</p>
            <p className="text-white/60">{user.email || 'email@example.com'}</p>
            <p className="text-white/40 text-sm mt-2">Member since {formatDate(user.createdAt)}</p>

            {user.preferences && (user.preferences.genres?.length > 0 || user.preferences.languages?.length > 0) && (
              <div className="mt-4 space-y-2">
                {user.preferences.genres?.length > 0 && (
                  <div>
                    <p className="text-white/60 text-sm mb-1">Favorite Genres:</p>
                    <div className="flex flex-wrap gap-2">
                      {user.preferences.genres.map((genre, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gold/20 text-gold border border-gold/30 rounded-full text-xs font-medium capitalize">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {user.preferences.languages?.length > 0 && (
                  <div>
                    <p className="text-white/60 text-sm mb-1">Languages:</p>
                    <div className="flex flex-wrap gap-2">
                      {user.preferences.languages.map((lang, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white/10 text-white/80 border border-white/20 rounded-full text-xs font-medium capitalize">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          onClick={handleLogout}
        >
          <MdLogout size={20} />
          <span>Logout</span>
        </button>
      </div>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">Continue Watching</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {watchHistory.map((item) => (
            <div key={item.id} className="group relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105">
              <img src={item.thumbnail} alt={item.title} className="w-full h-48 object-cover" />
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                <div className="h-full bg-gradient-to-r from-gold to-gold-light" style={{ width: `${item.progress}%` }}></div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <h3 className="text-white font-semibold">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold text-white mb-6">My Watchlist</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {watchlist.map((item) => (
            <div key={item.id} className="group relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105">
              <img src={item.thumbnail} alt={item.title} className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                <h3 className="text-white font-semibold">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MySpace;