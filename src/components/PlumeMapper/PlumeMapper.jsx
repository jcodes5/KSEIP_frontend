import "leaflet/dist/leaflet.css";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ImageDown,
  Loader2,
  MapPin,
  RefreshCw,
  Wind
} from "lucide-react";
import L from "leaflet";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import {
  Area as ChartArea,
  AreaChart as RechartsAreaChart,
  CartesianGrid as ChartGrid,
  Legend as ChartLegend,
  Line as ChartLine,
  ResponsiveContainer as ChartContainer,
  Tooltip as ChartTooltip,
  XAxis as ChartXAxis,
  YAxis as ChartYAxis
} from "recharts";
import { runPlumeSimulation } from "../../services/apiClient.js";

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

const EMPTY_ADVANCED = {
  deposition_velocity: "",
  mixing_height_override: "",
  loss_rate_override: "",
  effective_height_override: ""
};

const arrowMarker = L.divIcon({
  className: "",
  iconSize: [42, 52],
  iconAnchor: [21, 50],
  popupAnchor: [0, -48],
  html: `
    <div style="position:relative;width:42px;height:52px;filter:drop-shadow(0 8px 12px rgba(15,23,42,.35));">
      <svg viewBox="0 0 42 52" width="42" height="52" aria-hidden="true">
        <path d="M21 2 L39 22 L30 22 L30 42 L21 50 L12 42 L12 22 L3 22 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="3" />
        <circle cx="21" cy="23" r="6" fill="#fff7ed" stroke="#991b1b" stroke-width="2" />
      </svg>
    </div>`
});

function numericFormValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : "";
}

function optionalNumber(value) {
  return value === "" || value === null || value === undefined ? undefined : Number(value);
}

