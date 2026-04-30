import {
  ensureDefaultProfileForCurrentUser,
  getActiveProfileForCurrentUser,
  getCurrentUser,
  logoutUser,
  requireAuth,
} from './auth.js';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const WATCHLIST_STORE_KEY = 'cinematch_watchlist_store_v1';

const LANG = 'fr-FR';

const els = {
  query: document.getElementById('movie-query'),
  btnSearch: document.getElementById('btn-search'),
  searchResults: document.getElementById('search-results'),
  pickedList: document.getElementById('picked-list'),
  pickedEmpty: document.getElementById('picked-empty'),
  btnRecommend: document.getElementById('btn-recommend'),
  apiWarning: document.getElementById('api-warning'),
  resultsGrid: document.getElementById('results-grid'),
  resultsIntro: document.getElementById('results-intro'),
  resultsError: document.getElementById('results-error'),
  profileChip: document.querySelector('.profile-chip'),
  profileMenu: document.getElementById('profile-menu'),
  topbarRight: document.querySelector('.topbar-right'),
  btnNotifications: document.getElementById('btn-notifications'),
  notificationsDrawer: document.getElementById('notifications-drawer'),
  btnCloseNotifications: document.getElementById('btn-close-notifications'),
  notifBackdrop: document.getElementById('notif-backdrop'),
  filterChips: document.querySelectorAll('[data-filter]'),
  watchlistGrid: document.querySelector('.watchlist-grid'),
  watchlistEmpty: document.querySelector('.watchlist-empty'),
  watchlistControls: document.getElementById('watchlist-controls'),
  watchlistModifyBtn: document.getElementById('btn-watchlist-modify'),
  topbar: document.querySelector('.topbar'),
  logoutBtn: document.getElementById('btn-logout'),
  switchProfileBtn: document.getElementById('btn-switch-profile'),
  settingsBtn: document.getElementById('btn-settings'),
};

/** @type {{ id: number; title: string; poster_path: string | null }[]} */
let picked = [];
let searchDebounceTimer = null;
let activeWatchlistFilter = 'all';

function normalizeWatchlistType(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'movies';
  if (raw.includes('serie')) return 'series';
  if (raw.includes('anim')) return 'anime';
  return 'movies';
}

function getWatchlistStore() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getCurrentWatchlistItems() {
  const store = getWatchlistStore();
  const userKey = getCurrentAuthUserIdFromStorage() || 'guest';
  const list = Array.isArray(store[userKey]) ? store[userKey] : [];
  return [...list].sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
}

function renderStoredWatchlist() {
  if (!els.watchlistGrid) return;
  const items = getCurrentWatchlistItems();
  els.watchlistGrid.querySelectorAll('.result-card').forEach((node) => node.remove());
  const existingEmpty = els.watchlistGrid.querySelector('.watchlist-empty');
  if (existingEmpty) existingEmpty.remove();

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'watchlist-empty';
    empty.innerHTML =
      "<span class=\"watchlist-empty-icon\">⚠</span>Ta watchlist ne contient rien... N'hésite pas à y<br />ajouter quelques pépites !";
    els.watchlistGrid.appendChild(empty);
    if (els.watchlistControls) els.watchlistControls.hidden = true;
    if (els.watchlistModifyBtn) els.watchlistModifyBtn.hidden = true;
    return;
  }

  const cards = items.map((item) => {
    const type = normalizeWatchlistType(item.type);
    const typeLabel = type === 'series' ? 'Série' : type === 'anime' ? 'Animé' : 'Film';
    const article = document.createElement('article');
    article.className = 'result-card';
    article.innerHTML = `
      <article class="poster-card" data-type="${type}">
        <span class="poster-type"><span class="poster-type-dot"></span>${typeLabel}</span>
        <img src="${item.poster || ''}" alt="${escapeHtml(item.title || '')}" loading="lazy" />
      </article>
      <h3>${escapeHtml(item.title || 'Titre inconnu')}</h3>
      <p>${escapeHtml(item.meta || '')}</p>
    `;
    return article;
  });
  cards.forEach((card) => els.watchlistGrid.appendChild(card));
}

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

