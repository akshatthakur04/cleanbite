/* ---------------- CleanBite – Map logic (refined) ---------------- */

/* 1. Mapbox initialisation */
mapboxgl.accessToken =
  'pk.eyJ1Ijoiam9qb2NlbmEiLCJhIjoiY21hem1ydHVsMGljeDJqc2hzY2YybW5paiJ9.3secN80D9gsOkQMPp13fow';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-2.8, 54.05], // Lancaster
  zoom: 12
});

/* 2. Helper: colour by rating */
function markerColour(rating) {
  rating = Number(rating);
  return rating >= 4   ? '#2ecc71' : // green
         rating === 3  ? '#f1c40f' : // amber
                          '#e74c3c'; // red
}

/* 3. Fetch restaurant data once the map is ready */
map.on('load', () => {
  /* NOTE: folder name is lowercase `data/` */
  fetch('data/restaurants.json')
    .then(res => res.json())
    .then(json => {
      /* Accept either a flat array (recommended) or the verbose XML‑shaped object */
      const establishments = Array.isArray(json)
        ? json
        : json?.FHRSEstablishment?.EstablishmentCollection?.EstablishmentDetail ?? [];

      drawMarkers(establishments);
    })
    .catch(err => console.error('Failed to load restaurant data:', err));
});

/* 4. Place markers and pop‑ups */
function drawMarkers(data) {
  data.forEach(r => {
    /* Extract latitude/longitude – handle both schemas */
    const lat = parseFloat(r.lat ?? r.Latitude ?? r.Geocode?.Latitude);
    const lon = parseFloat(r.lon ?? r.Longitude ?? r.Geocode?.Longitude);

    if (Number.isNaN(lat) || Number.isNaN(lon)) return; // skip if no coords

    /* Create a coloured circle marker */
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.cssText = `
      width:16px;height:16px;border-radius:50%;cursor:pointer;
      background:${markerColour(r.rating ?? r.RatingValue)};
    `;

    new mapboxgl.Marker(el)
      .setLngLat([lon, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 24 }).setHTML(`
          <div class="popup">
            <h3>${r.name ?? r.BusinessName}</h3>
            <p><strong>Rating:</strong> ${r.rating ?? r.RatingValue}</p>
            <p>${r.address ??
              [r.AddressLine1, r.AddressLine2, r.AddressLine3, r.AddressLine4, r.PostCode]
                .filter(Boolean)
                .join(', ')}</p>
            <p style="font-size:.75rem">Inspected: ${r.ratingDate ?? r.RatingDate}</p>
          </div>
        `)
      )
      .addTo(map);
  });
}