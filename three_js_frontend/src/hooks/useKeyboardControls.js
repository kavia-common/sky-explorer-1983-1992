import { useEffect } from "react";
import { create } from "zustand";

/**
 * Keyboard mapping for the application.
 * - W / ArrowUp -> forward
 * - S / ArrowDown -> back
 * - A / ArrowLeft -> left
 * - D / ArrowRight -> right
 * - Q / E -> yawLeft / yawRight (default behavior uses yaw)
 * - Shift -> boost
 * - Space -> brake (slow)
 * - R -> reset
 * - C -> toggleCamera
 * - H -> toggleHUD
 * - E -> interact
 */

const KEYMAP = {
  forward: new Set(["w", "arrowup"]),
  back: new Set(["s", "arrowdown"]),
  left: new Set(["a", "arrowleft"]),
  right: new Set(["d", "arrowright"]),
  yawLeft: new Set(["q"]),
  yawRight: new Set(["e"]),
  rollLeft: new Set(["["]), // optional spare if needed by app later
  rollRight: new Set(["]"]), // optional spare if needed by app later
  boost: new Set(["shift"]),
  brake: new Set([" "]), // Space
  reset: new Set(["r"]),
  toggleCamera: new Set(["c"]),
  toggleHUD: new Set(["h"]),
  interact: new Set(["e"]), // also mapped above to yawRight; app logic can disambiguate on mode
};

/**
 * Normalize keyboard event key to a canonical comparable string.
 */
function normalizeKey(evt) {
  const k = evt.key || "";
  // Special-case Space
  if (k === " ") return " ";
  return String(k).toLowerCase();
}

/**
 * Returns the control name for a given normalized key, prioritizing movement before toggles.
 */
function keyToControl(normalizedKey) {
  for (const [control, setOfKeys] of Object.entries(KEYMAP)) {
    if (setOfKeys.has(normalizedKey)) return control;
  }
  return null;
}

/**
 * Default control state
 */
const defaultControlState = {
  forward: false,
  back: false,
  left: false,
  right: false,
  yawLeft: false,
  yawRight: false,
  rollLeft: false,
  rollRight: false,
  boost: false,
  brake: false,

  // Momentary toggles/actions (treated as one-shots, but kept in state for snapshot consumers)
  interact: false,
  reset: false,
  toggleCamera: false,
  toggleHUD: false,
};

/**
 * Create the zustand store for keyboard controls.
 */
const useKeyboardControlsStoreInternal = create((set, get) => ({
  ...defaultControlState,

  // PUBLIC_INTERFACE
  setControl: (name, value) => {
    /** Toggle a control boolean by name */
    if (name in defaultControlState) {
      set({ [name]: Boolean(value) });
    }
  },

  // PUBLIC_INTERFACE
  resetAll: () => {
    /** Reset all control booleans to false */
    const reset = {};
    for (const k of Object.keys(defaultControlState)) reset[k] = false;
    set(reset);
  },

  // PUBLIC_INTERFACE
  getSnapshot: () => {
    /** Return a shallow snapshot of the current controls state */
    const s = get();
    const snap = {};
    for (const k of Object.keys(defaultControlState)) snap[k] = Boolean(s[k]);
    return snap;
  },
}));

/**
 * Install global keyboard listeners. This hook should be used once at app root.
 * It handles:
 * - keydown/keyup with repeat prevention
 * - one-shot toggles (reset, toggleCamera, toggleHUD, interact) on keydown
 * - blur/focus to clear keys on blur
 */
// PUBLIC_INTERFACE
export function useKeyboardControlsStore() {
  /**
   * Hook returning the raw zustand store. Also attaches and cleans up global listeners.
   * Use this at the top-level of the app (e.g., in App or a global provider).
   */
  const store = useKeyboardControlsStoreInternal;

  useEffect(() => {
    const setControl = store.getState().setControl;
    const resetAll = store.getState().resetAll;

    const handleKeyDown = (e) => {
      const key = normalizeKey(e);
      const control = keyToControl(key);
      if (!control) return;

      // Prevent browser scrolling with arrows/space when interacting with canvas
      if (
        key === "arrowup" ||
        key === "arrowdown" ||
        key === "arrowleft" ||
        key === "arrowright" ||
        key === " "
      ) {
        e.preventDefault?.();
      }

      // Prevent repeating the same keydown from re-firing
      if (e.repeat) {
        return;
      }

      // Toggled actions are considered momentary. Set true on keydown, then auto-false in next microtask.
      if (control === "reset" || control === "toggleCamera" || control === "toggleHUD" || control === "interact") {
        setControl(control, true);
        // Auto reset momentary flags
        queueMicrotask(() => setControl(control, false));
        return;
      }

      // Continuous controls
      setControl(control, true);
    };

    const handleKeyUp = (e) => {
      const key = normalizeKey(e);
      const control = keyToControl(key);
      if (!control) return;

      // Only for continuous controls we clear on keyup
      if (
        control === "forward" ||
        control === "back" ||
        control === "left" ||
        control === "right" ||
        control === "yawLeft" ||
        control === "yawRight" ||
        control === "rollLeft" ||
        control === "rollRight" ||
        control === "boost" ||
        control === "brake"
      ) {
        setControl(control, false);
      }
      // Toggled actions already auto-reset on keydown
    };

    const handleBlur = () => {
      // Clear all keys on window blur to avoid sticky keys when window focus is lost
      resetAll();
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp, { passive: true });
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleBlur);
      // Ensure we reset on unmount so no stuck keys remain
      resetAll();
    };
  }, [store]);

  return store;
}

/**
 * Convenient selector hook for consuming components/systems.
 * Example:
 *   const controls = useControls();
 *   if (controls.forward) { ... }
 */
// PUBLIC_INTERFACE
export function useControls() {
  /** Return a selected snapshot of control booleans for render usage */
  return useKeyboardControlsStoreInternal((state) => {
    const out = {};
    for (const k of Object.keys(defaultControlState)) {
      out[k] = Boolean(state[k]);
    }
    return out;
  });
}

// PUBLIC_INTERFACE
export function getControlsSnapshot() {
  /**
   * Helper to read the controls outside React render (e.g., within animation loops).
   * Usage:
   *   const controls = getControlsSnapshot();
   *   if (controls.boost) { ... }
   */
  return useKeyboardControlsStoreInternal.getState().getSnapshot();
}
