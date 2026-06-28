const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'ApontamentoProducao.tsx');
let code = fs.readFileSync(filePath, 'utf8');

const earlyReturnTarget = `  if (!user || (user.role !== 'admin' && user.mapaProducao !== 'S' && !user.isSuperadmin && user.superadmin !== 'S')) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 min-h-0 bg-slate-50">
        <div className="p-4 bg-red-100 rounded-full text-red-600"><Lock size={40} /></div>
        <h2 className="text-xl font-black text-red-700">Acesso Negado</h2>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Somente usuários com permissão de Mapa de Produção ou Administradores podem acessar esta tela.
        </p>
        {user && (
          <div className="mt-4 text-xs text-slate-400 bg-white p-2 rounded border border-slate-200">
            <p><strong>Debug Info:</strong></p>
            <p>Role: {user.role || 'N/A'}</p>
            <p>MapaProducao: {user.mapaProducao || 'N/A'}</p>
            <p>DB: {user.dbName || 'N/A'}</p>
            <p className="mt-2 text-red-500 font-bold">Por favor, clique em SAIR no menu e faça login novamente.</p>
          </div>
        )}
      </div>
    );
  }`;

const authVariable = `  const unauthorizedError = (!user || (user.role !== 'admin' && user.mapaProducao !== 'S' && !user.isSuperadmin && user.superadmin !== 'S')) ? (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 min-h-0 bg-slate-50">
        <div className="p-4 bg-red-100 rounded-full text-red-600"><Lock size={40} /></div>
        <h2 className="text-xl font-black text-red-700">Acesso Negado</h2>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Somente usuários com permissão de Mapa de Produção ou Administradores podem acessar esta tela.
        </p>
        {user && (
          <div className="mt-4 text-xs text-slate-400 bg-white p-2 rounded border border-slate-200">
            <p><strong>Debug Info:</strong></p>
            <p>Role: {user.role || 'N/A'}</p>
            <p>MapaProducao: {user.mapaProducao || 'N/A'}</p>
            <p>DB: {user.dbName || 'N/A'}</p>
            <p className="mt-2 text-red-500 font-bold">Por favor, clique em SAIR no menu e faça login novamente.</p>
          </div>
        )}
      </div>
  ) : null;`;

code = code.replace(earlyReturnTarget, authVariable);

const mainReturnRegex = /  const setorInfo = setores\.find\(s => s\.id === setorAtivo\) \|\| setores\[0\];\s*return \(/;
const mainReturnReplacement = `  const setorInfo = setores.find(s => s.id === setorAtivo) || setores[0];\n\n  if (unauthorizedError) return unauthorizedError;\n\n  return (`;

code = code.replace(mainReturnRegex, mainReturnReplacement);

fs.writeFileSync(filePath, code);
console.log('Fixed ApontamentoProducao early return');
