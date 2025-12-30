"use client";

import { useState } from "react";
import { useReactFlow, useEdges, type NodeProps, type Node } from "@xyflow/react";
import type { MagicNodeData } from "@/types/flow";
import { Wand2, ChevronDown, ChevronRight, RefreshCw, AlertCircle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { NodeFrame } from "./NodeFrame";
import { PortRow } from "./PortLabel";
import { InputWithHandle } from "./InputWithHandle";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useApiKeys } from "@/lib/api-keys";

type MagicNodeType = Node<MagicNodeData, "ai-logic">;

export function MagicNode({ id, data }: NodeProps<MagicNodeType>) {
  const { updateNodeData } = useReactFlow();
  const edges = useEdges();
  const { keys: apiKeys } = useApiKeys();
  const [isGenerating, setIsGenerating] = useState(false);

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
  const isDoneConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "done"
  );

  const hasCode = Boolean(data.generatedCode);
  const hasError = Boolean(data.generationError);

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
        codeExplanation: result.explanation,
        evalResults: result.eval,
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

  const toggleCodeView = () => {
    updateNodeData(id, { codeExpanded: !data.codeExpanded });
  };

  const toggleEvalView = () => {
    updateNodeData(id, { evalExpanded: !data.evalExpanded });
  };

  const formatValue = (val: string | number | null | undefined): string => {
    if (val === null) return "null";
    if (val === undefined) return "undefined";
    if (typeof val === "string") return val === "" ? '""' : `"${val}"`;
    return String(val);
  };

  return (
    <NodeFrame
      title={data.label}
      onTitleChange={(label) => updateNodeData(id, { label })}
      icon={<Wand2 />}
      accentColor="amber"
      status={data.executionStatus}
      fromCache={data.fromCache}
      className="w-[280px]"
      ports={
        <>
          <PortRow
            nodeId={id}
            input={{ id: "input1", label: "Input 1", colorClass: "cyan", required: false, isConnected: isInput1Connected }}
          />
          <PortRow
            nodeId={id}
            input={{ id: "input2", label: "Input 2", colorClass: "cyan", required: false, isConnected: isInput2Connected }}
            output={{ id: "output", label: "String", colorClass: "cyan", isConnected: isOutputConnected }}
          />
          <PortRow
            nodeId={id}
            output={{ id: "done", label: "Done", colorClass: "orange", isConnected: isDoneConnected }}
          />
        </>
      }
      footer={
        data.executionError ? (
          <p className="text-xs text-rose-400 whitespace-pre-wrap line-clamp-4">
            {data.executionError}
          </p>
        ) : data.executionOutput ? (
          <p className="text-xs text-white/60 whitespace-pre-wrap line-clamp-4">
            {data.executionOutput}
          </p>
        ) : null
      }
    >
      <div className="space-y-3">
        {/* Transformation description input with handle */}
        <InputWithHandle
          id="transform"
          label="Logic to Generate"
          colorClass="cyan"
          required={false}
          isConnected={isTransformConnected}
        >
          <textarea
            value={isTransformConnected ? "" : (data.transformPrompt ?? "")}
            onChange={(e) => updateNodeData(id, { transformPrompt: e.target.value })}
            placeholder={isTransformConnected ? "Connected" : "Describe logic to generate via Claude..."}
            disabled={isTransformConnected}
            className={cn(
              "nodrag node-input min-h-[60px] resize-y",
              isTransformConnected && "node-input:disabled"
            )}
          />
        </InputWithHandle>

        {/* Generate button */}
        {!isTransformConnected && (
          <Button
            size="sm"
            variant={hasError ? "destructive" : hasCode ? "outline" : "default"}
            className={cn(
              "w-full h-8 text-xs font-medium uppercase tracking-wider",
              !hasError && !hasCode && "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30"
            )}
            onClick={handleGenerate}
            disabled={isGenerating || !data.transformPrompt?.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Generating
              </>
            ) : hasError ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </>
            ) : hasCode ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                Generate
              </>
            )}
          </Button>
        )}

        {/* Error display */}
        {!isTransformConnected && hasError && data.generationError && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5">
            <p className="text-xs text-rose-400">{data.generationError}</p>
          </div>
        )}

        {/* Collapsible code view */}
        {!isTransformConnected && hasCode && !hasError && (
          <Collapsible open={data.codeExpanded} onOpenChange={toggleCodeView}>
            <CollapsibleTrigger className="nodrag flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/50 hover:text-white/80 w-full transition-colors">
              {data.codeExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Generated Code
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {data.codeExplanation && (
                <p className="text-xs text-white/50">{data.codeExplanation}</p>
              )}
              <pre className="nodrag text-xs font-mono bg-black/40 rounded-lg p-2.5 whitespace-pre-wrap break-words max-h-[120px] overflow-auto border border-white/[0.06]">
                <code className="text-white/70">{data.generatedCode}</code>
              </pre>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Collapsible eval results */}
        {!isTransformConnected && hasCode && !hasError && data.evalResults && (
          <Collapsible open={data.evalExpanded} onOpenChange={toggleEvalView}>
            <CollapsibleTrigger className="nodrag flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/50 hover:text-white/80 w-full transition-colors">
              {data.evalExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span className="flex items-center gap-1.5">
                Validated
                {data.evalResults.allPassed ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                ) : (
                  <XCircle className="h-3 w-3 text-rose-400" />
                )}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {!data.evalResults.syntaxValid && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2">
                  <p className="text-xs text-rose-400">
                    Syntax error: {data.evalResults.syntaxError}
                  </p>
                </div>
              )}
              {data.evalResults.syntaxValid && (
                <div className="space-y-1">
                  {data.evalResults.testCases.map((tc, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-xs font-mono rounded-lg px-2.5 py-1.5 border",
                        tc.error
                          ? "bg-rose-500/10 border-rose-500/30"
                          : "bg-black/30 border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        {tc.error ? (
                          <XCircle className="h-3 w-3 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 overflow-hidden">
                          <span className="text-white/50">
                            ({formatValue(tc.input1)}, {formatValue(tc.input2)})
                          </span>
                          <span className="text-white/30"> → </span>
                          {tc.error ? (
                            <span className="text-rose-400">{tc.error}</span>
                          ) : (
                            <span className="text-white/80">{formatValue(tc.result)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Info when connected */}
        {isTransformConnected && (
          <p className="text-xs text-white/40 italic">
            Code will be generated at runtime from connected input.
          </p>
        )}

        {/* Cache toggle */}
        <label className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-white/40 cursor-pointer select-none nodrag pt-2 border-t border-white/[0.06]">
          <input
            type="checkbox"
            checked={data.cacheable ?? false}
            onChange={(e) => updateNodeData(id, { cacheable: e.target.checked })}
            className="node-checkbox"
          />
          <span>Cache output</span>
        </label>
      </div>
    </NodeFrame>
  );
}
