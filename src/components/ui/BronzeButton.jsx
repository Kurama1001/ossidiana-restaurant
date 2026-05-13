import { Link } from 'react-router-dom';

export function BronzeButton({ to, onClick, children, variant = 'solid', className = '', type = 'button', disabled = false }) {
  const base = 'inline-flex items-center justify-center gap-2 px-7 py-3 text-sm tracking-widest uppercase font-body transition-all duration-300 rounded-sm min-h-[48px] cursor-pointer disabled:opacity-50';
  const solid = 'bg-[#C69C6D] text-[#0A0A0B] hover:bg-[#D4AA7D] font-semibold';
  const outline = 'border border-[#C69C6D] text-[#C69C6D] hover:bg-[#C69C6D] hover:text-[#0A0A0B]';
  const ghost = 'text-[#C69C6D] hover:text-white underline-offset-4 hover:underline';

  const cls = `${base} ${variant === 'solid' ? solid : variant === 'outline' ? outline : ghost} ${className}`;

  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} className={cls} disabled={disabled}>{children}</button>;
}