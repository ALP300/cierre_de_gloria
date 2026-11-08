import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource/anton/400.css';
import '@fontsource-variable/manrope';
import './styles.css';
import { getSession } from './lib/api';
import RegisterPage from './pages/RegisterPage';
import TicketPage from './pages/TicketPage';
import LoginPage from './pages/LoginPage';
import PanelPage from './pages/PanelPage';
import ScannerPage from './pages/ScannerPage';

function Staff({ children }: { children: React.ReactElement }) {
  return getSession() ? children : <Navigate to="/admin" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/t/:token" element={<TicketPage />} />
        <Route path="/admin" element={<LoginPage />} />
        <Route path="/admin/panel" element={<Staff><PanelPage /></Staff>} />
        <Route path="/admin/escaner" element={<Staff><ScannerPage /></Staff>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
