import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Loader2 } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

export default function AdminChiSiamo() {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ subtitle: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.RestaurantInfo.filter({ section: 'chi_siamo' }, '-created_date', 1)
      .then(items => {
        if (items.length > 0) {
          setInfo(items[0]);
          setForm({
            subtitle: items[0].subtitle || '',
            body: items[0].body || '',
          });
        }
      });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, section: 'chi_siamo' };
    if (info) {
      await base44.entities.RestaurantInfo.update(info.id, data);
    } else {
      const created = await base44.entities.RestaurantInfo.create(data);
      setInfo(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="font-display text-2xl text-white tracking-widest mb-6">Chi Siamo</h2>

      <div className="space-y-6 max-w-2xl">
        {/* La nostra storia */}
        <div>
          <label className="block text-sm text-[#C69C6D] font-body font-semibold mb-1">La nostra storia</label>
          <textarea
            value={form.subtitle}
            onChange={e => set('subtitle', e.target.value)}
            rows={5}
            placeholder="Racconta la storia del ristorante..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm resize-none placeholder:text-[#E5E5E5]/20"
          />
        </div>

        {/* Perché Ossidiana */}
        <div>
          <label className="block text-sm text-[#C69C6D] font-body font-semibold mb-1">Perché Ossidiana</label>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value)}
            rows={5}
            placeholder="Spiega il nome, la filosofia, i valori..."
            className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none font-body text-sm resize-none placeholder:text-[#E5E5E5]/20"
          />
        </div>

        <div className="pt-1">
          <BronzeButton onClick={handleSave} variant="solid" disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : saved ? <><Check size={14} /> Salvato!</> : <><Check size={14} /> Salva</>}
          </BronzeButton>
        </div>
      </div>
    </div>
  );
}