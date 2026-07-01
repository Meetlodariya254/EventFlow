import { useState, useEffect } from 'react';
import Modal from 'react-modal';
import {
  X, User, Mail, Phone, Lock, Shield, Eye, EyeOff, Loader2,
  CheckCircle2, MessageCircle, ExternalLink, Info, Key, Hash,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'whatsapp' | 'security'

  // Profile Form
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // WhatsApp Setup Form
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [waConfigured, setWaConfigured] = useState(false);

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

  // Load existing Meta credentials when WhatsApp tab opens
  useEffect(() => {
    if (activeTab !== 'whatsapp' || !user?.uid) return;
    const loadMetaCreds = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.metaAccessToken) {
            setMetaAccessToken(data.metaAccessToken);
            setMetaPhoneNumberId(data.metaPhoneNumberId || '');
            setWaConfigured(true);
          }
        }
      } catch (err) {
        console.error('Failed to load Meta credentials:', err);
      }
    };
    loadMetaCreds();
  }, [activeTab, user]);

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

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    if (!metaAccessToken.trim() || !metaPhoneNumberId.trim()) {
      toast.error('Both Access Token and Phone Number ID are required');
      return;
    }
    setWaLoading(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          metaAccessToken: metaAccessToken.trim(),
          metaPhoneNumberId: metaPhoneNumberId.trim(),
        },
        { merge: true }
      );
      setWaConfigured(true);
      toast.success('WhatsApp credentials saved! Reminders will now be sent via Meta WhatsApp API.');
    } catch (err) {
      toast.error(err.message || 'Failed to save WhatsApp credentials');
    } finally {
      setWaLoading(false);
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

  const tabs = [
    { id: 'profile', label: 'Profile', Icon: User },
    { id: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
    { id: 'security', label: 'Security', Icon: Shield },
  ];

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
                Manage your profile, reminders and security
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
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200'
              }`}
            >
              <Icon size={16} />
              {label}
              {id === 'whatsapp' && waConfigured && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5" title="Configured" />
              )}
            </button>
          ))}
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

        {/* Tab 2: WhatsApp Setup */}
        {activeTab === 'whatsapp' && (
          <div className="p-6 space-y-5">
            {/* Status banner */}
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${
              waConfigured
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            }`}>
              <Info size={18} className={waConfigured ? 'text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0' : 'text-amber-600 dark:text-amber-400 mt-0.5 shrink-0'} />
              <div>
                <p className={`text-sm font-semibold ${waConfigured ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {waConfigured ? '✅ WhatsApp Reminders Active' : '⚠️ WhatsApp Setup Required'}
                </p>
                <p className="text-xs text-surface-600 dark:text-surface-400 mt-0.5 leading-relaxed">
                  {waConfigured
                    ? 'Your Meta WhatsApp API is configured. Reminders will be sent automatically even when the app is closed.'
                    : 'Enter your Meta WhatsApp API credentials below to enable background WhatsApp reminders. One-time setup — no recurring keywords needed!'}
                </p>
              </div>
            </div>

            {/* How to get credentials */}
            <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">How to get your credentials (free)</p>
              <ol className="text-xs text-surface-600 dark:text-surface-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink size={10}/></a> and create a free app</li>
                <li>Add the <strong>WhatsApp</strong> product to your app</li>
                <li>Go to <strong>WhatsApp → API Setup</strong> — copy the <strong>Phone Number ID</strong></li>
                <li>Copy the temporary <strong>Access Token</strong> (or create a permanent System User token)</li>
                <li>Add the recipient phone number as a test number in <strong>WhatsApp → API Setup</strong></li>
              </ol>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium mt-1"
              >
                Full setup guide <ExternalLink size={11} />
              </a>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="space-y-4">
              <div>
                <label className="label-text">Phone Number ID</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    required
                    className="input-field pl-10 font-mono text-sm"
                    value={metaPhoneNumberId}
                    onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                    placeholder="123456789012345"
                  />
                </div>
                <p className="text-[11px] text-surface-400 mt-1">Found in Meta → WhatsApp → API Setup</p>
              </div>

              <div>
                <label className="label-text">Permanent Access Token</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="password"
                    required
                    className="input-field pl-10 font-mono text-sm"
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxxxxxxxx..."
                  />
                </div>
                <p className="text-[11px] text-surface-400 mt-1">
                  Use a <strong>System User token</strong> for a permanent token that never expires.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-surface-200 dark:border-surface-700">
                <button type="button" onClick={onClose} className="btn-secondary px-5">
                  Cancel
                </button>
                <button type="submit" disabled={waLoading} className="btn-primary px-6 flex items-center gap-2">
                  {waLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  Save & Activate
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Security & Password */}
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
