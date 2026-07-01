#!/usr/bin/env node
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const httpsPort = parseInt(process.env.HTTPS_PORT || '3443', 10);
const host = process.env.HOST || '0.0.0.0';

const certPath = process.env.TLS_CERT_PATH || path.join(root, 'certs', 'localhost-cert.pem');
const keyPath = process.env.TLS_KEY_PATH || path.join(root, 'certs', 'localhost-key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('Missing TLS certificate/key.');
  console.error(`Expected cert: ${certPath}`);
  console.error(`Expected key:  ${keyPath}`);
  console.error('Generate them with: npm run cert:generate');
  process.exit(1);
}

const app = next({ dev: false, dir: root, hostname: host, port: httpsPort });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const tlsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  https
    .createServer(tlsOptions, (req, res) => {
      handle(req, res);
    })
    .listen(httpsPort, host, () => {
      console.log(`✅ Nexus HTTPS production server running on https://${host}:${httpsPort}`);
    });
});
