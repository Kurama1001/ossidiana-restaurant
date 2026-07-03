import { useState } from 'react';
import { X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';
import { FONTE_LABELS } from './utils';

const empty = {
  customer_name: '', phone: '', email: '', res_date: '', res_time: '',
  guests: 2, notes: '', fonte_prenotazione: 'telefono', status: 'confermata'
};

const inputCls = 'w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20';

export default function ReservationFormModal({ editing, reservations, onSave, onClose }) {
  const [form, setForm] = useState(editing ? { ...editing } : { ...empty, res_date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.customer_name?.trim()) e.customer_name = 'Nome obbligatorio';
    if (!form.phone?.trim()) e.phone = 'Telefono obbligatorio';
    if (!form.res_date) e.res_date = 'Data obbligatoria';
    if (!form.res_time) e.res_time = 'Ora obbligatoria';
    if (!form.guests || parseInt(form.guests) <= 0) e.guests = 'Coperti deve essere > 0';
    const year = form.res_date ? new Date(form.res_date).getFullYear() : 0;
    if (year && (year < 2024 || year > 2100)) e.res_date = 'Data non valida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sameSlot = reservations.filter(r =>
    r.id !== editing?.id &&
    r.res_date === form.res_date &&
    r.res_time === form.res_time &&
    !['cancellata', 'cancelled', 'rifiutata'].includes(r.status)
  );
  const overbookingWarning = sameSlot.length >= 5;

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const data = { ...form, guests: parseInt(form.guests) };
    let changedFields = null;
    if (editing) {
      changedFields = {};
      if (editing.res_date !== data.res_date) changedFields.res_date = true;
      if (editing.res_time !== data.res_time) changedFields.res_time = true;
      if (Number(editing.guests) !== Number(data.guests)) changedFields.guests = true;
    }
    await onSave(data, !!editing, changedFields);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-2xl text-white">{editing ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}</h3>
          <button onClick={onClose} className="text-[#E5E5E5]/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Nome e Cognome *</label>
            <input type="text" value={form.customer_name || ''} onChange={e => set('customer_name', e.target.value)} className={inputCls} placeholder="Mario Rossi" />
            {errors.customer_name && <p className="text-red-400 text-xs mt-1">{errors.customer_name}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Telefono *</label>
            <input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+39 333 123 4567" />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Email</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="mario@email.it" />
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Data *</label>
            <input type="date" value={form.res_date || ''} onChange={e => set('res_date', e.target.value)} className={inputCls} />
            {errors.res_date && <p className="text-red-400 text-xs mt-1">{errors.res_date}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Ora *</label>
            <input type="time" value={form.res_time || ''} onChange={e => set('res_time', e.target.value)} className={inputCls} />
            {errors.res_time && <p className="text-red-400 text-xs mt-1">{errors.res_time}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Numero Coperti *</label>
            <input type="number" min="1" max="50" value={form.guests || ''} onChange={e => set('guests', e.target.value)} className={inputCls} />
            {errors.guests && <p className="text-red-400 text-xs mt-1">{errors.guests}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Fonte</label>
            <select value={form.fonte_prenotazione || 'telefono'} onChange={e => set('fonte_prenotazione', e.target.value)} className={inputCls}>
              {Object.entries(FONTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Stato</label>
            <select value={form.status || 'confermata'} onChange={e => set('status', e.target.value)} className={inputCls}>
              <option value="nuova">Nuova</option>
              <option value="in_attesa_conferma">In attesa conferma</option>
              <option value="confermata">Confermata</option>
              <option value="modificata">Modificata</option>
              <option value="rifiutata">Rifiutata</option>
              <option value="cancellata">Cancellata</option>
              <option value="completata">Completata</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">
              Note <span className="text-[#E5E5E5]/25 normal-case tracking-normal">(bambini, allergie, ricorrenze, tavolo preferito, ordine anticipato...)</span>
            </label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
              className={`${inputCls} resize-none`} placeholder="Allergie, occasione speciale, richieste particolari..." />
          </div>
        </div>

        {overbookingWarning && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-sm">
            <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
            <span className="font-body text-xs text-yellow-400">
              Attenzione: ci sono già {sameSlot.length} prenotazioni per questo orario ({sameSlot.reduce((s, r) => s + r.guests, 0)} coperti)
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <BronzeButton onClick={onClose} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
          <BronzeButton onClick={handleSave} variant="solid" className="flex-1 justify-center"
            disabled={saving || !form.customer_name || !form.phone || !form.res_date || !form.res_time}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Check size={14} /> Salva</>}
          </BronzeButton>
        </div>
      </div>
    </div>
  );
}