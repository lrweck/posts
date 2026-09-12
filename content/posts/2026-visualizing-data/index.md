---
title: "Visualizing Data Without a Framework"
date: 2026-07-02
description: "SVG by hand, and why I prefer it for small charts"
tags: ["web", "data", "math"]
categories: ["dev"]
draft: false
---

For small charts, a hand-written SVG beats any charting library. A bar is just a `<rect>`:

```html
<svg viewBox="0 0 200 100">
  <rect x="10"  y="20" width="30" height="80" fill="#3b82f6"/>
  <rect x="50"  y="45" width="30" height="55" fill="#3b82f6"/>
</svg>
```

The mean of my sample data, for the record:

$$\mu = \frac{1}{n}\sum_{i=1}^{n} x_i$$

No dependencies, no bundle, no logo on my page. For dashboards with real scale, use a real charting library — but most of us are making the tiny bar chart above.