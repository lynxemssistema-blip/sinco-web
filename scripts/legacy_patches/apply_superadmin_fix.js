const fs = require('fs');
const file = './frontend/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  // Portão obrigatório: autenticação local antes de acessar qualquer tela
  if (!isLocallyAuthenticated) {
    return (
      <LoginAcessoPage
        onAuthSuccess={() => {
          const dbName = user?.dbName || '';
          sessionStorage.setItem(\`sinco_local_auth_\${dbName}\`, 'true');
          setIsLocallyAuthenticated(true);
        }}
      />
    );
  }`;

const replaceStr = `  const isSuperUser =
    user?.isSuperadmin === true ||
    user?.superadmin === 'S' ||
    user?.login?.toLowerCase() === 'superadmin';

  // Portão obrigatório: autenticação local antes de acessar qualquer tela (exceto superadmin)
  if (!isLocallyAuthenticated && !isSuperUser) {
    return (
      <LoginAcessoPage
        onAuthSuccess={() => {
          const dbName = user?.dbName || '';
          sessionStorage.setItem(\`sinco_local_auth_\${dbName}\`, 'true');
          setIsLocallyAuthenticated(true);
        }}
      />
    );
  }`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed superadmin bypass');
