import { X, Download } from 'lucide-react';

export default function QRCodeModal({ onClose }) {
  const base = window.location.origin + '/menu';
  const qrPranzo = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(base + '?turno=pranzo')}`;
  const qrCena = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(base + '?turno=cena')}`;

  const downloadQR = (url, name) => {
    fetch(url).then(r => r.blob()).then(blob => {
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(objUrl);
    }).catch(() => {
      window.open(url, '_blank');
    });
  };

  const QRCard = ({ title, subtitle, qrUrl, fileName }) => (
    <div className="text-center">
      <p className="font-body text-sm text-[#C69C6D] uppercase tracking-widest mb-1">{title}</p>
      <p className="font-body text-xs text-[#E5E5E5]/30 mb-4">{subtitle}</p>
      <div className="bg-white p-4 rounded-sm inline-block">
        <img src={qrUrl} alt={`QR ${title}`} width="200" height="200" className="block" />
      </div>
      <p className="font-body text-[10px] text-[#E5E5E5]/20 mt-2 break-all px-4">{base}?turno={title.toLowerCase().includes('pranzo') ? 'pranzo' : 'cena'}</p>
      <button onClick={() => downloadQR(qrUrl, fileName)}
        className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 border border-[#C69C6D]/40 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-xs transition-all">
        <Download size={14} /> Download PNG
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-2xl text-white tracking-widest">QR Code Menu</h3>
          <button onClick={onClose} className="text-[#E5E5E5]/40 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QRCard title="Menu Pranzo" subtitle="Menu del pranzo" qrUrl={qrPranzo} fileName="QR_Menu_Pranzo.png" />
          <QRCard title="Menu Cena" subtitle="Menu della cena" qrUrl={qrCena} fileName="QR_Menu_Cena.png" />
        </div>
        <p className="font-body text-xs text-[#E5E5E5]/30 mt-6 text-center">
          Stampa i QR e esponili ai tavoli · i clienti scansionano per vedere il menu sul telefono
        </p>
      </div>
    </div>
  );
}