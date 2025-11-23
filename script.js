/* script.js - versão final (paginação garantida) */
const TMDB_API_KEY = '62fd8e76492e4bdda5e40b8eb6520a00';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const IPTV_ORG_API_BASE = 'https://iptv-org.github.io/api';

// referências (serão definidas no DOMContentLoaded)
let menuToggle, mainNav, searchInput, searchButton, heroBannerContainer, heroCarousel;
let catalogContainer, resultsContainer, detailsModal, detailsContent, genreScroller, genrePrev, genreNext;
let playerContainer, playerTitle, videoPlayerDiv, backButton, playerSourceSelect, loadPlayerButton;
let seriesSelectors, seasonSelect, episodeSelect, closeButton;

// paginação refs
let paginationControls, pagePrevBtn, pageNextBtn, pageNumbersContainer, pageInfoSpan;

// estado global
let favoritesList = [];
let apiCache = new Map();
let heroInterval = null;
let currentSlide = 0;
let currentMedia = { tmdbId: null, mediaType: null, title: null, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1 };

// paginação state
let currentCategoryEndpoint = null;
let currentCategoryTitle = "";
let currentCategoryPage = 1;
let totalCategoryPages = 1;

/* ---------- util ---------- */
function debounce(fn, wait = 300) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
async function cachedFetch(url) {
  if (!url) throw new Error('URL indefinida');
  if (apiCache.has(url)) return apiCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar ${url}`);
  const json = await res.json();
  apiCache.set(url, json);
  return json;
}
function loadFavoritesFromLocalStorage() { try { const s = localStorage.getItem('cineStreamFavorites'); return s ? JSON.parse(s) : []; } catch (e) { console.warn(e); return []; } }
function saveFavoritesToLocalStorage() { try { localStorage.setItem('cineStreamFavorites', JSON.stringify(favoritesList)); } catch (e) { console.warn(e); } }
function isFavorite(tmdbId, mediaType) { return favoritesList.includes(`${mediaType}-${tmdbId}`); }
function toggleFavorite(tmdbId, mediaType) {
  const key = `${mediaType}-${tmdbId}`;
  const idx = favoritesList.indexOf(key);
  if (idx === -1) favoritesList.push(key); else favoritesList.splice(idx, 1);
  saveFavoritesToLocalStorage();
  updateAllCardFavoriteIcons(tmdbId, mediaType);
}
function updateAllCardFavoriteIcons(tmdbId, mediaType) {
  document.querySelectorAll(`.movie-card[data-id="${tmdbId}"][data-type="${mediaType}"] .icon-save`).forEach(el => {
    if (isFavorite(tmdbId, mediaType)) { el.innerHTML = '&#9829;'; el.classList.add('is-favorite'); }
    else { el.innerHTML = '&#9825;'; el.classList.remove('is-favorite'); }
  });
}

/* ---------- init refs (chave para garantir paginação) ---------- */
function initRefs() {
  menuToggle = document.getElementById('menu-toggle');
  mainNav = document.getElementById('main-nav');
  searchInput = document.getElementById('search-input');
  searchButton = document.getElementById('search-button');
  heroBannerContainer = document.getElementById('hero-banner-container');
  heroCarousel = document.getElementById('hero-carousel');
  catalogContainer = document.getElementById('catalog-container');
  resultsContainer = document.getElementById('results-container');
  detailsModal = document.getElementById('details-modal');
  detailsContent = document.getElementById('details-content');
  genreScroller = document.getElementById('genre-scroller');
  genrePrev = document.getElementById('genre-prev');
  genreNext = document.getElementById('genre-next');
  playerContainer = document.getElementById('player-container');
  playerTitle = document.getElementById('player-title');
  videoPlayerDiv = document.getElementById('video-player');
  backButton = document.getElementById('back-button');
  playerSourceSelect = document.getElementById('player-source');
  loadPlayerButton = document.getElementById('load-player-button');
  seriesSelectors = document.getElementById('series-selectors');
  seasonSelect = document.getElementById('season-select');
  episodeSelect = document.getElementById('episode-select');
  closeButton = document.querySelector('.close-button');

  // paginação: pegar do DOM (HTML foi atualizado para sempre conter os controles)
  paginationControls = document.getElementById('pagination-controls');
  pagePrevBtn = document.getElementById('page-prev');
  pageNextBtn = document.getElementById('page-next');
  pageNumbersContainer = document.getElementById('page-numbers');
  pageInfoSpan = document.getElementById('page-info');

  // caso algum elemento de paginação esteja ausente, criá-lo (defensivo)
  if (!paginationControls) {
    paginationControls = document.createElement('div');
    paginationControls.id = 'pagination-controls';
    paginationControls.className = 'pagination-controls';
    paginationControls.style.display = 'none';

    pagePrevBtn = document.createElement('button');
    pagePrevBtn.id = 'page-prev';
    pagePrevBtn.className = 'page-btn';
    pagePrevBtn.textContent = '←';

    pageNextBtn = document.createElement('button');
    pageNextBtn.id = 'page-next';
    pageNextBtn.className = 'page-btn';
    pageNextBtn.textContent = '→';

    pageNumbersContainer = document.createElement('div');
    pageNumbersContainer.id = 'page-numbers';
    pageNumbersContainer.className = 'page-numbers';

    pageInfoSpan = document.createElement('span');
    pageInfoSpan.id = 'page-info';
    pageInfoSpan.className = 'page-info';

    paginationControls.appendChild(pagePrevBtn);
    paginationControls.appendChild(pageNumbersContainer);
    paginationControls.appendChild(pageInfoSpan);
    paginationControls.appendChild(pageNextBtn);

    if (resultsContainer && resultsContainer.parentNode) resultsContainer.parentNode.insertBefore(paginationControls, resultsContainer.nextSibling);
    else document.body.appendChild(paginationControls);
  }

  // garantir listeners prev/next
  if (pagePrevBtn) {
    pagePrevBtn.addEventListener('click', () => {
      if (currentCategoryPage > 1) loadCategory(currentCategoryEndpoint, currentCategoryTitle, currentCategoryPage - 1);
    });
  }
  if (pageNextBtn) {
    pageNextBtn.addEventListener('click', () => {
      if (currentCategoryPage < totalCategoryPages) loadCategory(currentCategoryEndpoint, currentCategoryTitle, currentCategoryPage + 1);
    });
  }
}

/* ---------- hero ---------- */
async function loadHeroBanner() {
  try {
    const url = `${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const data = await cachedFetch(url);
    const trending = (data.results || []).filter(i => i.backdrop_path).slice(0, 6);
    if (!heroCarousel) return;
    heroCarousel.innerHTML = '';
    if (!trending.length) {
      const fallback = document.createElement('div');
      fallback.className = 'hero-slide fallback active';
      fallback.innerHTML = `<div class="hero-overlay"></div><div class="hero-content"><h2>CineStream</h2><p>Bem-vindo — imagem de fallback.</p></div>`;
      heroCarousel.appendChild(fallback);
      return;
    }
    trending.forEach((item, i) => {
      const slide = document.createElement('div');
      slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
      slide.style.backgroundImage = `url(${TMDB_IMAGE_BASE_URL}${item.backdrop_path})`;
      slide.innerHTML = `<div class="hero-overlay"></div><div class="hero-content"><h2>${item.title || item.name}</h2><p>${(item.overview || '').substring(0, 220)}</p><button class="hero-watch-button" data-id="${item.id}" data-type="${item.media_type || 'movie'}" data-title="${item.title || item.name}">ASSISTIR</button></div>`;
      heroCarousel.appendChild(slide);
    });
    heroCarousel.querySelectorAll('.hero-watch-button').forEach(b => b.addEventListener('click', e => {
      const t = e.currentTarget.dataset; handleWatchClick(t.id, t.type, t.title);
    }));
    if (heroInterval) clearInterval(heroInterval);
    if (trending.length > 1) heroInterval = setInterval(() => rotateBanner(), 7000);
  } catch (err) {
    console.warn('Hero fallback ativado: ', err);
    if (!heroCarousel) return;
    heroCarousel.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'hero-slide fallback active';
    fallback.innerHTML = `<div class="hero-overlay"></div><div class="hero-content"><h2>CineStream</h2><p>Conteúdo temporariamente indisponível.</p></div>`;
    heroCarousel.appendChild(fallback);
  }
}
function rotateBanner() {
  if (!heroCarousel) return;
  const slides = heroCarousel.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add('active');
}

