const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { getRuntimePaths, waitForHttpReady } = require('./runtime.cjs');

test('resolves portable runtime paths under the app and user data roots', () => {
  const paths = getRuntimePaths('C:\\App', 'C:\\Users\\Test\\Data');
  assert.equal(paths.databaseRoot, path.join('C:\\Users\\Test\\Data', 'postgres-data'));
  assert.equal(paths.apiEntry, path.join('C:\\App', 'apps', 'api', 'dist', 'apps', 'api', 'src', 'main.js'));
  assert.equal(paths.webRoot, path.join('C:\\App', 'apps', 'web', 'dist'));
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