/**
 * TMDB : soit `api_key` (clé v3), soit jeton « API Read Access » en Bearer (commence souvent par ey…)
 */
function apiUrl(path, params = {}) {
  const u = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  if (API_KEY && !API_KEY.startsWith('ey')) {
    u.searchParams.set('api_key', API_KEY);
  }
  return u.toString();
}

async function tmdbFetch(path, params = {}) {
  const url = apiUrl(path, { ...params, language: LANG });
  const useBearer = Boolean(API_KEY?.startsWith('ey'));
  const res = await fetch(url, {
    headers: useBearer
      ? { accept: 'application/json', Authorization: `Bearer ${API_KEY}` }
      : { accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erreur ${res.status}`);
  }
  return res.json();
}

function posterUrl(path, size = 'w500') {
  if (!path) return '';
  return `${IMG_BASE}/${size}${path}`;
}

function showApiWarning() {
  if (!API_KEY) {
    els.apiWarning.hidden = false;
    els.apiWarning.textContent =
      'Ajoute ta clé TMDB dans un fichier .env : VITE_TMDB_API_KEY=… (voir .env.example). Tu peux utiliser la clé API v3 ou le jeton « API Read Access » en Bearer.';
  }
}

function updatePickedUI() {
  els.pickedList.innerHTML = '';
  picked.forEach((m) => {
    const li = document.createElement('li');
    const thumb = m.poster_path ? posterUrl(m.poster_path, 'w500') : '';
    li.className = 'picked-item';
    li.innerHTML = `
      <button type="button" class="picked-card" data-id="${m.id}" aria-label="Retirer ${escapeHtml(m.title)} de la sélection">
        ${
          thumb
            ? `<img src="${thumb}" alt="${escapeHtml(m.title)}" loading="lazy" />`
            : '<span class="picked-no-poster">Aucune affiche</span>'
        }
        <span class="picked-title">${escapeHtml(m.title)}</span>
      </button>`;
    els.pickedList.appendChild(li);
  });
  els.pickedEmpty.hidden = picked.length > 0;
  els.btnRecommend.disabled = picked.length < 2 || picked.length > 3;

  els.pickedList.querySelectorAll('button.picked-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-id'));
      picked = picked.filter((p) => p.id !== id);
      updatePickedUI();
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function rankSearchResults(results, query) {
  const q = normalizeText(query);
  return [...results].sort((a, b) => {
    const aTitle = normalizeText(a.title);
    const bTitle = normalizeText(b.title);

    const aStarts = aTitle.startsWith(q) ? 1 : 0;
    const bStarts = bTitle.startsWith(q) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;

    const aIncludes = aTitle.includes(q) ? 1 : 0;
    const bIncludes = bTitle.includes(q) ? 1 : 0;
    if (aIncludes !== bIncludes) return bIncludes - aIncludes;

    const aPopularity = Number(a.popularity || 0);
    const bPopularity = Number(b.popularity || 0);
    if (aPopularity !== bPopularity) return bPopularity - aPopularity;

    const aVotes = Number(a.vote_count || 0);
    const bVotes = Number(b.vote_count || 0);
    return bVotes - aVotes;
  });
}

async function searchMovies() {
  const q = els.query.value.trim();
  if (!q) return;

  els.searchResults.hidden = false;
  els.searchResults.innerHTML = '<li class="muted" style="padding:1rem">Recherche…</li>';

  try {
    const data = await tmdbFetch('/search/movie', { query: q, include_adult: 'false' });
    els.searchResults.innerHTML = '';
    const rankedResults = rankSearchResults(data.results || [], q);
    if (!rankedResults.length) {
      els.searchResults.innerHTML = '<li class="muted" style="padding:1rem">Aucun résultat.</li>';
      return;
    }
    for (const m of rankedResults.slice(0, 12)) {
      const li = document.createElement('li');
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      const year = m.release_date ? m.release_date.slice(0, 4) : '—';
      const thumb = m.poster_path ? posterUrl(m.poster_path, 'w342') : '';
      li.innerHTML = `
        ${thumb ? `<img src="${thumb}" alt="" width="42" height="63" loading="lazy" />` : '<span style="width:42px;height:63px;background:var(--surface);border-radius:6px;display:inline-block"></span>'}
        <div class="meta">
          <div class="title">${escapeHtml(m.title)}</div>
          <div class="year">${year}</div>
        </div>`;
      const add = () => {
        if (picked.some((p) => p.id === m.id)) return;
        if (picked.length >= 3) return;
        picked.push({ id: m.id, title: m.title, poster_path: m.poster_path });
        updatePickedUI();
      };
      li.addEventListener('click', add);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          add();
        }
      });
      els.searchResults.appendChild(li);
    }
  } catch (e) {
    els.searchResults.innerHTML = `<li class="muted" style="padding:1rem;color:var(--danger)">${escapeHtml(String(e.message))}</li>`;
  }
}

function triggerLiveSearch() {
  const q = els.query.value.trim();
  if (q.length < 2) {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = '';
    return;
  }

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    searchMovies();
  }, 250);
}

/**
 * @param {number[]} selectedIds
 */
async function aggregateRecommendations(selectedIds) {
  /** @type {Map<number, { movie: object; score: number }>} */
  const map = new Map();

  for (const id of selectedIds) {
    const data = await tmdbFetch(`/movie/${id}/similar`, { page: 1 });
    for (const movie of data.results || []) {
      if (selectedIds.includes(movie.id)) continue;
      const prev = map.get(movie.id);
      if (prev) {
        prev.score += 1;
      } else {
        map.set(movie.id, { movie, score: 1 });
      }
    }
  }

  const sorted = [...map.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.movie.popularity || 0) - (a.movie.popularity || 0);
  });

  return sorted.slice(0, 3).map((x) => x.movie);
}

/**
 * Pick trailer / teaser / clip for YouTube embed (vertical-friendly short area)
 */
function pickYoutubeVideo(videos) {
  const list = videos.results || [];
  const preferred = ['Trailer', 'Teaser', 'Clip', 'Featurette'];
  for (const type of preferred) {
    const v = list.find((x) => x.site === 'YouTube' && x.type === type && x.key);
    if (v) return v.key;
  }
  const anyYt = list.find((x) => x.site === 'YouTube' && x.key);
  return anyYt?.key || null;
}

function renderCard(movie, videoKey, details) {
  const genres = (details.genres || []).map((g) => g.name).join(' · ');
  const overview = details.overview || 'Pas de synopsis disponible en français pour ce titre.';
  const poster = details.poster_path ? posterUrl(details.poster_path, 'original') : '';
  const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id}`;
  const trailerUrl = videoKey ? `https://www.youtube.com/watch?v=${videoKey}` : '';

  const videoBlock = videoKey
    ? `<div class="video-shell"><iframe title="Extrait ${escapeHtml(movie.title)}"
        src="https://www.youtube-nocookie.com/embed/${videoKey}?rel=0&modestbranding=1"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen loading="lazy"></iframe></div>`
    : `<div class="video-shell"><div class="video-placeholder">Aucune bande-annonce YouTube listée pour ce film sur TMDB.</div></div>`;

  const article = document.createElement('article');
  article.className = 'card';
  article.innerHTML = `
    <div class="card-header poster-row">
      ${poster ? `<img class="poster" src="${poster}" alt="" width="88" loading="lazy" />` : ''}
      <div>
        <h3>${escapeHtml(movie.title)}</h3>
        <p class="genres">${escapeHtml(genres || 'Genres inconnus')}</p>
      </div>
    </div>
    ${videoBlock}
    <div class="card-body">
      <p>${escapeHtml(overview)}</p>
      <div class="card-actions">
        <a class="action-btn action-btn-primary" href="${tmdbUrl}" target="_blank" rel="noopener">Voir la fiche</a>
        ${
          trailerUrl
            ? `<a class="action-btn action-btn-ghost" href="${trailerUrl}" target="_blank" rel="noopener">Bande-annonce</a>`
            : '<button type="button" class="action-btn action-btn-ghost" disabled>Aucune bande-annonce</button>'
        }
        <button type="button" class="action-btn action-btn-ghost action-btn-danger" data-skip="${movie.id}">Ne plus recommander</button>
      </div>
    </div>`;
  const skipBtn = article.querySelector('[data-skip]');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      article.remove();
    });
  }
  return article;
}

