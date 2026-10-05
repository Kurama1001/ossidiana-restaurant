import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Esporta il report incassi e coperti (per giorno e turno) in un file Excel .xlsx,
 * apribile direttamente in Google Sheets o Excel.
 */
export function exportIncassiCopertiExcel({
  giorniTurno,
  totIncassoPranzo, totIncassoCena,
  totCopertiPranzo, totCopertiCena,
  periodoLabel,
}) {
  const rows = [
    [`Report Incassi e Coperti — Ossidiana Restaurant`],
    [`Periodo: ${periodoLabel}`],
    [`Esportato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [],
    ['Giorno', 'Incasso Pranzo (€)', 'Coperti Pranzo', 'Incasso Cena (€)', 'Coperti Cena', 'Totale Giorno (€)', 'Coperti Totale'],
  ];

  giorniTurno.forEach(g => {
    rows.push([
      format(new Date(g.day + 'T12:00'), 'EEEE d MMMM yyyy', { locale: it }),
      g.pranzo.incasso, g.pranzo.coperti,
      g.cena.incasso, g.cena.coperti,
      g.pranzo.incasso + g.cena.incasso,
      g.pranzo.coperti + g.cena.coperti,
    ]);
  });

  rows.push([]);
  rows.push([
    'Totale periodo',
    totIncassoPranzo, totCopertiPranzo,
    totIncassoCena, totCopertiCena,
    totIncassoPranzo + totIncassoCena,
    totCopertiPranzo + totCopertiCena,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 13 }, { wch: 18 }, { wch: 15 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Incassi e Coperti');
  XLSX.writeFile(wb, `incassi_coperti_${new Date().toISOString().split('T')[0]}.xlsx`);
}