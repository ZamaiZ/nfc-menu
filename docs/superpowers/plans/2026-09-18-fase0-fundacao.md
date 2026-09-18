# Fase 0 — Fundação: plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Construir a fundação de dados, autorização e segurança do app de cardápio NFC — três territórios separados por subdomínio, schema multi-inquilino com RLS, camada de acesso a dados e convite por link — sem nenhuma interface além do esqueleto de rotas.

**Arquitetura:** Defesa em profundidade. O Postgres é a última linha, com RLS restritiva em toda tabela e referência cruzada entre restaurantes tornada inexpressável por chave estrangeira composta. A camada de acesso a dados é a primeira linha, com autorização explícita e DTOs, e é o único lugar do projeto que importa `@supabase/*`. A chave `service_role` não entra na aplicação: toda operação privilegiada é uma função `SECURITY DEFINER` no banco.

**Stack:** Next.js 16.3.5 (App Router, `proxy.ts`, APIs de requisição assíncronas), React 19.2.8, Supabase (Postgres, Auth, Storage), TypeScript estrito, Zod 4, pnpm 10.34.5.

**Spec:** [`docs/superpowers/specs/2026-09-18-fundacao-nfc-menu-design.md`](../specs/2026-09-18-fundacao-nfc-menu-design.md)

## Restrições globais

Valem para **todas** as tarefas, sem exceção.

- **Sem testes automatizados.** Decisão explícita do cliente. Não criar framework de teste, não criar arquivo de teste. Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **Sem interface.** Apenas o esqueleto de rotas necessário para provar o roteamento por território. Nada de design, nada de componente.
- **A chave `service_role` não entra na aplicação.** Ela nunca aparece em `.env.local`, nunca é importada por código sob `src/`. Aparece somente em comandos de verificação manual no terminal, quando inevitável.
- **`@supabase/*` é importado em um único arquivo:** `src/server/dal/_client.ts`. Sem exceção, inclusive para `src/proxy.ts`.
- **Todo arquivo sob `src/server/` começa com `import 'server-only'`.**
- **Toda função da DAL segue a mesma forma:** valida com Zod → autoriza explicitamente → consulta → devolve DTO. Nunca devolve linha crua do banco.
- **Autorização usa `getUser()`, nunca `getSession()`.**
- **Toda função SQL leva `set search_path = ''`** e qualifica todas as referências (`public.`, `auth.`, `pg_catalog.`).
- **Preço sempre em `integer` de centavos.** Nunca ponto flutuante.
- **Zod 4:** `z.email()` no nível superior, `{ error: ... }` para mensagem. Não use a forma `z.string().email({ message })` do Zod 3.
- **Next 16:** `params`, `searchParams`, `cookies()` e `headers()` retornam Promise e precisam de `await`.
- **Commits frequentes**, um por tarefa concluída e verificada.

## Desvio consciente da spec

A spec (seção 6) prevê as extensões `citext` e `pgcrypto`. **Este plano não instala extensão nenhuma**, pelos seguintes motivos:

- `sha256(bytea)` e `convert_to(text, name)` são nativas do Postgres desde a versão 11, no schema `pg_catalog`. Substituem `extensions.digest()` do `pgcrypto` sem perda.
- `slug` já tem CHECK que força minúsculas, o que torna `citext` redundante. A comparação de e-mail em `redeem_invite` usa `lower()` explícito.

O ganho não é só uma dependência a menos: com `set search_path = ''` toda referência precisa ser qualificada, e `pg_catalog` é mais estável e previsível do que o schema `extensions` do Supabase. A spec foi atualizada para refletir isso.

## Emenda ao modelo de execução (2026-09-18)

O plano foi escrito supondo `npx supabase db reset` contra o Postgres local. **Mudou em execução, por decisão do cliente:**

- O banco de verdade é o **projeto Supabase na nuvem**, e as migrations são coladas no **SQL Editor** do dashboard, na mão.
- Por isso toda migration é **idempotente**: `create table if not exists`, `drop policy if exists` antes de cada `create policy`, enum criado dentro de bloco que checa antes. O SQL Editor não guarda estado de migração — rodar o mesmo arquivo duas vezes tem que ser inofensivo, e uma execução que falhe no meio tem que poder ser repetida inteira.
- O **Supabase local é o banco de prova**: cada migration é aplicada e verificada lá primeiro, e só depois entregue testada para colar na nuvem. Onde o plano diz `npx supabase db reset`, leia "aplicar o arquivo no banco de prova".
- O acesso ao banco de prova é `docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres` — `psql` não está instalado solto nesta máquina. É o `PSQL` citado nas tarefas.
- **Sem lint** como portão de verificação, também por decisão do cliente. A verificação de código é `pnpm exec tsc --noEmit`.
- **O que se cola no SQL Editor é `supabase/schema.sql`**, não os arquivos numerados. Ele é gerado por `bash supabase/build-schema.sh` concatenando as migrations em ordem, e é regenerado a cada migration nova. Um arquivo único elimina a chance de colar na ordem errada, de pular um, ou de colar uma versão desatualizada — que foi exatamente o que aconteceu na primeira tentativa. As migrations numeradas continuam existindo para leitura e histórico no git.

## Pré-requisitos

**O Docker Desktop precisa estar rodando antes da Tarefa 1.** Nesta máquina o Docker 29.5.2 está instalado mas o daemon não responde — o Docker Desktop está fechado. Sem ele, `supabase start` falha e nenhuma verificação deste plano funciona.

Conferir com:

```bash
docker info --format "{{.ServerVersion}}"
```

Se der erro de pipe, abra o Docker Desktop e espere ficar verde antes de seguir.

## Mapa de arquivos

**Banco** — `supabase/migrations/`, uma migração por tarefa, numeradas em ordem:

| Arquivo | Responsabilidade |
|---|---|
| `0001_base.sql` | Enums e `set_updated_at()` |
| `0002_identity.sql` | `profiles`, `platform_admins`, `handle_new_user()`, `is_platform_admin()` |
| `0003_tenancy.sql` | `restaurants`, `memberships`, `invites`, `menu_tags`, helpers de pertencimento, triggers de guarda |
| `0004_menu.sql` | `menu_categories`, `menu_items`, `menu_item_variants`, `menu_item_media`, helpers de visibilidade |
| `0005_infra.sql` | `rate_limit_counters`, `audit_log`, `check_rate_limit()`, `record_audit()` |
| `0006_rls.sql` | Todas as políticas de RLS |
| `0007_privileged.sql` | `preview_invite()`, `redeem_invite()`, `resolve_menu_tag()` |
| `0008_storage.sql` | Buckets e políticas de storage |

**Aplicação** — `src/`:

| Arquivo | Responsabilidade |
|---|---|
| `server/env.ts` | Validação das variáveis de ambiente no boot |
| `server/territory.ts` | Derivação de território a partir do header `Host` |
| `server/dal/_client.ts` | Único importador de `@supabase/*`; `createUserClient`, `createProxyClient` |
| `server/dal/auth.ts` | Sessão e guardas de autorização |
| `server/dal/{restaurants,menu,invites,tags,media}.ts` | Acesso a dados por domínio |
| `server/security/{tokens,client-ip,rate-limit,audit}.ts` | Primitivas de segurança |
| `server/actions/*.ts` | Server actions finas que delegam para a DAL |
| `domain/**` | Schemas Zod, tipos e DTOs. Sem I/O |
| `proxy.ts` | Território, renovação de sessão, reescrita |
| `app/(site)/**`, `app/admin/**`, `app/painel/**` | Esqueleto de rotas dos três territórios |

---

## Parte 1 — Banco

### Tarefa 1: Ambiente local, enums e gatilho de `updated_at`

**Arquivos:**
- Criar: `supabase/config.toml` (gerado pelo CLI)
- Criar: `supabase/migrations/0001_base.sql`
- Modificar: `.gitignore`

**Interfaces:**
- Consome: nada
- Produz: os tipos `public.restaurant_status`, `public.membership_role`, `public.media_kind` e a função `public.set_updated_at()`, usados por todas as migrações seguintes

- [ ] **Passo 1: Confirmar que o Docker responde**

```bash
docker info --format "{{.ServerVersion}}"
```

Esperado: um número de versão. Se der erro de pipe, abra o Docker Desktop e espere ficar verde.

- [ ] **Passo 2: Inicializar o Supabase local**

```bash
npx supabase init
```

Esperado: cria `supabase/config.toml` e `supabase/.gitignore`.

- [ ] **Passo 3: Subir a stack local**

```bash
npx supabase start
```

Esperado: imprime `API URL`, `DB URL`, `anon key` e `service_role key`. A primeira execução baixa imagens e demora vários minutos. Guarde a saída — o `anon key` é usado na Tarefa 10.

- [ ] **Passo 4: Definir o comando de consulta que será usado o plano inteiro**

Tente primeiro o `psql` direto:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select version();"
```

Se `psql` não existir nesta máquina, use o contêiner (funciona sempre):

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "select version();"
```

Esperado: a versão do PostgreSQL. **Anote qual das duas formas funcionou** — os passos seguintes se referem a ela como `PSQL`.

- [ ] **Passo 5: Escrever a migração base**

Criar `supabase/migrations/0001_base.sql`:

```sql
-- Enums do domínio. Nenhuma extensão é necessária: sha256() e convert_to()
-- são nativas do pg_catalog, e slug é forçado a minúsculas por CHECK.

create type public.restaurant_status as enum ('draft', 'active', 'suspended');
create type public.membership_role as enum ('owner', 'manager');
create type public.media_kind as enum ('image', 'video');

-- Gatilho compartilhado de updated_at. search_path travado contra
-- sequestro de execução por schema malicioso.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

- [ ] **Passo 6: Aplicar e verificar**

```bash
npx supabase db reset
```

Depois, com o `PSQL` da etapa 4:

```sql
select typname from pg_type
where typname in ('restaurant_status','membership_role','media_kind')
order by typname;
```

Esperado: exatamente três linhas — `media_kind`, `membership_role`, `restaurant_status`.

```sql
select proname, prosecdef, proconfig from pg_proc where proname = 'set_updated_at';
```

Esperado: uma linha, `prosecdef` = `f`, `proconfig` = `{search_path=""}`.

- [ ] **Passo 7: Garantir que segredo local não vaze para o git**

Conferir que `supabase/.gitignore` (criado pelo `init`) ignora `.branches` e `.temp`. Acrescentar ao `.gitignore` da raiz, se ainda não estiver:

```
.env*.local
```

- [ ] **Passo 8: Commit**

```bash
git add supabase/ .gitignore
git commit -m "feat(db): ambiente supabase local, enums e gatilho de updated_at"
```

---

### Tarefa 2: Identidade

**Arquivos:**
- Criar: `supabase/migrations/0002_identity.sql`

**Interfaces:**
- Consome: `public.set_updated_at()` da Tarefa 1
- Produz: tabelas `public.profiles` e `public.platform_admins`; função `public.is_platform_admin() → boolean`, usada por quase toda política de RLS e pelo trigger de guarda da Tarefa 3

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0002_identity.sql`:

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now()
);

-- O perfil nasce junto com o usuário. A aplicação nunca insere em profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER aqui cumpre dois papéis: dá a leitura necessária e,
-- sobretudo, evita recursão infinita quando chamada de dentro de uma
-- política de RLS.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

Esperado: aplica 0001 e 0002 sem erro.

- [ ] **Passo 3: Verificar que o gatilho de novo usuário funciona de ponta a ponta**

Com o `PSQL`, criar um usuário direto em `auth.users` e conferir que o perfil apareceu sozinho:

```sql
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'verifica@local.test', crypt('senha-de-teste', gen_salt('bf')), now(), now(), now());

select p.id, u.email, p.created_at
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'verifica@local.test';
```

Esperado: uma linha. Se vier vazio, o gatilho não disparou.

> Observação: `crypt` e `gen_salt` existem porque o próprio Supabase instala `pgcrypto` no schema `extensions` para o esquema de autenticação. Isso é infraestrutura do Supabase, não uma dependência nossa — nossas migrações e funções continuam sem usar extensão alguma.

- [ ] **Passo 4: Verificar que `is_platform_admin` é `SECURITY DEFINER` com search_path travado**

```sql
select proname, prosecdef, provolatile, proconfig
from pg_proc where proname = 'is_platform_admin';
```

Esperado: `prosecdef` = `t`, `provolatile` = `s`, `proconfig` = `{search_path=""}`.

- [ ] **Passo 5: Limpar o usuário de verificação**

```sql
delete from auth.users where email = 'verifica@local.test';
select count(*) from public.profiles;
```

Esperado: `0` — o `on delete cascade` levou o perfil junto.

- [ ] **Passo 6: Commit**

```bash
git add supabase/migrations/0002_identity.sql
git commit -m "feat(db): perfis, administradores de plataforma e criacao automatica de perfil"
```

---

### Tarefa 3: Tenancy

**Arquivos:**
- Criar: `supabase/migrations/0003_tenancy.sql`

**Interfaces:**
- Consome: `public.set_updated_at()`, `public.is_platform_admin()`
- Produz: tabelas `public.restaurants`, `public.memberships`, `public.invites`; funções `public.is_member(uuid) → boolean`, `public.is_owner(uuid) → boolean`, `public.is_restaurant_public(uuid) → boolean`

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0003_tenancy.sql`:

```sql
create table public.restaurants (
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
  constraint restaurants_slug_shape
    check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'),
  constraint restaurants_slug_not_reserved
    check (slug not in (
      'admin', 'painel', 'api', 't', 'entrar', 'convite',
      'assets', 'static', 'public', 'favicon', 'robots', 'sitemap'
    ))
);

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

create index restaurants_public_slug_idx
  on public.restaurants (slug)
  where status = 'active' and deleted_at is null;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);
create index memberships_restaurant_idx on public.memberships (restaurant_id);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role public.membership_role not null,
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

create index invites_restaurant_idx on public.invites (restaurant_id);

