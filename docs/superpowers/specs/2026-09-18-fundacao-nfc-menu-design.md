# Fase 0 — Fundação: territórios, dados, autorização e segurança

Data: 2026-09-18
Status: aprovado, pronto para plano de implementação

## 1. Contexto

Aplicação de cardápio digital para restaurantes, acessada por NFC ou QR code. Três perfis: administrador da plataforma, dono do restaurante e cliente final anônimo. Stack: Next.js 16.3.5 (App Router), React 19.2.8, Supabase (Postgres, Auth, Storage), TypeScript, Zod 4, Tailwind 4, shadcn.

O projeto Supabase está vazio. O repositório é um template do Next recém-criado, já com o conjunto de componentes shadcn instalado e tokens de tema em `src/app/globals.css`.

### Particularidades do Next.js 16 que afetam este desenho

- `middleware.ts` foi renomeado para `proxy.ts`. O runtime é `nodejs` e **não é configurável**.
- As APIs de requisição são assíncronas: `params`, `searchParams`, `cookies()` e `headers()` retornam Promise.
- `experimental.dynamicIO` e `experimental.useCache` foram removidos em favor de `cacheComponents`, que **não** adotamos (ver D13).
- Turbopack é o padrão.

### Decomposição do produto

O produto inteiro são quatro subsistemas. Cada um recebe sua própria spec, plano e implementação.

| Fase | Entrega |
|---|---|
| **0 — Fundação** | Este documento: territórios, schema, RLS, autenticação, DAL, convite, storage, rate limit |
| 1 — Console do super admin | Cadastrar e manter restaurantes, emitir convites, suspender |
| 2 — Painel do restaurante | CMS do cardápio: categorias, itens, variações, mídia |
| 3 — Cardápio público | Consumo via NFC/QR, tema por restaurante, animação, performance |

## 2. Escopo da Fase 0

**Dentro:** separação por subdomínio no `proxy.ts`, migrações SQL completas (tabelas, enums, índices, constraints, triggers, funções), políticas RLS em todas as tabelas, buckets e políticas de storage, camada de acesso a dados com autorização e DTOs, server actions, fluxo de convite por link, rate limit, log de auditoria, validação de ambiente, regras de lint que sustentam as fronteiras.

**Fora:** qualquer interface além do esqueleto de rotas. Qualquer teste automatizado — decisão explícita do cliente. Pedido, pagamento, tempo real, notificação, internacionalização.

**Verificação:** durante a implementação, consultas ad-hoc contra o Postgres local (Supabase CLI 2.117.0), com resultado reportado. Não há suíte de testes.

## 3. Decisões e justificativas

| # | Decisão | Por quê |
|---|---|---|
| D1 | URL canônica `/{slug}`; plaquinha física grava `/t/{token}` | A plaquinha é hardware. O token opaco permite trocar dono, slug ou reatribuir a plaquinha sem regravar o NFC |
| D2 | Plaquinha tem `label` anulável, sem tabela de mesas | Mesa não é requisito hoje. Uma coluna anulável deixa a porta aberta com custo próximo de zero |
| D3 | Cardápio público é somente leitura; seleção do cliente vive no `localStorage` | Resolve "mostrar pro garçom" sem backend, sem conta de cliente e sem dado pessoal |
| D4 | Membership N↔N com papéis, mas só `owner` recebe política na Fase 0 | A tabela é o que é caro migrar; a política é barata de adicionar. Na prática hoje é uma pessoa por restaurante |
| D5 | Defesa em profundidade: RLS restritiva **e** DAL com autorização explícita | Vazamento entre inquilinos exige falha nas duas camadas |
| D6 | A chave `service_role` não entra na aplicação | Nenhuma operação precisa dela. Chave ausente não vaza de log, stack trace ou env exposta |
| D7 | Operações privilegiadas são funções `SECURITY DEFINER` no Postgres | Escopo estreito, auditável, e atômicas — resolvem corrida sem lock na aplicação |
| D8 | `platform_admin` em tabela, não em claim do JWT | Revogação imediata. Claim só atualiza no refresh do token, deixando um admin comprometido ativo por até uma hora |
| D9 | `restaurant_id` denormalizado nas tabelas filhas, com FK composta | Permite RLS sem join e torna referência cruzada entre restaurantes **inexpressável** no banco |
| D10 | Preço em `integer` de centavos | Ponto flutuante não representa `19.90` exatamente |
| D11 | Token de plaquinha em texto puro; token de convite só como hash | A plaquinha é pública e precisa ser reimpressa. O convite é credencial e não pode sobreviver a um vazamento do banco |
| D12 | `deleted_at` só em `restaurants` | Soft delete onde o erro é catastrófico; delete real no resto, evitando poluir toda consulta |
| D13 | Sempre dinâmico, sem cache entre requisições e sem `cacheComponents` | Escolha do cliente. `cache()` do React deduplica dentro do mesmo render sem introduzir staleness |
| D14 | Dois buckets de storage, não um | Limite de tamanho e MIME são configuração do bucket, imposta pelo servidor. Um bucket só forçaria o teto do maior |
| D15 | Descrição de item é texto puro, sem HTML nem markdown | Elimina a classe XSS inteira em vez de depender de sanitizador |
| D16 | Sem SMTP na Fase 0; recuperação de acesso via novo convite | O link de convite já é a prova de avalização. Registrado como dívida |
| D17 | Sem testes automatizados | Decisão explícita do cliente |
| D18 | Um subdomínio por tipo de acesso; a raiz é o cliente | Três subdomínios fixos, não um por restaurante — portanto **sem DNS wildcard e sem certificado wildcard** |
| D19 | Cookie de sessão host-only; nunca no domínio pai | Faz do navegador a barreira. Uma falha no cardápio público não alcança sessão de administrador, porque ela não existe naquele host |
| D20 | Nome de cookie distinto por território | Impede que uma configuração futura de domínio pai faça um território sombrear o outro |
| D21 | O proxy devolve 404 para `/admin` e `/painel` quando o Host é a raiz | Sem isso o território privado ficaria alcançável pelo domínio público |

