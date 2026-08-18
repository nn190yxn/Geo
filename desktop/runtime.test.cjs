const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { getRuntimePaths } = require('./runtime.cjs');

test('resolves portable runtime paths under the app and user data roots', () => {
  const paths = getRuntimePaths('C:\\App', 'C:\\Users\\Test\\Data');
  assert.equal(paths.databaseRoot, path.join('C:\\Users\\Test\\Data', 'postgres-data'));
  assert.equal(paths.apiEntry, path.join('C:\\App', 'apps', 'api', 'dist', 'apps', 'api', 'src', 'main.js'));
  assert.equal(paths.webRoot, path.join('C:\\App', 'apps', 'web', 'dist'));
});
