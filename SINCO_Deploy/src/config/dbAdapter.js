const mysqlPool = require('./db');
const { Pool } = require('pg');

let activeDB = 'mysql'; // 'mysql' | 'postgres'
let pgPool = null;

const dbAdapter = {
    // Switch active database
    setActive: async (db, config = null) => {
        console.log(`[DB ADAPTER] Switching to ${db}...`);
        activeDB = db;

        if (db === 'postgres' && config) {
            // Check if we need to create a new pool
            if (pgPool) {
                await pgPool.end();
            }

            // Config expects: user, host, database, password, port, ssl
            pgPool = new Pool(config);

            // Test connection
            try {
                const client = await pgPool.connect();
                console.log('[DB ADAPTER] Connected to Postgres successfully');
                client.release();
            } catch (err) {
                console.error('[DB ADAPTER] Failed to connect to Postgres:', err);
                activeDB = 'mysql'; // Fallback
                throw err;
            }
        }
    },

    getActive: () => activeDB,

    // Get a connection from the pool (for transactions or direct usage)
    getConnection: async () => {
        if (activeDB === 'mysql') {
            return mysqlPool.getConnection();
        } else {
            if (!pgPool) throw new Error("Postgres connection not configured.");
            const client = await pgPool.connect();

            // Compatibility shim for 'ping' which might be called
            if (!client.ping) {
                client.ping = async () => {
                    await client.query('SELECT 1');
                };
            }
            return client;
        }
    },

    // Main execution method (matches mysql2 interface)
    execute: async (sql, params) => {
        if (activeDB === 'mysql') {
            return mysqlPool.execute(sql, params);
        } else {
            return dbAdapter.executePg(sql, params);
        }
    },

    // Query method (matches mysql2 interface)
    query: async (sql, params) => {
        if (activeDB === 'mysql') {
            return mysqlPool.query(sql, params);
        } else {
            return dbAdapter.executePg(sql, params);
        }
    },

    // Postgres execution logic with query transformation
    executePg: async (sql, params) => {
        if (!pgPool) throw new Error("Postgres connection not configured.");

        // 1. Convert Parameters (? -> $1, $2, etc.)
        let paramIndex = 1;
        let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

        // 2. Convert Backticks to Double Quotes (Identifier quoting)
        pgSql = pgSql.replace(/`/g, '"');

        // 3. Handle INSERT return values (MySQL returns insertId via metadata, PG needs RETURNING)
        const isInsert = /^\s*INSERT/i.test(pgSql);
        if (isInsert) {
            // Append RETURNING * to get the generated ID
            if (!pgSql.includes('RETURNING')) {
                pgSql += ' RETURNING *';
            }
        }

        try {
            const result = await pgPool.query(pgSql, params);

            // Normalize Result to match [rows, fields] signature from mysql2

            if (isInsert) {
                // Emulate MySQL ResultSetHeader
                let insertId = 0;
                if (result.rows.length > 0) {
                    const firstRow = result.rows[0];
                    const firstKey = Object.keys(firstRow)[0]; // Assume first column is ID
                    const val = firstRow[firstKey];
                    // If it looks like an ID (integer)
                    if (Number.isInteger(Number(val))) {
                        insertId = Number(val);
                    }
                }

                const resultSetHeader = {
                    insertId: insertId,
                    affectedRows: result.rowCount,
                    info: '',
                };
                return [resultSetHeader, null];
            }

            if (/^\s*(UPDATE|DELETE)/i.test(pgSql)) {
                // Return packet for Update/Delete
                const resultSetHeader = {
                    affectedRows: result.rowCount,
                    insertId: 0,
                    info: ''
                };
                return [resultSetHeader, null];
            }

            // Select queries: just return rows
            return [result.rows, result.fields];

        } catch (err) {
            console.error('[DB ADAPTER] Postgres Query Error:', err.message);
            console.error('SQL:', pgSql);
            throw err;
        }
    }
};

module.exports = dbAdapter;
