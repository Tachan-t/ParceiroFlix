// ATENÇÃO: Substitua 'SUA_CHAVE_TMDB' pela sua chave de API real do TMDB.
const TMDB_API_KEY = '62fd8e76492e4bdda5e40b8eb6520a00'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Variáveis Base URL (CRÍTICAS: Declaradas primeiro)
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'; 
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500'; 

// IPTV-ORG (Fonte oficial e estável para streams)
const IPTV_ORG_API_BASE = 'https://iptv-org.github.io/api'; 
const REIDOSCANAIS_BASE_URL = 'https://api.reidoscanais.io'; 

// Elementos HTML
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const mainNav = document.getElementById('main-nav'); 
const heroBannerContainer = document.getElementById('hero-banner-container'); 
const heroCarousel = document.getElementById('hero-carousel');
const catalogContainer = document.getElementById('catalog-container');
const resultsContainer = document.getElementById('results-container');
const playerContainer = document.getElementById('player-container');
const videoPlayerDiv = document.getElementById('video-player');
const playerTitle = document.getElementById('player-title');
const backButton = document.getElementById('back-button');
const playerSourceSelect = document.getElementById('player-source');
const loadPlayerButton = document.getElementById('load-player-button');
const logoContainer = document.querySelector('.logo-container'); 

const moviesDropdown = document.getElementById('movies-dropdown');
const tvDropdown = document.getElementById('tv-dropdown');

// Elementos para Séries/Modal
const seriesSelectors = document.getElementById('series-selectors');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');
const detailsModal = document.getElementById('details-modal');
const detailsContent = document.getElementById('details-content');
const closeButton = document.querySelector('.close-button'); 

// Variáveis de Estado
let currentMedia = {
    tmdbId: null, mediaType: null, title: null, imdbId: null, 
    seasons: [], currentSeason: 1, currentEpisode: 1 
};
let currentCategory = { 
    endpoint: null, title: null, page: 1, totalPages: 1
};
let currentSlide = 0; 
let movieGenres = [];
let tvGenres = [];
let iptvChannels = []; // Armazenará os dados combinados do IPTV-ORG

// Variável para armazenar a lista de IDs de favoritos
let favoritesList = loadFavoritesFromLocalStorage();


// --- FUNÇÕES DE FAVORITOS (localStorage) ---

/**
 * Carrega a lista de IDs de favoritos do localStorage.
 * @returns {Array<string>} A lista de IDs de mídia salvos.
 */
function loadFavoritesFromLocalStorage() {
    try {
        const stored = localStorage.getItem('cineStreamFavorites');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Erro ao carregar favoritos do localStorage:", e);
        return [];
    }
}

/**
 * Salva a lista atual de favoritos no localStorage.
 */
function saveFavoritesToLocalStorage() {
    try {
        localStorage.setItem('cineStreamFavorites', JSON.stringify(favoritesList));
    } catch (e) {
        console.error("Erro ao salvar favoritos no localStorage:", e);
    }
}

/**
 * Adiciona ou remove um item da lista de favoritos.
 * @param {string} tmdbId O ID do TMDB.
 * @param {string} mediaType O tipo (movie ou tv).
 */
function toggleFavorite(tmdbId, mediaType) {
    const id = `${mediaType}-${tmdbId}`; // Chave única
    const index = favoritesList.indexOf(id);

    if (index === -1) {
        // Adicionar favorito
        favoritesList.push(id);
        alert(`O item foi adicionado aos Favoritos!`);
    } else {
        // Remover favorito
        favoritesList.splice(index, 1);
        alert(`O item foi removido dos Favoritos.`);
    }

    saveFavoritesToLocalStorage();
    // Atualiza o visual do botão no modal, se estiver aberto
    if (detailsModal.style.display === 'block') {
        const modalButton = detailsContent.querySelector('.modal-favorite-button .icon-save');
        if (modalButton) {
            updateFavoriteButtonState(modalButton, tmdbId, mediaType);
        }
    }
    // Atualiza o visual do botão no card
    updateAllCardFavoriteIcons(tmdbId, mediaType);

    // Se estiver na seção de favoritos, recarrega a lista para mostrar a remoção
    if (currentCategory.endpoint === 'favorites') {
        loadFavoritesCatalog();
    }
}

/**
 * Verifica se um item está nos favoritos.
 * @param {string} tmdbId 
 * @param {string} mediaType 
 * @returns {boolean}
 */
function isFavorite(tmdbId, mediaType) {
    const id = `${mediaType}-${tmdbId}`;
    return favoritesList.includes(id);
}

/**
 * Atualiza o ícone do botão Favoritar.
 * @param {HTMLElement} buttonElement O elemento do ícone (o <span> com o ícone).
 * @param {string} tmdbId O ID do TMDB.
 * @param {string} mediaType O tipo (movie ou tv).
 */
function updateFavoriteButtonState(buttonElement, tmdbId, mediaType) {
    if (isFavorite(tmdbId, mediaType)) {
        buttonElement.innerHTML = '&#9829;'; // Coração preenchido
        buttonElement.classList.add('is-favorite');
    } else {
        buttonElement.innerHTML = '&#9825;'; // Coração vazio
        buttonElement.classList.remove('is-favorite');
    }
}

/**
 * Atualiza o estado de todos os ícones de favoritos para um item específico.
 */
function updateAllCardFavoriteIcons(tmdbId, mediaType) {
    const selector = `.movie-card[data-id="${tmdbId}"][data-type="${mediaType}"] .icon-save-button .icon-save`;
    document.querySelectorAll(selector).forEach(buttonElement => {
        updateFavoriteButtonState(buttonElement, tmdbId, mediaType);
    });
}


// --- FUNÇÕES DE HERO BANNER ---

async function loadHeroBanner() {
    const url = `${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const trendingItems = data.results.filter(item => item.backdrop_path).slice(0, 5); 
        
        heroCarousel.innerHTML = ''; 
        
        trendingItems.forEach((item, index) => {
            const backdropUrl = `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}`;
            const title = item.title || item.name;
            const overview = item.overview.length > 200 ? item.overview.substring(0, 200) + '...' : item.overview;

            const slide = document.createElement('div');
            slide.className = 'hero-slide';
            if (index === 0) {
                slide.classList.add('active'); 
            }
            
            slide.style.backgroundImage = `url(${backdropUrl})`;
            
            slide.innerHTML = `
                <div class="hero-content">
                    <h2>${title}</h2>
                    <p>${overview}</p>
                    <button class="hero-watch-button" 
                            data-id="${item.id}" 
                            data-type="${item.media_type || 'movie'}" 
                            data-title="${title}">
                        ASSISTIR FILME
                    </button>
                </div>
            `;
            heroCarousel.appendChild(slide);
        });

        heroBannerContainer.style.display = 'block';

        heroCarousel.querySelectorAll('.hero-watch-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                const title = e.target.dataset.title;
                handleWatchClick(id, type, title);
            });
        });

        if (trendingItems.length > 1) {
            setInterval(rotateBanner, 8000); 
        }

    } catch (error) {
        console.error('Erro ao carregar Hero Banner:', error);
        heroBannerContainer.style.display = 'none';
    }
}

function rotateBanner() {
    const slides = heroCarousel.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    slides[currentSlide].classList.remove('active');
    
    currentSlide = (currentSlide + 1) % slides.length;
    
    slides[currentSlide].classList.add('active');
}


// --- FUNÇÕES DE GÊNEROS ---

async function loadGenres() {
    const movieUrl = `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=pt-BR`;
    const tvUrl = `${TMDB_BASE_URL}/genre/tv/list?api_key=${TMDB_API_KEY}&language=pt-BR`;

    try {
        const [movieResponse, tvResponse] = await Promise.all([fetch(movieUrl), fetch(tvUrl)]);
        const movieData = await movieResponse.json();
        const tvData = await tvResponse.json();

        movieGenres = movieData.genres;
        tvGenres = tvData.genres;

        populateDropdowns();

    } catch (error) {
        console.error('Erro ao carregar gêneros:', error);
    }
}

function populateDropdowns() {
    
    const movieSeparator = document.createElement('hr');
    moviesDropdown.appendChild(movieSeparator);
    
    const tvSeparator = document.createElement('hr');
    tvDropdown.appendChild(tvSeparator);
    
    movieGenres.forEach(genre => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-endpoint="/discover/movie?with_genres=${genre.id}" data-title="${genre.name}">${genre.name}</a>`;
        moviesDropdown.appendChild(li);
    });

    tvGenres.forEach(genre => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-endpoint="/discover/tv?with_genres=${genre.id}" data-title="${genre.name}">${genre.name}</a>`;
        tvDropdown.appendChild(li);
    });
}


// --- 1. FUNÇÕES DE UTILIDADE E LISTENERS ---

function attachListeners() {
    // Mantido, mas não usado para cards de catálogo (Filmes/Séries)
}

async function getImdbId(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.imdb_id) {
            currentMedia.imdbId = data.imdb_id;
        }

    } catch (error) {
        console.warn('Não foi possível obter o IMDB ID.', error);
    }
}

/**
 * Funcao para resetar a visualizacao e limpar os containers principais.
 */
function resetView(targetContainerId) {
    catalogContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
    playerContainer.style.display = 'none';
    
    // CORREÇÃO CRÍTICA: Garante que o Modal de Detalhes esteja sempre escondido ao resetar a view
    detailsModal.style.display = 'none'; 
    
    if (targetContainerId !== 'catalog-container') {
        catalogContainer.innerHTML = '';
    }
    if (targetContainerId !== 'results-container') {
        resultsContainer.innerHTML = '';
    }
    
    const target = document.getElementById(targetContainerId);
    if (target) {
        target.style.display = targetContainerId === 'results-container' ? 'grid' : 'block';
    }
    
    // Oculta/Exibe o banner
    if (targetContainerId === 'catalog-container' && currentCategory.endpoint !== 'live_tv') {
        heroBannerContainer.style.display = 'block';
    } else {
        heroBannerContainer.style.display = 'none';
    }
}

// --- 2. FUNÇÕES DE VISUALIZAÇÃO E CATÁLOGO ---

const catalogQueries = [
    { endpoint: '/trending/movie/week', title: 'Filmes Populares da Semana', type: 'movie' },
    { endpoint: '/tv/on_the_air', title: 'Séries Atuais', type: 'tv' },
    { endpoint: '/movie/top_rated', title: 'Os Filmes Mais Bem Avaliados', type: 'movie' },
];

/**
 * Carrega e exibe as listas de catálogo na tela inicial (CARROSSEL).
 */
async function loadCatalog() {
    resetView('catalog-container'); 
    currentCategory.endpoint = null; 
    currentCategory.page = 1;
    const scrollAmount = 600; // Quantidade de pixels para rolar (aproximadamente 3 cards)

    for (const query of catalogQueries) {
        const url = `${TMDB_BASE_URL}${query.endpoint}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            const section = document.createElement('section');
            section.className = 'catalog-section';
            
            const rowId = `row-${query.endpoint.replace(/\//g, '-')}`;
            // Estrutura atualizada para o posicionamento dos botões no topo
            section.innerHTML = `
                <div class="catalog-section-header">
                    <h2>${query.title}</h2>
                    <div class="carousel-nav-controls">
                        <button class="nav-button prev-button" data-dir="-1" data-target="${rowId}">&lt;</button>
                        <button class="nav-button next-button" data-dir="1" data-target="${rowId}">&gt;</button>
                    </div>
                </div>
                <div class="carousel-container">
                    <div class="carousel-row" id="${rowId}"></div>
                </div>
            `;
            catalogContainer.appendChild(section);

            const carouselRow = section.querySelector('.carousel-row');
            displayResults(data.results, carouselRow, query.type);
            
            const navButtons = section.querySelectorAll('.nav-button');
            const row = document.getElementById(rowId);

            navButtons.forEach(button => {
                const direction = parseInt(button.getAttribute('data-dir'));
                
                button.addEventListener('click', () => {
                    row.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
                });
            });
            
            // --- Lógica de Mostrar/Esconder Botões de Navegação (UX) ---
            const updateVisibility = () => {
                const maxScroll = row.scrollWidth - row.clientWidth;
                
                if (row.scrollWidth > row.clientWidth) {
                    
                    // Mostra o botão 'Próximo' se não estiver no final
                    section.querySelector('.nav-button.next-button').style.display = (row.scrollLeft >= maxScroll - 5) ? 'none' : 'flex';
                    // Mostra o botão 'Anterior' se não estiver no início
                    section.querySelector('.nav-button.prev-button').style.display = (row.scrollLeft <= 5) ? 'none' : 'flex';

                } else {
                    // Se não há scroll, esconde ambos
                    navButtons.forEach(b => b.style.display = 'none');
                }
            };

            // Verifica a visibilidade no carregamento e ao rolar
            row.addEventListener('scroll', updateVisibility);
            // Pequeno atraso para garantir que as imagens carreguem e o scrollWidth seja correto
            setTimeout(updateVisibility, 500); 

        } catch (error) {
            console.error(`Erro ao carregar catálogo ${query.title}:`, error);
        }
    }
}

