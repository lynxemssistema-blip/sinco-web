const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');

// Map MySQL types to PostgreSQL types
const typeMapping = {
    'int': 'integer',
    'tinyint': 'smallint',
    'smallint': 'smallint',
    'mediumint': 'integer',
    'bigint': 'bigint',
    'float': 'real',
    'double': 'double precision',
    'decimal': 'numeric',
    'date': 'date',
    'datetime': 'timestamp',
    'timestamp': 'timestamp',
    'time': 'time',
    'year': 'integer',
    'char': 'char',
    'varchar': 'text', // Supabase/Postgres handles text better than varchar(n) usually
    'text': 'text',
    'tinytext': 'text',
    'mediumtext': 'text',
    'longtext': 'text',
    'enum': 'text',
    'set': 'text',
    'binary': 'bytea',
    'varbinary': 'bytea',
    'blob': 'bytea',
    'tinyblob': 'bytea',
    'mediumblob': 'bytea',
    'longblob': 'bytea'
};

const mapType = (mysqlType) => {
    const baseType = mysqlType.split('(')[0].toLowerCase();
    return typeMapping[baseType] || 'text';
};

exports.testConnection = async (req, res) => {
    const { url, key } = req.body;
    try {
        const supabase = createClient(url, key);
        const { data, error } = await supabase.from('PG_TEST_CONNECTION').select('*').limit(1);

        // Error code PGRST204 (or similar message) means table not found, which is fine, it means we connected.
        // If connection failed, it would be a network error or 401.
        if (error) {
            // Check for common codes for "relation does not exist" or "schema cache"
            // 42P01: undefined_table
            // PGRST204: table not found in schema cache (Supabase specific)
            if (error.code === '42P01' || error.code === 'PGRST204' || error.message.includes('Could not find the table')) {
                // Connection successful, just table missing
                return res.json({ success: true, message: 'Conexão estabelecida com sucesso!' });
            }
            throw error;
        }

        res.json({ success: true, message: 'Conexão estabelecida com sucesso!' });
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(400).json({ success: false, message: 'Falha na conexão: ' + error.message });
    }
};

const { Client } = require('pg');

exports.migrate = async (req, res) => {
    const { url, key, password, createTables, migrateData, aiContext, llmApiKey } = req.body;

    // Setup format needed for EventSource / Streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message) => {
        console.log(`[MIGRATION] ${message}`);
        res.write(`data: ${JSON.stringify({ message })}\n\n`);
    };

    const sendError = (message) => {
        console.error(`[MIGRATION ERROR] ${message}`);
        res.write(`data: ${JSON.stringify({ message: `ERRO: ${message}` })}\n\n`);
    };

    try {
        if (aiContext) {
            sendLog(`--- CONTEXTO IA ATIVADO ---`);
            sendLog(`Instruções: "${aiContext.substring(0, 50)}..."`);
            if (llmApiKey) sendLog(`Agente Inteligente: ATIVO (Simulado)`);
            sendLog(`---------------------------`);
        }

        const supabase = createClient(url, key);

        // 1. Get all tables from MySQL (excluding Views)
        sendLog("Lendo esquema do MySQL...");
        const [tables] = await pool.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
        const tableNames = tables.map(t => Object.values(t)[0]);
        sendLog(`Encontradas ${tableNames.length} tabelas base.`);

        // --- PHASE 1: DDL (Create Tables) ---
        if (createTables) {
            if (!password) {
                sendError("Senha do banco não fornecida. Pulando criação de tabela (DDL).");
            } else {
                sendLog("Iniciando Fase 1: Criação de Tabelas (DDL) via Postgres...");

                // Extract Host and Db from URL (e.g. https://xyz.supabase.co -> db.xyz.supabase.co)
                // Default Supabase connection string format: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
                // OR direct: db.[ref].supabase.co

                const projectRef = url.split('//')[1].split('.')[0];
                const connectionString = `postgres://postgres.${projectRef}:${password}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;
                // Note: Region and port might vary. Best effort or ask user for full string. 
                // For this agent, we'll try the standard bounded connection.
                // Actually, let's try constructing it carefully.
                // A reliable way is asking the user for the connection string, but we only asked for password.
                // Let's assume standard direct connection: db.[ref].supabase.co:5432

                const pgClient = new Client({
                    host: `db.${projectRef}.supabase.co`,
                    port: 5432,
                    user: `postgres`,
                    password: password,
                    database: 'postgres',
                    ssl: { rejectUnauthorized: false } // Required for Supabase
                });

                try {
                    await pgClient.connect();
                    sendLog("Conectado ao Postgres com sucesso!");

                    for (const table of tableNames) {
                        sendLog(`Gerando DDL para tabela '${table}'...`);
                        const [columns] = await pool.query(`DESCRIBE \`${table}\``);

                        // Generate SQL
                        let createSql = `CREATE TABLE IF NOT EXISTS "${table}" (\n`;
                        const colDefs = columns.map(col => {
                            let type = mapType(col.Type);
                            let def = `  "${col.Field}" ${type}`;
                            if (col.Key === 'PRI') {
                                def += ' PRIMARY KEY';
                                if (type === 'integer' || type === 'bigint') {
                                    def += ' GENERATED BY DEFAULT AS IDENTITY';
                                }
                            }
                            // Nullable?
                            if (col.Null === 'NO' && col.Key !== 'PRI') { // Skip NOT NULL on PK to avoid conflicts with Identity
                                def += ' NOT NULL';
                            }
                            return def;
                        });
                        createSql += colDefs.join(',\n');
                        createSql += `\n);`;

                        // Execute
                        try {
                            // sendLog(`SQL: ${createSql}`);
                            await pgClient.query(createSql);
                            sendLog(`Tabela '${table}' verificada/criada no Supabase.`);
                        } catch (err) {
                            sendError(`Falha ao criar tabela '${table}': ${err.message}`);
                        }
                    }

                    await pgClient.end();
                    sendLog("Fase 1 (DDL) concluída.");

                } catch (pgErr) {
                    sendError(`Erro na conexão Postgres: ${pgErr.message}. Verifique a senha.`);
                }
            }
        }

        // --- PHASE 2: DATA MIGRATION ---
        if (migrateData) {
            sendLog("Iniciando Fase 2: Migração de Dados...");

            for (const table of tableNames) {
                // Fetch Data
                const [rows] = await pool.query(`SELECT * FROM \`${table}\``);

                if (rows.length > 0) {
                    sendLog(`Tabela '${table}': Migrando ${rows.length} registros...`);

                    const batchSize = 1000;
                    let successCount = 0;
                    let errorCount = 0;

                    for (let i = 0; i < rows.length; i += batchSize) {
                        const batch = rows.slice(i, i + batchSize);

                        // Clean data
                        const cleanedBatch = batch.map(row => {
                            const newRow = {};
                            for (const key in row) {
                                if (Buffer.isBuffer(row[key])) {
                                    newRow[key] = row[key][0];
                                } else {
                                    newRow[key] = row[key];
                                }
                            }
                            return newRow;
                        });

                        const { error } = await supabase.from(table).upsert(cleanedBatch);
                        if (error) {
                            errorCount += batch.length;
                            sendError(`Erro no lote ${i} da tabela ${table}: ${error.message}`);
                        } else {
                            successCount += batch.length;
                        }
                    }
                    sendLog(`Tabela '${table}': ${successCount} salvos, ${errorCount} erros.`);
                } else {
                    sendLog(`Tabela '${table}' vazia.`);
                }
            }
        }

        sendLog("Processo finalizado!");
        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error('Migration error:', error);
        sendError(`Erro Crítico: ${error.message}`);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
};
