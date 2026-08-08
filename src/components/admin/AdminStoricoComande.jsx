import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, ChevronDown, ChevronUp, Clock, Users, UtensilsCrossed, Wine } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATO_LABELS = {
  aperto: 'Aperto', inviato: 'Inviato', parziale_pronto: 'Parziale', pronto: 'Pronto',
  servito: 'Servito', da_pagare: 'Da pagare', chiuso: 'Chiuso', annullato: 'Annullato',
};
const STATO_COLORS = {
  chiuso: 'text-green-400', da_pagare: 'text-purple-400', annullato: 'text-red-400',
  aperto: 'text-[#C69C6D]', inviato: 'text-blue-400', pronto: 'text-yellow-400', servito: 'text-cyan-400',
};

function isSameDay(dateStr, ref) {
  const d = new Date(dateStr);
  return d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export default function AdminStoricoComande() {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [periodo, setPeriodo] = useState('oggi');
  const [dataDa, setDataDa] = useState('');
  const [dataA, setDataA] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [righeMap, setRigheMap] = useState({});
  const [loadingRighe, setLoadingRighe] = useState(false);

  useEffect(() => {
    base44.entities.Ordine.list('-created_date', 500).then(data => {
      setOrdini(data);
      setLoading(false);
    });
  }, []);

  const loadRighe = async (ordineId) => {
    if (righeMap[ordineId]) return;
    setLoadingRighe(true);
    try {
      const r = await base44.entities.RigaOrdine.filter({ ordine_id: ordineId }, 'created_date', 300);
      setRigheMap(prev => ({ ...prev, [ordineId]: r }));
    } catch {}
    setLoadingRighe(false);
  };

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadRighe(id);
  };

  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

  const filteredByPeriod = useMemo(() => {
    if (periodo === 'tutto') return ordini;
    if (periodo === 'custom') {
      if (!dataDa && !dataA) return ordini;
      return ordini.filter(o => {
        const d = new Date(o.created_date);
        if (dataDa && d < new Date(dataDa + 'T00:00:00')) return false;
        if (dataA && d > new Date(dataA + 'T23:59:59')) return false;
        return true;
      });
    }
    return ordini.filter(o => {
      if (periodo === 'oggi') return isSameDay(o.created_date, today);
      if (periodo === 'ieri') return isSameDay(o.created_date, yesterday);
      if (periodo === 'settimana') return new Date(o.created_date) >= weekAgo;
      if (periodo === 'mese') return new Date(o.created_date) >= monthAgo;
      return true;
    });
  }, [ordini, periodo, dataDa, dataA]);

  const filtered = filteredByPeriod.filter(o => {
    if (filtroStato !== 'tutti' && o.stato !== filtroStato) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!String(o.numero_tavolo).includes(q) && !(o.cameriere_nome || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const comandeOggi = filtered.filter(o => isSameDay(o.created_date, today))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const comandeStorico = filtered.filter(o => !isSameDay(o.created_date, today))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totaleOggi = comandeOggi.filter(o => o.stato === 'chiuso' && o.pagato)
    .reduce((s, o) => s + (o.totale || 0), 0);
  const copertiOggi = comandeOggi.reduce((s, o) => s + (o.coperti || 0), 0);

  const renderComandaDetail = (ordine) => {
    const righe = righeMap[ordine.id] || [];
    if (loadingRighe && !righe.length) {
      return <p className="text-[#E5E5E5]/30 font-body text-sm py-4 text-center">Caricamento righe...</p>;
    }
    const righeValide = righe.filter(r => r.stato !== 'annullato');
    const righeCucina = righeValide.filter(r => r.reparto === 'cucina');
    const righeBar = righeValide.filter(r => r.reparto === 'bar');
    const totale = righeValide.reduce((s, r) => s + (r.prezzo_totale || 0), 0);

    const renderRiga = (r) => (
      <div key={r.id} className="px-3 py-2 flex items-start gap-2">
        <span className="font-body text-[#C69C6D] text-sm font-bold w-8 shrink-0">{r.quantita}×</span>
        <div className="flex-1 min-w-0">
          <span className="font-body text-white text-sm block">{r.nome_item}</span>
          {r.note && <span className="font-body text-yellow-300/60 text-xs italic block">📝 {r.note}</span>}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-body text-[10px] px-1.5 py-0.5 bg-[#C69C6D]/15 text-[#C69C6D] border border-[#C69C6D]/20 rounded-sm font-bold">F{r.fase || 1}</span>
            <span className={`font-body text-xs ${STATO_COLORS[r.stato] || 'text-[#E5E5E5]/40'}`}>{STATO_LABELS[r.stato] || r.stato}</span>
          </div>
        </div>
        <span className="font-body text-[#E5E5E5]/40 text-sm shrink-0">€{(r.prezzo_totale || 0).toFixed(2)}</span>
      </div>
    );

    return (
      <div className="border-t border-[#C69C6D]/10 px-4 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cucina */}
          <div className="border border-orange-500/20 rounded-sm">
            <div className="bg-orange-500/10 px-3 py-2 flex items-center gap-2 border-b border-orange-500/20">
              <UtensilsCrossed size={14} className="text-orange-400" />
              <span className="font-body text-xs uppercase tracking-widest text-orange-400 font-bold">Cucina</span>
              <span className="font-body text-xs text-orange-400/50 ml-auto">{righeCucina.length} art.</span>
            </div>
            <div className="divide-y divide-[#E5E5E5]/5">
              {righeCucina.length === 0
                ? <p className="text-[#E5E5E5]/20 font-body text-xs py-3 text-center">Nessuna pietanza</p>
                : righeCucina.map(renderRiga)}
            </div>
          </div>
          {/* Bar */}
          <div className="border border-blue-500/20 rounded-sm">
            <div className="bg-blue-500/10 px-3 py-2 flex items-center gap-2 border-b border-blue-500/20">
              <Wine size={14} className="text-blue-400" />
              <span className="font-body text-xs uppercase tracking-widest text-blue-400 font-bold">Bar</span>
              <span className="font-body text-xs text-blue-400/50 ml-auto">{righeBar.length} art.</span>
            </div>
            <div className="divide-y divide-[#E5E5E5]/5">
              {righeBar.length === 0
                ? <p className="text-[#E5E5E5]/20 font-body text-xs py-3 text-center">Nessuna bevanda</p>
                : righeBar.map(renderRiga)}
            </div>
          </div>
        </div>
        {/* Totale */}
        <div className="flex justify-between items-center border-t border-[#E5E5E5]/10 pt-3">
          <div className="flex items-center gap-4">
            {ordine.coperti > 0 && <span className="font-body text-xs text-[#E5E5E5]/40">{ordine.coperti} coperti</span>}
            {ordine.metodo_pagamento && <span className="font-body text-xs text-[#E5E5E5]/40">{ordine.metodo_pagamento}</span>}
          </div>
          <div className="flex items-center gap-3">
            {ordine.sconto > 0 && <span className="font-body text-xs text-green-400/70">Sconto -€{ordine.sconto.toFixed(2)}</span>}
            <span className="font-display text-xl text-[#C69C6D]">€{totale.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderComandaRow = (ordine, isToday) => {
    const isExp = expanded === ordine.id;
    return (
      <div key={ordine.id} className={`bg-[#161618] rounded-sm overflow-hidden border ${isToday ? 'border-[#C69C6D]/30' : 'border-[#C69C6D]/10'}`}>
        <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1a1a1c] transition-colors text-left"
          onClick={() => toggleExpand(ordine.id)}>
          {isToday && <span className="w-1 h-12 bg-[#C69C6D] rounded-full shrink-0" />}
          <span className="font-display text-xl text-white w-10 shrink-0">T{ordine.numero_tavolo}</span>
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm text-[#E5E5E5]/70 truncate">{ordine.cameriere_nome || '—'}</p>
            <p className="font-body text-xs text-[#E5E5E5]/30 flex items-center gap-1">
              <Clock size={10} />
              {ordine.created_date ? format(new Date(ordine.created_date), 'dd/MM/yy HH:mm', { locale: it }) : ''}
            </p>
          </div>
          {ordine.coperti > 0 && (
            <span className="font-body text-xs text-[#E5E5E5]/40 hidden sm:flex items-center gap-1 shrink-0">
              <Users size={11} /> {ordine.coperti}
            </span>
          )}
          <span className={`font-body text-xs shrink-0 ${STATO_COLORS[ordine.stato] || 'text-[#E5E5E5]/40'}`}>
            {STATO_LABELS[ordine.stato] || ordine.stato}
          </span>
          <span className="font-display text-lg text-[#C69C6D] w-20 text-right shrink-0">€{(ordine.totale || 0).toFixed(2)}</span>
          {isExp ? <ChevronUp size={16} className="text-[#E5E5E5]/30 shrink-0" /> : <ChevronDown size={16} className="text-[#E5E5E5]/30 shrink-0" />}
        </button>
        {isExp && renderComandaDetail(ordine)}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Storico Comande</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-3">
          <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest">Oggi</p>
          <p className="font-display text-2xl text-[#C69C6D]">{comandeOggi.length}</p>
          <p className="font-body text-xs text-[#E5E5E5]/30">comande</p>
        </div>
        <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-3">
          <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest">Coperti</p>
          <p className="font-display text-2xl text-white">{copertiOggi}</p>
          <p className="font-body text-xs text-[#E5E5E5]/30">oggi</p>
        </div>
        <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-3">
          <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest">Incasso</p>
          <p className="font-display text-2xl text-green-400">€{totaleOggi.toFixed(0)}</p>
          <p className="font-body text-xs text-[#E5E5E5]/30">oggi (pagato)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-2">
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
        <div className="flex flex-wrap gap-2 items-center">
          {[['oggi','Oggi'],['ieri','Ieri'],['settimana','7 gg'],['mese','30 gg'],['tutto','Tutto'],['custom','Personalizzato']].map(([val, lab]) => (
            <button key={val} onClick={() => setPeriodo(val)}
              className={`px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${periodo === val ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
              {lab}
            </button>
          ))}
          {periodo === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={dataDa} onChange={e => setDataDa(e.target.value)}
                className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-2 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D]" />
              <span className="text-[#E5E5E5]/30 text-xs">→</span>
              <input type="date" value={dataA} onChange={e => setDataA(e.target.value)}
                className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-2 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D]" />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : (
        <div className="space-y-6">
          {comandeOggi.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-display text-lg text-[#C69C6D] tracking-widest">OGGI</h3>
                <div className="flex-1 h-px bg-[#C69C6D]/15" />
                <span className="font-body text-xs text-[#E5E5E5]/40">{comandeOggi.length} comande</span>
              </div>
              <div className="space-y-2">{comandeOggi.map(o => renderComandaRow(o, true))}</div>
            </div>
          )}
          {comandeStorico.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-display text-lg text-[#E5E5E5]/50 tracking-widest">STORICO</h3>
                <div className="flex-1 h-px bg-[#E5E5E5]/10" />
                <span className="font-body text-xs text-[#E5E5E5]/30">{comandeStorico.length} comande</span>
              </div>
              <div className="space-y-2">{comandeStorico.map(o => renderComandaRow(o, false))}</div>
            </div>
          )}
          {filtered.length === 0 && (
            <p className="text-center py-16 text-[#E5E5E5]/30 font-body">Nessuna comanda trovata nel periodo selezionato.</p>
          )}
        </div>
      )}
    </div>
  );
}