/**
 * Renderiza os botões de paginação na tela de categoria.
 */
function renderPagination(totalPages, currentPage, endpoint, title) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-controls';

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (currentPage > 1) {
        paginationContainer.innerHTML += `<button data-page="${currentPage - 1}">Anterior</button>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.innerHTML += `<button data-page="${i}" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationContainer.innerHTML += `<button data-page="${currentPage + 1}">Próxima</button>`;
    }

    const resultsSection = resultsContainer.querySelector('.catalog-section');
    if (resultsSection) {
        resultsSection.appendChild(paginationContainer);
        
        paginationContainer.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const newPage = parseInt(e.target.dataset.page);
                loadCategory(endpoint, title, newPage);
                window.scrollTo(0, 0); 
            });
        });
    }
}


/**
 * Carrega filmes/séries baseados em um endpoint de categoria (VER TODOS / GRADE).
 */
async function loadCategory(endpoint, title, page = 1) {
    // Rota de TV ao Vivo
    if (endpoint === 'live_tv') {
        loadLiveTV();
        return;
    }

    // Rota de Favoritos
    if (endpoint === 'favorites') {
        loadFavoritesCatalog();
        return;
    }


    resetView('results-container');
    resultsContainer.innerHTML = `<p>Carregando ${title}... (Página ${page})</p>`;

    currentCategory.endpoint = endpoint;
    currentCategory.title = title;
    currentCategory.page = page;

    const finalEndpoint = endpoint.includes('?') ? `${endpoint}&page=${page}` : `${endpoint}?page=${page}`;
    const url = `${TMDB_BASE_URL}${finalEndpoint}&api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    const primaryType = endpoint.includes('/movie/') || endpoint.includes('discover/movie') ? 'movie' : 'tv';

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            resultsContainer.innerHTML = `<p>Nenhum resultado encontrado na página ${page}.</p>`;
            return;
        }

        currentCategory.totalPages = Math.min(500, data.total_pages);
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>${title} (Página ${page} de ${currentCategory.totalPages})</h2><div id="category-results" class="results-grid"></div></section>`;
        const categoryResultsContainer = document.getElementById('category-results');

        displayResults(data.results, categoryResultsContainer, primaryType);
        
        renderPagination(currentCategory.totalPages, currentCategory.page, endpoint, title);

    } catch (error) {
        console.error(`Erro ao carregar categoria ${title}:`, error);
        resultsContainer.innerHTML = `<p>Erro ao carregar categoria: ${error.message}</p>`;
    }
}


/**
 * Exibe os resultados na tela (MODIFICADA PARA CLIQUE NO CARD).
 */
function displayResults(results, container = resultsContainer, forcedType = null) {
    
    const mappedResults = results.map(item => ({
        ...item,
        media_type: item.media_type || forcedType,
        title: item.title || item.name
    }));

    const validResults = mappedResults.filter(item => 
        (item.media_type === 'movie' || item.media_type === 'tv') && 
        item.poster_path && 
        item.id
    );

    if (validResults.length === 0 && container === resultsContainer) {
        container.innerHTML = '<p>Nenhum resultado encontrado.</p>';
        return;
    }

    container.innerHTML = '';
    
    // Renderiza os cards
    validResults.forEach(item => {
        const type = item.media_type;
        const title = item.title; 
        const mediaId = item.id;
        const posterUrl = `${TMDB_POSTER_BASE_URL}${item.poster_path}`;
        
        // --- Simulação dos Metadados para o Card (Ano e Nota) ---
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const imdbScore = item.vote_average ? item.vote_average.toFixed(1).replace('.', ',') : 'N/A';
        
        // Adicionado: Define o ícone inicial com base no estado de favorito
        const isFav = isFavorite(mediaId, type);
        const favIcon = isFav ? '&#9829;' : '&#9825;'; // Coração preenchido ou vazio
        const favClass = isFav ? 'is-favorite' : '';

        const card = document.createElement('div');
        card.className = 'movie-card';
        
        // Renderiza a imagem e os metadados estáticos
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}">
            <div class="card-info">
                <h3>${title}</h3>
                <p class="metadata-line">
                    <span class="metadata-item">${year}</span>
                    <span class="metadata-item imdb-score">IMDb ${imdbScore}</span>
                </p>
                <div class="card-actions">
                    <button class="action-button icon-button details-button">i</button>
                    <button class="action-button icon-button icon-save-button" 
                            data-id="${mediaId}" data-type="${type}">
                        <span class="icon-save ${favClass}">${favIcon}</span>
                    </button>
                </div>
            </div>
        `;
        
        // 1. Adiciona os dados ao card
        card.setAttribute('data-id', mediaId);
        card.setAttribute('data-type', type);
        card.setAttribute('data-title', title);
        
        // 2. Evento CRÍTICO: Clique no card inteiro para ir para o player
        card.addEventListener('click', function(e) {
            // Verifica se o clique foi em um botão de detalhes para abrir o modal em vez do player
            if (e.target.closest('.details-button') || e.target.closest('.icon-save-button')) {
                 e.stopPropagation();
                 const id = this.getAttribute('data-id');
                 const type = this.getAttribute('data-type');
                 showDetailsModal(id, type);
                 return;
            }

            // Se for um Card de Filme/Série (clique na imagem ou área vazia), vai direto para o player
            const id = this.getAttribute('data-id');
            const type = this.getAttribute('data-type');
            const mediaTitle = this.getAttribute('data-title');
            
            handleWatchClick(id, type, mediaTitle);
        });
        
        // 3. Adiciona listeners para os botões de ícone
        card.querySelector('.details-button').addEventListener('click', function(e) {
            e.stopPropagation(); // Requisitado para evitar o clique no card
            showDetailsModal(mediaId, type);
        });
        
        card.querySelector('.icon-save-button').addEventListener('click', function(e) {
            e.stopPropagation(); // Requisitado para evitar o clique no card
            const id = this.getAttribute('data-id');
            const type = this.getAttribute('data-type');
            toggleFavorite(id, type); // Chama a função de toggle
        });


        container.appendChild(card);
    });
    
    attachChannelListeners();
}

/**
 * Carrega e exibe a lista de favoritos.
 */
async function loadFavoritesCatalog() {
    resetView('results-container');
    resultsContainer.innerHTML = '<h2>Favoritos</h2><p>Carregando seus filmes e séries favoritos...</p>';
    currentCategory.endpoint = 'favorites';
    currentCategory.title = 'Favoritos';

    const favoriteItems = loadFavoritesFromLocalStorage();

    if (favoriteItems.length === 0) {
        resultsContainer.innerHTML = `
            <section class="catalog-section">
                <h2>Seus Favoritos</h2>
                <p class="empty-list-message">
                    Você ainda não adicionou nenhum filme ou série aos seus favoritos.
                    Adicione um item clicando no ícone <span style="color: #e50914;">&#9825;</span> no card!
                </p>
            </section>
        `;
        return;
    }

    // 1. Coleta IDs de filmes e séries
    const tmdbIdsToFetch = favoriteItems.map(item => {
        const [type, id] = item.split('-');
        return { type: type, id: id };
    });

    // 2. Cria as promessas de busca no TMDB
    const fetchPromises = tmdbIdsToFetch.map(({ id, type }) => {
        const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        return fetch(url)
            .then(res => res.json())
            .catch(err => {
                console.error(`Erro ao buscar ${type} ID ${id}:`, err);
                return null;
            });
    });

    const rawResults = await Promise.all(fetchPromises);
    
    // 3. Filtra resultados válidos e renderiza
    const validResults = rawResults.filter(item => item && item.id);
    
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Seus Favoritos (${validResults.length} itens)</h2>
        <div id="favorites-grid" class="results-grid"></div>
    </section>`;
    
    const favoritesGridContainer = document.getElementById('favorites-grid');

    // Mapeia os resultados para o formato esperado pelo displayResults
    const normalizedResults = validResults.map(item => ({
        ...item,
        media_type: item.title ? 'movie' : 'tv', // Tenta inferir o tipo
    }));
    
    // Passa a lista normalizada para a função que renderiza os cards
    displayResults(normalizedResults, favoritesGridContainer);
}


/**
 * Função de busca manual (quando o usuário digita na busca).
 */
async function searchMedia(query) {
    if (!query) return; 

    resetView('results-container');
    resultsContainer.innerHTML = `<p>Buscando resultados para "${query}"...</p>`;
    currentCategory.endpoint = null; 

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid"></div></section>`;
        const searchResultsContainer = document.getElementById('search-results');

        displayResults(data.results, searchResultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 3. FUNÇÕES DE PLAYER E MODAL ---

async function loadSeriesOptions(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const validSeasons = data.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        currentMedia.seasons = validSeasons;
        
        seasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `T${season.season_number}`;
            seasonSelect.appendChild(option);
        });

        currentMedia.currentSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        updateEpisodeOptions(currentMedia.currentSeason);

    } catch (error) {
        console.error('Erro ao carregar opções de séries:', error);
        seriesSelectors.innerHTML = `<p>Erro: Falha ao carregar temporadas.</p>`;
    }
}

function updateEpisodeOptions(seasonNumber) {
    const season = currentMedia.seasons.find(s => s.season_number == seasonNumber);
    episodeSelect.innerHTML = ''; 
    if (season && season.episode_count > 0) {
        for (let i = 1; i <= season.episode_count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `E${i}`;
            episodeSelect.appendChild(option);
        }
        currentMedia.currentEpisode = 1; 
    } else {
        currentMedia.currentEpisode = null;
    }
}

async function handleWatchClick(tmdbId, mediaType, mediaTitle) {
    const mediaId = parseInt(tmdbId);
    if (isNaN(mediaId)) {
        console.error("ID de mídia inválido recebido:", tmdbId);
        return; 
    }

    Object.assign(currentMedia, {
        tmdbId: mediaId, mediaType, title: mediaTitle, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });

    resetView('player-container'); 
    playerTitle.textContent = mediaTitle;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'flex'; 
    }
    
    seriesSelectors.style.display = 'none'; 

    await getImdbId(mediaId, mediaType);
    
    if (mediaType === 'tv') {
        seriesSelectors.style.display = 'block';
        await loadSeriesOptions(mediaId);
    }
    
    createPlayer(); 
}

