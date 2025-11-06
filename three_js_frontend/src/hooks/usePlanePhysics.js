import { useCallback, useMemo, useRef } from "react";
import { getControlsSnapshot } from "./useKeyboardControls";

/**
 * Simple vector utility helpers to avoid importing three.js here.
 * Using plain arrays [x,y,z] for position and velocity.
 */
function addVec3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function scaleVec3(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
function lengthVec3(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}
function normalizeVec3(a) {
  const len = lengthVec3(a) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

/**
 * Integrator helper:
 * Applies acceleration to velocity and integrates position using semi-implicit Euler.
 */
function integrate(state, accel, dt) {
  state.velocity = addVec3(state.velocity, scaleVec3(accel, dt));
  state.position = addVec3(state.position, scaleVec3(state.velocity, dt));
}

/**
 * Compute forward/right/up vectors from yaw/pitch/roll (radians).
 * - yaw: rotation around y (turn left/right) -> heading across x/z plane
 * - pitch: rotation around x (nose up/down)
 * - roll: rotation around z (bank)
 *
 * For simplicity we compute:
 *  forward from yaw and pitch
 *  right as perpendicular in xz-plane adjusted by roll for a simple roll effect on lift/turn
 *  up approximated by cross of right and forward (not fully accurate but sufficient here)
 */
function getBasisFromEuler({ yaw, pitch, roll }) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  // Forward: apply yaw then pitch
  const forward = normalizeVec3([sy * cp, -sp, cy * cp]);

  // Right vector on ground plane from yaw (before roll), then apply a simple roll tilt
  const rightGround = [cy, 0, -sy];

  // Apply roll effect: rotate rightGround around forward by roll to approximate banking
  const sr = Math.sin(roll);
  const cr = Math.cos(roll);
  // Using a simple combination to simulate tilt (not a full rotation matrix)
  const right = normalizeVec3([
    rightGround[0] * cr,
    sr,
    rightGround[2] * cr,
  ]);

  // Up as cross(right, forward)
  const up = normalizeVec3([
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ]);

  return { forward, right, up };
}

/**
 * Default physics parameters
 */
const DEFAULT_PARAMS = {
  thrust: 12.0,          // Base forward acceleration (m/s^2)
  boostMultiplier: 1.8,  // Boost scale
  brakeFactor: 0.6,      // Multiplies thrust when brake is held (also adds drag)
  drag: 0.2,             // Linear drag coefficient (proportional to velocity)
  damping: 0.02,         // Velocity damping (percent per second)
  gravity: 9.81,         // Gravity (m/s^2) downward
  liftFactor: 6.0,       // Lift force factor proportional to forward speed and pitch/roll
  yawRate: 1.6,          // Radians/sec yaw change at full input
  pitchRate: 1.2,        // Radians/sec pitch change at full input
  rollRate: 1.8,         // Radians/sec roll change at full input
  minSpeed: 2.0,         // Minimum speed clamp (m/s)
  maxSpeed: 80.0,        // Maximum speed clamp (m/s)
  groundY: 0.0,          // Ground plane y
  restitution: 0.0,      // Bounce factor on ground collision (0 = no bounce)
};

/**
 * Default initial state
 */
const DEFAULT_STATE = {
  position: [0, 10, 0],
  velocity: [0, 0, 0],
  orientation: {
    pitch: 0,
    roll: 0,
    yaw: 0,
  },
  running: true,
};

/**
 * Clamp orientation values for stability
 */
function clampOrientation(o) {
  // Limit pitch to avoid flipping
  o.pitch = clamp(o.pitch, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  // Roll can spin; allow full range but keep it within [-PI, PI] for numeric stability
  if (o.roll > Math.PI) o.roll -= 2 * Math.PI;
  if (o.roll < -Math.PI) o.roll += 2 * Math.PI;
  // Yaw wraps
  if (o.yaw > Math.PI) o.yaw -= 2 * Math.PI;
  if (o.yaw < -Math.PI) o.yaw += 2 * Math.PI;
}

/**
 * PUBLIC_INTERFACE
 * usePlanePhysics hook
 * Manages plane physics state and provides an update function suitable for react-three-fiber's useFrame.
 *
 * Returns:
 *  {
 *    getState: () => {
 *      position: [x,y,z],
 *      velocity: [vx,vy,vz],
 *      orientation: { pitch, roll, yaw },
 *      speed: number,
 *      running: boolean
 *    },
 *    // Call from r3f's useFrame: update(delta) or update({ delta })
 *    update: (deltaOrObj) => void,
 *    start: () => void,
 *    stop: () => void,
 *    reset: (opts?) => void,
 *    setParams: (partialParams) => void
 *  }
 */
export function usePlanePhysics(initialState = {}, params = {}) {
  const stateRef = useRef({
    ...DEFAULT_STATE,
    ...initialState,
    orientation: { ...DEFAULT_STATE.orientation, ...(initialState.orientation || {}) },
  });
  const paramsRef = useRef({ ...DEFAULT_PARAMS, ...params });

  // PUBLIC_INTERFACE
  const setParams = useCallback((partial) => {
    paramsRef.current = { ...paramsRef.current, ...(partial || {}) };
  }, []);

  // PUBLIC_INTERFACE
  const getState = useCallback(() => {
    const s = stateRef.current;
    const speed = lengthVec3(s.velocity);
    return {
      position: [...s.position],
      velocity: [...s.velocity],
      orientation: { ...s.orientation },
      speed,
      running: !!s.running,
    };
  }, []);

  // Update orientation based on controls
  const applyControlsToOrientation = useCallback((controls, dt) => {
    const s = stateRef.current;
    const p = paramsRef.current;

    let yawInput = 0;
    let pitchInput = 0;
    let rollInput = 0;

    // Movement keys
    if (controls.yawLeft) yawInput -= 1;
    if (controls.yawRight) yawInput += 1;

    // A/D roll, W/S pitch by default for planes
    if (controls.left) rollInput -= 1;
    if (controls.right) rollInput += 1;

    if (controls.forward) pitchInput -= 1; // W -> nose down (negative pitch)
    if (controls.back) pitchInput += 1;    // S -> nose up (positive pitch)

    // Optional roll keys mapped in store (not primary)
    if (controls.rollLeft) rollInput -= 1;
    if (controls.rollRight) rollInput += 1;

    // Integrate orientation
    s.orientation.yaw += yawInput * p.yawRate * dt;
    s.orientation.pitch += pitchInput * p.pitchRate * dt;
    s.orientation.roll += rollInput * p.rollRate * dt;

    clampOrientation(s.orientation);
  }, []);

  // Compute forces from controls and environment
  const computeForces = useCallback((controls) => {
    const s = stateRef.current;
    const p = paramsRef.current;

    const { forward, right, up } = getBasisFromEuler(s.orientation);

    // Thrust along forward
    let thrustAccel = p.thrust;
    if (controls.boost) thrustAccel *= p.boostMultiplier;
    if (controls.brake) thrustAccel *= p.brakeFactor;

    const aThrust = scaleVec3(forward, thrustAccel);

    // Drag opposite velocity (simple linear drag)
    const aDrag = scaleVec3(s.velocity, -p.drag);

    // Damping (percent per second): reduces velocity magnitude gradually
    const aDamping = scaleVec3(s.velocity, -p.damping);

    // Gravity downward
    const aGravity = [0, -p.gravity, 0];

    // Simple lift: increases with forward speed and depends on pitch/roll
    const speed = lengthVec3(s.velocity);
    const bankLiftFactor = Math.cos(s.orientation.roll); // less lift when heavily banked
    const liftMag = p.liftFactor * speed * 0.05 * bankLiftFactor; // scale down for playability
    // Combine up and a component resisting downward motion
    const aLift = scaleVec3(up, liftMag);

    // Aggregate acceleration
    let ax = aThrust[0] + aDrag[0] + aDamping[0] + aGravity[0] + aLift[0];
    let ay = aThrust[1] + aDrag[1] + aDamping[1] + aGravity[1] + aLift[1];
    let az = aThrust[2] + aDrag[2] + aDamping[2] + aGravity[2] + aLift[2];

    // Extra braking drag when brake held
    if (controls.brake) {
      ax += -s.velocity[0] * 0.8;
      ay += -s.velocity[1] * 0.8;
      az += -s.velocity[2] * 0.8;
    }

    // Return acceleration vector
    return [ax, ay, az];
  }, []);

  // Handle ground collision with simple clamp at groundY and kill vertical velocity if below
  const handleGroundCollision = useCallback(() => {
    const s = stateRef.current;
    const p = paramsRef.current;
    if (s.position[1] < p.groundY) {
      s.position[1] = p.groundY;
      if (s.velocity[1] < 0) {
        s.velocity[1] = -s.velocity[1] * p.restitution;
      }
      // Small friction when on ground
      s.velocity[0] *= 0.98;
      s.velocity[2] *= 0.98;
    }
  }, []);

  // Clamp speed to min/max; maintain direction when clamping
  const clampSpeed = useCallback(() => {
    const s = stateRef.current;
    const p = paramsRef.current;
    const spd = lengthVec3(s.velocity);
    if (spd > 0) {
      const dir = scaleVec3(s.velocity, 1 / spd);
      const min = p.minSpeed;
      const max = p.maxSpeed;
      const target = clamp(spd, min, max);
      s.velocity = scaleVec3(dir, target);
    }
  }, []);

  // PUBLIC_INTERFACE
  const start = useCallback(() => {
    stateRef.current.running = true;
  }, []);

  // PUBLIC_INTERFACE
  const stop = useCallback(() => {
    stateRef.current.running = false;
  }, []);

  // PUBLIC_INTERFACE
  const reset = useCallback((opts = {}) => {
    const next = {
      position: opts.position ?? [0, 10, 0],
      velocity: opts.velocity ?? [0, 0, 0],
      orientation: {
        pitch: opts.pitch ?? 0,
        roll: opts.roll ?? 0,
        yaw: opts.yaw ?? 0,
      },
      running: opts.running ?? true,
    };
    stateRef.current = next;
  }, []);

  /**
   * PUBLIC_INTERFACE
   * update(deltaOrObj)
   * Integrates physics for a single frame.
   * Accepts either a number delta (seconds) or an object containing { delta } (like r3f useFrame argument).
   */
  const update = useCallback((deltaOrObj) => {
    const s = stateRef.current;
    if (!s.running) return;

    let dt = 0;
    if (typeof deltaOrObj === "number") dt = deltaOrObj;
    else if (deltaOrObj && typeof deltaOrObj.delta === "number") dt = deltaOrObj.delta;
    else dt = 0.016; // fallback

    // Cap dt to avoid big steps on tab switch
    dt = Math.min(dt, 0.05);

    // Read controls from the zustand store snapshot
    const controls = getControlsSnapshot();

    // Orientation changes from controls
    applyControlsToOrientation(controls, dt);

    // Compute forces/acceleration
    const accel = computeForces(controls);

    // Integrate velocity and position
    integrate(s, accel, dt);

    // Clamp speed
    clampSpeed();

    // Simple ground collision
    handleGroundCollision();
  }, [applyControlsToOrientation, computeForces, clampSpeed, handleGroundCollision]);

  // Memoize API to keep stable references for components
  const api = useMemo(() => {
    return {
      getState,
      update,
      start,
      stop,
      reset,
      setParams,
    };
  }, [getState, update, start, stop, reset, setParams]);

  return api;
}

/**
 * USAGE with react-three-fiber:
 *
 * import { useFrame } from '@react-three/fiber';
 * import { usePlanePhysics } from './hooks/usePlanePhysics';
 * import { useKeyboardControlsStore } from './hooks/useKeyboardControls';
 *
 * function Plane() {
 *   // Ensure global keyboard listeners are active once in the app (ideally at App root)
 *   useKeyboardControlsStore();
 *
 *   const physics = usePlanePhysics();
 *
 *   useFrame((state, delta) => {
 *     physics.update(delta);
 *     const { position, orientation } = physics.getState();
 *     // apply to your mesh/group refs...
 *     // mesh.position.set(...position);
 *     // mesh.rotation.set(orientation.pitch, orientation.yaw, orientation.roll);
 *   });
 *
 *   // return your plane mesh/group node here
 * }
 */
