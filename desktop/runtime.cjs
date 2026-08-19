const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

function getRuntimePaths(appRoot, dataRoot) {
  const postgresRoot = path.join(appRoot, 'runtime', 'postgres');
  return {
    appRoot,
    dataRoot,
    databaseRoot: path.join(dataRoot, 'postgres-data'),
    logRoot: path.join(dataRoot, 'logs'),
    postgresRoot,
    postgresBin: path.join(postgresRoot, 'bin'),
    apiEntry: path.join(appRoot, 'apps', 'api', 'dist', 'apps', 'api', 'src', 'main.js'),
    prismaSchema: path.join(appRoot, 'apps', 'api', 'prisma', 'schema.prisma'),
    webRoot: path.join(appRoot, 'apps', 'web', 'dist')
  };
}

function ensureDirectories(paths) {
  for (const directory of [paths.dataRoot, paths.databaseRoot, paths.logRoot]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function waitForPort(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() >= deadline) reject(new Error(`Port ${port} did not become ready.`));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

function waitForHttpReady(port, requestPath, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get({ host: '127.0.0.1', port, path: requestPath }, response => {
        response.resume();
        if (response.statusCode === 200) {
          resolve();
          return;
        }
        retry();
      });
      request.once('error', retry);
      function retry() {
        if (Date.now() >= deadline) reject(new Error(`HTTP service ${requestPath} did not become ready.`));
        else setTimeout(attempt, 250);
      }
    };
    attempt();
  });
}

function spawnLogged(command, args, options, logFile) {
  const child = spawn(command, args, { ...options, windowsHide: true });
  const log = fs.createWriteStream(logFile, { flags: 'a' });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  child.once('error', error => {
    fs.appendFileSync(logFile, `${new Date().toISOString()} Failed to start ${command}: ${error.message}\n`);
  });
  child.once('close', () => log.end());
  return child;
}

function runCommand(command, args, options, logFile, errorMessage) {
  const child = spawnLogged(command, args, options, logFile);
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error(errorMessage)));
    child.once('close', code => code === 0 ? resolve() : reject(new Error(errorMessage)));
  });
}

function runCommandOutput(command, args, options, logFile, errorMessage) {
  const child = spawnLogged(command, args, options, logFile);
  let output = '';
  child.stdout?.on('data', chunk => { output += chunk.toString(); });
  return new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error(errorMessage)));
    child.once('close', code => code === 0 ? resolve(output) : reject(new Error(errorMessage)));
  });
}

function appendLog(logFile, message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
}

