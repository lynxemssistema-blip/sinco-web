
// Monkey-patch window.fetch to inject x-tenant-db header
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    let [resource, config] = args;

    // Load user from localStorage
    const storedUser = localStorage.getItem('sinco_user');
    let dbName = null;

    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user && user.dbName) {
                dbName = user.dbName;
            }
        } catch (e) {
            // Ignore parse error
        }
    }

    if (dbName) {
        if (!config) {
            config = {};
        }
        if (!config.headers) {
            config.headers = {};
        }

        // Add header if not already present
        // Handle headers being Headers object or plain object
        if (config.headers instanceof Headers) {
            if (!config.headers.has('x-tenant-db')) {
                config.headers.append('x-tenant-db', dbName);
            }
        } else {
            // Plain object
            // @ts-ignore
            if (!config.headers['x-tenant-db']) {
                // @ts-ignore
                config.headers['x-tenant-db'] = dbName;
            }
        }
    }

    // Call original fetch with updated config
    return originalFetch(resource, config);
};
