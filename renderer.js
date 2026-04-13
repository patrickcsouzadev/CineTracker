let currentItems = [];
let allMovies = [];
let allSeries = [];
let currentSeasons = [];
let selectedPosterPath = null;
let selectedImdbId = null;
let currentView = 'grid';
let currentLibraryTab = 'all';
let omdbApiKey = '';
let posterBaseUrl = '';
let selectedItemKeys = new Set();
let seriesEpisodesMap = new Map();
let undoSnapshot = null;
let undoTimerId = null;
let editContext = { reminderAt: null, reminderSent: 0 };

const STATUS_LABELS = Object.freeze({
  watchlist: 'Watchlist',
  watching: 'Assistindo',
  completed: 'Concluido',
  paused: 'Pausado',
  dropped: 'Dropado',
  rewatch: 'Reassistir'
});
const STATUS_VALUES = Object.keys(STATUS_LABELS);
const OMDB_BASE_URL = 'https://www.omdbapi.com/';
const RECOMMENDATION_LIMIT = 4;
const appApi = window.cineTracker;

if (!appApi) {
  throw new Error('Bridge segura indisponivel.');
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  restorePreferredView();
  setLibraryTab('all', false);
  try {
    await loadConfig();
    await loadAllItems();
  } catch (error) {
    console.error('Falha na inicializacao:', error);
    showError(getErrorMessage(error, 'Erro ao inicializar o aplicativo.'));
  }
});

function getById(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Elemento nao encontrado: #${id}`);
  }
  return element;
}

function setupEventListeners() {
  getById('addMovieBtn').addEventListener('click', () => showAddForm('movie'));
  getById('addSeriesBtn').addEventListener('click', () => showAddForm('series'));

  getById('exportDataBtn').addEventListener('click', handleExportData);
  getById('importDataBtn').addEventListener('click', handleImportData);
  getById('backupBtn').addEventListener('click', handleCreateBackup);
  getById('restoreBtn').addEventListener('click', handleRestoreBackup);

  getById('searchInput').addEventListener('input', filterItems);
  getById('typeFilter').addEventListener('change', filterItems);
  getById('statusFilter').addEventListener('change', filterItems);
  getById('ratingFilter').addEventListener('change', filterItems);
  getById('yearFilter').addEventListener('change', filterItems);
  getById('genreFilter').addEventListener('input', filterItems);
  getById('sortBy').addEventListener('change', filterItems);

  getById('btn-grid').addEventListener('click', () => setView('grid'));
  getById('btn-list').addEventListener('click', () => setView('list'));

  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
  for (const button of tabButtons) {
    button.addEventListener('click', () => {
      const nextTab = button.dataset.library || 'all';
      setLibraryTab(nextTab, true);
    });
  }

  getById('itemForm').addEventListener('submit', handleFormSubmit);
  getById('searchImdbBtn').addEventListener('click', searchIMDb);
  getById('selectPosterBtn').addEventListener('click', selectPoster);
  getById('addSeasonBtn').addEventListener('click', addSeason);

  getById('bulkApplyStatusBtn').addEventListener('click', handleBulkApplyStatus);
  getById('bulkDeleteBtn').addEventListener('click', handleBulkDelete);
  getById('bulkClearBtn').addEventListener('click', clearSelection);
  getById('undoDeleteBtn').addEventListener('click', restoreDeletedItems);

  const closeModalButton = getById('closeModalBtn');
  closeModalButton.addEventListener('click', closeModal);
  closeModalButton.addEventListener('keydown', handleKeyboardClose(closeModal));

  const closeSearchResultsButton = getById('closeSearchResultsBtn');
  closeSearchResultsButton.addEventListener('click', closeSearchResultsModal);
  closeSearchResultsButton.addEventListener('keydown', handleKeyboardClose(closeSearchResultsModal));

  getById('cancelModalBtn').addEventListener('click', closeModal);

  getById('modal').addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.id === 'modal') {
      closeModal();
    }
  });

  getById('searchResultsModal').addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.id === 'searchResultsModal') {
      closeSearchResultsModal();
    }
  });

  getById('itemsList').addEventListener('click', handleItemsListClick);
  getById('itemsList').addEventListener('change', handleItemsListChange);
  getById('searchResultsList').addEventListener('click', handleSearchResultsClick);
  getById('seasonsList').addEventListener('input', handleSeasonFieldChange);
  getById('seasonsList').addEventListener('change', handleSeasonFieldChange);
  getById('seasonsList').addEventListener('click', handleSeasonListClick);

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
  } else {
    setView('grid');
  }
}

async function loadConfig() {
  const config = await appApi.getAppConfig();
  omdbApiKey = typeof config?.omdbApiKey === 'string' ? config.omdbApiKey.trim() : '';
  posterBaseUrl = typeof config?.posterBaseUrl === 'string' ? config.posterBaseUrl : '';
}

async function loadAllItems() {
  allMovies = await appApi.db.getAllMovies();
  allSeries = await appApi.db.getAllSeries();
  await loadEpisodesSnapshot();
  syncSelectionWithAvailableItems();
  populateYearFilter();
  filterItems();
}

async function loadEpisodesSnapshot() {
  const entries = await Promise.all(
    allSeries.map(async (series) => {
      try {
        const episodes = await appApi.db.getEpisodes(Number(series.id));
        return [Number(series.id), Array.isArray(episodes) ? episodes : []];
      } catch (error) {
        console.error(`Erro ao carregar episodios da serie ${series.id}:`, error);
        return [Number(series.id), []];
      }
    })
  );
  seriesEpisodesMap = new Map(entries);
}

function getAllItemsMerged() {
  const movies = allMovies.map((item) => ({ ...item, type: 'movie', status: normalizeStatus(item.status) }));
  const series = allSeries.map((item) => ({ ...item, type: 'series', status: normalizeStatus(item.status) }));
  return [...movies, ...series];
}

function populateYearFilter() {
  const yearFilter = getById('yearFilter');
  const previousValue = yearFilter.value || 'all';
  const years = Array.from(
    new Set(
      getAllItemsMerged()
        .map((item) => Number(item.year))
        .filter((year) => Number.isInteger(year))
    )
  ).sort((a, b) => b - a);

  yearFilter.replaceChildren();
  yearFilter.appendChild(new Option('Todos', 'all'));
  for (const year of years) {
    yearFilter.appendChild(new Option(String(year), String(year)));
  }

  if (yearFilter.querySelector(`option[value="${previousValue}"]`)) {
    yearFilter.value = previousValue;
  } else {
    yearFilter.value = 'all';
  }
}

