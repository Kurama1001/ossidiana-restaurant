import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Pizze', 'Dolci', 'Bevande'];
const ALL_TAGS = ['vegetariano', 'senza_glutine', 'piccante', 'chef_choice'];
const TAG_LABELS = { vegetariano: 'Vegetariano', senza_glutine: 'Senza Glutine', piccante: 'Piccante', chef_choice: '★ Chef' };

const emptyForm = { name: '', description: '', category: 'Antipasti', price: '', allergens: '', image_url: '', is_available: true, tags: [] };

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const load = () => {
    base44.entities.MenuItem.list('category', 200).then(setItems).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = (tag) => setForm(f => ({
    ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
  }));

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => { setEditing(item); setForm({ ...item, price: item.price?.toString(), tags: item.tags || [] }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const saveItem = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const data = { ...form, price: parseFloat(form.price) };
    if (editing) {
      await base44.entities.MenuItem.update(editing.id, data);
    } else {
      await base44.entities.MenuItem.create(data);
    }
    setSaving(false);
    closeForm();
    load();
  };

  const toggleAvailability = async (item) => {
    await base44.entities.MenuItem.update(item.id, { is_available: !item.is_available });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
  };

  const deleteItem = async (id) => {
    if (!confirm('Eliminare questo piatto?')) return;
    await base44.entities.MenuItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${
                filterCat === c ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
              }`}
            >{c === 'all' ? 'Tutti' : c}</button>
          ))}
        </div>
        <BronzeButton onClick={openCreate} variant="solid">
          <Plus size={14} /> Aggiungi Piatto
        </BronzeButton>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl text-white">{editing ? 'Modifica Piatto' : 'Nuovo Piatto'}</h3>
              <button onClick={closeForm} className="text-[#E5E5E5]/40 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'name', label: 'Nome *', type: 'text', placeholder: 'Es. Risotto al Tartufo' },
                { key: 'price', label: 'Prezzo (€) *', type: 'number', placeholder: '0.00' },
                { key: 'allergens', label: 'Allergeni', type: 'text', placeholder: 'Glutine, Lattosio...' },
                { key: 'image_url', label: 'URL Immagine', type: 'text', placeholder: 'https://...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/20"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-1">Descrizione</label>
                <textarea
                  placeholder="Descrizione del piatto..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={2}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">Categoria</label>
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">Tag</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 text-xs border rounded-full font-body transition-all ${
                        form.tags.includes(tag) ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B]' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50'
                      }`}
                    >{TAG_LABELS[tag]}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('is_available', !form.is_available)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.is_available ? 'bg-[#C69C6D]' : 'bg-[#E5E5E5]/20'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_available ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm font-body text-[#E5E5E5]/60">Disponibile</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <BronzeButton onClick={closeForm} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
              <BronzeButton onClick={saveItem} variant="solid" className="flex-1 justify-center" disabled={saving || !form.name || !form.price}>
                {saving ? 'Salvataggio...' : <><Check size={14} /> Salva</>}
              </BronzeButton>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-[#161618] animate-pulse rounded-sm" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#E5E5E5]/30 font-body text-sm">Nessun piatto trovato.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`bg-[#161618] border rounded-sm px-5 py-4 flex flex-wrap gap-4 items-center justify-between transition-all ${item.is_available ? 'border-[#C69C6D]/10' : 'border-[#E5E5E5]/5 opacity-50'}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {item.image_url && <img src={item.image_url} alt="" className="w-12 h-12 object-cover rounded-sm shrink-0" />}
                <div className="min-w-0">
                  <p className="font-body text-sm text-white truncate">{item.name}</p>
                  <p className="font-body text-xs text-[#E5E5E5]/40">{item.category} · <span className="text-[#C69C6D]">€{Number(item.price).toFixed(2)}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAvailability(item)} className={`p-2 border rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center transition-all ${item.is_available ? 'border-green-400/30 text-green-400' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/40'}`}>
                  {item.is_available ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => openEdit(item)} className="p-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 transition-all rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center">
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteItem(item.id)} className="p-2 border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/50 transition-all rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}