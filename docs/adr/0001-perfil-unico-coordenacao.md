# 0001. Perfil único compartilhado para a Coordenação

Status: accepted

A coordenação do curso (três integrantes) já opera sob um único e-mail e solicitou explicitamente um acesso compartilhado no balcão, sem contas individuais por operador. Decidimos adotar uma única conta autenticada da **Coordenação** no MVP, registrando `"Coordenação"` como autor nos logs de movimentação (RNF04), em vez de gerenciar contas individuais e troca constante de sessão no mesmo computador/celular.

## Consequences

- Simplifica o fluxo de balcão e elimina atrito de troca de login entre coordenadores.
- Caso no futuro seja necessário auditar *qual* coordenador registrou uma operação, será preciso introduzir contas individuais ou um seletor de operador autenticado.
