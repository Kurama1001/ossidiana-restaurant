import { useState } from 'react';
import { Check, X, Trash2, Pencil, Phone, MessageCircle, CheckCircle2, UserX, AlertTriangle, Users, Mail, Globe, PhoneCall } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';
import { formatDateIt, FONTE_LABELS, hasAlertNotes, getAlertKeywords, isPendingStatus, isConfirmedStatus, isTerminatedStatus, buildConfirmMessage } from './utils';

const FONTE_ICONS = { sito: Globe, telefono: PhoneCall, admin: Pencil, altro: PhoneCall };

export default function ReservationCard({ r, onConfirm, onReject, onEdit, onCancel, onComplete, onNoShow }) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const isPast = r.res_date < today;
  const isPending = isPendingStatus(r.status);
  const isConfirmed = isConfirmedStatus(r.status);
  const isTerminated = isTerminatedStatus(r.status);
  const hasAlert = hasAlertNotes(r.notes);
  const alertKeywords = getAlertKeywords(r.notes);
  const FonteIcon = FONTE_ICONS[r.fonte_prenotazione] || PhoneCall;

  const handleCopyWhatsApp = () => {
    const msg = buildConfirmMessage(r);
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`bg-[#161618] border rounded-sm p-4 transition-all ${
      isPending ? 'border-yellow-400/20' :
      r.status === 'rifiutata' ? 'border-red-400/15' :
      isTerminated ? 'border-[#E5E5E5]/5 opacity-60' :
      'border-[#C69C6D]/10'
    }`}>
      {hasAlert && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-orange-400/10 border border-orange-400/20 rounded-sm">
          <AlertTriangle size={14} className="text-orange-400 shrink-0" />
          <span className="font-body text-xs text-orange-400">
            {alertKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-display text-xl text-white">{r.res_time}</span>
            <span className="text-[#E5E5E5]/30">·</span>
            <span className="font-body text-sm text-[#E5E5E5]/60">{formatDateIt(r.res_date)}</span>
            <ReservationStatusBadge status={r.status} />
            {r.fonte_prenotazione && (
              <span className="flex items-center gap-1 text-xs font-body text-[#E5E5E5]/40 border border-[#E5E5E5]/10 px-2 py-0.5 rounded-full">
                <FonteIcon size={10} /> {FONTE_LABELS[r.fonte_prenotazione] || r.fonte_prenotazione}
              </span>
            )}
          </div>

          <h3 className="font-body text-lg text-white mb-1">{r.customer_name}</h3>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-body text-[#E5E5E5]/50">
            <span className="flex items-center gap-1">
              <Users size={12} className="text-[#C69C6D]" /> {r.guests} {r.guests === 1 ? 'persona' : 'persone'}
            </span>
            <a href={`tel:${r.phone}`} className="flex items-center gap-1 hover:text-[#C69C6D] transition-colors">
              <Phone size={12} /> {r.phone}
            </a>
            {r.email && (
              <span className="flex items-center gap-1">
                <Mail size={12} /> {r.email}
              </span>
            )}
          </div>

          {r.notes && (
            <p className="font-body text-xs text-[#E5E5E5]/40 mt-2 italic">"{r.notes}"</p>
          )}
          {r.motivo_rifiuto && (
            <p className="font-body text-xs text-red-400/60 mt-2">Motivo rifiuto: {r.motivo_rifiuto}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 lg:flex-col lg:items-end shrink-0">
          {isPending && (
            <>
              <button onClick={() => onConfirm(r)} title="Conferma"
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-sm font-body text-xs font-semibold transition-all min-h-[36px]">
                <Check size={13} /> Conferma
              </button>
              <button onClick={() => onReject(r)} title="Rifiuta"
                className="flex items-center gap-1.5 px-3 py-2 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded-sm font-body text-xs transition-all min-h-[36px]">
                <X size={13} /> Rifiuta
              </button>
            </>
          )}

          {isConfirmed && isPast && (
            <>
              <button onClick={() => onComplete(r)} title="Segna completata"
                className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E5E5]/20 text-[#E5E5E5]/60 hover:bg-[#E5E5E5]/10 rounded-sm font-body text-xs transition-all min-h-[36px]">
                <CheckCircle2 size={13} /> Completata
              </button>
              <button onClick={() => onNoShow(r)} title="Segna no show"
                className="flex items-center gap-1.5 px-3 py-2 border border-orange-400/30 text-orange-400 hover:bg-orange-400/10 rounded-sm font-body text-xs transition-all min-h-[36px]">
                <UserX size={13} /> No Show
              </button>
            </>
          )}

          {!isTerminated && (
            <button onClick={() => onEdit(r)} title="Modifica"
              className="flex items-center gap-1.5 px-3 py-2 border border-[#C69C6D]/30 text-[#C69C6D] hover:bg-[#C69C6D]/10 rounded-sm font-body text-xs transition-all min-h-[36px]">
              <Pencil size={13} /> Modifica
            </button>
          )}
          {!isTerminated && (
            <button onClick={() => onCancel(r)} title="Cancella"
              className="flex items-center gap-1.5 px-3 py-2 border border-red-400/20 text-red-400/60 hover:bg-red-400/10 hover:text-red-400 rounded-sm font-body text-xs transition-all min-h-[36px]">
              <Trash2 size={13} /> Cancella
            </button>
          )}
          {!isTerminated && (
            <button onClick={handleCopyWhatsApp} title="Copia messaggio WhatsApp"
              className="flex items-center gap-1.5 px-3 py-2 border border-green-400/20 text-green-400/60 hover:bg-green-400/10 hover:text-green-400 rounded-sm font-body text-xs transition-all min-h-[36px]">
              <MessageCircle size={13} /> {copied ? 'Copiato!' : 'WhatsApp'}
            </button>
          )}
          <a href={`tel:${r.phone}`} title="Chiama"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#C69C6D]/20 text-[#C69C6D]/60 hover:bg-[#C69C6D]/10 rounded-sm font-body text-xs transition-all min-h-[36px]">
            <Phone size={13} /> Chiama
          </a>
        </div>
      </div>
    </div>
  );
}