import type { FillLayer, LineLayer } from 'mapbox-gl';

export const avalancheFillLayer: FillLayer = {
  id: 'avalanche-zones-fill',
  type: 'fill',
  source: 'avalanche-data',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.7,
      ['get', 'fillOpacity']
    ]
  }
};

export const avalancheLineLayer: LineLayer = {
  id: 'avalanche-zones-line',
  type: 'line',
  source: 'avalanche-data',
  paint: {
    'line-color': ['get', 'stroke'],
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      3,
      1.5
    ]
  }
};
