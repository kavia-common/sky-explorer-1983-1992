import React, { useMemo, useRef, useState } from 'react';
import './App.css';
import { useTheme } from './ui/ThemeProvider';
import ThreeScene from './components/ThreeScene';
import Plane from './components/Plane';
import HUDOverlay from './ui/HUDOverlay';
import ControlsOverlay from './ui/ControlsOverlay';

// PUBLIC_INTERFACE
function App() {
  const { theme } = useTheme();

  // Plane refs/state to feed HUD
  const planeRef = useRef();
  const [paused, setPaused] = useState(false);

  const handlePauseToggle = () => {
    setPaused((p) => {
      const next = !p;
      const api = planeRef.current?.getPhysicsState ? planeRef.current : null;
      // If Plane exposes physics API via ref, control it here. Our Plane exposes getPhysicsState via ref API wrapper in Plane.jsx
      // In this template we keep pause at app-level; physics hook respects a running flag via start/stop on the hook API.
      try {
        if (planeRef.current?.getPhysicsState && planeRef.current?.reset) {
          // Our Plane exposes only state methods; pausing is controlled internally by the physics hook.
          // For this simplified integration, we just toggle a local 'paused' and the HUD reflects it via speed not updating if physics stops.
        }
      } catch {
        // no-op
      }
      return next;
    });
  };

  const handleReset = () => {
    try {
      planeRef.current?.reset?.();
    } catch {
      // ignore
    }
  };

  // Derive flight values for HUD from plane physics state when available
  const {
    speed = 0,
    altitude = 0,
    heading = 0,
  } = useMemo(() => {
    const s = planeRef.current?.getPhysicsState?.();
    if (!s) return { speed: 0, altitude: 0, heading: 0 };
    const spd = Math.max(0, Math.round(s.speed || 0));
    const alt = Math.round((s.position?.[1] ?? 0) * 1) || 0;
    const yaw = (s.orientation?.yaw ?? 0) * (180 / Math.PI);
    let hdg = Math.round(yaw);
    while (hdg < 0) hdg += 360;
    while (hdg >= 360) hdg -= 360;
    return { speed: spd, altitude: alt, heading: hdg };
  });

  return (
    <div className="App">
      {/* 3D Scene */}
      <div className="canvas-root" style={{ position: "fixed", inset: 0 }}>
        <ThreeScene>
          {/* Add the plane into the scene */}
          <Plane ref={planeRef} />
        </ThreeScene>
      </div>

      {/* Ocean Professional UI Overlays */}
      <HUDOverlay
        speed={speed}
        altitude={altitude}
        heading={heading}
        boostActive={false /* boost icon reflects live input in future wiring */}
        cameraMode={"Chase"}
      />
      <ControlsOverlay
        paused={paused}
        onPauseToggle={handlePauseToggle}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
