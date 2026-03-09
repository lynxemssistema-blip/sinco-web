const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

// DB Config (Copying from src/config/db.js logic for standalone run)
const dbConfig = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal', // Changed from lynxlocal_root
    password: process.env.CENTRAL_DB_PASS || 'jHAzhFG848@yN@U', // Changed from lynx@2022
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function testReleaseFlow() {
    console.log('--- Mostrando Processo de Liberação (Simulação) ---');
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao banco de dados.');

        // 1. Create a Test Romaneio
        console.log('\n1. Criando Romaneio de Teste...');
        const [res] = await connection.execute(
            `INSERT INTO romaneio (Descricao, EnviadoPara, Estatus, DATACRIACAO, CriadoPor) 
       VALUES (?, ?, ?, NOW(), ?)`,
            ['TESTE FLUXO LIBERACAO', 'CLIENTE TESTE', 'Registrado', 'Sistema']
        );
        const romaneioId = res.insertId;
        console.log(`   -> Romaneio Criado. ID: ${romaneioId}`);

        // 2. Add Item (Required for release)
        console.log('\n2. Adicionando Item (Requisito para liberação)...');
        try {
            // Coluna Descricao não existe. Usando Observacao e campos obrigatórios se houver.
            // IdRomaneio é varchar no schema, mas vamos passar o ID.
            await connection.execute(
                `INSERT INTO romaneioitem (IdRomaneio, Observacao, Usuario) VALUES (?, ?, ?)`,
                [romaneioId, 'ITEM TESTE AUTOMATIZADO', 'Sistema']
            );
            console.log('   -> Item adicionado com sucesso.');
        } catch (err) {
            console.error('   -> Falha ao inserir item:', err.message);
            throw err;
        }


        // 3. Attempt to Release ('Liberar')
        console.log('\n3. Tentando Ação "Liberar"...');

        // Check validation manually to show user what happens
        const [check] = await connection.execute(
            "SELECT COUNT(*) as count FROM romaneioitem WHERE IdRomaneio = ?",
            [romaneioId]
        );
        const itemCount = check[0].count;
        console.log(`   -> Verificação: O romaneio tem ${itemCount} itens.`);

        if (itemCount > 0) {
            await connection.execute(
                "UPDATE romaneio SET Estatus = 'Liberado', Liberado = 'S', DataLiberacao = NOW(), UsuarioLiberacao = ? WHERE idRomaneio = ?",
                ['Sistema', romaneioId]
            );
            console.log('   -> Sucesso! Romaneio atualizado para "Liberado".');
        } else {
            console.log('   -> Erro: Validação falhou (Sem itens).');
        }

        // 4. Verify Final State
        console.log('\n4. Verificando Resultado Final...');
        const [finalRow] = await connection.execute(
            "SELECT idRomaneio, Descricao, Estatus, Liberado, DataLiberacao FROM romaneio WHERE idRomaneio = ?",
            [romaneioId]
        );
        console.table(finalRow);

        // Cleanup (Optional - remove test data)
        // await connection.execute("DELETE FROM romaneio WHERE idRomaneio = ?", [romaneioId]);
        // await connection.execute("DELETE FROM romaneioitem WHERE IdRomaneio = ?", [romaneioId]);
        // console.log('\n(Dados de teste limpos)');

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testReleaseFlow();
