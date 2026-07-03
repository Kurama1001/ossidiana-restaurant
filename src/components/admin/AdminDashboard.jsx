import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarDays, ShoppingBag, Clock, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    base44.entities.Reservation.filter({ res_date: today }, '-created_date', 50).then(setReservations).catch(() => {});
    base44.entities.Order.list('-created_date', 50).then(setOrders).catch(() => {});
  }, []);

  const todayOrders = orders.filter(o => {
    const d = new Date(o.created_date);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  });

  const activeOrders = orders.filter(o => ['ricevuto', 'in_preparazione', 'pronto'].includes(o.status));
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

  const stats = [
    { label: 'Prenotazioni oggi', value: reservations.length, icon: CalendarDays, color: 'text-blue-300' },
    { label: 'Ordini oggi', value: todayOrders.length, icon: ShoppingBag, color: 'text-green-400' },
    { label: 'Ordini attivi', value: activeOrders.length, icon: Clock, color: 'text-[#C69C6D]' },
    { label: 'Incasso oggi', value: `€${todayRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <Icon size={20} className={s.color} />
              </div>
              <p className="font-display text-3xl text-white mb-1">{s.value}</p>
              <p className="font-body text-xs text-[#E5E5E5]/40 tracking-wide">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-6">
        <h3 className="font-display text-xl text-white mb-5">Prenotazioni di oggi</h3>
        {reservations.length === 0 ? (
          <p className="text-[#E5E5E5]/30 font-body text-sm">Nessuna prenotazione per oggi.</p>
        ) : (
          <div className="space-y-2">
            {reservations.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[#C69C6D]/5">
                <div>
                  <p className="font-body text-sm text-white">{r.customer_name}</p>
                  <p className="font-body text-xs text-[#E5E5E5]/40">{r.guests} persone · {r.res_time}</p>
                </div>
                <StatusBadgeRes status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-6">
        <h3 className="font-display text-xl text-white mb-5">Ordini in corso</h3>
        {activeOrders.length === 0 ? (
          <p className="text-[#E5E5E5]/30 font-body text-sm">Nessun ordine attivo.</p>
        ) : (
          <div className="space-y-2">
            {activeOrders.map(o => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[#C69C6D]/5">
                <div>
                  <p className="font-body text-sm text-white">{o.customer_name}</p>
                  <p className="font-body text-xs text-[#E5E5E5]/40">Ritiro: {o.pickup_time} · €{Number(o.total_amount || 0).toFixed(2)}</p>
                </div>
                <StatusBadgeOrder status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const resStatusMap = {
  nuova: { label: 'Nuova', cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  in_attesa_conferma: { label: 'In attesa', cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  pending: { label: 'In attesa', cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  confermata: { label: 'Confermata', cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
  confirmed: { label: 'Confermata', cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
  modificata: { label: 'Modificata', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  rifiutata: { label: 'Rifiutata', cls: 'bg-red-400/10 text-red-400 border-red-400/20' },
  cancellata: { label: 'Cancellata', cls: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
  cancelled: { label: 'Cancellata', cls: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
  completata: { label: 'Completata', cls: 'bg-[#E5E5E5]/10 text-[#E5E5E5]/50 border-[#E5E5E5]/10' },
  no_show: { label: 'No Show', cls: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
};

export function StatusBadgeRes({ status }) {
  const s = resStatusMap[status] || resStatusMap.pending;
  return <span className={`text-xs font-body border px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}

const orderStatusMap = {
  ricevuto: { label: 'Ricevuto', cls: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  in_preparazione: { label: 'In preparazione', cls: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  pronto: { label: 'Pronto', cls: 'bg-green-400/10 text-green-400 border-green-400/20' },
  completato: { label: 'Completato', cls: 'bg-[#E5E5E5]/10 text-[#E5E5E5]/40 border-[#E5E5E5]/10' },
};

export function StatusBadgeOrder({ status }) {
  const s = orderStatusMap[status] || orderStatusMap.ricevuto;
  return <span className={`text-xs font-body border px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>;
}