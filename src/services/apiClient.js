const isDev = typeof window === 'undefined' ? true : window.location.hostname === 'localhost';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isDev ? 'http://localhost:4000' : ''); // Use relative URLs in production

async function request(path, options = {}) {
  // Ensure we're not double-prefixing with /api if API_BASE_URL already includes it
  const fullPath = API_BASE_URL && API_BASE_URL.endsWith('/')
    ? `${API_BASE_URL}${path.substring(1)}`
    : `${API_BASE_URL}${path}`;
    
  const response = await fetch(fullPath, {
    headers: {
      accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...options
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error) {
    const error = new Error(payload?.message || "KSEIP API request failed.");
    error.code = payload?.code || "API_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }

  return payload;
}

// ... rest of the file remains the same ...
export function getCurrentAqi(location = "lokoja") {
  return request(`/api/aqi/current?location=${encodeURIComponent(location)}`);
}

export function getAqiHistory(location = "lokoja", hours = 168) {
  return request(`/api/aqi/history?location=${encodeURIComponent(location)}&hours=${hours}`);
}

export function getAqiHistoryExportUrl(location = "lokoja", hours = 168, format = "csv") {
  return `${API_BASE_URL}/api/aqi/history/export?location=${encodeURIComponent(location)}&hours=${hours}&format=${encodeURIComponent(format)}`;
}

export async function downloadAqiHistoryExport(location = "lokoja", hours = 168, format = "csv") {
  const params = `location=${encodeURIComponent(location)}&hours=${hours}&format=${encodeURIComponent(format)}`;
  const response = await fetch(`${API_BASE_URL}/api/aqi/history/export?${params}`, {
    headers: { accept: format === "geojson" ? "application/geo+json" : "text/csv" }
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const error = new Error(
      response.status === 404
        ? "AQI export endpoint was not found. Restart the backend so the latest export route is active."
        : payload?.message || `AQI export failed with status ${response.status}.`
    );
    error.code = payload?.code || "AQI_EXPORT_FAILED";
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] ?? `kseip-aqi-${location}.${format === "geojson" ? "geojson" : "csv"}`;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function getAqiLocations() {
  return request("/api/aqi/locations");
}

export function getHealthAdvisory(location = "lokoja") {
  return request(`/api/health/advisory?location=${encodeURIComponent(location)}`);
}

export function getCurrentMeteo() {
  return request("/api/meteo/current");
}

export function getMeteoForecast(hours = 12) {
  return request(`/api/meteo/forecast?hours=${hours}`);
}

export function runPlumeSimulation(payload) {
  return request("/api/plume/run", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getClimateTrend(param = "T2M", years = 30) {
  return request(`/api/climate/trend?param=${encodeURIComponent(param)}&years=${years}`);
}

export function getFireHotspots(days = 5) {
  return request(`/api/fire/hotspots?days=${days}`);
}

export function getFloodRisk(location = "lokoja") {
  return request(`/api/flood/risk?location=${encodeURIComponent(location)}`);
}

export function getFloodLocations() {
  return request("/api/flood/locations");
}

export function getWeatherLgas() {
  return request("/api/weather/lgas");
}

export function getCurrentWeather(lga = "lokoja", refresh = false) {
  return request(`/api/weather/current?lga=${encodeURIComponent(lga)}${refresh ? "&refresh=true" : ""}`);
}

export function getCurrentWeatherByCoordinates(latitude, longitude, accuracy = null, refresh = false) {
  const accuracyParam = Number.isFinite(Number(accuracy)) ? `&accuracy=${encodeURIComponent(accuracy)}` : "";
  return request(
    `/api/weather/current-by-coordinates?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}${accuracyParam}${refresh ? "&refresh=true" : ""}`
  );
}

export function getWeatherForecast(lga = "lokoja", days = 7, refresh = false) {
  return request(`/api/weather/forecast?lga=${encodeURIComponent(lga)}&days=${days}${refresh ? "&refresh=true" : ""}`);
}

export function getWeatherIntelligence(lga = "lokoja", refresh = false) {
  return request(`/api/weather/intelligence?lga=${encodeURIComponent(lga)}${refresh ? "&refresh=true" : ""}`);
}

export function getWeatherMap(refresh = false) {
  return request(`/api/weather/map${refresh ? "?refresh=true" : ""}`);
}

export const apiConfig = {
  baseUrl: API_BASE_URL
};
