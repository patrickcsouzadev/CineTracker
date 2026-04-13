const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SAFE_POSTER_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const ALLOWED_STATUS = new Set(['watchlist', 'watching', 'completed', 'paused', 'dropped', 'rewatch']);

class AppDatabase {
  constructor(storageRoot = __dirname) {
    const dbDir = path.join(storageRoot, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'movies_series.db');
    this.db = new Database(dbPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    console.log('Conectado ao banco SQLite com better-sqlite3');
  }

  init() {
    this.createTables();
    this.applyMigrations();
    this.createIndexes();
  }

  createTables() {
    const createMoviesTable = `
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 200),
        synopsis TEXT CHECK (synopsis IS NULL OR length(synopsis) <= 4000),
        user_rating REAL CHECK (user_rating IS NULL OR (user_rating >= 0 AND user_rating <= 10)),
        imdb_rating REAL CHECK (imdb_rating IS NULL OR (imdb_rating >= 0 AND imdb_rating <= 10)),
        poster_path TEXT CHECK (poster_path IS NULL OR length(poster_path) <= 255),
        imdb_id TEXT CHECK (imdb_id IS NULL OR imdb_id GLOB 'tt[0-9]*'),
        year INTEGER CHECK (year IS NULL OR (year >= 1888 AND year <= 2100)),
        genre TEXT CHECK (genre IS NULL OR length(genre) <= 500),
        runtime TEXT CHECK (runtime IS NULL OR length(runtime) <= 100),
        director TEXT CHECK (director IS NULL OR length(director) <= 300),
        actors TEXT CHECK (actors IS NULL OR length(actors) <= 500),
        status TEXT NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watching', 'completed', 'paused', 'dropped', 'rewatch')),
        tags TEXT CHECK (tags IS NULL OR length(tags) <= 1000),
        collections TEXT CHECK (collections IS NULL OR length(collections) <= 1000),
        last_watched_at TEXT,
        reminder_at TEXT,
        reminder_sent INTEGER NOT NULL DEFAULT 0 CHECK (reminder_sent IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;

    const createSeriesTable = `
      CREATE TABLE IF NOT EXISTS series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 200),
        synopsis TEXT CHECK (synopsis IS NULL OR length(synopsis) <= 4000),
        user_rating REAL CHECK (user_rating IS NULL OR (user_rating >= 0 AND user_rating <= 10)),
        imdb_rating REAL CHECK (imdb_rating IS NULL OR (imdb_rating >= 0 AND imdb_rating <= 10)),
        poster_path TEXT CHECK (poster_path IS NULL OR length(poster_path) <= 255),
        imdb_id TEXT CHECK (imdb_id IS NULL OR imdb_id GLOB 'tt[0-9]*'),
        year INTEGER CHECK (year IS NULL OR (year >= 1888 AND year <= 2100)),
        genre TEXT CHECK (genre IS NULL OR length(genre) <= 500),
        runtime TEXT CHECK (runtime IS NULL OR length(runtime) <= 100),
        director TEXT CHECK (director IS NULL OR length(director) <= 300),
        actors TEXT CHECK (actors IS NULL OR length(actors) <= 500),
        status TEXT NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watching', 'completed', 'paused', 'dropped', 'rewatch')),
        tags TEXT CHECK (tags IS NULL OR length(tags) <= 1000),
        collections TEXT CHECK (collections IS NULL OR length(collections) <= 1000),
        last_watched_at TEXT,
        reminder_at TEXT,
        reminder_sent INTEGER NOT NULL DEFAULT 0 CHECK (reminder_sent IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;

    const createSeasonsTable = `
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        season_number INTEGER NOT NULL CHECK (season_number > 0),
        watched INTEGER NOT NULL DEFAULT 0 CHECK (watched IN (0, 1)),
        comment TEXT CHECK (comment IS NULL OR length(comment) <= 2000),
        user_rating REAL CHECK (user_rating IS NULL OR (user_rating >= 0 AND user_rating <= 10)),
        FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE,
        UNIQUE(series_id, season_number)
      )`;

    const createEpisodesTable = `
      CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        season_number INTEGER NOT NULL CHECK (season_number > 0),
        episode_number INTEGER NOT NULL CHECK (episode_number > 0),
        title TEXT CHECK (title IS NULL OR length(title) <= 300),
        watched INTEGER NOT NULL DEFAULT 0 CHECK (watched IN (0, 1)),
        user_rating REAL CHECK (user_rating IS NULL OR (user_rating >= 0 AND user_rating <= 10)),
        watched_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE,
        UNIQUE(series_id, season_number, episode_number)
      )`;

    this.db.exec(createMoviesTable);
    this.db.exec(createSeriesTable);
    this.db.exec(createSeasonsTable);
    this.db.exec(createEpisodesTable);
    console.log('Tabelas verificadas/criadas com sucesso.');
  }

  applyMigrations() {
    this.ensureColumn('movies', 'year', "INTEGER CHECK (year IS NULL OR (year >= 1888 AND year <= 2100))");
    this.ensureColumn('movies', 'genre', "TEXT CHECK (genre IS NULL OR length(genre) <= 500)");
    this.ensureColumn('movies', 'runtime', "TEXT CHECK (runtime IS NULL OR length(runtime) <= 100)");
    this.ensureColumn('movies', 'director', "TEXT CHECK (director IS NULL OR length(director) <= 300)");
    this.ensureColumn('movies', 'actors', "TEXT CHECK (actors IS NULL OR length(actors) <= 500)");
    this.ensureColumn('movies', 'status', "TEXT NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watching', 'completed', 'paused', 'dropped', 'rewatch'))");
    this.ensureColumn('movies', 'tags', "TEXT CHECK (tags IS NULL OR length(tags) <= 1000)");
    this.ensureColumn('movies', 'collections', "TEXT CHECK (collections IS NULL OR length(collections) <= 1000)");
    this.ensureColumn('movies', 'last_watched_at', 'TEXT');
    this.ensureColumn('movies', 'reminder_at', 'TEXT');
    this.ensureColumn('movies', 'reminder_sent', 'INTEGER NOT NULL DEFAULT 0 CHECK (reminder_sent IN (0, 1))');

    this.ensureColumn('series', 'year', "INTEGER CHECK (year IS NULL OR (year >= 1888 AND year <= 2100))");
    this.ensureColumn('series', 'genre', "TEXT CHECK (genre IS NULL OR length(genre) <= 500)");
    this.ensureColumn('series', 'runtime', "TEXT CHECK (runtime IS NULL OR length(runtime) <= 100)");
    this.ensureColumn('series', 'director', "TEXT CHECK (director IS NULL OR length(director) <= 300)");
    this.ensureColumn('series', 'actors', "TEXT CHECK (actors IS NULL OR length(actors) <= 500)");
    this.ensureColumn('series', 'status', "TEXT NOT NULL DEFAULT 'watchlist' CHECK (status IN ('watchlist', 'watching', 'completed', 'paused', 'dropped', 'rewatch'))");
    this.ensureColumn('series', 'tags', "TEXT CHECK (tags IS NULL OR length(tags) <= 1000)");
    this.ensureColumn('series', 'collections', "TEXT CHECK (collections IS NULL OR length(collections) <= 1000)");
    this.ensureColumn('series', 'last_watched_at', 'TEXT');
    this.ensureColumn('series', 'reminder_at', 'TEXT');
    this.ensureColumn('series', 'reminder_sent', 'INTEGER NOT NULL DEFAULT 0 CHECK (reminder_sent IN (0, 1))');
  }

  ensureColumn(tableName, columnName, columnDefinition) {
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = columns.some((column) => column.name === columnName);
    if (!exists) {
      this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    }
  }

  createIndexes() {
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_series_created_at ON series(created_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_series_status ON series(status)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_movies_reminder ON movies(reminder_at, reminder_sent)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_series_reminder ON series(reminder_at, reminder_sent)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_seasons_series_id ON seasons(series_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_episodes_series_id ON episodes(series_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_episodes_season ON episodes(series_id, season_number)');
  }

  sanitizeId(id) {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('ID invalido.');
    }
    return parsed;
  }

  sanitizeText(value, options = {}) {
    const { required = false, maxLength = 1024 } = options;

    if (value === null || value === undefined) {
      if (required) {
        throw new Error('Campo obrigatorio ausente.');
      }
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error('Campo de texto invalido.');
    }

    const trimmed = value.trim();
    if (required && trimmed.length === 0) {
      throw new Error('Campo obrigatorio vazio.');
    }

    if (trimmed.length > maxLength) {
      throw new Error(`Campo excede o limite de ${maxLength} caracteres.`);
    }

    if (!required && trimmed.length === 0) {
      return null;
    }

    return trimmed;
  }

  sanitizeRating(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
      throw new Error('Nota invalida. Use um valor entre 0 e 10.');
    }

    return Math.round(parsed * 10) / 10;
  }

  sanitizeYear(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1888 || parsed > 2100) {
      throw new Error('Ano invalido.');
    }

    return parsed;
  }

  sanitizePosterPath(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error('Poster invalido.');
    }

    const normalized = path.basename(value.trim());
    if (normalized.length === 0 || normalized.length > 255 || !SAFE_POSTER_FILENAME_REGEX.test(normalized)) {
      throw new Error('Poster invalido.');
    }

    return normalized;
  }

