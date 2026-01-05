import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPlots, extractPlotNames, PlotsResponse, GeoJSONFeature } from '../services/plotsService';
import { 
  fetchGrowthAnalysis, 
  fetchSoilMoisture, 
  fetchWaterUptake, 
  fetchPestDetection,
  AnalysisResponse,
  PixelSummary 
} from '../services/analysisService';
import { useAppContext } from '../context/AppContext';

// Fix for default markers in Leaflet with Vite
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface LegendItem {
  label: string;
  value: number;
  color: string;
}

// Component to update map view when selected plot changes
const MapUpdater: React.FC<{ selectedId: string | null; geojson: any; plotsData: PlotsResponse | null }> = ({ selectedId, geojson, plotsData }) => {
  const map = useMap();

  const getPlotNameFromFeature = (feature: any, index: number): string => {
    if (feature.properties?.plot_name) return feature.properties.plot_name;
    if (feature.properties?.name) return feature.properties.name;
    if (feature.properties?.id) return feature.properties.id;
    return `Plot_${index + 1}`;
  };

  // Invalidate map size on mount and window resize to ensure tiles load
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {
        console.error('Error invalidating map size:', e);
      }
    }, 100);

    // Handle window resize
    const handleResize = () => {
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (e) {
          // Ignore
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (selectedId && selectedId !== 'All' && geojson && geojson.features && map) {
      const selectedFeature = geojson.features.find((f: GeoJSONFeature, index: number) => {
        const plotName = getPlotNameFromFeature(f, index);
        return plotName === selectedId;
      });

      if (selectedFeature && selectedFeature.geometry) {
        const geoJsonLayer = L.geoJSON(selectedFeature.geometry as any);
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
        }
      }
    } else if (selectedId === 'All' && geojson && geojson.features && map && geojson.features.length > 0) {
      // Fit bounds to show all plots
      const geoJsonLayer = L.geoJSON(geojson as any);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    }
  }, [selectedId, geojson, map, plotsData]);

  return null;
};

