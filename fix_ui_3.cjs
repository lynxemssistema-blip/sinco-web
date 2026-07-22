const fs = require('fs');

// 1. Patch Motorista.tsx
let motoristaPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Motorista.tsx';
let motoristaContent = fs.readFileSync(motoristaPath, 'utf8');

if (!motoristaContent.includes('const getAuthImageUrl')) {
    motoristaContent = motoristaContent.replace(
        'export default function MotoristaPage() {',
        "export default function MotoristaPage() {\n\n    const getAuthImageUrl = (url: string) => {\n        if (!url) return '';\n        const token = localStorage.getItem('sinco_token');\n        if (!token) return url;\n        return url.includes('?') ? `${url}&token=${token}` : `${url}?token=${token}`;\n    };\n"
    );
    
    // Replace in formData.ImagemCNH (modal)
    motoristaContent = motoristaContent.replace(
        /<img src=\{formData\.ImagemCNH\} alt="CNH"/g,
        '<img src={getAuthImageUrl(formData.ImagemCNH)} alt="CNH"'
    );
    motoristaContent = motoristaContent.replace(
        /<img src=\{formData\.ImagemCNH\} alt="CNH Ampliada"/g,
        '<img src={getAuthImageUrl(formData.ImagemCNH)} alt="CNH Ampliada"'
    );
    
    // Replace in motorista.ImagemCNH (grid)
    motoristaContent = motoristaContent.replace(
        /<img src=\{motorista\.ImagemCNH\} alt="CNH"/g,
        '<img src={getAuthImageUrl(motorista.ImagemCNH)} alt="CNH"'
    );
    motoristaContent = motoristaContent.replace(
        /<img src=\{motorista\.ImagemCNH\} alt="CNH Ampliada"/g,
        '<img src={getAuthImageUrl(motorista.ImagemCNH)} alt="CNH Ampliada"'
    );

    fs.writeFileSync(motoristaPath, motoristaContent);
    console.log('Motorista.tsx patched (auth images added for both modal and grid)');
}

// 2. Patch Projeto.tsx
let projetoPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Projeto.tsx';
let projetoContent = fs.readFileSync(projetoPath, 'utf8');

const targetTabBar = ` {/* Tab bar */}
 <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
 {([
 { icon: <FolderKanban size={14} />, label: 'Projeto' },
 { icon: <Building2 size={14} />, label: 'Faturamento' },
 { icon: <Truck size={14} />, label: 'Entrega / Cobrança' },
 { icon: <Banknote size={14} />, label: 'Fornecimento' },
 ] as { icon: React.ReactNode; label: string }[]).map((tab, i) => {
 const isDisabled = i > 0;
 return (
 <button 
 key={i} 
 type="button"
 disabled={isDisabled}
 onClick={() => !isDisabled && setActiveTab(i as 0 | 1 | 2 | 3)}
 className={\`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors 
 \${activeTab === i 
 ? 'border-[#32423D] text-[#32423D] bg-white' 
 : isDisabled 
 ? 'border-transparent text-gray-300 cursor-not-allowed opacity-50' 
 : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
 title={isDisabled ? "Em breve" : ""}
 >
 {tab.icon}{tab.label}
 </button>
 );
 })}
 </div>`;

if (projetoContent.includes(targetTabBar)) {
    projetoContent = projetoContent.replace(targetTabBar, '');
    fs.writeFileSync(projetoPath, projetoContent);
    console.log('Projeto.tsx patched (tab bar removed)');
} else {
    console.log('Projeto.tsx tab bar pattern not found');
}
