const PICTOGRAM_URL = 'https://media.base44.com/images/public/6a047f3742becec83398e6f/3ddb12f47_generated_image.png';

const CATEGORY_ORDER = ['antipasti', 'primi', 'romanissimi', 'secondi', 'contorni', 'dolci'];
const CATEGORY_LABELS_IT = {
  antipasti: 'Antipasti', primi: 'Primi Piatti', romanissimi: 'I Romanissimi',
  secondi: 'Secondi', contorni: 'Contorni', dolci: 'Dolci',
};
const CATEGORY_LABELS_EN = {
  antipasti: 'Starters', primi: 'First Courses', romanissimi: 'The Roman Classics',
  secondi: 'Main Courses', contorni: 'Side Dishes', dolci: 'Desserts',
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

  const filtered = filterItemsByTurno(items, turno);

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
        <table class="dish-table" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td class="dish-name">${name}</td>
            <td class="dish-price" align="right" valign="bottom">€ ${price}</td>
          </tr>
        </table>
        ${descIt ? `<p class="dish-desc-it">${descIt}</p>` : ''}
        ${descEn ? `<p class="dish-desc-en">${descEn}</p>` : ''}`;
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
.header-logo { font-size: 36pt; font-weight: bold; letter-spacing: 8pt; color: #1a1a1a; }
.header-sub { font-size: 9pt; letter-spacing: 4pt; color: #888; text-transform: uppercase; margin-top: 2px; }
.header-line { border-bottom: 1.5pt solid #C69C6D; margin: 12px 0 20px 0; }
.menu-title { text-align: center; font-size: 16pt; font-style: italic; color: #C69C6D; margin: 10px 0 2px 0; }
.menu-title-en { text-align: center; font-size: 9pt; letter-spacing: 3pt; color: #aaa; text-transform: uppercase; margin-bottom: 24px; }
.category { margin-bottom: 24px; }
.cat-title { font-size: 15pt; font-weight: bold; color: #1a1a1a; letter-spacing: 2pt; margin: 0; }
.cat-subtitle { font-size: 8pt; letter-spacing: 2pt; color: #aaa; text-transform: uppercase; margin: 2px 0 6px 0; }
.cat-line { border-bottom: 0.75pt solid #C69C6D; margin-bottom: 10px; }
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
<img class="watermark-img" src="${PICTOGRAM_URL}" />
<div class="header">
  <div class="header-logo">OSSIDIANA</div>
  <div class="header-sub">Cucina Contemporanea</div>
</div>
<div class="header-line"></div>
<div class="menu-title">${turnoLabel}</div>
<div class="menu-title-en">${turnoLabelEn}</div>
${sectionsHtml}
<div class="footer">
  <span class="footer-text">Ossidiana &middot; Cucina Contemporanea &middot; Roma</span>
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