-- Chat ao vivo (super chat e áudio) do "Você é 13 ou 22?".
-- Rode depois de 20261017120000_servidor_do_jogo.sql, também no SQL Editor do Supabase.
-- O navegador só LÊ as mensagens (para recebê-las em tempo real); quem grava é o servidor do site,
-- depois de validar o texto, o áudio e o ritmo de envio.

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('super', 'audio')),
  team text not null check (team in ('red', 'blue')),
  author text not null check (author ~ '^[a-z0-9._]{1,30}$'),
  text text not null default '' check (length(text) <= 120),
  audio_url text check (audio_url is null or (length(audio_url) <= 600 and audio_url ~ '^https?://')),
  duration_ms integer check (duration_ms is null or duration_ms between 600 and 15000),
  created_at timestamptz not null default now(),
  check ((kind = 'super' and length(text) between 1 and 120 and audio_url is null) or (kind = 'audio' and audio_url is not null and duration_ms is not null))
);
create index if not exists live_messages_created_at_idx on public.live_messages (created_at desc);

-- Último envio por visitante (endereço de rede transformado em código, nunca o endereço em si).
create table if not exists public.live_rate (
  client text primary key check (length(client) between 16 and 128),
  last_at timestamptz not null
);

alter table public.live_messages enable row level security;
alter table public.live_rate enable row level security;
revoke all on table public.live_messages, public.live_rate from anon, authenticated;
grant all on table public.live_messages, public.live_rate to service_role;
-- Leitura pública só das mensagens recentes; não há política de escrita para o navegador.
grant select on table public.live_messages to anon, authenticated;
drop policy if exists "mensagens ao vivo recentes" on public.live_messages;
create policy "mensagens ao vivo recentes" on public.live_messages for select to anon, authenticated using (created_at > now() - interval '1 day');

create or replace function public.live_post_message(
  p_client text,
  p_kind text,
  p_team text,
  p_author text,
  p_text text,
  p_audio_url text default null,
  p_duration_ms integer default null,
  p_min_interval_ms integer default 4000
) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_last timestamptz;
  v_row public.live_messages%rowtype;
begin
  if p_client is null or length(p_client) not between 16 and 128 then raise exception 'visitante_invalido'; end if;
  insert into public.live_rate (client, last_at) values (p_client, '-infinity') on conflict (client) do nothing;
  select last_at into v_last from public.live_rate where client = p_client for update;
  if v_last > now() - make_interval(secs => p_min_interval_ms / 1000.0) then raise exception 'muito_rapido'; end if;
  insert into public.live_messages (kind, team, author, text, audio_url, duration_ms)
  values (p_kind, p_team, p_author, coalesce(p_text, ''), p_audio_url, p_duration_ms)
  returning * into v_row;
  update public.live_rate set last_at = now() where client = p_client;
  return to_jsonb(v_row);
end;
$$;

-- Últimas mensagens (para quem acabou de chegar ou quando o tempo real não está disponível).
create or replace function public.live_recent(p_after timestamptz default null)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at, m.id), '[]'::jsonb)
  from (
    select * from public.live_messages
    where created_at > greatest(coalesce(p_after, '-infinity'), now() - interval '10 minutes')
    order by created_at desc limit 30
  ) m
$$;

revoke all on function public.live_post_message(text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.live_recent(timestamptz) from public, anon, authenticated;
grant execute on function public.live_post_message(text, text, text, text, text, text, integer, integer) to service_role;
grant execute on function public.live_recent(timestamptz) to service_role;

-- Tempo real: o Supabase avisa os navegadores a cada mensagem nova (só existe no Supabase de verdade).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_messages') then
    alter publication supabase_realtime add table public.live_messages;
  end if;
end $$;

-- Áudios: pasta pública para tocar no navegador; só o servidor envia arquivos (até ~900 KB).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('live-audio', 'live-audio', true, 921600, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/aac'])
    on conflict (id) do nothing;
  end if;
end $$;
