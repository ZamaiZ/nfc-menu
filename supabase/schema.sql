-- =====================================================================
-- SCHEMA COMPLETO — cole este arquivo inteiro no SQL Editor do Supabase.
--
-- GERADO AUTOMATICAMENTE por supabase/build-schema.sh a partir das
-- migrations numeradas. Nao edite este arquivo: edite a migration
-- correspondente em supabase/migrations/ e rode o script de novo.
--
-- Pode rodar quantas vezes quiser. Tudo aqui e idempotente, entao
-- executar de novo nao quebra nada e nao duplica nada: o banco
-- converge para este estado, venha de onde vier.
-- =====================================================================


-- #####################################################################
-- ### 0001_base.sql
-- #####################################################################

-- =====================================================================
-- 0001 — Base: enums do dominio e gatilho de updated_at
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase e
-- execute. Os arquivos sao numerados e devem rodar EM ORDEM (0001, 0002,
-- ...). Rodar o mesmo arquivo duas vezes e inofensivo: tudo aqui e
-- idempotente, porque o SQL Editor nao guarda estado de migracao e nao
-- sabe o que ja foi aplicado.
--
-- Nenhuma extensao e instalada. sha256(bytea) e convert_to(text, name)
-- sao nativas do pg_catalog desde o Postgres 11 e substituem digest() do
-- pgcrypto; slug e forcado a minusculas por CHECK, o que dispensa citext.
-- Alem de uma dependencia a menos, pg_catalog e mais previsivel do que o
-- schema extensions quando toda funcao roda com search_path travado.
-- =====================================================================

do $enum$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'restaurant_status' and n.nspname = 'public'
  ) then
    create type public.restaurant_status as enum ('draft', 'active', 'suspended');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'membership_role' and n.nspname = 'public'
  ) then
    create type public.membership_role as enum ('owner', 'manager');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'media_kind' and n.nspname = 'public'
  ) then
    create type public.media_kind as enum ('image', 'video');
  end if;
end
$enum$;

-- Gatilho compartilhado de updated_at. O search_path travado fecha
-- search_path injection: sem ele, alguem que consiga criar uma funcao num
-- schema anterior na busca sequestra a execucao com privilegio elevado.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;


-- #####################################################################
-- ### 0002_identity.sql
-- #####################################################################

-- =====================================================================
-- 0002 — Identidade: perfis e administradores da plataforma
--
-- Rode DEPOIS do 0001. Idempotente: pode rodar de novo sem quebrar.
-- =====================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now()
);

-- O perfil nasce junto com o usuario. A aplicacao NUNCA insere em profiles:
-- e o gatilho que garante que todo usuario autenticado tem perfil, sem
-- depender de a aplicacao lembrar de criar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER aqui cumpre dois papeis: da a leitura necessaria e,
-- sobretudo, evita recursao infinita quando chamada de dentro de uma
-- politica de RLS. search_path travado fecha search_path injection.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$fn$;


-- #####################################################################
-- ### 0003_tenancy.sql
-- #####################################################################

-- =====================================================================
-- 0003 — Tenancy: restaurantes, vinculos, convites e plaquinhas
--
-- Rode DEPOIS do 0002. Idempotente: pode rodar de novo sem quebrar.
-- =====================================================================

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status public.restaurant_status not null default 'draft',
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  logo_path text,
  cover_path text,
  theme jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Forca minusculas, o que dispensa a extensao citext.
  constraint restaurants_slug_shape
    check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  -- Impede slug que colida com rota interna do app.
  constraint restaurants_slug_not_reserved
    check (slug not in (
      'admin', 'painel', 'api', 't', 'entrar', 'convite',
      'assets', 'static', 'public', 'favicon', 'robots', 'sitemap'
    ))
);

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

create index if not exists restaurants_public_slug_idx
  on public.restaurants (slug)
  where status = 'active' and deleted_at is null;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_restaurant_idx on public.memberships (restaurant_id);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role public.membership_role not null,
  -- SO o hash do token vive aqui. Vazar o banco nao entrega acesso a
  -- ninguem, porque o hash nao volta a ser token.
  token_hash bytea not null unique,
  email text,
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles (id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_expires_after_creation check (expires_at > created_at)
);

create index if not exists invites_restaurant_idx on public.invites (restaurant_id);

