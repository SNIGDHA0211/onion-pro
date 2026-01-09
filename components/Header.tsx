
import React, { useEffect, useState } from 'react';
import { Cloud, Thermometer, Wind, Droplet, MapPin, LogOut, Home } from 'lucide-react';
import { 
  fetchCurrentWeather, 
  formatTemperature, 
  formatWindSpeed, 
  formatHumidity, 
  getWeatherIcon, 
  getWeatherCondition,
  formatPrecipitation
} from '../services/weatherService';
import { WeatherData } from '../types';

type Page = 'home' | 'irrigation';

interface HeaderProps {
  onLogout: () => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, currentPage, setCurrentPage }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const LAT = 20.008514744233374;
  const LON = 73.95377087911103;

  useEffect(() => {
    fetchCurrentWeather(LAT, LON).then(data => {
      setWeather(data);
    });
  }, []);

  const WeatherItem = () => (
    <div className="flex items-center space-x-6 px-4">
      {weather && (
        <>
          <div className="flex items-center bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            <MapPin size={14} className="mr-1.5" />
            { (weather as any).location || 'Ojhar' }
          </div>
          <div className="flex items-center bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            <span className="mr-1.5">{getWeatherIcon(weather.temperature_c, weather.humidity, weather.precip_mm)}</span>
            {getWeatherCondition(weather.temperature_c, weather.humidity, weather.precip_mm)}
          </div>
          <div className="flex items-center bg-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            <Thermometer size={14} className="mr-1.5" />
            {formatTemperature(weather.temperature_c)}
          </div>
          <div className="flex items-center bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            <Cloud size={14} className="mr-1.5" />
            {formatHumidity(weather.humidity)}
          </div>
          <div className="flex items-center bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            <Wind size={14} className="mr-1.5" />
            {formatWindSpeed(weather.wind_kph)}
          </div>
          <div className="flex items-center bg-blue-400 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">
            <Droplet size={14} className="mr-1.5" />
            {formatPrecipitation(weather.precip_mm)}
          </div>
        </>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-blue-50/80 backdrop-blur-md border-b border-blue-100 shadow-sm h-16 flex items-center px-6 overflow-hidden">
      <div className="flex items-center space-x-2 mr-4">
        <button
          onClick={() => setCurrentPage('home')}
          className={`p-2 rounded transition-all ${
            currentPage === 'home'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100 bg-white'
          }`}
          title="Home"
        >
          <Home size={20} />
        </button>
        <button
          onClick={() => setCurrentPage('irrigation')}
          className={`p-2 rounded transition-all ${
            currentPage === 'irrigation'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100 bg-white'
          }`}
          title="Irrigation"
        >
          <Droplet size={20} />
        </button>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-sm transition-colors shadow-sm mr-4"
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>
      <div className="flex-grow overflow-hidden relative">
        <div className="animate-marquee">
          <div className="flex py-2">
            <WeatherItem />
            <WeatherItem />
            <WeatherItem />
            <WeatherItem />
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center">
        <img 
          src="/CROPEYE Updated.png" 
          alt="CROPEYE Logo" 
          className="h-12 w-auto object-contain"
        />
      </div>
    </header>
  );
};
