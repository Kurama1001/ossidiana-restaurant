import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Clock, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import ComandaEditor from './ComandaEditor.jsx';

const STATO_RIGA = {
  bozza:          { label: 'Bozza',          cls: 'text-[#E5E5E5]/30 border-[#E5E5E5]/15' },
  inviato:        { label: 'Inviato',         cls: 'text-blue-400 border-blue-400/40' },
  ricevuto:       { label: 'Ricevuto',        cls: 'text-blue-300 border-blue-300/40' },
  in_preparazione:{ label: 'In prep.',        cls: 'text-yellow-400 border-yellow-400/40' },
  pronto:         { label: 'Pronto ✓',        cls: 'text-green-400 border-green-400/40' },
  consegnato:     { label: 'Consegnato',      cls: 'text-green-600 border-green-600/40' },
  annullato:      { label: 'Annullato',       cls: 'text-red-400/50 border-red-400/20 line-through' },
};

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

/**
 * DettaglioComanda
 * Props:
 *   ordine: Ordine
 *   onBack: () => void   — torna alla lista
 *   onRefreshOrdine: () => void — ricarica l'ordine nella lista padre
 */
export default function DettaglioComanda({ ordine, onBack, onRefreshOrdine }) {
  const [righe, setRighe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [annullando, setAnnullando] = useState(null);
  const [faseAperte, setFaseAperte] = useState({}); // fase -> bool espansa
  const [mostraAggiungi, setMostraAggiungi] = useState(false);

  const loadRighe = async () => {
    const data = await base44.entities.RigaOrdine.filter({ ordine_id: ordine.id }, '-created_date', 300);
    setRighe(data.filter(r => r.stato !== 'annullato'));
    setLoading(false);
    // apri tutte le fasi di default
    const fasi = [...new Set(data.map(r => r.fase || 1))];
    setFaseAperte(fasi.reduce((acc, f) => ({ ...acc, [f]: true }), {}));
  };

  useEffect(() => { loadRighe(); }, [ordine.id]);

  const annullaRiga = async (rigaId) => {
    setAnnullando(rigaId);
    await base44.entities.RigaOrdine.update(rigaId, { stato: 'annullato' });
    setRighe(prev => prev.filter(r => r.id !== rigaId));
    setAnnullando(null);
    onRefreshOrdine?.();
  };

  const onNuoveRigheInviate = () => {
    setMostraAggiungi(false);
    loadRighe();
    onRefreshOrdine?.();
  };

  // Raggruppa per fase
  const fasiUsate = [...new Set(righe.map(r => r.fase || 1))].sort((a, b) => a - b);
  const righePerFase = fasiUsate.reduce((acc, f) => {
    acc[f] = righe.filter(r => (r.fase || 1) === f);
    return acc;
  }, {});

  const totaleOrdine = righe
    .filter(r => r.stato !== 'annullato')
    .reduce((s, r) => s + (r.prezzo_totale || 0), 0);

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack}
          className="p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all text-lg leading-none">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl text-white tracking-widest">Tavolo {ordine.numero_tavolo}</h2>
          <p className="font-body text-xs text-[#E5E5E5]/40 mt-0.5">
            {ordine.coperti ? `${ordine.coperti} cop. · ` : ''}
            {ordine.cameriere_nome || ''} · €{totaleOrdine.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => setMostraAggiungi(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-bold tracking-widest uppercase rounded-sm transition-all border ${
            mostraAggiungi
              ? 'border-[#C69C6D] text-[#C69C6D] bg-[#C69C6D]/10'
              : 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] hover:bg-[#D4AA7D]'
          }`}
        >
          <Plus size={14} />
          {mostraAggiungi ? 'Chiudi' : 'Aggiungi'}
        </button>
      </div>

      {/* Pannello aggiungi nuovi articoli */}
      {mostraAggiungi && (
        <div className="mb-6 border border-[#C69C6D]/20 rounded-sm p-4 bg-[#0d0d0f]">
          <p className="font-body text-xs text-[#C69C6D] uppercase tracking-widest mb-4">
            Nuovi articoli / fase
          </p>
          <ComandaEditor
            onSuccess={onNuoveRigheInviate}
            ordineEsistente={ordine}
          />
        </div>
      )}

      {/* Storico righe per fase */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-[#C69C6D]/30 border-t-[#C69C6D] rounded-full animate-spin" />
        </div>
      ) : righe.length === 0 ? (
        <div className="text-center py-10 text-[#E5E5E5]/30 font-body text-sm">
          Nessuna riga inviata ancora
        </div>
      ) : (
        <div className="space-y-4">
          {fasiUsate.map(f => {
            const isAperta = faseAperte[f] !== false;
            const righeF = righePerFase[f];
            const tuttiPronti = righeF.every(r => ['pronto', 'consegnato'].includes(r.stato));
            return (
              <div key={f} className={`border rounded-sm overflow-hidden ${tuttiPronti ? 'border-green-500/30' : 'border-[#C69C6D]/20'}`}>
                {/* Header fase */}
                <button
                  onClick={() => setFaseAperte(prev => ({ ...prev, [f]: !isAperta }))}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#161618] hover:bg-[#1a1a1c] transition-colors text-left"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-body text-sm font-bold ${tuttiPronti ? 'bg-green-600 text-white' : 'bg-[#C69C6D] text-[#0A0A0B]'}`}>
                    {f}
                  </div>
                  <span className={`font-body text-sm font-semibold flex-1 ${tuttiPronti ? 'text-green-400' : 'text-[#C69C6D]'}`}>
                    Fase {f} {tuttiPronti ? '· Completata' : `· ${righeF.length} articoli`}
                  </span>
                  {tuttiPronti && <CheckCircle2 size={14} className="text-green-400 shrink-0" />}
                  {isAperta ? <ChevronUp size={14} className="text-[#E5E5E5]/30 shrink-0" /> : <ChevronDown size={14} className="text-[#E5E5E5]/30 shrink-0" />}
                </button>

                {/* Righe */}
                {isAperta && (
                  <div className="divide-y divide-[#E5E5E5]/5">
                    {righeF.map(r => {
                      const statoInfo = STATO_RIGA[r.stato] || STATO_RIGA.inviato;
                      const min = minutiDa(r.sent_at || r.created_date);
                      const isAnnullabile = !['pronto', 'consegnato'].includes(r.stato);
                      return (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3 bg-[#0d0d0f]">
                          {/* Reparto dot */}
                          <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${r.reparto === 'bar' ? 'bg-blue-400' : 'bg-orange-400'}`} />

                          {/* Info riga */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-body text-white text-sm font-medium">
                                {r.quantita}× {r.nome_item}
                              </span>
                              {r.priorita === 'urgente' && (
                                <AlertCircle size={13} className="text-red-400 shrink-0" />
                              )}
                              <span className="font-body text-[10px] px-1.5 py-0.5 bg-[#C69C6D]/15 text-[#C69C6D] border border-[#C69C6D]/20 rounded-sm font-bold">
                                F{r.fase || 1}
                              </span>
                            </div>
                            {r.note && (
                              <p className="font-body text-xs text-yellow-300/60 italic mt-0.5">📝 {r.note}</p>
                            )}
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className={`font-body text-xs px-2 py-0.5 border rounded-full ${statoInfo.cls}`}>
                                {statoInfo.label}
                              </span>
                              {min !== null && (
                                <span className="font-body text-xs text-[#E5E5E5]/25 flex items-center gap-1">
                                  <Clock size={10} /> {min} min
                                </span>
                              )}
                              <span className={`font-body text-xs font-semibold ${r.reparto === 'bar' ? 'text-blue-400/70' : 'text-[#C69C6D]/70'}`}>
                                €{(r.prezzo_totale || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Annulla riga */}
                          {isAnnullabile && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Annullare "${r.nome_item}"?`)) annullaRiga(r.id);
                              }}
                              disabled={annullando === r.id}
                              className="shrink-0 p-2 border border-red-500/20 text-red-400/40 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/5 rounded-sm transition-all"
                              title="Annulla articolo"
                            >
                              {annullando === r.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <X size={13} />
                              }
                            </button>
                          )}
                        </div>
                      );
                    })}
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