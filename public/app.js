// Client-side tournament state management
let tournament = null;

// Web scraper replacement for client-side
async function fetchPlayersFromUrl(url) {
    try {
        document.getElementById('loading-indicator').style.display = 'block';

        // Try multiple CORS proxies in sequence until one works
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`
        ];

        let html = null;
        let proxyUsed = null;

        // Try each proxy until one works
        for (const proxyUrl of proxies) {
            try {
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    html = await response.text();
                    proxyUsed = proxyUrl;
                    break;
                }
            } catch (error) {
                console.log(`Proxy failed: ${proxyUrl}`, error);
                // Continue to next proxy
            }
        }

        if (!html) {
            throw new Error('All proxies failed to fetch data');
        }

        console.log(`Successfully fetched data using: ${proxyUsed}`);

        // Parse the HTML using DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Try to find chess tournament tables with different possible class names
        const possibleTableSelectors = [
            'table.CRs1',
            'table.TBL_starting_rank',
            'table.default-table-list',
            'table.table-standings',
            'table.table-players'
        ];

        let table = null;
        for (const selector of possibleTableSelectors) {
            const foundTable = doc.querySelector(selector);
            if (foundTable) {
                table = foundTable;
                console.log(`Found table with selector: ${selector}`);
                break;
            }
        }

        if (!table) {
            // If no table found with known classes, try any table that looks like it has player data
            const allTables = doc.querySelectorAll('table');
            for (const possibleTable of allTables) {
                const rows = possibleTable.querySelectorAll('tr');
                if (rows.length > 5) { // Assume tables with several rows might be player lists
                    const firstRow = rows[1]; // Skip header
                    const cells = firstRow.querySelectorAll('td');
                    // Check if this table has enough columns to possibly be player data
                    if (cells.length >= 5) {
                        table = possibleTable;
                        console.log('Found table based on structure');
                        break;
                    }
                }
            }
        }

        if (!table) {
            throw new Error('Could not find any player data table in the page');
        }

        const players = [];
        const rows = table.querySelectorAll('tr');

        // Determine which columns contain name and rating
        // Usually, name is in the longest text cell, rating is a number between 1000-3000
        let nameColumn = 2; // Default guesses based on common formats
        let ratingColumn = 5;

        // Try to detect columns by analyzing the first few rows
        if (rows.length > 2) {
            const sampleRow = rows[1]; // First non-header row
            const cells = sampleRow.querySelectorAll('td');

            for (let i = 0; i < cells.length; i++) {
                const text = cells[i].textContent.trim();
                // Rating is usually a number between 1000-3000
                if (/^\d{4}$/.test(text) || /^\d{3,4}$/.test(text)) {
                    ratingColumn = i;
                }
                // Name is usually the longest text content
                if (text.length > 5 && text.includes(' ')) {
                    nameColumn = i;
                }
            }
        }

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll('td');
            if (cells.length >= Math.max(nameColumn, ratingColumn) + 1) {
                let name = cells[nameColumn].textContent.trim();
                let rating = cells[ratingColumn]?.textContent.trim() || "0";

                // Find a column that might be a FIDE ID (numeric, 4-8 digits)
                let fide_id = "";
                for (let j = 0; j < cells.length; j++) {
                    const text = cells[j].textContent.trim();
                    if (/^\d{4,8}$/.test(text) && j !== ratingColumn) {
                        fide_id = text;
                        break;
                    }
                }

                // If we couldn't find a FIDE ID, use a placeholder
                if (!fide_id) {
                    fide_id = `p${i}`; // placeholder ID
                }

                try {
                    rating = parseInt(rating);
                    if (isNaN(rating) || rating < 100 || rating > 3000) rating = 1500; // Default rating if invalid
                } catch {
                    rating = 1500; // Default rating
                }

                players.push({
                    id: i,
                    name,
                    fide_id,
                    rating
                });
            }
        }

        if (players.length > 0) {
            console.log(`Successfully extracted ${players.length} players`);
            return players;
        } else {
            throw new Error('No valid players found in the table');
        }
    } catch (error) {
        console.error('Scraping error:', error);
        alert(`Could not scrape data from the URL: ${error.message}\n\nPlease use the manual input or sample data options.`);
        return [];
    } finally {
        document.getElementById('loading-indicator').style.display = 'none';
    }
}

// Load sample data
function loadSampleData() {
    const samplePlayers = [
        { id: 1, name: "Alice Smith", fide_id: "12345", rating: 2100 },
        { id: 2, name: "Bob Johnson", fide_id: "23456", rating: 1950 },
        { id: 3, name: "Charlie Brown", fide_id: "34567", rating: 1875 },
        { id: 4, name: "Diana Prince", fide_id: "45678", rating: 1820 },
        { id: 5, name: "Edward Jones", fide_id: "56789", rating: 1760 },
        { id: 6, name: "Fiona Garcia", fide_id: "67890", rating: 1700 },
        { id: 7, name: "George Smith", fide_id: "78901", rating: 1650 },
        { id: 8, name: "Helen Davis", fide_id: "89012", rating: 1600 }
    ];

    // Reset tournament with sample players
    tournament = new SwissTournament(samplePlayers);
    tournament.firstRound();
    return tournament.pairings;
}

// Tournament management functions
async function fetchPairings() {
    const res = await fetch('/api/pairings');
    return res.json();
}

async function fetchStandings() {
    const res = await fetch('/api/standings');
    return res.json();
}

async function nextRound() {
    const res = await fetch('/api/next-round', { method: 'POST' });
    return res.json();
}

function renderPairings(pairings) {
    const tbody = document.querySelector('#pairings-table tbody');
    tbody.innerHTML = '';

    if (pairings.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" style="text-align:center;">No pairings available. Please load players first.</td>';
        tbody.appendChild(tr);
        return;
    }

    pairings.forEach((pair, idx) => {
        const tr = document.createElement('tr');
        let resultOptions = '';
        if (!pair.black) {
            resultOptions = `<option value="BYE">BYE</option>`;
        } else {
            resultOptions = `
                <option value="">Select</option>
                <option value="1-0">1-0</option>
                <option value="0-1">0-1</option>
                <option value="½-½">½-½</option>
            `;
        }
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${pair.white ? pair.white.name : ''}</td>
            <td>${pair.black ? pair.black.name : 'BYE'}</td>
            <td>${pair.round}</td>
            <td>
                <select class="result-select" data-idx="${idx}">
                    ${resultOptions}
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderStandings(standings) {
    const tbody = document.querySelector('#standings-table tbody');
    tbody.innerHTML = '';

    if (standings.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="5" style="text-align:center;">No standings available. Please load players first.</td>';
        tbody.appendChild(tr);
        return;
    }

    standings.forEach((player, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${player.name}</td>
            <td>${player.score}</td>
            <td>${player.buchholz ?? ''}</td>
            <td>${player.sonnebornBerger ?? ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updatePage() {
    const [pairings, standings] = await Promise.all([
        fetchPairings(),
        fetchStandings()
    ]);
    renderPairings(pairings);
    renderStandings(standings);
}

// Event Listeners
document.getElementById('next-round').addEventListener('click', async () => {
    await nextRound();
    updatePage();
});

document.getElementById('prev-round').addEventListener('click', async () => {
    await fetch('/api/prev-round', { method: 'POST' });
    updatePage();
});

document.getElementById('reset-tournament').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset the tournament? This will erase all progress.')) {
        await fetch('/api/reset-tournament', { method: 'POST' });
        updatePage();
    }
});

document.getElementById('submit-results').addEventListener('click', async () => {
    const selects = document.querySelectorAll('.result-select');
    const results = Array.from(selects).map(sel => sel.value);
    await fetch('/api/submit-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
    });
    updatePage();
});

document.getElementById('url-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('tournament-url').value;
    if (!url) return;

    document.getElementById('loading-indicator').style.display = 'block';

    try {
        const res = await fetch('/api/load-players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (res.ok) {
            await updatePage();
        } else {
            const error = await res.json();
            alert(`Failed to load players: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
        console.error(error);
    } finally {
        document.getElementById('loading-indicator').style.display = 'none';
    }
});

// Sample data and manual entry buttons should be removed from backend version
document.getElementById('add-player-btn')?.addEventListener('click', () => {
    alert('Manual player entry is not available in server mode.');
});

document.getElementById('sample-data-btn')?.addEventListener('click', () => {
    alert('Sample data loading is not available in server mode.');
});

// Initialize the page
updatePage();
