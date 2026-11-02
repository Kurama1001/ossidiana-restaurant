import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const STATO_LABELS = {
  nuova: 'Nuova',
  in_attesa_conferma: 'In attesa',
  pending: 'In attesa',
  confermata: 'Confermata',
  confirmed: 'Confermata',
  modificata: 'Modificata',
  rifiutata: 'Rifiutata',
  cancellata: 'Annullata',
  cancelled: 'Annullata',
  completata: 'Completata',
  no_show: 'No show',
};

const FONTI = { sito: 'Sito', telefono: 'Telefono', admin: 'Admin', altro: 'Altro' };

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' senza passare dal fuso orario
const itDate = (d) => (d ? d.split('-').reverse().join('/') : '');

/**
 * Elenco clienti (nominativo + telefono) delle prenotazioni, in un file .xlsx
 * apribile con Excel o Google Sheets.
 */
export function exportClientiExcel(reservations) {
  const ordinate = [...reservations]
    .filter(r => r.customer_name || r.phone)
    .sort((a, b) => (a.res_date || '').localeCompare(b.res_date || '') || (a.res_time || '').localeCompare(b.res_time || ''));

  const date = ordinate.map(r => r.res_date).filter(Boolean).sort();
  const dal = date[0];
  const al = date[date.length - 1];

  const rows = [
    ['Elenco clienti — Ossidiana Restaurant'],
    [`Periodo: ${itDate(dal)} → ${itDate(al)}`],
    [`Esportato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [`Totale prenotazioni: ${ordinate.length}`],
    [],
    ['Nome', 'Telefono', 'Data', 'Ora', 'Coperti', 'Stato', 'Fonte'],
    ...ordinate.map(r => [
      (r.customer_name || '').trim(),
      r.phone || '',
      itDate(r.res_date),
      r.res_time || '',
      r.guests || '',
      STATO_LABELS[r.status] || r.status || '',
      FONTI[r.fonte_prenotazione] || r.fonte_prenotazione || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 9 }, { wch: 13 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clienti');
  XLSX.writeFile(wb, `clienti_prenotazioni_${dal || ''}_${al || ''}.xlsx`);
}