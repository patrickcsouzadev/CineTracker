const { ipcRenderer } = require('electron');
const axios = require('axios');

let currentItems = [];
let allMovies = [];
let allSeries = [];
let currentSeasons = [];
let selectedPosterPath = null;
let currentView = 'grid';

const OMDB_API_KEY = '9a074206';
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

document.addEventListener('DOMContentLoaded', async () => {
    await loadAllItems();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('itemForm').addEventListener('submit', handleFormSubmit);
    
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

async function loadAllItems() {
    try {
        allMovies = await ipcRenderer.invoke('db-get-all-movies');
        allSeries = await ipcRenderer.invoke('db-get-all-series');
        filterItems();
    } catch (error) {
        console.error('Erro ao carregar itens:', error);
        showError('Erro ao carregar dados');
    }
}

function filterItems() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const ratingFilter = document.getElementById('ratingFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    let filteredItems = [];

    if (typeFilter === 'all' || typeFilter === 'movies') {
        filteredItems.push(...allMovies.map(item => ({ ...item, type: 'movie' })));
    }
    if (typeFilter === 'all' || typeFilter === 'series') {
        filteredItems.push(...allSeries.map(item => ({ ...item, type: 'series' })));
    }

    if (searchTerm) {
        filteredItems = filteredItems.filter(item =>
            item.title.toLowerCase().includes(searchTerm)
        );
    }

    if (ratingFilter !== 'all') {
        const [min, max] = ratingFilter.split('-').map(Number);
        filteredItems = filteredItems.filter(item => {
            const rating = item.user_rating || 0;
            return rating >= min && rating <= max;
        });
    }

    filteredItems.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'rating':
                return (b.user_rating || 0) - (a.user_rating || 0);
            case 'date':
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });

    currentItems = filteredItems;
    renderItems();
}

