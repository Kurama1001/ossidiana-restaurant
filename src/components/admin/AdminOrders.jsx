import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { StatusBadgeOrder } from './AdminDashboard';
import { ChevronDown, ChevronUp } from 'lucide-react';

const STATUSES = ['ricevuto', 'in_preparazione', 'pronto', 'completato'];
const STATUS_LABELS = { ricevuto: 'Ricevuto', in_preparazione: 'In preparazione', pronto: 'Pronto', completato: 'Completato' };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});

  const load = () => {
    base44.entities.Order.list('-created_date', 100).then(setOrders).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Order.update(id, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', ...STATUSES].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${
              filter === f ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
            }`}
          >{f === 'all' ? 'Tutti' : STATUS_LABELS[f]}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#E5E5E5]/30 font-body text-sm">Nessun ordine trovato.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-5 transition-all">
              <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-display text-lg text-white">{o.customer_name}</h3>
                    <StatusBadgeOrder status={o.status} />
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-body text-[#E5E5E5]/50">
                    <span>🕐 Ritiro: {o.pickup_time}</span>
                    <span>📞 {o.phone}</span>
                    <span className="text-[#C69C6D]">€{Number(o.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={o.status}
                    onChange={e => updateStatus(o.id, e.target.value)}
                    className="bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] text-xs font-body px-3 py-2 rounded-sm focus:border-[#C69C6D] outline-none"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [o.id]: !prev[o.id] }))}
                    className="p-2 border border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D] transition-all rounded-sm min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    {expanded[o.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {expanded[o.id] && (
                <div className="mt-4 border-t border-[#C69C6D]/10 pt-4">
                  <p className="text-xs font-body text-[#E5E5E5]/40 mb-2 tracking-widest uppercase">Piatti ordinati:</p>
                  {(o.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm font-body text-[#E5E5E5]/70 py-1">
                      <span>{item.name} × {item.qty}</span>
                      <span className="text-[#C69C6D]">€{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  {o.notes && <p className="text-xs font-body text-[#E5E5E5]/40 mt-3 italic">Note: "{o.notes}"</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}