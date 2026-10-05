import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Esporta il report incassi e coperti (per giorno e turno) in un file Excel .xlsx,
 * apribile direttamente in Google Sheets o Excel.
 */
const CAT_LABELS = {
  antipasti: 'Antipasti', primi: 'Primi', romanissimi: 'Romanissimi', secondi: 'Secondi',
  contorni: 'Contorni', dolci: 'Dolci', acqua: 'Acqua', vino: 'Vino', birra: 'Birra',
  cocktail: 'Cocktail', caffe_amari: 'Caffè & Amari', bevande: 'Bevande', forfait: 'Forfait',
};

export function exportIncassiCopertiExcel({
  giorniTurno,
  totIncassoPranzo, totIncassoCena,
  totCopertiPranzo, totCopertiCena,
  periodoLabel,
  righe,
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

  // Foglio 2: dettaglio piatti e bevande vendute (aggregato per articolo)
  const agg = {};
  (righe || []).forEach(r => {
    if (!r.nome_item) return;
    if (!agg[r.nome_item]) agg[r.nome_item] = { nome: r.nome_item, categoria: r.categoria || '', reparto: r.reparto || '', quantita: 0, totale: 0 };
    agg[r.nome_item].quantita += r.quantita || 0;
    agg[r.nome_item].totale += r.prezzo_totale || 0;
  });
  const dettaglio = Object.values(agg).sort((a, b) => b.quantita - a.quantita);

  const rows2 = [
    [`Dettaglio vendite — Periodo: ${periodoLabel}`],
    [],
    ['Articolo', 'Categoria', 'Reparto', 'Quantità', 'Totale (€)'],
    ...dettaglio.map(d => [
      d.nome,
      CAT_LABELS[d.categoria] || d.categoria,
      d.reparto === 'bar' ? 'Bar' : 'Cucina',
      d.quantita,
      d.totale,
    ]),
    [],
    ['Totale', '', '', dettaglio.reduce((s, d) => s + d.quantita, 0), dettaglio.reduce((s, d) => s + d.totale, 0)],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Incassi e Coperti');
  XLSX.utils.book_append_sheet(wb, ws2, 'Dettaglio Vendite');
  XLSX.writeFile(wb, `incassi_coperti_${new Date().toISOString().split('T')[0]}.xlsx`);
}