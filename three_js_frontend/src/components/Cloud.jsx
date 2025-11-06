import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useEnvironmentInteractionStore } from "./Tree";

/**
 * Compute distance between 3D vectors
 */
function dist3(a = [0, 0, 0], b = [0, 0, 0]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Cloud
 * A puffy cloud composed of several spheres. When the camera flies through its center radius,
 * it triggers a "fly-through" effect and increments a counter in the shared store.
 *
 * Props:
 * - position: [x,y,z]
 * - y: number (if position not given)
 * - color: string
 * - opacity: number
 * - scale: number
 * - radius: number (effective fly-through radius)
 *
 * PUBLIC_INTERFACE
 */
export default function Cloud({
  position = [0, 25, 0],
  color = "#ffffff",
  opacity = 0.95,
  scale = 1.0,
  radius = 2.0,
  castShadow = false,
  receiveShadow = false,
}) {
  const groupRef = useRef();
  const { camera } = useThree();
  const [active, setActive] = useState(false);
  const [pulse, setPulse] = useState(0);

  const cluster = useMemo(() => {
    const puffCount = 4 + Math.floor(Math.random() * 3); // 4-6
    return new Array(puffCount).fill(0).map(() => ({
      x: (Math.random() - 0.5) * 2.2,
      y: (Math.random() - 0.5) * 0.6 + 0.2,
      z: (Math.random() - 0.5) * 0.8,
      r: 0.7 + Math.random() * 0.7,
    }));
  }, []);

  useFrame((_state, delta) => {
    // Gently rotate the cloud group for life
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }

    // Detect fly-through by camera
    if (groupRef.current && camera) {
      const gp = groupRef.current.position;
      const d = dist3([gp.x, gp.y, gp.z], [camera.position.x, camera.position.y, camera.position.z]);
      const inside = d < radius * scale * 1.2;
      setActive(inside);

      // On entering the cloud core, trigger once then cooldown
      if (inside && pulse <= 0) {
        useEnvironmentInteractionStore.getState().incrementCloud();
        setPulse(1.2); // trigger effect
      }
    }

    // Pulse decay
    if (pulse > 0) setPulse(Math.max(0, pulse - delta * 1.2));
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {cluster.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, p.y, p.z]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          scale={1 + pulse * 0.25}
        >
          <sphereGeometry args={[p.r, 12, 12]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={Math.max(0.45, opacity - pulse * 0.3)}
            roughness={0.9}
            metalness={0.0}
            emissive={active ? "#88CCFF" : "#000000"}
            emissiveIntensity={active ? 0.2 : 0}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * PUBLIC_INTERFACE
 * CloudsField
 * Utility to spawn many clouds on an annulus area.
 */
export function CloudsField({
  count = 8,
  radius = 80,
  innerRadius = 20,
  y = 25,
  color = "#ffffff",
  opacity = 0.95,
  scaleRange = [0.8, 2.2],
  castShadow = false,
  receiveShadow = false,
}) {
  const clouds = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const r = innerRadius + Math.random() * (radius - innerRadius);
      const t = Math.random() * Math.PI * 2;
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      const s = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
      const rad = 1.6 + Math.random() * 1.4;
      return { x, z, s, rad };
    });
  }, [count, radius, innerRadius, scaleRange]);

  return (
    <group>
      {clouds.map((c, i) => (
        <Cloud
          key={i}
          position={[c.x, y, c.z]}
          color={color}
          opacity={opacity}
          scale={c.s}
          radius={c.rad}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  );
}
