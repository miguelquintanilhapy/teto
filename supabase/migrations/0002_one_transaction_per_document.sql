-- Um documento vira no máximo um lançamento.
-- Sem isto, dois toques quase simultâneos em "Confirmar" (mesmo documento, sem chave de acesso)
-- criavam dois lançamentos e o faturamento aparecia em dobro. A verificação no código continua,
-- mas só o banco fecha a corrida.
--
-- Antes de aplicar, confira se já existe documento com mais de um lançamento:
--   select profile_id, document_id, count(*) from transactions
--   where document_id is not null group by 1, 2 having count(*) > 1;
create unique index if not exists transactions_document_uq
  on transactions (profile_id, document_id)
  where document_id is not null;
