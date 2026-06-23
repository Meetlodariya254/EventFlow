import { createContext, useContext, useState, useEffect } from 'react';
import { signUp, logIn, logOut, onAuthChange } from '../firebase/auth';

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

  const value = {
    user,
    loading,
    signUp: handleSignUp,
    logIn: handleLogIn,
    logOut: handleLogOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
