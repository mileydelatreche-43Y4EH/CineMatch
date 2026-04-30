import {
  createProfileForCurrentUser,
  getActiveProfileForCurrentUser,
  getCurrentUser,
  getProfilesForCurrentUser,
  getSession,
  loginUser,
  loginWithGoogleMock,
  registerUser,
  updateCurrentUserProfile,
} from './auth.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const errorEl = document.getElementById('auth-error');
const googleBtn = document.getElementById('btn-google-login');
const googleRegisterBtn = document.getElementById('btn-google-register');
const switchLoginBtn = document.getElementById('btn-switch-login');
const switchRegisterBtn = document.getElementById('btn-switch-register');
const authOverlay = document.getElementById('auth-overlay');
const openLoginBtn = document.getElementById('btn-open-login');
const openRegisterBtn = document.getElementById('btn-open-register');
const closeAuthBtn = document.getElementById('btn-close-auth');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSep = document.querySelector('.auth-sep');
const createBtn = document.getElementById('btn-create-account');
const loginSubmitBtn = document.getElementById('btn-login-submit');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const regEmail = document.getElementById('reg-email');
const regPassword = document.getElementById('reg-password');
const regPasswordConfirm = document.getElementById('reg-password-confirm');
const regEmailError = document.getElementById('reg-email-error');
const regPasswordConfirmError = document.getElementById('reg-password-confirm-error');
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
const passwordToggleButtons = document.querySelectorAll('[data-toggle-password]');
const profileSubmitBtn = profileSetupForm?.querySelector('button[type="submit"]');

const params = new URLSearchParams(window.location.search);
const nextPath = params.get('next') || '/';
const forceCreateProfile = params.get('createProfile') === '1';
let selectedAvatar = null;
let avatarCategory = 'netflix';
let pendingAvatar = null;
let profileSubmitInFlight = false;

function highQualityAvatarUrl(url) {
  if (typeof url !== 'string') return url;
  if (url.includes('/png?seed=')) return url.replace('/png?seed=', '/svg?seed=');
  return url;
}

function resolvedNextPath() {
  if (!nextPath || nextPath === '/' || nextPath === '/login.html') {
    return '/search.html';
  }
  return nextPath;
}

async function handleOAuthReturn() {
  const oauthMode = params.get('oauth');
  if (!oauthMode) return false;
  const session = await getSession();
  if (!session?.user?.id) return false;
  const currentUser = await getCurrentUser();
  const activeProfile = await getActiveProfileForCurrentUser();
  const defaultName = currentUser?.name || currentUser?.email?.split('@')[0] || '';
  const profileCompleted = Boolean(currentUser?.profile?.completed) || Boolean(activeProfile);

  if (!profileCompleted) {
    if (authOverlay) authOverlay.hidden = true;
    if (landingHero) landingHero.hidden = true;
    openProfileSetup(defaultName);
    return true;
  }

  redirectAfterAuth();
  return true;
}

function syncValidateAvatarButton() {
  if (!btnValidateAvatar) return;
  btnValidateAvatar.disabled = !pendingAvatar;
}

