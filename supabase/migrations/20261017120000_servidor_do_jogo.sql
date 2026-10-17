-- Servidor do jogo "Você é 13 ou 22?" (Projeto 2).
-- Rode este arquivo inteiro uma vez no SQL Editor do Supabase.
-- As tabelas ficam fechadas para o navegador: só o servidor do site, com a chave secreta, lê e grava.
-- Valores de pontos e preços espelham lib/war/game.ts e continuam experimentais.

create table if not exists public.bases (
  id text primary key check (length(id) between 1 and 80),
  username text not null unique check (username ~ '^[a-z0-9._]{1,30}$'),
  instagram_id text unique check (instagram_id is null or instagram_id ~ '^[0-9]{1,30}$'),
  uf text not null check (uf in ('RO','AC','AM','RR','PA','AP','TO','MA','PI','CE','RN','PB','PE','AL','SE','BA','MG','ES','RJ','SP','PR','SC','RS','MS','MT','GO','DF')),
  municipality_id text check (municipality_id is null or (uf = 'BA' and municipality_id ~ '^29[0-9]{5}$')),
  team text not null check (team in ('red', 'blue')),
  infantry integer not null default 0 check (infantry between 0 and 10000),
  tank integer not null default 0 check (tank between 0 and 10000),
  artillery integer not null default 0 check (artillery between 0 and 10000),
  drone integer not null default 0 check (drone between 0 and 10000),
  aircraft integer not null default 0 check (aircraft between 0 and 10000),
  credits integer not null default 0 check (credits between 0 and 10000000),
  joined_at timestamptz not null default now(),
  comment_day date not null,
  rewarded_comments integer not null default 0 check (rewarded_comments >= 0),
  updated_at timestamptz not null default now()
);

-- Histórico de pontos ganhos; compras reduzem o saldo (credits), não apagam este histórico.
create table if not exists public.point_entries (
  key text primary key check (length(key) between 1 and 300),
  base_id text not null references public.bases (id) on delete cascade,
  kind text not null check (kind in ('opening', 'arrival', 'comment', 'mention', 'recruit', 'support', 'story')),
  points integer not null check (points between 1 and 10000000),
  at timestamptz not null,
  subject text check (subject is null or subject ~ '^[a-z0-9._]{1,30}$'),
  post text check (post is null or length(post) between 1 and 100)
);
create index if not exists point_entries_base_id_idx on public.point_entries (base_id);

-- Cada comentário só conta uma vez, mesmo que a Meta reenvie o evento.
create table if not exists public.comment_receipts (
  comment_id text primary key check (length(comment_id) between 1 and 200),
  base_id text references public.bases (id) on delete set null,
  received_at timestamptz not null default now()
);

-- Cada pedido de compra só debita uma vez, mesmo se a requisição for repetida.
create table if not exists public.purchases (
  request_id text primary key check (length(request_id) between 1 and 120),
  base_id text not null references public.bases (id) on delete cascade,
  kind text not null check (kind in ('infantry', 'tank', 'artillery', 'drone', 'aircraft')),
  cost integer not null check (cost > 0),
  at timestamptz not null default now()
);

-- Resultados das batalhas diárias (preenchido pela etapa do agendamento das 22h).
create table if not exists public.battles (
  id text primary key check (length(id) between 1 and 120),
  at timestamptz not null,
  winner text not null check (winner in ('red', 'blue', 'draw')),
  red bigint not null check (red >= 0),
  blue bigint not null check (blue >= 0),
  controls jsonb not null,
  seed bigint not null
);
create index if not exists battles_at_idx on public.battles (at desc);

alter table public.bases enable row level security;
alter table public.point_entries enable row level security;
alter table public.comment_receipts enable row level security;
alter table public.purchases enable row level security;
alter table public.battles enable row level security;
-- Sem políticas de leitura/escrita: a chave pública (navegador) não acessa nada.
revoke all on table public.bases, public.point_entries, public.comment_receipts, public.purchases, public.battles from anon, authenticated;
grant all on table public.bases, public.point_entries, public.comment_receipts, public.purchases, public.battles to service_role;

create or replace function public.game_unit_cost(p_kind text)
returns integer language sql immutable set search_path = '' as $$
  select case p_kind when 'infantry' then 10 when 'tank' then 60 when 'artillery' then 40 when 'drone' then 30 when 'aircraft' then 100 end
$$;

-- Comentário de inscrição já interpretado pelo servidor do site (perfil, estado, município e time).
-- Cria a base na primeira vez (3 soldados), dá pontos até o teto diário e ignora comentários repetidos.
create or replace function public.game_register_comment(
  p_comment_id text,
  p_username text,
  p_uf text,
  p_municipality_id text,
  p_team text,
  p_at timestamptz,
  p_instagram_id text default null,
  p_points integer default 10,
  p_daily_cap integer default 5
) returns jsonb language plpgsql set search_path = '' as $$
declare
  v_base public.bases%rowtype;
  v_day date := (p_at at time zone 'America/Sao_Paulo')::date;
  v_created boolean := false;
  v_awarded boolean := false;
