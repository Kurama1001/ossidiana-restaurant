import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

const STATI = ['libero','occupato','in_preparazione','pronto','da_pagare'];
const STATI_LABELS = { libero:'Libero', occupato:'Occupato', in_preparazione:'In prep.', pronto:'Pronto', da_pagare:'Da pagare' };
const empty = { numero: '', nome_sala: '', coperti: 4, stato: 'libero', note: '' };

export default function AdminTavoli() {
  const [tavoli, setTavoli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => base44.entities.Tavolo.list('numero', 50).then(d => { setTavoli(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (t) => { setEditing(t); setForm({ numero: t.numero, nome_sala: t.nome_sala || '', coperti: t.coperti || 4, stato: t.stato || 'libero', note: t.note || '' }); setShowForm(true); };
  const close = () => { setShowForm(false); setEditing(null); };

  const save = async () => {
    if (!form.numero) return;
    setSaving(true);
    const data = { ...form, numero: parseInt(form.numero), coperti: parseInt(form.coperti) };
    if (editing) await base44.entities.Tavolo.update(editing.id, data);
    else await base44.entities.Tavolo.create(data);
    setSaving(false);
    close();
    load();
  };

  const del = async (id) => {
    if (!confirm('Eliminare questo tavolo?')) return;
    await base44.entities.Tavolo.delete(id);
    setTavoli(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Gestione Tavoli</h2>
        <BronzeButton onClick={openCreate} variant="solid"><Plus size={14} /> Nuovo Tavolo</BronzeButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#C69C6D]" size={28} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tavoli.map(t => (
            <div key={t.id} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-display text-3xl text-white">{t.numero}</span>
                  {t.nome_sala && <span className="font-body text-xs text-[#E5E5E5]/40 ml-2">{t.nome_sala}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all"><Pencil size={13} /></button>
                  <button onClick={() => del(t.id)} className="p-2 border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/50 rounded-sm transition-all"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="font-body text-xs text-[#E5E5E5]/40">Coperti: {t.coperti || '—'}</p>
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border font-body ${t.stato === 'libero' ? 'border-green-500/40 text-green-400' : 'border-[#C69C6D]/40 text-[#C69C6D]'}`}>
                {STATI_LABELS[t.stato] || t.stato}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display text-xl text-white">{editing ? 'Modifica Tavolo' : 'Nuovo Tavolo'}</h3>
              <button onClick={close} className="text-[#E5E5E5]/40 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Numero *</label>
                <input type="number" value={form.numero} onChange={e => set('numero', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Sala / Zona</label>
                <input type="text" value={form.nome_sala} onChange={e => set('nome_sala', e.target.value)} placeholder="Es. Terrazza, Interno..."
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20" />
              </div>
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Coperti</label>
                <input type="number" min="1" value={form.coperti} onChange={e => set('coperti', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Stato</label>
                <select value={form.stato} onChange={e => set('stato', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm">
                  {STATI.map(s => <option key={s} value={s}>{STATI_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <BronzeButton onClick={close} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
              <BronzeButton onClick={save} variant="solid" className="flex-1 justify-center" disabled={saving || !form.numero}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Check size={14} /> Salva</>}
              </BronzeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}