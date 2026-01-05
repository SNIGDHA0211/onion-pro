
import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CloudRain,
  Wind,
  ThermometerSun,
  Cloud,
  RefreshCw,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { fetchForecast, extractNumericValue } from "../services/weatherService";

interface WeatherForecastProps {
  lat?: number;
  lon?: number;
}

const WeatherForecast: React.FC<WeatherForecastProps> = ({ 
  lat: propLat, 
  lon: propLon 
}) => {
  const { appState, setAppState } = useAppContext();
  const chartData = appState.weatherChartData || [];
  const selectedDay = appState.weatherSelectedDay || null;
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isNarrow = viewportWidth <= 425;
  const isMobile = viewportWidth <= 768;
  const chartMargin = isNarrow ? { top: 4, right: 6, left: 0, bottom: -5 } : isMobile ? { top: 6, right: 10, left: 5, bottom: -3 } : { top: 20, right: 30, left: 20, bottom: 5 };

  const lat = propLat || 20.008514744233374;
  const lon = propLon || 73.95377087911103;

  const loadForecast = async () => {
    setLoading(true);
    const rawList = await fetchForecast(lat, lon);
    
    // User requested: tomorrow to next 6 days (slice(1, 8))
    const days = rawList.slice(1, 8).map((d: any) => {
      const dateStr = d.date || d.Date;
      const dateObj = new Date(dateStr);
      return {
        date: isNaN(dateObj.getTime()) ? dateStr : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        temperature: extractNumericValue(d.temperature_max),
        humidity: extractNumericValue(d.humidity_max),
        rainfall: extractNumericValue(d.precipitation),
        wind: extractNumericValue(d.wind_speed_max),
        fullDate: dateStr,
      };
    });

    if (days.length > 0) {
      setAppState((prev: any) => ({
        ...prev,
        weatherChartData: days,
        weatherSelectedDay: days[0],
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadForecast();
  }, [lat, lon]);

  const currentWeather = selectedDay || chartData[0];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm"><span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-2"></span>Temperature: {Number(data.temperature).toFixed(1)}°C</p>
            <p className="text-sm"><span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>Rainfall: {Number(data.rainfall).toFixed(1)} mm</p>
            <p className="text-sm"><span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>Wind: {Number(data.wind).toFixed(1)} km/h</p>
            <p className="text-sm"><span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>Humidity: {Number(data.humidity).toFixed(1)}%</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleChartClick = (data: any) => {
    if (data && data.activePayload) {
      setAppState((prev: any) => ({
        ...prev,
        weatherSelectedDay: data.activePayload[0].payload,
      }));
    }
  };

  if (loading && !chartData.length) {
    return <div className="p-12 flex items-center justify-center space-x-2 text-blue-600 font-bold"><RefreshCw className="animate-spin" /> <span>Fetching forecast...</span></div>;
  }

  if (!chartData.length) {
    return <div className="p-8 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">No forecast data available.</div>;
  }

  return (
    <div className="w-full">
      <div className="w-full space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'temperature', icon: ThermometerSun, val: currentWeather.temperature, unit: '°C', label: 'Temperature', color: 'bg-amber-600', hover: 'bg-amber-50', activeColor: 'ring-amber-400' },
            { id: 'rainfall', icon: CloudRain, val: currentWeather.rainfall, unit: ' mm', label: 'Rainfall', color: 'bg-blue-700', hover: 'bg-blue-50', activeColor: 'ring-blue-400' },
            { id: 'wind', icon: Wind, val: currentWeather.wind, unit: ' km/h', label: 'Wind Speed', color: 'bg-green-700', hover: 'bg-green-50', activeColor: 'ring-green-400' },
            { id: 'humidity', icon: Cloud, val: currentWeather.humidity, unit: '%', label: 'Humidity', color: 'bg-indigo-800', hover: 'bg-indigo-50', activeColor: 'ring-indigo-400' }
          ].map(metric => (
            <div
              key={metric.id}
              onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg ${
                selectedMetric === metric.id ? `${metric.color} ring-2 ${metric.activeColor} text-white` : `bg-white text-gray-700 hover:${metric.hover}`
              }`}
            >
              <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:space-x-3">
                <metric.icon className="w-6 h-6 mb-1 sm:mb-0" />
                <div>
                  <div className="font-bold text-xl">{Number(metric.val).toFixed(1)}{metric.unit}</div>
                  <div className="text-[10px] uppercase font-bold opacity-75">{metric.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Chart */}
        <div className="bg-white rounded-3xl shadow-xl p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">7-Day Forecast</h3>
            <button
              onClick={() => { setSelectedMetric(null); loadForecast(); }}
              className={`p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition shadow-sm ${loading ? 'animate-spin' : ''}`}
              title="Refresh forecast"
            >
              <RefreshCw size={18} className="text-blue-500" />
            </button>
          </div>

          <div className="w-full h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={chartMargin as any} onClick={handleChartClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                
                <Bar 
                  dataKey="temperature" fill="#f59e0b" name="Temp (°C)" barSize={isMobile ? 20 : 45} radius={[6, 6, 0, 0]}
                  opacity={selectedMetric && selectedMetric !== "temperature" ? 0.2 : 1}
                />
                <Bar 
                  dataKey="rainfall" fill="#3b82f6" name="Rain (mm)" barSize={isMobile ? 15 : 35} radius={[6, 6, 0, 0]}
                  opacity={selectedMetric && selectedMetric !== "rainfall" ? 0.2 : 1}
                />
                <Line 
                  type="monotone" dataKey="wind" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Wind (km/h)"
                  opacity={selectedMetric && selectedMetric !== "wind" ? 0.2 : 1}
                />
                <Line 
                  type="monotone" dataKey="humidity" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Humidity (%)"
                  opacity={selectedMetric && selectedMetric !== "humidity" ? 0.2 : 1}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherForecast;
