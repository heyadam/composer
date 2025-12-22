"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { ReactFlow, type Node, type Edge } from "@xyflow/react";
import { executeFlow } from "@/lib/execution/engine";
import type { NodeExecutionState } from "@/lib/execution/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Check, ChevronRight, KeyRound, Link, Loader2, RotateCcw, Sparkles, Wand2, X } from "lucide-react";
import { isImageOutput, parseImageOutput, getImageDataUrl } from "@/lib/image-utils";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/ColoredEdge";
import { welcomePreviewEdges, welcomePreviewNodes } from "@/lib/welcome-preview-flow";

const STORAGE_KEY = "avy-nux-step";

function HeroPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden border bg-muted/40">
      {/* Background polish */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_30%_20%,hsl(var(--primary)/0.20),transparent_55%),radial-gradient(900px_circle_at_70%_80%,hsl(var(--foreground)/0.10),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px]"
      />
      {children}

      {/* Soft vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"
      />
    </div>
  );
}

function RoundedTile({
  position,
  size = 1.55,
  children,
}: {
  position: [number, number, number];
  size?: number;
  children?: ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Unique rotation based on position for organic feel
    const time = clock.getElapsedTime();
    const offset = position[0] + position[1] * 2; // Unique seed per cube
    const speedX = 1.2 + Math.sin(offset) * 0.4;
    const speedY = 1.0 + Math.cos(offset) * 0.3;
    const speedZ = 0.8 + Math.sin(offset * 1.5) * 0.2;
    
    groupRef.current.rotation.x = Math.sin(time * speedX + offset) * 0.25;
    groupRef.current.rotation.y = Math.cos(time * speedY + offset * 1.3) * 0.25;
    groupRef.current.rotation.z = Math.sin(time * speedZ + offset * 0.7) * 0.1;
  });

  const depth = 0.4;

  return (
    <group position={position} ref={groupRef}>
      {/* 3D Cube with better material */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size, size, depth]} />
        <meshStandardMaterial 
          color="#1a1a1f" 
          roughness={0.4}
          metalness={0.6}
          emissive="#0a0a0c"
          emissiveIntensity={0.2}
          transparent 
          opacity={0.98}
        />
      </mesh>
      {/* Edge glow */}
      <mesh>
        <boxGeometry args={[size * 1.01, size * 1.01, depth * 1.01]} />
        <meshBasicMaterial color="#3a3a45" transparent opacity={0.3} wireframe />
      </mesh>
      {/* Rim light effect */}
      <mesh scale={1.005}>
        <boxGeometry args={[size, size, depth]} />
        <meshBasicMaterial color="#6366F1" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      {/* Icons on front face */}
      <group position={[0, 0, depth / 2 + 0.02]}>{children}</group>
    </group>
  );
}

function GoogleIcon2D() {
  // Gemini sparkle: four-pointed star with gradient
  const starShape = useMemo(() => {
    const points = 4;
    const outerRadius = 0.45;
    const innerRadius = 0.16;
    
    const shape = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2; // Start from top
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    return shape;
  }, []);

  // Create gradient texture
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#A8C7FA');    // Light blue center
    gradient.addColorStop(0.5, '#669DF6');  // Medium blue
    gradient.addColorStop(1, '#4285F4');    // Darker blue edges
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  return (
    <group>
      <mesh>
        <shapeGeometry args={[starShape]} />
        <meshBasicMaterial map={gradientTexture} transparent />
      </mesh>
    </group>
  );
}

