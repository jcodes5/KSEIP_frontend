const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export function getCurrentAqi(location = "lokoja") {
  return request(`/api/aqi/current?location=${encodeURIComponent(location)}`);
}

export function getAqiHistory(location = "lokoja", hours = 24) {
  return request(`/api/aqi/history?location=${encodeURIComponent(location)}&hours=${hours}`);
}

export function getHealthAdvisory(location = "lokoja") {
  return request(`/api/health/advisory?location=${encodeURIComponent(location)}`);
}

export function getCurrentMeteo() {
  return request("/api/meteo/current");
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

export function getFloodRisk() {
  return request("/api/flood/risk");
}

export const apiConfig = {
  baseUrl: API_BASE_URL
};
