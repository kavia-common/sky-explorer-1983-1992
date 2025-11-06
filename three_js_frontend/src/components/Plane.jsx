import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usePlanePhysics } from "../hooks/usePlanePhysics";
import { useKeyboardControlsStore } from "../hooks/useKeyboardControls";

/**
 * PUBLIC_INTERFACE
 * Plane component (primitive mesh model)
 *
 * - Uses usePlanePhysics for simple flight physics.
 * - Uses useKeyboardControlsStore to ensure global keyboard listeners are active.
 * - Animates a propeller.
 * - Exposes ref API for camera rigs: world position, quaternion, and a group ref.
 *
 * Props:
 *  - color (string): base color for fuselage/wings
 *  - accentColor (string): color for accents/propeller
 *  - initialState (object): pass-through to usePlanePhysics initial state
 *  - physicsParams (object): pass-through to usePlanePhysics params
 *  - scale (number): overall scale for the plane model
 *  - castShadow (boolean): whether meshes cast shadow (default true)
 *  - receiveShadow (boolean): whether meshes receive shadow (default true)
 *
 * Example usage:
 *  const planeRef = useRef();
 *  <Plane ref={planeRef} />
 *  // Later in a camera rig:
 *  // planeRef.current?.getWorldPosition(), .getWorldQuaternion()
 */
