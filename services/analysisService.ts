export interface PixelSummary {
  less_pixel_count?: number;
  less_pixel_percentage?: number;
  less_pixel_coordinates?: number[][];
  adequate_pixel_count?: number;
  adequate_pixel_percentage?: number;
  adequate_pixel_coordinates?: number[][];
  excellent_pixel_count?: number;
  excellent_pixel_percentage?: number;
  excellent_pixel_coordinates?: number[][];
  excess_pixel_count?: number;
  excess_pixel_percentage?: number;
  excess_pixel_coordinates?: number[][];
  shallow_water_pixel_count?: number;
  shallow_water_pixel_percentage?: number;
  shallow_water_pixel_coordinates?: number[][];
  deficient_pixel_count?: number;
  deficient_pixel_percentage?: number;
  deficient_pixel_coordinates?: number[][];
  weak_pixel_count?: number;
  weak_pixel_percentage?: number;
  weak_pixel_coordinates?: number[][];
  stress_pixel_count?: number;
  stress_pixel_percentage?: number;
  stress_pixel_coordinates?: number[][];
  moderate_pixel_count?: number;
  moderate_pixel_percentage?: number;
  moderate_pixel_coordinates?: number[][];
  healthy_pixel_count?: number;
  healthy_pixel_percentage?: number;
  healthy_pixel_coordinates?: number[][];
  chewing_pixel_count?: number;
  chewing_pixel_percentage?: number;
  chewing_pixel_coordinates?: number[][];
  chewing_affected_pixel_count?: number;
  chewing_affected_pixel_percentage?: number;
  chewing_affected_pixel_coordinates?: number[][];
  sucking_pixel_count?: number;
  sucking_pixel_percentage?: number;
  sucking_pixel_coordinates?: number[][];
  sucking_affected_pixel_count?: number;
  sucking_affected_pixel_percentage?: number;
  sucking_affected_pixel_coordinates?: number[][];
  fungi_pixel_count?: number;
  fungi_pixel_percentage?: number;
  fungi_pixel_coordinates?: number[][];
  fungi_affected_pixel_count?: number;
  fungi_affected_pixel_percentage?: number;
  fungi_affected_pixel_coordinates?: number[][];
  soil_borne_pixel_count?: number;
  soil_borne_pixel_percentage?: number;
  soil_borne_pixel_coordinates?: number[][];
  SoilBorne_affected_pixel_count?: number;
  SoilBorne_affected_pixel_percentage?: number;
  SoilBorne_affected_pixel_coordinates?: number[][];
  SoilBorn_affected_pixel_count?: number;
  SoilBorn_affected_pixel_percentage?: number;
  SoilBorn_affected_pixel_coordinates?: number[][];
  adequat_pixel_count?: number;
  adequat_pixel_percentage?: number;
  adequat_pixel_coordinates?: number[][];
}

export interface AnalysisResponse {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: number[][][];
    };
    properties?: {
      plot_name?: string;
      [key: string]: any;
    };
  }>;
  tile_url?: string;
  pixel_summary?: PixelSummary;
}

const BASE_URL = 'https://fastapi-soil-service-production.up.railway.app';

export const fetchGrowthAnalysis = async (plotName: string): Promise<AnalysisResponse> => {
  const response = await fetch(
    `${BASE_URL}/analyze_Growth?plot_name=${encodeURIComponent(plotName)}&file_path=plots.geojson`,
    {
      method: 'POST',
      headers: {
        'accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch growth analysis: ${response.statusText}`);
  }

  return response.json();
};

export const fetchSoilMoisture = async (plotName: string, endDate: string = '2026-01-01'): Promise<AnalysisResponse> => {
  const response = await fetch(
    `${BASE_URL}/SoilMoisture?plot_name=${encodeURIComponent(plotName)}&end_date=${endDate}&file_path=plots.geojson`,
    {
      method: 'POST',
      headers: {
        'accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch soil moisture: ${response.statusText}`);
  }

  return response.json();
};

export const fetchWaterUptake = async (plotName: string, endDate: string = '2026-01-01'): Promise<AnalysisResponse> => {
  const response = await fetch(
    `${BASE_URL}/wateruptake?plot_name=${encodeURIComponent(plotName)}&end_date=${endDate}&file_path=plots.geojson`,
    {
      method: 'POST',
      headers: {
        'accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch water uptake: ${response.statusText}`);
  }

  return response.json();
};

export const fetchPestDetection = async (plotName: string, endDate: string = '2026-01-01'): Promise<AnalysisResponse> => {
  const response = await fetch(
    `${BASE_URL}/pest-detection?plot_name=${encodeURIComponent(plotName)}&end_date=${endDate}&file_path=plots.geojson`,
    {
      method: 'POST',
      headers: {
        'accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch pest detection: ${response.statusText}`);
  }

  return response.json();
};

export interface SoilAnalysisResponse {
  "Plot Name": string;
  "Nitrogen (N) [kg/ha]": number;
  "Phosphorus (P) [kg/ha]": number;
  "Potassium (K) [kg/ha]": number;
  "BULK DENSITY (BDOD) [cg/cm³]": number;
  "CATION EXCHANGE CAPACITY (CEC) [C mol/kg]": number;
  "CLAY CONTENT (CLAY) [%]": number;
  "ORGANIC CARBON STOCK (OCS) [T/Ha]": number;
  "SOIL REACTION (PH)": number;
  "SAND CONTENT (SAND) [%]": number;
  "SILT CONTENT (SILT) [%]": number;
  "Zinc (Zn) [ppm]": number;
  "Soil Organic Carbon (SOC) [%]": number;
  "Iron (Fe) [ppm]": number;
}

export const fetchSoilAnalysis = async (
  plotName: string,
  startDate: string = '2025-11-01',
  endDate: string = '2026-01-01'
): Promise<SoilAnalysisResponse> => {
  const url = `${BASE_URL}/process_plot?plot_name=${encodeURIComponent(plotName)}&start_date=${startDate}&end_date=${endDate}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit',
      headers: {
        'accept': 'application/json',
      },
      // Note: Not setting body at all, let browser handle empty POST body
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('Soil analysis API error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        errorText,
      });
      
      // Handle 502 Bad Gateway - filter out HTML error page
      if (response.status === 502 || errorText.includes('<html>') || errorText.includes('Bad Gateway')) {
        throw new Error('Backend service is temporarily unavailable. Please try again in a few moments.');
      }
      
      throw new Error(`Failed to fetch soil analysis: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Error in fetchSoilAnalysis:', {
      error,
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      url,
      plotName,
      startDate,
      endDate,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch soil analysis';
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      // Check for CORS error specifically
      if (error?.message?.includes('CORS') || error?.message?.includes('cors')) {
        errorMessage = 'CORS error: Backend server is not allowing requests from this origin. Please check CORS configuration on the server.';
      } else {
        errorMessage = 'Cannot connect to server. Please check if the backend service is running and accessible.';
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

