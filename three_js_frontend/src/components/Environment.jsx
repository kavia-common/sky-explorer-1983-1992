import React, { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import Tree, { TreesField, useEnvironmentInteractionStore } from "./Tree";
import Cloud, { CloudsField } from "./Cloud";

/**
 * PUBLIC_INTERFACE
 * Environment
 * Provides a ground plane (receiveShadow), optional fog, and convenience groups
 * for trees and clouds. Designed to be dropped inside a <Canvas>.
 *
 * Props:
 *  - ground:
 *      {
 *        size?: number | [number, number] - plane dimensions (default 200)
 *        color?: string                    - ground material color (default "#e5e7eb")
 *        position?: [x,y,z]                - ground position (default [0,0,0])
 *        rotation?: [x,y,z]                - radians rotation (default [-Math.PI/2,0,0])
 *        receiveShadow?: boolean           - receive shadows (default true)
 *        metalness?: number                - material metalness (default 0.0)
 *        roughness?: number                - material roughness (default 0.95)
 *      }
 *  - fog:
 *      false | {
 *        color?: string  - fog color (default "#dbeafe")
 *        near?: number   - fog near (default 40)
 *        far?: number    - fog far (default 480)
 *      }
 *  - children: React nodes (e.g., <TreesGroup/> <CloudsGroup/> or anything)
 *
 * Example:
 *   <Environment fog={{ color: "#dbeafe", near: 40, far: 480 }}>
 *     <TreesGroup count={30} radius={60} />
 *     <CloudsGroup count={10} radius={100} y={28} />
 *   </Environment>
 */
export default function Environment({
  ground = {},
  fog = false,
  children,
  ...props
}) {
  useSceneFog(fog);

  const {
    size = 200,
    color = "#e5e7eb",
    position = [0, 0, 0],
    rotation = [-Math.PI / 2, 0, 0],
    receiveShadow = true,
    metalness = 0.0,
    roughness = 0.95,
  } = ground || {};

  const groundSize = Array.isArray(size) ? size : [size, size];

  return (
    <group {...props}>
      {/* Receive-only ground plane to catch shadows */}
      <mesh
        rotation={rotation}
        position={position}
        receiveShadow={receiveShadow}
      >
        <planeGeometry args={[groundSize[0], groundSize[1], 1, 1]} />
        <meshStandardMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>

      {/* User-supplied environment children (trees, clouds, etc.) */}
      {children}
    </group>
  );
}

/**
 * PUBLIC_INTERFACE
 * useSceneFog
 * Hook that sets and cleans up fog on the active scene.
 * fogOpt can be:
 *   - false: no fog
 *   - true: default fog
 *   - { color, near, far }: custom fog
 */
export function useSceneFog(fogOpt = false) {
  const { scene } = useThree();

  useEffect(() => {
    const prevFog = scene.fog;
    if (!fogOpt) {
      scene.fog = null;
      return () => {
        scene.fog = prevFog || null;
      };
    }

    const {
      color = "#dbeafe",
      near = 40,
      far = 480,
    } = fogOpt === true ? {} : fogOpt;

    // Use three.js Fog if available via global THREE on scene constructor
    // Fallback to a simple compatible object if constructor not reachable.
    let FogCtor = null;
    try {
      FogCtor =
        // Try standard access
        (scene && scene.constructor && scene.constructor.Fog) ||
        // Some bundlers don't expose Fog on constructor, so check the existing fog instance if any
        (scene.fog && scene.fog.constructor) ||
        null;
    } catch {
      FogCtor = null;
    }

    try {
      // eslint-disable-next-line new-cap
      scene.fog = FogCtor ? new FogCtor(color, near, far) : { color, near, far, isFog: true };
    } catch {
      scene.fog = { color, near, far, isFog: true };
    }

    return () => {
      scene.fog = prevFog || null;
    };
  }, [scene, fogOpt]);
}

/**
 * Helpers for generating random positions on an annulus/disc on the XZ plane.
 */
function randOnDisc(radiusMin, radiusMax) {
  const r = radiusMin + Math.random() * (radiusMax - radiusMin);
  const theta = Math.random() * Math.PI * 2;
  return [Math.cos(theta) * r, Math.sin(theta) * r];
}

/**
 * PUBLIC_INTERFACE
 * TreesGroup
 * Renders a simple batch of low-poly tree impostors using primitive geometry.
 *
 * Props:
 *  - count?: number     (default 20)
 *  - radius?: number    (default 50) - radial distribution range
 *  - innerRadius?: number (default 8) - keep area near center clear
 *  - y?: number         (default 0) - ground height
 *  - trunkColor?: string (default "#8B5A2B")
 *  - leafColor?: string  (default "#2E7D32")
 *  - scale?: number      (default 1)
 */
export function TreesGroup({
  count = 20,
  radius = 50,
  innerRadius = 8,
  y = 0,
  trunkColor = "#8B5A2B",
  leafColor = "#2E7D32",
  scale = 1,
  receiveShadow = true,
  castShadow = false,
}) {
  const instances = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const [x, z] = randOnDisc(innerRadius, radius);
      const s = 0.8 + Math.random() * 0.6;
      const h = 1.6 + Math.random() * 1.2;
      const leafS = 1.0 + Math.random() * 0.6;
      return { x, z, s, h, leafS };
    });
  }, [count, radius, innerRadius]);

  return (
    <group>
      {instances.map((it, i) => (
        <group key={i} position={[it.x, y, it.z]} scale={[scale * it.s, scale * it.s, scale * it.s]}>
          {/* Trunk */}
          <mesh castShadow={castShadow} receiveShadow={receiveShadow} position={[0, it.h * 0.5, 0]}>
            <cylinderGeometry args={[0.12, 0.18, it.h, 6]} />
            <meshStandardMaterial color={trunkColor} roughness={0.9} metalness={0.0} />
          </mesh>
          {/* Leaves (cone-like) */}
          <mesh castShadow={castShadow} receiveShadow={receiveShadow} position={[0, it.h + 0.6 * it.leafS, 0]}>
            <coneGeometry args={[0.8 * it.leafS, 1.4 * it.leafS, 8]} />
            <meshStandardMaterial color={leafColor} roughness={0.7} metalness={0.05} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * PUBLIC_INTERFACE
 * CloudsGroup
 * Renders a collection of puffy clouds made of several overlapping spheres.
 *
 * Props:
 *  - count?: number     (default 8)
 *  - radius?: number    (default 80) - radial distribution range
 *  - innerRadius?: number (default 20) - keep the center clear
 *  - y?: number         (default 25) - cloud height
 *  - color?: string     (default "#ffffff")
 *  - opacity?: number   (default 0.95)
 *  - scale?: number     (default 1.0)
 */
export function CloudsGroup({
  count = 8,
  radius = 80,
  innerRadius = 20,
  y = 25,
  color = "#ffffff",
  opacity = 0.95,
  scale = 1.0,
  castShadow = false,
  receiveShadow = false,
}) {
  const clouds = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const [x, z] = randOnDisc(innerRadius, radius);
      const s = 0.8 + Math.random() * 1.4;
      const puffCount = 3 + Math.floor(Math.random() * 3); // 3-5 spheres
      const puffs = new Array(puffCount).fill(0).map(() => ({
        x: (Math.random() - 0.5) * 2.2,
        y: (Math.random() - 0.5) * 0.6 + 0.2,
        z: (Math.random() - 0.5) * 0.8,
        r: 0.7 + Math.random() * 0.7,
      }));
      return { x, z, s, puffs };
    });
  }, [count, radius, innerRadius]);

  return (
    <group>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, y, c.z]} scale={[scale * c.s, scale * c.s, scale * c.s]}>
          {c.puffs.map((p, j) => (
            <mesh
              key={j}
              position={[p.x, p.y, p.z]}
              castShadow={castShadow}
              receiveShadow={receiveShadow}
            >
              <sphereGeometry args={[p.r, 12, 12]} />
              <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.9} metalness={0.0} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
