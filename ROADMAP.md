# Roadmap e Ordem de Execução — Sistema de Gestão de Equipamentos

> **Total no Azure DevOps**: **21 PBIs** — sendo **5 de Fundação (`PBI-00.1` a `PBI-00.5`)** + **16 PBIs numerados (`PBI-01` a `PBI-16`)**.
> Marque `[x]` conforme cada PBI for concluído e validado com a coordenação.

---

## Fase 0 — Discovery, Arquitetura e Base Técnica
- [x] **PBI-00.2 (`#341`)** — Requisitos não funcionais e ADRs (`docs/adr/`, `GLOSSARY.md`, `SPEC.md`) *(Done)*
- [ ] **PBI-00.1 (`#335`)** — Discovery: obter amostra real do Google Sheets de patrimônio e alinhar com o projeto de inventário *(tasks de entrevista já `Done`; falta amostra da planilha)*
- [ ] **PBI-00.3 (`#346`)** — Protótipos: validar ajustes das telas com a coordenação (remoção de "Docente responsável" e busca por matrícula) *(wireframes já `Done`)*
- [ ] **PBI-00.5 (`#358`)** — Setup TypeScript: criar projeto **Next.js (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL**, ambiente local e deploy com HTTPS
- [x] **PBI-00.4 (`#352`)** — Modelagem e Banco: schema Prisma, migrations, constraints (duplo empréstimo bloqueado, `Movimentacao` imutável) e seeds (categorias + conta única da Coordenação)

---
        
## Bloco 1 — Acesso e Inventário Vivo (1ª entrega demonstrável)
- [x] **PBI-01 (`#366`)** — Login da Coordenação (conta compartilhada, bloqueio após 5 tentativas)
- [ ] **PBI-09 (`#393`)** — Sincronização com **Google Sheets** + botão **"Atualizar planilha"** (upsert cadastral sem sobrescrever status/histórico)
- [x] **PBI-02 (`#376`)** — Cadastro manual de itens sem patrimônio (`INT-XXXX` para chaves/carregadores), vínculo de acessório e etiqueta QR Code
- [x] **PBI-04 (`#382`)** — Listagem, busca, filtros e Ficha do Equipamento

---

## Bloco 2 — Operação de Balcão (2ª entrega — substitui o caderno)
- [x] **PBI-03 (`#371`)** — Cadastro e busca de **Responsáveis por matrícula** (com cadastro rápido no balcão, sem docente supervisor)
- [x] **PBI-05 (`#387`)** — Leitor de código unificado (**leitor USB + câmera `html5-qrcode` + digitação manual**)
- [x] **PBI-06 (`#399`)** — Registro de **Empréstimo** (acessório vinculado automático/desmarcável + alerta visual de reposição pendente sem bloqueio)
- [x] **PBI-07 (`#405`)** — Registro de **Devolução** (conferência item a item, devolução parcial e condição do item)
- [x] **PBI-08 (`#411`)** — **Painel de Situação** (contadores por status e lista de empréstimos em aberto / atrasados)

---

## Bloco 3 — Auditoria, Ocorrências e Entrega Final (até 11/12/2026)
- [x] **PBI-10 (`#417`)** — **Histórico imutável** (linha do tempo por equipamento e por responsável)
- [x] **PBI-11 (`#422`)** — **Ocorrências** (perda, dano, defeito + reposição pendente e baixa quando reposto)
- [x] **PBI-12 (`#427`)** — **Exportação CSV** de relatórios para conferência e auditorias
- [ ] **PBI-13 (`#433`)** — Qualidade transversal (segurança, backup/restore, acessibilidade e LGPD)
- [ ] **PBI-14 (`#439`)** — UAT (homologação com cenários reais junto à coordenação)
- [ ] **PBI-15 (`#445`)** — Deploy final em produção, importação da base real e monitoramento
- [ ] **PBI-16 (`#450`)** — Treinamento da coordenação, guia rápido e handover
