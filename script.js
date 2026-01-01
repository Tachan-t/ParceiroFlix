/* script.js - Final Version 10.0 */

const CONFIG = {
    API_KEY: '62fd8e76492e4bdda5e40b8eb6520a00',
    BASE_URL: 'https://api.themoviedb.org/3',
    IMG_W500: 'https://image.tmdb.org/t/p/w500',
    IMG_ORIG: 'https://image.tmdb.org/t/p/original',
    IPTV_BR_URL: 'https://iptv-org.github.io/iptv/countries/br.m3u'
};

const state = {
    favorites: JSON.parse(localStorage.getItem('cineStreamFavorites')) || [],
    watchedList: JSON.parse(localStorage.getItem('cineStreamWatched')) || {},
    heroInterval: null,
    currentSlide: 0,
    media: { id: null, type: null, season: 1, episode: 1 },
    grid: { mode: null, param: null, title: null, page: 1, totalPages: 1 }
};

/* DOM */
const dom = {
    views: {
        home: document.getElementById('view-home'),
        grid: document.getElementById('view-grid'),
        player: document.getElementById('view-player')
    },
    containers: {
        hero: document.getElementById('hero-carousel'),
        catalog: document.getElementById('catalog-container'),
        grid: document.getElementById('results-grid'),
        gridTitle: document.getElementById('grid-title'),
        pagination: document.getElementById('pagination'),
        genreScroller: document.getElementById('genre-scroller'),
        genreBar: document.getElementById('genre-bar')
    },
    player: {
        sidebar: document.getElementById('series-sidebar'),
        seasons: document.getElementById('seasons-list'),
        episodes: document.getElementById('episodes-list'),
        wrapper: document.getElementById('video-wrapper'),
        title: document.getElementById('player-title'),
        layout: document.getElementById('player-layout-area')
    },
    navLinks: document.querySelectorAll('.nav-link')
};

/* HISTÓRICO */
function markAsWatched(tvId, season, episode) {
    const key = `${tvId}-s${season}-e${episode}`;
    state.watchedList[key] = true;
    localStorage.setItem('cineStreamWatched', JSON.stringify(state.watchedList));
}

function isWatched(tvId, season, episode) {
    const key = `${tvId}-s${season}-e${episode}`;
    return !!state.watchedList[key];
}

/* NAVEGAÇÃO */
function switchView(viewName) {
    Object.values(dom.views).forEach(el => el.style.display = 'none');
    if(dom.views[viewName]) dom.views[viewName].style.display = 'block';
    window.scrollTo(0, 0);
}

/* HOME */
async function loadHome() {
    switchView('home');
    dom.containers.catalog.innerHTML = '';
    await loadHero();

    const sections = [
        { title: 'Populares', path: '/trending/all/week' },
        { title: 'Filmes em Alta', path: '/movie/popular', type: 'movie' },
        { title: 'Séries do Momento', path: '/tv/popular', type: 'tv' },
        { title: 'Ação & Aventura', path: '/discover/movie?with_genres=28', type: 'movie' }
    ];

    for (const sec of sections) {
        const data = await fetchApi(sec.path);
        if (data && data.results) {
            const div = document.createElement('div');
            div.className = 'catalog-section';
            div.innerHTML = `<h2 class="section-title">${sec.title}</h2><div class="carousel-wrapper"><button class="carousel-nav-btn left">&#10094;</button><div class="carousel-row"></div><button class="carousel-nav-btn right">&#10095;</button></div>`;
            
            const row = div.querySelector('.carousel-row');
            const btnLeft = div.querySelector('.left');
            const btnRight = div.querySelector('.right');

            btnLeft.onclick = () => row.scrollBy({ left: -800, behavior: 'smooth' });
            btnRight.onclick = () => row.scrollBy({ left: 800, behavior: 'smooth' });

            data.results.forEach(item => {
                const card = createCard(item, sec.type);
                if(card) row.appendChild(card);
            });
            dom.containers.catalog.appendChild(div);
        }
    }
}

/* FAVORITOS */
function loadFavorites() {
    switchView('grid');
    dom.containers.gridTitle.textContent = 'Favoritos';
    dom.containers.grid.innerHTML = '';
    dom.containers.pagination.innerHTML = '';

    if(!state.favorites.length) { 
        dom.containers.grid.innerHTML = '<p>Lista vazia. Adicione itens clicando no coração!</p>'; 
        return; 
    }

    state.favorites.forEach(f => {
        const card = createCard({
            id: f.id, 
            title: f.title, 
            poster_path: f.poster,
            media_type: f.type
        }, f.type, true);
        if(card) dom.containers.grid.appendChild(card);
    });
}

