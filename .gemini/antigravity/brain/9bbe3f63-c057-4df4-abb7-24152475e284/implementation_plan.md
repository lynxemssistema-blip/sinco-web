# Integração Avançada do Módulo "Plano de Corte"

Este documento descreve o plano técnico para portar a lógica VB.NET fornecida para a nova estrutura baseada em Node.js e React. O objetivo é assegurar o comportamento nativo (geração de nomes de pastas automáticas a partir do banco, abertura de pastas via `explorer` no Windows Server Local e o workflow de Liberação do Plano com cópias massivas de arquivos).

## User Review Required

> [!WARNING]
> **Atenção nas Cópias de Arquivos (Liberação de Plano)**
> Na rotina de Liberação (`Liberar Plano de Corte`), o VB.NET executa uma sequência usando `FerramentasGerais.ImportarArquivos` procurando pelas extensões (LXDS, DXF, DFT, PDF). No Node.js, não temos acesso direto ao `FerramentasGerais`. No plano de fundo, pretendo puxar o local original de cada Item do plano de corte usando a coluna `EnderecoArquivo` da respectiva OS e copiar os arquivos `.dxf`, `.pdf`, etc, para dentro da pasta do Plano de Corte. 
> 
> **PERGUNTA CRÍTICA:** Confirma se, durante a liberação, a nova pasta do plano de corte (ex: `G:\Meu Drive\03-Plano de Corte\PC_00001`) deve conter subpastas (`DXF`, `DFT`, `PDF`) onde os arquivos serão despejados, ou se eles vão todos jogados soltos na raiz dessa pasta do Plano de Corte?

## Proposed Changes

---

### Backend (Node.js)

#### [MODIFY] `src/server.js` (Lógica de Criação)
- Ao incluir itens em um *novo* plano (Rota `POST /api/plano-corte/incluir-itens`), a Engine precisará:
   1. Ler imediatamente `SELECT valor FROM configuracaosistema WHERE chave = 'Enderecoplanodecorte'` (ex: `G:\Meu Drive\03-Plano de Corte`).
   2. Após inserir e reservar o `IdPlanodecorte` novo (ex: 1), formar o nome formatado ex: `PC_00001` (com zeroes à esquerda), gerando a união: `G:\Meu Drive\03-Plano de Corte\PC_00001`.
   3. Gravar esta união diretamente na coluna `EnderecoCompletoPlanoCorte`.

#### [NEW] `src/server.js` (Rota de Liberação de Plano)
- Nova rota `POST /api/plano-corte/:id/liberar`.
   1. O servidor Node buscará o caminho em `EnderecoCompletoPlanoCorte`.
   2. Vai executar a limpeza local do diretório (apagando conteúdos velhos se existirem).
   3. Vai buscar todos os itens listados nesse `IdPlanodecorte`, extrair seus caminhos mestres originais na OS (`EnderecoArquivo`), varrer essas pastas originais atrás dos arquivos (`LXDS`, `DXF`, `DFT`, `PDF`), e **COPIAR** nativamente para dentro do servidor local na pasta recém-limpa do Plano de Corte.
   4. Atualiza o banco `planodecorte SET Enviadocorte = 'S', Concluido = ...`

---

### Frontend (React UI)

#### [MODIFY] `frontend/src/pages/MontagemPlanoCorte.tsx`
- **Condicionamento:** A interface de *SubItens do Plano* receberá dois ícones em destaque caso o plano de corte esteja carregado:
   - **Ícone "Abrir pasta Plano de Corte":** Acessa a API genérica de Explorer (já existente no app) mandando a string de endereço (ex: `"G:\..."`) e o servidor reagirá abrindo com o `Start Process Explorer` no Windows hospedeiro.
   - **Ícone "Liberar Plano de Corte":** Condicionado internamente a verificar se a flag da interface da tabela "Aglutinado" está habilitada e se `Enviadocorte` é deferente de `"S"`. Caso seja `"S"`, barramos via `Toast` na tela ("Plano selecionado já liberado!"). Caso contrário, lançamos modal "Você está liberando...?" que acionará o BackEnd criado acima.

## Open Questions

1. O script VB usa a extensão `.LXDS`. Existem considerações atípicas para ela, ou é só questão de copiar como um arquivo binário tradicional?
2. Precisaremos bloquear no banco caso falte algum desenho originário, repassando o "Aviso MsgBox" de diferença entre total vs matriz do DXF no Frontend? Posso programar o backend Node para cuspir avisos vermelhos na UI simulando aquele erro VB.

## Verification Plan
### Automated Tests
* N/A. Será testado massivamente direto pelo Front simulando plano novo.

### Manual Verification
1. Ao incluir itens OS, checar se a nova subpasta foi populada dentro da tabela.
2. Clicar em Abrir Pasta e confirmar se o Win Explorer do host espicha e foca na interface.
3. Testar a Liberação massivamente analisando as pastas de DXF geradas.
