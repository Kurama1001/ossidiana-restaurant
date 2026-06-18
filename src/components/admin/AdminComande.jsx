import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, Trash2, Send, Search, StickyNote, AlertCircle, ChevronRight } from 'lucide-react';

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
  const [fase, setFase] = useState('setup'); // 'setup' | 'ordine'

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
    // Cerca ordine aperto per questo tavolo
    const ordiniAperti = await base44.entities.Ordine.filter({ numero_tavolo: parseInt(numeroTavolo), stato: 'aperto' }, '-created_date', 1);
    if (ordiniAperti.length > 0) {
      const ord = ordiniAperti[0];
      setOrdine(ord);
      const rigs = await base44.entities.RigaOrdine.filter({ ordine_id: ord.id }, 'created_date', 200);
      setRigheInviate(rigs.filter(r => r.stato !== 'bozza' && r.stato !== 'annullato'));
      setNoteGenerali(ord.note_generali || '');
      setCoperti(ord.coperti || 2);
    }
    setFase('ordine');
  };

  const getOrCreaOrdine = async () => {
    if (ordine) return ordine;
    const nuovoOrdine = await base44.entities.Ordine.create({
      tavolo_id: `tavolo_${numeroTavolo}`,
      numero_tavolo: parseInt(numeroTavolo),
      cameriere_id: user?.id || '',
      cameriere_nome: user?.full_name || '',
      stato: 'aperto',
      coperti,
      note_generali: noteGenerali,
      totale: 0,
    });
    setOrdine(nuovoOrdine);
    return nuovoOrdine;
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
    alert('Comanda inviata a cucina/bar!');
  };

  const nuovoTavolo = () => {
    setFase('setup');
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

  // --- FASE SETUP ---
  if (fase === 'setup') {
    return (
      <div>
        <h2 className="font-display text-2xl text-white tracking-widest mb-6">Nuova Comanda</h2>
        <div className="max-w-sm bg-[#161618] border border-[#C69C6D]/15 rounded-sm p-6 space-y-5">
          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-2">Numero Tavolo *</label>
            <input
              type="number" min="1" placeholder="Es. 5"
              value={numeroTavolo} onChange={e => setNumeroTavolo(e.target.value)}
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none font-body text-2xl font-bold tracking-widest"
            />
          </div>
          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-2">Coperti</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setCoperti(c => Math.max(1, c-1))} className="w-10 h-10 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Minus size={15}/></button>
              <span className="text-white font-display text-2xl w-8 text-center">{coperti}</span>
              <button onClick={() => setCoperti(c => c+1)} className="w-10 h-10 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Plus size={15}/></button>
            </div>
          </div>
          <button
            onClick={iniziaOrdine} disabled={!numeroTavolo}
            className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            Inizia Comanda <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // --- FASE ORDINE ---
  return (
    <div className="flex flex-col lg:flex-row gap-0 -mx-0" style={{ maxHeight: '80vh' }}>
      {/* Pannello menu */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl text-white tracking-widest">Tavolo {numeroTavolo}</h2>
            <p className="font-body text-xs text-[#E5E5E5]/40">{coperti} coperti</p>
          </div>
          <button onClick={nuovoTavolo} className="text-xs font-body text-[#E5E5E5]/40 hover:text-[#C69C6D] border border-[#E5E5E5]/15 px-3 py-1.5 rounded-sm transition-colors">
            Cambia tavolo
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-9 pr-4 py-2.5 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button onClick={() => setCatFilter('tutti')}
            className={`shrink-0 px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${catFilter === 'tutti' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
            Tutti
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`shrink-0 px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${catFilter === c ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
              {CAT_LABELS[c] || c}
            </button>
          ))}
        </div>

        {cucina.length > 0 && (
          <div className="mb-5">
            <h3 className="font-body text-xs text-orange-400 tracking-widest uppercase mb-2">🍽 Cucina</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cucina.map(item => (
                <button key={item.id} onClick={() => aggiungiItem(item)}
                  className="bg-[#161618] border border-[#E5E5E5]/10 hover:border-[#C69C6D]/40 rounded-sm p-3 text-left transition-all active:scale-95 flex justify-between items-center">
                  <div>
                    <p className="font-body text-white text-sm font-medium">{item.name}</p>
                    {item.description && <p className="font-body text-[#E5E5E5]/40 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                  </div>
                  <span className="font-body text-[#C69C6D] font-semibold text-sm ml-3 shrink-0">€{Number(item.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {bar.length > 0 && (
          <div>
            <h3 className="font-body text-xs text-blue-400 tracking-widest uppercase mb-2">🍹 Bar</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bar.map(item => (
                <button key={item.id} onClick={() => aggiungiItem(item)}
                  className="bg-[#12121e] border border-blue-900/30 hover:border-blue-400/40 rounded-sm p-3 text-left transition-all active:scale-95 flex justify-between items-center">
                  <div>
                    <p className="font-body text-white text-sm font-medium">{item.name}</p>
                    {item.description && <p className="font-body text-[#E5E5E5]/40 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
                  </div>
                  <span className="font-body text-blue-400 font-semibold text-sm ml-3 shrink-0">€{Number(item.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pannello comanda */}
      <div className="lg:w-88 w-full bg-[#0d0d0d] border border-[#C69C6D]/15 rounded-sm flex flex-col lg:ml-4 mt-4 lg:mt-0 overflow-hidden">
        <div className="p-4 border-b border-[#C69C6D]/15">
          <h3 className="font-display text-lg text-white tracking-widest">Comanda · T{numeroTavolo}</h3>
          <p className="font-body text-xs text-[#E5E5E5]/40">{righe.length} in bozza</p>
        </div>

        {righeInviate.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-[#C69C6D]/10">
            <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest mb-2">Già inviati</p>
            {righeInviate.map(r => (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <span className="font-body text-sm text-[#E5E5E5]/60">{r.quantita}× {r.nome_item}</span>
                <StatusBadge stato={r.stato} />
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {righe.length === 0 ? (
            <p className="text-[#E5E5E5]/30 font-body text-sm text-center py-8">Seleziona articoli dal menu</p>
          ) : righe.map(r => (
            <div key={r._tmp} className={`border rounded-sm p-3 ${r.reparto === 'bar' ? 'border-blue-900/40 bg-[#0e0e18]' : 'border-[#C69C6D]/20 bg-[#161618]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-body text-white text-sm font-medium flex-1">{r.nome_item}</span>
                <button onClick={() => rimuoviRiga(r._tmp)} className="text-red-400/50 hover:text-red-400 transition-colors ml-2">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiaQty(r._tmp, -1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Minus size={13}/></button>
                  <span className="text-white font-body w-6 text-center">{r.quantita}</span>
                  <button onClick={() => cambiaQty(r._tmp, 1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Plus size={13}/></button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePriorita(r._tmp)}
                    className={`p-1.5 rounded-sm border transition-all ${r.priorita === 'urgente' ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/30 hover:border-red-400/40'}`}>
                    <AlertCircle size={13} />
                  </button>
                  <span className="font-body text-[#C69C6D] font-semibold text-sm">€{r.prezzo_totale.toFixed(2)}</span>
                </div>
              </div>
              <input
                value={noteRiga[r._tmp] || ''}
                onChange={e => setNoteRiga(prev => ({ ...prev, [r._tmp]: e.target.value }))}
                placeholder="Note cucina/bar..."
                className="w-full mt-2 bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
              />
            </div>
          ))}
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote size={12} className="text-[#E5E5E5]/40" />
            <span className="font-body text-xs text-[#E5E5E5]/40">Note generali</span>
          </div>
          <textarea value={noteGenerali} onChange={e => setNoteGenerali(e.target.value)} rows={2}
            placeholder="Allergie, richieste speciali..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-2 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20 resize-none" />
        </div>

        <div className="p-4 border-t border-[#C69C6D]/15 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-body text-[#E5E5E5]/50">Totale</span>
            <span className="font-display text-2xl text-[#C69C6D]">€{totale.toFixed(2)}</span>
          </div>
          <button onClick={inviaComanda} disabled={sending || righe.length === 0}
            className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            <Send size={16} />
            {sending ? 'Invio...' : 'Invia Comanda'}
          </button>
        </div>
      </div>
    </div>
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
  return <span className={`text-xs px-2 py-0.5 border rounded-full font-body ${config[stato] || ''}`}>{labels[stato] || stato}</span>;
}