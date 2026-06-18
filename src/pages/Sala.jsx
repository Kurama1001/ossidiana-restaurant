import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, RefreshCw, Clock, Users, Receipt, Send, ChefHat, CheckCircle2 } from 'lucide-react';
import AdminComande from '@/components/admin/AdminComande';

// Stati semplificati per il cameriere
const STATO_CONFIG = {
  aperto:          { label: 'Aperta',        bg: 'bg-[#161618]',  border: 'border-[#E5E5E5]/15', text: 'text-[#E5E5E5]/50', dot: 'bg-[#E5E5E5]/30' },
  inviato:         { label: 'Inviata',        bg: 'bg-[#141420]',  border: 'border-blue-500/40',   text: 'text-blue-400',     dot: 'bg-blue-400' },
  in_preparazione: { label: 'In preparazione',bg: 'bg-[#1c1a10]',  border: 'border-yellow-500/40', text: 'text-yellow-400',   dot: 'bg-yellow-400 animate-pulse' },
  parziale_pronto: { label: 'In preparazione',bg: 'bg-[#1c1a10]',  border: 'border-yellow-500/40', text: 'text-yellow-400',   dot: 'bg-yellow-400 animate-pulse' },
  pronto:          { label: 'Terminata',      bg: 'bg-[#0f1f0f]',  border: 'border-green-500/50',  text: 'text-green-400',    dot: 'bg-green-500' },
  servito:         { label: 'Terminata',      bg: 'bg-[#0f1f0f]',  border: 'border-green-500/50',  text: 'text-green-400',    dot: 'bg-green-500' },
  da_pagare:       { label: 'Da pagare',      bg: 'bg-[#1a1028]',  border: 'border-purple-400/50', text: 'text-purple-400',   dot: 'bg-purple-400' },
};

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function Sala() {
  const [view, setView] = useState('home'); // 'home' | 'nuova'
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const stats = {
    totali: ordini.length,
    inPrep: ordini.filter(o => ['inviato', 'in_preparazione', 'parziale_pronto'].includes(o.stato)).length,
    terminate: ordini.filter(o => ['pronto', 'servito'].includes(o.stato)).length,
  };

  if (view === 'nuova') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] p-4 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => { setView('home'); load(); }}
              className="p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
              ←
            </button>
            <h1 className="font-display text-2xl text-white tracking-widest">Nuova Comanda</h1>
          </div>
          <AdminComande onGoToHome={() => { setView('home'); load(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 pt-20">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display text-3xl text-white tracking-widest">COMANDE</h1>
            <p className="font-body text-[#E5E5E5]/40 text-sm mt-0.5">oggi · {ordini.length} tavoli</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-3 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setView('nuova')}
              className="flex items-center gap-2 px-5 py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all">
              <Plus size={16} /> Nuova
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard label="Attive" value={stats.totali} color="text-white" />
          <StatCard label="In prep." value={stats.inPrep} color="text-yellow-400" />
          <StatCard label="Terminate" value={stats.terminate} color="text-green-400" />
        </div>

        {/* Lista comande */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}
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
                  <div key={ordine.id} className={`${cfg.bg} border ${cfg.border} rounded-sm p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-display text-4xl text-white">{ordine.numero_tavolo}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
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
                      <StatoBadgeCameriere stato={ordine.stato} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Legenda */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {[
            { dot: 'bg-[#E5E5E5]/30', label: 'Aperta' },
            { dot: 'bg-blue-400', label: 'Inviata in cucina' },
            { dot: 'bg-yellow-400', label: 'In preparazione' },
            { dot: 'bg-green-500', label: 'Terminata' },
            { dot: 'bg-purple-400', label: 'Da pagare' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 font-body text-xs text-[#E5E5E5]/30">
              <div className={`w-2 h-2 rounded-full ${item.dot}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#161618] border border-[#E5E5E5]/10 rounded-sm p-3 text-center">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="font-body text-xs text-[#E5E5E5]/40 mt-0.5">{label}</div>
    </div>
  );
}

function StatoBadgeCameriere({ stato }) {
  const map = {
    aperto:          { label: 'Aperta',         cls: 'border-[#E5E5E5]/15 text-[#E5E5E5]/40' },
    inviato:         { label: 'Inviata',         cls: 'border-blue-400/40 text-blue-400' },
    in_preparazione: { label: 'In preparazione', cls: 'border-yellow-400/40 text-yellow-400' },
    parziale_pronto: { label: 'In preparazione', cls: 'border-yellow-400/40 text-yellow-400' },
    pronto:          { label: 'Terminata ✓',    cls: 'border-green-400/40 text-green-400' },
    servito:         { label: 'Terminata ✓',    cls: 'border-green-400/40 text-green-400' },
    da_pagare:       { label: 'Da pagare',       cls: 'border-purple-400/40 text-purple-400' },
  };
  const cfg = map[stato] || map.aperto;
  return <span className={`font-body text-xs px-3 py-1 border rounded-full whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}