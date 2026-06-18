import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, Trash2, Send, ChevronLeft, Search, StickyNote, AlertCircle } from 'lucide-react';

const CAT_LABELS = {
  antipasti:'Antipasti', primi:'Primi', romanissimi:'Romanissimi', secondi:'Secondi',
  contorni:'Contorni', dolci:'Dolci', acqua:'Acqua', vino:'Vino',
  birra:'Birra', cocktail:'Cocktail', caffe_amari:'Caffè & Amari', bevande:'Bevande',
};
const CAT_CUCINA = ['antipasti','primi','romanissimi','secondi','contorni','dolci'];

export default function Comanda() {
  const { tavoloId } = useParams();
  const navigate = useNavigate();

  const [tavolo, setTavolo] = useState(null);
  const [ordine, setOrdine] = useState(null);
  const [righe, setRighe] = useState([]); // righe bozza locali
  const [righeInviate, setRigheInviate] = useState([]); // già inviate
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('tutti');
  const [noteGenerali, setNoteGenerali] = useState('');
  const [coperti, setCoperti] = useState(2);
  const [noteRiga, setNoteRiga] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const [tav, menu, me] = await Promise.all([
        base44.entities.Tavolo.filter({ id: tavoloId }, '-created_date', 1).then(r => r[0]),
        base44.entities.MenuItem.filter({ active: true }, 'sortOrder', 200),
        base44.auth.me().catch(() => null),
      ]);
      setTavolo(tav);
      setMenuItems(menu);
      setUser(me);

      // Cerca ordine aperto
      if (tav?.ordine_attivo_id) {
        const righeEsistenti = await base44.entities.RigaOrdine.filter({ ordine_id: tav.ordine_attivo_id }, 'created_date', 200);
        const ordineAttivo = await base44.entities.Ordine.filter({ id: tav.ordine_attivo_id }, '-created_date', 1).then(r => r[0]);
        setOrdine(ordineAttivo);
        setRigheInviate(righeEsistenti.filter(r => r.stato !== 'bozza' && r.stato !== 'annullato'));
        setNoteGenerali(ordineAttivo?.note_generali || '');
        setCoperti(ordineAttivo?.coperti || 2);
      }
      setLoading(false);
    };
    init();
  }, [tavoloId]);

  const getOrCreaOrdine = async () => {
    if (ordine) return ordine;
    const nuovoOrdine = await base44.entities.Ordine.create({
      tavolo_id: tavoloId,
      numero_tavolo: tavolo?.numero,
      cameriere_id: user?.id || '',
      cameriere_nome: user?.full_name || '',
      stato: 'aperto',
      coperti,
      note_generali: noteGenerali,
      totale: 0,
    });
    await base44.entities.Tavolo.update(tavoloId, { stato: 'occupato', ordine_attivo_id: nuovoOrdine.id });
    setOrdine(nuovoOrdine);
    return nuovoOrdine;
  };

  const aggiungiItem = (item) => {
    setRighe(prev => {
      const existing = prev.find(r => r.menu_item_id === item.id && !r.note);
      if (existing) return prev.map(r => r.menu_item_id === item.id && !r.note ? { ...r, quantita: r.quantita + 1, prezzo_totale: (r.quantita + 1) * r.prezzo_unitario } : r);
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

  const cambiaQty = (key, delta) => {
    setRighe(prev => prev.map(r => r._tmp === key
      ? { ...r, quantita: Math.max(1, r.quantita + delta), prezzo_totale: Math.max(1, r.quantita + delta) * r.prezzo_unitario }
      : r
    ));
  };

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
    const promises = righe.map(r => base44.entities.RigaOrdine.create({
      ordine_id: ord.id,
      tavolo_id: tavoloId,
      numero_tavolo: tavolo?.numero,
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
    }));
    const create = await Promise.all(promises);
    await base44.entities.Ordine.update(ord.id, {
      stato: 'inviato',
      note_generali: noteGenerali,
      coperti,
      totale,
    });
    await base44.entities.Tavolo.update(tavoloId, { stato: 'occupato' });
    setRigheInviate(prev => [...prev, ...create]);
    setRighe([]);
    setSending(false);
    alert('Comanda inviata a cucina/bar!');
  };

  const segnaConsegnato = async (riga) => {
    await base44.entities.RigaOrdine.update(riga.id, { stato: 'consegnato', delivered_at: new Date().toISOString() });
    setRigheInviate(prev => prev.map(r => r.id === riga.id ? { ...r, stato: 'consegnato' } : r));
  };

  const richiediConto = async () => {
    if (!ordine) return;
    await base44.entities.Tavolo.update(tavoloId, { stato: 'da_pagare' });
    await base44.entities.Ordine.update(ordine.id, { stato: 'da_pagare', totale });
    alert('Conto richiesto! Il tavolo è ora in stato "da pagare".');
    navigate('/sala');
  };

  const categories = [...new Set(menuItems.map(i => i.category))];
  const filtered = menuItems.filter(item => {
    if (catFilter !== 'tutti' && item.category !== catFilter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const cucina = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'cucina');
  const bar = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'bar');

  if (loading) return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-body">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col lg:flex-row">
      {/* Pannello menu sinistra */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/sala')} className="p-2 text-[#E5E5E5]/50 hover:text-white transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-display text-2xl text-white tracking-widest">Tavolo {tavolo?.numero}</h1>
            <p className="font-body text-[#E5E5E5]/40 text-xs">{tavolo?.nome_sala}</p>
          </div>
        </div>

        {/* Coperti */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[#E5E5E5]/50 font-body text-sm">Coperti:</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCoperti(c => Math.max(1, c-1))} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Minus size={13}/></button>
            <span className="text-white font-body w-6 text-center">{coperti}</span>
            <button onClick={() => setCoperti(c => c+1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Plus size={13}/></button>
          </div>
        </div>

        {/* Ricerca */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca piatto o bevanda..."
            className="w-full bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-9 pr-4 py-2.5 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20" />
        </div>

        {/* Categorie */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
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

        {/* Cucina */}
        {cucina.length > 0 && (
          <div className="mb-5">
            <h3 className="font-body text-xs text-[#C69C6D] tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full" /> 🍽 Cucina
            </h3>
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

        {/* Bar */}
        {bar.length > 0 && (
          <div>
            <h3 className="font-body text-xs text-blue-400 tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full" /> 🍹 Bar
            </h3>
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

      {/* Pannello comanda destra */}
      <div className="lg:w-96 bg-[#111] border-t lg:border-t-0 lg:border-l border-[#C69C6D]/15 flex flex-col">
        <div className="p-4 border-b border-[#C69C6D]/15">
          <h2 className="font-display text-xl text-white tracking-widest">Comanda</h2>
          <p className="font-body text-xs text-[#E5E5E5]/40 mt-1">{righe.length} articoli in bozza</p>
        </div>

        {/* Righe inviate */}
        {righeInviate.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-[#C69C6D]/10">
            <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest mb-2">Già inviati</p>
            {righeInviate.map(r => (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <span className="font-body text-sm text-[#E5E5E5]/60">{r.quantita}× {r.nome_item}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge stato={r.stato} />
                  {r.stato === 'pronto' && (
                    <button onClick={() => segnaConsegnato(r)}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded-sm font-body hover:bg-green-500 transition-all">
                      Consegna
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bozza */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {righe.length === 0 ? (
            <p className="text-[#E5E5E5]/30 font-body text-sm text-center py-8">Nessun articolo.<br/>Seleziona dal menu.</p>
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
                  <button onClick={() => cambiaQty(r._tmp, -1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]">
                    <Minus size={13} />
                  </button>
                  <span className="text-white font-body w-6 text-center">{r.quantita}</span>
                  <button onClick={() => cambiaQty(r._tmp, 1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]">
                    <Plus size={13} />
                  </button>
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
                placeholder="Note per cucina/bar..."
                className="w-full mt-2 bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
              />
            </div>
          ))}
        </div>

        {/* Note generali */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote size={12} className="text-[#E5E5E5]/40" />
            <span className="font-body text-xs text-[#E5E5E5]/40">Note generali</span>
          </div>
          <textarea value={noteGenerali} onChange={e => setNoteGenerali(e.target.value)} rows={2}
            placeholder="Allergie, richieste speciali..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-2 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20 resize-none" />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#C69C6D]/15 space-y-2">
          <div className="flex justify-between items-center mb-3">
            <span className="font-body text-[#E5E5E5]/50">Totale</span>
            <span className="font-display text-2xl text-[#C69C6D]">€{totale.toFixed(2)}</span>
          </div>
          <button onClick={inviaComanda} disabled={sending || righe.length === 0}
            className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2">
            <Send size={16} />
            {sending ? 'Invio in corso...' : 'Invia Comanda'}
          </button>
          {ordine && (
            <button onClick={richiediConto}
              className="w-full py-3 border border-purple-400/50 text-purple-400 hover:bg-purple-400/10 font-body text-sm tracking-widest uppercase rounded-sm transition-all">
              Richiedi Conto
            </button>
          )}
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
    bozza:           'bg-[#E5E5E5]/5 text-[#E5E5E5]/30 border-[#E5E5E5]/10',
  };
  const labels = { inviato:'inviato', ricevuto:'ricevuto', in_preparazione:'in prep.', pronto:'PRONTO', consegnato:'consegnato', bozza:'bozza' };
  return (
    <span className={`text-xs px-2 py-0.5 border rounded-full font-body ${config[stato] || ''}`}>
      {labels[stato] || stato}
    </span>
  );
}