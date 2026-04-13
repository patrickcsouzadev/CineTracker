const { contextBridge, ipcRenderer } = require('electron');

const api = {
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  selectImage: () => ipcRenderer.invoke('select-image'),
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (mode) => ipcRenderer.invoke('import-data', mode),
  createBackup: () => ipcRenderer.invoke('create-backup'),
  restoreBackup: () => ipcRenderer.invoke('restore-backup'),
  db: {
    addMovie: (movieData) => ipcRenderer.invoke('db-add-movie', movieData),
    addSeries: (seriesData) => ipcRenderer.invoke('db-add-series', seriesData),
    getAllMovies: () => ipcRenderer.invoke('db-get-all-movies'),
    getAllSeries: () => ipcRenderer.invoke('db-get-all-series'),
    updateMovie: (id, movieData) => ipcRenderer.invoke('db-update-movie', id, movieData),
    updateSeries: (id, seriesData) => ipcRenderer.invoke('db-update-series', id, seriesData),
    deleteMovie: (id) => ipcRenderer.invoke('db-delete-movie', id),
    deleteSeries: (id) => ipcRenderer.invoke('db-delete-series', id),
    addSeason: (seasonData) => ipcRenderer.invoke('db-add-season', seasonData),
    getSeasons: (seriesId) => ipcRenderer.invoke('db-get-seasons', seriesId),
    updateSeason: (id, seasonData) => ipcRenderer.invoke('db-update-season', id, seasonData),
    deleteSeason: (id) => ipcRenderer.invoke('db-delete-season', id),
    addEpisode: (episodeData) => ipcRenderer.invoke('db-add-episode', episodeData),
    getEpisodes: (seriesId) => ipcRenderer.invoke('db-get-episodes', seriesId),
    updateEpisode: (id, episodeData) => ipcRenderer.invoke('db-update-episode', id, episodeData),
    deleteEpisode: (id) => ipcRenderer.invoke('db-delete-episode', id),
    updateItemStatus: (type, id, status, lastWatchedAt) =>
      ipcRenderer.invoke('db-update-item-status', type, id, status, lastWatchedAt)
  }
};

contextBridge.exposeInMainWorld('cineTracker', Object.freeze(api));
