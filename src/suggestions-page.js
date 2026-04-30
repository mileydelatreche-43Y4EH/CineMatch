import {
  ensureDefaultProfileForCurrentUser,
  getActiveProfileForCurrentUser,
  getCurrentUser,
  logoutUser,
  requireAuth,
} from './auth.js';

const topbar = document.querySelector('.topbar');
const profileChip = document.querySelector('.profile-chip');
const profileMenu = document.getElementById('profile-menu');
const topbarRight = document.querySelector('.topbar-right');
const switchProfileBtn = document.getElementById('btn-switch-profile');
const settingsBtn = document.getElementById('btn-settings');
const logoutBtn = document.getElementById('btn-logout');
const btnNotifications = document.getElementById('btn-notifications');
const notificationsDrawer = document.getElementById('notifications-drawer');
const btnCloseNotifications = document.getElementById('btn-close-notifications');
const notifBackdrop = document.getElementById('notif-backdrop');

function getCurrentAuthUserIdFromStorage() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.includes('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.currentSession?.user || parsed?.session?.user;
      const userId = user?.id || user?.sub;
      if (typeof userId === 'string' && userId.length > 0) return userId;
    }
  } catch {
    return null;
  }
  return null;
}

function getCachedActiveProfile() {
  try {
    const profilesStore = JSON.parse(localStorage.getItem('cinematch_profiles_store_v1') || '{}');
    const activeStore = JSON.parse(localStorage.getItem('cinematch_active_profile_store_v1') || '{}');
    const userId = getCurrentAuthUserIdFromStorage();
    if (!userId) return null;
    const activeProfileId = activeStore[userId];
    if (!activeProfileId) return null;
    const profiles = profilesStore[userId] || [];
    return profiles.find((p) => p.id === activeProfileId) || null;
  } catch {
    return null;
  }
}

function hydrateProfileFromCache() {
  const cachedProfile = getCachedActiveProfile();
  if (!cachedProfile) return;
  document.querySelectorAll('.js-profile-name').forEach((node) => {
    node.textContent = cachedProfile.name || 'Profil';
  });
  if (cachedProfile.avatar) {
    document.querySelectorAll('.js-profile-avatar').forEach((node) => {
      node.style.backgroundImage = `url("${cachedProfile.avatar}")`;
      node.style.backgroundSize = 'cover';
      node.style.backgroundPosition = 'center';
    });
  }
}

async function hydrateCurrentUserUi() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const activeProfile = await getActiveProfileForCurrentUser();
  const displayName = activeProfile?.name || currentUser.name || 'Profil';
  document.querySelectorAll('.js-profile-name').forEach((node) => {
    node.textContent = displayName;
  });
  const avatarUrl = activeProfile?.avatar || currentUser.profile?.avatar;
  if (avatarUrl) {
    document.querySelectorAll('.js-profile-avatar').forEach((node) => {
      node.style.backgroundImage = `url("${avatarUrl}")`;
      node.style.backgroundSize = 'cover';
      node.style.backgroundPosition = 'center';
    });
  }
}

function updateTopbarOnScroll() {
  if (!topbar) return;
  topbar.classList.toggle('scrolled', window.scrollY > 12);
}

window.addEventListener('scroll', updateTopbarOnScroll, { passive: true });
updateTopbarOnScroll();
hydrateProfileFromCache();

if (profileChip && profileMenu && topbarRight) {
  profileChip.addEventListener('click', () => {
    profileMenu.hidden = !profileMenu.hidden;
  });

  document.addEventListener('click', (event) => {
    if (!topbarRight.contains(event.target)) {
      profileMenu.hidden = true;
    }
  });
}

if (switchProfileBtn) {
  switchProfileBtn.addEventListener('click', () => {
    window.location.href = '/profiles.html?next=%2Fsuggestions.html';
  });
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    window.location.href = '/settings.html';
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/login.html';
  });
}

function openNotifications() {
  if (!notificationsDrawer || !notifBackdrop) return;
  notifBackdrop.hidden = false;
  notificationsDrawer.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    notificationsDrawer.classList.add('open');
  });
}

function closeNotifications() {
  if (!notificationsDrawer || !notifBackdrop) return;
  notificationsDrawer.classList.remove('open');
  notificationsDrawer.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    if (notificationsDrawer?.classList.contains('open')) return;
    notifBackdrop.hidden = true;
  }, 280);
}

if (btnNotifications) {
  btnNotifications.addEventListener('click', () => {
    const isOpen = notificationsDrawer?.classList.contains('open');
    if (isOpen) closeNotifications();
    else openNotifications();
  });
}

if (btnCloseNotifications) {
  btnCloseNotifications.addEventListener('click', closeNotifications);
}

if (notifBackdrop) {
  notifBackdrop.addEventListener('click', closeNotifications);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeNotifications();
});

async function initPageAuth() {
  const isAuthed = await requireAuth();
  if (!isAuthed) throw new Error('Auth redirect');
  await ensureDefaultProfileForCurrentUser();
  const activeProfile = await getActiveProfileForCurrentUser();
  if (!activeProfile) {
    window.location.href = '/profiles.html?next=%2Fsuggestions.html';
    return;
  }
  await hydrateCurrentUserUi();
}

initPageAuth().catch((error) => {
  console.error(error);
});
