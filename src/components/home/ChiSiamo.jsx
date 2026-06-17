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
    <section className="py-24 px-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-14">
        <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">Il Ristorante</p>
        <h2 className="font-display text-5xl text-white tracking-widest">Chi Siamo</h2>
        <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
      </div>

      {/* La nostra storia */}
      {info.subtitle && (
        <div className="mb-12">
          <h3 className="font-display text-2xl text-[#C69C6D] tracking-widest mb-5">La nostra storia</h3>
          <p className="font-body text-[#E5E5E5]/60 text-base leading-relaxed">{info.subtitle}</p>
        </div>
      )}

      {/* Perché Ossidiana */}
      {info.body && (
        <div>
          <h3 className="font-display text-2xl text-[#C69C6D] tracking-widest mb-5">Perché Ossidiana</h3>
          {info.body.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} className="font-body text-[#E5E5E5]/60 text-base leading-relaxed mb-4">{para}</p>
          ))}
        </div>
      )}
    </section>
  );
}