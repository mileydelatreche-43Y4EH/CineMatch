import {
  ensureDefaultProfileForCurrentUser,
  getActiveProfileForCurrentUser,
  getCurrentUser,
  logoutUser,
  requireAuth,
} from './auth.js';

const titleEl = document.getElementById('random-hero-title');
const searchInput = document.getElementById('global-search');
const searchPageControls = document.querySelector('.search-page-controls');
const filtersPanel = document.getElementById('filters-panel');
const btnToggleFilters = document.getElementById('btn-toggle-filters');
const btnSort = document.getElementById('btn-sort');
const sortMenu = document.getElementById('sort-menu');
const sortOptions = document.querySelectorAll('.sort-option');
const genreFilters = document.getElementById('genre-filters');
const yearFilters = document.getElementById('year-filters');
const tabButtons = document.querySelectorAll('.chip-tab');
const typeButtons = document.querySelectorAll('.chip-option[data-type]');
const resultsGrid = document.getElementById('search-results-grid');
const resultsTitle = document.getElementById('search-results-title');
const paginationEl = document.getElementById('catalog-pagination');
const activeFiltersEl = document.getElementById('active-filters');
const btnResetFilters = document.getElementById('btn-reset-filters');
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
const WATCHLIST_STORE_KEY = 'cinematch_watchlist_store_v1';
if (document.body) {
  document.body.style.visibility = 'hidden';
}
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/original';
const LANG = 'fr-FR';
const CATALOG_PAGE_LIMIT = 8;

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

