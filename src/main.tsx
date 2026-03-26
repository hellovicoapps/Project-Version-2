import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter as Router } from "react-router-dom";
import App from './App.tsx';
import './index.css';

// Patch WebSocket to prevent benign errors from ElevenLabs SDK during teardown
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
  if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
    return;
  }
  return originalSend.call(this, data);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
