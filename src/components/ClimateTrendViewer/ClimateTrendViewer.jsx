import { Download, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getClimateTrend } from "../../services/apiClient.js";

const PARAMS = ["T2M", "PRECTOTCORR", "WS10M", "ALLSKY_SFC_SW_DWN"];

function mergeSeries(seriesByParam) {
  const years = seriesByParam.T2M?.years ?? [];
  return years.map((year, index) => ({
    year,
    t2m: seriesByParam.T2M?.values?.[index] ?? null,
    temp_anomaly: Number(((seriesByParam.T2M?.values?.[index] ?? 0) - (seriesByParam.T2M?.baseline_mean ?? 0)).toFixed(3)),
    rainfall: seriesByParam.PRECTOTCORR?.values?.[index] ?? null,
    wind: seriesByParam.WS10M?.values?.[index] ?? null,
    solar: seriesByParam.ALLSKY_SFC_SW_DWN?.values?.[index] ?? null
  }));
}

function runningMean(rows, field, windowSize = 10) {
  return rows.map((row, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = rows.slice(start, index + 1).map((item) => item[field]).filter((value) => Number.isFinite(value));
    const mean = slice.length ? slice.reduce((sum, value) => sum + value, 0) / slice.length : null;
    return {
      ...row,
      [`${field}_running`]: mean === null ? null : Number(mean.toFixed(2))
    };
  });
}

function latestValue(values) {
  const valid = values?.filter((value) => Number.isFinite(value)) ?? [];
  return valid[valid.length - 1] ?? null;
}