/* ---------- genres ---------- */
async function loadGenres() {
  try {
    const movieData = await cachedFetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=pt-BR`);
    const genres = movieData.genres || [];
    populateGenreBar(genres);
  } catch (e) {
    console.warn('Erro ao carregar gêneros', e);
    populateGenreBar([]);
  }
}
function populateGenreBar(genres) {
  if (!genreScroller) return;
  genreScroller.innerHTML = '';
  const btnAll = createGenreButton('Todos', 'catalog');
  btnAll.classList.add('active');
  genreScroller.appendChild(btnAll);
  genres.forEach(g => {
    const endpoint = `/discover/movie?with_genres=${g.id}`;
    const b = createGenreButton(g.name, endpoint, g.id);
    genreScroller.appendChild(b);
  });
  const arr = Array.from(genreScroller.querySelectorAll('.genre-button'));
  arr.forEach((btn, idx) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      arr.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      smoothCenterScroll(btn);
      const endpoint = btn.dataset.endpoint;
      if (!endpoint || endpoint === 'catalog') loadCatalog();
      else if (endpoint === 'favorites') loadFavoritesCatalog();
      else loadCategory(endpoint, btn.dataset.title || btn.textContent.trim(), 1);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); (arr[idx + 1] || arr[0]).focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); (arr[idx - 1] || arr[arr.length - 1]).focus(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });
  requestAnimationFrame(() => { const active = genreScroller.querySelector('.genre-button.active'); if (active) smoothCenterScroll(active); });
}
function createGenreButton(name, endpoint = 'catalog', id) {
  const b = document.createElement('button'); b.className = 'genre-button'; b.setAttribute('role', 'tab'); b.textContent = name; b.dataset.endpoint = endpoint; b.dataset.title = name; if (id) b.dataset.genreId = id; return b;
}
function smoothCenterScroll(el) {
  if (!genreScroller || !el) return;
  const scRect = genreScroller.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const currentScroll = genreScroller.scrollLeft;
  const elCenter = (elRect.left - scRect.left) + elRect.width / 2;
  const target = Math.max(0, currentScroll + elCenter - scRect.width / 2);
  genreScroller.scrollTo({ left: target, behavior: 'smooth' });
}

/* ---------- display cards ---------- */
function displayResults(results = [], container = document.getElementById('results-container'), forcedType = null) {
  if (!container) return;
  if (!Array.isArray(results)) results = [];
  const mapped = results.map(it => ({ ...it, media_type: it.media_type || forcedType, title: it.title || it.name }));
  const valid = mapped.filter(i => (i.media_type === 'movie' || i.media_type === 'tv') && (i.poster_path || i.logo) && i.id);
  container.innerHTML = '';
  if (!valid.length) { container.innerHTML = '<p>Nenhum resultado encontrado.</p>'; return; }
  const frag = document.createDocumentFragment();
  valid.forEach(item => {
    const type = item.media_type;
    const title = item.title;
    const mediaId = item.id;
    const posterUrl = item.poster_path ? `${TMDB_POSTER_BASE_URL}${item.poster_path}` : (item.logo || '');
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const imdbScore = item.vote_average ? item.vote_average.toFixed(1).replace('.', ',') : 'N/A';
    const fav = isFavorite(mediaId, type);
    const favIcon = fav ? '&#9829;' : '&#9825;';
    const favClass = fav ? 'is-favorite' : '';
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.dataset.id = mediaId;
    card.dataset.type = type;
    card.dataset.title = title;
    card.innerHTML = `
      <img src="${posterUrl}" alt="${title}" loading="lazy">
      <div class="card-info">
        <h3>${title}</h3>
        <p class="metadata-line"><span class="metadata-item">${year || ''}</span> <span class="metadata-item imdb-score">${imdbScore !== 'N/A' ? 'IMDb ' + imdbScore : ''}</span></p>
        <div class="card-actions">
          <button class="action-button icon-button details-button" aria-label="Detalhes">i</button>
          <button class="action-button icon-button icon-save-button" data-id="${mediaId}" data-type="${type}"><span class="icon-save ${favClass}">${favIcon}</span></button>
        </div>
      </div>`;
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

/* ---------- catalog ---------- */
async function loadCatalog() {
  try {
    if (catalogContainer) catalogContainer.style.display = 'block';
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (playerContainer) playerContainer.style.display = 'none';
    if (paginationControls) paginationControls.style.display = 'none';
    if (!catalogContainer) return;
    catalogContainer.innerHTML = '';
    const queries = [
      { endpoint: '/movie/popular', title: 'Filmes Populares da Semana', type: 'movie' },
      { endpoint: '/tv/on_the_air', title: 'Séries Atuais', type: 'tv' },
      { endpoint: '/movie/top_rated', title: 'Os Filmes Mais Bem Avaliados', type: 'movie' }
    ];
    for (const q of queries) {
      const section = document.createElement('section');
      section.className = 'catalog-section';
      const rowId = `row-${q.endpoint.replace(/\W/g, '-')}`;
      section.innerHTML = `<div class="catalog-section-header"><h2>${q.title}</h2><div class="carousel-nav-controls"><button class="nav-button prev-button" data-target="${rowId}">&lt;</button><button class="nav-button next-button" data-target="${rowId}">&gt;</button></div></div><div class="carousel-container"><div class="carousel-row" id="${rowId}"></div></div>`;
      catalogContainer.appendChild(section);
      const row = section.querySelector('.carousel-row');
      try {
        const url = `${TMDB_BASE_URL}${q.endpoint}?api_key=${TMDB_API_KEY}&language=pt-BR&page=1`;
        const data = await cachedFetch(url);
        const items = data.results || [];
        items.forEach(item => {
          const type = q.type || item.media_type || 'movie';
          const title = item.title || item.name || '';
          const poster = item.poster_path ? `${TMDB_POSTER_BASE_URL}${item.poster_path}` : '';
          const card = document.createElement('div');
          card.className = 'movie-card';
          card.dataset.id = item.id;
          card.dataset.type = type;
          card.dataset.title = title;
          card.innerHTML = `<img src="${poster}" alt="${title}" loading="lazy"><div class="card-info"><h3>${title}</h3><p class="metadata-line"><span class="metadata-item">${(item.release_date || item.first_air_date || '').substring(0, 4)}</span> <span class="metadata-item imdb-score">${item.vote_average ? item.vote_average.toFixed(1) : ''}</span></p><div class="card-actions"><button class="action-button icon-button details-button">i</button><button class="action-button icon-button icon-save-button" data-id="${item.id}" data-type="${type}"><span class="icon-save">${isFavorite(item.id, type) ? '&#9829;' : '&#9825;'}</span></button></div></div>`;
          row.appendChild(card);
        });
        const prevBtn = section.querySelector('.prev-button');
        const nextBtn = section.querySelector('.next-button');
        const scrollAmount = 500;
        prevBtn?.addEventListener('click', () => row.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
        nextBtn?.addEventListener('click', () => row.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
        updateCarouselNavVisibility(row, prevBtn, nextBtn);
      } catch (errRow) {
        console.error('Erro carregar seção', q.title, errRow);
        if (row) row.innerHTML = `<p>Erro ao carregar seção.</p>`;
      }
    }
  } catch (err) {
    console.error('Erro loadCatalog', err);
    if (catalogContainer) catalogContainer.innerHTML = `<p>Erro ao carregar catálogo: ${err.message}</p>`;
  }
}
function updateCarouselNavVisibility(row, prevBtn, nextBtn) {
  if (!row || !prevBtn || !nextBtn) return;
  function check() {
    const maxScroll = row.scrollWidth - row.clientWidth;
    if (maxScroll <= 10) { prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; }
    else {
      prevBtn.style.display = row.scrollLeft <= 5 ? 'none' : 'flex';
      nextBtn.style.display = row.scrollLeft >= maxScroll - 5 ? 'none' : 'flex';
    }
  }
  check();
  row.addEventListener('scroll', check);
  window.addEventListener('resize', check);
}

/* ---------- CATEGORY e PAGINAÇÃO ---------- */
async function loadCategory(endpoint, title = "Categoria", page = 1) {
  try {
    resetToResultsView();
    currentCategoryEndpoint = endpoint;
    currentCategoryTitle = title;
    currentCategoryPage = page;
    if (!endpoint) return loadCatalog();
    const finalEndpoint = endpoint.includes('?') ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`;
    const url = `${TMDB_BASE_URL}${finalEndpoint}&api_key=${TMDB_API_KEY}&language=pt-BR`;
    const data = await cachedFetch(url);
    totalCategoryPages = data.total_pages || 1;
    const primaryType = endpoint.includes('/movie/') || endpoint.includes('discover/movie') ? 'movie' : 'tv';
    if (!resultsContainer) return;
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = `
      <section class="catalog-section">
        <h2>${title} (Página ${page})</h2>
        <div id="category-results" class="results-grid"></div>
      </section>
    `;
    displayResults(data.results || [], document.getElementById('category-results'), primaryType);
    renderPaginationNumeric();
  } catch (err) {
    console.error('Erro loadCategory', err);
    if (resultsContainer) resultsContainer.innerHTML = `<p>Erro ao carregar categoria.</p>`;
  }
}