/* TV AO VIVO */
async function loadTV() {
    switchView('grid');
    dom.containers.gridTitle.textContent = 'TV ao Vivo';
    dom.containers.grid.innerHTML = '<div class="loader">Sintonizando...</div>';
    dom.containers.pagination.innerHTML = '';

    try {
        const res = await fetch(CONFIG.IPTV_BR_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const channels = [];
        let cur = {};

        lines.forEach(l => {
            l = l.trim();
            if(l.startsWith('#EXTINF:')) {
                const logo = l.match(/tvg-logo="([^"]*)"/);
                const names = l.split(',');
                cur = { name: names[names.length-1].trim(), logo: logo ? logo[1] : null };
            } else if(l.startsWith('http') && cur.name) {
                channels.push({...cur, url: l});
                cur = {};
            }
        });

        dom.containers.grid.innerHTML = '';
        if(!channels.length) { dom.containers.grid.innerHTML = '<p>Sem canais.</p>'; return; }

        channels.forEach(ch => {
            const card = document.createElement('div');
            card.className = 'movie-card channel-card';
            const img = ch.logo || 'https://via.placeholder.com/150x150?text=TV';
            card.innerHTML = `<img src="${img}" class="channel-logo" loading="lazy"><div>${ch.name}</div>`;
            card.onclick = () => openPlayer(null, 'tv_live', ch.name, ch.url);
            dom.containers.grid.appendChild(card);
        });
    } catch(e) { dom.containers.grid.innerHTML = '<p>Erro na TV.</p>'; }
}

/* GRADE */
async function loadGrid(mode, param, title, page = 1) {
    switchView('grid');
    state.grid = { mode, param, title, page, totalPages: 1 };
    
    dom.containers.gridTitle.textContent = title;
    dom.containers.grid.innerHTML = '<div class="loader">Carregando...</div>';
    dom.containers.pagination.innerHTML = '';

    let url = '';
    let typeFixed = null;

    if (mode === 'movies') { url = `/movie/popular?page=${page}`; typeFixed = 'movie'; }
    else if (mode === 'series') { url = `/tv/popular?page=${page}`; typeFixed = 'tv'; }
    else if (mode === 'search') { url = `/search/multi?query=${encodeURIComponent(param)}&page=${page}`; }
    else if (mode === 'genre') { url = `/discover/movie?with_genres=${param}&sort_by=popularity.desc&page=${page}`; typeFixed = 'movie'; }

    const data = await fetchApi(url);
    dom.containers.grid.innerHTML = '';

    if (data && data.results) {
        state.grid.totalPages = data.total_pages;
        data.results.forEach(item => {
            const card = createCard(item, typeFixed);
            if(card) dom.containers.grid.appendChild(card);
        });
        renderPagination();
    } else {
        dom.containers.grid.innerHTML = '<p>Nenhum resultado.</p>';
    }
}

function renderPagination() {
    const { page, totalPages } = state.grid;
    if (totalPages <= 1) return;
    const div = dom.containers.pagination;
    div.innerHTML = '';
    const createBtn = (lbl, pg, active=false) => {
        const b = document.createElement('button');
        b.className = `page-btn ${active?'active':''}`;
        b.textContent = lbl;
        b.onclick = () => loadGrid(state.grid.mode, state.grid.param, state.grid.title, pg);
        div.appendChild(b);
    };
    if (page > 1) createBtn('Anterior', page - 1);
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) createBtn(i, i, i === page);
    if (page < totalPages) createBtn('Próxima', page + 1);
}

/* PLAYER */
function openPlayer(id, type, title, liveUrl) {
    switchView('player');
    dom.player.title.textContent = title;
    dom.player.wrapper.innerHTML = '';
    
    if (type === 'tv_live') {
        dom.player.layout.className = 'player-layout movie-mode'; 
        dom.player.sidebar.style.display = 'none';
        const video = document.createElement('video');
        video.controls = true; video.autoplay = true; video.style.width='100%'; video.style.height='100%';
        dom.player.wrapper.appendChild(video);
        if (Hls.isSupported() && liveUrl.endsWith('.m3u8')) {
            const hls = new Hls(); hls.loadSource(liveUrl); hls.attachMedia(video);
        } else { video.src = liveUrl; }
        return;
    }

    state.media = { id, type, season: 1, episode: 1 };

    if(type === 'movie') {
        dom.player.layout.className = 'player-layout movie-mode';
        dom.player.sidebar.style.display = 'none';
        loadIframe();
    } else {
        dom.player.layout.className = 'player-layout';
        dom.player.sidebar.style.display = 'flex';
        loadSeasons(id);
    }
}