async function loadRecommendations() {
  if (picked.length < 2 || picked.length > 3) return;

  els.resultsError.hidden = true;
  els.resultsIntro.innerHTML = '<span class="loading">On creuse les films du même genre…</span>';
  els.resultsGrid.innerHTML = '';

  try {
    const ids = picked.map((p) => p.id);
    const recommendations = await aggregateRecommendations(ids);

    if (!recommendations.length) {
      els.resultsIntro.textContent = 'Pas assez de données similaires. Essaie d’autres films.';
      return;
    }

    els.resultsIntro.textContent = `Voici ${recommendations.length} suggestion${recommendations.length > 1 ? 's' : ''} proches de tes goûts.`;

    for (const movie of recommendations) {
      const [videos, details] = await Promise.all([
        tmdbFetch(`/movie/${movie.id}/videos`),
        tmdbFetch(`/movie/${movie.id}`),
      ]);
      const key = pickYoutubeVideo(videos);
      els.resultsGrid.appendChild(renderCard(movie, key, details));
    }
  } catch (e) {
    els.resultsIntro.textContent = '';
    els.resultsError.hidden = false;
    els.resultsError.textContent =
      e.message?.includes('401') || e.message?.includes('Invalid')
        ? 'Clé API invalide ou manquante. Vérifie .env et redémarre le serveur (npm run dev).'
        : `Erreur : ${e.message || 'inconnue'}`;
  }
}

