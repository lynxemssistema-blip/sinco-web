const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
let pool = null;

const dbConfig = {
  host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
  user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
  password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
  database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 50, // Increased for scalability
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 20000
};

const { AsyncLocalStorage } = require('async_hooks');
const asyncLocalStorage = new AsyncLocalStorage();

const pools = new Map(); // Store pools by dbName
let defaultPool = null;  // Keep track of the default/initial pool

// Initialize the pool
// Initialize the pool (Active pool logic refined)
const initPool = (config) => {
  try {
    const dbName = config.database;

    // Check if pool already exists for this DB
    if (pools.has(dbName)) {
      console.log(`[DB] Pool already exists for ${dbName}. Re-using.`);
      // Ensure default pool is set if this is the first one or explicitly requested?
      // For now, if we are "initing", we assume this might be the default for background tasks 
      // OR just adding to the roster.
      if (!defaultPool) defaultPool = pools.get(dbName);
      return true;
    }

    // Merge with defaults
    const newConfig = { ...dbConfig, ...config };

    const newPool = mysql.createPool(newConfig);
    pools.set(dbName, newPool);

    if (!defaultPool) {
      defaultPool = newPool;
      console.log(`[DB] Default Pool initialized with host: ${newConfig.host}, database: ${newConfig.database}`);
    } else {
      console.log(`[DB] Additional Pool initialized for: ${newConfig.database}`);
    }

    return true;
  } catch (error) {
    console.error('[DB] Failed to initialize pool:', error);
    return false;
  }
};

// Initial startup
initPool(dbConfig);

// Helper to get current pool based on context
const getPool = () => {
  const store = asyncLocalStorage.getStore();
  if (store && store.dbName) {
    // console.log(`[DB] getPool context: ${store.dbName}`);
  } else {
    // console.log(`[DB] getPool context: DEFAULT (No store or dbName)`);
  }

  if (store && store.dbName && pools.has(store.dbName)) {
    return pools.get(store.dbName);
  }
  return defaultPool;
};

// Initial startup
initPool(dbConfig);

// Wrapper for execute
const execute = async (sql, params) => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not initialized.');
  }

  // Debug logging & Performance tracking
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  // Only log in development or if it takes too long
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[DB] 🟡 EXEC: ${cleanSql}`);
    if (params && params.length > 0) {
      console.log(`[DB]    PARAMS: ${JSON.stringify(params)}`);
    }
  }

  try {
    const start = Date.now();
    const result = await pool.execute(sql, params);
    const duration = Date.now() - start;
    const rowCount = Array.isArray(result[0]) ? result[0].length : (result[0]?.affectedRows || 0);

    const store = asyncLocalStorage.getStore();
    const dbLabel = store?.dbName ? `[${store.dbName}]` : '[DEFAULT]';

    console.log(`[DB] ${dbLabel} 🟢 OK (${duration}ms) - Rows/Affected: ${rowCount}`);
    return result;
  } catch (err) {
    console.error(`[DB] 🔴 ERROR: ${err.message}`);
    console.error(err);
    throw err;
  }
};

// Wrappers for other pool methods to maintain compatibility
const getConnection = async () => {
  const pool = getPool();
  if (!pool) throw new Error('Database pool not initialized.');
  return pool.getConnection();
};

const query = async (...args) => {
  const pool = getPool();
  if (!pool) throw new Error('Database pool not initialized.');
  return pool.query(...args);
};

// Sync methods
const escape = (...args) => { const p = getPool(); return p ? p.escape(...args) : mysql.escape(...args); };
const format = (...args) => { const p = getPool(); return p ? p.format(...args) : mysql.format(...args); };

// Test specific connection config without affecting main pool
const testConnection = async (config) => {
  let tempPool = null;
  try {
    tempPool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });
    const [rows] = await tempPool.execute('SELECT 1 as val');
    return rows[0].val === 1;
  } catch (error) {
    console.error('[DB] Test connection failed:', error.message);
    throw error;
  } finally {
    if (tempPool) tempPool.end();
  }
};

// Execute always on the default/central pool (ignores tenant context)
const executeOnDefault = async (sql, params) => {
  if (!defaultPool) throw new Error('Default database pool not initialized.');
  const cleanSql = sql.replace(/\s+/g, ' ').trim();
  console.log(`\n[DB] 🔵 EXEC (DEFAULT): ${cleanSql}`);
  const result = await defaultPool.execute(sql, params);
  const rowCount = Array.isArray(result[0]) ? result[0].length : (result[0]?.affectedRows || 0);
  console.log(`[DB] [DEFAULT] 🟢 OK - Rows: ${rowCount}`);
  return result;
};

module.exports = {
  execute,
  executeOnDefault,
  query,
  getConnection,
  escape,
  format,
  initPool,
  hasPool: (name) => pools.has(name),
  testConnection,
  getConfig: () => ({ ...dbConfig }), // Return copy of current config
  asyncLocalStorage // Export for middleware
};