function ClaudeIcon2D() {
  const svgData = useLoader(SVGLoader, "/claude.svg");
  
  const shapes = useMemo(() => {
    if (!svgData || !svgData.paths) return [];
    
    const allShapes: { shape: THREE.Shape; color: string }[] = [];
    svgData.paths.forEach((path) => {
      const pathShapes = SVGLoader.createShapes(path);
      pathShapes.forEach((shape) => {
        allShapes.push({
          shape,
          color: path.color ? `#${path.color.getHexString()}` : "#F59E0B",
        });
      });
    });
    return allShapes;
  }, [svgData]);

  const { center, scale } = useMemo(() => {
    if (shapes.length === 0) {
      return { center: new THREE.Vector3(), scale: 1 };
    }
    
    const box = new THREE.Box3();
    shapes.forEach(({ shape }) => {
      const points = shape.getPoints();
      points.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, p.y, 0)));
    });
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y);
    const targetSize = 0.7;
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    return { center, scale };
  }, [shapes]);

  if (shapes.length === 0) return null;

  return (
    <group scale={[scale, -scale, 1]} position={[-center.x * scale, center.y * scale, 0]}>
      {shapes.map(({ shape, color }, i) => (
        <mesh key={i}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function OpenAIIcon2D() {
  const svgData = useLoader(SVGLoader, "/openai.svg");
  
  const shapes = useMemo(() => {
    if (!svgData || !svgData.paths) return [];
    
    const allShapes: { shape: THREE.Shape; color: string }[] = [];
    svgData.paths.forEach((path) => {
      const pathShapes = SVGLoader.createShapes(path);
      pathShapes.forEach((shape) => {
        allShapes.push({
          shape,
          color: "#FFFFFF", // Force white since the SVG has black fill
        });
      });
    });
    return allShapes;
  }, [svgData]);

  const { center, scale } = useMemo(() => {
    if (shapes.length === 0) {
      return { center: new THREE.Vector3(), scale: 1 };
    }
    
    const box = new THREE.Box3();
    shapes.forEach(({ shape }) => {
      const points = shape.getPoints();
      points.forEach((p) => box.expandByPoint(new THREE.Vector3(p.x, p.y, 0)));
    });
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y);
    const targetSize = 0.7;
    const scale = maxDim > 0 ? targetSize / maxDim : 1;
    return { center, scale };
  }, [shapes]);

  if (shapes.length === 0) return null;

  return (
    <group scale={[scale, -scale, 1]} position={[-center.x * scale, center.y * scale, 0]}>
      {shapes.map(({ shape, color }, i) => (
        <mesh key={i}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function ComposerIcon2D() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    // Smooth pulsing: scale between 0.95 and 1.05
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    meshRef.current.scale.setScalar(pulse);
    
    // Sync glow with main sphere
    if (glowRef.current) {
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Purple-blue glow layers */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.68, 32, 32]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.15} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.58, 32, 32]} />
        <meshBasicMaterial color="#6366F1" transparent opacity={0.25} />
      </mesh>
      {/* Main white sphere */}
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.48, 32, 32]} />
        <meshStandardMaterial 
          color="#FFFFFF" 
          roughness={0.3}
          metalness={0.1}
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
}

function CurvedLine2D({
  from,
  to,
  color,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: string;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  
  const { curve, tubeGeometry } = useMemo(() => {
    const mid = new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2, 0);
    mid.y += 0.9;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const tubeGeometry = new THREE.TubeGeometry(curve, 48, 0.035, 8, false);
    return { curve, tubeGeometry };
  }, [from, to]);

  useFrame(({ clock }) => {
    if (!particleRef.current) return;
    // Animate particle along the curve from 0 to 1
    const t = (clock.getElapsedTime() * 0.3) % 1;
    const point = curve.getPoint(t);
    particleRef.current.position.copy(point);
    
    // Scale: grow from 0 at start, shrink to 0 at end
    let scale = 1;
    if (t < 0.15) {
      // Grow in first 15%
      scale = t / 0.15;
    } else if (t > 0.85) {
      // Shrink in last 15%
      scale = (1 - t) / 0.15;
    }
    particleRef.current.scale.setScalar(scale);
  });

  return (
    <group>
      {/* Main line */}
      <mesh geometry={tubeGeometry}>
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Animated flow particle with glow */}
      <mesh ref={particleRef}>
        {/* Outer glow */}
        <mesh>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.25} />
        </mesh>
        {/* Main particle */}
        <mesh>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </mesh>
    </group>
  );
}

