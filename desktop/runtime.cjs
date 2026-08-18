const fs = require('node:fs');
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

function spawnLogged(command, args, options, logFile) {
  const child = spawn(command, args, { ...options, windowsHide: true });
  const log = fs.createWriteStream(logFile, { flags: 'a' });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  child.once('close', () => log.end());
  return child;
}

function runCommand(command, args, options, logFile, errorMessage) {
  const child = spawnLogged(command, args, options, logFile);
  return new Promise((resolve, reject) => {
    child.once('close', code => code === 0 ? resolve() : reject(new Error(errorMessage)));
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
  await new Promise((resolve, reject) => database.once('close', code => code === 0 ? resolve() : reject(new Error('Local database startup failed.'))));
  await waitForPort(databasePort);
  const createdb = path.join(paths.postgresBin, process.platform === 'win32' ? 'createdb.exe' : 'createdb');
  await runCommand(createdb, ['-h', '127.0.0.1', '-p', String(databasePort), '-U', 'geo', 'geo_platform'], { cwd: paths.appRoot }, logFile, 'Local database creation failed.');
  return { database, databasePort, pgCtl };
}

async function startServices(appRoot, dataRoot) {
  const paths = getRuntimePaths(appRoot, dataRoot);
  ensureDirectories(paths);
  const logFile = path.join(paths.logRoot, 'desktop.log');
  fs.appendFileSync(logFile, `${new Date().toISOString()} Starting local services.\n`);
  const databaseState = await prepareDatabase(paths, logFile);
  const prismaCli = path.join(appRoot, 'node_modules', 'prisma', 'build', 'index.js');
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
      PORT: String(apiPort),
      CORS_ORIGIN: `http://127.0.0.1:${webPort}`,
      DATABASE_URL: `postgresql://geo@127.0.0.1:${databaseState.databasePort}/geo_platform?schema=public`,
      GEO_REPOSITORY_DRIVER: 'prisma',
      GEO_DATA_DIR: dataRoot
    }
  }, logFile);
  await waitForPort(apiPort);
  const web = require('./web-server.cjs').start(paths.webRoot, webPort, apiPort, logFile);
  return {
    paths,
    apiPort,
    webPort,
    database: databaseState.database,
    pgCtl: databaseState.pgCtl,
    databaseRoot: paths.databaseRoot,
    api,
    web,
    logFile
  };
}

async function stopServices(state) {
  if (!state) return;
  state.web?.close();
  for (const child of [state.api]) {
    if (child && !child.killed) child.kill();
  }
  if (state.database && !state.database.killed) {
    await new Promise(resolve => {
      const stop = spawn(state.pgCtl, ['-D', state.databaseRoot, '-w', 'stop'], { windowsHide: true });
      stop.once('close', resolve);
      setTimeout(() => { stop.kill(); resolve(); }, 10000);
    });
  }
}

module.exports = { findFreePort, getRuntimePaths, startServices, stopServices, waitForPort };