-- A plaquinha fisica. O token fica em texto puro de proposito: ele esta
-- impresso num QR pendurado na parede, nao e segredo, e guardar so o hash
-- impediria reimprimir a plaquinha depois.
create table public.menu_tags (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  public_token text not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create index menu_tags_restaurant_idx on public.menu_tags (restaurant_id);

-- O token gravado no NFC e o restaurante de origem nunca mudam: a plaquinha
-- e hardware, e reatribui-la seria trocar o significado de um objeto fisico
-- que ja esta na parede de alguem.
create or replace function public.menu_tags_guard_immutable_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.public_token is distinct from old.public_token then
    raise exception 'public_token da plaquinha e imutavel' using errcode = '42501';
  end if;
  if new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'restaurant_id da plaquinha e imutavel' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger menu_tags_guard_immutable
  before update on public.menu_tags
  for each row execute function public.menu_tags_guard_immutable_columns();

create or replace function public.is_member(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = rid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_owner(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.restaurant_id = rid
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

create or replace function public.is_restaurant_public(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants r
    where r.id = rid and r.status = 'active' and r.deleted_at is null
  );
$$;

-- O dono edita identidade e tema, mas endereco, situacao e remocao sao
-- privilegio da plataforma. Garantido aqui, nao por convencao na aplicacao.
create or replace function public.restaurants_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.is_platform_admin() then
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
$$;

create trigger restaurants_guard_privileged
  before update on public.restaurants
  for each row execute function public.restaurants_guard_privileged_columns();
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

- [ ] **Passo 3: Verificar que slug reservado é rejeitado**

```sql
insert into public.restaurants (slug, name) values ('admin', 'Tentativa');
```

Esperado: **erro** `restaurants_slug_not_reserved`. Se inserir, a constraint está errada.

- [ ] **Passo 4: Verificar que slug com maiúscula é rejeitado**

```sql
insert into public.restaurants (slug, name) values ('Pizzaria', 'Tentativa');
```

Esperado: **erro** `restaurants_slug_shape`. Esta é a constraint que dispensa `citext`.

- [ ] **Passo 5: Verificar que slug válido passa**

```sql
insert into public.restaurants (slug, name, status)
values ('pizzaria-do-ze', 'Pizzaria do Zé', 'active');

select slug, status, public.is_restaurant_public(id) as publico
from public.restaurants where slug = 'pizzaria-do-ze';
```

Esperado: uma linha com `publico` = `t`.

- [ ] **Passo 6: Verificar o gatilho de guarda**

Sem sessão autenticada, `is_platform_admin()` é falso, então a alteração precisa ser barrada:

```sql
update public.restaurants set slug = 'outro-nome' where slug = 'pizzaria-do-ze';
```

Esperado: **erro** `alterar slug exige administrador da plataforma`.

E uma alteração permitida precisa passar:

```sql
update public.restaurants set name = 'Pizzaria do Zé Matriz' where slug = 'pizzaria-do-ze';
select name, updated_at > created_at as updated_at_mexeu from public.restaurants where slug = 'pizzaria-do-ze';
```

Esperado: nome alterado e `updated_at_mexeu` = `t`, confirmando também o gatilho da Tarefa 1.

- [ ] **Passo 7: Verificar que o token da plaquinha é imutável**

```sql
insert into public.menu_tags (restaurant_id, public_token, label)
select id, 'VERIFICA0000TOKEN', 'Mesa 1' from public.restaurants where slug = 'pizzaria-do-ze';

update public.menu_tags set public_token = 'OUTRO0000000TOKEN' where label = 'Mesa 1';
```

Esperado: **erro** `public_token da plaquinha e imutavel`.

E o rótulo, que é justamente o que o restaurante pode ajustar, tem que passar:

```sql
update public.menu_tags set label = 'Mesa 1 - janela' where public_token = 'VERIFICA0000TOKEN';
select label, is_active from public.menu_tags where public_token = 'VERIFICA0000TOKEN';
```

Esperado: `Mesa 1 - janela`, `is_active` = `t`.

- [ ] **Passo 8: Commit**

```bash
git add supabase/migrations/0003_tenancy.sql
git commit -m "feat(db): restaurantes, vinculos, convites, plaquinhas e guarda de colunas privilegiadas"
```

---

### Tarefa 4: Cardápio e o isolamento estrutural

Esta é a tarefa que torna vazamento entre restaurantes **inexpressável** no banco, e não apenas improvável. A verificação do Passo 4 é a prova.

**Arquivos:**
- Criar: `supabase/migrations/0004_menu.sql`

**Interfaces:**
- Consome: `public.restaurants`, `public.set_updated_at()`, `public.is_restaurant_public(uuid)`
- Produz: tabelas `public.menu_categories`, `public.menu_items`, `public.menu_item_variants`, `public.menu_item_media`; funções `public.is_category_visible(uuid) → boolean` e `public.is_menu_item_public(uuid) → boolean`

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0004_menu.sql`:

```sql
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Alvo da chave estrangeira composta de menu_items.
  unique (id, restaurant_id)
);

create trigger menu_categories_set_updated_at
  before update on public.menu_categories
  for each row execute function public.set_updated_at();

create index menu_categories_restaurant_idx
  on public.menu_categories (restaurant_id, position);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text,
  base_price_cents integer not null check (base_price_cents >= 0),
  is_available boolean not null default true,
  is_visible boolean not null default true,
  position integer not null default 0,
  dietary_tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id),
  -- O coracao do isolamento: o item so aponta para uma categoria do MESMO
  -- restaurante. Referencia cruzada e recusada pelo banco, nao validada
  -- por codigo que alguem pode esquecer de chamar.
  constraint menu_items_category_same_restaurant
    foreign key (category_id, restaurant_id)
    references public.menu_categories (id, restaurant_id)
    on delete cascade
);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create index menu_items_category_idx on public.menu_items (category_id, position);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id);

create table public.menu_item_variants (
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

create trigger menu_item_variants_set_updated_at
  before update on public.menu_item_variants
  for each row execute function public.set_updated_at();

create index menu_item_variants_item_idx on public.menu_item_variants (item_id, position);

create table public.menu_item_media (
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
  -- do caminho e a fronteira do inquilino.
  constraint menu_item_media_path_prefix
    check (storage_path like restaurant_id::text || '/%')
);

create index menu_item_media_item_idx on public.menu_item_media (item_id, position);

create or replace function public.is_category_visible(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.menu_categories c
    where c.id = cid and c.is_visible
  );
$$;

create or replace function public.is_menu_item_public(iid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
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
$$;
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

- [ ] **Passo 3: Montar dois restaurantes para a verificação**

```sql
insert into public.restaurants (slug, name, status) values
  ('restaurante-a', 'Restaurante A', 'active'),
  ('restaurante-b', 'Restaurante B', 'active');

insert into public.menu_categories (restaurant_id, name)
select id, 'Entradas' from public.restaurants where slug = 'restaurante-a';

insert into public.menu_categories (restaurant_id, name)
select id, 'Bebidas' from public.restaurants where slug = 'restaurante-b';
```

Esperado: dois restaurantes, uma categoria em cada.

- [ ] **Passo 4: Provar que referência cruzada é impossível**

Tentar criar, no restaurante A, um item que aponta para a categoria do restaurante B:

```sql
insert into public.menu_items (restaurant_id, category_id, name, base_price_cents)
select
  (select id from public.restaurants where slug = 'restaurante-a'),
  (select id from public.menu_categories c
     join public.restaurants r on r.id = c.restaurant_id
     where r.slug = 'restaurante-b'),
  'Item que nao deveria existir',
  1000;
```

Esperado: **erro** de violação da constraint `menu_items_category_same_restaurant`.

Este passo é o mais importante da Tarefa 4. Se o insert **funcionar**, a chave estrangeira composta está mal definida e o isolamento não existe — pare e corrija antes de seguir.

- [ ] **Passo 5: Provar que a referência correta funciona**

```sql
insert into public.menu_items (restaurant_id, category_id, name, base_price_cents)
select c.restaurant_id, c.id, 'Bruschetta', 2490
from public.menu_categories c
join public.restaurants r on r.id = c.restaurant_id
where r.slug = 'restaurante-a';

select i.name, i.base_price_cents, public.is_menu_item_public(i.id) as publico
from public.menu_items i where i.name = 'Bruschetta';
```

Esperado: uma linha, `base_price_cents` = `2490`, `publico` = `t`.

- [ ] **Passo 6: Provar que categoria oculta esconde o item**

```sql
update public.menu_categories set is_visible = false
where restaurant_id = (select id from public.restaurants where slug = 'restaurante-a');

select public.is_menu_item_public(id) as publico from public.menu_items where name = 'Bruschetta';
```

Esperado: `publico` = `f`. Reverter depois:

```sql
update public.menu_categories set is_visible = true
where restaurant_id = (select id from public.restaurants where slug = 'restaurante-a');
```

- [ ] **Passo 7: Provar que o caminho de mídia exige o prefixo do restaurante**

```sql
insert into public.menu_item_media (restaurant_id, item_id, kind, storage_path)
select i.restaurant_id, i.id, 'image', 'caminho-errado/foto.webp'
from public.menu_items i where i.name = 'Bruschetta';
```

Esperado: **erro** `menu_item_media_path_prefix`.

- [ ] **Passo 8: Commit**

```bash
git add supabase/migrations/0004_menu.sql
git commit -m "feat(db): cardapio com isolamento estrutural por chave estrangeira composta"
```

---

### Tarefa 5: Infraestrutura — rate limit e auditoria

**Arquivos:**
- Criar: `supabase/migrations/0005_infra.sql`

**Interfaces:**
- Consome: `public.profiles`, `public.restaurants`
- Produz: `public.check_rate_limit(text, text, integer, integer) → boolean` e `public.record_audit(text, text, uuid, uuid, jsonb, inet) → void`, consumidos pela Tarefa 7 e por `src/server/security/` na Tarefa 14

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0005_infra.sql`:

```sql
create table public.rate_limit_counters (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, identifier, window_start)
);

create index rate_limit_counters_window_idx on public.rate_limit_counters (window_start);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  subject_type text not null,
  subject_id uuid,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_log_restaurant_idx on public.audit_log (restaurant_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

-- Janela fixa. O UPSERT e atomico: duas requisicoes simultaneas nunca
-- conseguem ler o mesmo contador e gravar o mesmo incremento.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_identifier text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_counters (bucket, identifier, window_start, hits)
  values (p_bucket, p_identifier, v_window_start, 1)
  on conflict (bucket, identifier, window_start)
    do update set hits = rate_limit_counters.hits + 1
  returning hits into v_hits;

  -- Limpeza oportunista: em cerca de 1% das chamadas, remove janelas velhas.
  -- Evita crescimento indefinido da tabela sem exigir rotina agendada.
  if random() < 0.01 then
    delete from public.rate_limit_counters
    where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

create or replace function public.record_audit(
  p_action text,
  p_subject_type text,
  p_subject_id uuid default null,
  p_restaurant_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_ip inet default null
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.audit_log
    (actor_id, action, subject_type, subject_id, restaurant_id, metadata, ip)
  values
    ((select auth.uid()), p_action, p_subject_type, p_subject_id, p_restaurant_id, p_metadata, p_ip);
$$;

-- Estas duas tabelas nao sao acessiveis por ninguem. So as funcoes
-- SECURITY DEFINER acima conseguem toca-las.
revoke all on public.rate_limit_counters from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;

grant execute on function public.check_rate_limit(text, text, integer, integer) to anon, authenticated;
grant execute on function public.record_audit(text, text, uuid, uuid, jsonb, inet) to authenticated;
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

- [ ] **Passo 3: Verificar que o rate limit conta e corta**

```sql
select public.check_rate_limit('verifica', 'ip-1', 3, 60) as chamada_1,
       public.check_rate_limit('verifica', 'ip-1', 3, 60) as chamada_2,
       public.check_rate_limit('verifica', 'ip-1', 3, 60) as chamada_3,
       public.check_rate_limit('verifica', 'ip-1', 3, 60) as chamada_4;
```

Esperado: `t`, `t`, `t`, `f`. A quarta chamada estoura o limite de 3.

- [ ] **Passo 4: Verificar que identificadores diferentes não se misturam**

```sql
select public.check_rate_limit('verifica', 'ip-2', 3, 60) as outro_ip;
```

Esperado: `t` — o `ip-2` tem contador próprio, mesmo com o `ip-1` já bloqueado.

- [ ] **Passo 5: Limpar**

```sql
delete from public.rate_limit_counters where bucket = 'verifica';
```

- [ ] **Passo 6: Commit**

```bash
git add supabase/migrations/0005_infra.sql
git commit -m "feat(db): rate limit por janela fixa e log de auditoria"
```

---

### Tarefa 6: Políticas de RLS

A última linha de defesa. Depois desta tarefa, toda tabela nega por padrão e só libera o que estiver escrito aqui.

**Arquivos:**
- Criar: `supabase/migrations/0006_rls.sql`

**Interfaces:**
- Consome: todos os helpers `public.is_*()` das Tarefas 2 a 4
- Produz: nenhuma interface de código. Produz a garantia sobre a qual toda a Parte 2 se apoia

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0006_rls.sql`:

```sql
alter table public.profiles            enable row level security;
alter table public.platform_admins     enable row level security;
alter table public.restaurants         enable row level security;
alter table public.memberships         enable row level security;
alter table public.invites             enable row level security;
alter table public.menu_tags           enable row level security;
alter table public.menu_categories     enable row level security;
alter table public.menu_items          enable row level security;
alter table public.menu_item_variants  enable row level security;
alter table public.menu_item_media     enable row level security;
alter table public.audit_log           enable row level security;
alter table public.rate_limit_counters enable row level security;

-- profiles -------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_platform_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- platform_admins ------------------------------------------------------
-- Sem INSERT, UPDATE ou DELETE: nao existe caminho na aplicacao que
-- promova alguem a administrador. So o seed manual da Tarefa 9.
create policy platform_admins_select on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin());

-- restaurants ----------------------------------------------------------
create policy restaurants_select_public on public.restaurants
  for select to anon, authenticated
  using (status = 'active' and deleted_at is null);

create policy restaurants_select_member on public.restaurants
  for select to authenticated
  using (public.is_member(id) or public.is_platform_admin());

create policy restaurants_insert_admin on public.restaurants
  for insert to authenticated
  with check (public.is_platform_admin());

create policy restaurants_update on public.restaurants
  for update to authenticated
  using (public.is_owner(id) or public.is_platform_admin())
  with check (public.is_owner(id) or public.is_platform_admin());

-- Sem politica de DELETE: remover restaurante e impossivel por SQL da
-- aplicacao. A remocao e logica, via deleted_at, e so pela plataforma.

-- memberships ----------------------------------------------------------
create policy memberships_select on public.memberships
  for select to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

create policy memberships_insert_admin on public.memberships
  for insert to authenticated
  with check (public.is_platform_admin());

create policy memberships_update_admin on public.memberships
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (public.is_owner(restaurant_id) or public.is_platform_admin());

-- invites --------------------------------------------------------------
create policy invites_select on public.invites
  for select to authenticated
  using (public.is_owner(restaurant_id) or public.is_platform_admin());

create policy invites_insert_admin on public.invites
  for insert to authenticated
  with check (public.is_platform_admin());

create policy invites_update_admin on public.invites
  for update to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- menu_tags ------------------------------------------------------------
-- Anonimo nao enxerga nada aqui. A resolucao de /t/{token} passa pela
-- funcao resolve_menu_tag da Tarefa 7, que impede enumeracao.
create policy menu_tags_select_member on public.menu_tags
  for select to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_tags_insert_admin on public.menu_tags
  for insert to authenticated
  with check (public.is_platform_admin());

create policy menu_tags_update_member on public.menu_tags
  for update to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin())
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_tags_delete_admin on public.menu_tags
  for delete to authenticated
  using (public.is_platform_admin());

-- menu_categories ------------------------------------------------------
create policy menu_categories_select_public on public.menu_categories
  for select to anon, authenticated
  using (is_visible and public.is_restaurant_public(restaurant_id));

create policy menu_categories_select_member on public.menu_categories
  for select to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_categories_insert on public.menu_categories
  for insert to authenticated
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_categories_update on public.menu_categories
  for update to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin())
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_categories_delete on public.menu_categories
  for delete to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

-- menu_items -----------------------------------------------------------
create policy menu_items_select_public on public.menu_items
  for select to anon, authenticated
  using (
    is_visible
    and public.is_restaurant_public(restaurant_id)
    and public.is_category_visible(category_id)
  );

