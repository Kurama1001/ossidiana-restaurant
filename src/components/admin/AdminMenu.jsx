import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check, Copy, Wand2, Loader2, Search, Upload } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

const CATEGORIES = ['antipasti', 'primi', 'romanissimi', 'secondi', 'contorni', 'dolci'];
const CATEGORY_LABELS = { antipasti: 'Antipasti', primi: 'Primi', romanissimi: 'Romanissimi', secondi: 'Secondi', contorni: 'Contorni', dolci: 'Dolci' };
const DIETARY_TAGS = ['vegetariano', 'pesce', 'carne', 'senza_lattosio', 'senza_glutine_su_richiesta', 'piccante'];
const DIETARY_LABELS = { vegetariano: 'Vegetariano', pesce: 'Pesce', carne: 'Carne', senza_lattosio: 'Senza Lattosio', senza_glutine_su_richiesta: 'Senza Glutine (richiesta)', piccante: 'Piccante' };

const emptyForm = {
  name: '', description: '', category: 'antipasti',
  price: '', imageUrl: '', imagePrompt: '', allergens: '',
  dietaryTags: [], active: true, featured: false, sortOrder: '',
};

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [search, setSearch] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const load = () => {
    base44.entities.MenuItem.list('sortOrder', 500).then((menuItems) => {
      setItems(menuItems);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDietaryTag = (tag) => setForm(f => ({
    ...f, dietaryTags: (f.dietaryTags || []).includes(tag)
      ? f.dietaryTags.filter(t => t !== tag)
      : [...(f.dietaryTags || []), tag]
  }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      ...emptyForm, ...item,
      price: item.price?.toString() || '',
      sortOrder: item.sortOrder?.toString() || '',
      dietaryTags: item.dietaryTags || [],
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const saveItem = async () => {
    if (!form.name || !form.price) return;
    if (parseFloat(form.price) < 0) { alert('Prezzo non valido'); return; }
    setSaving(true);
    const data = {
      ...form,
      price: parseFloat(form.price),
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

  const toggleActive = async (item) => {
    await base44.entities.MenuItem.update(item.id, { active: !item.active });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
  };

  const deleteItem = async (id) => {
    if (!confirm('Eliminare questo piatto definitivamente?')) return;
    await base44.entities.MenuItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const duplicateItem = (item) => {
    if (!confirm(`Duplicare "${item.name}"?`)) return;
    const { id, created_date, updated_date, ...rest } = item;
    base44.entities.MenuItem.create({ ...rest, name: rest.name + ' (copia)', active: false }).then(load);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('imageUrl', file_url);
    setUploadingImage(false);
  };

  const generateImage = async () => {
    if (!form.imagePrompt) { alert('Inserisci un imagePrompt prima di generare'); return; }
    setGeneratingImage(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({ prompt: form.imagePrompt });
      set('imageUrl', url);
    } catch (e) {
      alert('Errore generazione immagine: ' + e.message);
    }
    setGeneratingImage(false);
  };

  const generateDescription = async () => {
    if (!form.name) { alert('Inserisci prima il nome del piatto'); return; }
    setGeneratingDescription(true);
    const { description } = await base44.integrations.Core.InvokeLLM({
      prompt: `Scrivi una descrizione breve e appetitosa (max 2 righe, tono elegante, italiano) per un piatto di ristorante chiamato "${form.name}"${form.category ? ` nella categoria "${form.category}"` : ''}. Rispondi solo con la descrizione, senza virgolette.`,
      response_json_schema: { type: 'object', properties: { description: { type: 'string' } } },
    });
    set('description', description);
    setGeneratingDescription(false);
  };

  const filtered = items.filter(item => {
    if (filterCat !== 'all' && item.category !== filterCat) return false;
    if (filterActive === 'active' && !item.active) return false;
    if (filterActive === 'inactive' && item.active) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Gestione Menu</h2>
        <BronzeButton onClick={openCreate} variant="solid">
          <Plus size={14} /> Nuovo Piatto
        </BronzeButton>
      </div>

      {/* Filters */}
      <div className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E5E5E5]/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca piatto..."
              className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] pl-8 pr-4 py-2 rounded-sm text-sm font-body focus:border-[#C69C6D] outline-none w-48"
            />
          </div>
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="bg-[#0A0A0B] border border-[#E5E5E5]/15 text-[#E5E5E5] px-3 py-2 rounded-sm text-xs font-body focus:border-[#C69C6D] outline-none"
          >
            <option value="all">Tutti gli stati</option>
            <option value="active">Solo attivi</option>
            <option value="inactive">Solo inattivi</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 text-xs font-body tracking-widest uppercase rounded-sm border transition-all ${filterCat === 'all' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
            Tutte categorie
          </button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 text-xs font-body tracking-widest uppercase rounded-sm border transition-all ${filterCat === c ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-body text-[#E5E5E5]/30 mb-3">{filtered.length} piatti</p>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#E5E5E5]/30 font-body text-sm py-8 text-center">Nessun piatto trovato.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`bg-[#161618] border rounded-sm px-4 py-3 flex flex-wrap gap-3 items-center justify-between transition-all ${item.active ? 'border-[#C69C6D]/10' : 'border-[#E5E5E5]/5 opacity-50'}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {(item.imageUrl || item.image_url) ? (
                  <img src={item.imageUrl || item.image_url} alt="" className="w-12 h-12 object-cover rounded-sm shrink-0 border border-[#C69C6D]/10" />
                ) : (
                  <div className="w-12 h-12 bg-[#0A0A0B] rounded-sm shrink-0 flex items-center justify-center text-xl border border-[#E5E5E5]/5">🍽</div>
                )}
                <div className="min-w-0">
                  <p className="font-body text-sm text-white truncate">{item.name}</p>
                  <p className="font-body text-xs text-[#E5E5E5]/40">
                    <span className="text-[#C69C6D]/60">{CATEGORY_LABELS[item.category] || item.category}</span>
                    {' · '}<span className="text-[#C69C6D]">€{Number(item.price).toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleActive(item)} title={item.active ? 'Disattiva' : 'Attiva'}
                  className={`p-2 border rounded-sm min-w-[36px] min-h-[36px] flex items-center justify-center transition-all ${item.active ? 'border-green-400/30 text-green-400 hover:bg-green-400/10' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/40 hover:border-green-400/30 hover:text-green-400'}`}>
                  {item.active ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button onClick={() => openEdit(item)} title="Modifica"
                  className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 transition-all rounded-sm min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <Pencil size={13} />
                </button>
                <button onClick={() => duplicateItem(item)} title="Duplica su altro menu"
                  className="p-2 border border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:text-[#C69C6D] hover:border-[#C69C6D]/30 transition-all rounded-sm min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <Copy size={13} />
                </button>
                <button onClick={() => deleteItem(item.id)} title="Elimina"
                  className="p-2 border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/50 transition-all rounded-sm min-w-[36px] min-h-[36px] flex items-center justify-center">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl text-white">{editing ? 'Modifica Piatto' : 'Nuovo Piatto'}</h3>
              <button onClick={closeForm} className="text-[#E5E5E5]/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Nome *</label>
                <input type="text" placeholder="Es. Risotto al Tartufo" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20" />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Categoria *</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Prezzo (€) *</label>
                <input type="number" min="0" step="0.50" placeholder="0.00" value={form.price}
                  onChange={e => set('price', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm" />
              </div>

              {/* Sort order */}
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Ordine</label>
                <input type="number" placeholder="10" value={form.sortOrder}
                  onChange={e => set('sortOrder', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm" />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Descrizione</label>
                <div className="flex gap-2 items-start">
                  <textarea placeholder="Descrizione breve del piatto..." value={form.description}
                    onChange={e => set('description', e.target.value)} rows={2}
                    className="flex-1 bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20 resize-none" />
                  <button type="button" onClick={generateDescription} disabled={generatingDescription || !form.name}
                    title="Genera descrizione AI"
                    className="shrink-0 px-3 py-2.5 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all disabled:opacity-40 flex items-center gap-1.5 text-xs font-body">
                    {generatingDescription ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    {generatingDescription ? 'Generazione...' : 'Genera'}
                  </button>
                </div>
              </div>

              {/* Allergens */}
              <div className="md:col-span-2">
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Allergeni</label>
                <input type="text" placeholder="Glutine, Lattosio, Uova..." value={form.allergens}
                  onChange={e => set('allergens', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20" />
              </div>

              {/* Dietary tags */}
              <div className="md:col-span-2">
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-2">Tag Dietetici</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => toggleDietaryTag(tag)}
                      className={`px-3 py-1.5 text-xs border rounded-full font-body transition-all ${(form.dietaryTags || []).includes(tag) ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}>
                      {DIETARY_LABELS[tag]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image upload */}
              <div className="md:col-span-2">
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Immagine</label>
                <div className="flex gap-3 items-center">
                  <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm cursor-pointer font-body text-sm transition-all ${uploadingImage ? 'opacity-50 pointer-events-none' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/60 hover:border-[#C69C6D]/40 hover:text-[#C69C6D]'}`}>
                    {uploadingImage ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingImage ? 'Caricamento...' : 'Carica immagine'}
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" className="hidden" onChange={handleImageUpload} />
                  </label>
                  {form.imageUrl && (
                    <>
                      <img src={form.imageUrl} alt="" className="w-12 h-12 object-cover rounded-sm border border-[#C69C6D]/20 shrink-0" />
                      <button type="button" onClick={() => set('imageUrl', '')} className="text-[#E5E5E5]/30 hover:text-red-400 transition-colors"><X size={14} /></button>
                    </>
                  )}
                </div>
              </div>

              {/* Image prompt */}
              <div className="md:col-span-2">
                <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Prompt immagine AI</label>
                <div className="flex gap-2">
                  <textarea placeholder="Descrivi l'immagine per la generazione AI..." value={form.imagePrompt}
                    onChange={e => set('imagePrompt', e.target.value)} rows={2}
                    className="flex-1 bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20 resize-none" />
                  <button type="button" onClick={generateImage} disabled={generatingImage || !form.imagePrompt}
                    title="Genera immagine AI"
                    className="shrink-0 self-start px-3 py-2.5 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm transition-all disabled:opacity-40 flex items-center gap-1.5 text-xs font-body">
                    {generatingImage ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                    {generatingImage ? 'Generazione...' : 'Genera'}
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('active', !form.active)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-[#C69C6D]' : 'bg-[#E5E5E5]/20'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.active ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-body text-[#E5E5E5]/60">Attivo</span>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('featured', !form.featured)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.featured ? 'bg-[#C69C6D]' : 'bg-[#E5E5E5]/20'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.featured ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-body text-[#E5E5E5]/60">In evidenza (home)</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <BronzeButton onClick={closeForm} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
              <BronzeButton onClick={saveItem} variant="solid" className="flex-1 justify-center"
                disabled={saving || !form.name || !form.price}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Check size={14} /> Salva Piatto</>}
              </BronzeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}