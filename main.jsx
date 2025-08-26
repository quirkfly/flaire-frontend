import React from 'react';
import ReactDOM from 'react-dom/client';
import DatingCopilot from './dating-copilot-app';
import { AuthProvider } from './src/auth/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <DatingCopilot />
    </AuthProvider>
  </React.StrictMode>
);
