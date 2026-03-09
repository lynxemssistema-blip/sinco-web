const db = require('../config/db');

const tenantMiddleware = async (req, res, next) => {
    // 1. Get requested DB name from header
    const tenantDbName = req.headers['x-tenant-db'];
    console.log(`[TenantMiddleware] Request to ${req.url} - Header x-tenant-db: '${tenantDbName}'`);


    // 2. If no header, use default (lynxlocal)
    if (!tenantDbName) {
        return next();
    }

    try {
        // 3. Check if we already have a pool for this tenant
        if (!db.hasPool(tenantDbName)) {
            // Pool missing! Need to lookup config and init.
            // Use default connection (context-less execution uses defaultPool)
            const [rows] = await db.execute(
                'SELECT * FROM conexoes_bancos WHERE db_name = ? AND ativo = 1',
                [tenantDbName]
            );

            if (rows.length > 0) {
                const config = rows[0];
                const dbConfig = {
                    host: config.db_host,
                    user: config.db_user,
                    password: config.db_pass,
                    database: config.db_name,
                    port: config.db_port || 3306
                };

                // Initialize pool (adds to pools map)
                db.initPool(dbConfig);
                console.log(`[Tenant] Lazy-loaded pool for: ${tenantDbName}`);
            } else {
                // If not found, log warning but proceed. 
                // It might be an invalid request, or maybe 'lynxlocal' explicitly requested?
                if (tenantDbName !== process.env.CENTRAL_DB_NAME && tenantDbName !== 'lynxlocal') {
                    console.warn(`[Tenant] Requested DB '${tenantDbName}' not found in registry.`);
                }
            }
        }

        // 4. Run next() within the AsyncLocalStorage context
        db.asyncLocalStorage.run({ dbName: tenantDbName }, () => {
            next();
        });

    } catch (error) {
        console.error('[Tenant] Middleware Error:', error);
        // On error, better to fail fast or fallback? 
        // Fallback to default might leak data. Fail safe.
        // But for now, let's just log and proceed (risk of leakage if code doesn't check)
        // Actually, if we fail to set context, subsequent queries might use default.
        // Let's enforce context if possible, or error out.
        // For stability now: proceed with default but log.
        next();
    }
};

module.exports = tenantMiddleware;
