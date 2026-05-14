/**
 * fix_blue_system.js
 * Substitui cores azuis de botões/interação pelo padrão verde/amarelo do sistema.
 * Preserva azuis semânticos (setor Medição, links externos, tags de status específicas).
 */
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '..', 'frontend', 'src', 'pages');
const LIB_DIR   = path.join(__dirname, '..', 'frontend', 'src', 'components');

// ─────────────────────────────────────────────────────────────────
// REGRAS DE SUBSTITUIÇÃO
// Ordem importa: mais específicas primeiro.
// ─────────────────────────────────────────────────────────────────
const RULES = [
    // ── Botões primários (ação principal) ──────────────────────
    ['bg-blue-600 text-white',             'bg-[#32423D] text-white'],
    ['bg-blue-600 hover:bg-blue-700',      'bg-[#32423D] hover:bg-[#32423D]/80'],
    ['hover:bg-blue-700',                  'hover:bg-[#32423D]/80'],
    ['hover:bg-blue-600',                  'hover:bg-[#32423D]'],
    ['bg-blue-600',                        'bg-[#32423D]'],
    ['bg-blue-700',                        'bg-[#32423D]/90'],

    // ── Foco de inputs/selects ──────────────────────────────────
    ['focus:border-blue-500 focus:ring-1 focus:ring-blue-200', 'focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20'],
    ['focus:border-blue-400 focus:ring-1 focus:ring-blue-200', 'focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20'],
    ['focus:border-blue-400',              'focus:border-[#32423D]'],
    ['focus:border-blue-500',              'focus:border-[#32423D]'],
    ['focus:ring-blue-500',               'focus:ring-[#32423D]/40'],
    ['focus:ring-blue-400',               'focus:ring-[#32423D]/30'],
    ['focus:ring-blue-200',               'focus:ring-[#32423D]/20'],
    ['focus:ring-2 focus:ring-blue-500',  'focus:ring-2 focus:ring-[#32423D]'],
    ['ring-blue-500',                     'ring-[#32423D]'],

    // ── Bordas azuis (não semânticas) ──────────────────────────
    ['border-blue-400',                   'border-[#32423D]/40'],
    ['border-blue-500',                   'border-[#32423D]'],
    ['border-blue-600',                   'border-[#32423D]'],

    // ── Hover/selected backgrounds ──────────────────────────────
    ['hover:bg-blue-50/50',               'hover:bg-[#E0E800]/10'],
    ['hover:bg-blue-50',                  'hover:bg-[#E0E800]/10'],
    ['hover:bg-blue-100',                 'hover:bg-[#E0E800]/20'],

    // ── Texto em botões/badges/links interativos ────────────────
    ['bg-blue-600 text-white hover:bg-blue-700', 'bg-[#32423D] text-white hover:bg-[#32423D]/80'],

    // ── Badges / contadores com fundo azul leve ────────────────
    ['bg-blue-50 text-blue-700',          'bg-[#E0E800]/30 text-[#32423D]'],
    ['bg-blue-50 text-blue-600',          'bg-[#E0E800]/30 text-[#32423D]'],
    ['bg-blue-100 text-blue-700',         'bg-[#E0E800]/40 text-[#32423D]'],
    ['bg-blue-100 text-blue-800',         'bg-[#E0E800]/40 text-[#32423D]'],

    // ── Rows selecionadas ───────────────────────────────────────
    ["? 'bg-blue-50'",                    "? 'bg-[#E0E800]/20'"],
    ["'bg-blue-50'",                      "'bg-[#E0E800]/20'"],

    // ── Texto de ação (botões sem fundo azul, link-style) ──────
    ['text-blue-600 hover:text-blue-800 hover:underline', 'text-[#32423D] hover:text-[#32423D]/70 hover:underline'],
    ['text-blue-600 hover:text-blue-700', 'text-[#32423D] hover:text-[#32423D]/70'],
    ['text-blue-600 hover:text-blue-800', 'text-[#32423D] hover:text-[#32423D]/70'],
    ['hover:text-blue-700',              'hover:text-[#32423D]/70'],
    ['hover:text-blue-600',              'hover:text-[#32423D]'],
    ['hover:text-blue-800',              'hover:text-[#32423D]/70'],

    // ── Ícones e textos azuis ───────────────────────────────────
    ['text-blue-500',                    'text-[#32423D]'],
    ['text-blue-600',                    'text-[#32423D]'],
    ['text-blue-700',                    'text-[#32423D]'],

    // ── Fundo leve sem outro qualificador ──────────────────────
    ['bg-blue-50/50',                    'bg-[#E0E800]/10'],
    ['bg-blue-50',                       'bg-[#E0E800]/20'],
    ['bg-blue-100/50',                   'bg-[#E0E800]/20'],
];

// ─────────────────────────────────────────────────────────────────
// PROTEÇÕES: linhas que NUNCA devem ser alteradas.
// (setor Medição em VisaoGeralEngenharia, cores semânticas fixas)
// ─────────────────────────────────────────────────────────────────
const PROTECT_PATTERNS = [
    // Medicao sector colors
    "bg-blue-100 text-blue-900 border-blue-200",
    "bg-blue-50 text-blue-800 border-blue-200",
    "text-blue-800 hover:bg-blue-100/50",
    "bg-blue-900",
    "tooltipBg = 'bg-blue-900'",
    "colorClass = 'text-blue-800",
    // Tailwind config / CSS vars
    "--color-",
    "@theme",
    // Comments
    "// blue",
    "/* blue",
    "Medicao",
];

function shouldProtectLine(line) {
    return PROTECT_PATTERNS.some(p => line.includes(p));
}

function processFile(filePath) {
    const original = fs.readFileSync(filePath, 'utf8');
    const lines = original.split('\n');
    let changed = 0;

    const processed = lines.map(line => {
        if (shouldProtectLine(line)) return line;

        let newLine = line;
        for (const [from, to] of RULES) {
            if (newLine.includes(from)) {
                newLine = newLine.split(from).join(to);
            }
        }
        if (newLine !== line) changed++;
        return newLine;
    });

    if (changed > 0) {
        fs.writeFileSync(filePath, processed.join('\n'), 'utf8');
        return changed;
    }
    return 0;
}

function walkDir(dir, ext = ['.tsx', '.ts']) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkDir(full, ext));
        } else if (ext.some(e => entry.name.endsWith(e))) {
            files.push(full);
        }
    }
    return files;
}

const dirs = [
    path.join(__dirname, '..', 'frontend', 'src', 'pages'),
    path.join(__dirname, '..', 'frontend', 'src', 'components'),
    path.join(__dirname, '..', 'frontend', 'src', 'layout'),
    path.join(__dirname, '..', 'frontend', 'src', 'lib'),
];

let totalFiles = 0, totalLines = 0;
for (const dir of dirs) {
    const files = walkDir(dir);
    for (const f of files) {
        const n = processFile(f);
        if (n > 0) {
            console.log(`✅ ${path.relative(process.cwd(), f)}  (${n} linha(s))`);
            totalFiles++;
            totalLines += n;
        }
    }
}

console.log(`\n🎨 Concluído: ${totalFiles} arquivo(s) | ${totalLines} linha(s) alterada(s).`);
