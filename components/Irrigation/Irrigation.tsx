import React, { useEffect, useState } from "react";
import { Satellite } from "lucide-react";

import RainfallCard from "./cards/RainfallCard";
import SoilMoistureCard from "./cards/SoilMoistureCard";
import EvapotranspirationCard from "./cards/EvapotranspirationCard";
import TemperatureCard from "./cards/TemperatureCard";
import HumidityCard from "./cards/HumidityCard";
import SoilMoistureTrendCard from "./cards/SoilMoistureTrendCard";
import WaterUptakeCard from "./cards/WaterUptakeCard";

import "./Irrigation.css";
import { useAppContext } from "../../context/AppContext";
import { fetchCurrentWeather } from "../../services/weatherService";
import { fetchPlotNames } from "../../services/plotsService";

interface IrrigationProps {
  selectedPlotName?: string | null;
  moistGroundPercent?: number | null;
}

const Irrigation: React.FC<IrrigationProps> = ({
  selectedPlotName: propSelectedPlotName,
  moistGroundPercent,
}) => {
  const { appState, setAppState, getCached, setCached, selectedPlotName, setSelectedPlotName } = useAppContext();
  // Use global selectedPlotName if available, otherwise fall back to prop
  const activePlotName = selectedPlotName || propSelectedPlotName;
  const weatherData = appState.weatherData || null;
  const [loading, setLoading] = useState<boolean>(!weatherData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [plotNames, setPlotNames] = useState<string[]>([]);
  const [plotsLoading, setPlotsLoading] = useState<boolean>(true);

  // Default coordinates (same as Header component)
  const LAT = 20.008514744233374;
  const LON = 73.95377087911103;

  // Fetch plot names on component mount
  useEffect(() => {
    const loadPlots = async () => {
      try {
        setPlotsLoading(true);
        const plots = await fetchPlotNames();
        setPlotNames(plots);
        // Always set NHRDF_Garlic as default plot if it exists, otherwise use first plot
        if (plots.length > 0) {
          const defaultPlot = plots.includes('NHRDF_Garlic') ? 'NHRDF_Garlic' : plots[0];
          // Only set if current selection is not valid or empty
          if (!selectedPlotName || !plots.includes(selectedPlotName)) {
            setSelectedPlotName(defaultPlot);
          }
        }
      } catch (err) {
        console.error('Error fetching plot names:', err);
        setError("Failed to load plot names");
      } finally {
        setPlotsLoading(false);
      }
    };
    loadPlots();
  }, [selectedPlotName, setSelectedPlotName]);

  useEffect(() => {
    const cacheKey = `weather_${LAT}_${LON}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      setAppState((prev: any) => ({ ...prev, weatherData: cached.data }));
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetchWeatherData(LAT, LON);
    // eslint-disable-next-line
  }, []);

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      console.log('🌤️ Irrigation: Fetching weather for coordinates:', { lat, lon });
      
      // Use the same weather service as Header component
      const data = await fetchCurrentWeather(lat, lon);
      console.log('🌤️ Irrigation: Weather data received:', data);
      
      setAppState((prev: any) => ({ ...prev, weatherData: data }));
      setLastUpdated(new Date());
      setError(null);
      
      // Save to context cache and localStorage with location-specific key
      const cacheKey = `weather_${lat}_${lon}`;
      const payload = { data, timestamp: Date.now() };
      setCached(cacheKey, payload);
    } catch (err) {
      setError("Error fetching weather data. Please try again later.");
      console.error("Error fetching weather data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });


  if (loading && !weatherData) {
    return (
      <div className="irrigation-loading">
        <div className="loading-spinner">
          <Satellite className="w-8 h-8 animate-spin text-blue-500" />
        </div>
        <p>Loading irrigation data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="irrigation-error">{error}</div>;
  }

  // Don't show "Select plot" message if we're still loading - wait for default to be set
  if (!selectedPlotName && !plotsLoading) {
    return (
      <div className="irrigation-container">
        <div className="irrigation-header-layout">
          <div className="header-left">
            <h1>Irrigation Status</h1>
          </div>
          
          <div className="header-center">
            <label className="plot-label">Select Plot:</label>
            {plotsLoading ? (
              <div className="loading-text">Loading plots...</div>
            ) : (
              <select
                value={selectedPlotName || ""}
                onChange={(e) => {
                  setSelectedPlotName(e.target.value);
                }}
                className="plot-dropdown"
              >
                <option value="" disabled>Select a plot</option>
                {plotNames.map((plot) => (
                  <option key={plot} value={plot}>
                    {plot}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="header-right">
            <span className="date">{formattedDate}</span>
          </div>
        </div>

        <div className="select-plot-message">
          <h2>Select the plot</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="irrigation-container">
      {/* Header with left, center, right layout */}
      <div className="irrigation-header-layout">
        <div className="header-left">
          <h1>Irrigation Status</h1>
        </div>
        
        <div className="header-center">
          <label className="plot-label">Select Plot:</label>
          {plotsLoading ? (
            <div className="loading-text">Loading plots...</div>
          ) : (
            <select
              value={selectedPlotName || ""}
              onChange={(e) => {
                setSelectedPlotName(e.target.value);
              }}
              className="plot-dropdown"
            >
              <option value="" disabled>Select a plot</option>
              {plotNames.map((plot) => (
                <option key={plot} value={plot}>
                  {plot}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="header-right">
          <span className="date">{formattedDate}</span>
        </div>
      </div>

      <div className="card-row">
        <RainfallCard
          value={weatherData?.precip_mm || 0}
          lastUpdated={lastUpdated}
        />
        <TemperatureCard
          value={weatherData?.temperature_c || 0}
          lastUpdated={lastUpdated}
        />
        <HumidityCard
          value={weatherData?.humidity || 0}
          lastUpdated={lastUpdated}
        />
      </div>

      <div className="card-row">
        <EvapotranspirationCard plotsLoading={plotsLoading} availablePlots={plotNames} />
        <SoilMoistureCard
          optimalRange={[50, 60]}
          moistGroundPercent={moistGroundPercent}
          plotsLoading={plotsLoading}
        />
        <WaterUptakeCard plotsLoading={plotsLoading} />
      </div>

      <div className="trend-card-row">
        <SoilMoistureTrendCard selectedPlotName={activePlotName} plotsLoading={plotsLoading} />
      </div>

      <div className="refresh-section">
        <button 
          onClick={() => {
            fetchWeatherData(LAT, LON);
          }} 
          className="refresh-button"
        >
          Refresh Data
        </button>
        <span className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default Irrigation;