function filterItems() {
  const searchTerm = getById('searchInput').value.trim().toLowerCase();
  const typeFilter = getById('typeFilter').value;
  const statusFilter = getById('statusFilter').value;
  const ratingFilter = getById('ratingFilter').value;
  const yearFilter = getById('yearFilter').value;
  const genreFilter = getById('genreFilter').value.trim().toLowerCase();
  const sortBy = getById('sortBy').value;

  let filteredItems = getAllItemsMerged();

  if (currentLibraryTab === 'library') {
    filteredItems = filteredItems.filter((item) => item.status !== 'watchlist');
  } else if (currentLibraryTab === 'watchlist') {
    filteredItems = filteredItems.filter((item) => item.status === 'watchlist');
  }

  if (typeFilter === 'movies') {
    filteredItems = filteredItems.filter((item) => item.type === 'movie');
  } else if (typeFilter === 'series') {
    filteredItems = filteredItems.filter((item) => item.type === 'series');
  }

  if (statusFilter !== 'all') {
    filteredItems = filteredItems.filter((item) => normalizeStatus(item.status) === statusFilter);
  }

  if (ratingFilter !== 'all') {
    const [min, max] = ratingFilter.split('-').map(Number);
    filteredItems = filteredItems.filter((item) => {
      const rating = Number(item.user_rating);
      return Number.isFinite(rating) && rating >= min && rating <= max;
    });
  }

  if (yearFilter !== 'all') {
    const selectedYear = Number(yearFilter);
    filteredItems = filteredItems.filter((item) => Number(item.year) === selectedYear);
  }

  if (genreFilter) {
    filteredItems = filteredItems.filter((item) => String(item.genre || '').toLowerCase().includes(genreFilter));
  }

  if (searchTerm) {
    filteredItems = filteredItems.filter((item) => {
      const searchable = [
        item.title,
        item.synopsis,
        item.genre,
        item.tags,
        item.collections,
        item.director,
        item.actors
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      return searchable.includes(searchTerm);
    });
  }

  filteredItems.sort((a, b) => compareItems(a, b, sortBy));

  currentItems = filteredItems;
  renderItems();
  updateStats();
  renderRecommendations();
}

function compareItems(a, b, sortBy) {
  switch (sortBy) {
    case 'title':
      return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
    case 'rating':
      return getSortableNumber(b.user_rating) - getSortableNumber(a.user_rating);
    case 'imdb':
      return getSortableNumber(b.imdb_rating) - getSortableNumber(a.imdb_rating);
    case 'year':
      return getSortableNumber(b.year) - getSortableNumber(a.year);
    case 'last_watched':
      return getSortableTimestamp(b.last_watched_at) - getSortableTimestamp(a.last_watched_at);
    case 'date':
    default:
      return getSortableTimestamp(b.created_at) - getSortableTimestamp(a.created_at);
  }
}

function getSortableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : -1;
}

function getSortableTimestamp(value) {
  const timestamp = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function renderItems() {
  const container = getById('itemsList');
  container.replaceChildren();

  if (currentItems.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const title = document.createElement('h3');
    title.textContent = 'Nenhum item encontrado';

    const description = document.createElement('p');
    description.textContent = 'Tente ajustar os filtros ou cadastre novos filmes e series.';

    emptyState.append(title, description);
    container.appendChild(emptyState);
    updateBulkBar();
    return;
  }

  for (const item of currentItems) {
    container.appendChild(createItemCard(item));
  }

  updateBulkBar();
}

function createItemCard(item) {
  const key = makeItemKey(item.type, item.id);

  const card = document.createElement('article');
  card.className = 'item-card';
  card.dataset.type = item.type;
  card.dataset.id = String(item.id);
  if (selectedItemKeys.has(key)) {
    card.classList.add('is-selected');
  }

  const poster = createPosterElement(item);
  const info = document.createElement('div');
  info.className = 'item-info';

  const meta = document.createElement('div');
  meta.className = 'item-meta';

  const metaLeft = document.createElement('div');
  metaLeft.className = 'item-meta-left';

  const selectLabel = document.createElement('label');
  selectLabel.className = 'item-select-label';

  const selectCheckbox = document.createElement('input');
  selectCheckbox.type = 'checkbox';
  selectCheckbox.className = 'item-select-checkbox';
  selectCheckbox.dataset.action = 'select-item';
  selectCheckbox.dataset.key = key;
  selectCheckbox.checked = selectedItemKeys.has(key);

  const selectText = document.createElement('span');
  selectText.textContent = 'Selecionar';
  selectLabel.append(selectCheckbox, selectText);

  const itemType = document.createElement('span');
  itemType.className = `item-type-pill ${item.type}`;
  itemType.textContent = item.type === 'movie' ? 'Filme' : 'Serie';

  const statusPill = document.createElement('span');
  statusPill.className = `status-pill status-${normalizeStatus(item.status)}`;
  statusPill.textContent = formatStatusLabel(item.status);

  metaLeft.append(selectLabel, itemType, statusPill);

  const createdAt = document.createElement('span');
  createdAt.className = 'item-created-at';
  createdAt.textContent = item.last_watched_at
    ? `Visto: ${formatDate(item.last_watched_at)}`
    : `Criado: ${formatDate(item.created_at)}`;

  meta.append(metaLeft, createdAt);

  const title = document.createElement('h3');
  title.className = 'item-title';
  title.textContent = String(item.title || 'Sem titulo');

  const ratings = document.createElement('div');
  ratings.className = 'item-ratings';

  const userRating = document.createElement('div');
  userRating.className = 'rating user';
  userRating.textContent = `Sua nota: ${formatRating(item.user_rating)}`;

  const imdbRating = document.createElement('div');
  imdbRating.className = 'rating imdb';
  imdbRating.textContent = `IMDb: ${formatRating(item.imdb_rating)}`;

  ratings.append(userRating, imdbRating);

  const extra = document.createElement('p');
  extra.className = 'item-extra';
  extra.textContent = buildExtraMeta(item);

  const synopsis = document.createElement('p');
  synopsis.className = 'item-synopsis';
  synopsis.textContent = String(item.synopsis || 'Sem sinopse.');

  const tags = buildTagList(item);
  if (tags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'item-tags';
    for (const tag of tags.slice(0, 6)) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = tag;
      tagsContainer.appendChild(chip);
    }
    info.append(meta, title, ratings, extra, synopsis, tagsContainer);
  } else {
    info.append(meta, title, ratings, extra, synopsis);
  }

  if (item.type === 'series') {
    const progress = createSeriesProgress(item.id);
    if (progress) {
      info.appendChild(progress);
    }
  }

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const statusSelect = document.createElement('select');
  statusSelect.className = 'item-status-select';
  statusSelect.dataset.action = 'change-status';
  statusSelect.dataset.type = item.type;
  statusSelect.dataset.id = String(item.id);
  for (const statusValue of STATUS_VALUES) {
    statusSelect.appendChild(new Option(formatStatusLabel(statusValue), statusValue));
  }
  statusSelect.value = normalizeStatus(item.status);

  const editButton = document.createElement('button');
  editButton.className = 'btn btn-secondary';
  editButton.type = 'button';
  editButton.dataset.action = 'edit';
  editButton.textContent = 'Editar';

  const deleteButton = document.createElement('button');
  deleteButton.className = 'btn btn-danger';
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = 'Excluir';

  actions.append(statusSelect, editButton, deleteButton);
  info.appendChild(actions);

  card.append(poster, info);
  return card;
}

