// ATENÇÃO: Substitua 'SUA_CHAVE_TMDB' pela sua chave de API real do TMDB.
// Esta chave será usada para buscar os metadados (capa, título, ID, etc.).
const TMDB_API_KEY = '62fd8e76492e4bdda5e40b8eb6520a00'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// CORREÇÃO: Variáveis Base URL para diferentes tipos de imagem
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'; 
const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500'; 


// Elementos HTML
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const mainNav = document.getElementById('main-nav'); 
const heroBannerContainer = document.getElementById('hero-banner-container'); 
const heroCarousel = document.getElementById('hero-carousel');
const catalogContainer = document.getElementById('catalog-container');
const resultsContainer = document.getElementById('results-container');
const playerContainer = document.getElementById('player-container');
const videoPlayer = document.getElementById('video-player'); // <--- CORREÇÃO GARANTIDA!
const playerTitle = document.getElementById('player-title');
const backButton = document.getElementById('back-button');
const playerSourceSelect = document.getElementById('player-source');
const loadPlayerButton = document.getElementById('load-player-button');

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

// Variáveis de Gênero
let movieGenres = [];
let tvGenres = [];


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

        // Anexa listener ao botão do banner
        heroCarousel.querySelectorAll('.hero-watch-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                const title = e.target.dataset.title;
                handleWatchClick(id, type, title);
            });
        });

        // Inicia a rotação
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

/**
 * Popula os menus dropdown com os gêneros obtidos, mantendo os links fixos.
 */
function populateDropdowns() {
    
    // Adiciona divisor para filmes
    const movieSeparator = document.createElement('hr');
    moviesDropdown.appendChild(movieSeparator);
    
    // Adiciona divisor para séries
    const tvSeparator = document.createElement('hr');
    tvDropdown.appendChild(tvSeparator);
    
    // 1. Filmes (Adiciona a lista de gêneros abaixo dos fixos)
    movieGenres.forEach(genre => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-endpoint="/discover/movie?with_genres=${genre.id}" data-title="${genre.name}">${genre.name}</a>`;
        moviesDropdown.appendChild(li);
    });

    // 2. Séries (Adiciona a lista de gêneros abaixo dos fixos)
    tvGenres.forEach(genre => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-endpoint="/discover/tv?with_genres=${genre.id}" data-title="${genre.name}">${genre.name}</a>`;
        tvDropdown.appendChild(li);
    });
}


// --- 1. FUNÇÕES DE UTILIDADE E LISTENERS ---

function attachListeners() {
    document.querySelectorAll('.watch-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const id = event.target.dataset.id;
            const type = event.target.dataset.type;
            const title = event.target.dataset.title;
            handleWatchClick(id, type, title);
        };
    });
    
    document.querySelectorAll('.details-button').forEach(button => {
        button.onclick = null; 
        button.onclick = (event) => {
            const id = event.target.dataset.id;
            const type = event.target.dataset.type;
            showDetailsModal(id, type);
        };
    });
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
    if (targetContainerId === 'catalog-container') {
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

    for (const query of catalogQueries) {
        const url = `${TMDB_BASE_URL}${query.endpoint}?api_key=${TMDB_API_KEY}&language=pt-BR`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            const section = document.createElement('section');
            section.className = 'catalog-section';
            section.innerHTML = `<h2>${query.title}</h2><div class="carousel-row" id="row-${query.endpoint.replace(/\//g, '-')}"></div>`;
            catalogContainer.appendChild(section);

            displayResults(data.results, section.querySelector('.carousel-row'), query.type);

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
 * Exibe os resultados na tela.
 */
function displayResults(results, container = resultsContainer, forcedType = null) {
    
    // Mapeia e filtra os resultados
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

    // Limpa o container específico antes de renderizar
    container.innerHTML = '';
    
    // Renderiza os cards
    validResults.forEach(item => {
        const type = item.media_type;
        const title = item.title; 
        const mediaId = item.id;
        const posterUrl = `${TMDB_POSTER_BASE_URL}${item.poster_path}`;

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${posterUrl}" alt="${title}">
            <div class="card-info">
                <h3>${title}</h3>
                <button class="watch-button" data-id="${mediaId}" data-type="${type}" data-title="${title}">
                    Assistir
                </button>
                <button class="details-button" data-id="${mediaId}" data-type="${type}" style="background-color: #444; margin-top: 5px;">
                    Detalhes
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    attachListeners();
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


// --- 3. FUNÇÕES DE PLAYER E MODAL (Demais Funções) ---

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

    videoPlayer.innerHTML = ''; 
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
                videoPlayer.innerHTML = `<p>A fonte **playerflixapi.com** exige o ID do IMDB para filmes. Tente outra fonte.</p>`;
                return;
            }
            embedUrl = `https://playerflixapi.com/filme/${imdbId}`;
        } else {
            embedUrl = `https://playerflixapi.com/serie/${tmdbId}/${currentSeason}/${currentEpisode}`;
        }
    } else if (source === 'vidsrc.to') {
        if (!imdbId) {
            videoPlayer.innerHTML = `<p>A fonte **vidsrc.to** exige o ID do IMDB, que não foi encontrado para este título. Tente outra fonte.</p>`;
            return;
        }
        if (mediaType === 'movie') {
            embedUrl = `https://vidsrc.to/embed/movie/${imdbId}`;
        } else {
             videoPlayer.innerHTML = `<p>A fonte **vidsrc.to** não suporta seleção direta de episódio. Tente outra opção.</p>`;
             return;
        }
    } else {
        videoPlayer.innerHTML = `<p>Fonte de player desconhecida.</p>`;
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.allowFullscreen = true; 
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    
    videoPlayer.appendChild(iframe);
}

async function showDetailsModal(tmdbId, mediaType) {
    const typeEndpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const url = `${TMDB_BASE_URL}/${typeEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    detailsContent.innerHTML = '<p>Carregando detalhes...</p>';
    detailsModal.style.display = 'block';

    try {
        const response = await fetch(url);
        const data = await response.json();

        const title = data.title || data.name;
        const sinopse = data.overview || 'Sinopse não disponível em Português.';
        const posterPath = data.poster_path;
        const posterUrl = posterPath ? `${TMDB_POSTER_BASE_URL}${posterPath}` : '';
        const year = (data.release_date || data.first_air_date || '').substring(0, 4);

        detailsContent.innerHTML = `
            ${posterPath ? `<img src="${posterUrl}" alt="Pôster de ${title}">` : ''}
            <h3>${title} (${year})</h3>
            <p><strong>Tipo:</strong> ${mediaType === 'movie' ? 'Filme' : 'Série de TV'}</p>
            <p><strong>Nota (TMDB):</strong> ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}</p>
            <p><strong>Sinopse:</strong> ${sinopse}</p>
            <div style="clear: both;"></div>
        `;
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        detailsContent.innerHTML = `<p>Erro ao carregar detalhes: ${error.message}</p>`;
    }
}


// --- 4. EVENTOS ---

// Evento de navegação: Listener para os links
mainNav.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') {
        event.preventDefault(); 
        const endpoint = event.target.dataset.endpoint;
        const title = event.target.textContent;

        if (endpoint === 'catalog') {
            loadCatalog(); 
        } else {
            // Se for um link de categoria/gênero, carrega a página 1
            loadCategory(endpoint, title, 1); 
        }
    }
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