function hasStoredAuthToken() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.includes('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
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

const alternatives = [
  'Quelle sera ta prochaine aventure ?',
  "Envie de t'évader ?",
  "Le film parfait t'attend ici !",
  'Un film pour ce soir ?',
];

const fallbackItems = [
  { id: 1, title: 'Free Guy', type: 'film', genres: ['Comedie', 'Action'], year: 2021, addedAt: 20260428, poster: 'https://image.tmdb.org/t/p/original/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg', meta: '1h55 • 11 août 2021' },
  { id: 2, title: 'Avengers: Infinity War', type: 'film', genres: ['Action', 'Aventure'], year: 2018, addedAt: 20260427, poster: 'https://image.tmdb.org/t/p/original/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', meta: '2h29 • 25 avr. 2018' },
  { id: 3, title: 'Parasite', type: 'film', genres: ['Thriller', 'Comedie'], year: 2019, addedAt: 20260425, poster: 'https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', meta: '2h12 • 5 juin 2019' },
  { id: 4, title: "Once Upon a Time... in Hollywood", type: 'film', genres: ['Comedie', 'Drame'], year: 2019, addedAt: 20260422, poster: 'https://image.tmdb.org/t/p/original/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg', meta: '2h41 • 14 août 2019' },
  { id: 5, title: 'Arcane', type: 'serie', genres: ['Animation', 'Action'], year: 2021, addedAt: 20260423, poster: 'https://image.tmdb.org/t/p/original/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', meta: 'Série • 2021' },
  { id: 6, title: 'Breaking Bad', type: 'serie', genres: ['Crime', 'Drame'], year: 2008, addedAt: 20260420, poster: 'https://image.tmdb.org/t/p/original/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', meta: 'Série • 2008' },
  { id: 7, title: 'Demon Slayer', type: 'anime', genres: ['Animation', 'Action'], year: 2019, addedAt: 20260421, poster: 'https://image.tmdb.org/t/p/original/wq1UGbQsnLQ8f7n4fV5kF8Q4YbP.jpg', meta: 'Animé • 2019' },
  { id: 8, title: 'Your Name', type: 'anime', genres: ['Animation', 'Romance'], year: 2016, addedAt: 20260426, poster: 'https://image.tmdb.org/t/p/original/q719jXXEzOoYaps6babgKnONONX.jpg', meta: '1h46 • 2016' },
  { id: 9, title: 'Black Widow', type: 'film', genres: ['Action', 'Aventure'], year: 2021, addedAt: 20260419, poster: 'https://image.tmdb.org/t/p/original/9E2y5Q7WlCVNEhP5GiVTjhEhx1o.jpg', meta: '2h14 • 7 juil. 2021' },
  { id: 10, title: 'Death Note', type: 'anime', genres: ['Thriller', 'Mystere'], year: 2006, addedAt: 20260418, poster: 'https://image.tmdb.org/t/p/original/10U5d0M6sKuK6yl6wtYQ0JfV8Jq.jpg', meta: 'Animé • 2006' },
  { id: 11, title: 'The Originals', type: 'serie', genres: ['Fantastique', 'Drame'], year: 2013, addedAt: 20260424, poster: 'https://image.tmdb.org/t/p/original/qQWrR2ByVwx7eteddt2JPfxG0ls.jpg', meta: 'Série • 2013' },
  { id: 12, title: "Le Seigneur des anneaux : La Communauté de l'anneau", type: 'film', genres: ['Aventure', 'Fantastique'], year: 2001, addedAt: 20260417, poster: 'https://image.tmdb.org/t/p/original/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', meta: '2h58 • 19 déc. 2001' },
];
let items = [...fallbackItems];
let catalogLoading = false;
let catalogLoaded = false;
let catalogError = null;
let movieGenresById = {};
let tvGenresById = {};
let renderRequestId = 0;
const renderedCatalogItems = new Map();
let watchlistKeys = new Set();
let watchlistToastTimer = null;

function apiUrl(path, params = {}) {
  const u = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  if (API_KEY && !API_KEY.startsWith('ey')) {
    u.searchParams.set('api_key', API_KEY);
  }
  return u.toString();
}

async function tmdbFetch(path, params = {}) {
  const useBearer = Boolean(API_KEY?.startsWith('ey'));
  const res = await fetch(apiUrl(path, { ...params, language: LANG }), {
    headers: useBearer
      ? { accept: 'application/json', Authorization: `Bearer ${API_KEY}` }
      : { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}`);
  }
  return res.json();
}

function toAddedAtNumber(value) {
  if (!value) return 0;
  const clean = String(value).replace(/-/g, '');
  const asNumber = Number(clean);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

function formatFrenchDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeMovie(item) {
  const releaseDate = item.release_date || '';
  const genreNames = (item.genre_ids || [])
    .map((id) => movieGenresById[id])
    .filter(Boolean);
  return {
    id: item.id,
    title: item.title || item.original_title || 'Film',
    type: 'film',
    genres: genreNames,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    addedAt: toAddedAtNumber(releaseDate),
    poster: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
    meta: `Film • ${formatFrenchDate(releaseDate)}`,
  };
}

function normalizeTv(item, type = 'serie') {
  const firstAirDate = item.first_air_date || '';
  const genreNames = (item.genre_ids || [])
    .map((id) => tvGenresById[id])
    .filter(Boolean);
  const label = type === 'anime' ? 'Animé' : 'Série';
  return {
    id: item.id,
    title: item.name || item.original_name || label,
    type,
    genres: genreNames,
    year: firstAirDate ? Number(firstAirDate.slice(0, 4)) : null,
    addedAt: toAddedAtNumber(firstAirDate),
    poster: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
    meta: `${label} • ${formatFrenchDate(firstAirDate)}`,
  };
}

function catalogItemKey(item) {
  return `${item.type}:${item.id}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getWatchlistStore() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setWatchlistStore(store) {
  localStorage.setItem(WATCHLIST_STORE_KEY, JSON.stringify(store));
}

function getCurrentWatchlistUserKey() {
  return getCurrentAuthUserIdFromStorage() || 'guest';
}

function addItemToWatchlist(item) {
  const store = getWatchlistStore();
  const userKey = getCurrentWatchlistUserKey();
  const list = Array.isArray(store[userKey]) ? store[userKey] : [];
  if (list.some((entry) => String(entry.id) === String(item.id) && entry.type === item.type)) return false;
  list.push({
    id: item.id,
    type: item.type,
    title: item.title,
    poster: item.poster,
    year: item.year,
    meta: item.meta,
    addedAt: Date.now(),
  });
  store[userKey] = list;
  setWatchlistStore(store);
  watchlistKeys.add(`${item.type}:${item.id}`);
  return true;
}

function refreshWatchlistKeys() {
  const store = getWatchlistStore();
  const userKey = getCurrentWatchlistUserKey();
  const list = Array.isArray(store[userKey]) ? store[userKey] : [];
  watchlistKeys = new Set(list.map((entry) => `${entry.type}:${entry.id}`));
}

function ensureWatchlistToast() {
  let toast = document.getElementById('watchlist-toast');
  if (toast) return toast;
  toast = document.createElement('div');
  toast.id = 'watchlist-toast';
  toast.className = 'watchlist-toast';
  toast.hidden = true;
  document.body.appendChild(toast);
  return toast;
}

function showWatchlistToast(message) {
  const toast = ensureWatchlistToast();
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('show');
  if (watchlistToastTimer) {
    clearTimeout(watchlistToastTimer);
  }
  watchlistToastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.hidden = true;
    }, 180);
  }, 2200);
}

function renderResultCard(item) {
  const safeTitle = escapeHtml(item.title);
  const safeMeta = escapeHtml(item.meta || item.year || '');
  const key = catalogItemKey(item);
  const inWatchlist = watchlistKeys.has(`${item.type}:${item.id}`);
  const watchIcon = inWatchlist
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 9.5 17.5 19.5 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M4 12h8M4 18h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 9.2v5.6l4.8-2.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  renderedCatalogItems.set(key, item);
  return `<article class="result-card">
      <article class="poster-card">
        <span class="poster-type"><span class="poster-type-dot"></span>${labelForType(item.type)}</span>
        <img src="${item.poster}" alt="${safeTitle}" loading="lazy" />
        <div class="poster-actions">
          <button type="button" class="poster-action-btn ${inWatchlist ? 'is-added' : ''}" data-poster-action="watchlist" data-item-key="${escapeHtml(key)}" aria-label="Ajouter à ma watchlist">
            ${watchIcon}
            <span class="poster-action-label">${inWatchlist ? 'Déjà dans ma watchlist' : 'Ajouter à ma watchlist'}</span>
          </button>
          <button type="button" class="poster-action-btn" data-poster-action="details" data-item-key="${escapeHtml(key)}" aria-label="Voir la fiche">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v5M12 8h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <span class="poster-action-label">Voir la fiche</span>
          </button>
        </div>
      </article>
      <h3>${safeTitle}</h3>
      <p>${safeMeta}</p>
    </article>`;
}