if (els.btnSearch) {
  els.btnSearch.addEventListener('click', searchMovies);
}
els.query.addEventListener('input', triggerLiveSearch);
els.query.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchMovies();
  }
});
els.btnRecommend.addEventListener('click', loadRecommendations);

if (els.profileChip && els.profileMenu && els.topbarRight) {
  els.profileChip.addEventListener('click', () => {
    const isOpen = !els.profileMenu.hidden;
    els.profileMenu.hidden = isOpen;
  });

  document.addEventListener('click', (event) => {
    if (!els.topbarRight.contains(event.target)) {
      els.profileMenu.hidden = true;
    }
  });
}

function openNotifications() {
  if (!els.notificationsDrawer || !els.notifBackdrop) return;
  els.notifBackdrop.hidden = false;
  els.notificationsDrawer.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    els.notificationsDrawer.classList.add('open');
  });
}

function closeNotifications() {
  if (!els.notificationsDrawer || !els.notifBackdrop) return;
  els.notificationsDrawer.classList.remove('open');
  els.notificationsDrawer.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    if (els.notificationsDrawer?.classList.contains('open')) return;
    els.notifBackdrop.hidden = true;
  }, 280);
}

if (els.btnNotifications) {
  els.btnNotifications.addEventListener('click', () => {
    const isOpen = els.notificationsDrawer?.classList.contains('open');
    if (isOpen) {
      closeNotifications();
    } else {
      openNotifications();
    }
  });
}

if (els.btnCloseNotifications) {
  els.btnCloseNotifications.addEventListener('click', closeNotifications);
}

if (els.notifBackdrop) {
  els.notifBackdrop.addEventListener('click', closeNotifications);
}

