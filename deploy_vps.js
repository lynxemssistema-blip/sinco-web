const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const path = require('path');
const fs = require('fs');

const config = {
  host: '85.31.60.68',
  port: 22,
  username: 'root',
  password: '10207597Rdv*'
};

const localFile = path.join(__dirname, 'SINCO_Deploy.zip');
const remoteFile = '/root/SINCO_Deploy.zip';

async function deploy() {
  const sftp = new Client();
  try {
    console.log('🔗 Conectando via SFTP...');
    await sftp.connect(config);
    
    console.log('⬆️ Fazendo upload do arquivo SINCO_Deploy.zip (11MB) - Isso pode levar alguns minutos...');
    await sftp.put(localFile, remoteFile, {
      step: (total_transferred, chunk, total) => {
        process.stdout.write(`Progresso: ${Math.round((total_transferred / total) * 100)}% \r`);
      }
    });
    console.log('\n✅ Upload concluído!');
    await sftp.end();

    console.log('🔗 Conectando via SSH para configurar o servidor...');
    const conn = new SSHClient();
    conn.on('ready', () => {
      console.log('✅ SSH Conectado!');
      
      const commands = `
        echo "🔄 Atualizando pacotes..."
        apt-get update -y > /dev/null 2>&1
        apt-get install -y unzip curl nginx > /dev/null 2>&1
        
        echo "📦 Instalando Node.js 20..."
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
            apt-get install -y nodejs > /dev/null 2>&1
        fi
        
        echo "🚀 Instalando PM2..."
        npm install -g pm2 > /dev/null 2>&1
        
        echo "📂 Extraindo aplicação..."
        mkdir -p /var/www/alfatecsinco
        unzip -o /root/SINCO_Deploy.zip -d /var/www/alfatecsinco > /dev/null 2>&1
        
        echo "⚙️ Instalando dependências..."
        cd /var/www/alfatecsinco
        npm install --omit=dev > /dev/null 2>&1
        
        echo "▶️ Iniciando a aplicação..."
        pm2 stop all || true > /dev/null 2>&1
        pm2 start ecosystem.config.cjs
        pm2 save > /dev/null 2>&1
        
        echo "🌐 Configurando Nginx para o domínio..."
        cat << 'EOF' > /etc/nginx/sites-available/alfatecsinco
server {
    listen 80;
    server_name alfatecsinco.lynxems.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
        ln -sf /etc/nginx/sites-available/alfatecsinco /etc/nginx/sites-enabled/
        nginx -t && systemctl restart nginx
        
        echo "🎉 Deploy concluído com sucesso!"
      `;
      
      conn.exec(commands, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log(`SSH Fechado com código ${code}`);
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error('STDERR:', data.toString());
        });
      });
    }).connect(config);

  } catch (err) {
    console.error('❌ Erro durante o deploy:', err);
  }
}

deploy();
