import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import MenuItemCard from '@/components/menu/MenuItemCard';
import Cart from '@/components/ordini/Cart';
import { BronzeButton } from '@/components/ui/BronzeButton';
import { Check, X } from 'lucide-react';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Pizze', 'Dolci', 'Bevande'];
const TIMES = ['12:30','13:00','13:30','14:00','19:00','19:30','20:00','20:30','21:00','21:30'];

export default function Ordini() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ customer_name: '', phone: '', pickup_time: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    base44.entities.MenuItem.filter({ is_available: true }, 'sort_order', 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));

  const handleCheckout = async () => {
    setSubmitting(true);
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    await base44.entities.Order.create({
      ...checkoutForm,
      items: cart,
      total_amount: total,
      status: 'ricevuto',
    });
    setSubmitting(false);
    setSuccess(true);
    setCart([]);
    setShowCheckout(false);
  };

  const filtered = items.filter(i => activeCategory === 'all' || i.category === activeCategory);

  if (success) {
    return (
      <div className="bg-[#0A0A0B] min-h-screen flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#C69C6D]/15 flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-[#C69C6D]" />
          </div>
          <h2 className="font-display text-4xl text-white tracking-widest mb-4">Ordine Inviato!</h2>
          <p className="font-body text-[#E5E5E5]/60 mb-8">
            Grazie <strong className="text-[#C69C6D]">{checkoutForm.customer_name}</strong>! Il tuo ordine è stato ricevuto.
            Sarà pronto per il ritiro alle <strong className="text-[#C69C6D]">{checkoutForm.pickup_time}</strong>.
          </p>
          <BronzeButton onClick={() => { setSuccess(false); setCheckoutForm({ customer_name: '', phone: '', pickup_time: '', notes: '' }); }} variant="outline">
            Nuovo Ordine
          </BronzeButton>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0B] min-h-screen pt-24 pb-20">
      <div className="text-center py-16 px-5">
        <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">Porta a casa</p>
        <h1 className="font-display text-6xl md:text-7xl text-white tracking-widest">Asporto</h1>
        <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
      </div>

      <div className="max-w-7xl mx-auto px-5">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${activeCategory === 'all' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}
          >Tutti</button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${activeCategory === cat ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'}`}
            >{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Menu list */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />)}</div>
            ) : (
              filtered.map(item => (
                <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} showCartButton />
              ))
            )}
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Cart cart={cart} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={() => setShowCheckout(true)} />
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl text-white">Completa l'Ordine</h3>
              <button onClick={() => setShowCheckout(false)} className="text-[#E5E5E5]/40 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'customer_name', label: 'Nome e Cognome *', type: 'text', placeholder: 'Mario Rossi' },
                { key: 'phone', label: 'Telefono *', type: 'tel', placeholder: '+39 333 123 4567' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={checkoutForm[f.key]}
                    onChange={e => setCheckoutForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm placeholder:text-[#E5E5E5]/25"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">Orario di Ritiro *</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCheckoutForm(p => ({ ...p, pickup_time: t }))}
                      className={`py-2 text-xs font-body border rounded-sm transition-all min-h-[40px] ${checkoutForm.pickup_time === t ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-semibold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/60 hover:border-[#C69C6D]/50'}`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#E5E5E5]/50 font-body tracking-widest uppercase mb-2">Note</label>
                <textarea
                  placeholder="Allergie o richieste speciali..."
                  value={checkoutForm.notes}
                  onChange={e => setCheckoutForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#0A0A0B] border border-[#E5E5E5]/20 text-[#E5E5E5] px-4 py-3 rounded-sm focus:border-[#C69C6D] outline-none transition font-body text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <BronzeButton onClick={() => setShowCheckout(false)} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
              <BronzeButton
                onClick={handleCheckout}
                variant="solid"
                className="flex-1 justify-center"
                disabled={submitting || !checkoutForm.customer_name || !checkoutForm.phone || !checkoutForm.pickup_time}
              >
                {submitting ? 'Invio...' : 'Invia Ordine'}
              </BronzeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}