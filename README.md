# KSEIP Frontend

> React dashboard for the **Kogi State Environmental Intelligence Platform** — the browser-facing layer for air quality monitoring, climate trends, fire and flood alerts, health advisories, and plume dispersion visualisation.

[![Node ≥ 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/) [![React 18](https://img.shields.io/badge/react-18-blue)](https://react.dev/) [![Vite 4](https://img.shields.io/badge/vite-4-646cff)](https://vitejs.dev/) [![Tailwind CSS 3](https://img.shields.io/badge/tailwind-3-38bdf8)](https://tailwindcss.com/)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Backend Repository](#backend-repository)
- [License](#license)

---

## Project Overview

KSEIP Frontend is the public-facing interface for the Kogi State Government's environmental monitoring service. It connects exclusively to the [KSEIP Backend](https://github.com/jcodes5/KSEIP_backend) — no third-party API keys are handled in the browser.

The application gives environmental officers, technical reviewers, and the public a single workspace to:

- Read live air quality conditions and 24-hour trends for four Kogi State nodes
- Review climate evidence and meteorological data
- Monitor NASA FIRMS fire hotspots and Niger–Benue flood screening indicators
- Receive plain-language health advisories translated from AQI readings
- Run Gaussian plume dispersion screenings on a map

The platform is built as a multi-page SPA with client-side routing, a responsive layout for mobile and desktop, and lazy-loaded heavy components (PlumeMapper) to keep initial load fast.

---

## Features

### Air Quality Monitor
Displays the current US AQI, dominant pollutant, validation source breakdown (Open-Meteo / WAQI / OpenAQ), and an hourly trend chart for the last 24 hours. Supports location switching between Lokoja, Obajana, Okene, Anyigba, and Nearest observed station.

### Climate Trend Viewer
Visualises 30-year temperature, precipitation, wind, solar radiation, and Standardised Precipitation Index (SPI) data sourced from NASA POWER via the backend.

### Fire & Flood Panel
Renders NASA FIRMS hotspot detections on a Leaflet map and displays the Niger–Benue flood screening index with risk thresholds and recommended actions.

### Health Alerts Panel
Translates the current AQI band into structured guidance for sensitive groups (children, elderly, people with respiratory conditions), field workers, school sport, and farming activities — using the EPA six-band framework.

### Plume Mapper
Interactive Leaflet map showing Gaussian plume dispersion output from the backend. Lazily loaded to avoid blocking the dashboard on initial render.

### Pages
| Route | Content |
|---|---|
| `/` | Home — platform overview, key metrics, service cards |
| `/about` | Mission, capabilities, environmental challenges addressed |
| `/how-to-use` | Step-by-step guide, AQI interpretation accordion, best practices |
| `/documentation` | System architecture, data sources, API endpoint reference |
| `/dashboard` | Live dashboard — all five monitoring panels |

---

## Tech Stack

| Category | Package | Version |
|---|---|---|
| UI Framework | React | 18.3.1 |
| Build Tool | Vite | 4.5.5 |
| Routing | React Router DOM | 7.15.1 |
| Styling | Tailwind CSS | 3.4.17 |
| Maps | Leaflet + React-Leaflet | 1.9.4 / 4.2.1 |
| Charts | Recharts | 2.15.0 |
| Icons | Lucide React | 0.468.0 |
| PDF Export | jsPDF | 2.5.2 |
| PostCSS | Autoprefixer | 10.4.20 |
| React plugin | @vitejs/plugin-react | 4.3.4 |

**Language:** JavaScript (JSX). A `tsconfig.json` is present for a future TypeScript migration; the codebase is currently plain JS.

**Node requirement:** `>=18.0.0`

---

## Installation

### Prerequisites

- Node.js 18 or later
- The [KSEIP Backend](https://github.com/jcodes5/KSEIP_backend) running locally or deployed

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/jcodes5/KSEIP_frontend.git
cd KSEIP_frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and set VITE_API_BASE_URL (see Environment Variables below)

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:5173**.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR at `localhost:5173` |
| `npm run build` | Production build — output goes to `dist/` |
| `npm run preview` | Serve the production build locally for final checks |

### Production Build

```bash
npm run build
# Deploy the contents of dist/ to any static hosting (Vercel, Netlify, Nginx, etc.)
```

When deploying to Vercel, set `VITE_API_BASE_URL` to your deployed backend URL in the Vercel project environment variables.

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:4000
```

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | **Yes** | Base URL of the running KSEIP backend. No trailing slash. |

> **Important:** Only variables prefixed with `VITE_` are exposed to the browser by Vite. Never put API keys or secrets in this file — all external API credentials belong in the backend `.env`.

---

## Project Structure

```
KSEIP_frontend/
├── public/
│   ├── KSEIP_logo_green (1).png   # Official KSEIP logo
│   └── kogi-lga.geojson           # Kogi State LGA boundary data
├── src/
│   ├── components/
│   │   ├── AQIMonitor/
│   │   │   └── AQIMonitor.jsx     # Live AQI panel + hourly chart
│   │   ├── ClimateTrendViewer/
│   │   │   └── ClimateTrendViewer.jsx
│   │   ├── FireFloodPanel/
│   │   │   └── FireFloodPanel.jsx
│   │   ├── HealthAlertsPanel/
│   │   │   └── HealthAlertsPanel.jsx
│   │   └── PlumeMapper/
│   │       └── PlumeMapper.jsx    # Lazy-loaded Leaflet map
│   ├── services/
│   │   ├── apiClient.js           # All backend HTTP calls
│   │   └── aqiScale.js            # AQI colour/label utilities
│   ├── App.jsx                    # Router, Navbar, Footer, page components
│   ├── index.css                  # Tailwind base + custom tokens
│   └── main.jsx                   # React entry point
├── .env.example
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

All API calls are centralised in `src/services/apiClient.js`. If the backend URL changes, only that file needs updating.

---

## Roadmap

| Version | Item | Status |
|---|---|---|
| v1.0 | Full dashboard — AQI, Climate, Fire/Flood, Health, Plume | ✅ Done |
| v1.0 | Responsive mobile layout with hamburger nav | ✅ Done |
| v1.0 | Multi-page SPA (Home, About, How to Use, Docs, Dashboard) | ✅ Done |
| v1.0 | Replace footer placeholder contact details | 📋 Planned |
| v1.1 | Loading skeleton screens (replace spinner-only states) | 📋 Planned |
| v1.1 | Error boundary components with inline retry | 📋 Planned |
| v1.2 | PM2.5 / PM10 dedicated chart in AQI panel | 📋 Planned |
| v1.2 | PDF report export via jsPDF | 📋 Planned |
| v1.2 | SPI visualisation in Climate Trend Viewer | 📋 Planned |
| v2.0 | PWA service worker — cache last-known readings offline | 💡 Considering |
| v2.0 | Kogi LGA boundary overlay on plume and fire maps | 💡 Considering |
| v2.0 | Multi-language support (English + Yoruba / Igala) | 💡 Considering |

---

## Backend Repository

All data displayed in this frontend is fetched from the KSEIP Backend:

**[https://github.com/jcodes5/KSEIP_backend](https://github.com/jcodes5/KSEIP_backend)**

The backend must be running and reachable at the URL set in `VITE_API_BASE_URL` for any panel to load data.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
