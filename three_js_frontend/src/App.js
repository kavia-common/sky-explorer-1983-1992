import React from 'react';
import logo from './logo.svg';
import './App.css';
import { useTheme } from './ui/ThemeProvider';

// PUBLIC_INTERFACE
function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'ocean' ? 'dark' : 'ocean'} mode`}
        >
          {theme === 'ocean' ? '🌙 Dark' : '🌊 Ocean'}
        </button>
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <p>
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
