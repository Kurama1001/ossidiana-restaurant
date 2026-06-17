import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import MenuItemCard from '@/components/menu/MenuItemCard';

const MENU_TYPES = [
  { id: 'cena_estivo', label: 'Cena Estiva' },
  { id: 'cena_autunno_inverno', label: 'Cena Autunno/Inverno' },
  { id: 'pranzo_ufficio', label: 'Pranzi Ufficio' },
];

const CATEGORY_ORDER = ['antipasti', 'primi', 'romanissimi', 'secondi', 'contorni', 'dolci'];
const CATEGORY_LABELS = {
  antipasti: 'Antipasti',
  primi: 'Primi Piatti',
  romanissimi: 'I Romanissimi',
  secondi: 'Secondi',
  contorni: 'Contorni',
  dolci: 'Dolci',
};

function isSeasonallyActive(item) {
  if (!item.seasonalFrom && !item.seasonalTo) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (item.seasonalFrom) {
    const from = new Date(item.seasonalFrom);
    if (today < from) return false;
  }
  if (item.seasonalTo) {
    const to = new Date(item.seasonalTo);
    if (today > to) return false;
  }
  return true;
}

export default function Menu() {
  const [allItems, setAllItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenuType, setActiveMenuType] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MenuItem.list('sortOrder', 500),
      base44.entities.MenuSettings.list('-updated_date', 1),
    ]).then(([items, settingsList]) => {
      setAllItems(items);
      const s = settingsList?.[0] || { currentDinnerSeason: 'cena_estivo', showOfficeLunch: true };
      setSettings(s);
      setActiveMenuType(s.currentDinnerSeason);
    }).finally(() => setLoading(false));
  }, []);

  const availableTypes = settings
    ? MENU_TYPES.filter(t => {
        if (t.id === 'pranzo_ufficio') return settings.showOfficeLunch !== false;
        return true;
      })
    : MENU_TYPES.filter(t => t.id !== 'pranzo_ufficio');

  const filteredItems = allItems.filter(item =>
    item.active !== false &&
    item.menuType === activeMenuType &&
    isSeasonallyActive(item)
  );

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = filteredItems
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

      {/* Sticky menu type selector */}
      <div className="sticky top-[60px] z-40 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#C69C6D]/10 py-4">
        <div className="max-w-5xl mx-auto px-5 flex flex-wrap gap-2 justify-center">
          {availableTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveMenuType(type.id)}
              className={`px-6 py-2.5 text-xs font-body tracking-widest uppercase rounded-sm border transition-all min-h-[42px] ${
                activeMenuType === type.id
                  ? 'bg-[#C69C6D] border-[#C69C6D] text-[#0A0A0B] font-bold'
                  : 'border-[#E5E5E5]/20 text-[#E5E5E5]/50 hover:border-[#C69C6D]/40 hover:text-[#C69C6D]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

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
      </div>
    </div>
  );
}