async function loadSeasons(id) {
    const data = await fetchApi(`/tv/${id}`);
    dom.player.seasons.innerHTML = '';
    if (data && data.seasons) {
        data.seasons.filter(s => s.season_number > 0).forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'season-btn';
            btn.textContent = `T${s.season_number}`;
            btn.onclick = () => {
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadEpisodes(id, s.season_number);
            };
            dom.player.seasons.appendChild(btn);
        });
        loadEpisodes(id, 1);
    }
}

async function loadEpisodes(id, season) {
    state.media.season = season;
    const data = await fetchApi(`/tv/${id}/season/${season}`);
    dom.player.episodes.innerHTML = '';
    if (data && data.episodes) {
        data.episodes.forEach(ep => {
            const btn = document.createElement('button');
            const watched = isWatched(id, season, ep.episode_number);
            btn.className = `episode-btn ${watched ? 'watched' : ''}`;
            btn.textContent = `${ep.episode_number}. ${ep.name}`;
            btn.onclick = () => {
                document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                markAsWatched(id, season, ep.episode_number);
                btn.classList.add('watched');
                state.media.episode = ep.episode_number;
                loadIframe();
            };
            dom.player.episodes.appendChild(btn);
        });
    }
    state.media.episode = 1;
    loadIframe();
}

function loadIframe() {
    const { id, type, season, episode } = state.media;
    const source = document.getElementById('player-source').value;
    let url = '';
    if (source === 'megaembed.com') url = type === 'movie' ? `https://megaembed.com/embed/movie/${id}` : `https://megaembed.com/embed/tv/${id}/${season}/${episode}`;
    else if (source === 'vidsrc-embed.ru') url = type === 'movie' ? `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&ds_lang=pt` : `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${season}&episode=${episode}&ds_lang=pt`;
    else url = type === 'movie' ? `https://2embed.top/embed/movie/${id}` : `https://2embed.top/embed/tv/${id}/${season}/${episode}`;
    dom.player.wrapper.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;
}

/* --- CORE --- */
function createCard(item, forcedType, isFavLoad = false) {
    let type = forcedType || item.media_type || (item.title ? 'movie' : 'tv');
    const title = item.title || item.name;
    const poster = item.poster_path;
    if(!poster) return null;
    const imgUrl = isFavLoad ? poster : CONFIG.IMG_W500 + poster;
    const isF = state.favorites.some(f => String(f.id) === String(item.id));
    const div = document.createElement('div');
    div.className = 'movie-card';
    div.innerHTML = `<button class="fav-btn-card" style="color:${isF ? '#e50914' : '#fff'}">${isF ? '♥' : '♡'}</button><img src="${imgUrl}" loading="lazy">`;
    div.onclick = (e) => { if(!e.target.classList.contains('fav-btn-card')) openModal(item.id, type); };
    div.querySelector('.fav-btn-card').onclick = (e) => {
        e.stopPropagation(); toggleFav(item.id, type, title, imgUrl);
        e.target.textContent = e.target.textContent === '♡' ? '♥' : '♡';
        e.target.style.color = e.target.style.color === 'rgb(255, 255, 255)' ? '#e50914' : '#fff';
        if(dom.containers.gridTitle.textContent === 'Favoritos') loadFavorites();
    };
    return div;
}

async function openModal(id, type) {
    const modal = document.getElementById('details-modal');
    modal.classList.add('open');
    const content = document.getElementById('details-content');
    content.innerHTML = 'Carregando...';
    const data = await fetchApi(`/${type}/${id}`);
    const title = data.title || data.name;
    const desc = data.overview || 'Sem descrição.';
    const img = data.poster_path ? CONFIG.IMG_W500 + data.poster_path : '';
    const isF = state.favorites.some(f => String(f.id) === String(id));
    content.innerHTML = `
        <div style="display:flex; gap:30px; flex-wrap:wrap;">
            <img src="${img}" style="width:200px; border-radius:8px; box-shadow:0 5px 20px rgba(0,0,0,0.5);">
            <div style="flex:1">
                <h2 style="font-size:2rem; margin-top:0;">${title}</h2>
                <p style="color:#bbb; font-size:1rem; line-height:1.6;">${desc}</p>
                <div style="margin-top:30px; display:flex; gap:15px;">
                    <button id="modal-play" class="btn-primary">▶ Assistir</button>
                    <button id="modal-fav" class="btn-secondary">${isF ? '♥ Remover Favorito' : '♡ Adicionar Favorito'}</button>
                </div>
            </div>
        </div>`;
    document.getElementById('modal-play').onclick = () => { modal.classList.remove('open'); openPlayer(id, type, title); };
    document.getElementById('modal-fav').onclick = () => {
        toggleFav(id, type, title, img); openModal(id, type);
    };
}

