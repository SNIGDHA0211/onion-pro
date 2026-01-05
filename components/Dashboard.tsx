
import React from 'react';
import { MapPlot } from './MapPlot';
import { SoilAnalysis } from './SoilAnalysis';
import WeatherForecast from './WeatherForecast';

export const Dashboard: React.FC = () => {
  return (
    <main className="p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto">
      {/* Row 1: Map & Soil Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <MapPlot />
        </div>
        <div className="lg:col-span-4">
          <SoilAnalysis />
        </div>
      </div>

      {/* Row 2: Weather Forecast */}
      <div className="w-full">
        <WeatherForecast />
      </div>
    </main>
  );
};
