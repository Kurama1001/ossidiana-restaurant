import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { StatusBadgeRes } from './AdminDashboard';
import { Check, X, Trash2 } from 'lucide-react';

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    base44.entities.Reservation.list('-created_date', 100).then(setReservations).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Reservation.update(id, { status });
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deleteRes = async (id) => {
    if (!confirm('Eliminare questa prenotazione?')) return;
    await base44.entities.Reservation.delete(id);
    setReservations(prev => prev.filter(r => r.id !== id));
  };

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${
              filter === f ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
            }`}
          >{{ all: 'Tutte', pending: 'In attesa', confirmed: 'Confermate', cancelled: 'Annullate' }[f]}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#E5E5E5]/30 font-body text-sm">Nessuna prenotazione trovata.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-5 flex flex-wrap gap-4 items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display text-lg text-white">{r.customer_name}</h3>
                  <StatusBadgeRes status={r.status} />
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-body text-[#E5E5E5]/50">
                  <span>📅 {r.res_date} · {r.res_time}</span>
                  <span>👥 {r.guests} persone</span>
                  <span>📞 {r.phone}</span>
                  {r.email && <span>✉ {r.email}</span>}
                </div>
                {r.notes && <p className="text-xs font-body text-[#E5E5E5]/40 mt-2 italic">"{r.notes}"</p>}
              </div>
              <div className="flex items-center gap-2">
                {r.status !== 'confirmed' && (
                  <button onClick={() => updateStatus(r.id, 'confirmed')} className="p-2 border border-green-400/30 text-green-400 hover:bg-green-400 hover:text-[#0A0A0B] transition-all rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center" title="Conferma">
                    <Check size={14} />
                  </button>
                )}
                {r.status !== 'cancelled' && (
                  <button onClick={() => updateStatus(r.id, 'cancelled')} className="p-2 border border-red-400/30 text-red-400 hover:bg-red-400 hover:text-white transition-all rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center" title="Annulla">
                    <X size={14} />
                  </button>
                )}
                <button onClick={() => deleteRes(r.id)} className="p-2 border border-[#E5E5E5]/10 text-[#E5E5E5]/30 hover:border-red-400 hover:text-red-400 transition-all rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center" title="Elimina">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}