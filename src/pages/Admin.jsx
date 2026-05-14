import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminReservations from '@/components/admin/AdminReservations';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminMenu from '@/components/admin/AdminMenu';
import AdminUsers from '@/components/admin/AdminUsers';
import { LayoutDashboard, CalendarDays, ShoppingBag, UtensilsCrossed, Users, LogOut } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reservations', label: 'Prenotazioni', icon: CalendarDays },
  { id: 'orders', label: 'Ordini', icon: ShoppingBag },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'users', label: 'Utenti', icon: Users },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logout } = useAuth();

  const TabContent = {
    dashboard: AdminDashboard,
    reservations: AdminReservations,
    orders: AdminOrders,
    menu: AdminMenu,
    users: AdminUsers,
  }[activeTab];

  return (
    <div className="bg-[#0A0A0B] min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-1">Gestione</p>
            <h1 className="font-display text-4xl text-white tracking-widest">Area Admin</h1>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm font-body text-[#E5E5E5]/40 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} /> Esci
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-[#C69C6D]/10 pb-4">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-body tracking-wide rounded-sm border transition-all min-h-[44px] ${
                  activeTab === tab.id
                    ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold'
                    : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <TabContent />
      </div>
    </div>
  );
}