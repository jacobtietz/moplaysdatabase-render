// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS: allow frontend requests
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(cors({ origin: CLIENT_URL }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Play model
const Play = require('./models/Play');

// GET all plays
app.get('/api/plays', async (req, res) => {
  try {
    const plays = await Play.find({});
    res.json(plays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new play (optional)
app.post('/api/plays', async (req, res) => {
  try {
    const play = new Play(req.body);
    await play.save();
    res.json(play);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test route (optional)
app.get('/api/hello', (req, res) => res.json({ msg: 'Hello from backend!' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
