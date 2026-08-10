import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0B] border-t border-[#C69C6D]/20 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div>
          <div className="mb-4">
            <img src="https://media.base44.com/images/public/6a047f37242becec83398e6f/cfc846ccb_Ossidiana_02_Negativo1.svg" alt="Ossidiana Restaurant" className="h-10 w-auto" />
          </div>
          <p className="text-[#E5E5E5]/60 text-sm font-body leading-relaxed">
            Un'esperienza gastronomica autentica, dove la tradizione incontra l'innovazione in un'atmosfera intima e raffinata.
          </p>
          <div className="flex gap-4 mt-5">
            <a href="https://www.instagram.com/ossidiana.ristorante/" target="_blank" rel="noopener noreferrer" className="text-[#C69C6D] hover:text-white transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="https://www.facebook.com/profile.php?id=61564406886866" target="_blank" rel="noopener noreferrer" className="text-[#C69C6D] hover:text-white transition-colors" aria-label="Facebook"><Facebook size={20} /></a>
            <a href="https://wa.me/393519612605" target="_blank" rel="noopener noreferrer" className="text-[#C69C6D] hover:text-white transition-colors" aria-label="WhatsApp"><MessageCircle size={20} /></a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg text-[#C69C6D] tracking-widest mb-5">Orari</h3>
          <div className="space-y-2 text-sm font-body text-[#E5E5E5]/70">
            <div className="flex items-center gap-2"><Clock size={14} className="text-[#C69C6D]" /><span>Lun, Gio – Dom: 12:30 – 15:00 / 19:00 – 23:00</span></div>
            <div className="flex items-center gap-2"><Clock size={14} className="text-[#C69C6D]" /><span>Mar – Mer: chiuso</span></div>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg text-[#C69C6D] tracking-widest mb-5">Contatti</h3>
          <div className="space-y-3 text-sm font-body text-[#E5E5E5]/70">
            <div className="flex items-start gap-2"><MapPin size={14} className="text-[#C69C6D] mt-1 shrink-0" /><span>Viale Aldo Moro 132, 00010 Gallicano nel Lazio RM</span></div>
            <a href="tel:+390669340014" className="flex items-center gap-2 hover:text-[#C69C6D] transition-colors"><Phone size={14} className="text-[#C69C6D]" /><span>+39 0669340014</span></a>
            <a href="https://wa.me/393519612605" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#C69C6D] transition-colors"><MessageCircle size={14} className="text-[#C69C6D]" /><span>WhatsApp: +39 351 961 2605</span></a>
          </div>
          <div className="flex flex-col gap-2 mt-5">
            <Link to="/prenotazioni" className="text-sm text-[#C69C6D] hover:text-white transition-colors tracking-widest uppercase">Prenota un tavolo →</Link>
            <Link to="/ordini" className="text-sm text-[#C69C6D] hover:text-white transition-colors tracking-widest uppercase">Ordina da asporto →</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 pt-6 border-t border-[#C69C6D]/10 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-[#E5E5E5]/40 text-xs font-body">© 2026 Ossidiana Restaurant. Tutti i diritti riservati.</p>
        <Link to="/login" className="text-[#E5E5E5]/30 text-xs font-body hover:text-[#C69C6D] transition-colors">Area Admin</Link>
      </div>
    </footer>);

}