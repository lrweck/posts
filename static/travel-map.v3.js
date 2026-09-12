const start = () => {
  const container = document.getElementById("travel-map");
  if (!container || !window.L) return;
  const Lgeo = window.L.geoJSON || window.L.geoJson;

  const base = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const map = window.L.map("travel-map", { scrollWheelZoom: false, zoomAnimation: false });
  window.L.tileLayer(base, { attribution: attr, maxZoom: 19 }).addTo(map);

  const labelLayer = document.createElement("div");
  labelLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
  container.appendChild(labelLayer);

  const labels = [];
  const paint = () => {
    for (let i = 0; i < labels.length; i++) {
      const p = map.latLngToContainerPoint(labels[i].latlng);
      labels[i].el.style.left = Math.round(p.x) + 5 + "px";
      labels[i].el.style.top = Math.round(p.y) - 8 + "px";
    }
  };

  fetch("../travel.geojson")
    .then((r) => r.json())
    .then((geojson) => {
      const layer = Lgeo(geojson, {
        pointToLayer: (f, latlng) =>
          window.L.circleMarker(latlng, {
            radius: 7,
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
      layer.eachLayer((l) => {
        const latlng = l.getLatLng();
        const el = document.createElement("span");
        const { name } = l.feature.properties || {};
        el.textContent = name ? name + " " + latlng.lat.toFixed(2) + "," + latlng.lng.toFixed(2) : "";
        el.style.cssText = "position:absolute;color:#ff1744;font:700 10px/1 monospace;text-shadow:0 0 2px #fff,0 0 2px #fff;z-index:9999";
        labelLayer.appendChild(el);
        labels.push({ latlng, el });
      });
      paint();
    });

  map.on("move zoom", paint);
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