import "leaflet/dist/leaflet.css";
import { AlertTriangle, Droplets, Flame, MapPin, TrendingUp, Calendar, Cloud, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer } from "react-leaflet";
import { getFireHotspots, getFloodLocations, getFloodRisk } from "../../services/apiClient.js";
import { t } from "../../services/i18n.js";

const FALLBACK_FLOOD_LOCATIONS = [
  { id: "lokoja", name: "Niger-Benue confluence, Lokoja" },
  { id: "kabba", name: "Kabba upland drainage" },
  { id: "idah", name: "Idah riverine corridor" }
];

function formatNumber(value, fallback = "--") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
}

function formatPercent(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : "--";
}

function ErrorBox({ error, title, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm">{error?.message}</p>
      <p className="mt-1 text-xs font-semibold">{error?.code}</p>
      {onRetry ? (
        <button
          className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-xs font-black uppercase text-white hover:bg-red-800"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, unit = "" }) {
  return (
    <div className="rounded-lg border border-ministry-100 bg-gradient-to-br from-ministry-50 to-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</p>
          <div className="mt-2 flex items-baseline gap-1 flex-wrap">
            <p className="text-xs sm:text-3xl font-bold text-slate-900 break-all">{value ?? "--"}</p>
            {unit && <p className="text-xs text-slate-500 flex-shrink-0">{unit}</p>}
          </div>
        </div>
        {Icon && <Icon size={20} className="text-ministry-600 flex-shrink-0 mt-1 sm:h-6 sm:w-6" />}
      </div>
    </div>
  );
}

function FloodCard({ flood, language }) {
  const getRiskColor = (level) => {
    if (level < 35) return { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7", label: "Low Risk" };
    if (level < 55) return { bg: "#fef3c7", text: "#78350f", border: "#fbbf24", label: "Moderate Risk" };
    if (level < 75) return { bg: "#fed7aa", text: "#7c2d12", border: "#fb923c", label: "High Risk" };
    return { bg: "#fee2e2", text: "#7f1d1d", border: "#fca5a5", label: "Very High Risk" };
  };
  
  const riskColors = getRiskColor(flood.flood_index);

  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-4 shadow-panel space-y-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Droplets size={24} className="text-blue-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">Flood Risk</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{t(language, "floodTitle")}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">{flood.location}</p>
            </div>
          </div>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-sm font-bold text-center"
          style={{ backgroundColor: riskColors.bg, color: riskColors.text, border: `2px solid ${riskColors.border}` }}
        >
          <p className="text-xs font-semibold">{riskColors.label}</p>
          <p className="text-lg font-black">{flood.flood_index}/100</p>
        </div>
      </div>

      {/* Risk Gauge */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Low Risk</span>
          <span>Moderate Risk</span>
          <span>Severe Risk</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${flood.flood_index}%`,
              backgroundColor:
                flood.flood_index <= 20
                  ? "#10b981"
                  : flood.flood_index <= 40
                    ? "#f59e0b"
                    : flood.flood_index <= 60
                      ? "#f97316"
                      : "#ef4444"
            }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <StatCard label="30-Day Rain" value={formatNumber(flood.recent_30day_rain_mm)} unit="mm" icon={Cloud} />
        <StatCard label="3-Day Forecast" value={formatNumber(flood.forecast_3day_rain_mm)} unit="mm" icon={Calendar} />
        <StatCard label="Confidence" value={formatPercent(flood.confidence_percent)} icon={TrendingUp} />
      </div>

      {/* Advisory */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900 leading-relaxed">{flood.advisory_text}</p>
      </div>

      {/* 7-Day Forecast */}
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">7-Day Precipitation Forecast</p>
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-7">
          {(flood.forecast_7day ?? []).map((day) => (
            <div
              key={day.date}
              className="rounded-lg border border-ministry-100 bg-gradient-to-b from-white to-ministry-50 p-3 text-center hover:shadow-md transition-shadow"
            >
              <p className="text-xs font-bold text-slate-900">
                {new Date(day.date).toLocaleDateString("en-NG", { weekday: "short" })}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-950">{day.precipitation_mm}</p>
              <p className="text-xs text-slate-500 mt-1">{day.probability_percent}% chance</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900">{t(language, "modelDrivers")}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {(flood.drivers ?? []).map((driver) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={driver.key}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-600">{driver.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {driver.value} {driver.unit}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-black text-ministry-700">+{driver.contribution}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-ministry-500" style={{ width: `${Math.min(100, driver.contribution * 4)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FireCard({ fire, boundary }) {
  const highFrp = fire.total_frp >= 100;
  const getRiskLevel = () => {
    if (fire.count === 0) return { color: "#10b981", label: "Clear" };
    if (fire.high_confidence_count === 0) return { color: "#f59e0b", label: "Low Activity" };
    if (fire.high_confidence_count <= 3) return { color: "#f97316", label: "Moderate Activity" };
    return { color: "#ef4444", label: "High Activity" };
  };
  
  const riskLevel = getRiskLevel();

  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-4 sm:p-6 shadow-panel space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 sm:gap-3">
            <Flame size={24} className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">NASA FIRMS</p>
              <h2 className="mt-1 text-lg sm:text-2xl font-bold text-slate-950 break-words">Fire Hotspot Watch</h2>
            </div>
          </div>
        </div>
        <div
          className="rounded-lg px-3 py-2 text-sm font-bold text-white text-center flex-shrink-0"
          style={{ backgroundColor: riskLevel.color }}
        >
          <p className="text-xs font-semibold">{riskLevel.label}</p>
          <p className="text-lg font-black">{fire.count}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <StatCard label="Total FRP" value={fire.total_frp} unit="MW" icon={Flame} />
        <StatCard label="High Confidence" value={fire.high_confidence_count} icon={AlertTriangle} />
        <StatCard label="Product" value={fire.product} icon={MapPin} />
      </div>

      {/* Risk Warning */}
      {highFrp && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-900">
              High Fire Radiative Power detected. Immediate verification and response may be required.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-ministry-100">
        <div className="h-72">
          <MapContainer center={[7.8, 6.74]} className="h-full w-full" scrollWheelZoom={false} zoom={7}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {boundary ? (
              <GeoJSON data={boundary} style={{ color: "#166534", fillColor: "#22c55e", fillOpacity: 0.06, weight: 1.5 }} />
            ) : null}
            {(fire.hotspots ?? []).slice(0, 40).map((spot, index) => (
              <CircleMarker
                center={[spot.latitude, spot.longitude]}
                key={`${spot.latitude}-${spot.longitude}-${index}-map`}
                pathOptions={{
                  color: Number(spot.frp) >= 50 ? "#dc2626" : "#f97316",
                  fillColor: Number(spot.frp) >= 50 ? "#ef4444" : "#fb923c",
                  fillOpacity: 0.72
                }}
                radius={Math.max(5, Math.min(16, Number(spot.frp) / 8 || 5))}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">Fire hotspot</p>
                    <p>FRP: {spot.frp} MW</p>
                    <p>Confidence: {formatPercent(spot.confidence_percent ?? spot.confidence_score)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Hotspots List */}
      {fire.count > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Recent Hotspots</p>
            <p className="text-xs text-slate-600">{fire.hotspots?.length || 0} detected</p>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(fire.hotspots ?? []).slice(0, 10).map((spot, index) => (
              <div
                key={`${spot.latitude}-${spot.longitude}-${index}`}
                className="rounded-lg border border-orange-100 bg-orange-50 p-3 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-600">Location</p>
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-600">Confidence</p>
                    <p className="text-sm font-bold text-orange-700">{formatPercent(spot.confidence_percent ?? spot.confidence_score)}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">FRP: <span className="font-bold">{spot.frp} MW</span></p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-4 text-center">
          <p className="text-sm font-semibold text-ministry-900">✓ No active hotspots detected in Kogi State</p>
        </div>
      )}

      {fire.degraded && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-950">
            ⚠ {fire.warning || "NASA FIRMS data is currently degraded. Some hotspots may not be visible."}
          </p>
        </div>
      )}
    </div>
  );
}

function AlertSkeleton({ label }) {
  return (
    <section className="space-y-3" aria-label={label}>
      <div className="h-16 animate-pulse rounded-lg bg-amber-100" />
      <div className="grid gap-3">
        <div className="h-96 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-80 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </section>
  );
}

export default function FireFloodPanel({ language = "en" }) {
  const [fire, setFire] = useState(null);
  const [flood, setFlood] = useState(null);
  const [floodNodes, setFloodNodes] = useState([]);
  const [floodLocations, setFloodLocations] = useState([]);
  const [floodLocation, setFloodLocation] = useState("lokoja");
  const [boundary, setBoundary] = useState(null);
  const [fireError, setFireError] = useState(null);
  const [floodError, setFloodError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setFireError(null);
    setFloodError(null);
    const [locationsResult, fireResult, floodResult] = await Promise.allSettled([
      getFloodLocations(),
      getFireHotspots(5),
      getFloodRisk(floodLocation)
    ]);
    const locations = locationsResult.status === "fulfilled" ? locationsResult.value.locations ?? [] : FALLBACK_FLOOD_LOCATIONS;
    setFloodLocations(locations.length ? locations : FALLBACK_FLOOD_LOCATIONS);
    if (fireResult.status === "fulfilled") setFire(fireResult.value);
    else setFireError(fireResult.reason);
    if (floodResult.status === "fulfilled") setFlood(floodResult.value);
    else setFloodError(floodResult.reason);

    const nodeResults = await Promise.allSettled((locations.length ? locations : FALLBACK_FLOOD_LOCATIONS).map((location) => getFloodRisk(location.id)));
    setFloodNodes(nodeResults.map((result, index) => ({
      location: (locations.length ? locations : FALLBACK_FLOOD_LOCATIONS)[index],
      data: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null
    })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [floodLocation]);

  useEffect(() => {
    fetch("/kogi-lga.geojson")
      .then((response) => response.json())
      .then(setBoundary)
      .catch(() => setBoundary(null));
  }, []);

  if (loading) {
    return <AlertSkeleton label={t(language, "loadingAlerts")} />;
  }

  return (
    <section className="space-y-3" id="alerts">
      {/* Warning Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex flex-col gap-2">
          <AlertTriangle size={16} className="text-amber-700 self-start" />
          <p className="text-xs sm:text-sm font-semibold text-amber-900 leading-relaxed">
            Fire and flood products are screening indicators. Ministry decisions should combine these outputs with local field reports and official weather forecasts.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-ministry-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-ministry-700">{t(language, "monitoredNodes")}</p>
            <p className="text-xs text-slate-500">Lokoja, Kabba, and Idah flood risk nodes are modelled separately.</p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-bold text-slate-600 sm:min-w-56">
            {t(language, "floodLocation")}
            <select
              className="h-10 rounded-md border border-ministry-100 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-leaf-600"
              onChange={(event) => setFloodLocation(event.target.value)}
              value={floodLocation}
            >
              {(floodLocations.length ? floodLocations : FALLBACK_FLOOD_LOCATIONS).map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {floodNodes.map(({ location, data, error }) => (
          <button
            className={`rounded-lg border p-3 text-left transition ${
              floodLocation === location.id
                ? "border-blue-500 bg-blue-50"
                : "border-ministry-100 bg-white hover:border-blue-200"
            }`}
            key={location.id}
            onClick={() => setFloodLocation(location.id)}
            type="button"
          >
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{location.name}</p>
            {data ? (
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-slate-950">{data.flood_index}/100</p>
                  <p className="text-xs font-bold text-slate-600">{data.category} risk</p>
                </div>
                <p className="rounded-md bg-white px-2 py-1 text-xs font-black text-blue-700">
                  {formatPercent(data.confidence_percent)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-red-700">{error?.code || "Unavailable"}</p>
            )}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid gap-3 sm:gap-4 flex-col-reverse md:flex-row">
        {flood ? <FloodCard flood={flood} language={language} /> : <ErrorBox error={floodError} onRetry={load} title="Flood risk unavailable" />}
        {fire ? <FireCard boundary={boundary} fire={fire} /> : <ErrorBox error={fireError} onRetry={load} title="NASA FIRMS unavailable" />}
      </div>
    </section>
  );
}
