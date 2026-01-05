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
    'https://fastapi-soil-service-production.up.railway.app/plots/list?file_path=plots.geojson',
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

