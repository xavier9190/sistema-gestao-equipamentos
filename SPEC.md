# Especificação do Projeto — Sistema de Gestão e Compartilhamento de Equipamentos

> Documento consolidado após revisão com `/grill-with-docs`.
> Vocabulário oficial em [GLOSSARY.md](./GLOSSARY.md). Decisões arquiteturais em [docs/adr/](./docs/adr/).

---

## 1. Visão Geral e Stack

- **Objetivo**: Sistema web responsivo (uso em computador de balcão com leitor USB e celular com câmera) para a **Coordenação** controlar empréstimos, devoluções, inventário, ocorrências e histórico de equipamentos do IFPE Campus Belo Jardim.
- **Prazo do MVP**: **11/12/2026** (sprints semanais de 1 semana com validação periódica com a coordenação).
- **Stack (TypeScript de ponta a ponta)**:
  - **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS
  - **Banco de Dados & ORM**: PostgreSQL + Prisma ORM
  - **Leitura de Código**: Input focado para leitor USB + `html5-qrcode` para câmera (mobile/webcam) + digitação manual
  - **Hospedagem**: Nuvem com HTTPS nativo (Vercel + PostgreSQL gerenciado em Neon ou Supabase) + `Dockerfile` para eventual handover ao IFPE

---

## 2. Modelo de Dados (Visão Conceitual)

### `CoordenacaoUser` (Conta única compartilhada — [ADR-0001](./docs/adr/0001-perfil-unico-coordenacao.md))
- `id`, `email` (único), `senhaHash`, `tentativasFalhas`, `bloqueadoAte`

### `Equipamento`
- `id`
- `nome` (ex: `"Notebook 04"`, `"Chave do Laboratório 4"`)
- `codigoPatrimonio` (único, nullable — ex: `"PAT 000000"`)
- `codigoInterno` (único, nullable — ex: `"INT-0012"`, gerado automaticamente para itens sem patrimônio)
  - *Constraint*: pelo menos um entre `codigoPatrimonio` e `codigoInterno` deve estar preenchido.
- `categoria` (`Notebook`, `Datashow`, `Chave`, `Tablet`, `Celular`, `Acessório`, etc.)
- `localizacao` (ex: `"Coordenação"`, `"Sala 12"`)
- `estadoConservacao` (`Bom`, `Regular`, `Com defeito`, `Danificado`)
- `valorAproximado` (decimal, nullable)
- `emprestavel` (boolean, default `true`)
- `status` (`DISPONIVEL` | `EMPRESTADO` | `EM_MANUTENCAO` | `EXTRAVIADO`)
- `equipamentoPrincipalId` (FK opcional auto-relacionada — ex: carregador vinculado ao notebook)

### `Responsavel`
- `id`
- `matricula` (única, obrigatória — chave principal de busca no balcão)
- `nome`
- `tipo` (`DOCENTE` | `DISCENTE` | `SERVIDOR`)
- `contato` (e-mail ou WhatsApp)
- `ativo` (boolean, default `true`)

### `Emprestimo` & `EmprestimoItem`
- `Emprestimo`: `id`, `responsavelId`, `retiradoEm`, `previsaoDevolucao` (nullable), `motivo`, `encerradoEm` (nullable)
  - **Estado derivado** ([ADR-0003](./docs/adr/0003-movimentacao-imutavel-e-status-derivado.md)):
    - `Encerrado`: quando todos os seus `EmprestimoItem` possuem `devolvidoEm` (ou ocorrência de encerramento).
    - `Atrasado`: quando não encerrado e `previsaoDevolucao != null && now() > previsaoDevolucao`.
    - `Em aberto`: quando não encerrado e dentro do prazo (ou sem previsão).
- `EmprestimoItem`: `id`, `emprestimoId`, `equipamentoId`, `devolvidoEm` (nullable), `condicaoDevolucao` (`BOM_ESTADO` | `COM_DEFEITO` | `DANIFICADO`, nullable)
  - *Constraint crítica*: índice parcial único em `(equipamentoId) WHERE devolvidoEm IS NULL` para impedir duplo empréstimo concorrente do mesmo item.

### `Ocorrencia`
- `id`, `equipamentoId`, `emprestimoItemId` (nullable), `responsavelId` (nullable)
- `tipo` (`PERDA` | `DANO` | `DEFEITO`)
- `descricao`
- `deveRepor` (boolean)
- `reposicaoConcluidaEm` (nullable)
- `criadoEm`

