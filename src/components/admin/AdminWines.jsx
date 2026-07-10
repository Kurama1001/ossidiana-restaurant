import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, X, Check, Loader2, Wine, Eye, EyeOff, Search } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

const WINE_ORDER = ['bollicine', 'bianchi', 'rossi', 'dolci'];
const WINE_LABELS = {
  bollicine: 'Bollicine',
  bianchi: 'Bianchi',
  rossi: 'Rossi',
  dolci: 'Dolci',
};

const REGIONS = [
  'Abruzzo', 'Francia', 'Friuli', 'Lazio', 'Lombardia', 'Piemonte',
  'Sardegna', 'Sicilia', 'Toscana', 'Trentino', 'Umbria', 'Veneto',
];

const emptyWine = {
  name: '', wine_type: 'bianchi', regione: '',
  prezzo_bottiglia: '', prezzo_calice: '',
  description: '', active: true, sortOrder: '',
};

export default function AdminWines() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyWine);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  const load = () => {
    base44.entities.MenuItem.filter({ category: 'vino' }, 'sortOrder', 500)
      .then(setWines)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyWine });
    setShowForm(true);
  };

  const openEdit = (w) => {
    setEditing(w);
    setForm({
      ...emptyWine,
      ...w,
      prezzo_bottiglia: w.prezzo_bottiglia?.toString() || '',
      prezzo_calice: w.prezzo_calice?.toString() || '',
      sortOrder: w.sortOrder?.toString() || '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const saveWine = async () => {
    if (!form.name) return;
    setSaving(true);
    const data = {
      name: form.name,
      category: 'vino',
      reparto: 'bar',
      wine_type: form.wine_type,
      regione: form.regione || '',
      price: parseFloat(form.prezzo_bottiglia) || 0,
      prezzo_bottiglia: parseFloat(form.prezzo_bottiglia) || undefined,
      prezzo_calice: parseFloat(form.prezzo_calice) || undefined,
      description: form.description || '',
      active: form.active,
      sortOrder: form.sortOrder ? parseInt(form.sortOrder) : undefined,
    };
    if (editing) {
      await base44.entities.MenuItem.update(editing.id, data);
    } else {
      await base44.entities.MenuItem.create(data);
    }
    setSaving(false);
    closeForm();
    load();
  };

  const deleteWine = async (id, name) => {
    if (!confirm(`Eliminare "${name}" dalla carta dei vini?`)) return;
    await base44.entities.MenuItem.delete(id);
    setWines(prev => prev.filter(w => w.id !== id));
  };

  const toggleActive = async (w) => {
    await base44.entities.MenuItem.update(w.id, { active: !w.active });
    setWines(prev => prev.map(x => x.id === w.id ? { ...x, active: !x.active } : x));
  };

  const filtered = wines
    .filter(w => (!search || w.name.toLowerCase().includes(search.toLowerCase())))
    .filter(w => typeFilter === 'all' || w.wine_type === typeFilter)
    .filter(w => regionFilter === 'all' || (w.regione || '') === regionFilter)
    .sort((a, b) => {
      const ta = WINE_ORDER.indexOf(a.wine_type);
      const tb = WINE_ORDER.indexOf(b.wine_type);
      if (ta !== tb) return ta - tb;
      const ra = a.regione || 'ZZZ';
      const rb = b.regione || 'ZZZ';
      if (ra !== rb) return ra.localeCompare(rb);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  const availableRegions = [...new Set(wines.map(w => w.regione).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Carta dei Vini</h2>
        <BronzeButton onClick={openCreate} variant="solid">
          <Plus size={14} /> Nuovo Vino
        </BronzeButton>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca vino..."
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none w-56"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none">
          <option value="all">Tutti i tipi</option>
          {WINE_ORDER.map(wt => <option key={wt} value={wt}>{WINE_LABELS[wt]}</option>)}
        </select>
        <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
          className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none">
          <option value="all">Tutte le regioni</option>
          {(availableRegions.length ? availableRegions : REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-[#E5E5E5]/30 font-body text-sm self-center">({filtered.length} vini)</span>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#E5E5E5]/20 font-body text-sm py-8 text-center">Nessun vino trovato.</p>
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-1 pb-2 border-b border-[#C69C6D]/15">
            <span className="flex-1 font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest">Nome</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-20 text-center">Tipo</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-24 text-center">Regione</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-16 text-right">Calice</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-20 text-right">Bottiglia</span>
            <span className="w-[96px] shrink-0" />
          </div>

          {/* Wine rows */}
          {filtered.map(w => (
            <div key={w.id}
              className={`flex items-center gap-3 py-3 border-b border-[#333333] transition-all ${w.active ? '' : 'opacity-40'}`}>
              <div className="flex-1 min-w-0">
                <span className="font-body text-white text-sm block truncate">{w.name}</span>
                {w.description && <span className="font-body text-[#E5E5E5]/30 text-xs block truncate">{w.description}</span>}
              </div>
              <span className="font-body text-[#C69C6D] text-xs w-20 text-center shrink-0">
                {WINE_LABELS[w.wine_type] || '—'}
              </span>
              <span className="font-body text-[#E5E5E5]/50 text-xs w-24 text-center shrink-0">
                {w.regione || '—'}
              </span>
              <span className="font-body text-[#A0A0A0] text-sm w-16 text-right shrink-0">
                {w.prezzo_calice != null ? `€${Number(w.prezzo_calice).toFixed(0)}` : '—'}
              </span>
              <span className="font-body text-[#D9986D] font-semibold text-sm w-20 text-right shrink-0">
                {w.prezzo_bottiglia != null ? `€${Number(w.prezzo_bottiglia).toFixed(0)}` : '—'}
              </span>
              <div className="flex items-center gap-1 shrink-0 w-[96px] justify-end">
                <button onClick={() => toggleActive(w)} title={w.active ? 'Disattiva' : 'Attiva'}
                  className={`p-1.5 border rounded-sm transition-all min-w-[28px] min-h-[28px] flex items-center justify-center ${w.active ? 'border-green-400/30 text-green-400 hover:bg-green-400/10' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/30'}`}>
                  {w.active ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => openEdit(w)} title="Modifica"
                  className="p-1.5 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all min-w-[28px] min-h-[28px] flex items-center justify-center">
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteWine(w.id, w.name)} title="Elimina"
                  className="p-1.5 border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 rounded-sm transition-all min-w-[28px] min-h-[28px] flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-lg max-h-[92vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl text-white">{editing ? 'Modifica Vino' : 'Nuovo Vino'}</h3>
              <button onClick={closeForm} className="text-[#E5E5E5]/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Nome vino *</label>
                <input type="text" placeholder="Es. Brunello di Montalcino" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Tipo *</label>
                  <select value={form.wine_type} onChange={e => set('wine_type', e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm">
                    {WINE_ORDER.map(wt => <option key={wt} value={wt}>{WINE_LABELS[wt]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Regione</label>
                  <select value={form.regione} onChange={e => set('regione', e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm">
                    <option value="">— Seleziona —</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Prezzo Calice (€)</label>
                  <input type="number" min="0" step="0.50" placeholder="6" value={form.prezzo_calice}
                    onChange={e => set('prezzo_calice', e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Prezzo Bottiglia (€)</label>
                  <input type="number" min="0" step="0.50" placeholder="28" value={form.prezzo_bottiglia}
                    onChange={e => set('prezzo_bottiglia', e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Descrizione (opz.)</label>
                <textarea placeholder="Note sul vino, vitigno, ecc." value={form.description}
                  onChange={e => set('description', e.target.value)} rows={2}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20 resize-none" />
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('active', !form.active)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-[#C69C6D]' : 'bg-[#E5E5E5]/20'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.active ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-body text-[#E5E5E5]/60">Visibile nel menu</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <BronzeButton onClick={closeForm} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
              <BronzeButton onClick={saveWine} variant="solid" className="flex-1 justify-center"
                disabled={saving || !form.name || !form.prezzo_bottiglia}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Check size={14} /> Salva Vino</>}
              </BronzeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}