'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import type { MapMouseEvent, MapGeoJSONFeature } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import { AvalanchePopup } from './AvalanchePopup';
import { avalancheFillLayer, avalancheLineLayer } from './map-layers';
import type { AvalancheGeoJSON, AvalancheZoneProperties, HoverInfo, ClickInfo } from '@/types/avalanche';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const AVALANCHE_API_URL = 'https://api.avalanche.org/v2/public/products/map-layer';

const DEFAULT_VIEW_STATE = {
  longitude: -110,
  latitude: 45,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

const MAX_INITIAL_ZOOM = 8;

export function AvalancheMap() {
  const [geoJsonData, setGeoJsonData] = useState<AvalancheGeoJSON | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialViewState, setInitialViewState] = useState(DEFAULT_VIEW_STATE);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Request user's location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setInitialViewState({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
            zoom: MAX_INITIAL_ZOOM,
            pitch: 0,
            bearing: 0,
          });
          setLocationLoaded(true);
        },
        () => {
          // User denied or error - use default view
          setLocationLoaded(true);
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      setLocationLoaded(true);
    }
  }, []);

  // Fetch avalanche data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await fetch(AVALANCHE_API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: AvalancheGeoJSON = await response.json();
        setGeoJsonData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch avalanche data:', err);
        setError('Failed to load avalanche data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const onHover = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0] as MapGeoJSONFeature | undefined;

    if (feature && feature.properties) {
      const props = feature.properties as unknown as AvalancheZoneProperties;
      setHoverInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        properties: props,
      });
    } else {
      setHoverInfo(null);
    }
  }, []);

  const onClick = useCallback((event: MapMouseEvent) => {
    const feature = event.features?.[0] as MapGeoJSONFeature | undefined;

    if (feature && feature.properties) {
      const props = feature.properties as unknown as AvalancheZoneProperties;
      setClickInfo({
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
        properties: props,
      });
    }
  }, []);

  const closePopup = useCallback(() => {
    setClickInfo(null);
  }, []);

  const cursor = useMemo(() => {
    return hoverInfo ? 'pointer' : 'grab';
  }, [hoverInfo]);

  if (isLoading || !locationLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!locationLoaded ? 'Getting your location...' : 'Loading avalanche data...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={initialViewState}
      style={{ width: '100vw', height: '100vh' }}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
      interactiveLayerIds={['avalanche-zones-fill']}
      onMouseMove={onHover}
      onMouseLeave={() => setHoverInfo(null)}
      onClick={onClick}
      cursor={cursor}
    >
      <GeolocateControl position="top-right" trackUserLocation />
      <NavigationControl position="top-right" />

      {geoJsonData && (
        <Source id="avalanche-data" type="geojson" data={geoJsonData}>
          <Layer {...avalancheFillLayer} />
          <Layer {...avalancheLineLayer} />
        </Source>
      )}

      {hoverInfo && !clickInfo && (
        <div
          className="absolute pointer-events-none bg-white px-3 py-2 rounded-md shadow-lg text-sm z-10"
          style={{ left: 10, top: 10 }}
        >
          <p className="font-semibold">{hoverInfo.properties.name}</p>
          <p className="text-gray-600">Danger: {hoverInfo.properties.danger}</p>
        </div>
      )}

      {clickInfo && (
        <AvalanchePopup
          longitude={clickInfo.longitude}
          latitude={clickInfo.latitude}
          properties={clickInfo.properties}
          onClose={closePopup}
        />
      )}
    </Map>
  );
}