function createPlayer() {
    const source = playerSourceSelect.value;
    const { tmdbId, mediaType, imdbId, currentSeason, currentEpisode } = currentMedia;

    videoPlayerDiv.innerHTML = ''; 
    let embedUrl = '';
    const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
    
    if (source === 'megaembed.com') {
        if (mediaType === 'movie') {
            embedUrl = `https://megaembed.com/embed/${tmdbId}`;
        } else {
            embedUrl = `https://megaembed.com/embed/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc-embed.ru') {
        const langParam = '&ds_lang=pt'; 
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}${langParam}`;
        } else {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}&season=${currentSeason}&episode=${currentEpisode}${langParam}`;
        }
    } else if (source === '2embed.top') {
        if (mediaType === 'movie') {
            embedUrl = `https://2embed.top/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://2embed.top/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.cc') {
        const version = 'v2';
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.cc/${version}/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://vidsrc.cc/${version}/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'playerflixapi.com') {
        if (mediaType === 'movie') {
            if (!imdbId) {
                videoPlayerDiv.innerHTML = `<p>A fonte **playerflixapi.com** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
                return;
            }
            embedUrl = `https://playerflixapi.com/filme/${imdbId}`;
        } else {
            embedUrl = `https://playerflixapi.com/serie/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.to') {
        if (!imdbId) {
            videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
            return;
        }
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
             videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** não suporta seleção direta de episódio. Tente outra opção.</p>`;
             return;
        }
    } else {
        videoPlayerDiv.innerHTML = `<p>Fonte de player desconhecida.</p>`;
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true; 
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    videoPlayerDiv.appendChild(iframe);
}

async function showDetailsModal(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    // Buscamos o backdrop_path no mesmo endpoint
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const title = data.title || data.name;
        const sinopse = data.overview || 'Sinopse não disponível em Português.';
        const posterPath = data.poster_path;
        const backdropPath = data.backdrop_path; // Novo: Captura o backdrop
        
        const posterUrl = posterPath ? `${TMDB_POSTER_BASE_URL}${posterPath}` : '';
        const backdropUrl = backdropPath ? `${TMDB_IMAGE_BASE_URL}${backdropPath}` : '';
        
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const seasonsCount = data.number_of_seasons ? `${data.number_of_seasons} Temporada${data.number_of_seasons > 1 ? 's' : ''}` : null;
        const runtime = data.runtime ? `${data.runtime} min` : null;
        
        const imdbScore = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const displayType = mediaType === 'movie' ? 'Filme' : 'Série';
        
        // Favoritos
        const isFav = isFavorite(tmdbId, mediaType);
        const favIcon = isFav ? '&#9829;' : '&#9825;';
        const favClass = isFav ? 'is-favorite' : '';

        // Atualiza o fundo do modal para o efeito backdrop
        const modalContent = detailsModal.querySelector('.modal-content');
        if (backdropUrl) {
            modalContent.style.backgroundImage = `url(${backdropUrl})`;
            modalContent.classList.add('has-backdrop');
        } else {
            modalContent.style.backgroundImage = 'none';
            modalContent.classList.remove('has-backdrop');
        }

        // Metadados formatados
        const metadataHtml = [];
        if (seasonsCount) metadataHtml.push(`<span class="metadata-item">${seasonsCount}</span>`);
        if (runtime) metadataHtml.push(`<span class="metadata-item">${runtime}</span>`);
        if (year) metadataHtml.push(`<span class="metadata-item">${year}</span>`);
        if (imdbScore !== 'N/A') metadataHtml.push(`<span class="metadata-item imdb-score">IMDb ${imdbScore}</span>`);


        detailsContent.innerHTML = `
            <div class="modal-info-container">
                <img src="${posterUrl}" alt="Pôster de ${title}" class="modal-poster">
                <div class="modal-text-content">
                    
                    <h3>${title}</h3>
                    
                    <p class="modal-metadata">
                        ${metadataHtml.join('\n')}
                    </p>
                    
                    <p class="modal-sinopse">${sinopse}</p>

                    <div class="modal-actions">
                        <button class="watch-button action-button primary-button" 
                                data-id="${tmdbId}" data-type="${mediaType}" data-title="${title}">
                            ▶︎ Assistir
                        </button>
                        <button class="action-button icon-button modal-favorite-button"
                                data-id="${tmdbId}" data-type="${mediaType}">
                            <span class="icon-save ${favClass}">${favIcon}</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div style="clear: both;"></div>
        `;
        
        // Reconecta o listener para o botão Assistir no modal
        detailsContent.querySelector('.watch-button').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const title = e.target.dataset.title;
            // Fecha o modal e inicia o player
            detailsModal.style.display = 'none';
            handleWatchClick(id, type, title);
        });
        
        // Anexa o listener para o botão Favoritar no Modal
        detailsContent.querySelector('.modal-favorite-button').addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const type = e.currentTarget.dataset.type;
            toggleFavorite(id, type);
            // O toggleFavorite já chama updateFavoriteButtonState, que atualiza o ícone
        });


    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        detailsContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
        detailsModal.querySelector('.modal-content').classList.remove('has-backdrop');
        detailsModal.querySelector('.modal-content').style.backgroundImage = 'none';
    }
}


/**
 * Função para buscar e mesclar os dados de IPTV-ORG.
 */
async function fetchAndCombineIPTVData() {
    try {
        // Busca os 3 arquivos essenciais: canais, streams E logos.
        const [channelsResponse, streamsResponse, logosResponse] = await Promise.all([
            fetch(`${IPTV_ORG_API_BASE}/channels.json`),
            fetch(`${IPTV_ORG_API_BASE}/streams.json`),
            fetch(`${IPTV_ORG_API_BASE}/logos.json`) 
        ]);

        if (!channelsResponse.ok || !streamsResponse.ok || !logosResponse.ok) {
            throw new Error("Falha ao carregar um ou mais arquivos IPTV-ORG.");
        }

        const channelsData = await channelsResponse.json();
        const streamsData = await streamsResponse.json();
        const logosData = await logosResponse.json(); 
        
        // Mapeia canais e logos por ID para acesso rápido
        const channelMap = new Map(channelsData.map(c => [c.id, c]));
        // Mapeia logos pela ID do canal. Muitos canais têm várias logos; pegamos a primeira.
        const logoMap = new Map();
        logosData.forEach(logo => {
            if (logo.channel && !logoMap.has(logo.channel)) {
                logoMap.set(logo.channel, logo.url);
            }
        });


        const combinedList = streamsData
            // Filtra streams M3U8 válidos
            .filter(stream => stream.url && stream.url.endsWith('.m3u8')) 
            .map(stream => {
                const channel = channelMap.get(stream.channel);
                
                if (!channel) return null; 

                // Obtém a URL da logo diretamente do mapeamento de logos
                const logoUrl = logoMap.get(channel.id);

                return {
                    id: stream.channel,
                    name: channel.name,
                    category: channel.categories.join(', ') || 'Geral',
                    streamUrl: stream.url, 
                    // Usa a URL garantida pelo logos.json
                    logoUrl: logoUrl || 'placeholder_logo.png' 
                };
            })
            .filter(item => item !== null)
            // Remove duplicados
            .filter((value, index, self) => 
                index === self.findIndex((t) => (
                    t.id === value.id
                ))
            ); 

        return combinedList;

    } catch (error) {
        console.error('Erro CRÍTICO ao buscar e combinar dados do IPTV-ORG:', error);
        return []; 
    }
}


/**
 * Carrega a lista de canais usando a nova fonte IPTV-ORG (TODOS OS PAÍSES).
 */
async function loadLiveTV() {
    resetView('results-container'); 
    resultsContainer.innerHTML = '<h2>TV ao Vivo</h2><p>Buscando lista de canais (IPTV-ORG)...</p>';

    currentCategory.endpoint = 'live_tv'; 
    currentCategory.title = 'TV ao Vivo';
    
    // Carrega os dados APENAS se ainda não estiverem na memória
    if (iptvChannels.length === 0) {
        iptvChannels = await fetchAndCombineIPTVData();
    }

    const channels = iptvChannels;

    if (channels.length === 0) {
        resultsContainer.innerHTML = `
            <h2>TV ao Vivo</h2>
            <p style="color: red;">Erro: Não foi possível carregar a lista de canais ativos do IPTV-ORG. Tente novamente mais tarde.</p>
        `;
        return;
    }

    // Renderiza a grade de canais com o novo título
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Todos os Canais Ativos (${channels.length} itens)</h2>
        <div id="channels-grid" class="results-grid"></div>
    </section>`;
    
    const channelsGrid = document.getElementById('channels-grid');

    channels.forEach(channel => {
        const card = document.createElement('div');
        // Adiciona a classe channel-card
        card.className = 'movie-card channel-card';
        
        const logoSrc = channel.logoUrl || 'placeholder_logo.png'; 
        const channelId = channel.id; 
        const channelName = channel.name || 'Canal Desconhecido';
        const channelCategory = channel.category; 

        // Cards de TV Ao Vivo usam o card-info original (sem a lógica de hover)
        card.innerHTML = `
            <img src="${logoSrc}" 
                 alt="${channelName}" 
                 class="channel-logo" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=Logo+N%C3%A3o+Encontrada'"> 
            <div class="card-info">
                <h3>${channelName}</h3> 
                <p style="font-size: 0.9em; color: #ccc;">${channelCategory}</p>
                <button class="watch-channel-button action-button primary-button" 
                            data-channel-id="${channelId}" data-title="${channelName}" 
                            style="width: 90%; margin-top: 10px;">
                    ASSISTIR AO VIVO
                </button>
            </div>
        `;
        channelsGrid.appendChild(card);
    });
    
    attachChannelListeners();
}

/**
 * Anexa listeners para os botões de ASSISTIR AO VIVO.
 */
function attachChannelListeners() {
    document.querySelectorAll('.watch-channel-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const channelId = event.target.dataset.channelId;
            const title = event.target.dataset.title;
            
            playLiveChannel(channelId, title); 
        };
    });
}

/**
 * Carrega o canal de TV no player (USANDO SOMENTE HLS.JS).
 */
async function playLiveChannel(channelId, title) {
    resetView('player-container');
    playerTitle.textContent = title;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'none'; 
    }
    seriesSelectors.style.display = 'none'; 

    videoPlayerDiv.innerHTML = `<p>Buscando URL do stream para ${title}...</p>`;

    // Busca a URL M3U8 nos dados pré-carregados
    const channel = iptvChannels.find(c => c.id === channelId);
    const streamUrl = channel ? channel.streamUrl : null;

    if (!streamUrl) {
        videoPlayerDiv.innerHTML = `
            <div style="padding: 30px; background-color: #2a2a2a; border-radius: 8px; max-width: 500px; margin: 50px auto; text-align: center; border: 1px solid red;">
                <p style="color: red; font-size: 1.1em; margin-bottom: 15px;">
                    ❌ Stream Indisponível
                </p>
                <p style="color: #ccc; font-size: 0.9em; margin-bottom: 20px;">
                    Não foi possível encontrar a URL de stream M3U8 para **${title}** na base de dados IPTV-ORG.
                </p>
                <button onclick="loadLiveTV()" class="action-button primary-button" style="background-color: #555;">
                    Voltar para a lista
                </button>
            </div>
        `;
        return;
    }

    // Tenta reproduzir o M3U8 via HLS.js
    const video = document.createElement('video');
    video.id = 'live-video-player';
    video.controls = true;
    video.autoplay = true; 
    video.style.width = '100%';
    video.style.height = '100%';
    
    videoPlayerDiv.innerHTML = '';
    videoPlayerDiv.appendChild(video);
    
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(error => {
                console.warn('Autoplay bloqueado pelo navegador.', error);
                videoPlayerDiv.insertAdjacentHTML('beforeend', `
                    <div class="stream-info-overlay" style="margin-top: 20px;">
                        <p style="color: #ffcc00; font-weight: bold; margin-bottom: 5px;">
                            ⚠️ CLIQUE NECESSÁRIO
                        </p>
                        <p style="color: #ccc; font-size: 0.9em; margin-bottom: 0;">
                            O navegador bloqueou a reprodução automática. Clique no botão de Play no vídeo.
                        </p>
                    </div>
                `);
            });
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    } else {
         videoPlayerDiv.innerHTML = `<p style="color: red; margin-top: 50px;">
            Seu navegador não suporta o formato de stream (M3U8).
        </p>`;
    }
}


/**
 * Carrega e exibe a lista de favoritos.
 */
async function loadFavoritesCatalog() {
    resetView('results-container');
    resultsContainer.innerHTML = '<h2>Favoritos</h2><p>Carregando seus filmes e séries favoritos...</p>';
    currentCategory.endpoint = 'favorites';
    currentCategory.title = 'Favoritos';

    const favoriteItems = loadFavoritesFromLocalStorage();

    if (favoriteItems.length === 0) {
        resultsContainer.innerHTML = `
            <section class="catalog-section">
                <h2>Seus Favoritos</h2>
                <p class="empty-list-message">
                    Você ainda não adicionou nenhum filme ou série aos seus favoritos.
                    Adicione um item clicando no ícone <span style="color: #e50914;">&#9825;</span> no card!
                </p>
            </section>
        `;
        return;
    }

    // 1. Coleta IDs de filmes e séries
    const tmdbIdsToFetch = favoriteItems.map(item => {
        const [type, id] = item.split('-');
        return { type: type, id: id };
    });

    // 2. Cria as promessas de busca no TMDB
    const fetchPromises = tmdbIdsToFetch.map(({ id, type }) => {
        const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        return fetch(url)
            .then(res => res.json())
            .catch(err => {
                console.error(`Erro ao buscar ${type} ID ${id}:`, err);
                return null;
            });
    });

    const rawResults = await Promise.all(fetchPromises);
    
    // 3. Filtra resultados válidos e renderiza
    const validResults = rawResults.filter(item => item && item.id);
    
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Seus Favoritos (${validResults.length} itens)</h2>
        <div id="favorites-grid" class="results-grid"></div>
    </section>`;
    
    const favoritesGridContainer = document.getElementById('favorites-grid');

    // Mapeia os resultados para o formato esperado pelo displayResults
    const normalizedResults = validResults.map(item => ({
        ...item,
        media_type: item.title ? 'movie' : 'tv', // Tenta inferir o tipo
    }));
    
    // Passa a lista normalizada para a função que renderiza os cards
    displayResults(normalizedResults, favoritesGridContainer);
}

/**
 * Função de busca manual (quando o usuário digita na busca).
 */
async function searchMedia(query) {
    if (!query) return; 

    resetView('results-container');
    resultsContainer.innerHTML = `<p>Buscando resultados para "${query}"...</p>`;
    currentCategory.endpoint = null; 

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid"></div></section>`;
        const searchResultsContainer = document.getElementById('search-results');

        displayResults(data.results, searchResultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 3. FUNÇÕES DE PLAYER E MODAL ---

async function loadSeriesOptions(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const validSeasons = data.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        currentMedia.seasons = validSeasons;
        
        seasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `T${season.season_number}`;
            seasonSelect.appendChild(option);
        });

        currentMedia.currentSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        updateEpisodeOptions(currentMedia.currentSeason);

    } catch (error) {
        console.error('Erro ao carregar opções de séries:', error);
        seriesSelectors.innerHTML = `<p>Erro: Falha ao carregar temporadas.</p>`;
    }
}

