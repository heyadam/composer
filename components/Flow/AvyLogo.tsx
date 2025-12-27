"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

extend({ LineSegments2, LineMaterial, LineSegmentsGeometry });

interface AvyLogoProps {
  isPanning?: boolean;
  canvasWidth?: number;
}

// Generate 6-node constellation "C"
function generateCNodes(): { nodes: THREE.Vector3[]; edges: [number, number][] } {
  const nodes: THREE.Vector3[] = [];
  const edges: [number, number][] = [];

  // C shape using proper arc angles - opening faces right
  const startAngle = Math.PI * 0.35;   // ~63° - top opening
  const endAngle = Math.PI * 1.65;     // ~297° - bottom opening
  const outerRadius = 0.95;
  const innerRadius = 0.45;

  // Outer arc: 3 nodes (indices 0-2)
  const outerAngles = [startAngle, Math.PI, endAngle];
  for (const angle of outerAngles) {
    nodes.push(new THREE.Vector3(
      Math.cos(angle) * outerRadius,
      Math.sin(angle) * outerRadius,
      0
    ));
  }

  // Inner arc: 3 nodes (indices 3-5)
  for (const angle of outerAngles) {
    nodes.push(new THREE.Vector3(
      Math.cos(angle) * innerRadius,
      Math.sin(angle) * innerRadius,
      0
    ));
  }

  // --- EDGES (6 total) ---

  // Outer arc curve
  edges.push([0, 1]);
  edges.push([1, 2]);

  // Inner arc curve
  edges.push([3, 4]);
  edges.push([4, 5]);

  // End caps - close the C
  edges.push([0, 3]);  // Top cap
  edges.push([2, 5]);  // Bottom cap

  return { nodes, edges };
}

