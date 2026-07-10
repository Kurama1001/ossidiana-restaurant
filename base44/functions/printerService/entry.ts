import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PRINTER_IP = Deno.env.get("PRINTER_IP") || "192.168.1.51";
const PRINTER_PORT = parseInt(Deno.env.get("PRINTER_PORT") || "9100");
const SOCKET_TIMEOUT_MS = 5000;

// ── ESC/POS command constants ──
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

// ── ESC/POS command builders ──
function init()        { return new Uint8Array([ESC, 0x40]); }
function centerAlign() { return new Uint8Array([ESC, 0x61, 0x01]); }
function leftAlign()   { return new Uint8Array([ESC, 0x61, 0x00]); }
function boldOn()      { return new Uint8Array([ESC, 0x45, 0x01]); }
function boldOff()     { return new Uint8Array([ESC, 0x45, 0x00]); }
function lineFeed(n = 1) { return new Uint8Array(Array(n).fill(LF)); }
function cutPaper()    { return new Uint8Array([GS, 0x56, 0x01]); }
function text(str)     { return new TextEncoder().encode(str); }

function concat(...arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ── TCP socket send with timeout + error handling ──
async function sendToPrinter(data) {
  let conn = null;
  try {
    conn = await Promise.race([
      Deno.connect({ hostname: PRINTER_IP, port: PRINTER_PORT }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout connessione a ${PRINTER_IP}:${PRINTER_PORT}`)), SOCKET_TIMEOUT_MS)
      ),
    ]);

    await Promise.race([
      conn.write(data),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout invio dati alla stampante')), SOCKET_TIMEOUT_MS)
      ),
    ]);

    conn.close();
    return { success: true, message: `Stampa inviata a ${PRINTER_IP}:${PRINTER_PORT} (${data.length} byte)` };
  } catch (error) {
    if (conn) {
      try { conn.close(); } catch {}
    }
    return { success: false, error: error.message };
  }
}

// ── printTest: OSSIDIANA + info + cut ──
function buildTestCommands() {
  return concat(
    init(),
    centerAlign(),
    boldOn(),
    text("OSSIDIANA"),
    lineFeed(),
    boldOff(),
    text("Test stampante riuscito"),
    lineFeed(),
    text(`IP: ${PRINTER_IP}`),
    lineFeed(),
    text(`Porta: ${PRINTER_PORT}`),
    lineFeed(3),
    cutPaper(),
  );
}

// ── printKitchen: comanda cucina ──
function buildKitchenCommands(orderData) {
  const { tavolo, coperti, righe } = orderData || {};
  let cmds = concat(
    init(),
    centerAlign(),
    boldOn(),
    text("OSSIDIANA"),
    lineFeed(),
    boldOff(),
    text("Cucina Contemporanea"),
    lineFeed(2),
    leftAlign(),
    boldOn(),
    text(`Tavolo: ${tavolo || '?'}`),
    lineFeed(),
    boldOff(),
    text(`Coperti: ${coperti || '-'}`),
    lineFeed(2),
  );

  if (righe && righe.length > 0) {
    const fasi = [...new Set(righe.map(r => r.fase || 1))].sort((a, b) => a - b);
    for (const f of fasi) {
      cmds = concat(cmds, text(`--- Fase ${f} ---`), lineFeed());
      for (const r of righe.filter(r => (r.fase || 1) === f)) {
        cmds = concat(cmds, text(`${r.quantita}x ${r.nome_item}`), lineFeed());
        if (r.note) cmds = concat(cmds, text(`  >> ${r.note}`), lineFeed());
      }
      cmds = concat(cmds, lineFeed());
    }
  }

  cmds = concat(cmds, lineFeed(2), cutPaper());
  return cmds;
}

// ── printReceipt: scontrino ──
function buildReceiptCommands(receiptData) {
  const { tavolo, totale, righe } = receiptData || {};
  let cmds = concat(
    init(),
    centerAlign(),
    boldOn(),
    text("OSSIDIANA"),
    lineFeed(),
    boldOff(),
    text("Cucina Contemporanea"),
    lineFeed(2),
    leftAlign(),
  );

  if (righe && righe.length > 0) {
    for (const r of righe) {
      const prezzo = (r.prezzo_totale || 0).toFixed(2);
      cmds = concat(cmds, text(`${r.quantita}x ${r.nome_item}  EUR ${prezzo}`), lineFeed());
    }
  }

  cmds = concat(cmds, lineFeed(), text(`Totale: EUR ${(totale || 0).toFixed(2)}`), lineFeed(3), cutPaper());
  return cmds;
}

// ── openDrawer: impulso cassetto ──
function buildDrawerCommands() {
  // ESC p m t1 t2 — pin 2, pulse ON 25ms / OFF 120ms
  return new Uint8Array([ESC, 0x70, 0x00, 0x19, 0x78]);
}

// ── HTTP handler ──
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    let data;
    switch (action) {
      case 'test':
        data = buildTestCommands();
        break;
      case 'kitchen':
        data = buildKitchenCommands(body.orderData);
        break;
      case 'receipt':
        data = buildReceiptCommands(body.receiptData);
        break;
      case 'drawer':
        data = buildDrawerCommands();
        break;
      default:
        return Response.json({ error: `Azione non valida: ${action}` }, { status: 400 });
    }

    const result = await sendToPrinter(data);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});