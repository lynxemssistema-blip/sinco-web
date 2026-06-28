# Índice de Arquitetura do Frontend (SincoWeb)

Este documento serve como um mapa do frontend React da aplicação SincoWeb. O objetivo é registrar o processo de modularização das páginas gigantes (monolíticas) e prover um guia rápido para encontrar arquivos e componentes.

## Padrão Arquitetural

* **Pages (`frontend/src/pages/`)**: Contêm os **Container Components**. Estes arquivos são os pontos de entrada das rotas (`App.tsx`). A responsabilidade primária de uma *Page* é buscar dados (fetch), gerenciar o estado global daquela visão, e repassar dados e callbacks via *props* para seus componentes filhos.
* **Components (`frontend/src/components/<NomeDaPagina>/`)**: Contêm os componentes visuais e modais extraídos das páginas. Estes componentes devem ser o mais puros possível (recebendo dados via *props*), evitando acoplamento direto com as chamadas de API, exceto quando estritamente necessário (ex: buscas dinâmicas dentro de um modal).

---

## 🗺️ Mapa de Componentização (Em andamento)

Abaixo está o registro das páginas que estão sendo/foram divididas.

### 1. Ordem de Serviço (`/ordem-servico`)
**Container:** `frontend/src/pages/OrdemServico.tsx`
**Componentes Isolados (`frontend/src/components/OrdemServico/`):**
* *(Planejado)* `OrdemServicoTable.tsx`: Tabela principal de exibição.
* *(Planejado)* `CreateOrdemServicoModal.tsx`: Modal para criação.
* *(Planejado)* `EditOrdemServicoModal.tsx`: Modal para edição.

### 2. Visão Geral Produção (`/visao-geral-producao`)
**Container:** `frontend/src/pages/VisaoGeralProducao.tsx`
**Componentes Isolados (`frontend/src/components/VisaoGeralProducao/`):**
* *(Pendente refatoração)*

### 3. Apontamento Produção (`/apontamento-producao`)
**Container:** `frontend/src/pages/ApontamentoProducao.tsx`
**Componentes Isolados (`frontend/src/components/ApontamentoProducao/`):**
* *(Pendente refatoração)*

### 4. Romaneio (`/romaneio`)
**Container:** `frontend/src/pages/Romaneio.tsx`
**Componentes Isolados (`frontend/src/components/Romaneio/`):**
* *(Pendente refatoração)*

### 5. Montagem Plano Corte (`/montagem-plano-corte`)
**Container:** `frontend/src/pages/MontagemPlanoCorte.tsx`
**Componentes Isolados (`frontend/src/components/MontagemPlanoCorte/`):**
* *(Pendente refatoração)*

### 6. Projeto (`/projeto`)
**Container:** `frontend/src/pages/Projeto.tsx`
**Componentes Isolados (`frontend/src/components/Projeto/`):**
* *(Pendente refatoração)*

---

*Nota: Este arquivo será atualizado continuamente conforme a refatoração sistemática avança.*
