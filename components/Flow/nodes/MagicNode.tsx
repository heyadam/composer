"use client";

import { useState } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { MagicNodeData } from "@/types/flow";
import { Sparkles, ChevronDown, ChevronRight, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useApiKeys } from "@/lib/api-keys";

type MagicNodeType = Node<MagicNodeData, "magic">;

export function MagicNode({ id, data }: NodeProps<MagicNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const { keys: apiKeys } = useApiKeys();
  const [isGenerating, setIsGenerating] = useState(false);

  // Check connections
  const isTransformConnected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "transform"
  );
  const isInput1Connected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "input1"
  );
  const isInput2Connected = edges.some(
    (edge) => edge.target === id && edge.targetHandle === "input2"
  );
  const isOutputConnected = edges.some(
    (edge) => edge.source === id && (edge.sourceHandle === "output" || !edge.sourceHandle)
  );

  const hasCode = Boolean(data.generatedCode);
  const hasError = Boolean(data.generationError);

  // Generate code handler
  const handleGenerate = async () => {
    const prompt = data.transformPrompt?.trim();
    if (!prompt) return;

    setIsGenerating(true);
    updateNodeData(id, { isGenerating: true, generationError: undefined });

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "magic-generate",
          prompt,
          apiKeys,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate code");
      }

      const result = await response.json();
      updateNodeData(id, {
        generatedCode: result.code,
        isGenerating: false,
        generationError: undefined,
      });
    } catch (error) {
      updateNodeData(id, {
        isGenerating: false,
        generationError: error instanceof Error ? error.message : "Generation failed",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle code view
  const toggleCodeView = () => {
    updateNodeData(id, { codeExpanded: !data.codeExpanded });
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Sparkles className="h-4 w-4" />}
      iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-300"
      accentBorderClassName="border-l-2 border-l-violet-500/50"
      status={data.executionStatus}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "input1", label: "input1", colorClass: "cyan", required: false, isConnected: isInput1Connected }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "input2", label: "input2", colorClass: "cyan", required: false, isConnected: isInput2Connected }}
            output={{ id: "output", label: "output", colorClass: "cyan", isConnected: isOutputConnected }}
          />
        </>
      }
      footer={
        data.executionError ? (
          <p className="text-xs text-destructive whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : data.executionOutput ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {data.executionOutput}
          </p>
        ) : null
      }
    >
      <div className="space-y-3">
        {/* Transformation description input with handle */}
        <InputWithHandle
          id="transform"
          label="Transformation"
          colorClass="cyan"
          required={false}
          isConnected={isTransformConnected}
        >
          <textarea
            value={isTransformConnected ? "" : (data.transformPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { transformPrompt: e.target.value })}
            placeholder={isTransformConnected ? "Connected" : "Describe transformation..."}
            disabled={isTransformConnected}
            className={cn(
              "nodrag w-full min-h-[60px] resize-y rounded-md border border-input px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              isTransformConnected
                ? "bg-muted/50 dark:bg-muted/20 cursor-not-allowed placeholder:italic placeholder:text-muted-foreground"
                : "bg-background/60 dark:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            )}
          />
        </InputWithHandle>

        {/* Generate button - only shown when not connected */}
        {!isTransformConnected && (
          <Button
            size="sm"
            variant={hasError ? "destructive" : hasCode ? "outline" : "default"}
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !data.transformPrompt?.trim()}
          >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : hasError ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Regenerate
            </>
          ) : hasCode ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Code
            </>
          )}
          </Button>
        )}

        {/* Error display - only shown when not connected */}
        {!isTransformConnected && hasError && data.generationError && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2">
            <p className="text-xs text-destructive">{data.generationError}</p>
          </div>
        )}

        {/* Collapsible code view - only shown when not connected */}
        {!isTransformConnected && hasCode && !hasError && (
          <Collapsible open={data.codeExpanded} onOpenChange={toggleCodeView}>
            <CollapsibleTrigger className="nodrag flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
              {data.codeExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Generated Code
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <pre className="nodrag text-xs font-mono bg-muted/50 rounded-md p-2 whitespace-pre-wrap break-words max-h-[120px] overflow-auto border">
                <code className="text-muted-foreground">{data.generatedCode}</code>
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Info when connected */}
        {isTransformConnected && (
          <p className="text-xs text-muted-foreground italic">
            Code will be generated at runtime from connected input.
          </p>
        )}
      </div>
    </NodeFrame>
  );
}
