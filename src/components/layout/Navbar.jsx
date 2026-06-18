import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, ChefHat, UtensilsCrossed } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PUBLIC_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/ordini', label: 'Asporto' },
];

const STAFF_LINKS = {
  cameriere: [
    { href: '/sala', label: 'Sala', icon: UtensilsCrossed },
  ],
  cucina: [
    { href: '/cucina', label: 'Cucina', icon: ChefHat },
  ],
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    base44.auth.isAuthenticated().then(ok => {
      setAuthed(ok);
      if (ok) base44.auth.me().then(u => setUserRole(u?.role)).catch(() => {});
      else setUserRole(null);
    });
  }, [location]);

  useEffect(() => setOpen(false), [location]);

  // Staff roles: mostra solo i link specifici, non il menu pubblico
  const isStaff = ['cucina', 'cameriere'].includes(userRole);
  const navLinks = isStaff ? (STAFF_LINKS[userRole] || []) : PUBLIC_LINKS;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 outline-none border-b ${
        scrolled ? 'bg-[#0A0A0B]/95 backdrop-blur-md border-[#C69C6D]/20 py-3' : 'bg-transparent border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="https://media.base44.com/images/public/6a047f37242becec83398e6f/cfc846ccb_Ossidiana_02_Negativo1.svg" alt="Ossidiana Restaurant" className="h-10 md:h-[50px] w-auto" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                to={l.href}
                className={`font-body text-sm tracking-widest uppercase transition-colors hover:text-[#C69C6D] flex items-center gap-1.5 ${
                  location.pathname.startsWith(l.href) && l.href !== '/' ? 'text-[#C69C6D]' : location.pathname === l.href ? 'text-[#C69C6D]' : 'text-[#E5E5E5]'
                }`}
              >
                {Icon && <Icon size={15} />}{l.label}
              </Link>
            );
          })}
          {!isStaff && (
            <Link
              to="/prenotazioni"
              className="ml-4 px-5 py-2 border border-[#C69C6D] text-[#C69C6D] text-sm tracking-widest uppercase font-body hover:bg-[#C69C6D] hover:text-[#0A0A0B] transition-all duration-300 rounded-sm"
            >
              Prenota
            </Link>
          )}
          {authed ? (
            isStaff ? (
              <button onClick={() => base44.auth.logout('/')} className="font-body text-sm tracking-widest uppercase text-[#E5E5E5]/40 hover:text-red-400 transition-colors">
                Esci
              </button>
            ) : (
              <Link
                to="/profilo"
                className={`transition-colors hover:text-[#C69C6D] ${location.pathname === '/profilo' ? 'text-[#C69C6D]' : 'text-[#E5E5E5]'}`}
              >
                <User size={20} />
              </Link>
            )
          ) : (
            <Link
              to="/login"
              className="font-body text-sm tracking-widest uppercase text-[#E5E5E5]/60 hover:text-[#C69C6D] transition-colors"
            >
              Accedi
            </Link>
          )}
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
          {navLinks.map(l => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                to={l.href}
                className={`font-body text-base tracking-widest uppercase transition-colors flex items-center gap-2 ${
                  location.pathname === l.href ? 'text-[#C69C6D]' : 'text-[#E5E5E5]'
                }`}
              >
                {Icon && <Icon size={16} />}{l.label}
              </Link>
            );
          })}
          {!isStaff && (
            <Link
              to="/prenotazioni"
              className="mt-2 px-5 py-3 border border-[#C69C6D] text-[#C69C6D] text-sm tracking-widest uppercase font-body text-center hover:bg-[#C69C6D] hover:text-[#0A0A0B] transition-all duration-300 rounded-sm"
            >
              Prenota un Tavolo
            </Link>
          )}
          {authed ? (
            isStaff ? (
              <button onClick={() => base44.auth.logout('/')} className="font-body text-base tracking-widest uppercase text-red-400/70 transition-colors text-left">
                Esci
              </button>
            ) : (
              <Link
                to="/profilo"
                className={`font-body text-base tracking-widest uppercase transition-colors flex items-center gap-2 ${location.pathname === '/profilo' ? 'text-[#C69C6D]' : 'text-[#E5E5E5]'}`}
              >
                <User size={16} /> Profilo
              </Link>
            )
          ) : (
            <Link
              to="/login"
              className="font-body text-base tracking-widest uppercase text-[#E5E5E5]/60 hover:text-[#C69C6D] transition-colors"
            >
              Accedi
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}