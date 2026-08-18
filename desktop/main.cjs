const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const { startServices, stopServices } = require('./runtime.cjs');

let mainWindow;
let services;
let stopping = false;

async function createWindow() {
  try {
    services = await startServices(app.getAppPath(), path.join(app.getPath('userData'), 'data'));
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 1024,
      minHeight: 700,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    await mainWindow.loadURL(`http://127.0.0.1:${services.webPort}`);
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => { mainWindow = undefined; });
  } catch (error) {
    const logFile = services?.logFile || path.join(app.getPath('userData'), 'data', 'logs', 'desktop.log');
    await dialog.showMessageBox({
      type: 'error',
      title: 'AI Brand Visibility Assistant startup failed',
      message: error.message,
      detail: `Check the startup log at:\n${logFile}`
    });
    await stopServices(services);
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async event => {
  if (stopping || !services) return;
  event.preventDefault();
  stopping = true;
  await stopServices(services);
  app.quit();
});
