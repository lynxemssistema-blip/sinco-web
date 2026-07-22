const mysql = require('./node_modules/mysql2/promise');
require('dotenv').config();

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Ler menu atual
  const [rows] = await c.execute('SELECT id, MenuStructure FROM configuracaosistema LIMIT 1');
  if (rows.length === 0 || !rows[0].MenuStructure) {
    console.log('Nenhum MenuStructure encontrado.');
    await c.end();
    return;
  }

  const configId = rows[0].id;
  const menu = JSON.parse(rows[0].MenuStructure);

  console.log('Menu atual — total itens raiz:', menu.length);

  // Função recursiva para corrigir o item corrompido
  function fixMenu(items) {
    return items.map(item => {
      // Substituir o item fantasma "group_1781618991422" pelo item correto
      if (item.id === 'group_1781618991422' && 
          item.label && item.label.toLowerCase().includes('montagem processo')) {
        console.log('  ✅ Corrigindo item:', item.id, '->', item.label);
        return {
          id: 'peca-manufaturada',
          icon: 'Settings',
          label: 'Montagem Processo Fabricação',
          href: '/peca-manufaturada'
        };
      }
      // Processar filhos recursivamente
      if (item.children && item.children.length > 0) {
        return { ...item, children: fixMenu(item.children) };
      }
      return item;
    });
  }

  const menuCorrigido = fixMenu(menu);

  // Salvar de volta
  const menuJson = JSON.stringify(menuCorrigido);
  await c.execute('UPDATE configuracaosistema SET MenuStructure = ? WHERE id = ?', [menuJson, configId]);

  console.log('\n✅ Menu corrigido e salvo no banco!');
  console.log('Item "group_1781618991422" substituído por "peca-manufaturada" com href "/peca-manufaturada".');

  // Verificação final
  const [verify] = await c.execute('SELECT MenuStructure FROM configuracaosistema WHERE id = ?', [configId]);
  const verifyMenu = JSON.parse(verify[0].MenuStructure);
  
  function findById(items, id) {
    for (const i of items) {
      if (i.id === id) return i;
      if (i.children) { const f = findById(i.children, id); if (f) return f; }
    }
    return null;
  }

  const old = findById(verifyMenu, 'group_1781618991422');
  const novo = findById(verifyMenu, 'peca-manufaturada');
  
  console.log('\n--- Verificação ---');
  console.log('group_1781618991422 ainda existe?', old ? 'SIM ❌' : 'NÃO ✅');
  console.log('peca-manufaturada encontrado?', novo ? 'SIM ✅ -> ' + JSON.stringify(novo) : 'NÃO ❌');

  await c.end();
}

main().catch(console.error);