function updateEpisodeOptions(seasonNumber) {
    const season = currentMedia.seasons.find(s => s.season_number == seasonNumber);
    episodeSelect.innerHTML = ''; 
    if (season && season.episode_count > 0) {
        for (let i = 1; i <= season.episode_count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `E${i}`;
            episodeSelect.appendChild(option);
        }
        currentMedia.currentEpisode = 1; 
    } else {
        currentMedia.currentEpisode = null;
    }
}

async function handleWatchClick(tmdbId, mediaType, mediaTitle) {
    const mediaId = parseInt(tmdbId);
    if (isNaN(mediaId)) {
        console.error("ID de mídia inválido recebido:", tmdbId);
        return; 
    }

    Object.assign(currentMedia, {
        tmdbId: mediaId, mediaType, title: mediaTitle, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });

    resetView('player-container'); 
    playerTitle.textContent = mediaTitle;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'flex'; 
    }
    
    seriesSelectors.style.display = 'none'; 

    await getImdbId(mediaId, mediaType);
    
    if (mediaType === 'tv') {
        seriesSelectors.style.display = 'block';
        await loadSeriesOptions(mediaId);
    }
    
    createPlayer(); 
}

function createPlayer() {
    const source = playerSourceSelect.value;
    const { tmdbId, mediaType, imdbId, currentSeason, currentEpisode } = currentMedia;

    videoPlayerDiv.innerHTML = ''; 
    let embedUrl = '';
    const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
    
    if (source === 'megaembed.com') {
        if (mediaType === 'movie') {
            embedUrl = `https://megaembed.com/embed/${tmdbId}`;
        } else {
            embedUrl = `https://megaembed.com/embed/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc-embed.ru') {
        const langParam = '&ds_lang=pt'; 
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}${langParam}`;
        } else {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}&season=${currentSeason}&episode=${currentEpisode}${langParam}`;
        }
    } else if (source === '2embed.top') {
        if (mediaType === 'movie') {
            embedUrl = `https://2embed.top/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://2embed.top/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.cc') {
        const version = 'v2';
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.cc/${version}/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://vidsrc.cc/${version}/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'playerflixapi.com') {
        if (mediaType === 'movie') {
            if (!imdbId) {
                videoPlayerDiv.innerHTML = `<p>A fonte **playerflixapi.com** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
                return;
            }
            embedUrl = `https://playerflixapi.com/filme/${imdbId}`;
        } else {
            embedUrl = `https://playerflixapi.com/serie/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.to') {
        if (!imdbId) {
            videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
            return;
        }
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
             videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** não suporta seleção direta de episódio. Tente outra opção.</p>`;
             return;
        }
    } else {
        videoPlayerDiv.innerHTML = `<p>Fonte de player desconhecida.</p>`;
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true; 
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    videoPlayerDiv.appendChild(iframe);
}

async function showDetailsModal(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    // Buscamos o backdrop_path no mesmo endpoint
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const title = data.title || data.name;
        const sinopse = data.overview || 'Sinopse não disponível em Português.';
        const posterPath = data.poster_path;
        const backdropPath = data.backdrop_path; // Novo: Captura o backdrop
        
        const posterUrl = posterPath ? `${TMDB_POSTER_BASE_URL}${posterPath}` : '';
        const backdropUrl = backdropPath ? `${TMDB_IMAGE_BASE_URL}${backdropPath}` : '';
        
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const seasonsCount = data.number_of_seasons ? `${data.number_of_seasons} Temporada${data.number_of_seasons > 1 ? 's' : ''}` : null;
        const runtime = data.runtime ? `${data.runtime} min` : null;
        
        const imdbScore = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const displayType = mediaType === 'movie' ? 'Filme' : 'Série';
        
        // Favoritos
        const isFav = isFavorite(tmdbId, mediaType);
        const favIcon = isFav ? '&#9829;' : '&#9825;';
        const favClass = isFav ? 'is-favorite' : '';


        // Atualiza o fundo do modal para o efeito backdrop
        const modalContent = detailsModal.querySelector('.modal-content');
        if (backdropUrl) {
            modalContent.style.backgroundImage = `url(${backdropUrl})`;
            modalContent.classList.add('has-backdrop');
        } else {
            modalContent.style.backgroundImage = 'none';
            modalContent.classList.remove('has-backdrop');
        }

        // Metadados formatados
        const metadataHtml = [];
        if (seasonsCount) metadataHtml.push(`<span class="metadata-item">${seasonsCount}</span>`);
        if (runtime) metadataHtml.push(`<span class="metadata-item">${runtime}</span>`);
        if (year) metadataHtml.push(`<span class="metadata-item">${year}</span>`);
        if (imdbScore !== 'N/A') metadataHtml.push(`<span class="metadata-item imdb-score">IMDb ${imdbScore}</span>`);


        detailsContent.innerHTML = `
            <div class="modal-info-container">
                <img src="${posterUrl}" alt="Pôster de ${title}" class="modal-poster">
                <div class="modal-text-content">
                    
                    <h3>${title}</h3>
                    
                    <p class="modal-metadata">
                        ${metadataHtml.join('\n')}
                    </p>
                    
                    <p class="modal-sinopse">${sinopse}</p>

                    <div class="modal-actions">
                        <button class="watch-button action-button primary-button" 
                                data-id="${tmdbId}" data-type="${mediaType}" data-title="${title}">
                            ▶︎ Assistir
                        </button>
                        <button class="action-button icon-button modal-favorite-button"
                                data-id="${tmdbId}" data-type="${mediaType}">
                            <span class="icon-save ${favClass}">${favIcon}</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div style="clear: both;"></div>
        `;
        
        // Reconecta o listener para o botão Assistir no modal
        detailsContent.querySelector('.watch-button').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const title = e.target.dataset.title;
            // Fecha o modal e inicia o player
            detailsModal.style.display = 'none';
            handleWatchClick(id, type, title);
        });
        
        // Anexa o listener para o botão Favoritar no Modal
        detailsContent.querySelector('.modal-favorite-button').addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const type = e.currentTarget.dataset.type;
            toggleFavorite(id, type);
            // O toggleFavorite já chama updateFavoriteButtonState, que atualiza o ícone
        });


    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        detailsContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
        detailsModal.querySelector('.modal-content').classList.remove('has-backdrop');
        detailsModal.querySelector('.modal-content').style.backgroundImage = 'none';
    }
}


/**
 * Função para buscar e mesclar os dados de IPTV-ORG.
 */
async function fetchAndCombineIPTVData() {
    try {
        // Busca os 3 arquivos essenciais: canais, streams E logos.
        const [channelsResponse, streamsResponse, logosResponse] = await Promise.all([
            fetch(`${IPTV_ORG_API_BASE}/channels.json`),
            fetch(`${IPTV_ORG_API_BASE}/streams.json`),
            fetch(`${IPTV_ORG_API_BASE}/logos.json`) 
        ]);

        if (!channelsResponse.ok || !streamsResponse.ok || !logosResponse.ok) {
            throw new Error("Falha ao carregar um ou mais arquivos IPTV-ORG.");
        }

        const channelsData = await channelsResponse.json();
        const streamsData = await streamsResponse.json();
        const logosData = await logosResponse.json(); 
        
        // Mapeia canais e logos por ID para acesso rápido
        const channelMap = new Map(channelsData.map(c => [c.id, c]));
        // Mapeia logos pela ID do canal. Muitos canais têm várias logos; pegamos a primeira.
        const logoMap = new Map();
        logosData.forEach(logo => {
            if (logo.channel && !logoMap.has(logo.channel)) {
                logoMap.set(logo.channel, logo.url);
            }
        });


        const combinedList = streamsData
            // Filtra streams M3U8 válidos
            .filter(stream => stream.url && stream.url.endsWith('.m3u8')) 
            .map(stream => {
                const channel = channelMap.get(stream.channel);
                
                if (!channel) return null; 

                // Obtém a URL da logo diretamente do mapeamento de logos
                const logoUrl = logoMap.get(channel.id);

                return {
                    id: stream.channel,
                    name: channel.name,
                    category: channel.categories.join(', ') || 'Geral',
                    streamUrl: stream.url, 
                    // Usa a URL garantida pelo logos.json
                    logoUrl: logoUrl || 'placeholder_logo.png' 
                };
            })
            .filter(item => item !== null)
            // Remove duplicados
            .filter((value, index, self) => 
                index === self.findIndex((t) => (
                    t.id === value.id
                ))
            ); 

        return combinedList;

    } catch (error) {
        console.error('Erro CRÍTICO ao buscar e combinar dados do IPTV-ORG:', error);
        return []; 
    }
}


/**
 * Carrega a lista de canais usando a nova fonte IPTV-ORG (TODOS OS PAÍSES).
 */
async function loadLiveTV() {
    resetView('results-container'); 
    resultsContainer.innerHTML = '<h2>TV ao Vivo</h2><p>Buscando lista de canais (IPTV-ORG)...</p>';

    currentCategory.endpoint = 'live_tv'; 
    currentCategory.title = 'TV ao Vivo';
    
    // Carrega os dados APENAS se ainda não estiverem na memória
    if (iptvChannels.length === 0) {
        iptvChannels = await fetchAndCombineIPTVData();
    }

    const channels = iptvChannels;

    if (channels.length === 0) {
        resultsContainer.innerHTML = `
            <h2>TV ao Vivo</h2>
            <p style="color: red;">Erro: Não foi possível carregar a lista de canais ativos do IPTV-ORG. Tente novamente mais tarde.</p>
        `;
        return;
    }

    // Renderiza a grade de canais com o novo título
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Todos os Canais Ativos (${channels.length} itens)</h2>
        <div id="channels-grid" class="results-grid"></div>
    </section>`;
    
    const channelsGrid = document.getElementById('channels-grid');

    channels.forEach(channel => {
        const card = document.createElement('div');
        // Adiciona a classe channel-card
        card.className = 'movie-card channel-card';
        
        const logoSrc = channel.logoUrl || 'placeholder_logo.png'; 
        const channelId = channel.id; 
        const channelName = channel.name || 'Canal Desconhecido';
        const channelCategory = channel.category; 

        // Cards de TV Ao Vivo usam o card-info original (sem a lógica de hover)
        card.innerHTML = `
            <img src="${logoSrc}" 
                 alt="${channelName}" 
                 class="channel-logo" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=Logo+N%C3%A3o+Encontrada'"> 
            <div class="card-info">
                <h3>${channelName}</h3> 
                <p style="font-size: 0.9em; color: #ccc;">${channelCategory}</p>
                <button class="watch-channel-button action-button primary-button" 
                            data-channel-id="${channelId}" data-title="${channelName}" 
                            style="width: 90%; margin-top: 10px;">
                    ASSISTIR AO VIVO
                </button>
            </div>
        `;
        channelsGrid.appendChild(card);
    });
    
    attachChannelListeners();
}

/**
 * Anexa listeners para os botões de ASSISTIR AO VIVO.
 */
function attachChannelListeners() {
    document.querySelectorAll('.watch-channel-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const channelId = event.target.dataset.channelId;
            const title = event.target.dataset.title;
            
            playLiveChannel(channelId, title); 
        };
    });
}

/**
 * Carrega o canal de TV no player (USANDO SOMENTE HLS.JS).
 */
async function playLiveChannel(channelId, title) {
    resetView('player-container');
    playerTitle.textContent = title;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'none'; 
    }
    seriesSelectors.style.display = 'none'; 

    videoPlayerDiv.innerHTML = `<p>Buscando URL do stream para ${title}...</p>`;

    // Busca a URL M3U8 nos dados pré-carregados
    const channel = iptvChannels.find(c => c.id === channelId);
    const streamUrl = channel ? channel.streamUrl : null;

    if (!streamUrl) {
        videoPlayerDiv.innerHTML = `
            <div style="padding: 30px; background-color: #2a2a2a; border-radius: 8px; max-width: 500px; margin: 50px auto; text-align: center; border: 1px solid red;">
                <p style="color: red; font-size: 1.1em; margin-bottom: 15px;">
                    ❌ Stream Indisponível
                </p>
                <p style="color: #ccc; font-size: 0.9em; margin-bottom: 20px;">
                    Não foi possível encontrar a URL de stream M3U8 para **${title}** na base de dados IPTV-ORG.
                </p>
                <button onclick="loadLiveTV()" class="action-button primary-button" style="background-color: #555;">
                    Voltar para a lista
                </button>
            </div>
        `;
        return;
    }

    // Tenta reproduzir o M3U8 via HLS.js
    const video = document.createElement('video');
    video.id = 'live-video-player';
    video.controls = true;
    video.autoplay = true; 
    video.style.width = '100%';
    video.style.height = '100%';
    
    videoPlayerDiv.innerHTML = '';
    videoPlayerDiv.appendChild(video);
    
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(error => {
                console.warn('Autoplay bloqueado pelo navegador.', error);
                videoPlayerDiv.insertAdjacentHTML('beforeend', `
                    <div class="stream-info-overlay" style="margin-top: 20px;">
                        <p style="color: #ffcc00; font-weight: bold; margin-bottom: 5px;">
                            ⚠️ CLIQUE NECESSÁRIO
                        </p>
                        <p style="color: #ccc; font-size: 0.9em; margin-bottom: 0;">
                            O navegador bloqueou a reprodução automática. Clique no botão de Play no vídeo.
                        </p>
                    </div>
                `);
            });
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    } else {
         videoPlayerDiv.innerHTML = `<p style="color: red; margin-top: 50px;">
            Seu navegador não suporta o formato de stream (M3U8).
        </p>`;
    }
}


/**
 * Carrega e exibe a lista de favoritos.
 */
async function loadFavoritesCatalog() {
    resetView('results-container');
    resultsContainer.innerHTML = '<h2>Favoritos</h2><p>Carregando seus filmes e séries favoritos...</p>';
    currentCategory.endpoint = 'favorites';
    currentCategory.title = 'Favoritos';

    const favoriteItems = loadFavoritesFromLocalStorage();

    if (favoriteItems.length === 0) {
        resultsContainer.innerHTML = `
            <section class="catalog-section">
                <h2>Seus Favoritos</h2>
                <p class="empty-list-message">
                    Você ainda não adicionou nenhum filme ou série aos seus favoritos.
                    Adicione um item clicando no ícone <span style="color: #e50914;">&#9825;</span> no card!
                </p>
            </section>
        `;
        return;
    }

    // 1. Coleta IDs de filmes e séries
    const tmdbIdsToFetch = favoriteItems.map(item => {
        const [type, id] = item.split('-');
        return { type: type, id: id };
    });

    // 2. Cria as promessas de busca no TMDB
    const fetchPromises = tmdbIdsToFetch.map(({ id, type }) => {
        const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        return fetch(url)
            .then(res => res.json())
            .catch(err => {
                console.error(`Erro ao buscar ${type} ID ${id}:`, err);
                return null;
            });
    });

    const rawResults = await Promise.all(fetchPromises);
    
    // 3. Filtra resultados válidos e renderiza
    const validResults = rawResults.filter(item => item && item.id);
    
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Seus Favoritos (${validResults.length} itens)</h2>
        <div id="favorites-grid" class="results-grid"></div>
    </section>`;
    
    const favoritesGridContainer = document.getElementById('favorites-grid');

    // Mapeia os resultados para o formato esperado pelo displayResults
    const normalizedResults = validResults.map(item => ({
        ...item,
        media_type: item.title ? 'movie' : 'tv', // Tenta inferir o tipo
    }));
    
    // Passa a lista normalizada para a função que renderiza os cards
    displayResults(normalizedResults, favoritesGridContainer);
}

