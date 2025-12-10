import type { FeatureCollection, Feature, MultiPolygon, Polygon } from 'geojson';

export interface AvalancheZoneProperties {
  name: string;
  center: string;
  center_link: string;
  timezone: string;
  center_id: string;
  state: string;
  travel_advice: string;
  danger: string;
  danger_level: number;
  color: string;
  stroke: string;
  font_color: string;
  link: string;
  start_date: string | null;
  end_date: string | null;
  fillOpacity: number;
  fillIncrement: number;
  warning: {
    product: string | null;
  };
}

export type AvalancheFeature = Feature<Polygon | MultiPolygon, AvalancheZoneProperties>;

export type AvalancheGeoJSON = FeatureCollection<Polygon | MultiPolygon, AvalancheZoneProperties>;

export interface HoverInfo {
  longitude: number;
  latitude: number;
  properties: AvalancheZoneProperties;
}

export interface ClickInfo extends HoverInfo {}
