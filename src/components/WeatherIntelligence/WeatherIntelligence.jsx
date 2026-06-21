import {
  AlertTriangle,
  CloudRain,
  Compass,
  Droplets,
  RefreshCw,
  Route,
  Sprout,
  Sun,
  Thermometer,
  Wind
} from "lucide-react";
import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getWeatherIntelligence, getWeatherLgas, getWeatherMap } from "../../services/apiClient.js";

const WeatherCharts = lazy(() => import("./WeatherCharts.jsx"));
const WeatherRiskMap = lazy(() => import("./WeatherRiskMap.jsx"));

function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function formatNumber(value, suffix = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}${suffix}`;
}

function riskColor(level) {
  if (level === "HIGH") return "border-red-200 bg-red-50 text-red-900";
  if (level === "MODERATE") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}

function WeatherSkeleton() {
  return (
    <section className="space-y-3" aria-label="Loading weather intelligence">
      <div className="h-28 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-3 md:grid-cols-4">
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-slate-200" />
    </section>
  );
}

function ErrorPanel({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <p className="text-sm font-black">{error?.code || "WEATHER_UNAVAILABLE"}</p>
      <p className="mt-1 text-sm font-semibold">{error?.message || "Weather intelligence is unavailable."}</p>
      <button
        className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-700 px-3 text-xs font-black uppercase text-white hover:bg-red-800"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, context }) {
  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-4 shadow-sm transition hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <Icon className="h-6 w-6 shrink-0 text-ministry-700" />
      </div>
      <p className="mt-3 min-h-10 text-sm font-semibold leading-5 text-slate-600">{context}</p>
    </div>
  );
}

function RiskTile({ icon: Icon, label, risk, extra }) {
  return (
    <div className={`rounded-lg border p-3 ${riskColor(risk?.level)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-xl font-black">{risk?.score ?? "--"}/100</p>
        </div>
        <Icon className="h-5 w-5 shrink-0" />
      </div>
      <p className="mt-2 text-xs font-black">{risk?.level ?? extra ?? "--"}</p>
    </div>
  );
}

function ForecastTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-ministry-100 bg-white p-4 text-sm font-semibold text-slate-600">
        Hourly weather forecast is not available for this LGA.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ministry-100 bg-white shadow-sm">
      <div className="border-b border-ministry-100 p-4">
        <h3 className="text-sm font-black text-slate-950">Hourly Forecast</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ministry-50 text-xs font-black uppercase tracking-wide text-ministry-900">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Temp</th>
              <th className="px-4 py-3">Rain</th>
              <th className="px-4 py-3">Volume</th>
              <th className="px-4 py-3">Humidity</th>
              <th className="px-4 py-3">Wind</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 24).map((row) => (
              <tr className="hover:bg-slate-50" key={row.timestamp}>
                <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">
                  {new Date(row.timestamp).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">{formatNumber(row.temperature, " C")}</td>
                <td className="px-4 py-3">{formatNumber(row.rainProbability, "%")}</td>
                <td className="px-4 py-3">{formatNumber(row.rainVolume, " mm")}</td>
                <td className="px-4 py-3">{formatNumber(row.humidity, "%")}</td>
                <td className="px-4 py-3">{formatNumber(row.windSpeed, " km/h")}</td>
                <td className="px-4 py-3">{row.weatherCondition}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md border px-2 py-1 text-xs font-black ${riskColor(row.riskLevel)}`}>
                    {row.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function WeatherIntelligence({ language = "en" }) {
  const [lgas, setLgas] = useState([]);
  const [selectedLga, setSelectedLga] = useState("lokoja");
  const [weather, setWeather] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const current = weather?.current;
  const intelligence = weather?.intelligence;
  const selectedName = useMemo(
    () => lgas.find((lga) => lga.id === selectedLga)?.name ?? weather?.location ?? "Lokoja",
    [lgas, selectedLga, weather]
  );

  async function load({ refresh = false } = {}) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [locationsResult, weatherResult, mapResult] = await Promise.allSettled([
        lgas.length ? Promise.resolve({ locations: lgas }) : getWeatherLgas(),
        getWeatherIntelligence(selectedLga, refresh),
        getWeatherMap(false)
      ]);

      if (locationsResult.status === "fulfilled") {
        const nextLocations = locationsResult.value.locations ?? [];
        if (nextLocations.length) setLgas(nextLocations);
      }

      if (weatherResult.status === "rejected") throw weatherResult.reason;
      setWeather(weatherResult.value);

      if (mapResult.status === "fulfilled") {
        setMapData(mapResult.value);
      }
    } catch (loadError) {
      setError(loadError);
      setWeather(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [selectedLga]);

  if (loading && !weather) return <WeatherSkeleton />;

  return (
    <section className="space-y-3" id="weather">
      <div className="rounded-lg border border-ministry-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ministry-700">Weather Intelligence</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">LGA forecast and field-risk guidance</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Coordinate-based weather screening for Ministry operations, field movement, farming conditions, and public activity guidance.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-56 flex-col gap-1 text-xs font-black uppercase tracking-wide text-slate-600">
              LGA
              <select
                className="h-10 rounded-md border border-ministry-100 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-leaf-600"
                onChange={(event) => setSelectedLga(event.target.value)}
                value={selectedLga}
              >
                {(lgas.length ? lgas : [{ id: "lokoja", name: "Lokoja" }]).map((lga) => (
                  <option key={lga.id} value={lga.id}>{lga.name}</option>
                ))}
              </select>
            </label>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ministry-700 px-3 text-xs font-black uppercase text-white transition hover:bg-ministry-900 disabled:cursor-wait disabled:opacity-70"
              disabled={refreshing}
              onClick={() => load({ refresh: true })}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
          <span>Last updated: {formatDateTime(weather?.timestamp ?? current?.timestamp)}</span>
          {weather?.stale ? <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-black text-amber-900">Stale cache</span> : null}
          {weather?.warning ? <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-black text-amber-900">{weather.warning}</span> : null}
        </div>
      </div>

      {error ? <ErrorPanel error={error} onRetry={() => load()} /> : null}

      {weather ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard
              context={`Feels like ${formatNumber(current?.feelsLike, " C")} in ${selectedName}.`}
              icon={Thermometer}
              label="Current Temperature"
              value={formatNumber(current?.temperature, " C")}
            />
            <SummaryCard
              context={`${formatNumber(current?.rainVolume, " mm")} rain currently indicated by the forecast model.`}
              icon={CloudRain}
              label="Rain Probability"
              value={formatNumber(current?.rainProbability, "%")}
            />
            <SummaryCard
              context={`Direction ${formatNumber(current?.windDirection, " deg")}; gusts ${formatNumber(current?.windGusts, " km/h")}.`}
              icon={Wind}
              label="Wind Conditions"
              value={formatNumber(current?.windSpeed, " km/h")}
            />
            <SummaryCard
              context={`Main driver: ${intelligence?.topRiskDriver ?? "weather"}.`}
              icon={AlertTriangle}
              label="Weather Risk Score"
              value={`${intelligence?.overallWeatherScore ?? "--"}/100`}
            />
          </div>

          <div className={`rounded-lg border p-4 ${riskColor(intelligence?.riskLevel)}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide">Operational Recommendation</p>
                <p className="mt-1 text-base font-black leading-6">{intelligence?.recommendationText}</p>
              </div>
              <span className="rounded-md border border-current px-3 py-2 text-sm font-black">{intelligence?.riskLevel} RISK</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <RiskTile icon={Droplets} label="Flood Risk" risk={intelligence?.floodRisk} />
            <RiskTile icon={Sun} label="Heat Risk" risk={intelligence?.heatRisk} />
            <RiskTile icon={Compass} label="Storm Risk" risk={intelligence?.stormRisk} />
            <RiskTile icon={Route} label="Road Risk" risk={intelligence?.roadRisk} />
            <div className="rounded-lg border border-ministry-100 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Agriculture</p>
                  <p className="mt-1 text-xl font-black text-slate-950">{intelligence?.agriculturalSuitability?.category ?? "--"}</p>
                </div>
                <Sprout className="h-5 w-5 shrink-0 text-field-500" />
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{intelligence?.agriculturalSuitability?.guidance}</p>
            </div>
          </div>

          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-slate-200" />}>
            <WeatherCharts dailyForecast={weather.dailyForecast} />
          </Suspense>

          <ForecastTable rows={weather.hourlyForecast} />

          <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-slate-200" />}>
            <WeatherRiskMap mapData={mapData} />
          </Suspense>
        </>
      ) : null}
    </section>
  );
}
