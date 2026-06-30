# Refatoração da Seleção de Materiais e Processos (Grids 1 e 2)

Este plano aborda as alterações solicitadas para a tela de "Peça Manufaturada", tanto no modo de Criação (Tela 1) quanto no modo de Gestão/Composição (Tela 2).

## Proposed Changes

### Backend (Rotas da API)
Iremos modificar o arquivo de rotas `src/routes/pecaManufaturada.js` para flexibilizar as buscas de materiais:

#### [MODIFY] `src/routes/pecaManufaturada.js`
- **Rota `GET /desenhos-criar` (Grid 1 - Criação):**
  - **Remover** a restrição `AND (PecaManufat IS NULL OR TRIM(UPPER(PecaManufat)) != 'S')`.
  - Isso permitirá que todos os materiais (exceto excluídos) apareçam como base no Grid 1.
- **Rota `GET /materiais-criar` (Grid 2 - Criação):**
  - **Remover** a restrição `AND (EnderecoArquivo IS NULL OR EnderecoArquivo = '')`.
  - A restrição existente que exclui itens já inseridos e que não permite que a peça selecione a si mesma (`IdMaterial != idDesenho`) será mantida, cumprindo a regra de que o item do Grid 1 não pode ser selecionado no Grid 2.
- **Rota `GET /composicao/:idMaterialPeca` (Grid 1 - Gestão):**
  - **Adicionar** o campo `m.PecaManufat` na consulta SQL para que o frontend consiga identificar quais sub-itens da composição são, por si mesmos, peças manufaturadas (produtos).

---

### Frontend (Interface e Lógica)
Iremos modificar a interface para permitir a navegação entre recursos do produto principal e recursos de seus subprodutos.

#### [MODIFY] `frontend/src/pages/MontaPecaManufaturada.tsx`
- **Novo Estado `activeProcCode`:**
  - Será criado um estado para armazenar o código do material cujos processos (recursos) estão atualmente sendo exibidos no Grid 2. 
  - Quando o usuário selecionar o produto principal na barra de pesquisa, `activeProcCode` será igual ao código do produto principal.
- **Clique nos Itens da Composição (Grid 1 - Gestão):**
  - Adicionar um evento `onClick` (clique duplo ou botão de seleção) nas linhas dos insumos listados no Grid 1.
  - **Lógica de Clique:**
    - Se o item clicado tiver `PecaManufat === 'S'` (for um produto), o sistema chamará a função para exibir os processos **daquele subproduto** no Grid 2 (`activeProcCode` passará a ser o código do subproduto).
    - Caso contrário (se o item não for um produto), o sistema voltará a exibir os processos do **produto raiz** (o produto selecionado originalmente na barra superior).
- **Salvamento de Processos:**
  - A função `handleSave` dos recursos (Grid 2) será alterada para salvar os processos no código do item atualmente ativo (`activeProcCode`), evitando que os processos do subproduto sejam salvos indevidamente no produto principal.
- **Header do Grid 2:**
  - O título do Grid 2 será alterado para mostrar claramente a qual peça os processos pertencem (Ex: `Processos de Fabricação - [COD_DO_ITEM_ATIVO]`), garantindo que o usuário saiba em qual escopo está operando.

## User Review Required

> [!IMPORTANT]
> **Substituição de Processos no Grid 2**
> Como agora o usuário poderá clicar em um subproduto no Grid 1 e editar seus processos no Grid 2, toda a edição, inserção e exclusão acontecerão sobre aquele subproduto. O senhor confirma que a intenção é permitir a **edição completa** dos recursos (processos) do subproduto dentro da mesma tela de montagem do produto pai?

> [!WARNING]
> **Retorno ao Produto Principal**
> Quando o usuário estiver visualizando os recursos de um subproduto, e ele clicar em um "insumo comum" (que não é peça manufaturada), o Grid 2 voltará automaticamente para exibir os recursos do **produto pai (raiz)**. É exatamente este o comportamento desejado, correto?

## Verification Plan
1. Iniciar o modo "Criar Peça Manufaturada" e validar que **todos** os materiais aparecem no Grid 1 e no Grid 2 (excluindo si mesmo no Grid 2).
2. Na tela normal de Gestão, abrir a composição de uma peça.
3. Clicar em um sub-item que seja produto: validar se os recursos do Grid 2 são atualizados para os processos do sub-item, e se o cabeçalho mostra o código do sub-item.
4. Salvar um novo recurso no sub-item e checar no banco de dados se foi vinculado ao material correto.
5. Clicar em um sub-item que não seja produto e validar se o Grid 2 retorna os recursos do produto raiz.
