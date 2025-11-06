import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import Environment, { TreesGroup, CloudsGroup, useSceneFog } from "./Environment";
import Tree, { TreesField, useEnvironmentInteractionStore } from "./Tree";
import Cloud, { CloudsField } from "./Cloud";

/**
 * ThreeScene
 * Root 3D scene component providing a full-viewport Canvas configured with:
 * - DPR and shadow map
 * - Fog and sky
 * - Hemisphere and directional lights (with shadows)
 * - A camera rig that can follow the plane (scaffolded, uses a ref)
 *
 * PUBLIC_INTERFACE
 */
export default function ThreeScene({ className = "", children }) {
  return (
    <div className={`scene-root ${className}`} style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1.5)]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 6, 14], fov: 55, near: 0.1, far: 1500 }}
      >
        {/* Sky dome - parameters tuned for a bright, slightly hazy day */}
        <Sky inclination={0.49} azimuth={0.25} mieCoefficient={0.005} mieDirectionalG={0.7} rayleigh={2.5} turbidity={8} />

        {/* Lighting setup */}
        <Lights />

        {/* Ground + optional fog + simple objects (trees & clouds) */}
        <Suspense fallback={null}>
          <Environment
            fog={{ color: "#dbeafe", near: 40, far: 480 }}
            ground={{ size: 400, color: "#e5e7eb", roughness: 0.96, metalness: 0.0 }}
          >
            {/* Legacy simple batches for baseline visuals */}
            <TreesGroup count={18} radius={60} innerRadius={10} />
            <CloudsGroup count={6} radius={120} innerRadius={40} y={28} />

            {/* Interactive instances */}
            <TreesField count={16} radius={90} innerRadius={22} y={0} />
            <CloudsField count={10} radius={140} innerRadius={50} y={28} />
          </Environment>
        </Suspense>

        {/* Camera rig scaffold to follow the Plane (controlled via ref/props later) */}
        <CameraRig />

        {/* Allow external children (e.g., Plane, world objects) */}
        <Suspense fallback={null}>{children}</Suspense>

        {/* Dev stats (optional). Comment out in production if desired. */}
        {/* <StatsGl /> */}
      </Canvas>
      {/* Simple HUD counters overlay */}
      <HUDOverlay />
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Hook to read environment interaction counters for HUD
 */
export function useEnvironmentHUD() {
  return useEnvironmentInteractionStore((s) => ({
    treesCollected: s.treesCollected,
    cloudsFlownThrough: s.cloudsFlownThrough,
    lastInteraction: s.lastInteraction,
  }));
}

/**
 * Minimal HUD overlay displayed at top-left over the canvas.
 */
function HUDOverlay() {
  const { treesCollected, cloudsFlownThrough } = useEnvironmentHUD();
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        background: "var(--color-surface)",
        color: "var(--color-text)",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        boxShadow: "var(--shadow-sm)",
        padding: "8px 12px",
        fontSize: "12px",
      }}
    >
      <div><strong>🌲 Trees:</strong> {treesCollected}</div>
      <div><strong>☁️ Clouds:</strong> {cloudsFlownThrough}</div>
    </div>
  );
}

/**
 * Lights
 * HemisphereLight for ambient sky/ground contribution and DirectionalLight for sharp shadows.
 */
function Lights() {
  const dirLightRef = useRef();

  useEffect(() => {
    // Tweak shadow map for quality/performance balance
    const light = dirLightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 200;
    light.shadow.camera.left = -60;
    light.shadow.camera.right = 60;
    light.shadow.camera.top = 60;
    light.shadow.camera.bottom = -60;
  }, []);

  return (
    <>
      <hemisphereLight intensity={0.6} groundColor={"#718096"} color={"#ffffff"} />
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={[50, 80, 50]}
        intensity={1.3}
        color={"#ffffff"}
      />
    </>
  );
}

/**
 * CameraRig
 * Scaffold for a following camera. Currently eases camera toward a target position/orientation.
 * Later, we will wire this to the Plane component by reading its world position and orientation.
 */
function CameraRig({ followTarget = null }) {
  const { camera } = useThree();
  const targetPos = useRef([0, 6, 14]);
  const targetLook = useRef([0, 2, 0]);

  // Simple easing parameters; will be tuned later for plane following
  const ease = useMemo(() => ({ pos: 0.06, look: 0.12 }), []);

  useFrame(() => {
    // If we have a follow target with position/orientation, update desired target positions here later.
    // For now, maintain a fixed offset.
    const [tx, ty, tz] = targetPos.current;
    const [lx, ly, lz] = targetLook.current;

    // Ease camera position
    camera.position.x += (tx - camera.position.x) * ease.pos;
    camera.position.y += (ty - camera.position.y) * ease.pos;
    camera.position.z += (tz - camera.position.z) * ease.pos;

    // Ease lookAt by interpolating toward targetLook
    // Derive a forward direction from the camera's matrix
    const m = camera.matrixWorld.elements;
    const fwd = { x: -m[8], y: -m[9], z: -m[10] }; // camera forward vector
    const currentLookTarget = {
      x: camera.position.x + fwd.x,
      y: camera.position.y + fwd.y,
      z: camera.position.z + fwd.z,
    };
    currentLookTarget.x += (lx - currentLookTarget.x) * ease.look;
    currentLookTarget.y += (ly - currentLookTarget.y) * ease.look;
    currentLookTarget.z += (lz - currentLookTarget.z) * ease.look;
    camera.lookAt(currentLookTarget.x, currentLookTarget.y, currentLookTarget.z);
  });

  return null;
}

// Re-export helpful environment utilities so other modules can import from ThreeScene if preferred.
// PUBLIC_INTERFACE
export { Environment, TreesGroup, CloudsGroup, useSceneFog };
