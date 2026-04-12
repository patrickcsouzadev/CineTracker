let currentItems = [];
let allMovies = [];
let allSeries = [];
let currentSeasons = [];
let selectedPosterPath = null;
let selectedImdbId = null;
let currentView = 'grid';
let omdbApiKey = '';
let posterBaseUrl = '';

const OMDB_BASE_URL = 'https://www.omdbapi.com/';
const appApi = window.cineTracker;

if (!appApi) {
  throw new Error('Bridge segura indisponivel.');
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  restorePreferredView();
  await loadConfig();
  await loadAllItems();
});

async function loadConfig() {
  try {
    const config = await appApi.getAppConfig();
    omdbApiKey = typeof config?.omdbApiKey === 'string' ? config.omdbApiKey.trim() : '';
    posterBaseUrl = typeof config?.posterBaseUrl === 'string' ? config.posterBaseUrl : '';
  } catch (error) {
    console.error('Erro ao carregar configuracao:', error);
    omdbApiKey = '';
    posterBaseUrl = '';
  }
}

function setupEventListeners() {
  document.getElementById('addMovieBtn').addEventListener('click', () => showAddForm('movie'));
  document.getElementById('addSeriesBtn').addEventListener('click', () => showAddForm('series'));

  document.getElementById('searchInput').addEventListener('input', filterItems);
  document.getElementById('typeFilter').addEventListener('change', filterItems);
  document.getElementById('ratingFilter').addEventListener('change', filterItems);
  document.getElementById('sortBy').addEventListener('change', filterItems);

  document.getElementById('btn-grid').addEventListener('click', () => setView('grid'));
  document.getElementById('btn-list').addEventListener('click', () => setView('list'));

  document.getElementById('itemForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('searchImdbBtn').addEventListener('click', searchIMDb);
  document.getElementById('selectPosterBtn').addEventListener('click', selectPoster);
  document.getElementById('addSeasonBtn').addEventListener('click', addSeason);

  const closeModalButton = document.getElementById('closeModalBtn');
  closeModalButton.addEventListener('click', closeModal);
  closeModalButton.addEventListener('keydown', handleKeyboardClose(closeModal));

  const closeSearchResultsButton = document.getElementById('closeSearchResultsBtn');
  closeSearchResultsButton.addEventListener('click', closeSearchResultsModal);
  closeSearchResultsButton.addEventListener('keydown', handleKeyboardClose(closeSearchResultsModal));

  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

  document.getElementById('modal').addEventListener('click', (event) => {
    if (event.target.id === 'modal') {
      closeModal();
    }
  });

  document.getElementById('searchResultsModal').addEventListener('click', (event) => {
    if (event.target.id === 'searchResultsModal') {
      closeSearchResultsModal();
    }
  });

  document.getElementById('itemsList').addEventListener('click', handleItemsListClick);
  document.getElementById('searchResultsList').addEventListener('click', handleSearchResultsClick);
  document.getElementById('seasonsList').addEventListener('input', handleSeasonFieldChange);
  document.getElementById('seasonsList').addEventListener('change', handleSeasonFieldChange);
  document.getElementById('seasonsList').addEventListener('click', handleSeasonDeleteClick);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      closeSearchResultsModal();
    }
  });
}

function handleKeyboardClose(closeFn) {
  return (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeFn();
    }
  };
}

function restorePreferredView() {
  const storedView = localStorage.getItem('preferredView');
  if (storedView === 'grid' || storedView === 'list') {
    setView(storedView);
  }
}

async function loadAllItems() {
  try {
    allMovies = await appApi.db.getAllMovies();
    allSeries = await appApi.db.getAllSeries();
    filterItems();
  } catch (error) {
    console.error('Erro ao carregar itens:', error);
    showError('Erro ao carregar dados.');
  }
}