async function fetchPagedResults(path, params = {}, pages = CATALOG_PAGE_LIMIT) {
  const all = [];
  for (let page = 1; page <= pages; page += 1) {
    const data = await tmdbFetch(path, { ...params, page, include_adult: 'false' });
    const batch = data?.results || [];
    if (!batch.length) break;
    all.push(...batch);
    if (page >= (data?.total_pages || 0)) break;
  }
  return all;
}

async function loadGenres() {
  const [movieGenreResp, tvGenreResp] = await Promise.all([
    tmdbFetch('/genre/movie/list'),
    tmdbFetch('/genre/tv/list'),
  ]);
  movieGenresById = Object.fromEntries((movieGenreResp.genres || []).map((g) => [g.id, g.name]));
  tvGenresById = Object.fromEntries((tvGenreResp.genres || []).map((g) => [g.id, g.name]));
}

async function loadCatalogFromApi() {
  if (!API_KEY || catalogLoaded || catalogLoading) return;
  catalogLoading = true;
  catalogError = null;
  try {
    await loadGenres();
    const [movieRaw, seriesRaw, animeTvRaw, animeMovieRaw] = await Promise.all([
      fetchPagedResults('/discover/movie', { sort_by: 'popularity.desc' }),
      fetchPagedResults('/discover/tv', {
        sort_by: 'popularity.desc',
        without_genres: '16',
      }),
      fetchPagedResults('/discover/tv', {
        sort_by: 'popularity.desc',
        with_genres: '16',
        with_original_language: 'ja',
      }),
      fetchPagedResults('/discover/movie', {
        sort_by: 'popularity.desc',
        with_genres: '16',
        with_original_language: 'ja',
      }),
    ]);

    const movies = movieRaw.map(normalizeMovie);
    const series = seriesRaw.map((item) => normalizeTv(item, 'serie'));
    const animeTv = animeTvRaw.map((item) => normalizeTv(item, 'anime'));
    const animeMovies = animeMovieRaw.map(normalizeMovie).map((item) => ({ ...item, type: 'anime' }));

    const dedupe = new Map();
    [...movies, ...series, ...animeTv, ...animeMovies].forEach((item) => {
      if (!item.poster) return;
      dedupe.set(`${item.type}:${item.id}`, item);
    });

    const apiItems = [...dedupe.values()];
    if (apiItems.length) {
      items = apiItems;
      catalogLoaded = true;
    }
  } catch (error) {
    console.error(error);
    catalogError = 'Impossible de charger le catalogue complet via l’API.';
  } finally {
    catalogLoading = false;
    renderResults();
  }
}

const genreCatalog = [
  ['Action', 3965], ['Actualites', 3], ['Animation', 2956], ['Aventure', 3314], ['Comedie', 5634],
  ['Crime', 2186], ['Debat', 14], ['Documentaire', 562], ['Drame', 7575], ['Enfants', 454],
  ['Famille', 2072], ['Fantastique', 2835], ['Feuilleton', 76], ['Guerre', 501], ['Histoire', 632],
  ['Horreur', 613], ['Musique', 419], ['Mystere', 1609], ['Politique', 108], ['Romance', 1687],
  ['Science-fiction', 2744], ['Tele Realite', 224], ['Telefilm', 433], ['Thriller', 2756], ['Western', 169],
];

const yearCatalog = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
  '2010-2020', '2000-2010', '1990-2000', '1980-1990', '1970-1980', 'before-1970',
];

const state = {
  text: '',
  tab: 'all',
  type: null,
  genres: new Set(),
  years: new Set(),
  sort: 'relevance',
  page: 1,
  showAllGenres: false,
  showAllYears: false,
};

function randomizeHeroTitle() {
  if (!titleEl) return;
  const index = Math.floor(Math.random() * alternatives.length);
  titleEl.textContent = alternatives[index];
}

function uniqueValuesFrom(field) {
  if (field === 'genres') {
    return genreCatalog;
  }
  if (field === 'years') {
    return yearCatalog;
  }
  return [];
}

function renderFilterOptions() {
  if (genreFilters) {
    const genres = uniqueValuesFrom('genres');
    const visibleGenres = state.showAllGenres ? genres : genres.slice(0, 8);
    const hiddenGenres = Math.max(0, genres.length - visibleGenres.length);
    genreFilters.innerHTML = [
      ...visibleGenres.map(
        ([genre, count]) =>
          `<button type="button" class="chip chip-genre" data-genre="${genre}">${genre} <span class="count">(${count})</span></button>`
      ),
      hiddenGenres
        ? `<button type="button" class="chip chip-more" data-toggle-more="genres">+ ${hiddenGenres} de plus</button>`
        : state.showAllGenres
          ? `<button type="button" class="chip chip-more" data-toggle-more="genres">Voir moins</button>`
          : '',
    ].join('');
  }

  if (yearFilters) {
    const years = uniqueValuesFrom('years');
    const visibleYears = state.showAllYears ? years : years.slice(0, 5);
    const hiddenYears = Math.max(0, years.length - visibleYears.length);
    yearFilters.innerHTML = [
      ...visibleYears.map((yearKey) => {
        const label = yearKey === 'before-1970' ? 'Avant 1970' : yearKey.replace('-', ' à ');
        return `<button type="button" class="chip chip-year" data-year="${yearKey}">${label}</button>`;
      }),
      hiddenYears
        ? `<button type="button" class="chip chip-more" data-toggle-more="years">+ ${hiddenYears} de plus</button>`
        : state.showAllYears
          ? `<button type="button" class="chip chip-more" data-toggle-more="years">Voir moins</button>`
          : '',
    ].join('');
  }

  syncFilterOptionStates();
}