## 4. Territórios

| Host | Público-alvo | Sessão | Rotas |
|---|---|---|---|
| `dominio.com.br` | Cliente final, anônimo | **Nenhuma.** O território público nunca cria cliente de auth nem toca cookie de sessão | `/` institucional, `/{slug}` cardápio, `/t/{token}` plaquinha |
| `admin.dominio.com.br` | Administrador da plataforma | Isolada, cookie host-only | `/entrar` público; todo o resto privado |
| `painel.dominio.com.br` | Dono do restaurante | Isolada, cookie host-only | `/entrar` e `/convite/{token}` públicos; todo o resto privado |

Em desenvolvimento os hosts são `localhost:3000`, `admin.localhost:3000` e `painel.localhost:3000`. Chrome, Edge e Firefox resolvem `*.localhost` nativamente — não é preciso editar o arquivo `hosts`.

### Roteamento interno

O `proxy.ts` lê o header `Host`, deriva o território e reescreve para um prefixo real de caminho:

| Host | Caminho recebido | Reescrito para |
|---|---|---|
| raiz | `/x` | `/x` (sem reescrita) |
| raiz | `/admin/...` ou `/painel/...` | **404** (D21) |
| `admin.` | `/x` | `/admin/x` |
| `painel.` | `/x` | `/painel/x` |

A árvore de rotas usa um grupo para a raiz e pastas reais para os territórios privados, de modo que a reescrita tenha alvo concreto:

```
src/app/
  (site)/
    page.tsx                  raiz institucional
    [slug]/page.tsx           cardápio público
    t/[token]/route.ts        resolve plaquinha e redireciona
  admin/
    entrar/page.tsx
    layout.tsx  page.tsx
  painel/
    entrar/page.tsx
    convite/[token]/page.tsx
    layout.tsx  page.tsx
```

O grupo `(site)` não aparece na URL, então define `/` sem colidir com `admin/` e `painel/`, que são segmentos estáticos e têm precedência sobre `[slug]`.

### Isolamento de sessão

Cookies de sessão são **host-only**: `cookieOptions.domain` nunca é definido. Esse já é o comportamento padrão do navegador quando o atributo `Domain` está ausente, e é exatamente o isolamento desejado — definir o domínio pai seria justamente o que quebraria a barreira.

Cada território privado usa um prefixo de nome de cookie próprio (`cookieOptions.name`), garantindo que uma configuração futura de domínio pai não faça um território sombrear o outro (D20).

Consequência aceita: quem for administrador da plataforma **e** dono de um restaurante autentica duas vezes, uma em cada território.

### Server Actions e origem

