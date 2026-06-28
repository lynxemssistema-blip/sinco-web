# Plano de Implementação: Refatoração ESLint (Fase 3)

## Objetivo
Limpar o débito técnico (ESLint) das demais páginas do sistema de forma segura, garantindo a estabilidade estrutural do código (zero quebras de sintaxe).

## Análise
Encontramos erros de Lint em 0 páginas do sistema.

### Top 15 Arquivos com Mais Problemas:

## Estratégia de Correção

Como aprendemos com o `OrdemServico.tsx`, realizar substituições em massa usando scripts arriscados em arquivos monolíticos pode causar quebras de sintaxe e corrupção de variáveis. A nossa estratégia será cirúrgica e segura:

1. **Correções Seguras de Tipagem (`any`)**: Substituição de `catch (e: any)` por `catch` e de `(item: any)` por `(item: unknown)` usando Regex estrito que garante o não-rompimento de blocos.
2. **Resolução de `exhaustive-deps`**: Utilização do comando nativo `npx eslint --fix` onde aplicável, e supressão manual (`// eslint-disable-next-line`) para `useEffect`s cujo array de dependências é arquiteturalmente intencional (para evitar *loops* infinitos na API).
3. **Sanitização Manual (`unused-vars`)**: Variáveis não utilizadas serão comentadas de forma segura (ex: `// const [var, setVar] = useState`) ou removidas das listas de `import` em vez de tentar deletar os blocos de funções inteiras por automação cega.
4. **Foco por Lotes (Top 3)**: Atacaremos os arquivos em lotes (começando pelos 3 piores ofensores da lista acima). Após cada lote, rodaremos o `npm run build` para garantir ausência de regressões.

## Execução
Se aprovado, iniciarei imediatamente a limpeza dos 3 primeiros arquivos da lista acima, usando os *scripts* de refatoração seguros que criei na sessão anterior.