function toggleFav(id, type, title, poster) {
    const idx = state.favorites.findIndex(f => String(f.id) === String(id));
    if(idx === -1) state.favorites.push({id: String(id), type, title, poster});
    else state.favorites.splice(idx, 1);
    localStorage.setItem('cineStreamFavorites', JSON.stringify(state.favorites));
}

async function fetchApi(path) { try { return await (await fetch(`${CONFIG.BASE_URL}${path}${path.includes('?')?'&':'?'}api_key=${CONFIG.API_KEY}&language=pt-BR`)).json(); } catch(e) { return null; } }

async function loadHero() {
    const data = await fetchApi('/trending/all/day');
    dom.containers.hero.innerHTML = '';
    if(data && data.results) {
        data.results.slice(0,5).forEach((item, i) => {
            const type = item.media_type || 'movie';
            const slide = document.createElement('div');
            slide.className = `hero-slide ${i===0?'active':''}`;
            slide.style.backgroundImage = `url('${CONFIG.IMG_ORIG + item.backdrop_path}')`;
            slide.innerHTML = `<div class="hero-content"><h2 class="hero-title">${item.title||item.name}</h2><p class="hero-desc">${(item.overview || '').substring(0, 150)}...</p><div class="hero-actions"><button class="btn-primary" onclick="openPlayer('${item.id}','${type}','${(item.title||item.name).replace(/'/g,"")}')">▶ Assistir Agora</button><button class="btn-secondary" onclick="openModal('${item.id}', '${type}')">ℹ Mais Informações</button></div></div>`;
            dom.containers.hero.appendChild(slide);
        });
        let i = 0;
        setInterval(() => {
            const s = document.querySelectorAll('.hero-slide'); if(!s.length) return;
            s[i].classList.remove('active'); i = (i+1)%s.length; s[i].classList.add('active');
        }, 7000);
    }
}

async function loadGenres() {
    const data = await fetchApi('/genre/movie/list');
    const sc = dom.containers.genreScroller;
    sc.innerHTML = '';
    // BOTÃO INÍCIO
    const btnHome = document.createElement('button');
    btnHome.className = 'genre-button active'; btnHome.textContent = 'Início';
    btnHome.onclick = () => { document.querySelectorAll('.genre-button').forEach(b => b.classList.remove('active')); btnHome.classList.add('active'); loadHome(); };
    sc.appendChild(btnHome);
    // GÊNEROS DA API
    if(data && data.genres) data.genres.forEach(g => {
        const b = document.createElement('button'); b.className='genre-button'; b.textContent=g.name;
        b.onclick = () => { document.querySelectorAll('.genre-button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); loadGrid('genre', g.id, g.name); };
        sc.appendChild(b);
    });
    // SETAS
    document.getElementById('genre-prev').onclick = () => sc.scrollBy({ left: -300, behavior: 'smooth' });
    document.getElementById('genre-next').onclick = () => sc.scrollBy({ left: 300, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    loadHome(); loadGenres();
    document.querySelectorAll('.nav-link').forEach(l => l.onclick = (e) => {
        e.preventDefault(); const v = l.dataset.view;
        if(v === 'home') loadHome(); else if(v === 'tv') loadTV(); else if(v === 'favorites') loadFavorites(); else if(v === 'movies') loadGrid('movies', null, 'Filmes'); else if(v === 'series') loadGrid('series', null, 'Séries');
    });
    document.getElementById('search-button').onclick = () => { const q = document.getElementById('search-input').value; if(q) loadGrid('search', q, `Busca: ${q}`); };
    document.querySelector('.close-button').onclick = () => document.getElementById('details-modal').classList.remove('open');
    document.getElementById('back-button').onclick = () => { switchView('home'); document.getElementById('video-wrapper').innerHTML=''; };
    document.getElementById('player-source').onchange = loadIframe;
    document.getElementById('menu-toggle').onclick = () => { const n = document.getElementById('main-nav'); n.style.display = n.style.display==='block'?'none':'block'; };
});