function ProvidersToComposerHero() {
  const topY = 1.85;
  const bottomY = -2.05;
  const topX = [-2.25, 0, 2.25] as const;

  const composerPos = new THREE.Vector3(0, bottomY, 0);
  const openaiPos = new THREE.Vector3(topX[0], topY, 0);
  const googlePos = new THREE.Vector3(topX[1], topY, 0);
  const claudePos = new THREE.Vector3(topX[2], topY, 0);

  return (
    <HeroPanel>
      <div className="pointer-events-none absolute inset-0 z-20">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 10], zoom: 48 }}
          dpr={[1, 2]}
          frameloop="always"
          gl={{ antialias: true, alpha: true }}
          shadows
        >
          {/* Soft, diffused lighting */}
          <ambientLight intensity={0.8} />
          <hemisphereLight args={["#6366F1", "#1a1a1f", 0.6]} />
          {/* Main shadow-casting light from above/front */}
          <directionalLight 
            position={[1, 4, 8]} 
            target-position={[0, 0, 0]}
            intensity={0.8} 
            color="#ffffff"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={20}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
            shadow-bias={-0.001}
            shadow-radius={12}
          />
          {/* Fill lights for ambient look */}
          <directionalLight position={[5, 3, 5]} intensity={0.3} color="#8B5CF6" />
          <directionalLight position={[-5, -2, 5]} intensity={0.25} color="#4285F4" />
          <pointLight position={[0, 0, 6]} intensity={0.2} distance={15} decay={2} />
          
          {/* Shadow-receiving plane behind cubes */}
          <mesh position={[0, 0, -0.5]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <shadowMaterial transparent opacity={0.25} color="#000000" />
          </mesh>
          
          {/* Lines (behind) */}
          <CurvedLine2D
            from={new THREE.Vector3(openaiPos.x, openaiPos.y - 0.85, 0)}
            to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
            color="#FFFFFF"
          />
          <CurvedLine2D
            from={new THREE.Vector3(googlePos.x, googlePos.y - 0.85, 0)}
            to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
            color="#4285F4"
          />
          <CurvedLine2D
            from={new THREE.Vector3(claudePos.x, claudePos.y - 0.85, 0)}
            to={new THREE.Vector3(composerPos.x, composerPos.y + 0.9, 0)}
            color="#F97316"
          />

          {/* Provider tiles */}
          <RoundedTile position={[openaiPos.x, openaiPos.y, 0]}>
            <Suspense fallback={null}>
              <OpenAIIcon2D />
            </Suspense>
          </RoundedTile>
          <RoundedTile position={[googlePos.x, googlePos.y, 0]}>
            <GoogleIcon2D />
          </RoundedTile>
          <RoundedTile position={[claudePos.x, claudePos.y, 0]}>
            <Suspense fallback={null}>
              <ClaudeIcon2D />
            </Suspense>
          </RoundedTile>

          {/* Composer tile */}
          <RoundedTile position={[composerPos.x, composerPos.y, 0]} size={1.75}>
            <ComposerIcon2D />
          </RoundedTile>
        </Canvas>
      </div>
    </HeroPanel>
  );
}

// Module-level to persist across React Strict Mode remounts
let demoAbortController: AbortController | null = null;
let demoHasStarted = false;
let demoSetNodes: React.Dispatch<React.SetStateAction<Node[]>> | null = null;
let demoSetIsRunning: React.Dispatch<React.SetStateAction<boolean>> | null = null;
let demoSetProgressLabel: React.Dispatch<React.SetStateAction<string>> | null = null;

// Map node labels to user-friendly progress messages
const NODE_PROGRESS_LABELS: Record<string, string> = {
  "Story Writer": "Generating story...",
  "Image Prompt Generator": "Creating image prompt...",
  "Story Illustration": "Creating image from story...",
};

