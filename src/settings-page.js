import {
  createProfileForCurrentUser,
  deleteProfileForCurrentUser,
  ensureDefaultProfileForCurrentUser,
  getActiveProfileForCurrentUser,
  getMaxProfilesPerAccount,
  getProfilesForCurrentUser,
  logoutUser,
  requireAuth,
  setActiveProfileForCurrentUser,
  updateProfileForCurrentUser,
} from './auth.js';

const list = document.getElementById('settings-profiles-list');
const addBtn = document.getElementById('btn-settings-add-profile');
const limitText = document.getElementById('settings-profiles-limit-text');
const tabs = Array.from(document.querySelectorAll('[data-settings-tab]'));
const views = Array.from(document.querySelectorAll('[data-settings-view]'));
const avatarNodes = Array.from(document.querySelectorAll('.js-profile-avatar'));
const nameNodes = Array.from(document.querySelectorAll('.js-profile-name'));
const profileChip = document.querySelector('.profile-chip');
const profileMenu = document.getElementById('profile-menu');
const topbarRight = document.querySelector('.topbar-right');
const switchProfileBtn = document.getElementById('btn-switch-profile');
const settingsBtn = document.getElementById('btn-settings');
const watchlistBtn = document.getElementById('btn-watchlist');
const logoutBtn = document.getElementById('btn-logout');
const btnNotifications = document.getElementById('btn-notifications');
const notificationsDrawer = document.getElementById('notifications-drawer');
const btnCloseNotifications = document.getElementById('btn-close-notifications');
const notifBackdrop = document.getElementById('notif-backdrop');

const avatarSeeds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
  nameNodes.forEach((node) => {
    node.textContent = cachedProfile.name || 'Profil';
  });
  if (cachedProfile.avatar) {
    avatarNodes.forEach((node) => {
      node.style.backgroundImage = `url('${cachedProfile.avatar}')`;
    });
  }
}

function randomAvatar() {
  const seed = avatarSeeds[Math.floor(Math.random() * avatarSeeds.length)];
  return `https://api.dicebear.com/9.x/personas/svg?seed=Settings${seed}${Date.now()}`;
}

function escapeHtml(value) {
  const d = document.createElement('div');
  d.textContent = value;
  return d.innerHTML;
}

function switchView(view) {
  tabs.forEach((tab) => {
    const active = tab.getAttribute('data-settings-tab') === view;
    tab.classList.toggle('active', active);
  });
  views.forEach((section) => {
    const active = section.getAttribute('data-settings-view') === view;
    section.classList.toggle('active', active);
  });
}

async function hydrateHeaderProfile(activeProfile) {
  const fallbackAvatar = randomAvatar();
  const targetProfile = activeProfile || (await getActiveProfileForCurrentUser());
  nameNodes.forEach((node) => {
    node.textContent = targetProfile?.name || 'Profil';
  });
  avatarNodes.forEach((node) => {
    node.style.backgroundImage = `url('${targetProfile?.avatar || fallbackAvatar}')`;
  });
}

async function render() {
  const profiles = await getProfilesForCurrentUser();
  const active = await getActiveProfileForCurrentUser();
  const maxProfiles = getMaxProfilesPerAccount();
  list.innerHTML = profiles
    .map(
      (p) => `
      <article class="settings-profile-card">
        <span class="settings-profile-avatar" style="background-image:url('${p.avatar || ''}')"></span>
        <div class="settings-profile-main">
          <div class="settings-profile-top">
            ${active?.id === p.id ? '<span class="settings-badge">Actif</span>' : ''}
            <input class="settings-profile-input" data-profile-name="${p.id}" value="${escapeHtml(p.name)}" />
            <p>Profil adulte</p>
          </div>
          <div class="settings-profile-actions">
            <button type="button" class="btn primary" data-profile-select="${p.id}" ${active?.id === p.id ? 'disabled' : ''}>${
              active?.id === p.id ? 'Profil actif' : 'Utiliser ce profil'
            }</button>
            <button type="button" class="btn primary" data-profile-avatar="${p.id}">Avatar</button>
            <button type="button" class="btn primary" data-profile-save="${p.id}">Modifier</button>
            <button type="button" class="btn primary" data-profile-delete="${p.id}">Supprimer</button>
          </div>
        </div>
      </article>
    `
    )
    .join('');

  if (addBtn) {
    addBtn.disabled = profiles.length >= maxProfiles;
    addBtn.textContent = addBtn.disabled ? `Limite atteinte (${maxProfiles}/${maxProfiles})` : '+ Ajouter un profil';
  }
  if (limitText) {
    limitText.textContent = `Gérer les profils de ton compte (max. ${maxProfiles})`;
  }
  await hydrateHeaderProfile(active);
}

async function init() {
  hydrateProfileFromCache();
  const authed = await requireAuth();
  if (!authed) return;
  await ensureDefaultProfileForCurrentUser();
  switchView('profiles');
  await render();

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-settings-tab');
      if (target === 'profiles' || target === 'subscription') {
        switchView(target);
      }
    });
  });

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
      window.location.href = '/profiles.html?next=%2Fsettings.html';
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      profileMenu.hidden = true;
    });
  }

  if (watchlistBtn) {
    watchlistBtn.addEventListener('click', () => {
      window.location.href = '/index.html';
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

  addBtn?.addEventListener('click', async () => {
    const name = prompt('Nom du profil :', 'Nouveau profil') || '';
    if (!name.trim()) return;
    await createProfileForCurrentUser({ displayName: name.trim(), avatar: randomAvatar() });
    await render();
  });

  list?.addEventListener('click', async (event) => {
    const selectBtn = event.target.closest('[data-profile-select]');
    if (selectBtn) {
      await setActiveProfileForCurrentUser(selectBtn.getAttribute('data-profile-select'));
      await render();
      return;
    }

    const avatarBtn = event.target.closest('[data-profile-avatar]');
    if (avatarBtn) {
      const profileId = avatarBtn.getAttribute('data-profile-avatar');
      const input = list.querySelector(`[data-profile-name="${profileId}"]`);
      await updateProfileForCurrentUser(profileId, {
        displayName: input?.value || '',
        avatar: randomAvatar(),
      });
      await render();
      return;
    }

    const saveBtn = event.target.closest('[data-profile-save]');
    if (saveBtn) {
      const profileId = saveBtn.getAttribute('data-profile-save');
      const input = list.querySelector(`[data-profile-name="${profileId}"]`);
      await updateProfileForCurrentUser(profileId, {
        displayName: input?.value || '',
      });
      await render();
      return;
    }

    const deleteBtn = event.target.closest('[data-profile-delete]');
    if (deleteBtn) {
      const profileId = deleteBtn.getAttribute('data-profile-delete');
      await deleteProfileForCurrentUser(profileId);
      await render();
    }
  });
}

init().catch((error) => {
  console.error(error);
  alert(error.message || 'Erreur paramètres.');
});
