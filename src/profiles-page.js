import {
  ensureDefaultProfileForCurrentUser,
  getMaxProfilesPerAccount,
  getProfilesForCurrentUser,
  logoutUser,
  requireAuth,
  setActiveProfileForCurrentUser,
} from './auth.js';

const grid = document.getElementById('profiles-grid');
const logoutBtn = document.getElementById('btn-profiles-logout');
const params = new URLSearchParams(window.location.search);
const nextPath = params.get('next') || '/index.html';

function escapeHtml(value) {
  const d = document.createElement('div');
  d.textContent = value;
  return d.innerHTML;
}

function renderProfiles(profiles) {
  if (!grid) return;
  const canAddProfile = profiles.length < getMaxProfilesPerAccount();
  const cards = profiles
    .map(
      (profile) => `
      <button class="profile-select-card" type="button" data-profile-id="${profile.id}">
        <span class="profile-select-avatar" style="background-image:url('${profile.avatar || ''}')"></span>
        <span>${escapeHtml(profile.name)}</span>
      </button>
    `
    )
    .join('');

  grid.innerHTML = `
    ${cards}
    ${
      canAddProfile
        ? `<button class="profile-select-card add-profile-card" type="button" id="btn-add-profile">
      <span class="profile-select-avatar add-profile-avatar">+</span>
      <span>Ajouter un profil</span>
    </button>`
        : ''
    }
  `;
}

async function onAddProfile() {
  const backToProfiles = `/profiles.html?next=${encodeURIComponent(nextPath)}`;
  const target = `/login.html?createProfile=1&next=${encodeURIComponent(backToProfiles)}`;
  window.location.href = target;
}

async function init() {
  const authed = await requireAuth();
  if (!authed) return;
  await ensureDefaultProfileForCurrentUser();
  const profiles = await getProfilesForCurrentUser();
  renderProfiles(profiles);

  grid?.addEventListener('click', async (event) => {
    const addButton = event.target.closest('#btn-add-profile');
    if (addButton) {
      await onAddProfile();
      return;
    }
    const profileButton = event.target.closest('[data-profile-id]');
    if (!profileButton) return;
    const profileId = profileButton.getAttribute('data-profile-id');
    if (!profileId) return;
    await setActiveProfileForCurrentUser(profileId);
    window.location.href = nextPath;
  });

  logoutBtn?.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/login.html';
  });
}

init().catch((error) => {
  console.error(error);
});
