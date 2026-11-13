# 0002. Stack TypeScript unificada (Next.js, Prisma, PostgreSQL)

Status: accepted

O protótipo inicial em Python foi descartado por não atender bem ao objetivo e ao fluxo esperado pela equipe. Com o prazo de entrega do MVP em 11/12/2026 (~4 semanas) para um time de três pessoas e a exigência de funcionamento responsivo em celular (câmera via HTTPS) e computador (leitor de código de barras USB), decidimos adotar **TypeScript** de ponta a ponta em um projeto único com **Next.js (App Router)**, **Tailwind CSS**, **Prisma ORM** e **PostgreSQL**, hospedado em nuvem com HTTPS nativo (Vercel + PostgreSQL gerenciado).

## Considered Options

- **Backend Python separado + SPA**: descartado pela equipe devido à experiência prévia negativa em Python e ao custo de manter dois repositórios/deploys em prazo curto.
- **API Node/Express separada + Frontend React**: viável, mas adiciona atrito de CORS, contratos duplicados e dois deploys sem ganho real para o tamanho do projeto.

## Consequences

- Tipagem compartilhada entre banco, API e interface reduz erros de integração.
- Deploy em nuvem garante HTTPS imediato (pré-requisito dos navegadores móveis para liberar a câmera), mantendo opção de containerização via Docker para futura migração ao servidor do IFPE.
