const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const { startServices, stopServices } = require('./runtime.cjs');

let mainWindow;
let services;
let stopping = false;

function getLogFile() {
  return services?.logFile || path.join(app.getPath('userData'), 'data', 'logs', 'desktop.log');
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

async function showStartupFailure(error) {
  const response = await dialog.showMessageBox({
    type: 'error',
    title: 'AI Brand Visibility Assistant startup failed',
    message: error.message,
    detail: `Check the startup log at:\n${getLogFile()}`,
    buttons: ['Retry', 'Exit'],
    defaultId: 0,
    cancelId: 1
  });
  return response.response === 0;
}

async function createWindow() {
  while (true) {
    try {
      services = await startServices(app.getAppPath(), path.join(app.getPath('userData'), 'data'));
      services.api.once('close', code => {
        if (stopping) return;
        dialog.showMessageBox({
          type: 'error',
          title: 'AI Brand Visibility Assistant stopped',
          message: `The local API service stopped unexpectedly${code === null ? '.' : ` with exit code ${code}.`}`,
          detail: `Check the startup log at:\n${getLogFile()}`
        }).finally(() => app.quit());
      });
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
      return;
    } catch (error) {
      await stopServices(services);
      services = undefined;
      if (!await showStartupFailure(error)) {
        app.quit();
        return;
      }
    }
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', focusMainWindow);
  app.whenReady().then(createWindow);
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', async event => {
  if (stopping || !services) return;
  event.preventDefault();
  stopping = true;
  await stopServices(services);
  app.quit();
});
