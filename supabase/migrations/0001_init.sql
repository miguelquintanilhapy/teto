-- Teto: schema inicial. Ver docs/DATA-MODEL.md.
-- Convenções: dinheiro em centavos (bigint), RLS ativada em todas as tabelas
-- e SEM políticas para anon/authenticated (nega tudo por padrão). O servidor
-- acessa o banco com a chave de serviço, que ignora a RLS.

-- ---------------------------------------------------------------- perfis
create table mei_profiles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tax_id        text not null unique,
  opening_date  date not null,
  email         text not null,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------- documentos
create table documents (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references mei_profiles(id) on delete cascade,
  storage_path  text not null,
  content_hash  text not null,
  mime_type     text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes    integer not null check (size_bytes > 0),
  kind          text not null check (kind in ('nota', 'recibo', 'extrato')),
  created_at    timestamptz not null default now(),
  unique (profile_id, content_hash) -- idempotência de upload
);

-- ------------------------------------------------------------- extrações
create table extractions (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null unique references documents(id) on delete cascade,
  status          text not null check (status in ('accepted', 'needs_review', 'failed')),
  provider_id     text,
  prompt_version  text not null,
  schema_version  text not null,
  attempts        jsonb not null default '[]'::jsonb,
  raw_result      jsonb,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------ transações
create table transactions (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references mei_profiles(id) on delete cascade,
  document_id          uuid references documents(id) on delete set null,
  date                 date not null,           -- data que conta para o limite
  issue_date           date,
  amount_cents         bigint not null check (amount_cents > 0), -- estorno = status 'cancelada'
  kind                 text not null check (kind in ('receita', 'despesa')),
  source               text not null check (source in ('nota', 'pix', 'manual')),
  status               text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada')),
  counterparty_tax_id  text,
  access_key           text check (access_key is null or access_key ~ '^[0-9]{44}$'),
  description          text not null default '',
  confidence           real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index transactions_access_key_uq
  on transactions (profile_id, access_key) where access_key is not null;
create index transactions_profile_date_idx on transactions (profile_id, date);

create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger transactions_set_updated_at
  before update on transactions
  for each row execute function set_updated_at();

-- ------------------------------------------------ histórico de alterações
create table transaction_events (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references transactions(id) on delete cascade,
  action          text not null check (action in ('created', 'corrected', 'confirmed', 'cancelled')),
  changes         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index transaction_events_tx_idx on transaction_events (transaction_id, created_at);

-- --------------------------------------------------- extrato e conciliação
create table bank_entries (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references mei_profiles(id) on delete cascade,
  date          date not null,
  amount_cents  bigint not null check (amount_cents > 0),
  description   text not null default '',
  import_batch  uuid not null,
  unique (profile_id, date, amount_cents, description, import_batch)
);

create table reconciliation_links (
  bank_entry_id   uuid primary key references bank_entries(id) on delete cascade,
  transaction_id  uuid not null unique references transactions(id) on delete cascade,
  day_diff        integer not null check (day_diff >= 0),
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------- alertas
create table alerts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references mei_profiles(id) on delete cascade,
  kind            text not null check (kind in (
                    'threshold_warning', 'threshold_critical', 'over_limit', 'over_tolerance', 'das_reminder')),
  reference_year  integer not null,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,                 -- nulo = ainda não enviado; o cron tenta de novo
  unique (profile_id, kind, reference_year)    -- idempotência
);

-- ------------------------------------------- infraestrutura de resiliência
create table provider_cooldowns (
  provider_id    text primary key,
  blocked_until  timestamptz not null,
  reason         text not null default ''
);

create table daily_quota (
  day          date primary key,               -- dia em America/Sao_Paulo
  extractions  integer not null default 0
);

-- Consome uma unidade da cota do dia de forma atômica. false = teto atingido.
create function consume_daily_quota(p_day date, p_limit integer) returns boolean
language plpgsql as $$
declare
  v integer;
begin
  insert into daily_quota (day, extractions) values (p_day, 1)
  on conflict (day) do update set extractions = daily_quota.extractions + 1
    where daily_quota.extractions < p_limit
  returning extractions into v;
  return v is not null;
end $$;

revoke all on function consume_daily_quota(date, integer) from public;

-- ----------------------------------------------------------- RLS (deny-all)
alter table mei_profiles         enable row level security;
alter table documents            enable row level security;
alter table extractions          enable row level security;
alter table transactions         enable row level security;
alter table transaction_events   enable row level security;
alter table bank_entries         enable row level security;
alter table reconciliation_links enable row level security;
alter table alerts               enable row level security;
alter table provider_cooldowns   enable row level security;
alter table daily_quota          enable row level security;

-- ------------------------------------------------------------------ storage
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
