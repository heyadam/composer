'use client';

import { Popup } from 'react-map-gl/mapbox';
import type { AvalancheZoneProperties } from '@/types/avalanche';

interface AvalanchePopupProps {
  longitude: number;
  latitude: number;
  properties: AvalancheZoneProperties;
  onClose: () => void;
}

const dangerLevelDisplay: Record<number, { label: string; bgColor: string }> = {
  [-1]: { label: 'No Rating', bgColor: 'bg-gray-400' },
  0: { label: 'No Rating', bgColor: 'bg-gray-400' },
  1: { label: 'Low', bgColor: 'bg-green-500' },
  2: { label: 'Moderate', bgColor: 'bg-yellow-400' },
  3: { label: 'Considerable', bgColor: 'bg-orange-500' },
  4: { label: 'High', bgColor: 'bg-red-600' },
  5: { label: 'Extreme', bgColor: 'bg-black' },
};

export function AvalanchePopup({
  longitude,
  latitude,
  properties,
  onClose
}: AvalanchePopupProps) {
  const dangerInfo = dangerLevelDisplay[properties.danger_level] ?? dangerLevelDisplay[-1];

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
      maxWidth="320px"
    >
      <div className="p-4 sm:p-3">
        <h3 className="font-bold text-lg sm:text-base text-gray-900 mb-1 pr-8">
          {properties.name}
        </h3>

        <p className="text-sm text-gray-600 mb-3 sm:mb-2">
          {properties.center}
        </p>

        <div
          className={`inline-block px-4 py-2 sm:px-3 sm:py-1 rounded-full text-white text-base sm:text-sm font-medium mb-4 sm:mb-3 ${dangerInfo.bgColor}`}
        >
          Danger: {dangerInfo.label}
        </div>

        {properties.travel_advice && (
          <div className="mb-4 sm:mb-3">
            <h4 className="font-semibold text-sm text-gray-800 mb-1">Travel Advice</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {properties.travel_advice}
            </p>
          </div>
        )}

        <a
          href={properties.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-full text-center bg-blue-600 text-white py-3 sm:py-2 px-4 rounded-lg sm:rounded-md text-base sm:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          View Full Forecast
        </a>
      </div>
    </Popup>
  );
}