function formatNumber(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "Current";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatHourLabel(timestamp, fallbackHour) {
  if (!timestamp) return `H${fallbackHour}`;
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function concentrationStats(result) {
  const points = result?.grid_json?.points ?? [];
  const values = points.map(([, , concentration]) => Number(concentration)).filter((value) => Number.isFinite(value));
  const positive = values.filter((value) => value > 0);
  const avgFromGrid = positive.length ? positive.reduce((sum, value) => sum + value, 0) / positive.length : 0;

  return {
    peak: Number(result?.cmax ?? 0),
    average: Number(result?.stats?.avg_positive_concentration_ug_m3 ?? avgFromGrid),
    min: Number(result?.stats?.min_positive_concentration_ug_m3 ?? 0)
  };
}

function buildHourlyRows(frames) {
  return frames.map((frame, index) => {
    const stats = concentrationStats(frame.result);
    return {
      hour: frame.hour ?? index + 1,
      timestamp: frame.timestamp,
      time: formatTime(frame.timestamp),
      peak: stats.peak,
      average: stats.average,
      min: stats.min,
      duration: Number(frame.duration_h ?? 1),
      windSpeed: Number(frame.meteo?.wind_speed ?? 0),
      windDir: Number(frame.meteo?.wind_dir ?? 0),
      stability: frame.result?.metadata?.stability_class ?? frame.meteo?.stability_class ?? "--",
      source: frame.meteo?.source ?? "--"
    };
  });
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvFromHourlyResults(frames) {
  const rows = buildHourlyRows(frames);
  const columns = [
    "hour",
    "time",
    "timestamp",
    "peak_concentration_ug_m3",
    "average_concentration_ug_m3",
    "minimum_positive_concentration_ug_m3",
    "duration_h",
    "wind_speed_m_s",
    "wind_direction_deg",
    "stability_class",
    "weather_source"
  ];

  return [
    columns.join(","),
    ...rows.map((row) => [
      row.hour,
      row.time,
      row.timestamp,
      row.peak,
      row.average,
      row.min,
      row.duration,
      row.windSpeed,
      row.windDir,
      row.stability,
      row.source
    ].map(escapeCsv).join(","))
  ].join("\n");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(data, filename) {
  downloadBlob(new Blob([data], { type: "text/csv;charset=utf-8" }), filename);
}

function gridPointToLatLng(source, windDirDegrees, x, y) {
  const theta = (Number(windDirDegrees) * Math.PI) / 180;
  const east = x * Math.sin(theta) + y * Math.cos(theta);
  const north = x * Math.cos(theta) - y * Math.sin(theta);
  const lat = source.lat + north / 111_320;
  const lon = source.lon + east * (1 / (111_320 * Math.cos((source.lat * Math.PI) / 180)));
  return [lat, lon];
}

function plumePolyline(result, source, windDir) {
  const points = result?.grid_json?.points ?? [];
  const cmax = Number(result?.cmax ?? 0);
  if (!points.length || cmax <= 0) return [];

  return points
    .filter(([, y, concentration]) => Math.abs(Number(y)) <= 100 && Number(concentration) > cmax * 0.04)
    .sort(([xA], [xB]) => xA - xB)
    .map(([x, y, concentration]) => ({
      position: gridPointToLatLng(source, windDir, x, y),
      concentration
    }));
}

function heatColor(value, cmax) {
  const ratio = cmax > 0 ? Math.max(0, Math.min(1, value / cmax)) : 0;
  if (ratio > 0.78) return "#dc2626";
  if (ratio > 0.55) return "#f97316";
  if (ratio > 0.34) return "#facc15";
  if (ratio > 0.16) return "#22c55e";
  return "#38bdf8";
}

async function timeSeriesPngBlob(chartData, metadata) {
  const canvas = document.createElement("canvas");
  canvas.width = 1500;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  const maxPeak = Math.max(1, ...chartData.map((row) => row.peak));
  const avgPeak = chartData.length
    ? chartData.reduce((sum, row) => sum + row.peak, 0) / chartData.length
    : 0;
  const peakRow = chartData.reduce((best, row) => (row.peak > best.peak ? row : best), chartData[0] ?? { peak: 0, hour: 1 });
  const plot = { x: 110, y: 190, width: 980, height: 540 };

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a";
  context.font = "700 40px Arial";
  context.fillText("Hourly Concentration Time Series", 70, 74);
  context.font = "18px Arial";
  context.fillStyle = "#475569";
  context.fillText(`${metadata.sourceName} | ${metadata.durationHours} hours | ${metadata.weatherMode}`, 72, 112);
  context.fillText(`Generated ${formatTime(metadata.generatedAt)}`, 72, 140);

  context.fillStyle = "#ffffff";
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 2;
  context.fillRect(plot.x, plot.y, plot.width, plot.height);
  context.strokeRect(plot.x, plot.y, plot.width, plot.height);

  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 1;
  context.font = "14px Arial";
  context.fillStyle = "#64748b";
  for (let i = 0; i <= 5; i += 1) {
    const y = plot.y + (i * plot.height) / 5;
    const value = maxPeak - (i * maxPeak) / 5;
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
    context.fillText(formatNumber(value, 1), 36, y + 5);
  }

  const xFor = (index) => plot.x + (index / Math.max(1, chartData.length - 1)) * plot.width;
  const yFor = (value) => plot.y + plot.height - (value / maxPeak) * plot.height;

  if (chartData.length) {
    const areaGradient = context.createLinearGradient(0, plot.y, 0, plot.y + plot.height);
    areaGradient.addColorStop(0, "rgba(37,99,235,.28)");
    areaGradient.addColorStop(1, "rgba(37,99,235,.02)");
    context.beginPath();
    context.moveTo(plot.x, plot.y + plot.height);
    chartData.forEach((row, index) => context.lineTo(xFor(index), yFor(row.peak)));
    context.lineTo(plot.x + plot.width, plot.y + plot.height);
    context.closePath();
    context.fillStyle = areaGradient;
    context.fill();

    context.strokeStyle = "#2563eb";
    context.lineWidth = 4;
    context.beginPath();
    chartData.forEach((row, index) => {
      const x = xFor(index);
      const y = yFor(row.peak);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    chartData.forEach((row, index) => {
      const x = xFor(index);
      const y = yFor(row.peak);
      context.fillStyle = row.hour === peakRow.hour ? "#dc2626" : "#2563eb";
      context.beginPath();
      context.arc(x, y, row.hour === peakRow.hour ? 7 : 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.stroke();
    });
  }

  context.fillStyle = "#64748b";
  context.font = "14px Arial";
  const step = Math.max(1, Math.ceil(chartData.length / 10));
  chartData.forEach((row, index) => {
    if (index % step !== 0 && index !== chartData.length - 1) return;
    context.fillText(`H${row.hour}`, xFor(index) - 10, plot.y + plot.height + 30);
  });
  context.save();
  context.translate(28, plot.y + plot.height / 2);
  context.rotate(-Math.PI / 2);
  context.fillText("Concentration (ug/m3)", 0, 0);
  context.restore();

  context.fillStyle = "#0f172a";
  context.fillRect(1160, 190, 270, 260);
  context.fillStyle = "#94a3b8";
  context.font = "700 13px Arial";
  context.fillText("SIMULATION METADATA", 1184, 224);
  context.fillStyle = "#ffffff";
  context.font = "700 24px Arial";
  context.fillText(`${formatNumber(peakRow.peak, 2)} ug/m3`, 1184, 266);
  context.font = "15px Arial";
  context.fillText(`Peak hour: H${peakRow.hour}`, 1184, 298);
  context.fillText(`Average peak: ${formatNumber(avgPeak, 2)} ug/m3`, 1184, 330);
  context.fillText(`Wind mode: ${metadata.weatherMode}`, 1184, 362);
  context.fillText(`Source: ${metadata.locationMode}`, 1184, 394);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
}

function FitKogiBoundary({ boundary }) {
  const map = useMap();

  useEffect(() => {
    if (!boundary?.features?.length) return;
    const layer = L.geoJSON(boundary);
    map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 9 });
  }, [boundary, map]);

  return null;
}

function RecenterOnSource({ source }) {
  const map = useMap();

  useEffect(() => {
    map.setView([source.lat, source.lon], Math.max(map.getZoom(), 9), { animate: true });
  }, [map, source.lat, source.lon]);

  return null;
}

function WindCompass({ direction }) {
  const rotation = Number(direction) || 0;
  return (
    <div className="absolute right-3 top-3 z-[500] rounded-md border border-white/80 bg-white/95 p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
          <Wind className="text-ministry-700" size={18} style={{ transform: `rotate(${rotation}deg)` }} />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Wind</p>
          <p className="text-sm font-black text-slate-950">{formatNumber(rotation, 0)} deg</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function NumericInput({ max, min, onChange, step = "any", value }) {
  return (
    <input
      className="h-10 rounded-md border border-ministry-100 px-3 text-sm outline-none focus:border-leaf-600"
      inputMode="decimal"
      max={max}
      min={min}
      onChange={(event) => onChange(event.target.value)}
      step={step}
      type="number"
      value={value}
    />
  );
}

function CollapsiblePanel({ children, defaultOpen = false, title }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-ministry-100 bg-ministry-50">
      <button
        className="flex w-full items-center justify-between px-3 py-3 text-left"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="text-sm font-black uppercase tracking-wide text-ministry-900">{title}</span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen ? <div className="grid gap-3 border-t border-ministry-200 px-3 py-3">{children}</div> : null}
    </div>
  );
}

function HourlyWindOverrides({ durationHours, hourlyWinds, setHourlyWinds }) {
  const updateWind = (hourIndex, field, value) => {
    setHourlyWinds((previous) => {
      const next = { ...previous };
      const current = { ...(next[hourIndex] ?? {}) };
      const parsed = value === "" ? undefined : Number(value);
      if (field === "speed") current.speed = parsed;
      if (field === "dir") current.dir = parsed;
      if (current.speed === undefined && current.dir === undefined) delete next[hourIndex];
      else next[hourIndex] = current;
      return next;
    });
  };

  return (
    <CollapsiblePanel title={`Hourly Wind Overrides (${Object.keys(hourlyWinds).length})`}>
      <div className="max-h-72 overflow-y-auto pr-1">
        {Array.from({ length: durationHours }).map((_, hour) => (
          <div className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm xs:grid-cols-[58px_1fr_1fr] xs:items-end xs:border-0 xs:bg-transparent xs:p-0 xs:py-1" key={hour}>
            <span className="text-xs font-black uppercase text-slate-500 xs:pb-2">H{hour + 1}</span>
            <Field label="Speed">
              <NumericInput min="0.1" onChange={(value) => updateWind(hour, "speed", value)} step="0.1" value={hourlyWinds[hour]?.speed ?? ""} />
            </Field>
            <Field label="Dir">
              <NumericInput max="360" min="0" onChange={(value) => updateWind(hour, "dir", value)} step="1" value={hourlyWinds[hour]?.dir ?? ""} />
            </Field>
          </div>
        ))}
      </div>
    </CollapsiblePanel>
  );
}

function MetricTile({ label, value, unit }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      {unit ? <p className="text-xs font-semibold text-slate-500">{unit}</p> : null}
    </div>
  );
}

function TimeSeriesPanel({ chartData, metadata, onExportPng }) {
  const peak = chartData.reduce((best, row) => (row.peak > best.peak ? row : best), chartData[0] ?? { peak: 0, hour: 1 });
  const avgPeak = chartData.length ? chartData.reduce((sum, row) => sum + row.peak, 0) / chartData.length : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-ministry-700" />
            <h3 className="text-base font-black text-slate-950">Hourly Concentration Time Series</h3>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {metadata.sourceName} | {metadata.durationHours} hours | {metadata.weatherMode}
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ministry-700 px-3 text-xs font-black uppercase text-white hover:bg-ministry-900"
          onClick={onExportPng}
          type="button"
        >
          <ImageDown size={15} />
          Export PNG
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_190px]">
        <div className="h-72 min-w-0">
          <ChartContainer width="100%" height="100%">
            <RechartsAreaChart data={chartData} margin={{ bottom: 12, left: 10, right: 16, top: 16 }}>
              <defs>
                <linearGradient id="peakGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <ChartGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <ChartXAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
              <ChartYAxis tick={{ fill: "#64748b", fontSize: 11 }} width={74} label={{ value: "ug/m3", angle: -90, position: "insideLeft", fill: "#64748b" }} />
              <ChartTooltip
                formatter={(value, name) => [`${formatNumber(value, 2)} ug/m3`, name === "peak" ? "Peak" : "Average"]}
                labelFormatter={(label) => `Time ${label}`}
              />
              <ChartLegend verticalAlign="top" height={28} />
              <ChartArea dataKey="peak" fill="url(#peakGradient)" name="Peak concentration" stroke="#2563eb" strokeWidth={3} type="monotone" />
              <ChartLine dataKey="average" dot={false} name="Average concentration" stroke="#059669" strokeWidth={2} type="monotone" />
            </RechartsAreaChart>
          </ChartContainer>
        </div>

        <div className="grid content-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Metadata</p>
          <MetricTile label="Peak" unit={`H${peak.hour}`} value={formatNumber(peak.peak, 2)} />
          <MetricTile label="Average Peak" unit="ug/m3" value={formatNumber(avgPeak, 2)} />
          <MetricTile label="Duration" unit="hours" value={metadata.durationHours} />
        </div>
      </div>
    </div>
  );
}

function HourlyResultsTable({ frames, onExportCsv }) {
  const rows = useMemo(() => buildHourlyRows(frames), [frames]);
  const peak = rows.reduce((best, row) => (row.peak > best.peak ? row : best), rows[0] ?? { peak: 0, hour: 1 });
  const average = rows.length ? rows.reduce((sum, row) => sum + row.average, 0) / rows.length : 0;
  const duration = rows.reduce((sum, row) => sum + row.duration, 0);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Hourly Results</h3>
          <p className="text-xs font-semibold text-slate-400">Peak, average, and modeled duration by hour</p>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 text-xs font-black uppercase text-white hover:bg-slate-800"
          onClick={onExportCsv}
          type="button"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-blue-500/25 bg-blue-500/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">Peak Concentration</p>
          <p className="mt-2 text-3xl font-black">{formatNumber(peak.peak, 2)}</p>
          <p className="text-xs text-slate-400">ug/m3 at H{peak.hour}</p>
        </div>
        <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Average Concentration</p>
          <p className="mt-2 text-3xl font-black">{formatNumber(average, 2)}</p>
          <p className="text-xs text-slate-400">ug/m3 across hourly grids</p>
        </div>
        <div className="rounded-md border border-orange-500/25 bg-orange-500/10 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Total Duration</p>
          <p className="mt-2 text-3xl font-black">{formatNumber(duration, 0)}</p>
          <p className="text-xs text-slate-400">modeled hours</p>
        </div>
      </div>

      <div className="mt-4 max-h-80 overflow-auto rounded-md border border-slate-800">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="sticky top-0 bg-slate-900 text-[10px] uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Hour</th>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-right">Peak ug/m3</th>
              <th className="px-4 py-3 text-right">Average ug/m3</th>
              <th className="px-4 py-3 text-right">Duration h</th>
              <th className="px-4 py-3 text-right">Wind m/s</th>
              <th className="px-4 py-3 text-right">Wind deg</th>
              <th className="px-4 py-3 text-right">Stability</th>
              <th className="px-4 py-3 text-right">Peak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr className={row.hour === peak.hour ? "bg-blue-500/10" : "hover:bg-slate-900/80"} key={`${row.hour}-${row.timestamp}`}>
                <td className="px-4 py-3 font-mono font-black">H{row.hour}</td>
                <td className="px-4 py-3 text-slate-300">{row.time}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(row.peak, 3)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(row.average, 3)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(row.duration, 0)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(row.windSpeed, 1)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(row.windDir, 0)}</td>
                <td className="px-4 py-3 text-right font-black">{row.stability}</td>
                <td className="px-4 py-3 text-right text-xs font-black text-blue-300">{row.hour === peak.hour ? "PEAK" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoordinateVisualization({ result, source, windDir }) {
  const points = result?.grid_json?.points ?? [];
  const cmax = Number(result?.cmax ?? 0);
  const renderedPoints = points.filter(([, , concentration]) => Number(concentration) > cmax * 0.02);

  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-emerald-700" />
            <h3 className="text-base font-black text-slate-950">Coordinate-Based Plume Analysis</h3>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {formatNumber(source.lat, 5)}, {formatNumber(source.lon, 5)} | wind {formatNumber(windDir, 0)} deg
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="relative h-72 overflow-hidden rounded-md border border-slate-200 bg-slate-950">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 700 320">
            <defs>
              <linearGradient id="coordBack" x1="0" x2="1">
                <stop offset="0" stopColor="#082f49" />
                <stop offset="1" stopColor="#064e3b" />
              </linearGradient>
            </defs>
            <rect fill="url(#coordBack)" height="320" width="700" />
            {Array.from({ length: 8 }).map((_, index) => (
              <line key={`v-${index}`} stroke="rgba(255,255,255,.08)" x1={60 + index * 80} x2={60 + index * 80} y1="28" y2="290" />
            ))}
            {Array.from({ length: 5 }).map((_, index) => (
              <line key={`h-${index}`} stroke="rgba(255,255,255,.08)" x1="40" x2="660" y1={60 + index * 52} y2={60 + index * 52} />
            ))}
            <polygon fill="#ef4444" points="56,160 86,142 86,153 122,153 122,167 86,167 86,178" stroke="#fee2e2" strokeWidth="2" />
            {renderedPoints.map(([x, y, concentration], index) => {
              const px = 80 + (Number(x) / 2000) * 560;
              const py = 160 - (Number(y) / 1000) * 120;
              const ratio = cmax > 0 ? Math.max(0.1, Math.min(1, Number(concentration) / cmax)) : 0.1;
              return (
                <circle
                  cx={px}
                  cy={py}
                  fill={heatColor(concentration, cmax)}
                  key={`${x}-${y}-${index}`}
                  opacity={0.18 + ratio * 0.72}
                  r={2 + ratio * 8}
                />
              );
            })}
            <text fill="#e2e8f0" fontSize="12" fontWeight="700" x="48" y="304">Local coordinate plume grid, separate from primary map</text>
          </svg>
        </div>
        <div className="grid content-start gap-2">
          <MetricTile label="Peak" unit="ug/m3" value={formatNumber(result?.cmax, 2)} />
          <MetricTile label="Peak distance" unit="m" value={formatNumber(result?.xmax, 0)} />
          <MetricTile label="Average" unit="ug/m3" value={formatNumber(concentrationStats(result).average, 2)} />
        </div>
      </div>
    </div>
  );
}

export default function PlumeMapper() {
  const [selectedSource, setSelectedSource] = useState(SOURCE_MARKERS[0]);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState({ lat: 7.5, lon: 6.32 });
  const [weatherMode, setWeatherMode] = useState("auto");
  const [durationHours, setDurationHours] = useState(24);
  const [hourlyWinds, setHourlyWinds] = useState({});
  const [form, setForm] = useState({
    ...SOURCE_MARKERS[0].defaults,
    wind_speed: 5,
    wind_dir: 45,
    cloud_cover: 60,
    ambient_temp_k: 300,
    stability_class: "auto",
    ...EMPTY_ADVANCED
  });
  const [boundary, setBoundary] = useState(null);
  const [resultPayload, setResultPayload] = useState(null);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeFrame = resultPayload?.frames?.[activeFrameIndex] ?? resultPayload?.frames?.[0] ?? null;
  const activeResult = activeFrame?.result ?? resultPayload?.result ?? null;
  const activeMeteo = activeFrame?.meteo ?? resultPayload?.meteo ?? null;
  const activeSource = useCustomLocation
    ? { id: "custom", name: "Custom coordinates", lat: Number(customLocation.lat), lon: Number(customLocation.lon), defaults: selectedSource.defaults }
    : selectedSource;
  const diagnostics = activeResult?.metadata?.diagnostics;
  const isCoordinateResult = resultPayload?.locationMode === "coordinates";

  const chartData = useMemo(() => buildHourlyRows(resultPayload?.frames ?? []).map((row) => ({
    ...row,
    label: formatHourLabel(row.timestamp, row.hour)
  })), [resultPayload]);

  const metadata = useMemo(() => ({
    sourceName: resultPayload?.sourceName ?? activeSource.name,
    durationHours: resultPayload?.duration_hours ?? durationHours,
    weatherMode: resultPayload?.weather_config ?? weatherMode,
    locationMode: resultPayload?.locationMode ?? (useCustomLocation ? "coordinates" : "preset"),
    generatedAt: resultPayload?.generated_at ?? new Date().toISOString()
  }), [activeSource.name, durationHours, resultPayload, useCustomLocation, weatherMode]);

  const updateField = useCallback((field, value) => {
    setForm((previous) => ({ ...previous, [field]: field === "stability_class" ? value : numericFormValue(value) }));
  }, []);

  const updateCustomLocation = (field, value) => {
    setCustomLocation((previous) => ({ ...previous, [field]: value === "" ? "" : Number(value) }));
  };

  useEffect(() => {
    fetch("/kogi-lga.geojson")
      .then((response) => response.json())
      .then(setBoundary)
      .catch(() => setBoundary(null));
  }, []);

  useEffect(() => {
    if (useCustomLocation) return;
    setForm((previous) => ({
      ...previous,
      ...selectedSource.defaults
    }));
  }, [selectedSource, useCustomLocation]);

  const runSimulation = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        source_lat: activeSource.lat,
        source_lon: activeSource.lon,
        stack_height: Number(form.stack_height),
        emission_rate: Number(form.emission_rate),
        exit_velocity: Number(form.exit_velocity),
        stack_diameter: Number(form.stack_diameter),
        stack_temp_k: Number(form.stack_temp_k),
        wind_speed: Number(form.wind_speed),
        wind_dir: Number(form.wind_dir),
        cloud_cover: Number(form.cloud_cover),
        ambient_temp_k: Number(form.ambient_temp_k),
        stability_class: form.stability_class,
        weather_config: weatherMode,
        simulation_duration_hours: durationHours,
        hourly_winds: Object.keys(hourlyWinds).length ? hourlyWinds : undefined,
        deposition_velocity: optionalNumber(form.deposition_velocity),
        mixing_height_override: optionalNumber(form.mixing_height_override),
        loss_rate_override: optionalNumber(form.loss_rate_override),
        effective_height_override: optionalNumber(form.effective_height_override)
      };

      const response = await runPlumeSimulation(payload);
      setResultPayload({
        ...response,
        sourceName: activeSource.name,
        locationMode: useCustomLocation ? "coordinates" : "preset"
      });
      setActiveFrameIndex(0);
    } catch (runError) {
      setError(runError);
    } finally {
      setLoading(false);
    }
  };

  const exportPng = async () => {
    const blob = await timeSeriesPngBlob(chartData, metadata);
    downloadBlob(blob, `kseip-timeseries-${Date.now()}.png`);
  };

  const plumeLine = !isCoordinateResult && activeResult
    ? plumePolyline(activeResult, activeSource, activeMeteo?.wind_dir ?? form.wind_dir)
    : [];

  return (
    <section className="grid min-h-[calc(100vh-4rem)] grid-cols-1 bg-slate-100 text-slate-900 lg:grid-cols-[380px_1fr]">
      <aside className="z-[500] border-b border-slate-300 bg-white p-3 sm:p-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div>
          <h2 className="text-xl font-black uppercase text-ministry-700">Pollution Dispersion</h2>
          <p className="text-sm font-semibold text-slate-600">Kogi State Emission Inventory Platform</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-black">{error.code || "PLUME_ERROR"}</p>
            <p className="mt-1">{error.message}</p>
          </div>
        ) : null}

        {resultPayload?.weather_notice ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Auto-fetch fallback: {resultPayload.weather_notice}
          </div>
        ) : null}

        <form className="mt-4 grid gap-4" onSubmit={runSimulation}>
          <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-ministry-900">Location</h3>
            <div className="mt-3 grid gap-2">
              {SOURCE_MARKERS.map((marker) => (
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700" key={marker.id}>
                  <input
                    checked={!useCustomLocation && selectedSource.id === marker.id}
                    name="source"
                    onChange={() => {
                      setSelectedSource(marker);
                      setUseCustomLocation(false);
                    }}
                    type="radio"
                  />
                  {marker.name}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input checked={useCustomLocation} name="source" onChange={() => setUseCustomLocation(true)} type="radio" />
                Custom coordinates
              </label>
            </div>
            {useCustomLocation ? (
              <div className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-2">
                <Field label="Latitude">
                  <NumericInput max="90" min="-90" onChange={(value) => updateCustomLocation("lat", value)} step="0.0001" value={customLocation.lat} />
                </Field>
                <Field label="Longitude">
                  <NumericInput max="180" min="-180" onChange={(value) => updateCustomLocation("lon", value)} step="0.0001" value={customLocation.lon} />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-ministry-900">Weather Data</h3>
              <RefreshCw size={15} className={weatherMode === "auto" ? "text-ministry-700" : "text-slate-400"} />
            </div>
            <div className="mt-3 grid grid-cols-2 rounded-md border border-slate-200 bg-white p-1">
              {["auto", "manual"].map((mode) => (
                <button
                  className={`h-9 rounded text-xs font-black uppercase ${weatherMode === mode ? "bg-ministry-700 text-white" : "text-slate-500 hover:text-slate-900"}`}
                  key={mode}
                  onClick={() => setWeatherMode(mode)}
                  type="button"
                >
                  {mode === "auto" ? "Auto-fetch" : "Manual Input"}
                </button>
              ))}
            </div>
            {weatherMode === "manual" ? (
              <div className="mt-3 grid grid-cols-1 gap-2 xs:grid-cols-2">
                <Field label="Wind speed (m/s)">
                  <NumericInput min="0.1" onChange={(value) => updateField("wind_speed", value)} step="0.1" value={form.wind_speed} />
                </Field>
                <Field label="Wind dir (deg)">
                  <NumericInput max="360" min="0" onChange={(value) => updateField("wind_dir", value)} step="1" value={form.wind_dir} />
                </Field>
                <Field label="Cloud cover (%)">
                  <NumericInput max="100" min="0" onChange={(value) => updateField("cloud_cover", value)} step="1" value={form.cloud_cover} />
                </Field>
                <Field label="Ambient temp (K)">
                  <NumericInput max="330" min="250" onChange={(value) => updateField("ambient_temp_k", value)} step="0.1" value={form.ambient_temp_k} />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-ministry-900">Temporal Settings</h3>
            <div className="mt-3">
              <Field label="Simulation duration (hours)">
                <NumericInput
                  max="72"
                  min="1"
                  onChange={(value) => setDurationHours(Math.max(1, Math.min(72, Number(value) || 24)))}
                  step="1"
                  value={durationHours}
                />
              </Field>
              <p className="mt-2 text-xs font-semibold text-slate-500">Default 24 hours. Each frame is modeled independently at hourly resolution.</p>
            </div>
          </div>

          <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-ministry-900">Stack Parameters</h3>
            <div className="mt-3 grid gap-3">
              <Field label="Stack height (m)">
                <NumericInput min="1" onChange={(value) => updateField("stack_height", value)} value={form.stack_height} />
              </Field>
              <Field label="Emission rate (g/s)">
                <NumericInput min="0.0001" onChange={(value) => updateField("emission_rate", value)} value={form.emission_rate} />
              </Field>
              <Field label="Exit velocity (m/s)">
                <NumericInput min="0.1" onChange={(value) => updateField("exit_velocity", value)} value={form.exit_velocity} />
              </Field>
              <Field label="Stack diameter (m)">
                <NumericInput min="0.1" onChange={(value) => updateField("stack_diameter", value)} value={form.stack_diameter} />
              </Field>
              <Field label="Stack temperature (K)">
                <NumericInput min="250" onChange={(value) => updateField("stack_temp_k", value)} value={form.stack_temp_k} />
              </Field>
              <Field label="Stability class">
                <select
                  className="h-10 rounded-md border border-ministry-100 px-3 text-sm outline-none focus:border-leaf-600"
                  onChange={(event) => updateField("stability_class", event.target.value)}
                  value={form.stability_class}
                >
                  <option value="auto">Auto from meteorology</option>
                  {["A", "B", "C", "D", "E", "F"].map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <CollapsiblePanel defaultOpen title="Advanced Parameters">
            <Field label="Deposition velocity (m/s)">
              <NumericInput max="0.1" min="0" onChange={(value) => updateField("deposition_velocity", value)} step="0.001" value={form.deposition_velocity} />
            </Field>
            <Field label="Mixing height (m)">
              <NumericInput max="5000" min="50" onChange={(value) => updateField("mixing_height_override", value)} step="50" value={form.mixing_height_override} />
            </Field>
            <Field label="Loss rate (1/s)">
              <NumericInput max="10" min="0" onChange={(value) => updateField("loss_rate_override", value)} step="0.0001" value={form.loss_rate_override} />
            </Field>
            <Field label="Effective height (m)">
              <NumericInput max="1000" min="1" onChange={(value) => updateField("effective_height_override", value)} step="1" value={form.effective_height_override} />
            </Field>
          </CollapsiblePanel>

          <HourlyWindOverrides durationHours={durationHours} hourlyWinds={hourlyWinds} setHourlyWinds={setHourlyWinds} />

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ministry-700 text-sm font-black uppercase text-white hover:bg-ministry-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
            {loading ? "Running simulation..." : "Run Simulation"}
          </button>
        </form>

        {activeResult ? (
          <div className="mt-4 grid grid-cols-1 gap-2 xs:grid-cols-2">
            <MetricTile label="Cmax" unit="ug/m3" value={formatNumber(activeResult.cmax, 2)} />
            <MetricTile label="xmax" unit="m" value={formatNumber(activeResult.xmax, 0)} />
            <MetricTile label="Mixing height" unit="m" value={formatNumber(diagnostics?.mixing_height_m, 0)} />
            <MetricTile label="Effective height" unit="m" value={formatNumber(diagnostics?.effective_stack_height_m, 1)} />
          </div>
        ) : null}
      </aside>

      <main className="relative min-h-0 lg:min-h-[calc(100vh-4rem)]">
        <div className="relative h-[420px] sm:h-[520px] lg:absolute lg:inset-0 lg:h-auto">
          <MapContainer center={[7.5, 6.32]} className="h-full w-full" zoom={8} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitKogiBoundary boundary={boundary} />
            <RecenterOnSource source={activeSource} />
            {boundary ? (
              <GeoJSON
                data={boundary}
                style={{ color: "#166534", fillColor: "#22c55e", fillOpacity: 0.06, weight: 1.5 }}
              />
            ) : null}
            {SOURCE_MARKERS.map((marker) => (
              <Marker
                eventHandlers={{ click: () => {
                  setSelectedSource(marker);
                  setUseCustomLocation(false);
                } }}
                icon={arrowMarker}
                key={marker.id}
                opacity={!useCustomLocation && marker.id === selectedSource.id ? 1 : 0.72}
                position={[marker.lat, marker.lon]}
              >
                <Popup>
                  <div className="font-bold">{marker.name}</div>
                  <div>{formatNumber(marker.lat, 4)}, {formatNumber(marker.lon, 4)}</div>
                </Popup>
              </Marker>
            ))}
            {useCustomLocation ? (
              <Marker icon={arrowMarker} position={[Number(customLocation.lat), Number(customLocation.lon)]}>
                <Popup>
                  <div className="font-bold">Custom coordinates</div>
                  <div>{formatNumber(customLocation.lat, 5)}, {formatNumber(customLocation.lon, 5)}</div>
                </Popup>
              </Marker>
            ) : null}
            {plumeLine.map((point, index) => (
              <Marker
                icon={L.divIcon({
                  className: "",
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                  html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${heatColor(point.concentration, activeResult.cmax)};border:2px solid white;box-shadow:0 2px 8px rgba(15,23,42,.35);"></span>`
                })}
                key={`${point.position[0]}-${point.position[1]}-${index}`}
                position={point.position}
              />
            ))}
          </MapContainer>
          {activeMeteo ? <WindCompass direction={activeMeteo.wind_dir} /> : null}
        </div>

        <div className="relative z-[700] max-h-none overflow-y-auto border-t border-slate-300 bg-slate-50/95 p-3 shadow-2xl backdrop-blur sm:p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:max-h-[58vh]">
          {activeResult ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ministry-700">Active simulation</p>
                  <h2 className="text-xl font-black text-slate-950">{metadata.sourceName}</h2>
                  <p className="text-sm font-semibold text-slate-500">
                    H{activeFrameIndex + 1} of {resultPayload?.frames?.length ?? 1} | {formatTime(activeFrame?.timestamp)} | wind {formatNumber(activeMeteo?.wind_speed, 1)} m/s at {formatNumber(activeMeteo?.wind_dir, 0)} deg
                  </p>
                </div>
                <div className="flex max-w-full gap-1 overflow-x-auto">
                  {(resultPayload?.frames ?? []).map((frame, index) => (
                    <button
                      className={`h-9 min-w-12 rounded-md px-3 text-xs font-black ${index === activeFrameIndex ? "bg-ministry-700 text-white" : "bg-white text-slate-600 hover:bg-ministry-50"}`}
                      key={`${frame.timestamp}-${index}`}
                      onClick={() => setActiveFrameIndex(index)}
                      type="button"
                    >
                      H{index + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile label="Peak concentration" unit="ug/m3" value={formatNumber(activeResult.cmax, 2)} />
                <MetricTile label="Peak distance" unit="m downwind" value={formatNumber(activeResult.xmax, 0)} />
                <MetricTile label="Average concentration" unit="ug/m3" value={formatNumber(concentrationStats(activeResult).average, 2)} />
                <MetricTile label="Stability class" unit="Pasquill" value={activeResult.metadata?.stability_class ?? activeMeteo?.stability_class ?? "--"} />
              </div>

              {isCoordinateResult ? (
                <CoordinateVisualization result={activeResult} source={activeSource} windDir={activeMeteo?.wind_dir ?? form.wind_dir} />
              ) : null}

              <TimeSeriesPanel
                chartData={chartData}
                metadata={metadata}
                onExportPng={exportPng}
              />

              <HourlyResultsTable
                frames={resultPayload?.frames ?? []}
                onExportCsv={() => downloadCsv(csvFromHourlyResults(resultPayload?.frames ?? []), `kseip-hourly-results-${Date.now()}.csv`)}
              />
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-center">
              <div>
                <Clock className="mx-auto text-ministry-700" size={26} />
                <p className="mt-3 text-sm font-black uppercase tracking-wide text-slate-700">Run a 24-hour plume simulation</p>
                <p className="mt-1 text-sm text-slate-500">Map indicators use bold source arrows. Custom coordinate runs will appear in a separate local-grid visualization.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </section>
  );
}
