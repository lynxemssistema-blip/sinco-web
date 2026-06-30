const fs = require('fs');

let appTsx = fs.readFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/App.tsx', 'utf8');
if (!appTsx.includes("id === 'recursos-fabricacao'")) {
    const forceAdd = `
          // Force add 'recursos-fabricacao' if missing
          if (!savedMenu.find(item => item.id === 'recursos-fabricacao')) {
            const rfItem = defaultMenuItems.find(item => item.id === 'recursos-fabricacao');
            if (rfItem) {
              savedMenu.push(rfItem);
            }
          }
`;
    appTsx = appTsx.replace("// Force add 'pesquisar-desenho' if missing", forceAdd + "\n          // Force add 'pesquisar-desenho' if missing");
    fs.writeFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/App.tsx', appTsx);
    console.log('App.tsx patched with force add for recursos-fabricacao');
} else {
    console.log('App.tsx already has force add for recursos-fabricacao');
}