/**
 * Função de busca manual (quando o usuário digita na busca).
 */
async function searchMedia(query) {
    if (!query) return; 

    resetView('results-container');
    resultsContainer.innerHTML = `<p>Buscando resultados para "${query}"...</p>`;
    currentCategory.endpoint = null; 

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid"></div></section>`;
        const searchResultsContainer = document.getElementById('search-results');

        displayResults(data.results, searchResultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 3. FUNÇÕES DE PLAYER E MODAL ---

async function loadSeriesOptions(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const validSeasons = data.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        currentMedia.seasons = validSeasons;
        
        seasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `T${season.season_number}`;
            seasonSelect.appendChild(option);
        });

        currentMedia.currentSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        updateEpisodeOptions(currentMedia.currentSeason);

    } catch (error) {
        console.error('Erro ao carregar opções de séries:', error);
        seriesSelectors.innerHTML = `<p>Erro: Falha ao carregar temporadas.</p>`;
    }
}

function updateEpisodeOptions(seasonNumber) {
    const season = currentMedia.seasons.find(s => s.season_number == seasonNumber);
    episodeSelect.innerHTML = ''; 
    if (season && season.episode_count > 0) {
        for (let i = 1; i <= season.episode_count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `E${i}`;
            episodeSelect.appendChild(option);
        }
        currentMedia.currentEpisode = 1; 
    } else {
        currentMedia.currentEpisode = null;
    }
}

async function handleWatchClick(tmdbId, mediaType, mediaTitle) {
    const mediaId = parseInt(tmdbId);
    if (isNaN(mediaId)) {
        console.error("ID de mídia inválido recebido:", tmdbId);
        return; 
    }

    Object.assign(currentMedia, {
        tmdbId: mediaId, mediaType, title: mediaTitle, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });

    resetView('player-container'); 
    playerTitle.textContent = mediaTitle;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'flex'; 
    }
    
    seriesSelectors.style.display = 'none'; 

    await getImdbId(mediaId, mediaType);
    
    if (mediaType === 'tv') {
        seriesSelectors.style.display = 'block';
        await loadSeriesOptions(mediaId);
    }
    
    createPlayer(); 
}

function createPlayer() {
    const source = playerSourceSelect.value;
    const { tmdbId, mediaType, imdbId, currentSeason, currentEpisode } = currentMedia;

    videoPlayerDiv.innerHTML = ''; 
    let embedUrl = '';
    const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
    
    if (source === 'megaembed.com') {
        if (mediaType === 'movie') {
            embedUrl = `https://megaembed.com/embed/${tmdbId}`;
        } else {
            embedUrl = `https://megaembed.com/embed/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc-embed.ru') {
        const langParam = '&ds_lang=pt'; 
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}${langParam}`;
        } else {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}&season=${currentSeason}&episode=${currentEpisode}${langParam}`;
        }
    } else if (source === '2embed.top') {
        if (mediaType === 'movie') {
            embedUrl = `https://2embed.top/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://2embed.top/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.cc') {
        const version = 'v2';
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.cc/${version}/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://vidsrc.cc/${version}/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'playerflixapi.com') {
        if (mediaType === 'movie') {
            if (!imdbId) {
                videoPlayerDiv.innerHTML = `<p>A fonte **playerflixapi.com** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
                return;
            }
            embedUrl = `https://playerflixapi.com/filme/${imdbId}`;
        } else {
            embedUrl = `https://playerflixapi.com/serie/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.to') {
        if (!imdbId) {
            videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
            return;
        }
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
             videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** não suporta seleção direta de episódio. Tente outra opção.</p>`;
             return;
        }
    } else {
        videoPlayerDiv.innerHTML = `<p>Fonte de player desconhecida.</p>`;
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true; 
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    videoPlayerDiv.appendChild(iframe);
}

async function showDetailsModal(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    // Buscamos o backdrop_path no mesmo endpoint
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const title = data.title || data.name;
        const sinopse = data.overview || 'Sinopse não disponível em Português.';
        const posterPath = data.poster_path;
        const backdropPath = data.backdrop_path; // Novo: Captura o backdrop
        
        const posterUrl = posterPath ? `${TMDB_POSTER_BASE_URL}${posterPath}` : '';
        const backdropUrl = backdropPath ? `${TMDB_IMAGE_BASE_URL}${backdropPath}` : '';
        
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const seasonsCount = data.number_of_seasons ? `${data.number_of_seasons} Temporada${data.number_of_seasons > 1 ? 's' : ''}` : null;
        const runtime = data.runtime ? `${data.runtime} min` : null;
        
        const imdbScore = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const displayType = mediaType === 'movie' ? 'Filme' : 'Série';
        
        // Favoritos
        const isFav = isFavorite(tmdbId, mediaType);
        const favIcon = isFav ? '&#9829;' : '&#9825;';
        const favClass = isFav ? 'is-favorite' : '';


        // Atualiza o fundo do modal para o efeito backdrop
        const modalContent = detailsModal.querySelector('.modal-content');
        if (backdropUrl) {
            modalContent.style.backgroundImage = `url(${backdropUrl})`;
            modalContent.classList.add('has-backdrop');
        } else {
            modalContent.style.backgroundImage = 'none';
            modalContent.classList.remove('has-backdrop');
        }

        // Metadados formatados
        const metadataHtml = [];
        if (seasonsCount) metadataHtml.push(`<span class="metadata-item">${seasonsCount}</span>`);
        if (runtime) metadataHtml.push(`<span class="metadata-item">${runtime}</span>`);
        if (year) metadataHtml.push(`<span class="metadata-item">${year}</span>`);
        if (imdbScore !== 'N/A') metadataHtml.push(`<span class="metadata-item imdb-score">IMDb ${imdbScore}</span>`);


        detailsContent.innerHTML = `
            <div class="modal-info-container">
                <img src="${posterUrl}" alt="Pôster de ${title}" class="modal-poster">
                <div class="modal-text-content">
                    
                    <h3>${title}</h3>
                    
                    <p class="modal-metadata">
                        ${metadataHtml.join('\n')}
                    </p>
                    
                    <p class="modal-sinopse">${sinopse}</p>

                    <div class="modal-actions">
                        <button class="watch-button action-button primary-button" 
                                data-id="${tmdbId}" data-type="${mediaType}" data-title="${title}">
                            ▶︎ Assistir
                        </button>
                        <button class="action-button icon-button modal-favorite-button"
                                data-id="${tmdbId}" data-type="${mediaType}">
                            <span class="icon-save ${favClass}">${favIcon}</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div style="clear: both;"></div>
        `;
        
        // Reconecta o listener para o botão Assistir no modal
        detailsContent.querySelector('.watch-button').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const title = e.target.dataset.title;
            // Fecha o modal e inicia o player
            detailsModal.style.display = 'none';
            handleWatchClick(id, type, title);
        });
        
        // Anexa o listener para o botão Favoritar no Modal
        detailsContent.querySelector('.modal-favorite-button').addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const type = e.currentTarget.dataset.type;
            toggleFavorite(id, type);
            // O toggleFavorite já chama updateFavoriteButtonState, que atualiza o ícone
        });


    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        detailsContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
        detailsModal.querySelector('.modal-content').classList.remove('has-backdrop');
        detailsModal.querySelector('.modal-content').style.backgroundImage = 'none';
    }
}


/**
 * Função para buscar e mesclar os dados de IPTV-ORG.
 */
async function fetchAndCombineIPTVData() {
    try {
        // Busca os 3 arquivos essenciais: canais, streams E logos.
        const [channelsResponse, streamsResponse, logosResponse] = await Promise.all([
            fetch(`${IPTV_ORG_API_BASE}/channels.json`),
            fetch(`${IPTV_ORG_API_BASE}/streams.json`),
            fetch(`${IPTV_ORG_API_BASE}/logos.json`) 
        ]);

        if (!channelsResponse.ok || !streamsResponse.ok || !logosResponse.ok) {
            throw new Error("Falha ao carregar um ou mais arquivos IPTV-ORG.");
        }

        const channelsData = await channelsResponse.json();
        const streamsData = await streamsResponse.json();
        const logosData = await logosResponse.json(); 
        
        // Mapeia canais e logos por ID para acesso rápido
        const channelMap = new Map(channelsData.map(c => [c.id, c]));
        // Mapeia logos pela ID do canal. Muitos canais têm várias logos; pegamos a primeira.
        const logoMap = new Map();
        logosData.forEach(logo => {
            if (logo.channel && !logoMap.has(logo.channel)) {
                logoMap.set(logo.channel, logo.url);
            }
        });


        const combinedList = streamsData
            // Filtra streams M3U8 válidos
            .filter(stream => stream.url && stream.url.endsWith('.m3u8')) 
            .map(stream => {
                const channel = channelMap.get(stream.channel);
                
                if (!channel) return null; 

                // Obtém a URL da logo diretamente do mapeamento de logos
                const logoUrl = logoMap.get(channel.id);

                return {
                    id: stream.channel,
                    name: channel.name,
                    category: channel.categories.join(', ') || 'Geral',
                    streamUrl: stream.url, 
                    // Usa a URL garantida pelo logos.json
                    logoUrl: logoUrl || 'placeholder_logo.png' 
                };
            })
            .filter(item => item !== null)
            // Remove duplicados
            .filter((value, index, self) => 
                index === self.findIndex((t) => (
                    t.id === value.id
                ))
            ); 

        return combinedList;

    } catch (error) {
        console.error('Erro CRÍTICO ao buscar e combinar dados do IPTV-ORG:', error);
        return []; 
    }
}


/**
 * Carrega a lista de canais usando a nova fonte IPTV-ORG (TODOS OS PAÍSES).
 */