function labelForType(type) {
  if (type === 'serie') return 'Série';
  if (type === 'anime') return 'Animé';
  return 'Film';
}

function currentResultsCategoryLabel() {
  const activeType = state.type || (state.tab !== 'all' ? state.tab : 'film');
  if (activeType === 'serie') return 'séries';
  if (activeType === 'anime') return 'animés';
  return 'films';
}

function headingForSortMode() {
  const category = currentResultsCategoryLabel();
  if (state.sort === 'recent') return `Les ${category} les plus récents`;
  if (state.sort === 'relevance') return `${category.charAt(0).toUpperCase()}${category.slice(1)} pertinents`;
  if (state.sort === 'random') return `${category.charAt(0).toUpperCase()}${category.slice(1)} aléatoires`;
  return `Derniers ${category} ajoutés`;
}

function matchesTab(item) {
  if (state.tab === 'all') return true;
  return item.type === state.tab;
}

function matchesType(item) {
  if (!state.type) return true;
  return item.type === state.type;
}

function matchesGenres(item) {
  if (!state.genres.size) return true;
  return [...state.genres].every((genre) => item.genres.includes(genre));
}

function matchesYears(item) {
  if (!state.years.size) return true;
  return [...state.years].some((key) => {
    if (key === 'before-1970') return item.year < 1970;
    if (!key.includes('-')) return item.year === Number(key);
    const [from, to] = key.split('-').map(Number);
    return item.year >= from && item.year <= to;
  });
}

function matchesText(item) {
  if (!state.text) return true;
  return String(item.title || '').toLowerCase().includes(state.text);
}

function filteredItems() {
  let list = items.filter((item) =>
    matchesTab(item) && matchesType(item) && matchesGenres(item) && matchesYears(item) && matchesText(item)
  );
  if (state.sort === 'latest') {
    list = list.sort((a, b) => b.addedAt - a.addedAt);
  } else if (state.sort === 'recent') {
    list = list.sort((a, b) => (b.year || 0) - (a.year || 0) || b.addedAt - a.addedAt);
  } else if (state.sort === 'random') {
    list = [...list].sort(() => Math.random() - 0.5);
  }
  return list;
}

function getForcedTypeFromState() {
  if (state.type) return state.type;
  if (state.tab === 'film' || state.tab === 'serie' || state.tab === 'anime') return state.tab;
  return null;
}

function canUseRemoteCatalogMode() {
  return Boolean(
    API_KEY &&
      !state.text &&
      state.genres.size === 0 &&
      state.years.size === 0 &&
      getForcedTypeFromState()
  );
}

function canUseRemoteSearchMode() {
  return Boolean(API_KEY && state.text);
}

function sortByForRemote(type, sortMode) {
  if (sortMode === 'recent') {
    return type === 'film' ? 'primary_release_date.desc' : 'first_air_date.desc';
  }
  if (sortMode === 'relevance') {
    return 'vote_average.desc';
  }
  return 'popularity.desc';
}

function endpointForType(type, sortMode = 'latest') {
  const sortBy = sortByForRemote(type, sortMode);
  if (type === 'film') {
    return {
      path: '/discover/movie',
      params: {
        sort_by: sortBy,
        ...(sortMode === 'relevance' ? { 'vote_count.gte': 300 } : {}),
      },
    };
  }
  if (type === 'anime') {
    return {
      path: '/discover/tv',
      params: {
        sort_by: sortBy,
        with_genres: '16',
        ...(sortMode === 'relevance' ? { 'vote_count.gte': 200 } : {}),
      },
    };
  }
  return {
    path: '/discover/tv',
    params: {
      sort_by: sortBy,
      without_genres: '16',
      ...(sortMode === 'relevance' ? { 'vote_count.gte': 300 } : {}),
    },
  };
}

