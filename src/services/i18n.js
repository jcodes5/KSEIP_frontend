export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "yo", label: "Yoruba" }
];

const dictionary = {
  en: {
    govBar: "environmental intelligence service for Kogi State",
    brandSubtitle: "Kogi Environmental Platform",
    navHome: "Home",
    navAbout: "About",
    navSimulator: "Simulator",
    navWeather: "Weather",
    navMore: "More",
    navHowToUse: "How to Use",
    navDocumentation: "Documentation",
    navDashboard: "Dashboard",
    language: "Language",
    aqiTitle: "Kogi Air Quality",
    aqiSubtitle: "Real-time air quality monitoring for Kogi State",
    aqiTrend: "7-Day AQI Trend",
    pmTrend: "PM2.5 / PM10 Dedicated Trend",
    last7Days: "Last 7 days",
    pollutantLevels: "Pollutant Levels",
    staleData: "Stale data",
    healthTitle: "Public Advisory",
    climateTitle: "30-year Kogi climate baseline",
    floodTitle: "Niger-Benue Index",
    fireTitle: "Fire Hotspot Watch",
    loadingClimate: "Loading climate trends",
    loadingAlerts: "Loading fire and flood risk data",
    retry: "Retry",
    floodLocation: "Flood node",
    modelDrivers: "Risk model drivers",
    monitoredNodes: "Monitored nodes"
  },
  yo: {
    govBar: "ise oye ayika fun Ipinle Kogi",
    brandSubtitle: "Pẹpẹ Ayika Kogi",
    navHome: "Ile",
    navAbout: "Nipa",
    navSimulator: "Simulator",
    navWeather: "Oju ojo",
    navMore: "Die sii",
    navHowToUse: "Bawo la se nlo",
    navDocumentation: "Iwe alaye",
    navDashboard: "Dasibodu",
    language: "Ede",
    aqiTitle: "Didara Afefe Kogi",
    aqiSubtitle: "Abojuto didara afefe ni akoko gidi fun Ipinle Kogi",
    aqiTrend: "Ipa AQI ojo meje",
    pmTrend: "Aworan PM2.5 / PM10",
    last7Days: "Ojo meje to koja",
    pollutantLevels: "Ipele awon eroja egbin",
    staleData: "Data ti pe",
    healthTitle: "Ikilo Ilera Gbogbo eniyan",
    climateTitle: "Ipile oju-ojo Kogi odun 30",
    floodTitle: "Atoka Niger-Benue",
    fireTitle: "Abojuto ibi ina",
    loadingClimate: "N ko data oju-ojo wa",
    loadingAlerts: "N ko data ewu ina ati ikun omi wa",
    retry: "Tun gbiyanju",
    floodLocation: "Aaye ikun omi",
    modelDrivers: "Awon okunfa ewu",
    monitoredNodes: "Awon aaye abojuto"
  }
};

export function t(language, key) {
  return dictionary[language]?.[key] ?? dictionary.en[key] ?? key;
}