function renderItems() {
    const container = document.getElementById('itemsList');
    
    if (currentItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Nenhum item encontrado</h3>
                <p>Adicione seus primeiros filmes e séries!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentItems.map(item => `
        <div class="item-card" onclick="editItem('${item.type}', ${item.id})">
            <div class="item-poster">
                ${item.poster_path ? 
                    `<img src="posters/${item.poster_path}" alt="${item.title}">` : 
                    '<div class="no-image">🎬</div>'
                }
            </div>
            <div class="item-info">
                <h3 class="item-title">${item.title}</h3>
                <div class="item-ratings">
                    ${item.user_rating ? 
                        `<div class="rating user">⭐ ${item.user_rating}</div>` : 
                        '<div class="rating user">⭐ --</div>'
                    }
                    ${item.imdb_rating ? 
                        `<div class="rating imdb">📊 ${item.imdb_rating}</div>` : 
                        '<div class="rating imdb">📊 --</div>'
                    }
                </div>
                <p class="item-synopsis">${item.synopsis || 'Sem sinopse'}</p>
                <div class="item-actions">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); editItem('${item.type}', ${item.id})">✏️ Editar</button>
                    <button class="btn btn-danger" onclick="event.stopPropagation(); deleteItem('${item.type}', ${item.id})">🗑️ Excluir</button>
                </div>
            </div>
        </div>
    `).join('');
}

function showAddForm(type) {
    document.getElementById('modalTitle').textContent = 
        type === 'movie' ? 'Adicionar Filme' : 'Adicionar Série';
    document.getElementById('itemType').value = type;
    document.getElementById('itemId').value = '';
    
    document.getElementById('itemForm').reset();
    document.getElementById('imdbRating').textContent = '--';
    document.getElementById('posterPreview').innerHTML = '';
    selectedPosterPath = null;
    
    const seasonsSection = document.getElementById('seasonsSection');
    if (type === 'series') {
        seasonsSection.style.display = 'block';
        currentSeasons = [];
        renderSeasons();
    } else {
        seasonsSection.style.display = 'none';
    }
    
    document.getElementById('modal').style.display = 'block';
}

async function editItem(type, id) {
    try {
        let item;
        if (type === 'movie') {
            item = allMovies.find(m => m.id === id);
        } else {
            item = allSeries.find(s => s.id === id);
            currentSeasons = await ipcRenderer.invoke('db-get-seasons', id);
        }

        if (!item) return;

        document.getElementById('modalTitle').textContent = 
            type === 'movie' ? 'Editar Filme' : 'Editar Série';
        document.getElementById('itemType').value = type;
        document.getElementById('itemId').value = id;
        document.getElementById('title').value = item.title || '';
        document.getElementById('synopsis').value = item.synopsis || '';
        document.getElementById('userRating').value = item.user_rating || '';
        document.getElementById('imdbRating').textContent = item.imdb_rating || '--';
        
        const posterPreview = document.getElementById('posterPreview');
        if (item.poster_path) {
            posterPreview.innerHTML = `
                <div class="poster-preview">
                    <img src="posters/${item.poster_path}" alt="Poster">
                </div>
            `;
            selectedPosterPath = item.poster_path;
        } else {
            posterPreview.innerHTML = '';
            selectedPosterPath = null;
        }

        const seasonsSection = document.getElementById('seasonsSection');
        if (type === 'series') {
            seasonsSection.style.display = 'block';
            renderSeasons();
        } else {
            seasonsSection.style.display = 'none';
        }

        document.getElementById('modal').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar item:', error);
        showError('Erro ao carregar item');
    }
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const itemType = document.getElementById('itemType').value;
    const itemId = document.getElementById('itemId').value;
    
    const itemData = {
        title: document.getElementById('title').value,
        synopsis: document.getElementById('synopsis').value,
        user_rating: parseFloat(document.getElementById('userRating').value) || null,
        imdb_rating: parseFloat(document.getElementById('imdbRating').textContent) || null,
        poster_path: selectedPosterPath,
        imdb_id: null
    };

    try {
        if (itemId) {
            if (itemType === 'movie') {
                await ipcRenderer.invoke('db-update-movie', parseInt(itemId), itemData);
            } else {
                await ipcRenderer.invoke('db-update-series', parseInt(itemId), itemData);
                await updateSeasons(parseInt(itemId));
            }
        } else {
            let newId;
            if (itemType === 'movie') {
                newId = await ipcRenderer.invoke('db-add-movie', itemData);
            } else {
                newId = await ipcRenderer.invoke('db-add-series', itemData);
                await updateSeasons(newId);
            }
        }

        closeModal();
        await loadAllItems();
        showSuccess(itemType === 'movie' ? 'Filme salvo!' : 'Série salva!');
    } catch (error) {
        console.error('Erro ao salvar:', error);
        showError('Erro ao salvar item');
    }
}

function addSeason() {
    const seasonNumber = currentSeasons.length + 1;
    currentSeasons.push({
        season_number: seasonNumber,
        watched: false,
        comment: '',
        user_rating: null,
        isNew: true
    });
    renderSeasons();
}

function renderSeasons() {
    const container = document.getElementById('seasonsList');
    
    container.innerHTML = currentSeasons.map((season, index) => `
        <div class="season-item">
            <div class="season-header">
                <span class="season-number">Temporada ${season.season_number}</span>
                <div class="season-checkbox">
                    <input type="checkbox" id="watched_${index}" ${season.watched ? 'checked' : ''}>
                    <label for="watched_${index}">Assistida</label>
                </div>
                <button type="button" class="btn btn-danger" onclick="removeSeason(${index})">🗑️</button>
            </div>
            <div class="season-fields">
                <textarea class="season-comment" placeholder="Comentário sobre a temporada..." 
                    onchange="updateSeasonField(${index}, 'comment', this.value)">${season.comment || ''}</textarea>
                <input type="number" class="season-rating" min="0" max="10" step="0.1" 
                    placeholder="Nota" value="${season.user_rating || ''}"
                    onchange="updateSeasonField(${index}, 'user_rating', parseFloat(this.value) || null)">
            </div>
        </div>
    `).join('');

    currentSeasons.forEach((season, index) => {
        const checkbox = document.getElementById(`watched_${index}`);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                updateSeasonField(index, 'watched', e.target.checked);
            });
        }
    });
}

function updateSeasonField(index, field, value) {
    if (currentSeasons[index]) {
        currentSeasons[index][field] = value;
    }
}

function removeSeason(index) {
    currentSeasons.splice(index, 1);
    currentSeasons.forEach((season, i) => {
        season.season_number = i + 1;
    });
    renderSeasons();
}

