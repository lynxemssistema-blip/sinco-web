
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

    // Call original fetch with updated config
    return originalFetch(resource, config);
};
