# FuelFinder

A web app that helps you find the cheapest gas stations near you in the Toronto area.

## Features

- **Interactive map** — powered by Leaflet + OpenStreetMap
- **Postal code search** — enter any Toronto postal code to find nearby stations
- **Petrol & Diesel** — filter by fuel type
- **Distance filter** — search within 5, 10, 15 km or beyond
- **Cheapest station highlight** — best deal is always clearly marked
- **Dark / Light theme** toggle
- **24-hour caching** — station data is cached in your browser so repeat searches are instant

> **Note:** Gas prices shown are estimated based on brand and location. They are not real-time prices.

## How to Use

1. Open `index.html` in your browser (no server needed)
2. Enter a Toronto postal code (e.g. `M5H 2N2`)
3. Choose your fuel type and max distance
4. Hit **Search**
5. Click any station card to fly to it on the map

## Tech Stack

| Layer | Tech |
|-------|------|
| Map | [Leaflet.js](https://leafletjs.com/) |
| Map Tiles | [CARTO](https://carto.com/) (dark + light) |
| Station Data | [OpenStreetMap Overpass API](https://overpass-api.de/) |
| Geocoding | [Nominatim](https://nominatim.openstreetmap.org/) |
| Styling | Vanilla CSS with CSS variables |
| Logic | Vanilla JavaScript (no frameworks) |

## Project Structure

```
fuel-finder/
├── index.html      # App shell and layout
├── style.css       # Theming and responsive styles
├── script.js       # All app logic (map, search, geocoding)
└── README.md       # You're reading it
```

## Running Locally

No build step or server required — just open the file:

```bash
# Option 1: open directly
open index.html

# Option 2: use VS Code Live Server extension (recommended)
# Right-click index.html → "Open with Live Server"
```

## Known Limitations

- Prices are **simulated** based on brand — not fetched from a live pricing API
- Station data covers **Toronto and GTA only**
- Geocoding works best with valid Canadian postal codes in the `A1A 1A1` format
- `localStorage` caching may not work in private/incognito mode

## Roadmap

- [ ] Real-time price data integration
- [ ] Directions / navigation link
- [ ] Mobile-optimized layout improvements
- [ ] Support for cities outside Toronto
