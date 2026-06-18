import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, RefreshCw, Clock, Users, Receipt, Trash2, X } from 'lucide-react';
import ComandaEditor from './ComandaEditor.jsx';

const STATO_CONFIG = {
  aperto:          { label: 'Aperta',          border: 'border-[#E5E5E5]/15', text: 'text-[#E5E5E5]/50', dot: 'bg-[#E5E5E5]/30' },
  inviato:         { label: 'In preparazione', border: 'border-yellow-500/40', text: 'text-yellow-400',    dot: 'bg-yellow-400 animate-pulse' },
  in_preparazione: { label: 'In preparazione', border: 'border-yellow-500/40', text: 'text-yellow-400',    dot: 'bg-yellow-400 animate-pulse' },
  parziale_pronto: { label: 'In preparazione', border: 'border-yellow-500/40', text: 'text-yellow-400',    dot: 'bg-yellow-400 animate-pulse' },
  pronto:          { label: 'Terminata',        border: 'border-green-500/50',  text: 'text-green-400',    dot: 'bg-green-500' },
  servito:         { label: 'Terminata',        border: 'border-green-500/50',  text: 'text-green-400',    dot: 'bg-green-500' },
  da_pagare:       { label: 'Da pagare',        border: 'border-purple-400/50', text: 'text-purple-400',   dot: 'bg-purple-400' },
};

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function AdminComande() {
  const [view, setView] = useState('lista'); // 'lista' | 'nuova' | 'modifica'
  const [ordineSelezionato, setOrdineSelezionato] = useState(null);
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAnnulla, setModalAnnulla] = useState(null);
  const [righeModal, setRigheModal] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const data = await base44.entities.Ordine.list('-created_date', 200);
    const attivi = data.filter(o =>
      !['chiuso', 'annullato'].includes(o.stato) &&
      new Date(o.created_date) >= oggi
    );
    setOrdini(attivi);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const goLista = () => { setView('lista'); setOrdineSelezionato(null); load(); };

  const apriModalAnnulla = async (ordine) => {
    setModalAnnulla(ordine);
    setLoadingModal(true);
    const righe = await base44.entities.RigaOrdine.filter({ ordine_id: ordine.id }, 'created_date', 200);
    setRigheModal(righe.filter(r => !['annullato', 'consegnato'].includes(r.stato)));
    setLoadingModal(false);
  };

  const annullaRigaModal = async (rigaId) => {
    setDeleting(rigaId);
    await base44.entities.RigaOrdine.update(rigaId, { stato: 'annullato' });
    setRigheModal(prev => prev.filter(r => r.id !== rigaId));
    setDeleting(null);
  };

  const annullaTuttoModal = async () => {
    if (!modalAnnulla) return;
    setDeleting('all');
    await Promise.all(righeModal.map(r => base44.entities.RigaOrdine.update(r.id, { stato: 'annullato' })));
    await base44.entities.Ordine.update(modalAnnulla.id, { stato: 'annullato' }).catch(() => {});
    setModalAnnulla(null);
    setRigheModal([]);
    setDeleting(null);
    load();
  };

  // Vista editor (nuova comanda o aggiunta a esistente)
  if (view === 'nuova' || view === 'modifica') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goLista}
            className="p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all text-lg leading-none">
            ←
          </button>
          <h2 className="font-display text-2xl text-white tracking-widest">
            {view === 'modifica' ? `Tavolo ${ordineSelezionato?.numero_tavolo} · Aggiungi` : 'Nuova Comanda'}
          </h2>
        </div>
        <ComandaEditor
          onSuccess={goLista}
          ordineEsistente={view === 'modifica' ? ordineSelezionato : null}
        />
      </div>
    );
  }

  // Vista lista
  const stats = {
    totali: ordini.length,
    inPrep: ordini.filter(o => ['inviato', 'in_preparazione', 'parziale_pronto'].includes(o.stato)).length,
    terminate: ordini.filter(o => ['pronto', 'servito'].includes(o.stato)).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-2xl text-white tracking-widest">Comande</h2>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-0.5">oggi · {ordini.length} tavoli</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setView('nuova')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all">
            <Plus size={15} /> Nuova
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Attive', value: stats.totali, color: 'text-white' },
          { label: 'In prep.', value: stats.inPrep, color: 'text-yellow-400' },
          { label: 'Terminate', value: stats.terminate, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161618] border border-[#E5E5E5]/10 rounded-sm p-3 text-center">
            <div className={`font-display text-2xl ${s.color}`}>{s.value}</div>
            <div className="font-body text-xs text-[#E5E5E5]/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-[#161618] animate-pulse rounded-sm" />)}
        </div>
      ) : ordini.length === 0 ? (
        <div className="text-center py-20 text-[#E5E5E5]/30 font-body">
          <Receipt size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-1">Nessuna comanda oggi</p>
          <p className="text-sm">Premi "Nuova" per iniziare</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordini
            .sort((a, b) => a.numero_tavolo - b.numero_tavolo)
            .map(ordine => {
              const cfg = STATO_CONFIG[ordine.stato] || STATO_CONFIG.aperto;
              const min = minutiDa(ordine.created_date);
              return (
                <div key={ordine.id}
                  className={`bg-[#161618] border ${cfg.border} rounded-sm p-4 cursor-pointer hover:bg-[#1a1a1c] transition-colors`}
                  onClick={() => { setOrdineSelezionato(ordine); setView('modifica'); }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="font-display text-4xl text-white shrink-0">{ordine.numero_tavolo}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className={`font-body text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[#E5E5E5]/35 font-body text-xs">
                          {ordine.coperti && <span className="flex items-center gap-1"><Users size={10} /> {ordine.coperti}</span>}
                          {min !== null && <span className="flex items-center gap-1"><Clock size={10} /> {min} min</span>}
                          <span className="text-[#C69C6D]">€{(ordine.totale || 0).toFixed(2)}</span>
                        </div>
                        {ordine.note_generali && (
                          <p className="font-body text-xs text-yellow-300/50 italic mt-0.5 line-clamp-1">📝 {ordine.note_generali}</p>
                        )}
                      </div>
                    </div>
                    {/* Pulsante annulla (ferma propagazione del click) */}
                    <button
                      onClick={e => { e.stopPropagation(); apriModalAnnulla(ordine); }}
                      className="shrink-0 text-xs font-body px-3 py-1.5 border border-red-500/30 text-red-400/70 hover:border-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-all flex items-center gap-1"
                    >
                      <Trash2 size={11} /> Annulla
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modale annullamento */}
      {modalAnnulla && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#161618] border border-red-500/30 rounded-sm w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]/10">
              <div>
                <h3 className="font-display text-xl text-white tracking-widest">Annulla Comanda</h3>
                <p className="font-body text-xs text-[#E5E5E5]/40 mt-0.5">Tavolo {modalAnnulla.numero_tavolo}</p>
              </div>
              <button onClick={() => { setModalAnnulla(null); setRigheModal([]); }}
                className="p-2 text-[#E5E5E5]/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingModal ? (
                <p className="text-center text-[#E5E5E5]/30 font-body py-6">Caricamento...</p>
              ) : righeModal.length === 0 ? (
                <p className="text-center text-[#E5E5E5]/30 font-body py-6">Nessun articolo da annullare</p>
              ) : (
                <div className="space-y-2">
                  {righeModal.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 bg-[#0A0A0B] border border-[#E5E5E5]/10 rounded-sm px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-white text-sm">{r.quantita}× {r.nome_item}</p>
                        {r.note && <p className="font-body text-xs text-yellow-300/50 italic">{r.note}</p>}
                      </div>
                      <button onClick={() => annullaRigaModal(r.id)} disabled={deleting === r.id}
                        className="shrink-0 p-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-sm transition-all">
                        {deleting === r.id ? <div className="w-4 h-4 border border-red-400/50 border-t-red-400 rounded-full animate-spin" /> : <X size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {righeModal.length > 0 && (
              <div className="p-4 border-t border-[#E5E5E5]/10">
                <button
                  onClick={() => { if (window.confirm('Annullare TUTTA la comanda?')) annullaTuttoModal(); }}
                  disabled={deleting === 'all'}
                  className="w-full py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 font-body text-sm tracking-widest uppercase rounded-sm transition-all flex items-center justify-center gap-2">
                  {deleting === 'all' ? <div className="w-4 h-4 border border-red-400/50 border-t-red-400 rounded-full animate-spin" /> : <><Trash2 size={14} /> Annulla tutto</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}