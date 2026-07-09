import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, RefreshCw, Search, CalendarDays, Users, Sun, Moon, ChevronLeft, ChevronRight, LayoutGrid, Map } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';
import ReservationCard from '@/components/admin/reservations/ReservationCard';
import ReservationFormModal from '@/components/admin/reservations/ReservationFormModal';
import ActionModal from '@/components/admin/reservations/ActionModal';
import ReservationStats from '@/components/admin/reservations/ReservationStats';
import AgendaDayStrip from '@/components/admin/reservations/AgendaDayStrip';
import ShiftCapacityBar from '@/components/admin/reservations/ShiftCapacityBar';
import FloorPlanView from '@/components/admin/reservations/FloorPlanView';
import { buildConfirmMessage, buildRejectMessage, buildUpdateMessage, buildCancelMessage, FONTE_LABELS, isPendingStatus, isConfirmedStatus, isCancelledStatus, getTurno, formatDateLong } from '@/components/admin/reservations/utils';

export default function AdminReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [turnoFilter, setTurnoFilter] = useState('all');
  const [orarioFilter, setOrarioFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFonte, setFilterFonte] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [capacity, setCapacity] = useState(60);
  const [tavoli, setTavoli] = useState([]);
  const [viewMode, setViewMode] = useState('agenda');

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Reservation.list('-created_date', 500);
      setReservations(all);
      const nuove = all.filter(r => ['nuova', 'in_attesa_conferma'].includes(r.status) && !r.notificata_admin);
      if (nuove.length > 0) {
        Promise.all(nuove.map(r => base44.entities.Reservation.update(r.id, { notificata_admin: true }).catch(() => {})));
      }
      try {
        const tlist = await base44.entities.Tavolo.list();
        setTavoli(tlist);
        const tot = tlist.reduce((s, t) => s + (t.coperti || 0), 0);
        if (tot > 0) setCapacity(tot);
      } catch { /* keep default */ }
    } catch (e) {
      console.error('Error loading reservations:', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async (r) => {
    const now = new Date().toISOString();
    const adminName = user?.full_name || user?.email || 'admin';
    await base44.entities.Reservation.update(r.id, {
      status: 'confermata',
      confermata_da_admin: true,
      data_conferma: now,
      admin_conferma: adminName
    });
    const updated = { ...r, status: 'confermata', confermata_da_admin: true, data_conferma: now, admin_conferma: adminName };
    setReservations(prev => prev.map(x => x.id === r.id ? updated : x));
    setActionModal({ type: 'conferma', reservation: updated, text: buildConfirmMessage(updated) });
  };

  const handleRejectSubmit = async (motivo) => {
    const r = actionModal.reservation;
    await base44.entities.Reservation.update(r.id, {
      status: 'rifiutata',
      motivo_rifiuto: motivo
    });
    const updated = { ...r, status: 'rifiutata', motivo_rifiuto: motivo };
    setReservations(prev => prev.map(x => x.id === r.id ? updated : x));
    setActionModal({ type: 'rifiuto', reservation: updated, text: buildRejectMessage(updated, motivo) });
  };

  const handleCancel = async (r) => {
    if (!window.confirm('Sei sicuro di voler cancellare questa prenotazione?')) return;
    await base44.entities.Reservation.update(r.id, { status: 'cancellata' });
    const updated = { ...r, status: 'cancellata' };
    setReservations(prev => prev.map(x => x.id === r.id ? updated : x));
    setActionModal({ type: 'cancellazione', reservation: updated, text: buildCancelMessage(updated) });
  };

  const handleComplete = async (r) => {
    await base44.entities.Reservation.update(r.id, { status: 'completata' });
    setReservations(prev => prev.map(x => x.id === r.id ? { ...x, status: 'completata' } : x));
  };

  const handleNoShow = async (r) => {
    if (!window.confirm(`Segnare "${r.customer_name}" come No Show?`)) return;
    await base44.entities.Reservation.update(r.id, { status: 'no_show' });
    setReservations(prev => prev.map(x => x.id === r.id ? { ...x, status: 'no_show' } : x));
  };

  const handleSave = async (data, isEdit, changedFields) => {
    if (isEdit) {
      let status = data.status;
      if (changedFields && (changedFields.res_date || changedFields.res_time || changedFields.guests)) {
        if (isConfirmedStatus(editing.status) && status !== 'cancellata' && status !== 'rifiutata') {
          status = 'modificata';
        }
      }
      const updateData = { ...data, status };
      await base44.entities.Reservation.update(editing.id, updateData);
      const updated = { ...editing, ...updateData };
      setReservations(prev => prev.map(x => x.id === editing.id ? updated : x));
      setShowForm(false);
      setEditing(null);
      if (status === 'modificata' && editing.status !== 'modificata') {
        setActionModal({ type: 'aggiornamento', reservation: updated, text: buildUpdateMessage(updated) });
      }
    } else {
      const createData = {
        ...data,
        notificata_admin: data.fonte_prenotazione !== 'sito',
        confermata_da_admin: data.status === 'confermata' || data.status === 'modificata',
        data_conferma: (data.status === 'confermata' || data.status === 'modificata') ? new Date().toISOString() : undefined,
        admin_conferma: (data.status === 'confermata' || data.status === 'modificata') ? (user?.full_name || user?.email || 'admin') : undefined,
      };
      const created = await base44.entities.Reservation.create(createData);
      setReservations(prev => [created, ...prev]);
      setShowForm(false);
      if (createData.status === 'confermata') {
        setActionModal({ type: 'conferma', reservation: created, text: buildConfirmMessage(created) });
      }
    }
  };

  const openEdit = (r) => { setEditing(r); setShowForm(true); };
  const openCreate = () => { setEditing(null); setShowForm(true); };

  const sendReservationEmailAction = async (action, reservation, extra = {}) => {
    if (!reservation.email) return { success: false, skipped: true, reason: 'no_email' };
    try {
      const res = await base44.functions.invoke('emailService', { action, reservationId: reservation.id, ...extra });
      return res.data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Reservations for the selected day
  const dayReservations = useMemo(() =>
    reservations.filter(r => r.res_date === selectedDate),
    [reservations, selectedDate]
  );

  // Distinct times for orario filter
  const availableTimes = useMemo(() => {
    const times = [...new Set(dayReservations.map(r => r.res_time).filter(Boolean))].sort();
    return times;
  }, [dayReservations]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = [...dayReservations];
    if (turnoFilter !== 'all') list = list.filter(r => getTurno(r.res_time) === turnoFilter);
    if (orarioFilter !== 'all') list = list.filter(r => r.res_time === orarioFilter);
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') list = list.filter(r => isPendingStatus(r.status));
      else list = list.filter(r => r.status === filterStatus);
    }
    if (filterFonte !== 'all') list = list.filter(r => r.fonte_prenotazione === filterFonte);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r =>
        r.customer_name?.toLowerCase().includes(s) ||
        r.phone?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s) ||
        r.notes?.toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => (a.res_time || '').localeCompare(b.res_time || ''));
    return list;
  }, [dayReservations, turnoFilter, orarioFilter, filterStatus, filterFonte, search]);

  // Group by turno
  const pranzoRes = filtered.filter(r => getTurno(r.res_time) === 'pranzo');
  const cenaRes = filtered.filter(r => getTurno(r.res_time) === 'cena');

  // Day totals (active only)
  const dayActive = dayReservations.filter(r => !isCancelledStatus(r.status));
  const dayCoperti = dayActive.reduce((s, r) => s + (r.guests || 0), 0);
  const dayCount = dayActive.length;
  const dayPending = dayActive.filter(r => isPendingStatus(r.status)).length;

  // Per-shift breakdown
  const dayPranzo = dayActive.filter(r => getTurno(r.res_time) === 'pranzo');
  const dayCena = dayActive.filter(r => getTurno(r.res_time) === 'cena');
  const pranzoConf = dayPranzo.filter(r => isConfirmedStatus(r.status)).reduce((s, r) => s + (r.guests || 0), 0);
  const pranzoPend = dayPranzo.filter(r => isPendingStatus(r.status)).reduce((s, r) => s + (r.guests || 0), 0);
  const cenaConf = dayCena.filter(r => isConfirmedStatus(r.status)).reduce((s, r) => s + (r.guests || 0), 0);
  const cenaPend = dayCena.filter(r => isPendingStatus(r.status)).reduce((s, r) => s + (r.guests || 0), 0);

  const shiftDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const renderTurnoSection = (label, Icon, list) => {
    if (turnoFilter !== 'all' && turnoFilter !== label.toLowerCase()) return null;
    const coperti = list.filter(r => !isCancelledStatus(r.status)).reduce((s, r) => s + (r.guests || 0), 0);
    const count = list.filter(r => !isCancelledStatus(r.status)).length;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-[#C69C6D]/10">
          <Icon size={18} className={label === 'Pranzo' ? 'text-yellow-400' : 'text-blue-400'} />
          <h3 className="font-display text-lg text-white tracking-widest uppercase">{label}</h3>
          <span className="font-body text-xs text-[#E5E5E5]/40">
            {count} {count === 1 ? 'prenotazione' : 'prenotazioni'} · <span className="text-[#C69C6D] font-semibold">{coperti} coperti</span>
          </span>
        </div>
        {list.length === 0 ? (
          <p className="font-body text-sm text-[#E5E5E5]/20 py-4 pl-1">Nessuna prenotazione</p>
        ) : (
          <div className="space-y-3">
            {list.map(r => (
              <ReservationCard key={r.id} r={r}
                onConfirm={handleConfirm}
                onReject={(r) => setActionModal({ type: 'rifiuto', reservation: r, text: null })}
                onEdit={openEdit}
                onCancel={handleCancel}
                onComplete={handleComplete}
                onNoShow={handleNoShow}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Agenda Prenotazioni</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 border border-[#C69C6D]/20 rounded-sm overflow-hidden">
            <button onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-body transition-all min-h-[40px] ${
                viewMode === 'agenda' ? 'bg-[#C69C6D] text-[#0A0A0B] font-bold' : 'text-[#E5E5E5]/50 hover:text-[#C69C6D]'
              }`}>
              <LayoutGrid size={14} /> Agenda
            </button>
            <button onClick={() => setViewMode('sala')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-body transition-all min-h-[40px] ${
                viewMode === 'sala' ? 'bg-[#C69C6D] text-[#0A0A0B] font-bold' : 'text-[#E5E5E5]/50 hover:text-[#C69C6D]'
              }`}>
              <Map size={14} /> Sala
            </button>
          </div>
          <button onClick={load} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
            <RefreshCw size={16} />
          </button>
          <BronzeButton onClick={openCreate} variant="solid">
            <Plus size={14} /> Aggiungi Prenotazione
          </BronzeButton>
        </div>
      </div>

      <ReservationStats reservations={reservations} today={today} />

      {/* Day strip — scrollable horizontal calendar */}
      <AgendaDayStrip
        reservations={reservations}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        today={today}
      />

      {/* Day header + summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => shiftDate(-1)}
            className="p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="font-display text-lg text-white">{formatDateLong(selectedDate)}</p>
            {selectedDate === today && <p className="font-body text-[10px] text-[#C69C6D] uppercase tracking-widest">Oggi</p>}
          </div>
          <button onClick={() => shiftDate(1)}
            className="p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/40 hover:text-[#C69C6D] rounded-sm transition-all">
            <ChevronRight size={16} />
          </button>
          {selectedDate !== today && (
            <button onClick={() => setSelectedDate(today)}
              className="ml-1 px-3 py-1.5 text-xs font-body border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
              Oggi
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <ShiftCapacityBar label="Pranzo" confirmed={pranzoConf} pending={pranzoPend} capacity={capacity} color="#facc15" Icon={Sun} />
          <ShiftCapacityBar label="Cena" confirmed={cenaConf} pending={cenaPend} capacity={capacity} color="#60a5fa" Icon={Moon} />
          <div className="w-px h-10 bg-[#C69C6D]/10 hidden sm:block" />
          <div className="text-right">
            <p className="font-display text-3xl text-[#C69C6D] leading-none">{dayCount}</p>
            <p className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest mt-1">Prenotazioni</p>
          </div>
          <div className="w-px h-10 bg-[#C69C6D]/10" />
          <div className="text-right">
            <p className="font-display text-3xl text-white leading-none">{dayCoperti}</p>
            <p className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest mt-1">Coperti</p>
          </div>
          {dayPending > 0 && (
            <>
              <div className="w-px h-10 bg-[#C69C6D]/10" />
              <div className="text-right">
                <p className="font-display text-3xl text-yellow-400 leading-none">{dayPending}</p>
                <p className="font-body text-[10px] text-[#E5E5E5]/40 uppercase tracking-widest mt-1">Da confermare</p>
              </div>
            </>
          )}
        </div>
      </div>

      {viewMode === 'agenda' && (<>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca nome, telefono, note..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none" />
        </div>
        {/* Turno filter */}
        <div className="flex gap-1 border border-[#E5E5E5]/15 rounded-sm overflow-hidden">
          {[
            { id: 'all', label: 'Tutti', icon: CalendarDays },
            { id: 'pranzo', label: 'Pranzo', icon: Sun },
            { id: 'cena', label: 'Cena', icon: Moon },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTurnoFilter(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-body transition-all min-h-[40px] ${
                  turnoFilter === t.id ? 'bg-[#C69C6D] text-[#0A0A0B] font-bold' : 'text-[#E5E5E5]/50 hover:text-[#C69C6D]'
                }`}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
        {/* Orario filter */}
        <select value={orarioFilter} onChange={e => setOrarioFilter(e.target.value)}
          className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm text-xs font-body focus:border-[#C69C6D] outline-none">
          <option value="all">Tutti gli orari</option>
          {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm text-xs font-body focus:border-[#C69C6D] outline-none">
          <option value="all">Tutti gli stati</option>
          <option value="pending">In attesa</option>
          <option value="confermata">Confermate</option>
          <option value="modificata">Modificate</option>
          <option value="rifiutata">Rifiutate</option>
          <option value="cancellata">Cancellate</option>
          <option value="completata">Completate</option>
          <option value="no_show">No Show</option>
        </select>
        <select value={filterFonte} onChange={e => setFilterFonte(e.target.value)}
          className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm text-xs font-body focus:border-[#C69C6D] outline-none">
          <option value="all">Tutte le fonti</option>
          {Object.entries(FONTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#E5E5E5]/30 font-body">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nessuna prenotazione per questa giornata</p>
          <button onClick={openCreate} className="mt-4 text-[#C69C6D] hover:underline text-sm">+ Aggiungi prenotazione</button>
        </div>
      ) : (
        <div>
          {renderTurnoSection('Pranzo', Sun, pranzoRes)}
          {renderTurnoSection('Cena', Moon, cenaRes)}
        </div>
      )}
      </>)}

      {viewMode === 'sala' && (
        <FloorPlanView
          tavoli={tavoli}
          dayReservations={dayReservations}
          selectedDate={selectedDate}
          onRefresh={load}
        />
      )}

      {showForm && (
        <ReservationFormModal
          editing={editing}
          reservations={reservations}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {actionModal && (
        <ActionModal
          actionModal={actionModal}
          onClose={() => setActionModal(null)}
          onRejectSubmit={handleRejectSubmit}
        />
      )}
    </div>
  );
}