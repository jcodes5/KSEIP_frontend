import "leaflet/dist/leaflet.css";
import { Download, Loader2, Play, Wind } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import { getCurrentMeteo, runPlumeSimulation } from "../../services/apiClient.js";

const SOURCE_MARKERS = [
  {
    id: "obajana",
    name: "Obajana cement plant",
    lat: 7.5,
    lon: 6.32,
    defaults: {
      stack_height: 80,
      emission_rate: 1,
      exit_velocity: 15,
      stack_diameter: 4,
      stack_temp_k: 423
    }
  },
  {
    id: "coal",
    name: "Kogi coal cluster",
    lat: 7.2,
    lon: 6.58,
    defaults: {
      stack_height: 35,
      emission_rate: 0.5,
      exit_velocity: 8,
      stack_diameter: 2,
      stack_temp_k: 380
    }
  },
  {
    id: "lokoja",
    name: "Lokoja urban",
    lat: 7.8,
    lon: 6.74,
    defaults: {
      stack_height: 20,
      emission_rate: 0.25,
      exit_velocity: 5,
      stack_diameter: 1.5,
      stack_temp_k: 340
    }
  }
];

const markerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function FitKogiBoundary({ boundary }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary?.features?.length) return;
    const layer = L.geoJSON(boundary);
    map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 9 });
  }, [boundary, map]);

  return null;
}

function numericFormValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : "";
}

