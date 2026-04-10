const fs = require('fs');
const path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(path, 'utf8');

// ---- T5+T6+T10: Add import lines ----
const oldImports = `const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
const pool = require('./config/db');
const tenantMiddleware = require('./middleware/tenant');
const matrizRoutes = require('./routes/matrizRoutes');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { exec } = require('child_process');
const jwt = require('jsonwebtoken');`;

const newImports = `const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const pool = require('./config/db');
const tenantMiddleware = require('./middleware/tenant');
const matrizRoutes = require('./routes/matrizRoutes');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const multer = require('multer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { exec } = require('child_process');
const jwt = require('jsonwebtoken');`;

if (content.indexOf(oldImports) !== -1) {
    content = content.replace(oldImports, newImports);
    console.log('T5/T6/T10 imports: added compression, helmet, rateLimit');
} else {
    // Try with CRLF
    const oldCRLF = oldImports.split('\n').join('\r\n');
    if (content.indexOf(oldCRLF) !== -1) {
        content = content.replace(oldCRLF, newImports);
        console.log('T5/T6/T10 imports (CRLF): added compression, helmet, rateLimit');
    } else {
        console.log('Could not find imports block to patch');
    }
}

// ---- T5+T6+T10: Register middleware after "// Middleware" line ----
const middlewareSection = `// Middleware\r\napp.use(express.json({ limit: '50mb' }));\r\napp.use(express.urlencoded({ limit: '50mb', extended: true }));`;
const middlewareSectionLF = `// Middleware\napp.use(express.json({ limit: '50mb' }));\napp.use(express.urlencoded({ limit: '50mb', extended: true }));`;

const newMiddlewareSection = `// Middleware\r\napp.use(compression()); // T5: GZIP compression for all responses\r\napp.use(helmet({ contentSecurityPolicy: false })); // T6: Security headers\r\napp.use(express.json({ limit: '10mb' })); // T8: reduced body limit (was 50mb - unrealistic)\r\napp.use(express.urlencoded({ limit: '10mb', extended: true }));\r\n\r\n// T10: Rate limiter for login route\r\nconst loginLimiter = rateLimit({\r\n    windowMs: 15 * 60 * 1000, // 15 minutes\r\n    max: 20, // 20 attempts per IP per window\r\n    message: { success: false, message: 'Muitas tentativas. Aguarde 15 minutos.' },\r\n    standardHeaders: true,\r\n    legacyHeaders: false\r\n});`;

if (content.indexOf(middlewareSection) !== -1) {
    content = content.replace(middlewareSection, newMiddlewareSection);
    console.log('T5/T6/T8/T10 middleware: registered compression, helmet, rate limiter, fixed body limit');
} else if (content.indexOf(middlewareSectionLF) !== -1) {
    content = content.replace(middlewareSectionLF, newMiddlewareSection);
    console.log('T5/T6/T8/T10 middleware (LF): registered compression, helmet, rate limiter, fixed body limit');
} else {
    console.log('Could not find middleware section. Trying partial match...');
    const partialMarker = `app.use(express.json({ limit: '50mb' }));`;
    const idx = content.indexOf(partialMarker);
    console.log('Partial marker found at idx:', idx);
}

// ---- T10: Add rate-limit to login route ----
const loginRouteMarker = `app.post('/api/login',`;
const loginRouteNew = `app.post('/api/login', loginLimiter,`;
if (content.indexOf(loginRouteMarker) !== -1 && content.indexOf(loginRouteNew) === -1) {
    content = content.replace(loginRouteMarker, loginRouteNew);
    console.log('T10: Rate limiter applied to /api/login route');
} else {
    console.log('Login route marker not found or already patched');
}

fs.writeFileSync(path, content, 'utf8');
console.log('All server.js patches written successfully');
