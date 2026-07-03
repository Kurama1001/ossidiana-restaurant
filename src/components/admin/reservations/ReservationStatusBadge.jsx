import { STATUS_LABELS } from './utils';

const STATUS_CLS = {
  nuova: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  in_attesa_conferma: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  pending: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  confermata: 'bg-green-400/10 text-green-400 border-green-400/20',
  confirmed: 'bg-green-400/10 text-green-400 border-green-400/20',
  modificata: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  rifiutata: 'bg-red-400/10 text-red-400 border-red-400/20',
  cancellata: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  cancelled: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  completata: 'bg-[#E5E5E5]/10 text-[#E5E5E5]/50 border-[#E5E5E5]/10',
  no_show: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
};

export default function ReservationStatusBadge({ status }) {
  const label = STATUS_LABELS[status] || 'Nuova';
  const cls = STATUS_CLS[status] || STATUS_CLS.nuova;
  return <span className={`text-xs font-body border px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}