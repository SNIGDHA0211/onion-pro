
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from "../context/AppContext";
import { fetchSoilAnalysis, SoilAnalysisResponse } from "../services/analysisService";

const STATUS_COLORS = {
  'Very Low': '#ef4444',
  'Low': '#fb923c',
  'Medium': '#facc15',
  'Optimal': '#4ade80',
  'Very High': '#15803d',
};

const BORDER_CLASSES = {
  '#ef4444': 'border-[#ef4444]',
  '#fb923c': 'border-[#fb923c]',
  '#facc15': 'border-[#facc15]',
  '#4ade80': 'border-[#4ade80]',
  '#15803d': 'border-[#15803d]',
};

interface Metric {
  name: string;
  symbol: string;
  value: string;
  unit: string;
  range?: string;
  status: 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High';
  percentage: number;
}

// Horizontal Bar Chart Component
const HorizontalBarChart: React.FC<{ metrics: Metric[] }> = ({ metrics }) => {
  // Filter metrics that have ranges (exclude Clay, Sand, Silt)
  const metricsWithRanges = metrics.filter(m => m.range);
  
  return (
    <div className="flex gap-2 mb-2">
      {/* Vertical Scale Labels */}
      <div className="flex flex-col justify-between text-[9px] text-gray-600 h-32 flex-shrink-0 pr-3">
        <span>Very High</span>
        <span>Optimal</span>
        <span>Medium</span>
        <span>Low</span>
        <span>Very Low</span>
      </div>
      
      {/* Horizontal Bars - Width matches cards grid */}
      <div className="flex items-end justify-start flex-1 h-32" style={{ gap: '1rem' }}>
        {metricsWithRanges.map((metric, idx) => {
          const statusColor = STATUS_COLORS[metric.status];
          const borderClass = BORDER_CLASSES[statusColor];
          
          return (
            <div
              key={idx}
              className={`flex flex-col items-center justify-end h-full w-7 border-2 rounded flex-shrink-0 ${borderClass}`}
            >
              <div
                className="w-full rounded-t min-h-1 transition-all"
                style={{
                  height: `${Math.max(metric.percentage || 0, 10)}%`, // Equal minimum height for all bars
                  backgroundColor: statusColor,
                }}
              ></div>
              <div className="text-center text-[8px] mt-0.5 leading-tight">
                <strong>{metric.symbol}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ metric: Metric }> = ({ metric }) => {
  const statusColor = STATUS_COLORS[metric.status];
  const borderClass = BORDER_CLASSES[statusColor];
  const hasRange = metric.range && metric.percentage !== undefined;
  const isSoilTexture = ["Clay", "Sand", "Silt"].includes(metric.name);

  return (
    <div className={`border-2 rounded p-2 text-center bg-white shadow-sm ${
      hasRange ? borderClass : isSoilTexture ? "border-green-500" : "border-gray-200"
    }`}>
      {hasRange && (
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full transition-all`}
            style={{ width: `${metric.percentage}%`, backgroundColor: statusColor }}
          ></div>
        </div>
      )}
      
      <h3 className="text-xs font-semibold text-gray-800 my-0.5">
        {metric.name}
      </h3>
      <p className="text-[10px] text-gray-500 my-0.5">
        ({metric.symbol})
      </p>
      <p className="text-sm font-bold text-gray-900 my-1">
        {metric.value === 'Not Available' || metric.value === null
          ? "N/A"
          : typeof metric.value === "number"
          ? metric.value.toFixed(2)
          : metric.value}
        {metric.value !== 'Not Available' && metric.value !== null && metric.unit && (
          <span className="text-[10px] text-gray-500 ml-0.5 font-normal">
            {" "}
            {metric.unit}
          </span>
        )}
      </p>
      {hasRange && metric.range && (
        <p className="text-[9px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 mt-1">
          Range: {metric.range}
        </p>
      )}
    </div>
  );
};

// Helper function to format values
const fmt = (val: number | null | undefined, unit: string = ""): string => {
  if (val === null || val === undefined) {
    return "Not Available";
  }
  try {
    const v = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(v)) return "Not Available";
    const rounded = Math.round(v * 100) / 100;
    return unit ? `${rounded} ${unit}` : String(rounded);
  } catch {
    return "Not Available";
  }
};

// Helper function to get numeric value
const getNumericValue = (val: number | null | undefined): number | null => {
  if (val === null || val === undefined) {
    return null;
  }
  try {
    const v = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(v) ? null : v;
  } catch {
    return null;
  }
};

// Level calculation functions
function getNitrogenLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 140) return 'Very Low';
  if (value < 210) return 'Low';
  if (value < 280) return 'Medium';
  if (value <= 560) return 'Optimal';
  return 'Very High';
}

function getPhosphorusLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 11) return 'Very Low';
  if (value < 17) return 'Low';
  if (value < 22) return 'Medium';
  if (value <= 55) return 'Optimal';
  return 'Very High';
}

function getPotassiumLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 55) return 'Very Low';
  if (value < 82) return 'Low';
  if (value < 110) return 'Medium';
  if (value <= 280) return 'Optimal';
  return 'Very High';
}

function getPHLevel(pHValue: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (pHValue === null) return 'Medium';
  if (pHValue < 5.0) return 'Very Low';
  if (pHValue < 6.0) return 'Low';
  if (pHValue < 6.5) return 'Medium';
  if (pHValue <= 7.5) return 'Optimal';
  return 'Very High';
}

function getCECLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 5) return 'Very Low';
  if (value < 8) return 'Low';
  if (value < 10) return 'Medium';
  if (value <= 25) return 'Optimal';
  return 'Very High';
}

function getFeLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 2.0) return 'Very Low';
  if (value < 3.0) return 'Low';
  if (value < 4.0) return 'Medium';
  if (value <= 6.0) return 'Optimal';
  return 'Very High';
}

function getZnLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 0.3) return 'Very Low';
  if (value < 0.45) return 'Low';
  if (value < 0.6) return 'Medium';
  if (value <= 1.0) return 'Optimal';
  return 'Very High';
}

function getSOCLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 0.375) return 'Very Low';
  if (value < 0.56) return 'Low';
  if (value < 0.75) return 'Medium';
  if (value <= 1.0) return 'Optimal';
  return 'Very High';
}

function getOCSLevel(value: number | null): 'Very Low' | 'Low' | 'Medium' | 'Optimal' | 'Very High' {
  if (value === null) return 'Medium';
  if (value < 12.5) return 'Very Low';
  if (value < 18.75) return 'Low';
  if (value < 25) return 'Medium';
  if (value <= 50) return 'Optimal';
  return 'Very High';
}

// Percentage calculation functions
function calculatePHPercentage(pHValue: number | null): number {
  if (pHValue === null) return 0;
  const minPH = 4.0;
  const maxPH = 8.0;
  const optimalMin = 6.5;
  const optimalMax = 7.5;

  if (pHValue <= optimalMin) {
    return Math.max(0, ((pHValue - minPH) / (optimalMin - minPH)) * 50);
  } else if (pHValue >= optimalMax) {
    return Math.min(
      100,
      50 + ((pHValue - optimalMax) / (maxPH - optimalMax)) * 50
    );
  } else {
    return 50 + ((pHValue - optimalMin) / (optimalMax - optimalMin)) * 50;
  }
}

function calculatePercentage(
  value: number | null,
  minOptimal: number,
  maxOptimal: number,
  minRange: number,
  maxRange: number
): number {
  if (value === null) return 0;
  if (value <= minOptimal) {
    return Math.max(0, ((value - minRange) / (minOptimal - minRange)) * 50);
  } else if (value >= maxOptimal) {
    return Math.min(
      100,
      50 + ((value - maxOptimal) / (maxRange - maxOptimal)) * 50
    );
  } else {
    return 50 + ((value - minOptimal) / (maxOptimal - minOptimal)) * 50;
  }
}

// Map API response to Metric format
const mapSoilDataToMetrics = (data: SoilAnalysisResponse | null): Metric[] => {
  if (!data) return [];

  const metrics: Metric[] = [];

  // Nitrogen
  if (data["Nitrogen (N) [kg/ha]"] !== undefined) {
    const value = getNumericValue(data["Nitrogen (N) [kg/ha]"]);
    const level = getNitrogenLevel(value);
    const percentage = calculatePercentage(value, 280, 560, 100, 700);
    metrics.push({
      name: 'Nitrogen',
      symbol: 'N',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'kg/ha',
      range: '50 - 150',
      status: level,
      percentage,
    });
  }

  // Phosphorus
  if (data["Phosphorus (P) [kg/ha]"] !== undefined) {
    const value = getNumericValue(data["Phosphorus (P) [kg/ha]"]);
    const level = getPhosphorusLevel(value);
    const percentage = calculatePercentage(value, 22, 55, 5, 80);
    metrics.push({
      name: 'Phosphorus',
      symbol: 'P',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'kg/ha',
      range: '25 - 75',
      status: level,
      percentage,
    });
  }

  // Potassium
  if (data["Potassium (K) [kg/ha]"] !== undefined) {
    const value = getNumericValue(data["Potassium (K) [kg/ha]"]);
    const level = getPotassiumLevel(value);
    const percentage = calculatePercentage(value, 110, 280, 30, 350);
    metrics.push({
      name: 'Potassium',
      symbol: 'K',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'kg/ha',
      range: '20 - 100',
      status: level,
      percentage,
    });
  }

  // Soil pH
  if (data["SOIL REACTION (PH)"] !== undefined) {
    const value = getNumericValue(data["SOIL REACTION (PH)"]);
    const level = getPHLevel(value);
    const percentage = calculatePHPercentage(value);
    metrics.push({
      name: 'Soil pH',
      symbol: 'pH',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: '',
      range: '6.5 - 7.5',
      status: level,
      percentage,
    });
  }

  // CEC
  if (data["CATION EXCHANGE CAPACITY (CEC) [C mol/kg]"] !== undefined) {
    const value = getNumericValue(data["CATION EXCHANGE CAPACITY (CEC) [C mol/kg]"]);
    const level = getCECLevel(value);
    const percentage = calculatePercentage(value, 10, 25, 3, 35);
    metrics.push({
      name: 'CEC',
      symbol: 'CEC',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'C mol/kg',
      range: '10 - 25',
      status: level,
      percentage,
    });
  }

  // Iron (Fe)
  if (data["Iron (Fe) [ppm]"] !== undefined) {
    const value = getNumericValue(data["Iron (Fe) [ppm]"]);
    const level = getFeLevel(value);
    const percentage = calculatePercentage(value, 4, 6, 1, 10);
    metrics.push({
      name: 'Fe',
      symbol: 'Fe',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'ppm',
      range: '4 - 6',
      status: level,
      percentage,
    });
  }

  // Zinc
  if (data["Zinc (Zn) [ppm]"] !== undefined) {
    const value = getNumericValue(data["Zinc (Zn) [ppm]"]);
    const level = getZnLevel(value);
    const percentage = calculatePercentage(value, 0.6, 1.0, 0.1, 1.5);
    metrics.push({
      name: 'Zinc',
      symbol: 'Zn',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'ppm',
      range: '0.6 - 1.0',
      status: level,
      percentage,
    });
  }

  // Soil Organic Carbon
  if (data["Soil Organic Carbon (SOC) [%]"] !== undefined) {
    const value = getNumericValue(data["Soil Organic Carbon (SOC) [%]"]);
    const level = getSOCLevel(value);
    const percentage = calculatePercentage(value, 0.75, 1.0, 0.2, 1.5);
    metrics.push({
      name: 'Soil Organic Carbon',
      symbol: 'SOC',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: '%',
      range: '0.75 - 1.0',
      status: level,
      percentage,
    });
  }

  // Organic Carbon Stock
  if (data["ORGANIC CARBON STOCK (OCS) [T/Ha]"] !== undefined) {
    const value = getNumericValue(data["ORGANIC CARBON STOCK (OCS) [T/Ha]"]);
    const level = getOCSLevel(value);
    const percentage = calculatePercentage(value, 25, 50, 5, 65);
    metrics.push({
      name: 'Organic Carbon Stock',
      symbol: 'OCS',
      value: value !== null ? value.toFixed(2) : 'Not Available',
      unit: 'T/ha',
      range: '25 - 50',
      status: level,
      percentage,
    });
  }

  // Clay
  if (data["CLAY CONTENT (CLAY) [%]"] !== undefined) {
    const value = data["CLAY CONTENT (CLAY) [%]"];
    metrics.push({
      name: 'Clay',
      symbol: 'CLAY',
      value: value.toFixed(2),
      unit: '%',
      status: 'Optimal',
      percentage: 45,
    });
  }

  // Sand
  if (data["SAND CONTENT (SAND) [%]"] !== undefined) {
    const value = data["SAND CONTENT (SAND) [%]"];
    metrics.push({
      name: 'Sand',
      symbol: 'SAND',
      value: value.toFixed(2),
      unit: '%',
      status: 'Optimal',
      percentage: 45,
    });
  }

  // Silt
  if (data["SILT CONTENT (SILT) [%]"] !== undefined) {
    const value = data["SILT CONTENT (SILT) [%]"];
    metrics.push({
      name: 'Silt',
      symbol: 'SILT',
      value: value.toFixed(2),
      unit: '%',
      status: 'Optimal',
      percentage: 45,
    });
  }

  return metrics;
};

export const SoilAnalysis: React.FC = () => {
  const { selectedPlotName } = useAppContext();
  const [soilData, setSoilData] = useState<SoilAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch soil analysis data
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if "All" is selected or no plot is selected
      if (!selectedPlotName || selectedPlotName === 'All') {
        setLoading(false);
        setSoilData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Calculate date range (3 months back from today)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const data = await fetchSoilAnalysis(selectedPlotName, startDateStr, endDateStr);
        setSoilData(data);
      } catch (err: any) {
        // Only show error if it's not a plot not found error
        const errorMessage = err.message || 'Failed to fetch soil analysis data';
        if (errorMessage.includes('not found') || errorMessage.includes('Plot')) {
          // Don't show plot not found errors - just log quietly
          setError(null);
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPlotName]);

  const metrics = mapSoilDataToMetrics(soilData);
  
  // Define all expected metrics to show empty cards for missing ones
  const allExpectedMetrics = [
    { name: 'Nitrogen', symbol: 'N', key: 'nitrogen' },
    { name: 'Phosphorus', symbol: 'P', key: 'phosphorus' },
    { name: 'Potassium', symbol: 'K', key: 'potassium' },
    { name: 'Soil pH', symbol: 'pH', key: 'ph' },
    { name: 'CEC', symbol: 'CEC', key: 'cec' },
    { name: 'Fe', symbol: 'Fe', key: 'fe' },
    { name: 'Zinc', symbol: 'Zn', key: 'zinc' },
    { name: 'Soil Organic Carbon', symbol: 'SOC', key: 'soc' },
    { name: 'Organic Carbon Stock', symbol: 'OCS', key: 'ocs' },
    { name: 'Clay', symbol: 'CLAY', key: 'clay' },
    { name: 'Sand', symbol: 'SAND', key: 'sand' },
    { name: 'Silt', symbol: 'SILT', key: 'silt' },
  ];
  
  // Merge expected metrics with actual data, showing empty cards for missing ones
  const allMetrics = allExpectedMetrics.map(expected => {
    const found = metrics.find(m => m.name === expected.name || m.symbol === expected.symbol);
    if (found) return found;
    // Return empty metric card
    return {
      name: expected.name,
      symbol: expected.symbol,
      value: 'N/A',
      unit: '',
      status: 'Medium' as const,
      percentage: 0,
    };
  });

  return (
    <div className="bg-[#f8f9fa] rounded-[2rem] p-4 md:p-5 pb-3 shadow-2xl border border-gray-100 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-gray-600 tracking-tight">Soil Analysis Report</h2>
          <span className="bg-[#dbeafe] text-[#2563eb] px-2 py-1 rounded-lg text-xs font-bold">
            Plot: {soilData?.["Plot Name"] || selectedPlotName}
          </span>
        </div>
      </div>

      {/* Show message when "All" is selected */}
      {selectedPlotName === 'All' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Please select a specific plot
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Soil analysis data is plot-specific. Please select a plot from the map dropdown to view its soil analysis report.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && selectedPlotName !== 'All' && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && selectedPlotName !== 'All' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Horizontal Bar Chart Section - Wrapped to match cards grid */}
      {!loading && !error && selectedPlotName !== 'All' && allMetrics.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="col-span-3">
            <HorizontalBarChart metrics={allMetrics.filter(m => m.range)} />
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && !error && selectedPlotName !== 'All' && allMetrics.length > 0 && (
        <div className="flex items-center justify-center gap-2 flex-wrap my-2 mb-3">
          {Object.entries(STATUS_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: color }}></div>
              <span className="text-[10px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Details Grid - Show all 12 cards */}
      {!loading && !error && selectedPlotName !== 'All' && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {allMetrics.map((metric, idx) => (
            <MetricCard key={idx} metric={metric} />
          ))}
        </div>
      )}

      {/* No Data Message */}
      {!loading && !error && selectedPlotName !== 'All' && metrics.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-semibold">No soil analysis data available</p>
        </div>
      )}

      {/* Footer
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
        <span>Updated: {new Date().toLocaleDateString()}</span>
        <span>IT AI SOLUTIONS</span>
      </div> */}
    </div>
  );
};
