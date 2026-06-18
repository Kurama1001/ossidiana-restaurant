import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATO_LABELS = { aperto:'Aperto', inviato:'Inviato', parziale_pronto:'Parziale', pronto:'Pronto', servito:'Servito', da_pagare:'Da pagare', chiuso:'Chiuso', annullato:'Annullato' };
const STATO_COLORS = { chiuso:'text-green-400', da_pagare:'text-purple-400', annullato:'text-red-400', aperto:'text-[#C69C6D]', inviato:'text-blue-400', pronto:'text-yellow-400' };

export default function StoricoComande() {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [expanded, setExpanded] = useState(null);
  const [righeMap, setRigheMap] = useState({});

  useEffect(() => {
    base44.entities.Ordine.list('-created_date', 200).then(data => {
      setOrdini(data);
      setLoading(false);
    });
  }, []);

  const loadRighe = async (ordineId) => {
    if (righeMap[ordineId]) return;
    const r = await base44.entities.RigaOrdine.filter({ ordine_id: ordineId }, 'created_date', 200);
    setRigheMap(prev => ({ ...prev, [ordineId]: r }));
  };

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadRighe(id);
  };

  const filtered = ordini.filter(o => {
    if (filtroStato !== 'tutti' && o.stato !== filtroStato) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!String(o.numero_tavolo).includes(q) && !(o.cameriere_nome || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totaleGiornaliero = filtered.filter(o => o.stato === 'chiuso' && o.pagato)
    .reduce((s, o) => s + (o.totale || 0), 0);

  const exportCSV = () => {
    const rows = [['Data','Tavolo','Cameriere','Stato','Totale','Pagato','Metodo']];
    filtered.forEach(o => {
      rows.push([
        o.created_date ? format(new Date(o.created_date), 'dd/MM/yyyy HH:mm') : '',
        o.numero_tavolo,
        o.cameriere_nome || '',
        STATO_LABELS[o.stato] || o.stato,
        (o.totale || 0).toFixed(2),
        o.pagato ? 'Sì' : 'No',
        o.metodo_pagamento || '',
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'storico_comande.csv'; a.click();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-widest">STORICO</h1>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-1">{filtered.length} ordini · Totale pagato: <span className="text-[#C69C6D]">€{totaleGiornaliero.toFixed(2)}</span></p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-sm transition-all">
          <Download size={15} /> CSV
        </button>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca tavolo o cameriere..."
            className="w-full bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-9 pr-4 py-2.5 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20" />
        </div>
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)}
          className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-4 py-2.5 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]">
          <option value="tutti">Tutti gli stati</option>
          {Object.entries(STATO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-[#E5E5E5]/30 font-body">Nessun ordine trovato.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(ordine => {
            const isExp = expanded === ordine.id;
            return (
              <div key={ordine.id} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm overflow-hidden">
                <button className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#1a1a1c] transition-colors text-left"
                  onClick={() => toggleExpand(ordine.id)}>
                  <span className="font-display text-xl text-white w-12">T{ordine.numero_tavolo}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-[#E5E5E5]/70 truncate">{ordine.cameriere_nome || '—'}</p>
                    <p className="font-body text-xs text-[#E5E5E5]/30">
                      {ordine.created_date ? format(new Date(ordine.created_date), 'dd/MM/yy HH:mm', { locale: it }) : ''}
                    </p>
                  </div>
                  <span className={`font-body text-xs ${STATO_COLORS[ordine.stato] || 'text-[#E5E5E5]/40'}`}>
                    {STATO_LABELS[ordine.stato] || ordine.stato}
                  </span>
                  <span className="font-display text-lg text-[#C69C6D] w-20 text-right">€{(ordine.totale || 0).toFixed(2)}</span>
                  {isExp ? <ChevronUp size={16} className="text-[#E5E5E5]/30" /> : <ChevronDown size={16} className="text-[#E5E5E5]/30" />}
                </button>

                {isExp && (
                  <div className="border-t border-[#C69C6D]/10 px-4 py-3">
                    {righeMap[ordine.id] ? (
                      <div className="space-y-1">
                        {righeMap[ordine.id].map(r => (
                          <div key={r.id} className="flex justify-between text-sm font-body">
                            <span className="text-[#E5E5E5]/60">{r.quantita}× {r.nome_item}</span>
                            <span className="text-[#E5E5E5]/40">€{(r.prezzo_totale || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {ordine.sconto > 0 && (
                          <div className="flex justify-between text-sm font-body text-green-400/70 pt-1">
                            <span>Sconto</span><span>-€{ordine.sconto.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-body font-semibold border-t border-[#E5E5E5]/10 pt-2 mt-2">
                          <span className="text-[#E5E5E5]/50">Totale</span>
                          <span className="text-[#C69C6D]">€{(ordine.totale || 0).toFixed(2)}</span>
                        </div>
                        {ordine.metodo_pagamento && (
                          <p className="text-xs text-[#E5E5E5]/30 font-body mt-1">Pagamento: {ordine.metodo_pagamento}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[#E5E5E5]/30 font-body text-sm">Caricamento...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}