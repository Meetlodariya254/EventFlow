import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Loader2, KeyRound, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');

  const { sendPasswordResetLink } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid registered email address');
      return;
    }

    setLoading(true);
    try {
      const { token, shortCode } = await sendPasswordResetLink(email.trim());
      const resetUrl = `${window.location.origin}/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;

      // Dispatch actual real verification email over SMTP API
      const res = await fetch('/api/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.trim(), resetUrl, shortCode }),
      });
      const data = await res.json();

      if (data?.previewUrl) {
        toast.info('Test verification email generated!');
        navigate(`/reset-password?email=${encodeURIComponent(email.trim())}&preview=${encodeURIComponent(data.previewUrl)}`);
      } else {
        toast.success('6-Digit Verification Code sent to your email!');
        navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      setError(err.message || 'No account found with this email.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="forgot-password-page" className="gradient-mesh min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animate-fade-in-up w-full max-w-md glass-card rounded-2xl p-8 sm:p-10 shadow-2xl border border-white/20 dark:border-white/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 mb-4 shadow-lg">
            {emailSent ? <CheckCircle2 className="w-7 h-7 text-white" /> : <KeyRound className="w-7 h-7 text-white" />}
          </div>
          <h1 className="font-heading text-3xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
            {emailSent ? 'Check Your Email' : 'Forgot Password'}
          </h1>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400 mt-1">
            {emailSent
              ? `We sent a verification link to ${email}`
              : 'Enter your registered email to receive a password reset link'}
          </p>
        </div>

        {/* State A: Input Email */}
        {!emailSent ? (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="forgot-email" className="label-text">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="input-field pl-11"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Verification Email…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        ) : (
          /* State B: Email Sent Confirmation */
          <div className="space-y-5 text-center">
            {previewUrl ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 text-left space-y-3 shadow-sm">
                <div className="font-bold text-sm text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <span>⚠️ Dev Mode Intercept (No .env SMTP)</span>
                </div>
                <p className="leading-relaxed opacity-95">
                  Because Gmail SMTP credentials haven&apos;t been added to your <code>.env</code> file yet, internet mail servers block unauthenticated delivery. Nodemailer safely intercepted your email into Ethereal Test Server!
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
                  style={{ textDecoration: 'none', color: 'white' }}
                >
                  🔗 Open Ethereal Verification Email
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-300 font-medium leading-relaxed">
                An actual verification email has been delivered to <b>{email}</b>.
                <br /><br />
                Please check your email inbox (and spam folder) to securely verify your device and choose your new password.
              </div>
            )}

            <div className="pt-1">
              <Link
                to="/reset-password"
                className="inline-block text-xs text-indigo-500 dark:text-indigo-400 font-bold hover:underline"
              >
                🔢 Have a 6-digit Reset Code? Enter it here
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setPreviewUrl(null);
              }}
              className="btn-secondary w-full text-xs font-semibold py-3"
            >
              Resend Verification Email
            </button>
          </div>
        )}

        {/* Footer link */}
        <div className="text-center mt-8 pt-4 border-t border-surface-200/40 dark:border-surface-700/40">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200 transition-colors no-underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
