import { useState } from 'react';

const DIETARY_CONFIG = {
  vegetariano: { label: '🌿 Vegetariano', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
  pesce: { label: '🐟 Pesce', color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
  carne: { label: '🥩 Carne', color: 'text-red-400 border-red-400/30 bg-red-400/5' },
  senza_lattosio: { label: 'Senza Lattosio', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
  senza_glutine_su_richiesta: { label: 'Senza Glutine (richiesta)', color: 'text-orange-400 border-orange-400/30 bg-orange-400/5' },
  piccante: { label: '🌶 Piccante', color: 'text-red-500 border-red-500/30 bg-red-500/5' },
  // legacy tags
  vegetariano_old: { label: '🌿 Vegetariano', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
  senza_glutine: { label: 'Senza Glutine', color: 'text-orange-400 border-orange-400/30 bg-orange-400/5' },
  chef_choice: { label: '★ Chef', color: 'text-[#C69C6D] border-[#C69C6D]/30 bg-[#C69C6D]/5' },
};

export default function MenuItemCard({ item, onAddToCart }) {
  const [lightbox, setLightbox] = useState(false);
  const tags = item.dietaryTags || item.tags || [];
  const imageUrl = item.imageUrl || item.image_url;

  return (
    <>
    <div className="flex gap-4 py-5 border-b border-[#E5E5E5]/5 last:border-0 group">
      {/* Image */}
      <div className="shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-sm overflow-hidden bg-[#161618] border border-[#C69C6D]/10">
        {imageUrl ? (
          <button onClick={() => setLightbox(true)} className="w-full h-full block cursor-zoom-in">
            <img
              src={imageUrl}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">🍽</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3 mb-1">
          <h3 className="font-display text-lg text-white leading-tight">{item.name}</h3>
          <span className="font-body text-[#C69C6D] font-semibold text-base shrink-0">
            €{Number(item.price).toFixed(2)}
          </span>
        </div>

        {item.description && (
          <p className="font-body text-[#E5E5E5]/50 text-sm leading-relaxed mb-2 line-clamp-2">{item.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map(tag => {
            const cfg = DIETARY_CONFIG[tag];
            if (!cfg) return null;
            return (
              <span key={tag} className={`text-xs font-body px-2 py-0.5 border rounded-full ${cfg.color}`}>
                {cfg.label}
              </span>
            );
          })}
          {item.allergens && (
            <span className="text-xs font-body text-[#E5E5E5]/30 px-2 py-0.5 border border-[#E5E5E5]/10 rounded-full">
              Allergeni: {item.allergens}
            </span>
          )}
        </div>
      </div>

      {onAddToCart && (
        <button
          onClick={() => onAddToCart(item)}
          className="shrink-0 self-center w-9 h-9 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D] hover:text-[#0A0A0B] rounded-sm flex items-center justify-center transition-all text-lg font-bold"
        >
          +
        </button>
      )}
    </div>

    {/* Lightbox */}
    {lightbox && (
      <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
        <img src={imageUrl} alt={item.name} className="max-w-full max-h-[90vh] object-contain rounded-sm shadow-2xl" />
      </div>
    )}
    </>
  );
}