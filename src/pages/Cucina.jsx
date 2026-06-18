import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Clock, AlertCircle, CheckCircle2, Loader2, Trash2, X } from 'lucide-react';

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

// Calcola lo stato semplificato di un ordine basato sulle sue righe
function statoOrdine(righe) {
  if (righe.length === 0) return null;
  const stati = righe.map(r => r.stato);
  if (stati.every(s => s === 'pronto' || s === 'consegnato')) return 'terminato';
  if (stati.some(s => s === 'in_preparazione')) return 'in_lavorazione';
  if (stati.some(s => s === 'ricevuto')) return 'ricevuto';
  return 'nuovo';
}

export default function Cucina() {
  const [righe, setRighe] = useState([]);
  const [ordini, setOrdini] = useState({}); // ordineId -> { numero, cameriere, stato_calc, righe }
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
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
    const data = await base44.entities.RigaOrdine.filter({ reparto: 'cucina' }, 'created_date', 300);
    const attive = data.filter(r => ['inviato', 'ricevuto', 'in_preparazione', 'pronto'].includes(r.stato));

    // Raggruppa per ordine
    const grouped = attive.reduce((acc, r) => {
      if (!acc[r.ordine_id]) acc[r.ordine_id] = { ordineId: r.ordine_id, numero: r.numero_tavolo, righe: [] };
      acc[r.ordine_id].righe.push(r);
      return acc;
    }, {});

    // Calcola stato per ordine
    Object.values(grouped).forEach(o => { o.stato_calc = statoOrdine(o.righe); });

    // Filtra ordini non ancora terminati
    const nonTerminati = Object.fromEntries(Object.entries(grouped).filter(([, o]) => o.stato_calc !== 'terminato'));

    // Notifica suono per nuovi ordini
    const newIds = new Set(Object.keys(nonTerminati));
    const nuoviOrdini = [...newIds].filter(id => !prevIds.current.has(id));
    if (nuoviOrdini.length > 0 && prevIds.current.size > 0) playBeep();
    prevIds.current = newIds;

    setRighe(attive);
    setOrdini(nonTerminati);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  // Presa in carico di TUTTO l'ordine
  const prendiInCarico = async (ordineId) => {
    setUpdating(ordineId);
    const ord = ordini[ordineId];
    const righeNuove = ord.righe.filter(r => r.stato === 'inviato' || r.stato === 'ricevuto');
    await Promise.all(righeNuove.map(r => base44.entities.RigaOrdine.update(r.id, { stato: 'in_preparazione' })));
    // Aggiorna stato Ordine
    await base44.entities.Ordine.update(ordineId, { stato: 'in_preparazione' }).catch(() => {});
    setOrdini(prev => ({
      ...prev,
      [ordineId]: {
        ...prev[ordineId],
        stato_calc: 'in_lavorazione',
        righe: prev[ordineId].righe.map(r => righeNuove.find(nr => nr.id === r.id) ? { ...r, stato: 'in_preparazione' } : r),
      }
    }));
    setUpdating(null);
  };

  // Segna articolo singolo come pronto
  const segnaArticoloPronto = async (ordineId, rigaId) => {
    setUpdating(rigaId);
    const now = new Date().toISOString();
    await base44.entities.RigaOrdine.update(rigaId, { stato: 'pronto', ready_at: now });
    setOrdini(prev => {
      const ord = { ...prev[ordineId] };
      ord.righe = ord.righe.map(r => r.id === rigaId ? { ...r, stato: 'pronto', ready_at: now } : r);
      ord.stato_calc = statoOrdine(ord.righe);
      if (ord.stato_calc === 'terminato') {
        // Aggiorna stato Ordine su DB
        base44.entities.Ordine.update(ordineId, { stato: 'pronto' }).catch(() => {});
        const { [ordineId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ordineId]: ord };
    });
    setUpdating(null);
  };

  // Annulla singola riga
  const annullaRiga = async (ordineId, rigaId) => {
    setUpdating(rigaId);
    await base44.entities.RigaOrdine.update(rigaId, { stato: 'annullato' });
    setOrdini(prev => {
      const ord = { ...prev[ordineId] };
      ord.righe = ord.righe.filter(r => r.id !== rigaId);
      if (ord.righe.length === 0) {
        base44.entities.Ordine.update(ordineId, { stato: 'annullato' }).catch(() => {});
        const { [ordineId]: _, ...rest } = prev;
        return rest;
      }
      ord.stato_calc = statoOrdine(ord.righe);
      return { ...prev, [ordineId]: ord };
    });
    setUpdating(null);
  };

  // Annulla tutto l'ordine
  const annullaTutto = async (ordineId) => {
    setUpdating(ordineId + '_all');
    const ord = ordini[ordineId];
    await Promise.all(ord.righe.map(r => base44.entities.RigaOrdine.update(r.id, { stato: 'annullato' })));
    await base44.entities.Ordine.update(ordineId, { stato: 'annullato' }).catch(() => {});
    setOrdini(prev => { const { [ordineId]: _, ...rest } = prev; return rest; });
    setUpdating(null);
  };

  const nuoviCount = Object.values(ordini).filter(o => o.stato_calc === 'nuovo').length;

  return (
    <div className="min-h-screen bg-[#080808] p-4 pt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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
      ) : Object.keys(ordini).length === 0 ? (
        <div className="text-center py-20 text-white/40 font-body text-lg">
          <CheckCircle2 size={40} className="mx-auto mb-4 opacity-20" />
          Nessuna comanda in attesa
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          {Object.entries(ordini)
            .sort(([, a], [, b]) => {
              // Ordina: nuovi prima, poi in lavorazione
              const order = { nuovo: 0, ricevuto: 1, in_lavorazione: 2 };
              return (order[a.stato_calc] ?? 9) - (order[b.stato_calc] ?? 9);
            })
            .map(([ordineId, ord]) => {
              const isNuovo = ord.stato_calc === 'nuovo' || ord.stato_calc === 'ricevuto';
              const isInLav = ord.stato_calc === 'in_lavorazione';
              return (
                <div key={ordineId}
                  className={`border rounded-sm overflow-hidden ${isNuovo ? 'border-red-500/60 bg-[#1a0a0a]' : 'border-yellow-500/30 bg-[#111108]'}`}>

                  {/* Header ordine */}
                  <div className={`px-4 py-3 flex items-center justify-between gap-2 border-b ${isNuovo ? 'border-red-500/20 bg-red-900/10' : 'border-yellow-500/10 bg-yellow-900/5'}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl text-white">Tavolo {ord.numero}</span>
                      {isNuovo && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-body font-bold animate-pulse">NUOVO</span>}
                      {isInLav && <span className="text-xs bg-yellow-600/80 text-white px-2 py-0.5 rounded-full font-body">IN LAVORAZIONE</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Annulla tutto */}
                      <button
                        onClick={() => { if (window.confirm(`Annullare tutta la comanda del Tavolo ${ord.numero}?`)) annullaTutto(ordineId); }}
                        disabled={updating === ordineId + '_all'}
                        className="px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm font-body text-xs transition-all flex items-center gap-1.5"
                      >
                        {updating === ordineId + '_all' ? <Loader2 size={13} className="animate-spin" /> : <><Trash2 size={13} /> Annulla tutto</>}
                      </button>
                      {/* Presa in carico */}
                      {isNuovo && (
                        <button
                          onClick={() => prendiInCarico(ordineId)}
                          disabled={updating === ordineId}
                          className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-sm font-body text-sm font-bold transition-all flex items-center gap-2 min-w-[140px] justify-center"
                        >
                          {updating === ordineId ? <Loader2 size={15} className="animate-spin" /> : '🍳 Prendi in carico'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Righe articoli */}
                  <div className="divide-y divide-white/5">
                    {ord.righe.map(riga => {
                      const min = minutiDa(riga.sent_at || riga.created_date);
                      const isPronto = riga.stato === 'pronto';
                      return (
                        <div key={riga.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${isPronto ? 'opacity-40' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {riga.fase && (
                                <span className="w-5 h-5 rounded-full bg-[#C69C6D] text-[#0A0A0B] text-[10px] font-bold flex items-center justify-center shrink-0">{riga.fase}</span>
                              )}
                              <span className={`font-body text-lg font-semibold ${isPronto ? 'line-through text-white/40' : 'text-white'}`}>
                                {riga.quantita}× {riga.nome_item}
                              </span>
                              {riga.priorita === 'urgente' && <AlertCircle size={16} className="text-red-400" />}
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
                          <div className="flex items-center gap-2">
                            {/* Bottone pronto per singolo articolo (solo se in lavorazione) */}
                            {isInLav && !isPronto && (
                              <button
                                onClick={() => segnaArticoloPronto(ordineId, riga.id)}
                                disabled={updating === riga.id}
                                className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-sm font-body text-sm font-semibold transition-all flex items-center gap-2"
                              >
                                {updating === riga.id ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Pronto</>}
                              </button>
                            )}
                            {isPronto && <span className="text-green-400 font-body text-sm flex items-center gap-1"><CheckCircle2 size={14} /> Pronto</span>}
                            {/* Annulla singola riga */}
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
      )}
    </div>
  );
}