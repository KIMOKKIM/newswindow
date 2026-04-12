import fs from 'fs';

const p = new URL('../script.js', import.meta.url);
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  /if \(heroTitle\) heroTitle\.textContent = '[^']*';/,
  "if (heroTitle) heroTitle.textContent = '\uae30\uc0ac \ubaa9\ub85d\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.';",
);

s = s.replace(
  /heroMeta\.textContent = isTimeout\r?\n\s*\?[^\n]+\r?\n\s*:/,
  "heroMeta.textContent = isTimeout\n            ? '\uc694\uccad\uc774 \uc9c0\uc5f0\ub418\uc5b4 \uc911\ub2e8\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc544\ub798 \ubc84\ud2bc\uc73c\ub85c \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.'\n            :",
);

s = s.replace(
  /btn\.setAttribute\('aria-label', '[^']+'\)/,
  "btn.setAttribute('aria-label', '\ucd5c\uc2e0 \uae30\uc0ac \ub2e4\uc2dc \ubd88\ub7ec\uc624\uae30')",
);

s = s.replace(
  /if \(ht\) ht\.textContent = '[^']*';/,
  "if (ht) ht.textContent = '\ubd88\ub7ec\uc624\ub294 \uc911\u2026';",
);

fs.writeFileSync(p, s, 'utf8');
console.log('fixed headline korean strings');
