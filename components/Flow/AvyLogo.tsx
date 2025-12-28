"use client";

import { Logo3D } from "@/components/Logo3D";

interface AvyLogoProps {
  isPanning?: boolean;
}

export function AvyLogo({ isPanning }: AvyLogoProps) {
  return <Logo3D size={40} isActive={isPanning} />;
}