async function fetchRemotePageForType(type, uiPage) {
  const pageSize = 24;
  const startIndex = Math.max(0, (uiPage - 1) * pageSize);
  const apiStartPage = Math.floor(startIndex / 20) + 1;
  const apiOffset = startIndex % 20;
  if (type === 'anime') {
    const tvParams = endpointForType('anime', state.sort).params;
    const movieParams = {
      sort_by: sortByForRemote('film', state.sort),
      with_genres: '16',
      ...(state.sort === 'relevance' ? { 'vote_count.gte': 200 } : {}),
    };

    const [tvFirst, movieFirst] = await Promise.all([
      tmdbFetch('/discover/tv', { ...tvParams, page: apiStartPage, include_adult: 'false' }),
      tmdbFetch('/discover/movie', { ...movieParams, page: apiStartPage, include_adult: 'false' }),
    ]);

    let mergedTv = [...(tvFirst?.results || [])];
    let mergedMovie = [...(movieFirst?.results || [])];

    if (apiOffset + pageSize > 20) {
      const [tvSecond, movieSecond] = await Promise.all([
        tmdbFetch('/discover/tv', { ...tvParams, page: apiStartPage + 1, include_adult: 'false' }),
        tmdbFetch('/discover/movie', { ...movieParams, page: apiStartPage + 1, include_adult: 'false' }),
      ]);
      mergedTv = mergedTv.concat(tvSecond?.results || []);
      mergedMovie = mergedMovie.concat(movieSecond?.results || []);
    }

    const combined = [
      ...mergedTv.map((entry) => normalizeTv(entry, 'anime')),
      ...mergedMovie.map((entry) => ({ ...normalizeMovie(entry), type: 'anime' })),
    ];
    const deduped = new Map();
    combined.forEach((item) => {
      deduped.set(`${item.type}:${item.title}:${item.year || ''}`, item);
    });
    const ordered = [...deduped.values()];
    const list = ordered.slice(apiOffset, apiOffset + pageSize);
    const totalResults = Math.max(
      0,
      Math.min(10000, Number(tvFirst?.total_results || 0) + Number(movieFirst?.total_results || 0))
    );
    return { list, totalResults };
  }

  const { path, params } = endpointForType(type, state.sort);
  const firstResp = await tmdbFetch(path, {
    ...params,
    page: apiStartPage,
    include_adult: 'false',
  });

  const totalResultsRaw = Number(firstResp?.total_results || 0);
  const totalResults = Math.max(0, Math.min(10000, totalResultsRaw));
  let merged = [...(firstResp?.results || [])];

  if (apiOffset + pageSize > merged.length && apiStartPage < (firstResp?.total_pages || 1)) {
    const secondResp = await tmdbFetch(path, {
      ...params,
      page: apiStartPage + 1,
      include_adult: 'false',
    });
    merged = merged.concat(secondResp?.results || []);
  }

  const chunk = merged.slice(apiOffset, apiOffset + pageSize);
  const normalized = type === 'film' ? chunk.map(normalizeMovie) : chunk.map((entry) => normalizeTv(entry, 'serie'));
  return { list: normalized, totalResults };
}

async function fetchRemoteSearchPage(uiPage) {
  const activeType = getForcedTypeFromState() || 'film';
  const query = state.text.trim();
  const apiPage = Math.max(1, uiPage);

  if (activeType === 'film') {
    const data = await tmdbFetch('/search/movie', {
      query,
      page: apiPage,
      include_adult: 'false',
    });
    const list = (data?.results || [])
      .map(normalizeMovie)
      .filter((item) => item.poster)
      .sort((a, b) => (a.year || 0) - (b.year || 0) || a.addedAt - b.addedAt);
    const totalResults = Math.max(0, Math.min(10000, Number(data?.total_results || 0)));
    return { list, totalResults };
  }

  const data = await tmdbFetch('/search/tv', {
    query,
    page: apiPage,
    include_adult: 'false',
  });
  let rows = data?.results || [];
  if (activeType === 'anime') {
    rows = rows.filter((entry) => (entry.genre_ids || []).includes(16) || entry.original_language === 'ja');
  } else if (activeType === 'serie') {
    rows = rows.filter((entry) => !(entry.genre_ids || []).includes(16));
  }
  const list = rows
    .map((entry) => normalizeTv(entry, activeType === 'anime' ? 'anime' : 'serie'))
    .filter((item) => item.poster)
    .sort((a, b) => (a.year || 0) - (b.year || 0) || a.addedAt - b.addedAt);
  const totalResults = Math.max(0, Math.min(10000, Number(data?.total_results || 0)));
  return { list, totalResults };
}

async function fetchUnifiedApiPage(type, uiPage) {
  const query = new URLSearchParams({
    type,
    page: String(uiPage),
    sort: state.sort || 'latest',
  });
  const res = await fetch(`/api/catalog/unified?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Unified API ${res.status}`);
  }
  const data = await res.json();
  return {
    list: Array.isArray(data?.items) ? data.items : [],
    totalResults: Number(data?.totalResults || 0),
  };
}

async function withRetry(task, attempts = 2, delayMs = 220) {
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        // Petit retry pour absorber les erreurs API temporaires.
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw lastError || new Error('Erreur inconnue');
}

function isInitialBrowseState() {
  return (
    !state.text &&
    state.tab === 'all' &&
    !state.type &&
    state.genres.size === 0 &&
    state.years.size === 0
  );
}

function buildPaginationPages(current, total) {
  if (total <= 1) return [];
  const pages = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}

function renderPagination(totalItems) {
  if (!paginationEl) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / 24));
  if (state.page > totalPages) state.page = totalPages;
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    paginationEl.hidden = true;
    return;
  }
  paginationEl.dataset.maxPage = String(totalPages);
  paginationEl.hidden = false;
  const pages = buildPaginationPages(state.page, totalPages);
  const nextDisabled = state.page >= totalPages;
  paginationEl.innerHTML = `
    <div class="catalog-pagination-line"></div>
    <div class="catalog-pagination-inner">
      <div class="catalog-pagination-pages">
        ${pages
          .map((p) =>
            p === '...'
              ? '<span class="catalog-page-ellipsis">...</span>'
              : `<button type="button" class="catalog-page-btn ${p === state.page ? 'active' : ''}" data-page="${p}">${p}</button>`
          )
          .join('')}
      </div>
      <form class="catalog-page-jump-form" data-page-jump-form>
        <label class="sr-only" for="catalog-page-jump-input">Aller à la page</label>
        <input id="catalog-page-jump-input" type="number" min="1" max="${totalPages}" placeholder="Page" data-page-jump-input />
        <button type="submit" class="catalog-page-jump-btn">Aller</button>
      </form>
      <button type="button" class="catalog-page-next" data-page-next ${nextDisabled ? 'disabled' : ''}>
        Page suivante <span aria-hidden="true">›</span>
      </button>
    </div>
  `;
}

