const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Video streaming endpoint for HLS
router.get('/stream/:movieId/:filename', (req, res) => {
  const { movieId, filename } = req.params;
  const videoPath = path.join(__dirname, '..', 'movie-hls', filename);

  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] VIDEO REQUEST: ${filename}`);

  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    console.log(`[${timestamp}] ERROR 404: File not found - ${filename}`);
    return res.status(404).json({ error: 'Video file not found' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const ext = path.extname(filename).toLowerCase();

  // Set appropriate content type based on file extension
  let contentType = 'application/octet-stream';
  if (ext === '.m3u8') {
    contentType = 'application/vnd.apple.mpegurl';
  } else if (ext === '.ts') {
    contentType = 'video/mp2t';
  }

  // Handle range requests for video segments
  const range = req.headers.range;

  if (range && ext === '.ts') {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    console.log(`[${timestamp}] STREAM: ${filename} | Range: ${start}-${end} | Size: ${(chunksize / 1024).toFixed(0)}KB`);

    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range'
    };

    res.writeHead(206, head);
    file.pipe(res);

    file.on('end', () => {
      console.log(`[${timestamp}] SUCCESS: ${filename} delivered`);
    });

    file.on('error', (err) => {
      console.log(`[${timestamp}] ERROR: ${err.message}`);
    });

  } else {
    // Serve full file (for m3u8 playlists)
    console.log(`[${timestamp}] PLAYLIST: ${filename} | Size: ${(fileSize / 1024).toFixed(1)}KB`);
    
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range'
    };

    res.writeHead(200, head);
    const stream = fs.createReadStream(videoPath);
    stream.pipe(res);

    stream.on('end', () => {
      console.log(`[${timestamp}] SUCCESS: ${filename} delivered`);
    });

    stream.on('error', (err) => {
      console.log(`[${timestamp}] ERROR: ${err.message}`);
    });
  }
});

// OPTIONS endpoint for CORS preflight
router.options('/stream/:movieId/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Range');
  res.sendStatus(200);
});

module.exports = router;
