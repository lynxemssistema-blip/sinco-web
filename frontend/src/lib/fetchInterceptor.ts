
// Monkey-patch window.fetch to inject x-tenant-db header
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    let [resource, config] = args;
    console.log('[FETCH INTERCEPTOR] Intercepting fetch to:', resource);

    // Load token from localStorage
    const token = localStorage.getItem('sinco_token') || localStorage.getItem('superadmin_token');

    // Prevent sending literal "undefined" or "null" strings
    if (token && token !== 'undefined' && token !== 'null') {
        if (!config) {
            config = {};
        }
        if (!config.headers) {
            config.headers = {};
        }

        const authValue = `Bearer ${token}`;

        // Add Authorization header
        if (config.headers instanceof Headers) {
            if (!config.headers.has('Authorization')) {
                config.headers.append('Authorization', authValue);
            }
        } else {
            // @ts-ignore
            if (!config.headers['Authorization']) {
                // @ts-ignore
                config.headers['Authorization'] = authValue;
            }
        }
    }

    // Add global record limit (MaxRegistros) to all GET requests to /api/
    if ((typeof resource === 'string' && resource.includes('/api/') && (!config || !config.method || config.method.toUpperCase() === 'GET'))) {
        const urlObj = new URL(resource, window.location.origin);
        if (!urlObj.searchParams.has('limit')) {
            const maxReg = localStorage.getItem('sinco_maxRegistros') || '500';
            urlObj.searchParams.set('limit', maxReg);
            resource = urlObj.pathname + urlObj.search;
        }
    }

    // Call original fetch with updated config
    return originalFetch(resource, config);
};
