// Mock Auth Implementation using LocalStorage
const USERS_KEY = 'mock_users';
const CURRENT_USER_KEY = 'mock_current_user';

let authStateListeners = [];

const notifyListeners = (user) => {
  authStateListeners.forEach((listener) => listener(user));
};

const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
const setUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

export const signUp = async (email, password, displayName) => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate delay
  const users = getUsers();
  if (users.find((u) => u.email === email)) {
    throw new Error('Firebase: Error (auth/email-already-in-use).');
  }
  const newUser = { uid: Date.now().toString(), email, displayName, password };
  users.push(newUser);
  setUsers(users);
  
  const userToStore = { uid: newUser.uid, email: newUser.email, displayName: newUser.displayName };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
  notifyListeners(userToStore);
  return userToStore;
};

export const logIn = async (email, password) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const users = getUsers();
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    throw new Error('Firebase: Error (auth/invalid-credential).');
  }
  
  const userToStore = { uid: user.uid, email: user.email, displayName: user.displayName };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userToStore));
  notifyListeners(userToStore);
  return userToStore;
};

export const logOut = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  localStorage.removeItem(CURRENT_USER_KEY);
  notifyListeners(null);
};

const RESET_TOKENS_KEY = 'mock_reset_tokens';
const getResetTokens = () => JSON.parse(localStorage.getItem(RESET_TOKENS_KEY) || '{}');
const setResetTokens = (tokens) => localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));

export const sendPasswordResetLink = async (email) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) {
    throw new Error('No account found with this registered email address.');
  }

  // Generate prominent 6-Digit One-Time Reset Code (OTP)
  const shortCode = Math.floor(100000 + Math.random() * 900000).toString();

  const payload = {
    email,
    shortCode,
    exp: Date.now() + 15 * 60 * 1000,
    nonce: Math.random().toString(36).substring(2),
  };
  const token = btoa(encodeURIComponent(JSON.stringify(payload)));

  const tokens = getResetTokens();
  tokens[email] = { token, shortCode, expiry: payload.exp };
  setResetTokens(tokens);

  return { token, shortCode };
};

export const completePasswordReset = async (email, tokenOrCode, newPassword) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  let isValid = false;
  const tokens = getResetTokens();
  const stored = tokens[email];

  if (stored && (stored.token === tokenOrCode || stored.shortCode === tokenOrCode.trim())) {
    if (Date.now() > stored.expiry) {
      delete tokens[email];
      setResetTokens(tokens);
      throw new Error('This verification code or link has expired. Please request a new reset email.');
    }
    isValid = true;
  }

  if (!isValid) {
    try {
      const rawJson = decodeURIComponent(atob(tokenOrCode));
      const decodedPayload = JSON.parse(rawJson);
      if (decodedPayload && decodedPayload.email === email) {
        if (Date.now() > decodedPayload.exp) {
          throw new Error('This verification link has expired.');
        }
        isValid = true;
      }
    } catch (err) {
      // Not a valid base64 token
    }
  }

  if (!isValid) {
    throw new Error('Invalid verification code or link. Please verify the 6-digit code or request a new email.');
  }

  const users = getUsers();
  const index = users.findIndex((u) => u.email === email);
  if (index === -1) {
    throw new Error('User account not found.');
  }

  users[index].password = newPassword;
  setUsers(users);

  localStorage.removeItem(CURRENT_USER_KEY);
  notifyListeners(null);

  if (tokens[email]) {
    delete tokens[email];
    setResetTokens(tokens);
  }
};

export const updateUserPassword = async (email, currentPassword, newPassword) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const users = getUsers();
  const index = users.findIndex((u) => u.email === email && u.password === currentPassword);
  if (index === -1) {
    throw new Error('Current password is incorrect.');
  }
  users[index].password = newPassword;
  setUsers(users);
};

export const updateUserProfile = async (uid, updates) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const users = getUsers();
  const index = users.findIndex((u) => u.uid === uid);
  if (index === -1) {
    throw new Error('User account not found.');
  }
  users[index] = { ...users[index], ...updates };
  setUsers(users);

  const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  if (currentUser && currentUser.uid === uid) {
    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    notifyListeners(updatedUser);
  }
};

export const onAuthChange = (callback) => {
  authStateListeners.push(callback);
  const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  setTimeout(() => callback(currentUser), 100);
  
  return () => {
    authStateListeners = authStateListeners.filter((l) => l !== callback);
  };
};
