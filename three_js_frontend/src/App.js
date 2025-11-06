import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { useTheme } from './ui/ThemeProvider';
import ThreeScene from './components/ThreeScene';
import Plane from './components/Plane';
import HUDOverlay from './ui/HUDOverlay';
import ControlsOverlay from './ui/ControlsOverlay';
import { getControlsSnapshot, useKeyboardControlsStore } from './hooks/useKeyboardControls';

// Feature flags/env usage helper
function getEnvFlags() {
  const nodeEnv = process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || 'development';
  const logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
  const featureFlagsRaw = process.env.REACT_APP_FEATURE_FLAGS || '';
  const experimentsEnabled = String(process.env.REACT_APP_EXPERIMENTS_ENABLED || '').toLowerCase() === 'true';

  const flags = new Set(
    featureFlagsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return {
    nodeEnv,
    logLevel,
    flags,
    experimentsEnabled,
    isProd: nodeEnv === 'production',
  };
}

// Simple WebGL capability test (runs once on mount)
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl') ||
      canvas.getContext('webgl2');
    return !!gl;
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
function App() {
  const { theme } = useTheme();

  // Ensure keyboard handlers are active app-wide
  useKeyboardControlsStore();

  const env = useMemo(() => getEnvFlags(), []);

  // WebGL support flag
  const [webglOk, setWebglOk] = useState(true);
  useEffect(() => {
    // Respect explicit disable via feature flag if provided
    if (env.flags.has('disable_webgl')) {
      setWebglOk(false);
      return;
    }
    setWebglOk(isWebGLAvailable());
  }, [env.flags]);

  // Plane refs/state to feed HUD
  const planeRef = useRef();
  const [paused, setPaused] = useState(false);

  const handlePauseToggle = () => {
    setPaused((p) => {
      const next = !p;
      try {
        if (next) {
          planeRef.current?.stop?.(); // stop physics updates
        } else {
          planeRef.current?.start?.(); // resume physics updates
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
      // If paused, keep paused state but physics state is reset
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

  // Read live controls to show boost status in HUD
  const boostActive = useMemo(() => {
    try {
      return !!getControlsSnapshot().boost;
    } catch {
      return false;
    }
  }, [speed, altitude, heading]); // re-evaluate periodically; simple tie to other updates

  // When WebGL is not available, show fallback overlay and skip ThreeScene render
  return (
    <div className="App">
      {/* 3D Scene or fallback */}
      <div className="canvas-root" style={{ position: "fixed", inset: 0 }}>
        {webglOk ? (
          <ThreeScene>
            <Plane ref={planeRef} />
          </ThreeScene>
        ) : (
          <NoWebGLFallback />
        )}
      </div>

      {/* Ocean Professional UI Overlays (only if WebGL OK, otherwise the fallback already provides guidance) */}
      {webglOk && (
        <>
          <HUDOverlay
            speed={speed}
            altitude={altitude}
            heading={heading}
            boostActive={boostActive}
            cameraMode={"Chase"}
          />
          <ControlsOverlay
            paused={paused}
            onPauseToggle={handlePauseToggle}
            onReset={handleReset}
          />
        </>
      )}

      {/* Optional environment banner for development/debug */}
      {env.nodeEnv !== 'production' && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            top: 12,
            padding: '4px 8px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.35)',
            color: '#fff',
            fontSize: 12,
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          {env.nodeEnv} · log:{env.logLevel}{env.flags.size ? ` · flags:[${Array.from(env.flags).join(',')}]` : ''}{env.experimentsEnabled ? ' · experiments' : ''}
        </div>
      )}
    </div>
  );
}

function NoWebGLFallback() {
  return (
    <div
      className="ui-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background:
          'linear-gradient(135deg, rgba(37, 99, 235, 0.10), var(--color-bg) 65%)',
        padding: 24,
      }}
      role="alert"
      aria-live="assertive"
    >
      <div
        className="card"
        style={{
          maxWidth: 560,
          textAlign: 'center',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️ WebGL not available</div>
        <p className="text-muted" style={{ color: 'var(--color-muted)', marginBottom: 16 }}>
          Your browser or device does not support WebGL, which is required to render the 3D scene.
        </p>
        <ul style={{ textAlign: 'left', margin: '0 auto', maxWidth: 460, color: 'var(--color-text)' }}>
          <li>Use a modern browser (Chrome, Edge, Firefox, Safari).</li>
          <li>Ensure hardware acceleration is enabled in browser settings.</li>
          <li>Update your graphics drivers or try a different device.</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
