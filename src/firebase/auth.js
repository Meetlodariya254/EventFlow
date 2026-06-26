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

export const resetPassword = async (email, newPassword) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const users = getUsers();
  const index = users.findIndex((u) => u.email === email);
  if (index === -1) {
    throw new Error('No account found with this email address.');
  }
  users[index].password = newPassword;
  setUsers(users);
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
