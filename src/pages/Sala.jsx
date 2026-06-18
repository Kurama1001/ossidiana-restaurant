import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, RefreshCw, Clock, Users, ChevronRight, Receipt } from 'lucide-react';

const STATO_CONFIG = {
  aperto:          { label: 'Aperto',     bg: 'bg-[#161618]',  border: 'border-[#E5E5E5]/15', text: 'text-[#E5E5E5]/60', dot: 'bg-[#E5E5E5]/30' },
  inviato:         { label: 'In cucina',  bg: 'bg-[#1a1a2a]',  border: 'border-blue-500/50',   text: 'text-blue-400',     dot: 'bg-blue-500' },
  parziale_pronto: { label: 'Parziale',   bg: 'bg-[#1f1a10]',  border: 'border-yellow-500/40', text: 'text-yellow-400',   dot: 'bg-yellow-400' },
  pronto:          { label: 'Pronto',     bg: 'bg-[#1a2a10]',  border: 'border-green-500/50',  text: 'text-green-400',    dot: 'bg-green-500' },
  servito:         { label: 'Servito',    bg: 'bg-[#1a1a1a]',  border: 'border-[#C69C6D]/30',  text: 'text-[#C69C6D]',   dot: 'bg-[#C69C6D]' },
  da_pagare:       { label: 'Da pagare',  bg: 'bg-[#2a1025]',  border: 'border-purple-400/60', text: 'text-purple-400',   dot: 'bg-purple-400' },
};

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function Sala() {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNuovaComanda, setShowNuovaComanda] = useState(false);
  const [numeroTavolo, setNumeroTavolo] = useState('');
  const [coperti, setCoperti] = useState(2);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    // Carica tutti gli ordini aperti di oggi
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

  const apriNuovaComanda = async () => {
    if (!numeroTavolo) return;
    setCreating(true);
    // Controlla se esiste già un ordine aperto per quel tavolo oggi
    const esistente = ordini.find(o => o.numero_tavolo === parseInt(numeroTavolo));
    if (esistente) {
      navigate(`/comanda/${esistente.id}`);
      return;
    }
    const me = await base44.auth.me().catch(() => null);
    const nuovoOrdine = await base44.entities.Ordine.create({
      tavolo_id: `tavolo_${numeroTavolo}`,
      numero_tavolo: parseInt(numeroTavolo),
      cameriere_id: me?.id || '',
      cameriere_nome: me?.full_name || '',
      stato: 'aperto',
      coperti: parseInt(coperti),
      totale: 0,
    });
    setCreating(false);
    navigate(`/comanda/${nuovoOrdine.id}`);
  };

  const stats = {
    totali: ordini.length,
    inCucina: ordini.filter(o => ['inviato', 'parziale_pronto'].includes(o.stato)).length,
    daPagare: ordini.filter(o => o.stato === 'da_pagare').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 md:p-6 pt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-widest">SALA</h1>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-1">Comande attive oggi</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-3 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowNuovaComanda(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all"
          >
            <Plus size={16} /> Nuova Comanda
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Tavoli attivi" value={stats.totali} color="text-white" />
        <StatCard label="In cucina/bar" value={stats.inCucina} color="text-blue-400" />
        <StatCard label="Da pagare" value={stats.daPagare} color="text-purple-400" />
      </div>

      {/* Modale Nuova Comanda */}
      {showNuovaComanda && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowNuovaComanda(false)}>
          <div className="bg-[#161618] border border-[#C69C6D]/30 rounded-sm p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-2xl text-white tracking-widest mb-6">Nuova Comanda</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-2">Numero Tavolo *</label>
                <input
                  type="number" min="1" placeholder="Es. 5" autoFocus
                  value={numeroTavolo} onChange={e => setNumeroTavolo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && apriNuovaComanda()}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-white px-4 py-4 rounded-sm focus:border-[#C69C6D] outline-none font-display text-3xl tracking-widest text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-2">Coperti</label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setCoperti(c => Math.max(1, c - 1))}
                    className="w-12 h-12 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D] text-xl transition-all">−</button>
                  <span className="text-white font-display text-3xl w-10 text-center">{coperti}</span>
                  <button onClick={() => setCoperti(c => c + 1)}
                    className="w-12 h-12 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D] text-xl transition-all">+</button>
                </div>
              </div>
              <button
                onClick={apriNuovaComanda} disabled={!numeroTavolo || creating}
                className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <ChevronRight size={18} />
                {creating ? 'Apertura...' : 'Apri Comanda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista comande */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-[#161618] animate-pulse rounded-sm" />)}
        </div>
      ) : ordini.length === 0 ? (
        <div className="text-center py-20 text-[#E5E5E5]/40 font-body">
          <Receipt size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg mb-2">Nessuna comanda attiva</p>
          <p className="text-sm">Premi "Nuova Comanda" per iniziare</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordini
            .sort((a, b) => a.numero_tavolo - b.numero_tavolo)
            .map(ordine => {
              const cfg = STATO_CONFIG[ordine.stato] || STATO_CONFIG.aperto;
              const min = minutiDa(ordine.created_date);
              return (
                <button
                  key={ordine.id}
                  onClick={() => navigate(`/comanda/${ordine.id}`)}
                  className={`${cfg.bg} border ${cfg.border} rounded-sm p-5 text-left hover:opacity-90 active:scale-95 transition-all w-full`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest">Tavolo</p>
                      <p className="font-display text-5xl text-white leading-none">{ordine.numero_tavolo}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className={`font-body text-xs ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#E5E5E5]/40 font-body text-xs">
                      <span className="flex items-center gap-1"><Users size={11} /> {ordine.coperti || '—'}</span>
                      {min !== null && <span className="flex items-center gap-1"><Clock size={11} /> {min} min</span>}
                      {ordine.cameriere_nome && <span>{ordine.cameriere_nome.split(' ')[0]}</span>}
                    </div>
                    <span className="font-body text-sm text-[#C69C6D] font-semibold">€{(ordine.totale || 0).toFixed(2)}</span>
                  </div>
                  {ordine.note_generali && (
                    <p className="mt-2 font-body text-xs text-yellow-300/60 italic line-clamp-1">📝 {ordine.note_generali}</p>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        {Object.entries(STATO_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 font-body text-xs text-[#E5E5E5]/30">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#161618] border border-[#E5E5E5]/10 rounded-sm p-3 text-center">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="font-body text-xs text-[#E5E5E5]/40 mt-1">{label}</div>
    </div>
  );
}