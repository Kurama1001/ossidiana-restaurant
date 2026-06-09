import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BronzeButton } from '@/components/ui/BronzeButton';
import { Package, Clock, CheckCircle, ChefHat, ShoppingBag, LogOut } from 'lucide-react';

const STATUS_CONFIG = {
  ricevuto:        { label: 'Ricevuto',        color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',    icon: ShoppingBag },
  in_preparazione: { label: 'In Preparazione', color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20',  icon: ChefHat },
  pronto:          { label: 'Pronto',           color: 'text-[#C69C6D]', bg: 'bg-[#C69C6D]/10 border-[#C69C6D]/20', icon: Clock },
  completato:      { label: 'Completato',       color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20',  icon: CheckCircle },
};

export default function Profilo() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (!authed) {
        window.location.href = '/login';
        return;
      }
      const [me, myOrders] = await Promise.all([
        base44.auth.me(),
        base44.entities.Order.list('-created_date', 50),
      ]);
      setUser(me);
      setOrders(myOrders);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0A0A0B] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C69C6D]/30 border-t-[#C69C6D] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0B] min-h-screen pt-24 pb-20 px-5">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center py-12">
          <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">Il tuo</p>
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-widest">Profilo</h1>
          <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
        </div>

        {/* User info */}
        <div className="bg-[#161618] border border-[#C69C6D]/15 rounded-sm p-6 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-xl text-white">{user?.full_name || 'Ospite'}</p>
            <p className="font-body text-[#E5E5E5]/40 text-sm mt-1">{user?.email}</p>
          </div>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-2 text-xs font-body tracking-widest uppercase text-[#E5E5E5]/40 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            Esci
          </button>
        </div>

        {/* Orders history */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Package size={18} className="text-[#C69C6D]" />
            <h2 className="font-display text-2xl text-white tracking-widest">Cronologia Ordini</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-10 text-center">
              <ShoppingBag size={36} className="text-[#C69C6D]/30 mx-auto mb-4" />
              <p className="font-body text-[#E5E5E5]/40 text-sm">Nessun ordine ancora effettuato.</p>
              <div className="mt-6">
                <BronzeButton to="/ordini" variant="outline">Ordina Ora</BronzeButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ricevuto;
                const Icon = cfg.icon;
                const total = order.total_amount ?? order.items?.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
                return (
                  <div key={order.id} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-body text-[#E5E5E5]/60 text-xs tracking-widest uppercase mb-1">
                          {new Date(order.created_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                          {order.pickup_time && <span className="ml-2 text-[#C69C6D]">· Ritiro {order.pickup_time}</span>}
                        </p>
                        <p className="font-display text-lg text-white">{order.customer_name}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-body font-semibold tracking-widest uppercase ${cfg.bg} ${cfg.color}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="border-t border-[#E5E5E5]/5 pt-4 space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span className="font-body text-[#E5E5E5]/60 text-sm">{item.qty}× {item.name}</span>
                            <span className="font-body text-[#E5E5E5]/40 text-sm">€{(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center border-t border-[#E5E5E5]/5 pt-3 mt-2">
                          <span className="font-body text-[#E5E5E5]/50 text-sm tracking-widest uppercase">Totale</span>
                          <span className="font-body text-[#C69C6D] font-semibold">€{total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <p className="mt-3 font-body text-[#E5E5E5]/30 text-xs italic">Note: {order.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}