function MiniNodeCanvasDemo() {
  // Deep copy initial nodes/edges so we can update them during execution
  const [nodes, setNodes] = useState<Node[]>(() =>
    welcomePreviewNodes.map((n) => ({ ...n, data: { ...n.data } }))
  );
  const [edges] = useState<Edge[]>(() =>
    welcomePreviewEdges.map((e) => ({ ...e }))
  );
  const [isRunning, setIsRunning] = useState(true); // Start as running
  const [progressLabel, setProgressLabel] = useState("Starting demo...");
  const [showOutputs, setShowOutputs] = useState(false);

  // Ref-based guard to prevent re-execution (backup for module-level flag)
  const hasStartedRef = useRef(false);

  // Extract outputs from nodes for the modal
  const getOutputs = () => {
    const inputNode = nodes.find((n) => n.type === "text-input");
    const storyNode = nodes.find((n) => n.data?.label === "Story Writer");
    const imageNode = nodes.find((n) => n.type === "image-generation");

    return {
      prompt: inputNode?.data?.inputValue as string | undefined,
      story: storyNode?.data?.executionOutput as string | undefined,
      image: imageNode?.data?.executionOutput as string | undefined,
    };
  };

  // Retry demo flow
  const retryDemo = useCallback(() => {
    // Reset nodes to initial state
    setNodes(welcomePreviewNodes.map((n) => ({ ...n, data: { ...n.data } })));
    setProgressLabel("Starting demo...");
    setIsRunning(true);
    setShowOutputs(false);

    // Reset guards to allow re-execution
    demoHasStarted = false;
    hasStartedRef.current = false;

    // Create new abort controller
    demoAbortController = new AbortController();

    // Callback to update node state
    const updateNodeState = (nodeId: string, state: NodeExecutionState) => {
      if (state.status === "running") {
        demoSetNodes?.((prev) => {
          const node = prev.find((n) => n.id === nodeId);
          const nodeLabel = node?.data?.label as string | undefined;
          if (nodeLabel && NODE_PROGRESS_LABELS[nodeLabel]) {
            demoSetProgressLabel?.(NODE_PROGRESS_LABELS[nodeLabel]);
          }
          return prev;
        });
      }

      demoSetNodes?.((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: state.status,
                  executionOutput: state.output,
                  executionError: state.error,
                  executionReasoning: state.reasoning,
                },
              }
            : node
        )
      );
    };

    // Delay and execute
    setTimeout(() => {
      const freshNodes = welcomePreviewNodes.map((n) => ({ ...n, data: { ...n.data } }));
      const freshEdges = welcomePreviewEdges.map((e) => ({ ...e }));
      executeFlow(freshNodes, freshEdges, updateNodeState, undefined, demoAbortController?.signal)
        .then(() => {
          demoSetIsRunning?.(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            console.error("[NUX Demo] Retry error:", err);
          }
          demoSetIsRunning?.(false);
        });
    }, 2000);
  }, []);

  // Keep module-level refs to latest setters (survives strict mode remounts)
  useEffect(() => {
    demoSetNodes = setNodes;
    demoSetIsRunning = setIsRunning;
    demoSetProgressLabel = setProgressLabel;
  }, [setNodes, setIsRunning, setProgressLabel]);

  useEffect(() => {
    // Only run once across all mounts (survives React Strict Mode)
    // Check both module-level and ref-based guards for robustness
    if (demoHasStarted || hasStartedRef.current) return;
    demoHasStarted = true;
    hasStartedRef.current = true;

    demoAbortController = new AbortController();

    // Callback to update node state - uses module ref for latest setNodes
    const updateNodeState = (nodeId: string, state: NodeExecutionState) => {
      console.log("[NUX Demo] Node state:", nodeId, state.status, state.error || "");

      // Update progress label when a node starts running
      if (state.status === "running") {
        demoSetNodes?.((prev) => {
          const node = prev.find((n) => n.id === nodeId);
          const nodeLabel = node?.data?.label as string | undefined;
          if (nodeLabel && NODE_PROGRESS_LABELS[nodeLabel]) {
            demoSetProgressLabel?.(NODE_PROGRESS_LABELS[nodeLabel]);
          }
          return prev;
        });
      }

      demoSetNodes?.((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  executionStatus: state.status,
                  executionOutput: state.output,
                  executionError: state.error,
                  executionReasoning: state.reasoning,
                },
              }
            : node
        )
      );
    };

    console.log("[NUX Demo] Starting execution with", nodes.length, "nodes");

    // Delay start by 2 seconds to let user observe the flow first
    const startTimeout = setTimeout(() => {
      // Execute with undefined apiKeys - server uses env vars
      executeFlow(nodes, edges, updateNodeState, undefined, demoAbortController?.signal)
        .then(() => {
          console.log("[NUX Demo] Execution completed");
          demoSetIsRunning?.(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            console.error("[NUX Demo] Execution error:", err);
          }
          demoSetIsRunning?.(false);
        });
    }, 2000);

    // Don't abort on unmount - let demo run to completion
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <HeroPanel>
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <div className="absolute inset-x-0 -top-12 h-[calc(100%+48px)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, minZoom: 0.1, maxZoom: 0.65 }}
            minZoom={0.1}
            maxZoom={1.0}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            panOnScroll={false}
            panOnDrag={false}
          />
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-30 w-[300px] -translate-x-1/2">
        {isRunning ? (
          <div className="pointer-events-none rounded-xl border bg-background/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Takes a prompt, generates a short story, then illustrates a key scene.
            </p>
            <hr className="my-3 border-border/50" />
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase leading-none tracking-wider text-muted-foreground/70">
              <span>Composer Agent</span>
              <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
            </div>
            <Shimmer className="text-sm font-medium" duration={1.5}>{progressLabel}</Shimmer>
          </div>
        ) : (
          <div className="rounded-xl border bg-background/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Takes a prompt, generates a short story, then illustrates a key scene.
            </p>
            <hr className="my-3 border-border/50" />
            <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase leading-none tracking-wider text-muted-foreground/70">
              <span>Composer Agent</span>
              <Check className="h-2.5 w-2.5 text-green-500" />
              <RotateCcw
                className="h-2.5 w-2.5 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                onClick={retryDemo}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowOutputs(true)}
              className="group flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              View outputs
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* Outputs Modal */}
      {showOutputs && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative m-4 flex max-h-[90%] w-full max-w-lg flex-col rounded-xl border bg-background shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Flow Outputs</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowOutputs(false)}
                className="rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">Composer Agent</div>

                {/* Input Prompt */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Prompt
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    {getOutputs().prompt || "No prompt"}
                  </div>
                </div>

                {/* Generated Story */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Story
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {getOutputs().story || "No story generated"}
                  </div>
                </div>

                {/* Generated Image */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Illustration
                  </div>
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    {(() => {
                      const imageOutput = getOutputs().image;
                      if (imageOutput && isImageOutput(imageOutput)) {
                        const imageData = parseImageOutput(imageOutput);
                        if (imageData) {
                          return (
                            <img
                              src={getImageDataUrl(imageData)}
                              alt="Generated illustration"
                              className="w-full h-auto"
                            />
                          );
                        }
                      }
                      return (
                        <div className="p-3 text-sm text-muted-foreground">
                          No image generated
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </HeroPanel>
  );
}

function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div
      className="inline-flex min-w-[106px] items-center justify-center gap-2 whitespace-nowrap rounded-full border bg-background/60 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground backdrop-blur-sm"
      aria-label={`Step ${currentStep} of 2`}
    >
      <span>Step {currentStep} of 2</span>
      <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
      <span aria-hidden className="inline-flex items-center gap-1">
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 1 ? "bg-foreground" : "bg-muted-foreground/30",
          ].join(" ")}
        />
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            currentStep === 2 ? "bg-foreground" : "bg-muted-foreground/30",
          ].join(" ")}
        />
      </span>
    </div>
  );
}

