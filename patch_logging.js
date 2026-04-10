const fs = require('fs');
const path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(path, 'utf8');

// Find and replace the logging middleware block (both CRLF and LF variants)
const startMarker = '// LOGGING MIDDLEWARE (Development)';
const endMarker = '// CORS - Allow React frontend';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `// LOGGING MIDDLEWARE (dev verbose, prod quiet)
app.use((req, res, next) => {
    const start = Date.now();
    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
        console.log('\\n[API] ' + req.method + ' ' + req.url);
        if (Object.keys(req.query).length > 0) {
            console.log('[API]    QUERY: ' + JSON.stringify(req.query));
        }
        if (req.body && Object.keys(req.body).length > 0) {
            const safeBody = { ...req.body };
            Object.keys(safeBody).forEach(key => {
                if (typeof safeBody[key] === 'string' && safeBody[key].length > 200) {
                    safeBody[key] = safeBody[key].substring(0, 50) + '... [TRUNCATED]';
                }
            });
            console.log('[API]    BODY: ' + JSON.stringify(safeBody));
        }
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        if (isProd) {
            if (duration > 500 || res.statusCode >= 400) {
                console.log('[API] ' + res.statusCode + ' ' + req.method + ' ' + req.url + ' (' + duration + 'ms)');
            }
        } else {
            console.log('[API] ' + res.statusCode + ' (' + duration + 'ms)');
        }
    });

    next();
});

`;

    const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('T3: Logging middleware patched successfully');
} else {
    console.log('Could not find markers. startIdx=' + startIdx + ' endIdx=' + endIdx);
}
