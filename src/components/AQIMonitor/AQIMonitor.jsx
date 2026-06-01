import { AlertTriangle, RefreshCw, TrendingDown, TrendingUp, Wind, Activity, Zap, Eye } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EPA_AQI_BANDS, formatDateTime, getAqiBand, isStale } from "../../services/aqiScale.js";

const LOCATIONS = [
  { id: "lokoja", label: "Lokoja" },
  { id: "obajana", label: "Obajana" },
  { id: "okene", label: "Okene" },
  { id: "anyigba", label: "Anyigba" },
  { id: "nearest", label: "Nearest observed station" }
];

const POLLUTANTS = [
  ["pm25", "PM2.5", "ug/m3"],
  ["pm10", "PM10", "ug/m3"],
  ["so2", "SO2", "WAQI"],
  ["no2", "NO2", "WAQI"],
  ["co", "CO", "WAQI"],
  ["o3", "O3", "WAQI"]
];

function ErrorPanel({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{error?.code || "AQI_UNAVAILABLE"}</p>
          <p className="mt-1 text-sm">{error?.message || "AQI data is unavailable, please reload or try again."}</p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 transition-colors"
          onClick={onRetry}
          type="button"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    </div>
  );
}

function PollutantCard({ label, unit, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? "--"}</p>
          <p className="mt-1 text-xs text-slate-500">{unit}</p>
        </div>
        {Icon && <Icon size={24} className="text-ministry-600 flex-shrink-0" />}
      </div>
    </div>
  );
}

// function AQIGauge({ value, band, loading }) {
//   const percentage = Math.min((value / 300) * 100, 100) || 0;
  
//   return (
//     <div className="space-y-3">
//       <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200">
//         <div
//           className="h-full transition-all duration-1000"
//           style={{ width: `${percentage}%`, backgroundColor: band.color }}
//         />
//       </div>
//       <div className="grid grid-cols-6 gap-1 text-xs text-slate-500">
//         <div>0</div>
//         <div className="text-center">50</div>
//         <div className="text-center">100</div>
//         <div className="text-center">150</div>
//         <div className="text-center">200</div>
//         <div className="text-right">300+</div>
//       </div>
//     </div>
//   );
// }

function TrendIndicator({ current, previous }) {
  if (!current || !previous) return null;
  const isImproving = current < previous;
  const diff = Math.abs(current - previous);
  
  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
      isImproving ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {isImproving ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
      <span>{diff > 0 ? (isImproving ? '−' : '+') : ''}{diff}</span>
    </div>
  );
}

