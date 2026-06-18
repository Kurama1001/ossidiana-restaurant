import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Banknote, MoreHorizontal, CheckCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const METODI = [
  { value: 'contanti', label: 'Contanti', icon: Banknote },
  { value: 'carta', label: 'Carta', icon: CreditCard },
  { value: 'altro', label: 'Altro', icon: MoreHorizontal },
];

export default function Cassa() {
  const [tavoli, setTavoli] = useState([]);
  const [ordini, setOrdini] = useState({});
  const [righe, setRighe] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null);
  const [sconti, setSconti] = useState({});
  const [metodi, setMetodi] = useState({});

  const load = async () => {
    const tavDaPagare = await base44.entities.Tavolo.filter({ stato: 'da_pagare' }, 'numero', 50);
    setTavoli(tavDaPagare);
    if (tavDaPagare.length > 0) {
      const ordinePromises = tavDaPagare.map(t =>
        t.ordine_attivo_id
          ? base44.entities.Ordine.filter({ id: t.ordine_attivo_id }, '-created_date', 1).then(r => ({ tavoloId: t.id, ordine: r[0] }))
          : Promise.resolve({ tavoloId: t.id, ordine: null })
      );
      const results = await Promise.all(ordinePromises);
      const ordMap = {};
      const righePromises = [];
      results.forEach(({ tavoloId, ordine }) => {
        ordMap[tavoloId] = ordine;
        if (ordine) righePromises.push(
          base44.entities.RigaOrdine.filter({ ordine_id: ordine.id }, 'created_date', 200).then(r => ({ tavoloId, righe: r }))
        );
      });
      setOrdini(ordMap);
      const righeResults = await Promise.all(righePromises);
      const righeMap = {};
      righeResults.forEach(({ tavoloId, righe: r }) => { righeMap[tavoloId] = r.filter(x => x.stato !== 'annullato'); });
      setRighe(righeMap);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const chiudiOrdine = async (tavolo) => {
    const ordine = ordini[tavolo.id];
    if (!ordine) return;
    if (!confirm(`Confermi la chiusura del conto per il Tavolo ${tavolo.numero}?`)) return;
    setClosing(tavolo.id);
    const metodo = metodi[tavolo.id] || 'contanti';
    const sconto = parseFloat(sconti[tavolo.id] || 0) || 0;
    const totaleRighe = (righe[tavolo.id] || []).reduce((s, r) => s + (r.prezzo_totale || 0), 0);
    const totaleFinal = Math.max(0, totaleRighe - sconto);

    await base44.entities.Ordine.update(ordine.id, {
      stato: 'chiuso',
      pagato: true,
      metodo_pagamento: metodo,
      totale: totaleFinal,
      sconto,
      closed_at: new Date().toISOString(),
    });
    await base44.entities.Tavolo.update(tavolo.id, {
      stato: 'libero',
      ordine_attivo_id: '',
    });
    setTavoli(prev => prev.filter(t => t.id !== tavolo.id));
    setClosing(null);
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-body">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-widest">CASSA</h1>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-1">Tavoli da pagare: {tavoli.length}</p>
        </div>
        <button onClick={load} className="p-3 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {tavoli.length === 0 ? (
        <div className="text-center py-24 text-[#E5E5E5]/30 font-body">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600/40" />
          <p className="text-lg">Nessun tavolo da pagare</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          {tavoli.map(tavolo => {
            const ord = ordini[tavolo.id];
            const rig = righe[tavolo.id] || [];
            const totale = rig.reduce((s, r) => s + (r.prezzo_totale || 0), 0);
            const sconto = parseFloat(sconti[tavolo.id] || 0) || 0;
            const totaleFinal = Math.max(0, totale - sconto);
            const isOpen = expanded === tavolo.id;

            return (
              <div key={tavolo.id} className="bg-[#161618] border border-purple-400/30 rounded-sm overflow-hidden">
                {/* Header tavolo */}
                <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#1a1a1c] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : tavolo.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-3xl text-white">T{tavolo.numero}</span>
                    <div className="text-left">
                      <p className="font-body text-sm text-[#E5E5E5]/60">{ord?.cameriere_nome || '—'}</p>
                      <p className="font-body text-xs text-[#E5E5E5]/30">{rig.length} articoli</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl text-[#C69C6D]">€{totaleFinal.toFixed(2)}</span>
                    {isOpen ? <ChevronUp size={18} className="text-[#E5E5E5]/40" /> : <ChevronDown size={18} className="text-[#E5E5E5]/40" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-[#C69C6D]/15 p-5 space-y-4">
                    {/* Lista articoli */}
                    <div className="space-y-1">
                      {rig.map(r => (
                        <div key={r.id} className="flex justify-between text-sm font-body">
                          <span className="text-[#E5E5E5]/70">{r.quantita}× {r.nome_item}</span>
                          <span className="text-[#E5E5E5]/50">€{(r.prezzo_totale || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-[#E5E5E5]/10 pt-2 flex justify-between font-body text-sm">
                        <span className="text-[#E5E5E5]/50">Subtotale</span>
                        <span className="text-white">€{totale.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Sconto */}
                    <div className="flex items-center gap-3">
                      <label className="font-body text-sm text-[#E5E5E5]/50 shrink-0">Sconto (€)</label>
                      <input type="number" min="0" step="0.5"
                        value={sconti[tavolo.id] || ''}
                        onChange={e => setSconti(prev => ({ ...prev, [tavolo.id]: e.target.value }))}
                        className="w-24 bg-[#0A0A0B] border border-[#E5E5E5]/15 text-white px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]"
                      />
                    </div>

                    {/* Totale finale */}
                    <div className="flex justify-between items-center py-2 border-y border-[#C69C6D]/20">
                      <span className="font-body text-[#E5E5E5]/60">TOTALE</span>
                      <span className="font-display text-3xl text-[#C69C6D]">€{totaleFinal.toFixed(2)}</span>
                    </div>

                    {/* Metodo pagamento */}
                    <div className="flex gap-2">
                      {METODI.map(({ value, label, icon: Icon }) => (
                        <button key={value}
                          onClick={() => setMetodi(prev => ({ ...prev, [tavolo.id]: value }))}
                          className={`flex-1 py-3 border rounded-sm font-body text-sm transition-all flex items-center justify-center gap-2 ${metodi[tavolo.id] === value || (!metodi[tavolo.id] && value === 'contanti') ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                          <Icon size={15} /> {label}
                        </button>
                      ))}
                    </div>

                    {/* Chiudi */}
                    <button onClick={() => chiudiOrdine(tavolo)} disabled={closing === tavolo.id}
                      className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      {closing === tavolo.id ? 'Chiusura...' : 'Chiudi & Libera Tavolo'}
                    </button>
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