  sanitizeImdbId(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error('IMDb ID invalido.');
    }

    const normalized = value.trim();
    if (!/^tt\d{7,10}$/i.test(normalized)) {
      throw new Error('IMDb ID invalido.');
    }

    return normalized.toLowerCase();
  }

  sanitizeStatus(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!normalized) {
      return 'watchlist';
    }

    if (!ALLOWED_STATUS.has(normalized)) {
      throw new Error('Status invalido.');
    }

    return normalized;
  }

  sanitizeDateTime(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Data invalida.');
    }

    return parsed.toISOString();
  }

  sanitizeReminderSent(value) {
    return value ? 1 : 0;
  }

  sanitizeDelimitedList(value, maxLength = 1000) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const raw = Array.isArray(value)
      ? value.map((entry) => String(entry || '').trim())
      : String(value)
          .split(',')
          .map((entry) => entry.trim());

    const deduped = Array.from(new Set(raw.filter(Boolean)));
    if (deduped.length === 0) {
      return null;
    }

    const joined = deduped.join(', ');
    if (joined.length > maxLength) {
      throw new Error('Lista excede o limite permitido.');
    }

    return joined;
  }

  normalizeMovieOrSeries(movieData) {
    return {
      title: this.sanitizeText(movieData.title, { required: true, maxLength: 200 }),
      synopsis: this.sanitizeText(movieData.synopsis, { required: false, maxLength: 4000 }),
      user_rating: this.sanitizeRating(movieData.user_rating),
      imdb_rating: this.sanitizeRating(movieData.imdb_rating),
      poster_path: this.sanitizePosterPath(movieData.poster_path),
      imdb_id: this.sanitizeImdbId(movieData.imdb_id),
      year: this.sanitizeYear(movieData.year),
      genre: this.sanitizeText(movieData.genre, { required: false, maxLength: 500 }),
      runtime: this.sanitizeText(movieData.runtime, { required: false, maxLength: 100 }),
      director: this.sanitizeText(movieData.director, { required: false, maxLength: 300 }),
      actors: this.sanitizeText(movieData.actors, { required: false, maxLength: 500 }),
      status: this.sanitizeStatus(movieData.status),
      tags: this.sanitizeDelimitedList(movieData.tags, 1000),
      collections: this.sanitizeDelimitedList(movieData.collections, 1000),
      last_watched_at: this.sanitizeDateTime(movieData.last_watched_at),
      reminder_at: this.sanitizeDateTime(movieData.reminder_at),
      reminder_sent: this.sanitizeReminderSent(movieData.reminder_sent),
      created_at: this.sanitizeDateTime(movieData.created_at)
    };
  }

  normalizeSeason(seasonData, requireSeriesId = false) {
    return {
      series_id: requireSeriesId ? this.sanitizeId(seasonData.series_id) : seasonData.series_id,
      season_number: this.sanitizeId(seasonData.season_number),
      watched: seasonData.watched ? 1 : 0,
      comment: this.sanitizeText(seasonData.comment, { required: false, maxLength: 2000 }),
      user_rating: this.sanitizeRating(seasonData.user_rating)
    };
  }

  normalizeEpisode(episodeData, requireSeriesId = false) {
    return {
      id: episodeData.id ? this.sanitizeId(episodeData.id) : null,
      series_id: requireSeriesId ? this.sanitizeId(episodeData.series_id) : episodeData.series_id,
      season_number: this.sanitizeId(episodeData.season_number),
      episode_number: this.sanitizeId(episodeData.episode_number),
      title: this.sanitizeText(episodeData.title, { required: false, maxLength: 300 }),
      watched: episodeData.watched ? 1 : 0,
      user_rating: this.sanitizeRating(episodeData.user_rating),
      watched_at: this.sanitizeDateTime(episodeData.watched_at)
    };
  }

  addMovie(movieData) {
    const normalized = this.normalizeMovieOrSeries(movieData);
    const stmt = this.db.prepare(`
      INSERT INTO movies (
        title, synopsis, user_rating, imdb_rating, poster_path, imdb_id,
        year, genre, runtime, director, actors, status, tags, collections,
        last_watched_at, reminder_at, reminder_sent, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id,
      normalized.year,
      normalized.genre,
      normalized.runtime,
      normalized.director,
      normalized.actors,
      normalized.status,
      normalized.tags,
      normalized.collections,
      normalized.last_watched_at,
      normalized.reminder_at,
      normalized.reminder_sent,
      normalized.created_at
    );
    return info.lastInsertRowid;
  }

  addSeries(seriesData) {
    const normalized = this.normalizeMovieOrSeries(seriesData);
    const stmt = this.db.prepare(`
      INSERT INTO series (
        title, synopsis, user_rating, imdb_rating, poster_path, imdb_id,
        year, genre, runtime, director, actors, status, tags, collections,
        last_watched_at, reminder_at, reminder_sent, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id,
      normalized.year,
      normalized.genre,
      normalized.runtime,
      normalized.director,
      normalized.actors,
      normalized.status,
      normalized.tags,
      normalized.collections,
      normalized.last_watched_at,
      normalized.reminder_at,
      normalized.reminder_sent,
      normalized.created_at
    );
    return info.lastInsertRowid;
  }

  getAllMovies() {
    const stmt = this.db.prepare('SELECT * FROM movies ORDER BY created_at DESC');
    return stmt.all();
  }

  getAllSeries() {
    const stmt = this.db.prepare('SELECT * FROM series ORDER BY created_at DESC');
    return stmt.all();
  }

  updateMovie(id, movieData) {
    const normalizedId = this.sanitizeId(id);
    const normalized = this.normalizeMovieOrSeries(movieData);
    const stmt = this.db.prepare(`
      UPDATE movies
      SET
        title = ?, synopsis = ?, user_rating = ?, imdb_rating = ?, poster_path = ?, imdb_id = ?,
        year = ?, genre = ?, runtime = ?, director = ?, actors = ?, status = ?, tags = ?, collections = ?,
        last_watched_at = ?, reminder_at = ?, reminder_sent = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id,
      normalized.year,
      normalized.genre,
      normalized.runtime,
      normalized.director,
      normalized.actors,
      normalized.status,
      normalized.tags,
      normalized.collections,
      normalized.last_watched_at,
      normalized.reminder_at,
      normalized.reminder_sent,
      normalizedId
    );
    return info.changes;
  }

  updateSeries(id, seriesData) {
    const normalizedId = this.sanitizeId(id);
    const normalized = this.normalizeMovieOrSeries(seriesData);
    const stmt = this.db.prepare(`
      UPDATE series
      SET
        title = ?, synopsis = ?, user_rating = ?, imdb_rating = ?, poster_path = ?, imdb_id = ?,
        year = ?, genre = ?, runtime = ?, director = ?, actors = ?, status = ?, tags = ?, collections = ?,
        last_watched_at = ?, reminder_at = ?, reminder_sent = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id,
      normalized.year,
      normalized.genre,
      normalized.runtime,
      normalized.director,
      normalized.actors,
      normalized.status,
      normalized.tags,
      normalized.collections,
      normalized.last_watched_at,
      normalized.reminder_at,
      normalized.reminder_sent,
      normalizedId
    );
    return info.changes;
  }

  deleteMovie(id) {
    const normalizedId = this.sanitizeId(id);
    const stmt = this.db.prepare('DELETE FROM movies WHERE id = ?');
    const info = stmt.run(normalizedId);
    return info.changes;
  }

  deleteSeries(id) {
    const normalizedId = this.sanitizeId(id);
    const stmt = this.db.prepare('DELETE FROM series WHERE id = ?');
    const info = stmt.run(normalizedId);
    return info.changes;
  }

  addSeason(seasonData) {
    const normalized = this.normalizeSeason(seasonData, true);
    const stmt = this.db.prepare(`
      INSERT INTO seasons (series_id, season_number, watched, comment, user_rating)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      normalized.series_id,
      normalized.season_number,
      normalized.watched,
      normalized.comment,
      normalized.user_rating
    );
    return info.lastInsertRowid;
  }

  getSeasons(seriesId) {
    const normalizedSeriesId = this.sanitizeId(seriesId);
    const stmt = this.db.prepare('SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number');
    const seasons = stmt.all(normalizedSeriesId);
    return seasons.map((season) => ({
      ...season,
      watched: season.watched === 1
    }));
  }

  getAllSeasons() {
    const stmt = this.db.prepare('SELECT * FROM seasons ORDER BY series_id, season_number');
    const seasons = stmt.all();
    return seasons.map((season) => ({
      ...season,
      watched: season.watched === 1
    }));
  }

  updateSeason(id, seasonData) {
    const normalizedId = this.sanitizeId(id);
    const normalized = this.normalizeSeason(seasonData, false);
    const stmt = this.db.prepare(`
      UPDATE seasons
      SET season_number = ?, watched = ?, comment = ?, user_rating = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      normalized.season_number,
      normalized.watched,
      normalized.comment,
      normalized.user_rating,
      normalizedId
    );
    return info.changes;
  }

  deleteSeason(id) {
    const normalizedId = this.sanitizeId(id);
    const stmt = this.db.prepare('DELETE FROM seasons WHERE id = ?');
    const info = stmt.run(normalizedId);
    return info.changes;
  }

  addEpisode(episodeData) {
    const normalized = this.normalizeEpisode(episodeData, true);
    const stmt = this.db.prepare(`
      INSERT INTO episodes (series_id, season_number, episode_number, title, watched, user_rating, watched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      normalized.series_id,
      normalized.season_number,
      normalized.episode_number,
      normalized.title,
      normalized.watched,
      normalized.user_rating,
      normalized.watched_at
    );
    return info.lastInsertRowid;
  }

  getEpisodes(seriesId) {
    const normalizedSeriesId = this.sanitizeId(seriesId);
    const stmt = this.db.prepare('SELECT * FROM episodes WHERE series_id = ? ORDER BY season_number, episode_number');
    const episodes = stmt.all(normalizedSeriesId);
    return episodes.map((episode) => ({
      ...episode,
      watched: episode.watched === 1
    }));
  }

  getAllEpisodes() {
    const stmt = this.db.prepare('SELECT * FROM episodes ORDER BY series_id, season_number, episode_number');
    const episodes = stmt.all();
    return episodes.map((episode) => ({
      ...episode,
      watched: episode.watched === 1
    }));
  }

  updateEpisode(id, episodeData) {
    const normalizedId = this.sanitizeId(id);
    const normalized = this.normalizeEpisode(episodeData, false);
    const stmt = this.db.prepare(`
      UPDATE episodes
      SET season_number = ?, episode_number = ?, title = ?, watched = ?, user_rating = ?, watched_at = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      normalized.season_number,
      normalized.episode_number,
      normalized.title,
      normalized.watched,
      normalized.user_rating,
      normalized.watched_at,
      normalizedId
    );
    return info.changes;
  }

  deleteEpisode(id) {
    const normalizedId = this.sanitizeId(id);
    const stmt = this.db.prepare('DELETE FROM episodes WHERE id = ?');
    const info = stmt.run(normalizedId);
    return info.changes;
  }

  deleteEpisodesBySeries(seriesId) {
    const normalizedSeriesId = this.sanitizeId(seriesId);
    const stmt = this.db.prepare('DELETE FROM episodes WHERE series_id = ?');
    const info = stmt.run(normalizedSeriesId);
    return info.changes;
  }

  updateItemStatus(type, id, status, lastWatchedAt = null) {
    const normalizedId = this.sanitizeId(id);
    const normalizedStatus = this.sanitizeStatus(status);
    const normalizedDate = this.sanitizeDateTime(lastWatchedAt);

    if (type === 'movie') {
      const stmt = this.db.prepare('UPDATE movies SET status = ?, last_watched_at = ? WHERE id = ?');
      return stmt.run(normalizedStatus, normalizedDate, normalizedId).changes;
    }

    if (type === 'series') {
      const stmt = this.db.prepare('UPDATE series SET status = ?, last_watched_at = ? WHERE id = ?');
      return stmt.run(normalizedStatus, normalizedDate, normalizedId).changes;
    }

    throw new Error('Tipo de item invalido.');
  }

  getDueReminders(nowIso) {
    const now = this.sanitizeDateTime(nowIso);
    const stmt = this.db.prepare(`
      SELECT 'movie' AS type, id, title, reminder_at
      FROM movies
      WHERE reminder_at IS NOT NULL AND reminder_sent = 0 AND reminder_at <= ?
      UNION ALL
      SELECT 'series' AS type, id, title, reminder_at
      FROM series
      WHERE reminder_at IS NOT NULL AND reminder_sent = 0 AND reminder_at <= ?
      ORDER BY reminder_at ASC
    `);
    return stmt.all(now, now);
  }

  markReminderSent(type, id) {
    const normalizedId = this.sanitizeId(id);

    if (type === 'movie') {
      this.db.prepare('UPDATE movies SET reminder_sent = 1 WHERE id = ?').run(normalizedId);
      return;
    }

    if (type === 'series') {
      this.db.prepare('UPDATE series SET reminder_sent = 1 WHERE id = ?').run(normalizedId);
      return;
    }

    throw new Error('Tipo de item invalido.');
  }

  exportData() {
    return {
      version: 2,
      exported_at: new Date().toISOString(),
      movies: this.getAllMovies(),
      series: this.getAllSeries(),
      seasons: this.getAllSeasons(),
      episodes: this.getAllEpisodes()
    };
  }

  clearAll() {
    this.db.exec('DELETE FROM episodes');
    this.db.exec('DELETE FROM seasons');
    this.db.exec('DELETE FROM movies');
    this.db.exec('DELETE FROM series');
  }

  importData(data, mode = 'merge') {
    if (!data || typeof data !== 'object') {
      throw new Error('Arquivo de importacao invalido.');
    }

    const movies = Array.isArray(data.movies) ? data.movies : [];
    const series = Array.isArray(data.series) ? data.series : [];
    const seasons = Array.isArray(data.seasons) ? data.seasons : [];
    const episodes = Array.isArray(data.episodes) ? data.episodes : [];

    const transaction = this.db.transaction(() => {
      if (mode === 'replace') {
        this.clearAll();
      }

      let importedMovies = 0;
      let importedSeries = 0;
      let importedSeasons = 0;
      let importedEpisodes = 0;

      const oldSeriesToNewId = new Map();

      for (const movie of movies) {
        try {
          this.addMovie(movie);
          importedMovies += 1;
        } catch {
          // Ignora registros invalidos durante importacao.
        }
      }

      for (const seriesItem of series) {
        try {
          const oldSeriesId = Number(seriesItem.id);
          const newSeriesId = Number(this.addSeries(seriesItem));
          if (Number.isInteger(oldSeriesId) && Number.isInteger(newSeriesId)) {
            oldSeriesToNewId.set(oldSeriesId, newSeriesId);
          }
          importedSeries += 1;
        } catch {
          // Ignora registros invalidos durante importacao.
        }
      }

      for (const season of seasons) {
        try {
          const mappedSeriesId = oldSeriesToNewId.get(Number(season.series_id));
          if (!mappedSeriesId) {
            continue;
          }

          this.addSeason({
            series_id: mappedSeriesId,
            season_number: season.season_number,
            watched: season.watched,
            comment: season.comment,
            user_rating: season.user_rating
          });
          importedSeasons += 1;
        } catch {
          // Ignora registros invalidos durante importacao.
        }
      }

      for (const episode of episodes) {
        try {
          const mappedSeriesId = oldSeriesToNewId.get(Number(episode.series_id));
          if (!mappedSeriesId) {
            continue;
          }

          this.addEpisode({
            series_id: mappedSeriesId,
            season_number: episode.season_number,
            episode_number: episode.episode_number,
            title: episode.title,
            watched: episode.watched,
            user_rating: episode.user_rating,
            watched_at: episode.watched_at
          });
          importedEpisodes += 1;
        } catch {
          // Ignora registros invalidos durante importacao.
        }
      }

      return {
        movies: importedMovies,
        series: importedSeries,
        seasons: importedSeasons,
        episodes: importedEpisodes
      };
    });

    return transaction();
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('Conexao com o banco de dados fechada.');
    }
  }
}

module.exports = AppDatabase;