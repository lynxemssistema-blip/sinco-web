const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/utils/menuUtils.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `  // Force add 'romaneio' parent if missing
  if (!menu.find(item => item.id === 'romaneio')) {
    const romaneioItem = defaultMenuItems.find(item => item.id === 'romaneio');
    if (romaneioItem) menu = [romaneioItem, ...menu];
  }`;

const replacement = `  // Force add or replace 'romaneio' parent to ensure it has its submenus
  const romaneioIdx = menu.findIndex(item => item.id === 'romaneio');
  const romaneioItem = defaultMenuItems.find(item => item.id === 'romaneio');
  if (romaneioItem) {
    if (romaneioIdx >= 0) {
      menu[romaneioIdx] = romaneioItem;
    } else {
      menu = [romaneioItem, ...menu];
    }
  }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed menuUtils');
