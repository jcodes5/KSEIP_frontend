import React, { useState } from "react";
import { Activity, Briefcase, GraduationCap, HeartPulse, Sprout, ChevronDown, ChevronUp, AlertCircle, Shield, Droplets, Home, Wind, Clock } from "lucide-react";
import { EPA_AQI_BANDS, formatDateTime } from "../../services/aqiScale.js";

const ACTIVITY_ICONS = {
  exercise: Activity,
  school_sport: GraduationCap,
  farming: Sprout,
  construction: Briefcase
};

const ACTIVITY_LABELS = {
  exercise: "Exercise",
  school_sport: "School sport",
  farming: "Farming",
  construction: "Construction"
};

function ActivityCard({ name, value, details }) {
  const Icon = ACTIVITY_ICONS[name] || HeartPulse;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-ministry-100 bg-white p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3 flex-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ministry-50 text-ministry-700 flex-shrink-0">
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">{ACTIVITY_LABELS[name] || name}</p>
            <p className="mt-1 text-sm capitalize text-slate-600">{details?.status || value}</p>
          </div>
        </div>
        {details && <div className="text-slate-400">{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>}
      </button>
      
      {expanded && details && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-sm">
          {details.duration && (
            <div className="flex gap-2">
              <Clock size={16} className="text-ministry-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Duration:</p>
                <p className="text-slate-600">{details.duration}</p>
              </div>
            </div>
          )}
          {details.intensity && (
            <div className="flex gap-2">
              <Activity size={16} className="text-ministry-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Intensity:</p>
                <p className="text-slate-600">{details.intensity}</p>
              </div>
            </div>
          )}
          {details.notes && (
            <div className="flex gap-2">
              <AlertCircle size={16} className="text-ministry-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Notes:</p>
                <p className="text-slate-600">{details.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandableSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-ministry-100 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-ministry-50 transition-colors"
      >
        <Icon size={20} className="text-ministry-700 flex-shrink-0" />
        <span className="font-semibold text-slate-900 flex-1 text-left">{title}</span>
        {expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>
      {expanded && <div className="border-t border-ministry-100 p-4 space-y-3">{children}</div>}
    </div>
  );
}

function RiskGroup({ group }) {
  const [expanded, setExpanded] = useState(false);
  const riskColors = {
    "None": "bg-green-100 text-green-800",
    "Low": "bg-yellow-100 text-yellow-800",
    "Low to Moderate": "bg-yellow-100 text-yellow-800",
    "Moderate": "bg-orange-100 text-orange-800",
    "Moderate to High": "bg-orange-100 text-orange-800",
    "High": "bg-red-100 text-red-800",
    "Very High": "bg-red-100 text-red-800",
    "Critical": "bg-red-700 text-white",
    "CRITICAL - EMERGENCY LEVEL": "bg-red-900 text-white",
    "CRITICAL - HEALTH EMERGENCY": "bg-red-900 text-white",
    "CRITICAL - LIFE-THREATENING": "bg-red-900 text-white",
    "CRITICAL - LIFE-THREATENING EMERGENCY": "bg-red-900 text-white",
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <p className="font-semibold text-slate-900">{group.name}</p>
          <p className="text-sm text-slate-600 mt-1">{group.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${riskColors[group.risk_level] || "bg-gray-100 text-gray-800"}`}>
            {group.risk_level}
          </span>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <p className="text-sm text-slate-700 leading-relaxed">{group.guidance}</p>
        </div>
      )}
    </div>
  );
}

export default function HealthAlertsPanel({ advisory, aqiCurrent, loading }) {
  const [activeTab, setActiveTab] = useState("overview");
  const band = EPA_AQI_BANDS.find((item) => item.level === advisory?.level) || EPA_AQI_BANDS[0];
  const forecastBand = EPA_AQI_BANDS.find((item) => item.level === advisory?.forecast_level) || band;
  const aqiBand = EPA_AQI_BANDS.find((item) => item.level === aqiCurrent?.level) || band;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "impacts", label: "Health Impacts" },
    { id: "protection", label: "Protection & Measures" },
    { id: "tips", label: "Health Tips" }
  ];

  return (
    <section className="rounded-lg border border-ministry-100 bg-white p-4 shadow-panel sm:p-5 space-y-4" id="health">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf-600">Health Alerts</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Public Advisory</h2>
        </div>
        <div className="rounded-md border border-ministry-100 bg-ministry-50 px-3 py-2 text-sm font-semibold text-ministry-700">
          Forecast: {forecastBand.category}
        </div>
      </div>

      {/* Main Advisory Banner */}
      <div
        className="rounded-lg p-5"
        style={{
          backgroundColor: aqiBand.color_hex,
          color: aqiBand.textColor
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide opacity-85">{loading && !advisory ? "Loading" : advisory?.category}</p>
            <p className="mt-3 max-w-3xl text-xl font-black leading-snug sm:text-2xl">{advisory?.advisory_text}</p>
            {advisory?.health_statement && <p className="mt-3 max-w-3xl text-sm font-semibold opacity-85">{advisory.health_statement}</p>}
            {advisory?.sensitive_groups_text && <p className="mt-2 max-w-3xl text-sm opacity-85">{advisory.sensitive_groups_text}</p>}
          </div>
          <p className="text-sm font-semibold opacity-80 lg:text-right">Updated {formatDateTime(advisory?.timestamp)}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-ministry-700 text-ministry-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* AQI Range */}
          {advisory?.aqi_range && (
            <div className="bg-ministry-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-700">AQI Range</p>
              <p className="text-lg font-bold text-ministry-700 mt-1">{advisory.aqi_range}</p>
            </div>
          )}

          {/* Exposure Guidance */}
          {advisory?.exposure_guidance && (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {Object.entries(advisory.exposure_guidance).map(([key, value]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Activities Grid */}
          <div>
            <p className="font-semibold text-slate-900 mb-3">Recommended Activities</p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(advisory?.activities_detailed || advisory?.activities || {}).map(([name, details]) => (
                <ActivityCard key={name} name={name} value={details} details={typeof details === 'object' ? details : null} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "impacts" && (
        <div className="space-y-4">
          {/* Health Impacts by Group */}
          {advisory?.health_impacts && (
            <div>
              <p className="font-semibold text-slate-900 mb-3">Expected Health Impacts</p>
              <div className="space-y-2">
                {Object.entries(advisory.health_impacts).map(([group, impact]) => (
                  <div key={group} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-slate-700 capitalize">{group.replace(/_/g, " ")}</p>
                    <p className="text-sm text-slate-600 mt-1">{impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms to Watch */}
          {advisory?.symptoms_to_watch && advisory.symptoms_to_watch.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex gap-2">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Symptoms to Watch For</p>
                  <ul className="mt-2 space-y-1">
                    {advisory.symptoms_to_watch.map((symptom, idx) => (
                      <li key={idx} className="text-sm text-red-800 flex gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Risk Groups */}
          {advisory?.risk_groups && advisory.risk_groups.length > 0 && (
            <div>
              <p className="font-semibold text-slate-900 mb-3">At-Risk Groups</p>
              <div className="space-y-2">
                {advisory.risk_groups.map((group, idx) => (
                  <RiskGroup key={idx} group={group} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "protection" && (
        <div className="space-y-4">
          {/* Protective Measures */}
          {advisory?.protective_measures && (
            <div className="space-y-3">
              {advisory.protective_measures.outdoor && (
                <ExpandableSection title="Outdoor Protection" icon={Wind} defaultOpen={true}>
                  <ul className="space-y-2">
                    {advisory.protective_measures.outdoor.map((measure, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-ministry-600 mt-0.5">✓</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {advisory.protective_measures.indoor && (
                <ExpandableSection title="Indoor Protection" icon={Home} defaultOpen={true}>
                  <ul className="space-y-2">
                    {advisory.protective_measures.indoor.map((measure, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-ministry-600 mt-0.5">✓</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {advisory.protective_measures.personal_protection && (
                <ExpandableSection title="Personal Protection" icon={Shield} defaultOpen={true}>
                  <ul className="space-y-2">
                    {advisory.protective_measures.personal_protection.map((measure, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-ministry-600 mt-0.5">✓</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}

              {advisory.protective_measures.medication && (
                <ExpandableSection title="Medication & Health" icon={HeartPulse} defaultOpen={true}>
                  <ul className="space-y-2">
                    {advisory.protective_measures.medication.map((measure, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-ministry-600 mt-0.5">✓</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </ExpandableSection>
              )}
            </div>
          )}

          {/* Indoor Air Measures */}
          {advisory?.indoor_air_measures && advisory.indoor_air_measures.length > 0 && (
            <ExpandableSection title="Indoor Air Quality Measures" icon={Droplets}>
              <ul className="space-y-2">
                {advisory.indoor_air_measures.map((measure, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-ministry-600 mt-0.5">✓</span>
                    <span>{measure}</span>
                  </li>
                ))}
              </ul>
            </ExpandableSection>
          )}
        </div>
      )}

      {activeTab === "tips" && (
        <div className="space-y-3">
          {advisory?.health_tips && advisory.health_tips.length > 0 ? (
            advisory.health_tips.map((tip, idx) => (
              <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex gap-3">
                <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-900">{tip}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-600">No specific health tips available.</p>
          )}
        </div>
      )}
    </section>
  );
}