function filterItems() {
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  const typeFilter = document.getElementById('typeFilter').value;
  const ratingFilter = document.getElementById('ratingFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  let filteredItems = [];

  if (typeFilter === 'all' || typeFilter === 'movies') {
    filteredItems.push(...allMovies.map((item) => ({ ...item, type: 'movie' })));
  }

  if (typeFilter === 'all' || typeFilter === 'series') {
    filteredItems.push(...allSeries.map((item) => ({ ...item, type: 'series' })));
  }

  if (searchTerm) {
    filteredItems = filteredItems.filter((item) => String(item.title || '').toLowerCase().includes(searchTerm));
  }

  if (ratingFilter !== 'all') {
    const [min, max] = ratingFilter.split('-').map(Number);
    filteredItems = filteredItems.filter((item) => {
      const rating = Number(item.user_rating || 0);
      return rating >= min && rating <= max;
    });
  }

  filteredItems.sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return String(a.title || '').localeCompare(String(b.title || ''));
      case 'rating':
        return Number(b.user_rating || 0) - Number(a.user_rating || 0);
      case 'date':
      default:
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
  });

  currentItems = filteredItems;
  renderItems();
}

function renderItems() {
  const container = document.getElementById('itemsList');
  container.replaceChildren();

  if (currentItems.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const title = document.createElement('h3');
    title.textContent = 'Nenhum item encontrado';

    const description = document.createElement('p');
    description.textContent = 'Adicione seus primeiros filmes e séries!';

    emptyState.append(title, description);
    container.appendChild(emptyState);
    return;
  }

  for (const item of currentItems) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.type = item.type;
    card.dataset.id = String(item.id);

    const poster = document.createElement('div');
    poster.className = 'item-poster';

    if (item.poster_path) {
      const source = buildLocalPosterSrc(item.poster_path);
      if (source) {
        const image = document.createElement('img');
        image.src = source;
        image.alt = String(item.title || 'Poster');
        image.loading = 'lazy';
        poster.appendChild(image);
      } else {
        const noImage = document.createElement('div');
        noImage.className = 'no-image';
        noImage.textContent = '🎬';
        poster.appendChild(noImage);
      }
    } else {
      const noImage = document.createElement('div');
      noImage.className = 'no-image';
      noImage.textContent = '🎬';
      poster.appendChild(noImage);
    }

    const info = document.createElement('div');
    info.className = 'item-info';

    const itemTitle = document.createElement('h3');
    itemTitle.className = 'item-title';
    itemTitle.textContent = String(item.title || 'Sem título');

    const ratings = document.createElement('div');
    ratings.className = 'item-ratings';

    const userRating = document.createElement('div');
    userRating.className = 'rating user';
    userRating.textContent = `⭐ ${item.user_rating ?? '--'}`;

    const imdbRating = document.createElement('div');
    imdbRating.className = 'rating imdb';
    imdbRating.textContent = `📊 ${item.imdb_rating ?? '--'}`;

    ratings.append(userRating, imdbRating);

    const synopsis = document.createElement('p');
    synopsis.className = 'item-synopsis';
    synopsis.textContent = String(item.synopsis || 'Sem sinopse');

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editButton = document.createElement('button');
    editButton.className = 'btn btn-secondary';
    editButton.type = 'button';
    editButton.dataset.action = 'edit';
    editButton.textContent = '✏️ Editar';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-danger';
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';
    deleteButton.textContent = '🗑️ Excluir';

    actions.append(editButton, deleteButton);
    info.append(itemTitle, ratings, synopsis, actions);
    card.append(poster, info);
    container.appendChild(card);
  }
}

function buildLocalPosterSrc(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }

  if (!posterBaseUrl) {
    return `posters/${encodeURIComponent(fileName)}`;
  }

  try {
    return new URL(fileName, posterBaseUrl).toString();
  } catch {
    return `posters/${encodeURIComponent(fileName)}`;
  }
}

function showAddForm(type) {
  document.getElementById('modalTitle').textContent = type === 'movie' ? 'Adicionar Filme' : 'Adicionar Série';
  document.getElementById('itemType').value = type;
  document.getElementById('itemId').value = '';

  document.getElementById('itemForm').reset();
  document.getElementById('imdbRating').textContent = '--';
  clearPosterPreview();

  selectedPosterPath = null;
  selectedImdbId = null;

  const seasonsSection = document.getElementById('seasonsSection');
  if (type === 'series') {
    seasonsSection.classList.remove('hidden');
    currentSeasons = [];
    renderSeasons();
  } else {
    seasonsSection.classList.add('hidden');
  }

  openModal('modal');
}

