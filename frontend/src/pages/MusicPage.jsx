import { useEffect, useState, useRef, useCallback } from "react";

const CATEGORIES = [
  { label: "All", term: "top hits 2024" },
  { label: "Bollywood", term: "bollywood hindi" },
  { label: "Pop", term: "pop hits" },
  { label: "Rock", term: "rock hits" },
  { label: "Jazz", term: "jazz" },
  { label: "Electronic", term: "electronic dance" },
  { label: "Classical", term: "classical music" },
  { label: "Hip-Hop", term: "hip hop rap" },
  { label: "Ambient", term: "ambient chill" },
  { label: "Folk", term: "folk acoustic" },
  { label: "R&B", term: "rnb soul" },
];

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [searchInput, setSearchInput] = useState("");
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchSongs = useCallback((term) => {
    setLoading(true);
    setSongs([]);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&limit=100&entity=song`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        const results = (d.results || []).filter((s) => s.previewUrl);
        setSongs(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSongs(activeCat.term);
  }, []);

  const handleCategory = (cat) => {
    setActiveCat(cat);
    setSearchInput("");
    fetchSongs(cat.term);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.trim()) fetchSongs(val.trim());
      else fetchSongs(activeCat.term);
    }, 500);
  };

  const playSong = (song) => {
    if (current?.trackId === song.trackId) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else { audioRef.current.play(); setPlaying(true); }
      return;
    }
    setCurrent(song);
    setProgress(0); setCurrentTime(0); setDuration(0);
  };

  useEffect(() => {
    if (!current || !audioRef.current) return;
    audioRef.current.src = current.previewUrl;
    audioRef.current.volume = volume;
    audioRef.current.play().catch(() => {});
  }, [current]);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    setCurrentTime(a.currentTime);
    setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
  };

  const onLoadedMetadata = () => setDuration(audioRef.current?.duration || 0);

  const onEnded = () => {
    const idx = songs.findIndex((s) => s.trackId === current?.trackId);
    if (idx >= 0 && idx < songs.length - 1) playSong(songs[idx + 1]);
    else setPlaying(false);
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = ratio * (audioRef.current?.duration || 0);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
    setProgress(ratio * 100);
  };

  const skipNext = () => {
    const idx = songs.findIndex((s) => s.trackId === current?.trackId);
    if (idx < songs.length - 1) playSong(songs[idx + 1]);
  };

  const skipPrev = () => {
    const idx = songs.findIndex((s) => s.trackId === current?.trackId);
    if (idx > 0) playSong(songs[idx - 1]);
  };

  const artwork = (url, size = 300) =>
    url ? url.replace("100x100", `${size}x${size}`) : `https://placehold.co/${size}x${size}/1a1a1a/555?text=♪`;

  return (
    <div style={{ fontFamily: "Georgia, serif", minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:#111}
        ::-webkit-scrollbar-thumb{background:#c9a84c;border-radius:3px}
        .card{transition:all .22s;cursor:pointer;border-radius:10px;overflow:hidden;background:#111;border:1.5px solid #1e1e1e}
        .card:hover{transform:translateY(-4px);border-color:#c9a84c55;background:#161208}
        .card.active{border-color:#c9a84c !important;background:#1a1608 !important}
        .card .overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s}
        .card:hover .overlay,.card.active .overlay{opacity:1}
        .cat-btn{border:1px solid #2a2a2a;background:transparent;color:#777;padding:5px 15px;border-radius:20px;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px;transition:all .18s;white-space:nowrap}
        .cat-btn:hover{border-color:#c9a84c;color:#c9a84c}
        .cat-btn.active{background:#c9a84c;color:#0a0a0a;border-color:#c9a84c;font-weight:700}
        input[type=range]{-webkit-appearance:none;height:3px;background:#333;border-radius:2px;outline:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:#c9a84c;cursor:pointer}
        .play-btn{width:46px;height:46px;border-radius:50%;border:none;background:#c9a84c;color:#0a0a0a;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
        .play-btn:hover{background:#e8c96a;transform:scale(1.07)}
        .icon-btn{background:transparent;border:none;color:#777;cursor:pointer;font-size:18px;padding:4px 8px;transition:color .2s}
        .icon-btn:hover{color:#c9a84c}
        .search-box{width:100%;background:#141414;border:1px solid #2a2a2a;color:#e8e0d0;padding:9px 14px 9px 38px;border-radius:8px;font-family:'DM Mono',monospace;font-size:13px;outline:none;transition:border-color .2s}
        .search-box:focus{border-color:#c9a84c}
        .search-box::placeholder{color:#444}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .spinner{width:30px;height:30px;border:3px solid #1e1e1e;border-top-color:#c9a84c;border-radius:50%;animation:spin .8s linear infinite}
        .dot{width:7px;height:7px;border-radius:50%;background:#c9a84c;animation:pulse 1.1s ease-in-out infinite;display:inline-block}
        .progress-bar{height:4px;background:#1e1e1e;border-radius:2px;cursor:pointer;flex:1}
        .progress-fill{height:100%;background:linear-gradient(90deg,#c9a84c,#f0d878);border-radius:2px;transition:width .1s linear}
        .vinyl{border-radius:50%;object-fit:cover;flex-shrink:0}
        @keyframes vspin{to{transform:rotate(360deg)}}
        .vinyl.spinning{animation:vspin 7s linear infinite}
      `}</style>

      {/* Header */}
<div
  style={{padding: "24px 28px 16px",borderBottom: "1px solid #181818",position: "fixed",top: 0,left: 0,right: 0,zIndex: 200,background: "#0a0a0a",marginLeft: "55px"}}
>        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "16px" }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "32px", fontWeight: 900, letterSpacing: "-1px",  }}>
              𝄞 POWERED BY SUPERB SONG 𝄞 
          </h1>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#444" }}>
            iTunes · 30s previews · free
          </span>
        </div>

            {/* audio frequency animation */}

<div className="absolute top-6 right-8 flex items-end gap-[3px] h-12 w-18" >
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[20%] bg-[#c9a84c] rounded`} style={{animationDelay:"0s"}}></span>
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[60%] bg-[#c9a84c] rounded`} style={{animationDelay:"0.1s"}}></span>
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[35%] bg-[#c9a84c] rounded`} style={{animationDelay:"0.2s"}}></span>
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[80%] bg-[#c9a84c] rounded`} style={{animationDelay:"0.3s"}}></span>
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[40%] bg-[#c9a84c] rounded`} style={{animationDelay:"0.4s"}}></span>
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[70%] bg-[#c9a84c] rounded`} style={{animationDelay:"0.5s"}}></span>
  <span className={`${playing ? "animate-eq" : ""} w-[3px] h-[50%] bg-[#c9a84c] rounded`} style={{animationDelay:"0.6s"}}></span>
</div>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: "460px", marginBottom: "14px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: "15px", pointerEvents: "none" }}>⌕</span>
          <input
            className="search-box"
            type="text"
            placeholder="Search songs, artists, albums..."
            value={searchInput}
            onChange={handleSearch}
          />
        </div>

        {/* Categories */}
        <div style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "2px" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              className={`cat-btn${activeCat.label === c.label && !searchInput ? " active" : ""}`}
              onClick={() => handleCategory(c)}
            >
              {c.label}
            </button>
          ))}
        </div>

      </div>


      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px", paddingBottom: current ? "120px" : "22px",   marginTop: "140px", }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
            <div className="spinner" />
          </div>
        ) : songs.length === 0 ? (
          <div style={{ textAlign: "center", color: "#444", paddingTop: "80px", fontFamily: "'DM Mono',monospace", fontSize: "13px" }}>
            No songs found. Try searching something else.
          </div>
        ) : (
          <>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "11px", color: "#555", marginBottom: "16px" }}>
              {songs.length} tracks {searchInput ? `for "${searchInput}"` : `· ${activeCat.label}`}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "14px" }}>
              {songs.map((song) => {
                const isActive = current?.trackId === song.trackId;
                return (
                  <div
                    key={song.trackId}
                    className={`card${isActive ? " active" : ""}`}
                    onClick={() => playSong(song)}
                  >
                    <div style={{ position: "relative" }}>
                      <img
                        src={artwork(song.artworkUrl100, 300)}
                        alt=""
                        style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                        onError={(e) => { e.target.src = "https://placehold.co/300x300/1a1a1a/555?text=♪"; }}
                      />
                      <div className="overlay">
                        <span style={{ fontSize: "36px" }}>{isActive && playing ? "⏸" : "▶"}</span>
                      </div>
                      {isActive && playing && (
                        <div style={{ position: "absolute", top: "7px", right: "7px", background: "rgba(10,10,10,.7)", borderRadius: "50%", padding: "5px 6px" }}>
                          <span className="dot" />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "10px 10px 12px" }}>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "12px", fontWeight: 700, color: isActive ? "#c9a84c" : "#e8e0d0", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {song.trackName}
                      </p>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#666", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {song.artistName}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "7px" }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#555" }}>
                          {song.primaryGenreName}
                        </span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "9px", color: "#555" }}>
                          {formatTime(song.trackTimeMillis / 1000)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Player Bar */}
      {current && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d0b07", borderTop: "1px solid #c9a84c33", padding: "10px 24px 12px", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "9px" }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#555", minWidth: "32px" }}>{formatTime(currentTime)}</span>
            <div className="progress-bar" onClick={seek}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#555", minWidth: "32px", textAlign: "right" }}>{formatTime(duration)}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              className={`vinyl${playing ? " spinning" : ""}`}
              src={artwork(current.artworkUrl100, 200)}
              alt=""
              style={{ width: "46px", height: "46px", border: "2px solid #2a2a2a" }}
              onError={(e) => { e.target.src = "https://placehold.co/200x200/1a1a1a/555?text=♪"; }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "13px", fontWeight: 700, color: "#c9a84c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {current.trackName}
              </p>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: "10px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {current.artistName} · {current.collectionName}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button className="icon-btn" onClick={skipPrev}>⏮</button>
              <button className="play-btn" onClick={() => {
                if (playing) { audioRef.current.pause(); setPlaying(false); }
                else { audioRef.current.play(); setPlaying(true); }
              }}>
                {playing ? "⏸" : "▶"}
              </button>
              <button className="icon-btn" onClick={skipNext}>⏭</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}>
              <span style={{ fontSize: "13px", color: "#555" }}>🔊</span>
              <input type="range" min="0" max="1" step="0.01" value={volume}
                onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
                style={{ width: "80px" }}
              />
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}