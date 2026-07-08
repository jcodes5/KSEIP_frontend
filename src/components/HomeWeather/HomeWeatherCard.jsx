import { CloudRain, Compass, MapPin, RefreshCw, Thermometer, Wind, Droplets } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getCurrentWeather, getCurrentWeatherByCoordinates, getWeatherLgas } from "../../services/apiClient.js";

function formatNumber(value, suffix = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  const safeSuffix = suffix.includes("\u00b0") ? " deg" : suffix;
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(1)}${safeSuffix}`;
}

function statusCopy(status, error) {
  if (status === "ready") {
    return "Showing current live weather for this location.";
  }

  if (status === "unsupported") {
    return "This browser does not support geolocation.";
  }

  if (status === "denied") {
    return "Location access was denied. Enable it to see live weather for your position.";
  }

  if (status === "error") {
    return error?.message || "Weather lookup failed. Try again.";
  }

  return "Requesting your location to load nearby weather...";
}

function formatDistance(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return `${formatNumber(numeric, " km away")}`;
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white/90 p-3 text-slate-900">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

export default function HomeWeatherCard() {
  const [status, setStatus] = useState("loading");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const [manualLgas, setManualLgas] = useState([]);
  const [selectedLga, setSelectedLga] = useState("lokoja");
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getWeatherLgas()
      .then((payload) => {
        if (!cancelled) setManualLgas(payload.locations ?? []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer = null;

    async function resolveWeather() {
      if (!navigator.geolocation) {
        setStatus("unsupported");
        return;
      }

      setStatus("loading");
      setError(null);

      fallbackTimer = window.setTimeout(async () => {
        if (cancelled) return;

        try {
          const data = await getCurrentWeather(selectedLga, true);
          if (cancelled) return;
          setWeather({
            ...data,
            detected_location: data.location,
            detected_location_source: "manual-selection",
            outside_kogi_coverage: false,
            assessmentMethod: data.assessmentMethod ?? "rule-based",
            warning: "Browser location is still pending, so showing the selected Kogi location."
          });
          setStatus("ready");
        } catch (fallbackError) {
          if (cancelled) return;
          setError(fallbackError);
          setStatus("error");
        }
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          window.clearTimeout(fallbackTimer);

          try {
            const data = await getCurrentWeatherByCoordinates(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy
            );

            if (cancelled) return;
            setWeather(data);
            setStatus("ready");
          } catch (lookupError) {
            if (cancelled) return;
            setError(lookupError);
            setStatus("error");
          }
        },
        (geoError) => {
          if (cancelled) return;
          window.clearTimeout(fallbackTimer);
          setError(geoError);
          setStatus(geoError?.code === 1 ? "denied" : "error");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 60 * 1000,
          timeout: 15000
        }
      );
    }

    resolveWeather();

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [retryToken]);

  const locationName = weather?.detected_location ?? weather?.location ?? "Nearby location";
  const condition = weather?.weatherCondition ?? "--";
  const outsideKogiCoverage = Boolean(weather?.outside_kogi_coverage);
  const nearestNodeDistance = formatDistance(weather?.nearest_lga_distance_km);
  const nearestNodeText = weather?.nearest_lga
    ? `${weather.nearest_lga}${nearestNodeDistance ? ` (${nearestNodeDistance})` : ""}`
    : null;
  const accuracyMeters = Number(weather?.query_coordinates?.accuracy_m);
  const accuracyText = Number.isFinite(accuracyMeters) ? `Browser accuracy: about ${formatNumber(accuracyMeters, " m")}.` : null;

  async function loadManualLocation() {
    setManualLoading(true);
    setError(null);

    try {
      const data = await getCurrentWeather(selectedLga, true);
      setWeather({
        ...data,
        detected_location: data.location,
        detected_location_source: "manual-selection",
        outside_kogi_coverage: false,
        assessmentMethod: data.assessmentMethod ?? "rule-based"
      });
      setStatus("ready");
    } catch (manualError) {
      setError(manualError);
      setStatus("error");
    } finally {
      setManualLoading(false);
    }
  }

  const manualPicker = (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black uppercase tracking-wide text-slate-500">
        {weather ? "Correct location" : "Manual location fallback"}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {weather
          ? "If the browser location is not right, choose the nearest Kogi LGA."
          : "Choose a nearby Kogi location if geolocation is unavailable."}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <select
          className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none"
          onChange={(event) => setSelectedLga(event.target.value)}
          value={selectedLga}
        >
          {(manualLgas.length ? manualLgas : [{ id: "lokoja", name: "Lokoja" }]).map((lga) => (
            <option key={lga.id} value={lga.id}>
              {lga.name}
            </option>
          ))}
        </select>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ministry-700 px-4 text-xs font-black uppercase text-white transition hover:bg-ministry-900 disabled:cursor-wait disabled:opacity-70"
          disabled={manualLoading}
          onClick={loadManualLocation}
          type="button"
        >
          <RefreshCw className={manualLoading ? "animate-spin" : ""} size={14} />
          Use location
        </button>
      </div>
    </div>
  );

  return (
    <section className="rounded-lg border border-white/20 bg-white p-5 text-slate-900 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-ministry-700">Live Weather</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Weather near you</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {statusCopy(status, error)}
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black uppercase text-slate-700 transition hover:border-ministry-500 hover:text-ministry-700"
          onClick={() => setRetryToken((value) => value + 1)}
          type="button"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>

      {status === "loading" ? (
        <div className="mt-5 space-y-3">
          <div className="h-14 animate-pulse rounded-md bg-slate-100" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 animate-pulse rounded-md bg-slate-100" />
            <div className="h-20 animate-pulse rounded-md bg-slate-100" />
          </div>
          {manualPicker}
        </div>
      ) : weather ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg bg-ministry-50 p-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-ministry-700">
              <MapPin size={14} />
              Detected location
            </div>
            <p className="mt-2 text-lg font-black text-slate-950">{locationName}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {outsideKogiCoverage
                ? "This browser location appears outside Kogi coverage. Select a Kogi LGA below."
                : nearestNodeText
                  ? `Nearest Kogi weather node: ${nearestNodeText}.`
                  : "Location resolved from your coordinates."}
            </p>
            {accuracyText ? <p className="mt-1 text-xs font-bold text-slate-500">{accuracyText}</p> : null}
          </div>

          <div className="flex items-end justify-between gap-4 rounded-lg border border-slate-200 bg-slate-950 px-4 py-4 text-white">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Current conditions</p>
              <p className="mt-2 text-4xl font-black">{formatNumber(weather.temperature, " C")}</p>
              <p className="mt-2 text-sm font-semibold text-white/75">Feels like {formatNumber(weather.feelsLike, " C")}</p>
            </div>
            <div className="text-right">
              <CloudRain className="ml-auto h-10 w-10 text-ministry-200" />
              <p className="mt-2 text-sm font-black uppercase tracking-wide text-white/85">{condition}</p>
              <p className="text-xs font-semibold text-white/65">{weather.source}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={Thermometer} label="Humidity" value={formatNumber(weather.humidity, "%")} />
            <Metric icon={Wind} label="Wind" value={formatNumber(weather.windSpeed, " km/h")} />
            <Metric icon={Droplets} label="Rain chance" value={formatNumber(weather.rainProbability, "%")} />
            <Metric icon={Compass} label="Direction" value={formatNumber(weather.windDirection, "°")} />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-900">
            Rule-based assessment
            <span className="rounded border border-emerald-300 px-2 py-1 text-[10px]">{weather.assessmentMethod ?? "rule-based"}</span>
            {weather.detected_location_source ? <span className="rounded border border-emerald-300 px-2 py-1 text-[10px]">{weather.detected_location_source}</span> : null}
          </div>

          {weather.warning ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              {weather.warning}
            </div>
          ) : null}

          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Updated {weather.timestamp ? new Date(weather.timestamp).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "just now"}
          </div>

          {outsideKogiCoverage ? manualPicker : null}
        </div>
      ) : (status === "denied" || status === "unsupported" || status === "error") ? (
        <div className="mt-5 space-y-4">
          {manualPicker}
        </div>
      ) : null}
    </section>
  );
}
