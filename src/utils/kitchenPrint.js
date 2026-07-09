/**
 * Utility condivisa per la stampa comanda cucina su stampante termica 80mm.
 */

export function buildPrintHtml(tavolo, coperti, ora, fasiHtml) {
  const oggi = new Date().toLocaleDateString('it-IT');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Comanda Tavolo ${tavolo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 6mm 5mm; font-size: 13px; color: #000; }
  @media print { @page { margin: 0; size: 80mm auto; } body { padding: 5mm 4mm; } }
  .logo { text-align:center; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2px solid #000; }
  .logo-title { font-size: 20px; font-weight: bold; letter-spacing: 8px; text-transform: uppercase; }
  .logo-sub { font-size: 8px; letter-spacing: 4px; text-transform: uppercase; color: #444; margin-top: 3px; }
  .header { text-align:center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #000; }
  .header-label { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 6px; }
  .tavolo-num { font-size: 36px; font-weight: bold; line-height: 1; }
  .coperti { font-size: 13px; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
  .datetime { font-size: 10px; color: #666; margin-top: 4px; }
  .fase-header { font-size: 10px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase;
                 border-top: 1px solid #000; border-bottom: 1px solid #000;
                 padding: 4px 0; margin: 8px 0 6px; text-align: center; background: #f0f0f0; }
  .item { display: flex; justify-content: space-between; align-items: baseline;
          padding: 3px 0; border-bottom: 1px dotted #ccc; }
  .item-name { font-size: 14px; font-weight: bold; flex: 1; }
  .item-note { font-size: 10px; font-style: italic; color: #444; padding: 1px 0 4px 12px; }
  .urgent { color: #cc0000; }
  .footer { margin-top: 12px; border-top: 1px dashed #000; padding-top: 6px;
            text-align: center; font-size: 9px; color: #888; letter-spacing: 2px; }
</style></head>
<body>
  <div class="logo">
    <div class="logo-title">OSSIDIANA</div>
    <div class="logo-sub">Cucina Contemporanea</div>
  </div>
  <div class="header">
    <div class="header-label">◆ Comanda Cucina ◆</div>
    <div class="tavolo-num">${tavolo}</div>
    ${coperti ? `<div class="coperti">▲ ${coperti} coperti</div>` : ''}
    <div class="datetime">${oggi} &nbsp;·&nbsp; ${ora}</div>
  </div>
  ${fasiHtml}
  <div class="footer">OSSIDIANA &nbsp;·&nbsp; CUCINA</div>
</body></html>`;
}

/**
 * Apre la finestra di stampa per la stampante cucina.
 * @param {Array} righe - array di righe ordine (con nome_item, quantita, fase, priorita, note, reparto)
 * @param {number} numeroTavolo
 * @param {number} coperti
 * @param {string} repartoFilter - 'cucina' per solo cucina, null per tutto
 */
export function stampaComandaCucina(righe, numeroTavolo, coperti, repartoFilter = 'cucina') {
  const righeStampa = repartoFilter ? righe.filter(r => r.reparto === repartoFilter) : righe;
  if (righeStampa.length === 0) return;

  const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fasiUsate = [...new Set(righeStampa.map(r => r.fase || 1))].sort((a, b) => a - b);
  const righePerFase = fasiUsate.reduce((acc, f) => {
    acc[f] = righeStampa.filter(r => (r.fase || 1) === f);
    return acc;
  }, {});

  const fasiHtml = fasiUsate.map(f => `
    <div class="fase-header">— Fase ${f} —</div>
    ${righePerFase[f].map(r => `
      <div class="item">
        <span class="item-name ${r.priorita === 'urgente' ? 'urgent' : ''}">${r.quantita}× ${r.nome_item}${r.priorita === 'urgente' ? ' ⚡' : ''}</span>
      </div>
      ${r.note ? `<div class="item-note">📝 ${r.note}</div>` : ''}
    `).join('')}
  `).join('');

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(buildPrintHtml(numeroTavolo, coperti, ora, fasiHtml));
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}