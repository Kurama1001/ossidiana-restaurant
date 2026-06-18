import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, RefreshCw, Users } from 'lucide-react';

const STATO_CONFIG = {
  libero:          { label: 'Libero',         bg: 'bg-[#1a2a1a]', border: 'border-green-600/50',  text: 'text-green-400',  dot: 'bg-green-500' },
  occupato:        { label: 'Occupato',        bg: 'bg-[#2a1e10]', border: 'border-[#C69C6D]/60',  text: 'text-[#C69C6D]', dot: 'bg-[#C69C6D]' },
  in_preparazione: { label: 'In prep.',        bg: 'bg-[#1a1a2a]', border: 'border-blue-500/50',   text: 'text-blue-400',  dot: 'bg-blue-500' },
  pronto:          { label: 'Pronto',          bg: 'bg-[#2a2a10]', border: 'border-yellow-400/60', text: 'text-yellow-400',dot: 'bg-yellow-400' },
  da_pagare:       { label: 'Da pagare',       bg: 'bg-[#2a1020]', border: 'border-purple-400/60', text: 'text-purple-400',dot: 'bg-purple-400' },
};

export default function Sala() {
  const [tavoli, setTavoli] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    base44.entities.Tavolo.list('numero', 50).then(data => {
      setTavoli(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTavoloClick = (tavolo) => {
    navigate(`/comanda/${tavolo.id}`);
  };

  const stats = {
    liberi: tavoli.filter(t => t.stato === 'libero').length,
    occupati: tavoli.filter(t => t.stato !== 'libero').length,
    da_pagare: tavoli.filter(t => t.stato === 'da_pagare').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-widest">SALA</h1>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-1">Dashboard tavoli</p>
        </div>
        <button onClick={load} className="p-3 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Liberi', value: stats.liberi, color: 'text-green-400' },
          { label: 'Occupati', value: stats.occupati, color: 'text-[#C69C6D]' },
          { label: 'Da pagare', value: stats.da_pagare, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#161618] border border-[#E5E5E5]/10 rounded-sm p-3 text-center">
            <div className={`font-display text-2xl ${s.color}`}>{s.value}</div>
            <div className="font-body text-xs text-[#E5E5E5]/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Griglia tavoli */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 bg-[#161618] animate-pulse rounded-sm" />
          ))}
        </div>
      ) : tavoli.length === 0 ? (
        <div className="text-center py-20 text-[#E5E5E5]/40 font-body">
          <p className="text-lg mb-2">Nessun tavolo configurato</p>
          <p className="text-sm">Aggiungili dal pannello Admin</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tavoli.map(tavolo => {
            const cfg = STATO_CONFIG[tavolo.stato] || STATO_CONFIG.libero;
            return (
              <button
                key={tavolo.id}
                onClick={() => handleTavoloClick(tavolo)}
                className={`${cfg.bg} border ${cfg.border} rounded-sm p-5 flex flex-col items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all min-h-[140px] w-full`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`font-body text-xs uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
                </div>
                <div className="font-display text-4xl text-white">{tavolo.numero}</div>
                {tavolo.nome_sala && (
                  <div className="font-body text-xs text-[#E5E5E5]/40">{tavolo.nome_sala}</div>
                )}
                <div className="flex items-center gap-1 font-body text-xs text-[#E5E5E5]/30">
                  <Users size={11} /> {tavolo.coperti || '—'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        {Object.entries(STATO_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 font-body text-xs text-[#E5E5E5]/40">
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>
    </div>
  );
}