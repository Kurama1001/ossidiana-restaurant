import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const WINE_ORDER = ['bollicine', 'bianchi', 'rossi', 'dolci'];
const WINE_LABELS = {
  bollicine: 'Bollicine',
  bianchi: 'Vini Bianchi',
  rossi: 'Vini Rossi',
  dolci: 'Vini Dolci',
};

export default function WineSection() {
  const [wines, setWines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.MenuItem.filter({ category: 'vino', active: true }, 'sortOrder', 500)
      .then(setWines)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mb-14">
        <div className="flex items-center gap-5 mb-2">
          <h2 className="font-display text-3xl md:text-4xl text-white tracking-widest whitespace-nowrap">Carta dei Vini</h2>
          <div className="flex-1 h-px bg-[#C69C6D]/15" />
        </div>
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[#161618] animate-pulse rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (wines.length === 0) return null;

  const grouped = WINE_ORDER.reduce((acc, wt) => {
    const items = wines
      .filter(w => w.wine_type === wt)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (items.length > 0) acc[wt] = items;
    return acc;
  }, {});

  return (
    <div className="mb-14">
      <div className="flex items-center gap-5 mb-2">
        <h2 className="font-display text-3xl md:text-4xl text-white tracking-widest whitespace-nowrap">Carta dei Vini</h2>
        <div className="flex-1 h-px bg-[#C69C6D]/15" />
      </div>

      {/* Intestazione prezzi */}
      <div className="flex justify-end gap-8 mb-1 px-1">
        <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-16 text-right">Calice</span>
        <span className="font-body text-xs text-[#C69C6D]/60 uppercase tracking-widest w-20 text-right">Bottiglia</span>
      </div>

      {Object.entries(grouped).map(([wt, items]) => {
        // Raggruppa per regione mantenendo l'ordine di apparizione
        const regioni = [];
        const regioniMap = {};
        for (const w of items) {
          const r = w.regione || 'Altro';
          if (!regioniMap[r]) {
            regioniMap[r] = [];
            regioni.push(r);
          }
          regioniMap[r].push(w);
        }

        return (
          <div key={wt} className="mb-8">
            <div className="flex items-center gap-3 mb-3 mt-4">
              <h3 className="font-display text-xl text-[#C69C6D] tracking-widest">{WINE_LABELS[wt]}</h3>
              <div className="flex-1 h-px bg-[#C69C6D]/10" />
            </div>

            {regioni.map(regione => (
              <div key={regione} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-body text-xs text-[#E5E5E5]/40 uppercase tracking-widest">{regione}</span>
                  <div className="flex-1 h-px bg-[#E5E5E5]/5" />
                </div>
                <div>
                  {regioniMap[regione].map(wine => (
                    <div key={wine.id} className="flex items-center gap-3 py-3 border-b border-[#E5E5E5]/5 last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="font-body text-white text-sm md:text-base leading-snug block">{wine.name}</span>
                        {wine.description && (
                          <span className="font-body text-[#E5E5E5]/35 text-xs block">{wine.description}</span>
                        )}
                      </div>
                      <span className="font-body text-[#E5E5E5]/60 text-sm w-16 text-right shrink-0">
                        {wine.prezzo_calice != null ? `€${Number(wine.prezzo_calice).toFixed(0)}` : '—'}
                      </span>
                      <span className="font-body text-[#C69C6D] font-semibold text-sm w-20 text-right shrink-0">
                        {wine.prezzo_bottiglia != null ? `€${Number(wine.prezzo_bottiglia).toFixed(0)}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}