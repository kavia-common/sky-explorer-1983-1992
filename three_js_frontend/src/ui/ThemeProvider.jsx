import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * ThemeContext provides the current theme and a toggle function.
 * Supported themes:
 * - "ocean" (default, maps to Ocean Professional CSS variables)
 * - "dark" (expects :root[data-theme="dark"] overrides in CSS)
 */
const ThemeContext = createContext({
  theme: "ocean",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleTheme: () => {},
});

/**
 * Apply dataset theme to the <html> element and optionally persist to localStorage.
 * This ensures CSS variables switch via the [data-theme] attribute selector.
 */
function applyTheme(theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
  try {
    localStorage.setItem("app-theme", theme);
  } catch {
    // Ignore storage errors (e.g., disabled storage)
  }
}

/**
 * Detect initial theme:
 * 1) localStorage "app-theme" if present and valid,
 * 2) otherwise default to "ocean".
 */
function getInitialTheme() {
  const allowed = new Set(["ocean", "dark"]);
  try {
    const saved = localStorage.getItem("app-theme");
    if (saved && allowed.has(saved)) return saved;
  } catch {
    // Ignore storage errors and fall back to default
  }
  return "ocean";
}

// PUBLIC_INTERFACE
export function ThemeProvider({ children }) {
  /**
   * PUBLIC_INTERFACE: ThemeProvider
   * Wrap your app with <ThemeProvider> to enable theme context across the tree.
   */
  const [theme, setTheme] = useState(() => getInitialTheme());

  // On mount and whenever theme changes, apply to document and persist
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === "ocean" ? "dark" : "ocean"));
  };

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// PUBLIC_INTERFACE
export function useTheme() {
  /**
   * Hook to access the theme context.
   * Returns: { theme: "ocean" | "dark", toggleTheme: () => void }
   */
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

/**
 * USAGE EXAMPLE:
 *
 * // 1) Wrap your app in src/index.js
 * import { ThemeProvider } from "./ui/ThemeProvider";
 * root.render(
 *   <React.StrictMode>
 *     <ThemeProvider>
 *       <App />
 *     </ThemeProvider>
 *   </React.StrictMode>
 * );
 *
 * // 2) Use the hook inside components
 * import { useTheme } from "./ui/ThemeProvider";
 * function ThemeToggleButton() {
 *   const { theme, toggleTheme } = useTheme();
 *   return (
 *     <button onClick={toggleTheme}>
 *       Switch to {theme === "ocean" ? "dark" : "ocean"}
 *     </button>
 *   );
 * }
 *
 * NOTE: This provider expects your CSS to define variables for:
 * :root[data-theme="ocean"] { ... }  // Ocean Professional (default)
 * :root[data-theme="dark"]  { ... }  // Dark theme overrides
 *
 * The base variables exist in src/styles/theme.css; add [data-theme="dark"] overrides there if needed.
 */
