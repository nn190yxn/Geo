const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

function contentType(filePath) {
  return ({ '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' })[path.extname(filePath)] || 'text/html';
}

function start(root, port, apiPort, logFile) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    if (pathname.startsWith('/api/')) {
      const proxy = http.request({
        host: '127.0.0.1',
        port: apiPort,
        path: `${pathname}${new URL(request.url, `http://${request.headers.host}`).search}`,
        method: request.method,
        headers: { ...request.headers, host: `127.0.0.1:${apiPort}` }
      }, proxyResponse => {
        response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(response);
      });
      proxy.once('error', error => {
        fs.appendFileSync(logFile, `${new Date().toISOString()} API proxy error: ${error.message}\n`);
        if (!response.headersSent) response.writeHead(502);
        response.end('API service unavailable');
      });
      request.pipe(proxy);
      return;
    }
    const requested = path.resolve(root, `.${pathname}`);
    const filePath = requested.startsWith(path.resolve(root)) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(root, 'index.html');
    try {
      response.writeHead(200, { 'content-type': contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      fs.appendFileSync(logFile, `${new Date().toISOString()} Web server error: ${error.message}\n`);
      response.writeHead(500);
      response.end('Web server error');
    }
  });
  server.listen(port, '127.0.0.1');
  return server;
}

module.exports = { start };