Server Actions comparam `Origin` com `Host` para barrar CSRF. Com múltiplos domínios isso exige declarar `serverActions.allowedOrigins` em `next.config.ts` com os três hosts de desenvolvimento e os três de produção. Sem isso as actions falham em produção com erro pouco descritivo.

## 5. Papéis

| Papel | Alcance | Pode |
|---|---|---|
| `platform_admin` | Global | Criar, editar, suspender e remover restaurantes; emitir e revogar convites; criar e remover plaquinhas; ler auditoria; tudo que `owner` pode |
| `owner` | Por restaurante | Editar identidade e tema do restaurante; CRUD completo do cardápio; editar rótulo e ativação das plaquinhas |
| `manager` | Por restaurante | Existe no enum. **Nenhuma política na Fase 0.** Adicionar depois é política nova, não migração |

`owner` **não** pode alterar `slug`, `status` nem `deleted_at` do restaurante — garantido por trigger, não por convenção.

### Bootstrap do primeiro administrador

Não existe caminho no código que promova alguém a `platform_admin`. O primeiro é criado por passo manual documentado, uma única vez:

1. A pessoa se cadastra normalmente, ou é criada pelo painel do Supabase.
2. O operador executa `supabase/seed/bootstrap-admin.sql`, que insere em `platform_admins` a partir de um e-mail informado.

Isso evita uma porta de promoção de privilégio dentro da aplicação.

## 6. Schema

**Nenhuma extensão é instalada.** `sha256(bytea)` e `convert_to(text, name)` são nativas do Postgres desde a versão 11, em `pg_catalog`, e substituem `digest()` do `pgcrypto`. O `slug` já tem CHECK que força minúsculas, o que torna `citext` redundante; a comparação de e-mail em `redeem_invite` usa `lower()` explícito. Além de uma dependência a menos, `pg_catalog` é mais previsível do que o schema `extensions` do Supabase quando toda função roda com `search_path` travado.

Enums: `restaurant_status` (`draft`, `active`, `suspended`), `membership_role` (`owner`, `manager`), `media_kind` (`image`, `video`).

Convenção em toda tabela: `id uuid primary key default gen_random_uuid()` e `created_at timestamptz not null default now()`. Onde há edição, `updated_at timestamptz not null default now()` mantido pelo trigger compartilhado `public.set_updated_at()`.

### 6.1 Identidade

**`profiles`** — `id uuid pk references auth.users(id) on delete cascade`, `display_name text`, `avatar_path text`, `created_at`, `updated_at`.

Criada pelo trigger `handle_new_user()` (`SECURITY DEFINER`) em `auth.users` after insert. A aplicação nunca insere.

**`platform_admins`** — `user_id uuid pk references profiles(id) on delete cascade`, `granted_by uuid references profiles(id)`, `granted_at timestamptz not null default now()`.

### 6.2 Tenancy

**`restaurants`** — `id`, `slug text not null unique`, `name text not null`, `description text`, `status restaurant_status not null default 'draft'`, `currency text not null default 'BRL'`, `timezone text not null default 'America/Sao_Paulo'`, `logo_path text`, `cover_path text`, `theme jsonb not null default '{}'`, `contact jsonb not null default '{}'`, `created_by uuid references profiles(id)`, `created_at`, `updated_at`, `deleted_at timestamptz`.

- `check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$')` — impede slug que confunda o roteamento.
- Slugs reservados rejeitados por check adicional: `admin`, `painel`, `api`, `t`, `entrar`, `convite`, `_next`, `static`, `assets`.
- Trigger `restaurants_guard_privileged_columns()` (BEFORE UPDATE): levanta exceção se `slug`, `status` ou `deleted_at` mudarem e `public.is_platform_admin()` for falso.
- Índice parcial: `create index on restaurants (slug) where status = 'active' and deleted_at is null`.

**`memberships`** — `id`, `restaurant_id uuid not null references restaurants(id) on delete cascade`, `user_id uuid not null references profiles(id) on delete cascade`, `role membership_role not null`, `created_at`.

`unique (restaurant_id, user_id)`. Índices em `(user_id)` e `(restaurant_id)`.

**`invites`** — `id`, `restaurant_id uuid not null references restaurants(id) on delete cascade`, `role membership_role not null`, `token_hash bytea not null unique`, `email text`, `created_by uuid not null references profiles(id)`, `expires_at timestamptz not null`, `redeemed_at timestamptz`, `redeemed_by uuid references profiles(id)`, `revoked_at timestamptz`, `created_at`.