function LocationInfo({ location, aqi, band, currentData, loading }) {
  const locationName = currentData?.location || LOCATIONS.find((item) => item.id === location)?.label;
  
  return (
    <div className="space-y-4 rounded-lg p-4 sm:p-6 min-w-0" style={{ backgroundColor: band.color, color: band.textColor }}>
      {/* Header */}
      <div className="min-w-0">
        <p className="text-sm font-semibold opacity-90">{locationName || "Air Quality"}</p>
        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <p className="text-5xl sm:text-6xl font-black leading-none break-words">{loading && !currentData ? "--" : aqi ?? "--"}</p>
          <p className="text-lg sm:text-xl font-bold opacity-85 flex-shrink-0">{band.category}</p>
        </div>
      </div>

      {/* Gauge */}
      {/* <div className="opacity-90">
        <AQIGauge value={aqi} band={band} loading={loading} />
      </div> */}

      {/* Key Info */}
      <div className="space-y-2 border-t pt-4 opacity-85">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Dominant pollutant</span>
          <span>{currentData?.dominant_pollutant || "--"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Primary source</span>
          <span className="text-xs">{currentData?.primary_source || "Open-Meteo"}</span>
        </div>
        {Number.isFinite(Number(currentData?.advisory_aqi)) && currentData?.advisory_aqi !== currentData?.aqi ? (
          <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
            <span className="font-semibold">Advisory AQI</span>
            <span>{currentData.advisory_aqi}</span>
          </div>
        ) : null}
      </div>

      {/* Timestamp */}
      <div className="border-t pt-2 text-xs opacity-75 font-medium">
        Updated {formatDateTime(currentData?.timestamp)}
      </div>
    </div>
  );
}

function trendData(history) {
  return (history?.timeseries ?? []).map((point) => ({
    time: new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit" }).format(new Date(point.timestamp)),
    aqi: point.aqi,
    pm25: point.pm25
  }));
}

export default function AQIMonitor({
  location,
  onLocationChange,
  current,
  history,
  loading,
  error,
  onRetry
}) {

  const band = getAqiBand(current?.aqi);
  const stale = isStale(current?.timestamp, current?.stale);
  const chartData = useMemo(() => trendData(history), [history]);
  
  // Calculate average from history for trend
  const avgAqi = chartData.length > 0 ? Math.round(chartData.reduce((sum, d) => sum + d.aqi, 0) / chartData.length) : null;
  const firstAqi = chartData.length > 0 ? chartData[0].aqi : null;

  return (
    <section className="rounded-lg border border-ministry-100 bg-white p-2 sm:p-3 md:p-4 shadow-panel space-y-3 sm:space-y-4" id="aqi">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">AQI Monitor</p>
          <h1 className="mt-1 text-xl sm:text-2xl md:text-3xl font-bold text-slate-950">Kogi Air Quality</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">Real-time air quality monitoring for Kogi State</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
          {stale && current ? (
            <span className="inline-flex h-9 sm:h-10 items-center gap-2 rounded-md border border-yellow-300 bg-yellow-100 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-yellow-900">
              <AlertTriangle size={14} />
              <span>Stale data</span>
            </span>
          ) : null}
          <select
            className="h-9 sm:h-10 w-full sm:w-auto rounded-md border border-ministry-100 bg-white px-2 sm:px-3 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-leaf-600 focus:ring-2 focus:ring-leaf-100 transition-colors"
            onChange={(event) => onLocationChange(event.target.value)}
            value={location}
          >
            {LOCATIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <ErrorPanel error={error} onRetry={onRetry} /> : null}

      {!error ? (
        <>
          {/* Main Grid */}
          <div className="grid gap-3 sm:gap-4 w-full">
            {/* Left: AQI Display */}
            <div className="w-full min-w-0">
              <LocationInfo location={location} aqi={current?.aqi} band={band} currentData={current} loading={loading} />
            </div>

            {/* Right: Chart and Pollutants */}
            <div className="space-y-3 sm:space-y-4 w-full min-w-0">
              {/* Trend Chart */}
              <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-3">
                <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">24-Hour Trend</p>
                  {firstAqi && current?.aqi && (
                    <TrendIndicator current={current.aqi} previous={firstAqi} />
                  )}
                </div>
                <div className="h-[150px] sm:h-[200px] md:h-[240px] w-full overflow-hidden rounded-lg">
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#d4e4d8" strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} minTickGap={15} />
                      <YAxis domain={[0, 320]} tick={{ fontSize: 10 }} />
                      {EPA_AQI_BANDS.slice(0, 5).map((item) => (
                        <ReferenceArea
                          key={item.level}
                          y1={item.min}
                          y2={Math.min(item.max, 320)}
                          fill={item.color}
                          fillOpacity={0.12}
                        />
                      ))}
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value) => [value, 'AQI']}
                      />
                      <Line dataKey="aqi" dot={false} isAnimationActive={false} stroke="#1A6B3C" strokeWidth={2} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pollutants Grid */}
              <div>
                <p className="mb-2 sm:mb-3 font-semibold text-slate-900 text-sm sm:text-base">Pollutant Levels</p>
                <div className="grid gap-2 sm:gap-3 grid-cols-2 xs:grid-cols-2 sm:grid-cols-3">
                  <PollutantCard label="PM2.5" unit="µg/m³" value={current?.pm25} icon={Wind} />
                  <PollutantCard label="PM10" unit="µg/m³" value={current?.pm10} icon={Activity} />
                  <PollutantCard label="SO₂" unit="ppb" value={current?.so2} icon={Zap} />
                  <PollutantCard label="NO₂" unit="ppb" value={current?.no2} icon={Eye} />
                  <PollutantCard label="CO" unit="ppm" value={current?.co} />
                  <PollutantCard label="O₃" unit="ppb" value={current?.o3} />
                </div>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="border-t pt-3 text-xs text-slate-600 space-y-1">
            <p><strong>Data Source:</strong> Open-Meteo Air Quality (Primary), WAQI/OpenAQ (Validation)</p>
            <p><strong>Update Frequency:</strong> Every 1 hour | <strong>Coverage:</strong> Kogi State and surrounding areas</p>
          </div>
        </>
      ) : null}
    </section>
  );
}
            