async function loadLiveTV() {
    resetView('results-container'); 
    resultsContainer.innerHTML = '<h2>TV ao Vivo</h2><p>Buscando lista de canais (IPTV-ORG)...</p>';

    currentCategory.endpoint = 'live_tv'; 
    currentCategory.title = 'TV ao Vivo';
    
    // Carrega os dados APENAS se ainda não estiverem na memória
    if (iptvChannels.length === 0) {
        iptvChannels = await fetchAndCombineIPTVData();
    }

    const channels = iptvChannels;

    if (channels.length === 0) {
        resultsContainer.innerHTML = `
            <h2>TV ao Vivo</h2>
            <p style="color: red;">Erro: Não foi possível carregar a lista de canais ativos do IPTV-ORG. Tente novamente mais tarde.</p>
        `;
        return;
    }

    // Renderiza a grade de canais com o novo título
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Todos os Canais Ativos (${channels.length} itens)</h2>
        <div id="channels-grid" class="results-grid"></div>
    </section>`;
    
    const channelsGrid = document.getElementById('channels-grid');

    channels.forEach(channel => {
        const card = document.createElement('div');
        // Adiciona a classe channel-card
        card.className = 'movie-card channel-card';
        
        const logoSrc = channel.logoUrl || 'placeholder_logo.png'; 
        const channelId = channel.id; 
        const channelName = channel.name || 'Canal Desconhecido';
        const channelCategory = channel.category; 

        // Cards de TV Ao Vivo usam o card-info original (sem a lógica de hover)
        card.innerHTML = `
            <img src="${logoSrc}" 
                 alt="${channelName}" 
                 class="channel-logo" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=Logo+N%C3%A3o+Encontrada'"> 
            <div class="card-info">
                <h3>${channelName}</h3> 
                <p style="font-size: 0.9em; color: #ccc;">${channelCategory}</p>
                <button class="watch-channel-button action-button primary-button" 
                            data-channel-id="${channelId}" data-title="${channelName}" 
                            style="width: 90%; margin-top: 10px;">
                    ASSISTIR AO VIVO
                </button>
            </div>
        `;
        channelsGrid.appendChild(card);
    });
    
    attachChannelListeners();
}

/**
 * Anexa listeners para os botões de ASSISTIR AO VIVO.
 */
function attachChannelListeners() {
    document.querySelectorAll('.watch-channel-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const channelId = event.target.dataset.channelId;
            const title = event.target.dataset.title;
            
            playLiveChannel(channelId, title); 
        };
    });
}

/**
 * Carrega o canal de TV no player (USANDO SOMENTE HLS.JS).
 */
async function playLiveChannel(channelId, title) {
    resetView('player-container');
    playerTitle.textContent = title;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'none'; 
    }
    seriesSelectors.style.display = 'none'; 

    videoPlayerDiv.innerHTML = `<p>Buscando URL do stream para ${title}...</p>`;

    // Busca a URL M3U8 nos dados pré-carregados
    const channel = iptvChannels.find(c => c.id === channelId);
    const streamUrl = channel ? channel.streamUrl : null;

    if (!streamUrl) {
        videoPlayerDiv.innerHTML = `
            <div style="padding: 30px; background-color: #2a2a2a; border-radius: 8px; max-width: 500px; margin: 50px auto; text-align: center; border: 1px solid red;">
                <p style="color: red; font-size: 1.1em; margin-bottom: 15px;">
                    ❌ Stream Indisponível
                </p>
                <p style="color: #ccc; font-size: 0.9em; margin-bottom: 20px;">
                    Não foi possível encontrar a URL de stream M3U8 para **${title}** na base de dados IPTV-ORG.
                </p>
                <button onclick="loadLiveTV()" class="action-button primary-button" style="background-color: #555;">
                    Voltar para a lista
                </button>
            </div>
        `;
        return;
    }

    // Tenta reproduzir o M3U8 via HLS.js
    const video = document.createElement('video');
    video.id = 'live-video-player';
    video.controls = true;
    video.autoplay = true; 
    video.style.width = '100%';
    video.style.height = '100%';
    
    videoPlayerDiv.innerHTML = '';
    videoPlayerDiv.appendChild(video);
    
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(error => {
                console.warn('Autoplay bloqueado pelo navegador.', error);
                videoPlayerDiv.insertAdjacentHTML('beforeend', `
                    <div class="stream-info-overlay" style="margin-top: 20px;">
                        <p style="color: #ffcc00; font-weight: bold; margin-bottom: 5px;">
                            ⚠️ CLIQUE NECESSÁRIO
                        </p>
                        <p style="color: #ccc; font-size: 0.9em; margin-bottom: 0;">
                            O navegador bloqueou a reprodução automática. Clique no botão de Play no vídeo.
                        </p>
                    </div>
                `);
            });
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    } else {
         videoPlayerDiv.innerHTML = `<p style="color: red; margin-top: 50px;">
            Seu navegador não suporta o formato de stream (M3U8).
        </p>`;
    }
}


/**
 * Carrega e exibe a lista de favoritos.
 */
async function loadFavoritesCatalog() {
    resetView('results-container');
    resultsContainer.innerHTML = '<h2>Favoritos</h2><p>Carregando seus filmes e séries favoritos...</p>';
    currentCategory.endpoint = 'favorites';
    currentCategory.title = 'Favoritos';

    const favoriteItems = loadFavoritesFromLocalStorage();

    if (favoriteItems.length === 0) {
        resultsContainer.innerHTML = `
            <section class="catalog-section">
                <h2>Seus Favoritos</h2>
                <p class="empty-list-message">
                    Você ainda não adicionou nenhum filme ou série aos seus favoritos.
                    Adicione um item clicando no ícone <span style="color: #e50914;">&#9825;</span> no card!
                </p>
            </section>
        `;
        return;
    }

    // 1. Coleta IDs de filmes e séries
    const tmdbIdsToFetch = favoriteItems.map(item => {
        const [type, id] = item.split('-');
        return { type: type, id: id };
    });

    // 2. Cria as promessas de busca no TMDB
    const fetchPromises = tmdbIdsToFetch.map(({ id, type }) => {
        const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        return fetch(url)
            .then(res => res.json())
            .catch(err => {
                console.error(`Erro ao buscar ${type} ID ${id}:`, err);
                return null;
            });
    });

    const rawResults = await Promise.all(fetchPromises);
    
    // 3. Filtra resultados válidos e renderiza
    const validResults = rawResults.filter(item => item && item.id);
    
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Seus Favoritos (${validResults.length} itens)</h2>
        <div id="favorites-grid" class="results-grid"></div>
    </section>`;
    
    const favoritesGridContainer = document.getElementById('favorites-grid');

    // Mapeia os resultados para o formato esperado pelo displayResults
    const normalizedResults = validResults.map(item => ({
        ...item,
        media_type: item.title ? 'movie' : 'tv', // Tenta inferir o tipo
    }));
    
    // Passa a lista normalizada para a função que renderiza os cards
    displayResults(normalizedResults, favoritesGridContainer);
}

/**
 * Função de busca manual (quando o usuário digita na busca).
 */
async function searchMedia(query) {
    if (!query) return; 

    resetView('results-container');
    resultsContainer.innerHTML = `<p>Buscando resultados para "${query}"...</p>`;
    currentCategory.endpoint = null; 

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid"></div></section>`;
        const searchResultsContainer = document.getElementById('search-results');

        displayResults(data.results, searchResultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 3. FUNÇÕES DE PLAYER E MODAL ---

async function loadSeriesOptions(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const validSeasons = data.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        currentMedia.seasons = validSeasons;
        
        seasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `T${season.season_number}`;
            seasonSelect.appendChild(option);
        });

        currentMedia.currentSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        updateEpisodeOptions(currentMedia.currentSeason);

    } catch (error) {
        console.error('Erro ao carregar opções de séries:', error);
        seriesSelectors.innerHTML = `<p>Erro: Falha ao carregar temporadas.</p>`;
    }
}

function updateEpisodeOptions(seasonNumber) {
    const season = currentMedia.seasons.find(s => s.season_number == seasonNumber);
    episodeSelect.innerHTML = ''; 
    if (season && season.episode_count > 0) {
        for (let i = 1; i <= season.episode_count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `E${i}`;
            episodeSelect.appendChild(option);
        }
        currentMedia.currentEpisode = 1; 
    } else {
        currentMedia.currentEpisode = null;
    }
}

async function handleWatchClick(tmdbId, mediaType, mediaTitle) {
    const mediaId = parseInt(tmdbId);
    if (isNaN(mediaId)) {
        console.error("ID de mídia inválido recebido:", tmdbId);
        return; 
    }

    Object.assign(currentMedia, {
        tmdbId: mediaId, mediaType, title: mediaTitle, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });

    resetView('player-container'); 
    playerTitle.textContent = mediaTitle;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'flex'; 
    }
    
    seriesSelectors.style.display = 'none'; 

    await getImdbId(mediaId, mediaType);
    
    if (mediaType === 'tv') {
        seriesSelectors.style.display = 'block';
        await loadSeriesOptions(mediaId);
    }
    
    createPlayer(); 
}

function createPlayer() {
    const source = playerSourceSelect.value;
    const { tmdbId, mediaType, imdbId, currentSeason, currentEpisode } = currentMedia;

    videoPlayerDiv.innerHTML = ''; 
    let embedUrl = '';
    const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
    
    if (source === 'megaembed.com') {
        if (mediaType === 'movie') {
            embedUrl = `https://megaembed.com/embed/${tmdbId}`;
        } else {
            embedUrl = `https://megaembed.com/embed/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc-embed.ru') {
        const langParam = '&ds_lang=pt'; 
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}${langParam}`;
        } else {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}&season=${currentSeason}&episode=${currentEpisode}${langParam}`;
        }
    } else if (source === '2embed.top') {
        if (mediaType === 'movie') {
            embedUrl = `https://2embed.top/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://2embed.top/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.cc') {
        const version = 'v2';
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.cc/${version}/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://vidsrc.cc/${version}/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'playerflixapi.com') {
        if (mediaType === 'movie') {
            if (!imdbId) {
                videoPlayerDiv.innerHTML = `<p>A fonte **playerflixapi.com** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
                return;
            }
            embedUrl = `https://playerflixapi.com/filme/${imdbId}`;
        } else {
            embedUrl = `https://playerflixapi.com/serie/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.to') {
        if (!imdbId) {
            videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
            return;
        }
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
             videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** não suporta seleção direta de episódio. Tente outra opção.</p>`;
             return;
        }
    } else {
        videoPlayerDiv.innerHTML = `<p>Fonte de player desconhecida.</p>`;
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true; 
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    videoPlayerDiv.appendChild(iframe);
}

async function showDetailsModal(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    // Buscamos o backdrop_path no mesmo endpoint
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const title = data.title || data.name;
        const sinopse = data.overview || 'Sinopse não disponível em Português.';
        const posterPath = data.poster_path;
        const backdropPath = data.backdrop_path; // Novo: Captura o backdrop
        
        const posterUrl = posterPath ? `${TMDB_POSTER_BASE_URL}${posterPath}` : '';
        const backdropUrl = backdropPath ? `${TMDB_IMAGE_BASE_URL}${backdropPath}` : '';
        
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const seasonsCount = data.number_of_seasons ? `${data.number_of_seasons} Temporada${data.number_of_seasons > 1 ? 's' : ''}` : null;
        const runtime = data.runtime ? `${data.runtime} min` : null;
        
        const imdbScore = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const displayType = mediaType === 'movie' ? 'Filme' : 'Série';
        
        // Favoritos
        const isFav = isFavorite(tmdbId, mediaType);
        const favIcon = isFav ? '&#9829;' : '&#9825;';
        const favClass = isFav ? 'is-favorite' : '';


        // Atualiza o fundo do modal para o efeito backdrop
        const modalContent = detailsModal.querySelector('.modal-content');
        if (backdropUrl) {
            modalContent.style.backgroundImage = `url(${backdropUrl})`;
            modalContent.classList.add('has-backdrop');
        } else {
            modalContent.style.backgroundImage = 'none';
            modalContent.classList.remove('has-backdrop');
        }

        // Metadados formatados
        const metadataHtml = [];
        if (seasonsCount) metadataHtml.push(`<span class="metadata-item">${seasonsCount}</span>`);
        if (runtime) metadataHtml.push(`<span class="metadata-item">${runtime}</span>`);
        if (year) metadataHtml.push(`<span class="metadata-item">${year}</span>`);
        if (imdbScore !== 'N/A') metadataHtml.push(`<span class="metadata-item imdb-score">IMDb ${imdbScore}</span>`);


        detailsContent.innerHTML = `
            <div class="modal-info-container">
                <img src="${posterUrl}" alt="Pôster de ${title}" class="modal-poster">
                <div class="modal-text-content">
                    
                    <h3>${title}</h3>
                    
                    <p class="modal-metadata">
                        ${metadataHtml.join('\n')}
                    </p>
                    
                    <p class="modal-sinopse">${sinopse}</p>

                    <div class="modal-actions">
                        <button class="watch-button action-button primary-button" 
                                data-id="${tmdbId}" data-type="${mediaType}" data-title="${title}">
                            ▶︎ Assistir
                        </button>
                        <button class="action-button icon-button modal-favorite-button"
                                data-id="${tmdbId}" data-type="${mediaType}">
                            <span class="icon-save ${favClass}">${favIcon}</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div style="clear: both;"></div>
        `;
        
        // Reconecta o listener para o botão Assistir no modal
        detailsContent.querySelector('.watch-button').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const title = e.target.dataset.title;
            // Fecha o modal e inicia o player
            detailsModal.style.display = 'none';
            handleWatchClick(id, type, title);
        });
        
        // Anexa o listener para o botão Favoritar no Modal
        detailsContent.querySelector('.modal-favorite-button').addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const type = e.currentTarget.dataset.type;
            toggleFavorite(id, type);
            // O toggleFavorite já chama updateFavoriteButtonState, que atualiza o ícone
        });


    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        detailsContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
        detailsModal.querySelector('.modal-content').classList.remove('has-backdrop');
        detailsModal.querySelector('.modal-content').style.backgroundImage = 'none';
    }
}