- `check (expires_at > created_at)`.
- O token em claro **nunca** é persistido.

### 6.3 Plaquinhas

**`menu_tags`** — `id`, `restaurant_id uuid not null references restaurants(id) on delete cascade`, `public_token text not null unique`, `label text`, `is_active boolean not null default true`, `created_at`, `last_seen_at timestamptz`.

- `public_token`: 16 bytes aleatórios em base32 sem caracteres ambíguos, gerado pela aplicação.
- Guardado em texto puro por D11 — é público e precisa ser reimpresso.
- Trigger de colunas imutáveis: `public_token` e `restaurant_id` não mudam após a criação.

### 6.4 Cardápio

**`menu_categories`** — `id`, `restaurant_id uuid not null references restaurants(id) on delete cascade`, `name text not null`, `description text`, `position integer not null default 0`, `is_visible boolean not null default true`, `created_at`, `updated_at`.

`unique (id, restaurant_id)` — alvo da FK composta.

**`menu_items`** — `id`, `restaurant_id uuid not null`, `category_id uuid not null`, `name text not null`, `description text`, `base_price_cents integer not null check (base_price_cents >= 0)`, `is_available boolean not null default true`, `is_visible boolean not null default true`, `position integer not null default 0`, `dietary_tags text[] not null default '{}'`, `created_at`, `updated_at`.

- `foreign key (restaurant_id) references restaurants(id) on delete cascade`
- `foreign key (category_id, restaurant_id) references menu_categories(id, restaurant_id) on delete cascade`
- `unique (id, restaurant_id)`

**`menu_item_variants`** — `id`, `restaurant_id uuid not null`, `item_id uuid not null`, `name text not null`, `price_cents integer not null check (price_cents >= 0)`, `position integer not null default 0`, `is_available boolean not null default true`, `created_at`, `updated_at`.

`foreign key (item_id, restaurant_id) references menu_items(id, restaurant_id) on delete cascade`.

**`menu_item_media`** — `id`, `restaurant_id uuid not null`, `item_id uuid not null`, `kind media_kind not null`, `storage_path text not null unique`, `alt_text text`, `width integer`, `height integer`, `duration_ms integer`, `position integer not null default 0`, `created_at`.

- `foreign key (item_id, restaurant_id) references menu_items(id, restaurant_id) on delete cascade`
- `check (storage_path like restaurant_id::text || '/%')` — o caminho no storage precisa começar pelo id do restaurante.

### 6.5 Infraestrutura

**`rate_limit_counters`** — `bucket text not null`, `identifier text not null`, `window_start timestamptz not null`, `hits integer not null default 0`, `primary key (bucket, identifier, window_start)`.

`revoke all on rate_limit_counters from anon, authenticated`. RLS ligada, **zero políticas**.

**`audit_log`** — `id`, `actor_id uuid references profiles(id)`, `action text not null`, `subject_type text not null`, `subject_id uuid`, `restaurant_id uuid references restaurants(id) on delete set null`, `metadata jsonb not null default '{}'`, `ip inet`, `created_at`.

Sem update, sem delete. Escrita apenas por funções `SECURITY DEFINER`.

## 7. RLS

RLS ligada em **todas** as tabelas do schema `public`. Ausência de política significa negação.

### 7.1 Funções auxiliares

Todas `stable security definer set search_path = ''`:

- `public.is_platform_admin() → boolean`
- `public.is_member(rid uuid) → boolean`
- `public.is_owner(rid uuid) → boolean`
- `public.is_restaurant_public(rid uuid) → boolean` — `status = 'active' and deleted_at is null`
- `public.is_category_visible(cid uuid) → boolean`
- `public.is_menu_item_public(iid uuid) → boolean` — item visível, categoria visível e restaurante público

`SECURITY DEFINER` cumpre dois papéis: concede a leitura necessária e, sobretudo, **quebra a recursão infinita** de uma política em `memberships` que consulta `memberships`. `set search_path = ''` fecha search_path injection; por isso toda referência dentro das funções é qualificada (`public.`, `extensions.`, `auth.`).

### 7.2 Matriz de políticas

