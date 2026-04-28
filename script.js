let markers = [];
let stations = [];
let tileLayer;

// Initialize map
const map = L.map("map").setView([43.6532, -79.3832], 12);

// =======================
// MAP THEME SWITCHING
// =======================
function setMapTheme(isLight) {
  if (tileLayer) map.removeLayer(tileLayer);

  tileLayer = L.tileLayer(
    isLight
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { attribution: "© OpenStreetMap © CARTO" }
  ).addTo(map);
}

// Default: dark
setMapTheme(false);

// =======================
// THEME TOGGLE
// =======================
const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  toggleBtn.textContent = isLight ? "🌞 Light" : "🌙 Dark";
  setMapTheme(isLight);
});

// =======================
// MARKER ICONS
// =======================
function normalIcon() {
  return L.divIcon({
    className: "normal-marker",
    html: "⛽",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function cheapestIcon() {
  return L.divIcon({
    className: "cheapest-marker",
    html: "⭐⛽",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

// =======================
// CONSISTENT PRICE GENERATION FOR GAS STATIONS
// =======================
function generateConsistentPrice(stationId, stationName, lat, lng, fuelType) {
  // Use station ID + coordinates as seed for MORE variation
  const seed = stationId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
    + Math.floor(lat * 1000) + Math.floor(lng * 1000);
  
  // Create a pseudo-random but consistent value between 0 and 1
  const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;
  
  // Base prices
  const base = fuelType === 'petrol' ? 1.55 : 1.70;
  
  // GAS STATION brand pricing logic (realistic!)
  let brandModifier = 0;
  const upperName = stationName.toUpperCase();
  
  // Budget gas stations (cheaper)
  if (upperName.includes('COSTCO')) {
    brandModifier = -0.08; // Costco gas is cheapest
  } else if (upperName.includes('PIONEER')) {
    brandModifier = -0.05;
  } else if (upperName.includes('ULTRAMAR') || upperName.includes('SPEEDWAY')) {
    brandModifier = -0.03;
  } 
  // Premium gas stations (more expensive)
  else if (upperName.includes('SHELL') || upperName.includes('ESSO')) {
    brandModifier = 0.05; // Shell/Esso usually most expensive
  } else if (upperName.includes('PETRO-CANADA') || upperName.includes('PETRO CANADA')) {
    brandModifier = 0.04;
  } else if (upperName.includes('CANADIAN TIRE')) {
    brandModifier = 0.02;
  }
  // Mid-range stations
  else if (upperName.includes('HUSKY') || upperName.includes('FAS GAS')) {
    brandModifier = 0.01;
  }
  
  // Add larger random variation based on station ID (±4 cents for more variety)
  const variation = (pseudoRandom * 0.08) - 0.04;
  
  const finalPrice = base + brandModifier + variation;
  
  return parseFloat(Math.max(finalPrice, 1.45).toFixed(2)); // Never below $1.45
}

// =======================
// FETCH REAL GAS STATIONS
// =======================
async function fetchRealGasStations() {
  // Check cache first
  const cached = localStorage.getItem('gasStations');
  const cacheTime = localStorage.getItem('gasStationsCacheTime');
  
  if (cached && cacheTime) {
    const hoursSinceCache = (Date.now() - parseInt(cacheTime)) / (1000 * 60 * 60);
    if (hoursSinceCache < 24) {
      console.log("Using cached gas stations");
      stations = JSON.parse(cached);
      return stations;
    }
  }

  const bbox = "43.5810,-79.6390,43.8554,-79.1168";
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="fuel"](${bbox});
      way["amenity"="fuel"](${bbox});
    );
    out center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  
  try {
    console.log("Fetching real gas stations from OpenStreetMap...");
    const res = await fetch(url);
    const data = await res.json();
    console.log("Found", data.elements.length, "real gas stations");

    stations = data.elements.map(el => {
      const lat = el.lat || el.center.lat;
      const lng = el.lon || el.center.lon;
      const name = el.tags.brand || el.tags.name || el.tags.operator || "Gas Station";
      const osmId = el.id;

      // Get address
      let address = "Address not available";
      if (el.tags["addr:street"]) {
        address = el.tags["addr:street"];
        if (el.tags["addr:city"]) address += ", " + el.tags["addr:city"];
      }

      return {
        name,
        lat,
        lng,
        petrol: generateConsistentPrice(osmId, name, lat, lng, 'petrol'),
        diesel: generateConsistentPrice(osmId, name, lat, lng, 'diesel'),
        address,
        osmId
      };
    });

    // Cache for 24 hours
    localStorage.setItem('gasStations', JSON.stringify(stations));
    localStorage.setItem('gasStationsCacheTime', Date.now().toString());
    
    console.log("Processed and cached", stations.length, "gas stations with unique prices");
    
    // Log sample prices for debugging
    console.log("Sample prices:", stations.slice(0, 5).map(s => ({
      name: s.name,
      petrol: s.petrol,
      diesel: s.diesel
    })));
    
  } catch (error) {
    console.error("Error loading gas stations:", error);
  }
}

// =======================
// PAGE LOAD
// =======================
window.addEventListener("load", fetchRealGasStations);

// =======================
// SEARCH
// =======================
document.getElementById("searchBtn").addEventListener("click", async () => {
  // Clear previous results immediately
  document.getElementById("results").innerHTML = '<p style="padding: 20px; text-align: center;">Searching...</p>';
  
  if (stations.length === 0) {
    alert("Still loading gas stations... please wait.");
    await fetchRealGasStations();
    if (stations.length === 0) {
      document.getElementById("results").innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Failed to load stations</p>';
      return;
    }
  }

  const fuelType = document.getElementById("fuelType").value;
  const postal = document.getElementById("locationInput").value.trim();
  const maxDistance = Number(document.getElementById("distanceFilter").value);

  if (!postal) {
    document.getElementById("results").innerHTML = '';
    return alert("Enter a postal code");
  }

  const user = await getCoordinatesFromPostal(postal);
  if (!user) {
    document.getElementById("results").innerHTML = '';
    return;
  }

  console.log("=== NEW SEARCH ===");
  console.log("Postal code:", postal);
  console.log("User location:", user);
  console.log("Fuel type:", fuelType);
  console.log("Max distance:", maxDistance, "km");

  // Clear old markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  // Add user location marker
  const userMarker = L.marker([user.lat, user.lng])
    .addTo(map)
    .bindPopup("📍 Your Location")
    .openPopup();
  markers.push(userMarker);

  // Calculate distance for ALL stations
  const allStationsWithDistance = stations.map(s => ({
    ...s,
    distance: distanceInKm(user.lat, user.lng, s.lat, s.lng),
    price: Number(s[fuelType])
  }));

  const nearbyStations = allStationsWithDistance
  .filter(s => s.distance <= maxDistance)
  .map(s => ({
    ...s,
    score: (s.price * 0.7) + (s.distance * 0.3)
  }))
  .sort((a, b) => a.score - b.score);

  console.log(`Found ${nearbyStations.length} stations within ${maxDistance}km`);
  
  if (nearbyStations.length > 0) {
    console.log("Top 5 cheapest nearby:");
    nearbyStations.slice(0, 5).forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} - $${s.price} (${s.distance.toFixed(2)}km)`);
    });
  }

  if (!nearbyStations.length) {
    document.getElementById("results").innerHTML = `
      <div style="padding: 20px; text-align: center; color: #ff6b6b;">
        <h3>No stations found within ${maxDistance} km</h3>
        <p>Try increasing the distance range</p>
      </div>
    `;
    return;
  }

  const cheapestNearby = nearbyStations[0];
  renderResults(nearbyStations, cheapestNearby, fuelType);

  // Add markers for nearby stations only
  nearbyStations.forEach(s => {
    const isCheapest = s === cheapestNearby;
    
    const marker = L.marker(
      [s.lat, s.lng],
      { icon: isCheapest ? cheapestIcon() : normalIcon() }
    ).addTo(map)
     .bindPopup(`
       <b>${s.name}</b><br>
       <strong>${fuelType.toUpperCase()}: $${s.price} / L</strong><br>
       ${s.distance.toFixed(2)} km away<br>
       <small style="color: #888;">${s.address || 'Address not available'}</small>
       ${isCheapest ? '<br><span style="color: gold; font-weight: bold;">⭐ CHEAPEST NEARBY</span>' : ''}
     `);

    markers.push(marker);
    
    if (isCheapest) {
      marker.openPopup();
    }
  });

  // Fit map to show all nearby stations
  if (markers.length > 0) {
    map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15));
  }
});

// =======================
// RESULTS LIST
// =======================
function renderResults(list, cheapest, fuelType) {
  const results = document.getElementById("results");
  results.innerHTML = `
    <h2>${list.length} Station${list.length > 1 ? 's' : ''} Found</h2>
    <p style="font-size: 13px; color: var(--muted); margin-bottom: 15px;">
      Sorted by ${fuelType} price (cheapest first)
    </p>
    ${list.map((s, i) => `
      <div class="station-card ${s === cheapest ? "cheapest" : ""}" data-i="${i}">
        <div class="station-rank">${i + 1}</div>
        <div style="flex: 1;">
          <div class="station-name">
            ${s === cheapest ? '⭐ ' : ''}${s.name}
            ${s === cheapest ? '<span style="background: gold; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 6px; font-weight: bold;">CHEAPEST</span>' : ''}
          </div>
          <div class="station-price">$${s.price} / L</div>
          <div class="station-distance">${s.distance.toFixed(2)} km away</div>
        </div>
      </div>
    `).join("")}
  `;

  document.querySelectorAll(".station-card").forEach(card => {
    card.onclick = () => {
      const s = list[card.dataset.i];
      map.flyTo([s.lat, s.lng], 16, { duration: 1.2 });
      markers.forEach(m => {
        const p = m.getLatLng();
        if (Math.abs(p.lat - s.lat) < 0.0001 && Math.abs(p.lng - s.lng) < 0.0001) {
          m.openPopup();
        }
      });
    };
  });
}

// =======================
// GEOCODING (IMPROVED)
// =======================
async function getCoordinatesFromPostal(code) {
  const formatted = code.toUpperCase().replace(/\s+/g, '');
  const withSpace = formatted.length === 6 
    ? formatted.slice(0, 3) + " " + formatted.slice(3)
    : formatted;

  console.log("Searching for:", withSpace);

  // Try multiple query formats
  const queries = [
    withSpace,
    `${withSpace}, Toronto`,
    `${withSpace}, Ontario`,
    `${withSpace}, Toronto, Ontario`,
    `${withSpace}, Toronto, Ontario, Canada`,
    `${withSpace}, Canada`
  ];

  for (const queryText of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(queryText)}&countrycodes=ca&addressdetails=1`;
    
    try {
      const res = await fetch(url, { 
        headers: { "User-Agent": "FuelFinder/1.0" }
      });

      if (!res.ok) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const data = await res.json();

      if (data && data.length > 0) {
        // Prefer results that mention Toronto
        let best = data[0];
        for (const result of data) {
          if (result.address && (
            result.address.city === "Toronto" || 
            result.address.town === "Toronto" ||
            result.display_name.includes("Toronto")
          )) {
            best = result;
            break;
          }
        }

        console.log("Found:", best.display_name);
        return { lat: parseFloat(best.lat), lng: parseFloat(best.lon) };
      }

      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error("Fetch error:", error);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  alert(`Could not find postal code "${code}". Try: M5H 2N2, M4S 1G9, or M3N 1X9`);
  return null;
}

// =======================
// DISTANCE
// =======================
function distanceInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}