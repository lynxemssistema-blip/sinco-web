const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/import \{ motion, useAnimation \} from 'framer-motion';/g, 'import { motion } from "framer-motion";');
code = code.replace(/CheckCircle2, /g, '');
code = code.replace(/import \{ cn \} from '\.\.\/lib\/cn';\r?\n/g, '');

fs.writeFileSync(filePath, code);
console.log('Fixed Dashboard 3');