function createPosterElement(item) {
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
      return poster;
    }
  }

  const noImage = document.createElement('div');
  noImage.className = 'no-image';
  noImage.textContent = item.type === 'movie' ? 'FILME' : 'SERIE';
  poster.appendChild(noImage);
  return poster;
}

function createSeriesProgress(seriesId) {
  const episodes = seriesEpisodesMap.get(Number(seriesId)) || [];
  if (episodes.length === 0) {
    return null;
  }

  const watchedCount = episodes.filter((episode) => episode.watched).length;
  const percent = Math.round((watchedCount / episodes.length) * 100);

  const wrapper = document.createElement('div');
  wrapper.className = 'item-progress';

  const label = document.createElement('div');
  label.className = 'item-progress-label';
  label.textContent = `${watchedCount}/${episodes.length} episodios vistos`;

  const track = document.createElement('div');
  track.className = 'progress-track';

  const fill = document.createElement('span');
  fill.className = 'progress-fill';
  fill.style.width = `${percent}%`;

  track.appendChild(fill);
  wrapper.append(label, track);
  return wrapper;
}

function buildExtraMeta(item) {
  const parts = [];
  if (item.year) {
    parts.push(String(item.year));
  }
  if (item.genre) {
    parts.push(String(item.genre));
  }
  if (item.runtime) {
    parts.push(String(item.runtime));
  }
  return parts.length > 0 ? parts.join(' • ') : 'Sem metadados extras';
}

function buildTagList(item) {
  const tags = splitDelimited(item.tags);
  const collections = splitDelimited(item.collections).map((value) => `#${value}`);
  return [...tags, ...collections];
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

function updateStats() {
  const mergedItems = getAllItemsMerged();

  const moviesCount = mergedItems.filter((item) => item.type === 'movie').length;
  const seriesCount = mergedItems.filter((item) => item.type === 'series').length;
  const watchlistCount = mergedItems.filter((item) => item.status === 'watchlist').length;
  const completedCount = mergedItems.filter((item) => item.status === 'completed').length;

  const ratings = mergedItems
    .map((item) => Number(item.user_rating))
    .filter((value) => Number.isFinite(value));
  const imdbRatings = mergedItems
    .map((item) => Number(item.imdb_rating))
    .filter((value) => Number.isFinite(value));

  const watchedEpisodes = Array.from(seriesEpisodesMap.values())
    .flat()
    .filter((episode) => episode.watched).length;

  getById('statTotal').textContent = String(mergedItems.length);
  getById('statMovies').textContent = String(moviesCount);
  getById('statSeries').textContent = String(seriesCount);
  getById('statWatchlist').textContent = String(watchlistCount);
  getById('statCompleted').textContent = String(completedCount);
  getById('statEpisodes').textContent = String(watchedEpisodes);
  getById('statUserAverage').textContent = ratings.length ? formatRating(avg(ratings)) : '--';
  getById('statImdbAverage').textContent = imdbRatings.length ? formatRating(avg(imdbRatings)) : '--';
  getById('statFilteredInfo').textContent = `${currentItems.length} itens em foco agora`;
  getById('resultsCounter').textContent = `${currentItems.length} itens em exibicao`;
}

function renderRecommendations() {
  const recommendationsList = getById('recommendationsList');
  const recommendationHint = getById('recommendationHint');
  const recommendations = buildRecommendations().slice(0, RECOMMENDATION_LIMIT);

  recommendationsList.replaceChildren();

  if (recommendations.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'recommendation-item';
    const title = document.createElement('h3');
    title.textContent = 'Monte sua curadoria';
    const body = document.createElement('p');
    body.textContent = 'Adicione mais itens e notas para gerar insights mais certeiros.';
    empty.append(title, body);
    recommendationsList.appendChild(empty);
    recommendationHint.textContent = 'Recomendacoes serao atualizadas conforme voce usa o app';
    return;
  }

  recommendationHint.textContent = `${recommendations.length} sugestoes personalizadas`;

  for (const recommendation of recommendations) {
    const card = document.createElement('article');
    card.className = 'recommendation-item';

    const title = document.createElement('h3');
    title.textContent = recommendation.title;

    const body = document.createElement('p');
    body.textContent = recommendation.body;

    const note = document.createElement('span');
    note.className = 'recommendation-note';
    note.textContent = recommendation.note;

    card.append(title, body, note);
    recommendationsList.appendChild(card);
  }
}

function buildRecommendations() {
  const items = getAllItemsMerged();
  const watchlist = items.filter((item) => item.status === 'watchlist');
  const pausedOrDropped = items.filter((item) => item.status === 'paused' || item.status === 'dropped');

  const highRatedByGenre = new Map();
  for (const item of items) {
    const rating = Number(item.user_rating);
    if (!Number.isFinite(rating) || rating < 8) {
      continue;
    }

    for (const genre of splitDelimited(item.genre)) {
      const current = highRatedByGenre.get(genre) || { total: 0, count: 0 };
      current.total += rating;
      current.count += 1;
      highRatedByGenre.set(genre, current);
    }
  }

  const topGenre = Array.from(highRatedByGenre.entries())
    .sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]?.[0];

  const recommendations = [];

  if (topGenre) {
    const genreMatches = watchlist.filter((item) => splitDelimited(item.genre).includes(topGenre));
    if (genreMatches.length > 0) {
      const next = genreMatches[0];
      recommendations.push({
        title: `Aposte em ${topGenre}`,
        body: `${next.title} combina com as suas notas altas desse genero.`,
        note: 'Prioridade alta'
      });
    }
  }

  const inProgressSeries = items
    .filter((item) => item.type === 'series')
    .map((series) => {
      const episodes = seriesEpisodesMap.get(Number(series.id)) || [];
      const watched = episodes.filter((episode) => episode.watched).length;
      return { series, watched, total: episodes.length };
    })
    .filter((entry) => entry.total > 0 && entry.watched > 0 && entry.watched < entry.total)
    .sort((a, b) => (b.watched / b.total) - (a.watched / a.total));

  if (inProgressSeries.length > 0) {
    const nextSeries = inProgressSeries[0];
    recommendations.push({
      title: 'Finalize o que ja comecou',
      body: `${nextSeries.series.title} esta em ${Math.round((nextSeries.watched / nextSeries.total) * 100)}% de progresso.`,
      note: 'Momentum de visualizacao'
    });
  }

  if (pausedOrDropped.length > 0) {
    const candidate = pausedOrDropped[0];
    recommendations.push({
      title: 'Retome um titulo pausado',
      body: `${candidate.title} ficou parado e pode voltar para a fila principal.`,
      note: 'Reduz backlog'
    });
  }

  if (watchlist.length >= 6) {
    const oldestWatchlist = [...watchlist].sort((a, b) => getSortableTimestamp(a.created_at) - getSortableTimestamp(b.created_at))[0];
    recommendations.push({
      title: 'Limpe a watchlist antiga',
      body: `Comece por ${oldestWatchlist.title} para reduzir itens parados ha mais tempo.`,
      note: 'Organizacao da biblioteca'
    });
  } else if (watchlist.length === 0) {
    recommendations.push({
      title: 'Sem watchlist ativa',
      body: 'Adicione titulos que voce quer ver para receber sugestoes de prioridade.',
      note: 'Acao recomendada'
    });
  }

  return recommendations;
}