function renderPaginationNumeric() {
  if (!paginationControls || !pageNumbersContainer || !pageInfoSpan) return;
  paginationControls.style.display = 'flex';
  pageInfoSpan.textContent = `Página ${currentCategoryPage} de ${totalCategoryPages}`;
  if (pagePrevBtn) pagePrevBtn.disabled = currentCategoryPage <= 1;
  if (pageNextBtn) pageNextBtn.disabled = currentCategoryPage >= totalCategoryPages;

  const maxButtons = 7;
  let start = Math.max(1, currentCategoryPage - Math.floor(maxButtons / 2));
  let end = start + maxButtons - 1;
  if (end > totalCategoryPages) { end = totalCategoryPages; start = Math.max(1, end - maxButtons + 1); }

  pageNumbersContainer.innerHTML = '';

  if (start > 1) {
    pageNumbersContainer.appendChild(createPageNumberBtn(1));
    if (start > 2) {
      const dots = document.createElement('div'); dots.className = 'page-dots'; dots.textContent = '...'; dots.style.color = '#aaa'; dots.style.padding = '0 6px';
      pageNumbersContainer.appendChild(dots);
    }
  }

  for (let p = start; p <= end; p++) {
    pageNumbersContainer.appendChild(createPageNumberBtn(p));
  }

  if (end < totalCategoryPages) {
    if (end < totalCategoryPages - 1) {
      const dots = document.createElement('div'); dots.className = 'page-dots'; dots.textContent = '...'; dots.style.color = '#aaa'; dots.style.padding = '0 6px';
      pageNumbersContainer.appendChild(dots);
    }
    pageNumbersContainer.appendChild(createPageNumberBtn(totalCategoryPages));
  }
}

