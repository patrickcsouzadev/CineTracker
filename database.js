const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class AppDatabase {
  constructor() {
    const dbDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'movies_series.db');
    
    this.db = new Database(dbPath, { verbose: console.log });
    console.log('Conectado ao banco SQLite com better-sqlite3');
  }

  init() {
    this.createTables();
  }

  createTables() {
    const createMoviesTable = `
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        synopsis TEXT,
        user_rating REAL,
        imdb_rating REAL,
        poster_path TEXT,
        imdb_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;
    const createSeriesTable = `
      CREATE TABLE IF NOT EXISTS series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        synopsis TEXT,
        user_rating REAL,
        imdb_rating REAL,
        poster_path TEXT,
        imdb_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;
    const createSeasonsTable = `
      CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER,
        season_number INTEGER,
        watched BOOLEAN DEFAULT FALSE,
        comment TEXT,
        user_rating REAL,
        FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE
      )`;

    this.db.exec(createMoviesTable);
    this.db.exec(createSeriesTable);
    this.db.exec(createSeasonsTable);
    console.log('Tabelas verificadas/criadas com sucesso.');
  }


  addMovie(movieData) {
    const { title, synopsis, user_rating, imdb_rating, poster_path, imdb_id } = movieData;
    const stmt = this.db.prepare(`
      INSERT INTO movies (title, synopsis, user_rating, imdb_rating, poster_path, imdb_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(title, synopsis, user_rating, imdb_rating, poster_path, imdb_id);
    return info.lastInsertRowid;
  }

  addSeries(seriesData) {
    const { title, synopsis, user_rating, imdb_rating, poster_path, imdb_id } = seriesData;
    const stmt = this.db.prepare(`
      INSERT INTO series (title, synopsis, user_rating, imdb_rating, poster_path, imdb_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(title, synopsis, user_rating, imdb_rating, poster_path, imdb_id);
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
    const { title, synopsis, user_rating, imdb_rating, poster_path, imdb_id } = movieData;
    const stmt = this.db.prepare(`
      UPDATE movies SET title = ?, synopsis = ?, user_rating = ?, imdb_rating = ?, poster_path = ?, imdb_id = ? 
      WHERE id = ?
    `);
    const info = stmt.run(title, synopsis, user_rating, imdb_rating, poster_path, imdb_id, id);
    return info.changes;
  }

  updateSeries(id, seriesData) {
    const { title, synopsis, user_rating, imdb_rating, poster_path, imdb_id } = seriesData;
    const stmt = this.db.prepare(`
      UPDATE series SET title = ?, synopsis = ?, user_rating = ?, imdb_rating = ?, poster_path = ?, imdb_id = ? 
      WHERE id = ?
    `);
    const info = stmt.run(title, synopsis, user_rating, imdb_rating, poster_path, imdb_id, id);
    return info.changes;
  }

  deleteMovie(id) {
    const stmt = this.db.prepare('DELETE FROM movies WHERE id = ?');
    const info = stmt.run(id);
    return info.changes;
  }

  deleteSeries(id) {
    const stmt = this.db.prepare('DELETE FROM series WHERE id = ?');
    const info = stmt.run(id);
    return info.changes;
  }

  addSeason(seasonData) {
    const { series_id, season_number, watched, comment, user_rating } = seasonData;
    const stmt = this.db.prepare(`
      INSERT INTO seasons (series_id, season_number, watched, comment, user_rating) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(series_id, season_number, watched ? 1 : 0, comment, user_rating);
    return info.lastInsertRowid;
  }

  getSeasons(seriesId) {
    const stmt = this.db.prepare('SELECT * FROM seasons WHERE series_id = ? ORDER BY season_number');
    const seasons = stmt.all(seriesId);
    return seasons.map(s => ({ ...s, watched: s.watched === 1 }));
  }

  updateSeason(id, seasonData) {
    const { season_number, watched, comment, user_rating } = seasonData;
    const stmt = this.db.prepare(`
      UPDATE seasons SET season_number = ?, watched = ?, comment = ?, user_rating = ? 
      WHERE id = ?
    `);
    const info = stmt.run(season_number, watched ? 1 : 0, comment, user_rating, id);
    return info.changes;
  }

  deleteSeason(id) {
    const stmt = this.db.prepare('DELETE FROM seasons WHERE id = ?');
    const info = stmt.run(id);
    return info.changes;
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('Conexão com o banco de dados fechada.');
    }
  }
}

module.exports = AppDatabase;