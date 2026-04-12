const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const AppDatabase = require('./database');

const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const TRUSTED_INDEX_URL = pathToFileURL(path.join(__dirname, 'index.html')).toString();
const SAFE_POSTER_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp']);
const EXTENSION_TO_TYPE = Object.freeze({
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.gif': 'gif',
  '.bmp': 'bmp'
});

let mainWindow;
let db;

function detectImageTypeBySignature(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (buffer.length >= 6) {
    const gifHeader = buffer.slice(0, 6).toString('ascii');
    if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
      return 'gif';
    }
  }

  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'bmp';
  }

  return null;
}

function assertTrustedSender(event) {
  const senderUrl = event?.senderFrame?.url;
  if (senderUrl !== TRUSTED_INDEX_URL) {
    throw new Error('Origem IPC nao autorizada.');
  }
}

function sanitizePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} invalido.`);
  }
  return parsed;
}

function sanitizeNullableRating(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
    throw new Error(`${fieldName} invalido. Use um valor entre 0 e 10.`);
  }

  return Math.round(parsed * 10) / 10;
}

function sanitizeText(value, fieldName, options = {}) {
  const { required = false, maxLength = 1024 } = options;

  if (value === null || value === undefined) {
    if (required) {
      throw new Error(`${fieldName} e obrigatorio.`);
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} invalido.`);
  }

  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new Error(`${fieldName} e obrigatorio.`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} excede o limite de ${maxLength} caracteres.`);
  }

  if (!required && trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

function sanitizePosterPath(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error('poster_path invalido.');
  }

  const normalized = path.basename(value.trim());
  if (normalized.length === 0 || normalized.length > 255 || !SAFE_POSTER_FILENAME_REGEX.test(normalized)) {
    throw new Error('poster_path invalido.');
  }

  return normalized;
}

function sanitizeImdbId(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error('imdb_id invalido.');
  }

  const normalized = value.trim();
  if (!/^tt\d{7,10}$/i.test(normalized)) {
    throw new Error('imdb_id invalido.');
  }

  return normalized.toLowerCase();
}

function sanitizeMovieOrSeriesPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload invalido.');
  }

  return {
    title: sanitizeText(payload.title, 'Titulo', { required: true, maxLength: 200 }),
    synopsis: sanitizeText(payload.synopsis, 'Sinopse', { required: false, maxLength: 4000 }),
    user_rating: sanitizeNullableRating(payload.user_rating, 'Nota do usuario'),
    imdb_rating: sanitizeNullableRating(payload.imdb_rating, 'Nota IMDb'),
    poster_path: sanitizePosterPath(payload.poster_path),
    imdb_id: sanitizeImdbId(payload.imdb_id)
  };
}

function sanitizeSeasonPayload(payload, requireSeriesId) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload invalido.');
  }

  return {
    series_id: requireSeriesId ? sanitizePositiveInt(payload.series_id, 'series_id') : payload.series_id,
    season_number: sanitizePositiveInt(payload.season_number, 'season_number'),
    watched: Boolean(payload.watched),
    comment: sanitizeText(payload.comment, 'Comentario', { required: false, maxLength: 2000 }),
    user_rating: sanitizeNullableRating(payload.user_rating, 'Nota da temporada')
  };
}

async function securelyCopySelectedImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error('Formato de imagem nao permitido.');
  }

  const stats = await fs.promises.stat(filePath);
  if (!stats.isFile()) {
    throw new Error('O item selecionado nao e um arquivo valido.');
  }

  if (stats.size <= 0 || stats.size > MAX_POSTER_SIZE_BYTES) {
    throw new Error('Imagem invalida. O tamanho maximo permitido e 5MB.');
  }

  const handle = await fs.promises.open(filePath, 'r');
  let header;
  try {
    header = Buffer.alloc(12);
    await handle.read(header, 0, header.length, 0);
  } finally {
    await handle.close();
  }

  const detectedType = detectImageTypeBySignature(header);
  const expectedType = EXTENSION_TO_TYPE[ext];
  if (!detectedType || detectedType !== expectedType) {
    throw new Error('Assinatura do arquivo nao corresponde a uma imagem valida.');
  }

  const postersDir = path.join(__dirname, 'posters');
  await fs.promises.mkdir(postersDir, { recursive: true });

  const extension = ext === '.jpeg' ? '.jpg' : ext;
  const outputName = `poster_${Date.now()}_${crypto.randomUUID()}${extension}`;
  const outputPath = path.join(postersDir, outputName);

  await fs.promises.copyFile(filePath, outputPath);
  return outputName;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Movie & Series Tracker'
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== TRUSTED_INDEX_URL) {
      event.preventDefault();
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function registerSecureIpcHandlers() {
  const register = (channel, handler) => {
    ipcMain.handle(channel, async (event, ...args) => {
      assertTrustedSender(event);
      return handler(...args);
    });
  };

  register('get-app-config', async () => ({
    omdbApiKey: process.env.OMDB_API_KEY || ''
  }));

  register('db-add-movie', async (movieData) => db.addMovie(sanitizeMovieOrSeriesPayload(movieData)));
  register('db-add-series', async (seriesData) => db.addSeries(sanitizeMovieOrSeriesPayload(seriesData)));
  register('db-get-all-movies', async () => db.getAllMovies());
  register('db-get-all-series', async () => db.getAllSeries());
  register('db-update-movie', async (id, movieData) =>
    db.updateMovie(sanitizePositiveInt(id, 'id'), sanitizeMovieOrSeriesPayload(movieData))
  );
  register('db-update-series', async (id, seriesData) =>
    db.updateSeries(sanitizePositiveInt(id, 'id'), sanitizeMovieOrSeriesPayload(seriesData))
  );
  register('db-delete-movie', async (id) => db.deleteMovie(sanitizePositiveInt(id, 'id')));
  register('db-delete-series', async (id) => db.deleteSeries(sanitizePositiveInt(id, 'id')));
  register('db-add-season', async (seasonData) => db.addSeason(sanitizeSeasonPayload(seasonData, true)));
  register('db-get-seasons', async (seriesId) => db.getSeasons(sanitizePositiveInt(seriesId, 'series_id')));
  register('db-update-season', async (id, seasonData) =>
    db.updateSeason(sanitizePositiveInt(id, 'id'), sanitizeSeasonPayload(seasonData, false))
  );
  register('db-delete-season', async (id) => db.deleteSeason(sanitizePositiveInt(id, 'id')));

  register('select-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return securelyCopySelectedImage(result.filePaths[0]);
  });
}

app.whenReady().then(async () => {
  try {
    db = new AppDatabase();
    db.init();
  } catch (error) {
    console.error('Falha critica ao inicializar o banco de dados:', error);
    app.quit();
    return;
  }

  registerSecureIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
