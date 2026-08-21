const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const { startServices, stopServices, writeRuntimeState } = require('./runtime.cjs');

let mainWindow;
let services;
let stopping = false;

// Keep user data outside the installation directory so upgrades preserve it.
app.setPath('userData', path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'AI-Brand-Visibility-Assistant'));

function getLogFile() {
  return services?.logFile || path.join(app.getPath('userData'), 'data', 'logs', 'desktop.log');
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function logRendererEvent(message) {
  const logFile = getLogFile();
  require('node:fs').appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
}

async function waitForRendererReady(window) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const ready = await window.webContents.executeJavaScript(
      "document.readyState === 'complete' && Boolean(document.querySelector('#root > *'))",
      true,
    );
    if (ready) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('The desktop page loaded without rendering the application UI.');
}

async function showStartupFailure(error) {
  if (process.env.CI) return false;
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
      mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
        logRendererEvent(`Renderer failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
      });
      mainWindow.webContents.on('render-process-gone', (_event, details) => {
        logRendererEvent(`Renderer process exited: ${details.reason || 'unknown'}${details.exitCode === undefined ? '' : ` (exit code ${details.exitCode})`}`);
      });
      mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        logRendererEvent(`Renderer console [${level}] ${sourceId}:${line} ${message}`);
      });
      mainWindow.once('ready-to-show', () => {
        logRendererEvent('Renderer emitted ready-to-show.');
      });
      await mainWindow.loadURL(`http://127.0.0.1:${services.webPort}`);
      await waitForRendererReady(mainWindow);
      services.uiReady = true;
      writeRuntimeState(services, 'running');
      mainWindow.show();
      mainWindow.on('closed', () => { mainWindow = undefined; });
      return;
    } catch (error) {
      const failedServices = services;
      await stopServices(failedServices);
      if (failedServices) {
        logRendererEvent(`Desktop startup failed: ${error.message}`);
        writeRuntimeState(failedServices, 'failed', error.message);
      }
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
