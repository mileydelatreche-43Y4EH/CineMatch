import { getCurrentUser, requireAuth } from './auth.js';

if (!requireAuth()) {
  throw new Error('Auth redirect');
}

const titleEl = document.getElementById('random-hero-title');
const searchInput = document.getElementById('global-search');
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
const activeFiltersEl = document.getElementById('active-filters');
const btnResetFilters = document.getElementById('btn-reset-filters');
const topbar = document.querySelector('.topbar');

const alternatives = [
  "Envie de t'évader ?",
  'Prêt pour une soirée cinéma ?',
  'Que souhaites-tu regarder ?',
];

const items = [
  { id: 1, title: 'Interstellar', type: 'film', genres: ['Science-fiction', 'Aventure'], year: 2014, addedAt: 20260428, poster: 'https://image.tmdb.org/t/p/original/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg', meta: '2h49 • 7 nov. 2014' },
  { id: 2, title: 'Avengers: Infinity War', type: 'film', genres: ['Action', 'Aventure'], year: 2018, addedAt: 20260427, poster: 'https://image.tmdb.org/t/p/original/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg', meta: '2h29 • 25 avr. 2018' },
  { id: 3, title: 'Parasite', type: 'film', genres: ['Thriller', 'Comedie'], year: 2019, addedAt: 20260425, poster: 'https://image.tmdb.org/t/p/original/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', meta: '2h12 • 5 juin 2019' },
  { id: 4, title: 'Joker', type: 'film', genres: ['Drame', 'Crime'], year: 2019, addedAt: 20260422, poster: 'https://image.tmdb.org/t/p/original/8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg', meta: '2h02 • 9 oct. 2019' },
  { id: 5, title: 'Arcane', type: 'serie', genres: ['Animation', 'Action'], year: 2021, addedAt: 20260423, poster: 'https://image.tmdb.org/t/p/original/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', meta: 'Série • 2021' },
  { id: 6, title: 'Breaking Bad', type: 'serie', genres: ['Crime', 'Drame'], year: 2008, addedAt: 20260420, poster: 'https://image.tmdb.org/t/p/original/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', meta: 'Série • 2008' },
  { id: 7, title: 'Demon Slayer', type: 'anime', genres: ['Animation', 'Action'], year: 2019, addedAt: 20260421, poster: 'https://image.tmdb.org/t/p/original/wq1UGbQsnLQ8f7n4fV5kF8Q4YbP.jpg', meta: 'Animé • 2019' },
  { id: 8, title: 'Your Name', type: 'anime', genres: ['Animation', 'Romance'], year: 2016, addedAt: 20260426, poster: 'https://image.tmdb.org/t/p/original/q719jXXEzOoYaps6babgKnONONX.jpg', meta: '1h46 • 2016' },
  { id: 9, title: 'Black Widow', type: 'film', genres: ['Action', 'Aventure'], year: 2021, addedAt: 20260419, poster: 'https://image.tmdb.org/t/p/original/9E2y5Q7WlCVNEhP5GiVTjhEhx1o.jpg', meta: '2h14 • 7 juil. 2021' },
  { id: 10, title: 'Death Note', type: 'anime', genres: ['Thriller', 'Mystere'], year: 2006, addedAt: 20260418, poster: 'https://image.tmdb.org/t/p/original/10U5d0M6sKuK6yl6wtYQ0JfV8Jq.jpg', meta: 'Animé • 2006' },
  { id: 11, title: 'The Originals', type: 'serie', genres: ['Fantastique', 'Drame'], year: 2013, addedAt: 20260424, poster: 'https://image.tmdb.org/t/p/original/qQWrR2ByVwx7eteddt2JPfxG0ls.jpg', meta: 'Série • 2013' },
  { id: 12, title: 'Le Parrain', type: 'film', genres: ['Drame', 'Crime'], year: 1972, addedAt: 20260417, poster: 'https://image.tmdb.org/t/p/original/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg', meta: '2h55 • 1972' },
];

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
  type: 'film',
  genres: new Set(['Action']),
  years: new Set(['2023']),
  sort: 'relevance',
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
    genreFilters.innerHTML = uniqueValuesFrom('genres')
      .map(
        ([genre, count]) =>
          `<button type="button" class="chip chip-genre" data-genre="${genre}">${genre} <span class="count">(${count})</span></button>`
      )
      .join('');
  }

  if (yearFilters) {
    yearFilters.innerHTML = uniqueValuesFrom('years')
      .map((yearKey) => {
        const label = yearKey === 'before-1970' ? 'Avant 1970' : yearKey.replace('-', ' à ');
        return `<button type="button" class="chip chip-year" data-year="${yearKey}">${label}</button>`;
      })
      .join('');
  }

  syncFilterOptionStates();
}

function labelForType(type) {
  if (type === 'serie') return 'Série';
  if (type === 'anime') return 'Animé';
  return 'Film';
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
  return item.title.toLowerCase().includes(state.text);
}

function filteredItems() {
  let list = items.filter((item) =>
    matchesTab(item) && matchesType(item) && matchesGenres(item) && matchesYears(item) && matchesText(item)
  );
  if (state.sort === 'latest') {
    list = list.sort((a, b) => b.addedAt - a.addedAt);
  } else if (state.sort === 'random') {
    list = [...list].sort(() => Math.random() - 0.5);
  }
  return list;
}

function renderResults() {
  if (!resultsGrid) return;
  const list = filteredItems();
  if (!list.length) {
    resultsGrid.innerHTML = '<p class="muted" style="grid-column:1/-1;padding:0.5rem 0;">Aucun résultat pour ces filtres.</p>';
    return;
  }

  resultsGrid.innerHTML = list
    .map(
      (item) =>
        `<article class="result-card">
          <article class="poster-card">
          <span class="poster-type"><span class="poster-type-dot"></span>${labelForType(item.type)}</span>
          <img src="${item.poster}" alt="${item.title}" loading="lazy" />
          </article>
          <h3>${item.title}</h3>
          <p>${item.meta || item.year}</p>
        </article>`
    )
    .join('');
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
  if (state.type !== 'all') labels.push({ key: `type:${state.type}`, label: labelForType(state.type) });
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
  const labels = activeFilterLabels();
  if (!labels.length) {
    activeFiltersEl.innerHTML = '<span class="muted">Aucun filtre actif</span>';
    return;
  }
  activeFiltersEl.innerHTML = labels
    .map(
      (item) =>
        `<span class="active-filter-chip">${item.label}<button type="button" data-remove-filter="${item.key}" aria-label="Retirer ${item.label}">×</button></span>`
    )
    .join('');
}

function syncUiAfterFilterChange() {
  renderActiveFilters();
  updateFilterBadge();
  renderResults();
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
      const willShow = filtersPanel.hidden;
      filtersPanel.hidden = !willShow;
      btnToggleFilters.classList.toggle('active', willShow);
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

const currentUser = getCurrentUser();
if (currentUser) {
  document.querySelectorAll('.js-profile-name').forEach((node) => {
    node.textContent = currentUser.name;
  });
  if (currentUser.profile?.avatar) {
    document.querySelectorAll('.js-profile-avatar').forEach((node) => {
      node.style.backgroundImage = `url("${currentUser.profile.avatar}")`;
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
