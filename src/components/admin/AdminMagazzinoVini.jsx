import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Minus, PackagePlus, AlertTriangle, XCircle, RotateCcw, Warehouse } from 'lucide-react';

const LOW_STOCK = 3;

const WINE_ORDER = ['bollicine', 'bianchi', 'rossi', 'dolci'];
const WINE_LABELS = {
  bollicine: 'Bollicine',
  bianchi: 'Vini Bianchi',
  rossi: 'Vini Rossi',
  dolci: 'Vini Dolci',
};

export default function AdminMagazzinoVini() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [carico, setCarico] = useState(null); // { wine, qty }
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    base44.entities.MenuItem.filter({ category: 'vino' }, 'sortOrder', 500)
      .then(setWines)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Aggiornamenti in tempo reale dalla sezione Vini / comande
  useEffect(() => {
    const unsub = base44.entities.MenuItem.subscribe((event) => {
      if (event.type === 'update' && event.data) {
        setWines(prev => prev.map(w => w.id === event.data.id ? { ...w, ...event.data } : w));
      } else if (event.type === 'create' || event.type === 'delete') {
        load();
      }
    });
    return unsub;
  }, []);

  const esauriti = wines.filter(w => (w.quantita ?? 0) <= 0);
  const scarsi = wines.filter(w => (w.quantita ?? 0) > 0 && w.quantita <= LOW_STOCK);
  const daOrdinare = wines.filter(w => w.da_ordinare);
  const totaleBottiglie = wines.reduce((s, w) => s + (w.quantita ?? 0), 0);

  const cambiaQty = async (wine, delta) => {
    const newQ = Math.max(0, (wine.quantita ?? 0) + delta);
    setBusyId(wine.id);
    try {
      await base44.entities.MenuItem.update(wine.id, {
        quantita: newQ,
        ...(delta > 0 && wine.da_ordinare ? { da_ordinare: false } : {}),
      });
      setWines(prev => prev.map(w => w.id === wine.id ? { ...w, quantita: newQ, da_ordinare: delta > 0 ? false : w.da_ordinare } : w));
    } finally {
      setBusyId(null);
    }
  };

  const toggleDaOrdinare = async (wine) => {
    await base44.entities.MenuItem.update(wine.id, { da_ordinare: !wine.da_ordinare });
    setWines(prev => prev.map(w => w.id === wine.id ? { ...w, da_ordinare: !wine.da_ordinare } : w));
  };

  const confermaCarico = async () => {
    if (!carico || !carico.qty || carico.qty <= 0) { setCarico(null); return; }
    const newQ = (carico.wine.quantita ?? 0) + parseInt(carico.qty);
    await base44.entities.MenuItem.update(carico.wine.id, { quantita: newQ, da_ordinare: false });
    setWines(prev => prev.map(w => w.id === carico.wine.id ? { ...w, quantita: newQ, da_ordinare: false } : w));
    setCarico(null);
  };

  const filtered = wines.filter(w =>
    !search || w.name.toLowerCase().includes(search.toLowerCase()) || (w.cantina || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = WINE_ORDER.reduce((acc, wt) => {
    const items = filtered.filter(w => w.wine_type === wt).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (items.length > 0) acc[wt] = items;
    return acc;
  }, {});

  return (
    <div className="mb-14">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-5 mb-6">
        <h2 className="font-display text-3xl md:text-4xl text-white tracking-widest whitespace-nowrap flex items-center gap-3">
          <Warehouse size={26} className="text-[#C69C6D]" /> Magazzino Vini
        </h2>
        <div className="flex-1 h-px bg-[#C69C6D]/15" />
        <span className="font-body text-sm text-[#E5E5E5]/40 whitespace-nowrap">{totaleBottiglie} bottiglie totali</span>
      </div>

      {/* Alert */}
      {!loading && (esauriti.length > 0 || scarsi.length > 0 || daOrdinare.length > 0) && (
        <div className="space-y-2 mb-6">
          {esauriti.length > 0 && (
            <div className="flex items-start gap-3 border border-red-400/40 bg-red-400/10 rounded-sm px-4 py-3">
              <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="font-body text-sm text-red-300">
                <span className="font-semibold">Finiti ({esauriti.length}):</span>{' '}
                {esauriti.map(w => w.name).join(' · ')}
              </p>
            </div>
          )}
          {scarsi.length > 0 && (
            <div className="flex items-start gap-3 border border-amber-400/40 bg-amber-400/10 rounded-sm px-4 py-3">
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="font-body text-sm text-amber-300">
                <span className="font-semibold">In esaurimento ({scarsi.length}, ≤{LOW_STOCK} bott.):</span>{' '}
                {scarsi.map(w => `${w.name} (${w.quantita})`).join(' · ')}
              </p>
            </div>
          )}
          {daOrdinare.length > 0 && (
            <div className="flex items-start gap-3 border border-[#C69C6D]/40 bg-[#C69C6D]/10 rounded-sm px-4 py-3">
              <RotateCcw size={16} className="text-[#C69C6D] shrink-0 mt-0.5" />
              <p className="font-body text-sm text-[#E0C6A8]">
                <span className="font-semibold">Da riordinare ({daOrdinare.length}):</span>{' '}
                {daOrdinare.map(w => w.name).join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca vino o cantina..."
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none w-56"
          />
        </div>
        <span className="text-[#E5E5E5]/30 font-body text-sm">({filtered.length} vini)</span>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-[#E5E5E5]/20 font-body text-sm py-8 text-center">Nessun vino in magazzino.</p>
      ) : Object.entries(grouped).map(([wt, items]) => (
        <div key={wt} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-display text-xl text-[#C69C6D] tracking-widest">{WINE_LABELS[wt]}</h3>
            <div className="flex-1 h-px bg-[#C69C6D]/10" />
            <span className="font-body text-xs text-[#E5E5E5]/30">{items.reduce((s, w) => s + (w.quantita ?? 0), 0)} bott.</span>
          </div>
          <div>
            {items.map(wine => (
              <StockRow
                key={wine.id}
                wine={wine}
                busy={busyId === wine.id}
                onQty={cambiaQty}
                onCarico={setCarico}
                onRiordina={toggleDaOrdinare}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Modal carico */}
      {carico && (
        <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4" onClick={() => setCarico(null)}>
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-2xl text-white mb-1">Carico bottiglie</h3>
            <p className="font-body text-sm text-[#E5E5E5]/40 mb-4">{carico.wine.name} — giacenza attuale: {carico.wine.quantita ?? 0}</p>
            <input
              type="number" min="1" step="1" placeholder="Quante bottiglie entrate?" autoFocus
              value={carico.qty || ''} onChange={e => setCarico(c => ({ ...c, qty: e.target.value }))}
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20"
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCarico(null)}
                className="flex-1 px-4 py-3 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-sm">Annulla</button>
              <button onClick={confermaCarico} disabled={!carico.qty}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] rounded-sm font-body text-sm font-bold disabled:opacity-40">
                <PackagePlus size={15} /> Carica
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockRow({ wine, busy, onQty, onCarico, onRiordina }) {
  const q = wine.quantita ?? 0;
  const esaurito = q <= 0;
  const scarso = q > 0 && q <= LOW_STOCK;

  const badgeClass = esaurito
    ? 'bg-red-400/15 border-red-400/40 text-red-400'
    : scarso
      ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
      : 'bg-green-400/10 border-green-400/30 text-green-400';

  return (
    <div className={`flex flex-wrap items-center gap-3 py-3 border-b border-[#E5E5E5]/5 last:border-0 ${esaurito ? 'opacity-80' : ''}`}>
      {/* Nome + info */}
      <div className="flex-1 min-w-[180px]">
        <p className="font-body text-white text-sm leading-snug">
          {wine.name}
          {wine.annata && <span className="text-[#706A66] ml-2">{wine.annata}</span>}
          {wine.da_ordinare && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-[#C69C6D]/15 border border-[#C69C6D]/40 text-[#C69C6D] px-1.5 py-0.5 rounded-sm">Da ordinare</span>}
        </p>
        <p className="font-body text-xs text-[#706A66]">
          {[wine.cantina, wine.regione].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      {/* Giacenza */}
      <span className={`font-body text-xs font-semibold border rounded-sm px-2.5 py-1 whitespace-nowrap ${badgeClass}`}>
        {esaurito ? 'ESHAURITO' : `${q} bott.`}
      </span>

      {/* Controlli quantità */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => onQty(wine, -1)} disabled={busy || q <= 0} title="Scarica 1 bottiglia"
          className="w-9 h-9 border border-[#E5E5E5]/20 text-white rounded-sm flex items-center justify-center hover:border-[#C69C6D] disabled:opacity-30">
          <Minus size={13} />
        </button>
        <span className="font-body text-white font-semibold text-sm w-8 text-center">{q}</span>
        <button onClick={() => onQty(wine, +1)} disabled={busy} title="Aggiungi 1 bottiglia"
          className="w-9 h-9 border border-[#E5E5E5]/20 text-white rounded-sm flex items-center justify-center hover:border-[#C69C6D] disabled:opacity-30">
          <Plus size={13} />
        </button>
      </div>

      {/* Azioni */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => onCarico({ wine, qty: '' })} title="Carico bottiglie (nuovo ordine)"
          className="flex items-center gap-1.5 px-3 h-9 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-xs transition-all">
          <PackagePlus size={13} /> Carico
        </button>
        <button onClick={() => onRiordina(wine)} title={wine.da_ordinare ? 'Annulla riordino' : 'Segna da riordinare'}
          className={`flex items-center gap-1.5 px-3 h-9 border rounded-sm font-body text-xs transition-all ${wine.da_ordinare ? 'border-[#C69C6D] text-[#C69C6D] bg-[#C69C6D]/10' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D]'}`}>
          <RotateCcw size={13} /> {wine.da_ordinare ? 'Ordinato?' : 'Riordina'}
        </button>
      </div>
    </div>
  );
}