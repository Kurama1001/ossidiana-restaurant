export default function ShiftCapacityBar({ label, confirmed, pending, capacity, color, Icon }) {
  const total = confirmed + pending;
  const free = Math.max(0, capacity - total);
  const pct = capacity > 0 ? Math.min(100, (total / capacity) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={12} style={{ color }} />}
        <span className="font-body text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>{label}</span>
        <span className="font-body text-[9px] text-[#E5E5E5]/20 ml-auto">/{capacity}</span>
      </div>
      <div className="flex items-center gap-2 font-body text-xs">
        <span className="font-semibold" style={{ color }}>{confirmed}</span>
        <span className="text-[#E5E5E5]/25 text-[10px]">conf</span>
        {pending > 0 && (
          <>
            <span className="font-semibold text-yellow-400">{pending}</span>
            <span className="text-[#E5E5E5]/25 text-[10px]">att</span>
          </>
        )}
        <span className="font-semibold text-green-400 ml-auto">{free}</span>
        <span className="text-[#E5E5E5]/25 text-[10px]">lib</span>
      </div>
      <div className="h-2 bg-[#0A0A0B] rounded-full overflow-hidden flex">
        {confirmed > 0 && (
          <div className="h-full transition-all duration-500" style={{ width: `${capacity > 0 ? (confirmed / capacity) * 100 : 0}%`, background: color }} />
        )}
        {pending > 0 && (
          <div className="h-full bg-yellow-400/40 transition-all duration-500" style={{ width: `${capacity > 0 ? (pending / capacity) * 100 : 0}%` }} />
        )}
      </div>
    </div>
  );
}