// Wrapper component to handle map lifecycle properly
const MapWrapper: React.FC<{
  geojson: any;
  selectedPlot: string;
  plotsData: PlotsResponse | null;
  styleFeature: (feature: any) => any;
  onEachFeature: (feature: any, layer: any) => void;
  tileUrl?: string;
  pixelCoordinates?: number[][];
  selectedLegendLabel?: string | null;
}> = ({ geojson, selectedPlot, plotsData, styleFeature, onEachFeature, tileUrl, pixelCoordinates = [], selectedLegendLabel = null }) => {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const containerIdRef = useRef<string>('');

  // Generate unique ID for this map instance - only once
  const mapId = useMemo(() => {
    const id = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    containerIdRef.current = id;
    return id;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (mapInstanceRef.current) {
      try {
        const map = mapInstanceRef.current;
        map.off();
        map.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
      mapInstanceRef.current = null;
    }
    
    if (containerRef.current) {
      const container = containerRef.current;
      // Remove any Leaflet containers
      const leafletContainers = container.querySelectorAll('.leaflet-container');
      leafletContainers.forEach((el) => {
        try {
          const leafletId = (el as any)._leaflet_id;
          if (leafletId && typeof window !== 'undefined' && L) {
            // Access Leaflet's internal map registry
            const mapInstance = (L.Map as any).instances?.[leafletId];
            if (mapInstance) {
              try {
                mapInstance.off();
                mapInstance.remove();
              } catch (e) {
                // Ignore
              }
            }
          }
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        } catch (e) {
          // Ignore
        }
      });
      
      // Clear all children
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
    
    initializedRef.current = false;
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleMapCreated = useCallback((map: L.Map) => {
    // If we already have a map instance, destroy the new one (StrictMode double mount)
    if (initializedRef.current && mapInstanceRef.current) {
      try {
        map.off();
        map.remove();
      } catch (e) {
        // Ignore
      }
      return;
    }
    
    mapInstanceRef.current = map;
    initializedRef.current = true;
    
    // Invalidate map size to ensure tiles load properly - multiple attempts
    const invalidateSize = () => {
      try {
        if (map && containerRef.current) {
          map.invalidateSize();
          // Force a view reset to ensure tiles load
          const center = map.getCenter();
          const zoom = map.getZoom();
          if (center && zoom) {
            map.setView(center, zoom, { animate: false });
          }
          // Force tile refresh
          map.eachLayer((layer: any) => {
            if (layer.refresh) {
              layer.refresh();
            }
          });
        }
      } catch (e) {
        console.error('Error invalidating map size:', e);
      }
    };
    
    // Try multiple times to ensure it works
    setTimeout(invalidateSize, 50);
    setTimeout(invalidateSize, 200);
    setTimeout(invalidateSize, 500);
    setTimeout(invalidateSize, 1000);
  }, []);

  // Container ref callback to ensure we have a fresh element
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // Only clean up if there's an existing Leaflet container
      const existingContainer = node.querySelector('.leaflet-container');
      if (existingContainer) {
        // Clean up existing map
        const leafletId = (existingContainer as any)._leaflet_id;
        if (leafletId && typeof window !== 'undefined' && L) {
          const mapInstance = (L.Map as any).instances?.[leafletId];
          if (mapInstance) {
            try {
              mapInstance.off();
              mapInstance.remove();
            } catch (e) {
              // Ignore
            }
          }
        }
        // Only remove if it's not the active container
        if (existingContainer.parentNode === node && existingContainer !== node.firstChild) {
          existingContainer.parentNode.removeChild(existingContainer);
        }
      }
    }
    containerRef.current = node;
  }, []);

  return (
    <div 
      ref={setContainerRef}
      id={mapId}
      className="w-full h-full"
      key={mapId}
      style={{ height: "100%", width: "100%", position: "relative", minHeight: "250px" }}
    >
      <MapContainer
        key={mapId}
        center={[17.4, 78.4]}
        zoom={15}
        minZoom={10}
        maxZoom={20}
        style={{ height: "100%", width: "100%", zIndex: 0, minHeight: "250px" }}
        zoomControl={false}
        whenCreated={handleMapCreated}
        scrollWheelZoom={true}
      >
        {/* Always show base map first */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          attribution="© Google"
          maxZoom={22}
          minZoom={1}
          maxNativeZoom={22}
          tileSize={256}
          zoomOffset={0}
          crossOrigin={true}
          eventHandlers={{
            tileerror: (e: any) => {
              console.warn('Google tile loading error:', e);
            },
          }}
        />
        {/* Show analysis tiles on top if available */}
        {tileUrl && selectedPlot !== 'All' && tileUrl.includes('{z}') && tileUrl.includes('{x}') && tileUrl.includes('{y}') && (
          <TileLayer
            url={tileUrl}
            attribution='&copy; Analysis Tiles'
            maxZoom={22}
            minZoom={10}
            maxNativeZoom={22}
            tileSize={256}
            zoomOffset={0}
            crossOrigin={true}
            opacity={0.8}
            eventHandlers={{
              tileerror: (e: any) => {
                console.warn('Analysis tile loading error:', e);
              },
            }}
          />
        )}
        <MapUpdater selectedId={selectedPlot} geojson={geojson} plotsData={plotsData} />
        <GeoJSON
          data={geojson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
        {/* Display pixel circles when legend is clicked */}
        {pixelCoordinates && pixelCoordinates.length > 0 && pixelCoordinates.map((coord, idx) => {
          // Coordinates are typically [lng, lat]
          if (!Array.isArray(coord) || coord.length < 2) return null;
          const [lng, lat] = coord;
          if (isNaN(lat) || isNaN(lng)) return null;
          
          return (
            <Circle
              key={`pixel-${selectedLegendLabel || 'unknown'}-${idx}`}
              center={[lat, lng]}
              radius={2}
              pathOptions={{
                fillColor: '#FFFFFF',
                fillOpacity: 1,
                color: '#FFFFFF',
                weight: 1,
                opacity: 1,
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

export const MapPlot: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Growth');
  const [plotsData, setPlotsData] = useState<PlotsResponse | null>(null);
  const [plotNames, setPlotNames] = useState<string[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [tileUrl, setTileUrl] = useState<string | undefined>(undefined);
  const [pixelSummary, setPixelSummary] = useState<PixelSummary | undefined>(undefined);
  const [selectedLegendLabel, setSelectedLegendLabel] = useState<string | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON>(null);
  const { setSelectedPlotName } = useAppContext();

  const tabs = ['Growth', 'Water Uptake', 'Soil Moisture', 'Pest'];

  // Ensure component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch plots data on component mount
  useEffect(() => {
    const loadPlots = async () => {
      try {
        setLoading(true);
        const data = await fetchPlots();
        setPlotsData(data);
        const names = extractPlotNames(data);
        setPlotNames(names);
        // Set default to "All" to show all plots
        setSelectedPlot('All');
        setSelectedPlotName('All');
        // Force map remount after data is loaded
        setMapInstanceKey(prev => prev + 1);
      } catch (error) {
        console.error('Error fetching plots:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlots();
  }, [setSelectedPlotName]);

  // Handle plot selection change
  const handlePlotChange = (plotName: string) => {
    setSelectedPlot(plotName);
    setSelectedPlotName(plotName);
    // Clear analysis data when switching to "All" or changing plot
    if (plotName === 'All') {
      setAnalysisData(null);
      setTileUrl(undefined);
      setPixelSummary(undefined);
    }
    // Clear selected legend when changing plot
    setSelectedLegendLabel(null);
  };

  // Fetch analysis data when tab or plot changes
  useEffect(() => {
    if (!selectedPlot || !isMounted || selectedPlot === 'All') return;

    const fetchAnalysis = async () => {
      try {
        setAnalysisLoading(true);
        let response: AnalysisResponse;

        switch (activeTab) {
          case 'Growth':
            response = await fetchGrowthAnalysis(selectedPlot);
            break;
          case 'Soil Moisture':
            response = await fetchSoilMoisture(selectedPlot);
            break;
          case 'Water Uptake':
            response = await fetchWaterUptake(selectedPlot);
            break;
          case 'Pest':
            response = await fetchPestDetection(selectedPlot);
            break;
          default:
            response = await fetchGrowthAnalysis(selectedPlot);
        }

        setAnalysisData(response);
        
        // Extract tile_url from response - check multiple possible locations (same as reference code)
        const extractTileUrl = (data: any): string | null => {
          if (!data || typeof data !== 'object') return null;
          
          // Common paths - check multiple locations
          const candidates = [
            data?.tile_url,
            data?.features?.[0]?.properties?.tile_url,
            data?.features?.[0]?.properties?.tileURL,
            data?.features?.[0]?.properties?.tileServerUrl,
            data?.features?.[0]?.properties?.tiles,
            data?.properties?.tile_url,
            (data as any).tileURL,
            (data as any).tileServerUrl,
            (data as any).tiles,
          ].filter(Boolean);
          
          // If tiles is an array, pick first
          for (const c of candidates) {
            if (Array.isArray(c) && c.length > 0) {
              return typeof c[0] === 'string' ? c[0] : null;
            }
            if (typeof c === 'string') {
              return c;
            }
          }
          return null;
        };
        
        let extractedTileUrl = extractTileUrl(response);
        
        // Validate tile template contains placeholders
        if (extractedTileUrl && (!extractedTileUrl.includes('{z}') || !extractedTileUrl.includes('{x}') || !extractedTileUrl.includes('{y}'))) {
          console.warn(`[MapPlot] tile_url missing template placeholders:`, extractedTileUrl);
          extractedTileUrl = null;
        }
        
        // Note: Google Earth Engine uses {z}/{x}/{y} format
        // Leaflet's TileLayer can handle this format directly for Google Earth Engine tiles
        // No conversion needed - use as-is
        setTileUrl(extractedTileUrl || undefined);
        setPixelSummary(response.pixel_summary);
      } catch (error) {
        console.error(`Error fetching ${activeTab} analysis:`, error);
        setTileUrl(undefined);
        setPixelSummary(undefined);
      } finally {
        setAnalysisLoading(false);
      }
    };

    fetchAnalysis();
  }, [activeTab, selectedPlot, isMounted]);

  // Create GeoJSON data for all plots or selected plot
  const geojson = useMemo(() => {
    if (!plotsData) return null;

    // If "All" is selected, show all plots
    if (selectedPlot === 'All') {
      return {
        type: 'FeatureCollection',
        features: plotsData.features,
      };
    }

    // If we have analysis data with features, use that for the selected plot boundary
    if (analysisData && analysisData.features && analysisData.features.length > 0) {
      return {
        type: 'FeatureCollection',
        features: analysisData.features,
      };
    }

    // Otherwise, filter to show only the selected plot
    const selectedFeature = plotsData.features.find((feature) => {
      const plotName = feature.properties?.plot_name || 
        feature.properties?.name || 
        feature.properties?.id || 
        '';
      return plotName === selectedPlot;
    });

    if (selectedFeature) {
      return {
        type: 'FeatureCollection',
        features: [selectedFeature],
      };
    }

    // Fallback to all plots if selected plot not found
    return {
      type: 'FeatureCollection',
      features: plotsData.features,
    };
  }, [plotsData, analysisData, selectedPlot]);

  // Helper function to get plot name from feature
  const getPlotName = (feature: any, index?: number): string => {
    if (feature.properties?.plot_name) {
      return feature.properties.plot_name;
    }
    // Try other possible property names
    if (feature.properties?.name) {
      return feature.properties.name;
    }
    if (feature.properties?.id) {
      return feature.properties.id;
    }
    // Fallback to index-based name
    if (index !== undefined && plotsData) {
      return `Plot_${index + 1}`;
    }
    return 'Unknown Plot';
  };

  // Style function for GeoJSON features
  const styleFeature = (feature: any) => {
    // Find the index of this feature in the original data
    const featureIndex = plotsData?.features.findIndex((f) => 
      JSON.stringify(f.geometry) === JSON.stringify(feature.geometry)
    ) ?? -1;
    
    const plotName = getPlotName(feature, featureIndex);
    const isSelected = plotName === selectedPlot;

    return {
      fillColor: isSelected ? '#eab308' : '#22c55e',
      fillOpacity: isSelected ? 0.4 : 0.2,
      color: isSelected ? '#eab308' : '#3b82f6',
      weight: isSelected ? 3 : 2,
      opacity: 0.8,
    };
  };

  // On each feature handler
  const onEachFeature = (feature: any, layer: L.Layer) => {
    // Find the index of this feature in the original data
    const featureIndex = plotsData?.features.findIndex((f) => 
      JSON.stringify(f.geometry) === JSON.stringify(feature.geometry)
    ) ?? -1;
    
    const plotName = getPlotName(feature, featureIndex);
    
    layer.bindPopup(`<b>Plot:</b> ${plotName}`);
    
    layer.on({
      click: () => {
        handlePlotChange(plotName);
      },
    });
  };

  // Legend configurations based on active tab and pixel summary
  const getLegendData = (): LegendItem[] => {
    if (!pixelSummary) {
      // Return default values if no pixel summary available
      switch (activeTab) {
        case 'Water Uptake':
          return [
            { label: 'Deficient', value: 0, color: 'bg-orange-500' },
            { label: 'Less', value: 0, color: 'bg-orange-500' },
            { label: 'Adequate', value: 0, color: 'bg-orange-500' },
            { label: 'Excellent', value: 0, color: 'bg-orange-500' },
            { label: 'Excess', value: 0, color: 'bg-orange-500' },
          ];
        case 'Soil Moisture':
          return [
            { label: 'Less', value: 0, color: 'bg-orange-500' },
            { label: 'Adequate', value: 0, color: 'bg-orange-500' },
            { label: 'Excellent', value: 0, color: 'bg-orange-500' },
            { label: 'Excess', value: 0, color: 'bg-orange-500' },
            { label: 'Shallow', value: 0, color: 'bg-orange-500' },
          ];
        case 'Pest':
          return [
            { label: 'Chewing', value: 0, color: 'bg-orange-500' },
            { label: 'Sucking', value: 0, color: 'bg-orange-500' },
            { label: 'Fungi', value: 0, color: 'bg-orange-500' },
            { label: 'Soil Borne', value: 0, color: 'bg-orange-500' },
          ];
        case 'Growth':
        default:
          return [
            { label: 'Weak', value: 0, color: 'bg-orange-500' },
            { label: 'Stress', value: 0, color: 'bg-orange-500' },
            { label: 'Moderate', value: 0, color: 'bg-orange-500' },
            { label: 'Healthy', value: 0, color: 'bg-orange-500' },
          ];
      }
    }

    // Use pixel summary data
    switch (activeTab) {
      case 'Water Uptake':
        return [
          { 
            label: 'Deficient', 
            value: Math.round(pixelSummary.deficient_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Less', 
            value: Math.round(pixelSummary.less_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Adequate', 
            value: Math.round(pixelSummary.adequate_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Excellent', 
            value: Math.round(pixelSummary.excellent_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Excess', 
            value: Math.round(pixelSummary.excess_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
        ];
      case 'Soil Moisture':
        return [
          { 
            label: 'Less', 
            value: Math.round(pixelSummary.less_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Adequate', 
            value: Math.round(pixelSummary.adequate_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Excellent', 
            value: Math.round(pixelSummary.excellent_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Excess', 
            value: Math.round(pixelSummary.excess_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Shallow', 
            value: Math.round(pixelSummary.shallow_water_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
        ];
      case 'Pest':
        return [
          { 
            label: 'Chewing', 
            value: Math.round(pixelSummary.chewing_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Sucking', 
            value: Math.round(pixelSummary.sucking_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Fungi', 
            value: Math.round(pixelSummary.fungi_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Soil Borne', 
            value: Math.round(pixelSummary.soil_borne_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
        ];
      case 'Growth':
      default:
        return [
          { 
            label: 'Weak', 
            value: Math.round(pixelSummary.weak_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Stress', 
            value: Math.round(pixelSummary.stress_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Moderate', 
            value: Math.round(pixelSummary.moderate_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
          { 
            label: 'Healthy', 
            value: Math.round(pixelSummary.healthy_pixel_percentage || 0), 
            color: 'bg-orange-500' 
          },
        ];
    }
  };

  const legendItems = getLegendData();

  // Get pixel coordinates for selected legend label
  const getPixelCoordinates = useMemo(() => {
    if (!selectedLegendLabel || !pixelSummary) return [];

    let coordinates: number[][] = [];

    switch (activeTab) {
      case 'Growth':
        if (selectedLegendLabel === 'Weak') {
          coordinates = pixelSummary.weak_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Stress') {
          coordinates = pixelSummary.stress_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Moderate') {
          coordinates = pixelSummary.moderate_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Healthy') {
          coordinates = pixelSummary.healthy_pixel_coordinates || [];
        }
        break;
      case 'Water Uptake':
        if (selectedLegendLabel === 'Deficient') {
          coordinates = (pixelSummary as any).deficient_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Less') {
          coordinates = pixelSummary.less_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Adequate') {
          // Try both "adequate" and "adequat" (API might use either)
          coordinates = (pixelSummary as any).adequate_pixel_coordinates || 
                       (pixelSummary as any).adequat_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Excellent') {
          coordinates = pixelSummary.excellent_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Excess') {
          coordinates = pixelSummary.excess_pixel_coordinates || [];
        }
        break;
      case 'Soil Moisture':
        if (selectedLegendLabel === 'Less') {
          coordinates = pixelSummary.less_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Adequate') {
          coordinates = pixelSummary.adequate_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Excellent') {
          coordinates = pixelSummary.excellent_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Excess') {
          coordinates = pixelSummary.excess_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Shallow') {
          coordinates = pixelSummary.shallow_water_pixel_coordinates || [];
        }
        break;
      case 'Pest':
        if (selectedLegendLabel === 'Chewing') {
          // Try both "chewing_pixel_coordinates" and "chewing_affected_pixel_coordinates"
          coordinates = (pixelSummary as any).chewing_pixel_coordinates || 
                       (pixelSummary as any).chewing_affected_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Sucking') {
          // Try both "sucking_pixel_coordinates" and "sucking_affected_pixel_coordinates"
          coordinates = (pixelSummary as any).sucking_pixel_coordinates || 
                       (pixelSummary as any).sucking_affected_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Fungi') {
          // Try both "fungi_pixel_coordinates" and "fungi_affected_pixel_coordinates"
          coordinates = (pixelSummary as any).fungi_pixel_coordinates || 
                       (pixelSummary as any).fungi_affected_pixel_coordinates || [];
        } else if (selectedLegendLabel === 'Soil Borne') {
          // Try both "soil_borne_pixel_coordinates" and "SoilBorne_affected_pixel_coordinates"
          coordinates = (pixelSummary as any).soil_borne_pixel_coordinates || 
                       (pixelSummary as any).SoilBorne_affected_pixel_coordinates || 
                       (pixelSummary as any).SoilBorn_affected_pixel_coordinates || [];
        }
        break;
    }

    return coordinates;
  }, [selectedLegendLabel, pixelSummary, activeTab]);

  // Handle legend circle click
  const handleLegendClick = useCallback((label: string, value: number) => {
    if (value === 0) return;
    // Toggle selection - if same label clicked, deselect
    if (selectedLegendLabel === label) {
      setSelectedLegendLabel(null);
    } else {
      setSelectedLegendLabel(label);
    }
  }, [selectedLegendLabel]);

  return (
    <div className="bg-white rounded-3xl p-4 pb-3 shadow-xl border border-gray-100 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedLegendLabel(null); // Clear selected legend when switching tabs
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                activeTab === tab ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">SELECT PLOT:</label>
          <select 
            value={selectedPlot}
            onChange={(e) => handlePlotChange(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? (
              <option>Loading...</option>
            ) : (
              <>
                <option value="All">All</option>
                {plotNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      <div className="relative flex-grow rounded-2xl overflow-hidden border border-gray-100 bg-gray-200 min-h-[250px]" style={{ height: '100%', minHeight: '250px' }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-500 font-bold">Loading plots...</div>
          </div>
        ) : analysisLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-500 font-bold">Loading {activeTab} analysis...</div>
          </div>
        ) : geojson && isMounted ? (
          <>
            <MapWrapper
              key={mapInstanceKey}
              geojson={geojson}
              selectedPlot={selectedPlot}
              plotsData={plotsData}
              styleFeature={styleFeature}
              onEachFeature={onEachFeature}
              tileUrl={tileUrl}
              pixelCoordinates={getPixelCoordinates}
              selectedLegendLabel={selectedLegendLabel}
            />


            {/* Dynamic Legend Circles */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center justify-center space-x-4 w-full px-4 overflow-x-auto no-scrollbar">
              {legendItems.map((item, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center flex-shrink-0 cursor-pointer transition-transform hover:scale-110"
                  onClick={() => handleLegendClick(item.label, item.value)}
                >
                  <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center text-white font-black shadow-xl text-sm ${selectedLegendLabel === item.label ? 'border-4 border-yellow-400' : 'border-4 border-white'}`}>
                    {item.value}
                  </div>
                  <span className="text-[10px] font-black text-white mt-1.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] uppercase tracking-tight">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-red-500 font-bold">Failed to load plots</div>
          </div>
        )}
      </div>
    </div>
  );
};
