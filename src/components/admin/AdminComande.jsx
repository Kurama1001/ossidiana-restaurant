import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, Trash2, Send, Search, StickyNote, AlertCircle, ChevronRight, Receipt } from 'lucide-react';

const CAT_LABELS = {
  antipasti:'Antipasti', primi:'Primi', romanissimi:'Romanissimi', secondi:'Secondi',
  contorni:'Contorni', dolci:'Dolci', acqua:'Acqua', vino:'Vino',
  birra:'Birra', cocktail:'Cocktail', caffe_amari:'Caffè & Amari', bevande:'Bevande',
};
const CAT_CUCINA = ['antipasti','primi','romanissimi','secondi','contorni','dolci'];

export default function AdminComande() {
  const [menuItems, setMenuItems] = useState([]);
  const [righe, setRighe] = useState([]);
  const [righeInviate, setRigheInviate] = useState([]);
  const [ordine, setOrdine] = useState(null);
  const [numeroTavolo, setNumeroTavolo] = useState('');
  const [coperti, setCoperti] = useState(2);
  const [noteGenerali, setNoteGenerali] = useState('');
  const [noteRiga, setNoteRiga] = useState({});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('tutti');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.MenuItem.filter({ active: true }, 'sortOrder', 200),
      base44.auth.me().catch(() => null),
    ]).then(([menu, me]) => {
      setMenuItems(menu);
      setUser(me);
      setLoading(false);
    });
  }, []);

  const iniziaOrdine = async () => {
    if (!numeroTavolo) return;
    const ordiniAperti = await base44.entities.Ordine.filter({ numero_tavolo: parseInt(numeroTavolo) }, '-created_date', 5);
    const aperto = ordiniAperti.find(o => !['chiuso','annullato'].includes(o.stato));
    if (aperto) {
      setOrdine(aperto);
      const rigs = await base44.entities.RigaOrdine.filter({ ordine_id: aperto.id }, 'created_date', 200);
      setRigheInviate(rigs.filter(r => r.stato !== 'bozza' && r.stato !== 'annullato'));
      setNoteGenerali(aperto.note_generali || '');
      setCoperti(aperto.coperti || 2);
    }
    setShowSetup(false);
  };

  const getOrCreaOrdine = async () => {
    if (ordine) return ordine;
    const nuovo = await base44.entities.Ordine.create({
      tavolo_id: `tavolo_${numeroTavolo}`,
      numero_tavolo: parseInt(numeroTavolo),
      cameriere_id: user?.id || '',
      cameriere_nome: user?.full_name || '',
      stato: 'aperto',
      coperti,
      note_generali: noteGenerali,
      totale: 0,
    });
    setOrdine(nuovo);
    return nuovo;
  };

  const aggiungiItem = (item) => {
    setRighe(prev => {
      const existing = prev.find(r => r.menu_item_id === item.id && !noteRiga[r._tmp]);
      if (existing) return prev.map(r => r.menu_item_id === item.id && !noteRiga[r._tmp]
        ? { ...r, quantita: r.quantita + 1, prezzo_totale: (r.quantita + 1) * r.prezzo_unitario }
        : r
      );
      return [...prev, {
        _tmp: Date.now() + Math.random(),
        menu_item_id: item.id,
        nome_item: item.name,
        categoria: item.category,
        reparto: item.reparto || (CAT_CUCINA.includes(item.category) ? 'cucina' : 'bar'),
        quantita: 1,
        prezzo_unitario: item.price,
        prezzo_totale: item.price,
        stato: 'bozza',
        priorita: 'normale',
      }];
    });
  };

  const cambiaQty = (key, delta) => setRighe(prev => prev.map(r => r._tmp === key
    ? { ...r, quantita: Math.max(1, r.quantita + delta), prezzo_totale: Math.max(1, r.quantita + delta) * r.prezzo_unitario }
    : r
  ));

  const rimuoviRiga = (key) => setRighe(prev => prev.filter(r => r._tmp !== key));

  const togglePriorita = (key) => setRighe(prev => prev.map(r => r._tmp === key
    ? { ...r, priorita: r.priorita === 'urgente' ? 'normale' : 'urgente' }
    : r
  ));

  const totale = righe.reduce((s, r) => s + r.prezzo_totale, 0)
    + righeInviate.reduce((s, r) => s + (r.prezzo_totale || 0), 0);

  const inviaComanda = async () => {
    if (righe.length === 0) return;
    setSending(true);
    const ord = await getOrCreaOrdine();
    const now = new Date().toISOString();
    const create = await Promise.all(righe.map(r => base44.entities.RigaOrdine.create({
      ordine_id: ord.id,
      tavolo_id: ord.tavolo_id,
      numero_tavolo: parseInt(numeroTavolo),
      menu_item_id: r.menu_item_id,
      nome_item: r.nome_item,
      categoria: r.categoria,
      reparto: r.reparto,
      quantita: r.quantita,
      prezzo_unitario: r.prezzo_unitario,
      prezzo_totale: r.prezzo_totale,
      note: noteRiga[r._tmp] || '',
      stato: 'inviato',
      priorita: r.priorita,
      sent_at: now,
    })));
    await base44.entities.Ordine.update(ord.id, { stato: 'inviato', note_generali: noteGenerali, coperti, totale });
    setRigheInviate(prev => [...prev, ...create]);
    setRighe([]);
    setNoteRiga({});
    setSending(false);
  };

  const nuovoTavolo = () => {
    setShowSetup(true);
    setNumeroTavolo('');
    setOrdine(null);
    setRighe([]);
    setRigheInviate([]);
    setNoteGenerali('');
    setCoperti(2);
    setNoteRiga({});
  };

  const categories = [...new Set(menuItems.map(i => i.category))];
  const filtered = menuItems.filter(item => {
    if (catFilter !== 'tutti' && item.category !== catFilter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const cucina = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'cucina');
  const bar = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'bar');

  if (loading) return <div className="py-20 text-center text-[#E5E5E5]/30 font-body">Caricamento...</div>;

  return (
    <div className="flex gap-5" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>

      {/* ===== PANNELLO SINISTRA: MENU ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header tavolo */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          {showSetup ? (
            <h2 className="font-display text-xl text-white tracking-widest">Seleziona Tavolo</h2>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="font-display text-2xl text-white tracking-widest leading-none">Tavolo {numeroTavolo}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button onClick={() => setCoperti(c => Math.max(1, c-1))} className="text-[#E5E5E5]/40 hover:text-white w-5 h-5 flex items-center justify-center">−</button>
                    <span className="font-body text-xs text-[#E5E5E5]/50">{coperti} coperti</span>
                    <button onClick={() => setCoperti(c => c+1)} className="text-[#E5E5E5]/40 hover:text-white w-5 h-5 flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
              <button onClick={nuovoTavolo}
                className="text-xs font-body text-[#E5E5E5]/40 hover:text-[#C69C6D] border border-[#E5E5E5]/15 hover:border-[#C69C6D]/40 px-3 py-1.5 rounded-sm transition-colors">
                Cambia tavolo
              </button>
            </>
          )}
        </div>

        {/* Setup tavolo inline (sopra il menu) */}
        {showSetup && (
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm p-5 mb-4 shrink-0">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-[#E5E5E5]/40 font-body uppercase tracking-widest mb-1.5">Numero Tavolo *</label>
                <input
                  type="number" min="1" placeholder="Es. 5" autoFocus
                  value={numeroTavolo} onChange={e => setNumeroTavolo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && iniziaOrdine()}
                  className="w-28 bg-[#0A0A0B] border border-[#E5E5E5]/20 text-white px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none font-display text-2xl tracking-widest text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-[#E5E5E5]/40 font-body uppercase tracking-widest mb-1.5">Coperti</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCoperti(c => Math.max(1, c-1))} className="w-10 h-10 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D] text-lg">−</button>
                  <span className="text-white font-display text-xl w-8 text-center">{coperti}</span>
                  <button onClick={() => setCoperti(c => c+1)} className="w-10 h-10 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D] text-lg">+</button>
                </div>
              </div>
              <button
                onClick={iniziaOrdine} disabled={!numeroTavolo}
                className="px-6 py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center gap-2 h-[46px]"
              >
                Avvia <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Ricerca + categorie — sempre visibili */}
        <div className="shrink-0 mb-3">
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca articolo..."
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-9 pr-4 py-2.5 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCatFilter('tutti')}
              className={`shrink-0 px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${catFilter === 'tutti' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
              Tutti
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`shrink-0 px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${catFilter === c ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                {CAT_LABELS[c] || c}
              </button>
            ))}
          </div>
        </div>

        {/* Griglia articoli scrollabile */}
        <div className="flex-1 overflow-y-auto pr-1">
          {cucina.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                <span className="font-body text-xs text-orange-400/80 uppercase tracking-widest">Cucina</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {cucina.map(item => (
                  <ArticoloCard key={item.id} item={item} color="orange"
                    qty={righe.filter(r => r.menu_item_id === item.id).reduce((s,r) => s+r.quantita, 0)}
                    onAdd={() => aggiungiItem(item)}
                    disabled={showSetup}
                  />
                ))}
              </div>
            </div>
          )}
          {bar.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <span className="font-body text-xs text-blue-400/80 uppercase tracking-widest">Bar</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {bar.map(item => (
                  <ArticoloCard key={item.id} item={item} color="blue"
                    qty={righe.filter(r => r.menu_item_id === item.id).reduce((s,r) => s+r.quantita, 0)}
                    onAdd={() => aggiungiItem(item)}
                    disabled={showSetup}
                  />
                ))}
              </div>
            </div>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-[#E5E5E5]/25 font-body text-sm py-10">Nessun risultato</p>
          )}
        </div>
      </div>

      {/* ===== PANNELLO DESTRA: COMANDA ===== */}
      <div className="w-80 shrink-0 bg-[#0d0d0f] border border-[#C69C6D]/15 rounded-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#C69C6D]/15 shrink-0">
          <h3 className="font-display text-lg text-white tracking-widest">
            {numeroTavolo ? `Comanda · T${numeroTavolo}` : 'Comanda'}
          </h3>
          <p className="font-body text-xs text-[#E5E5E5]/35 mt-0.5">{righe.length > 0 ? `${righe.length} in bozza` : 'vuota'}</p>
        </div>

        {/* Già inviati */}
        {righeInviate.length > 0 && (
          <div className="border-b border-[#C69C6D]/10 max-h-36 overflow-y-auto shrink-0">
            <p className="font-body text-xs text-[#E5E5E5]/30 uppercase tracking-widest px-4 pt-3 pb-1">Già inviati</p>
            {righeInviate.map(r => (
              <div key={r.id} className="px-4 py-1.5 flex items-center justify-between gap-2">
                <span className="font-body text-sm text-[#E5E5E5]/55 truncate flex-1">{r.quantita}× {r.nome_item}</span>
                <StatusBadge stato={r.stato} />
              </div>
            ))}
          </div>
        )}

        {/* Bozza */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {righe.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Receipt size={28} className="text-[#E5E5E5]/10 mb-3" />
              <p className="text-[#E5E5E5]/25 font-body text-sm">
                {showSetup ? 'Avvia una comanda per aggiungere articoli' : 'Tocca un articolo per aggiungerlo'}
              </p>
            </div>
          ) : righe.map(r => (
            <div key={r._tmp} className={`border rounded-sm p-3 ${r.reparto === 'bar' ? 'border-blue-900/50 bg-[#0e0e1a]' : 'border-[#C69C6D]/20 bg-[#161618]'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-body text-white text-sm font-medium leading-snug flex-1">{r.nome_item}</span>
                <button onClick={() => rimuoviRiga(r._tmp)} className="text-red-400/40 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => cambiaQty(r._tmp, -1)} className="w-7 h-7 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Minus size={11}/></button>
                  <span className="text-white font-body w-6 text-center text-sm">{r.quantita}</span>
                  <button onClick={() => cambiaQty(r._tmp, 1)} className="w-7 h-7 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Plus size={11}/></button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => togglePriorita(r._tmp)} title="Urgente"
                    className={`p-1.5 rounded-sm border transition-all ${r.priorita === 'urgente' ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/20 hover:border-red-400/40'}`}>
                    <AlertCircle size={12} />
                  </button>
                  <span className={`font-body font-semibold text-sm ${r.reparto === 'bar' ? 'text-blue-400' : 'text-[#C69C6D]'}`}>
                    €{r.prezzo_totale.toFixed(2)}
                  </span>
                </div>
              </div>
              <input
                value={noteRiga[r._tmp] || ''}
                onChange={e => setNoteRiga(prev => ({ ...prev, [r._tmp]: e.target.value }))}
                placeholder="Nota (es. senza aglio)..."
                className="w-full mt-2 bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-2.5 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
              />
            </div>
          ))}
        </div>

        {/* Note generali */}
        <div className="px-3 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote size={11} className="text-[#E5E5E5]/30" />
            <span className="font-body text-xs text-[#E5E5E5]/30">Note generali</span>
          </div>
          <textarea value={noteGenerali} onChange={e => setNoteGenerali(e.target.value)} rows={2}
            placeholder="Allergie, richieste speciali..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-2 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20 resize-none" />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#C69C6D]/15 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <span className="font-body text-xs text-[#E5E5E5]/40">Totale</span>
            <span className="font-display text-2xl text-[#C69C6D]">€{totale.toFixed(2)}</span>
          </div>
          <button onClick={inviaComanda} disabled={sending || righe.length === 0 || showSetup}
            className="w-full py-3.5 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            <Send size={15} />
            {sending ? 'Invio...' : `Invia${righe.length > 0 ? ` (${righe.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArticoloCard({ item, color, qty, onAdd, disabled }) {
  const isBar = color === 'blue';
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className={`relative rounded-sm p-3 text-left transition-all w-full border
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:opacity-90'}
        ${isBar ? 'bg-[#0e0e1a] border-blue-900/40 hover:border-blue-400/50' : 'bg-[#161618] border-[#E5E5E5]/10 hover:border-[#C69C6D]/50'}
      `}
    >
      {qty > 0 && (
        <span className={`absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center
          ${isBar ? 'bg-blue-500 text-white' : 'bg-[#C69C6D] text-[#0A0A0B]'}`}>
          {qty}
        </span>
      )}
      <p className="font-body text-white text-sm font-medium leading-snug pr-6">{item.name}</p>
      {item.description && (
        <p className="font-body text-[#E5E5E5]/35 text-xs mt-0.5 line-clamp-1">{item.description}</p>
      )}
      <p className={`font-body font-semibold text-sm mt-1.5 ${isBar ? 'text-blue-400' : 'text-[#C69C6D]'}`}>
        €{Number(item.price).toFixed(2)}
      </p>
    </button>
  );
}

function StatusBadge({ stato }) {
  const config = {
    inviato:         'bg-red-500/20 text-red-300 border-red-500/40',
    ricevuto:        'bg-blue-500/20 text-blue-300 border-blue-500/40',
    in_preparazione: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    pronto:          'bg-green-500/20 text-green-400 border-green-500/40',
    consegnato:      'bg-[#E5E5E5]/10 text-[#E5E5E5]/40 border-[#E5E5E5]/15',
  };
  const labels = { inviato:'inviato', ricevuto:'ricevuto', in_preparazione:'in prep.', pronto:'PRONTO', consegnato:'consegnato' };
  return <span className={`text-xs px-2 py-0.5 border rounded-full font-body whitespace-nowrap ${config[stato] || ''}`}>{labels[stato] || stato}</span>;
}