const start = () => {
  const container = document.getElementById("travel-map");
  if (!container || !window.L) return;
  const Lgeo = window.L.geoJSON || window.L.geoJson;

  const base = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const map = window.L.map("travel-map", {
    scrollWheelZoom: false,
    zoomAnimation: false,
    minZoom: 3,
  });
  const tilePane = document.querySelector("#travel-map .leaflet-tile-pane");
  if (tilePane) tilePane.style.transform = "translateY(-24px)";
  window.L.tileLayer(base, { attribution: attr, maxZoom: 19 }).addTo(map);

  fetch("../travel.geojson")
    .then((r) => r.json())
    .then((geojson) => {
      const layer = Lgeo(geojson, {
        pointToLayer: (f, latlng) =>
          window.L.circleMarker(latlng, {
            radius: 5,
            fillColor: "#8b5cf6",
            color: "#a78bfa",
            weight: 1,
            fillOpacity: 0.9,
          }),
        onEachFeature: (f, l) => {
          const { name, when } = f.properties || {};
          l.bindPopup(name ? `${name}${when ? " — " + when : ""}` : "Viagem");
        },
      });
      layer.addTo(map);
      if (layer.getBounds().isValid()) {
        map.fitBounds(layer.getBounds(), { padding: [30, 30] });
      }
    });
};

if (window.L && window.L.geoJSON) {
  start();
} else {
  const t = setInterval(() => {
    if (window.L && window.L.geoJSON) {
      clearInterval(t);
      start();
    }
  }, 100);
}