import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AdminReservations from '@/components/admin/AdminReservations';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminMenu from '@/components/admin/AdminMenu';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminGallery from '@/components/admin/AdminGallery';
import AdminChiSiamo from '@/components/admin/AdminChiSiamo';
import AdminReport from '@/components/admin/AdminReport';
import AdminComande from '@/components/admin/AdminComande';
import AdminCucina from '@/components/admin/AdminCucina';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { CalendarDays, ShoppingBag, UtensilsCrossed, Users, LogOut, Images, Info, BarChart2, GripVertical, ClipboardList, ChefHat } from 'lucide-react';

const DEFAULT_TABS = [
  { id: 'comande',      label: 'Comande',       icon: 'ClipboardList' },
  { id: 'cucina',       label: 'Cucina',         icon: 'ChefHat' },
  { id: 'report',       label: 'Report',         icon: 'BarChart2' },
  { id: 'reservations', label: 'Prenotazioni',   icon: 'CalendarDays' },
  { id: 'orders',       label: 'Asporto',        icon: 'ShoppingBag' },
  { id: 'menu',         label: 'Menu',           icon: 'UtensilsCrossed' },
  { id: 'gallery',      label: 'Galleria',       icon: 'Images' },
  { id: 'chi_siamo',    label: 'Chi Siamo',      icon: 'Info' },
  { id: 'users',        label: 'Utenti',         icon: 'Users' },
];

const ICONS = { CalendarDays, ShoppingBag, UtensilsCrossed, Users, Images, Info, BarChart2, ClipboardList, ChefHat };

const TAB_COMPONENTS = {
  comande:      AdminComande,
  cucina:       AdminCucina,
  reservations: AdminReservations,
  orders:       AdminOrders,
  menu:         AdminMenu,
  report:       AdminReport,
  gallery:      AdminGallery,
  chi_siamo:    AdminChiSiamo,
  users:        AdminUsers,
};

const STORAGE_KEY = 'ossidiana_admin_tab_order';

function loadTabOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const ids = JSON.parse(saved);
      const ordered = ids.map(id => DEFAULT_TABS.find(t => t.id === id)).filter(Boolean);
      const missing = DEFAULT_TABS.filter(t => !ids.includes(t.id));
      return [...ordered, ...missing];
    }
  } catch {}
  return DEFAULT_TABS;
}

export default function Admin() {
  const [tabs, setTabs] = useState(loadTabOrder);
  const [activeTab, setActiveTab] = useState('comande');
  const [reordering, setReordering] = useState(false);
  const [newResCount, setNewResCount] = useState(0);
  const { logout } = useAuth();

  useEffect(() => {
    const fetchNewRes = () => {
      base44.entities.Reservation.list('-created_date', 200).then(res => {
        setNewResCount(res.filter(r => ['nuova', 'in_attesa_conferma', 'pending'].includes(r.status)).length);
      }).catch(() => {});
    };
    fetchNewRes();
    const interval = setInterval(fetchNewRes, 30000);
    return () => clearInterval(interval);
  }, []);

  const TabContent = TAB_COMPONENTS[activeTab];

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(tabs);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setTabs(reordered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reordered.map(t => t.id)));
  };

  return (
    <div className="bg-[#0A0A0B] min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-1">Gestione</p>
            <h1 className="font-display text-4xl text-white tracking-widest">Area Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setReordering(r => !r)}
              className={`flex items-center gap-2 text-sm font-body px-3 py-2 border rounded-sm transition-colors ${reordering ? 'border-[#C69C6D] text-[#C69C6D] bg-[#C69C6D]/10' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40'}`}
            >
              <GripVertical size={14} /> {reordering ? 'Fine' : 'Ordina'}
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 text-sm font-body text-[#E5E5E5]/40 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} /> Esci
            </button>
          </div>
        </div>

        {/* Tab nav con drag & drop */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="admin-tabs" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-wrap gap-2 mb-8 border-b border-[#C69C6D]/10 pb-4"
              >
                {tabs.map((tab, index) => {
                  const Icon = ICONS[tab.icon];
                  const isActive = activeTab === tab.id;
                  return (
                    <Draggable key={tab.id} draggableId={tab.id} index={index} isDragDisabled={!reordering}>
                      {(prov, snapshot) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...(reordering ? prov.dragHandleProps : {})}
                          style={prov.draggableProps.style}
                        >
                          <button
                            onClick={() => !reordering && setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-body tracking-wide rounded-sm border transition-all min-h-[44px] ${
                              snapshot.isDragging
                                ? 'border-[#C69C6D] bg-[#C69C6D]/20 text-[#C69C6D] shadow-lg'
                                : isActive && !reordering
                                  ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold'
                                  : reordering
                                    ? 'border-[#C69C6D]/30 text-[#E5E5E5]/60 cursor-grab active:cursor-grabbing'
                                    : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
                            }`}
                          >
                            {reordering && <GripVertical size={12} className="text-[#C69C6D]/50" />}
                            {Icon && <Icon size={14} />}
                            {tab.label}
                            {tab.id === 'reservations' && newResCount > 0 && (
                              <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {newResCount}
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {TabContent && (
          activeTab === 'comande'
            ? <AdminComande onGoToHome={() => {}} />
            : <TabContent />
        )}
      </div>
    </div>
  );
}