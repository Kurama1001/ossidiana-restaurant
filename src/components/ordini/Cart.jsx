import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';

export default function Cart({ cart, onUpdateQty, onRemove, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="sticky top-28 bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-6 text-center">
        <ShoppingBag size={32} className="text-[#C69C6D]/40 mx-auto mb-3" />
        <p className="font-body text-[#E5E5E5]/40 text-sm">Il tuo carrello è vuoto</p>
        <p className="font-body text-[#E5E5E5]/25 text-xs mt-1">Aggiungi piatti dal menu</p>
      </div>
    );
  }

  return (
    <div className="sticky top-28 bg-[#161618] border border-[#C69C6D]/10 rounded-sm p-6">
      <h3 className="font-display text-xl text-white mb-5 flex items-center gap-2">
        <ShoppingBag size={18} className="text-[#C69C6D]" /> Il tuo ordine
      </h3>
      <div className="space-y-3 mb-5 max-h-72 overflow-y-auto pr-1">
        {cart.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-[#E5E5E5] truncate">{item.name}</p>
              <p className="font-body text-xs text-[#C69C6D]">€{(item.price * item.qty).toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 border border-[#E5E5E5]/20 text-[#E5E5E5]/60 flex items-center justify-center hover:border-[#C69C6D] transition-colors rounded-sm">
                <Minus size={10} />
              </button>
              <span className="font-body text-sm text-white w-5 text-center">{item.qty}</span>
              <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 border border-[#E5E5E5]/20 text-[#E5E5E5]/60 flex items-center justify-center hover:border-[#C69C6D] transition-colors rounded-sm">
                <Plus size={10} />
              </button>
              <button onClick={() => onRemove(item.id)} className="w-7 h-7 text-[#E5E5E5]/30 hover:text-red-400 transition-colors ml-1">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[#C69C6D]/10 pt-4 mb-5">
        <div className="flex justify-between font-body text-base">
          <span className="text-[#E5E5E5]/60">Totale</span>
          <span className="text-[#C69C6D] font-semibold">€{total.toFixed(2)}</span>
        </div>
      </div>
      <BronzeButton onClick={onCheckout} variant="solid" className="w-full justify-center">
        Procedi all'Ordine
      </BronzeButton>
    </div>
  );
}