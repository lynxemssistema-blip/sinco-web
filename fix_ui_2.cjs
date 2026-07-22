const fs = require('fs');

// 1. Motorista.tsx - Add getAuthImageUrl and apply to <img> tags
let motoristaPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/Motorista.tsx';
let motoristaContent = fs.readFileSync(motoristaPath, 'utf8');

if (!motoristaContent.includes('const getAuthImageUrl')) {
    motoristaContent = motoristaContent.replace(
        'export default function MotoristaPage() {',
        "export default function MotoristaPage() {\n\n    const getAuthImageUrl = (url: string) => {\n        if (!url) return '';\n        const token = localStorage.getItem('sinco_token');\n        if (!token) return url;\n        return url.includes('?') ? `${url}&token=${token}` : `${url}?token=${token}`;\n    };\n"
    );
    motoristaContent = motoristaContent.replace(
        /<img src=\{formData\.ImagemCNH\} alt="CNH"/g,
        '<img src={getAuthImageUrl(formData.ImagemCNH)} alt="CNH"'
    );
    motoristaContent = motoristaContent.replace(
        /<img src=\{formData\.ImagemCNH\} alt="CNH Ampliada"/g,
        '<img src={getAuthImageUrl(formData.ImagemCNH)} alt="CNH Ampliada"'
    );
    fs.writeFileSync(motoristaPath, motoristaContent);
    console.log('Motorista.tsx patched (auth images added)');
}

// 2. CadastroUsuario.tsx - Remove the avatar logic to gain space
let cadPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/src/pages/CadastroUsuario.tsx';
let cadContent = fs.readFileSync(cadPath, 'utf8');

const targetAvatarHtml = ` <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-2xl border-2 border-indigo-200 shadow-sm">
 {form.NomeCompleto?.charAt(0)?.toUpperCase() || '?'}
 </div>
 <p className="text-[10px] font-black text-slate-700 text-center leading-tight max-w-[100px] truncate">{form.NomeCompleto || 'Novo'}</p>`;

if (cadContent.includes(targetAvatarHtml)) {
    cadContent = cadContent.replace(targetAvatarHtml, '');
    fs.writeFileSync(cadPath, cadContent);
    console.log('CadastroUsuario.tsx patched (avatar removed)');
} else {
    console.log('CadastroUsuario.tsx avatar pattern not found');
}
