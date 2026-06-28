const fs = require('fs');
const content = fs.readFileSync('lint_pages_report.txt', 'utf8');
const noAnsi = content.replace(/\u001b\[.*?m/g, '');

const lines = noAnsi.split(/\r?\n/);
const report = [];
let currentFile = null;
let currentErrors = 0;
let currentWarnings = 0;

for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('src\\pages\\') && trimmed.includes('.tsx')) {
        if (currentFile) {
            report.push({ file: currentFile, errors: currentErrors, warnings: currentWarnings, total: currentErrors + currentWarnings });
        }
        currentFile = trimmed.split('\\').pop();
        currentErrors = 0;
        currentWarnings = 0;
    } else if (trimmed.includes('error  ') || trimmed.includes('error\t')) {
        currentErrors++;
    } else if (trimmed.includes('warning  ') || trimmed.includes('warning\t')) {
        currentWarnings++;
    }
}
if (currentFile) {
    report.push({ file: currentFile, errors: currentErrors, warnings: currentWarnings, total: currentErrors + currentWarnings });
}

report.sort((a, b) => b.total - a.total);

let md = `# Plano de Implementação: Refatoração ESLint (Fase 3)\n\n## Objetivo\nLimpar o débito técnico (ESLint) das demais páginas do sistema de forma segura, garantindo a estabilidade estrutural do código (zero quebras de sintaxe).\n\n## Análise\nEncontramos erros de Lint em ${report.length} páginas do sistema.\n\n### Top 15 Arquivos com Mais Problemas:\n`;
const top = report.slice(0, 15);

top.forEach(t => {
    md += `- **${t.file}**: ${t.total} problemas (${t.errors} erros, ${t.warnings} avisos)\n`;
});

md += `\n## Estratégia de Correção\n\nComo aprendemos com o \`OrdemServico.tsx\`, realizar substituições em massa usando scripts arriscados em arquivos monolíticos pode causar quebras de sintaxe e corrupção de variáveis. A nossa estratégia será cirúrgica e segura:\n\n1. **Correções Seguras de Tipagem (\`any\`)**: Substituição de \`catch (e: any)\` por \`catch\` e de \`(item: any)\` por \`(item: unknown)\` usando Regex estrito que garante o não-rompimento de blocos.\n2. **Resolução de \`exhaustive-deps\`**: Utilização do comando nativo \`npx eslint --fix\` onde aplicável, e supressão manual (\`// eslint-disable-next-line\`) para \`useEffect\`s cujo array de dependências é arquiteturalmente intencional (para evitar *loops* infinitos na API).\n3. **Sanitização Manual (\`unused-vars\`)**: Variáveis não utilizadas serão comentadas de forma segura (ex: \`// const [var, setVar] = useState\`) ou removidas das listas de \`import\` em vez de tentar deletar os blocos de funções inteiras por automação cega.\n4. **Foco por Lotes (Top 3)**: Atacaremos os arquivos em lotes (começando pelos 3 piores ofensores da lista acima). Após cada lote, rodaremos o \`npm run build\` para garantir ausência de regressões.\n\n## Execução\nSe aprovado, iniciarei imediatamente a limpeza dos 3 primeiros arquivos da lista acima, usando os *scripts* de refatoração seguros que criei na sessão anterior.\n`;

fs.writeFileSync('lint_summary.md', md);
