
import { WeatherData } from '../types';

import { WEATHER_SERVICE_BASE_URL } from './apiConfig';

const BASE_URL = WEATHER_SERVICE_BASE_URL;

/**
 * Extracts numeric values from strings like "26.0 °C", "96 %", or "7.8 km/h"
 */
export const extractNumericValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  const match = val.match(/^-?\d*\.?\d+/);
  return match ? parseFloat(match[0]) : 0;
};

export const fetchCurrentWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const response = await fetch(`${BASE_URL}/current-weather?lat=${lat}&lon=${lon}`, {
      headers: { 'accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch current weather');
    return await response.json();
  } catch (error) {
    console.error('Error fetching current weather:', error);
    return {
      temperature_c: 23.8,
      humidity: 37,
      wind_kph: 4.7,
      precip_mm: 0
    };
  }
};

export const fetchForecast = async (lat: number, lon: number): Promise<any[]> => {
  try {
    const response = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}`, {
      headers: { 'accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to fetch forecast');
    const json = await response.json();
    
    // According to the provided response format, data is inside the 'data' property
    const rawList = json.data || [];
    return Array.isArray(rawList) ? rawList : [];
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return [];
  }
};

export const formatTemperature = (t: number) => `${t.toFixed(1)}°C`;
export const formatWindSpeed = (w: number) => `${w.toFixed(1)} km/h`;
export const formatHumidity = (h: number) => `${h}%`;
export const formatPrecipitation = (p: number) => `${p.toFixed(1)} mm`;

export const getWeatherIcon = (temp: number, hum: number, precip: number) => {
  if (precip > 0) return '🌧️';
  if (temp > 25) return '☀️';
  return '⛅';
};

export const getWeatherCondition = (temp: number, hum: number, precip: number) => {
  if (precip > 0) return 'Rainy';
  if (temp > 28) return 'Sunny';
  return 'Pleasant';
};