type NuxStep = "1" | "2" | "done";

interface WelcomeDialogProps {
  onOpenSettings: () => void;
}

function DialogShell({
  step,
  title,
  description,
  children,
  onBack,
  hero,
  preventOutsideClose,
  onClose,
}: {
  step: 1 | 2;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  onBack?: () => void;
  hero: ReactNode;
  preventOutsideClose?: boolean;
  onClose?: () => void;
}) {
  const closeButton = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="absolute right-4 top-4 z-30 cursor-pointer rounded-full border bg-background/70 backdrop-blur-sm hover:bg-background/80"
      aria-label="Close"
      onClick={onClose}
    >
      <X className="h-4 w-4" />
    </Button>
  );

  return (
    <DialogContent
      showCloseButton={false}
      className="h-[100dvh] w-screen max-w-none rounded-none border-0 p-0 gap-0 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-[980px] sm:rounded-lg sm:border"
      onInteractOutside={preventOutsideClose ? (e) => e.preventDefault() : undefined}
      onEscapeKeyDown={preventOutsideClose ? (e) => e.preventDefault() : undefined}
    >
      {onClose ? (
        closeButton
      ) : (
        <DialogClose asChild>{closeButton}</DialogClose>
      )}
      <div className="flex h-full flex-col overflow-y-auto sm:grid sm:overflow-hidden md:min-h-[560px] md:grid-cols-[1fr_1.15fr]">
        {/* Left: content */}
        <div className="relative flex shrink-0 flex-col justify-between p-6 sm:p-8">
          <div className="flex h-8 items-center justify-between gap-3 pr-12 md:pr-0">
            <div className="flex h-8 items-center">
              {onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="-ml-2 h-8 cursor-pointer px-2 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div className="flex h-8 items-center gap-2">
                  <div
                    aria-hidden
                    className="h-7 w-7 rounded-md border shadow-xs bg-[radial-gradient(120%_120%_at_20%_20%,hsl(var(--primary)/0.55),transparent_55%),radial-gradient(100%_100%_at_80%_80%,hsl(var(--foreground)/0.18),transparent_55%)]"
                  />
                  <span className="text-sm font-medium tracking-tight">Composer</span>
                </div>
              )}
            </div>

            <StepIndicator currentStep={step} />
          </div>

          <div className="mt-6 sm:mt-10">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm sm:mt-3 sm:text-[15px]">
                {description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 sm:mt-7">{children}</div>
          </div>

          <div className="mt-6 sm:mt-10" />
        </div>

        {/* Right: hero */}
        <div className="min-h-[280px] flex-1 border-t sm:min-h-[220px] md:border-t-0 md:border-l">
          {hero}
        </div>
      </div>
    </DialogContent>
  );
}

