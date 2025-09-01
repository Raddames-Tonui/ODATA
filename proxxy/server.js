const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();

// 🔧 CORS config:
// For dev, you can allow localhost and your GitHub Pages domain.
// For simplicity during dev set origin: true (reflect origin) or '*'.
// In production prefer explicit origins.
const allowedOrigins = [
  'http://localhost:55310',          // your local frontend (example)
  'http://localhost:3000',           // if needed
  'https://<your-github-username>.github.io' // replace when deploying frontend
];

app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return cb(null, true);
    // If you want to allow all origins for now: return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // otherwise reject
    return cb(new Error('CORS not allowed by proxy'));
  }
}));

// Simple proxy: forward /odata/* to https://services.odata.org/*
app.get('/odata/*', async (req, res) => {
  try {
    // Build target URL by removing "/odata" prefix
    const target = 'https://services.odata.org' + req.originalUrl.replace(/^\/odata/, '');
    // Forward the request (GET only in this example)
    const upstream = await fetch(target, {
      headers: {
        // forward Accept so API returns JSON
        'Accept': req.get('Accept') || 'application/json'
      },
      // keep method, query are already part of target
    });

    // Forward status and headers (basic)
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      // avoid forwarding hop-by-hop headers that might break things
      if (['transfer-encoding', 'content-encoding', 'connection'].includes(k)) return;
      res.set(k, v);
    });

    const body = await upstream.text();
    res.send(body);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
});

// Use the PORT provided by host (Render / Heroku) or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy listening on :${PORT}`));
