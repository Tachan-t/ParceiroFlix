// ATENÇÃO: Substitua 'SUA_CHAVE_TMDB' pela sua chave de API real do TMDB.
// Esta chave será usada para buscar os metadados (capa, título, ID, etc.).
const TMDB_API_KEY = '62fd8e76492e4bdda5e40b8eb6520a00'; 
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Elementos HTML
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const mainNav = document.getElementById('main-nav'); 
const catalogContainer = document.getElementById('catalog-container');
const resultsContainer = document.getElementById('results-container');
const playerContainer = document.getElementById('player-container');
const videoPlayer = document.getElementById('video-player');
const playerTitle = document.getElementById('player-title');
const backButton = document.getElementById('back-button');
const playerSourceSelect = document.getElementById('player-source');
const loadPlayerButton = document.getElementById('load-player-button');

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

// --- FUNÇÕES DE UTILIDADE E FLUXO ---

/**
 * Funcao para resetar a visualizacao e limpar os containers principais.
 * @param {string} targetContainerId ID do container que deve ficar visível ('catalog-container', 'results-container', 'player-container').
 */
function resetView(targetContainerId) {
    catalogContainer.style.display = 'none';
    resultsContainer.style.display = 'none';
    playerContainer.style.display = 'none';
    
    // Limpa apenas o container que não será usado no momento (ou será preenchido)
    if (targetContainerId !== 'catalog-container') {
        catalogContainer.innerHTML = '';
    }
    if (targetContainerId !== 'results-container') {
        resultsContainer.innerHTML = '';
    }
    
    // Torna o container de destino visível
    const target = document.getElementById(targetContainerId);
    if (target) {
        target.style.display = targetContainerId === 'results-container' ? 'grid' : 'block';
    }
}

/**
 * Anexa os listeners de clique aos botões dos cards.
 */
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

// --- FUNÇÕES DE CARREGAMENTO DE CONTEÚDO ---

const catalogQueries = [
    { endpoint: '/trending/movie/week', title: 'Filmes Populares da Semana', type: 'movie' },
    { endpoint: '/tv/on_the_air', title: 'Séries Atuais', type: 'tv' },
    { endpoint: '/movie/top_rated', title: 'Os Filmes Mais Bem Avaliados', type: 'movie' },
];

/**
 * Carrega e exibe as listas de catálogo na tela inicial.
 */
async function loadCatalog() {
    resetView('catalog-container'); // Oculta tudo, exibe apenas o catálogo

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
 * Carrega filmes/séries baseados em um endpoint de categoria (menu de navegação).
 */
async function loadCategory(endpoint, title) {
    resetView('results-container'); // Oculta tudo, exibe apenas o resultsContainer
    resultsContainer.innerHTML = `<p>Carregando ${title}...</p>`;

    const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=pt-BR`;
    
    const primaryType = endpoint.includes('/movie/') ? 'movie' : 'tv';

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Cria a nova estrutura de carrossel no resultsContainer
        resultsContainer.innerHTML = `<section class="catalog-section"><h2>${title}</h2><div id="category-results" class="carousel-row"></div></section>`;
        const categoryResultsContainer = document.getElementById('category-results');

        displayResults(data.results, categoryResultsContainer, primaryType);

    } catch (error) {
        console.error(`Erro ao carregar categoria ${title}:`, error);
        resultsContainer.innerHTML = `<p>Erro ao carregar categoria: ${error.message}</p>`;
    }
}

/**
 * Exibe os resultados da busca (usada tanto para busca quanto para catálogo).
 */
function displayResults(results, container = resultsContainer, forcedType = null) {
    // A visibilidade dos containers principais já foi ajustada por resetView()
    
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
        const posterUrl = `${TMDB_IMAGE_BASE_URL}${item.poster_path}`;

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

    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=pt-BR`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Erro ao buscar dados do TMDB. Verifique a chave da API.');
        }
        const data = await response.json();
        
        // Renderiza no resultsContainer (que já está configurado como grid para buscas)
        displayResults(data.results, resultsContainer);

    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = `<p>Erro: ${error.message}</p>`;
    }
}


// --- 4. FUNÇÕES DE PLAYER E MODAL (Omitidas por brevidade, mas devem estar no seu arquivo) ---

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
    Object.assign(currentMedia, {
        tmdbId, mediaType, title: mediaTitle, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });

    resetView('player-container'); // Exibe apenas o player
    playerTitle.textContent = mediaTitle;
    seriesSelectors.style.display = 'none'; 

    await getImdbId(tmdbId, mediaType);
    
    if (mediaType === 'tv') {
        seriesSelectors.style.display = 'block';
        await loadSeriesOptions(tmdbId);
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
        const posterUrl = posterPath ? `${TMDB_IMAGE_BASE_URL}${posterPath}` : '';
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


// --- 5. EVENTOS ---

// Evento de navegação: Listener para os links
mainNav.addEventListener('click', (event) => {
    if (event.target.tagName === 'A') {
        event.preventDefault(); 
        const endpoint = event.target.dataset.endpoint;
        const title = event.target.textContent;

        if (endpoint === 'catalog') {
            loadCatalog(); 
        } else {
            loadCategory(endpoint, title); 
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
    resetView('catalog-container'); // Garante que apenas o catálogo seja exibido
    loadCatalog(); // Recarrega o conteúdo
    Object.assign(currentMedia, {
        tmdbId: null, mediaType: null, title: null, imdbId: null, seasons: [], currentSeason: 1, currentEpisode: 1
    });
});

// Inicialização: Carrega o catálogo assim que a página é carregada
document.addEventListener('DOMContentLoaded', loadCatalog);