| Tabela | Leitura pública (anon) | Membro | Escrita |
|---|---|---|---|
| `profiles` | — | próprio registro | UPDATE do próprio; INSERT só por trigger |
| `platform_admins` | — | — | nenhuma pela aplicação; leitura só para admin |
| `restaurants` | `is_restaurant_public(id)` | `is_member(id)` | INSERT admin; UPDATE admin ou owner, com trigger guardando `slug`/`status`/`deleted_at`; sem DELETE |
| `memberships` | — | `is_member(restaurant_id)` | INSERT admin e `redeem_invite`; DELETE owner ou admin |
| `invites` | — | `is_owner(restaurant_id)` | INSERT e UPDATE só admin; sem DELETE |
| `menu_tags` | — (resolução só por função) | `is_member(restaurant_id)` | INSERT e DELETE admin; UPDATE membro, com colunas imutáveis por trigger |
| `menu_categories` | `is_visible and is_restaurant_public(restaurant_id)` | `is_member(restaurant_id)` | CRUD por membro ou admin |
| `menu_items` | `is_visible and is_restaurant_public(restaurant_id) and is_category_visible(category_id)` | `is_member(restaurant_id)` | CRUD por membro ou admin |
| `menu_item_variants` | `is_menu_item_public(item_id)` | `is_member(restaurant_id)` | CRUD por membro ou admin |
| `menu_item_media` | `is_menu_item_public(item_id)` | `is_member(restaurant_id)` | CRUD por membro ou admin |
| `audit_log` | — | — | leitura só admin; escrita só por função |
| `rate_limit_counters` | — | — | nenhuma; acesso só por função |

### 7.3 Funções privilegiadas

**`public.preview_invite(p_token text)`** — `security definer`, retorna apenas `{ restaurant_name, role, is_valid }`. Recebe o token **em claro** e calcula `extensions.digest(p_token, 'sha256')` internamente. Resposta idêntica para token inválido, expirado e revogado.

Receber o token em claro em vez do hash é deliberado e essencial: se a função aceitasse o hash, um vazamento do banco entregaria hashes diretamente utilizáveis, anulando o motivo de guardar hash.

**`public.redeem_invite(p_token text)`** — `security definer`, transação única:

1. Calcula o hash e localiza o convite.
2. Valida `expires_at > now()`, `redeemed_at is null`, `revoked_at is null` e, se `email` estiver preenchido, que confere com o e-mail de `auth.uid()`.
3. `update invites set redeemed_at = now(), redeemed_by = auth.uid() where id = ... and redeemed_at is null returning *` — a corrida entre dois cliques simultâneos é resolvida pela própria garantia do Postgres.
4. Insere a membership.
5. Grava no `audit_log`.

**`public.resolve_menu_tag(p_token text)`** — `security definer`, retorna `{ slug, label }` para plaquinha ativa de restaurante público, ou nada. Atualiza `last_seen_at`. Impede enumeração da tabela por anônimos.

**`public.check_rate_limit(p_bucket text, p_identifier text, p_max integer, p_window_seconds integer) → boolean`** — `security definer`, janela fixa, UPSERT atômico com `on conflict do update set hits = rate_limit_counters.hits + 1 returning hits`.

**`public.record_audit(...)`** — `security definer`, insere em `audit_log`.

## 8. Camada de acesso a dados

Toda a DAL vive em `src/server/dal/` e todo arquivo começa com `import 'server-only'`.

**Um único tipo de cliente.** `createUserClient(territory)` usa `createServerClient` do `@supabase/ssr` com a chave anônima, a sessão do usuário e o nome de cookie do território. RLS ativa em toda consulta. Não existe cliente com `service_role` (D6).

**Forma obrigatória de toda função:** valida a entrada com Zod → autoriza explicitamente → consulta → devolve DTO. Nunca devolve linha crua do banco.

**`getUser()`, nunca `getSession()`.** `getSession()` apenas decodifica o cookie; `getUser()` revalida o token contra o servidor de auth. `getCurrentUser()` é envolvido em `cache()` do React para rodar uma vez por requisição.

**Detalhe de cookies:** `setAll(cookies, headers)` do `@supabase/ssr` 0.12.7 entrega headers anti-cache junto com os cookies de sessão. Eles **precisam** ser aplicados na resposta; sem isso um CDN ou proxy reverso pode servir a sessão de um usuário para outro. Um cliente de servidor por requisição — reutilizar entre requisições deixa respostas posteriores sem esses headers.

### Superfície da DAL

