const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AppDatabase = require('./database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Movie & Series Tracker'
  });

  mainWindow.loadFile('index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  db = new AppDatabase();
  await db.init();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('db-add-movie', async (event, movieData) => {
  return await db.addMovie(movieData);
});

ipcMain.handle('db-add-series', async (event, seriesData) => {
  return await db.addSeries(seriesData);
});

ipcMain.handle('db-get-all-movies', async () => {
  return await db.getAllMovies();
});

ipcMain.handle('db-get-all-series', async () => {
  return await db.getAllSeries();
});

ipcMain.handle('db-update-movie', async (event, id, movieData) => {
  return await db.updateMovie(id, movieData);
});

ipcMain.handle('db-update-series', async (event, id, seriesData) => {
  return await db.updateSeries(id, seriesData);
});

ipcMain.handle('db-delete-movie', async (event, id) => {
  return await db.deleteMovie(id);
});

ipcMain.handle('db-delete-series', async (event, id) => {
  return await db.deleteSeries(id);
});

ipcMain.handle('db-add-season', async (event, seasonData) => {
  return await db.addSeason(seasonData);
});

ipcMain.handle('db-get-seasons', async (event, seriesId) => {
  return await db.getSeasons(seriesId);
});

ipcMain.handle('db-update-season', async (event, id, seasonData) => {
  return await db.updateSeason(id, seasonData);
});

ipcMain.handle('db-delete-season', async (event, id) => {
  return await db.deleteSeason(id);
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileName = path.basename(filePath);
    const destPath = path.join(__dirname, 'posters', fileName);
    
    const postersDir = path.join(__dirname, 'posters');
    if (!fs.existsSync(postersDir)) {
      fs.mkdirSync(postersDir, { recursive: true });
    }

    try {
      fs.copyFileSync(filePath, destPath);
      return fileName;
    } catch (error) {
      console.error('Erro ao copiar imagem:', error);
      return null;
    }
  }
  return null;
});