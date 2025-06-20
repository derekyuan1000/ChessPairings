const express = require('express');
const fs = require('fs');
const path = require('path');
const SwissTournament = require('./swissTournament');
const https = require('https');

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

// Instead of using Python for scraping, implement the scraping in Node.js
app.post('/api/load-players', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  // Implement a Node.js version of the webscraper instead of calling Python
  fetchChessPlayersFromUrl(url)
    .then(players => {
      if (players.length > 0) {
        // Save to players.json
        fs.writeFileSync(path.join(__dirname, 'players.json'), JSON.stringify(players, null, 2), 'utf-8');

        // Create tournament
        tournament = new SwissTournament(players);
        tournament.firstRound();
        roundsHistory = [JSON.parse(JSON.stringify(tournament.pairings))];

        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'No players found in the URL' });
      }
    })
    .catch(error => {
      console.error('Error scraping data:', error);
      res.status(500).json({ error: 'Failed to scrape players: ' + error.message });
    });
});

// Node.js implementation of chess player data scraping
function fetchChessPlayersFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';

      // A chunk of data has been received
      response.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received
      response.on('end', () => {
        try {
          const players = [];

          // Basic HTML parsing using regex (not as robust as BeautifulSoup but works for simple cases)
          // Find table rows
          const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

          let rows = [];
          let match;

          // Extract rows
          while ((match = tableRowRegex.exec(data)) !== null) {
            rows.push(match[1]);
          }

          // Skip header row
          rows = rows.slice(1);

          // Process each row
          rows.forEach((row, idx) => {
            const cells = [];
            let cellMatch;

            // Extract cells from this row
            while ((cellMatch = cellRegex.exec(row)) !== null) {
              // Remove HTML tags from cell content
              const cellContent = cellMatch[1].replace(/<[^>]*>/g, '').trim();
              cells.push(cellContent);
            }

            if (cells.length >= 3) {
              // Try to determine which columns contain name and rating
              let nameIdx = 2; // Default guess
              let ratingIdx = -1;

              // Look for rating (a number between 1000-3000)
              for (let i = 0; i < cells.length; i++) {
                const value = parseInt(cells[i]);
                if (!isNaN(value) && value >= 1000 && value <= 3000) {
                  ratingIdx = i;
                  break;
                }
              }

              // Look for a name (longer text with a space)
              for (let i = 0; i < cells.length; i++) {
                if (cells[i].length > 5 && cells[i].includes(' ')) {
                  nameIdx = i;
                  break;
                }
              }

              const name = cells[nameIdx];
              const rating = ratingIdx >= 0 ? parseInt(cells[ratingIdx]) : 0;

              // Find FIDE ID (a number between 4-8 digits)
              let fideId = `p${idx+1}`;
              for (let i = 0; i < cells.length; i++) {
                if (i !== ratingIdx && /^\d{4,8}$/.test(cells[i])) {
                  fideId = cells[i];
                  break;
                }
              }

              players.push({
                id: idx + 1,
                name,
                fide_id: fideId,
                rating: isNaN(rating) ? 0 : rating
              });
            }
          });

          console.log(`Successfully extracted ${players.length} players`);
          resolve(players);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
