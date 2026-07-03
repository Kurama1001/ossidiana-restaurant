import { CalendarDays, Users, Clock, Bell, AlertTriangle, TrendingDown, Phone, Globe } from 'lucide-react';
import { hasAlertNotes, FONTE_LABELS, isPendingStatus } from './utils';

export default function ReservationStats({ reservations, today }) {
  const todayRes = reservations.filter(r => r.res_date === today);
  const todayActive = todayRes.filter(r => !['cancellata', 'cancelled', 'rifiutata'].includes(r.status));
  const newPending = reservations.filter(r => isPendingStatus(r.status));
  const futureRes = reservations.filter(r => r.res_date > today);
  const copertiOggi = todayActive.reduce((s, r) => s + (r.guests || 0), 0);
  const noShowCount = reservations.filter(r => r.status === 'no_show').length;
  const cancelledCount = reservations.filter(r => ['cancellata', 'cancelled'].includes(r.status)).length;

  const weekFromToday = reservations.filter(r => {
    const d = new Date(r.res_date);
    const t = new Date(today);
    const diff = (d - t) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  const fonteCounts = reservations.reduce((acc, r) => {
    const f = r.fonte_prenotazione || 'altro';
    acc[f] = (acc[f] || 0) + 1;
    return acc;
  }, {});

  // Upcoming 2 hours
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const upcomingAlerts = todayActive.filter(r => {
    if (!r.res_time) return false;
    const [h, m] = r.res_time.split(':').map(Number);
    const resDateTime = new Date(now);
    resDateTime.setHours(h, m, 0, 0);
    return resDateTime >= now && resDateTime <= twoHoursLater;
  });

  const alertNoteRes = todayRes.filter(r => hasAlertNotes(r.notes));

  const kpis = [
    { label: 'Nuove da confermare', value: newPending.length, icon: Bell, color: 'text-yellow-400' },
    { label: 'Prenotazioni oggi', value: todayRes.length, icon: CalendarDays, color: 'text-blue-400' },
    { label: 'Coperti oggi', value: copertiOggi, icon: Users, color: 'text-[#C69C6D]' },
    { label: 'Prenotazioni future', value: futureRes.length, icon: Clock, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4">
              <Icon size={18} className={`${k.color} mb-2`} />
              <p className="font-display text-2xl text-white">{k.value}</p>
              <p className="font-body text-xs text-[#E5E5E5]/40 mt-1">{k.label}</p>
            </div>
          );
        })}
      </div>

      {(upcomingAlerts.length > 0 || alertNoteRes.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {upcomingAlerts.length > 0 && (
            <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-yellow-400" />
                <span className="font-body text-xs text-yellow-400 uppercase tracking-widest">Prossime 2 ore</span>
              </div>
              <div className="space-y-1">
                {upcomingAlerts.map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <span className="font-body text-sm text-white">{r.customer_name}</span>
                    <span className="font-body text-xs text-yellow-400">{r.res_time} · {r.guests} pax</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {alertNoteRes.length > 0 && (
            <div className="bg-orange-400/5 border border-orange-400/20 rounded-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-orange-400" />
                <span className="font-body text-xs text-orange-400 uppercase tracking-widest">Note da attenzione</span>
              </div>
              <div className="space-y-1">
                {alertNoteRes.map(r => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <span className="font-body text-sm text-white truncate">{r.customer_name}</span>
                    <span className="font-body text-xs text-orange-400 shrink-0">{r.res_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4">
        <h3 className="font-body text-xs text-[#E5E5E5]/50 uppercase tracking-widest mb-3">Riepilogo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-body">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-blue-400" />
            <span className="text-[#E5E5E5]/60">Oggi:</span>
            <span className="text-white font-semibold">{todayRes.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-green-400" />
            <span className="text-[#E5E5E5]/60">Settimana:</span>
            <span className="text-white font-semibold">{weekFromToday}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#C69C6D]" />
            <span className="text-[#E5E5E5]/60">No show:</span>
            <span className="text-white font-semibold">{noShowCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-[#E5E5E5]/60">Cancellate:</span>
            <span className="text-white font-semibold">{cancelledCount}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#C69C6D]/5">
          <span className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest">Provenienza:</span>
          {Object.entries(fonteCounts).map(([fonte, count]) => (
            <span key={fonte} className="flex items-center gap-1 font-body text-xs text-[#E5E5E5]/60">
              {fonte === 'sito' ? <Globe size={11} className="text-blue-400" /> : <Phone size={11} className="text-[#C69C6D]" />}
              {FONTE_LABELS[fonte] || fonte}: <span className="text-white font-semibold">{count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}