async function renderResults() {
  if (!resultsGrid) return;
  const myRequestId = ++renderRequestId;
  renderedCatalogItems.clear();
  refreshWatchlistKeys();

  if (canUseRemoteSearchMode()) {
    resultsGrid.innerHTML = '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Recherche API…</p>';
    if (resultsTitle) resultsTitle.textContent = 'Résultats trouvés';
    try {
      const { list, totalResults } = await withRetry(() => fetchRemoteSearchPage(state.page), 2);
      if (myRequestId !== renderRequestId) return;
      if (!list.length) {
        if (state.page > 1) {
          state.page = 1;
          syncUiAfterFilterChange({ preservePage: true });
          return;
        }
        resultsGrid.innerHTML =
          '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Aucun résultat pour cette recherche.</p>';
        if (paginationEl) {
          paginationEl.innerHTML = '';
          paginationEl.hidden = true;
        }
        return;
      }
      resultsGrid.innerHTML = list.map(renderResultCard).join('');
      renderPagination(totalResults);
      return;
    } catch (error) {
      if (myRequestId !== renderRequestId) return;
      console.error(error);
      // Fallback local pour éviter un écran vide si l'API tombe temporairement.
      const local = filteredItems().slice(0, 24);
      if (!local.length) {
        resultsGrid.innerHTML =
          '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Impossible de rechercher via l’API pour le moment.</p>';
        if (paginationEl) {
          paginationEl.innerHTML = '';
          paginationEl.hidden = true;
        }
        return;
      }
      resultsGrid.innerHTML = local.map(renderResultCard).join('');
      if (paginationEl) {
        paginationEl.innerHTML = '';
        paginationEl.hidden = true;
      }
      return;
    }
  }

  if (canUseRemoteCatalogMode()) {
    const remoteType = getForcedTypeFromState();
    resultsGrid.innerHTML = '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Chargement du catalogue API…</p>';
    if (resultsTitle) resultsTitle.textContent = headingForSortMode();
    try {
      let list = [];
      let totalResults = 0;
      try {
        const direct = await withRetry(() => fetchRemotePageForType(remoteType, state.page), 2);
        list = direct.list;
        totalResults = direct.totalResults;
      } catch {
        const unified = await withRetry(() => fetchUnifiedApiPage(remoteType, state.page), 2);
        list = unified.list;
        totalResults = unified.totalResults;
      }
      if (myRequestId !== renderRequestId) return;
      if (!list.length) {
        if (state.page > 1) {
          state.page = 1;
          syncUiAfterFilterChange({ preservePage: true });
          return;
        }
        resultsGrid.innerHTML =
          '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Aucun résultat pour cette page.</p>';
        if (paginationEl) {
          paginationEl.innerHTML = '';
          paginationEl.hidden = true;
        }
        return;
      }
      resultsGrid.innerHTML = list.map(renderResultCard).join('');
      renderPagination(totalResults);
      return;
    } catch (error) {
      if (myRequestId !== renderRequestId) return;
      console.error(error);
      const local = filteredItems().slice(0, 24);
      if (!local.length) {
        resultsGrid.innerHTML =
          '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Impossible de charger cette page via l’API.</p>';
        if (paginationEl) {
          paginationEl.innerHTML = '';
          paginationEl.hidden = true;
        }
        return;
      }
      resultsGrid.innerHTML = local.map(renderResultCard).join('');
      if (paginationEl) {
        paginationEl.innerHTML = '';
        paginationEl.hidden = true;
      }
      return;
    }
  }

  if (catalogLoading && !catalogLoaded) {
    resultsGrid.innerHTML = '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Chargement du catalogue API…</p>';
    if (resultsTitle) resultsTitle.textContent = 'Chargement…';
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }
  const isInitial = isInitialBrowseState();
  const list = isInitial
    ? filteredItems().filter((item) => item.type === 'film')
    : filteredItems();
  if (resultsTitle) {
    resultsTitle.textContent = headingForSortMode();
  }
  if (!list.length) {
    resultsGrid.innerHTML = isInitial
      ? '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Aucun film récent disponible.</p>'
      : '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Aucun résultat pour ces filtres.</p>';
    if (catalogError) {
      resultsGrid.innerHTML += `<p class="muted" style="grid-column:1/-1;padding:0.2rem 0;color:#d4afb5;">${catalogError}</p>`;
    }
    if (paginationEl) {
      paginationEl.innerHTML = '';
      paginationEl.hidden = true;
    }
    return;
  }

  const pageSize = 24;
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const startIndex = (state.page - 1) * pageSize;
  const pagedList = list.slice(startIndex, startIndex + pageSize);

  resultsGrid.innerHTML = pagedList.map(renderResultCard).join('');
  renderPagination(totalItems);
}