export function WelcomeDialog({ onOpenSettings }: WelcomeDialogProps) {
  const { user, isLoading, signInWithGoogle } = useAuth();
  const [nuxStep, setNuxStep] = useState<NuxStep>("1");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load NUX step from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as NuxStep | null;
      if (stored === "1" || stored === "2" || stored === "done") {
        setNuxStep(stored);
      }
    } catch {
      // localStorage unavailable, default to step 1
    }
    setIsLoaded(true);
  }, []);

  const advanceToStep2 = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "2");
    } catch {
      // localStorage unavailable
    }
    setNuxStep("2");
  };

  const completeNux = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      // localStorage unavailable
    }
    setNuxStep("done");
  };

  // Auto-advance to step 2 when user signs in during step 1
  useEffect(() => {
    if (isLoaded && user && nuxStep === "1") {
      advanceToStep2();
    }
  }, [isLoaded, user, nuxStep]);

  const handleSkipSignIn = () => {
    advanceToStep2();
  };

  const handleSetupApiKeys = () => {
    // Complete NUX first, then open settings to avoid focus flicker
    completeNux();
    onOpenSettings();
  };

  const handleDismissApiKeys = () => {
    completeNux();
  };

  const handleBackToSignIn = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setNuxStep("1");
  };

  // Early return before Dialog to avoid portal hydration issues
  if (!isLoaded) return null;

  // NUX complete - show nothing
  if (nuxStep === "done") return null;

  // Still loading auth - wait
  if (isLoading) return null;

  // Step 2: API Keys (show if step is "2" OR if user is signed in and hasn't completed NUX)
  if (nuxStep === "2" || user) {
    return (
      <Dialog
        open={true}
        onOpenChange={(open) => {
          if (!open) handleDismissApiKeys();
        }}
      >
        <DialogShell
          step={2}
          title="Bring Your Own API Keys"
          description="Connect your providers to start building"
          onBack={!user ? handleBackToSignIn : undefined}
          hero={<ProvidersToComposerHero />}
        >
          <div className="grid gap-5">
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">You stay in control</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Your keys, your costs, your privacy
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Mix and match providers</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Use OpenAI, Anthropic, and Google together
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Button onClick={handleSetupApiKeys} className="h-10 w-full cursor-pointer">
                Open API Keys
              </Button>
            </div>
          </div>
        </DialogShell>
      </Dialog>
    );
  }

  // Step 1: Sign in (only shown if not signed in)
  return (
    <Dialog open={true}>
      <DialogShell
        step={1}
        title="Welcome to Composer"
        description="A canvas for chaining AI models into creative workflows"
        hero={<MiniNodeCanvasDemo />}
        preventOutsideClose
        onClose={completeNux}
      >
        <div className="grid gap-6">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                <Link className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Chain any AI model</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Chain multiple AI models from different providers
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border bg-foreground/5">
                <Wand2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Composer AI builds with you</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  An AI agent that edits your flow as you describe changes
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button onClick={signInWithGoogle} className="h-10 w-full cursor-pointer">
              Continue with Google
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipSignIn}
              className="mt-2 h-10 w-full cursor-pointer"
            >
              Continue Without an Account
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You can sign in later from the profile menu
            </p>
          </div>
        </div>
      </DialogShell>
    </Dialog>
  );
}
