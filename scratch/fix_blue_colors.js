const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'VisaoGeralEngenharia.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
    // Input focus rings
    ['focus:border-blue-500 focus:ring-1 focus:ring-blue-200', 'focus:border-[#32423D] focus:ring-1 focus:ring-[#32423D]/20'],
    ['focus:ring-1 focus:ring-blue-500', 'focus:ring-1 focus:ring-[#32423D]/40'],
    ['focus:border-blue-500', 'focus:border-[#32423D]'],
    // CalendarDays icon
    ['className="text-blue-500 shrink-0"', 'className="text-[#32423D] shrink-0"'],
    // Hover row highlight
    ["hover:bg-blue-50/50", 'hover:bg-[#E0E800]/10'],
    // Selected row
    ["selectedIds.has(t.IdTag) ? 'bg-blue-50'", "selectedIds.has(t.IdTag) ? 'bg-[#E0E800]/20'"],
    // Tags selected counter badge
    ['text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200', 'font-bold text-[#32423D] bg-[#E0E800]/40 px-2 py-0.5 rounded border border-[#E0E800]'],
    // Projetista column text
    ['text-ellipsis text-blue-800"', 'text-ellipsis text-[#32423D] font-semibold"'],
    // Link Baixar PDF
    ['text-blue-600 hover:text-blue-800 hover:underline flex-1 truncate font-medium"', 'text-[#32423D] hover:text-[#32423D]/70 hover:underline flex-1 truncate font-medium"'],
    // Label Associar isometrico
    ['cursor-pointer text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 font-medium bg-blue-50/50 px-1 py-0.5 rounded border border-blue-100/50"',
     'cursor-pointer text-[#32423D] hover:text-[#32423D]/70 flex items-center justify-center gap-1 font-medium bg-[#E0E800]/20 px-1 py-0.5 rounded border border-[#E0E800]/50"'],
];

let count = 0;
for (const [from, to] of replacements) {
    const before = content;
    content = content.split(from).join(to);
    if (content !== before) {
        console.log(`✅ Replaced: "${from.substring(0, 60)}..."`);
        count++;
    } else {
        console.log(`⚠️  Not found: "${from.substring(0, 60)}..."`);
    }
}

fs.writeFileSync(file, content, 'utf8');
console.log(`\nDone. ${count} replacements made.`);
