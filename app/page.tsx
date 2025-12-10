'use client';

import dynamic from 'next/dynamic';

const AvalancheMap = dynamic(
  () => import('@/components/Map/AvalancheMap').then(mod => ({ default: mod.AvalancheMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="h-screen w-screen">
      <AvalancheMap />
    </main>
  );
}