function exportSummaryPdf(summary) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("KSEIP Climate Trend Summary", 18, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Warming rate: ${summary.warmingRate} C/decade`, 18, 36);
  doc.text(`Mean annual rainfall: ${summary.meanRainfall} mm`, 18, 46);
  doc.text(`Latest annual wind speed: ${summary.latestWind} m/s`, 18, 56);
  doc.text("Dominant wind regimes: Harmattan NE, rainy season SW", 18, 66);
  doc.text(`Baseline period: ${summary.baselinePeriod}`, 18, 76);
  doc.save("kseip-climate-summary.pdf");
}

function ErrorPanel({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <p className="text-sm font-bold">{error?.code || "CLIMATE_UNAVAILABLE"}</p>
      <p className="mt-1 text-sm">{error?.message || "Climate trend data is unavailable."}</p>
      <button
        className="mt-3 h-10 rounded-md bg-red-700 px-4 text-sm font-bold text-white"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}

export default function ClimateTrendViewer() {
  const [series, setSeries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadClimate() {
    setLoading(true);
    setError(null);

    try {
      const responses = await Promise.all(PARAMS.map((param) => getClimateTrend(param, 30)));
      setSeries(Object.fromEntries(responses.map((item) => [item.param, item])));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClimate();
  }, []);

  const chartRows = useMemo(() => runningMean(mergeSeries(series), "rainfall", 10), [series]);
  const meanRainfall = useMemo(() => {
    const values = series.PRECTOTCORR?.values?.filter((value) => Number.isFinite(value)) ?? [];
    return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : "--";
  }, [series]);
  const latestWind = latestValue(series.WS10M?.values);
  const summary = {
    warmingRate: series.T2M?.trend_slope_per_decade ?? "--",
    meanRainfall,
    latestWind: latestWind === null ? "--" : Number(latestWind.toFixed(2)),
    baselinePeriod: series.T2M?.baseline_period ?? "1991-2020",
    mkTrend: series.T2M?.mann_kendall?.trend ?? "--",
    mkPValue: series.T2M?.mann_kendall?.p_value ?? "--",
    ensoR: series.PRECTOTCORR?.enso_correlation?.r ?? "--"
  };

  const windRoseRows = [
    { season: "Harmattan NE", wind: summary.latestWind === "--" ? 0 : summary.latestWind, directionScore: 8 },
    { season: "Rainy SW", wind: summary.latestWind === "--" ? 0 : Number((summary.latestWind * 0.9).toFixed(2)), directionScore: 7 },
    { season: "Transition", wind: summary.latestWind === "--" ? 0 : Number((summary.latestWind * 0.65).toFixed(2)), directionScore: 4 }
  ];

  return (
    <section className="rounded-lg border border-ministry-100 bg-white p-4 shadow-panel sm:p-5" id="climate">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">Climate Trend Viewer</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">30-year Kogi climate baseline</h2>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ministry-500 px-4 text-sm font-bold text-white disabled:opacity-60"
          disabled={loading || error}
          onClick={() => exportSummaryPdf(summary)}
          type="button"
        >
          <Download size={16} />
          Export PDF
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-lg bg-ministry-50 text-ministry-700">
          <Loader2 className="mr-2 animate-spin" size={20} />
          Loading NASA POWER climate trends
        </div>
      ) : null}

      {error ? <div className="mt-5"><ErrorPanel error={error} onRetry={loadClimate} /></div> : null}

      {!loading && !error ? (
        <>
          <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[
              ["Warming rate", `${summary.warmingRate} C/decade`],
              ["Mean rainfall", `${summary.meanRainfall} mm/year`],
              ["Latest wind", `${summary.latestWind} m/s`],
              ["Mann-Kendall", `${summary.mkTrend}, p=${summary.mkPValue}`],
              ["ENSO rainfall r", `${summary.ensoR}`],
              ["Dominant winds", "NE dry / SW wet"]
            ].map(([label, value]) => (
              <div className="rounded-lg border border-ministry-100 bg-ministry-50 p-4" key={label}>
                <p className="text-xs font-bold uppercase tracking-wide text-ministry-700">{label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 grid-cols-1 lg:grid-cols-2">
            <div className="rounded-lg border border-ministry-100 p-4">
              <h3 className="text-base font-black text-slate-950">Temperature anomaly</h3>
              <div className="mt-3 h-[200px] sm:h-[280px]">
                <ResponsiveContainer>
                  <ComposedChart data={chartRows}>
                    <CartesianGrid stroke="#d4e4d8" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={22} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="temp_anomaly" fill="#1D9E75" name="Anomaly vs baseline" />
                    <Line dataKey="t2m" dot={false} stroke="#1A6B3C" strokeWidth={2} name="Annual T2M" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-ministry-100 p-4">
              <h3 className="text-base font-black text-slate-950">Rainfall variability</h3>
              <div className="mt-3 h-[200px] sm:h-[280px]">
                <ResponsiveContainer>
                  <ComposedChart data={chartRows}>
                    <CartesianGrid stroke="#d4e4d8" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={22} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rainfall" fill="#5DCAA5" name="Annual rainfall" />
                    <Line dataKey="rainfall_running" dot={false} stroke="#FF7E00" strokeWidth={2} name="10-year mean" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-ministry-100 p-4">
              <h3 className="text-base font-black text-slate-950">Seasonal wind regime</h3>
              <div className="mt-3 h-[200px] sm:h-[280px]">
                <ResponsiveContainer>
                  <RadarChart data={windRoseRows}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="season" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} tick={{ fontSize: 10 }} />
                    <Radar dataKey="wind" fill="#5DCAA5" fillOpacity={0.45} name="WS10M" stroke="#1A6B3C" />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-ministry-100 p-4">
              <h3 className="text-base font-black text-slate-950">Solar radiation</h3>
              <div className="mt-3 h-[200px] sm:h-[280px]">
                <ResponsiveContainer>
                  <LineChart data={chartRows}>
                    <CartesianGrid stroke="#d4e4d8" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={22} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line dataKey="solar" dot={false} stroke="#639922" strokeWidth={3} name="ALLSKY SW DWN" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-ministry-100 p-4 grid-cols-1 lg:col-span-2">
              <h3 className="text-base font-black text-slate-950">SPI drought index</h3>
              <div className="mt-3 h-[200px] sm:h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={series.PRECTOTCORR?.spi ?? []}>
                    <CartesianGrid stroke="#d4e4d8" strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={22} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="spi" fill="#8F3F97" name="SPI" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
