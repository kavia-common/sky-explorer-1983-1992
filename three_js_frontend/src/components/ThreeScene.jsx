import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment as DreiEnvironment, Sky } from "@react-three/drei";

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
        {/* Fog for depth cueing */}
        <FogLayer />

        {/* Sky dome - parameters tuned for a bright, slightly hazy day */}
        <Sky inclination={0.49} azimuth={0.25} mieCoefficient={0.005} mieDirectionalG={0.7} rayleigh={2.5} turbidity={8} />

        {/* Lighting setup */}
        <Lights />

        {/* Global environment (placeholder uses drei Environment) */}
        <Suspense fallback={null}>
          <Environment />
        </Suspense>

        {/* Camera rig scaffold to follow the Plane (controlled via ref/props later) */}
        <CameraRig />

        {/* Allow external children (e.g., Plane, world objects) */}
        <Suspense fallback={null}>{children}</Suspense>

        {/* Dev stats (optional). Comment out in production if desired. */}
        {/* <StatsGl /> */}
      </Canvas>
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
 * FogLayer
 * Configurable fog using scene.fog.
 */
function FogLayer({ color = "#dbeafe", near = 30, far = 420 }) {
  const { scene } = useThree();
  useEffect(() => {
    const prevFog = scene.fog;
    // Access Fog class through scene's constructor chain to avoid direct import of 'three'
    const FogCtor = scene?.fog?.constructor || (scene && scene.constructor && scene.constructor.prototype && scene.constructor.prototype.fog && scene.constructor.prototype.fog.constructor);
    try {
      if (FogCtor) {
        // eslint-disable-next-line new-cap
        scene.fog = new FogCtor(color, near, far);
      } else if (scene && typeof scene === "object") {
        // Fallback: simple object to satisfy renderer (less ideal but safe)
        scene.fog = { color, near, far, isFog: true };
      }
    } catch {
      scene.fog = prevFog || null;
    }
    return () => {
      scene.fog = prevFog || null;
    };
  }, [scene, color, near, far]);
  return null;
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

/**
 * PUBLIC_INTERFACE
 * Environment placeholder for future customization.
 * Currently uses drei Environment with a preset-like soft lighting.
 */
export function Environment({ preset = "city" }) {
  // We map a few sensible defaults; can be swapped to HDRI assets later.
  return <DreiEnvironment preset={preset} background={false} blur={0.6} />;
}

/**
 * PUBLIC_INTERFACE
 * Plane placeholder export for later integration.
 * This is just a stub so that imports won't fail while we build other pieces.
 */
export function PlanePlaceholder() {
  return null;
}