function syncFilterOptionStates() {
  typeButtons.forEach((b) => b.classList.toggle('active', b.dataset.type === state.type));
  document.querySelectorAll('[data-genre]').forEach((el) => {
    const genre = el.getAttribute('data-genre') || '';
    el.classList.toggle('active', state.genres.has(genre));
  });
  document.querySelectorAll('[data-year]').forEach((el) => {
    const year = el.getAttribute('data-year') || '';
    el.classList.toggle('active', state.years.has(year));
  });
}

function activeFilterLabels() {
  const labels = [];
  if (state.type && state.type !== 'all') {
    labels.push({ key: `type:${state.type}`, label: labelForType(state.type) });
  }
  state.genres.forEach((g) => labels.push({ key: `genre:${g}`, label: g }));
  state.years.forEach((y) =>
    labels.push({ key: `year:${y}`, label: y === 'before-1970' ? 'Avant 1970' : y.replace('-', ' à ') })
  );
  return labels;
}

function updateFilterBadge() {
  if (!btnToggleFilters) return;
  const count = activeFilterLabels().length;
  const existing = btnToggleFilters.querySelector('.filter-count-badge');
  if (count <= 0) {
    if (existing) existing.remove();
    return;
  }
  if (existing) {
    existing.textContent = String(count);
    return;
  }
  const badge = document.createElement('span');
  badge.className = 'filter-count-badge';
  badge.textContent = String(count);
  btnToggleFilters.appendChild(badge);
}

function renderActiveFilters() {
  if (!activeFiltersEl) return;
  const activeFiltersRow = activeFiltersEl.closest('.active-filters-row');
  const labels = activeFilterLabels();
  if (!labels.length) {
    activeFiltersEl.innerHTML = '';
    if (activeFiltersRow) activeFiltersRow.hidden = true;
    return;
  }
  if (activeFiltersRow) activeFiltersRow.hidden = false;
  activeFiltersEl.innerHTML = labels
    .map(
      (item) =>
        `<span class="active-filter-chip">${item.label}<button type="button" data-remove-filter="${item.key}" aria-label="Retirer ${item.label}">×</button></span>`
    )
    .join('');
}

function syncUiAfterFilterChange({ preservePage = false } = {}) {
  if (!preservePage) state.page = 1;
  renderActiveFilters();
  updateFilterBadge();
  renderResults();
  if (filtersPanel?.classList.contains('filters-active-only') && activeFilterLabels().length === 0) {
    setFiltersPanelVisible(false, 'full');
  }
}

function setFiltersPanelVisible(visible, mode = 'full') {
  if (!btnToggleFilters || !filtersPanel) return;
  filtersPanel.hidden = !visible;
  filtersPanel.classList.toggle('filters-active-only', visible && mode === 'active-only');
  btnToggleFilters.classList.toggle('active', visible);
  searchPageControls?.classList.toggle('filters-open', visible);
}

