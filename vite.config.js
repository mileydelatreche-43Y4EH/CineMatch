import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/original';
const LANG = 'fr-FR';
const PAGE_SIZE = 24;
const CACHE_TTL_MS = 1000 * 60 * 30;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseRequestUrl(req) {
  const host = req.headers.host || 'localhost:5173';
  return new URL(req.url || '/', `http://${host}`);
}

function toAddedAtNumber(value) {
  if (!value) return 0;
  const clean = String(value).replace(/-/g, '');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function formatFrenchDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
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
        ...(sortMode === 'relevance' ? { 'vote_count.gte': '300' } : {}),
      },
    };
  }
  if (type === 'anime') {
    return {
      path: '/discover/tv',
      params: {
        sort_by: sortBy,
        with_genres: '16',
        with_original_language: 'ja',
        ...(sortMode === 'relevance' ? { 'vote_count.gte': '200' } : {}),
      },
    };
  }
  return {
    path: '/discover/tv',
    params: {
      sort_by: sortBy,
      without_genres: '16',
      ...(sortMode === 'relevance' ? { 'vote_count.gte': '300' } : {}),
    },
  };
}

function createCatalogApiPlugin() {
  const tmdbApiKey = process.env.VITE_TMDB_API_KEY;
  const traktClientId = process.env.VITE_TRAKT_CLIENT_ID;
  const omdbApiKey = process.env.VITE_OMDB_API_KEY;
  const catalogCache = new Map();
  const tmdbTotalCache = new Map();

  async function tmdbFetch(path, params = {}) {
    if (!tmdbApiKey) throw new Error('TMDB key missing');
    const url = new URL(`${API_BASE}${path}`);
    Object.entries({ ...params, language: LANG }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
    if (!tmdbApiKey.startsWith('ey')) url.searchParams.set('api_key', tmdbApiKey);
    const response = await fetch(url.toString(), {
      headers: tmdbApiKey.startsWith('ey')
        ? { accept: 'application/json', Authorization: `Bearer ${tmdbApiKey}` }
        : { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`TMDB ${response.status}`);
    return response.json();
  }

  async function tvMazeFetchShows(page = 0) {
    const response = await fetch(`https://api.tvmaze.com/shows?page=${page}`);
    if (!response.ok) throw new Error(`TVMaze ${response.status}`);
    return response.json();
  }

  async function jikanTopAnime(page = 1) {
    const response = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}`);
    if (!response.ok) throw new Error(`Jikan ${response.status}`);
    return response.json();
  }

  async function anilistTrendingAnime(page = 1) {
    const query = `query ($page:Int){Page(page:$page, perPage:24){media(type:ANIME, sort:TRENDING_DESC){id title{romaji english native}coverImage{extraLarge large}startDate{year month day}}}}`;
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { page } }),
    });
    if (!response.ok) throw new Error(`AniList ${response.status}`);
    return response.json();
  }

  async function traktPopular(type = 'movies', page = 1) {
    if (!traktClientId) return [];
    const response = await fetch(`https://api.trakt.tv/${type}/popular?page=${page}&limit=24`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': traktClientId,
      },
    });
    if (!response.ok) throw new Error(`Trakt ${response.status}`);
    return response.json();
  }

  async function enrichWithOmdbByImdb(imdbId) {
    if (!omdbApiKey || !imdbId) return null;
    const response = await fetch(`https://www.omdbapi.com/?apikey=${omdbApiKey}&i=${imdbId}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.Response === 'False') return null;
    return data;
  }

  function normalizeTmdbMovie(item) {
    const releaseDate = item.release_date || '';
    return {
      id: `tmdb-movie-${item.id}`,
      title: item.title || item.original_title || 'Film',
      type: 'film',
      year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
      addedAt: toAddedAtNumber(releaseDate),
      poster: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
      meta: `Film • ${formatFrenchDate(releaseDate)}`,
      source: 'tmdb',
    };
  }

  function normalizeTmdbTv(item, type = 'serie') {
    const firstAirDate = item.first_air_date || '';
    return {
      id: `tmdb-tv-${item.id}-${type}`,
      title: item.name || item.original_name || (type === 'anime' ? 'Animé' : 'Série'),
      type,
      year: firstAirDate ? Number(firstAirDate.slice(0, 4)) : null,
      addedAt: toAddedAtNumber(firstAirDate),
      poster: item.poster_path ? `${IMG_BASE}${item.poster_path}` : '',
      meta: `${type === 'anime' ? 'Animé' : 'Série'} • ${formatFrenchDate(firstAirDate)}`,
      source: 'tmdb',
    };
  }

  function normalizeTvMaze(show) {
    const premiered = show?.premiered || '';
    return {
      id: `tvmaze-${show?.id}`,
      title: show?.name || 'Série',
      type: 'serie',
      year: premiered ? Number(String(premiered).slice(0, 4)) : null,
      addedAt: toAddedAtNumber(premiered),
      poster: show?.image?.original || show?.image?.medium || '',
      meta: `Série • ${formatFrenchDate(premiered)}`,
      source: 'tvmaze',
    };
  }

  function normalizeJikanAnime(entry) {
    const date = entry?.aired?.from ? String(entry.aired.from).slice(0, 10) : '';
    return {
      id: `jikan-${entry?.mal_id}`,
      title: entry?.title || 'Animé',
      type: 'anime',
      year: date ? Number(date.slice(0, 4)) : null,
      addedAt: toAddedAtNumber(date),
      poster: entry?.images?.jpg?.large_image_url || entry?.images?.jpg?.image_url || '',
      meta: `Animé • ${formatFrenchDate(date)}`,
      source: 'jikan',
    };
  }

  function normalizeAniListAnime(entry) {
    const date = entry?.startDate?.year
      ? `${entry.startDate.year}-${String(entry.startDate.month || 1).padStart(2, '0')}-${String(entry.startDate.day || 1).padStart(2, '0')}`
      : '';
    return {
      id: `anilist-${entry?.id}`,
      title: entry?.title?.english || entry?.title?.romaji || entry?.title?.native || 'Animé',
      type: 'anime',
      year: entry?.startDate?.year || null,
      addedAt: toAddedAtNumber(date),
      poster: entry?.coverImage?.extraLarge || entry?.coverImage?.large || '',
      meta: `Animé • ${formatFrenchDate(date)}`,
      source: 'anilist',
    };
  }

  function normalizeTraktItem(entry, type = 'film') {
    const base = type === 'film' ? entry?.movie : entry?.show;
    if (!base) return null;
    return {
      id: `trakt-${type}-${base.ids?.trakt || base.ids?.slug || base.title}`,
      title: base.title || (type === 'film' ? 'Film' : 'Série'),
      type,
      year: Number(base.year) || null,
      addedAt: Number(base.year) ? Number(`${base.year}0101`) : 0,
      poster: '',
      meta: `${type === 'film' ? 'Film' : 'Série'} • ${base.year || 'Date inconnue'}`,
      source: 'trakt',
      imdbId: base.ids?.imdb || '',
    };
  }

  function dedupeItems(list) {
    const byKey = new Map();
    list.forEach((item) => {
      if (!item?.title) return;
      const key = `${item.type}:${item.title.toLowerCase()}:${item.year || ''}`;
      if (!byKey.has(key)) byKey.set(key, item);
    });
    return [...byKey.values()];
  }

  function createYearBuckets(startYear = 1970, endYear = new Date().getFullYear(), size = 4) {
    const buckets = [];
    for (let from = endYear; from >= startYear; from -= size) {
      const to = Math.min(endYear, from + size - 1);
      buckets.push([from, to]);
    }
    return buckets;
  }

  function dateFieldForType(type) {
    return type === 'film' ? 'primary_release_date' : 'first_air_date';
  }

  function baseSlicesForType(type) {
    const dateField = dateFieldForType(type);
    const years = createYearBuckets(1950, new Date().getFullYear(), type === 'film' ? 2 : 4).slice(
      0,
      type === 'film' ? 36 : 20
    );
    const regionParams = type === 'film'
      ? [{ region: 'US' }, { region: 'FR' }, { region: 'JP' }, { region: 'IN' }, { region: 'KR' }]
      : [{}, { with_origin_country: 'US' }, { with_origin_country: 'JP' }];

    const slices = [];
    years.forEach(([from, to], idx) => {
      const region = regionParams[idx % regionParams.length];
      slices.push({
        [`${dateField}.gte`]: `${from}-01-01`,
        [`${dateField}.lte`]: `${to}-12-31`,
        ...region,
      });
    });
    return slices;
  }

  function normalizeTmdbByType(type, rows) {
    if (type === 'film') return rows.map(normalizeTmdbMovie);
    return rows.map((row) => normalizeTmdbTv(row, type === 'anime' ? 'anime' : 'serie'));
  }

  async function harvestSlicePages(type, sort, sliceParams, pagesPerSlice = 2) {
    const endpoint = endpointForType(type, sort);
    const jobs = Array.from({ length: pagesPerSlice }, (_, i) =>
      tmdbFetch(endpoint.path, {
        ...endpoint.params,
        ...sliceParams,
        page: i + 1,
        include_adult: 'false',
      })
    );
    const settled = await Promise.allSettled(jobs);
    const rows = settled
      .filter((s) => s.status === 'fulfilled')
      .flatMap((s) => s.value?.results || []);
    return normalizeTmdbByType(type, rows);
  }

  async function promisePool(items, worker, concurrency = 4) {
    const results = [];
    const queue = [...items];
    const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        const value = await worker(current);
        results.push(value);
      }
    });
    await Promise.all(runners);
    return results;
  }

  async function buildTmdbCatalogSnapshot(type, sort) {
    const cacheKey = `${type}:${sort}`;
    const existing = catalogCache.get(cacheKey);
    if (existing?.items?.length && Date.now() - existing.createdAt < CACHE_TTL_MS) {
      return existing;
    }
    if (existing?.buildingPromise) {
      await existing.buildingPromise;
      return catalogCache.get(cacheKey);
    }

    const buildPromise = (async () => {
      const slices = baseSlicesForType(type);
      const pagesPerSlice = type === 'film' ? 4 : type === 'serie' ? 3 : 3;
      const collected = await promisePool(
        slices,
        (slice) => harvestSlicePages(type, sort, slice, pagesPerSlice),
        type === 'film' ? 5 : 4
      );
      const merged = dedupeItems(collected.flat());
      const sorted = [...merged].sort((a, b) => {
        if (sort === 'recent') return (b.year || 0) - (a.year || 0) || b.addedAt - a.addedAt;
        if (sort === 'relevance') return (b.addedAt || 0) - (a.addedAt || 0);
        return b.addedAt - a.addedAt;
      });
      catalogCache.set(cacheKey, {
        createdAt: Date.now(),
        items: sorted,
        totalResults: sorted.length,
        buildingPromise: null,
      });
    })();

    catalogCache.set(cacheKey, {
      createdAt: 0,
      items: [],
      totalResults: 0,
      buildingPromise: buildPromise,
    });

    await buildPromise;
    return catalogCache.get(cacheKey);
  }

  async function getTmdbTotalEstimate(type, sort) {
    const key = `${type}:${sort}`;
    const cached = tmdbTotalCache.get(key);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return cached.total;
    }
    const endpoint = endpointForType(type, sort);
    const firstPage = await tmdbFetch(endpoint.path, {
      ...endpoint.params,
      page: 1,
      include_adult: 'false',
    });
    const total = Math.max(0, Math.min(10000, Number(firstPage?.total_results || 0)));
    tmdbTotalCache.set(key, { total, createdAt: Date.now() });
    return total;
  }

  async function handleUnified(req, res) {
    const url = parseRequestUrl(req);
    const type = url.searchParams.get('type') || 'film';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const sort = url.searchParams.get('sort') || 'latest';
    const sourcePage = page;

    try {
      const snapshot = await buildTmdbCatalogSnapshot(type, sort);
      const tmdbTotalEstimate = await getTmdbTotalEstimate(type, sort);
      const start = (sourcePage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      let merged = (snapshot?.items || []).slice(start, end);
      let tmdbDirectTotal = 0;

      if (!merged.length) {
        const endpoint = endpointForType(type, sort);
        const direct = await tmdbFetch(endpoint.path, {
          ...endpoint.params,
          page: sourcePage,
          include_adult: 'false',
        });
        tmdbDirectTotal = Number(direct?.total_results || 0);
        const normalizedDirect = normalizeTmdbByType(type, direct?.results || []);
        merged = merged.concat(normalizedDirect);
      }

      const tasks = [];
      if (type === 'serie') tasks.push(tvMazeFetchShows(Math.max(0, sourcePage - 1)));
      if (type === 'anime') tasks.push(jikanTopAnime(sourcePage), anilistTrendingAnime(sourcePage));
      if (type === 'film') tasks.push(traktPopular('movies', sourcePage));
      if (type === 'serie') tasks.push(traktPopular('shows', sourcePage));

      const settled = await Promise.allSettled(tasks);

      if (type === 'serie' && settled[0]?.status === 'fulfilled') {
        merged = merged.concat((settled[0].value || []).map(normalizeTvMaze));
      }

      if (type === 'anime') {
        const jikanResult = settled[0]?.status === 'fulfilled' ? settled[0].value?.data || [] : [];
        const anilistResult = settled[1]?.status === 'fulfilled'
          ? settled[1].value?.data?.Page?.media || []
          : [];
        merged = merged.concat(jikanResult.map(normalizeJikanAnime), anilistResult.map(normalizeAniListAnime));
      }

      const traktIndex = type === 'anime' ? -1 : type === 'film' ? 0 : 1;
      const traktResult = traktIndex >= 0 && settled[traktIndex]?.status === 'fulfilled' ? settled[traktIndex].value : [];
      merged = merged.concat(
        (traktResult || [])
          .map((entry) => normalizeTraktItem(entry, type === 'film' ? 'film' : 'serie'))
          .filter(Boolean)
      );

      const deduped = dedupeItems(merged);
      const withPosters = deduped.filter((item) => item.poster);
      const withoutPosters = deduped.filter((item) => !item.poster);
      let top = withPosters.concat(withoutPosters).slice(0, PAGE_SIZE);

      if (type === 'film' && top.length === 0) {
        const emergencyPages = await Promise.allSettled([
          tmdbFetch('/discover/movie', { sort_by: 'popularity.desc', page: 1, include_adult: 'false' }),
          tmdbFetch('/discover/movie', { sort_by: 'vote_count.desc', page: 1, include_adult: 'false' }),
          tmdbFetch('/discover/movie', { sort_by: 'primary_release_date.desc', page: 1, include_adult: 'false' }),
        ]);
        const emergencyRows = emergencyPages
          .filter((s) => s.status === 'fulfilled')
          .flatMap((s) => s.value?.results || []);
        const emergencyNormalized = dedupeItems(emergencyRows.map(normalizeTmdbMovie));
        top = emergencyNormalized.filter((item) => item.poster).slice(0, PAGE_SIZE);
      }

      if (omdbApiKey) {
        const omdbTargets = top.filter((item) => !item.poster && item.imdbId).slice(0, 5);
        const omdbEnriched = await Promise.all(omdbTargets.map((item) => enrichWithOmdbByImdb(item.imdbId)));
        omdbTargets.forEach((item, idx) => {
          const omdb = omdbEnriched[idx];
          if (!omdb) return;
          item.poster = omdb.Poster && omdb.Poster !== 'N/A' ? omdb.Poster : item.poster;
          item.meta = `${item.type === 'film' ? 'Film' : 'Série'} • ${omdb.Released || omdb.Year || item.year || 'Date inconnue'}`;
        });
      }

      const totalFromTmdb = Number(snapshot?.totalResults || 0);
      const totalResults = Math.max(
        PAGE_SIZE,
        totalFromTmdb,
        tmdbDirectTotal,
        tmdbTotalEstimate,
        deduped.length
      );

      json(res, 200, {
        items: top,
        page,
        pageSize: PAGE_SIZE,
        totalResults: Math.max(PAGE_SIZE, totalResults),
      });
    } catch (error) {
      json(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  function attachMiddleware(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = parseRequestUrl(req);
      if (req.method === 'GET' && url.pathname === '/api/catalog/unified') {
        await handleUnified(req, res);
        return;
      }
      next();
    });
  }

  return {
    name: 'catalog-unified-api',
    configureServer(server) {
      attachMiddleware(server);
    },
    configurePreviewServer(server) {
      attachMiddleware(server);
    },
  };
}

export default defineConfig({
  plugins: [createCatalogApiPlugin()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./login.html', import.meta.url)),
        search: fileURLToPath(new URL('./search.html', import.meta.url)),
        idee: fileURLToPath(new URL('./idee.html', import.meta.url)),
        securite: fileURLToPath(new URL('./securite-confidentialite.html', import.meta.url)),
        aPropos: fileURLToPath(new URL('./a-propos.html', import.meta.url)),
      },
    },
  },
});
