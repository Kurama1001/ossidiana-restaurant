import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import MenuItemCard from '@/components/menu/MenuItemCard';

const CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Pizze', 'Dolci', 'Bevande'];
const ALL_TAGS = ['vegetariano', 'senza_glutine', 'piccante', 'chef_choice'];
const TAG_LABELS = { vegetariano: 'Vegetariano', senza_glutine: 'Senza Glutine', piccante: 'Piccante', chef_choice: '★ Chef' };

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTags, setActiveTags] = useState([]);

  useEffect(() => {
    base44.entities.MenuItem.filter({ is_available: true }, 'sort_order', 200)
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (tag) => setActiveTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  );

  const filtered = items.filter(item => {
    const catOk = activeCategory === 'all' || item.category === activeCategory;
    const tagOk = activeTags.length === 0 || activeTags.every(t => (item.tags || []).includes(t));
    return catOk && tagOk;
  });

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat);
    if (catItems.length > 0) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="bg-[#0A0A0B] min-h-screen pt-24 pb-20">
      {/* Header */}
      <div className="text-center py-16 px-5">
        <p className="font-body text-[#C69C6D] tracking-[0.4em] uppercase text-xs mb-3">La nostra cucina</p>
        <h1 className="font-display text-6xl md:text-7xl text-white tracking-widest">Menu</h1>
        <div className="w-16 h-px bg-[#C69C6D] mx-auto mt-5" />
      </div>

      {/* Sticky filters */}
      <div className="sticky top-[64px] z-40 bg-[#0A0A0B] py-4">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-5 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${
                activeCategory === 'all' ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
              }`}
            >Tutti</button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[40px] ${
                  activeCategory === cat ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold' : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40'
                }`}
              >{cat}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-1.5 text-xs border rounded-full font-body transition-all min-h-[36px] ${
                  activeTags.includes(tag) ? 'bg-[#C69C6D]/20 border-[#C69C6D] text-[#C69C6D]' : 'border-[#E5E5E5]/15 text-[#E5E5E5]/40 hover:border-[#C69C6D]/30'
                }`}
              >{TAG_LABELS[tag]}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 mt-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-[#161618] animate-pulse rounded-sm" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-[#E5E5E5]/30 font-body py-20">Nessun piatto trovato.</p>
        ) : (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="mb-14">
              <div className="flex items-center gap-5 mb-6">
                <h2 className="font-display text-3xl text-white tracking-widest whitespace-nowrap">{cat}</h2>
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
      </div>
    </div>
  );
}