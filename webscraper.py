import requests
from bs4 import BeautifulSoup
import json
import sys

url = sys.argv[1] if len(sys.argv) > 1 else ""

# Create empty players list if no URL provided
if not url:
    players = []
    with open("players.json", "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)
    print("Created empty players.json file. Please provide a URL to load players.")
    sys.exit(0)

try:
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")

    players = []

    # Try different possible table selectors commonly used in chess tournament sites
    table = None
    possible_selectors = ["table.CRs1", "table.TBL_starting_rank", "table.default-table-list"]

    for selector in possible_selectors:
        table = soup.select_one(selector)
        if table:
            print(f"Found table using selector: {selector}")
            break

    # If no table found with known classes, try any table that might have player data
    if not table:
        all_tables = soup.find_all("table")
        for possible_table in all_tables:
            rows = possible_table.find_all("tr")
            if len(rows) > 5:  # Assume tables with several rows might be player lists
                table = possible_table
                print("Found table based on structure")
                break

    if not table:
        raise Exception("Could not find any player data table in the page")

    # Skip the header row
    for idx, row in enumerate(table.find_all("tr")[1:]):
        cells = row.find_all("td")
        if len(cells) >= 3:  # Need at least 3 cells for minimal player data
            # Try to find name and rating in different positions
            name_idx = 2  # Default guess
            rating_idx = 5  # Default guess

            # Look for longer text (likely name) and number between 1000-3000 (likely rating)
            for i, cell in enumerate(cells):
                text = cell.text.strip()
                if text.isdigit() and 1000 <= int(text) <= 3000:
                    rating_idx = i
                if len(text) > 5 and " " in text:  # Name usually has space and is longer
                    name_idx = i

            name = cells[min(name_idx, len(cells)-1)].text.strip()

            # Get rating if available
            rating = 0
            if rating_idx < len(cells):
                try:
                    rating = int(cells[rating_idx].text.strip())
                except ValueError:
                    rating = 0

            # Find something that could be a FIDE ID
            fide_id = f"p{idx+1}"  # Default placeholder
            for i, cell in enumerate(cells):
                text = cell.text.strip()
                if text.isdigit() and len(text) >= 4 and len(text) <= 8 and i != rating_idx:
                    fide_id = text
                    break

            players.append({
                "id": idx + 1,
                "name": name,
                "fide_id": fide_id,
                "rating": rating
            })

    # Output to JSON file
    with open("players.json", "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)

    # Print first 5 entries as a preview
    for player in players[:5]:
        print(player)

    print(f"Successfully extracted {len(players)} players")

except Exception as e:
    print(f"Error scraping data: {str(e)}")
    # Create empty players file in case of error
    with open("players.json", "w", encoding="utf-8") as f:
        json.dump([], f, ensure_ascii=False, indent=2)
    sys.exit(1)