async function editItem(type, id) {
  try {
    let item;
    if (type === 'movie') {
      item = allMovies.find((movie) => Number(movie.id) === Number(id));
    } else {
      item = allSeries.find((series) => Number(series.id) === Number(id));
      currentSeasons = await appApi.db.getSeasons(Number(id));
    }

    if (!item) {
      return;
    }

    document.getElementById('modalTitle').textContent = type === 'movie' ? 'Editar Filme' : 'Editar Série';
    document.getElementById('itemType').value = type;
    document.getElementById('itemId').value = String(item.id);
    document.getElementById('title').value = String(item.title || '');
    document.getElementById('synopsis').value = String(item.synopsis || '');
    document.getElementById('userRating').value = item.user_rating ?? '';
    document.getElementById('imdbRating').textContent = item.imdb_rating ?? '--';

    selectedPosterPath = item.poster_path || null;
    selectedImdbId = item.imdb_id || null;

    if (selectedPosterPath) {
      renderPosterPreview(selectedPosterPath);
    } else {
      clearPosterPreview();
    }

    const seasonsSection = document.getElementById('seasonsSection');
    if (type === 'series') {
      seasonsSection.classList.remove('hidden');
      renderSeasons();
    } else {
      seasonsSection.classList.add('hidden');
    }

    openModal('modal');
  } catch (error) {
    console.error('Erro ao carregar item:', error);
    showError('Erro ao carregar item.');
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.style.display = 'block';
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

function closeSearchResultsModal() {
  const modal = document.getElementById('searchResultsModal');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
}

function renderPosterPreview(fileName) {
  const posterPreview = document.getElementById('posterPreview');
  posterPreview.replaceChildren();

  const wrapper = document.createElement('div');
  wrapper.className = 'poster-preview';

  const image = document.createElement('img');
  const source = buildLocalPosterSrc(fileName);
  if (!source) {
    return;
  }
  image.src = source;
  image.alt = 'Poster selecionado';

  wrapper.appendChild(image);
  posterPreview.appendChild(wrapper);
}

function clearPosterPreview() {
  document.getElementById('posterPreview').replaceChildren();
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const itemType = document.getElementById('itemType').value;
  const itemId = document.getElementById('itemId').value;
  const userRatingRaw = document.getElementById('userRating').value;
  const imdbRatingRaw = document.getElementById('imdbRating').textContent;

  const itemData = {
    title: document.getElementById('title').value,
    synopsis: document.getElementById('synopsis').value,
    user_rating: userRatingRaw === '' ? null : Number(userRatingRaw),
    imdb_rating: imdbRatingRaw === '--' ? null : Number(imdbRatingRaw),
    poster_path: selectedPosterPath,
    imdb_id: selectedImdbId
  };

  try {
    if (itemId) {
      const parsedId = Number(itemId);
      if (itemType === 'movie') {
        await appApi.db.updateMovie(parsedId, itemData);
      } else {
        await appApi.db.updateSeries(parsedId, itemData);
        await updateSeasons(parsedId);
      }
    } else if (itemType === 'movie') {
      await appApi.db.addMovie(itemData);
    } else {
      const newSeriesId = await appApi.db.addSeries(itemData);
      await updateSeasons(Number(newSeriesId));
    }

    closeModal();
    await loadAllItems();
    showSuccess(itemType === 'movie' ? 'Filme salvo!' : 'Série salva!');
  } catch (error) {
    console.error('Erro ao salvar:', error);
    showError(getErrorMessage(error, 'Erro ao salvar item.'));
  }
}

function addSeason() {
  const seasonNumber = currentSeasons.length + 1;
  currentSeasons.push({
    season_number: seasonNumber,
    watched: false,
    comment: '',
    user_rating: null
  });
  renderSeasons();
}

function renderSeasons() {
  const container = document.getElementById('seasonsList');
  container.replaceChildren();

  currentSeasons.forEach((season, index) => {
    const seasonItem = document.createElement('div');
    seasonItem.className = 'season-item';

    const seasonHeader = document.createElement('div');
    seasonHeader.className = 'season-header';

    const seasonNumber = document.createElement('span');
    seasonNumber.className = 'season-number';
    seasonNumber.textContent = `Temporada ${season.season_number}`;

    const seasonCheckbox = document.createElement('div');
    seasonCheckbox.className = 'season-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `watched_${index}`;
    checkbox.checked = Boolean(season.watched);
    checkbox.dataset.index = String(index);
    checkbox.dataset.field = 'watched';

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = 'Assistida';

    seasonCheckbox.append(checkbox, label);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger';
    removeButton.dataset.action = 'remove-season';
    removeButton.dataset.index = String(index);
    removeButton.textContent = '🗑️';

    seasonHeader.append(seasonNumber, seasonCheckbox, removeButton);

    const seasonFields = document.createElement('div');
    seasonFields.className = 'season-fields';

    const comment = document.createElement('textarea');
    comment.className = 'season-comment';
    comment.placeholder = 'Comentário sobre a temporada...';
    comment.maxLength = 2000;
    comment.value = String(season.comment || '');
    comment.dataset.index = String(index);
    comment.dataset.field = 'comment';

    const rating = document.createElement('input');
    rating.type = 'number';
    rating.className = 'season-rating';
    rating.min = '0';
    rating.max = '10';
    rating.step = '0.1';
    rating.placeholder = 'Nota';
    rating.value = season.user_rating ?? '';
    rating.dataset.index = String(index);
    rating.dataset.field = 'user_rating';

    seasonFields.append(comment, rating);
    seasonItem.append(seasonHeader, seasonFields);
    container.appendChild(seasonItem);
  });
}

function handleSeasonFieldChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const field = target.dataset.field;
  const index = Number(target.dataset.index);
  if (!field || !Number.isInteger(index) || !currentSeasons[index]) {
    return;
  }

  if (field === 'watched' && target instanceof HTMLInputElement) {
    currentSeasons[index].watched = target.checked;
    return;
  }

  if (field === 'comment' && target instanceof HTMLTextAreaElement) {
    currentSeasons[index].comment = target.value;
    return;
  }

  if (field === 'user_rating' && target instanceof HTMLInputElement) {
    currentSeasons[index].user_rating = target.value === '' ? null : Number(target.value);
  }
}

function handleSeasonDeleteClick(event) {
  const button = event.target.closest('button[data-action="remove-season"]');
  if (!button) {
    return;
  }

  const index = Number(button.dataset.index);
  if (!Number.isInteger(index)) {
    return;
  }

  currentSeasons.splice(index, 1);
  currentSeasons.forEach((season, seasonIndex) => {
    season.season_number = seasonIndex + 1;
  });
  renderSeasons();
}

async function updateSeasons(seriesId) {
  try {
    const existingSeasons = await appApi.db.getSeasons(seriesId);

    for (const existingSeason of existingSeasons) {
      const stillExists = currentSeasons.find((season) => Number(season.id) === Number(existingSeason.id));
      if (!stillExists) {
        await appApi.db.deleteSeason(existingSeason.id);
      }
    }

    for (const season of currentSeasons) {
      const seasonData = {
        series_id: seriesId,
        season_number: season.season_number,
        watched: Boolean(season.watched),
        comment: season.comment,
        user_rating: season.user_rating
      };

      if (season.id) {
        await appApi.db.updateSeason(season.id, seasonData);
      } else {
        await appApi.db.addSeason(seasonData);
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar temporadas:', error);
    throw error;
  }
}

async function searchIMDb() {
  const title = document.getElementById('title').value.trim();
  if (!title) {
    showError('Digite um título para buscar.');
    return;
  }

  if (!omdbApiKey) {
    showError('Configure a variável de ambiente OMDB_API_KEY para usar a busca automática.');
    return;
  }

  try {
    const params = new URLSearchParams({
      apikey: omdbApiKey,
      s: title
    });

    const response = await fetch(`${OMDB_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Falha ao consultar IMDb.');
    }

    const data = await response.json();
    if (data.Response === 'True' && Array.isArray(data.Search)) {
      displaySearchResults(data.Search);
      openModal('searchResultsModal');
      return;
    }

    showError(String(data.Error || 'Nenhum resultado encontrado.'));
  } catch (error) {
    console.error('Erro na busca IMDb:', error);
    showError('Erro ao conectar com a API do IMDb.');
  }
}

function displaySearchResults(results) {
  const resultsList = document.getElementById('searchResultsList');
  resultsList.replaceChildren();

  for (const item of results) {
    const resultItem = document.createElement('button');
    resultItem.type = 'button';
    resultItem.className = 'search-result-item';
    resultItem.dataset.imdbId = String(item.imdbID || '');

    const posterUrl = normalizeExternalPosterUrl(item.Poster);
    const image = document.createElement('img');
    image.alt = 'Pôster';
    if (posterUrl) {
      image.src = posterUrl;
      image.loading = 'lazy';
    }

    const info = document.createElement('div');
    info.className = 'search-result-info';

    const title = document.createElement('h4');
    title.textContent = String(item.Title || 'Sem título');

    const meta = document.createElement('p');
    const kind = item.Type === 'movie' ? 'Filme' : 'Série';
    meta.textContent = `${String(item.Year || '----')} • ${kind}`;

    info.append(title, meta);
    resultItem.append(image, info);
    resultsList.appendChild(resultItem);
  }
}

function normalizeExternalPosterUrl(rawUrl) {
  if (!rawUrl || rawUrl === 'N/A' || typeof rawUrl !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    if (parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

async function handleSearchResultsClick(event) {
  const target = event.target.closest('[data-imdb-id]');
  if (!target) {
    return;
  }

  const imdbId = target.dataset.imdbId;
  if (!imdbId) {
    return;
  }

  await selectIMDbResult(imdbId);
}

async function selectIMDbResult(imdbId) {
  closeSearchResultsModal();

  try {
    const params = new URLSearchParams({
      apikey: omdbApiKey,
      i: imdbId,
      plot: 'full'
    });

    const response = await fetch(`${OMDB_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Falha ao carregar detalhes da IMDb.');
    }

    const data = await response.json();
    if (data.Response !== 'True') {
      showError('Não foi possível carregar os detalhes do item selecionado.');
      return;
    }

    document.getElementById('title').value = data.Title || '';
    document.getElementById('synopsis').value = data.Plot !== 'N/A' ? data.Plot : '';
    document.getElementById('imdbRating').textContent = data.imdbRating !== 'N/A' ? data.imdbRating : '--';
    selectedImdbId = data.imdbID || null;

    showSuccess('Dados carregados!');
  } catch (error) {
    console.error('Erro ao buscar detalhes da IMDb:', error);
    showError('Erro ao carregar detalhes.');
  }
}

async function selectPoster() {
  try {
    const fileName = await appApi.selectImage();
    if (!fileName) {
      return;
    }

    selectedPosterPath = fileName;
    renderPosterPreview(fileName);
  } catch (error) {
    console.error('Erro ao selecionar imagem:', error);
    showError(getErrorMessage(error, 'Erro ao selecionar imagem.'));
  }
}

function handleItemsListClick(event) {
  const card = event.target.closest('.item-card');
  if (!card) {
    return;
  }

  const type = card.dataset.type;
  const id = Number(card.dataset.id);
  if (!type || !Number.isInteger(id)) {
    return;
  }

  const actionButton = event.target.closest('button[data-action]');
  if (!actionButton) {
    editItem(type, id);
    return;
  }

  const action = actionButton.dataset.action;
  if (action === 'edit') {
    editItem(type, id);
  } else if (action === 'delete') {
    deleteItem(type, id);
  }
}

async function deleteItem(type, id) {
  if (!window.confirm('Tem certeza que deseja excluir este item?')) {
    return;
  }

  try {
    if (type === 'movie') {
      await appApi.db.deleteMovie(id);
    } else {
      await appApi.db.deleteSeries(id);
    }

    await loadAllItems();
    showSuccess('Item excluído!');
  } catch (error) {
    console.error('Erro ao excluir:', error);
    showError('Erro ao excluir item.');
  }
}

function showSuccess(message) {
  showToast(message, '#10b981', 3000);
}

function showError(message) {
  showToast(message, '#dc2626', 5000);
}

function showToast(message, backgroundColor, duration) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${backgroundColor};
    color: white;
    padding: 1rem;
    border-radius: 0.5rem;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
    max-width: 380px;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.25);
  `;
  toast.textContent = String(message);
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, duration);
}

function getErrorMessage(error, fallback) {
  const message = error && typeof error.message === 'string' ? error.message.trim() : '';
  if (!message) {
    return fallback;
  }
  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
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