function csvFromGrid(result) {
  const rows = result?.grid_json?.points ?? [];
  const columns = result?.grid_json?.columns ?? ["x_m", "y_m", "concentration_ug_m3"];
  return [columns.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function downloadCsv(result) {
  const blob = new Blob([csvFromGrid(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kseip-plume-grid.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function PlumeMapper() {
  const [selectedSource, setSelectedSource] = useState(SOURCE_MARKERS[0]);
  const [boundary, setBoundary] = useState(null);
  const [meteo, setMeteo] = useState(null);
  const [form, setForm] = useState({
    ...SOURCE_MARKERS[0].defaults,
    wind_speed: "",
    wind_dir: "",
    stability_class: "auto",
    terrain: "flat"
  });
  const [opacity, setOpacity] = useState(0.42);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exposureRows = useMemo(() => Object.entries(result?.exposure_summary ?? {}), [result]);

  useEffect(() => {
    fetch("/kogi-lga.geojson")
      .then((response) => response.json())
      .then(setBoundary)
      .catch((loadError) => console.error("[plume-map] failed to load Kogi boundary:", loadError));
  }, []);

  useEffect(() => {
    getCurrentMeteo()
      .then((payload) => {
        setMeteo(payload);
        setForm((current) => ({
          ...current,
          wind_speed: payload.wind_speed,
          wind_dir: payload.wind_dir,
          stability_class: "auto"
        }));
      })
      .catch((requestError) => {
        setError(requestError);
      });
  }, []);

  function selectSource(source) {
    setSelectedSource(source);
    setForm((current) => ({
      ...current,
      ...source.defaults
    }));
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function submitSimulation(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      stack_height: numericFormValue(form.stack_height),
      emission_rate: numericFormValue(form.emission_rate),
      exit_velocity: numericFormValue(form.exit_velocity),
      stack_diameter: numericFormValue(form.stack_diameter),
      stack_temp_k: numericFormValue(form.stack_temp_k),
      ambient_temp_k: meteo?.temp_k ?? 300,
      wind_speed: numericFormValue(form.wind_speed),
      wind_dir: numericFormValue(form.wind_dir),
      cloud_cover: meteo?.cloud_cover ?? 60,
      stability_class: form.stability_class,
      terrain: "flat",
      source_lat: selectedSource.lat,
      source_lon: selectedSource.lon
    };

    try {
      const payloadResult = await runPlumeSimulation(payload);
      setResult(payloadResult);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]" id="plume">
      <div className="overflow-hidden rounded-lg border border-ministry-100 bg-white shadow-panel">
        <div className="h-[300px] sm:h-[400px] lg:h-[560px] w-full">
          <MapContainer center={[7.8, 6.74]} className="h-full w-full" zoom={9}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {boundary ? (
              <>
                <FitKogiBoundary boundary={boundary} />
                <GeoJSON
                  data={boundary}
                  style={{
                    color: "#1A6B3C",
                    fillColor: "#5DCAA5",
                    fillOpacity: 0.08,
                    weight: 2
                  }}
                />
              </>
            ) : null}
            {SOURCE_MARKERS.map((source) => (
              <Marker
                eventHandlers={{ click: () => selectSource(source) }}
                icon={markerIcon}
                key={source.id}
                position={[source.lat, source.lon]}
              >
                <Popup>{source.name}</Popup>
              </Marker>
            ))}
            {result?.isopleths_geojson?.features?.length ? (
              <GeoJSON
                data={result.isopleths_geojson}
                key={`plume-${result.cmax}-${result.xmax}-${result.isopleths_geojson.features.length}`}
                style={(feature) => ({
                  color: feature.properties.color_hex,
                  fillColor: feature.properties.color_hex,
                  fillOpacity: opacity,
                  opacity: Math.min(1, opacity + 0.2),
                  weight: 2
                })}
              />
            ) : null}
          </MapContainer>
        </div>
      </div>

      <aside className="rounded-lg border border-ministry-100 bg-white p-3 sm:p-4 shadow-panel overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">Plume Mapper</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{selectedSource.name}</h2>
          </div>
          <span className="rounded-md bg-ministry-50 px-3 py-2 text-sm font-bold text-ministry-700">
            {meteo?.stability_class || "Auto"}
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-bold">{error.code || "PLUME_ERROR"}</p>
            <p className="mt-1">{error.message}</p>
          </div>
        ) : null}

        <form className="mt-4 grid gap-3" onSubmit={submitSimulation}>
          {[
            ["emission_rate", "Emission rate Q (g/s)"],
            ["stack_height", "Stack height H (m)"],
            ["exit_velocity", "Exit velocity (m/s)"],
            ["stack_diameter", "Stack diameter (m)"],
            ["stack_temp_k", "Stack gas temp (K)"],
            ["wind_speed", "Wind speed (m/s)"],
            ["wind_dir", "Wind direction (deg)"]
          ].map(([field, label]) => (
            <label className="grid gap-1 text-sm font-semibold text-slate-700" key={field}>
              {label}
              <input
                className="h-10 rounded-md border border-ministry-100 px-3 outline-none focus:border-leaf-600"
                inputMode="decimal"
                onChange={(event) => updateField(field, event.target.value)}
                type="number"
                value={form[field]}
              />
            </label>
          ))}

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Stability class
            <select
              className="h-10 rounded-md border border-ministry-100 px-3 outline-none focus:border-leaf-600"
              onChange={(event) => updateField("stability_class", event.target.value)}
              value={form.stability_class}
            >
              <option value="auto">Auto from meteo</option>
              {["A", "B", "C", "D", "E", "F"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Isopleth opacity
            <input
              max="0.85"
              min="0.1"
              onChange={(event) => setOpacity(Number(event.target.value))}
              step="0.05"
              type="range"
              value={opacity}
            />
          </label>

          <button
            className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ministry-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
            Run Simulation
          </button>
        </form>

        {meteo ? (
          <div className="mt-4 rounded-lg bg-ministry-50 p-3 text-sm text-ministry-900">
            <div className="flex items-center gap-2 font-bold">
              <Wind size={16} />
              Current meteo
            </div>
            <p className="mt-1">Wind {meteo.wind_speed} m/s from {meteo.wind_dir} deg, cloud {meteo.cloud_cover}%</p>
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-lg border border-ministry-100 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Cmax</p>
                <p className="font-black text-slate-950">{result.cmax} ug/m3</p>
              </div>
              <div>
                <p className="text-slate-500">xmax</p>
                <p className="font-black text-slate-950">{result.xmax} m</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              {exposureRows.map(([zone, value]) => (
                <div className="flex justify-between gap-3" key={zone}>
                  <span className="font-semibold uppercase text-slate-600">{zone}</span>
                  <span>{value.area_km2} km2 / {value.estimated_population} people</span>
                </div>
              ))}
            </div>
            <button
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ministry-100 bg-white text-sm font-bold text-ministry-700"
              onClick={() => downloadCsv(result)}
              type="button"
            >
              <Download size={16} />
              Download CSV
            </button>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
