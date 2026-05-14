import { useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', alt: 'Interno del ristorante' },
  { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80', alt: 'Piatto di carne' },
  { url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80', alt: 'Pasta fresca' },
  { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', alt: 'Atmosfera' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', alt: 'Pizza' },
  { url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80', alt: 'Dolci' },
  { url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80', alt: 'Vini' },
  { url: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=80', alt: 'Tavoli' },
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', alt: 'Piatto gourmet' },
];

function Carousel({ onOpen }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);

  const prev = () => setCurrent(i => (i - 1 + PHOTOS.length) % PHOTOS.length);
  const next = () => setCurrent(i => (i + 1) % PHOTOS.length);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-sm" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {PHOTOS.map((photo, i) => (
          <img
            key={i}
            src={photo.url}
            alt={photo.alt}
            className="w-full h-72 object-cover shrink-0 cursor-pointer"
            onClick={() => onOpen(photo)}
          />
        ))}
      </div>

      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {PHOTOS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-[#C69C6D] w-4' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function PhotoGallery() {
  const [lightbox, setLightbox] = useState(null);

  return (
    <section className="py-24 px-5 max-w-7xl mx-auto">
      <div className="text-center mb-14">
        <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">I Nostri Spazi</p>
        <h2 className="font-display text-5xl text-white tracking-widest">Galleria</h2>
        <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
      </div>

      {/* Mobile/Tablet: carosello */}
      <div className="md:hidden">
        <Carousel onOpen={setLightbox} />
      </div>

      {/* Desktop: griglia */}
      <div className="hidden md:grid grid-cols-4 gap-3">
        {PHOTOS.map((photo, i) => (
          <div
            key={i}
            className={`overflow-hidden cursor-pointer group ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
            onClick={() => setLightbox(photo)}
          >
            <img
              src={photo.url}
              alt={photo.alt}
              className={`w-full object-cover group-hover:scale-105 transition-transform duration-700 ${i === 0 ? 'h-full' : 'h-48'}`}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={28} />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.alt}
            className="max-w-full max-h-[85vh] object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}