const avatarCatalog = {
  netflix: [
    'https://api.dicebear.com/9.x/personas/png?seed=Wednesday',
    'https://api.dicebear.com/9.x/personas/png?seed=Lupin',
    'https://api.dicebear.com/9.x/personas/png?seed=AliceInBorderland',
    'https://api.dicebear.com/9.x/personas/png?seed=MoneyHeist',
    'https://api.dicebear.com/9.x/personas/png?seed=StrangerThings',
    'https://api.dicebear.com/9.x/personas/png?seed=BreakingBad',
    'https://api.dicebear.com/9.x/personas/png?seed=TheWitcher',
    'https://api.dicebear.com/9.x/personas/png?seed=Dark',
    'https://api.dicebear.com/9.x/personas/png?seed=SquidGame',
    'https://api.dicebear.com/9.x/personas/png?seed=OnePieceLive',
    'https://api.dicebear.com/9.x/personas/png?seed=Narcos',
    'https://api.dicebear.com/9.x/personas/png?seed=Elite',
    'https://api.dicebear.com/9.x/personas/png?seed=NetflixHero1',
    'https://api.dicebear.com/9.x/personas/png?seed=NetflixHero2',
    'https://api.dicebear.com/9.x/personas/png?seed=NetflixHero3',
    'https://api.dicebear.com/9.x/personas/png?seed=NetflixHero4',
    'https://api.dicebear.com/9.x/personas/png?seed=NetflixHero5',
    'https://api.dicebear.com/9.x/personas/png?seed=NetflixHero6',
  ],
  disney: [
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=DisneyClassic1',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=DisneyClassic2',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=DisneyClassic3',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=DisneyClassic4',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=DisneyClassic5',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=DisneyClassic6',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Pixar1',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Pixar2',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Pixar3',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Pixar4',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Marvel1',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Marvel2',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Marvel3',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=Marvel4',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=StarWars1',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=StarWars2',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=StarWars3',
    'https://api.dicebear.com/9.x/fun-emoji/png?seed=StarWars4',
  ],
  prime: [
    'https://api.dicebear.com/9.x/personas/png?seed=Fallout',
    'https://api.dicebear.com/9.x/personas/png?seed=TheBoys',
    'https://api.dicebear.com/9.x/personas/png?seed=Invincible',
    'https://api.dicebear.com/9.x/personas/png?seed=Reacher',
    'https://api.dicebear.com/9.x/personas/png?seed=RingsOfPower',
    'https://api.dicebear.com/9.x/personas/png?seed=GenV',
    'https://api.dicebear.com/9.x/personas/png?seed=MrRobot',
    'https://api.dicebear.com/9.x/personas/png?seed=GoodOmens',
    'https://api.dicebear.com/9.x/personas/png?seed=TheExpanse',
    'https://api.dicebear.com/9.x/personas/png?seed=JackRyan',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero1',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero2',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero3',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero4',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero5',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero6',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero7',
    'https://api.dicebear.com/9.x/personas/png?seed=PrimeHero8',
  ],
  anime: [
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=AttackOnTitan',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=DemonSlayer',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=JujutsuKaisen',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Naruto',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=OnePiece',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=BlueLock',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Haikyuu',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=BlackButler',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Bananya',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=SpyFamily',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=TokyoGhoul',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=DeathNote',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Bleach',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=ChainsawMan',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=SoloLeveling',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=Frieren',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=AnimeHero1',
    'https://api.dicebear.com/9.x/adventurer-neutral/png?seed=AnimeHero2',
  ],
};

function redirectAfterAuth() {
  window.location.href = `/profiles.html?next=${encodeURIComponent(resolvedNextPath())}`;
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

function setFieldError(fieldErrorEl, show) {
  if (!fieldErrorEl) return;
  fieldErrorEl.hidden = !show;
}

function syncCreateAccountButton() {
  if (!createBtn) return;
  const email = regEmail?.value?.trim() || '';
  const password = regPassword?.value || '';
  const confirmPassword = regPasswordConfirm?.value || '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const confirmValid = confirmPassword.length >= 6 && password === confirmPassword;
  createBtn.disabled = !(emailValid && passwordValid && confirmValid);
}

function syncLoginButton() {
  if (!loginSubmitBtn) return;
  const email = authEmail?.value?.trim() || '';
  const password = authPassword?.value || '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  loginSubmitBtn.disabled = !(emailValid && password.length > 0);
}

function openAuth(mode = 'login') {
  if (!authOverlay) return;
  if (landingHero) landingHero.hidden = true;
  authOverlay.hidden = false;
  const loginMode = mode === 'login';
  if (loginForm) loginForm.hidden = !loginMode;
  if (registerForm) registerForm.hidden = loginMode;
  if (googleBtn) googleBtn.hidden = !loginMode;
  if (googleRegisterBtn) googleRegisterBtn.hidden = loginMode;
  if (authSep) authSep.hidden = !loginMode;
  if (authTitle) authTitle.hidden = !loginMode;
  if (authSubtitle) authSubtitle.hidden = !loginMode;
  if (authTitle) authTitle.textContent = loginMode ? 'Bon retour !' : 'Creer un compte';
  if (authSubtitle) {
    authSubtitle.textContent = loginMode
      ? 'Connecte-toi pour acceder a ton compte'
      : 'Cree ton compte pour sauvegarder ta watchlist et ton historique';
  }
  if (closeAuthBtn) closeAuthBtn.hidden = !loginMode;
  if (loginMode) syncLoginButton();
  if (!loginMode) syncCreateAccountButton();
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
    avatarPreview.style.backgroundPosition = 'center top';
  }
}

