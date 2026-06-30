const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// PATCH 1: Fix AppLayout.tsx (Auto-Collapse and revert max-w-7xl)
// -------------------------------------------------------------
const layoutPath = path.join(__dirname, 'frontend', 'src', 'layout', 'AppLayout.tsx');
let layoutContent = fs.readFileSync(layoutPath, 'utf-8');

// Revert the max-w-7xl wrapper
layoutContent = layoutContent.replace(
  /<div className=\{cn\("flex-1 flex flex-col min-h-0 relative transition-all duration-300", isAppMaximized \? "w-full" : "w-full max-w-7xl mx-auto"\)\}>/g,
  '<div className="flex-1 flex flex-col min-h-0 w-full relative">'
);

// Remove the toggle button
layoutContent = layoutContent.replace(
  /<button onClick=\{\(\) => setIsAppMaximized\(!isAppMaximized\)\} className="p-2 bg-card border border-border hover:bg-secondary rounded-md text-foreground\/80 hover:text-foreground transition-colors" title=\{isAppMaximized \? "Restaurar Tamanho" : "Maximizar Tela"\}>(.*?)<\/button>/s,
  ''
);

// Remove the auto-collapse logic in renderMenuItem
const autoCollapseBlock = `                            if (isMobile) {
                                setIsMobileMenuOpen(false);
                            } else {
                                setIsSidebarCollapsed(true);
                            }`;
const correctCollapseBlock = `                            if (isMobile) {
                                setIsMobileMenuOpen(false);
                            }`;
layoutContent = layoutContent.replace(autoCollapseBlock, correctCollapseBlock);

fs.writeFileSync(layoutPath, layoutContent, 'utf-8');
console.log('AppLayout.tsx patched successfully.');


// -------------------------------------------------------------
// PATCH 2: Fix URL synchronization in App.tsx
// -------------------------------------------------------------
const appPath = path.join(__dirname, 'frontend', 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf-8');

const oldHandleNavigate = `  const handleNavigate = (id: string) => {
    const item = findItemById(menuItems, id);
    if (item && item.href) {
      window.history.pushState({}, '', item.href);
    }
    setActivePageId(id);
  };`;

const newHandleNavigate = `  const handleNavigate = (id: string) => {
    // Busca a href correta no defaultMenuItems invés do menuItems (que pode vir corrompido do DB)
    const staticItem = findItemById(defaultMenuItems, id);
    if (staticItem && staticItem.href) {
      window.history.pushState({}, '', staticItem.href);
    } else {
      const item = findItemById(menuItems, id);
      if (item && item.href) {
        window.history.pushState({}, '', item.href);
      }
    }
    setActivePageId(id);
  };`;

if (appContent.includes(oldHandleNavigate)) {
    appContent = appContent.replace(oldHandleNavigate, newHandleNavigate);
    fs.writeFileSync(appPath, appContent, 'utf-8');
    console.log('App.tsx handleNavigate patched successfully.');
} else if (appContent.includes('const staticItem = findItemById(defaultMenuItems, id);')) {
    console.log('App.tsx handleNavigate already patched.');
} else {
    console.log('Could not find old handleNavigate block. Attempting regex replacement...');
    const regexHandleNavigate = /const handleNavigate = \(id: string\) => \{[\s\S]*?setActivePageId\(id\);\s*\};/;
    appContent = appContent.replace(regexHandleNavigate, newHandleNavigate);
    fs.writeFileSync(appPath, appContent, 'utf-8');
    console.log('App.tsx handleNavigate regex patched successfully.');
}

