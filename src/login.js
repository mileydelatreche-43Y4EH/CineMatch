import { loginUser, loginWithGoogleMock, registerUser, updateCurrentUserProfile } from './auth.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorEl = document.getElementById('auth-error');
const googleBtn = document.getElementById('btn-google-login');
const googleRegisterBtn = document.getElementById('btn-google-register');
const switchLoginBtn = document.getElementById('btn-switch-login');
const authOverlay = document.getElementById('auth-overlay');
const openLoginBtn = document.getElementById('btn-open-login');
const openRegisterBtn = document.getElementById('btn-open-register');
const closeAuthBtn = document.getElementById('btn-close-auth');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const createBtn = document.getElementById('btn-create-account');
const regCaptcha = document.getElementById('reg-captcha');
const landingHero = document.querySelector('.landing-hero');
const profileOverlay = document.getElementById('profile-overlay');
const profileSetupForm = document.getElementById('profile-setup-form');
const profileDisplayName = document.getElementById('profile-display-name');
const profilePinEnabled = document.getElementById('profile-pin-enabled');
const profilePinCode = document.getElementById('profile-pin-code');
const avatarUploadInput = document.getElementById('avatar-upload-input');
const avatarPreview = document.getElementById('profile-avatar-preview');
const btnOpenAvatarPicker = document.getElementById('btn-open-avatar-picker');
const avatarGalleryOverlay = document.getElementById('avatar-gallery-overlay');
const btnCloseAvatarGallery = document.getElementById('btn-close-avatar-gallery');
const avatarTabs = document.querySelectorAll('.avatar-tab');
const avatarGrid = document.getElementById('avatar-gallery-grid');
const btnValidateAvatar = document.getElementById('btn-validate-avatar');

const params = new URLSearchParams(window.location.search);
const nextPath = params.get('next') || '/';
const mode = params.get('mode') || '';
let selectedAvatar = null;
let avatarCategory = 'netflix';
let pendingAvatar = null;

function syncValidateAvatarButton() {
  if (!btnValidateAvatar) return;
  btnValidateAvatar.disabled = !pendingAvatar;
}

const avatarCatalog = {
  netflix: [
    'https://api.dicebear.com/9.x/personas/png?seed=Netflix1',
    'https://api.dicebear.com/9.x/personas/png?seed=Netflix2',
    'https://api.dicebear.com/9.x/personas/png?seed=Netflix3',
    'https://api.dicebear.com/9.x/personas/png?seed=Netflix4',
    'https://api.dicebear.com/9.x/personas/png?seed=Netflix5',
    'https://api.dicebear.com/9.x/personas/png?seed=Netflix6',
  ],
  disney: [
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Disney1',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Disney2',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Disney3',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Disney4',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Disney5',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Disney6',
  ],
  prime: [
    'https://api.dicebear.com/9.x/personas/png?seed=Prime1',
    'https://api.dicebear.com/9.x/personas/png?seed=Prime2',
    'https://api.dicebear.com/9.x/personas/png?seed=Prime3',
    'https://api.dicebear.com/9.x/personas/png?seed=Prime4',
    'https://api.dicebear.com/9.x/personas/png?seed=Prime5',
    'https://api.dicebear.com/9.x/personas/png?seed=Prime6',
  ],
  anime: [
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Anime1',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Anime2',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Anime3',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Anime4',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Anime5',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Anime6',
  ],
};

function redirectAfterAuth() {
  window.location.href = nextPath;
}

