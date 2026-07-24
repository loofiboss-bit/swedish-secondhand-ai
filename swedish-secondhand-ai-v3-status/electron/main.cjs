const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { SecretVault } = require('./security/secret-vault.cjs');
const { createDesktopServices } = require('./desktop-services.cjs');
const { registerIpcHandlers } = require('./ipc-handlers.cjs');
const { createWindowOptions, restrictWindowNavigation } = require('./window-security.cjs');

const isDev = !app.isPackaged;
const productionIndexPath = path.resolve(__dirname, '..', 'dist', 'index.html');

function createWindow() {
  const win = new BrowserWindow(createWindowOptions(path.join(__dirname, 'preload.cjs')));

  if (isDev) {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    win.loadFile(productionIndexPath);
  }

  const allowedUrl = isDev ? 'http://127.0.0.1:5173/' : pathToFileURL(productionIndexPath).href;
  restrictWindowNavigation(win.webContents, allowedUrl);
}

app.whenReady().then(() => {
  const vault = new SecretVault({ safeStorage, userDataPath: app.getPath('userData') });
  registerIpcHandlers({
    ipcMain,
    senderPolicy: { isDev, productionIndexPath },
    vault,
    services: createDesktopServices({ vault }),
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
