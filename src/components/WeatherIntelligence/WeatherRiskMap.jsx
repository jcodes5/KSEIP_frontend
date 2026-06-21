import "leaflet/dist/leaflet.css";
import React, { useEffect, useMemo, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from "react-leaflet";

function colorForRisk(level) {
  if (level === "HIGH") return "#dc2626";
  if (level === "MODERATE") return "#f59e0b";
  return "#16a34a";
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function WeatherRiskMap({ mapData }) {
  const [boundary, setBoundary] = useState(null);
  const locations = mapData?.locations ?? [];
  const locationById = useMemo(() => new Map(locations.map((location) => [location.id, location])), [locations]);

  useEffect(() => {
    fetch("/kogi-lga.geojson")
      .then((response) => response.json())
      .then(setBoundary)
      .catch(() => setBoundary(null));
  }, []);

  const styleFeature = (feature) => {
    const id = normalize(feature?.properties?.id ?? feature?.properties?.name ?? feature?.properties?.lga_name);
    const location = locationById.get(id);
    const color = location ? colorForRisk(location.riskLevel) : "#166534";
    return {
      color,
      fillColor: color,
      fillOpacity: location ? 0.24 : 0.05,
      weight: location ? 1.8 : 1.2
    };
  };

  return (
    <div className="overflow-hidden rounded-lg border border-ministry-100 bg-white shadow-sm">
      <div className="border-b border-ministry-100 p-4">
        <h3 className="text-sm font-black text-slate-950">Kogi LGA Weather Risk Map</h3>
      </div>
      <div className="h-96">
        <MapContainer center={[7.72, 6.62]} className="h-full w-full" scrollWheelZoom={false} zoom={7}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {boundary ? <GeoJSON data={boundary} style={styleFeature} /> : null}
          {locations.filter((location) => !location.error).map((location) => (
            <CircleMarker
              center={[location.latitude, location.longitude]}
              key={location.id}
              pathOptions={{
                color: colorForRisk(location.riskLevel),
                fillColor: colorForRisk(location.riskLevel),
                fillOpacity: 0.76,
                weight: 2
              }}
              radius={Math.max(7, Math.min(18, Number(location.weatherScore) / 6))}
            >
              <Popup>
                <div className="max-w-64 text-sm">
                  <p className="font-bold text-slate-950">{location.name}</p>
                  <p>Condition: {location.weatherCondition}</p>
                  <p>Score: {location.weatherScore}/100</p>
                  <p>Risk: {location.riskLevel}</p>
                  <p>Driver: {location.topRiskDriver}</p>
                  <p className="mt-2 font-semibold">{location.recommendationText}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="grid grid-cols-3 border-t border-ministry-100 text-xs font-black uppercase text-slate-600">
        <div className="flex items-center justify-center gap-2 p-3"><span className="h-3 w-3 rounded-full bg-green-600" />Low</div>
        <div className="flex items-center justify-center gap-2 p-3"><span className="h-3 w-3 rounded-full bg-amber-500" />Moderate</div>
        <div className="flex items-center justify-center gap-2 p-3"><span className="h-3 w-3 rounded-full bg-red-600" />High</div>
      </div>
    </div>
  );
}