function showError(message) {
  if (!errorEl) return;
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function clearError() {
  if (!errorEl) return;
  errorEl.hidden = true;
  errorEl.textContent = '';
}

function openAuth(mode = 'login') {
  if (!authOverlay) return;
  if (landingHero) landingHero.hidden = true;
  authOverlay.hidden = false;
  const loginMode = mode === 'login';
  if (loginForm) loginForm.hidden = !loginMode;
  if (registerForm) registerForm.hidden = loginMode;
  if (googleBtn) googleBtn.hidden = !loginMode;
  if (authTitle) authTitle.textContent = loginMode ? 'Bon retour !' : 'Creer un compte';
  if (authSubtitle) {
    authSubtitle.textContent = loginMode
      ? 'Connecte-toi pour acceder a ton compte'
      : 'Cree ton compte pour sauvegarder ta watchlist et ton historique';
  }
  if (closeAuthBtn) closeAuthBtn.hidden = !loginMode;
  clearError();
}

function closeAuth() {
  if (!authOverlay) return;
  authOverlay.hidden = true;
  if (landingHero) landingHero.hidden = false;
  clearError();
}

function openProfileSetup(defaultName = '') {
  if (!profileOverlay) return;
  profileOverlay.hidden = false;
  if (profileDisplayName) profileDisplayName.value = defaultName;
  if (profilePinEnabled) profilePinEnabled.checked = false;
  if (profilePinCode) {
    profilePinCode.hidden = true;
    profilePinCode.value = '';
  }
}

function closeProfileSetup() {
  if (!profileOverlay) return;
  profileOverlay.hidden = true;
}

function setAvatar(url) {
  selectedAvatar = url;
  if (avatarPreview) {
    avatarPreview.style.backgroundImage = `url("${url}")`;
    avatarPreview.style.backgroundSize = 'cover';
    avatarPreview.style.backgroundPosition = 'center';
  }
}

function renderAvatarGrid() {
  if (!avatarGrid) return;
  const list = avatarCatalog[avatarCategory] || [];
  avatarGrid.innerHTML = list
    .map((url) => `<button type="button" class="avatar-choice${pendingAvatar === url ? ' active' : ''}" data-avatar="${url}"><img src="${url}" alt="Avatar" /></button>`)
    .join('');
  syncValidateAvatarButton();
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    const email = document.getElementById('auth-email')?.value || '';
    const password = document.getElementById('auth-password')?.value || '';
    try {
      loginUser({ email, password });
      redirectAfterAuth();
    } catch (error) {
      showError(error.message || 'Connexion impossible.');
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    const email = document.getElementById('reg-email')?.value || '';
    const password = document.getElementById('reg-password')?.value || '';
    const confirmPassword = document.getElementById('reg-password-confirm')?.value || '';
    const captchaChecked = Boolean(document.getElementById('reg-captcha')?.checked);
    if (password !== confirmPassword) {
      showError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!captchaChecked) {
      showError('Valide le captcha avant de continuer.');
      return;
    }
    try {
      registerUser({ name: email.split('@')[0], email, password });
      closeAuth();
      openProfileSetup(email.split('@')[0]);
    } catch (error) {
      showError(error.message || 'Inscription impossible.');
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener('click', () => {
    clearError();
    // Placeholder: tu remplaceras ici par ton vrai flux Google OAuth.
    const email = prompt('Email Google pour simulation :', 'google.user@exemple.com') || '';
    if (!email.trim()) return;
    loginWithGoogleMock({ email, name: email.split('@')[0] });
    redirectAfterAuth();
  });
}

if (googleRegisterBtn) {
  googleRegisterBtn.addEventListener('click', () => {
    clearError();
    // Placeholder: tu remplaceras ici par ton vrai flux Google OAuth.
    const email = prompt('Email Google pour creation :', 'google.user@exemple.com') || '';
    if (!email.trim()) return;
    loginWithGoogleMock({ email, name: email.split('@')[0] });
    closeAuth();
    openProfileSetup(email.split('@')[0]);
  });
}

if (openLoginBtn) {
  openLoginBtn.addEventListener('click', () => {
    window.location.href = '/login.html?mode=login';
  });
}

if (openRegisterBtn) {
  openRegisterBtn.addEventListener('click', () => {
    window.location.href = '/login.html?mode=register';
  });
}

if (switchLoginBtn) {
  switchLoginBtn.addEventListener('click', () => openAuth('login'));
}

if (closeAuthBtn) {
  closeAuthBtn.addEventListener('click', () => {
    window.location.href = '/login.html';
  });
}

if (authOverlay) {
  authOverlay.addEventListener('click', (event) => {
    if (event.target === authOverlay) window.location.href = '/login.html';
  });
}

if (regCaptcha && createBtn) {
  regCaptcha.addEventListener('change', () => {
    createBtn.disabled = !regCaptcha.checked;
  });
}

if (profilePinEnabled && profilePinCode) {
  profilePinEnabled.addEventListener('change', () => {
    profilePinCode.hidden = !profilePinEnabled.checked;
  });
}

if (avatarUploadInput) {
  avatarUploadInput.addEventListener('change', async () => {
    const file = avatarUploadInput.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setAvatar(String(dataUrl));
  });
}

if (btnOpenAvatarPicker && avatarGalleryOverlay) {
  btnOpenAvatarPicker.addEventListener('click', () => {
    pendingAvatar = selectedAvatar;
    avatarGalleryOverlay.hidden = false;
    renderAvatarGrid();
  });
}

if (btnCloseAvatarGallery && avatarGalleryOverlay) {
  btnCloseAvatarGallery.addEventListener('click', () => {
    avatarGalleryOverlay.hidden = true;
  });
}

if (avatarGalleryOverlay) {
  avatarGalleryOverlay.addEventListener('click', (event) => {
    if (event.target === avatarGalleryOverlay) {
      avatarGalleryOverlay.hidden = true;
    }
  });
}

if (avatarTabs.length) {
  avatarTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      avatarTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      avatarCategory = tab.dataset.avatarCat || 'netflix';
      renderAvatarGrid();
    });
  });
}

if (avatarGrid) {
  avatarGrid.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-avatar]');
    if (!btn) return;
    pendingAvatar = btn.dataset.avatar || null;
    renderAvatarGrid();
  });
}

if (btnValidateAvatar && avatarGalleryOverlay) {
  btnValidateAvatar.addEventListener('click', () => {
    if (!pendingAvatar) {
      alert('Choisis un avatar avant de valider.');
      return;
    }
    setAvatar(pendingAvatar);
    avatarGalleryOverlay.hidden = true;
  });
}

if (profileSetupForm) {
  profileSetupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const displayName = profileDisplayName?.value?.trim();
    if (!displayName) {
      alert('Ajoute un nom de profil.');
      return;
    }
    if (profilePinEnabled?.checked && !/^\d{4}$/.test(profilePinCode?.value || '')) {
      alert('Le code PIN doit contenir 4 chiffres.');
      return;
    }
    updateCurrentUserProfile({
      displayName,
      avatar: selectedAvatar,
      pinEnabled: Boolean(profilePinEnabled?.checked),
      pinCode: profilePinCode?.value || null,
    });
    closeProfileSetup();
    redirectAfterAuth();
  });
}

if (mode === 'register') {
  openAuth('register');
} else if (mode === 'login') {
  openAuth('login');
} else {
  if (landingHero) landingHero.hidden = false;
  if (authOverlay) authOverlay.hidden = true;
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (avatarGalleryOverlay && !avatarGalleryOverlay.hidden) {
    avatarGalleryOverlay.hidden = true;
  }
});
