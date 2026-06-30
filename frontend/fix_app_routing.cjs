const fs = require('fs');

const appPath = 'C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/App.tsx';
let code = fs.readFileSync(appPath, 'utf8');

const logic = `
  const renderPage = () => {
    let resolvedId = activePageId;
    const dynamicItem = findItemById(menuItems, activePageId);
    if (dynamicItem && dynamicItem.href) {
      const staticMatch = findItemByHref(defaultMenuItems, dynamicItem.href);
      if (staticMatch) {
        resolvedId = staticMatch.id;
      }
    }

    switch (resolvedId) {
`;

code = code.replace(/const renderPage = \(\) => \{\s*switch \(activePageId\) \{/, logic);
fs.writeFileSync(appPath, code);
console.log('App.tsx routing patched');
