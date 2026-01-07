import { SOIL_SERVICE_BASE_URL } from './apiConfig';

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties?: {
    plot_name?: string;
    [key: string]: any;
  };
}

export interface PlotsResponse {
  type: string;
  source_file: string;
  total_plots: number;
  features: GeoJSONFeature[];
}

export const fetchPlots = async (): Promise<PlotsResponse> => {
  const response = await fetch(
    `${SOIL_SERVICE_BASE_URL}/plots/list?file_path=plots.geojson`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch plots: ${response.statusText}`);
  }

  return response.json();
};

export const extractPlotNames = (data: PlotsResponse): string[] => {
  return data.features.map((feature, index) => {
    // Try to get plot_name from properties, otherwise use index-based name
    return feature.properties?.plot_name || `Plot_${index + 1}`;
  });
};

// Fetch plot names from the simple plots endpoint
export const fetchPlotNames = async (): Promise<string[]> => {
  const response = await fetch(
    `${SOIL_SERVICE_BASE_URL}/plots?file_path=plots.geojson`,
    {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch plot names: ${response.statusText}`);
  }

  const plotNames = await response.json();
  console.log('Available plot names from API:', plotNames);
  return plotNames;
};

