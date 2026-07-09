/**
 * Ossidiana — Print Relay Server
 * 
 * Esegui questo script su un dispositivo nella stessa rete Wi-Fi della stampante
 * (Mac, Windows, Linux, Raspberry Pi). Riceve le richieste di stampa dal cloud
 * e le inoltra alla stampante MUNBYN via TCP socket.
 * 
 * SETUP:
 *   1. Installa Node.js (https://nodejs.org) — versione 18+
 *   2. Salva questo file come print-server.js
 *   3. Modifica AUTH_TOKEN sotto con una password a tua scelta
 *   4. Avvia: node print-server.js
 *   5. Esponi il relay su internet con Cloudflare Tunnel (vedi README.md)
 *   6. Configura RELAY_URL e RELAY_AUTH_TOKEN nei secrets dell'app
 */

const net = require('net');
const http = require('http');

// ─── Configurazione ───
const PRINTER_IP = '192.168.1.51';
const PRINTER_PORT = 9100;
const RELAY_PORT = 3000;
const AUTH_TOKEN = 'cambia-questa-password'; // ← DEVE corrispondere al secret RELAY_AUTH_TOKEN
// ─────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST' || req.url !== '/print') {
    res.writeHead(405);
    return res.end(JSON.stringify({ error: 'Usa POST /print' }));
  }

  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'Token non valido' }));
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'JSON non valido' }));
    }

    const bytes = Buffer.from(payload.data, 'base64');
    if (!bytes || bytes.length === 0) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Nessun dato ricevuto' }));
    }

    const socket = net.createConnection({ host: PRINTER_IP, port: PRINTER_PORT }, () => {
      console.log(`→ Invio ${bytes.length} byte a ${PRINTER_IP}:${PRINTER_PORT}`);
      socket.write(bytes, () => {
        socket.end();
      });
    });

    socket.setTimeout(5000);

    socket.on('timeout', () => {
      socket.destroy();
      console.error('✗ Timeout stampante');
      res.writeHead(504);
      res.end(JSON.stringify({ success: false, error: 'Timeout stampante' }));
    });

    socket.on('error', (err) => {
      console.error('✗ Errore:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ success: false, error: err.message }));
    });

    socket.on('close', () => {
      console.log('✓ Stampa completata');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, bytes: bytes.length }));
    });
  });
});

server.listen(RELAY_PORT, () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │   OSSIDIANA — Print Relay               │');
  console.log('  │                                         │');
  console.log(`  │   Relay:    http://localhost:${RELAY_PORT}      │`);
  console.log(`  │   Stampante: ${PRINTER_IP}:${PRINTER_PORT}            │`);
  console.log('  │                                         │');
  console.log('  │   In attesa di comandi di stampa...     │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('');
});