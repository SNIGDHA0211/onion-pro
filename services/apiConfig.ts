/**
 * API Base URL Configuration
 * Ensures all API URLs use HTTPS protocol
 */

// Ensure HTTPS protocol is always used
const ensureHttps = (url: string): string => {
  // If URL already has a protocol, ensure it's HTTPS
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  // If URL doesn't have a protocol, add HTTPS
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return `https://${url}`;
  }
  return url;
};

// Base URL for FastAPI Soil Service
export const SOIL_SERVICE_BASE_URL = ensureHttps('https://fastapi-soil-service-production.up.railway.app');

// Base URL for Weather Service
export const WEATHER_SERVICE_BASE_URL = ensureHttps('https://dev-weather.cropeye.ai');

