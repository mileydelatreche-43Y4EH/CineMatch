const USERS_KEY = 'cinematch_users';
const SESSION_KEY = 'cinematch_session';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getUsers() {
  return readJson(USERS_KEY, []);
}

export function getSession() {
  return readJson(SESSION_KEY, null);
}

export function getCurrentUser() {
  const session = getSession();
  if (!session?.email) return null;
  return getUsers().find((u) => u.email === session.email) || null;
}

export function registerUser({ name, email, password }) {
  const users = getUsers();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error('Un compte avec cet email existe deja.');
  }
  const user = {
    id: crypto.randomUUID(),
    name: String(name || '').trim() || normalizedEmail.split('@')[0] || 'Utilisateur',
    email: normalizedEmail,
    password: String(password || ''),
    watchlist: [],
    history: [],
    profile: {
      displayName: null,
      avatar: null,
      pinEnabled: false,
      pinCode: null,
      completed: false,
    },
  };
  users.push(user);
  writeJson(USERS_KEY, users);
  writeJson(SESSION_KEY, { email: user.email, createdAt: Date.now() });
  return user;
}

export function updateCurrentUserProfile({ displayName, avatar, pinEnabled = false, pinCode = null }) {
  const session = getSession();
  if (!session?.email) throw new Error('Session introuvable.');
  const users = getUsers();
  const idx = users.findIndex((u) => u.email === session.email);
  if (idx < 0) throw new Error('Utilisateur introuvable.');
  const user = users[idx];
  const updated = {
    ...user,
    name: String(displayName || '').trim() || user.name,
    profile: {
      ...(user.profile || {}),
      displayName: String(displayName || '').trim() || user.name,
      avatar: avatar || user.profile?.avatar || null,
      pinEnabled: Boolean(pinEnabled),
      pinCode: pinEnabled ? String(pinCode || '') : null,
      completed: true,
    },
  };
  users[idx] = updated;
  writeJson(USERS_KEY, users);
  return updated;
}

export function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = getUsers().find((u) => u.email === normalizedEmail);
  if (!user || user.password !== String(password || '')) {
    throw new Error('Email ou mot de passe invalide.');
  }
  writeJson(SESSION_KEY, { email: user.email, createdAt: Date.now() });
  return user;
}

export function loginWithGoogleMock({ email, name }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let users = getUsers();
  let user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: String(name || '').trim() || normalizedEmail.split('@')[0] || 'Google User',
      email: normalizedEmail,
      password: null,
      watchlist: [],
      history: [],
      provider: 'google',
    };
    users = [...users, user];
    writeJson(USERS_KEY, users);
  }
  writeJson(SESSION_KEY, { email: user.email, createdAt: Date.now() });
  return user;
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export function requireAuth() {
  const session = getSession();
  if (session?.email) return true;
  const current = `${window.location.pathname}${window.location.search}`;
  const redirect = encodeURIComponent(current);
  window.location.href = `/login.html?next=${redirect}`;
  return false;
}
