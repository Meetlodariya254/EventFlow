import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { X, User, Mail, Phone, Lock, Shield, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'

  // Profile Form
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setMobileNumber(user.mobileNumber || '');
    }
  }, [user, isOpen]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    setProfileLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
      });
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSecurityLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Incorrect current password');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      closeTimeoutMS={200}
      className="ReactModal__Content max-w-lg w-full"
      overlayClassName="ReactModal__Overlay"
    >
      <div className="flex flex-col bg-white dark:bg-surface-900 rounded-2xl shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-700">
        {/* Modal Header */}
        <div className="relative p-6 bg-gradient-to-r from-primary-500/10 via-secondary-500/10 to-transparent border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-500 text-white shadow-md">
              <User size={22} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-surface-900 dark:text-white">
                Account Settings
              </h2>
              <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">
                Manage your profile details and security
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-surface-200 dark:border-surface-700 px-6 bg-surface-50/50 dark:bg-surface-800/30">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            }`}
          >
            <User size={16} />
            Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
            }`}
          >
            <Shield size={16} />
            Security & Password
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
            <div>
              <label className="label-text">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="text"
                  required
                  className="input-field pl-10"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>
            </div>

            <div>
              <label className="label-text">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="email"
                  required
                  className="input-field pl-10 bg-surface-100 dark:bg-surface-800/60 opacity-80 cursor-not-allowed"
                  value={email}
                  readOnly
                  title="Email cannot be changed directly"
                />
              </div>
              <p className="text-[11px] text-surface-400 mt-1">Email is linked to your account login ID.</p>
            </div>

            <div>
              <label className="label-text">Default Mobile Number (for Reminders)</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="tel"
                  className="input-field pl-10"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <p className="text-[11px] text-surface-400 mt-1">Include country code (e.g. +1 or +91).</p>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-surface-200 dark:border-surface-700">
              <button type="button" onClick={onClose} className="btn-secondary px-5">
                Cancel
              </button>
              <button type="submit" disabled={profileLoading} className="btn-primary px-6 flex items-center gap-2">
                {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password */}
        {activeTab === 'security' && (
          <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
            <div>
              <label className="label-text">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label-text">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="label-text">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-surface-200 dark:border-surface-700">
              <button type="button" onClick={onClose} className="btn-secondary px-5">
                Cancel
              </button>
              <button type="submit" disabled={securityLoading} className="btn-primary px-6 flex items-center gap-2">
                {securityLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                Update Password
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
