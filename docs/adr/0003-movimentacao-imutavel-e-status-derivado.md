# 0003. Movimentação imutável e status derivado de atraso

Status: accepted

O RNF04 exige que registros de empréstimo e devolução nunca sejam apagados, e as telas exibem `Atrasado` tanto no painel quanto na listagem. Decidimos manter o registro de **Movimentação** estritamente imutável (apenas inserção, sem `UPDATE`/`DELETE` na aplicação) e modelar `Atrasado` como um **estado derivado** calculado em consulta quando um `Empréstimo` em aberto ultrapassa sua `previsão de devolução`, preservando apenas os 4 status reais no `Equipamento` (`Disponível`, `Emprestado`, `Em manutenção`, `Extraviado`).

## Consequences

- Correções operacionais não alteram registros passados: geram um novo evento compensatório ou uma nova ocorrência na linha do tempo.
- Não existe coluna ou cron job atualizando o status do equipamento para `"Atrasado"` no banco; consultas e filtros de atraso comparam `now() > previsao_devolucao` em empréstimos abertos.