const Plane = forwardRef(function Plane(
  {
    color = "#2563EB",
    accentColor = "#F59E0B",
    initialState,
    physicsParams,
    scale = 1,
    castShadow = true,
    receiveShadow = true,
    ...props
  },
  ref
) {
  // Ensure keyboard listeners are attached once in the app; safe to call multiple times.
  useKeyboardControlsStore();

  // Physics API
  const physics = usePlanePhysics(initialState, physicsParams);

  // Refs for 3D parts
  const groupRef = useRef();
  const fuselageRef = useRef();
  const leftWingRef = useRef();
  const rightWingRef = useRef();
  const tailRef = useRef();
  const propellerRef = useRef();

  // Expose a small API for camera rigs / external systems
  useImperativeHandle(ref, () => ({
    group: groupRef,
    // PUBLIC_INTERFACE
    getWorldPosition: () => {
      const g = groupRef.current;
      if (!g) return [0, 0, 0];
      g.updateWorldMatrix(true, false);
      const e = g.matrixWorld.elements;
      // Extract position from matrixWorld
      return [e[12], e[13], e[14]];
    },
    // PUBLIC_INTERFACE
    getWorldQuaternion: () => {
      const g = groupRef.current;
      if (!g) return [0, 0, 0, 1];
      // Use object's quaternion directly (already world when updated by parent)
      return [g.quaternion.x, g.quaternion.y, g.quaternion.z, g.quaternion.w];
    },
    // PUBLIC_INTERFACE
    getPhysicsState: () => physics.getState(),
    // PUBLIC_INTERFACE
    reset: (opts) => physics.reset(opts),
    // PUBLIC_INTERFACE
    start: () => physics.start(),
    // PUBLIC_INTERFACE
    stop: () => physics.stop(),
  }), [physics]);

  // Cached dimensions for primitive model
  const dims = useMemo(() => {
    // Basic dimensions for a small plane
    return {
      fuselage: { radiusTop: 0.25, radiusBottom: 0.35, height: 2.2, radialSegments: 12 },
      wing: { x: 3.6, y: 0.08, z: 0.8 },
      tail: { x: 1.2, y: 0.06, z: 0.4 },
      stabilizer: { x: 0.8, y: 0.05, z: 0.2 },
      propeller: { radius: 0.18, length: 1.2, bladeWidth: 0.09, hubRadius: 0.12 },
    };
  }, []);

  // Apply physics to transform each frame, and animate the propeller
  useFrame((_state, delta) => {
    // Step physics
    physics.update(delta);

    // Read state
    const { position, orientation, speed } = physics.getState();

    // Apply transform to the group
    if (groupRef.current) {
      const g = groupRef.current;
      g.position.set(position[0], position[1], position[2]);
      // rotation order: x=pitch, y=yaw, z=roll
      g.rotation.set(orientation.pitch, orientation.yaw, orientation.roll);
      g.scale.setScalar(scale);
    }

    // Propeller animation speed proportional to forward speed + base idle spin
    if (propellerRef.current) {
      const rpm = 40 + Math.min(240, speed * 8); // simple mapping from speed to spin
      propellerRef.current.rotation.z += (rpm * Math.PI * 2 / 60) * delta;
    }
  });

  // Light AO-ish color
  const wingColor = useMemo(() => color, [color]);
  const fuselageColor = useMemo(() => color, [color]);
  const propColor = useMemo(() => accentColor, [accentColor]);

  // Minimal plane made from primitives:
  // - Fuselage: capsule-like using a cylinder
  // - Wings: two boxes
  // - Tail: small box + vertical stabilizer
  // - Propeller: thin box blades + hub
  return (
    <group ref={groupRef} {...props}>
      {/* Fuselage */}
      <mesh ref={fuselageRef} castShadow={castShadow} receiveShadow={receiveShadow} position={[0, 0, 0]}>
        <cylinderGeometry args={[dims.fuselage.radiusTop, dims.fuselage.radiusBottom, dims.fuselage.height, dims.fuselage.radialSegments]} />
        <meshStandardMaterial color={fuselageColor} metalness={0.1} roughness={0.5} />
      </mesh>

      {/* Nose cone (simple sphere) */}
      <mesh castShadow={castShadow} receiveShadow={receiveShadow} position={[0, 0, dims.fuselage.height / 2 + 0.2]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color={propColor} metalness={0.2} roughness={0.4} />
      </mesh>

      {/* Wings */}
      <mesh
        ref={leftWingRef}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        position={[-dims.wing.x / 2 + 0.2, 0, 0]}
      >
        <boxGeometry args={[dims.wing.x, dims.wing.y, dims.wing.z]} />
        <meshStandardMaterial color={wingColor} metalness={0.05} roughness={0.6} />
      </mesh>
      <mesh
        ref={rightWingRef}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        position={[dims.wing.x / 2 - 0.2, 0, 0]}
      >
        <boxGeometry args={[dims.wing.x, dims.wing.y, dims.wing.z]} />
        <meshStandardMaterial color={wingColor} metalness={0.05} roughness={0.6} />
      </mesh>

      {/* Tail horizontal stabilizer */}
      <mesh
        ref={tailRef}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        position={[0, 0.2, -dims.fuselage.height / 2 + 0.4]}
      >
        <boxGeometry args={[dims.tail.x, dims.tail.y, dims.tail.z]} />
        <meshStandardMaterial color={wingColor} metalness={0.05} roughness={0.6} />
      </mesh>

      {/* Tail vertical stabilizer */}
      <mesh castShadow={castShadow} receiveShadow={receiveShadow} position={[0, 0.45, -dims.fuselage.height / 2 + 0.5]}>
        <boxGeometry args={[dims.stabilizer.x * 0.25, dims.stabilizer.z, dims.stabilizer.y]} />
        <meshStandardMaterial color={wingColor} metalness={0.05} roughness={0.6} />
      </mesh>

      {/* Propeller assembly at nose */}
      <group ref={propellerRef} position={[0, 0, dims.fuselage.height / 2 + 0.2]}>
        {/* Hub */}
        <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
          <cylinderGeometry args={[dims.propeller.hubRadius, dims.propeller.hubRadius, 0.1, 12]} />
          <meshStandardMaterial color={propColor} metalness={0.3} roughness={0.35} />
        </mesh>
        {/* Blade 1 */}
        <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
          <boxGeometry args={[dims.propeller.bladeWidth, dims.propeller.bladeWidth, dims.propeller.length]} />
          <meshStandardMaterial color={propColor} metalness={0.2} roughness={0.4} />
        </mesh>
        {/* Blade 2 (perpendicular) */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow={castShadow} receiveShadow={receiveShadow}>
          <boxGeometry args={[dims.propeller.bladeWidth, dims.propeller.bladeWidth, dims.propeller.length]} />
          <meshStandardMaterial color={propColor} metalness={0.2} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
});

export default Plane;
