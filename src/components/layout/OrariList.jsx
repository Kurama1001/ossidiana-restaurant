import { Clock } from 'lucide-react';

const ORARI_SETTIMANA = [
  { giorno: 'Lunedì',    fasce: ['12:30 – 15:30', '17:30 – 22:30'] },
  { giorno: 'Martedì',   fasce: [] },
  { giorno: 'Mercoledì', fasce: [] },
  { giorno: 'Giovedì',   fasce: ['12:30 – 15:30', '17:30 – 22:30'] },
  { giorno: 'Venerdì',   fasce: ['12:30 – 15:30', '17:30 – 22:30'] },
  { giorno: 'Sabato',    fasce: ['12:30 – 15:30', '17:30 – 22:30'] },
  { giorno: 'Domenica',  fasce: ['12:30 – 16:00'] },
  { giorno: 'Domenica sera', fasce: [] },
];

/**
 * OrariList — come nel profilo: giorni a sinistra, orari di apertura
 * allineati a destra per ogni singolo giorno ("Chiuso" nei giorni di riposo).
 */
export default function OrariList({ className = '' }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <Clock size={14} className="text-[#C69C6D] shrink-0 mt-1" />
      <ul className="flex-1 font-body text-sm space-y-3">
        {ORARI_SETTIMANA.map(({ giorno, fasce }) => (
          <li key={giorno} className="flex items-start justify-between gap-3 sm:gap-4">
            <span className={`shrink-0 whitespace-nowrap ${giorno === 'Domenica sera' ? 'text-[#E5E5E5]/50 pl-3' : 'text-[#E5E5E5]/70'}`}>{giorno}</span>
            {fasce.length === 0 ? (
              <span className="shrink-0 text-[#E5E5E5]/40">Chiuso</span>
            ) : (
              <span className="flex flex-col items-end text-[#E5E5E5]/70 text-right">
                {fasce.map(f => <span key={f} className="whitespace-nowrap">{f}</span>)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}