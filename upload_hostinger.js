const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const path = require('path');
const fs = require('fs');

const config = {
  host: '89.116.115.59',
  port: 65002,
  username: 'u494795077',
  password: '10207597Rdv*'
};

const localFile = path.join(__dirname, 'SINCO_Deploy.zip');

async function deploy() {
  console.log('🔗 Conectando SSH à hospedagem da Hostinger...');
  const conn = new SSHClient();
  
  conn.on('ready', () => {
    console.log('✅ Conexão SSH estabelecida!');
    
    // Procura o diretório criado para o subdomínio
    console.log('🔎 Procurando a pasta do subdomínio alfatecsinco...');
    conn.exec('find . -maxdepth 4 -type d -name "*alfatecsinco*" | head -n 1', (err, stream) => {
      if (err) throw err;
      let output = '';
      stream.on('data', (data) => {
        output += data.toString();
      }).on('close', async () => {
        let remoteFolder = output.trim();
        if (!remoteFolder) {
            console.log('⚠️ Pasta não encontrada magicamente. Usando estrutura padrão...');
            remoteFolder = './domains/lynxems.com.br/public_html/alfatecsinco';
        }
        
        console.log(`📁 Diretório de destino: ${remoteFolder}`);
        
        conn.exec(`mkdir -p ${remoteFolder}`, async (err, dirStream) => {
           dirStream.on('close', async () => {
               const sftp = new Client();
               try {
                 await sftp.connect(config);
                 const remoteFile = remoteFolder + '/SINCO_Deploy.zip';
                 console.log(`⬆️ Fazendo upload de SINCO_Deploy.zip (11MB) - Isso levará alguns segundos...`);
                 
                 await sftp.put(localFile, remoteFile, {
                   step: (total_transferred, chunk, total) => {
                     let percent = Math.round((total_transferred / total) * 100);
                     if (percent % 10 === 0) process.stdout.write(`Progresso: ${percent}% \r`);
                   }
                 });
                 console.log('\n✅ Upload do pacote concluído!');
                 
                 console.log('📦 Descompactando arquivos direto no servidor...');
                 conn.exec(`cd ${remoteFolder} && unzip -q -o SINCO_Deploy.zip`, (err, unzipStream) => {
                    unzipStream.on('close', () => {
                        console.log('✅ Arquivos descompactados e prontos!');
                        
                        console.log('🧹 Removendo arquivo .zip residual...');
                        conn.exec(`cd ${remoteFolder} && rm SINCO_Deploy.zip`, () => {
                             console.log('🎉 UPLOAD CONCLUÍDO COM SUCESSO!');
                             sftp.end();
                             conn.end();
                        });
                    });
                 });
               } catch(ex) {
                 console.error('❌ Erro no envio:', ex.message);
                 conn.end();
               }
           });
        });
      });
    });
  }).on('error', (err) => {
      console.error('❌ Erro de conexão com a Hostinger:', err.message);
  }).connect(config);
}

deploy();
