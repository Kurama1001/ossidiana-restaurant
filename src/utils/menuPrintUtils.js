// Titolo testuale elegante (corsivo)
const HEADER_FONT = "Georgia, 'Playfair Display', 'Times New Roman', serif";

const CATEGORY_ORDER = ['antipasti', 'primi', 'romanissimi', 'secondi', 'contorni', 'dolci', 'acqua', 'bevande', 'birra', 'cocktail', 'caffe_amari'];
const CATEGORY_LABELS_IT = {
  antipasti: 'Antipasti', primi: 'Primi Piatti', romanissimi: 'I Romanissimi',
  secondi: 'Secondi', contorni: 'Contorni', dolci: 'Dolci',
  acqua: 'Acqua', bevande: 'Bevande', birra: 'Birre', cocktail: 'Cocktail', caffe_amari: 'Caffè & Amari',
};
const CATEGORY_LABELS_EN = {
  antipasti: 'Starters', primi: 'First Courses', romanissimi: 'The Roman Classics',
  secondi: 'Main Courses', contorni: 'Side Dishes', dolci: 'Desserts',
  acqua: 'Water', bevande: 'Soft Drinks', birra: 'Beers', cocktail: 'Cocktails', caffe_amari: 'Coffee & Bitters',
};

export function filterItemsByTurno(items, turno) {
  return items.filter(i => {
    if (!turno) return true;
    if (!i.servizio) return true; // legacy items show in both
    if (i.servizio === 'pranzo_cena') return true;
    return i.servizio === turno;
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateMenuWordDocument(items, turno) {
  const turnoLabel = turno === 'pranzo' ? 'Menu del Pranzo' : 'Menu della Cena';
  const turnoLabelEn = turno === 'pranzo' ? 'Lunch Menu' : 'Dinner Menu';

  const filtered = filterItemsByTurno(items, turno).filter(i => i.active);

  const sectionsHtml = CATEGORY_ORDER.map(cat => {
    const catItems = filtered
      .filter(i => i.category === cat)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (catItems.length === 0) return '';

    const dishesHtml = catItems.map(item => {
      const name = escapeHtml(item.name);
      const descIt = escapeHtml(item.description);
      const descEn = escapeHtml(item.description_en);
      const price = Number(item.price || 0).toFixed(2).replace('.', ',');

      return `
        <div class="dish">
          <table class="dish-table" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="dish-name">${name}</td>
              <td class="dish-price" align="right" valign="bottom">€ ${price}</td>
            </tr>
          </table>
          ${descIt ? `<p class="dish-desc-it">${descIt}</p>` : ''}
          ${descEn ? `<p class="dish-desc-en">${descEn}</p>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="category">
        <p class="cat-title">${CATEGORY_LABELS_IT[cat]}</p>
        <p class="cat-subtitle">${CATEGORY_LABELS_EN[cat]}</p>
        <div class="cat-line"></div>
        ${dishesHtml}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Ossidiana - ${turnoLabel}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page { size: A4; margin: 2.5cm 3cm 2.5cm 3cm; }
body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.5; position: relative; }
.watermark-img { position: fixed; top: 50%; left: 50%; margin-left: -175px; margin-top: -175px; width: 350px; height: 350px; opacity: 0.03; z-index: -99; }
.header { text-align: center; margin-bottom: 8px; }
.header-logo { font-family: ${HEADER_FONT}; font-size: 40pt; font-style: italic; font-weight: normal; letter-spacing: 3pt; color: #1a1a1a; }
.header-sub { font-size: 10pt; font-style: italic; letter-spacing: 5pt; color: #C69C6D; text-transform: uppercase; margin-top: 6px; }
.header-line { border-bottom: 1.5pt solid #C69C6D; margin: 12px 0 20px 0; }
.menu-title { text-align: center; font-size: 16pt; font-style: italic; color: #C69C6D; margin: 10px 0 2px 0; }
.menu-title-en { text-align: center; font-size: 9pt; letter-spacing: 3pt; color: #aaa; text-transform: uppercase; margin-bottom: 24px; }
.category { margin-bottom: 24px; }
.cat-title { font-size: 15pt; font-weight: bold; color: #1a1a1a; letter-spacing: 2pt; margin: 0; }
.cat-subtitle { font-size: 8pt; letter-spacing: 2pt; color: #aaa; text-transform: uppercase; margin: 2px 0 6px 0; }
.cat-line { border-bottom: 0.75pt solid #C69C6D; margin-bottom: 10px; }
.cat-title, .cat-subtitle, .cat-line { page-break-after: avoid; }
.category { page-break-inside: auto; }
.dish { page-break-inside: avoid; }
.dish-table { margin-bottom: 2px; }
.dish-name { font-size: 11.5pt; font-weight: bold; color: #1a1a1a; padding: 0; }
.dish-price { font-size: 11pt; font-weight: bold; color: #C69C6D; white-space: nowrap; padding: 0; }
.dish-desc-it { font-size: 9.5pt; font-style: italic; color: #555; margin: 1px 0 0 0; }
.dish-desc-en { font-size: 9pt; font-style: italic; color: #999; margin: 1px 0 8px 0; }
.footer { text-align: center; margin-top: 36px; padding-top: 14px; border-top: 0.75pt solid #C69C6D; }
.footer-text { font-size: 7.5pt; color: #aaa; letter-spacing: 2pt; text-transform: uppercase; }
</style>
</head>
<body>
<div class="header">
  <div class="header-logo">Ossidiana</div>
  <div class="header-sub">Cucina Contemporanea</div>
</div>
<div class="header-line"></div>
<div class="menu-title">${turnoLabel}</div>
<div class="menu-title-en">${turnoLabelEn}</div>
${sectionsHtml}
<div class="footer">
  <span class="footer-text">Ossidiana Restaurant &middot; Cucina Contemporanea</span>
</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Menu_Ossidiana_${turno === 'pranzo' ? 'Pranzo' : 'Cena'}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

const WINE_ORDER = ['bollicine', 'bianchi', 'rossi', 'dolci'];
const WINE_LABELS_IT = {
  bollicine: 'Bollicine', bianchi: 'Vini Bianchi', rossi: 'Vini Rossi', dolci: 'Vini Dolci',
};
const WINE_LABELS_EN = {
  bollicine: 'Sparkling Wines', bianchi: 'White Wines', rossi: 'Red Wines', dolci: 'Dessert Wines',
};

export function generateWineListWordDocument(wines) {
  const active = (wines || []).filter(w => w.active);

  const sectionsHtml = WINE_ORDER.map(wt => {
    const typeItems = active
      .filter(w => w.wine_type === wt)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (typeItems.length === 0) return '';

    // Raggruppa per regione
    const regioni = [];
    const regioniMap = {};
    for (const w of typeItems) {
      const r = w.regione || 'Altro';
      if (!regioniMap[r]) { regioniMap[r] = []; regioni.push(r); }
      regioniMap[r].push(w);
    }

    const regionHtml = regioni.map(regione => {
      const rowsHtml = regioniMap[regione].map(w => {
        const name = escapeHtml(w.name);
        const cantina = escapeHtml(w.cantina);
        const desc = escapeHtml(w.description);
        const calice = w.prezzo_calice != null ? `€ ${Number(w.prezzo_calice).toFixed(0)}` : '—';
        const bottiglia = w.prezzo_bottiglia != null ? `€ ${Number(w.prezzo_bottiglia).toFixed(0)}` : '—';
        const subLine = cantina || w.regione
          ? `<br><span class="wine-sub">${cantina ? cantina : ''}${cantina && w.regione ? ' · ' : ''}${w.regione ? escapeHtml(w.regione) : ''}</span>`
          : '';
        return `
          <tr class="wine-row">
            <td class="dish-name" width="55%" valign="bottom">
              <span class="wine-name">${name}</span>${subLine}${desc ? `<br><span class="wine-desc-en">${desc}</span>` : ''}
            </td>
            <td class="dish-price-sub" width="22%" align="right" valign="bottom">calice ${calice}</td>
            <td class="dish-price" width="23%" align="right" valign="bottom">bottiglia ${bottiglia}</td>
          </tr>`;
      }).join('');
      return `
        <div class="wine-region">
          <p class="region-title">${escapeHtml(regione)}</p>
          <div class="region-line"></div>
          <table class="wine-region-table" width="100%" cellpadding="0" cellspacing="0">
            <colgroup>
              <col style="width:55%" />
              <col style="width:22%" />
              <col style="width:23%" />
            </colgroup>
            ${rowsHtml}
          </table>
        </div>`;
    }).join('');

    return `
      <div class="category">
        <p class="cat-title">${WINE_LABELS_IT[wt]}</p>
        <p class="cat-subtitle">${WINE_LABELS_EN[wt]}</p>
        <div class="cat-line"></div>
        ${regionHtml}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Ossidiana - Carta dei Vini</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page { size: A4; margin: 2.5cm 3cm 2.5cm 3cm; }
body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.5; position: relative; }
.watermark-img { position: fixed; top: 50%; left: 50%; margin-left: -175px; margin-top: -175px; width: 350px; height: 350px; opacity: 0.03; z-index: -99; }
.header { text-align: center; margin-bottom: 8px; }
.header-logo { font-family: ${HEADER_FONT}; font-size: 40pt; font-style: italic; font-weight: normal; letter-spacing: 3pt; color: #1a1a1a; }
.header-sub { font-size: 10pt; font-style: italic; letter-spacing: 5pt; color: #C69C6D; text-transform: uppercase; margin-top: 6px; }
.header-line { border-bottom: 1.5pt solid #C69C6D; margin: 12px 0 20px 0; }
.menu-title { text-align: center; font-size: 16pt; font-style: italic; color: #C69C6D; margin: 10px 0 2px 0; }
.menu-title-en { text-align: center; font-size: 9pt; letter-spacing: 3pt; color: #aaa; text-transform: uppercase; margin-bottom: 24px; }
.category { margin-bottom: 24px; }
.cat-title { font-size: 15pt; font-weight: bold; color: #1a1a1a; letter-spacing: 2pt; margin: 0; }
.cat-subtitle { font-size: 8pt; letter-spacing: 2pt; color: #aaa; text-transform: uppercase; margin: 2px 0 6px 0; }
.cat-line { border-bottom: 0.75pt solid #C69C6D; margin-bottom: 10px; }
.cat-title, .cat-subtitle, .cat-line { page-break-after: avoid; }
.category { page-break-inside: auto; }
.wine-region { margin-bottom: 12px; }
.region-title { font-size: 9pt; letter-spacing: 2pt; color: #888; text-transform: uppercase; margin: 8px 0 2px 0; }
.region-line { border-bottom: 0.5pt solid #ddd; margin-bottom: 6px; }
.region-title, .region-line { page-break-after: avoid; }
.wine-region-table { table-layout: fixed; width: 100%; border-collapse: collapse; }
.wine-region-table tr.wine-row { page-break-inside: avoid; }
.dish-name { font-size: 11.5pt; font-weight: bold; color: #1a1a1a; padding: 2px 0 6px 0; }
.wine-name { font-weight: bold; color: #1a1a1a; }
.wine-sub { font-size: 9.5pt; font-style: italic; color: #555; font-weight: normal; }
.wine-desc-en { font-size: 9pt; font-style: italic; color: #999; font-weight: normal; }
.dish-price-sub { font-size: 9pt; color: #888; white-space: nowrap; padding: 2px 0 6px 14px; }
.dish-price { font-size: 11pt; font-weight: bold; color: #C69C6D; white-space: nowrap; padding: 2px 0 6px 14px; }
.dish-desc-it { font-size: 9.5pt; font-style: italic; color: #555; margin: 1px 0 0 0; }
.dish-desc-en { font-size: 9pt; font-style: italic; color: #999; margin: 1px 0 8px 0; }
.footer { text-align: center; margin-top: 36px; padding-top: 14px; border-top: 0.75pt solid #C69C6D; }
.footer-text { font-size: 7.5pt; color: #aaa; letter-spacing: 2pt; text-transform: uppercase; }
</style>
</head>
<body>
<div class="header">
  <div class="header-logo">Ossidiana</div>
  <div class="header-sub">Cucina Contemporanea</div>
</div>
<div class="header-line"></div>
<div class="menu-title">Carta dei Vini</div>
<div class="menu-title-en">Wine List</div>
${sectionsHtml}
<div class="footer">
  <span class="footer-text">Ossidiana Restaurant &middot; Cucina Contemporanea</span>
</div>
</body>
</html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Carta_Vini_Ossidiana.doc';
  a.click();
  URL.revokeObjectURL(url);
}