### `Movimentacao` (Imutável — [ADR-0003](./docs/adr/0003-movimentacao-imutavel-e-status-derivado.md))
- `id`, `equipamentoId` (nullable para resumo de sync), `responsavelId` (nullable)
- `tipoEvento` (`CADASTRO` | `SINCRONIZACAO_PLANILHA` | `RETIRADA` | `DEVOLUCAO` | `OCORRENCIA` | `REPOSICAO`)
- `detalhes` (JSONB com motivo, condição, resumo de alteração)
- `registradoPor` (string fixa `"Coordenação"` no MVP)
- `ocorridoEm`

---

## 3. Regras de Negócio e Fluxos Críticos

1. **Autenticação**: E-mail e senha da Coordenação. Mensagem genérica de erro e bloqueio temporário após 5 tentativas falhas.
2. **Sincronização com Google Sheets**:
   - Leitura da planilha online oficial (via link/CSV export ou API) + botão manual **"Atualizar planilha"** na tela de Equipamentos.
   - Faz *upsert* pelo `codigoPatrimonio`: cria itens novos e atualiza apenas dados cadastrais (`nome`, `categoria`, `localizacao`, `valorAproximado`).
   - **Nunca sobrescreve** `status`, `emprestavel`, empréstimos ativos nem o histórico. Não apaga itens com movimentações.
3. **Cadastro Manual & Etiquetas**:
   - Botão **"Novo item +"** mantido para cadastrar chaves, carregadores e itens sem tombamento (gerando `INT-XXXX`).
   - Botão **"Imprimir etiqueta"** na ficha do item gerando QR Code com o `INT-XXXX` e nome do item.
4. **Empréstimo**:
   - Busca do Responsável por **matrícula** (e nome como apoio), com **Cadastro rápido** inline (`matricula`, `nome`, `tipo`, `contato`).
   - Se o Responsável tiver **reposição pendente**, exibir **alerta visual** na tela, mas **sem bloquear** o empréstimo (decisão fica com a coordenação no balcão).
   - Ao bipar equipamento com **Acessório Vinculado** disponível, o acessório é adicionado automaticamente na lista (podendo ser removido antes de confirmar).
   - Transação atômica: cria `Emprestimo`, `EmprestimoItem`(s), atualiza `Equipamento.status = EMPRESTADO` e insere `Movimentacao(RETIRADA)`.
5. **Devolução**:
   - Busca por matrícula/nome do responsável ou leitura de código do item.
   - Conferência **individual** por item (permite devolução parcial: itens não marcados permanecem pendentes no empréstimo).
   - Condição na devolução: `Bom estado` → `Equipamento.status = DISPONIVEL`; `Com defeito` / `Danificado` → `Equipamento.status = EM_MANUTENCAO` e abre/direciona para registro de `Ocorrencia`.
6. **Ocorrência & Reposição**:
   - `Perda` → `Equipamento.status = EXTRAVIADO`.
   - `Dano` / `Defeito` → `Equipamento.status = EM_MANUTENCAO` (ou mantém `DISPONIVEL` se não impedir uso).
   - Na ficha do item/ocorrência, botão para marcar **Reposição concluída** (ou retorno da manutenção), retornando o equipamento para `DISPONIVEL` e gravando `Movimentacao(REPOSICAO)`.

---

## 4. Ajustes Necessários nos Protótipos ([telas prototipo/](./telas%20prototipo/))

| Tela | Ajuste a aplicar em relação à imagem atual |
| :--- | :--- |
| [novo emprestimo.jpeg](./telas%20prototipo/novo%20emprestimo.jpeg) | 1) Alterar placeholder de busca do responsável para **Matrícula ou nome**. 2) **Remover** o campo `Docente responsável (opcional, para discentes)`. 3) Exibir badge de alerta se o responsável possuir reposição pendente. |
| [ficha do item.jpeg](./telas%20prototipo/ficha%20do%20item.jpeg) | 1) **Remover** `Docente responsável: Prof. B` do bloco de situação atual. 2) Adicionar botão **"Imprimir etiqueta"** (para itens `INT-XXXX`). 3) Adicionar ação **"Concluir reposição / Retornar da manutenção"** quando aplicável. |
| [equipamentos.jpeg](./telas%20prototipo/equipamentos.jpeg) | Trocar o botão **"Importar planilha"** por **"Atualizar planilha"** (mantendo **"Novo item +"** ao lado). |
| [painel inicial.jpeg](./telas%20prototipo/painel%20inicial.jpeg) | OK — manter `Atrasados` como contador/filtro derivado dos empréstimos vencidos. |
| [ler codigo.jpeg](./telas%20prototipo/ler%20codigo.jpeg), [devolucao.jpeg](./telas%20prototipo/devolucao.jpeg), [ocorrencia do item.jpeg](./telas%20prototipo/ocorrencia%20do%20item.jpeg), [historico.jpeg](./telas%20prototipo/historico.jpeg), [login.jpeg](./telas%20prototipo/login.jpeg) | Sem alterações estruturais — `ocorrencia` e `Exportar CSV` agora fazem parte do MVP. |

