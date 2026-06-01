import { AlertTriangle, Loader2, Droplets, Flame, MapPin, TrendingUp, Calendar, Cloud } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getFireHotspots, getFloodRisk } from "../../services/apiClient.js";

function ErrorBox({ error, title }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-sm">{error?.message}</p>
      <p className="mt-1 text-xs font-semibold">{error?.code}</p>
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
            <p className="text-xs sm:text-3xl font-bold text-slate-900 break-all">{value}</p>
            {unit && <p className="text-xs text-slate-500 flex-shrink-0">{unit}</p>}
          </div>
        </div>
        {Icon && <Icon size={20} sm:size={24} className="text-ministry-600 flex-shrink-0 mt-1" />}
      </div>
    </div>
  );
}

function FloodCard({ flood }) {
  const getRiskColor = (level) => {
    if (level <= 20) return { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7", label: "Low Risk" };
    if (level <= 50) return { bg: "#fef3c7", text: "#78350f", border: "#fbbf24", label: "Moderate Risk" };
    if (level <= 60) return { bg: "#fed7aa", text: "#7c2d12", border: "#fb923c", label: "High Risk" };
    return { bg: "#fee2e2", text: "#7f1d1d", border: "#fca5a5", label: "Very High Risk" };
  };
  
  const riskColors = getRiskColor(flood.flood_index);

  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-6 shadow-panel space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Droplets size={24} className="text-blue-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">Flood Risk</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">Niger-Benue Index</h2>
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
          <span>High Risk</span>
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
        <StatCard label="30-Day Rain" value={flood.recent_30day_rain_mm} unit="mm" icon={Cloud} />
        <StatCard label="3-Day Forecast" value={flood.forecast_3day_rain_mm} unit="mm" icon={Calendar} />
        <StatCard label="Risk Trend" value={flood.flood_index >= 50 ? "↑ High" : "↓ Stable"} icon={TrendingUp} />
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
    </div>
  );
}

function FireCard({ fire }) {
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
                    <p className="text-sm font-bold text-orange-700">{spot.confidence}%</p>
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

export default function FireFloodPanel() {
  const [fire, setFire] = useState(null);
  const [flood, setFlood] = useState(null);
  const [fireError, setFireError] = useState(null);
  const [floodError, setFloodError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [fireResult, floodResult] = await Promise.allSettled([getFireHotspots(5), getFloodRisk()]);
      if (fireResult.status === "fulfilled") setFire(fireResult.value);
      else setFireError(fireResult.reason);
      if (floodResult.status === "fulfilled") setFlood(floodResult.value);
      else setFloodError(floodResult.reason);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-ministry-100 bg-white p-4 text-ministry-700 shadow-panel flex items-center justify-center gap-2 flex-col">
        <Loader2 size={16} className="animate-spin" />
        <span className="font-semibold text-sm text-center">Loading fire and flood risk data...</span>
      </div>
    );
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

      {/* Cards Grid */}
      <div className="grid gap-3 sm:gap-4 flex-col-reverse md:flex-row">
        {flood ? <FloodCard flood={flood} /> : <ErrorBox error={floodError} title="Flood risk unavailable" />}
        {fire ? <FireCard fire={fire} /> : <ErrorBox error={fireError} title="NASA FIRMS unavailable" />}
      </div>
    </section>
  );
}