function waitForChildExit(child, timeoutMs, logFile, label) {
  if (!child || child.exitCode !== null || child.killed) return Promise.resolve();
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      appendLog(logFile, `${label} did not stop within ${timeoutMs}ms; forcing termination.`);
      child.kill('SIGKILL');
      resolve();
    }, timeoutMs);
    child.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function closeWebServer(server, timeoutMs, logFile) {
  if (!server?.listening) return Promise.resolve();
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      appendLog(logFile, `Web server did not stop within ${timeoutMs}ms.`);
      resolve();
    }, timeoutMs);
    server.close(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function stopDatabase(state) {
  if (!state?.database || state.database.killed) return Promise.resolve();
  return new Promise(resolve => {
    const stop = spawn(state.pgCtl, ['-D', state.databaseRoot, '-w', 'stop'], { windowsHide: true });
    const timeout = setTimeout(() => {
      appendLog(state.logFile, 'PostgreSQL did not stop within 10000ms; terminating pg_ctl.');
      stop.kill('SIGKILL');
      resolve();
    }, 10000);
    stop.once('error', () => {
      clearTimeout(timeout);
      resolve();
    });
    stop.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function prepareDatabase(paths, logFile) {
  const initdb = path.join(paths.postgresBin, process.platform === 'win32' ? 'initdb.exe' : 'initdb');
  const pgCtl = path.join(paths.postgresBin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  if (!fs.existsSync(initdb) || !fs.existsSync(pgCtl)) throw new Error('The bundled PostgreSQL runtime is missing.');
  if (!fs.existsSync(path.join(paths.databaseRoot, 'PG_VERSION'))) {
    const init = spawnLogged(initdb, ['-D', paths.databaseRoot, '-U', 'geo', '-A', 'trust', '--encoding=UTF8'], { cwd: paths.appRoot }, logFile);
    await new Promise((resolve, reject) => init.once('close', code => code === 0 ? resolve() : reject(new Error('Local database initialization failed.'))));
  }
  const databasePort = await findFreePort();
  const database = spawnLogged(pgCtl, ['-D', paths.databaseRoot, '-w', '-o', `-p ${databasePort}`, 'start'], { cwd: paths.appRoot }, logFile);
  const databaseState = { database, pgCtl, databaseRoot: paths.databaseRoot, logFile };
  try {
    await new Promise((resolve, reject) => database.once('close', code => code === 0 ? resolve() : reject(new Error('Local database startup failed.'))));
    await waitForPort(databasePort);
    const psql = path.join(paths.postgresBin, process.platform === 'win32' ? 'psql.exe' : 'psql');
    const existing = await runCommandOutput(psql, ['-h', '127.0.0.1', '-p', String(databasePort), '-U', 'geo', '-d', 'postgres', '-t', '-A', '-c', "SELECT 1 FROM pg_database WHERE datname='geo_platform'"], { cwd: paths.appRoot }, logFile, 'Local database inspection failed.');
    if (!existing.includes('1')) {
      const createdb = path.join(paths.postgresBin, process.platform === 'win32' ? 'createdb.exe' : 'createdb');
      await runCommand(createdb, ['-h', '127.0.0.1', '-p', String(databasePort), '-U', 'geo', 'geo_platform'], { cwd: paths.appRoot }, logFile, 'Local database creation failed.');
    }
  } catch (error) {
    await stopDatabase(databaseState);
    throw error;
  }
  return { database, databasePort, pgCtl, databaseRoot: paths.databaseRoot };
}

async function startServices(appRoot, dataRoot) {
  const paths = getRuntimePaths(appRoot, dataRoot);
  ensureDirectories(paths);
  const logFile = path.join(paths.logRoot, 'desktop.log');
  fs.appendFileSync(logFile, `${new Date().toISOString()} Starting local services.\n`);
  let state;
  try {
    const databaseState = await prepareDatabase(paths, logFile);
    state = { paths, database: databaseState.database, pgCtl: databaseState.pgCtl, databaseRoot: paths.databaseRoot, logFile };
    const prismaCli = path.join(appRoot, 'node_modules', 'prisma', 'build', 'index.js');
    if (!fs.existsSync(prismaCli)) throw new Error('The bundled Prisma CLI is missing from the production payload.');
    await runCommand(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', paths.prismaSchema], {
      cwd: paths.appRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        DATABASE_URL: `postgresql://geo@127.0.0.1:${databaseState.databasePort}/geo_platform?schema=public`
      }
    }, logFile, 'Local database migration failed.');
    const apiPort = await findFreePort();
    const webPort = await findFreePort();
    const node = process.execPath;
    const api = spawnLogged(node, [paths.apiEntry], {
      cwd: paths.appRoot,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(apiPort),
        CORS_ORIGIN: `http://127.0.0.1:${webPort}`,
        DATABASE_URL: `postgresql://geo@127.0.0.1:${databaseState.databasePort}/geo_platform?schema=public`,
        GEO_REPOSITORY_DRIVER: 'prisma',
        GEO_DATA_DIR: dataRoot
      }
    }, logFile);
    state.api = api;
    state.apiPort = apiPort;
    state.webPort = webPort;
    await waitForHttpReady(apiPort, '/api/v1/health/ready');
    const web = require('./web-server.cjs').start(paths.webRoot, webPort, apiPort, logFile);
    state.web = web;
    await waitForPort(webPort);
    return state;
  } catch (error) {
    await stopServices(state);
    throw error;
  }
}

async function stopServices(state) {
  if (!state) return;
  appendLog(state.logFile, 'Stopping local services.');
  await closeWebServer(state.web, 10000, state.logFile);
  for (const child of [state.api]) {
    if (child && child.exitCode === null && !child.killed) child.kill();
    await waitForChildExit(child, 10000, state.logFile, 'API service');
  }
  await stopDatabase(state);
  appendLog(state.logFile, 'Local services stopped.');
}

module.exports = { findFreePort, getRuntimePaths, startServices, stopServices, waitForPort, waitForHttpReady };
