import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Style order matters:
//  1. tokens.css      — the approved design tokens + component classes (verbatim)
//  2. primitives.css  — additive styles for components tokens.css didn't ship
//  3. base.css        — Tailwind layers (preflight disabled) + minimal resets
import './styles/tokens.css';
import './styles/primitives.css';
import './styles/base.css';

import App from './App';
import { SessionProvider } from './context/SessionContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
