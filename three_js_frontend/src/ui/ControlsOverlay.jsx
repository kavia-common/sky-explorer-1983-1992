import React from "react";
import { useTheme } from "./ThemeProvider";
import { useKeyboardControlsStore } from "../hooks/useKeyboardControls";

/**
 * PUBLIC_INTERFACE
 * ControlsOverlay
 * Displays:
 *  - Control legend (W/S/A/D, arrows, Shift Boost, Space Brake, R Reset, E Interact)
 *  - Pause/Resume simulation button (via props)
 *  - Theme toggle using ThemeProvider
 *
 * Props:
 *  - paused: boolean
 *  - onPauseToggle: () => void
 *  - onReset?: () => void
 *  - className?: string
 */
export default function ControlsOverlay({
  paused = false,
  onPauseToggle,
  onReset,
  className = "",
}) {
  const { theme, toggleTheme } = useTheme();

  // Ensure global keyboard listeners exist (safe to call multiple times)
  useKeyboardControlsStore();

  return (
    <div
      className={`overlay ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr auto",
        padding: "16px",
        pointerEvents: "none",
      }}
      aria-label="Controls overlay"
    >
      {/* Bottom-left: Legend */}
      <section
        className="card"
        style={{
          alignSelf: "end",
          justifySelf: "start",
          pointerEvents: "auto",
          minWidth: 320,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-md)",
          padding: "16px",
        }}
        aria-label="Controls legend"
      >
        <header
          style={{
            fontWeight: 700,
            fontSize: "14px",
            marginBottom: 8,
            color: "var(--color-text)",
          }}
        >
          Controls
        </header>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            fontSize: "13px",
          }}
        >
          <LegendRow keys={["W", "↑"]} action="Pitch Down" />
          <LegendRow keys={["S", "↓"]} action="Pitch Up" />
          <LegendRow keys={["A", "←"]} action="Roll Left" />
          <LegendRow keys={["D", "→"]} action="Roll Right" />
          <LegendRow keys={["Q"]} action="Yaw Left" />
          <LegendRow keys={["E"]} action="Yaw Right / Interact" />
          <LegendRow keys={["Shift"]} action="Boost" />
          <LegendRow keys={["Space"]} action="Brake" />
          <LegendRow keys={["R"]} action="Reset" />
          <LegendRow keys={["C"]} action="Toggle Camera" />
          <LegendRow keys={["H"]} action="Toggle HUD" />
        </div>
      </section>

      {/* Bottom-right: Actions (Pause/Resume, Theme, Reset) */}
      <section
        className="card"
        style={{
          alignSelf: "end",
          justifySelf: "end",
          pointerEvents: "auto",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          padding: "14px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          boxShadow: "var(--shadow-md)",
        }}
        aria-label="Session controls"
      >
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPauseToggle}
          aria-pressed={paused}
          title={paused ? "Resume simulation" : "Pause simulation"}
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={toggleTheme}
          title={`Switch to ${theme === "ocean" ? "dark" : "ocean"} mode`}
        >
          {theme === "ocean" ? "🌙 Dark" : "🌊 Ocean"}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReset}
          title="Reset plane to start"
        >
          ⟳ Reset
        </button>
      </section>
    </div>
  );
}

function LegendRow({ keys = [], action = "" }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {keys.map((k, idx) => (
          <kbd
            key={`${k}-${idx}`}
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderBottomWidth: 2,
              borderRadius: 6,
              padding: "2px 6px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.05)",
              color: "var(--color-text)",
              minWidth: 28,
              textAlign: "center",
            }}
            aria-label={`Key ${k}`}
          >
            {k}
          </kbd>
        ))}
      </div>
      <div className="text-muted" style={{ color: "var(--color-muted)" }}>
        {action}
      </div>
    </div>
  );
}
