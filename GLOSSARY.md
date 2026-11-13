    # Sistema de Gestão e Compartilhamento de Equipamentos

Contexto único de domínio para o controle de empréstimos, devoluções, inventário e ocorrências de equipamentos operado pela coordenação de curso do IFPE Campus Belo Jardim.

## Language

**Equipamento**:
Bem físico gerenciado pela coordenação para empréstimo (ex: notebook, datashow, tablet, celular, chave ou acessório). Possui exatamente um dos quatro status: `Disponível`, `Emprestado`, `Em manutenção` ou `Extraviado`, e pode ser marcado como `Emprestável` ou não.
_Avoid_: Item de patrimônio, Bem, Produto

**Código de Patrimônio**:
Identificador oficial tombado pelo setor de patrimônio do campus (ex: `PAT 000000`), presente na etiqueta física da maioria dos equipamentos.
_Avoid_: Tombamento, Número de série

**Código Interno**:
Identificador gerado pelo próprio sistema (ex: `INT-0012`) para equipamentos sem tombamento oficial, como chaves e acessórios.
_Avoid_: Código provisório, SKU

**Acessório Vinculado**:
Equipamento secundário associado a um equipamento principal (ex: carregador vinculado a um notebook) que é sugerido automaticamente no empréstimo e conferido separadamente na devolução.
_Avoid_: Kit, Item extra

**Responsável**:
Pessoa identificada por **matrícula** única (docente, discente ou servidor administrativo) que retira um equipamento e responde por sua guarda e devolução.
_Avoid_: Usuário, Solicitante, Tomador, Docente responsável

**Empréstimo**:
Registro da saída de um ou mais equipamentos para um único Responsável, com data/hora de retirada, motivo e previsão de devolução opcional. Pode estar `Em aberto`, `Atrasado` (estado derivado quando ultrapassa a previsão de devolução) ou `Encerrado`.
_Avoid_: Retirada (quando se refere ao ciclo completo), Aluguel

**Movimentação**:
Registro histórico imutável de um evento relevante no ciclo de vida de um equipamento (cadastro, atualização de planilha, retirada, devolução ou ocorrência).
_Avoid_: Log genérico, Auditoria

**Ocorrência**:
Registro formal de perda, dano ou defeito identificado em um equipamento, com indicação se há obrigação de reposição pelo Responsável.
_Avoid_: Sinistro, Problema, Chamado

**Coordenação**:
Perfil único operacional compartilhado pelos coordenadores do curso para acessar o sistema e registrar todas as operações de balcão.
_Avoid_: Administrador, Operador individual
