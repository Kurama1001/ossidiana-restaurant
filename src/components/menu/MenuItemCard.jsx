import { ShoppingCart } from 'lucide-react';

const tagConfig = {
  vegetariano: { label: 'VG', title: 'Vegetariano', color: 'border-green-400 text-green-400' },
  senza_glutine: { label: 'GF', title: 'Senza Glutine', color: 'border-blue-300 text-blue-300' },
  piccante: { label: '🌶', title: 'Piccante', color: 'border-red-400 text-red-400' },
  chef_choice: { label: '★', title: 'Consigliato dallo Chef', color: 'border-[#C69C6D] text-[#C69C6D]' },
};

export default function MenuItemCard({ item, onAddToCart, showCartButton = false }) {
  return (
    <div className="flex gap-4 py-6 border-b border-[#C69C6D]/10 group hover:border-[#C69C6D]/30 transition-colors">
      {item.image_url && (
        <div className="w-24 h-24 shrink-0 overflow-hidden rounded-sm">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-display text-xl text-white">{item.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-body font-semibold text-[#C69C6D] text-base">€{Number(item.price).toFixed(2)}</span>
            {showCartButton && onAddToCart && (
              <button
                onClick={() => onAddToCart(item)}
                className="p-2 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D] hover:text-[#0A0A0B] transition-all duration-200 rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={`Aggiungi ${item.name} al carrello`}
              >
                <ShoppingCart size={14} />
              </button>
            )}
          </div>
        </div>
        {item.description && (
          <p className="text-[#E5E5E5]/50 text-sm font-body leading-relaxed mb-2">{item.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {(item.tags || []).map(t => tagConfig[t] && (
            <span key={t} title={tagConfig[t].title} className={`text-xs border px-2 py-0.5 rounded-full font-body ${tagConfig[t].color}`}>
              {tagConfig[t].label}
            </span>
          ))}
          {item.allergens && (
            <span className="text-xs font-body text-[#E5E5E5]/30 ml-1">Allergeni: {item.allergens}</span>
          )}
        </div>
      </div>
    </div>
  );
}