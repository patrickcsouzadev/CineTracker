const { contextBridge, ipcRenderer } = require('electron');

const api = {
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  selectImage: () => ipcRenderer.invoke('select-image'),
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
    deleteSeason: (id) => ipcRenderer.invoke('db-delete-season', id)
  }
};

contextBridge.exposeInMainWorld('cineTracker', Object.freeze(api));