function renderAvatarGrid() {
  if (!avatarGrid) return;
  const list = (avatarCatalog[avatarCategory] || []).map(highQualityAvatarUrl);
  avatarGrid.innerHTML = list
    .map((url) => `<button type="button" class="avatar-choice${pendingAvatar === url ? ' active' : ''}" data-avatar="${url}"><img src="${url}" alt="Avatar" /></button>`)
    .join('');
  syncValidateAvatarButton();
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();
    const email = document.getElementById('auth-email')?.value || '';
    const password = document.getElementById('auth-password')?.value || '';
    try {
      await loginUser({ email, password });
      redirectAfterAuth();
    } catch (error) {
      showError(error.message || 'Connexion impossible.');
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();
    setFieldError(regEmailError, false);
    setFieldError(regPasswordConfirmError, false);
    const email = regEmail?.value || '';
    const password = regPassword?.value || '';
    const confirmPassword = regPasswordConfirm?.value || '';
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValid) {
      setFieldError(regEmailError, true);
      return;
    }
    if (password !== confirmPassword) {
      setFieldError(regPasswordConfirmError, true);
      return;
    }
    try {
      await registerUser({ name: email.split('@')[0], email, password });
      closeAuth();
      openProfileSetup(email.split('@')[0]);
    } catch (error) {
      showError(error.message || 'Inscription impossible.');
    }
  });
}

if (regEmail) {
  regEmail.addEventListener('input', () => {
    setFieldError(regEmailError, false);
    syncCreateAccountButton();
  });
}

if (regPasswordConfirm) {
  regPasswordConfirm.addEventListener('input', () => {
    setFieldError(regPasswordConfirmError, false);
    syncCreateAccountButton();
  });
}

if (regPassword) {
  regPassword.addEventListener('input', () => {
    setFieldError(regPasswordConfirmError, false);
    syncCreateAccountButton();
  });
}

if (authEmail) {
  authEmail.addEventListener('input', syncLoginButton);
}

if (authPassword) {
  authPassword.addEventListener('input', syncLoginButton);
}

if (passwordToggleButtons.length) {
  passwordToggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-toggle-password');
      const input = inputId ? document.getElementById(inputId) : null;
      if (!input) return;
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(isHidden));
      button.setAttribute('aria-label', isHidden ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    });
  });
}

if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    clearError();
    try {
      await loginWithGoogleMock({ mode: 'login', next: nextPath });
    } catch (error) {
      showError(error.message || 'Connexion Google impossible.');
    }
  });
}

if (googleRegisterBtn) {
  googleRegisterBtn.addEventListener('click', async () => {
    clearError();
    try {
      await loginWithGoogleMock({ mode: 'register', next: nextPath });
    } catch (error) {
      showError(error.message || 'Connexion Google impossible.');
    }
  });
}

if (openLoginBtn) {
  openLoginBtn.addEventListener('click', () => {
    openAuth('login');
  });
}

if (openRegisterBtn) {
  openRegisterBtn.addEventListener('click', () => {
    openAuth('register');
  });
}

if (switchLoginBtn) {
  switchLoginBtn.addEventListener('click', () => openAuth('login'));
}

if (switchRegisterBtn) {
  switchRegisterBtn.addEventListener('click', () => openAuth('register'));
}

