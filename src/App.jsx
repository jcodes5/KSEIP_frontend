import React, { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CloudSun,
  FileText,
  Flame,
  MapPinned,
  Radio,
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import AQIMonitor from "./components/AQIMonitor/AQIMonitor.jsx";
import ClimateTrendViewer from "./components/ClimateTrendViewer/ClimateTrendViewer.jsx";
import FireFloodPanel from "./components/FireFloodPanel/FireFloodPanel.jsx";
import HealthAlertsPanel from "./components/HealthAlertsPanel/HealthAlertsPanel.jsx";
import { getAqiHistory, getCurrentAqi, getHealthAdvisory } from "./services/apiClient.js";

// Lazy load PlumeMapper
const PlumeMapper = lazy(() => import("./components/PlumeMapper/PlumeMapper.jsx"));

// Create components for the new pages
const FeatureCard = ({ icon, title, description, link }) => (
  <div className="feature-card bg-white p-4 sm:p-6 rounded-lg shadow-panel border border-gray-100 hover:shadow-lg transition-shadow duration-300 transform hover:-translate-y-1">
    <div className="flex items-center text-leaf-600 mb-4">
      {icon}
      <h3 className="text-xl font-heading font-semibold text-ministry-900 ml-3">{title}</h3>
    </div>
    <p className="mb-4 text-gray-700 font-sans">{description}</p>
    <Link to={link} className="feature-link text-accent-500 hover:text-leaf-800 font-medium font-sans">View Data →</Link>
  </div>
);

const LegacyHomePage = () => (
  <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 font-sans">
    <header 
      className="hero-section text-white py-20"
      style={{ backgroundImage: "url('https://plus.unsplash.com/premium_photo-1673283292055-3ce38556272c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="hero-content max-w-6xl mx-auto px-4 text-center bg-black bg-opacity-50 p-6 sm:p-10 rounded-lg">
        <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">Your Window to a Healthier Environment in Kogi State</h1>
        <p className="text-xl mb-8 max-w-3xl mx-auto">Advanced monitoring and forecasting solutions for air quality, climate, and environmental health in Kogi state</p>
        <div className="hero-buttons flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/dashboard" className="btn btn-primary bg-accent-500 hover:bg-leaf-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">Access Dashboard</Link>
          <Link to="/about" className="btn btn-secondary bg-white hover:bg-gray-100 text-ministry-700 font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">Learn More</Link>
        </div>
      </div>
    </header>

    <section className="features-section py-12 sm:py-20 bg-white">
      <div className="feature-grid max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        <FeatureCard 
          icon={<CloudSun size={32} />}
          title="Air Quality Monitoring"
          description="Real-time tracking of air pollution levels with detailed AQI readings and forecasts"
          link="/dashboard#aqi"
        />
        <FeatureCard 
          icon={<Activity size={32} />}
          title="Climate Trends"
          description="Historical and predictive climate data visualization for informed decision-making"
          link="/dashboard#climate"
        />
        <FeatureCard 
          icon={<Flame size={32} />}
          title="Fire & Flood Alerts"
          description="Early warning systems for fire outbreaks and flood events"
          link="/dashboard#alerts"
        />
        <FeatureCard 
          icon={<Bell size={32} />}
          title="Health Advisories"
          description="Environmentally-triggered health alerts and recommendations"
          link="/dashboard#health"
        />
      </div>
    </section>

    <section className="mission-section py-12 sm:py-20 bg-ministry-50">
      <div className="container max-w-4xl mx-auto px-4 text-center">
        <div className="flex justify-center mb-6">
          <MapPinned size={48} className="text-ministry-500" />
        </div>
        <h2 className="text-3xl font-heading font-bold mb-6 text-ministry-900">Our Mission</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          The Kogi State Environmental Intelligence Platform aims to address environmental challenges 
          in Kogi State through data-driven insights and predictive analytics. We provide 
          stakeholders with actionable information to support evidence-based policy decisions 
          and environmental interventions.
        </p>
      </div>
    </section>
  </div>
);

const ServiceCard = ({ icon, title, description, link, tag }) => (
  <Link
    className="group block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-ministry-500 hover:shadow-panel"
    to={link}
  >
    <div className="flex items-start justify-between gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ministry-50 text-ministry-700">
        {icon}
      </span>
      <span className="rounded-sm border border-slate-200 px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {tag}
      </span>
    </div>
    <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-ministry-700 group-hover:text-leaf-600">
      Open service
      <ArrowRight size={16} />
    </span>
  </Link>
);

const HomeMetric = ({ value, label }) => (
  <div className="border-l border-white/25 pl-4">
    <p className="text-2xl font-black text-white">{value}</p>
    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/70">{label}</p>
  </div>
);

const StatusRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0">
    <span className="text-sm font-semibold text-slate-600">{label}</span>
    <span className="text-sm font-black text-slate-950">{value}</span>
  </div>
);

const HomePage = () => (
  <div className="min-h-screen bg-[#f5f7f3] font-sans text-slate-900">
    <header className="relative overflow-hidden bg-ministry-900 text-white">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "url('/KSEIP_logo_green (1).png')",
          backgroundPosition: "right 8% center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "min(560px, 82vw)"
        }}
      />
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1A6B3C_0%,#ffffff_50%,#1A6B3C_100%)]" />
      <div className="relative mx-auto grid min-h-[76vh] max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_420px] lg:px-8">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-3 border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
            <Building2 size={16} />
            Kogi State Government Environmental Service
          </div>
          <h1 className="mt-8 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Kogi State Environmental Intelligence Platform
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
            A decision-support platform for air quality, public health advisories, climate evidence,
            plume screening, and environmental hazard monitoring across Kogi State.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 transition hover:bg-ministry-50"
              to="/dashboard"
            >
              Access Dashboard
              <ArrowRight size={17} />
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 px-5 text-sm font-black text-white transition hover:bg-white/10"
              to="/documentation"
            >
              View Documentation
            </Link>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            <HomeMetric value="4" label="Kogi nodes" />
            <HomeMetric value="7" label="API services" />
            <HomeMetric value="24h" label="AQI history" />
          </div>
        </div>

        <div className="rounded-lg border border-white/20 bg-white p-5 text-slate-900 shadow-2xl">
          <div className="flex items-start gap-4 border-b border-slate-200 pb-4">
            <img
              alt="KSEIP official logo"
              className="h-16 w-16 object-contain"
              src="/KSEIP_logo_green (1).png"
            />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-ministry-700">Official Operations</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Environmental situation desk</h2>
            </div>
          </div>
          <div className="mt-3">
            <StatusRow label="Primary AQI backbone" value="Open-Meteo AQ" />
            <StatusRow label="Meteorology" value="Live forecast" />
            <StatusRow label="Fire monitoring" value="NASA FIRMS ready" />
            <StatusRow label="Flood screening" value="Niger-Benue index" />
          </div>
          <div className="mt-5 rounded-md bg-ministry-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-ministry-700">Public service note</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Outputs are screening indicators for planning, public advisory, and field verification workflows.
            </p>
          </div>
        </div>
      </div>
    </header>

    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 text-sm font-semibold text-slate-600 md:grid-cols-3 lg:px-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-ministry-700" size={20} />
          Server-side API key protection
        </div>
        <div className="flex items-center gap-3">
          <Radio className="text-ministry-700" size={20} />
          Live environmental data sources
        </div>
        <div className="flex items-center gap-3">
          <FileText className="text-ministry-700" size={20} />
          Plain-language public advisories
        </div>
      </div>
    </section>

    <section className="bg-[#f5f7f3] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Core Services</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Built for public-sector environmental decisions</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The platform keeps monitoring, interpretation, and response tools in one official workspace for officers,
            technical reviewers, and public communication teams.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ServiceCard
            icon={<CloudSun size={22} />}
            tag="AQI"
            title="Air quality monitoring"
            description="Track current AQI, dominant pollutants, validation sources, and recent hourly trends."
            link="/dashboard#aqi"
          />
          <ServiceCard
            icon={<Activity size={22} />}
            tag="Climate"
            title="Climate evidence"
            description="Review 30-year temperature, rainfall, wind, solar, SPI, and trend significance outputs."
            link="/dashboard#climate"
          />
          <ServiceCard
            icon={<Flame size={22} />}
            tag="Hazards"
            title="Fire and flood watch"
            description="Monitor FIRMS hotspot products and Niger-Benue flood screening indicators."
            link="/dashboard#alerts"
          />
          <ServiceCard
            icon={<Bell size={22} />}
            tag="Health"
            title="Public advisories"
            description="Translate AQI conditions into readable guidance for sensitive groups and field activities."
            link="/dashboard#health"
          />
        </div>
      </div>
    </section>

    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Mandate</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">Evidence for a cleaner, safer Kogi State</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            KSEIP supports routine monitoring, incident screening, technical review, and public communication.
            It is designed to help environmental decisions move from scattered readings to traceable evidence.
          </p>
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ministry-700 px-4 text-sm font-black text-white hover:bg-ministry-900"
            to="/about"
          >
            About the platform
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["01", "Operational coverage", "Lokoja, Obajana, Okene, Anyigba, and nearest observed station workflows."],
            ["02", "Scientific screening", "Gaussian plume modelling with documented assumptions and server-side computation."],
            ["03", "Source accountability", "Open-Meteo, WAQI, OpenAQ, NASA POWER, NASA FIRMS, and flood inputs are separated by role."],
            ["04", "Public interpretation", "AQI levels are converted into practical health and activity guidance."]
          ].map(([number, title, text]) => (
            <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-5" key={number}>
              <p className="text-sm font-black text-ministry-700">{number}</p>
              <h3 className="mt-3 text-lg font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-ministry-900 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
            <MapPinned size={24} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Next Action</p>
            <h2 className="mt-1 text-2xl font-black">Open the live environmental dashboard</h2>
          </div>
        </div>
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 hover:bg-ministry-50"
          to="/dashboard"
        >
          Launch dashboard
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  </div>
);

const AboutPage = () => (
  <div className="min-h-screen bg-[#f5f7f3] font-sans text-slate-900">
    {/* Hero Section */}
    <header className="relative overflow-hidden bg-ministry-900 text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1A6B3C_0%,#ffffff_50%,#1A6B3C_100%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="max-w-4xl">
          <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-5xl">
            About Our Environmental Intelligence Platform
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
            Protecting Kogi State through advanced monitoring, predictive analytics, and data-driven decision support
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 transition hover:bg-ministry-50"
              to="/dashboard"
            >
              Explore Live Data
              <ArrowRight size={17} />
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 px-5 text-sm font-black text-white transition hover:bg-white/10"
              to="/how-to-use"
            >
              How to Use
            </Link>
          </div>
        </div>
      </div>
    </header>

    {/* Mission Section */}
    <section className="bg-white py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center">
            <p className="text-3xl font-black text-ministry-700">🌍</p>
            <h3 className="mt-3 font-bold text-slate-950">Multi-Source Integration</h3>
            <p className="mt-2 text-sm text-slate-600">Satellite, sensors, and meteorological data</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-ministry-700">⚡</p>
            <h3 className="mt-3 font-bold text-slate-950">Real-time Processing</h3>
            <p className="mt-2 text-sm text-slate-600">Live environmental monitoring</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-ministry-700">🤖</p>
            <h3 className="mt-3 font-bold text-slate-950">Advanced Analytics</h3>
            <p className="mt-2 text-sm text-slate-600">Machine learning forecasting</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-ministry-700">🎯</p>
            <h3 className="mt-3 font-bold text-slate-950">Actionable Intelligence</h3>
            <p className="mt-2 text-sm text-slate-600">Decision support recommendations</p>
          </div>
        </div>
      </div>
    </section>

    {/* Core Capabilities */}
    <section className="bg-[#f5f7f3] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Core Capabilities</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">What Makes Our Platform Essential</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ServiceCard
            icon={<CloudSun size={22} />}
            tag="AIR"
            title="Air Quality Monitoring"
            description="Real-time AQI, pollutant concentrations, and health recommendations based on air quality conditions."
            link="/dashboard#aqi"
          />
          <ServiceCard
            icon={<Activity size={22} />}
            tag="CLIMATE"
            title="Climate Analysis"
            description="Historical trends and predictive modeling for temperature, precipitation, and climate patterns."
            link="/dashboard#climate"
          />
          <ServiceCard
            icon={<Flame size={22} />}
            tag="FIRE"
            title="Fire Detection"
            description="Satellite-based hotspot detection and early warning alerts for fire outbreaks."
            link="/dashboard#alerts"
          />
          <ServiceCard
            icon={<Bell size={22} />}
            tag="FLOOD"
            title="Flood Prediction"
            description="Precipitation analysis and flood risk assessment for disaster preparedness."
            link="/dashboard#alerts"
          />
          <ServiceCard
            icon={<Bell size={22} />}
            tag="HEALTH"
            title="Health Advisories"
            description="Environment-triggered health alerts and personalized recommendations."
            link="/dashboard#health"
          />
          <ServiceCard
            icon={<Radio size={22} />}
            tag="PLUME"
            title="Plume Modeling"
            description="Advanced dispersion modeling for pollutant trajectory prediction."
            link="/dashboard"
          />
        </div>
      </div>
    </section>

    {/* Environmental Challenges */}
    <section className="bg-white py-16 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Challenges</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Environmental Issues We Address</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["🌫️", "Air Pollution", "Monitoring PM2.5, PM10, and other pollutants to protect public health"],
            ["🌡️", "Climate Change", "Tracking climate trends and providing insights for adaptation strategies"],
            ["🔥", "Wildfire Risk", "Early detection and warning systems to minimize fire-related damages"],
            ["💧", "Flood Risk", "Predictive alerts for flood events enabling timely disaster response"]
          ].map(([emoji, title, text]) => (
            <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-6" key={title}>
              <p className="text-2xl font-black">{emoji}</p>
              <h3 className="mt-3 font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="bg-ministry-900 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white/10">
            <MapPinned size={24} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Next Step</p>
            <h2 className="mt-1 text-2xl font-black">View Environmental Intelligence Dashboard</h2>
          </div>
        </div>
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 hover:bg-ministry-50"
          to="/dashboard"
        >
          Open Dashboard
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  </div>
);

const HowToUsePage = () => {
  const [expandedAccordion, setExpandedAccordion] = React.useState(null);

  const toggleAccordion = (index) => {
    setExpandedAccordion(expandedAccordion === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f3] font-sans text-slate-900">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-ministry-900 text-white">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1A6B3C_0%,#ffffff_50%,#1A6B3C_100%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-5xl">
              How to Use KSEI Platform
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Master our environmental intelligence tools with step-by-step guidance
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 transition hover:bg-ministry-50"
                to="/dashboard"
              >
                Go to Dashboard
                <ArrowRight size={17} />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 px-5 text-sm font-black text-white transition hover:bg-white/10"
                to="/documentation"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Start */}
      <section className="bg-white py-16 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Quick Start</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Get Started in 4 Steps</h2>
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ministry-700 text-2xl font-black text-white mx-auto mb-4">1</div>
              <h3 className="font-bold text-slate-950">Select Data</h3>
              <p className="mt-2 text-sm text-slate-600">Choose Air Quality, Climate, Fire, or Flood</p>
            </div>
            <div className="hidden md:block text-3xl font-black text-ministry-700">→</div>
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ministry-700 text-2xl font-black text-white mx-auto mb-4">2</div>
              <h3 className="font-bold text-slate-950">Choose Location</h3>
              <p className="mt-2 text-sm text-slate-600">Select Kogi State or specific regions</p>
            </div>
            <div className="hidden md:block text-3xl font-black text-ministry-700">→</div>
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ministry-700 text-2xl font-black text-white mx-auto mb-4">3</div>
              <h3 className="font-bold text-slate-950">View Data</h3>
              <p className="mt-2 text-sm text-slate-600">Explore maps and real-time metrics</p>
            </div>
            <div className="hidden md:block text-3xl font-black text-ministry-700">→</div>
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ministry-700 text-2xl font-black text-white mx-auto mb-4">4</div>
              <h3 className="font-bold text-slate-950">Take Action</h3>
              <p className="mt-2 text-sm text-slate-600">Use insights for decisions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Guides */}
      <section className="bg-[#f5f7f3] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Feature Guides</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Learn Each Feature</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ServiceCard
              icon={<CloudSun size={22} />}
              tag="AIR"
              title="Air Quality Monitor"
              description="Track real-time AQI values, pollutant concentrations, and view health recommendations for current conditions."
              link="/dashboard#aqi"
            />
            <ServiceCard
              icon={<Activity size={22} />}
              tag="CLIMATE"
              title="Climate Trends"
              description="Analyze temperature and precipitation patterns with interactive charts and seasonal trend visualization."
              link="/dashboard#climate"
            />
            <ServiceCard
              icon={<Flame size={22} />}
              tag="HAZARDS"
              title="Fire & Flood Alerts"
              description="Monitor real-time fire hotspots and receive flood risk notifications with recommended actions."
              link="/dashboard#alerts"
            />
            <ServiceCard
              icon={<Bell size={22} />}
              tag="HEALTH"
              title="Health Advisories"
              description="Review personalized health recommendations based on current environmental conditions."
              link="/dashboard#health"
            />
            <ServiceCard
              icon={<Radio size={22} />}
              tag="PLUME"
              title="Plume Modeling"
              description="Predict pollutant dispersion patterns and understand atmospheric transport mechanisms."
              link="/dashboard"
            />
            <ServiceCard
              icon={<MapPinned size={22} />}
              tag="MAPS"
              title="Data Visualization"
              description="Interact with maps, charts, and tables to explore environmental data effectively."
              link="/dashboard"
            />
          </div>
        </div>
      </section>

      {/* Data Interpretation */}
      <section className="bg-white py-16 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Understanding Data</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Learn Data Interpretation</h2>
          </div>
          <div className="space-y-3 max-w-3xl">
            {[
              {
                title: "Air Quality Index (AQI)",
                content: "AQI ranges: 0-50 (Good), 51-100 (Moderate), 101-150 (Unhealthy for Sensitive Groups), 151-200 (Unhealthy), 201-300 (Very Unhealthy), 301+ (Hazardous). Each level has specific health implications and activity recommendations."
              },
              {
                title: "Climate Data Parameters",
                content: "Temperature (°C), Precipitation (mm), Humidity (%), Wind Speed (km/h), and Pressure. These parameters help predict environmental hazards and understand long-term climate trends."
              },
              {
                title: "Fire Risk Assessment",
                content: "Risk calculated from temperature, humidity, fuel load, wind speed, and historical patterns. Levels: Low (0-25%), Moderate (26-50%), High (51-75%), Very High (76%+)."
              },
              {
                title: "Flood Risk Assessment",
                content: "Based on cumulative rainfall, soil moisture, river levels, topography, and forecast models. Levels: Low, Normal, Moderate, High, Very High risk categories."
              }
            ].map((item, index) => (
              <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-4 bg-[#fbfcfa] hover:bg-ministry-50 flex items-center justify-between font-bold text-slate-950 transition"
                >
                  {item.title}
                  <span className={`text-ministry-700 transition ${expandedAccordion === index ? 'rotate-45' : ''}`}>+</span>
                </button>
                {expandedAccordion === index && (
                  <div className="px-6 py-4 bg-white border-t border-slate-200 text-slate-600">
                    {item.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="bg-[#f5f7f3] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Best Practices</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Tips for Platform Success</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["💡", "Regular Monitoring", "Check dashboard regularly, especially during high-risk periods"],
              ["🔔", "Enable Alerts", "Set up personalized alerts for AQI thresholds and hazard warnings"],
              ["📊", "Analyze Trends", "Review historical data to identify patterns and prepare"],
              ["👥", "Share Information", "Use data to inform communities about environmental conditions"]
            ].map(([emoji, title, text]) => (
              <div className="rounded-lg border border-slate-200 bg-white p-6" key={title}>
                <p className="text-2xl font-black">{emoji}</p>
                <h3 className="mt-3 font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ministry-900 py-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Ready to Get Started?</p>
            <h2 className="mt-1 text-2xl font-black">Open the dashboard and explore live data</h2>
          </div>
          <Link
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 hover:bg-ministry-50"
            to="/dashboard"
          >
            Open Dashboard
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
};

const DocumentationPage = () => (
  <div className="min-h-screen bg-[#f5f7f3] font-sans text-slate-900">
    {/* Hero Section */}
    <header className="relative overflow-hidden bg-ministry-900 text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1A6B3C_0%,#ffffff_50%,#1A6B3C_100%)]" />
      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="max-w-4xl">
          <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-5xl">
            KSEI Platform Documentation
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
            Comprehensive guide to our environmental monitoring, forecasting, and decision support system
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 transition hover:bg-ministry-50"
              to="/dashboard"
            >
              View Dashboard
              <ArrowRight size={17} />
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 px-5 text-sm font-black text-white transition hover:bg-white/10"
              to="/how-to-use"
            >
              How to Use
            </Link>
          </div>
        </div>
      </div>
    </header>

    {/* Overview */}
    <section className="bg-white py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Fundamentals</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">System Overview</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            The KSEI Environmental Intelligence Platform combines satellite imagery, ground-based sensor data, meteorological models, 
            and machine learning to provide accurate environmental intelligence for decision-makers.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["📡", "Multi-Source Integration", "Integrates satellite, sensors, meteorological data, and geospatial information"],
              ["⚡", "Real-time Processing", "Stream processing architecture for rapid data ingestion and analysis"],
              ["🤖", "Advanced Analytics", "Machine learning models and statistical analysis for forecasting"],
              ["🎯", "Decision Support", "Advisory engine generates specific recommendations for stakeholders"]
            ].map(([emoji, title, text]) => (
              <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-5" key={title}>
                <p className="text-2xl font-black">{emoji}</p>
                <h3 className="mt-3 font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* System Architecture */}
    <section className="bg-[#f5f7f3] py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Architecture</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Processing Pipeline</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-ministry-700">Data Ingestion</p>
            <h3 className="mt-3 text-lg font-black text-slate-950">Multiple Sources</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Collects and normalizes data from satellites, ground sensors, and meteorological services
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-ministry-700">Processing</p>
            <h3 className="mt-3 text-lg font-black text-slate-950">Quality Control</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Quality checks, interpolation, and enhancement algorithms
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-ministry-700">Analysis</p>
            <h3 className="mt-3 text-lg font-black text-slate-950">Intelligence</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Forecasting models, advisory algorithms, and risk assessments
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-ministry-700">Presentation</p>
            <h3 className="mt-3 text-lg font-black text-slate-950">Delivery</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Web dashboards, maps, charts, and alert systems for users
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Data Sources */}
    <section className="bg-white py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Data Sources</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Where Our Data Comes From</h2>
        </div>
        <div className="space-y-4 max-w-3xl">
          <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-6">
            <h3 className="font-black text-ministry-700">Satellite Imagery</h3>
            <p className="mt-2 text-sm text-slate-600">
              <strong>MODIS, VIIRS, Landsat</strong> for fire detection, aerosol optical depth, and land surface characteristics
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-6">
            <h3 className="font-black text-ministry-700">Ground Sensors</h3>
            <p className="mt-2 text-sm text-slate-600">
              <strong>AQMesh networks</strong> providing real-time air quality measurements (PM2.5, PM10, NO2, SO2, CO, O3)
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-6">
            <h3 className="font-black text-ministry-700">Meteorological Data</h3>
            <p className="mt-2 text-sm text-slate-600">
              <strong>GFS, ECMWF, OpenMeteo</strong> global forecast models for weather and climate data
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-6">
            <h3 className="font-black text-ministry-700">Geospatial Data</h3>
            <p className="mt-2 text-sm text-slate-600">
              Population density, land use/land cover, digital elevation models, and administrative boundaries
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Environmental Parameters */}
    <section className="bg-[#f5f7f3] py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Parameters</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">What We Monitor</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-black text-ministry-700">🌿 Air Quality</h3>
            <p className="mt-3 text-sm text-slate-600">
              <strong>Parameters:</strong> PM2.5, PM10, NO₂, SO₂, CO, O₃, AQI
              <br /><strong>Frequency:</strong> Real-time with hourly averages
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-black text-ministry-700">🌡️ Climate & Weather</h3>
            <p className="mt-3 text-sm text-slate-600">
              <strong>Parameters:</strong> Temperature, precipitation, humidity, wind
              <br /><strong>Frequency:</strong> Daily historical, hourly forecasts
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-black text-ministry-700">🔥 Fire Detection</h3>
            <p className="mt-3 text-sm text-slate-600">
              <strong>Parameters:</strong> Hotspots, FRP, confidence levels
              <br /><strong>Frequency:</strong> Twice daily satellite passes
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-black text-ministry-700">💧 Flood Monitoring</h3>
            <p className="mt-3 text-sm text-slate-600">
              <strong>Parameters:</strong> Rainfall, soil moisture, river levels
              <br /><strong>Frequency:</strong> Updated every 6 hours
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* API Documentation */}
    <section className="bg-white py-16 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">For Developers</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">REST API Endpoints</h2>
          <p className="mt-4 text-base text-slate-600">Access environmental data programmatically through our REST API</p>
        </div>
        <div className="space-y-4 max-w-3xl">
          {[
            {
              method: "GET /api/aqi/current",
              desc: "Current AQI data for a location"
            },
            {
              method: "GET /api/aqi/history",
              desc: "Historical AQI readings with hourly averages"
            },
            {
              method: "GET /api/health/advisory",
              desc: "Health advisory based on current conditions"
            },
            {
              method: "GET /api/climate/trend",
              desc: "Climate trend data with historical analysis"
            },
            {
              method: "GET /api/fire/hotspots",
              desc: "NASA FIRMS fire detection data"
            },
            {
              method: "GET /api/flood/risk",
              desc: "Flood risk assessment and predictions"
            }
          ].map((endpoint, index) => (
            <div key={index} className="rounded-lg border border-slate-200 bg-[#fbfcfa] p-5">
              <p className="font-mono text-sm font-bold text-ministry-700">{endpoint.method}</p>
              <p className="mt-2 text-sm text-slate-600">{endpoint.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Quality Assurance */}
    <section className="bg-[#f5f7f3] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-ministry-700">Quality</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Data Quality Assurance</h2>
          <p className="mt-4 text-base text-slate-600">
            Multiple quality control measures ensure accuracy and reliability of our environmental intelligence
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["✓", "Cross-Validation", "Satellite vs. ground-based measurement comparison"],
            ["✓", "Anomaly Detection", "ML algorithms flag unrealistic values"],
            ["✓", "Data Interpolation", "Missing data estimated using spatial-temporal patterns"],
            ["✓", "Model Validation", "Forecasts validated against observed data"],
            ["✓", "Uncertainty Quantification", "All forecasts include confidence levels"],
            ["✓", "Continuous Monitoring", "Performance tracked 24/7 with automatic alerts"]
          ].map(([icon, title, desc]) => (
            <div className="rounded-lg border border-slate-200 bg-white p-6" key={title}>
              <p className="text-2xl font-black text-ministry-700">{icon}</p>
              <h3 className="mt-3 font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-ministry-900 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Next Step</p>
          <h2 className="mt-1 text-2xl font-black">Ready to explore environmental intelligence?</h2>
        </div>
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-ministry-900 hover:bg-ministry-50"
          to="/dashboard"
        >
          Open Dashboard
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  </div>
);

const DashboardPage = () => {
  const [aqiLocation, setAqiLocation] = useState("lokoja");
  const [aqiCurrent, setAqiCurrent] = useState(null);
  const [aqiHistory, setAqiHistory] = useState(null);
  const [healthAdvisory, setHealthAdvisory] = useState(null);
  const [aqiError, setAqiError] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLocationChange = (newLocation) => {
    setAqiLocation(newLocation);
  };

  const fetchAqiData = async (location) => {
    setLoading(true);
    setAqiError(null);
    try {
      const [current, history, advisory] = await Promise.all([
        getCurrentAqi(location),
        getAqiHistory(location),
        getHealthAdvisory(location),
      ]);
      setAqiCurrent(current);
      setAqiHistory(history);
      setHealthAdvisory(advisory);
    } catch (error) {
      setAqiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAqiData(aqiLocation);
  }, [aqiLocation]);

  return (
    <div className="dashboard-container min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl grid gap-6">
        <AQIMonitor
          location={aqiLocation}
          onLocationChange={handleLocationChange}
          current={aqiCurrent}
          history={aqiHistory}
          loading={loading}
          error={aqiError}
          onRetry={() => fetchAqiData(aqiLocation)}
        />
        <HealthAlertsPanel
          advisory={healthAdvisory}
          aqiCurrent={aqiCurrent}
          loading={loading}
        />
        <ClimateTrendViewer />
        <FireFloodPanel />
        <Suspense fallback={<div>Loading Plume Mapper...</div>}>
          <PlumeMapper />
        </Suspense>
      </div>
    </div>
  );
};

// Create Navbar component
// ─── Navbar ────────────────────────────────────────────────────────────────
const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = React.useRef(null);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMoreOpen(false);
  };

  useEffect(() => {
  if (mobileMenuOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [mobileMenuOpen]);

  // Close "More" dropdown on outside click (desktop)
  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile menu on outside click
  const navRef = React.useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      {/* Gov bar */}
      <div className="bg-ministry-900 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/75">
         environmental intelligence service for Kogi State
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-5 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 min-w-0" onClick={closeMobileMenu}>
          <img
            src="/KSEIP_logo_green (1).png"
            alt="KSEIP Logo"
            className="h-10 w-auto flex-shrink-0 sm:h-12 lg:h-14"
          />
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ministry-700">KSEIP</p>
            <p className="text-xs leading-tight text-slate-950">Kogi Environmental Platform</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-1 text-sm font-bold">
          <li>
            <Link
              to="/"
              className={`rounded-md px-3 py-2 hover:bg-ministry-50 hover:text-ministry-700 ${
                location.pathname === "/" ? "text-ministry-700" : "text-slate-600"
              }`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/about"
              className={`block rounded-md px-3 py-2 ${
  location.pathname === "/about"
    ? "bg-ministry-50 text-ministry-700"
    : "text-slate-600 hover:bg-ministry-50 hover:text-ministry-700"
}`}
            >
              About
            </Link>
          </li>

          {/* "More" — click-controlled, not hover */}
          <li ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="rounded-md px-3 py-2 text-slate-600 hover:bg-ministry-50 hover:text-ministry-700"
            >
              More
            </button>
            {moreOpen && (
              <ul className="absolute left-0 top-full mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg z-50">
                <li>
                  <Link
                    to="/how-to-use"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-ministry-50"
                  >
                    How to Use
                  </Link>
                </li>
                <li>
                  <Link
                    to="/documentation"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-ministry-50"
                  >
                    Documentation
                  </Link>
                </li>
              </ul>
            )}
          </li>

          <li>
            <Link
              to="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md bg-ministry-700 px-4 text-sm text-white hover:bg-ministry-900"
            >
              Dashboard
            </Link>
          </li>
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="lg:hidden p-2 text-slate-600 hover:bg-ministry-50 hover:text-ministry-700 rounded-md"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu — max-h transition, no layout jump */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
         mobileMenuOpen ? "max-h-[500px]" : "max-h-0"
        }`}
      >
        <ul className="flex flex-col border-t border-slate-200 px-4 py-2 text-sm font-bold">
          <li>
            <Link
              to="/"
              onClick={closeMobileMenu}
              className={`block rounded-md px-3 py-2 hover:bg-ministry-50 hover:text-ministry-700 ${
                location.pathname === "/" ? "text-ministry-700" : "text-slate-600"
              }`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/about"
              onClick={closeMobileMenu}
              className={`block rounded-md px-3 py-2 hover:bg-ministry-50 hover:text-ministry-700 ${
                location.pathname === "/about" ? "text-ministry-700" : "text-slate-600"
              }`}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              to="/how-to-use"
              onClick={closeMobileMenu}
              className="block rounded-md px-3 py-2 text-slate-600 hover:bg-ministry-50 hover:text-ministry-700"
            >
              How to Use
            </Link>
          </li>
          <li>
            <Link
              to="/documentation"
              onClick={closeMobileMenu}
              className="block rounded-md px-3 py-2 text-slate-600 hover:bg-ministry-50 hover:text-ministry-700"
            >
              Documentation
            </Link>
          </li>
          <li className="mt-2 mb-1">
            <Link
              to="/dashboard"
              onClick={closeMobileMenu}
              className="flex h-10 items-center justify-center rounded-md bg-ministry-700 px-4 text-white hover:bg-ministry-900"
            >
              Dashboard
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};


// Create Footer component
// ─── Footer ────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="bg-ministry-900 text-white mt-12 sm:mt-16 font-sans overflow-x-hidden">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      <div>
        <h3 className="text-lg font-bold mb-3">Kogi State Environmental Intelligence Platform</h3>
        <p className="text-sm text-ministry-200">Promoting environmental sustainability through data-driven insights</p>
      </div>
      <div>
        <h4 className="text-base font-semibold mb-3">Contact Us</h4>
        {/* REPLACE these with real Nigerian contact details before launch */}
        <p className="text-sm text-ministry-200">Email: info@kseip.gov.ng</p>
        <p className="text-sm text-ministry-200">Phone: +234 800 000 0000</p>
      </div>
      <div>
        <h4 className="text-base font-semibold mb-3">Quick Links</h4>
        <ul className="space-y-2">
          <li><Link to="/about" className="text-sm text-ministry-200 hover:text-white transition">About</Link></li>
          <li><Link to="/documentation" className="text-sm text-ministry-200 hover:text-white transition">Documentation</Link></li>
          <li><Link to="/how-to-use" className="text-sm text-ministry-200 hover:text-white transition">How to Use</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-ministry-800 py-3 px-4 text-center text-xs text-ministry-300 sm:px-5 lg:px-8">
     <p className="flex flex-wrap justify-center gap-2">
  <span>&copy; {new Date().getFullYear()} KSEIP.</span>
  <span>All rights reserved.</span>
  <span>Terms of Use</span>
  <span>Privacy Policy</span>
</p>
    </div>
  </footer>
);

export default function App() {
  return (
    <Router>
      <div className="App min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/how-to-use" element={<HowToUsePage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
