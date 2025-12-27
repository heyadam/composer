"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { MobileBlocker } from "@/components/Flow/MobileBlocker";
import { useMobileDetection } from "@/lib/hooks/useMobileDetection";
import { loadLiveFlow } from "@/lib/flows/api";
import type { LiveFlowData, FlowNodeRecord, FlowEdgeRecord } from "@/lib/flows/types";

const AgentFlow = dynamic(
  () => import("@/components/Flow/AgentFlow").then((mod) => ({ default: mod.AgentFlow })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading collaborative flow...</p>
        </div>
      </div>
    ),
  }
);

interface CollaborationPageProps {
  params: Promise<{ code: string; token: string }>;
}

export default function CollaborationPage({ params }: CollaborationPageProps) {
  const { code, token } = use(params);
  const router = useRouter();
  const isMobile = useMobileDetection();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flowData, setFlowData] = useState<{
    flow: LiveFlowData["flow"];
    nodes: FlowNodeRecord[];
    edges: FlowEdgeRecord[];
  } | null>(null);

  useEffect(() => {
    async function fetchFlow() {
      // Validate token format
      if (!token || !/^[a-zA-Z0-9]{12}$/.test(token)) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      const result = await loadLiveFlow(token);

      if (!result.success || !result.flow) {
        setError(result.error || "Flow not found");
        setLoading(false);
        return;
      }

      // Check if code matches live_id, redirect if not
      if (result.flow.live_id !== code) {
        router.replace(`/${result.flow.live_id}/${token}`);
        return;
      }

      setFlowData({
        flow: result.flow,
        nodes: result.nodes || [],
        edges: result.edges || [],
      });
      setLoading(false);
    }

    fetchFlow();
  }, [code, token, router]);

  // Still checking mobile - show nothing to avoid flash
  if (isMobile === null) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Mobile device - show blocker
  if (isMobile) {
    return <MobileBlocker />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading collaborative flow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Unable to load flow</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to Composer
          </Link>
        </div>
      </div>
    );
  }

  // Render AgentFlow with collaboration data
  return (
    <AgentFlow
      collaborationMode={{
        shareToken: token,
        liveId: code,
        initialFlow: flowData,
        useOwnerKeys: flowData?.flow.use_owner_keys ?? false,
      }}
    />
  );
}
