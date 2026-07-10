import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { buildPrintPayload, createKitchenPrintJob } from '@/utils/printJobHelper';
import {
  Plus, Minus, Trash2, Send, ChevronLeft, Search, StickyNote,
  AlertCircle, Users, Receipt, Clock, CheckCircle2
} from 'lucide-react';

const CAT_LABELS = {
  antipasti:'Antipasti', primi:'Primi', romanissimi:'Romanissimi', secondi:'Secondi',
  contorni:'Contorni', dolci:'Dolci', acqua:'Acqua', vino:'Vino',
  birra:'Birra', cocktail:'Cocktail', caffe_amari:'Caffè & Amari', bevande:'Bevande',
};
const CAT_CUCINA = ['antipasti','primi','romanissimi','secondi','contorni','dolci'];

export default function Comanda() {
  const { ordineId } = useParams();
  const navigate = useNavigate();

  const [ordine, setOrdine] = useState(null);
  const [righe, setRighe] = useState([]);          // bozza locale
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
  const [tab, setTab] = useState('menu'); // 'menu' | 'comanda'
  const [success, setSuccess] = useState(false);
  const [printError, setPrintError] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [ord, menu, me] = await Promise.all([
        base44.entities.Ordine.filter({ id: ordineId }, '-created_date', 1).then(r => r[0]).catch(() => null),
        base44.entities.MenuItem.filter({ active: true }, 'sortOrder', 200),
        base44.auth.me().catch(() => null),
      ]);
      setOrdine(ord);
      setMenuItems(menu);
      setUser(me);
      if (ord) {
        const rigs = await base44.entities.RigaOrdine.filter({ ordine_id: ord.id }, 'created_date', 200);
        setRigheInviate(rigs.filter(r => r.stato !== 'bozza' && r.stato !== 'annullato'));
        setNoteGenerali(ord.note_generali || '');
        setCoperti(ord.coperti || 2);
      }
      setLoading(false);
    };
    init();
  }, [ordineId]);

  const aggiungiItem = (item) => {
    setRighe(prev => {
      const existing = prev.find(r => r.menu_item_id === item.id && !noteRiga[r._tmp]);
      if (existing) return prev.map(r =>
        r.menu_item_id === item.id && !noteRiga[r._tmp]
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
    // Su mobile switcha automaticamente alla comanda dopo aggiunta
    // setTab('comanda'); // Commentato: lascia il menu visibile per aggiungere più articoli
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

  const totaleInviato = righeInviate.reduce((s, r) => s + (r.prezzo_totale || 0), 0);
  const totaleBozza = righe.reduce((s, r) => s + r.prezzo_totale, 0);
  const totale = totaleInviato + totaleBozza;

  const inviaComanda = async () => {
    if (righe.length === 0) return;
    setSending(true);
    const now = new Date().toISOString();
    const nuove = await Promise.all(righe.map(r => base44.entities.RigaOrdine.create({
      ordine_id: ordine.id,
      tavolo_id: ordine.tavolo_id,
      numero_tavolo: ordine.numero_tavolo,
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

    // Merge created records with original righe data for print payload
    const createdRighe = righe.map((r, i) => ({
      ...r,
      id: nuove[i].id,
      note: noteRiga[r._tmp] || '',
      stato: 'inviato',
    }));

    await base44.entities.Ordine.update(ordine.id, {
      stato: 'inviato',
      note_generali: noteGenerali,
      coperti,
      totale,
    });

    // Crea PrintJob per la stampante cucina (solo righe cucina, solo nuovi articoli)
    const righeCucina = createdRighe.filter(r => r.reparto === 'cucina');
    let printJobOk = true;
    if (righeCucina.length > 0) {
      const payload = buildPrintPayload({
        ordineId: ordine.id,
        numeroTavolo: ordine.numero_tavolo,
        coperti,
        noteGenerali,
        user,
        righe: righeCucina,
        createdAt: now,
        repartoFilter: null,
        isAddition: true,
      });
      try {
        await createKitchenPrintJob(payload, ordine.id, user, 'kitchen_order_addition');
      } catch (e) {
        console.error('Errore creazione PrintJob:', e);
        printJobOk = false;
      }
    }

    setOrdine(prev => ({ ...prev, stato: 'inviato', totale }));
    setRigheInviate(prev => [...prev, ...nuove]);
    setRighe([]);
    setNoteRiga({});
    setSending(false);

    if (printJobOk) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setPrintError(true);
      setTimeout(() => setPrintError(false), 3500);
    }
    setTab('comanda'); // Mostra la comanda dopo invio
  };

  const segnaConsegnato = async (riga) => {
    await base44.entities.RigaOrdine.update(riga.id, { stato: 'consegnato', delivered_at: new Date().toISOString() });
    setRigheInviate(prev => prev.map(r => r.id === riga.id ? { ...r, stato: 'consegnato' } : r));
  };

  const richiediConto = async () => {
    if (!ordine) return;
    await base44.entities.Ordine.update(ordine.id, { stato: 'da_pagare', totale });
    alert('Conto richiesto! Il tavolo è ora "da pagare".');
    navigate('/sala');
  };

  const salvaCopertiNote = async () => {
    if (!ordine) return;
    await base44.entities.Ordine.update(ordine.id, { coperti, note_generali: noteGenerali });
  };

  const categories = [...new Set(menuItems.map(i => i.category))];
  const filtered = menuItems.filter(item => {
    if (catFilter !== 'tutti' && item.category !== catFilter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const cucina = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'cucina');
  const bar = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'bar');

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-body">
      <div className="w-8 h-8 border-2 border-[#C69C6D]/30 border-t-[#C69C6D] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col">
      {/* Toast successo/errore stampa */}
      {success && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-sm font-body text-sm font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle2 size={16} /> Articoli aggiunti e inviati alla stampante
        </div>
      )}
      {printError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-sm font-body text-sm font-semibold shadow-lg flex items-center gap-2">
          <AlertCircle size={16} /> Errore: articoli inviati ma stampa non riuscita
        </div>
      )}
      {/* Header fisso */}
      <div className="sticky top-0 z-30 bg-[#0A0A0B] border-b border-[#C69C6D]/15 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sala')} className="p-2 text-[#E5E5E5]/50 hover:text-white transition-colors -ml-2">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="font-display text-xl text-white tracking-widest leading-none">Tavolo {ordine?.numero_tavolo}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1.5">
                <button onClick={() => setCoperti(c => Math.max(1, c-1))} className="w-5 h-5 text-[#E5E5E5]/50 hover:text-white">−</button>
                <span className="font-body text-xs text-[#E5E5E5]/50 flex items-center gap-1"><Users size={10} /> {coperti}</span>
                <button onClick={() => setCoperti(c => c+1)} className="w-5 h-5 text-[#E5E5E5]/50 hover:text-white">+</button>
              </div>
              <span className="text-[#E5E5E5]/20">·</span>
              <span className="font-body text-xs text-[#C69C6D] font-semibold">€{totale.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {/* Badge bozza */}
        {righe.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="bg-[#C69C6D] text-[#0A0A0B] text-xs font-bold px-2 py-0.5 rounded-full">{righe.length}</span>
          </div>
        )}
      </div>

      {/* Tab mobile: menu | comanda */}
      <div className="flex border-b border-[#C69C6D]/10 lg:hidden">
        <button onClick={() => setTab('menu')}
          className={`flex-1 py-3 font-body text-sm tracking-wide transition-all ${tab === 'menu' ? 'border-b-2 border-[#C69C6D] text-[#C69C6D]' : 'text-[#E5E5E5]/40'}`}>
          Menu
        </button>
        <button onClick={() => setTab('comanda')}
          className={`flex-1 py-3 font-body text-sm tracking-wide transition-all relative ${tab === 'comanda' ? 'border-b-2 border-[#C69C6D] text-[#C69C6D]' : 'text-[#E5E5E5]/40'}`}>
          Comanda
          {righe.length > 0 && <span className="absolute top-2 right-6 bg-[#C69C6D] text-[#0A0A0B] text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{righe.length}</span>}
        </button>
      </div>

      {/* Corpo a due colonne su desktop, tab su mobile */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== PANNELLO MENU ===== */}
        <div className={`flex-1 overflow-y-auto p-4 ${tab === 'comanda' ? 'hidden lg:block' : 'block'}`}>

          {/* Ricerca */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca piatto o bevanda..."
              className="w-full bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-9 pr-10 py-3 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30 hover:text-white">×</button>
            )}
          </div>

          {/* Filtro categorie */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button onClick={() => setCatFilter('tutti')}
              className={`shrink-0 px-3 py-2 rounded-sm text-xs font-body border transition-all ${catFilter === 'tutti' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
              Tutti
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`shrink-0 px-3 py-2 rounded-sm text-xs font-body border transition-all ${catFilter === c ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                {CAT_LABELS[c] || c}
              </button>
            ))}
          </div>

          {/* Sezione Cucina */}
          {cucina.length > 0 && (
            <div className="mb-5">
              <h3 className="font-body text-xs text-orange-400/80 tracking-widest uppercase mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" /> Cucina
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {cucina.map(item => <MenuCard key={item.id} item={item} color="orange" onAdd={aggiungiItem} righe={righe} />)}
              </div>
            </div>
          )}

          {/* Sezione Bar */}
          {bar.length > 0 && (
            <div className="mb-5">
              <h3 className="font-body text-xs text-blue-400/80 tracking-widest uppercase mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Bar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {bar.map(item => <MenuCard key={item.id} item={item} color="blue" onAdd={aggiungiItem} righe={righe} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-center text-[#E5E5E5]/30 font-body py-12">Nessun risultato per "{search}"</p>
          )}
        </div>

        {/* ===== PANNELLO COMANDA ===== */}
        <div className={`lg:w-96 bg-[#0d0d0f] border-l border-[#C69C6D]/15 flex flex-col ${tab === 'menu' ? 'hidden lg:flex' : 'flex w-full'}`}>

          {/* Header comanda */}
          <div className="p-4 border-b border-[#C69C6D]/15">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-white tracking-widest">Comanda</h2>
              <span className="font-body text-xs text-[#E5E5E5]/40">{righe.length > 0 ? `${righe.length} in bozza` : 'vuota'}</span>
            </div>
          </div>

          {/* Già inviati */}
          {righeInviate.length > 0 && (
            <div className="border-b border-[#C69C6D]/10 max-h-48 overflow-y-auto">
              <div className="px-4 pt-3 pb-1">
                <p className="font-body text-xs text-[#E5E5E5]/30 uppercase tracking-widest mb-2">Già inviati ({righeInviate.length})</p>
              </div>
              {righeInviate.map(r => (
                <div key={r.id} className="px-4 py-2 flex items-center justify-between gap-2 hover:bg-white/2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="font-body text-sm text-[#E5E5E5]/70 truncate block">{r.quantita}× {r.nome_item}</span>
                    {r.note && <span className="font-body text-xs text-yellow-400/60 italic">📝 {r.note}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge stato={r.stato} />
                    {r.stato === 'pronto' && (
                      <button onClick={() => segnaConsegnato(r)}
                        className="text-xs px-2 py-1 bg-green-600/80 text-white rounded-sm font-body hover:bg-green-500 transition-all flex items-center gap-1">
                        <CheckCircle2 size={11} /> Consegna
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bozza articoli */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {righe.length === 0 ? (
              <div className="text-center py-10">
                <Receipt size={32} className="mx-auto mb-3 text-[#E5E5E5]/10" />
                <p className="text-[#E5E5E5]/25 font-body text-sm">Seleziona articoli dal menu</p>
              </div>
            ) : righe.map(r => (
              <div key={r._tmp} className={`border rounded-sm p-3 ${r.reparto === 'bar' ? 'border-blue-900/50 bg-[#0e0e1a]' : 'border-[#C69C6D]/20 bg-[#161618]'}`}>
                {/* Nome + rimuovi */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-body text-white text-sm font-medium leading-snug">{r.nome_item}</span>
                  <button onClick={() => rimuoviRiga(r._tmp)} className="text-red-400/40 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Qty + urgente + prezzo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => cambiaQty(r._tmp, -1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D] transition-all">
                      <Minus size={12} />
                    </button>
                    <span className="text-white font-body w-7 text-center text-sm">{r.quantita}</span>
                    <button onClick={() => cambiaQty(r._tmp, 1)} className="w-8 h-8 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D] transition-all">
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => togglePriorita(r._tmp)} title="Urgente"
                      className={`p-1.5 rounded-sm border transition-all ${r.priorita === 'urgente' ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/20 hover:border-red-400/40'}`}>
                      <AlertCircle size={13} />
                    </button>
                    <span className={`font-body font-semibold text-sm ${r.reparto === 'bar' ? 'text-blue-400' : 'text-[#C69C6D]'}`}>
                      €{r.prezzo_totale.toFixed(2)}
                    </span>
                  </div>
                </div>
                {/* Note riga */}
                <input
                  value={noteRiga[r._tmp] || ''}
                  onChange={e => setNoteRiga(prev => ({ ...prev, [r._tmp]: e.target.value }))}
                  placeholder="Nota per cucina/bar (es. senza aglio)..."
                  className="w-full mt-2 bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
                />
              </div>
            ))}
          </div>

          {/* Note generali tavolo */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <StickyNote size={12} className="text-[#E5E5E5]/30" />
              <span className="font-body text-xs text-[#E5E5E5]/30">Note generali tavolo</span>
            </div>
            <textarea
              value={noteGenerali}
              onChange={e => setNoteGenerali(e.target.value)}
              onBlur={salvaCopertiNote}
              rows={2}
              placeholder="Allergie, richieste speciali, bambini..."
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-2 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20 resize-none"
            />
          </div>

          {/* Footer azioni */}
          <div className="p-4 border-t border-[#C69C6D]/15 space-y-2">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="font-body text-xs text-[#E5E5E5]/30">Totale</p>
                {totaleBozza > 0 && <p className="font-body text-xs text-[#E5E5E5]/40">+€{totaleBozza.toFixed(2)} in bozza</p>}
              </div>
              <span className="font-display text-3xl text-[#C69C6D]">€{totale.toFixed(2)}</span>
            </div>
            <button
              onClick={inviaComanda}
              disabled={sending || righe.length === 0}
              className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              {sending ? 'Invio in corso...' : `Invia Comanda${righe.length > 0 ? ` (${righe.length})` : ''}`}
            </button>
            {ordine && (
              <button
                onClick={richiediConto}
                className="w-full py-3 border border-purple-400/50 text-purple-400 hover:bg-purple-400/10 font-body text-sm tracking-widest uppercase rounded-sm transition-all flex items-center justify-center gap-2"
              >
                <Receipt size={14} /> Richiedi Conto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ item, color, onAdd, righe }) {
  const qty = righe.filter(r => r.menu_item_id === item.id).reduce((s, r) => s + r.quantita, 0);
  const borderClass = color === 'blue'
    ? 'border-blue-900/30 hover:border-blue-400/50 bg-[#0e0e1a]'
    : 'border-[#E5E5E5]/10 hover:border-[#C69C6D]/50 bg-[#161618]';
  const priceClass = color === 'blue' ? 'text-blue-400' : 'text-[#C69C6D]';

  return (
    <button
      onClick={() => onAdd(item)}
      className={`relative border ${borderClass} rounded-sm p-3 text-left transition-all active:scale-95 w-full`}
    >
      {qty > 0 && (
        <span className={`absolute top-2 right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${color === 'blue' ? 'bg-blue-500 text-white' : 'bg-[#C69C6D] text-[#0A0A0B]'}`}>
          {qty}
        </span>
      )}
      <p className="font-body text-white text-sm font-medium pr-6 leading-snug">{item.name}</p>
      {item.description && (
        <p className="font-body text-[#E5E5E5]/35 text-xs mt-0.5 line-clamp-1 leading-snug">{item.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className={`font-body font-semibold text-sm ${priceClass}`}>€{Number(item.price).toFixed(2)}</span>
        {item.allergens && <span className="font-body text-[10px] text-[#E5E5E5]/25 truncate max-w-[100px]">{item.allergens}</span>}
      </div>
    </button>
  );
}

function StatusBadge({ stato }) {
  const config = {
    inviato:         'bg-red-500/15 text-red-300 border-red-500/30',
    ricevuto:        'bg-blue-500/15 text-blue-300 border-blue-500/30',
    in_preparazione: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    pronto:          'bg-green-500/20 text-green-400 border-green-500/40',
    consegnato:      'bg-[#E5E5E5]/5 text-[#E5E5E5]/30 border-[#E5E5E5]/10',
  };
  const labels = { inviato:'inviato', ricevuto:'ricevuto', in_preparazione:'in prep.', pronto:'PRONTO ✓', consegnato:'consegnato' };
  return (
    <span className={`text-xs px-2 py-0.5 border rounded-full font-body whitespace-nowrap ${config[stato] || ''}`}>
      {labels[stato] || stato}
    </span>
  );
}