import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BronzeButton } from '@/components/ui/BronzeButton';
import { Check } from 'lucide-react';

const TIMES = ['12:30', '13:00', '13:30', '14:00', '14:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

const empty = { customer_name: '', phone: '', email: '', res_date: '', res_time: '', guests: 2, notes: '' };

export default function Prenotazioni() {
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.Reservation.create({ ...form, guests: parseInt(form.guests), status: 'pending' });
    setSubmitting(false);
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="bg-[#0A0A0B] min-h-screen flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#C69C6D]/15 flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-[#C69C6D]" />
          </div>
          <h2 className="font-display text-4xl text-white tracking-widest mb-4">Richiesta Inviata</h2>
          <p className="font-body text-[#E5E5E5]/60 mb-8">
            Grazie <strong className="text-[#C69C6D]">{form.customer_name}</strong>! La tua prenotazione è stata ricevuta.
            Ti contatteremo presto per confermarla.
          </p>
          <BronzeButton onClick={() => { setForm(empty); setSuccess(false); }} variant="outline">
            Nuova Prenotazione
          </BronzeButton>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0B] min-h-screen pt-24 pb-20">
      <div className="text-center py-16 px-5">
        <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">Riserva il tuo tavolo</p>
        <h1 className="font-display text-6xl md:text-7xl text-white tracking-widest">Prenotazioni</h1>
        <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
      </div>

      <div className="max-w-xl mx-auto px-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome e Cognome *" required>
              <input type="text" required placeholder="Mario Rossi" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Telefono *" required>
              <input type="tel" required placeholder="+39 333 123 4567" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Email">
            <input type="email" placeholder="mario@email.it" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Data *" required>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={form.res_date}
                onChange={e => set('res_date', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Numero di Persone *">
              <select value={form.guests} onChange={e => set('guests', e.target.value)} className={inputCls}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'persone'}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Orario *" required>
            <div className="grid grid-cols-4 gap-2">
              {TIMES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('res_time', t)}
                  className={`py-2.5 text-sm font-body border rounded-sm transition-all min-h-[44px] ${
                    form.res_time === t ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/60 hover:border-[#C69C6D]/50'
                  }`}
                >{t}</button>
              ))}
            </div>
          </Field>

          <Field label="Note / Richieste Speciali">
            <textarea
              placeholder="Allergie, occasione speciale, richieste particolari..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <BronzeButton
            type="submit"
            variant="solid"
            className="w-full justify-center"
            disabled={submitting || !form.customer_name || !form.phone || !form.res_date || !form.res_time}
          >
            {submitting ? 'Invio in corso...' : 'Conferma Prenotazione'}
          </BronzeButton>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/25';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}