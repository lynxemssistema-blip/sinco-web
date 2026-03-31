const db = require('../config/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'SincoWebSecret2026!KeySecure';

const tenantMiddleware = async (req, res, next) => {
    // 1. Get Token from Authorization header
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Public routes that don't need tenant context (e.g., login)
    if (req.originalUrl === '/api/login' || req.originalUrl === '/api/admin/login' || req.originalUrl.startsWith('/api/public') || req.originalUrl.startsWith('/api/pdf') || req.originalUrl.startsWith('/api/download')) {
        return next();
    }

    if (!token) {
        console.warn(`[TenantMiddleware] No token provided for ${req.url}`);
        return res.status(401).json({ success: false, message: 'Autenticação necessária' });
    }

    try {
        // 2. Verify Token
        const decoded = jwt.verify(token, JWT_SECRET);
        const tenantDbName = decoded.dbName;

        if (!tenantDbName) {
            return res.status(403).json({ success: false, message: 'Contexto de banco de dados não encontrado no token' });
        }

        // 3. Check if we already have a pool for this tenant
        if (!db.hasPool(tenantDbName)) {
            const [rows] = await db.executeOnDefault(
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
                db.initPool(dbConfig);
                console.log(`[Tenant] Lazy-loaded pool for: ${tenantDbName}`);
            } else {
                if (tenantDbName !== process.env.CENTRAL_DB_NAME && tenantDbName !== 'lynxlocal') {
                    console.warn(`[Tenant] Requested DB '${tenantDbName}' from token not found in registry.`);
                }
            }
        }

        // 4. Run next() within the AsyncLocalStorage context
        db.asyncLocalStorage.run({ dbName: tenantDbName, user: decoded }, () => {
            next();
        });

    } catch (error) {
        console.error('[Tenant] Middleware JWT Error Details:', {
            name: error.name,
            message: error.message,
            tokenHeader: token ? token.substring(0, 20) + '...' : 'NONE'
        });
        return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada' });
    }
};

module.exports = tenantMiddleware;
