import { useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDayName, formatDayNumber, formatMonthShort, isPendingStatus, isCancelledStatus, getTurno } from './utils';

export default function AgendaDayStrip({ reservations, selectedDate, onSelectDate, today }) {
  const scrollRef = useRef(null);

  const days = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    return Array.from({ length: 45 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [today]);

  const dayStats = useMemo(() => {
    const stats = {};
    reservations.forEach(r => {
      if (!r.res_date) return;
      if (!stats[r.res_date]) stats[r.res_date] = { count: 0, coperti: 0, pending: 0, pranzo: 0, cena: 0 };
      if (!isCancelledStatus(r.status)) {
        stats[r.res_date].count++;
        stats[r.res_date].coperti += r.guests || 0;
        const turno = getTurno(r.res_time);
        if (turno === 'pranzo') stats[r.res_date].pranzo += r.guests || 0;
        else stats[r.res_date].cena += r.guests || 0;
      }
      if (isPendingStatus(r.status)) stats[r.res_date].pending++;
    });
    return stats;
  }, [reservations]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-date="${selectedDate}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center gap-1.5 mb-4">
      <button onClick={() => scrollBy(-1)}
        className="shrink-0 p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
        <ChevronLeft size={16} />
      </button>
      <div ref={scrollRef} className="flex-1 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
        {days.map(dateStr => {
          const stats = dayStats[dateStr] || { count: 0, coperti: 0, pending: 0, pranzo: 0, cena: 0 };
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          return (
            <button key={dateStr} data-date={dateStr} onClick={() => onSelectDate(dateStr)}
              className={`shrink-0 w-[68px] flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-sm border transition-all min-h-[88px] justify-center ${
                isSelected ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]' :
                isToday ? 'border-[#C69C6D]/50 text-[#C69C6D] bg-[#C69C6D]/5' :
                'border-[#E5E5E5]/10 text-[#E5E5E5]/50 hover:border-[#C69C6D]/30'
              }`}>
              <span className="font-body text-[10px] uppercase tracking-widest">{formatDayName(dateStr)}</span>
              <span className="font-display text-xl leading-none">{formatDayNumber(dateStr)}</span>
              <span className="font-body text-[9px] uppercase">{formatMonthShort(dateStr)}</span>
              {stats.count > 0 ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`flex items-center gap-0.5 text-[10px] font-body font-semibold ${isSelected ? 'text-[#0A0A0B]/70' : 'text-yellow-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0A0A0B]/70' : 'bg-yellow-400'}`} />
                    {stats.pranzo}
                  </span>
                  <span className={`flex items-center gap-0.5 text-[10px] font-body font-semibold ${isSelected ? 'text-[#0A0A0B]/70' : 'text-blue-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0A0A0B]/70' : 'bg-blue-400'}`} />
                    {stats.cena}
                  </span>
                </div>
              ) : (
                <span className="mt-1 text-[10px] font-body opacity-25">·</span>
              )}
              {stats.pending > 0 && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0A0A0B]' : 'bg-yellow-400'}`} title="In attesa di conferma" />
              )}
            </button>
          );
        })}
      </div>
      <button onClick={() => scrollBy(1)}
        className="shrink-0 p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}