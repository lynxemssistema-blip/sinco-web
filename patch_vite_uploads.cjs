const fs = require('fs');

let code = fs.readFileSync('frontend/vite.config.ts', 'utf8');

if (!code.includes("'/uploads':")) {
  code = code.replace(
    "'/api': {",
    "'/api': {\n        target: 'http://127.0.0.1:3000',\n        changeOrigin: true,\n        secure: false,\n      },\n      '/uploads': {"
  );
  fs.writeFileSync('frontend/vite.config.ts', code);
  console.log('Added /uploads proxy');
} else {
  console.log('/uploads proxy already exists');
}
