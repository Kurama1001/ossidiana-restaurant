import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Check, Loader2, Wine, Eye, EyeOff, Search, X } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

const WINE_ORDER = ['bollicine', 'bianchi', 'rossi', 'dolci'];
const WINE_LABELS = {
  bollicine: 'Bollicine',
  bianchi: 'Vini Bianchi',
  rossi: 'Vini Rossi',
  dolci: 'Vini Dolci',
};

const REGIONS = [
  'Abruzzo', 'Francia', 'Friuli', 'Lazio', 'Lombardia', 'Piemonte',
  'Sardegna', 'Sicilia', 'Toscana', 'Trentino', 'Umbria', 'Veneto',
];

const emptyWine = {
  name: '', wine_type: 'bianchi', regione: '', cantina: '',
  prezzo_bottiglia: '', prezzo_calice: '', description: '',
  active: true, sortOrder: '',
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

  // Inline editing
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

  const isEditing = (id, field) => inlineEdit?.id === id && inlineEdit?.field === field;

  // Group wines exactly like the customer view
  const grouped = WINE_ORDER.reduce((acc, wt) => {
    const items = wines
      .filter(w => w.wine_type === wt)
      .filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || (w.cantina || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (items.length > 0) acc[wt] = items;
    return acc;
  }, {});

  return (
    <div className="mb-14">
      {/* Header bar */}
      <div className="flex items-center gap-5 mb-2">
        <h2 className="font-display text-3xl md:text-4xl text-white tracking-widest whitespace-nowrap">Carta dei Vini</h2>
        <div className="flex-1 h-px bg-[#C69C6D]/15" />
        <BronzeButton onClick={openCreate} variant="solid" className="shrink-0">
          <Plus size={14} /> Nuovo
        </BronzeButton>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca vino o cantina..."
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none w-56"
          />
        </div>
        <span className="text-[#E5E5E5]/30 font-body text-sm">({Object.values(grouped).flat().length} vini)</span>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-[#E5E5E5]/20 font-body text-sm py-8 text-center">Nessun vino trovato.</p>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex justify-end gap-4 mb-1 px-1">
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-28 text-right">Cantina</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-28 text-right">Regione</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-16 text-right">Calice</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-20 text-right">Bottiglia</span>
            <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-[72px] text-center">Azioni</span>
          </div>

          {Object.entries(grouped).map(([wt, items]) => {
            // Raggruppa per regione
            const regioni = [];
            const regioniMap = {};
            for (const w of items) {
              const r = w.regione || 'Altro';
              if (!regioniMap[r]) {
                regioniMap[r] = [];
                regioni.push(r);
              }
              regioniMap[r].push(w);
            }

            return (
              <div key={wt} className="mb-8">
                {/* Tipo heading */}
                <div className="flex items-center gap-3 mb-3 mt-4">
                  <h3 className="font-display text-xl text-[#C69C6D] tracking-widest">{WINE_LABELS[wt]}</h3>
                  <div className="flex-1 h-px bg-[#C69C6D]/10" />
                </div>

                {/* Region filter pills */}
                {regioni.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {regioni.map(r => (
                      <button key={r} onClick={() => setRegionFilter(prev => ({ ...prev, [wt]: prev[wt] === r ? null : r }))}
                        className={`px-2.5 py-1 rounded-sm text-[11px] font-body border transition-all ${regionFilter[wt] === r ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/15 text-[#706A66] hover:border-[#C69C6D]/40 hover:text-[#C69C6D]'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {/* Render per region */}
                {(regionFilter[wt] ? regioni.filter(r => r === regionFilter[wt]) : regioni).map(regione => (
                  <div key={regione} className="mb-4">
                    {/* Region sub-heading */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-body text-xs text-[#706A66] uppercase tracking-widest">{regione}</span>
                      <div className="flex-1 h-px bg-[#E5E5E5]/5" />
                    </div>

                    {/* Wine rows */}
                    <div>
                      {regioniMap[regione].map(wine => (
                        <div key={wine.id} className={`flex items-center gap-4 py-3 border-b border-[#E5E5E5]/5 last:border-0 group ${wine.active ? '' : 'opacity-40'}`}>
                          {/* Name + description */}
                          <div className="flex-1 min-w-0">
                            {isEditing(wine.id, 'name') ? (
                              <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} autoFocus />
                            ) : (
                              <button onClick={() => startInline(wine.id, 'name', wine.name)} className="text-left">
                                <span className="font-body text-white text-sm md:text-base leading-snug block hover:text-[#C69C6D] transition-colors">{wine.name}</span>
                              </button>
                            )}
                            {isEditing(wine.id, 'description') ? (
                              <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} autoFocus />
                            ) : (
                              wine.description && (
                                <button onClick={() => startInline(wine.id, 'description', wine.description)} className="text-left">
                                  <span className="font-body text-[#E5E5E5]/35 text-xs block hover:text-[#C69C6D] transition-colors">{wine.description}</span>
                                </button>
                              )
                            )}
                          </div>

                          {/* Cantina */}
                          <div className="w-28 shrink-0 text-right">
                            {isEditing(wine.id, 'cantina') ? (
                              <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} autoFocus />
                            ) : (
                              <button onClick={() => startInline(wine.id, 'cantina', wine.cantina)} className="w-full text-right">
                                <span className={`font-body text-xs hover:text-[#C69C6D] transition-colors ${wine.cantina ? 'text-[#706A66]' : 'text-[#E5E5E5]/20 italic'}`}>
                                  {wine.cantina || '—'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Regione */}
                          <div className="w-28 shrink-0 text-right">
                            {isEditing(wine.id, 'regione') ? (
                              <select
                                value={inlineValue}
                                onChange={e => { commitSelectInline(wine.id, 'regione', e.target.value); }}
                                onBlur={() => setInlineEdit(null)}
                                autoFocus
                                className="bg-[#0A0A0B] border border-[#C69C6D] text-[#E5E5E5] px-2 py-1 rounded-sm text-xs font-body outline-none w-full text-right"
                              >
                                <option value="">—</option>
                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            ) : (
                              <button onClick={() => { setInlineEdit({ id: wine.id, field: 'regione' }); setInlineValue(wine.regione || ''); }} className="w-full text-right">
                                <span className={`font-body text-xs hover:text-[#C69C6D] transition-colors ${wine.regione ? 'text-[#706A66]' : 'text-[#E5E5E5]/20 italic'}`}>
                                  {wine.regione || '—'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Calice */}
                          <div className="w-16 shrink-0 text-right">
                            {isEditing(wine.id, 'prezzo_calice') ? (
                              <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} type="number" autoFocus align="right" />
                            ) : (
                              <button onClick={() => startInline(wine.id, 'prezzo_calice', wine.prezzo_calice)} className="w-full text-right">
                                <span className="font-body text-[#706A66] text-sm hover:text-[#C69C6D] transition-colors">
                                  {wine.prezzo_calice != null ? `€${Number(wine.prezzo_calice).toFixed(0)}` : '—'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Bottiglia */}
                          <div className="w-20 shrink-0 text-right">
                            {isEditing(wine.id, 'prezzo_bottiglia') ? (
                              <InlineInput value={inlineValue} onChange={setInlineValue} onCommit={commitInline} onCancel={cancelInline} type="number" autoFocus align="right" />
                            ) : (
                              <button onClick={() => startInline(wine.id, 'prezzo_bottiglia', wine.prezzo_bottiglia)} className="w-full text-right">
                                <span className="font-body text-[#D69E6B] font-semibold text-sm hover:text-[#C69C6D] transition-colors">
                                  {wine.prezzo_bottiglia != null ? `€${Number(wine.prezzo_bottiglia).toFixed(0)}` : '—'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="w-[72px] shrink-0 flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleActive(wine)} title={wine.active ? 'Nascondi' : 'Mostra'}
                              className={`p-1.5 border rounded-sm transition-all ${wine.active ? 'border-green-400/30 text-green-400 hover:bg-green-400/10' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/30'}`}>
                              {wine.active ? <Eye size={11} /> : <EyeOff size={11} />}
                            </button>
                            <button onClick={() => openEdit(wine)} title="Modifica completo"
                              className="p-1.5 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all">
                              <Wine size={11} />
                            </button>
                            <button onClick={() => deleteWine(wine.id, wine.name)} title="Elimina"
                              className="p-1.5 border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 rounded-sm transition-all">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </>
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

              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Cantina di produzione</label>
                <input type="text" placeholder="Es. Marco Carpineti" value={form.cantina || ''}
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
  );
}