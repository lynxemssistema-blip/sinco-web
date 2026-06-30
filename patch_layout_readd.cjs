const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'layout', 'AppLayout.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Ensure Maximize/Minimize imports exist
if (!content.includes('Maximize') && !content.includes('Minimize')) {
  content = content.replace("Menu, X, LogOut, ChevronDown, ChevronRight, Moon, Sun, User as UserIcon, Search, HelpCircle, Info", "Menu, X, LogOut, ChevronDown, ChevronRight, Moon, Sun, User as UserIcon, Search, HelpCircle, Info, Maximize, Minimize");
}

// 2. Add isAppMaximized state if not present
if (!content.includes('const [isAppMaximized, setIsAppMaximized]')) {
    content = content.replace(
      "const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);",
      "const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);\n    const [isAppMaximized, setIsAppMaximized] = useState(false);"
    );
}

// 3. Add toggle button in header if not present
if (!content.includes('setIsAppMaximized(!isAppMaximized)')) {
    content = content.replace(
      '<DatabaseSwitcher />',
      '<button onClick={() => setIsAppMaximized(!isAppMaximized)} className="p-2 bg-card border border-border hover:bg-secondary rounded-md text-foreground/80 hover:text-foreground transition-colors" title={isAppMaximized ? "Restaurar Tamanho" : "Maximizar Tela"}>\n                                {isAppMaximized ? <Minimize size={18} /> : <Maximize size={18} />}\n                            </button>\n                            <DatabaseSwitcher />'
    );
}

// 4. Wrap children in max-w constraint based on state
content = content.replace(
  '<div className="flex-1 flex flex-col min-h-0 w-full relative">',
  '<div className={cn("flex-1 flex flex-col min-h-0 relative transition-all duration-300", isAppMaximized ? "w-full" : "w-full max-w-7xl mx-auto")}>'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("AppLayout.tsx patched with max-w-7xl and maximize toggle.");
