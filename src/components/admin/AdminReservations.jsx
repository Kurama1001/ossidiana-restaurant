import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Plus, RefreshCw, Search, CalendarDays } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';
import ReservationCard from '@/components/admin/reservations/ReservationCard';
import ReservationFormModal from '@/components/admin/reservations/ReservationFormModal';
import ActionModal from '@/components/admin/reservations/ActionModal';
import ReservationStats from '@/components/admin/reservations/ReservationStats';
import { buildConfirmMessage, buildRejectMessage, buildUpdateMessage, buildCancelMessage, FONTE_LABELS, isPendingStatus, isConfirmedStatus } from '@/components/admin/reservations/utils';

export default function AdminReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('oggi');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFonte, setFilterFonte] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionModal, setActionModal] = useState(null);

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

  const filtered = useMemo(() => {
    let list = [...reservations];
    if (view === 'oggi') list = list.filter(r => r.res_date === today);
    else if (view === 'future') list = list.filter(r => r.res_date > today);
    else if (view === 'passate') list = list.filter(r => r.res_date < today);

    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        list = list.filter(r => isPendingStatus(r.status));
      } else {
        list = list.filter(r => r.status === filterStatus);
      }
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
    if (view === 'passate') {
      list.sort((a, b) => (b.res_date + ' ' + (b.res_time || '')).localeCompare(a.res_date + ' ' + (a.res_time || '')));
    } else {
      list.sort((a, b) => (a.res_time || '').localeCompare(b.res_time || ''));
    }
    return list;
  }, [reservations, view, filterStatus, filterFonte, search, today]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Agenda Prenotazioni</h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
            <RefreshCw size={16} />
          </button>
          <BronzeButton onClick={openCreate} variant="solid">
            <Plus size={14} /> Aggiungi Prenotazione
          </BronzeButton>
        </div>
      </div>

      <ReservationStats reservations={reservations} today={today} />

      <div className="flex gap-2 mb-4">
        {[
          { id: 'oggi', label: 'Oggi' },
          { id: 'future', label: 'Future' },
          { id: 'passate', label: 'Passate' },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={`px-4 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${
              view === v.id ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome, telefono, note..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none" />
        </div>
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

      <p className="text-xs font-body text-[#E5E5E5]/30 mb-3">{filtered.length} prenotazioni</p>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#E5E5E5]/30 font-body">
          <CalendarDays size={32} className="mx-auto mb-3 opacity-20" />
          Nessuna prenotazione trovata
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
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