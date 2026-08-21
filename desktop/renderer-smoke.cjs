const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { start } = require('./web-server.cjs');

const webRoot = process.env.GEO_RENDER_SMOKE_ROOT;
if (!webRoot || !fs.existsSync(path.join(webRoot, 'index.html'))) {
  throw new Error('GEO_RENDER_SMOKE_ROOT must point to a built web dist directory.');
}

let window;
let webServer;
let apiServer;
const failures = [];

function waitForListening(server) {
  if (server.listening) return Promise.resolve();
  return new Promise(resolve => server.once('listening', resolve));
}

function waitForRenderer() {
  const deadline = Date.now() + 20000;
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const ready = await window.webContents.executeJavaScript(
          "document.readyState === 'complete' && Boolean(document.querySelector('#root > *'))",
          true,
        );
        if (ready) {
          resolve();
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error('Renderer did not mount #root within 20 seconds.'));
        return;
      }
      setTimeout(check, 250);
    };
    check();
  });
}

async function close() {
  if (window && !window.isDestroyed()) window.destroy();
  for (const server of [webServer, apiServer]) {
    if (!server) continue;
    server.closeAllConnections?.();
    await Promise.race([
      new Promise(resolve => server.close(resolve)),
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]);
  }
  app.exit(process.exitCode || 0);
}

app.whenReady().then(async () => {
  const logRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'geo-render-smoke-'));
  const logFile = path.join(logRoot, 'renderer.log');
  apiServer = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ success: true, data: {} }));
  });
  apiServer.keepAliveTimeout = 1000;
  apiServer.headersTimeout = 2000;
  apiServer.listen(0, '127.0.0.1');
  await waitForListening(apiServer);
  const apiPort = apiServer.address().port;
  webServer = start(webRoot, 0, apiPort, logFile);
  await waitForListening(webServer);
  const webPort = webServer.address().port;

  window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    fs.appendFileSync(logFile, `console [${level}] ${sourceId}:${line} ${message}\n`);
    if (level >= 3) failures.push(`Renderer console error: ${message}`);
  });
  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    failures.push(`Renderer failed to load ${url}: ${code} ${description}`);
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    failures.push(`Renderer process exited: ${details.reason || 'unknown'}`);
  });

  try {
    await window.loadURL(`http://127.0.0.1:${webPort}`);
    await waitForRenderer();
    if (failures.length > 0) throw new Error(failures.join('\n'));
    console.log('Renderer smoke test passed.');
  } catch (error) {
    console.error(error.message);
    if (fs.existsSync(logFile)) console.error(fs.readFileSync(logFile, 'utf8'));
    process.exitCode = 1;
  } finally {
    await close();
  }
});
