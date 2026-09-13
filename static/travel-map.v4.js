const map = window.L.map("travel-map", { scrollWheelZoom: false, zoomAnimation: false });
const tilePane = document.querySelector("#travel-map .leaflet-tile-pane");
if (tilePane) tilePane.style.transform = "translateY(-24px)";

window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

const Lgeo = window.L.geoJSON || window.L.geoJson;

fetch("../travel.geojson")
  .then((r) => r.json())
  .then((geojson) => {
    const layer = Lgeo(geojson, {
      pointToLayer: (f, latlng) =>
        window.L.circleMarker(latlng, {
          radius: 5,
          fillColor: "#10b981",
          color: "#34d399",
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