| Módulo | Funções |
|---|---|
| `_client.ts` | `createUserClient`, `createProxyClient` — único arquivo do projeto que importa `@supabase/*` |
| `auth.ts` | `getCurrentUser`, `requireUser`, `requirePlatformAdmin`, `requireMember`, `requireOwner` |
| `restaurants.ts` | `createRestaurant`, `updateRestaurantProfile`, `setRestaurantStatus`, `softDeleteRestaurant`, `listRestaurantsForAdmin`, `listMyRestaurants`, `getRestaurantForMember`, `getRestaurantBySlugPublic` |
| `menu.ts` | `getPublicMenu`, `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `listItems`, `createItem`, `updateItem`, `deleteItem`, `reorderItems`, `setItemAvailability`, `createVariant`, `updateVariant`, `deleteVariant` |
| `invites.ts` | `createInvite`, `listInvites`, `revokeInvite`, `previewInvite`, `redeemInvite` |
| `tags.ts` | `createTag`, `listTags`, `updateTag`, `deleteTag`, `resolveTag` |
| `media.ts` | `buildUploadPath`, `registerItemMedia`, `deleteItemMedia` |

`createInvite` devolve o link **uma única vez**, apontando para `painel.dominio/convite/{token}`. O banco guarda apenas o hash e não consegue reconstruí-lo; perdeu, emite outro.

### Server actions

`src/server/actions/` contém actions finas: validam, delegam para a DAL e chamam `revalidatePath`. Toda action reverifica autorização através da DAL — autorização feita na página **não** protege a action, que é um endpoint POST público por construção.

## 9. Proxy, autenticação e sessão

### `proxy.ts`

Arquivo em `src/proxy.ts`. Sequência:

1. Lê `Host`, remove a porta e deriva o território (`site`, `admin`, `painel`) comparando com `NEXT_PUBLIC_ROOT_DOMAIN`. A derivação precisa tratar a porta porque em desenvolvimento os hosts são `localhost:3000` e `admin.localhost:3000`.
2. **Host desconhecido cai em `site`** — deliberadamente o território de menor privilégio. Um header `Host` forjado nunca deve promover ninguém a território privado.
3. Se o território é `site`: devolve 404 para caminhos `/admin` e `/painel` (D21) e segue **sem criar cliente de auth e sem tocar cookie de sessão**.
4. Se é `admin` ou `painel`: renova o cookie de sessão e aplica os headers anti-cache entregues pelo `setAll`.
5. Checagem otimista: sem cookie de sessão e fora das rotas públicas do território, redireciona para `/entrar` daquele território.
6. Reescreve o caminho para o prefixo interno correspondente.

**O cliente Supabase do proxy vem de `dal/_client.ts`.** O proxy precisa de um cliente para renovar a sessão, mas não pode criá-lo por conta própria sem furar a regra de fonte única (seção 12). `_client.ts` exporta `createProxyClient(request, response)` para esse uso; `@supabase/ssr` continua importado em um único arquivo do projeto.

**Cookies têm que sobreviver à reescrita.** A renovação de sessão (passo 4) e a reescrita (passo 6) acontecem na mesma resposta. Os cookies e headers precisam ser copiados para o objeto de resposta final da reescrita — construir uma resposta nova depois de gravar os cookies descarta a sessão renovada silenciosamente, e o sintoma é o usuário sendo deslogado de forma intermitente.

**O proxy não autoriza.** Checagem otimista apenas — ele roda inclusive em prefetch, então consulta ao banco ali degrada tudo e produz falsa sensação de proteção. Autorização real acontece na DAL, em toda página e em toda action. O `matcher` exclui estáticos, imagens e arquivos com extensão.

### Respostas para recurso inexistente

| Situação | Resposta |
|---|---|
| `/{slug}` sem restaurante correspondente | 404 |
| `/{slug}` de restaurante `draft`, `suspended` ou removido | 404, indistinguível de inexistente — não revela que o restaurante existe |
| `/t/{token}` com token desconhecido ou plaquinha inativa | 404 |
| `/t/{token}` de restaurante não público | 404, pela mesma razão |

### Ciclo do convite

| Etapa | Comportamento |
|---|---|
| Emissão | 32 bytes de `crypto.randomBytes` em base64url formam o link. O banco guarda só o SHA-256. O link é exibido uma única vez |
| Abertura | Rate limit por IP antes de qualquer consulta. `preview_invite` devolve apenas o nome do restaurante — nunca e-mail ou autor |
| Conta | Cadastro ou login pelo Supabase Auth com a chave anônima. Confirmação de e-mail desligada (D16) |
| Resgate | `redeem_invite` numa transação: revalida tudo, cria membership, marca usado, audita |
| Revogação | `revoked_at` preenchido pelo admin; o link morre imediatamente |

Validade padrão: 7 dias. Vínculo com e-mail é opcional por convite.

### Sessão

Cookies `httpOnly`, `Secure`, `SameSite=Lax`, **host-only** (D19), com nome distinto por território (D20), gerenciados pelo `@supabase/ssr`. Rotação de refresh token é nativa do Supabase.

O parâmetro de retorno pós-login aceita somente caminho interno — validado por Zod: começa com `/`, não começa com `//` nem `\`. Qualquer outra coisa cai no destino padrão do território.