create policy menu_items_select_member on public.menu_items
  for select to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_items_insert on public.menu_items
  for insert to authenticated
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_items_update on public.menu_items
  for update to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin())
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_items_delete on public.menu_items
  for delete to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

-- menu_item_variants ---------------------------------------------------
create policy menu_item_variants_select_public on public.menu_item_variants
  for select to anon, authenticated
  using (public.is_menu_item_public(item_id));

create policy menu_item_variants_select_member on public.menu_item_variants
  for select to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_item_variants_insert on public.menu_item_variants
  for insert to authenticated
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_item_variants_update on public.menu_item_variants
  for update to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin())
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_item_variants_delete on public.menu_item_variants
  for delete to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

-- menu_item_media ------------------------------------------------------
create policy menu_item_media_select_public on public.menu_item_media
  for select to anon, authenticated
  using (public.is_menu_item_public(item_id));

create policy menu_item_media_select_member on public.menu_item_media
  for select to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_item_media_insert on public.menu_item_media
  for insert to authenticated
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_item_media_update on public.menu_item_media
  for update to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin())
  with check (public.is_member(restaurant_id) or public.is_platform_admin());

create policy menu_item_media_delete on public.menu_item_media
  for delete to authenticated
  using (public.is_member(restaurant_id) or public.is_platform_admin());

-- audit_log ------------------------------------------------------------
-- Sem politica de INSERT: so record_audit escreve aqui.
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.is_platform_admin());

-- rate_limit_counters --------------------------------------------------
-- Nenhuma politica, de proposito. RLS ligada sem politica nega tudo.
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

- [ ] **Passo 3: Verificar que RLS está ligada em toda tabela**

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;
```

Esperado: **todas** as linhas com `rowsecurity` = `t`. Qualquer `f` é uma tabela desprotegida — pare e corrija.

- [ ] **Passo 4: Verificar a contagem de políticas por tabela**

```sql
select tablename, count(*) as politicas
from pg_policies where schemaname = 'public'
group by tablename order by tablename;
```

Esperado: `audit_log` 1, `invites` 3, `memberships` 4, `menu_categories` 5, `menu_item_media` 5, `menu_item_variants` 5, `menu_items` 5, `menu_tags` 4, `platform_admins` 1, `profiles` 2, `restaurants` 4. A tabela `rate_limit_counters` **não aparece** nesta listagem, porque não tem política nenhuma — é o resultado correto.

- [ ] **Passo 5: Commit**

```bash
git add supabase/migrations/0006_rls.sql
git commit -m "feat(db): politicas de RLS em todas as tabelas, negando por padrao"
```

---

### Tarefa 7: Funções de convite e plaquinha

**Arquivos:**
- Criar: `supabase/migrations/0007_privileged.sql`

**Interfaces:**
- Consome: `public.invites`, `public.memberships`, `public.menu_tags`, `public.record_audit(...)`
- Produz: `public.preview_invite(text)`, `public.redeem_invite(text) → uuid`, `public.resolve_menu_tag(text)`, chamadas por `src/server/dal/invites.ts` e `tags.ts` nas Tarefas 15 e 16

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0007_privileged.sql`:

```sql
-- Recebe o token EM CLARO e calcula o hash aqui dentro. Isso e essencial:
-- se a funcao aceitasse o hash, um vazamento do banco entregaria hashes
-- diretamente utilizaveis, anulando o motivo de guardar hash.
--
-- Retorna zero linhas para token desconhecido, expirado, revogado OU ja
-- usado. As quatro situacoes sao indistinguiveis de fora, o que impede
-- descobrir que um convite existe.
create or replace function public.preview_invite(p_token text)
returns table (restaurant_name text, invite_role public.membership_role)
language sql
stable
security definer
set search_path = ''
as $$
  select r.name, i.role
  from public.invites i
  join public.restaurants r on r.id = i.restaurant_id
  where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and i.expires_at > now()
    and i.redeemed_at is null
    and i.revoked_at is null;
$$;

create or replace function public.redeem_invite(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invite public.invites%rowtype;
begin
  if v_uid is null then
    raise exception 'convite invalido' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  -- A corrida entre dois cliques simultaneos no mesmo link e resolvida
  -- aqui pelo proprio Postgres: so uma transacao encontra redeemed_at
  -- ainda nulo. Sem lock na aplicacao.
  update public.invites i
     set redeemed_at = now(),
         redeemed_by = v_uid
   where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
     and i.expires_at > now()
     and i.redeemed_at is null
     and i.revoked_at is null
     and (i.email is null or lower(i.email) = lower(v_email))
  returning i.* into v_invite;

  -- Mensagem unica para todos os modos de falha, pela mesma razao de
  -- preview_invite: nao revelar qual condicao falhou.
  if not found then
    raise exception 'convite invalido' using errcode = '42501';
  end if;

  insert into public.memberships (restaurant_id, user_id, role)
  values (v_invite.restaurant_id, v_uid, v_invite.role)
  on conflict (restaurant_id, user_id) do nothing;

  perform public.record_audit(
    'invite.redeemed',
    'invite',
    v_invite.id,
    v_invite.restaurant_id,
    jsonb_build_object('role', v_invite.role)
  );

  return v_invite.restaurant_id;
end;
$$;

-- Resolve a plaquinha sem dar a anonimos qualquer leitura sobre menu_tags,
-- o que impediria enumerar as plaquinhas de todos os restaurantes.
create or replace function public.resolve_menu_tag(p_token text)
returns table (restaurant_slug text, tag_label text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return query
    update public.menu_tags t
       set last_seen_at = now()
      from public.restaurants r
     where r.id = t.restaurant_id
       and t.public_token = p_token
       and t.is_active
       and r.status = 'active'
       and r.deleted_at is null
    returning r.slug, t.label;
end;
$$;

grant execute on function public.preview_invite(text) to anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.resolve_menu_tag(text) to anon, authenticated;
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

- [ ] **Passo 3: Montar um restaurante, um usuário e um convite**

```sql
insert into public.restaurants (slug, name, status)
values ('restaurante-convite', 'Restaurante do Convite', 'active');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'convidado@local.test',
        crypt('senha-de-teste', gen_salt('bf')), now(), now(), now());

-- O token em claro e 'token-de-verificacao'. Guardamos so o hash.
insert into public.invites (restaurant_id, role, token_hash, created_by, expires_at)
select r.id, 'owner', sha256(convert_to('token-de-verificacao', 'UTF8')),
       '11111111-1111-1111-1111-111111111111', now() + interval '7 days'
from public.restaurants r where r.slug = 'restaurante-convite';
```

- [ ] **Passo 4: Verificar que a prévia funciona com o token certo e cala com o errado**

```sql
select * from public.preview_invite('token-de-verificacao');
select count(*) as com_token_errado from public.preview_invite('token-errado');
```

Esperado: a primeira devolve uma linha com `Restaurante do Convite` e `owner`. A segunda devolve `0`.

- [ ] **Passo 5: Verificar que token expirado é indistinguível de inexistente**

```sql
update public.invites set expires_at = now() - interval '1 day';
select count(*) as expirado from public.preview_invite('token-de-verificacao');
update public.invites set expires_at = now() + interval '7 days';
```

Esperado: `0`. Este é o passo que prova que um atacante não consegue descobrir que o convite existe.

- [ ] **Passo 6: Verificar o resgate, simulando o usuário autenticado**

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true);

select public.redeem_invite('token-de-verificacao') as restaurante_vinculado;

select count(*) as vinculos from public.memberships
where user_id = '11111111-1111-1111-1111-111111111111';

select action, subject_type from public.audit_log where action = 'invite.redeemed';
commit;
```

Esperado: devolve o id do restaurante, `vinculos` = `1`, e uma linha de auditoria `invite.redeemed`.

- [ ] **Passo 7: Verificar que o mesmo link não funciona duas vezes**

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true);
select public.redeem_invite('token-de-verificacao');
rollback;
```

Esperado: **erro** `convite invalido`. É a garantia de uso único.

- [ ] **Passo 8: Verificar a resolução de plaquinha**

```sql
insert into public.menu_tags (restaurant_id, public_token, label)
select id, 'TOKENPLAQUINHA01', 'Mesa 7'
from public.restaurants where slug = 'restaurante-convite';

select * from public.resolve_menu_tag('TOKENPLAQUINHA01');
select count(*) as token_errado from public.resolve_menu_tag('ZZZZ9999ZZZZ9999');

update public.menu_tags set is_active = false where public_token = 'TOKENPLAQUINHA01';
select count(*) as inativa from public.resolve_menu_tag('TOKENPLAQUINHA01');
```

Esperado: a primeira devolve `restaurante-convite` e `Mesa 7`; `token_errado` = `0`; `inativa` = `0`.

- [ ] **Passo 9: Commit**

```bash
git add supabase/migrations/0007_privileged.sql
git commit -m "feat(db): funcoes de convite com uso unico atomico e resolucao de plaquinha"
```

---

### Tarefa 8: Storage

**Arquivos:**
- Criar: `supabase/migrations/0008_storage.sql`

**Interfaces:**
- Consome: `public.is_member(uuid)`, `public.is_platform_admin()`
- Produz: buckets `menu-images` e `menu-videos`, e `public.restaurant_id_from_storage_path(text) → uuid`, usada por `src/server/dal/media.ts` na Tarefa 16

- [ ] **Passo 1: Escrever a migração**

Criar `supabase/migrations/0008_storage.sql`:

```sql
-- Dois buckets em vez de um porque o limite de tamanho e a lista de tipos
-- sao configuracao DO BUCKET, aplicada pelo proprio Supabase no servidor.
-- Com um bucket so, o teto teria que ser o maior dos dois e alguem subiria
-- uma "foto" de 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('menu-images', 'menu-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('menu-videos', 'menu-videos', true, 10485760,
   array['video/mp4', 'video/webm'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Extrai o id do restaurante do prefixo do caminho. Devolve null quando o
-- caminho nao comeca com um uuid, para que a politica NEGUE em vez de
-- levantar erro de conversao.
create or replace function public.restaurant_id_from_storage_path(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_first text := split_part(p_name, '/', 1);
begin
  return v_first::uuid;
exception when others then
  return null;
end;
$$;

-- Leitura publica: o cardapio e publico.
create policy menu_media_select_public on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('menu-images', 'menu-videos'));

-- Escrita: o prefixo do caminho E a fronteira do inquilino, verificada
-- pelo banco. Quem nao e membro daquele restaurante nao escreve na pasta
-- dele, independentemente do que a aplicacao mande.
create policy menu_media_insert_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('menu-images', 'menu-videos')
    and public.is_member(public.restaurant_id_from_storage_path(name))
  );

create policy menu_media_update_member on storage.objects
  for update to authenticated
  using (
    bucket_id in ('menu-images', 'menu-videos')
    and public.is_member(public.restaurant_id_from_storage_path(name))
  )
  with check (
    bucket_id in ('menu-images', 'menu-videos')
    and public.is_member(public.restaurant_id_from_storage_path(name))
  );

create policy menu_media_delete_member on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('menu-images', 'menu-videos')
    and public.is_member(public.restaurant_id_from_storage_path(name))
  );
```

- [ ] **Passo 2: Aplicar**

```bash
npx supabase db reset
```

- [ ] **Passo 3: Verificar a configuração dos buckets**

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id in ('menu-images', 'menu-videos') order by id;
```

Esperado: `menu-images` com limite `5242880` e 4 tipos de imagem; `menu-videos` com `10485760` e 2 tipos de vídeo.

- [ ] **Passo 4: Verificar que caminho sem uuid devolve nulo em vez de estourar**

```sql
select public.restaurant_id_from_storage_path('caminho/qualquer/foto.webp') as invalido,
       public.restaurant_id_from_storage_path('11111111-1111-1111-1111-111111111111/item/foto.webp') as valido;
```

Esperado: `invalido` vazio e `valido` = `11111111-1111-1111-1111-111111111111`. Se o primeiro der erro em vez de nulo, a política de storage vai quebrar em vez de negar.

- [ ] **Passo 5: Commit**

```bash
git add supabase/migrations/0008_storage.sql
git commit -m "feat(db): buckets de midia com limite por tipo e prefixo como fronteira de inquilino"
```

---

### Tarefa 9: Bootstrap do administrador e prova de isolamento

Esta tarefa fecha a Parte 1 provando, com dois usuários reais e RLS ativa, que um restaurante não enxerga o outro.

**Arquivos:**
- Criar: `supabase/seed/bootstrap-admin.sql`
- Criar: `supabase/seed/verificar-isolamento.sql`

**Interfaces:**
- Consome: todo o schema das Tarefas 1 a 8
- Produz: nenhuma interface de código

- [ ] **Passo 1: Escrever o seed de bootstrap**

Criar `supabase/seed/bootstrap-admin.sql`:

```sql
-- Promove a administrador da plataforma o usuario com o e-mail informado.
-- Passo MANUAL, executado uma unica vez por ambiente. Nao existe caminho
-- na aplicacao que faca isso, de proposito: uma porta de promocao de
-- privilegio no codigo seria exatamente o que um atacante procuraria.
--
-- Uso:
--   psql "<DB_URL>" -v email="'voce@exemplo.com'" -f supabase/seed/bootstrap-admin.sql

insert into public.platform_admins (user_id)
select u.id from auth.users u where lower(u.email) = lower(:email)
on conflict (user_id) do nothing;

select u.email, pa.granted_at
from public.platform_admins pa
join auth.users u on u.id = pa.user_id;
```

- [ ] **Passo 2: Escrever o script de verificação de isolamento**

Criar `supabase/seed/verificar-isolamento.sql`:

```sql
-- Prova que a RLS isola os restaurantes. Cria dois donos e dois
-- restaurantes, depois consulta como cada um e confere o que enxerga.
-- Roda inteiro dentro de uma transacao e desfaz no final.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dono-a@local.test', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dono-b@local.test', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.restaurants (id, slug, name, status) values
  ('a0000000-0000-0000-0000-000000000000', 'isolamento-a', 'Restaurante A', 'active'),
  ('b0000000-0000-0000-0000-000000000000', 'isolamento-b', 'Restaurante B', 'draft');

insert into public.memberships (restaurant_id, user_id, role) values
  ('a0000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
  ('b0000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner');

insert into public.menu_categories (id, restaurant_id, name) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Pratos A'),
  ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Pratos B');

insert into public.menu_items (restaurant_id, category_id, name, base_price_cents) values
  ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'Item secreto do A', 1000),
  ('b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Item secreto do B', 2000);

-- Como o dono A -------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'role', 'authenticated')::text, true);

select 'dono A ve itens' as verificacao, count(*) as total,
       bool_and(name like '%do A') as todos_sao_do_a
from public.menu_items;

select 'dono A ve vinculos' as verificacao, count(*) as total
from public.memberships;

-- Como anonimo --------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', null, true);

select 'anonimo ve restaurantes' as verificacao, count(*) as total,
       bool_and(slug = 'isolamento-a') as so_o_ativo
from public.restaurants;

select 'anonimo ve convites' as verificacao, count(*) as total from public.invites;
select 'anonimo ve plaquinhas' as verificacao, count(*) as total from public.menu_tags;

reset role;
rollback;
```

