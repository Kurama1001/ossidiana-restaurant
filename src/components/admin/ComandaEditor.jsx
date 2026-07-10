import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, Trash2, Search, AlertCircle, Users, Receipt, StickyNote, CheckCircle2, Layers, Printer } from 'lucide-react';
import { buildPrintPayload, createKitchenPrintJob } from '@/utils/printJobHelper';

const CAT_LABELS = {
  antipasti:'Antipasti', primi:'Primi', romanissimi:'Romanissimi', secondi:'Secondi',
  contorni:'Contorni', dolci:'Dolci', acqua:'Acqua', vino:'Vino',
  birra:'Birra', cocktail:'Cocktail', caffe_amari:'Caffè & Amari', bevande:'Bevande',
};
const CAT_CUCINA = ['antipasti','primi','romanissimi','secondi','contorni','dolci'];
const MAX_FASI = 5;

/**
 * ComandaEditor
 * Props:
 *   onSuccess: () => void
 *   ordineEsistente: Ordine | null
 */
export default function ComandaEditor({ onSuccess, ordineEsistente }) {
  const [numeroTavoloInput, setNumeroTavoloInput] = useState('');
  const [tavoloSelezionato, setTavoloSelezionato] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [righe, setRighe] = useState([]);
  const [noteRiga, setNoteRiga] = useState({});
  const [faseRiga, setFaseRiga] = useState({});      // key -> numero fase
  const [noteGenerali, setNoteGenerali] = useState(ordineEsistente?.note_generali || '');
  const [coperti, setCoperti] = useState(ordineEsistente?.coperti || 2);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('tutti');
  const [tab, setTab] = useState('menu');
  const [faseAttiva, setFaseAttiva] = useState(1);   // fase corrente selezionata per nuovi articoli
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const [menu, me] = await Promise.all([
        base44.entities.MenuItem.filter({ active: true }, 'sortOrder', 200),
        base44.auth.me().catch(() => null),
      ]);
      setMenuItems(menu);
      setUser(me);
      if (ordineEsistente) {
        setTavoloSelezionato({ id: ordineEsistente.tavolo_id, numero: ordineEsistente.numero_tavolo });
        setNumeroTavoloInput(String(ordineEsistente.numero_tavolo));
      }
      setLoading(false);
    };
    init();
  }, []);

  const aggiungiItem = (item) => {
    const fase = faseAttiva;
    setRighe(prev => {
      // Raggruppa per item + fase (senza nota extra)
      const existing = prev.find(r => r.menu_item_id === item.id && r.fase === fase && !noteRiga[r._tmp]);
      if (existing) return prev.map(r =>
        r._tmp === existing._tmp
          ? { ...r, quantita: r.quantita + 1, prezzo_totale: (r.quantita + 1) * r.prezzo_unitario }
          : r
      );
      const key = Date.now() + Math.random();
      setFaseRiga(prev2 => ({ ...prev2, [key]: fase }));
      return [...prev, {
        _tmp: key,
        menu_item_id: item.id,
        nome_item: item.name,
        categoria: item.category,
        reparto: item.reparto || (CAT_CUCINA.includes(item.category) ? 'cucina' : 'bar'),
        quantita: 1,
        prezzo_unitario: item.price,
        prezzo_totale: item.price,
        priorita: 'normale',
        fase,
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

  const cambiaFaseRiga = (key, fase) => {
    setFaseRiga(prev => ({ ...prev, [key]: fase }));
    setRighe(prev => prev.map(r => r._tmp === key ? { ...r, fase } : r));
  };

  const totale = righe.reduce((s, r) => s + r.prezzo_totale, 0);

  // Fasi usate
  const fasiUsate = [...new Set(righe.map(r => r.fase || 1))].sort((a,b) => a-b);

  const inviaComanda = async () => {
    if (righe.length === 0 || !tavoloSelezionato) return;
    setSending(true);

    const righeCucina = righe.filter(r => r.reparto === 'cucina');
    const now = new Date().toISOString();
    let ordineId, tavoloId, numeroTavolo;

    if (ordineEsistente) {
      ordineId = ordineEsistente.id;
      tavoloId = ordineEsistente.tavolo_id;
      numeroTavolo = ordineEsistente.numero_tavolo;
    } else {
      const nuovoOrdine = await base44.entities.Ordine.create({
        tavolo_id: tavoloSelezionato.id,
        numero_tavolo: tavoloSelezionato.numero,
        cameriere_id: user?.id || '',
        cameriere_nome: user?.full_name || '',
        stato: 'inviato',
        coperti,
        note_generali: noteGenerali,
        totale,
      });
      ordineId = nuovoOrdine.id;
      tavoloId = tavoloSelezionato.id;
      numeroTavolo = tavoloSelezionato.numero;
    }

    const createdRighe = await Promise.all(righe.map(r => {
      const notaRiga = noteRiga[r._tmp] || '';
      return base44.entities.RigaOrdine.create({
        ordine_id: ordineId,
        tavolo_id: tavoloId,
        numero_tavolo: numeroTavolo,
        menu_item_id: r.menu_item_id,
        nome_item: r.nome_item,
        categoria: r.categoria,
        reparto: r.reparto,
        fase: r.fase || 1,
        quantita: r.quantita,
        prezzo_unitario: r.prezzo_unitario,
        prezzo_totale: r.prezzo_totale,
        note: notaRiga,
        stato: 'inviato',
        priorita: r.priorita,
        sent_at: now,
      }).then(created => ({ ...r, id: created.id, note: notaRiga, stato: 'inviato' }));
    }));

    if (ordineEsistente) {
      const prevTotale = ordineEsistente.totale || 0;
      await base44.entities.Ordine.update(ordineId, {
        stato: 'inviato',
        note_generali: noteGenerali,
        coperti,
        totale: prevTotale + totale,
      });
    }

    // Crea PrintJob per la stampante cucina (sostituisce window.print())
    let printJobOk = true;
    if (righeCucina.length > 0) {
      const righeCucinaWithIds = createdRighe.filter(r => r.reparto === 'cucina');
      const payload = buildPrintPayload({
        ordineId,
        numeroTavolo,
        coperti,
        noteGenerali,
        user,
        righe: righeCucinaWithIds,
        createdAt: now,
        repartoFilter: null,
      });
      try {
        await createKitchenPrintJob(payload, ordineId, user);
      } catch (e) {
        console.error('Errore creazione PrintJob:', e);
        printJobOk = false;
      }
    }

    setSending(false);
    if (printJobOk) {
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 1500);
    } else {
      setPrintError(true);
    }
  };

  const categories = [...new Set(menuItems.map(i => i.category))];
  const filtered = menuItems.filter(item => {
    if (catFilter !== 'tutti' && item.category !== catFilter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const cucinaItems = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'cucina');
  const barItems = filtered.filter(i => (i.reparto || (CAT_CUCINA.includes(i.category) ? 'cucina' : 'bar')) === 'bar');

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#C69C6D]/30 border-t-[#C69C6D] rounded-full animate-spin" />
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <CheckCircle2 size={48} className="text-green-400" />
      <p className="font-display text-2xl text-white tracking-widest">Comanda inviata alla stampante</p>
    </div>
  );

  if (printError) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertCircle size={48} className="text-red-400" />
      <p className="font-display text-xl text-white tracking-widest text-center px-6">Errore: comanda creata ma non inviata alla stampante</p>
      <button onClick={onSuccess} className="mt-2 text-[#C69C6D] hover:underline font-body text-sm">Torna alla sala</button>
    </div>
  );

  // Righe raggruppate per fase (per la visualizzazione nella colonna comanda)
  const righePerFase = fasiUsate.reduce((acc, f) => {
    acc[f] = righe.filter(r => (r.fase || 1) === f);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Intestazione tavolo + coperti */}
      {!ordineEsistente && (
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div>
            <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest mb-2">N° Tavolo</p>
            <input
              type="number" min="1" value={numeroTavoloInput}
              onChange={e => {
                setNumeroTavoloInput(e.target.value);
                const n = parseInt(e.target.value);
                if (n > 0) setTavoloSelezionato({ id: `tavolo_${n}`, numero: n });
                else setTavoloSelezionato(null);
              }}
              placeholder="es. 5"
              className="w-24 h-9 bg-[#161618] border border-[#E5E5E5]/20 text-white text-center font-display text-lg px-3 rounded-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
            />
          </div>
          <div>
            <p className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest mb-2">Coperti</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCoperti(c => Math.max(1, c-1))} className="w-9 h-9 border border-[#E5E5E5]/20 text-white rounded-sm flex items-center justify-center hover:border-[#C69C6D] font-display text-lg">−</button>
              <span className="text-white font-display text-2xl w-8 text-center">{coperti}</span>
              <button onClick={() => setCoperti(c => c+1)} className="w-9 h-9 border border-[#E5E5E5]/20 text-white rounded-sm flex items-center justify-center hover:border-[#C69C6D] font-display text-lg">+</button>
            </div>
          </div>
        </div>
      )}

      {/* Selettore fase attiva (per i nuovi articoli) */}
      <div className="mb-4 bg-[#0d0d0f] border border-[#C69C6D]/20 rounded-sm px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={13} className="text-[#C69C6D]" />
          <span className="font-body text-xs text-[#C69C6D] uppercase tracking-widest font-semibold">Fase di uscita</span>
          <span className="font-body text-xs text-[#E5E5E5]/30 italic ml-auto">I piatti aggiunti andranno in Fase {faseAttiva}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: MAX_FASI }, (_, i) => i + 1).map(f => (
            <button key={f} onClick={() => setFaseAttiva(f)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-sm border font-body text-sm font-bold transition-all ${
                faseAttiva === f
                  ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]'
                  : fasiUsate.includes(f)
                    ? 'border-[#C69C6D]/40 text-[#C69C6D]/70 bg-[#C69C6D]/5 hover:border-[#C69C6D]'
                    : 'border-[#E5E5E5]/15 text-[#E5E5E5]/30 hover:border-[#E5E5E5]/40'
              }`}>
              Fase {f}
              {fasiUsate.includes(f) && (
                <span className={`text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold ${faseAttiva === f ? 'bg-[#0A0A0B]/30 text-[#0A0A0B]' : 'bg-[#C69C6D]/20 text-[#C69C6D]'}`}>
                  {righe.filter(r => (r.fase || 1) === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab mobile */}
      <div className="flex border-b border-[#C69C6D]/10 lg:hidden mb-3">
        <button onClick={() => setTab('menu')}
          className={`flex-1 py-3 font-body text-sm transition-all ${tab === 'menu' ? 'border-b-2 border-[#C69C6D] text-[#C69C6D]' : 'text-[#E5E5E5]/40'}`}>
          Menu
        </button>
        <button onClick={() => setTab('comanda')}
          className={`flex-1 py-3 font-body text-sm transition-all relative ${tab === 'comanda' ? 'border-b-2 border-[#C69C6D] text-[#C69C6D]' : 'text-[#E5E5E5]/40'}`}>
          Comanda
          {righe.length > 0 && <span className="absolute top-2 right-6 bg-[#C69C6D] text-[#0A0A0B] text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">{righe.length}</span>}
        </button>
      </div>

      {/* Layout due colonne */}
      <div className="flex flex-1 gap-4 overflow-hidden min-h-[500px] lg:min-h-[600px]">

        {/* Pannello menu */}
        <div className={`flex-1 overflow-y-auto ${tab === 'comanda' ? 'hidden lg:block' : 'block'}`}>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..."
              className="w-full bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-9 pr-4 py-2.5 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
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

          {cucinaItems.length > 0 && (
            <div className="mb-4">
              <h3 className="font-body text-xs text-orange-400/80 tracking-widest uppercase mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" /> Cucina
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {cucinaItems.map(item => <MenuCard key={item.id} item={item} color="orange" onAdd={aggiungiItem} righe={righe} faseAttiva={faseAttiva} />)}
              </div>
            </div>
          )}
          {barItems.length > 0 && (
            <div className="mb-4">
              <h3 className="font-body text-xs text-blue-400/80 tracking-widest uppercase mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Bar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {barItems.map(item => <MenuCard key={item.id} item={item} color="blue" onAdd={aggiungiItem} righe={righe} faseAttiva={faseAttiva} />)}
              </div>
            </div>
          )}
        </div>

        {/* Pannello comanda raggruppato per fasi */}
        <div className={`lg:w-80 bg-[#0d0d0f] border border-[#C69C6D]/15 rounded-sm flex flex-col ${tab === 'menu' ? 'hidden lg:flex' : 'flex w-full'}`}>
          <div className="p-3 border-b border-[#C69C6D]/10">
            <div className="flex items-center justify-between">
              <span className="font-display text-base text-white tracking-widest">Comanda</span>
              <span className="font-body text-xs text-[#E5E5E5]/40">{righe.length > 0 ? `${righe.length} articoli` : 'vuota'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {righe.length === 0 ? (
              <div className="text-center py-10">
                <Receipt size={28} className="mx-auto mb-3 text-[#E5E5E5]/10" />
                <p className="text-[#E5E5E5]/25 font-body text-sm">Seleziona articoli dal menu</p>
              </div>
            ) : (
              fasiUsate.map(f => (
                <div key={f}>
                  {/* Header fase */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[#C69C6D] flex items-center justify-center shrink-0">
                      <span className="font-body text-xs font-bold text-[#0A0A0B]">{f}</span>
                    </div>
                    <span className="font-body text-xs text-[#C69C6D] uppercase tracking-widest">Fase {f}</span>
                    <div className="flex-1 h-px bg-[#C69C6D]/15" />
                  </div>

                  {/* Righe di questa fase */}
                  <div className="space-y-2 pl-2">
                    {righePerFase[f].map(r => (
                      <div key={r._tmp} className={`border rounded-sm p-3 ${r.reparto === 'bar' ? 'border-blue-900/50 bg-[#0e0e1a]' : 'border-[#C69C6D]/20 bg-[#161618]'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-body text-white text-sm font-medium leading-snug">{r.nome_item}</span>
                          <button onClick={() => rimuoviRiga(r._tmp)} className="text-red-400/40 hover:text-red-400 shrink-0"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => cambiaQty(r._tmp, -1)} className="w-7 h-7 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Minus size={11} /></button>
                            <span className="text-white font-body w-6 text-center text-sm">{r.quantita}</span>
                            <button onClick={() => cambiaQty(r._tmp, 1)} className="w-7 h-7 border border-[#E5E5E5]/20 text-white flex items-center justify-center rounded-sm hover:border-[#C69C6D]"><Plus size={11} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => togglePriorita(r._tmp)}
                              className={`p-1.5 rounded-sm border transition-all ${r.priorita === 'urgente' ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/20 hover:border-red-400/40'}`}>
                              <AlertCircle size={12} />
                            </button>
                            <span className={`font-body font-semibold text-sm ${r.reparto === 'bar' ? 'text-blue-400' : 'text-[#C69C6D]'}`}>€{r.prezzo_totale.toFixed(2)}</span>
                          </div>
                        </div>
                        {/* Cambio fase per riga */}
                        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                          <span className="font-body text-[10px] text-[#E5E5E5]/30 mr-1">Fase:</span>
                          {Array.from({ length: MAX_FASI }, (_, i) => i + 1).map(fi => (
                            <button key={fi} onClick={() => cambiaFaseRiga(r._tmp, fi)}
                              className={`px-2 h-5 rounded-sm text-[10px] font-bold transition-all ${(r.fase || 1) === fi ? 'bg-[#C69C6D] text-[#0A0A0B]' : 'border border-[#E5E5E5]/20 text-[#E5E5E5]/30 hover:border-[#C69C6D]/50 hover:text-[#C69C6D]/70'}`}>
                              F{fi}
                            </button>
                          ))}
                        </div>
                        <input
                          value={noteRiga[r._tmp] || ''}
                          onChange={e => setNoteRiga(prev => ({ ...prev, [r._tmp]: e.target.value }))}
                          placeholder="Nota cucina/bar..."
                          className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-1.5 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-3 pb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <StickyNote size={11} className="text-[#E5E5E5]/30" />
              <span className="font-body text-xs text-[#E5E5E5]/30">Note generali</span>
            </div>
            <textarea value={noteGenerali} onChange={e => setNoteGenerali(e.target.value)} rows={2}
              placeholder="Allergie, richieste speciali..."
              className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/10 text-[#E5E5E5]/80 px-3 py-2 rounded-sm font-body text-xs outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20 resize-none" />
          </div>

          <div className="p-3 border-t border-[#C69C6D]/10">
            <div className="flex justify-between items-center mb-2">
              <span className="font-body text-xs text-[#E5E5E5]/40">Totale bozza</span>
              <span className="font-display text-2xl text-[#C69C6D]">€{totale.toFixed(2)}</span>
            </div>
            <button
              onClick={inviaComanda}
              disabled={sending || righe.length === 0 || !tavoloSelezionato}
              className="w-full py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Printer size={15} />
              {sending ? 'Invio...' : `Invia e Stampa (${righe.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ item, color, onAdd, righe, faseAttiva }) {
  // Mostra totale qty in tutta la comanda, e badge separato per la fase attiva
  const qtyTot = righe.filter(r => r.menu_item_id === item.id).reduce((s, r) => s + r.quantita, 0);
  const qtyFase = righe.filter(r => r.menu_item_id === item.id && (r.fase || 1) === faseAttiva).reduce((s, r) => s + r.quantita, 0);
  const borderClass = color === 'blue'
    ? 'border-blue-900/30 hover:border-blue-400/50 bg-[#0e0e1a]'
    : 'border-[#E5E5E5]/10 hover:border-[#C69C6D]/50 bg-[#161618]';
  const priceClass = color === 'blue' ? 'text-blue-400' : 'text-[#C69C6D]';
  return (
    <button onClick={() => onAdd(item)}
      className={`relative border ${borderClass} rounded-sm p-3 text-left transition-all active:scale-95 w-full`}>
      {qtyTot > 0 && (
        <span className={`absolute top-2 right-2 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${color === 'blue' ? 'bg-blue-500 text-white' : 'bg-[#C69C6D] text-[#0A0A0B]'}`}>{qtyTot}</span>
      )}
      {qtyFase > 0 && qtyFase !== qtyTot && (
        <span className="absolute top-2 right-8 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-white/20 text-white">{qtyFase}</span>
      )}
      <p className="font-body text-white text-sm font-medium pr-6 leading-snug">{item.name}</p>
      {item.description && <p className="font-body text-[#E5E5E5]/35 text-xs mt-0.5 line-clamp-1">{item.description}</p>}
      <span className={`font-body font-semibold text-sm mt-2 block ${priceClass}`}>€{Number(item.price).toFixed(2)}</span>
    </button>
  );
}