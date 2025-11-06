import React from 'react';
import logo from './logo.svg';
import './App.css';
import { useTheme } from './ui/ThemeProvider';
import ThreeScene from './components/ThreeScene';

// PUBLIC_INTERFACE
function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="App">
      {/* 3D Scene */}
      <div className="canvas-root" style={{ position: "fixed", inset: 0 }}>
        <ThreeScene />
      </div>

      {/* UI overlay */}
      <header className="App-header ui-overlay">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'ocean' ? 'dark' : 'ocean'} mode`}
        >
          {theme === 'ocean' ? '🌙 Dark' : '🌊 Ocean'}
        </button>
        <img src={logo} className="App-logo" alt="logo" />
        <p className="panel">
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <p className="panel">
          Current theme: <strong>{theme}</strong>
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
