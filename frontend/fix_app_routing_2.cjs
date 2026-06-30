const fs = require('fs');
let code = fs.readFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/App.tsx', 'utf8');

const replacement = `
  const renderPage = () => {
    let resolvedId = activePageId;
    const dynamicItem = findItemById(menuItems, activePageId);
    if (dynamicItem) {
      const staticMatch = 
        (dynamicItem.href ? findItemByHref(defaultMenuItems, dynamicItem.href) : null) || 
        defaultMenuItems.find(i => i.label === dynamicItem.label);
        
      if (staticMatch) {
        resolvedId = staticMatch.id;
      } else if (dynamicItem.label && dynamicItem.label.toLowerCase().includes('recurso')) {
        resolvedId = 'recursos-fabricacao';
      }
    }

    switch (resolvedId) {
`;

code = code.replace(/const renderPage = \(\) => \{\s+let resolvedId = activePageId;\s+const dynamicItem = findItemById\(menuItems, activePageId\);\s+if \(dynamicItem && dynamicItem\.href\) \{\s+const staticMatch = findItemByHref\(defaultMenuItems, dynamicItem\.href\);\s+if \(staticMatch\) \{\s+resolvedId = staticMatch\.id;\s+\}\s+\}\s+switch \(resolvedId\) \{/, replacement);

fs.writeFileSync('C:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/App.tsx', code);
console.log('App.tsx patched again');
