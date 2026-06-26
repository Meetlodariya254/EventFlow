import { createContext, useContext, useState, useEffect } from 'react';
import { signUp, logIn, logOut, onAuthChange, resetPassword, updateUserPassword, updateUserProfile } from '../firebase/auth';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignUp = async (email, password, displayName) => {
    const newUser = await signUp(email, password, displayName);
    return newUser;
  };

  const handleLogIn = async (email, password) => {
    const loggedInUser = await logIn(email, password);
    return loggedInUser;
  };

  const handleLogOut = async () => {
    await logOut();
  };

  const handleResetPassword = async (email, newPassword) => {
    await resetPassword(email, newPassword);
  };

  const handleUpdatePassword = async (currentPassword, newPassword) => {
    if (!user?.email) throw new Error('No logged in user');
    await updateUserPassword(user.email, currentPassword, newPassword);
  };

  const handleUpdateProfile = async (updates) => {
    if (!user?.uid) throw new Error('No logged in user');
    await updateUserProfile(user.uid, updates);
  };

  const value = {
    user,
    loading,
    signUp: handleSignUp,
    logIn: handleLogIn,
    logOut: handleLogOut,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    updateProfile: handleUpdateProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