function showAddForm(type) {
  getById('modalTitle').textContent = type === 'movie' ? 'Adicionar Filme' : 'Adicionar Serie';
  getById('itemType').value = type;
  getById('itemId').value = '';
  getById('itemForm').reset();
  getById('imdbRating').textContent = '--';
  getById('status').value = 'watchlist';

  selectedPosterPath = null;
  selectedImdbId = null;
  editContext = { reminderAt: null, reminderSent: 0 };
  currentSeasons = [];
  clearPosterPreview();
  renderSeasons();

  const seasonsSection = getById('seasonsSection');
  seasonsSection.classList.toggle('hidden', type !== 'series');

  openModal('modal');
}

async function editItem(type, id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId)) {
    return;
  }

  try {
    const item = type === 'movie'
      ? allMovies.find((movie) => Number(movie.id) === parsedId)
      : allSeries.find((series) => Number(series.id) === parsedId);

    if (!item) {
      return;
    }

    getById('modalTitle').textContent = type === 'movie' ? 'Editar Filme' : 'Editar Serie';
    getById('itemType').value = type;
    getById('itemId').value = String(item.id);
    getById('title').value = String(item.title || '');
    getById('year').value = item.year ?? '';
    getById('status').value = normalizeStatus(item.status);
    getById('genre').value = String(item.genre || '');
    getById('runtime').value = String(item.runtime || '');
    getById('director').value = String(item.director || '');
    getById('actors').value = String(item.actors || '');
    getById('tags').value = String(item.tags || '');
    getById('collections').value = String(item.collections || '');
    getById('lastWatchedAt').value = toDateTimeLocal(item.last_watched_at);
    getById('reminderAt').value = toDateTimeLocal(item.reminder_at);
    getById('synopsis').value = String(item.synopsis || '');
    getById('userRating').value = item.user_rating ?? '';
    getById('imdbRating').textContent = item.imdb_rating ?? '--';

    selectedPosterPath = item.poster_path || null;
    selectedImdbId = item.imdb_id || null;
    editContext = {
      reminderAt: item.reminder_at || null,
      reminderSent: item.reminder_sent ? 1 : 0
    };

    if (selectedPosterPath) {
      renderPosterPreview(selectedPosterPath);
    } else {
      clearPosterPreview();
    }

    const seasonsSection = getById('seasonsSection');
    if (type === 'series') {
      const [seasons, episodes] = await Promise.all([
        appApi.db.getSeasons(parsedId),
        appApi.db.getEpisodes(parsedId)
      ]);
      currentSeasons = mergeSeasonsAndEpisodes(seasons, episodes);
      renderSeasons();
      seasonsSection.classList.remove('hidden');
    } else {
      currentSeasons = [];
      renderSeasons();
      seasonsSection.classList.add('hidden');
    }

    openModal('modal');
  } catch (error) {
    console.error('Erro ao carregar item para edicao:', error);
    showError(getErrorMessage(error, 'Erro ao carregar item.'));
  }
}

function mergeSeasonsAndEpisodes(seasons, episodes) {
  const seasonMap = new Map();

  for (const season of Array.isArray(seasons) ? seasons : []) {
    const seasonNumber = Number(season.season_number);
    if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) {
      continue;
    }

    seasonMap.set(seasonNumber, {
      id: season.id || null,
      season_number: seasonNumber,
      watched: Boolean(season.watched),
      comment: String(season.comment || ''),
      user_rating: season.user_rating ?? null,
      episodes: []
    });
  }

  for (const episode of Array.isArray(episodes) ? episodes : []) {
    const seasonNumber = Number(episode.season_number);
    if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) {
      continue;
    }

    if (!seasonMap.has(seasonNumber)) {
      seasonMap.set(seasonNumber, {
        id: null,
        season_number: seasonNumber,
        watched: false,
        comment: '',
        user_rating: null,
        episodes: []
      });
    }

    seasonMap.get(seasonNumber).episodes.push({
      id: episode.id || null,
      episode_number: Number(episode.episode_number) || 1,
      title: String(episode.title || ''),
      watched: Boolean(episode.watched),
      user_rating: episode.user_rating ?? null,
      watched_at: episode.watched_at || null
    });
  }

  const merged = Array.from(seasonMap.values()).sort((a, b) => a.season_number - b.season_number);
  for (const season of merged) {
    season.episodes.sort((a, b) => a.episode_number - b.episode_number);
  }
  return merged;
}

function openModal(modalId) {
  const modal = getById(modalId);
  modal.style.display = 'block';
  modal.setAttribute('aria-hidden', 'false');
  updateBodyModalState();
}

function closeModal() {
  const modal = getById('modal');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  updateBodyModalState();
}

function closeSearchResultsModal() {
  const modal = getById('searchResultsModal');
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  updateBodyModalState();
}

function updateBodyModalState() {
  const isModalOpen = getById('modal').style.display === 'block';
  const isSearchModalOpen = getById('searchResultsModal').style.display === 'block';
  document.body.classList.toggle('modal-open', isModalOpen || isSearchModalOpen);
}

function renderPosterPreview(fileName) {
  const posterPreview = getById('posterPreview');
  posterPreview.replaceChildren();

  const source = buildLocalPosterSrc(fileName);
  if (!source) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'poster-preview';

  const image = document.createElement('img');
  image.src = source;
  image.alt = 'Poster selecionado';

  wrapper.appendChild(image);
  posterPreview.appendChild(wrapper);
}

function clearPosterPreview() {
  getById('posterPreview').replaceChildren();
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const itemType = getById('itemType').value;
  const itemId = getById('itemId').value;
  const reminderAt = fromDateTimeLocal(getById('reminderAt').value);

  const itemData = {
    title: getById('title').value,
    year: toNullableInteger(getById('year').value),
    status: getById('status').value,
    genre: getById('genre').value,
    runtime: getById('runtime').value,
    director: getById('director').value,
    actors: getById('actors').value,
    tags: getById('tags').value,
    collections: getById('collections').value,
    last_watched_at: fromDateTimeLocal(getById('lastWatchedAt').value),
    reminder_at: reminderAt,
    reminder_sent: resolveReminderSentFlag(reminderAt),
    synopsis: getById('synopsis').value,
    user_rating: toNullableNumber(getById('userRating').value),
    imdb_rating: toNullableNumber(getById('imdbRating').textContent),
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
        await syncSeasonsAndEpisodes(parsedId);
      }
      showSuccess('Item atualizado com sucesso.');
    } else if (itemType === 'movie') {
      await appApi.db.addMovie(itemData);
      showSuccess('Filme salvo com sucesso.');
    } else {
      const createdSeriesId = Number(await appApi.db.addSeries(itemData));
      await syncSeasonsAndEpisodes(createdSeriesId);
      showSuccess('Serie salva com sucesso.');
    }

    closeModal();
    clearSelection();
    await loadAllItems();
  } catch (error) {
    console.error('Erro ao salvar item:', error);
    showError(getErrorMessage(error, 'Erro ao salvar item.'));
  }
}

