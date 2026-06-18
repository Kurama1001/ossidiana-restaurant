import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

const STATI_LABELS = { inviato: 'Nuovo', ricevuto: 'Ricevuto', in_preparazione: 'In prep.', pronto: 'Pronto' };
const STATI_COLORS = {
  inviato:         'bg-red-500/20 border-red-500/60 text-red-300',
  ricevuto:        'bg-blue-500/20 border-blue-500/60 text-blue-300',
  in_preparazione: 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300',
  pronto:          'bg-green-500/20 border-green-500/60 text-green-300',
};

function minutiDa(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

export default function AdminCucina() {
  const [righe, setRighe] = useState([]);
  const [filtro, setFiltro] = useState('tutte');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const prevCount = useRef(0);

  const load = async () => {
    const data = await base44.entities.RigaOrdine.filter({ reparto: 'cucina' }, 'created_date', 200);
    const attive = data.filter(r => ['inviato','ricevuto','in_preparazione','pronto'].includes(r.stato));
    prevCount.current = attive.length;
    setRighe(attive);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const cambiaStato = async (riga, nuovoStato) => {
    setUpdating(riga.id);
    const extra = nuovoStato === 'pronto' ? { ready_at: new Date().toISOString() } : {};
    await base44.entities.RigaOrdine.update(riga.id, { stato: nuovoStato, ...extra });
    if (nuovoStato === 'pronto') {
      setRighe(prev => prev.filter(r => r.id !== riga.id));
    } else {
      setRighe(prev => prev.map(r => r.id === riga.id ? { ...r, stato: nuovoStato, ...extra } : r));
    }
    setUpdating(null);
  };

  const filtrate = filtro === 'tutte' ? righe : righe.filter(r => r.stato === filtro);
  const grouped = filtrate.reduce((acc, r) => {
    const key = r.numero_tavolo || r.tavolo_id;
    if (!acc[key]) acc[key] = { numero: r.numero_tavolo, righe: [] };
    acc[key].righe.push(r);
    return acc;
  }, {});

  const nuoveCount = righe.filter(r => r.stato === 'inviato').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl text-white tracking-widest">Cucina</h2>
          {nuoveCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              {nuoveCount} nuov{nuoveCount === 1 ? 'a' : 'e'}
            </span>
          )}
        </div>
        <button onClick={load} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {[['tutte','Tutte'], ['inviato','Nuove'], ['ricevuto','Ricevute'], ['in_preparazione','In prep.']].map(([val, lab]) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`px-4 py-2 rounded-sm text-sm font-body border transition-all ${filtro === val ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
            {lab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#E5E5E5]/30 font-body">Caricamento...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-20 text-center text-[#E5E5E5]/30 font-body text-lg">Nessuna comanda in attesa</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, group]) => (
            <div key={key} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm overflow-hidden">
              <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-[#C69C6D]/10">
                <span className="font-display text-xl text-white">Tavolo {group.numero}</span>
                <span className="text-[#E5E5E5]/30 font-body text-sm">{group.righe.length} articoli</span>
              </div>
              <div className="divide-y divide-[#C69C6D]/5">
                {group.righe.map(riga => {
                  const min = minutiDa(riga.sent_at || riga.created_date);
                  return (
                    <div key={riga.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-body text-white text-base font-semibold">
                            {riga.quantita}× {riga.nome_item}
                          </span>
                          {riga.priorita === 'urgente' && <AlertCircle size={15} className="text-red-400" />}
                        </div>
                        {riga.note && <p className="font-body text-yellow-300/80 text-sm italic">📝 {riga.note}</p>}
                        {min !== null && (
                          <div className="flex items-center gap-1 text-[#E5E5E5]/30 text-xs font-body mt-1">
                            <Clock size={11} /> {min} min fa
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {riga.stato === 'inviato' && (
                          <button onClick={() => cambiaStato(riga, 'ricevuto')} disabled={updating === riga.id}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-sm font-body text-sm font-semibold transition-all">
                            ✓ Ricevuto
                          </button>
                        )}
                        {riga.stato === 'ricevuto' && (
                          <button onClick={() => cambiaStato(riga, 'in_preparazione')} disabled={updating === riga.id}
                            className="px-4 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-sm font-body text-sm font-semibold transition-all">
                            🍳 In prep.
                          </button>
                        )}
                        {(riga.stato === 'in_preparazione' || riga.stato === 'ricevuto') && (
                          <button onClick={() => cambiaStato(riga, 'pronto')} disabled={updating === riga.id}
                            className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-sm font-body text-sm font-semibold transition-all">
                            ✔ Pronto
                          </button>
                        )}
                        <span className={`px-3 py-1.5 border rounded-sm text-xs font-body self-center ${STATI_COLORS[riga.stato] || ''}`}>
                          {STATI_LABELS[riga.stato]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}