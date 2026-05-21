const db = require('./src/config/db');

async function createTriggers() {
    try {
        console.log('Creating triggers...');

        const tables = ['material', 'ordemservicoitem', 'reposicaopecas'];

        for (const table of tables) {
            // Drop existing triggers if any
            await db.query(`DROP TRIGGER IF EXISTS ${table}_before_insert_enderecoarquivo`);
            await db.query(`DROP TRIGGER IF EXISTS ${table}_before_update_enderecoarquivo`);

            // Create BEFORE INSERT trigger
            const insertTrigger = `
                CREATE TRIGGER ${table}_before_insert_enderecoarquivo
                BEFORE INSERT ON ${table}
                FOR EACH ROW
                BEGIN
                    IF NEW.EnderecoArquivo IS NOT NULL THEN
                        SET NEW.EnderecoArquivo = UPPER(NEW.EnderecoArquivo);
                    END IF;
                END;
            `;
            await db.query(insertTrigger);
            console.log(`Trigger BEFORE INSERT created for ${table}`);

            // Create BEFORE UPDATE trigger
            const updateTrigger = `
                CREATE TRIGGER ${table}_before_update_enderecoarquivo
                BEFORE UPDATE ON ${table}
                FOR EACH ROW
                BEGIN
                    IF NEW.EnderecoArquivo IS NOT NULL THEN
                        SET NEW.EnderecoArquivo = UPPER(NEW.EnderecoArquivo);
                    END IF;
                END;
            `;
            await db.query(updateTrigger);
            console.log(`Trigger BEFORE UPDATE created for ${table}`);
        }

        console.log('All triggers created successfully.');
    } catch (e) {
        console.error('Error creating triggers:', e);
    } finally {
        process.exit();
    }
}

createTriggers();
