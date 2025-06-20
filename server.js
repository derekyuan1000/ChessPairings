const express = require('express');
const fs = require('fs');
const path = require('path');
const SwissTournament = require('./swissTournament');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Add this to parse JSON bodies

// Load players from JSON
function loadPlayers() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'players.json'), 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if file doesn't exist or has invalid content
    return [];
  }
}

// Tournament instance (in-memory)
let tournament = null;
// Store all rounds' pairings for navigation
let roundsHistory = [];

app.get('/', (req, res, next) => {
  // Reset players.json to empty array when the page loads
  try {
    fs.writeFileSync(path.join(__dirname, 'players.json'), '[]', 'utf-8');
    tournament = null;
    roundsHistory = [];
  } catch (error) {
    console.error('Error resetting players.json:', error);
  }
  next();
});

app.get('/api/pairings', (req, res) => {
  if (!tournament) {
    const players = loadPlayers();
    tournament = new SwissTournament(players);
    tournament.firstRound();
  }
  res.json(tournament.pairings);
});

app.get('/api/standings', (req, res) => {
  if (!tournament) {
    const players = loadPlayers();
    tournament = new SwissTournament(players);
    tournament.firstRound();
  }
  res.json(tournament.getFinalStandings());
});

// For demo: advance to next round
app.post('/api/next-round', (req, res) => {
  if (!tournament) {
    const players = loadPlayers();
    tournament = new SwissTournament(players);
    tournament.firstRound();
    roundsHistory = [JSON.parse(JSON.stringify(tournament.pairings))];
  } else {
    tournament.nextRound();
    roundsHistory.push(JSON.parse(JSON.stringify(tournament.pairings)));
  }
  res.json(tournament.pairings);
});

app.post('/api/prev-round', (req, res) => {
  if (!tournament || roundsHistory.length <= 1) {
    return res.json({ error: 'No previous round' });
  }
  // Remove the last round
  roundsHistory.pop();
  // Rebuild tournament state up to the previous round
  const players = loadPlayers();
  tournament = new SwissTournament(players);
  tournament.firstRound();
  for (let i = 1; i < roundsHistory.length; i++) {
    tournament.nextRound();
  }
  // Restore pairings to previous round
  tournament.pairings = JSON.parse(JSON.stringify(roundsHistory[roundsHistory.length - 1]));
  res.json(tournament.pairings);
});

app.post('/api/reset-tournament', (req, res) => {
  tournament = null;
  roundsHistory = [];
  res.json({ success: true });
});

app.post('/api/submit-results', (req, res) => {
  if (!tournament) {
    return res.status(400).json({ error: 'Tournament not started' });
  }
  const { results } = req.body;
  if (!Array.isArray(results) || results.length !== tournament.pairings.length) {
    return res.status(400).json({ error: 'Invalid results' });
  }
  // Record results for each pairing
  for (let i = 0; i < tournament.pairings.length; i++) {
    const result = results[i];
    if (result && result !== '' && result !== 'Select') {
      tournament.pairings[i].result = result;
      tournament.recordResult(tournament.pairings[i], result);
    }
  }
  res.json({ success: true });
});

app.post('/api/load-players', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }
  // Run the Python webscraper with the provided URL
  exec(`python webscraper.py "${url}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Webscraper error:', stderr);
      return res.status(500).json({ error: 'Failed to scrape players' });
    }
    try {
      // Reload tournament with new players
      const players = loadPlayers();
      tournament = new SwissTournament(players);
      tournament.firstRound();
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to load players' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
