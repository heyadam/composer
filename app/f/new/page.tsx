"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * /f/new - Create a new flow and redirect to its URL
 *
 * For authenticated users: Creates a new flow via RPC and redirects to /f/[code]/[token]
 * For unauthenticated users: Redirects to / for demo mode
 */
export default function NewFlowPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createAndRedirect() {
      // Wait for auth to load
      if (authLoading) return;

      // If not authenticated, redirect to demo mode
      if (!user) {
        router.replace("/");
        return;
      }

      try {
        // Call the current flow API which will create a new flow if needed
        // For a truly new flow, we use the create endpoint
        const response = await fetch("/api/flows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flow: {
              metadata: { name: "Untitled" },
              nodes: [],
              edges: [],
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Failed to create flow");
          return;
        }

        const data = await response.json();
        if (!data.success || !data.flow) {
          setError(data.error || "Failed to create flow");
          return;
        }

        // Redirect to the new flow's URL
        router.replace(`/f/${data.flow.live_id}/${data.flow.share_token}`);
      } catch (err) {
        console.error("Error creating flow:", err);
        setError("Failed to create flow");
      }
    }

    createAndRedirect();
  }, [authLoading, user, router]);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-muted">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Creating new flow...</p>
      </div>
    </div>
  );
}
