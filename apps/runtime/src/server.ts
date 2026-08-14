import * as http from 'node:http';
import { RuntimeEngine } from './engine';

const DEFAULT_PORT = 9473;

export function startRuntimeServer(engine: RuntimeEngine, port = DEFAULT_PORT): http.Server {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', service: 'sentinel-runtime' }));
      return;
    }

    if (req.method === 'POST' && req.url === '/evaluate') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body) as { action: string; resource: string };
          const result = await engine.intercept(payload);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data: result }));
        } catch (error) {
          res.writeHead(400);
          res.end(
            JSON.stringify({
              success: false,
              error: { message: error instanceof Error ? error.message : 'Bad request' },
            }),
          );
        }
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/resolve-secret') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body) as { reference: string; projectId: string };
          const value = await engine.resolveSecret(payload.reference, payload.projectId);
          if (!value) {
            res.writeHead(403);
            res.end(JSON.stringify({ success: false, error: { message: 'Secret access denied' } }));
            return;
          }
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, resolved: true }));
        } catch (error) {
          res.writeHead(403);
          res.end(
            JSON.stringify({
              success: false,
              error: { message: error instanceof Error ? error.message : 'Denied' },
            }),
          );
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Sentinel Runtime listening on http://127.0.0.1:${port}`);
  });

  return server;
}
