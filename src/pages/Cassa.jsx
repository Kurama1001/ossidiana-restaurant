import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Banknote, MoreHorizontal, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Clock } from 'lucide-react';

const METODI = [
  { value: 'contanti', label: 'Contanti', icon: Banknote },
  { value: 'carta', label: 'Carta', icon: CreditCard },
  { value: 'altro', label: 'Altro', icon: MoreHorizontal },
];

const STATO_LABELS = {
  aperto: 'Aperta',
  inviato: 'Inviata',
  in_preparazione: 'In preparazione',
  parziale_pronto: 'In preparazione',
  pronto: 'Terminata',
  servito: 'Servita',
  da_pagare: 'Da pagare',
};

function isOggi(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export default function Cassa() {
  const [ordini, setOrdini] = useState([]);
  const [righeMap, setRigheMap] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null);
  const [sconti, setSconti] = useState({});
  const [metodi, setMetodi] = useState({});

  const load = async () => {
    const data = await base44.entities.Ordine.list('-created_date', 200);
    const attivi = data.filter(o =>
      !['chiuso', 'annullato'].includes(o.stato) &&
      isOggi(o.created_date)
    );
    const risultati = await Promise.all(attivi.map(o =>
      base44.entities.RigaOrdine.filter({ ordine_id: o.id }, 'created_date', 200)
        .then(r => ({ id: o.id, righe: r.filter(x => x.stato !== 'annullato') }))
        .catch(() => ({ id: o.id, righe: [] }))
    ));
    const map = {};
    risultati.forEach(({ id, righe }) => { map[id] = righe; });
    setOrdini(attivi);
    setRigheMap(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const chiudiOrdine = async (ordine) => {
    const rig = righeMap[ordine.id] || [];
    const totaleRighe = rig.reduce((s, r) => s + (r.prezzo_totale || 0), 0);
    const sconto = parseFloat(sconti[ordine.id] || 0) || 0;
    const totaleFinal = Math.max(0, totaleRighe - sconto);
    if (!confirm(`Confermi l'incasso del Tavolo ${ordine.numero_tavolo} per €${totaleFinal.toFixed(2)}?`)) return;
    setClosing(ordine.id);
    const metodo = metodi[ordine.id] || 'contanti';

    await base44.entities.Ordine.update(ordine.id, {
      stato: 'chiuso',
      pagato: true,
      metodo_pagamento: metodo,
      totale: totaleFinal,
      sconto,
      closed_at: new Date().toISOString(),
    });

    // Libera il tavolo associato, se esiste
    try {
      const tavoli = await base44.entities.Tavolo.filter({ ordine_attivo_id: ordine.id }, undefined, 5);
      if (tavoli.length > 0) {
        await Promise.all(tavoli.map(t => base44.entities.Tavolo.update(t.id, { stato: 'libero', ordine_attivo_id: '' })));
      }
    } catch {}

    setOrdini(prev => prev.filter(o => o.id !== ordine.id));
    setClosing(null);
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-white font-body">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white tracking-widest">CASSA</h1>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-1">Comande aperte oggi: {ordini.length}</p>
        </div>
        <button onClick={load} className="p-3 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
          <RefreshCw size={18} />
        </button>
      </div>

      {ordini.length === 0 ? (
        <div className="text-center py-24 text-[#E5E5E5]/30 font-body">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600/40" />
          <p className="text-lg">Nessuna comanda da incassare</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl mx-auto">
          {ordini.map(ordine => {
            const rig = righeMap[ordine.id] || [];
            const totale = rig.reduce((s, r) => s + (r.prezzo_totale || 0), 0);
            const sconto = parseFloat(sconti[ordine.id] || 0) || 0;
            const totaleFinal = Math.max(0, totale - sconto);
            const isOpen = expanded === ordine.id;

            return (
              <div key={ordine.id} className="bg-[#161618] border border-purple-400/30 rounded-sm overflow-hidden">
                {/* Header comanda */}
                <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#1a1a1c] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : ordine.id)}>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-3xl text-white">T{ordine.numero_tavolo}</span>
                    <div className="text-left">
                      <p className="font-body text-sm text-[#E5E5E5]/60">{ordine.cameriere_nome || '—'}</p>
                      <p className="font-body text-xs text-[#E5E5E5]/30 flex items-center gap-1">
                        <Clock size={10} />
                        {ordine.created_date ? new Date(ordine.created_date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-xs px-2.5 py-1 border border-purple-400/40 text-purple-400 rounded-full whitespace-nowrap">
                      {STATO_LABELS[ordine.stato] || ordine.stato}
                    </span>
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
                        value={sconti[ordine.id] || ''}
                        onChange={e => setSconti(prev => ({ ...prev, [ordine.id]: e.target.value }))}
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
                          onClick={() => setMetodi(prev => ({ ...prev, [ordine.id]: value }))}
                          className={`flex-1 py-3 border rounded-sm font-body text-sm transition-all flex items-center justify-center gap-2 ${metodi[ordine.id] === value || (!metodi[ordine.id] && value === 'contanti') ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                          <Icon size={15} /> {label}
                        </button>
                      ))}
                    </div>

                    {/* Chiudi */}
                    <button onClick={() => chiudiOrdine(ordine)} disabled={closing === ordine.id}
                      className="w-full py-4 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      {closing === ordine.id ? 'Chiusura...' : 'Chiudi & Incassa'}
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