function resolveReminderSentFlag(nextReminderAt) {
  if (!nextReminderAt) {
    return 0;
  }

  if (!editContext.reminderAt) {
    return 0;
  }

  if (!isSameInstant(editContext.reminderAt, nextReminderAt)) {
    return 0;
  }

  return editContext.reminderSent ? 1 : 0;
}

function isSameInstant(a, b) {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  return Number.isFinite(first) && Number.isFinite(second) && first === second;
}

function addSeason() {
  const nextSeasonNumber = currentSeasons.reduce((max, season) => Math.max(max, Number(season.season_number) || 0), 0) + 1;
  currentSeasons.push({
    id: null,
    season_number: nextSeasonNumber,
    watched: false,
    comment: '',
    user_rating: null,
    episodes: []
  });
  renderSeasons();
}

function renderSeasons() {
  const container = getById('seasonsList');
  container.replaceChildren();

  if (currentSeasons.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'section-tip';
    empty.textContent = 'Nenhuma temporada cadastrada.';
    container.appendChild(empty);
    return;
  }

  currentSeasons.forEach((season, seasonIndex) => {
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
    checkbox.checked = Boolean(season.watched);
    checkbox.dataset.scope = 'season';
    checkbox.dataset.field = 'watched';
    checkbox.dataset.seasonIndex = String(seasonIndex);

    const label = document.createElement('label');
    label.textContent = 'Assistida';

    seasonCheckbox.append(checkbox, label);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-danger';
    removeButton.dataset.action = 'remove-season';
    removeButton.dataset.seasonIndex = String(seasonIndex);
    removeButton.textContent = 'Excluir temporada';

    seasonHeader.append(seasonNumber, seasonCheckbox, removeButton);

    const seasonFields = document.createElement('div');
    seasonFields.className = 'season-fields';

    const comment = document.createElement('textarea');
    comment.className = 'season-comment';
    comment.placeholder = 'Comentario da temporada...';
    comment.maxLength = 2000;
    comment.value = String(season.comment || '');
    comment.dataset.scope = 'season';
    comment.dataset.field = 'comment';
    comment.dataset.seasonIndex = String(seasonIndex);

    const rating = document.createElement('input');
    rating.type = 'number';
    rating.className = 'season-rating';
    rating.min = '0';
    rating.max = '10';
    rating.step = '0.1';
    rating.placeholder = 'Nota';
    rating.value = season.user_rating ?? '';
    rating.dataset.scope = 'season';
    rating.dataset.field = 'user_rating';
    rating.dataset.seasonIndex = String(seasonIndex);

    seasonFields.append(comment, rating);

    const episodesWrapper = document.createElement('div');
    episodesWrapper.className = 'season-episodes';

    const episodesHeader = document.createElement('div');
    episodesHeader.className = 'season-episodes-header';

    const episodesTitle = document.createElement('span');
    episodesTitle.textContent = `Episodios (${season.episodes.length})`;

    const addEpisodeButton = document.createElement('button');
    addEpisodeButton.type = 'button';
    addEpisodeButton.className = 'btn btn-secondary';
    addEpisodeButton.dataset.action = 'add-episode';
    addEpisodeButton.dataset.seasonIndex = String(seasonIndex);
    addEpisodeButton.textContent = '+ Episodio';

    episodesHeader.append(episodesTitle, addEpisodeButton);

    const episodesList = document.createElement('div');
    episodesList.className = 'episodes-list';

    if (season.episodes.length === 0) {
      const emptyEpisodes = document.createElement('p');
      emptyEpisodes.className = 'section-tip';
      emptyEpisodes.textContent = 'Nenhum episodio adicionado.';
      episodesList.appendChild(emptyEpisodes);
    } else {
      season.episodes.forEach((episode, episodeIndex) => {
        episodesList.appendChild(createEpisodeRow(seasonIndex, episodeIndex, episode));
      });
    }

    episodesWrapper.append(episodesHeader, episodesList);
    seasonItem.append(seasonHeader, seasonFields, episodesWrapper);
    container.appendChild(seasonItem);
  });
}

function createEpisodeRow(seasonIndex, episodeIndex, episode) {
  const row = document.createElement('div');
  row.className = 'episode-item';

  const number = document.createElement('input');
  number.type = 'number';
  number.min = '1';
  number.step = '1';
  number.className = 'episode-number';
  number.value = episode.episode_number ?? episodeIndex + 1;
  number.placeholder = 'Ep';
  number.dataset.scope = 'episode';
  number.dataset.field = 'episode_number';
  number.dataset.seasonIndex = String(seasonIndex);
  number.dataset.episodeIndex = String(episodeIndex);

  const title = document.createElement('input');
  title.type = 'text';
  title.className = 'episode-title';
  title.maxLength = 300;
  title.placeholder = 'Titulo do episodio';
  title.value = String(episode.title || '');
  title.dataset.scope = 'episode';
  title.dataset.field = 'title';
  title.dataset.seasonIndex = String(seasonIndex);
  title.dataset.episodeIndex = String(episodeIndex);

  const watchedWrap = document.createElement('label');
  watchedWrap.className = 'season-checkbox';
  watchedWrap.textContent = 'Visto';

  const watched = document.createElement('input');
  watched.type = 'checkbox';
  watched.checked = Boolean(episode.watched);
  watched.dataset.scope = 'episode';
  watched.dataset.field = 'watched';
  watched.dataset.seasonIndex = String(seasonIndex);
  watched.dataset.episodeIndex = String(episodeIndex);
  watchedWrap.prepend(watched);

  const rating = document.createElement('input');
  rating.type = 'number';
  rating.className = 'episode-rating';
  rating.min = '0';
  rating.max = '10';
  rating.step = '0.1';
  rating.placeholder = 'Nota';
  rating.value = episode.user_rating ?? '';
  rating.dataset.scope = 'episode';
  rating.dataset.field = 'user_rating';
  rating.dataset.seasonIndex = String(seasonIndex);
  rating.dataset.episodeIndex = String(episodeIndex);

  const watchedAt = document.createElement('input');
  watchedAt.type = 'datetime-local';
  watchedAt.className = 'episode-date';
  watchedAt.value = toDateTimeLocal(episode.watched_at);
  watchedAt.dataset.scope = 'episode';
  watchedAt.dataset.field = 'watched_at';
  watchedAt.dataset.seasonIndex = String(seasonIndex);
  watchedAt.dataset.episodeIndex = String(episodeIndex);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn btn-danger';
  removeButton.dataset.action = 'remove-episode';
  removeButton.dataset.seasonIndex = String(seasonIndex);
  removeButton.dataset.episodeIndex = String(episodeIndex);
  removeButton.textContent = 'Excluir';

  row.append(number, title, watchedWrap, rating, watchedAt, removeButton);
  return row;
}

