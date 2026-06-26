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

  useEffect(() => {
    if (!user) return;
    
    // We import dynamically to avoid circular dependencies if any, or static import at top is better.
    // Actually, dynamic import is totally fine:
    let cleanupWorker = () => {};
    import('./firebase/firestore').then(({ startMockReminderWorker }) => {
      cleanupWorker = startMockReminderWorker(user.uid);
    });

    const handleWhatsAppSent = (e) => {
      const event = e.detail;
      import('react-toastify').then(({ toast }) => {
        // Clean mobile number and ensure E.164 format (+country code)
        let cleanNumber = (event.mobileNumber || '').replace(/[^\d]/g, '');
        // If it's a 10-digit number, prepend 91 (default Indian country code)
        if (cleanNumber.length === 10) {
          cleanNumber = '91' + cleanNumber;
        }
        // Always add + prefix for Twilio E.164 format
        const e164Number = '+' + cleanNumber;

        const descriptionText = event.description ? `\n\nDescription: ${event.description}` : '';
        const messageText = `Hi ${event.personName || ''}, reminder: "${event.title}" is scheduled for ${event.startTime || ''} today.${descriptionText}\n\nDon't miss it! 📅`;

        // Attempt automated sending via Twilio backend proxy
        fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: e164Number, message: messageText }),
        })
          .then(async (res) => {
            let data;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              data = await res.json();
            } else {
              // Not JSON (e.g., 404 HTML page if server is missing)
              const text = await res.text();
              throw new Error(`Endpoint returned non-JSON response (${res.status}): ${text.substring(0, 50)}...`);
            }

            if (!res.ok) {
              // Attach Twilio error code so we can show a specific message
              const err = new Error(data.error || 'Server error');
              err.twilioCode = data.twilioCode;
              err.moreInfo = data.moreInfo;
              throw err;
            }
            return data;
          })
          .then((data) => {
            if (data.success) {
              toast.success(
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">✅ WhatsApp Sent!</span>
                  <span className="text-xs text-surface-600 dark:text-surface-300">
                    Reminder queued for {event.personName || 'recipient'} ({event.mobileNumber})
                  </span>
                  <span className="text-xs text-surface-400 font-mono">SID: {data.sid}</span>
                </div>,
                { autoClose: 10000 }
              );
            } else {
              throw new Error('Unsuccessful API call');
            }
          })
          .catch((err) => {
            console.warn('[WhatsApp] Send failed:', err.message, 'code:', err.twilioCode);
            const encodedText = encodeURIComponent(messageText);
            const whatsappUrl = `https://wa.me/${e164Number}?text=${encodedText}`;

            // Build a specific, actionable error message based on the Twilio error code
            let errorTitle = '⚠️ Auto-Send Failed';
            let errorDetail = '';

            if (err.message?.includes('non-JSON response (404)')) {
              errorTitle = '⚠️ API Not Found';
              errorDetail = 'The API endpoint is missing. Are you running the app with "npm run dev"? If so, restart it.';
            } else if (!err.twilioCode && err.message?.toLowerCase().includes('fetch')) {
              // Network error — dev server not running or vite.config.js not loaded
              errorTitle = '⚠️ Server Not Ready';
              errorDetail = 'Restart the dev server (npm run dev) for automatic sending to work.';
            } else if (err.message === 'Twilio credentials not configured') {
              errorDetail = 'Twilio credentials are missing in .env. Restart the dev server after saving them.';
            } else if (err.twilioCode === 63015 || err.message?.includes('63015')) {
              // Recipient has not opted into the WhatsApp Sandbox
              errorTitle = '💬 Twilio Sandbox Restriction';
              errorDetail = `Twilio Sandbox (+14155238886) requires daily 'join' keywords. To permanently send automated WhatsApp reminders without keywords, link your Twilio number in Twilio Console. For now, click below to deliver instantly!`;
            } else if (err.twilioCode === 63016 || err.message?.includes('unverified')) {
              errorDetail = 'Twilio Trial: recipient must be a Verified Caller ID in your Twilio console.';
            } else {
              errorDetail = err.message || 'Check the terminal (npm run dev) for the full Twilio error.';
            }

            toast.warning(
              <div className="flex flex-col gap-1.5 py-0.5">
                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{errorTitle}</span>
                <span className="text-xs text-surface-700 dark:text-surface-200 leading-relaxed font-medium">
                  {errorDetail}
                </span>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#20ba56] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  style={{ textDecoration: 'none', color: 'white', display: 'inline-flex' }}
                >
                  <span>🚀 1-Click Send via WhatsApp</span>
                </a>
              </div>,
              { autoClose: false, closeOnClick: false }
            );
          });
      });
    };

    window.addEventListener('whatsapp_sent', handleWhatsAppSent);

    // ── Voice Call Handler ──────────────────────────────────────────────────
    const handleVoiceCallTriggered = (e) => {
      const event = e.detail;
      import('react-toastify').then(({ toast }) => {
        // Build E.164 number
        let cleanNumber = (event.mobileNumber || '').replace(/[^\d]/g, '');
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;
        const e164Number = '+' + cleanNumber;

        fetch('/api/send-voice-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: e164Number,
            personName: event.personName,
            eventTitle: event.title,
            eventTime: event.startTime,
            eventDescription: event.description,
          }),
        })
          .then((res) => {
            if (!res.ok) return res.json().then((d) => { throw new Error(d.error || 'Server error'); });
            return res.json();
          })
          .then((data) => {
            if (data.success) {
              toast.success(
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">📞 AI Voice Call Placed!</span>
                  <span className="text-xs text-surface-600 dark:text-surface-300">
                    Calling {event.personName || 'recipient'} ({event.mobileNumber}) now
                  </span>
                </div>
              );
            } else {
              throw new Error('Unsuccessful API call');
            }
          })
          .catch((err) => {
            console.warn('Voice call failed:', err.message);
            toast.error(
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm">📞 Voice Call Failed</span>
                <span className="text-xs text-surface-600 dark:text-surface-300 font-medium">
                  {err.message === 'Twilio credentials not configured'
                    ? 'Twilio credentials not set in .env'
                    : err.message === 'TWILIO_PHONE_NUMBER not configured'
                    ? 'TWILIO_PHONE_NUMBER not set in .env'
                    : `Twilio error: ${err.message}`}
                </span>
              </div>,
              { autoClose: 8000 }
            );
          });
      });
    };

    window.addEventListener('voice_call_triggered', handleVoiceCallTriggered);

    return () => {
      cleanupWorker();
      window.removeEventListener('whatsapp_sent', handleWhatsAppSent);
      window.removeEventListener('voice_call_triggered', handleVoiceCallTriggered);
    };
  }, [user]);

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