- [ ] **Passo 3: Rodar a verificação**

```bash
npx supabase db reset
```

Depois, com o `PSQL` da Tarefa 1, rodar `supabase/seed/verificar-isolamento.sql`.

Esperado, linha por linha:

| Verificação | Resultado exigido |
|---|---|
| dono A ve itens | `total` = 1 e `todos_sao_do_a` = `t` |
| dono A ve vinculos | `total` = 1 |
| anonimo ve restaurantes | `total` = 1 e `so_o_ativo` = `t` (o B é `draft` e não aparece) |
| anonimo ve convites | `total` = 0 |
| anonimo ve plaquinhas | `total` = 0 |

**Qualquer número diferente disso é vazamento entre inquilinos.** Pare, corrija a política responsável e rode de novo antes de seguir para a Parte 2.

- [ ] **Passo 4: Commit**

```bash
git add supabase/seed/
git commit -m "feat(db): seed de bootstrap do admin e script de verificacao de isolamento"
```

---

## Parte 2 — Aplicação

### Tarefa 10: Ambiente e territórios

**Arquivos:**
- Criar: `src/server/env.ts`
- Criar: `src/server/territory.ts`
- Criar: `.env.local` (não versionado)
- Criar: `.env.example`

**Interfaces:**
- Consome: a saída de `npx supabase start` da Tarefa 1
- Produz: `env` (objeto validado), `Territory` (`'site' | 'admin' | 'painel'`), `territoryFromHost(host: string | null) → Territory`, `originFor(territory: Territory, protocol: string) → string`, `cookieNameFor: Record<Territory, string>`

- [ ] **Passo 1: Criar `.env.local` com os valores do Supabase local**

Pegar `API URL` e `anon key` da saída de `npx supabase start` (rode `npx supabase status` se tiver perdido):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key da saida do supabase start>
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
```

**Não** coloque `SUPABASE_SERVICE_ROLE_KEY` aqui. A aplicação não usa essa chave, e o jeito mais seguro de garantir que ela não vaze é ela não existir no ambiente.

- [ ] **Passo 2: Criar `.env.example` versionado**

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
```

- [ ] **Passo 3: Criar `src/server/env.ts`**

```ts
import 'server-only'
import { z } from 'zod'

// Validar no boot faz variavel faltando derrubar a subida, em vez de virar
// undefined silencioso que aparece como bug tres telas adiante.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: 'NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL valida',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, {
    error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY ausente ou truncada',
  }),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1, {
    error: 'NEXT_PUBLIC_ROOT_DOMAIN ausente',
  }),
})

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
})

if (!parsed.success) {
  throw new Error(
    'Variaveis de ambiente invalidas:\n' +
      parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n'),
  )
}

export const env = parsed.data
```

- [ ] **Passo 4: Criar `src/server/territory.ts`**

```ts
import 'server-only'
import { env } from '@/server/env'

export type Territory = 'site' | 'admin' | 'painel'

const ADMIN_PREFIX = 'admin.'
const PAINEL_PREFIX = 'painel.'

// Em desenvolvimento o Host chega como "admin.localhost:3000". Sem tirar a
// porta, nenhuma comparacao bate e todo mundo cai no territorio publico.
function stripPort(host: string): string {
  return host.split(':')[0].toLowerCase()
}

export function territoryFromHost(host: string | null): Territory {
  if (!host) return 'site'

  const root = stripPort(env.NEXT_PUBLIC_ROOT_DOMAIN)
  const current = stripPort(host)

  if (current === `${ADMIN_PREFIX}${root}`) return 'admin'
  if (current === `${PAINEL_PREFIX}${root}`) return 'painel'

  // Host desconhecido cai deliberadamente no territorio de MENOR
  // privilegio. Um header Host forjado nunca deve promover ninguem.
  return 'site'
}

export function originFor(territory: Territory, protocol: string): string {
  const root = env.NEXT_PUBLIC_ROOT_DOMAIN
  if (territory === 'admin') return `${protocol}//${ADMIN_PREFIX}${root}`
  if (territory === 'painel') return `${protocol}//${PAINEL_PREFIX}${root}`
  return `${protocol}//${root}`
}