/**
 * Função para buscar e mesclar os dados de IPTV-ORG.
 */
async function fetchAndCombineIPTVData() {
    try {
        // Busca os 3 arquivos essenciais: canais, streams E logos.
        const [channelsResponse, streamsResponse, logosResponse] = await Promise.all([
            fetch(`${IPTV_ORG_API_BASE}/channels.json`),
            fetch(`${IPTV_ORG_API_BASE}/streams.json`),
            fetch(`${IPTV_ORG_API_BASE}/logos.json`) 
        ]);

        if (!channelsResponse.ok || !streamsResponse.ok || !logosResponse.ok) {
            throw new Error("Falha ao carregar um ou mais arquivos IPTV-ORG.");
        }

        const channelsData = await channelsResponse.json();
        const streamsData = await streamsResponse.json();
        const logosData = await logosResponse.json(); 
        
        // Mapeia canais e logos por ID para acesso rápido
        const channelMap = new Map(channelsData.map(c => [c.id, c]));
        // Mapeia logos pela ID do canal. Muitos canais têm várias logos; pegamos a primeira.
        const logoMap = new Map();
        logosData.forEach(logo => {
            if (logo.channel && !logoMap.has(logo.channel)) {
                logoMap.set(logo.channel, logo.url);
            }
        });


        const combinedList = streamsData
            // Filtra streams M3U8 válidos
            .filter(stream => stream.url && stream.url.endsWith('.m3u8')) 
            .map(stream => {
                const channel = channelMap.get(stream.channel);
                
                if (!channel) return null; 

                // Obtém a URL da logo diretamente do mapeamento de logos
                const logoUrl = logoMap.get(channel.id);

                return {
                    id: stream.channel,
                    name: channel.name,
                    category: channel.categories.join(', ') || 'Geral',
                    streamUrl: stream.url, 
                    // Usa a URL garantida pelo logos.json
                    logoUrl: logoUrl || 'placeholder_logo.png' 
                };
            })
            .filter(item => item !== null)
            // Remove duplicados
            .filter((value, index, self) => 
                index === self.findIndex((t) => (
                    t.id === value.id
                ))
            ); 

        return combinedList;

    } catch (error) {
        console.error('Erro CRÍTICO ao buscar e combinar dados do IPTV-ORG:', error);
        return []; 
    }
}


/**
 * Carrega a lista de canais usando a nova fonte IPTV-ORG (TODOS OS PAÍSES).
 */
async function loadLiveTV() {
    resetView('results-container'); 
    resultsContainer.innerHTML = '<h2>TV ao Vivo</h2><p>Buscando lista de canais (IPTV-ORG)...</p>';

    currentCategory.endpoint = 'live_tv'; 
    currentCategory.title = 'TV ao Vivo';
    
    // Carrega os dados APENAS se ainda não estiverem na memória
    if (iptvChannels.length === 0) {
        iptvChannels = await fetchAndCombineIPTVData();
    }

    const channels = iptvChannels;

    if (channels.length === 0) {
        resultsContainer.innerHTML = `
            <h2>TV ao Vivo</h2>
            <p style="color: red;">Erro: Não foi possível carregar a lista de canais ativos do IPTV-ORG. Tente novamente mais tarde.</p>
        `;
        return;
    }

    // Renderiza a grade de canais com o novo título
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Todos os Canais Ativos (${channels.length} itens)</h2>
        <div id="channels-grid" class="results-grid"></div>
    </section>`;
    
    const channelsGrid = document.getElementById('channels-grid');

    channels.forEach(channel => {
        const card = document.createElement('div');
        // Adiciona a classe channel-card
        card.className = 'movie-card channel-card';
        
        const logoSrc = channel.logoUrl || 'placeholder_logo.png'; 
        const channelId = channel.id; 
        const channelName = channel.name || 'Canal Desconhecido';
        const channelCategory = channel.category; 

        // Cards de TV Ao Vivo usam o card-info original (sem a lógica de hover)
        card.innerHTML = `
            <img src="${logoSrc}" 
                 alt="${channelName}" 
                 class="channel-logo" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=Logo+N%C3%A3o+Encontrada'"> 
            <div class="card-info">
                <h3>${channelName}</h3> 
                <p style="font-size: 0.9em; color: #ccc;">${channelCategory}</p>
                <button class="watch-channel-button action-button primary-button" 
                            data-channel-id="${channelId}" data-title="${channelName}" 
                            style="width: 90%; margin-top: 10px;">
                    ASSISTIR AO VIVO
                </button>
            </div>
        `;
        channelsGrid.appendChild(card);
    });
    
    attachChannelListeners();
}

/**
 * Anexa listeners para os botões de ASSISTIR AO VIVO.
 */
function attachChannelListeners() {
    document.querySelectorAll('.watch-channel-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const channelId = event.target.dataset.channelId;
            const title = event.target.dataset.title;
            
            playLiveChannel(channelId, title); 
        };
    });
}

/**
 * Carrega o canal de TV no player (USANDO SOMENTE HLS.JS).
 */
async function playLiveChannel(channelId, title) {
    resetView('player-container');
    playerTitle.textContent = title;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'none'; 
    }
    seriesSelectors.style.display = 'none'; 

    videoPlayerDiv.innerHTML = `<p>Buscando URL do stream para ${title}...</p>`;

    // Busca a URL M3U8 nos dados pré-carregados
    const channel = iptvChannels.find(c => c.id === channelId);
    const streamUrl = channel ? channel.streamUrl : null;

    if (!streamUrl) {
        videoPlayerDiv.innerHTML = `
            <div style="padding: 30px; background-color: #2a2a2a; border-radius: 8px; max-width: 500px; margin: 50px auto; text-align: center; border: 1px solid red;">
                <p style="color: red; font-size: 1.1em; margin-bottom: 15px;">
                    ❌ Stream Indisponível
                </p>
                <p style="color: #ccc; font-size: 0.9em; margin-bottom: 20px;">
                    Não foi possível encontrar a URL de stream M3U8 para **${title}** na base de dados IPTV-ORG.
                </p>
                <button onclick="loadLiveTV()" class="action-button primary-button" style="background-color: #555;">
                    Voltar para a lista
                </button>
            </div>
        `;
        return;
    }

    // Tenta reproduzir o M3U8 via HLS.js
    const video = document.createElement('video');
    video.id = 'live-video-player';
    video.controls = true;
    video.autoplay = true; 
    video.style.width = '100%';
    video.style.height = '100%';
    
    videoPlayerDiv.innerHTML = '';
    videoPlayerDiv.appendChild(video);
    
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(error => {
                console.warn('Autoplay bloqueado pelo navegador.', error);
                videoPlayerDiv.insertAdjacentHTML('beforeend', `
                    <div class="stream-info-overlay" style="margin-top: 20px;">
                        <p style="color: #ffcc00; font-weight: bold; margin-bottom: 5px;">
                            ⚠️ CLIQUE NECESSÁRIO
                        </p>
                        <p style="color: #ccc; font-size: 0.9em; margin-bottom: 0;">
                            O navegador bloqueou a reprodução automática. Clique no botão de Play no vídeo.
                        </p>
                    </div>
                `);
            });
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    } else {
         videoPlayerDiv.innerHTML = `<p style="color: red; margin-top: 50px;">
            Seu navegador não suporta o formato de stream (M3U8).
        </p>`;
    }
}


/**
 * Função de busca manual (quando o usuário digita na busca).
 */
async function searchMedia(query) {
    if (!query) return; 

    resetView('results-container');
    resultsContainer.innerHTML = `<p>Buscando resultados para "${query}"...</p>`;
    currentCategory.endpoint = null; 

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid"></div></section>`;
        const searchResultsContainer = document.getElementById('search-results');

        displayResults(data.results, searchResultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 3. FUNÇÕES DE PLAYER E MODAL ---

async function loadSeriesOptions(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        const validSeasons = data.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        
        currentMedia.seasons = validSeasons;
        
        seasonSelect.innerHTML = '';
        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = `T${season.season_number}`;
            seasonSelect.appendChild(option);
        });

        currentMedia.currentSeason = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        updateEpisodeOptions(currentMedia.currentSeason);

    } catch (error) {
        console.error('Erro ao carregar opções de séries:', error);
        seriesSelectors.innerHTML = `<p>Erro: Falha ao carregar temporadas.</p>`;
    }
}

function updateEpisodeOptions(seasonNumber) {
    const season = currentMedia.seasons.find(s => s.season_number == seasonNumber);
    episodeSelect.innerHTML = ''; 
    if (season && season.episode_count > 0) {
        for (let i = 1; i <= season.episode_count; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `E${i}`;
            episodeSelect.appendChild(option);
        }
        currentMedia.currentEpisode = 1; 
    } else {
        currentMedia.currentEpisode = null;
    }
}

async function handleWatchClick(tmdbId, mediaType, mediaTitle) {
    const mediaId = parseInt(tmdbId);
    if (isNaN(mediaId)) {
        console.error("ID de mídia inválido recebido:", tmdbId);
        return; 
    }

    Object.assign(currentMedia, {
        tmdbId: mediaId, mediaType, title: mediaTitle, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });

    resetView('player-container'); 
    playerTitle.textContent = mediaTitle;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'flex'; 
    }
    
    seriesSelectors.style.display = 'none'; 

    await getImdbId(mediaId, mediaType);
    
    if (mediaType === 'tv') {
        seriesSelectors.style.display = 'block';
        await loadSeriesOptions(mediaId);
    }
    
    createPlayer(); 
}

