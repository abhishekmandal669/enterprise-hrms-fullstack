import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { AttendanceProvider } from './context/AttendanceContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AttendanceProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AttendanceProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
