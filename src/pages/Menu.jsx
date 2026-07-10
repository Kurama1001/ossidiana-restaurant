import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import MenuItemCard from '@/components/menu/MenuItemCard';
import WineSection from '@/components/menu/WineSection';

const CATEGORY_ORDER = ['antipasti', 'primi', 'romanissimi', 'secondi', 'contorni', 'dolci'];
const CATEGORY_LABELS = {
  antipasti: 'Antipasti',
  primi: 'Primi Piatti',
  romanissimi: 'I Romanissimi',
  secondi: 'Secondi',
  contorni: 'Contorni',
  dolci: 'Dolci',
};

export default function Menu() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.MenuItem.filter({ active: true }, 'sortOrder', 500)
      .then(setAllItems)
      .finally(() => setLoading(false));
  }, []);

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = allItems
      .filter(i => i.category === cat)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="bg-[#0A0A0B] min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-5 text-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/60 via-transparent to-[#0A0A0B]" />
        <div className="relative z-10">
          <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">La nostra cucina</p>
          <h1 className="font-display text-6xl md:text-7xl text-white tracking-widest">Menu</h1>
          <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5 mb-4" />
          <p className="font-body text-[#E5E5E5]/50 text-sm max-w-lg mx-auto">
            Ingredienti selezionati, ricette contemporanee, tradizione romana.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 py-12">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-28 bg-[#161618] animate-pulse rounded-sm" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-[#E5E5E5]/30 font-body py-20">Nessun piatto disponibile.</p>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="mb-14">
              <div className="flex items-center gap-5 mb-2">
                <h2 className="font-display text-3xl md:text-4xl text-white tracking-widest whitespace-nowrap">
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <div className="flex-1 h-px bg-[#C69C6D]/15" />
              </div>
              <div>
                {catItems.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
        <WineSection />
      </div>
    </div>
  );
}