function bindControls() {
  const closeSortMenu = () => {
    if (!sortMenu || !btnSort) return;
    sortMenu.hidden = true;
    btnSort.setAttribute('aria-expanded', 'false');
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.text = searchInput.value.trim().toLowerCase();
      syncUiAfterFilterChange();
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      state.tab = button.dataset.tab || 'all';
      if (state.tab === 'film' || state.tab === 'serie' || state.tab === 'anime') {
        state.type = state.tab;
        syncFilterOptionStates();
        setFiltersPanelVisible(true, 'active-only');
      } else if (state.tab === 'all') {
        state.type = null;
        syncFilterOptionStates();
      }
      syncUiAfterFilterChange();
    });
  });

  typeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const clickedType = button.dataset.type || '';
      if (state.type === clickedType) {
        state.type = null;
        button.classList.remove('active');
      } else {
        typeButtons.forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
        state.type = clickedType;
      }
      syncUiAfterFilterChange();
    });
  });

  if (btnToggleFilters && filtersPanel) {
    btnToggleFilters.addEventListener('click', () => {
      if (!filtersPanel.hidden && filtersPanel.classList.contains('filters-active-only')) {
        setFiltersPanelVisible(true, 'full');
        return;
      }
      const willShow = filtersPanel.hidden;
      setFiltersPanelVisible(willShow, 'full');
    });
  }

  if (btnSort && sortMenu) {
    btnSort.addEventListener('click', () => {
      const willOpen = sortMenu.hidden;
      sortMenu.hidden = !willOpen;
      btnSort.setAttribute('aria-expanded', String(willOpen));
    });
  }

  if (sortOptions.length) {
    sortOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const value = option.dataset.sort || 'relevance';
        state.sort = value;
        sortOptions.forEach((o) => o.classList.remove('active'));
        option.classList.add('active');
        if (btnSort) {
          btnSort.textContent = option.textContent || 'Pertinence';
        }
        closeSortMenu();
        syncUiAfterFilterChange();
      });
    });
  }

  document.addEventListener('click', (event) => {
    const genreBtn = event.target.closest('[data-genre]');
    if (genreBtn) {
      const genre = genreBtn.dataset.genre;
      if (state.genres.has(genre)) {
        state.genres.delete(genre);
        genreBtn.classList.remove('active');
      } else {
        state.genres.add(genre);
        genreBtn.classList.add('active');
      }
      syncUiAfterFilterChange();
      return;
    }

    const yearBtn = event.target.closest('[data-year]');
    if (yearBtn) {
      const year = String(yearBtn.dataset.year);
      if (state.years.has(year)) {
        state.years.delete(year);
        yearBtn.classList.remove('active');
      } else {
        state.years.add(year);
        yearBtn.classList.add('active');
      }
      syncUiAfterFilterChange();
      return;
    }

    const toggleMoreBtn = event.target.closest('[data-toggle-more]');
    if (toggleMoreBtn) {
      const target = toggleMoreBtn.getAttribute('data-toggle-more');
      if (target === 'genres') {
        state.showAllGenres = !state.showAllGenres;
      } else if (target === 'years') {
        state.showAllYears = !state.showAllYears;
      }
      renderFilterOptions();
      return;
    }

    const removeBtn = event.target.closest('[data-remove-filter]');
    if (removeBtn) {
      const key = removeBtn.dataset.removeFilter || '';
      if (key.startsWith('type:')) {
        state.type = null;
        typeButtons.forEach((b) => b.classList.remove('active'));
      } else if (key.startsWith('genre:')) {
        const genre = key.slice(6);
        state.genres.delete(genre);
        document.querySelector(`[data-genre="${CSS.escape(genre)}"]`)?.classList.remove('active');
      } else if (key.startsWith('year:')) {
        const year = key.slice(5);
        state.years.delete(year);
        document.querySelector(`[data-year="${CSS.escape(year)}"]`)?.classList.remove('active');
      }
      syncUiAfterFilterChange();
    }
  });

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      state.type = null;
      state.genres.clear();
      state.years.clear();
      state.sort = 'relevance';
      syncFilterOptionStates();
      sortOptions.forEach((o) => o.classList.toggle('active', o.dataset.sort === 'relevance'));
      if (btnSort) btnSort.textContent = 'Pertinence';
      syncUiAfterFilterChange();
    });
  }

  if (paginationEl) {
    paginationEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const pageBtn = target.closest('[data-page]');
      if (pageBtn) {
        const nextPage = Number(pageBtn.getAttribute('data-page'));
        if (!Number.isFinite(nextPage) || nextPage < 1) return;
        state.page = nextPage;
        syncUiAfterFilterChange({ preservePage: true });
        return;
      }
      const nextBtn = target.closest('[data-page-next]');
      if (nextBtn) {
        state.page += 1;
        syncUiAfterFilterChange({ preservePage: true });
        return;
      }
    });

    paginationEl.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLElement)) return;
      if (!form.matches('[data-page-jump-form]')) return;
      event.preventDefault();
      const input = form.querySelector('[data-page-jump-input]');
      if (!(input instanceof HTMLInputElement)) return;
      const maxPage = Math.max(1, Number(paginationEl.dataset.maxPage || 1));
      const chosen = Number(input.value);
      if (!Number.isFinite(chosen)) return;
      const nextPage = Math.min(maxPage, Math.max(1, Math.trunc(chosen)));
      state.page = nextPage;
      input.value = '';
      syncUiAfterFilterChange({ preservePage: true });
    });
  }

  if (resultsGrid) {
    resultsGrid.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest('[data-poster-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-poster-action');
      const key = btn.getAttribute('data-item-key') || '';
      const item = renderedCatalogItems.get(key);
      if (!item) return;
      if (action === 'watchlist') {
        const added = addItemToWatchlist(item);
        if (added) {
          showWatchlistToast(`Le film "${item.title}" a bien été ajouté à ta watchlist !`);
        } else {
          showWatchlistToast(`"${item.title}" est déjà dans ta watchlist.`);
        }
        const watchlistBtn = btn;
        if (watchlistBtn instanceof HTMLButtonElement) {
          watchlistBtn.classList.add('is-added');
          const label = watchlistBtn.querySelector('.poster-action-label');
          if (label) label.textContent = 'Déjà dans ma watchlist';
          const icon = watchlistBtn.querySelector('svg');
          if (icon) {
            icon.innerHTML =
              '<path d="M4.5 12.5 9.5 17.5 19.5 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
          }
        }
        return;
      }
      if (action === 'details') {
        const params = new URLSearchParams({
          id: String(item.id),
          type: item.type,
          title: item.title || '',
        });
        window.location.href = `/fiche.html?${params.toString()}`;
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!sortMenu || !btnSort) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const clickedInside = target.closest('.sort-wrap');
    if (!clickedInside) {
      closeSortMenu();
    }
  });
}

randomizeHeroTitle();
renderFilterOptions();
bindControls();
syncUiAfterFilterChange();
searchPageControls?.classList.toggle('filters-open', !filtersPanel?.hidden);
loadCatalogFromApi();

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
    window.location.href = '/profiles.html?next=%2Fsearch.html';
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
    window.location.href = '/profiles.html?next=%2Fsearch.html';
    return;
  }
  await hydrateCurrentUserUi();
  if (document.body) {
    document.body.style.visibility = 'visible';
  }
}

initPageAuth().catch((error) => {
  console.error(error);
});

if (!hasStoredAuthToken()) {
  const current = `${window.location.pathname}${window.location.search}`;
  const redirect = encodeURIComponent(current);
  window.location.replace(`/login.html?next=${redirect}`);
}
