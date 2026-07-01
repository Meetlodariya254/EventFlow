import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import Dashboard from './components/Dashboard/Dashboard';
import CalendarPage from './components/Calendar/Calendar';
import ProtectedRoute from './components/UI/ProtectedRoute';
import LoadingSpinner from './components/UI/LoadingSpinner';
import { TOAST_CONFIG } from './utils/constants';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // NOTE: WhatsApp messages and voice calls are now handled entirely by
  // Firebase Cloud Functions running server-side every minute.
  // The website no longer needs to stay open for reminders to work.

  if (loading) {
    return <LoadingSpinner fullPage text="Starting EventFlow..." />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {user && <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />}
      
      <main className={user ? 'pt-16' : ''}>
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/" replace /> : <Signup />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ToastContainer {...TOAST_CONFIG} />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