function createPlayer() {
    const source = playerSourceSelect.value;
    const { tmdbId, mediaType, imdbId, currentSeason, currentEpisode } = currentMedia;

    videoPlayerDiv.innerHTML = ''; 
    let embedUrl = '';
    const typeParam = mediaType === 'movie' ? 'movie' : 'tv';
    
    if (source === 'megaembed.com') {
        if (mediaType === 'movie') {
            embedUrl = `https://megaembed.com/embed/${tmdbId}`;
        } else {
            embedUrl = `https://megaembed.com/embed/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc-embed.ru') {
        const langParam = '&ds_lang=pt'; 
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}${langParam}`;
        } else {
            embedUrl = `https://vidsrc-embed.ru/embed/${typeParam}?tmdb=${tmdbId}&season=${currentSeason}&episode=${currentEpisode}${langParam}`;
        }
    } else if (source === '2embed.top') {
        if (mediaType === 'movie') {
            embedUrl = `https://2embed.top/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://2embed.top/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.cc') {
        const version = 'v2';
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.cc/${version}/embed/movie/${tmdbId}`;
        } else {
            embedUrl = `https://vidsrc.cc/${version}/embed/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'playerflixapi.com') {
        if (mediaType === 'movie') {
            if (!imdbId) {
                videoPlayerDiv.innerHTML = `<p>A fonte **playerflixapi.com** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
                return;
            }
            embedUrl = `https://playerflixapi.com/filme/${imdbId}`;
        } else {
            embedUrl = `https://playerflixapi.com/serie/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.to') {
        if (!imdbId) {
            videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
            return;
        }
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
             videoPlayerDiv.innerHTML = `<p>A fonte **vidsrc.to** não suporta seleção direta de episódio. Tente outra opção.</p>`;
             return;
        }
    } else {
        videoPlayerDiv.innerHTML = `<p>Fonte de player desconhecida.</p>`;
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true; 
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    videoPlayerDiv.appendChild(iframe);
}

async function showDetailsModal(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    // Buscamos o backdrop_path no mesmo endpoint
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const title = data.title || data.name;
        const sinopse = data.overview || 'Sinopse não disponível em Português.';
        const posterPath = data.poster_path;
        const backdropPath = data.backdrop_path; // Novo: Captura o backdrop
        
        const posterUrl = posterPath ? `${TMDB_POSTER_BASE_URL}${posterPath}` : '';
        const backdropUrl = backdropPath ? `${TMDB_IMAGE_BASE_URL}${backdropPath}` : '';
        
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);
        const seasonsCount = data.number_of_seasons ? `${data.number_of_seasons} Temporada${data.number_of_seasons > 1 ? 's' : ''}` : null;
        const runtime = data.runtime ? `${data.runtime} min` : null;
        
        const imdbScore = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
        const displayType = mediaType === 'movie' ? 'Filme' : 'Série';
        
        // Favoritos
        const isFav = isFavorite(tmdbId, mediaType);
        const favIcon = isFav ? '&#9829;' : '&#9825;';
        const favClass = isFav ? 'is-favorite' : '';


        // Atualiza o fundo do modal para o efeito backdrop
        const modalContent = detailsModal.querySelector('.modal-content');
        if (backdropUrl) {
            modalContent.style.backgroundImage = `url(${backdropUrl})`;
            modalContent.classList.add('has-backdrop');
        } else {
            modalContent.style.backgroundImage = 'none';
            modalContent.classList.remove('has-backdrop');
        }

        // Metadados formatados
        const metadataHtml = [];
        if (seasonsCount) metadataHtml.push(`<span class="metadata-item">${seasonsCount}</span>`);
        if (runtime) metadataHtml.push(`<span class="metadata-item">${runtime}</span>`);
        if (year) metadataHtml.push(`<span class="metadata-item">${year}</span>`);
        if (imdbScore !== 'N/A') metadataHtml.push(`<span class="metadata-item imdb-score">IMDb ${imdbScore}</span>`);


        detailsContent.innerHTML = `
            <div class="modal-info-container">
                <img src="${posterUrl}" alt="Pôster de ${title}" class="modal-poster">
                <div class="modal-text-content">
                    
                    <h3>${title}</h3>
                    
                    <p class="modal-metadata">
                        ${metadataHtml.join('\n')}
                    </p>
                    
                    <p class="modal-sinopse">${sinopse}</p>

                    <div class="modal-actions">
                        <button class="watch-button action-button primary-button" 
                                data-id="${tmdbId}" data-type="${mediaType}" data-title="${title}">
                            ▶︎ Assistir
                        </button>
                        <button class="action-button icon-button modal-favorite-button"
                                data-id="${tmdbId}" data-type="${mediaType}">
                            <span class="icon-save ${favClass}">${favIcon}</span>
                        </button>
                    </div>

                </div>
            </div>
            
            <div style="clear: both;"></div>
        `;
        
        // Reconecta o listener para o botão Assistir no modal
        detailsContent.querySelector('.watch-button').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const title = e.target.dataset.title;
            // Fecha o modal e inicia o player
            detailsModal.style.display = 'none';
            handleWatchClick(id, type, title);
        });
        
        // Anexa o listener para o botão Favoritar no Modal
        detailsContent.querySelector('.modal-favorite-button').addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const type = e.currentTarget.dataset.type;
            toggleFavorite(id, type);
            // O toggleFavorite já chama updateFavoriteButtonState, que atualiza o ícone
        });


    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        detailsContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
        detailsModal.querySelector('.modal-content').classList.remove('has-backdrop');
        detailsModal.querySelector('.modal-content').style.backgroundImage = 'none';
    }
}


/**
 * Função para buscar e mesclar os dados de IPTV-ORG.
 */
async function fetchAndCombineIPTVData() {
    try {
        // Busca os 3 arquivos essenciais: canais, streams E logos.
        const [channelsResponse, streamsResponse, logosResponse] = await Promise.all([
            fetch(`${IPTV_ORG_API_BASE}/channels.json`),
            fetch(`${IPTV_ORG_API_BASE}/streams.json`),
            fetch(`${IPTV_ORG_API_BASE}/logos.json`) 
        ]);

        if (!channelsResponse.ok || !streamsResponse.ok || !logosResponse.ok) {
            throw new Error("Falha ao carregar um ou mais arquivos IPTV-ORG.");
        }

        const channelsData = await channelsResponse.json();
        const streamsData = await streamsResponse.json();
        const logosData = await logosResponse.json(); 
        
        // Mapeia canais e logos por ID para acesso rápido
        const channelMap = new Map(channelsData.map(c => [c.id, c]));
        // Mapeia logos pela ID do canal. Muitos canais têm várias logos; pegamos a primeira.
        const logoMap = new Map();
        logosData.forEach(logo => {
            if (logo.channel && !logoMap.has(logo.channel)) {
                logoMap.set(logo.channel, logo.url);
            }
        });


        const combinedList = streamsData
            // Filtra streams M3U8 válidos
            .filter(stream => stream.url && stream.url.endsWith('.m3u8')) 
            .map(stream => {
                const channel = channelMap.get(stream.channel);
                
                if (!channel) return null; 

                // Obtém a URL da logo diretamente do mapeamento de logos
                const logoUrl = logoMap.get(channel.id);

                return {
                    id: stream.channel,
                    name: channel.name,
                    category: channel.categories.join(', ') || 'Geral',
                    streamUrl: stream.url, 
                    // Usa a URL garantida pelo logos.json
                    logoUrl: logoUrl || 'placeholder_logo.png' 
                };
            })
            .filter(item => item !== null)
            // Remove duplicados
            .filter((value, index, self) => 
                index === self.findIndex((t) => (
                    t.id === value.id
                ))
            ); 

        return combinedList;

    } catch (error) {
        console.error('Erro CRÍTICO ao buscar e combinar dados do IPTV-ORG:', error);
        return []; 
    }
}


/**
 * Carrega a lista de canais usando a nova fonte IPTV-ORG (TODOS OS PAÍSES).
 */
async function loadLiveTV() {
    resetView('results-container'); 
    resultsContainer.innerHTML = '<h2>TV ao Vivo</h2><p>Buscando lista de canais (IPTV-ORG)...</p>';

    currentCategory.endpoint = 'live_tv'; 
    currentCategory.title = 'TV ao Vivo';
    
    // Carrega os dados APENAS se ainda não estiverem na memória
    if (iptvChannels.length === 0) {
        iptvChannels = await fetchAndCombineIPTVData();
    }

    const channels = iptvChannels;

    if (channels.length === 0) {
        resultsContainer.innerHTML = `
            <h2>TV ao Vivo</h2>
            <p style="color: red;">Erro: Não foi possível carregar a lista de canais ativos do IPTV-ORG. Tente novamente mais tarde.</p>
        `;
        return;
    }

    // Renderiza a grade de canais com o novo título
    resultsContainer.innerHTML = `<section class="catalog-section">
        <h2>Todos os Canais Ativos (${channels.length} itens)</h2>
        <div id="channels-grid" class="results-grid"></div>
    </section>`;
    
    const channelsGrid = document.getElementById('channels-grid');

    channels.forEach(channel => {
        const card = document.createElement('div');
        // Adiciona a classe channel-card
        card.className = 'movie-card channel-card';
        
        const logoSrc = channel.logoUrl || 'placeholder_logo.png'; 
        const channelId = channel.id; 
        const channelName = channel.name || 'Canal Desconhecido';
        const channelCategory = channel.category; 

        // Cards de TV Ao Vivo usam o card-info original (sem a lógica de hover)
        card.innerHTML = `
            <img src="${logoSrc}" 
                 alt="${channelName}" 
                 class="channel-logo" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/200x200?text=Logo+N%C3%A3o+Encontrada'"> 
            <div class="card-info">
                <h3>${channelName}</h3> 
                <p style="font-size: 0.9em; color: #ccc;">${channelCategory}</p>
                <button class="watch-channel-button action-button primary-button" 
                            data-channel-id="${channelId}" data-title="${channelName}" 
                            style="width: 90%; margin-top: 10px;">
                    ASSISTIR AO VIVO
                </button>
            </div>
        `;
        channelsGrid.appendChild(card);
    });
    
    attachChannelListeners();
}

/**
 * Anexa listeners para os botões de ASSISTIR AO VIVO.
 */
function attachChannelListeners() {
    document.querySelectorAll('.watch-channel-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const channelId = event.target.dataset.channelId;
            const title = event.target.dataset.title;
            
            playLiveChannel(channelId, title); 
        };
    });
}

/**
 * Carrega o canal de TV no player (USANDO SOMENTE HLS.JS).
 */
async function playLiveChannel(channelId, title) {
    resetView('player-container');
    playerTitle.textContent = title;
    
    const playerOptionsDiv = playerContainer.querySelector('.player-options');
    if(playerOptionsDiv) {
        playerOptionsDiv.style.display = 'none'; 
    }
    seriesSelectors.style.display = 'none'; 

    videoPlayerDiv.innerHTML = `<p>Buscando URL do stream para ${title}...</p>`;

    // Busca a URL M3U8 nos dados pré-carregados
    const channel = iptvChannels.find(c => c.id === channelId);
    const streamUrl = channel ? channel.streamUrl : null;

    if (!streamUrl) {
        videoPlayerDiv.innerHTML = `
            <div style="padding: 30px; background-color: #2a2a2a; border-radius: 8px; max-width: 500px; margin: 50px auto; text-align: center; border: 1px solid red;">
                <p style="color: red; font-size: 1.1em; margin-bottom: 15px;">
                    ❌ Stream Indisponível
                </p>
                <p style="color: #ccc; font-size: 0.9em; margin-bottom: 20px;">
                    Não foi possível encontrar a URL de stream M3U8 para **${title}** na base de dados IPTV-ORG.
                </p>
                <button onclick="loadLiveTV()" class="action-button primary-button" style="background-color: #555;">
                    Voltar para a lista
                </button>
            </div>
        `;
        return;
    }

    // Tenta reproduzir o M3U8 via HLS.js
    const video = document.createElement('video');
    video.id = 'live-video-player';
    video.controls = true;
    video.autoplay = true; 
    video.style.width = '100%';
    video.style.height = '100%';
    
    videoPlayerDiv.innerHTML = '';
    videoPlayerDiv.appendChild(video);
    
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(error => {
                console.warn('Autoplay bloqueado pelo navegador.', error);
                videoPlayerDiv.insertAdjacentHTML('beforeend', `
                    <div class="stream-info-overlay" style="margin-top: 20px;">
                        <p style="color: #ffcc00; font-weight: bold; margin-bottom: 5px;">
                            ⚠️ CLIQUE NECESSÁRIO
                        </p>
                        <p style="color: #ccc; font-size: 0.9em; margin-bottom: 0;">
                            O navegador bloqueou a reprodução automática. Clique no botão de Play no vídeo.
                        </p>
                    </div>
                `);
            });
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    } else {
         videoPlayerDiv.innerHTML = `<p style="color: red; margin-top: 50px;">
            Seu navegador não suporta o formato de stream (M3U8).
        </p>`;
    }
}


/**
 * Função de busca manual (quando o usuário digita na busca).
 */
async function searchMedia(query) {
    if (!query) return; 

    resetView('results-container');
    resultsContainer.innerHTML = `<p>Buscando resultados para "${query}"...</p>`;
    currentCategory.endpoint = null; 

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>Resultados da Busca</h2><div id="search-results" class="results-grid"></div></section>`;
        const searchResultsContainer = document.getElementById('search-results');

        displayResults(data.results, searchResultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 5. EVENTOS ---

// Evento de navegação: Listener para os links
mainNav.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') {
        event.preventDefault(); 
        const endpoint = event.target.dataset.endpoint;
        const title = event.target.textContent;

        if (endpoint === 'catalog') {
            loadCatalog(); 
        } else if (endpoint === 'live_tv') { 
            loadLiveTV();
        } else if (endpoint === 'favorites') { 
            loadFavoritesCatalog();
        } else {
            loadCategory(endpoint, title, 1); 
        }
    }
});

// Evento: Clique na logo/título para ir para TV ao Vivo
logoContainer.addEventListener('click', (event) => {
    event.preventDefault();
    loadLiveTV();
});

// Evento de busca no clique do botão
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchMedia(query);
    } else {
        loadCatalog();
    }
});

// Evento de busca no Enter
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        searchButton.click();
    }
});

// Evento: Seleção de Temporada
seasonSelect.addEventListener('change', (event) => {
    const newSeason = parseInt(event.target.value);
    currentMedia.currentSeason = newSeason;
    updateEpisodeOptions(newSeason);
});

// Evento: Seleção de Episódio
episodeSelect.addEventListener('change', (event) => {
    currentMedia.currentEpisode = parseInt(event.target.value);
});

// Evento: Recarregar o player
loadPlayerButton.addEventListener('click', () => {
    if (currentMedia.tmdbId) {
        createPlayer();
    }
});

// Evento do Modal: Fecha ao clicar no botão 'x'
closeButton.addEventListener('click', () => {
    detailsModal.style.display = 'none';
});

// Evento do Modal: Fecha se o usuário clicar fora dele
window.addEventListener('click', (event) => {
    if (event.target == detailsModal) {
        detailsModal.style.display = 'none';
    }
});

// Evento: Voltar ao Catálogo
backButton.addEventListener('click', () => {
    resetView('catalog-container'); 
    loadCatalog();
    Object.assign(currentMedia, {
        tmdbId: null, mediaType: null, title: null, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });
});

// Inicialização: Carrega o catálogo e o banner
document.addEventListener('DOMContentLoaded', () => {
    loadCatalog();
    loadHeroBanner(); 
    loadGenres(); 
});