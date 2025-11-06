import React, { useMemo } from "react";
import { useEnvironmentInteractionStore } from "../components/Tree";

/**
 * PUBLIC_INTERFACE
 * useSimulationHUD
 * Hook to read environment interaction counters and minimal status values needed by HUD.
 * Consumers can pass speed/altitude/heading as props; this hook focuses on counters only.
 */
export function useSimulationHUD() {
  return useEnvironmentInteractionStore((s) => ({
    treesCollected: s.treesCollected,
    cloudsFlownThrough: s.cloudsFlownThrough,
    lastInteraction: s.lastInteraction,
  }));
}

/**
 * PUBLIC_INTERFACE
 * HUDOverlay
 * Ocean Professional-styled overlay displaying:
 * - Flight metrics: speed (knots-style), altitude, heading
 * - Interaction counters: trees and clouds
 * - Status: boost, camera mode (if provided)
 *
 * Props:
 *  - speed?: number (m/s or any unit; component will format as integer)
 *  - altitude?: number
 *  - heading?: number (degrees 0-360)
 *  - boostActive?: boolean
 *  - cameraMode?: string (e.g., "Chase", "Cockpit")
 *  - className?: string
 */
export default function HUDOverlay({
  speed = 0,
  altitude = 0,
  heading = 0,
  boostActive = false,
  cameraMode = "Chase",
  className = "",
}) {
  const { treesCollected, cloudsFlownThrough } = useSimulationHUD();

  // Formatters
  const fmt = useMemo(() => {
    const clampHeading = (h) => {
      let d = Number(h) || 0;
      while (d < 0) d += 360;
      while (d >= 360) d -= 360;
      return Math.round(d);
    };
    return {
      speed: (v) => `${Math.max(0, Math.round(v || 0))}`,
      altitude: (v) => `${Math.max(0, Math.round(v || 0))}`,
      heading: (v) => `${clampHeading(v)}°`,
    };
  }, []);

  return (
    <div
      className={`overlay ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto 1fr auto",
        padding: "16px",
        pointerEvents: "none",
      }}
      aria-label="Flight HUD overlay"
    >
      {/* Top-left: Primary flight readouts */}
      <section
        className="card"
        style={{
          alignSelf: "start",
          justifySelf: "start",
          minWidth: 260,
          padding: "14px 16px",
          pointerEvents: "auto",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-md)",
          backgroundImage: "var(--gradient-accent)",
        }}
        aria-label="Primary flight metrics"
      >
        <header
          style={{
            fontWeight: 700,
            fontSize: "14px",
            marginBottom: 8,
            color: "var(--color-text)",
          }}
        >
          Flight Metrics
        </header>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <Metric label="Speed" value={fmt.speed(speed)} suffix=" u/s" />
          <Metric label="Altitude" value={fmt.altitude(altitude)} suffix=" u" />
          <Metric label="Heading" value={fmt.heading(heading)} />
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <StatusPill
            active={boostActive}
            activeText="Boost ON"
            inactiveText="Boost OFF"
          />
          <div
            className="badge"
            title="Camera mode"
            style={{
              background:
                "color-mix(in oklab, var(--color-primary), white 85%)",
              color: "var(--color-primary)",
            }}
          >
            📷 {cameraMode}
          </div>
        </div>
      </section>

      {/* Top-right: Interaction counters */}
      <section
        className="card"
        style={{
          alignSelf: "start",
          justifySelf: "end",
          minWidth: 220,
          padding: "14px 16px",
          pointerEvents: "auto",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-md)",
        }}
        aria-label="Interaction counters"
      >
        <header
          style={{
            fontWeight: 700,
            fontSize: "14px",
            marginBottom: 8,
            color: "var(--color-text)",
          }}
        >
          Interactions
        </header>
        <div style={{ display: "grid", gap: 10 }}>
          <CounterRow icon="🌲" label="Trees" value={treesCollected} />
          <CounterRow icon="☁️" label="Clouds" value={cloudsFlownThrough} />
        </div>
      </section>

      {/* Bottom-center spacer (reserved for messages if needed) */}
      <div
        style={{
          gridColumn: "1 / span 2",
          alignSelf: "end",
          justifySelf: "center",
          marginBottom: 8,
        }}
      />
    </div>
  );
}

function Metric({ label, value, suffix = "" }) {
  return (
    <div
      className="surface"
      style={{
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        minWidth: 72,
      }}
    >
      <div
        className="text-muted"
        style={{ fontSize: "12px", marginBottom: 6, color: "var(--color-muted)" }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--color-text)" }}>
        {value}
        <span style={{ fontWeight: 500, fontSize: "12px", marginLeft: 4, color: "var(--color-muted)" }}>
          {suffix}
        </span>
      </div>
    </div>
  );
}

function CounterRow({ icon, label, value }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span aria-hidden>{icon}</span>
        <span style={{ color: "var(--color-text)" }}>{label}</span>
      </div>
      <span
        className="badge"
        style={{
          minWidth: 32,
          textAlign: "center",
          background:
            "color-mix(in oklab, var(--color-primary), white 85%)",
          color: "var(--color-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPill({ active, activeText = "Active", inactiveText = "Inactive" }) {
  return (
    <span
      className="badge"
      style={{
        background: active
          ? "color-mix(in oklab, var(--color-success), white 75%)"
          : "color-mix(in oklab, var(--color-muted), white 80%)",
        color: active ? "var(--color-success)" : "var(--color-muted)",
      }}
      aria-live="polite"
    >
      ⚡ {active ? activeText : inactiveText}
    </span>
  );
}
