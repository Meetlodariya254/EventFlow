import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token');
  const urlEmail = searchParams.get('email');
  const urlPreview = searchParams.get('preview');

  const [manualEmail, setManualEmail] = useState(urlEmail || '');
  const [manualCode, setManualCode] = useState(urlToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { completePasswordReset } = useAuth();
  const navigate = useNavigate();

  function validate() {
    setError('');
    const targetEmail = urlEmail || manualEmail.trim();
    const targetToken = urlToken || manualCode.trim();

    if (!targetEmail) {
      setError('Email address is required');
      return false;
    }
    if (!targetToken) {
      setError('Verification code is required');
      return false;
    }
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const targetEmail = urlEmail || manualEmail.trim();
    const targetToken = urlToken || manualCode.trim();

    setLoading(true);
    try {
      await completePasswordReset(targetEmail, targetToken, newPassword);
      toast.success('Password changed successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  }

  const isAutoLink = Boolean(urlToken && urlEmail);

  return (
    <div id="reset-password-page" className="gradient-mesh min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animate-fade-in-up w-full max-w-md glass-card rounded-2xl p-8 sm:p-10 shadow-2xl border border-white/20 dark:border-white/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 shadow-lg bg-gradient-to-br from-indigo-500 to-pink-500 text-white">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-3xl font-bold bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
            Set New Password
          </h1>
          <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            {isAutoLink ? `Verifying account: ${urlEmail}` : 'Enter the 6-digit verification code sent to your email'}
          </p>
        </div>

        {urlPreview && (
          <div className="mb-6">
            <a
              href={urlPreview}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md text-xs no-underline"
            >
              🔗 Open Test Email to copy 6-Digit Code
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!isAutoLink && (
            <>
              <div>
                <label htmlFor="reset-manual-email" className="label-text">
                  Registered Email Address
                </label>
                <input
                  id="reset-manual-email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="name@example.com"
                  value={manualEmail}
                  onChange={(e) => {
                    setManualEmail(e.target.value);
                    if (error) setError('');
                  }}
                />
              </div>

              <div>
                <label htmlFor="reset-manual-code" className="label-text">
                  6-Digit Verification Code
                </label>
                <input
                  id="reset-manual-code"
                  type="text"
                  required
                  maxLength={10}
                  className="input-field font-mono tracking-widest text-center text-lg font-bold text-indigo-500"
                  placeholder="123456"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    if (error) setError('');
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="reset-new-password" className="label-text">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field pl-11 pr-11"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm-password" className="label-text">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field pl-11 pr-11"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-2 font-medium text-center">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px] mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating Password…
              </>
            ) : (
              'Save New Password'
            )}
          </button>
        </form>

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
