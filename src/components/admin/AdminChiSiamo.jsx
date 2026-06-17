import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Loader2, Upload } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

export default function AdminChiSiamo() {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ title: '', subtitle: '', body: '', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.RestaurantInfo.filter({ section: 'chi_siamo' }, '-created_date', 1)
      .then(items => {
        if (items.length > 0) {
          setInfo(items[0]);
          setForm({
            title: items[0].title || '',
            subtitle: items[0].subtitle || '',
            body: items[0].body || '',
            imageUrl: items[0].imageUrl || '',
          });
        }
      });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('imageUrl', file_url);
    setUploadingImg(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    if (info) {
      await base44.entities.RestaurantInfo.update(info.id, { ...form, section: 'chi_siamo' });
    } else {
      const created = await base44.entities.RestaurantInfo.create({ ...form, section: 'chi_siamo' });
      setInfo(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-white tracking-widest mb-6">Sezione "Chi Siamo"</h2>

      <div className="space-y-5 max-w-2xl">
        <div>
          <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Titolo</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Chi Siamo"
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20"
          />
        </div>

        <div>
          <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Sottotitolo / Categoria</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={e => set('subtitle', e.target.value)}
            placeholder="La nostra storia"
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm placeholder:text-[#E5E5E5]/20"
          />
        </div>

        <div>
          <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">Testo (vai a capo per nuovi paragrafi)</label>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value)}
            rows={8}
            placeholder="Racconta la storia del ristorante, la filosofia, i valori..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm resize-none placeholder:text-[#E5E5E5]/20"
          />
        </div>

        <div>
          <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-2">Immagine laterale</label>
          <div className="flex gap-4 items-start">
            <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-sm cursor-pointer font-body text-sm transition-all ${uploadingImg ? 'opacity-50 pointer-events-none' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/60 hover:border-[#C69C6D]/40 hover:text-[#C69C6D]'}`}>
              {uploadingImg ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploadingImg ? 'Caricamento...' : 'Carica immagine'}
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleImageUpload} />
            </label>
            {form.imageUrl && (
              <img src={form.imageUrl} alt="" className="w-20 h-24 object-cover rounded-sm border border-[#C69C6D]/20" />
            )}
          </div>
        </div>

        <div className="pt-2">
          <BronzeButton onClick={handleSave} variant="solid" disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : saved ? <><Check size={14} /> Salvato!</> : <><Check size={14} /> Salva</>}
          </BronzeButton>
        </div>
      </div>
    </div>
  );
}