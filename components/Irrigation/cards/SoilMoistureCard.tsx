import React, { useEffect, useState } from "react";
import { Droplets } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";
import { SOIL_SERVICE_BASE_URL } from "../../../services/apiConfig";

interface SoilMoistureCardProps {
  optimalRange: [number, number]; // [min%, max%]
  moistGroundPercent?: number | null;
  targetDate?: string; // Optional date input (format: YYYY-MM-DD)
  plotsLoading?: boolean;
}

// New 9006 endpoint types
interface SoilMoistureStackItem {
  day: string;
  soil_moisture: number;
}

interface SoilMoistureStackResponse {
  plot_name: string;
  latitude: number;
  longitude: number;
  soil_moisture_stack: SoilMoistureStackItem[];
}

const SoilMoistureCard: React.FC<SoilMoistureCardProps> = ({
  optimalRange,
  targetDate,
  plotsLoading,
}) => {
  const currentDate = targetDate || new Date().toISOString().split('T')[0];
  const { appState, setAppState, getCached, setCached, selectedPlotName } = useAppContext();
  
  if (!selectedPlotName || plotsLoading) {
    return (
      <div className="irrigation-card">
        <div className="card-header">
          <Droplets className="card-icon" size={24} />
          <h3 className="font-semibold">Soil Moisture</h3>
        </div>
        <div className="card-content soil-moisture">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            {plotsLoading ? 'Loading...' : 'Select a plot'}
          </div>
        </div>
      </div>
    );
  }
  const moisturePercent = appState.moisturePercent ?? 0;
  const currentSoilMoisture = appState.currentSoilMoisture ?? moisturePercent; // may be set by trend card
  const status = appState.moistureStatus ?? "Loading...";
  
  // Prioritize shared value from SoilMoistureTrendCard
  const [yesterdayMoisture, setYesterdayMoisture] = useState<number | null>(null);
  const [yesterdayDate, setYesterdayDate] = useState<string | null>(null);
  const displayMoisture =
    (yesterdayMoisture ?? 0) > 0
      ? (yesterdayMoisture as number)
      : currentSoilMoisture > 0
      ? currentSoilMoisture
      : moisturePercent;
  
  // Debug: Log the values being used
  console.log('SoilMoistureCard Debug:', {
    currentSoilMoisture: currentSoilMoisture,
    moisturePercent: moisturePercent,
    displayMoisture: displayMoisture,
    appState: appState,
    selectedPlotName: selectedPlotName
  });
  
  const [loading, setLoading] = useState<boolean>(!displayMoisture);
  const [error, setError] = useState<string | null>(null);
  const [plotName, setPlotName] = useState<string>(selectedPlotName || "");

  // Set plot name from global selectedPlotName
  useEffect(() => {
    if (selectedPlotName && selectedPlotName !== plotName) {
      setPlotName(selectedPlotName);
      console.log('SoilMoistureCard: Setting plot name to:', selectedPlotName);
    }
  }, [selectedPlotName]);

  // Monitor when value changes
  useEffect(() => {
    if (displayMoisture > 0) setLoading(false);
  }, [displayMoisture]);

  // Fetch yesterday moisture from 9006 endpoint
  useEffect(() => {
    if (!plotName || !selectedPlotName || plotsLoading) return;
    fetchYesterdayFromStack();
  }, [plotName, selectedPlotName, plotsLoading]);

  const fetchSoilMoistureStack = async (plot: string): Promise<SoilMoistureStackResponse> => {
    const url = `${SOIL_SERVICE_BASE_URL}/soil-moisture/${encodeURIComponent(plot)}?file_path=plots.geojson`;
    
    console.log('Fetching soil moisture for plot:', plot);
    console.log('API URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: ''
    });
    
    console.log('Soil moisture API Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      
      // Handle 404 (Plot not found) gracefully - suppress error logging
      if (response.status === 404) {
        console.warn(`Plot '${plot}' not found in backend for soil moisture. Skipping.`);
        // Return empty response to prevent error display
        throw new Error('PLOT_NOT_FOUND');
      }
      
      // Log other errors but don't use console.error to avoid cluttering console
      if (response.status !== 404) {
        console.warn('Soil moisture API Error:', response.status, errorText);
      }
      throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Soil moisture API response for', plot, ':', data);
    return data;
  };

  const fetchYesterdayFromStack = async () => {
    if (!plotName) {
      setError("Please select a plot");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const stack = await fetchSoilMoistureStack(plotName);
      const arr = Array.isArray(stack.soil_moisture_stack) ? stack.soil_moisture_stack : [];
      
      if (!arr.length) throw new Error('Empty soil_moisture_stack');
      
      // Get the last entry (most recent date)
      const lastEntry = arr[arr.length - 1];
      const moistureValue = parseFloat((lastEntry.soil_moisture || 0).toFixed(2));
      
      setYesterdayMoisture(moistureValue);
      setYesterdayDate(lastEntry.day);
      
      // Set status based on optimalRange
      let status = "Loading...";
      if (moistureValue >= optimalRange[0] && moistureValue <= optimalRange[1]) {
        status = "Moderated";
      } else if (moistureValue < optimalRange[0]) {
        status = "Low";
      } else {
        status = "High";
      }
      
      setAppState((prev: any) => ({
        ...prev,
        moisturePercent: moistureValue,
        moistureStatus: status
      }));
      
    } catch (err: any) {
      // Don't show error for plot not found - just skip silently
      if (err.message === 'PLOT_NOT_FOUND') {
        setError(null);
        setLoading(false);
        return;
      }
      
      // Only show error for other types of failures
      const errorMessage = err.message || 'Unknown error';
      if (!errorMessage.includes('not found') && !errorMessage.includes('Plot')) {
        setError(`Failed to fetch soil moisture: ${errorMessage}`);
      } else {
        setError(null); // Don't show plot not found errors
      }
    } finally {
      setLoading(false);
    }
  };



  const statusColor =
    status === "Moderated"
      ? "text-green-500"
      : status === "Low"
      ? "text-yellow-500"
      : status === "High"
      ? "text-red-500"
      : "text-gray-500";

  return (
    <div className="irrigation-card">
      <div className="card-header">
        <Droplets className="card-icon" size={24} />
        <h3 className="font-semibold">Soil Moisture</h3>
      </div>
      <div className="card-content soil-moisture">
        <div className="moisture-container">
          <div
            className="moisture-level"
            style={{
              height:
                displayMoisture > 0
                  ? `${Math.max(displayMoisture, 10)}%`
                  : "10%",
              minHeight: "30px",
              backgroundColor: displayMoisture > 0 ? "#3b82f6" : "#ef4444",
            }}
          >
            <span
              className="moisture-percentage"
              style={{
                color: "white",
                fontWeight: "bold",
              }}
            >
              {loading ? "..." : `${displayMoisture.toFixed(2)}%`}
            </span>
          </div>
        </div>

        <div
          className="moisture-info"
          style={{ textAlign: "center", marginTop: "15px" }}
        >
          <div
            className="moisture-percentage-display"
            style={{ fontSize: "24px", fontWeight: "bold", color: "#333" }}
          >
           {/* {loading ? "..." : `${displayMoisture.toFixed(2)}%`} */}
          
          </div>
          <small className="text-gray-600">Soil Moisture Level</small>
        </div>

        <div className="moisture-status">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : (
            <span className={statusColor}>{status}</span>
          )}
        </div>

        <div className="moisture-range">
          Range: {optimalRange[0]}–{optimalRange[1]}%
        </div>
      </div>
    </div>
  );
};

export default SoilMoistureCard;
