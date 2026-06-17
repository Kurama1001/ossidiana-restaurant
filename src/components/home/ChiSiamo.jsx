import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function ChiSiamo() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    base44.entities.RestaurantInfo.filter({ section: 'chi_siamo' }, '-created_date', 1)
      .then(items => { if (items.length > 0) setInfo(items[0]); })
      .catch(() => {});
  }, []);

  if (!info) return null;

  return (
    <section className="py-24 px-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Testo */}
        <div>
          <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-4">
            {info.subtitle || 'La nostra storia'}
          </p>
          <h2 className="font-display text-5xl text-white tracking-widest mb-6">
            {info.title || 'Chi Siamo'}
          </h2>
          <div className="w-16 h-px bg-[#C69C6D] mb-8" />
          {info.body && info.body.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} className="font-body text-[#E5E5E5]/60 text-base leading-relaxed mb-4">
              {para}
            </p>
          ))}
        </div>

        {/* Immagine */}
        {info.imageUrl ? (
          <div className="overflow-hidden rounded-sm aspect-[4/5]">
            <img
              src={info.imageUrl}
              alt={info.title || 'Chi siamo'}
              className="w-full h-full object-cover object-center"
            />
          </div>
        ) : (
          <div className="hidden md:block aspect-[4/5] bg-[#161618] border border-[#C69C6D]/10 rounded-sm" />
        )}
      </div>
    </section>
  );
}