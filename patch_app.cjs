const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// We want to force override href for "peca-manufaturada" in the fetched menu
// Look for where `let savedMenu: MenuItem[] = data.menu;` is
const overrideLogic = `          let savedMenu: MenuItem[] = data.menu;

          // FORCE override href for Peça Manufaturada regardless of what the DB says
          const fixPecaHref = (items: MenuItem[]) => {
            items.forEach(item => {
              if (item.id === 'peca-manufaturada' || item.id === 'monta-peca-manufaturada') {
                 item.href = '/peca-manufaturada';
              }
              if (item.children) fixPecaHref(item.children);
            });
          };
          fixPecaHref(savedMenu);
`;

content = content.replace("          let savedMenu: MenuItem[] = data.menu;", overrideLogic);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('App.tsx patched for peca-manufaturada href');
