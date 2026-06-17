import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ChevronLeft, ChevronRight, Film } from 'lucide-react';

const focalClass = { top: 'object-top', center: 'object-center', bottom: 'object-bottom' };

function GalleryMedia({ item, className, onClick }) {
  const focal = focalClass[item.focalPoint || 'center'];
  if (item.type === 'video') {
    return (
      <div className={`relative ${className}`} onClick={onClick}>
        <video src={item.url} muted playsInline loop autoPlay className={`w-full h-full object-cover ${focal}`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Film size={28} className="text-white/60" />
        </div>
      </div>
    );
  }
  return (
    <img src={item.url} alt={item.caption || ''} loading="lazy"
      className={`w-full h-full object-cover ${focal} ${className}`}
      onClick={onClick}
    />
  );
}

function Carousel({ items, onOpen }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);

  const prev = () => setCurrent(i => (i - 1 + items.length) % items.length);
  const next = () => setCurrent(i => (i + 1) % items.length);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  if (!items.length) return null;

  return (
    <div className="relative overflow-hidden rounded-sm" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${current * 100}%)` }}>
        {items.map((item, i) => (
          <div key={item.id} className="w-full h-72 shrink-0 cursor-pointer overflow-hidden">
            <GalleryMedia item={item} className="cursor-pointer" onClick={() => onOpen(item)} />
          </div>
        ))}
      </div>
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
        <ChevronLeft size={20} />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
        <ChevronRight size={20} />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {items.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-[#C69C6D] w-4' : 'bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
}

export default function PhotoGallery() {
  const [items, setItems] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    base44.entities.GalleryItem.filter({ active: true }, 'sortOrder', 50).then(setItems).catch(() => {});
  }, []);

  if (!items.length) return null;

  const featured = items.find(i => i.featured);
  const rest = items.filter(i => !i.featured);

  return (
    <section className="py-24 px-5 max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">I Nostri Spazi</p>
        <h2 className="font-display text-5xl text-white tracking-widest">Galleria</h2>
        <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
      </div>

      {/* Mobile: carosello */}
      <div className="md:hidden">
        <Carousel items={items} onOpen={setLightbox} />
      </div>

      {/* Desktop */}
      <div className="hidden md:block space-y-3">
        {/* Immagine featured (se presente) */}
        {featured && (
          <div
            className="w-full h-[480px] overflow-hidden rounded-sm cursor-pointer group"
            onClick={() => setLightbox(featured)}
          >
            <GalleryMedia item={featured} className="group-hover:scale-105 transition-transform duration-700" />
          </div>
        )}

        {/* Griglia uniforme */}
        {rest.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {rest.map(item => (
              <div
                key={item.id}
                className="h-52 overflow-hidden rounded-sm cursor-pointer group"
                onClick={() => setLightbox(item)}
              >
                <GalleryMedia item={item} className="group-hover:scale-105 transition-transform duration-700" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" onClick={() => setLightbox(null)}>
            <X size={28} />
          </button>
          {lightbox.type === 'video' ? (
            <video src={lightbox.url} controls autoPlay className="max-w-full max-h-[85vh]" onClick={e => e.stopPropagation()} />
          ) : (
            <img src={lightbox.url} alt={lightbox.caption || ''} className="max-w-full max-h-[85vh] object-contain" onClick={e => e.stopPropagation()} />
          )}
        </div>
      )}
    </section>
  );
}