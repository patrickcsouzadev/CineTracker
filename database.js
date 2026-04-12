const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SAFE_POSTER_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

class AppDatabase {
  constructor() {
    const dbDir = path.join(__dirname, 'data');
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

    this.db.exec(createMoviesTable);
    this.db.exec(createSeriesTable);
    this.db.exec(createSeasonsTable);
    console.log('Tabelas verificadas/criadas com sucesso.');
  }

  createIndexes() {
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_series_created_at ON series(created_at DESC)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_seasons_series_id ON seasons(series_id)');
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

  normalizeMovieOrSeries(movieData) {
    return {
      title: this.sanitizeText(movieData.title, { required: true, maxLength: 200 }),
      synopsis: this.sanitizeText(movieData.synopsis, { required: false, maxLength: 4000 }),
      user_rating: this.sanitizeRating(movieData.user_rating),
      imdb_rating: this.sanitizeRating(movieData.imdb_rating),
      poster_path: this.sanitizePosterPath(movieData.poster_path),
      imdb_id: this.sanitizeImdbId(movieData.imdb_id)
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

  addMovie(movieData) {
    const normalized = this.normalizeMovieOrSeries(movieData);
    const stmt = this.db.prepare(`
      INSERT INTO movies (title, synopsis, user_rating, imdb_rating, poster_path, imdb_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id
    );
    return info.lastInsertRowid;
  }

  addSeries(seriesData) {
    const normalized = this.normalizeMovieOrSeries(seriesData);
    const stmt = this.db.prepare(`
      INSERT INTO series (title, synopsis, user_rating, imdb_rating, poster_path, imdb_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id
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
      SET title = ?, synopsis = ?, user_rating = ?, imdb_rating = ?, poster_path = ?, imdb_id = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id,
      normalizedId
    );
    return info.changes;
  }

  updateSeries(id, seriesData) {
    const normalizedId = this.sanitizeId(id);
    const normalized = this.normalizeMovieOrSeries(seriesData);
    const stmt = this.db.prepare(`
      UPDATE series
      SET title = ?, synopsis = ?, user_rating = ?, imdb_rating = ?, poster_path = ?, imdb_id = ?
      WHERE id = ?
    `);
    const info = stmt.run(
      normalized.title,
      normalized.synopsis,
      normalized.user_rating,
      normalized.imdb_rating,
      normalized.poster_path,
      normalized.imdb_id,
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

  close() {
    if (this.db) {
      this.db.close();
      console.log('Conexao com o banco de dados fechada.');
    }
  }
}

module.exports = AppDatabase;