---

## 5. User Stories Incrementais (Prontas para o Azure DevOps)

> Cada User Story entrega uma fatia vertical testável de ponta a ponta (Banco + API + UI) para demonstração semanal à coordenação.

### Sprint 1 — Fundação, Acesso e Inventário Vivo
- **US01 — Autenticação da Coordenação**: Como coordenador, quero entrar no sistema com e-mail e senha compartilhados (com bloqueio após 5 tentativas), para que apenas a coordenação acesse os registros.
- **US02 — Sincronização com Google Sheets**: Como coordenador, quero que o sistema sincronize com a planilha online de patrimônio (automaticamente e via botão "Atualizar planilha"), para ter o inventário sem recadastrar bens manualmente e sem perder status/histórico.
- **US03 — Cadastro Manual de Itens sem Patrimônio e Etiquetas**: Como coordenador, quero cadastrar manualmente chaves/acessórios (gerando código `INT-XXXX`), vincular acessórios (ex: carregador ao notebook) e imprimir etiqueta QR Code, para identificar todo item emprestável.
- **US04 — Listagem, Filtros e Ficha do Equipamento**: Como coordenador, quero buscar e filtrar equipamentos (nome, código, categoria, situação, localização, emprestável) e abrir sua ficha, para conferir rapidamente a disponibilidade.

### Sprint 2 — Núcleo de Balcão (Leitura, Responsáveis, Empréstimo e Devolução)
- **US05 — Cadastro e Busca de Responsáveis por Matrícula**: Como coordenador, quero buscar responsáveis por matrícula e fazer cadastro rápido no balcão (`matrícula`, `nome`, `tipo`, `contato`), para vincular cada retirada a uma pessoa identificada.
- **US06 — Leitor de Código Unificado (USB + Câmera + Manual)**: Como coordenador, quero identificar equipamentos passando o leitor USB, usando a câmera do celular/webcam ou digitando o código, para ir direto para emprestar, devolver ou ver a ficha.
- **US07 — Registro de Empréstimo com Acessórios**: Como coordenador, quero registrar a saída de um ou mais equipamentos (com inclusão automática de acessórios vinculados e alerta se houver reposição pendente), para saber com quem cada item está sem risco de duplo empréstimo.
- **US08 — Registro de Devolução (Normal e Parcial)**: Como coordenador, quero dar baixa item a item na devolução registrando sua condição (`Bom estado`, `Com defeito`, `Danificado`), para encerrar o empréstimo ou manter pendência de acessórios não devolvidos.

### Sprint 3 — Painel, Ocorrências, Histórico e Entrega
- **US09 — Painel de Situação e Atrasos**: Como coordenador, quero ver no painel os contadores por status e a lista de empréstimos em aberto/atrasados, para cobrar devoluções vencidas antes que itens se percam.
- **US10 — Ocorrências e Reposição Pendente**: Como coordenador, quero registrar perda, dano ou defeito com indicação de reposição pelo responsável e dar baixa quando reposto/consertado, para manter o controle patrimonial.
- **US11 — Histórico Imutável e Exportação CSV**: Como coordenador, quero consultar a linha do tempo por equipamento e por responsável (com filtros) e exportar em CSV, para atender conferências e auditorias do campus.
- **US12 — UAT, Deploy em Produção (HTTPS) e Handover**: Como coordenação, quero validar o sistema em produção com dados reais, guia rápido de uso e backup configurado, para operar com autonomia até 11/12/2026.

---

## 6. Checklist de Ajustes no Documento (`1ª Avaliação`)

1. **Seção 6 (MVP)**: Remover ocorrências com reposição e relatórios exportáveis da lista de *"versões posteriores"* — ambos agora pertencem ao **MVP**.
2. **Seção 7 vs Seção 10 (Método de trabalho)**: Uniformizar a duração das sprints (Seção 7 diz **1 semana**, Seção 10 diz **2 semanas** — manter **1 semana** até 11/12/2026).
3. **Seção 2 e 3 (Importação e Responsáveis)**:
   - Atualizar importação de planilha para **sincronização com Google Sheets online + botão "Atualizar planilha"**.
   - Especificar que a identificação de Responsáveis é feita por **matrícula** (e remover qualquer menção a "docente responsável" nos protótipos).
4. **RF11 / Telas**: Esclarecer que os 4 status do equipamento são `Disponível`, `Emprestado`, `Em manutenção` e `Extraviado`, enquanto `Atrasado` é um estado derivado do empréstimo vencido.
5. **Seção 8 / ADRs**: Atualizar a stack para **TypeScript (Next.js + Prisma + PostgreSQL)**, alinhando com a decisão de substituir o protótipo em Python.