begin
  if p_comment_id is null or length(p_comment_id) not between 1 and 200 then raise exception 'comentario_invalido'; end if;
  if p_team is null or p_team not in ('red', 'blue') then raise exception 'time_invalido'; end if;
  if p_at is null or p_points is null or p_points < 1 or p_daily_cap is null or p_daily_cap < 0 then raise exception 'regra_invalida'; end if;

  insert into public.comment_receipts (comment_id) values (p_comment_id) on conflict (comment_id) do nothing;
  if not found then return jsonb_build_object('status', 'duplicate'); end if;

  if p_instagram_id is not null then
    select * into v_base from public.bases where instagram_id = p_instagram_id for update;
  end if;
  if v_base.id is null then
    select * into v_base from public.bases where username = p_username for update;
    if v_base.id is not null and v_base.instagram_id is not null and v_base.instagram_id is distinct from p_instagram_id then
      raise exception 'perfil_em_uso';
    end if;
  end if;

  if v_base.id is null then
    insert into public.bases (id, username, instagram_id, uf, municipality_id, team, infantry, credits, joined_at, comment_day, rewarded_comments)
    -- Bases do Instagram ganham um ID aleatório: o ID da Meta não aparece no mapa.
    values (case when p_instagram_id is null then 'u-' || p_username else 'ig-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20) end, p_username, p_instagram_id, p_uf, p_municipality_id, p_team, 3, 0, p_at, v_day, 0)
    returning * into v_base;
    v_created := true;
  elsif v_base.uf <> p_uf or v_base.team <> p_team or (v_base.municipality_id is not null and v_base.municipality_id is distinct from p_municipality_id) then
    raise exception 'base_ja_definida';
  end if;

  if v_base.comment_day <> v_day then v_base.comment_day := v_day; v_base.rewarded_comments := 0; end if;
  if v_base.rewarded_comments < p_daily_cap then
    insert into public.point_entries (key, base_id, kind, points, at)
    values ('comment:' || p_comment_id, v_base.id, case when v_created then 'arrival' else 'comment' end, p_points, p_at);
    v_awarded := true;
  end if;

  update public.bases set
    username = p_username,
    instagram_id = coalesce(instagram_id, p_instagram_id),
    municipality_id = coalesce(municipality_id, p_municipality_id),
    comment_day = v_base.comment_day,
    rewarded_comments = v_base.rewarded_comments + case when v_awarded then 1 else 0 end,
    credits = credits + case when v_awarded then p_points else 0 end,
    updated_at = now()
  where id = v_base.id;
  update public.comment_receipts set base_id = v_base.id where comment_id = p_comment_id;

  return jsonb_build_object('status', 'ok', 'base_id', v_base.id, 'created', v_created, 'awarded', v_awarded);
end;
$$;

-- Compra com pontos do jogo: confere o saldo com a linha travada e não debita duas vezes o mesmo pedido.
create or replace function public.game_buy_unit(p_request_id text, p_base_id text, p_kind text)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_cost integer := public.game_unit_cost(p_kind);
  v_credits integer;
  v_owned integer;
begin
  if v_cost is null then raise exception 'equipamento_invalido'; end if;
  if p_request_id is null or length(p_request_id) not between 1 and 120 then raise exception 'pedido_invalido'; end if;
  select credits, case p_kind when 'infantry' then infantry when 'tank' then tank when 'artillery' then artillery when 'drone' then drone else aircraft end
    into v_credits, v_owned from public.bases where id = p_base_id for update;
  if not found then raise exception 'base_nao_encontrada'; end if;

  insert into public.purchases (request_id, base_id, kind, cost) values (p_request_id, p_base_id, p_kind, v_cost) on conflict (request_id) do nothing;
  if not found then return jsonb_build_object('status', 'duplicate'); end if;
  if v_credits < v_cost then raise exception 'pontos_insuficientes'; end if;
  if v_owned >= 10000 then raise exception 'limite_do_equipamento'; end if;

  update public.bases set
    credits = credits - v_cost,
    infantry = infantry + case when p_kind = 'infantry' then 1 else 0 end,
    tank = tank + case when p_kind = 'tank' then 1 else 0 end,
    artillery = artillery + case when p_kind = 'artillery' then 1 else 0 end,
    drone = drone + case when p_kind = 'drone' then 1 else 0 end,
    aircraft = aircraft + case when p_kind = 'aircraft' then 1 else 0 end,
    updated_at = now()
  where id = p_base_id;
  return jsonb_build_object('status', 'ok', 'credits', v_credits - v_cost);
end;
$$;

-- Estado público do mapa: bases (sem o ID do Instagram), histórico de pontos e as dez últimas batalhas.
create or replace function public.game_state()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'bases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'username', b.username, 'uf', b.uf, 'municipality_id', b.municipality_id, 'team', b.team,
        'infantry', b.infantry, 'tank', b.tank, 'artillery', b.artillery, 'drone', b.drone, 'aircraft', b.aircraft,
        'credits', b.credits, 'joined_at', b.joined_at, 'comment_day', b.comment_day, 'rewarded_comments', b.rewarded_comments,
        'entries', coalesce((
          select jsonb_agg(jsonb_build_object('key', e.key, 'kind', e.kind, 'points', e.points, 'at', e.at, 'subject', e.subject, 'post', e.post) order by e.at, e.key)
          from public.point_entries e where e.base_id = b.id
        ), '[]'::jsonb)
      ) order by b.joined_at, b.id)
      from public.bases b
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('id', h.id, 'at', h.at, 'winner', h.winner, 'red', h.red, 'blue', h.blue, 'controls', h.controls) order by h.at desc)
      from (select * from public.battles order by at desc limit 10) h
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.game_unit_cost(text) from public, anon, authenticated;
revoke all on function public.game_register_comment(text, text, text, text, text, timestamptz, text, integer, integer) from public, anon, authenticated;
revoke all on function public.game_buy_unit(text, text, text) from public, anon, authenticated;
revoke all on function public.game_state() from public, anon, authenticated;
grant execute on function public.game_unit_cost(text) to service_role;
grant execute on function public.game_register_comment(text, text, text, text, text, timestamptz, text, integer, integer) to service_role;
grant execute on function public.game_buy_unit(text, text, text) to service_role;
grant execute on function public.game_state() to service_role;