if (els.filterChips?.length) {
  let watchlistSearchTerm = '';

  const detectCardFilterType = (card) => {
    const poster = card.querySelector('.poster-card');
    const explicitType = poster?.getAttribute('data-type');
    if (explicitType) return normalizeWatchlistType(explicitType);
    const typeLabel = poster?.querySelector('.poster-type')?.textContent || '';
    return normalizeWatchlistType(typeLabel);
  };

  const syncWatchlistEmptyState = () => {
    if (!els.watchlistGrid || !els.watchlistEmpty) return;
    const hasVisibleCard = Array.from(els.watchlistGrid.querySelectorAll('.result-card')).some(
      (card) => card.style.display !== 'none'
    );
    const hasAnyCard = els.watchlistGrid.querySelector('.result-card');
    if (!hasAnyCard) {
      els.watchlistEmpty.hidden = false;
      els.watchlistEmpty.innerHTML =
        "<span class=\"watchlist-empty-icon\">⚠</span>Ta watchlist ne contient rien... N'hésite pas à y<br />ajouter quelques pépites !";
      if (els.watchlistControls) els.watchlistControls.hidden = true;
      if (els.watchlistModifyBtn) els.watchlistModifyBtn.hidden = true;
      return;
    }
    if (els.watchlistControls) els.watchlistControls.hidden = false;
    if (els.watchlistModifyBtn) els.watchlistModifyBtn.hidden = false;
    els.watchlistEmpty.hidden = hasVisibleCard;
    if (!hasVisibleCard) {
      els.watchlistEmpty.textContent = 'Aucun résultat dans ta watchlist pour ce filtre.';
    }
  };

  const applyWatchlistFilter = (filter) => {
    activeWatchlistFilter = filter;
    if (!els.watchlistGrid) return;
    const cards = Array.from(els.watchlistGrid.querySelectorAll('.result-card'));
    cards.forEach((card) => {
      const cardType = detectCardFilterType(card);
      const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
      const matchesText = !watchlistSearchTerm || title.includes(watchlistSearchTerm);
      const matchesType = filter === 'all' || cardType === filter;
      const show = matchesType && matchesText;
      card.style.display = show ? '' : 'none';
    });
    syncWatchlistEmptyState();
  };

  els.filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      els.filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      applyWatchlistFilter(chip.getAttribute('data-filter') || 'all');
    });
  });

  if (els.query) {
    els.query.addEventListener('input', () => {
      watchlistSearchTerm = els.query.value.trim().toLowerCase();
      applyWatchlistFilter(activeWatchlistFilter);
    });
  }

  applyWatchlistFilter(activeWatchlistFilter);
}

async function hydrateCurrentUserUi() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;
  const activeProfile = await getActiveProfileForCurrentUser();
  const displayName = activeProfile?.name || currentUser.name;
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

if (els.logoutBtn) {
  els.logoutBtn.addEventListener('click', async () => {
    await logoutUser();
    window.location.href = '/login.html';
  });
}

if (els.switchProfileBtn) {
  els.switchProfileBtn.addEventListener('click', () => {
    window.location.href = '/profiles.html?next=%2Findex.html';
  });
}

if (els.settingsBtn) {
  els.settingsBtn.addEventListener('click', () => {
    window.location.href = '/settings.html';
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNotifications();
  }
});

function updateTopbarOnScroll() {
  if (!els.topbar) return;
  els.topbar.classList.toggle('scrolled', window.scrollY > 12);
}

window.addEventListener('scroll', updateTopbarOnScroll, { passive: true });
updateTopbarOnScroll();
hydrateProfileFromCache();

showApiWarning();
renderStoredWatchlist();
// Re-synchronise l'UI watchlist (filtres + bouton Modifier) après injection des cartes.
const activeWatchlistChip = document.querySelector('.filter-row .chip.active');
if (activeWatchlistChip instanceof HTMLButtonElement) {
  activeWatchlistChip.click();
}
updatePickedUI();

async function initPageAuth() {
  const isAuthed = await requireAuth();
  if (!isAuthed) throw new Error('Auth redirect');
  await ensureDefaultProfileForCurrentUser();
  const activeProfile = await getActiveProfileForCurrentUser();
  if (!activeProfile) {
    window.location.href = '/profiles.html?next=%2Findex.html';
    return;
  }
  await hydrateCurrentUserUi();
}

initPageAuth().catch((error) => {
  console.error(error);
});
