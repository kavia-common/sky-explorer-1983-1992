import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import create from "zustand";

/**
 * Interaction store for environment objects (trees, clouds).
 * Exposes counters and last interaction info for HUD usage.
 */
// PUBLIC_INTERFACE
export const useEnvironmentInteractionStore = create((set, get) => ({
  treesCollected: 0,
  cloudsFlownThrough: 0,
  lastInteraction: null, // { type: 'tree'|'cloud', time: number }

  // PUBLIC_INTERFACE
  incrementTree: () =>
    set((s) => ({
      treesCollected: s.treesCollected + 1,
      lastInteraction: { type: "tree", time: Date.now() },
    })),
  // PUBLIC_INTERFACE
  incrementCloud: () =>
    set((s) => ({
      cloudsFlownThrough: s.cloudsFlownThrough + 1,
      lastInteraction: { type: "cloud", time: Date.now() },
    })),

  // PUBLIC_INTERFACE
  getSnapshot: () => {
    const s = get();
    return {
      treesCollected: s.treesCollected,
      cloudsFlownThrough: s.cloudsFlownThrough,
      lastInteraction: s.lastInteraction,
    };
  },
}));

/**
 * Small helper to compute distance between two vec3 arrays
 */
function dist3(a = [0, 0, 0], b = [0, 0, 0]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Tree component
 * A simple low-poly tree using cylinder (trunk) and cone (foliage). It highlights when the camera is near,
 * and on pressing 'E' while in proximity, it increments the trees counter.
 *
 * Props:
 * - position: [x,y,z]
 * - scale: number
 * - trunkColor: string
 * - leafColor: string
 * - proximityRadius: number (distance threshold to consider "near")
 * - onInteract: optional callback fired when interacted
 *
 * PUBLIC_INTERFACE
 */
export default function Tree({
  position = [0, 0, 0],
  scale = 1.0,
  trunkColor = "#8B5A2B",
  leafColor = "#2E7D32",
  proximityRadius = 5,
  onInteract,
  castShadow = false,
  receiveShadow = true,
}) {
  const groupRef = useRef();
  const trunkRef = useRef();
  const leafRef = useRef();
  const { camera, gl } = useThree();
  const [near, setNear] = useState(false);
  const [pulse, setPulse] = useState(0);

  // Track 'E' for interaction (keyboard)
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "e" && near) {
        useEnvironmentInteractionStore.getState().incrementTree();
        onInteract?.({ type: "tree", position });
        // Simple visual pulse feedback
        setPulse(1);
      }
    };
    // Attach to canvas element if available to avoid global capture
    const target = gl?.domElement || window;
    target.addEventListener("keydown", onKey);
    return () => target.removeEventListener("keydown", onKey);
  }, [near, onInteract, position, gl]);

  useFrame((_state, delta) => {
    // Measure proximity to camera
    const p = groupRef.current?.position;
    if (p && camera) {
      const d = dist3([p.x, p.y, p.z], [camera.position.x, camera.position.y, camera.position.z]);
      setNear(d <= proximityRadius);
    }

    // Pulse easing decay
    if (pulse > 0) {
      setPulse(Math.max(0, pulse - delta * 1.5));
    }

    // Subtle leaf bob or highlight
    if (leafRef.current) {
      const t = performance.now() * 0.001;
      const scaleUp = near ? 1.05 + pulse * 0.2 : 1.0 + pulse * 0.15;
      leafRef.current.scale.setScalar(scaleUp);
      leafRef.current.position.y = 1.8 * scale + Math.sin(t * 2) * 0.03;
    }
    if (trunkRef.current) {
      trunkRef.current.scale.y = 1.0 + pulse * 0.05;
    }
  });

  const dims = useMemo(
    () => ({
      trunk: { radiusTop: 0.12, radiusBottom: 0.18, height: 1.8 },
      foliage: { radius: 0.9, height: 1.6 },
    }),
    []
  );

  const leafEmissive = near ? "#3FBF5B" : "#000000";

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh ref={trunkRef} castShadow={castShadow} receiveShadow={receiveShadow} position={[0, dims.trunk.height * 0.5, 0]}>
        <cylinderGeometry args={[dims.trunk.radiusTop, dims.trunk.radiusBottom, dims.trunk.height, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} metalness={0.0} />
      </mesh>
      {/* Foliage */}
      <mesh
        ref={leafRef}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        position={[0, dims.trunk.height + dims.foliage.height * 0.4, 0]}
      >
        <coneGeometry args={[dims.foliage.radius, dims.foliage.height, 10]} />
        <meshStandardMaterial
          color={leafColor}
          roughness={0.7}
          metalness={0.05}
          emissive={leafEmissive}
          emissiveIntensity={near ? 0.25 : 0.0}
        />
      </mesh>
    </group>
  );
}

/**
 * PUBLIC_INTERFACE
 * TreesField
 * Utility to spawn many Tree instances in a ring area.
 * Props:
 *  - count, radius, innerRadius, y, scaleRange
 */
export function TreesField({
  count = 20,
  radius = 50,
  innerRadius = 8,
  y = 0,
  scaleRange = [0.8, 1.4],
  trunkColor,
  leafColor,
  castShadow = false,
  receiveShadow = true,
}) {
  const trees = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const r = innerRadius + Math.random() * (radius - innerRadius);
      const t = Math.random() * Math.PI * 2;
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      const s = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
      arr.push({ x, z, s });
    }
    return arr;
  }, [count, radius, innerRadius, scaleRange]);

  return (
    <group>
      {trees.map((t, i) => (
        <Tree
          key={i}
          position={[t.x, y, t.z]}
          scale={t.s}
          trunkColor={trunkColor}
          leafColor={leafColor}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  );
}
