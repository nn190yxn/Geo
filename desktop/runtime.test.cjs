const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const http = require('node:http');
const path = require('node:path');
const { getRuntimePaths, waitForCommandExit, waitForHttpReady } = require('./runtime.cjs');

test('resolves portable runtime paths under the app and user data roots', () => {
  const paths = getRuntimePaths('C:\\App', 'C:\\Users\\Test\\Data');
  assert.equal(paths.databaseRoot, path.join('C:\\Users\\Test\\Data', 'postgres-data'));
  assert.equal(paths.apiEntry, path.join('C:\\App', 'apps', 'api', 'dist', 'apps', 'api', 'src', 'main.js'));
  assert.equal(paths.webRoot, path.join('C:\\App', 'apps', 'web', 'dist'));
  assert.equal(paths.prismaCli, path.join('C:\\App', 'apps', 'api', 'node_modules', 'prisma', 'build', 'index.js'));
  assert.equal(
    getRuntimePaths('/opt/Geo/app', '/tmp/data').postgresRoot,
    path.join('/opt/Geo', 'runtime', 'postgres'),
  );
});

test('waits for an HTTP readiness endpoint to return success', async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(request.url === '/ready' ? 200 : 503);
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    await waitForHttpReady(port, '/ready', 1000);
  } finally {
    server.close();
  }
});

test('bounds a stalled HTTP readiness request by the supplied timeout', async () => {
  const server = http.createServer(() => {});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const startedAt = Date.now();
  try {
    await assert.rejects(waitForHttpReady(port, '/ready', 100));
    assert.ok(Date.now() - startedAt < 1000);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('rejects and terminates a command that does not exit by its deadline', async () => {
  const child = new EventEmitter();
  child.kill = signal => { child.killedWith = signal; };

  await assert.rejects(waitForCommandExit(child, 20, 'Database initialization failed.'));
  assert.equal(child.killedWith, 'SIGKILL');
});
