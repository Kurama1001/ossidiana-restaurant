import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Star, ChevronRight } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';
import PhotoGallery from '@/components/home/PhotoGallery';

export default function Home() {
  const [menuHighlights, setMenuHighlights] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    base44.entities.MenuItem.filter({ is_available: true }, 'sort_order', 6).then(setMenuHighlights).catch(() => {});
    base44.entities.Review.filter({ is_visible: true }, '-created_date', 3).then(setReviews).catch(() => {});
  }, []);

  return (
    <div className="bg-[#0A0A0B]">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/70 via-[#0A0A0B]/50 to-[#0A0A0B]" />
        <div className="relative z-10 text-center px-5 max-w-3xl mx-auto">
          <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-sm mb-6">Benvenuti da</p>
          <h1 className="font-display text-5xl sm:text-7xl md:text-9xl text-white tracking-widest mb-4" style={{ fontFamily: 'serif' }}>OSSIDIANA</h1>
          <div className="w-24 h-px bg-[#C69C6D] mx-auto mb-8" />
          <p className="font-body text-[#E5E5E5]/70 text-base md:text-lg leading-relaxed mb-10 px-2">
            Un'esperienza gastronomica autentica nel cuore di Roma.<br />
            Dove la tradizione incontra l'innovazione in un'atmosfera raffinata.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <BronzeButton to="/prenotazioni" variant="solid" className="w-64 justify-center">Prenota un Tavolo</BronzeButton>
            <BronzeButton to="/menu" variant="outline" className="w-64 justify-center">Scopri il Menu</BronzeButton>
          </div>
        </div>
      </section>

      {/* Menu Highlights */}
      <section className="py-24 px-5 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">I Nostri</p>
          <h2 className="font-display text-5xl text-white tracking-widest">Piatti in Evidenza</h2>
          <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuHighlights.map(item => (
            <div key={item.id} className="group relative overflow-hidden rounded-sm bg-[#161618] border border-[#C69C6D]/10 hover:border-[#C69C6D]/30 transition-all duration-500">
              {item.image_url && (
                <div className="h-52 overflow-hidden">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-display text-xl text-white">{item.name}</h3>
                  <span className="font-body text-[#C69C6D] font-semibold">€{Number(item.price).toFixed(2)}</span>
                </div>
                {item.description && <p className="font-body text-[#E5E5E5]/50 text-sm leading-relaxed">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <BronzeButton to="/menu" variant="outline">
            Tutto il Menu <ChevronRight size={14} />
          </BronzeButton>
        </div>
      </section>

      {/* Info strip */}
      <section className="border-y border-[#C69C6D]/15 py-16 bg-[#161618]">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { title: 'Prenotazioni', desc: 'Riserva il tuo tavolo online in pochi click', action: '/prenotazioni', label: 'Prenota ora' },
            { title: 'Asporto', desc: 'Ordina i tuoi piatti preferiti da portare a casa', action: '/ordini', label: 'Ordina ora' },
            { title: 'Orari', desc: 'Mar–Dom: 12:30–15:00 / 19:00–23:00 · Lunedì chiuso', action: null, label: null },
          ].map(b => (
            <div key={b.title}>
              <h3 className="font-display text-2xl text-[#C69C6D] tracking-widest mb-3">{b.title}</h3>
              <p className="font-body text-[#E5E5E5]/50 text-sm mb-4">{b.desc}</p>
              {b.action && <BronzeButton to={b.action} variant="ghost">{b.label} →</BronzeButton>}
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <PhotoGallery />

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-24 px-5 max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">Cosa dicono di noi</p>
            <h2 className="font-display text-5xl text-white tracking-widest">Recensioni</h2>
            <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map(r => (
              <div key={r.id} className="bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-7">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < r.rating ? 'text-[#C69C6D] fill-[#C69C6D]' : 'text-[#E5E5E5]/20'} />
                  ))}
                </div>
                <p className="font-body text-[#E5E5E5]/70 text-sm leading-relaxed italic mb-4">"{r.text}"</p>
                <p className="font-body text-[#C69C6D] text-sm font-semibold">— {r.customer_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}