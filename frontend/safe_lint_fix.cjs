const fs = require('fs');
const { execSync } = require('child_process');

if (process.argv.length < 3) {
    console.error('Usage: node safe_lint_fix.cjs <file_path>');
    process.exit(1);
}

const targetFile = process.argv[2];
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Safe regex replacements for "any"
code = code.replace(/catch \(err: any\)/g, 'catch (_err: unknown)');
code = code.replace(/catch \(e: any\)/g, 'catch (_e: unknown)');
code = code.replace(/catch \(error: any\)/g, 'catch (_error: unknown)');
code = code.replace(/error: any;/g, 'error: unknown;');
code = code.replace(/errorInfo: any;/g, 'errorInfo: unknown;');
code = code.replace(/\(item: any\)/g, '(item: unknown)');
code = code.replace(/\(os: any\)/g, '(os: unknown)');
code = code.replace(/\(f: any\)/g, '(f: unknown)');
code = code.replace(/\(event: any\)/g, '(event: unknown)');
code = code.replace(/\(e: any\)/g, '(e: unknown)');

// 2. Unused standard states
code = code.replace(/const \[expandedOrdens, setExpandedOrdens\]/g, '// const [expandedOrdens, setExpandedOrdens]');
code = code.replace(/const \[tags, setTags\]/g, 'const [, setTags]');
code = code.replace(/const \[projetos, setProjetos\]/g, 'const [, setProjetos]');

fs.writeFileSync(targetFile, code);

// 3. Run ESLint auto-fix on the file
try {
    execSync(`npx eslint ${targetFile} --fix`, { stdio: 'inherit' });
} catch (e) {
    // We expect eslint to throw if there are remaining errors.
}

console.log(`Basic fixes applied to ${targetFile}`);