// Nome distinto por territorio. Os cookies ja sao host-only, entao nao
// colidiriam de qualquer forma; isto e seguro barato contra uma
// configuracao futura de dominio pai fazer um territorio sombrear o outro.
export const cookieNameFor: Record<Territory, string> = {
  site: 'sb-site',
  admin: 'sb-admin',
  painel: 'sb-painel',
}
```

- [ ] **Passo 5: Verificar que compila e que o ambiente é validado**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhum erro.

Depois, provar que a validação realmente derruba: renomeie temporariamente `NEXT_PUBLIC_ROOT_DOMAIN` para `ROOT_DOMAIN` em `.env.local`, rode `pnpm dev` e confirme que a subida falha com a mensagem `NEXT_PUBLIC_ROOT_DOMAIN ausente`. Desfaça em seguida.

- [ ] **Passo 6: Commit**

```bash
git add src/server/env.ts src/server/territory.ts .env.example
git commit -m "feat(app): validacao de ambiente no boot e derivacao de territorio pelo Host"
```

---

### Tarefa 11: A única porta para o banco

Esta tarefa cria a fronteira e, no mesmo passo, a regra de lint que a torna mecânica. As duas juntas ou nenhuma — uma fronteira que depende de alguém lembrar não é fronteira.

**Arquivos:**
- Criar: `src/server/dal/_client.ts`
- Modificar: `eslint.config.mjs`

**Interfaces:**
- Consome: `env`, `Territory`, `cookieNameFor`
- Produz: `createUserClient(territory: Territory) → Promise<SupabaseClient>` e `createProxyClient(request: NextRequest, response: NextResponse, territory: Territory) → SupabaseClient`. **Nenhum outro arquivo do projeto pode importar `@supabase/*`.**

- [ ] **Passo 1: Criar `src/server/dal/_client.ts`**

```ts
import 'server-only'
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'
import { env } from '@/server/env'
import { cookieNameFor, type Territory } from '@/server/territory'

function cookieOptionsFor(territory: Territory): CookieOptionsWithName {
  return {
    name: cookieNameFor[territory],
    // `domain` NAO e definido, de proposito. Sem o atributo Domain o cookie
    // nasce host-only, e host-only e exatamente o isolamento entre
    // territorios: a sessao do admin nao existe no dominio publico.
    // Definir o dominio pai aqui seria o unico jeito de quebrar a barreira.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

export async function createUserClient(
  territory: Territory,
): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: cookieOptionsFor(territory),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server components nao podem escrever cookies nem headers de
            // resposta. A renovacao de sessao e os headers anti-cache sao
            // responsabilidade do proxy; ignorar aqui e o comportamento
            // documentado pelo Supabase.
          }
        },
      },
    },
  )
}

// O proxy precisa de um cliente para renovar a sessao. Ele obtem o cliente
// AQUI em vez de criar o proprio, para que a regra de lint continue valendo
// sem excecao — inclusive no arquivo de maior poder do projeto.
export function createProxyClient(
  request: NextRequest,
  response: NextResponse,
  territory: Territory,
): SupabaseClient {
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: cookieOptionsFor(territory),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          }
          // Estes headers impedem que um CDN ou proxy reverso guarde uma
          // resposta que carrega cookie de sessao e a sirva para outra
          // pessoa. Sem eles, a sessao de um usuario pode vazar para outro.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )
}
```

- [ ] **Passo 2: Substituir `eslint.config.mjs` inteiro**

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // A DAL e a unica porta para o banco. Esta regra transforma a fronteira
  // de combinado em erro de build.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/dal/_client.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@supabase/*", "@supabase/**"],
          message:
            "Apenas src/server/dal/_client.ts importa @supabase/*. Use uma funcao da DAL.",
        }],
      }],
    },
  },

  // Componente cliente e hook nunca alcancam codigo de servidor.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server", "@/server/*", "@/server/**"],
          message:
            "Componentes e hooks nao importam src/server. Receba dados por props ou chame uma server action.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
```

- [ ] **Passo 3: Verificar que a regra realmente pega**

Criar um arquivo que viola a regra, de propósito:

```bash
mkdir -p src/server/dal && printf "import { createServerClient } from '@supabase/ssr'\nexport const x = createServerClient\n" > src/server/dal/_violacao-temporaria.ts
pnpm lint
```

Esperado: erro apontando `_violacao-temporaria.ts` com a mensagem `Apenas src/server/dal/_client.ts importa @supabase/*`.

**Se o lint passar, a regra não está funcionando** — a fronteira inteira da arquitetura vira decorativa. Pare e corrija antes de seguir.

- [ ] **Passo 4: Remover o arquivo de violação e confirmar que o projeto passa**

```bash
rm src/server/dal/_violacao-temporaria.ts
pnpm lint && pnpm exec tsc --noEmit
```

Esperado: ambos sem erro. O `_client.ts` legítimo não é acusado, porque está no `ignores` da regra.

- [ ] **Passo 5: Commit**

```bash
git add src/server/dal/_client.ts eslint.config.mjs
git commit -m "feat(app): cliente supabase unico e regra de lint que torna a fronteira mecanica"
```

---

### Tarefa 12: Proxy e esqueleto dos três territórios

**Arquivos:**
- Criar: `src/proxy.ts`
- Criar: `src/app/(site)/page.tsx`, `src/app/(site)/[slug]/page.tsx`
- Criar: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/entrar/page.tsx`
- Criar: `src/app/painel/layout.tsx`, `src/app/painel/page.tsx`, `src/app/painel/entrar/page.tsx`
- Remover: `src/app/page.tsx` (página do template, substituída por `(site)/page.tsx`)

**Interfaces:**
- Consome: `territoryFromHost`, `createProxyClient`
- Produz: o roteamento por território. Todas as tarefas seguintes assumem que `admin.` e `painel.` chegam em `/admin/*` e `/painel/*`

- [ ] **Passo 1: Criar `src/proxy.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { createProxyClient } from '@/server/dal/_client'
import { territoryFromHost } from '@/server/territory'

// Rotas alcancaveis sem sessao, dentro de cada territorio privado.
const PUBLIC_PATHS: Record<'admin' | 'painel', readonly string[]> = {
  admin: ['/entrar'],
  painel: ['/entrar', '/convite'],
}

function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export async function proxy(request: NextRequest) {
  const territory = territoryFromHost(request.headers.get('host'))
  const path = request.nextUrl.pathname

  if (territory === 'site') {
    // O dominio publico nao alcanca territorio privado. Sem isto, os
    // caminhos /admin e /painel ficariam servidos tambem pela raiz.
    if (isUnder(path, '/admin') || isUnder(path, '/painel')) {
      return new NextResponse(null, { status: 404 })
    }
    // O territorio publico NAO cria cliente de auth e NAO toca cookie de
    // sessao. E isto que torna verdadeira a frase "a raiz nao tem sessao".
    return NextResponse.next()
  }

  const rewritten = request.nextUrl.clone()
  rewritten.pathname = `/${territory}${path === '/' ? '' : path}`
  const response = NextResponse.rewrite(rewritten)

  // getUser() revalida o token contra o servidor de auth e grava a sessao
  // renovada em `response` pelo setAll. Isto e gerencia de sessao, nao
  // autorizacao: o proxy nao consulta o nosso banco nem decide permissao.
  const supabase = createProxyClient(request, response, territory)
  const { data } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS[territory].some((p) => isUnder(path, p))

  if (!data.user && !isPublic) {
    const login = request.nextUrl.clone()
    // Caminho EXTERNO, sem o prefixo do territorio. O navegador vai pedir
    // admin.dominio/entrar, que o proxy reescreve para /admin/entrar.
    // Usar `/${territory}/entrar` aqui faria o navegador pedir
    // /admin/entrar, que o proxy reescreveria para /admin/admin/entrar.
    login.pathname = '/entrar'
    login.searchParams.set('next', path)

    const redirect = NextResponse.redirect(login)
    // Os cookies renovados precisam sobreviver ao redirecionamento. Montar
    // uma resposta nova sem copiar os cookies descarta a sessao renovada, e
    // o sintoma e deslogar de forma intermitente e dificil de rastrear.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie)
    }
    return redirect
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
```

- [ ] **Passo 2: Mover a página raiz para o grupo `(site)`**

```bash
rm src/app/page.tsx
mkdir -p "src/app/(site)/[slug]" src/app/admin/entrar src/app/painel/entrar
```

Criar `src/app/(site)/page.tsx`:

```tsx
export default function Page() {
  return (
    <main>
      <h1>Cardápio digital</h1>
      <p>Aproxime o celular da plaquinha ou escaneie o QR code na mesa.</p>
    </main>
  )
}
```

- [ ] **Passo 3: Criar o esqueleto do cardápio público**

Criar `src/app/(site)/[slug]/page.tsx`. A Tarefa 16 substitui o corpo por dados reais; o esqueleto existe agora para provar o roteamento:

```tsx
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // Next 16: params e uma Promise e precisa de await.
  const { slug } = await params

  return (
    <main>
      <h1>Cardápio</h1>
      <p>Restaurante: {slug}</p>
    </main>
  )
}
```

- [ ] **Passo 4: Criar o esqueleto dos territórios privados**

Criar `src/app/admin/layout.tsx`:

```tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div data-territory="admin">{children}</div>
}
```

Criar `src/app/admin/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>Console da plataforma</h1></main>
}
```

Criar `src/app/admin/entrar/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>Entrar na plataforma</h1></main>
}
```

Criar `src/app/painel/layout.tsx`:

```tsx
export default function PainelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div data-territory="painel">{children}</div>
}
```

Criar `src/app/painel/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>Painel do restaurante</h1></main>
}
```

Criar `src/app/painel/entrar/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>Entrar no painel</h1></main>
}
```

- [ ] **Passo 5: Subir o servidor e verificar os três territórios**

```bash
pnpm dev
```

Em outro terminal, quatro verificações. Note o uso de `-H "Host:"` — é assim que se testa subdomínio sem depender de resolução de DNS:

```bash
curl -s -H "Host: localhost:3000" http://127.0.0.1:3000/ | grep -o "Cardápio digital"
```

Esperado: `Cardápio digital` — a raiz serve a página institucional.

```bash
curl -s -H "Host: localhost:3000" http://127.0.0.1:3000/pizzaria-do-ze | grep -o "pizzaria-do-ze"
```

Esperado: `pizzaria-do-ze` — o slug chega na página do cardápio.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost:3000" http://127.0.0.1:3000/admin
```

Esperado: `404`. O domínio público **não** alcança o território privado. Se vier `200`, a regra D21 não está funcionando.

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Host: admin.localhost:3000" http://127.0.0.1:3000/
```

Esperado: `307` e um destino terminando em `/entrar?next=%2F`. Sem sessão, o território privado manda para o login.

```bash
curl -s -H "Host: admin.localhost:3000" http://127.0.0.1:3000/entrar | grep -o "Entrar na plataforma"
```

Esperado: `Entrar na plataforma` — a rota pública do território é alcançável sem sessão.

- [ ] **Passo 6: Confirmar no navegador que `*.localhost` resolve**

Abrir `http://admin.localhost:3000` e `http://painel.localhost:3000`. Chrome, Edge e Firefox resolvem sozinhos. Se o navegador não resolver, use o `-H "Host:"` do passo anterior e siga — é limitação do navegador, não do código.

- [ ] **Passo 7: Verificar que compila e passa no lint**

```bash
pnpm lint && pnpm exec tsc --noEmit
```

- [ ] **Passo 8: Commit**

```bash
git add src/proxy.ts src/app/
git commit -m "feat(app): proxy por territorio e esqueleto de rotas dos tres dominios"
```

---

### Tarefa 13: Schemas de domínio

**Arquivos:**
- Criar: `src/domain/common.ts`, `src/domain/restaurant.ts`, `src/domain/menu.ts`, `src/domain/invite.ts`, `src/domain/tag.ts`, `src/domain/media.ts`

**Interfaces:**
- Consome: nada. `src/domain/` não faz I/O e não conhece Supabase
- Produz: os schemas e tipos usados por toda a DAL e por toda server action. Nomes exatos listados em cada passo

- [ ] **Passo 1: Criar `src/domain/common.ts`**

```ts
import { z } from 'zod'

export const uuidSchema = z.uuid({ error: 'Identificador inválido' })

export const slugSchema = z
  .string()
  .min(3, { error: 'O endereço precisa de ao menos 3 caracteres' })
  .max(50, { error: 'O endereço pode ter no máximo 50 caracteres' })
  .regex(/^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$/, {
    error: 'Use apenas letras minúsculas, números e hífen',
  })

export const priceCentsSchema = z
  .int({ error: 'O preço precisa ser um número inteiro de centavos' })
  .min(0, { error: 'O preço não pode ser negativo' })
  .max(99_999_999, { error: 'Preço acima do limite' })

export const positionSchema = z.int().min(0).max(10_000)

// Texto puro, sem HTML e sem markdown. Isto elimina a classe XSS inteira
// em vez de apostar num sanitizador.
//
// O minimo entra como argumento, e nao encadeado como .min() depois: em
// Zod 4, .refine() devolve um tipo que nao expoe mais .min(), entao
// plainTextSchema(120).min(2) nao compila.
export const plainTextSchema = (max: number, min = 0) => {
  const base = z.string().trim().max(max, { error: `Máximo de ${max} caracteres` })
  const bounded =
    min > 0 ? base.min(min, { error: `Mínimo de ${min} caracteres` }) : base

  return bounded.refine((value) => !/[<>]/.test(value), {
    error: 'Não são permitidos os caracteres < e >',
  })
}

// O destino pos-login so pode ser caminho interno. Barra o open redirect.
export const internalPathSchema = z
  .string()
  .refine(
    (v) => v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\'),
    { error: 'Destino inválido' },
  )

export function safeNextPath(value: unknown, fallback: string): string {
  const parsed = internalPathSchema.safeParse(value)
  return parsed.success ? parsed.data : fallback
}
```

- [ ] **Passo 2: Criar `src/domain/restaurant.ts`**

```ts
import { z } from 'zod'
import { plainTextSchema, slugSchema, uuidSchema } from './common'

export const restaurantStatusSchema = z.enum(['draft', 'active', 'suspended'])
export type RestaurantStatus = z.infer<typeof restaurantStatusSchema>

export const createRestaurantSchema = z.object({
  slug: slugSchema,
  name: plainTextSchema(120, 2),
  description: plainTextSchema(500).optional(),
})
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>

export const updateRestaurantProfileSchema = z.object({
  restaurantId: uuidSchema,
  name: plainTextSchema(120, 2),
  description: plainTextSchema(500).optional(),
  contact: z
    .object({
      phone: plainTextSchema(30).optional(),
      whatsapp: plainTextSchema(30).optional(),
      instagram: plainTextSchema(60).optional(),
      address: plainTextSchema(200).optional(),
    })
    .default({}),
})
export type UpdateRestaurantProfileInput = z.infer<
  typeof updateRestaurantProfileSchema
>

export const setRestaurantStatusSchema = z.object({
  restaurantId: uuidSchema,
  status: restaurantStatusSchema,
})

// DTOs: o que sai da DAL. Nunca a linha crua do banco.
export type RestaurantPublicDTO = {
  slug: string
  name: string
  description: string | null
  logoPath: string | null
  coverPath: string | null
  contact: Record<string, string>
}

export type RestaurantAdminDTO = {
  id: string
  slug: string
  name: string
  status: RestaurantStatus
  createdAt: string
  deletedAt: string | null
}

export type RestaurantMemberDTO = {
  id: string
  slug: string
  name: string
  description: string | null
  status: RestaurantStatus
  logoPath: string | null
  coverPath: string | null
  contact: Record<string, string>
}
```

- [ ] **Passo 3: Criar `src/domain/menu.ts`**

```ts
import { z } from 'zod'
import {
  plainTextSchema,
  positionSchema,
  priceCentsSchema,
  uuidSchema,
} from './common'

export const createCategorySchema = z.object({
  restaurantId: uuidSchema,
  name: plainTextSchema(80, 2),
  description: plainTextSchema(300).optional(),
})

export const updateCategorySchema = z.object({
  categoryId: uuidSchema,
  name: plainTextSchema(80, 2),
  description: plainTextSchema(300).optional(),
  isVisible: z.boolean(),
})

export const reorderSchema = z.object({
  restaurantId: uuidSchema,
  order: z.array(z.object({ id: uuidSchema, position: positionSchema })).min(1),
})

export const createItemSchema = z.object({
  restaurantId: uuidSchema,
  categoryId: uuidSchema,
  name: plainTextSchema(120, 2),
  description: plainTextSchema(600).optional(),
  basePriceCents: priceCentsSchema,
  dietaryTags: z.array(plainTextSchema(30)).max(10).default([]),
})

export const updateItemSchema = createItemSchema
  .omit({ restaurantId: true, categoryId: true })
  .extend({
    itemId: uuidSchema,
    isVisible: z.boolean(),
    isAvailable: z.boolean(),
  })

export const setItemAvailabilitySchema = z.object({
  itemId: uuidSchema,
  isAvailable: z.boolean(),
})

export const createVariantSchema = z.object({
  itemId: uuidSchema,
  name: plainTextSchema(60, 1),
  priceCents: priceCentsSchema,
})

export const updateVariantSchema = createVariantSchema.extend({
  variantId: uuidSchema,
  isAvailable: z.boolean(),
})

export type MenuMediaDTO = {
  kind: 'image' | 'video'
  storagePath: string
  altText: string | null
  durationMs: number | null
}

export type MenuItemDTO = {
  id: string
  name: string
  description: string | null
  basePriceCents: number
  isAvailable: boolean
  variants: { id: string; name: string; priceCents: number; isAvailable: boolean }[]
  media: MenuMediaDTO[]
  dietaryTags: string[]
}

export type MenuCategoryDTO = {
  id: string
  name: string
  description: string | null
  items: MenuItemDTO[]
}

export type PublicMenuDTO = {
  restaurant: {
    slug: string
    name: string
    description: string | null
    logoPath: string | null
    coverPath: string | null
    contact: Record<string, string>
  }
  categories: MenuCategoryDTO[]
}
```

- [ ] **Passo 4: Criar `src/domain/invite.ts`, `tag.ts` e `media.ts`**

`src/domain/invite.ts`:

```ts
import { z } from 'zod'
import { uuidSchema } from './common'

export const membershipRoleSchema = z.enum(['owner', 'manager'])
export type MembershipRole = z.infer<typeof membershipRoleSchema>

export const createInviteSchema = z.object({
  restaurantId: uuidSchema,
  role: membershipRoleSchema.default('owner'),
  email: z.email({ error: 'E-mail inválido' }).optional(),
  expiresInDays: z.int().min(1).max(30).default(7),
})

// O token e uma credencial ao portador. Formato base64url, 43 caracteres
// para 32 bytes.
export const inviteTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, { error: 'Convite inválido' })

export type InviteDTO = {
  id: string
  role: MembershipRole
  email: string | null
  expiresAt: string
  redeemedAt: string | null
  revokedAt: string | null
}

// Devolvido UMA unica vez, na criacao. O banco guarda so o hash e nao
// consegue reconstruir este link.
export type CreatedInviteDTO = {
  id: string
  link: string
}

export type InvitePreviewDTO = {
  restaurantName: string
  role: MembershipRole
}
```

`src/domain/tag.ts`:

```ts
import { z } from 'zod'
import { plainTextSchema, uuidSchema } from './common'

// Base32 sem caracteres ambiguos (sem I, L, O, U), 16 caracteres.
export const tagTokenSchema = z
  .string()
  .regex(/^[0-9A-HJKMNP-TV-Z]{16}$/, { error: 'Plaquinha inválida' })

export const createTagSchema = z.object({
  restaurantId: uuidSchema,
  label: plainTextSchema(40).optional(),
})

export const updateTagSchema = z.object({
  tagId: uuidSchema,
  label: plainTextSchema(40).optional(),
  isActive: z.boolean(),
})

export type TagDTO = {
  id: string
  publicToken: string
  label: string | null
  isActive: boolean
  lastSeenAt: string | null
}

export type ResolvedTagDTO = {
  restaurantSlug: string
  tagLabel: string | null
}
```

`src/domain/media.ts`:

```ts
import { z } from 'zod'
import { plainTextSchema, uuidSchema } from './common'

export const mediaKindSchema = z.enum(['image', 'video'])
export type MediaKind = z.infer<typeof mediaKindSchema>

export const IMAGE_BUCKET = 'menu-images'
export const VIDEO_BUCKET = 'menu-videos'

export const MEDIA_LIMITS = {
  image: { bucket: IMAGE_BUCKET, maxBytes: 5_242_880, mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] },
  video: { bucket: VIDEO_BUCKET, maxBytes: 10_485_760, mimes: ['video/mp4', 'video/webm'] },
} as const

export const registerMediaSchema = z.object({
  itemId: uuidSchema,
  kind: mediaKindSchema,
  storagePath: z.string().min(1).max(400),
  altText: plainTextSchema(160).optional(),
  width: z.int().min(1).max(10_000).optional(),
  height: z.int().min(1).max(10_000).optional(),
  // 15 segundos. Validado no navegador; o servidor nao consegue conferir
  // duracao sem transcodificar. Limitacao registrada na spec.
  durationMs: z.int().min(1).max(15_000).optional(),
})
```

- [ ] **Passo 5: Verificar**

```bash
pnpm lint && pnpm exec tsc --noEmit
```

Esperado: nenhum erro. Em especial, nenhum arquivo de `src/domain/` pode importar `@/server` — se importar, a arquitetura de dependências já começou a vazar.

- [ ] **Passo 6: Commit**

```bash
git add src/domain/
git commit -m "feat(app): schemas de dominio e DTOs sem I/O"
```

---

### Tarefa 14: Autorização e primitivas de segurança

**Arquivos:**
- Criar: `src/server/dal/auth.ts`
- Criar: `src/server/security/tokens.ts`, `client-ip.ts`, `rate-limit.ts`, `audit.ts`

**Interfaces:**
- Consome: `createUserClient`, `territoryFromHost`, as funções SQL `is_platform_admin`, `is_member`, `is_owner`, `check_rate_limit`, `record_audit`
- Produz: `getCurrentUser() → Promise<AuthUser | null>`, `currentTerritory() → Promise<Territory>`, `requireUser()`, `requirePlatformAdmin()`, `requireMember(restaurantId)`, `requireOwner(restaurantId)`, `ForbiddenError`; `generateInviteToken()`, `hashInviteToken(token) → Buffer`, `generateTagToken()`; `enforceRateLimit(bucket, identifier)`, `RateLimitedError`; `recordAudit(input)`

- [ ] **Passo 1: Criar `src/server/dal/auth.ts`**

```ts
import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { territoryFromHost, type Territory } from '@/server/territory'
import { createUserClient } from './_client'

export type AuthUser = { id: string; email: string | null }

export class ForbiddenError extends Error {
  constructor(message = 'Sem permissão para esta operação') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export const currentTerritory = cache(async (): Promise<Territory> => {
  const requestHeaders = await headers()
  return territoryFromHost(requestHeaders.get('host'))
})

// cache() do React deduplica dentro do MESMO render. Nao e cache entre
// requisicoes: continua tudo fresco, so evita a mesma consulta rodar cinco
// vezes numa pagina que chama getCurrentUser em varios componentes.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const territory = await currentTerritory()
  // O territorio publico nao tem sessao, por construcao.
  if (territory === 'site') return null

  const supabase = await createUserClient(territory)
  // getUser() revalida o token contra o servidor de auth. getSession() so
  // decodifica o cookie e NUNCA deve ser usado para autorizar no servidor.
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  return { id: data.user.id, email: data.user.email ?? null }
})

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    // Caminho EXTERNO, sem o prefixo do territorio. Dentro de admin. ou
    // painel., /entrar ja e reescrito pelo proxy para /admin/entrar ou
    // /painel/entrar. Redirecionar para /admin/entrar faria o navegador
    // pedir /admin/admin/entrar, que nao existe.
    redirect('/entrar')
  }
  return user
}

async function callGuard(fn: string, args: Record<string, unknown> = {}) {
  const supabase = await createUserClient(await currentTerritory())
  const { data, error } = await supabase.rpc(fn, args)
  return !error && data === true
}

export async function requirePlatformAdmin(): Promise<AuthUser> {
  const user = await requireUser()
  if (!(await callGuard('is_platform_admin'))) throw new ForbiddenError()
  return user
}

export async function requireMember(restaurantId: string): Promise<AuthUser> {
  const user = await requireUser()
  const allowed =
    (await callGuard('is_member', { rid: restaurantId })) ||
    (await callGuard('is_platform_admin'))
  if (!allowed) throw new ForbiddenError()
  return user
}

export async function requireOwner(restaurantId: string): Promise<AuthUser> {
  const user = await requireUser()
  const allowed =
    (await callGuard('is_owner', { rid: restaurantId })) ||
    (await callGuard('is_platform_admin'))
  if (!allowed) throw new ForbiddenError()
  return user
}
```

- [ ] **Passo 2: Criar `src/server/security/tokens.ts`**

```ts
import 'server-only'
import { createHash, randomBytes, randomInt } from 'node:crypto'

// 32 bytes = 256 bits. Em base64url sao 43 caracteres, sem preenchimento.
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

// O banco guarda SO isto. Vazar o banco nao entrega acesso a ninguem,
// porque o hash nao volta a ser token.
export function hashInviteToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest()
}

// Base32 sem I, L, O e U: sao os caracteres que se confundem com 1, 1, 0 e V
// ao ditar por telefone ou reimprimir uma plaquinha gasta.
const TAG_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function generateTagToken(): string {
  let token = ''
  for (let i = 0; i < 16; i += 1) {
    token += TAG_ALPHABET[randomInt(TAG_ALPHABET.length)]
  }
  return token
}
```

- [ ] **Passo 3: Criar `src/server/security/client-ip.ts`**

```ts
import 'server-only'
import { headers } from 'next/headers'

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const IPV6 = /^[0-9a-f:]+$/i

// ATENCAO, item obrigatorio da checagem de publicacao: x-forwarded-for e
// falsificavel quando nao vem de um proxy confiavel. Em desenvolvimento
// isso e irrelevante. Ao hospedar, trocar pelo header que a plataforma
// garante (na Vercel, x-vercel-forwarded-for).
export async function clientIp(): Promise<string | null> {
  const requestHeaders = await headers()
  const candidate =
    requestHeaders.get('x-forwarded-for')?.split(',')[0].trim() ??
    requestHeaders.get('x-real-ip')?.trim() ??
    null

  if (!candidate) return null
  if (IPV4.test(candidate) || IPV6.test(candidate)) return candidate
  return null
}

// Identificador para rate limit de visitante anonimo. Quando o IP nao vem,
// todos caem no mesmo balde — o que aperta o limite, e nunca o afrouxa.
export async function rateLimitIdentity(): Promise<string> {
  return (await clientIp()) ?? 'ip-ausente'
}
```

- [ ] **Passo 4: Criar `src/server/security/rate-limit.ts`**

```ts
import 'server-only'
import { createUserClient } from '@/server/dal/_client'
import { currentTerritory } from '@/server/dal/auth'

export const RATE_LIMITS = {
  'invite:preview': { max: 10, windowSeconds: 60 },
  'invite:redeem': { max: 5, windowSeconds: 60 },
  'auth:login': { max: 10, windowSeconds: 60 },
  'tag:resolve': { max: 60, windowSeconds: 60 },
  mutation: { max: 60, windowSeconds: 60 },
} as const

export type RateLimitBucket = keyof typeof RATE_LIMITS

export class RateLimitedError extends Error {
  constructor() {
    super('Muitas tentativas. Aguarde um minuto e tente de novo.')
    this.name = 'RateLimitedError'
  }
}

export async function enforceRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<void> {
  const { max, windowSeconds } = RATE_LIMITS[bucket]
  const supabase = await createUserClient(await currentTerritory())

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_identifier: identifier,
    p_max: max,
    p_window_seconds: windowSeconds,
  })

  // Falha fechada: se o contador nao responder, negamos. Um rate limit que
  // libera quando quebra nao e rate limit. E como tudo aqui depende do
  // mesmo banco, se ele caiu a aplicacao ja esta fora do ar de qualquer
  // forma — nao ha disponibilidade sendo sacrificada.
  if (error || data !== true) throw new RateLimitedError()
}
```

- [ ] **Passo 5: Criar `src/server/security/audit.ts`**

```ts
import 'server-only'
import { createUserClient } from '@/server/dal/_client'
import { currentTerritory } from '@/server/dal/auth'
import { clientIp } from './client-ip'

export async function recordAudit(input: {
  action: string
  subjectType: string
  subjectId?: string
  restaurantId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = await createUserClient(await currentTerritory())

  await supabase.rpc('record_audit', {
    p_action: input.action,
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId ?? null,
    p_restaurant_id: input.restaurantId ?? null,
    p_metadata: input.metadata ?? {},
    // null quando o IP nao pode ser determinado. A coluna e inet e recusaria
    // uma string que nao seja endereco.
    p_ip: await clientIp(),
  })
}
```

- [ ] **Passo 6: Verificar**

```bash
pnpm lint && pnpm exec tsc --noEmit
```

Esperado: nenhum erro. Confirme também que `pnpm lint` **não** reclama de `src/server/security/*.ts` importando `@/server/dal/_client` — a regra de import proíbe `@supabase/*`, não a DAL.

- [ ] **Passo 7: Commit**

```bash
git add src/server/dal/auth.ts src/server/security/
git commit -m "feat(app): guardas de autorizacao, tokens, rate limit e auditoria"
```

---

### Tarefa 15: Restaurantes e convites

**Arquivos:**
- Criar: `src/server/dal/restaurants.ts`
- Criar: `src/server/dal/invites.ts`

**Interfaces:**
- Consome: guardas da Tarefa 14, schemas da Tarefa 13, funções SQL `preview_invite`, `redeem_invite`
- Produz: `createRestaurant`, `updateRestaurantProfile`, `setRestaurantStatus`, `softDeleteRestaurant`, `listRestaurantsForAdmin`, `listMyRestaurants`, `getRestaurantBySlugPublic`; `createInvite`, `listInvites`, `revokeInvite`, `previewInvite`, `redeemInvite`

- [ ] **Passo 1: Criar `src/server/dal/restaurants.ts`**

```ts
import 'server-only'
import {
  createRestaurantSchema,
  setRestaurantStatusSchema,
  updateRestaurantProfileSchema,
  type RestaurantAdminDTO,
  type RestaurantMemberDTO,
  type RestaurantPublicDTO,
} from '@/domain/restaurant'
import { slugSchema, uuidSchema } from '@/domain/common'
import { recordAudit } from '@/server/security/audit'
import { createUserClient } from './_client'
import {
  currentTerritory,
  requireOwner,
  requirePlatformAdmin,
  requireUser,
} from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

export async function createRestaurant(
  input: unknown,
): Promise<RestaurantAdminDTO> {
  const data = createRestaurantSchema.parse(input)
  const user = await requirePlatformAdmin()

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('restaurants')
    .insert({
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      created_by: user.id,
    })
    .select('id, slug, name, status, created_at, deleted_at')
    .single()

  if (error) throw new Error(`Não foi possível criar o restaurante: ${error.message}`)

  await recordAudit({
    action: 'restaurant.created',
    subjectType: 'restaurant',
    subjectId: row.id,
    restaurantId: row.id,
    metadata: { slug: row.slug },
  })

  return toAdminDTO(row)
}

export async function updateRestaurantProfile(input: unknown): Promise<void> {
  const data = updateRestaurantProfileSchema.parse(input)
  // Autorizacao por POSSE do recurso, nao so por estar autenticado. E o que
  // fecha IDOR: saber o id de outro restaurante nao basta.
  await requireOwner(data.restaurantId)

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({
      name: data.name,
      description: data.description ?? null,
      contact: data.contact,
    })
    .eq('id', data.restaurantId)

  if (error) throw new Error(`Não foi possível salvar: ${error.message}`)

  await recordAudit({
    action: 'restaurant.profile_updated',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
  })
}

export async function setRestaurantStatus(input: unknown): Promise<void> {
  const data = setRestaurantStatusSchema.parse(input)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ status: data.status })
    .eq('id', data.restaurantId)

  if (error) throw new Error(`Não foi possível alterar a situação: ${error.message}`)

  await recordAudit({
    action: 'restaurant.status_changed',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
    metadata: { status: data.status },
  })
}

export async function softDeleteRestaurant(restaurantId: unknown): Promise<void> {
  const id = uuidSchema.parse(restaurantId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Não foi possível remover: ${error.message}`)

  await recordAudit({
    action: 'restaurant.soft_deleted',
    subjectType: 'restaurant',
    subjectId: id,
    restaurantId: id,
  })
}

export async function listRestaurantsForAdmin(): Promise<RestaurantAdminDTO[]> {
  await requirePlatformAdmin()

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug, name, status, created_at, deleted_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Não foi possível listar: ${error.message}`)
  return (data ?? []).map(toAdminDTO)
}

export async function listMyRestaurants(): Promise<RestaurantMemberDTO[]> {
  await requireUser()

  const supabase = await db()
  // A RLS ja limita ao que a pessoa pode ver. O filtro explicito por
  // membership existe porque a DAL nao delega sua decisao ao banco: as
  // duas camadas concordam, e uma falha em qualquer uma e contida pela outra.
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      'id, slug, name, description, status, logo_path, cover_path, contact, memberships!inner(user_id)',
    )
    .is('deleted_at', null)
    .order('name')

  if (error) throw new Error(`Não foi possível listar: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    logoPath: row.logo_path,
    coverPath: row.cover_path,
    contact: (row.contact ?? {}) as Record<string, string>,
  }))
}

export async function getRestaurantBySlugPublic(
  slug: unknown,
): Promise<RestaurantPublicDTO | null> {
  const parsed = slugSchema.safeParse(slug)
  // Slug fora do formato nunca chega ao banco. Nao e so validacao: e um
  // filtro de entrada antes de qualquer consulta.
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('slug, name, description, logo_path, cover_path, contact')
    .eq('slug', parsed.data)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  return {
    slug: data.slug,
    name: data.name,
    description: data.description,
    logoPath: data.logo_path,
    coverPath: data.cover_path,
    contact: (data.contact ?? {}) as Record<string, string>,
  }
}

type AdminRow = {
  id: string
  slug: string
  name: string
  status: RestaurantAdminDTO['status']
  created_at: string
  deleted_at: string | null
}

function toAdminDTO(row: AdminRow): RestaurantAdminDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }
}
```

- [ ] **Passo 2: Criar `src/server/dal/invites.ts`**

```ts
import 'server-only'
import { headers } from 'next/headers'
import {
  createInviteSchema,
  inviteTokenSchema,
  type CreatedInviteDTO,
  type InviteDTO,
  type InvitePreviewDTO,
} from '@/domain/invite'
import { uuidSchema } from '@/domain/common'
import { originFor } from '@/server/territory'
import { recordAudit } from '@/server/security/audit'
import { rateLimitIdentity } from '@/server/security/client-ip'
import { enforceRateLimit } from '@/server/security/rate-limit'
import { generateInviteToken, hashInviteToken } from '@/server/security/tokens'
import { createUserClient } from './_client'
import { currentTerritory, requireOwner, requirePlatformAdmin } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

export async function createInvite(input: unknown): Promise<CreatedInviteDTO> {
  const data = createInviteSchema.parse(input)
  const user = await requirePlatformAdmin()

  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + data.expiresInDays * 86_400_000)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('invites')
    .insert({
      restaurant_id: data.restaurantId,
      role: data.role,
      // So o hash vai para o banco. O token em claro existe apenas nesta
      // funcao e no link devolvido uma unica vez.
      token_hash: `\\x${hashInviteToken(token).toString('hex')}`,
      email: data.email ?? null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Não foi possível criar o convite: ${error.message}`)

  await recordAudit({
    action: 'invite.created',
    subjectType: 'invite',
    subjectId: row.id,
    restaurantId: data.restaurantId,
    metadata: { role: data.role, boundToEmail: Boolean(data.email) },
  })

  const requestHeaders = await headers()
  const protocol =
    requestHeaders.get('x-forwarded-proto') === 'https' ? 'https:' : 'http:'

  // O convite leva para o territorio onde a pessoa vai trabalhar.
  return { id: row.id, link: `${originFor('painel', protocol)}/convite/${token}` }
}

export async function listInvites(restaurantId: unknown): Promise<InviteDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  await requireOwner(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('invites')
    // token_hash NUNCA e selecionado. Nem para o dono do restaurante.
    .select('id, role, email, expires_at, redeemed_at, revoked_at')
    .eq('restaurant_id', id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Não foi possível listar convites: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    email: row.email,
    expiresAt: row.expires_at,
    redeemedAt: row.redeemed_at,
    revokedAt: row.revoked_at,
  }))
}

export async function revokeInvite(inviteId: unknown): Promise<void> {
  const id = uuidSchema.parse(inviteId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase
    .from('invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('redeemed_at', null)

  if (error) throw new Error(`Não foi possível revogar: ${error.message}`)

  await recordAudit({ action: 'invite.revoked', subjectType: 'invite', subjectId: id })
}

export async function previewInvite(
  token: unknown,
): Promise<InvitePreviewDTO | null> {
  // Rate limit ANTES de qualquer consulta. Sem isso, o endpoint vira um
  // oraculo para adivinhar tokens por forca bruta.
  await enforceRateLimit('invite:preview', await rateLimitIdentity())

  const parsed = inviteTokenSchema.safeParse(token)
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase.rpc('preview_invite', {
    p_token: parsed.data,
  })

  if (error || !data || data.length === 0) return null

  return {
    restaurantName: data[0].restaurant_name,
    role: data[0].invite_role,
  }
}

export async function redeemInvite(token: unknown): Promise<string> {
  await enforceRateLimit('invite:redeem', await rateLimitIdentity())

  const parsed = inviteTokenSchema.safeParse(token)
  // Mensagem identica a de token valido porem expirado, revogado ou ja
  // usado. Nao revelamos qual condicao falhou.
  if (!parsed.success) throw new Error('Convite inválido')

  const supabase = await db()
  const { data, error } = await supabase.rpc('redeem_invite', {
    p_token: parsed.data,
  })

  if (error || !data) throw new Error('Convite inválido')
  return data as string
}
```

- [ ] **Passo 3: Verificar que compila e passa no lint**

```bash
pnpm lint && pnpm exec tsc --noEmit
```

- [ ] **Passo 4: Verificar o formato do hash gravado**

O `token_hash` é `bytea`. O PostgREST espera a notação de escape `\x` seguida do hexadecimal. Conferir com o `PSQL` depois de criar um convite pela aplicação (Tarefa 17), ou provar agora que o formato casa:

```sql
select sha256(convert_to('abc', 'UTF8')) = '\xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'::bytea as formato_confere;
```

Esperado: `t`. Este é o SHA-256 conhecido de `abc` — se der `f`, a codificação usada em `hashInviteToken` não bate com a do banco e nenhum convite funcionaria.

- [ ] **Passo 5: Commit**

```bash
git add src/server/dal/restaurants.ts src/server/dal/invites.ts
git commit -m "feat(app): acesso a dados de restaurantes e convites com autorizacao por posse"
```

---

### Tarefa 16: Cardápio

**Arquivos:**
- Criar: `src/server/dal/menu.ts`

**Interfaces:**
- Consome: guardas da Tarefa 14, schemas de `@/domain/menu`
- Produz: `getPublicMenu(slug)`, `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `createItem`, `updateItem`, `deleteItem`, `reorderItems`, `setItemAvailability`, `createVariant`, `updateVariant`, `deleteVariant`

- [ ] **Passo 1: Criar `src/server/dal/menu.ts`**

```ts
import 'server-only'
import { slugSchema, uuidSchema } from '@/domain/common'
import {
  createCategorySchema,
  createItemSchema,
  createVariantSchema,
  reorderSchema,
  setItemAvailabilitySchema,
  updateCategorySchema,
  updateItemSchema,
  updateVariantSchema,
  type MenuCategoryDTO,
  type PublicMenuDTO,
} from '@/domain/menu'
import { createUserClient } from './_client'
import { currentTerritory, requireMember } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

// Descobre o restaurante dono de um recurso filho ANTES de autorizar.
// Sem isto a autorizacao dependeria de um restaurantId enviado pelo
// cliente, que e exatamente por onde entra o IDOR: basta trocar o id.
async function ownerRestaurantOf(
  table: 'menu_categories' | 'menu_items' | 'menu_item_variants',
  id: string,
): Promise<string> {
  const supabase = await db()
  const { data, error } = await supabase
    .from(table)
    .select('restaurant_id')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error('Recurso não encontrado')
  return data.restaurant_id as string
}

export async function getPublicMenu(slug: unknown): Promise<PublicMenuDTO | null> {
  const parsed = slugSchema.safeParse(slug)
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      slug, name, description, logo_path, cover_path, contact,
      menu_categories (
        id, name, description, position, is_visible,
        menu_items (
          id, name, description, base_price_cents, is_available, is_visible,
          position, dietary_tags,
          menu_item_variants ( id, name, price_cents, is_available, position ),
          menu_item_media ( kind, storage_path, alt_text, duration_ms, position )
        )
      )
    `)
    .eq('slug', parsed.data)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) return null

  // O filtro de visibilidade acontece AQUI tambem, e nao so na RLS. Para um
  // visitante anonimo a RLS ja basta, mas o dono do restaurante esta
  // autenticado: a politica de membro deixaria ele ver os itens ocultos na
  // propria pagina publica. Na duvida entre confiar na RLS e filtrar de
  // novo, filtramos de novo.
  const categories: MenuCategoryDTO[] = (data.menu_categories ?? [])
    .filter((category) => category.is_visible)
    .sort((a, b) => a.position - b.position)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      items: (category.menu_items ?? [])
        .filter((item) => item.is_visible)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          basePriceCents: item.base_price_cents,
          isAvailable: item.is_available,
          dietaryTags: item.dietary_tags ?? [],
          variants: (item.menu_item_variants ?? [])
            .sort((a, b) => a.position - b.position)
            .map((variant) => ({
              id: variant.id,
              name: variant.name,
              priceCents: variant.price_cents,
              isAvailable: variant.is_available,
            })),
          media: (item.menu_item_media ?? [])
            .sort((a, b) => a.position - b.position)
            .map((media) => ({
              kind: media.kind,
              storagePath: media.storage_path,
              altText: media.alt_text,
              durationMs: media.duration_ms,
            })),
        })),
    }))

  return {
    restaurant: {
      slug: data.slug,
      name: data.name,
      description: data.description,
      logoPath: data.logo_path,
      coverPath: data.cover_path,
      contact: (data.contact ?? {}) as Record<string, string>,
    },
    categories,
  }
}

export async function listCategories(restaurantId: unknown) {
  const id = uuidSchema.parse(restaurantId)
  await requireMember(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_categories')
    .select('id, name, description, position, is_visible')
    .eq('restaurant_id', id)
    .order('position')

  if (error) throw new Error(`Não foi possível listar categorias: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    position: row.position,
    isVisible: row.is_visible,
  }))
}

export async function createCategory(input: unknown): Promise<string> {
  const data = createCategorySchema.parse(input)
  await requireMember(data.restaurantId)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('menu_categories')
    .insert({
      restaurant_id: data.restaurantId,
      name: data.name,
      description: data.description ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Não foi possível criar a categoria: ${error.message}`)
  return row.id
}

export async function updateCategory(input: unknown): Promise<void> {
  const data = updateCategorySchema.parse(input)
  await requireMember(await ownerRestaurantOf('menu_categories', data.categoryId))

  const supabase = await db()
  const { error } = await supabase
    .from('menu_categories')
    .update({
      name: data.name,
      description: data.description ?? null,
      is_visible: data.isVisible,
    })
    .eq('id', data.categoryId)

  if (error) throw new Error(`Não foi possível salvar a categoria: ${error.message}`)
}

export async function deleteCategory(categoryId: unknown): Promise<void> {
  const id = uuidSchema.parse(categoryId)
  await requireMember(await ownerRestaurantOf('menu_categories', id))

  const supabase = await db()
  const { error } = await supabase.from('menu_categories').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível remover a categoria: ${error.message}`)
}

export async function reorderCategories(input: unknown): Promise<void> {
  const data = reorderSchema.parse(input)
  await requireMember(data.restaurantId)

  const supabase = await db()
  for (const entry of data.order) {
    const { error } = await supabase
      .from('menu_categories')
      .update({ position: entry.position })
      .eq('id', entry.id)
      // O filtro por restaurante impede reordenar categoria alheia mesmo
      // que o id venha adulterado. A RLS ja negaria; este eq torna a
      // intencao explicita na consulta.
      .eq('restaurant_id', data.restaurantId)

    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`)
  }
}

export async function createItem(input: unknown): Promise<string> {
  const data = createItemSchema.parse(input)
  await requireMember(data.restaurantId)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('menu_items')
    .insert({
      restaurant_id: data.restaurantId,
      category_id: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      base_price_cents: data.basePriceCents,
      dietary_tags: data.dietaryTags,
    })
    .select('id')
    .single()

  // Se a categoria for de outro restaurante, quem recusa e a chave
  // estrangeira composta da Tarefa 4 — nao um if em TypeScript.
  if (error) throw new Error(`Não foi possível criar o item: ${error.message}`)
  return row.id
}

export async function updateItem(input: unknown): Promise<void> {
  const data = updateItemSchema.parse(input)
  await requireMember(await ownerRestaurantOf('menu_items', data.itemId))

  const supabase = await db()
  const { error } = await supabase
    .from('menu_items')
    .update({
      name: data.name,
      description: data.description ?? null,
      base_price_cents: data.basePriceCents,
      dietary_tags: data.dietaryTags,
      is_visible: data.isVisible,
      is_available: data.isAvailable,
    })
    .eq('id', data.itemId)

  if (error) throw new Error(`Não foi possível salvar o item: ${error.message}`)
}

export async function deleteItem(itemId: unknown): Promise<void> {
  const id = uuidSchema.parse(itemId)
  await requireMember(await ownerRestaurantOf('menu_items', id))

  const supabase = await db()
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível remover o item: ${error.message}`)
}

export async function reorderItems(input: unknown): Promise<void> {
  const data = reorderSchema.parse(input)
  await requireMember(data.restaurantId)

  const supabase = await db()
  for (const entry of data.order) {
    const { error } = await supabase
      .from('menu_items')
      .update({ position: entry.position })
      .eq('id', entry.id)
      .eq('restaurant_id', data.restaurantId)

    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`)
  }
}

export async function setItemAvailability(input: unknown): Promise<void> {
  const data = setItemAvailabilitySchema.parse(input)
  await requireMember(await ownerRestaurantOf('menu_items', data.itemId))

  const supabase = await db()
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: data.isAvailable })
    .eq('id', data.itemId)

  if (error) throw new Error(`Não foi possível alterar a disponibilidade: ${error.message}`)
}

export async function createVariant(input: unknown): Promise<string> {
  const data = createVariantSchema.parse(input)
  const restaurantId = await ownerRestaurantOf('menu_items', data.itemId)
  await requireMember(restaurantId)

  const supabase = await db()
  const { data: row, error } = await supabase
    .from('menu_item_variants')
    .insert({
      restaurant_id: restaurantId,
      item_id: data.itemId,
      name: data.name,
      price_cents: data.priceCents,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Não foi possível criar a variação: ${error.message}`)
  return row.id
}

export async function updateVariant(input: unknown): Promise<void> {
  const data = updateVariantSchema.parse(input)
  await requireMember(await ownerRestaurantOf('menu_item_variants', data.variantId))

  const supabase = await db()
  const { error } = await supabase
    .from('menu_item_variants')
    .update({
      name: data.name,
      price_cents: data.priceCents,
      is_available: data.isAvailable,
    })
    .eq('id', data.variantId)

  if (error) throw new Error(`Não foi possível salvar a variação: ${error.message}`)
}

export async function deleteVariant(variantId: unknown): Promise<void> {
  const id = uuidSchema.parse(variantId)
  await requireMember(await ownerRestaurantOf('menu_item_variants', id))

  const supabase = await db()
  const { error } = await supabase.from('menu_item_variants').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível remover a variação: ${error.message}`)
}
```

- [ ] **Passo 2: Verificar**

```bash
pnpm lint && pnpm exec tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add src/server/dal/menu.ts
git commit -m "feat(app): acesso a dados do cardapio com dono do recurso resolvido no servidor"
```

---

### Tarefa 17: Plaquinhas, mídia e as rotas públicas de verdade

**Arquivos:**
- Criar: `src/server/dal/tags.ts`, `src/server/dal/media.ts`
- Criar: `src/lib/format.ts`
- Criar: `src/app/(site)/t/[token]/route.ts`
- Modificar: `src/app/(site)/[slug]/page.tsx`

**Interfaces:**
- Consome: `resolve_menu_tag`, `getPublicMenu`, `MEDIA_LIMITS`
- Produz: `createTag`, `listTags`, `updateTag`, `deleteTag`, `resolveTag`; `buildUploadPath`, `registerItemMedia`, `deleteItemMedia`; `formatPriceBRL(cents)`

- [ ] **Passo 1: Criar `src/server/dal/tags.ts`**

```ts
import 'server-only'
import { uuidSchema } from '@/domain/common'
import {
  createTagSchema,
  tagTokenSchema,
  updateTagSchema,
  type ResolvedTagDTO,
  type TagDTO,
} from '@/domain/tag'
import { recordAudit } from '@/server/security/audit'
import { rateLimitIdentity } from '@/server/security/client-ip'
import { enforceRateLimit } from '@/server/security/rate-limit'
import { generateTagToken } from '@/server/security/tokens'
import { createUserClient } from './_client'
import { currentTerritory, requireMember, requirePlatformAdmin } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

export async function createTag(input: unknown): Promise<TagDTO> {
  const data = createTagSchema.parse(input)
  await requirePlatformAdmin()

  const supabase = await db()

  // Colisao em 2^80 e praticamente impossivel, mas quem garante e o unique
  // do banco. Tres tentativas cobrem o caso raro sem loop infinito.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicToken = generateTagToken()
    const { data: row, error } = await supabase
      .from('menu_tags')
      .insert({
        restaurant_id: data.restaurantId,
        public_token: publicToken,
        label: data.label ?? null,
      })
      .select('id, public_token, label, is_active, last_seen_at')
      .single()

    if (!error && row) {
      await recordAudit({
        action: 'tag.created',
        subjectType: 'menu_tag',
        subjectId: row.id,
        restaurantId: data.restaurantId,
      })
      return {
        id: row.id,
        publicToken: row.public_token,
        label: row.label,
        isActive: row.is_active,
        lastSeenAt: row.last_seen_at,
      }
    }

    // 23505 e violacao de unique: so nesse caso vale tentar outro token.
    if (error && error.code !== '23505') {
      throw new Error(`Não foi possível criar a plaquinha: ${error.message}`)
    }
  }

  throw new Error('Não foi possível gerar a plaquinha. Tente de novo.')
}

export async function listTags(restaurantId: unknown): Promise<TagDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  await requireMember(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_tags')
    .select('id, public_token, label, is_active, last_seen_at')
    .eq('restaurant_id', id)
    .order('created_at')

  if (error) throw new Error(`Não foi possível listar plaquinhas: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    publicToken: row.public_token,
    label: row.label,
    isActive: row.is_active,
    lastSeenAt: row.last_seen_at,
  }))
}

export async function updateTag(input: unknown): Promise<void> {
  const data = updateTagSchema.parse(input)

  const supabase = await db()
  const { data: row, error: lookupError } = await supabase
    .from('menu_tags')
    .select('restaurant_id')
    .eq('id', data.tagId)
    .single()

  if (lookupError || !row) throw new Error('Plaquinha não encontrada')
  await requireMember(row.restaurant_id)

  // public_token e restaurant_id nao aparecem aqui: o gatilho da Tarefa 3
  // recusaria a alteracao de qualquer forma.
  const { error } = await supabase
    .from('menu_tags')
    .update({ label: data.label ?? null, is_active: data.isActive })
    .eq('id', data.tagId)

  if (error) throw new Error(`Não foi possível salvar a plaquinha: ${error.message}`)
}

export async function deleteTag(tagId: unknown): Promise<void> {
  const id = uuidSchema.parse(tagId)
  await requirePlatformAdmin()

  const supabase = await db()
  const { error } = await supabase.from('menu_tags').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível remover a plaquinha: ${error.message}`)

  await recordAudit({ action: 'tag.deleted', subjectType: 'menu_tag', subjectId: id })
}

export async function resolveTag(token: unknown): Promise<ResolvedTagDTO | null> {
  await enforceRateLimit('tag:resolve', await rateLimitIdentity())

  const parsed = tagTokenSchema.safeParse(token)
  if (!parsed.success) return null

  const supabase = await db()
  const { data, error } = await supabase.rpc('resolve_menu_tag', {
    p_token: parsed.data,
  })

  if (error || !data || data.length === 0) return null
  return { restaurantSlug: data[0].restaurant_slug, tagLabel: data[0].tag_label }
}
```

- [ ] **Passo 2: Criar `src/server/dal/media.ts`**

```ts
import 'server-only'
import { randomUUID } from 'node:crypto'
import { uuidSchema } from '@/domain/common'
import { MEDIA_LIMITS, registerMediaSchema, type MediaKind } from '@/domain/media'
import { createUserClient } from './_client'
import { currentTerritory, requireMember } from './auth'

async function db() {
  return createUserClient(await currentTerritory())
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

// O caminho e montado no SERVIDOR, a partir do restaurante resolvido no
// servidor. O navegador nunca escolhe onde grava: o prefixo do caminho e a
// fronteira do inquilino, e deixar o cliente decidi-lo anularia a politica
// de storage inteira.
export async function buildUploadPath(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<{ bucket: string; path: string }> {
  const itemId = uuidSchema.parse(input.itemId)

  const limits = MEDIA_LIMITS[input.kind]
  if (!(limits.mimes as readonly string[]).includes(input.mimeType)) {
    throw new Error('Formato de arquivo não aceito')
  }

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', itemId)
    .single()

  if (error || !data) throw new Error('Item não encontrado')
  await requireMember(data.restaurant_id)

  const extension = EXTENSION_BY_MIME[input.mimeType]
  return {
    bucket: limits.bucket,
    path: `${data.restaurant_id}/${itemId}/${randomUUID()}.${extension}`,
  }
}

export async function registerItemMedia(input: unknown): Promise<string> {
  const data = registerMediaSchema.parse(input)

  const supabase = await db()
  const { data: item, error: lookupError } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', data.itemId)
    .single()

  if (lookupError || !item) throw new Error('Item não encontrado')
  await requireMember(item.restaurant_id)

  // Revalidamos o prefixo aqui mesmo com o CHECK da Tarefa 4 fazendo o
  // mesmo. O CHECK e a garantia; esta linha e a mensagem de erro decente.
  if (!data.storagePath.startsWith(`${item.restaurant_id}/`)) {
    throw new Error('Caminho de arquivo inválido')
  }

  const { data: row, error } = await supabase
    .from('menu_item_media')
    .insert({
      restaurant_id: item.restaurant_id,
      item_id: data.itemId,
      kind: data.kind,
      storage_path: data.storagePath,
      alt_text: data.altText ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      duration_ms: data.durationMs ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Não foi possível registrar a mídia: ${error.message}`)
  return row.id
}

export async function deleteItemMedia(mediaId: unknown): Promise<void> {
  const id = uuidSchema.parse(mediaId)

  const supabase = await db()
  const { data: row, error: lookupError } = await supabase
    .from('menu_item_media')
    .select('restaurant_id, kind, storage_path')
    .eq('id', id)
    .single()

  if (lookupError || !row) throw new Error('Mídia não encontrada')
  await requireMember(row.restaurant_id)

  const bucket = MEDIA_LIMITS[row.kind as MediaKind].bucket
  // Remove o arquivo antes da linha. Se a ordem fosse invertida e a segunda
  // etapa falhasse, sobraria arquivo sem dono e sem rastro no banco.
  await supabase.storage.from(bucket).remove([row.storage_path])

  const { error } = await supabase.from('menu_item_media').delete().eq('id', id)
  if (error) throw new Error(`Não foi possível remover a mídia: ${error.message}`)
}
```

- [ ] **Passo 3: Criar `src/lib/format.ts`**

```ts
// Preco vive como inteiro de centavos. A conversao para exibicao acontece
// so aqui, na borda.
export function formatPriceBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}
```

- [ ] **Passo 4: Criar `src/app/(site)/t/[token]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { resolveTag } from '@/server/dal/tags'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const resolved = await resolveTag(token)

  // Token desconhecido, plaquinha desativada e restaurante fora do ar
  // devolvem exatamente a mesma resposta. Distinguir os casos revelaria
  // quais plaquinhas existem.
  if (!resolved) return new NextResponse(null, { status: 404 })

  const target = new URL(`/${resolved.restaurantSlug}`, request.url)
  if (resolved.tagLabel) target.searchParams.set('mesa', resolved.tagLabel)

  return NextResponse.redirect(target, 307)
}
```

- [ ] **Passo 5: Substituir `src/app/(site)/[slug]/page.tsx` pela versão com dados**

```tsx
import { notFound } from 'next/navigation'
import { formatPriceBRL } from '@/lib/format'
import { getPublicMenu } from '@/server/dal/menu'

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const menu = await getPublicMenu(slug)

  // Restaurante inexistente, em rascunho, suspenso ou removido caem todos
  // aqui. A resposta e a mesma para nao revelar que o restaurante existe.
  if (!menu) notFound()

  return (
    <main>
      <h1>{menu.restaurant.name}</h1>
      {menu.restaurant.description ? <p>{menu.restaurant.description}</p> : null}

      {menu.categories.map((category) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <ul>
            {category.items.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong> — {formatPriceBRL(item.basePriceCents)}
                {item.isAvailable ? null : <span> (esgotado)</span>}
                {item.variants.map((variant) => (
                  <div key={variant.id}>
                    {variant.name}: {formatPriceBRL(variant.priceCents)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
```

- [ ] **Passo 6: Verificar o caminho completo da plaquinha**

Com o `PSQL`, criar um restaurante público com um item e uma plaquinha:

```sql
insert into public.restaurants (id, slug, name, status)
values ('c0000000-0000-0000-0000-000000000000', 'cardapio-demo', 'Cardápio Demo', 'active');

insert into public.menu_categories (id, restaurant_id, name)
values ('c1000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000000', 'Entradas');

insert into public.menu_items (restaurant_id, category_id, name, base_price_cents)
values ('c0000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Pão de alho', 1890);

insert into public.menu_tags (restaurant_id, public_token, label)
values ('c0000000-0000-0000-0000-000000000000', 'DEMA2K4M7PQR9STV', 'Mesa 3');
```

Com `pnpm dev` rodando:

```bash
curl -s -H "Host: localhost:3000" http://127.0.0.1:3000/cardapio-demo | grep -o "R\$.[0-9,]*"
```

Esperado: `R$ 18,90` — o preço em centavos chegou formatado.

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -H "Host: localhost:3000" http://127.0.0.1:3000/t/DEMA2K4M7PQR9STV
```

Esperado: `307` e destino terminando em `/cardapio-demo?mesa=Mesa+3`.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost:3000" http://127.0.0.1:3000/t/ZZZZ9999ZZZZ9999
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost:3000" http://127.0.0.1:3000/restaurante-que-nao-existe
```

Esperado: `404` nos dois.

- [ ] **Passo 7: Verificar que restaurante em rascunho também dá 404**

```sql
update public.restaurants set status = 'draft' where slug = 'cardapio-demo';
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost:3000" http://127.0.0.1:3000/cardapio-demo
```

Esperado: `404`, idêntico ao de restaurante inexistente. Reverter depois:

```sql
update public.restaurants set status = 'active' where slug = 'cardapio-demo';
```

- [ ] **Passo 8: Commit**

```bash
git add src/server/dal/tags.ts src/server/dal/media.ts src/lib/format.ts "src/app/(site)"
git commit -m "feat(app): plaquinhas, midia e rotas publicas de cardapio"
```

---

### Tarefa 18: Server actions

**Arquivos:**
- Criar: `src/server/actions/result.ts`
- Criar: `src/server/actions/restaurants.ts`, `invites.ts`, `menu.ts`, `tags.ts`, `media.ts`

**Interfaces:**
- Consome: toda a DAL
- Produz: `ActionResult<T>`, `runAction(fn)` e uma action por operação da DAL

- [ ] **Passo 1: Criar `src/server/actions/result.ts`**

```ts
import 'server-only'
import { ZodError } from 'zod'
import { ForbiddenError } from '@/server/dal/auth'
import { RateLimitedError } from '@/server/security/rate-limit'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// redirect() e notFound() do Next funcionam LANCANDO. Se este catch
// engolisse essas excecoes, todo redirecionamento dentro de uma action
// viraria silenciosamente uma mensagem de erro generica — um bug
// desconcertante de diagnosticar.
function isNextControlFlow(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) {
    return false
  }
  const digest = (error as { digest: unknown }).digest
  return (
    typeof digest === 'string' &&
    (digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_NOT_FOUND') ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))
  )
}

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    if (isNextControlFlow(error)) throw error

    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? 'Dados inválidos' }
    }
    if (error instanceof ForbiddenError || error instanceof RateLimitedError) {
      return { ok: false, error: error.message }
    }

    // Erro inesperado nao viaja para o cliente. Mensagem do Postgres traz
    // nome de tabela, coluna e constraint — um mapa do schema de graca
    // para quem estiver sondando.
    console.error('[action]', error)
    return { ok: false, error: 'Não foi possível concluir a operação.' }
  }
}
```

- [ ] **Passo 2: Criar `src/server/actions/restaurants.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/restaurants'
import { runAction, type ActionResult } from './result'

export async function createRestaurantAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(async () => {
    // A autorizacao acontece DENTRO da DAL. Nao basta a pagina ter
    // verificado: a action e um endpoint POST publico por construcao e
    // pode ser chamada direto, sem passar por tela nenhuma.
    const restaurant = await dal.createRestaurant(input)
    revalidatePath('/')
    return { id: restaurant.id, slug: restaurant.slug }
  })
}

export async function updateRestaurantProfileAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.updateRestaurantProfile(input)
    revalidatePath('/')
  })
}

export async function setRestaurantStatusAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.setRestaurantStatus(input)
    revalidatePath('/')
  })
}

export async function softDeleteRestaurantAction(
  restaurantId: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.softDeleteRestaurant(restaurantId)
    revalidatePath('/')
  })
}
```

- [ ] **Passo 3: Criar as demais actions com o mesmo formato**

`src/server/actions/invites.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/invites'
import { runAction, type ActionResult } from './result'

export async function createInviteAction(
  input: unknown,
): Promise<ActionResult<{ id: string; link: string }>> {
  return runAction(async () => {
    const invite = await dal.createInvite(input)
    revalidatePath('/')
    // O link volta UMA vez. Quem chamar precisa mostrar agora; nem o banco
    // nem esta action conseguem produzi-lo de novo.
    return invite
  })
}

export async function revokeInviteAction(inviteId: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await dal.revokeInvite(inviteId)
    revalidatePath('/')
  })
}

export async function redeemInviteAction(
  token: unknown,
): Promise<ActionResult<{ restaurantId: string }>> {
  return runAction(async () => {
    const restaurantId = await dal.redeemInvite(token)
    revalidatePath('/')
    return { restaurantId }
  })
}
```

`src/server/actions/menu.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/menu'
import { runAction, type ActionResult } from './result'

export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createCategory(input)
    revalidatePath('/')
    return { id }
  })
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.updateCategory(input); revalidatePath('/') })
}

export async function deleteCategoryAction(categoryId: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.deleteCategory(categoryId); revalidatePath('/') })
}

export async function reorderCategoriesAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.reorderCategories(input); revalidatePath('/') })
}

export async function createItemAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createItem(input)
    revalidatePath('/')
    return { id }
  })
}

export async function updateItemAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.updateItem(input); revalidatePath('/') })
}

export async function deleteItemAction(itemId: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.deleteItem(itemId); revalidatePath('/') })
}

export async function reorderItemsAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.reorderItems(input); revalidatePath('/') })
}

export async function setItemAvailabilityAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.setItemAvailability(input); revalidatePath('/') })
}

export async function createVariantAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createVariant(input)
    revalidatePath('/')
    return { id }
  })
}

export async function updateVariantAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.updateVariant(input); revalidatePath('/') })
}

export async function deleteVariantAction(variantId: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.deleteVariant(variantId); revalidatePath('/') })
}
```

`src/server/actions/tags.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/tags'
import { runAction, type ActionResult } from './result'
import type { TagDTO } from '@/domain/tag'

export async function createTagAction(input: unknown): Promise<ActionResult<TagDTO>> {
  return runAction(async () => {
    const tag = await dal.createTag(input)
    revalidatePath('/')
    return tag
  })
}

export async function updateTagAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.updateTag(input); revalidatePath('/') })
}

export async function deleteTagAction(tagId: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.deleteTag(tagId); revalidatePath('/') })
}
```

`src/server/actions/media.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as dal from '@/server/dal/media'
import { runAction, type ActionResult } from './result'
import type { MediaKind } from '@/domain/media'

export async function buildUploadPathAction(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<ActionResult<{ bucket: string; path: string }>> {
  return runAction(() => dal.buildUploadPath(input))
}

export async function registerItemMediaAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.registerItemMedia(input)
    revalidatePath('/')
    return { id }
  })
}

export async function deleteItemMediaAction(mediaId: unknown): Promise<ActionResult> {
  return runAction(async () => { await dal.deleteItemMedia(mediaId); revalidatePath('/') })
}
```

- [ ] **Passo 4: Verificar**

```bash
pnpm lint && pnpm exec tsc --noEmit
```

- [ ] **Passo 5: Commit**

```bash
git add src/server/actions/
git commit -m "feat(app): server actions finas que delegam para a DAL"
```

---

### Tarefa 19: Configuração, cabeçalhos e verificação final

**Arquivos:**
- Modificar: `next.config.ts`
- Criar: `README-fase0.md`

**Interfaces:**
- Consome: `NEXT_PUBLIC_ROOT_DOMAIN`
- Produz: a configuração de produção e o registro de verificação da Fase 0

- [ ] **Passo 1: Substituir `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'
const IS_PROD = process.env.NODE_ENV === 'production'

// Em desenvolvimento o Next precisa de 'unsafe-eval' para o refresh rapido.
// Em producao ele sai. CSP estrita com nonce fica para a Fase 3, quando
// existir HTML publico de verdade para proteger.
const scriptSrc = IS_PROD
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "style-src 'self' 'unsafe-inline'",
  scriptSrc,
  "connect-src 'self' https: ws:",
].join('; ')

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A porta precisa aparecer por extenso: 'localhost' NAO casa com
      // 'localhost:3000'. Sem estas tres entradas, as actions falham em
      // admin. e painel. com erro pouco descritivo.
      allowedOrigins: [ROOT, `admin.${ROOT}`, `painel.${ROOT}`],
    },
  },
  // O servidor de desenvolvimento tambem precisa aceitar os subdominios,
  // senao os assets de /_next nao chegam em admin.localhost:3000.
  allowedDevOrigins: [`admin.${ROOT}`, `painel.${ROOT}`],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        ],
      },
    ]
  },
}

export default nextConfig
```

- [ ] **Passo 2: Verificar que os cabeçalhos saem na resposta**

```bash
pnpm dev
```

```bash
curl -s -D - -o /dev/null -H "Host: localhost:3000" http://127.0.0.1:3000/ | grep -i "x-frame-options\|content-security-policy\|x-content-type"
```

Esperado: as três linhas presentes, com `X-Frame-Options: DENY` e `frame-ancestors 'none'` na CSP.

- [ ] **Passo 3: Rodar a verificação de isolamento uma última vez**

```bash
npx supabase db reset
```

Rodar `supabase/seed/verificar-isolamento.sql` com o `PSQL` e conferir a tabela de resultados exigidos da Tarefa 9. **Este é o portão final da Fase 0.**

- [ ] **Passo 4: Build de produção**

```bash
pnpm build
```

Esperado: build concluído sem erro. Se falhar por variável de ambiente, confirme que `.env.local` está completo — é a validação da Tarefa 10 funcionando como projetada.

- [ ] **Passo 5: Confirmar que a chave de serviço não está em lugar nenhum**

```bash
grep -ri "service_role" src/ .env.local 2>/dev/null; echo "--- fim ---"
```

Esperado: **nenhuma ocorrência** antes do `--- fim ---`. Esta é a verificação da decisão D6: a chave que ignora toda a RLS não existe no ambiente da aplicação.

- [ ] **Passo 6: Escrever `README-fase0.md`**

Registrar, em texto corrido: como subir o ambiente (Docker Desktop, `npx supabase start`, `pnpm dev`), os três hosts de desenvolvimento, como promover o primeiro administrador com `supabase/seed/bootstrap-admin.sql`, e a lista de itens obrigatórios antes de publicar — IP confiável em vez de `x-forwarded-for` cru, `NEXT_PUBLIC_ROOT_DOMAIN` apontando para o domínio real, e os três registros DNS.

- [ ] **Passo 7: Commit**

```bash
git add next.config.ts README-fase0.md
git commit -m "feat(app): cabecalhos de seguranca, origens permitidas e registro da fase 0"
```

---

## Verificação de cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| 4 — Territórios | Tarefas 10 e 12 |
| 5 — Papéis e bootstrap | Tarefas 2, 3, 9 |
| 6 — Schema | Tarefas 1 a 5 |
| 7 — RLS e funções privilegiadas | Tarefas 6 e 7 |
| 8 — Camada de acesso a dados | Tarefas 11, 14, 15, 16, 17 |
| 9 — Proxy, autenticação e sessão | Tarefas 11, 12, 14 |
| 10 — Mídia e storage | Tarefas 8 e 17 |
| 11 — Segurança operacional | Tarefas 5, 13, 14, 18, 19 |
| 12 — Estrutura e fronteiras | Tarefas 10, 11, 13 |
| 13 — Dívidas registradas | Documentadas na Tarefa 19, passo 6 |

## Omissão deliberada: tipos gerados do banco

O Supabase consegue gerar tipos TypeScript a partir do schema (`npx supabase gen types typescript --local`), o que daria autocompletar e checagem de coluna em toda consulta da DAL. **A Fase 0 não faz isso**, por um motivo específico: o schema muda em oito das dezenove tarefas, e cada mudança exigiria regerar o arquivo e reconciliar o resto. O ganho apareceria justo quando o schema parasse de se mexer.

O primeiro passo da Fase 1 deve ser gerar esses tipos e passá-los como parâmetro genérico em `createUserClient`. A partir daí, errar um nome de coluna vira erro de build. Enquanto isso não acontece, as consultas da DAL são verificadas pelos passos de verificação de cada tarefa, não pelo compilador — e isso está registrado aqui para não passar por descuido.

