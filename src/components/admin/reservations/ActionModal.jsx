import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, Copy, Mail, MessageCircle, Loader2 } from 'lucide-react';
import { BronzeButton } from '@/components/ui/BronzeButton';
import { formatDateIt } from './utils';

const TITLES = {
  conferma: 'Prenotazione Confermata',
  rifiuto: 'Rifiuta Prenotazione',
  aggiornamento: 'Prenotazione Aggiornata',
  cancellazione: 'Prenotazione Cancellata',
};

const SUBJECTS = {
  conferma: 'Prenotazione confermata - Ossidiana',
  rifiuto: 'Prenotazione non confermabile - Ossidiana',
  aggiornamento: 'Prenotazione aggiornata - Ossidiana',
  cancellazione: 'Prenotazione cancellata - Ossidiana',
};

export default function ActionModal({ actionModal, onClose, onRejectSubmit }) {
  const { type, reservation, text } = actionModal;
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(null);

  const isInputStep = type === 'rifiuto' && !text;

  const handleReject = async () => {
    if (!motivo.trim()) return;
    setSubmitting(true);
    await onRejectSubmit(motivo.trim());
    setSubmitting(false);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setEmailError(null);
    try {
      const res = await base44.functions.invoke('sendReservationEmail', {
        to: reservation.email,
        subject: SUBJECTS[type],
        body: text,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setEmailSent(true);
    } catch (e) {
      setEmailError(e.message || 'Errore invio email');
    }
    setSendingEmail(false);
  };

  const mailtoLink = reservation.email
    ? `mailto:${reservation.email}?subject=${encodeURIComponent(SUBJECTS[type])}&body=${encodeURIComponent(text)}`
    : null;

  const whatsappLink = reservation.phone
    ? `https://wa.me/${reservation.phone.replace(/\D/g, '').replace(/^0/, '39')}?text=${encodeURIComponent(text)}`
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/95 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161618] border border-[#C69C6D]/20 rounded-sm w-full max-w-lg max-h-[92vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-display text-2xl text-white">{TITLES[type]}</h3>
          <button onClick={onClose} className="text-[#E5E5E5]/40 hover:text-white"><X size={20} /></button>
        </div>

        {isInputStep ? (
          <div>
            <div className="mb-4 p-3 bg-[#0A0A0B] border border-[#E5E5E5]/10 rounded-sm">
              <p className="font-body text-sm text-white">{reservation.customer_name}</p>
              <p className="font-body text-xs text-[#E5E5E5]/50">
                {formatDateIt(reservation.res_date)} alle ore {reservation.res_time} · {reservation.guests} persone
              </p>
            </div>
            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">
              Motivo del rifiuto *
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-[#0A0A0B] border border-red-400/20 text-[#E5E5E5] px-4 py-2.5 rounded-sm focus:border-red-400 outline-none font-body text-sm resize-none"
              placeholder="es. Sala piena, orario non disponibile..."
            />
            <div className="flex gap-3 mt-6">
              <BronzeButton onClick={onClose} variant="outline" className="flex-1 justify-center">Annulla</BronzeButton>
              <BronzeButton onClick={handleReject} variant="solid" className="flex-1 justify-center"
                disabled={submitting || !motivo.trim()}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Conferma rifiuto
              </BronzeButton>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-[#0A0A0B] border border-[#E5E5E5]/10 rounded-sm">
              <p className="font-body text-sm text-white">{reservation.customer_name}</p>
              <p className="font-body text-xs text-[#E5E5E5]/50">
                {formatDateIt(reservation.res_date)} alle ore {reservation.res_time} · {reservation.guests} persone
              </p>
              {reservation.email && <p className="font-body text-xs text-[#C69C6D]/60 mt-1">{reservation.email}</p>}
            </div>

            <label className="block text-xs text-[#E5E5E5]/50 font-body uppercase tracking-widest mb-1">
              Messaggio per il cliente
            </label>
            <div className="p-3 bg-[#0A0A0B] border border-[#C69C6D]/15 rounded-sm mb-4">
              <p className="font-body text-sm text-[#E5E5E5]/80 whitespace-pre-wrap">{text}</p>
            </div>

            <div className="flex flex-col gap-2">
              {reservation.email && (
                <button onClick={handleSendEmail} disabled={sendingEmail || emailSent}
                  className="flex items-center justify-center gap-2 py-3 bg-[#C69C6D] hover:bg-[#D4AA7D] text-[#0A0A0B] rounded-sm font-body text-sm font-semibold transition-all disabled:opacity-50">
                  {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : emailSent ? <Check size={14} /> : <Mail size={14} />}
                  {emailSent ? 'Email inviata ✓' : sendingEmail ? 'Invio in corso...' : `Invia email a ${reservation.email}`}
                </button>
              )}
              {emailError && (
                <p className="font-body text-xs text-red-400 text-center px-2">{emailError}</p>
              )}
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 border border-green-400/30 text-green-400 hover:bg-green-400/10 rounded-sm font-body text-sm transition-all">
                  <MessageCircle size={14} /> Invia su WhatsApp
                </a>
              )}
              <button onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-3 border border-[#E5E5E5]/20 text-[#E5E5E5]/60 hover:bg-[#E5E5E5]/10 rounded-sm font-body text-sm transition-all">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiato!' : 'Copia testo'}
              </button>
              <button onClick={onClose}
                className="py-3 text-[#E5E5E5]/40 hover:text-[#E5E5E5] font-body text-sm transition-colors">
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}