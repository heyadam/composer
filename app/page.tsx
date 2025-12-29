"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MobileBlocker } from "@/components/Flow/MobileBlocker";
import { useMobileDetection } from "@/lib/hooks/useMobileDetection";
import { useAuth } from "@/lib/auth";

const AgentFlow = dynamic(
  () => import("@/components/Flow/AgentFlow").then((mod) => ({ default: mod.AgentFlow })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading flow editor...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const router = useRouter();
  const isMobile = useMobileDetection();
  const { user, isLoading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // Redirect authenticated users to their current flow
  useEffect(() => {
    async function redirectToCurrentFlow() {
      if (authLoading || !user) return;

      setRedirecting(true);

      try {
        const response = await fetch("/api/flows/current");
        if (!response.ok) {
          console.error("Failed to get current flow");
          setRedirecting(false);
          return;
        }

        const data = await response.json();
        if (data.success && data.flow?.live_id && data.flow?.share_token) {
          router.replace(`/f/${data.flow.live_id}/${data.flow.share_token}`);
        } else {
          // Fallback: stay on demo mode
          setRedirecting(false);
        }
      } catch (err) {
        console.error("Error getting current flow:", err);
        setRedirecting(false);
      }
    }

    redirectToCurrentFlow();
  }, [authLoading, user, router]);

  // Still checking mobile - show nothing to avoid flash
  if (isMobile === null) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Mobile device - show blocker, don't load heavy flow editor
  if (isMobile) {
    return <MobileBlocker />;
  }

  // Show loading while checking auth or redirecting
  if (authLoading || redirecting) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated users get demo mode (local-only editing)
  return <AgentFlow />;
}