-- A plaquinha fisica. O token fica em texto puro de proposito: ele esta
-- impresso num QR pendurado na parede, nao e segredo, e guardar so o hash
-- impediria reimprimir a plaquinha depois.
create table if not exists public.menu_tags (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  public_token text not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index if not exists menu_tags_restaurant_idx on public.menu_tags (restaurant_id);

create or replace function public.is_member(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = rid and m.user_id = (select auth.uid())
  );
$fn$;

create or replace function public.is_owner(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = rid
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$fn$;

create or replace function public.is_restaurant_public(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.restaurants r
    where r.id = rid and r.status = 'active' and r.deleted_at is null
  );
$fn$;

-- O dono edita identidade e tema, mas endereco, situacao e remocao sao
-- privilegio da plataforma. Garantido aqui, nao por convencao no codigo.
create or replace function public.restaurants_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  -- auth.uid() nulo significa acesso DIRETO ao banco: SQL Editor, psql ou
  -- funcao SECURITY DEFINER. Todos ja sao privilegiados por definicao, e
  -- trafego da aplicacao nunca chega aqui com uid nulo -- anonimo sequer
  -- tem politica de UPDATE nesta tabela. Sem esta saida, o proprio
  -- administrador ficaria impedido de fazer manutencao pelo dashboard.
  if (select auth.uid()) is null or public.is_platform_admin() then
    return new;
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'alterar slug exige administrador da plataforma' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'alterar status exige administrador da plataforma' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    raise exception 'alterar deleted_at exige administrador da plataforma' using errcode = '42501';
  end if;

  return new;
end;
$fn$;

drop trigger if exists restaurants_guard_privileged on public.restaurants;
create trigger restaurants_guard_privileged
  before update on public.restaurants
  for each row execute function public.restaurants_guard_privileged_columns();

-- O token gravado no NFC e o restaurante de origem nunca mudam: a
-- plaquinha e hardware, e reatribui-la seria trocar o significado de um
-- objeto fisico que ja esta na parede de alguem.
create or replace function public.menu_tags_guard_immutable_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  if new.public_token is distinct from old.public_token then
    raise exception 'public_token da plaquinha e imutavel' using errcode = '42501';
  end if;
  if new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'restaurant_id da plaquinha e imutavel' using errcode = '42501';
  end if;
  return new;
end;
$fn$;

drop trigger if exists menu_tags_guard_immutable on public.menu_tags;
create trigger menu_tags_guard_immutable
  before update on public.menu_tags
  for each row execute function public.menu_tags_guard_immutable_columns();


-- #####################################################################
-- ### 0004_menu.sql
-- #####################################################################

-- =====================================================================
-- 0004 — Cardapio: categorias, itens, variacoes e midia
--
-- Rode DEPOIS do 0003. Idempotente: pode rodar de novo sem quebrar.
--
-- Esta e a migracao que torna vazamento entre restaurantes INEXPRESSAVEL,
-- e nao apenas improvavel. Veja o comentario da constraint
-- menu_items_category_same_restaurant.
-- =====================================================================

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Alvo da chave estrangeira composta de menu_items. Redundante como
  -- unicidade (id ja e chave primaria), mas necessario para que uma FK
  -- possa referenciar o par (id, restaurant_id).
  unique (id, restaurant_id)
);

drop trigger if exists menu_categories_set_updated_at on public.menu_categories;
create trigger menu_categories_set_updated_at
  before update on public.menu_categories
  for each row execute function public.set_updated_at();

create index if not exists menu_categories_restaurant_idx
  on public.menu_categories (restaurant_id, position);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text,
  -- Centavos, inteiro. Ponto flutuante nao representa 19.90 exatamente, e
  -- contabilidade de restaurante nao perdoa arredondamento.
  base_price_cents integer not null check (base_price_cents >= 0),
  is_available boolean not null default true,
  is_visible boolean not null default true,
  position integer not null default 0,
  dietary_tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id),
  -- O CORACAO DO ISOLAMENTO: o item so aponta para uma categoria do MESMO
  -- restaurante. Referencia cruzada e recusada pelo banco, nao validada
  -- por um if em TypeScript que alguem pode esquecer de chamar. Deixa de
  -- ser um bug possivel e passa a ser um estado inexpressavel.
  constraint menu_items_category_same_restaurant
    foreign key (category_id, restaurant_id)
    references public.menu_categories (id, restaurant_id)
    on delete cascade
);

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create index if not exists menu_items_category_idx on public.menu_items (category_id, position);
create index if not exists menu_items_restaurant_idx on public.menu_items (restaurant_id);

create table if not exists public.menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  item_id uuid not null,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  position integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_variants_item_same_restaurant
    foreign key (item_id, restaurant_id)
    references public.menu_items (id, restaurant_id)
    on delete cascade
);

drop trigger if exists menu_item_variants_set_updated_at on public.menu_item_variants;
create trigger menu_item_variants_set_updated_at
  before update on public.menu_item_variants
  for each row execute function public.set_updated_at();

create index if not exists menu_item_variants_item_idx
  on public.menu_item_variants (item_id, position);

create table if not exists public.menu_item_media (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  item_id uuid not null,
  kind public.media_kind not null,
  storage_path text not null unique,
  alt_text text,
  width integer,
  height integer,
  duration_ms integer,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_item_media_item_same_restaurant
    foreign key (item_id, restaurant_id)
    references public.menu_items (id, restaurant_id)
    on delete cascade,
  -- O caminho no storage precisa comecar pelo id do restaurante: o prefixo
  -- do caminho E a fronteira do inquilino, e a politica de storage decide
  -- permissao lendo exatamente esse prefixo.
  constraint menu_item_media_path_prefix
    check (storage_path like restaurant_id::text || '/%')
);

create index if not exists menu_item_media_item_idx
  on public.menu_item_media (item_id, position);

create or replace function public.is_category_visible(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.menu_categories c
    where c.id = cid and c.is_visible
  );
$fn$;

-- Item publico exige as tres condicoes: o item visivel, a categoria dele
-- visivel e o restaurante no ar. Esconder a categoria esconde os itens.
create or replace function public.is_menu_item_public(iid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
    from public.menu_items i
    join public.menu_categories c
      on c.id = i.category_id and c.restaurant_id = i.restaurant_id
    where i.id = iid
      and i.is_visible
      and c.is_visible
      and public.is_restaurant_public(i.restaurant_id)
  );
$fn$;

