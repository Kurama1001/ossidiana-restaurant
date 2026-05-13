import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/prenotazioni', label: 'Prenota' },
  { href: '/ordini', label: 'Asporto' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#0A0A0B]/95 backdrop-blur-md border-b border-[#C69C6D]/20 py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl text-white tracking-widest">OSSIDIANA</span>
          <span className="text-[#C69C6D] text-xs tracking-[0.3em] uppercase font-body font-light">Restaurant</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`font-body text-sm tracking-widest uppercase transition-colors hover:text-[#C69C6D] ${
                location.pathname === l.href ? 'text-[#C69C6D]' : 'text-[#E5E5E5]'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/prenotazioni"
            className="ml-4 px-5 py-2 border border-[#C69C6D] text-[#C69C6D] text-sm tracking-widest uppercase font-body hover:bg-[#C69C6D] hover:text-[#0A0A0B] transition-all duration-300 rounded-sm"
          >
            Prenota
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="md:hidden text-white p-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#0A0A0B]/98 backdrop-blur-md border-t border-[#C69C6D]/20 px-5 py-6 flex flex-col gap-5">
          {navLinks.map(l => (
            <Link
              key={l.href}
              to={l.href}
              className={`font-body text-base tracking-widest uppercase transition-colors ${
                location.pathname === l.href ? 'text-[#C69C6D]' : 'text-[#E5E5E5]'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/prenotazioni"
            className="mt-2 px-5 py-3 border border-[#C69C6D] text-[#C69C6D] text-sm tracking-widest uppercase font-body text-center hover:bg-[#C69C6D] hover:text-[#0A0A0B] transition-all duration-300 rounded-sm"
          >
            Prenota un Tavolo
          </Link>
        </div>
      )}
    </nav>
  );
}