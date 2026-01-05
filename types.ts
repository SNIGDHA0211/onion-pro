
export interface WeatherData {
  temperature_c: number;
  humidity: number;
  precip_mm: number;
  wind_kph: number;
  condition?: string;
}

export interface PlotData {
  id: string;
  name: string;
  size: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface AppState {
  weatherChartData: any[];
  weatherSelectedDay: any;
  selectedPlot: string;
}
