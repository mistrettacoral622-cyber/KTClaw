/**
 * React Application Entry Point
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/globals.css';
import { initializeDefaultTransports } from './lib/api-client';
import { ensureBrowserPreviewElectronShim, isBrowserPreviewMode } from './lib/browser-preview';

try {
  ensureBrowserPreviewElectronShim();
  initializeDefaultTransports();
} catch (error) {
  console.error('Failed to initialize default transports:', error);
}

const Router = isBrowserPreviewMode() ? BrowserRouter : HashRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
