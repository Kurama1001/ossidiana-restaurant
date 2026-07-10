import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, X, Check, Loader2, Wine, Eye, EyeOff, Search } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

const WINE_ORDER = ['bollicine', 'bianchi', 'rossi', 'dolci'];
const WINE_LABELS = {
  bollicine: 'Bollicine',
  bianchi: 'Vini Bianchi',
  rossi: 'Vini Rossi',
  dolci: 'Vini Dolci',
};

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
  const [regionFilter, setRegionFilter] = useState({});

  const load = () => {
    base44.entities.MenuItem.filter({ category: 'vino' }, 'sortOrder', 500)
      .then(setWines)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = (presetType) => {
    setEditing(null);
    setForm({ ...emptyWine, wine_type: presetType || 'bianchi' });
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

  const grouped = WINE_ORDER.reduce((acc, wt) => {
    const items = wines
      .filter(w => w.wine_type === wt && (!search || w.name.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (items.length > 0) acc[wt] = items;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Carta dei Vini</h2>
        <BronzeButton onClick={() => openCreate('bianchi')} variant="solid">
          <Plus size={14} /> Nuovo Vino
        </BronzeButton>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca vino..."
          className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none w-64"
        />
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : (
        <div className="space-y-8">
          {/* Price column headers */}
          <div className="flex items-center gap-3 px-1">
            <span className="flex-1" />
            <span className="font-body text-xs text-[#E5E5E5]/30 uppercase tracking-widest w-24 text-right">Regione</span>
            <span className="font-body text-xs text-[#E5E5E5]/30 uppercase tracking-widest w-16 text-right">Calice</span>
            <span className="font-body text-xs text-[#E5E5E5]/30 uppercase tracking-widest w-20 text-right">Bottiglia</span>
            <span className="w-[96px] shrink-0" />
          </div>

          {WINE_ORDER.map(wt => {
            const items = grouped[wt];
            if (!items) return null;

            const allRegioni = [...new Set(items.map(w => w.regione || 'Altro'))];
            const filteredItems = regionFilter[wt] && regionFilter[wt] !== 'all'
              ? items.filter(w => (w.regione || 'Altro') === regionFilter[wt])
              : items;

            const regioni = [];
            const regioniMap = {};
            for (const w of filteredItems) {
              const r = w.regione || 'Altro';
              if (!regioniMap[r]) { regioniMap[r] = []; regioni.push(r); }
              regioniMap[r].push(w);
            }

            return (
              <div key={wt}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-3">
                  <Wine size={16} className="text-[#C69C6D]" />
                  <h3 className="font-display text-xl text-[#C69C6D] tracking-widest">{WINE_LABELS[wt]}</h3>
                  <span className="font-body text-xs text-[#E5E5E5]/30">({filteredItems.length})</span>
                  <div className="flex-1 h-px bg-[#C69C6D]/15" />
                  <button onClick={() => openCreate(wt)}
                    className="flex items-center gap-1 px-2.5 py-1 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-xs transition-all">
                    <Plus size={11} /> Aggiungi
                  </button>
                </div>

                {/* Quick region filters */}
                {allRegioni.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button onClick={() => setRegionFilter(prev => ({ ...prev, [wt]: 'all' }))}
                      className={`px-2.5 py-1 rounded-sm text-[11px] font-body border transition-all ${(!regionFilter[wt] || regionFilter[wt] === 'all') ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                      Tutte
                    </button>
                    {allRegioni.map(r => (
                      <button key={r} onClick={() => setRegionFilter(prev => ({ ...prev, [wt]: r }))}
                        className={`px-2.5 py-1 rounded-sm text-[11px] font-body border transition-all ${regionFilter[wt] === r ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {regioni.length === 0 ? (
                  <p className="text-[#E5E5E5]/20 font-body text-sm py-4 text-center">Nessun vino in questa regione.</p>
                ) : (
                  regioni.map(regione => (
                    <div key={regione} className="mb-4">
                      {/* Region sub-header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body text-xs text-[#808080] uppercase tracking-widest">{regione}</span>
                        <div className="flex-1 h-px bg-[#333333]" />
                      </div>

                      {/* Wine rows */}
                      <div>
                        {regioniMap[regione].map(w => (
                          <div key={w.id}
                            className={`flex items-center gap-3 py-3 border-b border-[#333333] last:border-0 transition-all ${w.active ? '' : 'opacity-40'}`}>
                            <div className="flex-1 min-w-0">
                              <span className="font-body text-white text-sm block truncate">{w.name}</span>
                              {w.description && <span className="font-body text-[#E5E5E5]/30 text-xs block truncate">{w.description}</span>}
                            </div>
                            <span className="font-body text-[#E5E5E5]/50 text-xs w-24 text-right shrink-0">
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
                    </div>
                  ))
                )}
              </div>
            );
          })}
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
                  <input type="text" placeholder="Es. Toscana" value={form.regione}
                    onChange={e => set('regione', e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20" />
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