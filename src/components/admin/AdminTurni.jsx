import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import TurniDayPanel from './turni/TurniDayPanel';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function toIsoDay(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function AdminTurni() {
  const [meseRif, setMeseRif] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [turni, setTurni] = useState([]);
  const [utenti, setUtenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [giornoSel, setGiornoSel] = useState(() => toIsoDay(new Date()));

  const load = async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([
        base44.entities.Turno.list('-created_date', 500),
        base44.entities.User.list().catch(() => []),
      ]);
      setTurni(t);
      setUtenti(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Griglia del mese: parte dal lunedì della settimana che contiene il giorno 1
  const inizioGriglia = new Date(meseRif);
  inizioGriglia.setDate(inizioGriglia.getDate() - ((inizioGriglia.getDay() + 6) % 7));
  const celle = [...Array(42)].map((_, i) => {
    const d = new Date(inizioGriglia);
    d.setDate(inizioGriglia.getDate() + i);
    return d;
  });

  const turniPerGiorno = (iso) => turni.filter(t => t.data === iso);
  const meseLabel = meseRif.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const isOggi = toIsoDay(new Date());

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl text-white tracking-widest">Turni</h2>
          <p className="font-body text-[#E5E5E5]/40 text-sm mt-0.5">
            {loading ? 'Caricamento…' : `${turni.length} turni registrati`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMeseRif(new Date(meseRif.getFullYear(), meseRif.getMonth() - 1, 1))}
            className="p-2.5 border border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <ChevronLeft size={15} />
          </button>
          <span className="font-display text-lg text-[#C69C6D] tracking-widest capitalize min-w-[150px] text-center">{meseLabel}</span>
          <button onClick={() => setMeseRif(new Date(meseRif.getFullYear(), meseRif.getMonth() + 1, 1))}
            className="p-2.5 border border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <ChevronRight size={15} />
          </button>
          <button onClick={load} className="p-2.5 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Intestazione giorni settimana */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {GIORNI.map(g => (
          <span key={g} className="font-body text-[10px] text-[#E5E5E5]/30 uppercase tracking-widest text-center">{g}</span>
        ))}
      </div>

      {/* Griglia mese */}
      <div className="grid grid-cols-7 gap-1.5 mb-6">
        {celle.map(d => {
          const iso = toIsoDay(d);
          const delGiorno = turniPerGiorno(iso);
          const nPranzo = delGiorno.filter(t => t.turno === 'pranzo').length;
          const nCena = delGiorno.filter(t => t.turno === 'cena').length;
          return (
            <button key={iso} onClick={() => setGiornoSel(iso)}
              className={`min-h-[76px] border rounded-sm p-1.5 text-left transition-all ${
                iso === giornoSel
                  ? 'border-[#C69C6D] bg-[#C69C6D]/10'
                  : 'border-[#E5E5E5]/10 bg-[#161618] hover:border-[#C69C6D]/40'
              } ${d.getMonth() !== meseRif.getMonth() ? 'opacity-30' : ''}`}>
              <div className="flex items-center justify-between">
                <span className={`font-body text-sm font-semibold ${iso === isOggi ? 'text-[#C69C6D]' : 'text-white'}`}>{d.getDate()}</span>
                {iso === isOggi && <span className="font-body text-[8px] text-[#C69C6D] uppercase tracking-wider">oggi</span>}
              </div>
              {(nPranzo > 0 || nCena > 0) && (
                <div className="mt-1 flex flex-col gap-0.5">
                  {nPranzo > 0 && <span className="font-body text-[10px] text-yellow-400/80">☀ {nPranzo}</span>}
                  {nCena > 0 && <span className="font-body text-[10px] text-blue-300/80">🌙 {nCena}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Pannello giorno selezionato */}
      <TurniDayPanel data={giornoSel} turni={turniPerGiorno(giornoSel)} utenti={utenti} onChanged={load} />
    </div>
  );
}