---
title: "Travel"
date: 2026-09-12
draft: false
description: "Mapa das viagens registradas"
---

Cada ponto é uma viagem (ou lugar marcante). Os dados vêm de `static/travel.geojson` — formatado a partir do Google Takeout ou adicionado à mão.

<div id="travel-map" class="travel-map"></div>

<p><a href="../travel.geojson">Baixar os dados (GeoJSON)</a></p>

<link rel="stylesheet" href="../vendor/leaflet.css">
<script src="../vendor/leaflet.js"></script>
<script src="../travel-map.js"></script>