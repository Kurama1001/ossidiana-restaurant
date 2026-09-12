import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sun, Moon, Trash2, Plus, Clock } from 'lucide-react';

const RUOLI_LABELS = { admin: 'Admin', cameriere: 'Cameriere', cucina: 'Cucina', bar: 'Bar', user: 'Utente' };

export default function TurniDayPanel({ data, turni, utenti, onChanged }) {
  const [userId, setUserId] = useState('');
  const [turno, setTurno] = useState('pranzo');
  const [oraInizio, setOraInizio] = useState('12:00');
  const [oraFine, setOraFine] = useState('15:00');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const staffTurni = utenti.filter(u => ['cameriere', 'cucina'].includes(u.role));
  const pranzo = turni.filter(t => t.turno === 'pranzo');
  const cena = turni.filter(t => t.turno === 'cena');

  const cambiaTurno = (t) => {
    setTurno(t);
    if (t === 'cena') { setOraInizio('19:30'); setOraFine('23:30'); }
    else { setOraInizio('12:00'); setOraFine('15:00'); }
  };

  const aggiungi = async () => {
    const u = utenti.find(x => x.id === userId);
    if (!u) return;
    if (turni.some(t => t.user_id === u.id && t.turno === turno)) {
      alert(`${u.full_name || u.email} ha già un turno ${turno} in questa data`);
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Turno.create({
        data,
        turno,
        user_id: u.id,
        user_name: u.full_name || u.email,
        user_email: u.email,
        ruolo: u.role || '',
        ora_inizio: oraInizio,
        ora_fine: oraFine,
        note: note || '',
      });
      setNote('');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const elimina = async (t) => {
    if (!window.confirm(`Rimuovere ${t.user_name} dal turno ${t.turno}?`)) return;
    await base44.entities.Turno.delete(t.id);
    onChanged();
  };

  const dataLabel = data
    ? new Date(data + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const renderLista = (righe, tipo) => (
    <div className={`border rounded-sm ${tipo === 'pranzo' ? 'border-yellow-500/25' : 'border-blue-500/25'}`}>
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${tipo === 'pranzo' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
        {tipo === 'pranzo' ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-blue-400" />}
        <span className={`font-body text-xs uppercase tracking-widest font-bold ${tipo === 'pranzo' ? 'text-yellow-400' : 'text-blue-400'}`}>
          {tipo === 'pranzo' ? 'Pranzo' : 'Cena'}
        </span>
        <span className="font-body text-xs text-[#E5E5E5]/40 ml-auto">{righe.length} pers.</span>
      </div>
      <div className="divide-y divide-[#E5E5E5]/5">
        {righe.length === 0 ? (
          <p className="font-body text-xs text-[#E5E5E5]/25 py-4 text-center">Nessuno assegnato</p>
        ) : righe.map(t => (
          <div key={t.id} className="px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-body text-white text-sm font-medium truncate">{t.user_name}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-body text-[10px] px-1.5 py-0.5 bg-[#C69C6D]/15 text-[#C69C6D] border border-[#C69C6D]/20 rounded-sm font-bold uppercase">
                  {RUOLI_LABELS[t.ruolo] || t.ruolo || '—'}
                </span>
                {(t.ora_inizio || t.ora_fine) && (
                  <span className="font-body text-[10px] text-[#E5E5E5]/40 flex items-center gap-1">
                    <Clock size={9} /> {t.ora_inizio || '?'}–{t.ora_fine || '?'}
                  </span>
                )}
              </div>
              {t.note && <p className="font-body text-[10px] text-yellow-300/50 italic mt-0.5">{t.note}</p>}
            </div>
            <button onClick={() => elimina(t)}
              className="shrink-0 p-1.5 border border-red-500/25 text-red-400/50 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/5 rounded-sm transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="border border-[#C69C6D]/20 rounded-sm p-4 bg-[#0d0d0f]">
      <h3 className="font-display text-lg text-white tracking-widest capitalize mb-4">{dataLabel}</h3>

      {/* Form assegnazione */}
      <div className="flex flex-col lg:flex-row gap-2 mb-4 flex-wrap">
        <select value={userId} onChange={e => setUserId(e.target.value)}
          className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] flex-1 min-w-[160px]">
          <option value="">Seleziona staff…</option>
          {staffTurni.map(u => (
            <option key={u.id} value={u.id}>
              {u.full_name || u.email}{u.role && u.role !== 'user' ? ` (${RUOLI_LABELS[u.role] || u.role})` : ''}
            </option>
          ))}
        </select>
        {[['pranzo', '☀ Pranzo'], ['cena', '🌙 Cena']].map(([val, lab]) => (
          <button key={val} onClick={() => cambiaTurno(val)}
            className={`px-3 py-2 rounded-sm font-body text-xs border transition-all ${turno === val ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
            {lab}
          </button>
        ))}
        <input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)}
          className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-2 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]" />
        <input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)}
          className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-2 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D]" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota…"
          className="bg-[#161618] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm font-body text-sm outline-none focus:border-[#C69C6D] flex-1 min-w-[120px] placeholder:text-[#E5E5E5]/20" />
        <button onClick={aggiungi} disabled={saving || !userId}
          className="flex items-center justify-center gap-2 px-5 py-2 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] font-body font-bold text-sm tracking-widest uppercase rounded-sm transition-all disabled:opacity-40 shrink-0">
          <Plus size={14} /> {saving ? '...' : 'Assegna'}
        </button>
      </div>

      {staffTurni.length === 0 && (
        <p className="font-body text-xs text-[#E5E5E5]/40 mb-4">Nessun cameriere o cucina trovato: invita lo staff dalla sezione "Utenti".</p>
      )}

      {/* Liste pranzo / cena */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderLista(pranzo, 'pranzo')}
        {renderLista(cena, 'cena')}
      </div>
    </div>
  );
}