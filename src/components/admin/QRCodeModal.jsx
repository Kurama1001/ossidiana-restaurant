import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import QrTableCard from '@/components/admin/QrTableCard';
import { downloadQrTableCard } from '@/utils/qrCardExport';

const base = 'https://ossidianarestaurant.com/menu';
const qrUrl = (turno) => `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(`${base}?turno=${turno}`)}`;

const CARDS = [
  { turno: 'pranzo', title: 'Menu Pranzo' },
  { turno: 'cena', title: 'Menu Cena' },
];

export default function QRCodeModal({ onClose }) {
  const [exporting, setExporting] = useState(null);

  const handleDownload = async (turno) => {
    setExporting(turno);
    try {
      await downloadQrTableCard(turno, qrUrl(turno));
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
          {CARDS.map(({ turno, title }) => (
            <div key={turno} className="text-center">
              <p className="font-body text-sm text-[#C69C6D] uppercase tracking-widest mb-1">{title}</p>
              <p className="font-body text-xs text-[#E5E5E5]/30 mb-4">Tessera espositiva 9×6 cm · 300 DPI</p>
              <div className="mx-auto rounded-sm overflow-hidden border border-[#C69C6D]/20" style={{ width: 300, height: 200 }}>
                <div style={{ transform: 'scale(0.2822)', transformOrigin: '0 0' }}>
                  <QrTableCard turno={turno} qrSrc={qrUrl(turno)} />
                </div>
              </div>
              <p className="font-body text-[10px] text-[#E5E5E5]/20 mt-3 break-all px-4">{`${base}?turno=${turno}`}</p>
              <button
                onClick={() => handleDownload(turno)}
                disabled={exporting === turno}
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