function createPageNumberBtn(pageNum) {
  const btn = document.createElement('button');
  btn.className = 'page-number-btn';
  btn.textContent = pageNum;
  btn.dataset.page = pageNum;
  if (pageNum === currentCategoryPage) {
    btn.classList.add('active');
    btn.setAttribute('aria-current', 'page');
    btn.disabled = true;
  }
  btn.addEventListener('click', () => {
    const page = parseInt(btn.dataset.page);
    if (!isNaN(page) && page !== currentCategoryPage) loadCategory(currentCategoryEndpoint, currentCategoryTitle, page);
  });
  return btn;
}

/* ---------- favoritos / live tv / details / player (mantidos) ---------- */
/* ... (para brevidade no chat, as funções relevantes são idênticas às versões anteriores) ... */

/* Implementações resumidas e não alteradas: loadFavoritesCatalog, fetchAndCombineIPTVData, loadLiveTV, playLiveStream, showDetailsModal, closeDetailsModal, getImdbId, loadSeriesOptions, updateEpisodeOptions, handleWatchClick, createPlayer */
async function loadFavoritesCatalog() {
  try {
    resetToResultsView();
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '<section class="catalog-section"><h2>Favoritos</h2><div id="favorites-grid" class="results-grid">Carregando...</div></section>';
    const favItems = favoritesList.slice();
    if (!favItems.length) { document.getElementById('favorites-grid').innerHTML = '<p>Você ainda não adicionou favoritos.</p>'; return; }
    const promises = favItems.map(it => {
      const [type, id] = it.split('-');
      return fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`).then(r => r.ok ? r.json() : null).catch(() => null);
    });
    const raw = await Promise.all(promises);
    const valid = raw.filter(x => x && x.id);
    const grid = document.getElementById('favorites-grid'); grid.innerHTML = '';
    displayResults(valid.map(item => ({ ...item, media_type: item.title ? 'movie' : 'tv' })), grid);
    if (paginationControls) paginationControls.style.display = 'none';
  } catch (err) {
    console.error('Erro loadFavoritesCatalog', err);
    if (resultsContainer) resultsContainer.innerHTML = `<p>Erro ao carregar favoritos.</p>`;
  }
}

async function fetchAndCombineIPTVData() {
  try {
    const [channels, streams, logos] = await Promise.all([
      cachedFetch(`${IPTV_ORG_API_BASE}/channels.json`),
      cachedFetch(`${IPTV_ORG_API_BASE}/streams.json`),
      cachedFetch(`${IPTV_ORG_API_BASE}/logos.json`)
    ]);
    const channelMap = new Map((channels || []).map(c => [c.id, c]));
    const logoMap = new Map(); (logos || []).forEach(l => { if (l.channel && !logoMap.has(l.channel)) logoMap.set(l.channel, l.url); });
    const combined = (streams || []).filter(s => s.url && s.url.endsWith('.m3u8')).map(s => {
      const ch = channelMap.get(s.channel); if (!ch) return null;
      return { id: s.channel, name: ch.name, category: (ch.categories || []).join(', ') || 'Geral', streamUrl: s.url, logoUrl: logoMap.get(ch.id) || '' };
    }).filter(Boolean).filter((v, i, self) => i === self.findIndex(t => t.id === v.id));
    return combined;
  } catch (e) { console.warn('Erro IPTV', e); return []; }
}
let iptvChannels = [];
async function loadLiveTV() {
  try {
    resetToResultsView();
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '<section class="catalog-section"><h2>TV ao Vivo</h2><div id="channels-grid" class="results-grid">Buscando canais...</div></section>';
    if (!iptvChannels.length) iptvChannels = await fetchAndCombineIPTVData();
    if (!iptvChannels.length) { resultsContainer.innerHTML = '<p>Erro: não foi possível carregar canais.</p>'; return; }
    const grid = document.getElementById('channels-grid'); grid.innerHTML = '';
    iptvChannels.forEach(ch => {
      const card = document.createElement('div'); card.className = 'movie-card channel-card';
      card.innerHTML = `<img src="${ch.logoUrl || 'https://via.placeholder.com/200x200?text=Logo'}" alt="${ch.name}" loading="lazy"><div class="card-info"><h3>${ch.name}</h3><p style="color:#ccc">${ch.category}</p><button class="watch-channel-button action-button primary-button" data-stream="${ch.streamUrl}">ASSISTIR AO VIVO</button></div>`;
      grid.appendChild(card);
    });
    document.querySelectorAll('.watch-channel-button').forEach(btn => btn.addEventListener('click', (e) => { const url = e.currentTarget.dataset.stream; playLiveStream(url); }));
    if (paginationControls) paginationControls.style.display = 'none';
  } catch (err) { console.error('Erro loadLiveTV', err); if (resultsContainer) resultsContainer.innerHTML = '<p>Erro ao carregar TV Ao Vivo.</p>'; }
}
function playLiveStream(url) {
  try {
    resetToPlayerView('Ao Vivo');
    if (!videoPlayerDiv) return;
    videoPlayerDiv.innerHTML = '';
    const video = document.createElement('video'); video.controls = true; video.autoplay = true; video.style.width = '100%'; video.style.height = '100%';
    videoPlayerDiv.appendChild(video);
    if (typeof Hls !== 'undefined' && Hls.isSupported()) { const hls = new Hls(); hls.loadSource(url); hls.attachMedia(video); }
    else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
    else videoPlayerDiv.innerHTML = '<p>Seu navegador não suporta M3U8.</p>';
  } catch (e) { console.error('playLiveStream error', e); }
}

async function showDetailsModal(tmdbId, mediaType) {
  try {
    if (!detailsModal || !detailsContent) return;
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.classList.add('open');
    detailsModal.setAttribute('aria-hidden', 'false');
    const type = mediaType === 'movie' ? 'movie' : 'tv';
    const data = await cachedFetch(`${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
    const title = data.title || data.name || '';
    const posterUrl = data.poster_path ? `${TMDB_POSTER_BASE_URL}${data.poster_path}` : '';
    const year = (data.release_date || data.first_air_date || '').substring(0, 4);
    const overview = data.overview || 'Sinopse não disponível.';
    const fav = isFavorite(tmdbId, mediaType);
    detailsContent.innerHTML = `<div style="display:flex;gap:20px;align-items:flex-start"><img src="${posterUrl}" alt="${title}" style="width:180px;border-radius:8px;object-fit:cover"><div><h3>${title}</h3><p style="color:#bdbdbd">${year}</p><p style="color:#e5e5e5;max-width:600px">${overview}</p><div style="margin-top:12px;display:flex;gap:12px"><button class="action-button primary-button watch-button" data-id="${tmdbId}" data-type="${mediaType}" data-title="${title}">▶︎ Assistir</button><button class="action-button icon-button modal-favorite-button" data-id="${tmdbId}" data-type="${mediaType}"><span class="icon-save ${fav ? 'is-favorite' : ''}">${fav ? '&#9829;' : '&#9825;'}</span></button></div></div></div>`;
    detailsContent.querySelector('.watch-button')?.addEventListener('click', (e) => { const d = e.currentTarget.dataset; closeDetailsModal(); handleWatchClick(d.id, d.type, d.title); });
    detailsContent.querySelector('.modal-favorite-button')?.addEventListener('click', (e) => { const d = e.currentTarget.dataset; toggleFavorite(d.id, d.type); });
  } catch (err) { console.error('Erro showDetailsModal', err); if (detailsContent) detailsContent.innerHTML = '<p>Erro ao carregar detalhes.</p>'; }
}
function closeDetailsModal() { if (detailsModal) { detailsModal.classList.remove('open'); detailsModal.setAttribute('aria-hidden', 'true'); } }

async function getImdbId(tmdbId, mediaType) {
  try { const type = mediaType === 'movie' ? 'movie' : 'tv'; const data = await cachedFetch(`${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`); return data.imdb_id || null; } catch (e) { return null; }
}
async function loadSeriesOptions(tmdbId) {
  try {
    const data = await cachedFetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
    const seasons = (data.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0);
    currentMedia.seasons = seasons;
    if (seasonSelect) {
      seasonSelect.innerHTML = '';
      seasons.forEach(s => { const o = document.createElement('option'); o.value = s.season_number; o.textContent = `T${s.season_number}`; seasonSelect.appendChild(o); });
      updateEpisodeOptions(seasons.length ? seasons[0].season_number : 1);
    }
  } catch (e) { console.warn('Erro temporadas', e); }
}
function updateEpisodeOptions(seasonNumber) {
  const season = currentMedia.seasons.find(s => s.season_number == seasonNumber);
  if (!episodeSelect) return;
  episodeSelect.innerHTML = '';
  if (season && season.episode_count > 0) { for (let i = 1; i <= season.episode_count; i++) { const o = document.createElement('option'); o.value = i; o.textContent = `E${i}`; episodeSelect.appendChild(o); } currentMedia.currentEpisode = 1; } else currentMedia.currentEpisode = null;
}
async function handleWatchClick(tmdbId, mediaType, mediaTitle) {
  try {
    currentMedia.tmdbId = parseInt(tmdbId);
    currentMedia.mediaType = mediaType;
    currentMedia.title = mediaTitle;
    resetToPlayerView(mediaTitle);
    if (mediaType === 'tv') { if (seriesSelectors) seriesSelectors.style.display = 'flex'; await loadSeriesOptions(tmdbId); } else if (seriesSelectors) seriesSelectors.style.display = 'none';
    createPlayer();
  } catch (e) { console.error('Erro handleWatchClick', e); }
}
function createPlayer() {
  try {
    const source = playerSourceSelect?.value || 'megaembed.com';
    const { tmdbId, mediaType, currentSeason, currentEpisode } = currentMedia;
    if (!videoPlayerDiv) return;
    videoPlayerDiv.innerHTML = '';
    let embedUrl = '';
    if (source === 'megaembed.com') embedUrl = mediaType === 'movie' ? `https://megaembed.com/embed/${tmdbId}` : `https://megaembed.com/embed/${tmdbId}/${currentSeason || 1}/${currentEpisode || 1}`;
    else if (source === '2embed.top') embedUrl = mediaType === 'movie' ? `https://2embed.top/embed/movie/${tmdbId}` : `https://2embed.top/embed/tv/${tmdbId}/${currentSeason || 1}/${currentEpisode || 1}`;
    else if (source === 'vidsrc-embed.ru') { const lang = '&ds_lang=pt'; embedUrl = mediaType === 'movie' ? `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}${lang}` : `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${currentSeason || 1}&episode=${currentEpisode || 1}${lang}`; }
    else { videoPlayerDiv.innerHTML = '<p>Fonte desconhecida</p>'; return; }
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    videoPlayerDiv.appendChild(iframe);
  } catch (e) { console.error('Erro createPlayer', e); if (videoPlayerDiv) videoPlayerDiv.innerHTML = '<p>Erro ao carregar player</p>'; }
}

/* ---------- view helpers ---------- */
function resetToResultsView() {
  if (catalogContainer) catalogContainer.style.display = 'none';
  if (resultsContainer) resultsContainer.style.display = 'block';
  if (playerContainer) playerContainer.style.display = 'none';
  if (paginationControls) paginationControls.style.display = 'none';
}
function resetToPlayerView(title) {
  if (catalogContainer) catalogContainer.style.display = 'none';
  if (resultsContainer) resultsContainer.style.display = 'none';
  if (playerContainer) playerContainer.style.display = 'block';
  if (playerTitle) playerTitle.textContent = title || 'Player';
  if (paginationControls) paginationControls.style.display = 'none';
}

/* ---------- eventos globais ---------- */
function attachGlobalEvents() {
  document.body.addEventListener('click', (e) => {
    const detailBtn = e.target.closest('.details-button');
    if (detailBtn) { e.stopPropagation(); const card = detailBtn.closest('.movie-card'); if (card) showDetailsModal(card.dataset.id, card.dataset.type); return; }
    const favBtn = e.target.closest('.icon-save-button');
    if (favBtn) { e.stopPropagation(); toggleFavorite(favBtn.dataset.id, favBtn.dataset.type); return; }
    const watchChannelBtn = e.target.closest('.watch-channel-button');
    if (watchChannelBtn) { const url = watchChannelBtn.dataset.stream; if (url) playLiveStream(url); return; }
    const card = e.target.closest('.movie-card');
    if (card && !e.target.closest('.icon-button') && !e.target.closest('.details-button')) { handleWatchClick(card.dataset.id, card.dataset.type, card.dataset.title); return; }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('#main-nav a');
    if (!a) return;
    e.preventDefault();
    const endpoint = a.dataset.endpoint;
    const title = a.dataset.title || a.textContent.trim();
    if (!endpoint || endpoint === 'catalog') loadCatalog();
    else if (endpoint === 'live_tv') loadLiveTV();
    else if (endpoint === 'favorites') loadFavoritesCatalog();
    else loadCategory(endpoint, title, 1);
  });

  const debouncedSearch = debounce(q => searchMedia(q), 300);
  if (searchButton) searchButton.addEventListener('click', () => { const q = (searchInput?.value || '').trim(); if (q) searchMedia(q); else loadCatalog(); });
  if (searchInput) {
    searchInput.addEventListener('input', (e) => { const q = e.target.value.trim(); if (!q) return; debouncedSearch(q); });
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const q = searchInput.value.trim(); if (q) searchMedia(q); } });
  }

  if (closeButton) closeButton.addEventListener('click', () => { closeDetailsModal(); });
  window.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });

  if (backButton) backButton.addEventListener('click', () => { if (catalogContainer) { catalogContainer.style.display = 'block'; resultsContainer.style.display = 'none'; playerContainer.style.display = 'none'; } });

  if (seasonSelect) seasonSelect.addEventListener('change', (e) => { currentMedia.currentSeason = parseInt(e.target.value); updateEpisodeOptions(currentMedia.currentSeason); });
  if (episodeSelect) episodeSelect.addEventListener('change', (e) => { currentMedia.currentEpisode = parseInt(e.target.value); });

  if (menuToggle) menuToggle.addEventListener('click', () => { if (!mainNav) return; mainNav.classList.toggle('nav-hidden'); });

  if (genreScroller) genreScroller.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); genreScroller.scrollBy({ left: 200, behavior: 'smooth' }); } if (e.key === 'ArrowLeft') { e.preventDefault(); genreScroller.scrollBy({ left: -200, behavior: 'smooth' }); } });

  if (genrePrev) genrePrev.addEventListener('click', () => { if (genreScroller) genreScroller.scrollBy({ left: -300, behavior: 'smooth' }); });
  if (genreNext) genreNext.addEventListener('click', () => { if (genreScroller) genreNext.scrollBy({ left: 300, behavior: 'smooth' }); });
}

/* ---------- search ---------- */
async function searchMedia(query) {
  if (!query) return;
  try {
    resetToResultsView();
    if (!resultsContainer) return;
    resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid">Buscando...</div></section>`;
    const data = await cachedFetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`);
    displayResults(data.results || [], document.getElementById('search-results'));
    if (paginationControls) paginationControls.style.display = 'none';
  } catch (err) {
    console.error('Erro searchMedia', err);
    if (resultsContainer) resultsContainer.innerHTML = `<p>Erro: ${err.message}</p>`;
  }
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    initRefs();
    attachGlobalEvents();
    favoritesList = loadFavoritesFromLocalStorage();
    loadCatalog();
    loadHeroBanner();
    loadGenres();
  } catch (err) {
    console.error('Erro inicialização', err);
  }
});