function handleSeasonFieldChange(event) {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  const scope = event.target.dataset.scope;
  if (scope === 'season') {
    applySeasonFieldChange(event.target);
  } else if (scope === 'episode') {
    applyEpisodeFieldChange(event.target);
  }
}

function applySeasonFieldChange(target) {
  const seasonIndex = Number(target.dataset.seasonIndex);
  const field = target.dataset.field;
  const season = currentSeasons[seasonIndex];

  if (!season || !field) {
    return;
  }

  if (field === 'watched' && target instanceof HTMLInputElement) {
    season.watched = target.checked;
    return;
  }

  if (field === 'comment' && target instanceof HTMLTextAreaElement) {
    season.comment = target.value;
    return;
  }

  if (field === 'user_rating' && target instanceof HTMLInputElement) {
    season.user_rating = toNullableNumber(target.value);
  }
}

function applyEpisodeFieldChange(target) {
  const seasonIndex = Number(target.dataset.seasonIndex);
  const episodeIndex = Number(target.dataset.episodeIndex);
  const field = target.dataset.field;
  const season = currentSeasons[seasonIndex];
  const episode = season?.episodes?.[episodeIndex];

  if (!season || !episode || !field) {
    return;
  }

  if (field === 'episode_number' && target instanceof HTMLInputElement) {
    const parsed = Number(target.value);
    episode.episode_number = Number.isInteger(parsed) && parsed > 0 ? parsed : episodeIndex + 1;
    return;
  }

  if (field === 'title' && target instanceof HTMLInputElement) {
    episode.title = target.value;
    return;
  }

  if (field === 'watched' && target instanceof HTMLInputElement) {
    episode.watched = target.checked;
    return;
  }

  if (field === 'user_rating' && target instanceof HTMLInputElement) {
    episode.user_rating = toNullableNumber(target.value);
    return;
  }

  if (field === 'watched_at' && target instanceof HTMLInputElement) {
    episode.watched_at = fromDateTimeLocal(target.value);
  }
}

function handleSeasonListClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }

  const seasonIndex = Number(button.dataset.seasonIndex);
  if (!Number.isInteger(seasonIndex)) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'remove-season') {
    currentSeasons.splice(seasonIndex, 1);
    reindexSeasons();
    renderSeasons();
    return;
  }

  if (action === 'add-episode') {
    const season = currentSeasons[seasonIndex];
    if (!season) {
      return;
    }
    const nextEpisodeNumber = season.episodes.reduce(
      (max, episode) => Math.max(max, Number(episode.episode_number) || 0),
      0
    ) + 1;
    season.episodes.push({
      id: null,
      episode_number: nextEpisodeNumber,
      title: '',
      watched: false,
      user_rating: null,
      watched_at: null
    });
    renderSeasons();
    return;
  }

  if (action === 'remove-episode') {
    const episodeIndex = Number(button.dataset.episodeIndex);
    if (!Number.isInteger(episodeIndex)) {
      return;
    }
    const season = currentSeasons[seasonIndex];
    if (!season) {
      return;
    }
    season.episodes.splice(episodeIndex, 1);
    renderSeasons();
  }
}

function reindexSeasons() {
  currentSeasons = currentSeasons
    .sort((a, b) => (Number(a.season_number) || 0) - (Number(b.season_number) || 0))
    .map((season, index) => ({
      ...season,
      season_number: index + 1
    }));
}

async function syncSeasonsAndEpisodes(seriesId) {
  const [existingSeasons, existingEpisodes] = await Promise.all([
    appApi.db.getSeasons(seriesId),
    appApi.db.getEpisodes(seriesId)
  ]);

  for (const episode of existingEpisodes) {
    await appApi.db.deleteEpisode(Number(episode.id));
  }
  for (const season of existingSeasons) {
    await appApi.db.deleteSeason(Number(season.id));
  }

  const normalizedSeasons = normalizeSeasonsForSave(currentSeasons);
  for (const season of normalizedSeasons) {
    await appApi.db.addSeason({
      series_id: seriesId,
      season_number: season.season_number,
      watched: season.watched,
      comment: season.comment,
      user_rating: season.user_rating
    });

    for (const episode of season.episodes) {
      await appApi.db.addEpisode({
        series_id: seriesId,
        season_number: season.season_number,
        episode_number: episode.episode_number,
        title: episode.title,
        watched: episode.watched,
        user_rating: episode.user_rating,
        watched_at: episode.watched_at
      });
    }
  }
}

function normalizeSeasonsForSave(seasons) {
  const normalized = [...seasons]
    .sort((a, b) => (Number(a.season_number) || 0) - (Number(b.season_number) || 0))
    .map((season, seasonIndex) => {
      const orderedEpisodes = [...(Array.isArray(season.episodes) ? season.episodes : [])]
        .sort((a, b) => (Number(a.episode_number) || 0) - (Number(b.episode_number) || 0))
        .map((episode, episodeIndex) => ({
          episode_number: episodeIndex + 1,
          title: String(episode.title || ''),
          watched: Boolean(episode.watched),
          user_rating: toNullableNumber(episode.user_rating),
          watched_at: episode.watched_at || null
        }));

      return {
        season_number: seasonIndex + 1,
        watched: Boolean(season.watched),
        comment: String(season.comment || ''),
        user_rating: toNullableNumber(season.user_rating),
        episodes: orderedEpisodes
      };
    });

  return normalized;
}

