import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2, Trash2, X, Users } from 'lucide-react';

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

function statoOrdine(righe) {
  if (righe.length === 0) return null;
  const stati = righe.map(r => r.stato);
  if (stati.every(s => s === 'pronto' || s === 'consegnato')) return 'terminato';
  if (stati.some(s => s === 'in_preparazione')) return 'in_lavorazione';
  if (stati.some(s => s === 'ricevuto')) return 'ricevuto';
  return 'nuovo';
}

function PrintPopup({ righe, onClose }) {
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=400,height=600');
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const fasiUsate = [...new Set(righe.map(r => r.fase || 1))].sort((a, b) => a - b);
    const righePerFase = fasiUsate.reduce((acc, f) => {
      acc[f] = righe.filter(r => (r.fase || 1) === f);
      return acc;
    }, {});

    const fasi = fasiUsate.map(f => `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:bold;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:6px">
          — FASE ${f} —
        </div>
        ${righePerFase[f].map(r => `
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:15px;font-weight:bold">${r.quantita}× ${r.nome_item}${r.priorita === 'urgente' ? ' ⚡' : ''}</span>
          </div>
          ${r.note ? `<div style="font-size:12px;font-style:italic;margin-left:8px">📝 ${r.note}</div>` : ''}
        `).join('')}
      </div>
    `).join('');

    const tavolo = righe[0]?.numero_tavolo || '?';
    win.document.write(`
      <html><head><title>Comanda Tavolo ${tavolo}</title>
      <style>body{font-family:monospace;padding:16px;max-width:300px}</style></head>
      <body>
        <div style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:4px">CUCINA</div>
        <div style="text-align:center;font-size:13px;margin-bottom:12px;border-bottom:2px solid #000;padding-bottom:8px">
          Tavolo <strong>${tavolo}</strong> · ${ora}
        </div>
        ${fasi}
        <div style="margin-top:16px;border-top:1px dashed #000;padding-top:8px;text-align:center;font-size:11px">
          ${new Date().toLocaleDateString('it-IT')}
        </div>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `);
    win.document.close();
    onClose();
  };

  const tavolo = righe[0]?.numero_tavolo || '?';
  const fasiUsate = [...new Set(righe.map(r => r.fase || 1))].sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#1a0a0a] border-2 border-red-500/60 rounded-sm w-full max-w-sm">
        <div className="px-5 py-4 border-b border-red-500/20 flex items-center justify-between">
          <div>
            <p className="font-body text-xs text-red-400 uppercase tracking-widest mb-0.5">Nuova comanda</p>
            <p className="font-display text-3xl text-white">Tavolo {tavolo}</p>
          </div>
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
            {righe.length} articol{righe.length === 1 ? 'o' : 'i'}
          </span>
        </div>
        <div className="p-4 max-h-60 overflow-y-auto space-y-3">
          {fasiUsate.map(f => (
            <div key={f}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-[#C69C6D] flex items-center justify-center">
                  <span className="font-body text-[10px] font-bold text-[#0A0A0B]">{f}</span>
                </div>
                <span className="font-body text-xs text-[#C69C6D] uppercase tracking-widest">Fase {f}</span>
              </div>
              {righe.filter(r => (r.fase || 1) === f).map(r => (
                <div key={r.id} className="pl-7 mb-1">
                  <span className="font-body text-white text-base font-semibold">
                    {r.quantita}× {r.nome_item}
                    {r.priorita === 'urgente' && <span className="text-red-400 ml-1">⚡</span>}
                  </span>
                  {r.note && <p className="font-body text-yellow-300/70 text-xs italic">{r.note}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-red-500/20 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 border border-[#E5E5E5]/20 text-[#E5E5E5]/50 font-body text-sm rounded-sm hover:border-[#E5E5E5]/40 transition-all">
            Ignora
          </button>
          <button onClick={handlePrint}
            className="flex-1 py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm rounded-sm transition-all flex items-center justify-center gap-2">
            🖨️ Stampa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Cucina() {
  const [ordini, setOrdini] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [printQueue, setPrintQueue] = useState([]); // righe da stampare
  const prevIds = useRef(new Set());
  const audioCtxRef = useRef(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      [0, 200, 400].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
        osc.start(ctx.currentTime + delay / 1000);
        osc.stop(ctx.currentTime + delay / 1000 + 0.4);
      });
    } catch {}
  };

  const load = async () => {
    const [data, ordiniData] = await Promise.all([
      base44.entities.RigaOrdine.filter({ reparto: 'cucina' }, 'created_date', 300),
      base44.entities.Ordine.filter({}, '-created_date', 200),
    ]);
    const copertiMap = ordiniData.reduce((acc, o) => { acc[o.id] = o.coperti; return acc; }, {});
    const attive = data.filter(r => ['inviato', 'ricevuto', 'in_preparazione', 'pronto'].includes(r.stato));

    const grouped = attive.reduce((acc, r) => {
      if (!acc[r.ordine_id]) acc[r.ordine_id] = { ordineId: r.ordine_id, numero: r.numero_tavolo, coperti: copertiMap[r.ordine_id], righe: [] };
      acc[r.ordine_id].righe.push(r);
      return acc;
    }, {});

    Object.values(grouped).forEach(o => { o.stato_calc = statoOrdine(o.righe); });

    const nonTerminati = Object.fromEntries(
      Object.entries(grouped).filter(([, o]) => o.stato_calc !== 'terminato')
    );

    const newIds = new Set(Object.keys(nonTerminati));
    const nuoviOrdini = [...newIds].filter(id => !prevIds.current.has(id));
    if (nuoviOrdini.length > 0 && prevIds.current.size > 0) playBeep();
    prevIds.current = newIds;

    setOrdini(nonTerminati);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);

    // Buffer per raccogliere le righe arrivate in breve tempo (stesso invio)
    let buffer = [];
    let bufferTimer = null;

    const unsubscribe = base44.entities.RigaOrdine.subscribe((event) => {
      if (event.type === 'create') {
        const r = event.data;
        if (r?.reparto === 'cucina' && ['inviato', 'ricevuto'].includes(r?.stato)) {
          playBeep();
          load();
          // Accumula le righe nel buffer per 800ms poi mostra il popup
          buffer.push(r);
          clearTimeout(bufferTimer);
          bufferTimer = setTimeout(() => {
            const righe = [...buffer];
            buffer = [];
            setPrintQueue(righe);
          }, 800);
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const stampaComanda = (ord) => {
    const win = window.open('', '_blank', 'width=400,height=700');
    const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const data = new Date().toLocaleDateString('it-IT');
    const fasiUsate = [...new Set(ord.righe.map(r => r.fase || 1))].sort((a, b) => a - b);
    const righePerFase = fasiUsate.reduce((acc, f) => {
      acc[f] = ord.righe.filter(r => (r.fase || 1) === f);
      return acc;
    }, {});

    const fasiHtml = fasiUsate.map(f => `
      <div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px">
          ── FASE ${f} ──
        </div>
        ${righePerFase[f].map(r => `
          <div style="margin-bottom:6px">
            <div style="font-size:16px;font-weight:bold">
              ${r.quantita}× ${r.nome_item}${r.priorita === 'urgente' ? ' <span style="color:red">⚡ URGENTE</span>' : ''}
            </div>
            ${r.note ? `<div style="font-size:12px;font-style:italic;margin-left:10px;color:#555">📝 ${r.note}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');

    win.document.write(`
      <html><head><title>Comanda Tavolo ${ord.numero}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: monospace; padding: 20px; max-width: 320px; }
        @media print { body { padding: 8px; } }
      </style></head>
      <body>
        <div style="text-align:center; margin-bottom:16px; padding-bottom:12px; border-bottom:2px solid #000">
          <div style="font-size:22px; font-weight:bold; letter-spacing:6px; text-transform:uppercase; margin-bottom:2px">
            OSSIDIANA
          </div>
          <div style="font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#555">Ristorante</div>
        </div>
        <div style="text-align:center; margin-bottom:16px; padding-bottom:12px; border-bottom:1px dashed #000">
          <div style="font-size:13px; letter-spacing:2px; text-transform:uppercase; margin-bottom:4px">COMANDA CUCINA</div>
          <div style="font-size:28px; font-weight:bold">Tavolo ${ord.numero}</div>
          ${ord.coperti ? `<div style="font-size:14px; font-weight:bold; margin-top:2px">${ord.coperti} coperti</div>` : ''}
          <div style="font-size:12px; color:#555; margin-top:4px">${data} · ${ora}</div>
        </div>
        ${fasiHtml}
        <div style="margin-top:20px; border-top:1px dashed #000; padding-top:10px; text-align:center; font-size:10px; color:#888; letter-spacing:1px">
          OSSIDIANA · CUCINA
        </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const prendiInCarico = async (ordineId) => {
    setUpdating(ordineId);
    const ord = ordini[ordineId];
    const righeNuove = ord.righe.filter(r => r.stato === 'inviato' || r.stato === 'ricevuto');
    await Promise.all(righeNuove.map(r => base44.entities.RigaOrdine.update(r.id, { stato: 'in_preparazione' })));
    await base44.entities.Ordine.update(ordineId, { stato: 'in_preparazione' }).catch(() => {});
    setOrdini(prev => ({
      ...prev,
      [ordineId]: {
        ...prev[ordineId],
        stato_calc: 'in_lavorazione',
        righe: prev[ordineId].righe.map(r =>
          righeNuove.find(nr => nr.id === r.id) ? { ...r, stato: 'in_preparazione' } : r
        ),
      }
    }));
    setUpdating(null);
    stampaComanda(ord);
  };

  const segnaArticoloPronto = async (ordineId, rigaId) => {
    setUpdating(rigaId);
    const now = new Date().toISOString();
    await base44.entities.RigaOrdine.update(rigaId, { stato: 'pronto', ready_at: now });
    setOrdini(prev => {
      const ord = { ...prev[ordineId] };
      ord.righe = ord.righe.map(r => r.id === rigaId ? { ...r, stato: 'pronto', ready_at: now } : r);
      ord.stato_calc = statoOrdine(ord.righe);
      if (ord.stato_calc === 'terminato') {
        base44.entities.Ordine.update(ordineId, { stato: 'pronto' }).catch(() => {});
        const { [ordineId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ordineId]: ord };
    });
    setUpdating(null);
  };

  const annullaRiga = async (ordineId, rigaId) => {
    setUpdating(rigaId);
    await base44.entities.RigaOrdine.update(rigaId, { stato: 'annullato' });
    setOrdini(prev => {
      const ord = { ...prev[ordineId] };
      ord.righe = ord.righe.filter(r => r.id !== rigaId);
      if (ord.righe.length === 0) {
        base44.entities.Ordine.update(ordineId, { stato: 'annullato' }).catch(() => {});
        const { [ordineId]: _removed, ...rest } = prev;
        return rest;
      }
      ord.stato_calc = statoOrdine(ord.righe);
      return { ...prev, [ordineId]: ord };
    });
    setUpdating(null);
  };

  const annullaTutto = async (ordineId) => {
    setUpdating(ordineId + '_all');
    const ord = ordini[ordineId];
    await Promise.all(ord.righe.map(r => base44.entities.RigaOrdine.update(r.id, { stato: 'annullato' })));
    await base44.entities.Ordine.update(ordineId, { stato: 'annullato' }).catch(() => {});
    setOrdini(prev => { const { [ordineId]: _removed, ...rest } = prev; return rest; });
    setUpdating(null);
  };

  const nuoviCount = Object.values(ordini).filter(o => o.stato_calc === 'nuovo').length;

  const ordiniSortati = Object.entries(ordini).sort(([, a], [, b]) => {
    const order = { nuovo: 0, ricevuto: 1, in_lavorazione: 2 };
    return (order[a.stato_calc] ?? 9) - (order[b.stato_calc] ?? 9);
  });

  return (
    <div className="min-h-screen bg-[#080808] p-4 pt-20">
      {printQueue.length > 0 && (
        <PrintPopup righe={printQueue} onClose={() => setPrintQueue([])} />
      )}
      {/* Header pagina */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl text-white tracking-widest">CUCINA</h1>
          {nuoviCount > 0 && (
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
              {nuoviCount} nuov{nuoviCount === 1 ? 'o' : 'i'}
            </span>
          )}
        </div>
        <button onClick={load} className="p-3 border border-white/20 text-white/60 hover:bg-white/10 rounded-sm transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-white/40 font-body">Caricamento...</div>
      ) : ordiniSortati.length === 0 ? (
        <div className="text-center py-20 text-white/40 font-body text-lg">
          <CheckCircle2 size={40} className="mx-auto mb-4 opacity-20" />
          Nessuna comanda in attesa
        </div>
      ) : (
        <div className="space-y-5 max-w-2xl mx-auto">
          {ordiniSortati.map(([ordineId, ord]) => {
            const isNuovo = ord.stato_calc === 'nuovo' || ord.stato_calc === 'ricevuto';
            const isInLav = ord.stato_calc === 'in_lavorazione';

            // Righe ordinate per fase crescente
            const righeOrdinate = [...ord.righe].sort((a, b) => (a.fase || 1) - (b.fase || 1));
            const fasiUsate = [...new Set(righeOrdinate.map(r => r.fase || 1))].sort((a, b) => a - b);

            return (
              <div key={ordineId}
                className={`border rounded-sm overflow-hidden ${isNuovo ? 'border-red-500/60 bg-[#1a0a0a]' : 'border-yellow-500/30 bg-[#111108]'}`}>

                {/* ── NUMERO TAVOLO (header) ── */}
                <div className={`px-5 py-4 flex items-center justify-between gap-2 border-b ${isNuovo ? 'border-red-500/20 bg-red-900/10' : 'border-yellow-500/10 bg-yellow-900/5'}`}>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-5xl text-white leading-none">
                      {ord.numero}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-body text-xs text-white/40 uppercase tracking-widest">Tavolo</span>
                      {ord.coperti > 0 && (
                        <span className="flex items-center gap-1 text-white/70 font-body text-sm font-semibold">
                          <Users size={14} className="text-[#C69C6D]" /> {ord.coperti} coperti
                        </span>
                      )}
                      {isNuovo && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-body font-bold animate-pulse w-fit">
                          NUOVO
                        </span>
                      )}
                      {isInLav && (
                        <span className="text-xs bg-yellow-600/80 text-white px-2 py-0.5 rounded-full font-body w-fit">
                          IN LAVORAZIONE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (window.confirm(`Annullare tutta la comanda del Tavolo ${ord.numero}?`)) annullaTutto(ordineId); }}
                      disabled={updating === ordineId + '_all'}
                      className="px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm font-body text-xs transition-all flex items-center gap-1.5"
                    >
                      {updating === ordineId + '_all'
                        ? <Loader2 size={13} className="animate-spin" />
                        : <><Trash2 size={13} /> Annulla</>}
                    </button>
                    {isNuovo && (
                      <button
                        onClick={() => prendiInCarico(ordineId)}
                        disabled={updating === ordineId}
                        className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-sm font-body text-sm font-bold transition-all flex items-center gap-2 min-w-[140px] justify-center"
                      >
                        {updating === ordineId
                          ? <Loader2 size={15} className="animate-spin" />
                          : '🍳 Prendi in carico'}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── ARTICOLI DIVISI PER FASE ── */}
                {fasiUsate.map(f => {
                  const righeF = righeOrdinate.filter(r => (r.fase || 1) === f);
                  const tuttePronte = righeF.every(r => r.stato === 'pronto' || r.stato === 'consegnato');

                  return (
                    <div key={f}>
                      {/* Header fase */}
                      <div className={`px-4 py-2 flex items-center gap-2 ${tuttePronte ? 'bg-green-900/15 border-t border-green-500/15' : 'bg-white/[0.03] border-t border-white/5'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-body text-xs font-bold ${tuttePronte ? 'bg-green-600 text-white' : 'bg-[#C69C6D] text-[#0A0A0B]'}`}>
                          {f}
                        </div>
                        <span className={`font-body text-xs uppercase tracking-widest font-semibold ${tuttePronte ? 'text-green-400' : 'text-[#C69C6D]'}`}>
                          Fase {f}{tuttePronte ? ' · Completata ✓' : ''}
                        </span>
                      </div>

                      {/* Righe della fase */}
                      <div className="divide-y divide-white/5">
                        {righeF.map(riga => {
                          const min = minutiDa(riga.sent_at || riga.created_date);
                          const isPronto = riga.stato === 'pronto' || riga.stato === 'consegnato';
                          return (
                            <div key={riga.id}
                              className={`px-4 py-3 pl-10 flex flex-col sm:flex-row sm:items-center gap-3 ${isPronto ? 'opacity-40' : ''}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`font-body text-lg font-semibold ${isPronto ? 'line-through text-white/40' : 'text-white'}`}>
                                    {riga.quantita}× {riga.nome_item}
                                  </span>
                                  {riga.priorita === 'urgente' && <AlertCircle size={16} className="text-red-400 shrink-0" />}
                                </div>
                                {riga.note && (
                                  <p className="font-body text-yellow-300/80 text-sm italic">📝 {riga.note}</p>
                                )}
                                {min !== null && (
                                  <div className="flex items-center gap-1 text-white/30 text-xs font-body mt-1">
                                    <Clock size={11} /> {min} min fa
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {isInLav && !isPronto && (
                                  <button
                                    onClick={() => segnaArticoloPronto(ordineId, riga.id)}
                                    disabled={updating === riga.id}
                                    className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-sm font-body text-sm font-semibold transition-all flex items-center gap-2"
                                  >
                                    {updating === riga.id
                                      ? <Loader2 size={14} className="animate-spin" />
                                      : <><CheckCircle2 size={14} /> Pronto</>}
                                  </button>
                                )}
                                {isPronto && (
                                  <span className="text-green-400 font-body text-sm flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Pronto
                                  </span>
                                )}
                                {!isPronto && (
                                  <button
                                    onClick={() => { if (window.confirm(`Annullare "${riga.nome_item}"?`)) annullaRiga(ordineId, riga.id); }}
                                    disabled={updating === riga.id}
                                    className="p-2 border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/60 hover:bg-red-500/10 rounded-sm transition-all"
                                    title="Annulla articolo"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}