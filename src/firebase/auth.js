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

export const onAuthChange = (callback) => {
  authStateListeners.push(callback);
  const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  setTimeout(() => callback(currentUser), 100);
  
  return () => {
    authStateListeners = authStateListeners.filter((l) => l !== callback);
  };
};