if (closeAuthBtn) {
  closeAuthBtn.addEventListener('click', () => {
    closeAuth();
  });
}

if (authOverlay) {
  authOverlay.addEventListener('click', (event) => {
    if (event.target === authOverlay) closeAuth();
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
  profileSetupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (profileSubmitInFlight) return;
    profileSubmitInFlight = true;
    if (profileSubmitBtn) profileSubmitBtn.disabled = true;
    clearError();
    const displayName = profileDisplayName?.value?.trim();
    if (!displayName) {
      showError('Ajoute un nom de profil.');
      profileSubmitInFlight = false;
      if (profileSubmitBtn) profileSubmitBtn.disabled = false;
      return;
    }
    if (displayName.length > 10) {
      showError('Le nom de profil doit contenir 10 caractères maximum.');
      profileSubmitInFlight = false;
      if (profileSubmitBtn) profileSubmitBtn.disabled = false;
      return;
    }
    if (profilePinEnabled?.checked && !/^\d{4}$/.test(profilePinCode?.value || '')) {
      showError('Le code PIN doit contenir 4 chiffres.');
      profileSubmitInFlight = false;
      if (profileSubmitBtn) profileSubmitBtn.disabled = false;
      return;
    }
    try {
      const activeProfile = await getActiveProfileForCurrentUser();
      const shouldCreateProfile = forceCreateProfile || !activeProfile;

      // Essaie de synchroniser les infos du compte sans bloquer le flux.
      try {
        await updateCurrentUserProfile({
          displayName,
          avatar: selectedAvatar,
          pinEnabled: Boolean(profilePinEnabled?.checked),
          pinCode: profilePinCode?.value || null,
        });
      } catch (error) {
        console.warn('Profile update warning:', error);
      }

      if (shouldCreateProfile) {
        try {
          await createProfileForCurrentUser({
            displayName,
            avatar: selectedAvatar,
          });
        } catch (error) {
          // Si un profil actif existe déjà, on laisse avancer le flux.
          const existing = await getActiveProfileForCurrentUser();
          if (!existing) {
            showError(error.message || 'Impossible de créer le profil.');
            return;
          }
        }
      }
      closeProfileSetup();
      redirectAfterAuth();
    } finally {
      profileSubmitInFlight = false;
      if (profileSubmitBtn) profileSubmitBtn.disabled = false;
    }
  });
}

async function initAuthViewState() {
  const oauthHandled = await handleOAuthReturn();
  if (oauthHandled) {
    if (authOverlay) authOverlay.hidden = true;
    if (avatarGalleryOverlay) avatarGalleryOverlay.hidden = true;
    syncLoginButton();
    syncCreateAccountButton();
    return;
  }
  const existingSession = await getSession();
  if (existingSession?.user?.id) {
    const currentUser = await getCurrentUser();
    const activeProfile = await getActiveProfileForCurrentUser();
    const storedProfiles = await getProfilesForCurrentUser();
    const profileCompleted = Boolean(currentUser?.profile?.completed) || Boolean(activeProfile) || storedProfiles.length > 0;
    if (forceCreateProfile || !profileCompleted) {
      if (landingHero) landingHero.hidden = true;
      if (authOverlay) authOverlay.hidden = true;
      openProfileSetup(currentUser?.name || currentUser?.email?.split('@')[0] || '');
      syncLoginButton();
      syncCreateAccountButton();
      return;
    }
    redirectAfterAuth();
    return;
  }
  if (landingHero) landingHero.hidden = false;
  if (authOverlay) authOverlay.hidden = true;
  if (profileOverlay) profileOverlay.hidden = true;
  if (avatarGalleryOverlay) avatarGalleryOverlay.hidden = true;
  syncLoginButton();
  syncCreateAccountButton();
}

initAuthViewState().catch((error) => {
  console.error(error);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (avatarGalleryOverlay && !avatarGalleryOverlay.hidden) {
    avatarGalleryOverlay.hidden = true;
  }
});
