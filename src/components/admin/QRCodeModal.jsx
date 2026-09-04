import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { buildQrCard, svgToPngDataUrl } from '@/utils/qrCardSvg';

const base = 'https://ossidianarestaurant.com/menu';
const qrUrlOf = (turno) => `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(`${base}?turno=${turno}`)}`;

const CARDS = [
  { turno: 'pranzo', label: 'Pranzo' },
  { turno: 'cena', label: 'Cena' },
];

export default function QRCodeModal({ onClose }) {
  const [svgs, setSvgs] = useState(null);
  const [previews, setPreviews] = useState(null);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let urls = [];
    (async () => {
      const [p, c] = await Promise.all([
        buildQrCard('pranzo', qrUrlOf('pranzo')),
        buildQrCard('cena', qrUrlOf('cena')),
      ]);
      if (cancelled) return;
      const up = URL.createObjectURL(new Blob([p], { type: 'image/svg+xml;charset=utf-8' }));
      const uc = URL.createObjectURL(new Blob([c], { type: 'image/svg+xml;charset=utf-8' }));
      urls = [up, uc];
      setPreviews({ pranzo: up, cena: uc });
      setSvgs({ pranzo: p, cena: c });
    })();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const handleDownload = async (turno) => {
    if (!svgs?.[turno]) return;
    setExporting(turno);
    try {
      const png = await svgToPngDataUrl(svgs[turno]);
      const link = document.createElement('a');
      link.download = `Porta_QR_Menu_${turno === 'pranzo' ? 'Pranzo' : 'Cena'}_Ossidiana_9x6cm.png`;
      link.href = png;
      link.click();
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-2xl text-white tracking-widest">QR Code Menu</h3>
          <button onClick={onClose} className="text-[#E5E5E5]/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {CARDS.map(({ turno, label }) => (
            <div key={turno} className="text-center">
              <p className="font-body text-sm text-[#C69C6D] uppercase tracking-widest mb-1">Menu {label}</p>
              <p className="font-body text-xs text-[#E5E5E5]/30 mb-4">Tessera espositiva 9×6 cm · 300 DPI</p>
              <div className="mx-auto rounded-sm overflow-hidden border border-[#C69C6D]/20" style={{ width: 300, height: 200 }}>
                {previews ? (
                  <img src={previews[turno]} alt={`Tessera QR Menu ${label}`} width={300} height={200} className="block" />
                ) : (
                  <div style={{ width: 300, height: 200 }} className="flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-[#C69C6D]/60" />
                  </div>
                )}
              </div>
              <p className="font-body text-[10px] text-[#E5E5E5]/20 mt-3 break-all px-4">{`${base}?turno=${turno}`}</p>
              <button
                onClick={() => handleDownload(turno)}
                disabled={exporting === turno || !svgs}
                className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-xs transition-all disabled:opacity-50"
              >
                {exporting === turno ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {exporting === turno ? 'Generazione...' : 'Download PNG 9×6 cm'}
              </button>
            </div>
          ))}
        </div>
        <p className="font-body text-xs text-[#E5E5E5]/30 mt-6 text-center">
          Stampa le tessere e esponile ai tavoli · i clienti scansionano per vedere il menu sul telefono
        </p>
      </div>
    </div>
  );
}