import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-NG", { weekday: "short" });
}

function chartRows(dailyForecast = []) {
  return dailyForecast.map((day) => ({
    date: day.date,
    label: formatDate(day.date),
    temperature: Number((((day.temperatureMax ?? 0) + (day.temperatureMin ?? 0)) / 2).toFixed(1)),
    rain: Number(day.rainVolume ?? 0),
    humidity: day.humidityMean ?? null
  }));
}

function ChartShell({ title, children }) {
  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 h-64 min-w-0">{children}</div>
    </div>
  );
}

export default function WeatherCharts({ dailyForecast = [] }) {
  const rows = chartRows(dailyForecast);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <ChartShell title="Temperature Trend">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={rows}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="C" />
            <Tooltip formatter={(value) => [`${value} C`, "Temperature"]} labelFormatter={(label) => `Day: ${label}`} />
            <Line dataKey="temperature" dot={false} stroke="#1A6B3C" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Rainfall Trend">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="mm" />
            <Tooltip formatter={(value) => [`${value} mm`, "Rainfall"]} labelFormatter={(label) => `Day: ${label}`} />
            <Bar dataKey="rain" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell title="Humidity Trend">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={rows}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(value) => [`${value}%`, "Humidity"]} labelFormatter={(label) => `Day: ${label}`} />
            <Area dataKey="humidity" fill="#5DCAA5" fillOpacity={0.25} stroke="#0f766e" strokeWidth={3} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}