async function updateSeasons(seriesId) {
    try {
        const existingSeasons = await ipcRenderer.invoke('db-get-seasons', seriesId);
        
        for (const existing of existingSeasons) {
            const stillExists = currentSeasons.find(s => s.id === existing.id);
            if (!stillExists) {
                await ipcRenderer.invoke('db-delete-season', existing.id);
            }
        }

        for (const season of currentSeasons) {
            const seasonData = {
                series_id: seriesId,
                season_number: season.season_number,
                watched: season.watched,
                comment: season.comment,
                user_rating: season.user_rating
            };

            if (season.id) {
                await ipcRenderer.invoke('db-update-season', season.id, seasonData);
            } else {
                await ipcRenderer.invoke('db-add-season', seasonData);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar temporadas:', error);
    }
}

async function searchIMDb() {
    const title = document.getElementById('title').value.trim();
    if (!title) {
        showError('Digite um título para buscar');
        return;
    }

    if (!OMDB_API_KEY || OMDB_API_KEY === 'YOUR_API_KEY_HERE') {
        showError('Configure sua chave da API OMDb para usar a busca automática');
        return;
    }

    try {
        const response = await axios.get(OMDB_BASE_URL, {
            params: {
                apikey: OMDB_API_KEY,
                s: title 
            }
        });

        if (response.data.Response === 'True' && response.data.Search) {
            displaySearchResults(response.data.Search);
        } else {
            showError(response.data.Error || 'Nenhum resultado encontrado');
        }
    } catch (error) {
        console.error('Erro na busca IMDb:', error);
        showError('Erro ao conectar com a API do IMDb');
    }
}


function displaySearchResults(results) {
    const resultsList = document.getElementById('searchResultsList');
    resultsList.innerHTML = results.map(item => `
        <div class="search-result-item" onclick="selectIMDbResult('${item.imdbID}')">
            <img src="${item.Poster !== 'N/A' ? item.Poster : ''}" alt="Pôster">
            <div class="search-result-info">
                <h4>${item.Title}</h4>
                <p>${item.Year} • ${item.Type === 'movie' ? 'Filme' : 'Série'}</p>
            </div>
        </div>
    `).join('');

    document.getElementById('searchResultsModal').style.display = 'block';
}

async function selectIMDbResult(imdbId) {
    closeSearchResultsModal();

    try {
        const response = await axios.get(OMDB_BASE_URL, {
            params: {
                apikey: OMDB_API_KEY,
                i: imdbId, 
                plot: 'full'
            }
        });

        if (response.data.Response === 'True') {
            const data = response.data;

            document.getElementById('title').value = data.Title || '';
            document.getElementById('synopsis').value = data.Plot !== 'N/A' ? data.Plot : '';
            document.getElementById('imdbRating').textContent = data.imdbRating !== 'N/A' ? data.imdbRating : '--';

            showSuccess('Dados carregados!');
        } else {
            showError('Não foi possível carregar os detalhes do item selecionado.');
        }
    } catch (error) {
        console.error('Erro ao buscar detalhes do IMDb:', error);
        showError('Erro ao carregar detalhes.');
    }
}

function closeSearchResultsModal() {
    document.getElementById('searchResultsModal').style.display = 'none';
}

async function selectPoster() {
    try {
        const fileName = await ipcRenderer.invoke('select-image');
        if (fileName) {
            selectedPosterPath = fileName;
            document.getElementById('posterPreview').innerHTML = `
                <div class="poster-preview">
                    <img src="posters/${fileName}" alt="Poster">
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao selecionar imagem:', error);
        showError('Erro ao selecionar imagem');
    }
}

async function deleteItem(type, id) {
    if (!confirm('Tem certeza que deseja excluir este item?')) {
        return;
    }

    try {
        if (type === 'movie') {
            await ipcRenderer.invoke('db-delete-movie', id);
        } else {
            await ipcRenderer.invoke('db-delete-series', id);
        }
        
        await loadAllItems();
        showSuccess('Item excluído!');
    } catch (error) {
        console.error('Erro ao excluir:', error);
        showError('Erro ao excluir item');
    }
}

function showSuccess(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 3000);
}

function showError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 1rem;
        border-radius: 0.5rem;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        document.body.removeChild(toast);
    }, 5000);
}

function setView(view) {
    const itemsList = document.getElementById('itemsList');
    const btnGrid = document.getElementById('btn-grid');
    const btnList = document.getElementById('btn-list');

    currentView = view;

    if (view === 'list') {
        itemsList.classList.remove('items-grid');
        itemsList.classList.add('items-list');
        btnList.classList.add('active');
        btnGrid.classList.remove('active');
    } else { 
        itemsList.classList.remove('items-list');
        itemsList.classList.add('items-grid');
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
    }

    localStorage.setItem('preferredView', view);
}