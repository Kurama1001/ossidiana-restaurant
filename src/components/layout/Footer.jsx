import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0B] border-t border-[#C69C6D]/20 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-5 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div>
          <div className="mb-4">
            <div className="font-display text-2xl text-white tracking-widest">OSSIDIANA</div>
            <div className="text-[#C69C6D] text-xs tracking-[0.3em] uppercase font-body font-light">Restaurant</div>
          </div>
          <p className="text-[#E5E5E5]/60 text-sm font-body leading-relaxed">
            Un'esperienza gastronomica autentica, dove la tradizione incontra l'innovazione in un'atmosfera intima e raffinata.
          </p>
          <div className="flex gap-4 mt-5">
            <a href="#" className="text-[#C69C6D] hover:text-white transition-colors" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="#" className="text-[#C69C6D] hover:text-white transition-colors" aria-label="Facebook"><Facebook size={20} /></a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg text-[#C69C6D] tracking-widest mb-5">Orari</h3>
          <div className="space-y-2 text-sm font-body text-[#E5E5E5]/70">
            <div className="flex items-center gap-2"><Clock size={14} className="text-[#C69C6D]" /><span>Martedì – Venerdì: 12:30 – 15:00 / 19:00 – 23:00</span></div>
            <div className="flex items-center gap-2"><Clock size={14} className="text-[#C69C6D]" /><span>Sabato – Domenica: 12:00 – 15:30 / 18:30 – 23:30</span></div>
            <div className="flex items-center gap-2"><Clock size={14} className="text-[#C69C6D]" /><span>Lunedì: chiuso</span></div>
          </div>
        </div>

        <div>
          <h3 className="font-display text-lg text-[#C69C6D] tracking-widest mb-5">Contatti</h3>
          <div className="space-y-3 text-sm font-body text-[#E5E5E5]/70">
            <div className="flex items-start gap-2"><MapPin size={14} className="text-[#C69C6D] mt-1 shrink-0" /><span>Via dell'Ossidiana 12, 00100 Roma RM</span></div>
            <div className="flex items-center gap-2"><Phone size={14} className="text-[#C69C6D]" /><span>+39 06 1234 5678</span></div>
          </div>
          <div className="flex flex-col gap-2 mt-5">
            <Link to="/prenotazioni" className="text-sm text-[#C69C6D] hover:text-white transition-colors tracking-widest uppercase">Prenota un tavolo →</Link>
            <Link to="/ordini" className="text-sm text-[#C69C6D] hover:text-white transition-colors tracking-widest uppercase">Ordina da asporto →</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 pt-6 border-t border-[#C69C6D]/10 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-[#E5E5E5]/40 text-xs font-body">© 2026 Ossidiana Restaurant. Tutti i diritti riservati.</p>
        <Link to="/admin" className="text-[#E5E5E5]/30 text-xs font-body hover:text-[#C69C6D] transition-colors">Area Admin</Link>
      </div>
    </footer>
  );
}