function NodeGraph({ isPanning }: { isPanning?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<LineSegments2>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const outerGlowRef = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const intensity = useRef(0);

  const { nodes, nodeCount, lines, lineMaterial, dummy } = useMemo(() => {
    const { nodes, edges } = generateCNodes();

    // Identify arc edges for curved rendering
    const outerArcEdges = new Set<string>();
    const innerArcEdges = new Set<string>();

    // Outer arc: nodes 0-2
    outerArcEdges.add("0-1");
    outerArcEdges.add("1-2");
    // Inner arc: nodes 3-5
    innerArcEdges.add("3-4");
    innerArcEdges.add("4-5");

    const positions: number[] = [];
    const curveSegments = 12;

    edges.forEach(([i, j]) => {
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      const isArc = outerArcEdges.has(key) || innerArcEdges.has(key);

      if (isArc) {
        // Curved edge following the arc - bow outward from center
        const start = nodes[i];
        const end = nodes[j];
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        // Push control point outward significantly for visible curve
        const avgRadius = (start.length() + end.length()) / 2;
        mid.normalize().multiplyScalar(avgRadius * 1.25);

        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const points = curve.getPoints(curveSegments);

        for (let k = 0; k < points.length - 1; k++) {
          positions.push(points[k].x, points[k].y, points[k].z);
          positions.push(points[k + 1].x, points[k + 1].y, points[k + 1].z);
        }
      } else {
        // Straight edge
        positions.push(nodes[i].x, nodes[i].y, nodes[i].z);
        positions.push(nodes[j].x, nodes[j].y, nodes[j].z);
      }
    });

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(positions);

    // Clean, subtle line material
    const lineMaterial = new LineMaterial({
      color: 0xd0d8e0,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.35,
      resolution: new THREE.Vector2(512, 512),
    });

    const lines = new LineSegments2(geometry, lineMaterial);

    return {
      nodes,
      nodeCount: nodes.length,
      lines,
      lineMaterial,
      dummy: new THREE.Object3D(),
    };
  }, []);

  // Initialize node positions
  useMemo(() => {
    if (!nodesRef.current || !glowRef.current || !outerGlowRef.current) return;

    nodes.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      nodesRef.current!.setMatrixAt(i, dummy.matrix);

      // Inner glow - slightly larger than node
      dummy.scale.setScalar(1.8);
      dummy.updateMatrix();
      glowRef.current!.setMatrixAt(i, dummy.matrix);

      // Outer soft glow (bloom effect) - much larger
      dummy.scale.setScalar(3.5);
      dummy.updateMatrix();
      outerGlowRef.current!.setMatrixAt(i, dummy.matrix);
    });

    nodesRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
    outerGlowRef.current.instanceMatrix.needsUpdate = true;
  }, [nodes, dummy]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Intensity animation
    const target = isPanning ? 1 : 0;
    const lerpSpeed = isPanning ? 10 : 2.5;
    intensity.current += (target - intensity.current) * Math.min(delta * lerpSpeed, 1);

    // Phase accumulation - very subtle
    const speed = 0.3 + intensity.current * 0.4;
    phase.current += delta * speed;

    // Very gentle rotation
    groupRef.current.rotation.z = Math.sin(phase.current * 0.25) * 0.03;
    groupRef.current.rotation.y = Math.sin(phase.current * 0.15) * 0.06;

    // Animate node scales for subtle pulse effect
    if (nodesRef.current && glowRef.current && outerGlowRef.current) {
      nodes.forEach((pos, i) => {
        // Staggered wave effect
        const waveOffset = i * 0.4;
        const pulse = Math.sin(phase.current * 1.5 + waveOffset) * 0.5 + 0.5;
        const pulseFactor = 1 + pulse * 0.1 * (0.4 + intensity.current * 0.6);

        dummy.position.copy(pos);
        dummy.scale.setScalar(pulseFactor);
        dummy.updateMatrix();
        nodesRef.current!.setMatrixAt(i, dummy.matrix);

        // Inner glow pulses with node
        const glowPulse = 1.8 + pulse * 0.3 * (0.5 + intensity.current * 0.5);
        dummy.scale.setScalar(glowPulse);
        dummy.updateMatrix();
        glowRef.current!.setMatrixAt(i, dummy.matrix);

        // Outer glow - gentler pulse
        const outerPulse = 3.5 + pulse * 0.5 * intensity.current;
        dummy.scale.setScalar(outerPulse);
        dummy.updateMatrix();
        outerGlowRef.current!.setMatrixAt(i, dummy.matrix);
      });

      nodesRef.current.instanceMatrix.needsUpdate = true;
      glowRef.current.instanceMatrix.needsUpdate = true;
      outerGlowRef.current.instanceMatrix.needsUpdate = true;
    }

    // Subtle line opacity animation
    const lineOpacity = 0.35 + intensity.current * 0.15 + Math.sin(phase.current * 1.2) * 0.05;
    lineMaterial.opacity = lineOpacity;
  });

  return (
    <group ref={groupRef}>
      {/* All edge connections */}
      <primitive object={lines} ref={linesRef} />

      {/* Outer soft glow (bloom layer) */}
      <instancedMesh ref={outerGlowRef} args={[undefined, undefined, nodeCount]}>
        <circleGeometry args={[0.045, 24]} />
        <meshBasicMaterial
          color="#c0d8f0"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Inner glow halos */}
      <instancedMesh ref={glowRef} args={[undefined, undefined, nodeCount]}>
        <circleGeometry args={[0.038, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Node spheres - bright, crisp */}
      <instancedMesh ref={nodesRef} args={[undefined, undefined, nodeCount]}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

export function AvyLogo({ isPanning, canvasWidth }: AvyLogoProps) {
  const isCompact = canvasWidth !== undefined && canvasWidth <= 800;
  const iconSize = isCompact ? 32 : 48;
  const textSize = isCompact ? "text-base" : "text-lg";

  return (
    <div className="flex items-center gap-2 pointer-events-none select-none">
      <div style={{ width: iconSize, height: iconSize }}>
        <Canvas
          camera={{ position: [0, 0, 3], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[2, 4]}
          style={{ background: "transparent" }}
        >
          <NodeGraph isPanning={isPanning} />
        </Canvas>
      </div>
      <span className={`text-white font-medium ${textSize} tracking-wide`}>composer</span>
    </div>
  );
}