## 10. Mídia e storage

Dois buckets, ambos com leitura pública e escrita restrita:

| Bucket | Tamanho máximo | MIME aceitos |
|---|---|---|
| `menu-images` | 5 MB | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| `menu-videos` | 10 MB | `video/mp4`, `video/webm` |

Limites são configuração do bucket, aplicada pelo Supabase no servidor — não dependem de código nosso (D14).

**Convenção de caminho:** `{restaurant_id}/{item_id}/{uuid}.{ext}`. A política de storage autoriza escrita apenas se `(storage.foldername(name))[1]::uuid` for restaurante do qual a pessoa é membro. **O prefixo do caminho é a fronteira do inquilino**, verificada pelo banco.

**Fluxo de upload:** o navegador envia direto ao Storage com a sessão do usuário, no território `painel` (RLS de storage ativa); em seguida uma server action registra o caminho em `menu_item_media`, revalidando o prefixo. O arquivo não passa pela memória do servidor Next.

**Limitações registradas:** duração de vídeo não é verificável no servidor sem transcodificação — validada no navegador, com o risco aceito de um dono subir 10 MB de vídeo longo no próprio cardápio. Upload interrompido antes do registro deixa arquivo órfão; deletar o item remove suas mídias, mas a limpeza de órfãos fica para uma rotina futura.

A camada de storage fica atrás de interface própria em `dal/media.ts`, para que trocar por Mux ou Cloudflare Stream depois não toque no resto do código.

## 11. Segurança operacional

| Ataque | Onde é fechado |
|---|---|
| SQL injection | PostgREST parametriza tudo; nenhuma SQL montada por concatenação. Funções usam parâmetros tipados e `search_path` travado |
| XSS | React escapa por padrão; `dangerouslySetInnerHTML` proibido em conteúdo de usuário. Descrição de item é texto puro, sem HTML nem markdown (D15) |
| XSS alcançando sessão privilegiada | Mesmo uma falha no cardápio público não alcança cookie de admin: ele é host-only em outro subdomínio (D19) |
| CSRF | Server Actions são POST-only e o Next compara `Origin` com `Host`, com `serverActions.allowedOrigins` declarando os três hosts. Cookies `SameSite=Lax` |
| IDOR | Toda função da DAL verifica posse do recurso, não apenas autenticação. A FK composta torna referência cruzada impossível no banco (D9) |
| Sequestro de sessão | `httpOnly`, `Secure`, `SameSite=Lax`, host-only, rotação de refresh token, headers anti-cache do `setAll` |
| Clickjacking | `frame-ancestors 'none'` |
| Open redirect | Retorno pós-login restrito a caminho interno, validado por Zod |
| Enumeração de convite | Token de 256 bits, rate limit por IP, resposta idêntica para inválido, expirado e revogado |
| Enumeração de plaquinha | `menu_tags` sem política para anônimo; resolução só via `resolve_menu_tag` |
| Força bruta de login | Rate limit próprio somado ao do Supabase Auth |
| Acesso ao território privado pelo host público | Proxy devolve 404 (D21) |

### Rate limit

Janela fixa em Postgres via `check_rate_limit`. Identificador: IP para anônimo, id do usuário para autenticado.

| Bucket | Limite |
|---|---|
| `invite:preview` | 10 por minuto por IP |
| `invite:redeem` | 5 por minuto e 20 por hora por IP |
| `auth:login` | 10 por minuto por IP |
| `tag:resolve` | 60 por minuto por IP |
| `mutation` | 60 por minuto por usuário |

