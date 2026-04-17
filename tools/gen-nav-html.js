const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../shared/articleCategories.json');
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const cols = [];
let colIdx = 0;
for (const g of d.groups || []) {
  cols.push({ major: String(g.title || '').trim(), label: String(g.title || ''), items: g.items || [], col: colIdx++ });
}
for (const t of d.topLevel || []) {
  const mv = String(t.value || '').trim();
  cols.push({ major: mv, label: String(t.label || mv).trim(), items: [], col: colIdx++, topOnly: true });
}
const topHtmlParts = [];
const megaHtmlParts = [];
for (let ci = 0; ci < cols.length; ci++) {
  const c = cols[ci];
  const hasKids = c.items && c.items.length > 0;
  let topHtml = `<li class="nav-top-item${hasKids ? ' nav-has-dropdown' : ''}" data-mega-col="${c.col}">`;
  topHtml += `<a href="section.html?category=${encodeURIComponent(c.major)}" data-nw-section="${c.major}">${c.label}</a>`;
  if (hasKids) {
    topHtml += '<ul class="nav-dropdown">';
    for (const it of c.items) {
      topHtml += `<li><a href="section.html?category=${encodeURIComponent(it.value)}" data-nw-section="${it.value}">${it.label}</a></li>`;
    }
    topHtml += '</ul>';
  }
  topHtml += '</li>';
  topHtmlParts.push(topHtml);

  let megaHtml = `<div class="nav-mega-col" data-mega-col="${c.col}">`;
  megaHtml += `<h3 class="nav-mega-heading"><a href="section.html?category=${encodeURIComponent(c.major)}" data-nw-section="${c.major}">${c.label}</a></h3>`;
  if (hasKids) {
    megaHtml += '<ul class="nav-mega-subs">';
    for (const it of c.items) {
      megaHtml += `<li><a href="section.html?category=${encodeURIComponent(it.value)}" data-nw-section="${it.value}">${it.label}</a></li>`;
    }
    megaHtml += '</ul>';
  }
  megaHtml += '</div>';
  megaHtmlParts.push(megaHtml);
}
console.log('NAV_ORDER:');
cols.forEach((c, i) => {
  console.log(`${i+1}. ${c.label} ${c.items && c.items.length ? '(has children: ' + c.items.map(it=>it.label).join(', ')+')' : ''}`);
});
console.log('\\nTOP_HTML:\\n' + topHtmlParts.join('\\n'));
console.log('\\nMEGA_HTML:\\n' + megaHtmlParts.join('\\n'));

