const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

function getRuntimePaths(appRoot, dataRoot) {
  const installRoot = path.dirname(appRoot);
  const postgresRoot = path.join(installRoot, 'runtime', 'postgres');
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
      let finished = false;
      const retry = () => {
        if (finished) return;
        finished = true;
        if (Date.now() >= deadline) reject(new Error(`HTTP service ${requestPath} did not become ready.`));
        else setTimeout(attempt, 250);
      };
      const request = http.get({ host: '127.0.0.1', port, path: requestPath }, response => {
        response.resume();
        if (response.statusCode === 200) {
          finished = true;
          resolve();
          return;
        }
        retry();
      });
      request.once('error', retry);
      request.setTimeout(Math.min(5000, Math.max(1, deadline - Date.now())), () => {
        request.destroy(new Error(`HTTP request to ${requestPath} timed out.`));
      });
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

function waitForCommandExit(child, timeoutMs, errorMessage) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`${errorMessage} timed out.`));
    }, timeoutMs);
    child.once('error', () => finish(new Error(errorMessage)));
    child.once('close', code => finish(code === 0 ? undefined : new Error(errorMessage)));
  });
}

function writeRuntimeState(state, status, error) {
  fs.writeFileSync(path.join(state.paths.dataRoot, 'runtime-state.json'), `${JSON.stringify({
    status,
    error: error || null,
    processId: process.pid,
    apiProcessId: state.api?.pid || null,
    apiPort: state.apiPort || null,
    databasePort: state.databasePort || null,
    updatedAt: new Date().toISOString()
  }, null, 2)}\n`);
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
  if (!state?.pgCtl || !state?.databaseRoot) return Promise.resolve();
  return new Promise(resolve => {
    const stop = spawn(state.pgCtl, ['-D', state.databaseRoot, '-m', 'fast', '-w', 'stop'], { windowsHide: true });
    let settled = false;
    let immediateStarted = false;
    const finish = message => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (message) appendLog(state.logFile, message);
      resolve();
    };
    const requestImmediateShutdown = () => {
      if (immediateStarted || settled) return;
      immediateStarted = true;
      const immediate = spawn(state.pgCtl, ['-D', state.databaseRoot, '-m', 'immediate', '-w', 'stop'], { windowsHide: true });
      const immediateTimeout = setTimeout(() => {
        immediate.kill('SIGKILL');
        finish('PostgreSQL immediate shutdown did not complete within 10000ms.');
      }, 10000);
      immediate.once('error', () => {
        clearTimeout(immediateTimeout);
        finish('PostgreSQL immediate shutdown command could not start.');
      });
      immediate.once('close', code => {
        clearTimeout(immediateTimeout);
        finish(code === 0 ? undefined : 'PostgreSQL immediate shutdown command failed.');
      });
    };
    const timeout = setTimeout(() => {
      appendLog(state.logFile, 'PostgreSQL did not stop within 10000ms; terminating pg_ctl and requesting immediate shutdown.');
      stop.kill('SIGKILL');
      requestImmediateShutdown();
    }, 10000);
    stop.once('error', requestImmediateShutdown);
    stop.once('close', code => code === 0 ? finish() : requestImmediateShutdown());
  });
}

async function prepareDatabase(paths, logFile) {
  const initdb = path.join(paths.postgresBin, process.platform === 'win32' ? 'initdb.exe' : 'initdb');
  const pgCtl = path.join(paths.postgresBin, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  if (!fs.existsSync(initdb) || !fs.existsSync(pgCtl)) throw new Error('The bundled PostgreSQL runtime is missing.');
  if (!fs.existsSync(path.join(paths.databaseRoot, 'PG_VERSION'))) {
    const init = spawnLogged(initdb, ['-D', paths.databaseRoot, '-U', 'geo', '-A', 'trust', '--encoding=UTF8'], { cwd: paths.appRoot }, logFile);
    await waitForCommandExit(init, 60000, 'Local database initialization failed.');
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
  let state = { paths, logFile };
  writeRuntimeState(state, 'starting');
  try {
    const databaseState = await prepareDatabase(paths, logFile);
    state = { paths, database: databaseState.database, databasePort: databaseState.databasePort, pgCtl: databaseState.pgCtl, databaseRoot: paths.databaseRoot, logFile };
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
    writeRuntimeState(state, 'running');
    return state;
  } catch (error) {
    await stopServices(state);
    appendLog(logFile, `Local services failed to start: ${error.message}`);
    writeRuntimeState(state, 'failed', error.message);
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
  writeRuntimeState(state, 'stopped');
  appendLog(state.logFile, 'Local services stopped.');
}

module.exports = { findFreePort, getRuntimePaths, startServices, stopServices, waitForPort, waitForHttpReady, waitForCommandExit, writeRuntimeState };
