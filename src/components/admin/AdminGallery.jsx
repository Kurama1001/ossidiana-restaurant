import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Upload, Loader2, Eye, EyeOff, Image, Film } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

export default function AdminGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = () => {
    base44.entities.GalleryItem.list('sortOrder', 200)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.GalleryItem.create({
        url: file_url,
        type: isVideo ? 'video' : 'image',
        active: true,
        sortOrder: 0,
      });
    }
    setUploading(false);
    load();
    e.target.value = '';
  };

  const toggleActive = async (item) => {
    await base44.entities.GalleryItem.update(item.id, { active: !item.active });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
  };

  const deleteItem = async (id) => {
    if (!confirm('Eliminare questo elemento dalla galleria?')) return;
    await base44.entities.GalleryItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateCaption = async (item, caption) => {
    await base44.entities.GalleryItem.update(item.id, { caption });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, caption } : i));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <h2 className="font-display text-2xl text-white tracking-widest">Galleria Home</h2>
        <label className={`flex items-center gap-2 px-5 py-2.5 text-sm font-body border rounded-sm cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none border-[#E5E5E5]/15 text-[#E5E5E5]/40' : 'border-[#C69C6D] text-[#C69C6D] hover:bg-[#C69C6D] hover:text-[#0A0A0B]'}`}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Caricamento...' : 'Carica foto/video'}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/mov,video/webm"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      <p className="text-xs font-body text-[#E5E5E5]/30 mb-4">
        {items.filter(i => i.active).length} elementi visibili · {items.length} totali
      </p>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-[#161618] animate-pulse rounded-sm" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#E5E5E5]/10 rounded-sm">
          <Image size={32} className="text-[#E5E5E5]/20 mx-auto mb-3" />
          <p className="font-body text-[#E5E5E5]/30 text-sm">Nessun elemento. Carica foto o video.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(item => (
            <div key={item.id} className={`relative group rounded-sm overflow-hidden border transition-all ${item.active ? 'border-[#C69C6D]/20' : 'border-[#E5E5E5]/5 opacity-50'}`}>
              {/* Preview */}
              {item.type === 'video' ? (
                <div
                  className="h-36 bg-[#0A0A0B] flex items-center justify-center cursor-pointer"
                  onClick={() => setLightbox(item)}
                >
                  <Film size={28} className="text-[#C69C6D]/60" />
                  <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-40" muted />
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.caption || ''}
                  className="w-full h-36 object-cover cursor-zoom-in"
                  onClick={() => setLightbox(item)}
                />
              )}

              {/* Actions overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => toggleActive(item)} title={item.active ? 'Nascondi' : 'Mostra'}
                  className={`p-1.5 rounded-sm border backdrop-blur-sm transition-all ${item.active ? 'border-green-400/50 bg-black/60 text-green-400' : 'border-[#E5E5E5]/30 bg-black/60 text-[#E5E5E5]/50'}`}>
                  {item.active ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
                <button onClick={() => deleteItem(item.id)} title="Elimina"
                  className="p-1.5 rounded-sm border border-red-400/40 bg-black/60 text-red-400 backdrop-blur-sm">
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Caption input */}
              <input
                type="text"
                placeholder="Didascalia..."
                defaultValue={item.caption || ''}
                onBlur={e => { if (e.target.value !== (item.caption || '')) updateCaption(item, e.target.value); }}
                className="w-full bg-[#161618] border-t border-[#E5E5E5]/10 text-[#E5E5E5]/60 text-xs font-body px-3 py-2 focus:outline-none focus:border-[#C69C6D] placeholder:text-[#E5E5E5]/20"
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {lightbox.type === 'video' ? (
            <video src={lightbox.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-sm" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightbox.url} alt={lightbox.caption || ''} className="max-w-full max-h-[85vh] object-contain rounded-sm" />
          )}
        </div>
      )}
    </div>
  );
}