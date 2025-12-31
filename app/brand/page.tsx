"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Logo3D = dynamic(
  () => import("@/components/Logo3D").then((mod) => ({ default: mod.Logo3D })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center" style={{ width: 1024, height: 1024 }}>
        <Loader2 className="h-12 w-12 animate-spin text-white/50" />
      </div>
    ),
  }
);

export default function BrandPage() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center">
      <Logo3D size={1024} scale={1} isActive={false} />
    </div>
  );
}