**Ressalva para o deploy:** `x-forwarded-for` é falsificável se não vier de proxy confiável. Local é irrelevante; ao hospedar, o IP precisa sair do header que a plataforma garante. Item obrigatório da checagem de publicação.

### Cabeçalhos

Definidos em `next.config.ts`: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` restritiva e uma CSP base. CSP estrita com nonce fica para a Fase 3, quando existir HTML público de fato.

## 12. Estrutura e fronteiras

```
src/
  proxy.ts
  app/
    (site)/page.tsx                 raiz institucional
    (site)/[slug]/page.tsx          cardápio público
    (site)/t/[token]/route.ts       resolve plaquinha e redireciona
    admin/                          território do administrador
    painel/                         território do restaurante
  server/                           todo arquivo importa 'server-only'
    dal/_client.ts                  único lugar que cria cliente Supabase
    dal/{auth,restaurants,menu,invites,tags,media}.ts
    actions/
    security/{rate-limit,tokens,audit,client-ip}.ts
    territory.ts                    derivação de território a partir do Host
    env.ts
  domain/                           schemas Zod, tipos e DTOs, sem I/O
  components/ui/                    shadcn, já instalado
  hooks/
  lib/
supabase/
  config.toml
  migrations/
  seed/bootstrap-admin.sql
```

**Regra de dependência: as setas só apontam para dentro.** `app/` não conhece Supabase; conhece `server/actions` e `server/dal`. `domain/` não conhece nada.

**A fronteira é regra de lint, não combinado.** `no-restricted-imports` no ESLint proíbe importar `@supabase/*` fora de `src/server/dal/_client.ts`, e proíbe importar `src/server/**` a partir de componente cliente. Violar vira erro de build, não incidente em produção.

A regra vale **sem exceção, inclusive para o `proxy.ts`**, que obtém seu cliente através de `createProxyClient` exportado por `_client.ts`. Abrir uma exceção no lint para o proxy — o arquivo que os próprios docs do Next apontam como o de maior poder e que mais merece auditoria — inverteria o propósito da regra.

### Ambiente

`src/server/env.ts` valida com Zod no boot; variável faltando derruba a subida em vez de virar `undefined` silencioso.

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública por design — quem protege é a RLS |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Domínio raiz. Os três territórios são derivados dele, nunca escritos no código |

`SUPABASE_SERVICE_ROLE_KEY` **não aparece nesta lista** e não entra no `.env` da aplicação (D6).

Observação de sintaxe: Zod 4 usa `z.email()` no nível superior e `{ error: ... }` para mensagem — não a forma `z.string().email({ message })` do Zod 3.

## 13. Dívidas registradas

| Dívida | Consequência | Quando vence |
|---|---|---|
| Sem SMTP | Não existe "esqueci minha senha"; recuperação é o admin emitir novo convite | Quando passar de ~10 restaurantes |
| Sem testes automatizados | Isolamento entre inquilinos não tem alarme quando uma política mudar. As garantias estruturais (FK composta, RLS deny-by-default) seguem valendo | A critério do cliente |
| Duração de vídeo não verificada no servidor | Dono pode subir vídeo longo de baixa qualidade no próprio cardápio | Quando entrar serviço de vídeo dedicado |
| Órfãos de upload interrompido | Acúmulo lento no storage | Quando o volume justificar rotina de limpeza |
| IP confiável | `x-forwarded-for` falsificável sem proxy confiável | Obrigatório resolver na publicação |
| Sem cache entre requisições | Cada acesso ao cardápio consulta o Supabase | Quando o volume justificar; a DAL já é a fronteira de cache |
| Dois logins para quem for admin e dono | Consequência aceita do isolamento de sessão (D19) | Não vence; é o preço da barreira |

## 14. O que a Fase 0 deixa pronto para depois

- **Pedido e comunicação com o estabelecimento:** item tem identidade estável e a plaquinha já carrega contexto de mesa em `label`. Pedido vira tabela nova apontando para o que já existe — não é remodelagem.
- **Equipe e franquia:** `memberships` já é N↔N e `manager` já existe no enum. Falta apenas política e interface.
- **Cache:** a DAL é a fronteira. Cachear é mudar funções, não a aplicação.
- **Vídeo em serviço dedicado:** `dal/media.ts` é a interface; trocar o provedor não toca no resto.
- **Novo território:** a derivação de território vive em um módulo só. Um quarto subdomínio é uma entrada a mais nesse mapa.
