// Real Firebase Auth Implementation
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';

// ── Sign Up ──────────────────────────────────────────────────────────────────
export const signUp = async (email, password, displayName) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name on Firebase Auth profile
  await fbUpdateProfile(user, { displayName });

  // Create a Firestore user document
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    displayName,
    mobileNumber: '',
    createdAt: new Date().toISOString(),
  });

  return { uid: user.uid, email: user.email, displayName };
};

// ── Log In ───────────────────────────────────────────────────────────────────
export const logIn = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  return { uid: user.uid, email: user.email, displayName: user.displayName };
};

// ── Log Out ──────────────────────────────────────────────────────────────────
export const logOut = async () => {
  await signOut(auth);
};

// ── Auth State Listener ──────────────────────────────────────────────────────
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    // Merge Firestore profile data (mobileNumber, etc.) into the user object
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const profileData = userDoc.exists() ? userDoc.data() : {};
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || profileData.displayName || '',
        mobileNumber: profileData.mobileNumber || '',
        ...profileData,
      });
    } catch {
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || '',
      });
    }
  });
};

// ── Password Reset (Send Email) ──────────────────────────────────────────────
export const sendPasswordResetLink = async (email) => {
  await sendPasswordResetEmail(auth, email);
  // Return a dummy token/shortCode shape so existing UI code doesn't break
  return { token: null, shortCode: null };
};

// ── Password Reset (Complete) ────────────────────────────────────────────────
export const completePasswordReset = async (email, tokenOrCode, newPassword) => {
  // tokenOrCode here is the oobCode from the Firebase reset email link
  await verifyPasswordResetCode(auth, tokenOrCode);
  await confirmPasswordReset(auth, tokenOrCode, newPassword);
};

// ── Update Password ──────────────────────────────────────────────────────────
export const updateUserPassword = async (email, currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No logged in user');

  // Re-authenticate first (required by Firebase for sensitive operations)
  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await fbUpdatePassword(user, newPassword);
};

// ── Update Profile ───────────────────────────────────────────────────────────
export const updateUserProfile = async (uid, updates) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No logged in user');

  // Update Firebase Auth display name if provided
  if (updates.displayName) {
    await fbUpdateProfile(user, { displayName: updates.displayName });
  }

  // Merge updates into Firestore user document
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { ...updates, uid }, { merge: true });
};
