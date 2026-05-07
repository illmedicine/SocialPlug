import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Detect Capacitor (Android/iOS native shell). When running natively the app
// is loaded from a custom scheme (e.g. https://localhost) with no GH Pages
// base path, so we use HashRouter to avoid deep-link / refresh issues.
// In the browser we keep the GH Pages basename for backwards compatibility.
const isNative =
  typeof window !== 'undefined' &&
  (window.Capacitor?.isNativePlatform?.() ||
    /\bcapacitor:\/\//.test(window.location.protocol) ||
    window.matchMedia?.('(display-mode: standalone)').matches === false &&
      window.location.protocol === 'capacitor:');

const Router = isNative ? HashRouter : BrowserRouter;
const routerProps = isNative ? {} : { basename: '/SocialPlug' };

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router {...routerProps}>
      <App />
    </Router>
  </React.StrictMode>
);
