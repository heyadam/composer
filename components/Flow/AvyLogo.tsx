"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

extend({ Line2, LineMaterial, LineGeometry });

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
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const outerGlowRef = useRef<THREE.InstancedMesh>(null);
  const phase = useRef(0);
  const intensity = useRef(0);

  const { nodes, nodeCount, lineObjects, lineMaterials, dummy } = useMemo(() => {
    const { nodes } = generateCNodes();
    const curveSegments = 24;

    // Helper to create curved arc points
    const createArcPoints = (startNode: THREE.Vector3, midNode: THREE.Vector3, endNode: THREE.Vector3) => {
      const points: number[] = [];

      // First curve: startNode to midNode
      const mid1 = new THREE.Vector3().addVectors(startNode, midNode).multiplyScalar(0.5);
      const avgRadius1 = (startNode.length() + midNode.length()) / 2;
      mid1.normalize().multiplyScalar(avgRadius1 * 1.25);
      const curve1 = new THREE.QuadraticBezierCurve3(startNode, mid1, midNode);
      const pts1 = curve1.getPoints(curveSegments);

      // Second curve: midNode to endNode
      const mid2 = new THREE.Vector3().addVectors(midNode, endNode).multiplyScalar(0.5);
      const avgRadius2 = (midNode.length() + endNode.length()) / 2;
      mid2.normalize().multiplyScalar(avgRadius2 * 1.25);
      const curve2 = new THREE.QuadraticBezierCurve3(midNode, mid2, endNode);
      const pts2 = curve2.getPoints(curveSegments);

      // Combine into one continuous polyline (skip first point of second curve to avoid duplicate)
      for (const pt of pts1) {
        points.push(pt.x, pt.y, pt.z);
      }
      for (let i = 1; i < pts2.length; i++) {
        points.push(pts2[i].x, pts2[i].y, pts2[i].z);
      }

      return points;
    };

    // Create line material helper
    const createLineMaterial = () => new LineMaterial({
      color: 0xd0d8e0,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      resolution: new THREE.Vector2(512, 512),
    });

    const lineObjects: Line2[] = [];
    const lineMaterials: LineMaterial[] = [];

    // Outer arc: nodes 0 → 1 → 2 (continuous polyline)
    const outerArcPositions = createArcPoints(nodes[0], nodes[1], nodes[2]);
    const outerArcGeom = new LineGeometry();
    outerArcGeom.setPositions(outerArcPositions);
    const outerMat = createLineMaterial();
    lineMaterials.push(outerMat);
    lineObjects.push(new Line2(outerArcGeom, outerMat));

    // Inner arc: nodes 3 → 4 → 5 (continuous polyline)
    const innerArcPositions = createArcPoints(nodes[3], nodes[4], nodes[5]);
    const innerArcGeom = new LineGeometry();
    innerArcGeom.setPositions(innerArcPositions);
    const innerMat = createLineMaterial();
    lineMaterials.push(innerMat);
    lineObjects.push(new Line2(innerArcGeom, innerMat));

    // Top cap: straight line 0 → 3
    const topCapGeom = new LineGeometry();
    topCapGeom.setPositions([nodes[0].x, nodes[0].y, nodes[0].z, nodes[3].x, nodes[3].y, nodes[3].z]);
    const topMat = createLineMaterial();
    lineMaterials.push(topMat);
    lineObjects.push(new Line2(topCapGeom, topMat));

    // Bottom cap: straight line 2 → 5
    const bottomCapGeom = new LineGeometry();
    bottomCapGeom.setPositions([nodes[2].x, nodes[2].y, nodes[2].z, nodes[5].x, nodes[5].y, nodes[5].z]);
    const bottomMat = createLineMaterial();
    lineMaterials.push(bottomMat);
    lineObjects.push(new Line2(bottomCapGeom, bottomMat));

    return {
      nodes,
      nodeCount: nodes.length,
      lineObjects,
      lineMaterials,
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
    lineMaterials.forEach(mat => { mat.opacity = lineOpacity; });
  });

  return (
    <group ref={groupRef}>
      {/* All edge connections */}
      {lineObjects.map((line, i) => (
        <primitive key={i} object={line} />
      ))}

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
