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

response = requests.get(url)
soup = BeautifulSoup(response.content, "html.parser")

players = []

# Find the table by inspecting the page structure; usually the main table has class='CRs1'
table = soup.find("table", {"class": "CRs1"})

# Skip the header row
for idx, row in enumerate(table.find_all("tr")[1:]):
    cells = row.find_all("td")
    if len(cells) >= 6:
        name = cells[2].text.strip()
        fide_id = cells[3].text.strip()
        rating = cells[5].text.strip()
        try:
            rating = int(rating)
        except ValueError:
            rating = 0
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