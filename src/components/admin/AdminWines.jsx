import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Check, Loader2, Wine, Eye, EyeOff, Search, X } from 'lucide-react';
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
  name: '', wine_type: 'bianchi', regione: '', cantina: '',
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
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineValue, setInlineValue] = useState('');

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
      cantina: form.cantina || '',
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

  const startInline = (id, field, currentVal) => {
    setInlineEdit({ id, field });
    setInlineValue(currentVal?.toString() ?? '');
  };

  const cancelInline = () => {
    setInlineEdit(null);
    setInlineValue('');
  };

  const commitInline = async () => {
    if (!inlineEdit) return;
    const { id, field } = inlineEdit;
    let val = inlineValue;
    if (field === 'prezzo_bottiglia' || field === 'prezzo_calice') {
      val = parseFloat(inlineValue) || 0;
      if (field === 'prezzo_bottiglia') {
        await base44.entities.MenuItem.update(id, { [field]: val, price: val });
      } else {
        await base44.entities.MenuItem.update(id, { [field]: val });
      }
    } else {
      val = val.trim();
      await base44.entities.MenuItem.update(id, { [field]: val });
    }
    setWines(prev => prev.map(w => w.id === id ? {
      ...w,
      [field]: val,
      ...(field === 'prezzo_bottiglia' ? { price: val } : {}),
    } : w));
    cancelInline();
  };

  const commitSelectInline = async (id, field, val) => {
    await base44.entities.MenuItem.update(id, { [field]: val });
    setWines(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w));
    setInlineEdit(null);
  };

  const filtered = wines
    .filter(w => (!search || w.name.toLowerCase().includes(search.toLowerCase()) || (w.cantina || '').toLowerCase().includes(search.toLowerCase())))
    .filter(w => typeFilter === 'all' || w.wine_type === typeFilter)
    .filter(w => regionFilter === 'all' || (w.regione || '') === regionFilter)
    .sort((a, b) => {
      const ta = WINE_ORDER.indexOf(a.wine_type);
      const tb = WINE_ORDER.indexOf(b.wine_type);
      if (ta !== tb) return ta - tb;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  const availableRegions = [...new Set(wines.map(w => w.regione).filter(Boolean))].sort();

  const isEditing = (id, field) => inlineEdit?.id === id && inlineEdit?.field === field;

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Carta dei Vini</h2>
        <BronzeButton onClick={openCreate} variant="solid">
          <Plus size={14} /> Nuovo Vino
        </BronzeButton>
      </div>

      {/* Quick filters */}
      <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca vino o cantina..."
              className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none w-56"
            />
          </div>
          <span className="text-[#E5E5E5]/30 font-body text-sm">({filtered.length} vini)</span>
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="font-body text-[10px] text-[#C69C6D]/50 uppercase tracking-widest mr-1">Tipo:</span>
          <button onClick={() => { setTypeFilter('all'); setRegionFilter('all'); }}
            className={`px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${typeFilter === 'all' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
            Tutti
          </button>
          {WINE_ORDER.map(wt => {
            const count = wines.filter(w => w.wine_type === wt).length;
            return (
              <button key={wt} onClick={() => { setTypeFilter(wt); setRegionFilter('all'); }}
                className={`px-3 py-1.5 rounded-sm text-xs font-body border transition-all ${typeFilter === wt ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                {WINE_LABELS[wt]} <span className="opacity-50">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Region pills — shown when a type is selected or when regions exist */}
        {(() => {
          const typeWines = typeFilter === 'all' ? wines : wines.filter(w => w.wine_type === typeFilter);
          const regionsInType = [...new Set(typeWines.map(w => w.regione).filter(Boolean))].sort();
          if (regionsInType.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-[#C69C6D]/5">
              <span className="font-body text-[10px] text-[#C69C6D]/50 uppercase tracking-widest mr-1 mt-1">Regione:</span>
              <button onClick={() => setRegionFilter('all')}
                className={`px-2.5 py-1 rounded-sm text-[11px] font-body border transition-all ${regionFilter === 'all' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                Tutte
              </button>
              {regionsInType.map(r => {
                const count = typeWines.filter(w => w.regione === r).length;
                return (
                  <button key={r} onClick={() => setRegionFilter(regionFilter === r ? 'all' : r)}
                    className={`px-2.5 py-1 rounded-sm text-[11px] font-body border transition-all ${regionFilter === r ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D]'}`}>
                    {r} <span className="opacity-50">({count})</span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#E5E5E5]/20 font-body text-sm py-8 text-center">Nessun vino trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#C69C6D]/20">
                <th className="text-left font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 min-w-[180px]">Nome</th>
                <th className="text-left font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 min-w-[140px]">Cantina</th>
                <th className="text-left font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 min-w-[120px]">Tipo</th>
                <th className="text-left font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 min-w-[120px]">Regione</th>
                <th className="text-right font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 min-w-[90px]">Calice</th>
                <th className="text-right font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 min-w-[90px]">Bottiglia</th>
                <th className="text-center font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest pb-2 px-2 w-[100px]">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id} className={`border-b border-[#222] hover:bg-[#111] transition-colors ${w.active ? '' : 'opacity-40'}`}>
                  {/* Nome */}
                  <td className="py-3 px-2">
                    {isEditing(w.id, 'name') ? (
                      <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} autoFocus />
                    ) : (
                      <button onClick={() => startInline(w.id, 'name', w.name)} className="text-left">
                        <span className="font-body text-white text-sm hover:text-[#C69C6D] transition-colors">{w.name}</span>
                      </button>
                    )}
                  </td>

                  {/* Cantina */}
                  <td className="py-3 px-2">
                    {isEditing(w.id, 'cantina') ? (
                      <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} autoFocus />
                    ) : (
                      <button onClick={() => startInline(w.id, 'cantina', w.cantina)} className="text-left">
                        <span className={`font-body text-sm hover:text-[#C69C6D] transition-colors ${w.cantina ? 'text-[#E5E5E5]/70' : 'text-[#E5E5E5]/20 italic'}`}>
                          {w.cantina || '—'}
                        </span>
                      </button>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="py-3 px-2">
                    {isEditing(w.id, 'wine_type') ? (
                      <select
                        value={inlineValue}
                        onChange={e => { commitSelectInline(w.id, 'wine_type', e.target.value); }}
                        onBlur={() => setInlineEdit(null)}
                        autoFocus
                        className="bg-[#0A0A0B] border border-[#C69C6D] text-[#E5E5E5] px-2 py-1 rounded-sm text-xs font-body outline-none w-full"
                      >
                        {WINE_ORDER.map(wt => <option key={wt} value={wt}>{WINE_LABELS[wt]}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => { setInlineEdit({ id: w.id, field: 'wine_type' }); setInlineValue(w.wine_type); }} className="text-left">
                        <span className="font-body text-[#C69C6D] text-xs hover:underline">{WINE_LABELS[w.wine_type] || '—'}</span>
                      </button>
                    )}
                  </td>

                  {/* Regione */}
                  <td className="py-3 px-2">
                    {isEditing(w.id, 'regione') ? (
                      <select
                        value={inlineValue}
                        onChange={e => { commitSelectInline(w.id, 'regione', e.target.value); }}
                        onBlur={() => setInlineEdit(null)}
                        autoFocus
                        className="bg-[#0A0A0B] border border-[#C69C6D] text-[#E5E5E5] px-2 py-1 rounded-sm text-xs font-body outline-none w-full"
                      >
                        <option value="">—</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => { setInlineEdit({ id: w.id, field: 'regione' }); setInlineValue(w.regione || ''); }} className="text-left">
                        <span className={`font-body text-xs hover:text-[#C69C6D] transition-colors ${w.regione ? 'text-[#E5E5E5]/50' : 'text-[#E5E5E5]/20 italic'}`}>
                          {w.regione || '—'}
                        </span>
                      </button>
                    )}
                  </td>

                  {/* Calice */}
                  <td className="py-3 px-2 text-right">
                    {isEditing(w.id, 'prezzo_calice') ? (
                      <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} type="number" autoFocus align="right" />
                    ) : (
                      <button onClick={() => startInline(w.id, 'prezzo_calice', w.prezzo_calice)} className="w-full text-right">
                        <span className="font-body text-[#A0A0A0] text-sm hover:text-[#C69C6D] transition-colors">
                          {w.prezzo_calice != null ? `€${Number(w.prezzo_calice).toFixed(0)}` : '—'}
                        </span>
                      </button>
                    )}
                  </td>

                  {/* Bottiglia */}
                  <td className="py-3 px-2 text-right">
                    {isEditing(w.id, 'prezzo_bottiglia') ? (
                      <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} type="number" autoFocus align="right" />
                    ) : (
                      <button onClick={() => startInline(w.id, 'prezzo_bottiglia', w.prezzo_bottiglia)} className="w-full text-right">
                        <span className="font-body text-[#D9986D] font-semibold text-sm hover:text-[#C69C6D] transition-colors">
                          {w.prezzo_bottiglia != null ? `€${Number(w.prezzo_bottiglia).toFixed(0)}` : '—'}
                        </span>
                      </button>
                    )}
                  </td>

                  {/* Azioni */}
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => toggleActive(w)} title={w.active ? 'Disattiva' : 'Attiva'}
                        className={`p-1.5 border rounded-sm transition-all ${w.active ? 'border-green-400/30 text-green-400 hover:bg-green-400/10' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/30'}`}>
                        {w.active ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button onClick={() => openEdit(w)} title="Modifica completo"
                        className="p-1.5 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
                        <Wine size={12} />
                      </button>
                      <button onClick={() => deleteWine(w.id, w.name)} title="Elimina"
                        className="p-1.5 border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 rounded-sm transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form per creazione/modifica completa */}
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

              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Cantina di produzione</label>
                <input type="text" placeholder="Es. Tenuta San Guido" value={form.cantina || ''}
                  onChange={e => set('cantina', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20" />
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

function InlineInput({ value, onChange, onCommit, onCancel, type = 'text', autoFocus, align = 'left' }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
        autoFocus={autoFocus}
        onBlur={onCommit}
        className={`bg-[#0A0A0B] border border-[#C69C6D] text-[#E5E5E5] px-2 py-1 rounded-sm text-xs font-body outline-none w-full ${align === 'right' ? 'text-right' : ''}`}
      />
    </div>
  );
}