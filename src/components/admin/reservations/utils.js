import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export function formatDateIt(dateStr) {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: it });
  } catch {
    return dateStr;
  }
}

export function buildConfirmMessage(r) {
  return `Ciao ${r.customer_name}, la tua prenotazione da Ossidiana è confermata per il giorno ${formatDateIt(r.res_date)} alle ore ${r.res_time} per ${r.guests} persone. Ti aspettiamo!`;
}

export function buildRejectMessage(r, motivo) {
  return `Ciao ${r.customer_name}, ci dispiace ma non riusciamo a confermare la prenotazione richiesta per il giorno ${formatDateIt(r.res_date)} alle ore ${r.res_time}. Motivo: ${motivo}. Puoi contattarci per concordare un altro orario.`;
}

export function buildUpdateMessage(r) {
  return `Ciao ${r.customer_name}, la tua prenotazione da Ossidiana è stata aggiornata: ${formatDateIt(r.res_date)} alle ore ${r.res_time} per ${r.guests} persone. Ti aspettiamo!`;
}

export function buildCancelMessage(r) {
  return `Ciao ${r.customer_name}, ti informiamo che la prenotazione per il giorno ${formatDateIt(r.res_date)} alle ore ${r.res_time} è stata cancellata. Per maggiori informazioni contattaci.`;
}

export const ALERT_KEYWORDS = ['allergia', 'allergico', 'bambini', 'compleanno', 'intolleranza', 'senza glutine'];

export function hasAlertNotes(notes) {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  return ALERT_KEYWORDS.some(k => lower.includes(k));
}

export function getAlertKeywords(notes) {
  if (!notes) return [];
  const lower = notes.toLowerCase();
  return ALERT_KEYWORDS.filter(k => lower.includes(k));
}

export const STATUS_LABELS = {
  nuova: 'Nuova',
  in_attesa_conferma: 'In attesa',
  pending: 'In attesa',
  confermata: 'Confermata',
  confirmed: 'Confermata',
  modificata: 'Modificata',
  rifiutata: 'Rifiutata',
  cancellata: 'Cancellata',
  cancelled: 'Cancellata',
  completata: 'Completata',
  no_show: 'No Show',
};

export const FONTE_LABELS = {
  sito: 'Sito',
  telefono: 'Telefono',
  admin: 'Admin',
  altro: 'Altro',
};

export function isPendingStatus(status) {
  return ['nuova', 'in_attesa_conferma', 'pending'].includes(status);
}

export function isConfirmedStatus(status) {
  return ['confermata', 'confirmed', 'modificata'].includes(status);
}

export function isTerminatedStatus(status) {
  return ['cancellata', 'cancelled', 'completata', 'no_show', 'rifiutata'].includes(status);
}

export function isCancelledStatus(status) {
  return ['cancellata', 'cancelled', 'rifiutata'].includes(status);
}

export function getTurno(timeStr) {
  if (!timeStr) return 'cena';
  const h = parseInt(timeStr.split(':')[0]);
  return h < 16 ? 'pranzo' : 'cena';
}

export function formatDayName(dateStr) {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'EEE', { locale: it }); } catch { return ''; }
}
export function formatDayNumber(dateStr) {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'd', { locale: it }); } catch { return ''; }
}
export function formatMonthShort(dateStr) {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'MMM', { locale: it }); } catch { return ''; }
}
export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    const s = format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: it });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch { return dateStr; }
}