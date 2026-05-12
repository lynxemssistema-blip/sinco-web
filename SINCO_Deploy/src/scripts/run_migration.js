/**
 * Script de execução de migrations SQL
 * Executa migrations do diretório src/migrations
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../config/db');

async function runMigration(migrationFile) {
    console.log(`\n📋 Executando migration: ${migrationFile}`);

    try {
        const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
        const sqlContent = await fs.readFile(migrationPath, 'utf8');

        // Remove comentários SQL antes de dividir
        const cleanedSql = sqlContent
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 0 && !trimmed.startsWith('--');
            })
            .join('\n');

        // Divide SQL em statements (separados por ;)
        const statements = cleanedSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`   Encontrados ${statements.length} statements SQL\n`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            if (statement.length === 0) continue;

            console.log(`   ⚙️  Executando statement ${i + 1}/${statements.length}...`);

            try {
                const [result] = await db.execute(statement);

                // Mostra resultado se for SELECT
                if (statement.trim().toUpperCase().startsWith('SELECT')) {
                    console.log(`   ✅ Resultado:`, result);
                } else {
                    console.log(`   ✅ OK`);
                }
            } catch (err) {
                console.error(`   ❌ Erro no statement ${i + 1}:`, err.message);
                throw err;
            }
        }

        console.log(`\n✅ Migration ${migrationFile} executada com sucesso!`);
        return true;
    } catch (error) {
        console.error(`\n❌ Erro ao executar migration ${migrationFile}:`, error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Iniciando execução de migrations...\n');

    try {
        // Lista migrations a executar (em ordem)
        const migrations = [
            '001_create_configuracaosistema.sql'
        ];

        for (const migration of migrations) {
            await runMigration(migration);
        }

        console.log('\n🎉 Todas as migrations foram executadas com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('\n💥 Falha na execução das migrations:', error);
        process.exit(1);
    }
}

// Executa se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { runMigration };
