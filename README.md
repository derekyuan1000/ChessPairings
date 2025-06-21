# Chess Swiss Pairings

A web application for managing chess tournaments using the Swiss pairing system. This application allows tournament organizers to load player data from chess tournament websites, create pairings, record results, and view standings with tiebreak scores.

## Features

- **Player Data Loading**: Import player data from chess tournament websites
- **Automatic Pairings**: Generate Swiss-system pairings for each round
- **Result Recording**: Record game results and calculate player scores
- **Standings**: View tournament standings with Buchholz and Sonneborn-Berger tiebreak scores
- **Tournament Navigation**: Move between rounds, reset tournament, and manage the competition flow

## How It Works

This application implements a Swiss pairing system that:
1. Pairs players with similar scores
2. Avoids repeat pairings between players
3. Alternates colors when possible
4. Calculates standard chess tiebreak scores

## Technology Stack

- **Backend**: Node.js with Express
- **Data Scraping**: Python with Beautiful Soup
- **Frontend**: HTML, CSS, and vanilla JavaScript
- **Data Storage**: JSON files for player data

## Installation

### Prerequisites
- Node.js (v14+)
- Python 3.x
- Python packages: requests, beautifulsoup4

### Setup

1. Clone the repository:
```
git clone https://github.com/yourusername/chess-swiss-pairings.git
cd chess-swiss-pairings
```

2. Install Node.js dependencies:
```
npm install
```

3. Install Python dependencies:
```
pip install requests beautifulsoup4
```

## Usage

### Check it out Online
It may take a few seconds to load the page
[chess-pairings.derekyuan.co.uk](https://www.chess-pairings.derekyuan.co.uk)

### Starting the Server

Run the following command to start the server:
```
node server.js
```

The application will be available at http://localhost:3000

### Using the Application

1. **Load Players**: Enter a chess tournament URL in the input field and click "Load Players"
2. **View Pairings**: The first round pairings will be displayed automatically
3. **Record Results**: Select results from the dropdown menus and click "Submit Results"
4. **Next Round**: Click "Next Round" to generate pairings for the next round
5. **View Standings**: Standings with tiebreak scores are displayed at the bottom of the page

### Navigation

- **Previous Round**: Return to a previous round
- **Reset Tournament**: Clear all data and start fresh (requires confirmation)

## Deployment

### GitHub Pages Deployment

To deploy the application to GitHub Pages:

1. Create a GitHub repository for your project
2. Move the contents of the `public` folder to the root directory
3. Update the application to use client-side storage instead of server-side
4. Enable GitHub Pages in your repository settings

### Server Deployment

For server deployment with full functionality:

1. Deploy to a Node.js hosting service (Heroku, Render, etc.)
2. Ensure the server has Python installed for the web scraping functionality
3. Configure environment variables as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Swiss pairing algorithm is based on standard chess tournament regulations
- Buchholz and Sonneborn-Berger tiebreak calculations follow FIDE guidelines
