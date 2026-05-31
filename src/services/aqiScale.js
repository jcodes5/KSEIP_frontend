export const EPA_AQI_BANDS = [
  { min: 0, max: 50, level: 0, category: "Good", color: "#00E400", textColor: "#173404" },
  { min: 51, max: 100, level: 1, category: "Moderate", color: "#FFFF00", textColor: "#173404" },
  { min: 101, max: 150, level: 2, category: "Unhealthy for Sensitive Groups", color: "#FF7E00", textColor: "#2C1700" },
  { min: 151, max: 200, level: 3, category: "Unhealthy", color: "#FF0000", textColor: "#FFFFFF" },
  { min: 201, max: 300, level: 4, category: "Very Unhealthy", color: "#8F3F97", textColor: "#FFFFFF" },
  { min: 301, max: Number.POSITIVE_INFINITY, level: 5, category: "Hazardous", color: "#7E0023", textColor: "#FFFFFF" }
];

export function getAqiBand(aqi) {
  const value = Number(aqi);
  if (!Number.isFinite(value)) return EPA_AQI_BANDS[0];
  return EPA_AQI_BANDS.find((band) => value >= band.min && value <= band.max) ?? EPA_AQI_BANDS[5];
}

export function isStale(timestamp, stale) {
  if (stale) return true;
  if (!timestamp) return true;
  const ageMs = Date.now() - new Date(timestamp).getTime();
  return ageMs > 2 * 60 * 60 * 1000;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return "Unavailable";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

