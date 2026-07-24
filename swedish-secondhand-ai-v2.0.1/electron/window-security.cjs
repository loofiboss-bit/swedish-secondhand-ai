function createWindowOptions(preloadPath) {
  return {
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  };
}

function restrictWindowNavigation(webContents, allowedUrl) {
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl !== allowedUrl) event.preventDefault();
  });
}

module.exports = { createWindowOptions, restrictWindowNavigation };
