import React, { useEffect, useState } from "react";
import { AreaChart } from "lucide-react";
import { useAppContext } from "../../../context/AppContext";
import { SOIL_SERVICE_BASE_URL } from "../../../services/apiConfig";

interface MoistureData {
  date: string;
  value: number;
  day: string;
  x: number;
  isCurrentDate?: boolean;
}

interface SoilMoistureTrendCardProps {
  selectedPlotName?: string | null;
  plotsLoading?: boolean;
}

// New API response (9006) types
interface SoilMoistureStackItem {
  day: string;               // e.g. "2025-09-24"
  soil_moisture: number;     // percentage value 0-100
  rainfall_mm_yesterday: number;
  rainfall_provisional: boolean;
  et_mean_mm_yesterday: number;
}

interface SoilMoistureStackResponse {
  plot_name: string;
  latitude: number;
  longitude: number;
  soil_moisture_stack: SoilMoistureStackItem[];
}

const SoilMoistureTrendCard: React.FC<SoilMoistureTrendCardProps> = ({
  selectedPlotName,
  plotsLoading,
}) => {
  const { appState, setAppState, getCached, setCached } = useAppContext();
  
  if (!selectedPlotName || plotsLoading) {
    return (
      <div className="soil-moisture-trend-card flex flex-col min-h-0 sm:min-h-[390px] md:min-h-[450px]">
        <div className="trend-card-header pb-0">
          <AreaChart className="w-4 h-4 sm:w-5 sm:h-5" size={20} color="#8B4513" />
          <h3 className="text-sm sm:text-base">Soil Moisture Trend (weekly)</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          {plotsLoading ? 'Loading...' : 'Select a plot'}
        </div>
      </div>
    );
  }
  const data = appState.soilMoistureTrendData || [];
  const [loading, setLoading] = useState<boolean>(!data.length);
  const [error, setError] = useState<string | null>(null);
  const [currentDateMoisture, setCurrentDateMoisture] = useState<number | null>(null);
  const [plotName, setPlotName] = useState<string>(selectedPlotName || "");
  const optimalMin = 60;
  const optimalMax = 80;
  const maxValue = 100;

  // Effective height multiplier for mobile screens
  const [zoom, setZoom] = useState<number>(1);
  useEffect(() => {
    const updateZoom = () => {
      const w = window.innerWidth;
      // Increase chart height on small screens (more aggressive)
      if (w < 360) setZoom(2.2);
      else if (w < 420) setZoom(2.0);
      else if (w < 480) setZoom(1.8);
      else if (w < 640) setZoom(1.5);
      else setZoom(1);
    };
    updateZoom();
    window.addEventListener('resize', updateZoom);
    return () => window.removeEventListener('resize', updateZoom);
  }, []);

  // Set plot name from prop
  useEffect(() => {
    if (selectedPlotName) {
      setPlotName(selectedPlotName);
      console.log('SoilMoistureTrendCard: Using selected plot:', selectedPlotName);
    }
  }, [selectedPlotName]);

  // New endpoint utilities
  const fetchSoilMoistureStack = async (plot: string): Promise<SoilMoistureStackResponse> => {
    const url = `${SOIL_SERVICE_BASE_URL}/soil-moisture/${encodeURIComponent(plot)}?file_path=plots.geojson`;
    
    console.log('Fetching soil moisture trend for plot:', plot);
    console.log('API URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: ''
    });
    
    console.log('Soil moisture trend API Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      
      // Handle 404 (Plot not found) gracefully - suppress error logging
      if (response.status === 404) {
        console.warn(`Plot '${plot}' not found in backend for soil moisture trend. Skipping.`);
        // Return empty response to prevent error display
        throw new Error('PLOT_NOT_FOUND');
      }
      
      // Log other errors but don't use console.error to avoid cluttering console
      if (response.status !== 404) {
        console.warn('Soil moisture trend API Error:', response.status, errorText);
      }
      throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Soil moisture trend API response for', plot, ':', data);
    return data;
  };

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  // Map new endpoint response to chart data
  const mapStackToWeekData = (stack: SoilMoistureStackItem[]): MoistureData[] => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const todayStr = getCurrentDate();
    // Keep only last 7 records; ensure sorted by day asc
    const sorted = [...stack].sort((a, b) => a.day.localeCompare(b.day)).slice(-7);
    return sorted.map((item, idx) => {
      const d = new Date(item.day);
      return {
        date: item.day,
        value: parseFloat(item.soil_moisture.toFixed(2)),
        day: dayNames[d.getDay()],
        x: idx,
        isCurrentDate: item.day === todayStr,
      } as MoistureData;
    });
  };

  const getPrevious7Days = (): string[] => {
    const dates: string[] = [];
    const today = new Date();

    // Get previous 6 days + today (total 7 days)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]); // YYYY-MM-DD format
    }

    return dates;
  };

  const fetchWeeklyTrend = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!plotName) {
        setError("Please select a plot");
        return;
      }
      const apiResp = await fetchSoilMoistureStack(plotName);
      console.log('SoilMoisture API response:', apiResp);
      if (!apiResp?.soil_moisture_stack || !Array.isArray(apiResp.soil_moisture_stack)) {
        throw new Error('Invalid API shape: soil_moisture_stack missing');
      }
      const weekData = mapStackToWeekData(apiResp.soil_moisture_stack);
      console.log('Mapped week data:', weekData);

      setAppState((prev: any) => ({
        ...prev,
        soilMoistureTrendData: weekData,
      }));

      setCached(`soilMoistureTrend_${plotName}`, weekData);

      // Set current date moisture for the header indicator
      const todayStr = getCurrentDate();
      const todayItem = apiResp.soil_moisture_stack.find(item => item.day === todayStr);
      if (todayItem) setCurrentDateMoisture(parseFloat(todayItem.soil_moisture.toFixed(2)));
    } catch (err: any) {
      // Don't show error for plot not found - just skip silently
      if (err.message === 'PLOT_NOT_FOUND') {
        setError(null);
        setLoading(false);
        return;
      }
      
      // Only show error for other types of failures
      const errorMessage = err?.message || 'Unknown error';
      if (!errorMessage.includes('not found') && !errorMessage.includes('Plot')) {
        console.warn("Failed to fetch moisture trend data:", err);
        setError(`Unable to load soil moisture trend: ${errorMessage}`);
      } else {
        setError(null); // Don't show plot not found errors
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!plotName || !selectedPlotName || plotsLoading) return;
    fetchWeeklyTrend();
  }, [plotName, selectedPlotName, plotsLoading]);

  // Chart utilities
  const chartWidth = 1200;
  const chartHeight = 300;
  const leftPadding = 60;
  const rightPadding = 60;
  const topPadding = 40;
  const bottomPadding = 60;

  const getX = (index: number) =>
    leftPadding + ((chartWidth - leftPadding - rightPadding) / 6) * index;

  const getY = (value: number) =>
    topPadding + (chartHeight - topPadding - bottomPadding) * (1 - value / maxValue);

  const linePath = data
    .map((point: MoistureData, i: number) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(point.value)}`)
    .join(" ");

  const areaPath = [
    linePath,
    `L ${getX(data.length - 1)} ${getY(0)}`,
    `L ${getX(0)} ${getY(0)}`,
    "Z",
  ].join(" ");

  const gridLines = Array.from({ length: 6 }).map((_, i) => {
    const value = i * 20;
    const y = getY(value);
    return (
      <g key={i}>
        <line
          x1={leftPadding}
          y1={y}
          x2={chartWidth - rightPadding}
          y2={y}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <text
          x={leftPadding - 10}
          y={y + 4}
          textAnchor="end"
          fontSize="14" // Increased from 12
          fill="#64748b"
          fontWeight="600" // Added bold
        >
          {value}%
        </text>
      </g>
    );
  });

  return (
    <div className="soil-moisture-trend-card flex flex-col min-h-0 sm:min-h-[390px] md:min-h-[450px]">
      <div className="trend-card-header pb-0">
        <AreaChart className="w-4 h-4 sm:w-5 sm:h-5" size={20} color="#8B4513" />
        <h3 className="text-sm sm:text-base">Soil Moisture Trend (weekly)</h3>
        <div className="optimal-range text-xs sm:text-sm">
          Optimal: {optimalMin}-{optimalMax}%
        </div>
        <div className="flex flex-col items-center mt-0 mb-0">
          <div className="text-[9px] sm:text-[11px] font-bold mb-0">Soil Moisture Levels:</div>
          <div className="flex gap-0.5 sm:gap-3 text-[9px] sm:text-[11px] font-semibold">
            <span className="text-red-500">0-40%: Low</span>
            <span className="text-green-700">40-80%: Good</span>
            <span className="text-blue-600">80-100%: High</span>
          </div>
        </div>
        {currentDateMoisture !== null && (
          <div
            className="current-moisture-indicator text-xs sm:text-sm mt-0 hidden sm:block"
            style={{
              fontWeight: 'bold',
              color: '#8B4513'
            }}
          >
            Today's Soil Moisture: {currentDateMoisture}%
            <span
              style={{
                fontSize: '14px', // Increased from 12px
                color: '#64748b',
                marginLeft: '8px'
              }}
            >
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="irrigation-loading">
          <div className="loading-spinner-small"></div>
          <p>Loading soil moisture data...</p>
        </div>
      )}

      {error && <div className="error-message-small">{error}</div>}

      {!loading && !error && data.length > 0 && (
        <>
        <div className="flex-1 w-full relative aspect-square sm:aspect-[2/1] md:aspect-[3/1] -mt-6 sm:-mt-2">
          <svg
            className="absolute inset-0 w-full h[50%]"
            width="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B4513" stopOpacity="0.4" />
                <stop offset="30%" stopColor="#A0522D" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#CD853F" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#D2B48C" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Optimal range background (60-80% soil moisture) */}
            <rect
              x={leftPadding}
              y={getY(optimalMax)}
              width={chartWidth - leftPadding - rightPadding}
              height={getY(optimalMin) - getY(optimalMax)}
              fill="rgba(107, 142, 35, 0.25)" // Increased opacity from 0.15
            />

            {/* Soil moisture interpretation zones */}
            {/* Low moisture zone (0-40%) - Darker red */}
            <rect
              x={leftPadding}
              y={getY(40)}
              width={chartWidth - leftPadding - rightPadding}
              height={getY(0) - getY(40)}
              fill="rgba(239, 68, 68, 0.25)" // Increased opacity from 0.1
            />

            {/* High moisture zone (80-100%) - Darker blue */}
            <rect
              x={leftPadding}
              y={getY(100)}
              width={chartWidth - leftPadding - rightPadding}
              height={getY(80) - getY(100)}
              fill="rgba(59, 130, 246, 0.25)" // Increased opacity from 0.1
            />

            {/* Grid lines and Y-axis labels (0%, 20%, 40%, 60%, 80%, 100%) */}
            {gridLines}

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#8B4513"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((point: MoistureData, i: number) => (
              <circle
                key={`point-${i}`}
                cx={getX(i)}
                cy={getY(point.value)}
                r={point.isCurrentDate ? "8" : "6"}
                fill={point.isCurrentDate ? "#22C55E" : "#A0522D"}
                stroke={point.isCurrentDate ? "#16A34A" : "#F5DEB3"}
                strokeWidth="3"
              />
            ))}

            {/* Special highlight for current date */}
            {data.map((point: MoistureData, i: number) =>
              point.isCurrentDate ? (
                <circle
                  key={`current-highlight-${i}`}
                  cx={getX(i)}
                  cy={getY(point.value)}
                  r="12"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.8"
                />
              ) : null
            )}

            {/* Day labels */}
            {data.map((point: MoistureData, i: number) => (
              <text
                key={`label-${i}`}
                x={getX(i)}
                y={chartHeight + 25}
                textAnchor="middle"
                fontSize="18" // Increased from 14
                fill={point.isCurrentDate ? "#22C55E" : "#64748b"}
                fontWeight={point.isCurrentDate ? "700" : "600"} // Increased weight
              >
                {point.day}
                {point.isCurrentDate && " (Tody)"}      
              </text>
            ))}

            {/* Date labels */}
            {data.map((point: MoistureData, i: number) => (
              <text
                key={`date-${i}`}
                x={getX(i)}
                y={chartHeight + 40}
                textAnchor="middle"
                fontSize="18" // Increased from 11
                fill={point.isCurrentDate ? "#22C55E" : "#94a3b8"}
                fontWeight={point.isCurrentDate ? "600" : "500"} // Increased weight
              >
                {new Date(point.date).getDate()}/
                {new Date(point.date).getMonth() + 1}
              </text>
            ))}

            {/* Value labels with better visibility */}
            {data.map((point: MoistureData, i: number) => (
              <g key={`value-group-${i}`}>
                {/* Background for value text */}
                <rect
                  x={getX(i) - 22} // Slightly wider for larger text
                  y={getY(point.value) - 28} // Adjusted for larger text
                  width="44"
                  height="20" // Increased height
                  fill={point.isCurrentDate ? "#22C55E" : "#8B4513"}
                  fillOpacity="0.1"
                  rx="10"
                />
                {/* Value text */}
                <text
                  x={getX(i)}
                  y={getY(point.value) - (point.isCurrentDate ? 22 : 17)}
                  textAnchor="middle"
                  fontSize={point.isCurrentDate ? "16" : "14"} // Increased from 14 and 12
                  fill={point.isCurrentDate ? "#22C55E" : "#8B4513"}
                  fontWeight="700"
                >
                  {point.value}%
                  {point.isCurrentDate && ""}
                </text>
              </g>
            ))}

            {/* Legend moved outside SVG below */}
          </svg>
        </div>
        </>
      )}
    </div>
  );
};
export default SoilMoistureTrendCard;