import { Clock } from 'lucide-react';

const ORARI_SETTIMANA = [
  { giorno: 'Lunedì',    fasce: ['12:30 – 15:30', '19:00 – 22:30'] },
  { giorno: 'Martedì',   fasce: [] },
  { giorno: 'Mercoledì', fasce: [] },
  { giorno: 'Giovedì',   fasce: ['12:30 – 15:30', '19:00 – 22:30'] },
  { giorno: 'Venerdì',   fasce: ['12:30 – 15:30', '17:30 – 22:30'] },
  { giorno: 'Sabato',    fasce: ['12:30 – 15:30', '17:30 – 22:30'] },
  { giorno: 'Domenica',  fasce: ['12:30 – 16:00'] },
];

/**
 * OrariList — elenco giorni/orari nel formato:
 * giorno a sinistra, fasce orarie allineate a destra ("Chiuso" se giorno di riposo).
 */
export default function OrariList({ className = '' }) {
  return (
    <div className={`font-body text-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-[#C69C6D] shrink-0" />
        <span className="text-[#E5E5E5]/50 text-xs uppercase tracking-widest">Orari di apertura</span>
      </div>
      <ul className="space-y-3">
        {ORARI_SETTIMANA.map(({ giorno, fasce }) => (
          <li key={giorno} className="flex items-start justify-between gap-4">
            <span className="text-[#E5E5E5]/70">{giorno}</span>
            {fasce.length === 0 ? (
              <span className="text-[#E5E5E5]/40 italic">Chiuso</span>
            ) : (
              <span className="flex flex-col items-end text-[#E5E5E5]/70">
                {fasce.map(f => <span key={f}>{f}</span>)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}