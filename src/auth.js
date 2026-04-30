import { supabase } from './supabase.js';
const PROFILES_STORE_KEY = 'cinematch_profiles_store_v1';
const ACTIVE_PROFILE_STORE_KEY = 'cinematch_active_profile_store_v1';
const MAX_PROFILES_PER_ACCOUNT = 3;

function normalizeAuthUser(user) {
  if (!user) return null;
  const fallbackName = user.email?.split('@')?.[0] || 'Utilisateur';
  return {
    id: user.id,
    name: user.user_metadata?.display_name || user.user_metadata?.name || fallbackName,
    email: user.email || null,
    profile: {
      displayName: user.user_metadata?.display_name || null,
      avatar: user.user_metadata?.avatar || null,
      pinEnabled: Boolean(user.user_metadata?.pin_enabled),
      pinCode: user.user_metadata?.pin_code || null,
      completed: Boolean(user.user_metadata?.profile_completed),
    },
  };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return normalizeAuthUser(data.user);
}

export async function registerUser({ name, email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: String(password || ''),
    options: {
      data: {
        name: String(name || '').trim() || normalizedEmail.split('@')[0] || 'Utilisateur',
      },
    },
  });
  if (error) throw new Error(error.message);
  return normalizeAuthUser(data.user);
}

export async function updateCurrentUserProfile({ displayName, avatar, pinEnabled = false, pinCode = null }) {
  const cleanDisplayName = String(displayName || '').trim();
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: cleanDisplayName || null,
      avatar: avatar || null,
      pin_enabled: Boolean(pinEnabled),
      pin_code: pinEnabled ? String(pinCode || '') : null,
      profile_completed: true,
    },
  });
  if (error) throw new Error(error.message);
  return normalizeAuthUser(data.user);
}

export async function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: String(password || ''),
  });
  if (error) throw new Error(error.message);
  return normalizeAuthUser(data.user);
}

export async function loginWithGoogleMock({ mode = 'login', next = '/' } = {}) {
  const redirectUrl = new URL('/login.html', window.location.origin);
  redirectUrl.searchParams.set('oauth', mode);
  if (next && next !== '/') {
    redirectUrl.searchParams.set('next', next);
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl.toString() },
  });
  if (error) throw new Error(error.message);
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  localStorage.removeItem(ACTIVE_PROFILE_STORE_KEY);
}

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getProfilesStore() {
  return readStore(PROFILES_STORE_KEY, {});
}

function setProfilesStore(store) {
  writeStore(PROFILES_STORE_KEY, store);
}

function getActiveProfileStore() {
  return readStore(ACTIVE_PROFILE_STORE_KEY, {});
}

function setActiveProfileStore(store) {
  writeStore(ACTIVE_PROFILE_STORE_KEY, store);
}

export async function getProfilesForCurrentUser() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return [];
  const store = getProfilesStore();
  return store[currentUser.id] || [];
}

export async function createProfileForCurrentUser({ displayName, avatar = null } = {}) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) throw new Error('Session introuvable.');
  const cleanName = String(displayName || '').trim();
  if (!cleanName) throw new Error('Nom de profil obligatoire.');

  const store = getProfilesStore();
  const existing = store[currentUser.id] || [];
  if (existing.length >= MAX_PROFILES_PER_ACCOUNT) {
    throw new Error('Maximum 3 profils par compte.');
  }
  const profile = {
    id: crypto.randomUUID(),
    name: cleanName,
    avatar: avatar || null,
    createdAt: Date.now(),
  };
  store[currentUser.id] = [...existing, profile];
  setProfilesStore(store);
  await setActiveProfileForCurrentUser(profile.id);
  return profile;
}

export function getMaxProfilesPerAccount() {
  return MAX_PROFILES_PER_ACCOUNT;
}

export async function updateProfileForCurrentUser(profileId, { displayName, avatar } = {}) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) throw new Error('Session introuvable.');
  const store = getProfilesStore();
  const existing = store[currentUser.id] || [];
  const idx = existing.findIndex((p) => p.id === profileId);
  if (idx < 0) throw new Error('Profil introuvable.');

  const nextName = String(displayName ?? existing[idx].name).trim();
  if (!nextName) throw new Error('Nom de profil obligatoire.');
  existing[idx] = {
    ...existing[idx],
    name: nextName,
    avatar: avatar ?? existing[idx].avatar ?? null,
    updatedAt: Date.now(),
  };
  store[currentUser.id] = existing;
  setProfilesStore(store);
  return existing[idx];
}

export async function deleteProfileForCurrentUser(profileId) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) throw new Error('Session introuvable.');
  const store = getProfilesStore();
  const existing = store[currentUser.id] || [];
  if (existing.length <= 1) {
    throw new Error('Tu dois garder au moins un profil.');
  }
  const remaining = existing.filter((p) => p.id !== profileId);
  if (remaining.length === existing.length) throw new Error('Profil introuvable.');
  store[currentUser.id] = remaining;
  setProfilesStore(store);

  const activeStore = getActiveProfileStore();
  if (activeStore[currentUser.id] === profileId) {
    activeStore[currentUser.id] = remaining[0].id;
    setActiveProfileStore(activeStore);
  }
  return remaining;
}

export async function setActiveProfileForCurrentUser(profileId) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) throw new Error('Session introuvable.');
  const profiles = await getProfilesForCurrentUser();
  if (!profiles.some((p) => p.id === profileId)) {
    throw new Error('Profil introuvable.');
  }
  const activeStore = getActiveProfileStore();
  activeStore[currentUser.id] = profileId;
  setActiveProfileStore(activeStore);
}

export async function getActiveProfileForCurrentUser() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return null;
  const activeStore = getActiveProfileStore();
  const activeId = activeStore[currentUser.id];
  if (!activeId) return null;
  const profiles = await getProfilesForCurrentUser();
  return profiles.find((p) => p.id === activeId) || null;
}

export async function ensureDefaultProfileForCurrentUser() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return null;
  const profiles = await getProfilesForCurrentUser();
  if (profiles.length) return profiles;

  const fallbackName = currentUser.profile?.displayName || currentUser.name || currentUser.email?.split('@')[0] || 'Profil';
  const created = await createProfileForCurrentUser({
    displayName: fallbackName,
    avatar: currentUser.profile?.avatar || null,
  });
  return [created];
}

export async function requireAuth() {
  const session = await getSession();
  if (session?.user?.id) return true;
  const current = `${window.location.pathname}${window.location.search}`;
  const redirect = encodeURIComponent(current);
  window.location.href = `/login.html?next=${redirect}`;
  return false;
}