async function searchIMDb() {
  const title = getById('title').value.trim();
  if (!title) {
    showError('Digite um titulo para buscar.');
    return;
  }

  if (!omdbApiKey) {
    showError('Configure OMDB_API_KEY para usar a busca automatica.');
    return;
  }

  try {
    const params = new URLSearchParams({
      apikey: omdbApiKey,
      s: title
    });

    const response = await fetch(`${OMDB_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Falha ao consultar o servico OMDb.');
    }

    const data = await response.json();
    if (data.Response === 'True' && Array.isArray(data.Search)) {
      displaySearchResults(data.Search);
      openModal('searchResultsModal');
      return;
    }

    showError(String(data.Error || 'Nenhum resultado encontrado.'));
  } catch (error) {
    console.error('Erro na busca OMDb:', error);
    showError('Erro ao conectar com a API do OMDb.');
  }
}

function displaySearchResults(results) {
  const resultsList = getById('searchResultsList');
  resultsList.replaceChildren();

  for (const item of results) {
    const resultItem = document.createElement('button');
    resultItem.type = 'button';
    resultItem.className = 'search-result-item';
    resultItem.dataset.imdbId = String(item.imdbID || '');

    const posterUrl = normalizeExternalPosterUrl(item.Poster);
    const image = document.createElement('img');
    image.alt = 'Poster';
    if (posterUrl) {
      image.src = posterUrl;
      image.loading = 'lazy';
    } else {
      image.classList.add('is-placeholder');
      image.src =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect width="120" height="180" fill="%231a2237"/><text x="60" y="94" text-anchor="middle" font-size="12" fill="%23a8b6d4">SEM POSTER</text></svg>';
    }

    const info = document.createElement('div');
    info.className = 'search-result-info';

    const title = document.createElement('h4');
    title.textContent = String(item.Title || 'Sem titulo');

    const meta = document.createElement('p');
    const kind = item.Type === 'movie' ? 'Filme' : 'Serie';
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
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function handleSearchResultsClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

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
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Falha ao carregar detalhes do OMDb.');
    }

    const data = await response.json();
    if (data.Response !== 'True') {
      showError('Nao foi possivel carregar os detalhes.');
      return;
    }

    getById('title').value = data.Title || '';
    getById('synopsis').value = data.Plot && data.Plot !== 'N/A' ? data.Plot : '';
    getById('year').value = /^\d{4}$/.test(String(data.Year || '')) ? data.Year : '';
    getById('genre').value = data.Genre && data.Genre !== 'N/A' ? data.Genre : '';
    getById('runtime').value = data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : '';
    getById('director').value = data.Director && data.Director !== 'N/A' ? data.Director : '';
    getById('actors').value = data.Actors && data.Actors !== 'N/A' ? data.Actors : '';
    getById('imdbRating').textContent = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '--';
    selectedImdbId = data.imdbID || null;

    const itemType = getById('itemType').value;
    if (itemType === 'series' && currentSeasons.length === 0) {
      const totalSeasons = Number(data.totalSeasons);
      if (Number.isInteger(totalSeasons) && totalSeasons > 0 && totalSeasons <= 25) {
        currentSeasons = Array.from({ length: totalSeasons }, (_, index) => ({
          id: null,
          season_number: index + 1,
          watched: false,
          comment: '',
          user_rating: null,
          episodes: []
        }));
        renderSeasons();
      }
    }

    showSuccess('Dados importados do OMDb.');
  } catch (error) {
    console.error('Erro ao buscar detalhes OMDb:', error);
    showError('Erro ao carregar detalhes do titulo.');
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
  if (!(event.target instanceof Element)) {
    return;
  }

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
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === 'edit') {
      editItem(type, id);
      return;
    }
    if (action === 'delete') {
      deleteItems([{ type, id }]);
      return;
    }
  }

  const interactive = event.target.closest('button, input, select, textarea, label');
  if (!interactive) {
    editItem(type, id);
  }
}

function handleItemsListChange(event) {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  const action = event.target.dataset.action;
  if (action === 'select-item' && event.target instanceof HTMLInputElement) {
    const key = event.target.dataset.key;
    if (!key) {
      return;
    }
    if (event.target.checked) {
      selectedItemKeys.add(key);
    } else {
      selectedItemKeys.delete(key);
    }
    renderItems();
    return;
  }

  if (action === 'change-status' && event.target instanceof HTMLSelectElement) {
    const type = event.target.dataset.type;
    const id = Number(event.target.dataset.id);
    const status = event.target.value;
    if (!type || !Number.isInteger(id)) {
      return;
    }
    updateSingleItemStatus(type, id, status);
  }
}

async function updateSingleItemStatus(type, id, status) {
  try {
    const markDate = shouldStampLastWatched(status) ? new Date().toISOString() : null;
    await appApi.db.updateItemStatus(type, id, status, markDate);
    await loadAllItems();
    showSuccess('Status atualizado.');
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    showError(getErrorMessage(error, 'Erro ao atualizar status.'));
  }
}

function shouldStampLastWatched(status) {
  return status === 'watching' || status === 'completed' || status === 'rewatch';
}

async function handleBulkApplyStatus() {
  if (selectedItemKeys.size === 0) {
    showError('Selecione ao menos um item.');
    return;
  }

  const status = getById('bulkStatusSelect').value;
  const entries = Array.from(selectedItemKeys).map(parseItemKey).filter(Boolean);

  try {
    const markDate = shouldStampLastWatched(status) ? new Date().toISOString() : null;
    await Promise.all(
      entries.map((entry) => appApi.db.updateItemStatus(entry.type, entry.id, status, markDate))
    );
    clearSelection();
    await loadAllItems();
    showSuccess(`Status aplicado em ${entries.length} item(ns).`);
  } catch (error) {
    console.error('Erro no status em lote:', error);
    showError(getErrorMessage(error, 'Falha ao aplicar status em lote.'));
  }
}

async function handleBulkDelete() {
  if (selectedItemKeys.size === 0) {
    showError('Selecione ao menos um item para excluir.');
    return;
  }

  const entries = Array.from(selectedItemKeys).map(parseItemKey).filter(Boolean);
  await deleteItems(entries);
}

async function deleteItems(entries) {
  if (!entries || entries.length === 0) {
    return;
  }

  const question = entries.length === 1
    ? 'Tem certeza que deseja excluir este item?'
    : `Tem certeza que deseja excluir ${entries.length} itens selecionados?`;
  if (!window.confirm(question)) {
    return;
  }

  try {
    const snapshots = await collectDeletionSnapshots(entries);

    for (const entry of entries) {
      if (entry.type === 'movie') {
        await appApi.db.deleteMovie(entry.id);
      } else {
        await appApi.db.deleteSeries(entry.id);
      }
    }

    setUndoSnapshot(snapshots);
    clearSelection();
    await loadAllItems();
    showSuccess(entries.length === 1 ? 'Item excluido.' : `${entries.length} itens excluidos.`);
  } catch (error) {
    console.error('Erro ao excluir itens:', error);
    showError(getErrorMessage(error, 'Erro ao excluir item(ns).'));
  }
}

async function collectDeletionSnapshots(entries) {
  const snapshots = await Promise.all(entries.map(async (entry) => {
    const source = findItemByKey(entry.type, entry.id);
    if (!source) {
      return null;
    }

    if (entry.type === 'movie') {
      return { type: 'movie', data: { ...source } };
    }

    const [seasons, episodes] = await Promise.all([
      appApi.db.getSeasons(entry.id),
      appApi.db.getEpisodes(entry.id)
    ]);

    return {
      type: 'series',
      data: { ...source },
      seasons: Array.isArray(seasons) ? seasons : [],
      episodes: Array.isArray(episodes) ? episodes : []
    };
  }));

  return snapshots.filter(Boolean);
}

function setUndoSnapshot(snapshots) {
  clearUndoSnapshot();
  if (!snapshots || snapshots.length === 0) {
    return;
  }

  undoSnapshot = {
    createdAt: Date.now(),
    items: snapshots
  };

  getById('undoText').textContent = snapshots.length === 1
    ? 'Item excluido. Deseja desfazer?'
    : `${snapshots.length} itens excluidos. Deseja desfazer?`;
  getById('undoBar').classList.remove('hidden');

  undoTimerId = setTimeout(() => {
    undoSnapshot = null;
    getById('undoBar').classList.add('hidden');
  }, 10000);
}

function clearUndoSnapshot() {
  if (undoTimerId) {
    clearTimeout(undoTimerId);
    undoTimerId = null;
  }
  getById('undoBar').classList.add('hidden');
}

async function restoreDeletedItems() {
  if (!undoSnapshot || !Array.isArray(undoSnapshot.items) || undoSnapshot.items.length === 0) {
    return;
  }

  const items = undoSnapshot.items;
  undoSnapshot = null;
  clearUndoSnapshot();

  try {
    for (const snapshot of items) {
      if (snapshot.type === 'movie') {
        await appApi.db.addMovie(snapshot.data);
        continue;
      }

      const newSeriesId = Number(await appApi.db.addSeries(snapshot.data));

      for (const season of snapshot.seasons || []) {
        await appApi.db.addSeason({
          series_id: newSeriesId,
          season_number: season.season_number,
          watched: Boolean(season.watched),
          comment: season.comment,
          user_rating: season.user_rating
        });
      }

      for (const episode of snapshot.episodes || []) {
        await appApi.db.addEpisode({
          series_id: newSeriesId,
          season_number: episode.season_number,
          episode_number: episode.episode_number,
          title: episode.title,
          watched: Boolean(episode.watched),
          user_rating: episode.user_rating,
          watched_at: episode.watched_at
        });
      }
    }

    await loadAllItems();
    showSuccess('Exclusao desfeita.');
  } catch (error) {
    console.error('Erro ao desfazer exclusao:', error);
    showError(getErrorMessage(error, 'Nao foi possivel desfazer a exclusao.'));
  }
}

function findItemByKey(type, id) {
  const sourceList = type === 'movie' ? allMovies : allSeries;
  return sourceList.find((item) => Number(item.id) === Number(id)) || null;
}

function clearSelection() {
  selectedItemKeys.clear();
  updateBulkBar();
  renderItems();
}

function syncSelectionWithAvailableItems() {
  const validKeys = new Set(getAllItemsMerged().map((item) => makeItemKey(item.type, item.id)));
  for (const key of Array.from(selectedItemKeys)) {
    if (!validKeys.has(key)) {
      selectedItemKeys.delete(key);
    }
  }
}

function makeItemKey(type, id) {
  return `${type}:${id}`;
}

function parseItemKey(key) {
  const [type, idRaw] = String(key).split(':');
  const id = Number(idRaw);
  if (!type || !Number.isInteger(id)) {
    return null;
  }
  return { type, id };
}

function updateBulkBar() {
  const bulkBar = getById('bulkBar');
  const count = selectedItemKeys.size;
  if (count === 0) {
    bulkBar.classList.add('hidden');
  } else {
    bulkBar.classList.remove('hidden');
  }
  getById('bulkCount').textContent = `${count} selecionado(s)`;
}

function setView(view) {
  const itemsList = getById('itemsList');
  const btnGrid = getById('btn-grid');
  const btnList = getById('btn-list');

  currentView = view === 'list' ? 'list' : 'grid';

  if (currentView === 'list') {
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

  localStorage.setItem('preferredView', currentView);
}

function setLibraryTab(tab, shouldFilter = true) {
  currentLibraryTab = tab === 'library' || tab === 'watchlist' ? tab : 'all';

  const buttons = Array.from(document.querySelectorAll('.tab-btn'));
  for (const button of buttons) {
    const isActive = button.dataset.library === currentLibraryTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  }

  if (shouldFilter) {
    filterItems();
  }
}

async function handleExportData() {
  try {
    const result = await appApi.exportData();
    if (!result || result.canceled) {
      return;
    }
    showSuccess(`Dados exportados para: ${result.filePath}`);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    showError(getErrorMessage(error, 'Erro ao exportar dados.'));
  }
}

async function handleImportData() {
  const replace = window.confirm(
    'Importacao: OK = substituir todos os dados atuais. Cancelar = mesclar com os dados atuais.'
  );
  const mode = replace ? 'replace' : 'merge';

  try {
    const result = await appApi.importData(mode);
    if (!result || result.canceled) {
      return;
    }

    clearSelection();
    clearUndoSnapshot();
    await loadAllItems();

    const counts = result.counts || {};
    showSuccess(
      `Importacao (${mode}) concluida: ${counts.movies || 0} filmes, ${counts.series || 0} series, ${counts.seasons || 0} temporadas e ${counts.episodes || 0} episodios.`
    );
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    showError(getErrorMessage(error, 'Erro ao importar dados.'));
  }
}

async function handleCreateBackup() {
  try {
    const result = await appApi.createBackup();
    if (!result?.filePath) {
      showError('Nao foi possivel gerar backup.');
      return;
    }
    showSuccess(`Backup criado em: ${result.filePath}`);
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    showError(getErrorMessage(error, 'Erro ao criar backup.'));
  }
}

async function handleRestoreBackup() {
  const confirmed = window.confirm('Restaurar backup substitui toda a base atual. Deseja continuar?');
  if (!confirmed) {
    return;
  }

  try {
    const result = await appApi.restoreBackup();
    if (!result || result.canceled) {
      return;
    }

    clearSelection();
    clearUndoSnapshot();
    await loadAllItems();

    const counts = result.counts || {};
    showSuccess(
      `Backup restaurado: ${counts.movies || 0} filmes, ${counts.series || 0} series, ${counts.seasons || 0} temporadas e ${counts.episodes || 0} episodios.`
    );
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    showError(getErrorMessage(error, 'Erro ao restaurar backup.'));
  }
}

function showSuccess(message) {
  showToast(message, 'success', 3200);
}

function showError(message) {
  showToast(message, 'error', 5000);
}

function showToast(message, type, duration) {
  const stack = getById('toastStack');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.textContent = String(message);

  stack.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 180);
  }, duration);
}

function getErrorMessage(error, fallback) {
  const message = error && typeof error.message === 'string' ? error.message.trim() : '';
  if (!message) {
    return fallback;
  }
  return message.length > 220 ? `${message.slice(0, 220)}...` : message;
}

function avg(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function splitDelimited(value) {
  if (!value) {
    return [];
  }
  const values = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(values));
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeStatus(status) {
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
  return STATUS_LABELS[normalized] ? normalized : 'watchlist';
}

function formatStatusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)] || STATUS_LABELS.watchlist;
}

function formatRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return '--';
  }
  return (Math.round(parsed * 10) / 10).toFixed(1);
}

function formatDate(value) {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(parsed);
}

function toDateTimeLocal(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}
