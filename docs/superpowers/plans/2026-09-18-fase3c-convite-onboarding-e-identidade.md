# Fase 3C — Convite, onboarding e identidade: plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** tirar da plataforma a criação de restaurante. O administrador emite um convite e nada mais; quem recebe cria a conta, cria o restaurante com endereço derivado do nome, escolhe tema e cores, e monta a própria equipe.

**Arquitetura:** a tabela `invites` ganha `restaurant_id` anulável, e o nulo significa "convite de plataforma". Resgatar um convite desses cria o restaurante **dentro** de uma função do banco, numa transação — a política de INSERT em `restaurants` continua fechada para todo mundo. Ninguém ganha o direito de criar restaurante; ganha o direito de resgatar um convite.

**Pilha:** Postgres/Supabase, Next 16.3.5 (App Router), React 19.2.8, Tailwind v4, shadcn sobre Base UI, Zod 4.

**Spec:** `docs/superpowers/specs/2026-09-18-fase3-onboarding-papeis-e-visual-design.md`

**Este plano é o terceiro de três.** Executar **depois** do 3A (que dá `PageHeader`, `IconField`, `Reveal` e o sistema de temas) e do 3B (que dá `member_role`, `is_restaurant_admin` e `requireRestaurantAdmin`). Sem os dois, nada aqui compila.

## Estado da execução — 2026-09-18

**Código completo. Falta a Tarefa 9, que é verificação e depende de contas.**

`pnpm exec tsc --noEmit` e `pnpm build` limpos, com dezesseis rotas.

| Tarefa | Situação |
|---|---|
| 1 — Migração dos convites | **Escrita e aplicada.** Provas de idempotência no Docker não rodaram (Docker parado) |
| 2 — Segmento e endereço | **Escrita e aplicada.** Idem |
| 3 — O endereço derivado do nome | **Concluída e provada.** Catorze asserções do endereço, treze do segmento, **60 segmentos sem repetição** |
| 4 — A DAL dos dois convites | **Concluída.** `createPlatformInvite`, `createTeamInvite`, `insertInvite` compartilhada, `previewInvite` com `kind`, `redeemPlatformInvite`, `checkSlug`, `suggestSlug`, `updateIdentity` |
| 5 — O console vira convites | **Concluída.** `/` é a lista de convites, `/restaurantes` é a lista movida, navegação entre as duas. `create-restaurant-dialog`, `invite-dialog` e `team-section` apagados |
| 6 — O convite e o assistente | **Concluída.** A página do convite ramifica por tipo; `CreateRestaurantStep` com endereço ao vivo; `/comecar` com os passos 2 e 3, ambos puláveis |
| 7 — Identidade | **Concluída.** Seletor dos oito temas, duas cores com faixa e contraste conferidos na hora, densidade, e **pré-visualização ao vivo** num celular |
| 8 — Equipe | **Concluída.** Lista com troca de papel que reverte em caso de falha, remoção com confirmação, convites pendentes |
| 9 — Verificação de ponta a ponta | **Não feita.** Exige contas e o SQL Editor |

### Desvios declarados

- **`src/domain/segment.ts` é derivado dos presets**, não escrito à mão. Elimina a chance de um segmento apontar para um tema que não existe, e faz o nono tema já trazer os segmentos dele junto.
- **Um diálogo de convite, não dois.** `src/components/convites/invite-dialog.tsx` serve plataforma e equipe, discriminado por `mode`. Eles diferem em um campo — o papel —, e duplicar a tela criaria dois lugares para o aviso "o link aparece uma vez só", sendo que um deles ficaria desatualizado.
- **`theme.css` mudou de lugar**, de `src/app/(site)/[slug]/` para `src/components/cardapio-publico/`. A pré-visualização do painel precisa das **mesmas** regras do cardápio real; duas cópias divergiriam, e uma pré-visualização que mente é pior que nenhuma.
- **O `IdentityForm` do console virou `ProfileForm` no painel.** Editar nome, descrição e contato deixou de ser da plataforma. O console guardou só endereço e situação.
- **A navegação do painel vive num layout aninhado** em `restaurantes/[id]/`, que já conhece o id, e some no `/comecar` — durante o onboarding, uma aba "Equipe" é ruído.

### Auditoria contra a spec, depois das nove tarefas

Uma varredura procurando o que a spec prometia e o código não entregava achou quatro coisas. As quatro foram corrigidas.

1. **As políticas de `storage.objects` continuavam com `is_member`.** O `0011` fechou as quatro tabelas do cardápio e as plaquinhas, e esqueceu do storage. Pela interface estava fechado — `createUploadTicket` exige administrador e sem ticket não sai URL assinada —, mas garçom, caixa e atendente têm JWT `authenticated` válido e podiam falar com o storage direto. Uma RLS mais frouxa que a DAL inverte o desenho de três camadas: a última linha de defesa vira a mais fraca. Corrigido em **`0014_storage_roles.sql`**. A leitura continua pública, porque o cardápio é público.
2. **Logo e capa nunca eram gravados.** As duas colunas eram lidas pelo `MenuHeader` e **nada em `src/server/` escrevia nelas** — metade da identidade do restaurante estava faltando. Entraram `createBrandUploadTicket`, `setBrandImage` e o componente `BrandImages`. O caminho é `${restaurantId}/brand/${slot}-${uuid}.ext`: o primeiro segmento continua sendo o id, que é o que a `restaurant_id_from_storage_path` lê, então nenhuma política nova foi necessária além da do item 1.
3. **O segmento não aparecia no console.** `RestaurantAdminDTO` não o tinha. Coluna acrescentada.
4. **`createRestaurant` virou código morto** — DAL e action existiam, nenhuma tela chamava. É um endpoint de server action que contradiz a garantia "restaurante só nasce por convite". Removido.

**Duas decisões dentro do item 2**, que valem registro porque são o tipo de coisa que se erra depois:

- **Logo e capa gravam sozinhas, no envio**, sem esperar o botão "Salvar identidade". Enviar arquivo já é confirmação, e amarrá-lo ao botão criaria um estado em que o arquivo está no storage e o banco não sabe dele.
- **A remoção do arquivo antigo vem DEPOIS da gravação**, ao contrário do `deleteItemMedia`, onde vem antes. A ordem é oposta de propósito: lá a linha some junto, e arquivo órfão é o pior estado; aqui a linha continua existindo, e apagar antes deixaria o cardápio apontando para um arquivo inexistente se o update falhasse.

### O que falta, e só você consegue fazer

A Tarefa 9 inteira. Os dois passos que mais importam:

- **Passo 3:** criar um restaurante com um endereço, emitir outro convite e tentar o mesmo endereço. A mensagem deve ser "Este endereço já está em uso" **e recarregar a página do convite deve mostrar o assistente de novo**, não "convite indisponível". Se mostrar indisponível, a transação da função não está desfazendo o resgate, e cada erro de digitação queima um convite.
- **Passo 6:** envelhecer um convite **já resgatado** e confirmar que quem o resgatou continua entrando. É a promessa central da fase: o prazo é para aceitar, não para usar.

## Restrições globais

Idênticas às dos planos 3A e 3B. Repetidas porque quem executa pode estar lendo só este arquivo.

- **Nada de git.** Nenhum `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **A verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.**
- **Dois bancos, e eles não são o mesmo.** Schema e idempotência se provam no Postgres em Docker, por `psql`. Dado que a aplicação gravou se prova no SQL Editor do projeto na nuvem.
- **Migration avulsa nunca é aplicada.** Escreve-se o arquivo em `supabase/migrations/`, roda-se `bash supabase/build-schema.sh`, e o que vai para qualquer banco é o `supabase/schema.sql` gerado — arquivo único e idempotente, porque o SQL Editor do Supabase não guarda estado de migração. **Consequência que muda como a migração é escrita:** o `schema.sql` reexecuta as migrations anteriores toda vez. Toda guarda de idempotência precisa sobreviver a isso.
- **Composição usa `render`, nunca `asChild`.**
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Toast:** `toast.add({ title, description, type })`.
- **Formulários:** `Field`, `FieldLabel`, `FieldDescription`, `FieldGroup` de `@/components/ui/field`; campo com ícone via `IconField` do plano 3A.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions são a exceção deliberada.
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Diálogo nunca vive dentro de menu suspenso.**
- **Rotas são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`; o proxy reescreve.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **Mensagem única para toda falha de convite.** Token desconhecido, vencido, revogado, já resgatado e de e-mail diferente devolvem exatamente a mesma coisa. Distinguir qualquer uma revela que o convite existe.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0012_invites.sql` | `restaurant_id` anulável, CHECK, RLS, as três funções de convite |
| `supabase/migrations/0013_identity.sql` | Coluna `segment`, `is_slug_available` |
| `src/lib/slug.ts` | Deriva o endereço do nome; palavras reservadas |
| `src/domain/segment.ts` | A lista de segmentos e o tema que cada um sugere |
| `src/domain/invite.ts` | Os dois modos de convite nos schemas |
| `src/domain/restaurant.ts` | Schema de criação por convite e de identidade |
| `src/server/dal/invites.ts` | Emitir nos dois modos; `redeemPlatformInvite` |
| `src/server/dal/restaurants.ts` | `updateIdentity`, `checkSlug` |
| `src/server/actions/*` | As ações finas correspondentes |
| `src/app/admin/page.tsx` | O console vira lista de convites |
| `src/app/admin/restaurantes/page.tsx` | A lista de restaurantes, movida |
| `src/app/painel/convite/[token]/page.tsx` | Preview, conta e o passo do nome |
| `src/app/painel/restaurantes/[id]/comecar/page.tsx` | Passos 2 e 3 do assistente |
| `src/app/painel/restaurantes/[id]/identidade/page.tsx` | Tema, cores, logo, capa, segmento |
| `src/app/painel/restaurantes/[id]/equipe/page.tsx` | Equipe e convites internos |
| `src/components/onboarding/*` | Nome e endereço, escolha de tema, seletor de cor |
| `src/components/painel/theme-preview.tsx` | O celular de pré-visualização |

---

## Tarefa 1: A migração dos convites

**Arquivos:**
- Criar: `supabase/migrations/0012_invites.sql`
- Ler antes: `supabase/migrations/0007_privileged.sql`, `supabase/migrations/0011_roles.sql`

**Interfaces:**
- Consome: `public.member_role`, `public.is_restaurant_admin` do plano 3B.
- Produz: `preview_invite(text)` com a forma nova, `redeem_invite(text)` restrita, `redeem_platform_invite(text, text, text)`. As Tarefas 4 e 6 consomem.

- [ ] **Passo 1: Escrever a migração**

`supabase/migrations/0012_invites.sql`:

```sql
-- =====================================================================
-- 0012 — Convite de plataforma: o restaurante nasce do resgate
--
-- Rode DEPOIS do 0011. Idempotente: pode rodar de novo sem quebrar.
--
-- restaurant_id anulável passa a ter SIGNIFICADO:
--   nulo        -> convite de plataforma. Resgatar CRIA um restaurante.
--   preenchido  -> convite de equipe. Resgatar só insere o vínculo.
--
-- Duas tabelas separadas foram consideradas e recusadas: duplicariam o
-- manejo de token, que é a parte sensível. A diferença real é uma coluna.
-- =====================================================================

alter table public.invites alter column restaurant_id drop not null;

-- Convite sem restaurante SEMPRE cria um administrador. Não existe convite
-- de plataforma que produza garçom: não haveria restaurante para ele servir.
alter table public.invites drop constraint if exists invites_platform_role;
alter table public.invites add constraint invites_platform_role
  check (restaurant_id is not null or role = 'admin');

-- ---------- políticas ----------
-- Repare que a forma simples basta, e por quê: is_restaurant_admin(null)
-- devolve falso, porque `restaurant_id = null` nunca é verdadeiro num
-- EXISTS. Então um administrador de restaurante tentando inserir um convite
-- de plataforma cai em `falso or falso` e é recusado, sem precisar de CASE.
drop policy if exists invites_insert_admin on public.invites;
drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert to authenticated
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists invites_update_admin on public.invites;
drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
  for update to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

-- ---------- preview: agora diz de que TIPO é o convite ----------
-- Continua devolvendo ZERO linhas para token desconhecido, vencido,
-- revogado OU já usado. As quatro situações são indistinguíveis de fora, o
-- que impede descobrir que um convite existe.
--
-- left join porque convite de plataforma não tem restaurante: com join
-- interno ele sumiria do resultado e a tela diria "convite inválido" para
-- um convite perfeitamente bom.
drop function if exists public.preview_invite(text);
create function public.preview_invite(p_token text)
returns table (
  invite_kind text,
  restaurant_name text,
  invite_role public.member_role
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    case when i.restaurant_id is null then 'platform' else 'team' end,
    r.name,
    i.role
  from public.invites i
  left join public.restaurants r on r.id = i.restaurant_id
  where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and i.expires_at > now()
    and i.redeemed_at is null
    and i.revoked_at is null;
$fn$;

-- ---------- resgate de equipe: agora EXIGE restaurante ----------
-- Sem esta linha, um convite de plataforma resgatado por aqui marcaria o
-- convite como usado e não criaria restaurante nenhum — queimando o convite
-- e deixando a pessoa sem nada.
drop function if exists public.redeem_invite(text);
create function public.redeem_invite(p_token text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invite public.invites%rowtype;
begin
  if v_uid is null then
    raise exception 'convite inválido' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  -- A corrida entre dois cliques simultâneos no mesmo link é resolvida
  -- aqui pelo próprio Postgres: só uma transação encontra redeemed_at ainda
  -- nulo. Sem lock na aplicação, sem janela entre checar e gravar.
  update public.invites i
     set redeemed_at = now(),
         redeemed_by = v_uid
   where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
     and i.expires_at > now()
     and i.redeemed_at is null
     and i.revoked_at is null
     and i.restaurant_id is not null
     and (i.email is null or lower(i.email) = lower(v_email))
  returning i.* into v_invite;

  if not found then
    raise exception 'convite inválido' using errcode = '42501';
  end if;

  insert into public.memberships (restaurant_id, user_id, role)
  values (v_invite.restaurant_id, v_uid, v_invite.role)
  on conflict (restaurant_id, user_id) do nothing;

  perform public.record_audit(
    'invite.redeemed', 'invite', v_invite.id, v_invite.restaurant_id,
    jsonb_build_object('kind', 'team', 'role', v_invite.role)
  );

  return v_invite.restaurant_id;
end;
$fn$;

-- ---------- resgate de plataforma: cria o restaurante ----------
-- Esta função é o coração da fase. Ela roda com privilégio elevado, o que
-- significa que o INSERT em restaurants passa mesmo com a política
-- restaurants_insert_admin fechada. É deliberado: a política continua
-- negando para TODO mundo, e o único caminho que cria restaurante é este.
-- Ninguém ganha o direito de criar; ganha o direito de resgatar.
drop function if exists public.redeem_platform_invite(text, text, text);
create function public.redeem_platform_invite(
  p_token text,
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invite public.invites%rowtype;
  v_restaurant_id uuid;
begin
  if v_uid is null then
    raise exception 'convite inválido' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  update public.invites i
     set redeemed_at = now(),
         redeemed_by = v_uid
   where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
     and i.expires_at > now()
     and i.redeemed_at is null
     and i.revoked_at is null
     and i.restaurant_id is null
     and (i.email is null or lower(i.email) = lower(v_email))
  returning i.* into v_invite;

  if not found then
    raise exception 'convite inválido' using errcode = '42501';
  end if;

  begin
    insert into public.restaurants (slug, name, status, created_by)
    values (p_slug, p_name, 'draft', v_uid)
    returning id into v_restaurant_id;
  exception
    when unique_violation then
      -- Erro DISTINTO do opaco acima, e isso é seguro: quem chegou até aqui
      -- já provou ter um convite válido, então "endereço em uso" não revela
      -- nada a quem estivesse sondando. E como a exceção desfaz a transação
      -- inteira, o resgate volta atrás junto: o convite CONTINUA VALENDO e a
      -- pessoa tenta outro nome.
      raise exception 'Este endereço já está em uso.' using errcode = 'P0001';
    when check_violation then
      raise exception 'Este endereço não é permitido.' using errcode = 'P0001';
  end;

  insert into public.memberships (restaurant_id, user_id, role)
  values (v_restaurant_id, v_uid, 'admin');

  perform public.record_audit(
    'invite.redeemed', 'invite', v_invite.id, v_restaurant_id,
    jsonb_build_object('kind', 'platform')
  );
  perform public.record_audit(
    'restaurant.created', 'restaurant', v_restaurant_id, v_restaurant_id,
    jsonb_build_object('slug', p_slug)
  );

  return v_restaurant_id;
end;
$fn$;

grant execute on function public.preview_invite(text) to anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.redeem_platform_invite(text, text, text) to authenticated;
```

- [ ] **Passo 2: Gerar o schema e provar a idempotência**

Este projeto **não aplica migration avulsa**: `supabase/build-schema.sh` concatena as migrations numeradas num `supabase/schema.sql` único e idempotente, e é esse arquivo que vai para o banco.

```bash
bash supabase/build-schema.sh
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres < supabase/schema.sql
```

Rodar o segundo comando duas vezes. Esperado: nenhum erro nas duas.

Conferir também que a segunda passagem não desfez o `drop not null`:

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "
select is_nullable from information_schema.columns
 where table_schema='public' and table_name='invites' and column_name='restaurant_id';"
```

Esperado: `YES`. O `0003` cria a tabela com `not null`, mas só com `create table if not exists` — numa segunda passagem a tabela já existe e a definição original não é reaplicada, então o `drop not null` do `0012` prevalece. Se vier `NO`, alguma coisa está recriando a tabela e há um problema maior que este plano.

- [ ] **Passo 3: Provar o CHECK nos dois sentidos**

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "
begin;
  insert into public.invites (restaurant_id, role, token_hash, created_by, expires_at)
  values (null, 'waiter', sha256(convert_to('x','UTF8')), (select id from public.profiles limit 1), now() + interval '1 day');
rollback;"
```

Esperado: **erro** de violação de `invites_platform_role`. Convite sem restaurante não pode ser de garçom.

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "
begin;
  insert into public.invites (restaurant_id, role, token_hash, created_by, expires_at)
  values (null, 'admin', sha256(convert_to('y','UTF8')), (select id from public.profiles limit 1), now() + interval '1 day');
rollback;"
```

Esperado: **sucesso**. Um CHECK que só recusa não prova nada; precisa aceitar o caso bom.

- [ ] **Passo 4: Aplicar no projeto na nuvem**

Colar **`supabase/schema.sql`** — o gerado no passo 2, não a migration avulsa — no SQL Editor do projeto na nuvem e executar. Esperado: sucesso.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 2: Segmento e disponibilidade de endereço

**Arquivos:**
- Criar: `supabase/migrations/0013_identity.sql`

**Interfaces:**
- Produz: coluna `restaurants.segment`; função `public.is_slug_available(text)`. As Tarefas 3 e 7 consomem.

- [ ] **Passo 1: Escrever a migração**

`supabase/migrations/0013_identity.sql`:

```sql
-- =====================================================================
-- 0013 — Segmento do restaurante e disponibilidade de endereço
--
-- Rode DEPOIS do 0012. Idempotente.
-- =====================================================================

alter table public.restaurants add column if not exists segment text;

alter table public.restaurants drop constraint if exists restaurants_segment_length;
alter table public.restaurants add constraint restaurants_segment_length
  check (segment is null or char_length(segment) between 2 and 60);

-- O assistente precisa dizer "este endereço está livre" enquanto a pessoa
-- digita, e ela ainda não é membro de nada — a política de SELECT em
-- restaurants só a deixaria ver os ativos. Daí SECURITY DEFINER.
--
-- Isto é um oráculo de existência, e é aceitável: o endereço é uma URL
-- pública, e visitá-la já responde a mesma pergunta. O limite de tentativas
-- fica na DAL, no balde que a Fase 0 já definiu.
--
-- Devolve falso também para endereço que o CHECK recusaria, para a tela
-- nunca dizer "livre" sobre algo que o banco vai rejeitar no fim.
drop function if exists public.is_slug_available(text);
create function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    p_slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$'
    and p_slug not in (
      'admin', 'painel', 'api', 't', 'entrar', 'convite',
      'assets', 'static', 'public', 'favicon', 'robots', 'sitemap'
    )
    and not exists (select 1 from public.restaurants r where r.slug = p_slug);
$fn$;

grant execute on function public.is_slug_available(text) to authenticated;
```

- [ ] **Passo 2: Provar**

```bash
bash supabase/build-schema.sh
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres < supabase/schema.sql
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "
select
  public.is_slug_available('cantina-do-ze') as livre,
  public.is_slug_available('admin')         as reservado,
  public.is_slug_available('ab')            as curto,
  public.is_slug_available('Maiuscula')     as maiuscula;"
```

Esperado, exatamente: `livre = t`, `reservado = f`, `curto = f`, `maiuscula = f`.

Rodar o `schema.sql` de novo. Esperado: nenhum erro.

- [ ] **Passo 3: Aplicar no projeto na nuvem**

Colar `supabase/schema.sql` no SQL Editor do projeto na nuvem e executar.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 3: O endereço derivado do nome

**Arquivos:**
- Criar: `src/lib/slug.ts`
- Criar: `src/domain/segment.ts`

**Interfaces:**
- Consome: `THEME_PRESET_IDS` do plano 3A.
- Produz: `slugify(nome)`, `RESERVED_SLUGS`, `SEGMENTS`, `suggestPresetFor(segmento)`. As Tarefas 4, 6 e 7 consomem.

- [ ] **Passo 1: O gerador**

`src/lib/slug.ts`:

```ts
// Roda no servidor E no navegador: o assistente mostra o endereço enquanto
// a pessoa digita, e o servidor valida de novo antes de gravar. As duas
// pontas usam ESTA função, para não existir a chance de discordarem.

// A mesma lista do CHECK restaurants_slug_not_reserved, no 0003. Se uma
// mudar, a outra precisa mudar junto.
export const RESERVED_SLUGS = new Set([
  'admin', 'painel', 'api', 't', 'entrar', 'convite',
  'assets', 'static', 'public', 'favicon', 'robots', 'sitemap',
])

export function slugify(name: string): string {
  let base = name
    // NFD separa a letra do acento; o intervalo abaixo remove os acentos e
    // deixa a letra. É assim que "Zé" vira "ze" sem tabela de substituição.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // O `+` já colapsa repetições: "Bar   &   Grill" vira "bar-grill", não
    // "bar---grill".
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  // O CHECK no banco permite 50 caracteres e exige terminar em alfanumérico.
  if (base.length > 50) base = base.slice(0, 50).replace(/-+$/, '')

  // E exige no mínimo 3. "Zé" sozinho não passaria.
  if (base.length < 3) base = base.length > 0 ? `${base}-menu` : 'restaurante'

  // Um restaurante chamado "Admin" não pode virar o endereço do console.
  if (RESERVED_SLUGS.has(base)) base = `${base}-1`

  return base
}

// Usada quando o endereço derivado já existe. Sufixa e devolve o candidato
// seguinte, respeitando o teto de 50 caracteres.
export function nextSlugCandidate(slug: string, attempt: number): string {
  const suffix = `-${attempt}`
  const room = 50 - suffix.length
  return `${slug.slice(0, room).replace(/-+$/, '')}${suffix}`
}
```

- [ ] **Passo 2: Provar o gerador**

Rodar, pelo mesmo caminho usado nas provas do plano 3A:

```ts
import { slugify } from './src/lib/slug.ts'

const casos: [string, string][] = [
  ['Cantina do Zé', 'cantina-do-ze'],
  ['Bar   &   Grill', 'bar-grill'],
  ['Açaí & Cia.', 'acai-cia'],
  ['Zé', 'ze-menu'],
  ['Admin', 'admin-1'],
  ['---', 'restaurante'],
  ['Pão de Açúcar Restaurante e Casa de Massas Artesanais do Centro', 'pao-de-acucar-restaurante-e-casa-de-massas-artesa'],
]

let falhou = false
for (const [entrada, esperado] of casos) {
  const obtido = slugify(entrada)
  const ok = obtido === esperado
  if (!ok) falhou = true
  console.log(ok ? 'ok ' : 'ERRO', JSON.stringify(entrada), '->', obtido, ok ? '' : `(esperado ${esperado})`)
}
console.log(falhou ? 'HÁ FALHAS' : 'todos passam')
```

Esperado: sete `ok` e `todos passam`. **O último caso é o que importa mais:** ele prova que o corte em 50 não deixa hífen no fim, que é exatamente o que o CHECK do banco recusaria.

- [ ] **Passo 3: A lista de segmentos**

`src/domain/segment.ts`:

```ts
import type { ThemePresetId } from '@/domain/theme'

// A lista vive no código, e não no banco: ela sugere um tema, e os temas
// também vivem no código. Mantê-las juntas é o que impede um segmento
// apontar para um tema que não existe mais.
export type Segment = { label: string; preset: ThemePresetId }

export const SEGMENTS: readonly Segment[] = [
  // Brasa
  { label: 'Hamburgueria', preset: 'brasa' },
  { label: 'Churrascaria', preset: 'brasa' },
  { label: 'Steakhouse', preset: 'brasa' },
  { label: 'Parrilla', preset: 'brasa' },
  { label: 'Americano', preset: 'brasa' },
  { label: 'Churrasco coreano', preset: 'brasa' },
  { label: 'Fast-food', preset: 'brasa' },
  { label: 'Food truck', preset: 'brasa' },
  { label: 'Dark kitchen', preset: 'brasa' },
  // Forno
  { label: 'Pizzaria', preset: 'forno' },
  { label: 'Cantina italiana', preset: 'forno' },
  { label: 'Casa de massas', preset: 'forno' },
  { label: 'Comida mineira', preset: 'forno' },
  { label: 'Comida nordestina', preset: 'forno' },
  { label: 'Pastelaria', preset: 'forno' },
  { label: 'Tapiocaria', preset: 'forno' },
  { label: 'Rotisserie', preset: 'forno' },
  { label: 'Self-service por quilo', preset: 'forno' },
  { label: 'Buffet e rodízio', preset: 'forno' },
  { label: 'Casual dining', preset: 'forno' },
  { label: 'Mexicano', preset: 'forno' },
  { label: 'Árabe', preset: 'forno' },
  { label: 'Indiano', preset: 'forno' },
  // Grão
  { label: 'Cafeteria', preset: 'grao' },
  { label: 'Padaria artesanal', preset: 'grao' },
  { label: 'Creperia', preset: 'grao' },
  { label: 'Brunch', preset: 'grao' },
  { label: 'Restaurante de hotel', preset: 'grao' },
  // Sal
  { label: 'Alta gastronomia', preset: 'sal' },
  { label: 'Bistrô francês', preset: 'sal' },
  { label: 'Wine bar', preset: 'sal' },
  { label: 'Mediterrâneo', preset: 'sal' },
  { label: 'Peruano', preset: 'sal' },
  { label: 'Cevicheria', preset: 'sal' },
  // Horta
  { label: 'Açaí', preset: 'horta' },
  { label: 'Saladeria', preset: 'horta' },
  { label: 'Casa de sucos', preset: 'horta' },
  { label: 'Vegetariano', preset: 'horta' },
  { label: 'Vegano', preset: 'horta' },
  { label: 'Fit e saudável', preset: 'horta' },
  { label: 'Sem glúten', preset: 'horta' },
  { label: 'Poke', preset: 'horta' },
  { label: 'Kosher', preset: 'horta' },
  { label: 'Halal', preset: 'horta' },
  // Neon
  { label: 'Bar', preset: 'neon' },
  { label: 'Boteco', preset: 'neon' },
  { label: 'Pub', preset: 'neon' },
  { label: 'Gastrobar', preset: 'neon' },
  { label: 'Cachaçaria', preset: 'neon' },
  { label: 'Izakaya', preset: 'neon' },
  // Nori
  { label: 'Japonês', preset: 'nori' },
  { label: 'Chinês', preset: 'nori' },
  { label: 'Tailandês', preset: 'nori' },
  { label: 'Coreano', preset: 'nori' },
  { label: 'Vietnamita', preset: 'nori' },
  // Confeito
  { label: 'Doceria', preset: 'confeito' },
  { label: 'Confeitaria', preset: 'confeito' },
  { label: 'Sorveteria', preset: 'confeito' },
  { label: 'Gelateria', preset: 'confeito' },
  { label: 'Churros', preset: 'confeito' },
]

export function suggestPresetFor(label: string | null): ThemePresetId | null {
  if (!label) return null
  return SEGMENTS.find((segment) => segment.label === label)?.preset ?? null
}
```

- [ ] **Passo 4: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 4: A DAL dos dois convites

**Arquivos:**
- Modificar: `src/domain/invite.ts`
- Modificar: `src/domain/restaurant.ts`
- Modificar: `src/server/dal/invites.ts`
- Modificar: `src/server/dal/restaurants.ts`
- Modificar: `src/server/actions/invites.ts`
- Modificar: `src/server/actions/restaurants.ts`

**Interfaces:**
- Consome: as três funções da Tarefa 1; `is_slug_available` da Tarefa 2; `slugify` e `nextSlugCandidate` da Tarefa 3.
- Produz: `createPlatformInvite`, `createTeamInvite`, `previewInvite` devolvendo `{ kind, restaurantName, role }`, `redeemPlatformInvite`, `checkSlug`, `suggestSlug`, e as actions correspondentes. As Tarefas 5 a 8 consomem.

- [ ] **Passo 1: Os schemas**

Em `src/domain/invite.ts`, substituir `createInviteSchema` por dois:

```ts
// O convite de plataforma não pergunta restaurante nem papel: não existe
// restaurante ainda, e o papel é sempre administrador. O CHECK no banco
// garante o mesmo, de onde a aplicação não alcança.
export const createPlatformInviteSchema = z.object({
  email: z.email({ error: 'E-mail inválido' }).optional(),
  expiresInDays: z.int().min(1).max(30).default(7),
})

export const createTeamInviteSchema = z.object({
  restaurantId: uuidSchema,
  role: memberRoleSchema,
  email: z.email({ error: 'E-mail inválido' }).optional(),
  expiresInDays: z.int().min(1).max(30).default(7),
})

export type InviteKind = 'platform' | 'team'

export type InvitePreviewDTO = {
  kind: InviteKind
  /** Nulo para convite de plataforma: não existe restaurante ainda. */
  restaurantName: string | null
  role: MemberRole
}
```

`InviteDTO` ganha `restaurantId: string | null`.

Em `src/domain/restaurant.ts`:

```ts
export const createFromInviteSchema = z.object({
  token: inviteTokenSchema,
  name: plainTextSchema(120, 2),
  slug: slugSchema,
})

export const updateIdentitySchema = z.object({
  restaurantId: uuidSchema,
  segment: plainTextSchema(60, 2).nullish(),
  theme: themeSchema,
})
```

Importar `inviteTokenSchema` de `./invite` e `themeSchema` de `./theme`.

- [ ] **Passo 2: Emitir os dois tipos**

Em `src/server/dal/invites.ts`, `createInvite` vira duas funções. As duas compartilham o corpo, que continua igual ao de hoje — gerar o token, gravar **só** o hash, montar o link. O que muda é quem autoriza e o que vai na linha:

```ts
export async function createPlatformInvite(input: unknown): Promise<CreatedInviteDTO> {
  const data = createPlatformInviteSchema.parse(input)
  const user = await requirePlatformAdmin()
  return insertInvite({
    restaurantId: null,
    role: 'admin',
    email: data.email ?? null,
    expiresInDays: data.expiresInDays,
    createdBy: user.id,
  })
}

export async function createTeamInvite(input: unknown): Promise<CreatedInviteDTO> {
  const data = createTeamInviteSchema.parse(input)
  // Autorização por POSSE do recurso, não só por estar autenticado. É o que
  // fecha IDOR: saber o id de outro restaurante não basta.
  const user = await requireRestaurantAdmin(data.restaurantId)
  return insertInvite({
    restaurantId: data.restaurantId,
    role: data.role,
    email: data.email ?? null,
    expiresInDays: data.expiresInDays,
    createdBy: user.id,
  })
}
```

`insertInvite` é uma função privada do módulo, com o corpo que `createInvite` tem hoje — incluindo o `recordAudit` e a montagem do link a partir de `originFor('painel', protocol)`. **O link continua sendo devolvido uma única vez**, porque o banco guarda só o hash e não consegue reconstruí-lo.

- [ ] **Passo 3: O preview com o tipo**

Em `previewInvite`, o retorno passa a ler três colunas:

```ts
  return {
    kind: data[0].invite_kind as InviteKind,
    restaurantName: data[0].restaurant_name as string | null,
    role: data[0].invite_role as MemberRole,
  }
```

O limite de tentativas **antes** de qualquer consulta continua como está. Sem ele, o endpoint vira um oráculo para adivinhar tokens por força bruta.

- [ ] **Passo 4: O resgate de plataforma**

Ainda em `src/server/dal/invites.ts`:

```ts
export async function redeemPlatformInvite(input: unknown): Promise<string> {
  const data = createFromInviteSchema.parse(input)
  await enforceRateLimit('invite:redeem', await rateLimitIdentity())

  const supabase = await db()
  const { data: restaurantId, error } = await supabase.rpc('redeem_platform_invite', {
    p_token: data.token,
    p_name: data.name,
    p_slug: data.slug,
  })

  if (error) {
    // A função levanta P0001 SÓ para colisão e formato de endereço, depois
    // de já ter confirmado o convite. Repassar esse texto é seguro e é o
    // que permite a pessoa corrigir sozinha. Qualquer outro código vira a
    // mensagem opaca de sempre.
    if (error.code === 'P0001') throw new ConflictError(error.message)
    throw new UserFacingError('Convite inválido')
  }
  if (!restaurantId) throw new UserFacingError('Convite inválido')

  return restaurantId as string
}
```

- [ ] **Passo 5: A disponibilidade do endereço**

Em `src/server/dal/restaurants.ts`:

```ts
export async function checkSlug(candidate: unknown): Promise<boolean> {
  await requireUser()
  // O mesmo balde do preview de convite: este endpoint é chamado a cada
  // tecla digitada, e sem limite ele vira um enumerador barato de endereços.
  await enforceRateLimit('invite:preview', await rateLimitIdentity())

  const parsed = slugSchema.safeParse(candidate)
  if (!parsed.success) return false

  const supabase = await db()
  const { data, error } = await supabase.rpc('is_slug_available', { p_slug: parsed.data })
  return !error && data === true
}

// Deriva do nome e, se já existir, sufixa até achar um livre. O teto de dez
// existe porque onze restaurantes com o mesmo nome é outro problema, e um
// laço sem teto contra o banco é um pedido de negação de serviço.
export async function suggestSlug(name: unknown): Promise<string | null> {
  await requireUser()
  const parsedName = plainTextSchema(120, 2).safeParse(name)
  if (!parsedName.success) return null

  const base = slugify(parsedName.data)
  if (await checkSlug(base)) return base

  for (let attempt = 2; attempt <= 10; attempt += 1) {
    const candidate = nextSlugCandidate(base, attempt)
    if (await checkSlug(candidate)) return candidate
  }
  return null
}
```

- [ ] **Passo 6: A identidade**

Ainda em `src/server/dal/restaurants.ts`:

```ts
export async function updateIdentity(input: unknown): Promise<void> {
  const data = updateIdentitySchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  // A faixa do preset e o contraste são conferidos AQUI, no servidor, e não
  // só no seletor de cor. Um seletor é conveniência; a regra é isto.
  if (data.theme.base && !isBaseInRange(data.theme.preset, data.theme.base)) {
    throw new UserFacingError(
      'Esta cor de fundo não combina com o tema escolhido. Escolha um tom dentro da faixa sugerida.',
    )
  }

  if (data.theme.accent) {
    const preset = PRESETS[data.theme.preset]
    const base = data.theme.base ?? preset.light.base
    // 3:1 é o piso do WCAG para texto grande e elemento de interface, que é
    // onde o destaque aparece: preço, rótulo de categoria, botão.
    if (contrastRatio(base, data.theme.accent) < 3) {
      throw new UserFacingError(
        'Esta cor de destaque não contrasta o suficiente com o fundo. Escolha um tom mais escuro ou mais claro.',
      )
    }
  }

  const supabase = await db()
  const { error } = await supabase
    .from('restaurants')
    .update({ segment: data.segment ?? null, theme: data.theme })
    .eq('id', data.restaurantId)

  if (error) throw new Error(`Não foi possível salvar: ${error.message}`)

  await recordAudit({
    action: 'restaurant.identity_updated',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
    metadata: { preset: data.theme.preset, segment: data.segment ?? null },
  })
}
```

`getRestaurantForMember` passa a trazer `segment` e `theme` no `select` e no DTO. `RestaurantMemberDTO` ganha `segment: string | null` e `theme: unknown`.

- [ ] **Passo 7: As actions**

Em `src/server/actions/invites.ts` e `src/server/actions/restaurants.ts`, no formato fino das que já existem — `runAction`, `revalidatePath('/')`, nada de lógica:

`createPlatformInviteAction`, `createTeamInviteAction`, `redeemPlatformInviteAction` (devolve `{ restaurantId }`), `checkSlugAction`, `suggestSlugAction`, `updateIdentityAction`.

`createInviteAction` deixa de existir. Rodar `grep -rn "createInviteAction" src/` e corrigir o que sobrar.

- [ ] **Passo 8: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 5: O console vira convites

**Arquivos:**
- Substituir: `src/app/admin/page.tsx`
- Criar: `src/app/admin/restaurantes/page.tsx`
- Criar: `src/components/admin/platform-invite-dialog.tsx`
- Criar: `src/components/admin/invite-list.tsx`
- Modificar: `src/app/admin/layout.tsx`
- Apagar: `src/components/admin/create-restaurant-dialog.tsx`
- Apagar: `src/components/admin/slug-form.tsx`

**Interfaces:**
- Consome: `createPlatformInviteAction`, `revokeInviteAction`, `listPlatformInvites` da Tarefa 4; `PageHeader` do plano 3A.
- Produz: nada que outra tarefa consuma.

- [ ] **Passo 1: Listar convites de plataforma na DAL**

Em `src/server/dal/invites.ts`:

```ts
export async function listPlatformInvites(): Promise<InviteDTO[]> {
  await requirePlatformAdmin()

  const supabase = await db()
  const { data, error } = await supabase
    .from('invites')
    // token_hash NUNCA é selecionado. Não há uso legítimo para ele fora das
    // funções do banco.
    .select('id, role, email, expires_at, redeemed_at, revoked_at, restaurant_id')
    .is('restaurant_id', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Não foi possível listar convites: ${error.message}`)
  return (data ?? []).map(toInviteDTO)
}
```

`toInviteDTO` é a função de mapeamento que `listInvites` já usa hoje, extraída para ser compartilhada. `listInvites(restaurantId)` continua existindo, agora filtrando `.eq('restaurant_id', id)`, e serve a Tarefa 8.

- [ ] **Passo 2: A situação do convite, derivada**

Criar, em `src/domain/invite.ts`:

```ts
export type InviteStatus = 'pendente' | 'resgatado' | 'revogado' | 'vencido'

// Derivada, e não gravada: uma coluna de situação precisaria de um job para
// virar 'vencido' na hora certa, e ficaria mentindo entre uma execução e a
// próxima.
export function inviteStatus(invite: InviteDTO, now = new Date()): InviteStatus {
  if (invite.redeemedAt) return 'resgatado'
  if (invite.revokedAt) return 'revogado'
  if (new Date(invite.expiresAt) <= now) return 'vencido'
  return 'pendente'
}
```

- [ ] **Passo 3: A navegação do console**

Em `src/app/admin/layout.tsx`, abaixo da `TopBar`, uma faixa de navegação com dois caminhos **externos**: `/` para Convites e `/restaurantes` para Restaurantes. Usar `usePathname` num componente de cliente mínimo para marcar o ativo, seguindo o padrão dos demais componentes de cliente do projeto.

- [ ] **Passo 4: A tela de convites**

`src/app/admin/page.tsx` passa a ser a lista de convites de plataforma: `PageHeader` com "Convites" e o botão de emitir; tabela com e-mail amarrado (ou "qualquer e-mail"), situação, validade e quem resgatou; vazio com a ação junto, no padrão que a tela de restaurantes usa hoje.

O `platform-invite-dialog.tsx` é o `invite-dialog.tsx` de hoje **sem** o campo de papel e **sem** `restaurantId`, com dois ajustes de texto:

- O rótulo "Validade em dias" vira **"Prazo para aceitar"**, com a descrição: *"Depois desse prazo o link para de funcionar e você emite outro. Quem aceitar dentro do prazo não perde o acesso depois."* Esse texto existe porque "validade" hoje soa como assinatura, e é a dúvida que motivou a fase.
- O aviso de que o link aparece uma vez só continua igual: é texto, não só cor, porque quem não distingue o âmbar precisa **ler** que isto é irrecuperável.

- [ ] **Passo 5: Mover a lista de restaurantes**

`src/app/admin/restaurantes/page.tsx` recebe o conteúdo do `admin/page.tsx` de hoje, sem o `CreateRestaurantDialog` — que deixa de existir. A coluna Segmento entra ao lado de Situação.

Apagar `create-restaurant-dialog.tsx` e `slug-form.tsx`. A troca de endereço continua sendo privilégio da plataforma e continua vivendo no detalhe do restaurante, em `admin/restaurantes/[id]/page.tsx`; conferir que aquela página não importa o `slug-form` apagado e, se importar, mover o formulário para dentro dela.

- [ ] **Passo 6: Verificar**

```bash
pnpm exec tsc --noEmit
grep -rn "CreateRestaurantDialog\|createInviteAction" src/
```

Esperado: nenhum erro de tipo, e nenhuma linha no `grep`.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 6: O convite e o assistente de criação

**Arquivos:**
- Substituir: `src/app/painel/convite/[token]/page.tsx`
- Criar: `src/components/onboarding/create-restaurant-step.tsx`
- Criar: `src/app/painel/restaurantes/[id]/comecar/page.tsx`
- Modificar: `src/proxy.ts` (nada muda, mas conferir)

**Interfaces:**
- Consome: `previewInvite`, `redeemPlatformInviteAction`, `suggestSlugAction`, `checkSlugAction` da Tarefa 4; `slugify` da Tarefa 3; `AuthShell` e `IconField` do plano 3A.
- Produz: nada que outra tarefa consuma.

- [ ] **Passo 1: O passo do nome**

`src/components/onboarding/create-restaurant-step.tsx`, componente de cliente. O comportamento que importa:

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RiStore2Line } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { IconField } from '@/components/ui/field-icon'
import { Spinner } from '@/components/ui/spinner'
import { slugify } from '@/lib/slug'
import { checkSlugAction } from '@/server/actions/restaurants'
import { redeemPlatformInviteAction } from '@/server/actions/invites'

export function CreateRestaurantStep({ token }: { token: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tocouSlug, setTocouSlug] = useState(false)
  const [livre, setLivre] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // O endereço acompanha o nome ATÉ a pessoa editá-lo à mão. Depois disso
  // ele é dela: continuar sobrescrevendo apagaria o que ela acabou de
  // escrever, a cada tecla do campo de cima.
  useEffect(() => {
    if (!tocouSlug) setSlug(name.trim().length >= 2 ? slugify(name) : '')
  }, [name, tocouSlug])

  // Conferência com atraso, para não disparar uma chamada por tecla.
  useEffect(() => {
    if (slug.length < 3) {
      setLivre(null)
      return
    }
    setLivre(null)
    const timer = setTimeout(() => {
      // A action vai dentro de startTransition por vir de um efeito, que é o
      // contrato documentado do Next 16.3.5.
      startTransition(async () => {
        const result = await checkSlugAction(slug)
        setLivre(result.ok ? result.data : false)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [slug])

  function submit(formData: FormData) {
    setErro(null)
    startTransition(async () => {
      const result = await redeemPlatformInviteAction({ token, name, slug })
      if (result.ok) {
        // `comecar` são os passos 2 e 3. O restaurante JÁ EXISTE aqui: o que
        // vem depois é edição, e por isso pode ser pulado.
        router.replace(`/restaurantes/${result.data.restaurantId}/comecar`)
      } else {
        setErro(result.error)
      }
    })
  }

  return (
    <form action={submit} className="space-y-6">
      <IconField
        id="nome"
        label="Nome do restaurante"
        icon={<RiStore2Line />}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Cantina do Zé"
        maxLength={120}
        autoFocus
        required
      />

      <div>
        <label htmlFor="slug" className="text-small font-medium">
          Endereço do seu cardápio
        </label>
        <div className="mt-1 flex items-center gap-1 rounded-md border border-input px-3 py-2 text-small">
          <span className="text-muted-foreground">
            {process.env.NEXT_PUBLIC_ROOT_DOMAIN}/
          </span>
          <input
            id="slug"
            value={slug}
            onChange={(event) => {
              setTocouSlug(true)
              setSlug(slugify(event.target.value))
            }}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </div>
        <p className="mt-1 text-small text-muted-foreground" aria-live="polite">
          {slug.length < 3
            ? 'Vai aparecer aqui conforme você digitar o nome.'
            : livre === null
              ? 'Conferindo…'
              : livre
                ? 'Este endereço está livre.'
                : 'Este endereço já está em uso. Tente outro.'}
        </p>
      </div>

      {erro ? (
        <p role="alert" className="text-small text-destructive">{erro}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || livre !== true}>
        {pending ? <Spinner className="size-4" /> : null}
        Criar restaurante
      </Button>
    </form>
  )
}
```

**Nota sobre o endereço depois de criado:** ele congela. A tela do passo seguinte não oferece trocá-lo, e o gatilho no banco recusaria de qualquer forma. Se a pessoa se arrepender, quem muda é a plataforma.

- [ ] **Passo 2: A página do convite, com os dois caminhos**

`src/app/painel/convite/[token]/page.tsx`. A estrutura de hoje se mantém — `previewInvite` já aplica limite de tentativas e já valida o formato, e token desconhecido, vencido, revogado e já usado devolvem todos nulo, que é exatamente o ponto. O que muda é o que aparece depois:

| Situação | O que a tela mostra |
|---|---|
| `invite` nulo | "Convite indisponível", como hoje |
| Sem sessão | Abas Criar conta / Já tenho conta, como hoje, com o texto adaptado ao `kind` |
| Com sessão, `kind = 'platform'` | O `CreateRestaurantStep` |
| Com sessão, `kind = 'team'` | O `AcceptInviteButton` de hoje, com o nome do restaurante |

O texto de apoio muda com o tipo: para plataforma, *"Você foi convidado a criar seu restaurante."*; para equipe, *"Você foi convidado a fazer parte da equipe de {nome}, como {papel}."* Repare no que a tela continua **não** mostrando: quem emitiu, o e-mail amarrado, ou a data.

- [ ] **Passo 3: Os passos 2 e 3**

`src/app/painel/restaurantes/[id]/comecar/page.tsx`. Página de servidor que chama `requireRestaurantAdmin` e monta o assistente em duas etapas, ambas com **Pular** visível:

1. **Identidade** — reaproveita o formulário da Tarefa 7 inteiro.
2. **Contato** — telefone, WhatsApp, Instagram, endereço, via `updateRestaurantProfileAction`, que já existe.

Ao fim, ou ao pular as duas, redireciona para `/restaurantes/{id}`.

O `proxy.ts` **não muda**: `/convite` já está em `PUBLIC_PATHS.painel`, e `/restaurantes/*` já exige sessão, que é o correto para o `comecar`.

- [ ] **Passo 4: Verificar no navegador**

Com `pnpm dev`: emitir um convite pelo console, abrir o link numa janela anônima, criar uma conta, e percorrer até o painel.

Conferir os três pontos que mais quebram:
1. O endereço aparece enquanto o nome é digitado, e **para** de acompanhar depois de editado à mão.
2. "Criar restaurante" fica desabilitado enquanto o endereço não estiver livre.
3. Abrir o **mesmo link** numa segunda aba depois de resgatado mostra "Convite indisponível".

- [ ] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 7: Identidade — tema, cores, logo e capa

**Arquivos:**
- Criar: `src/app/painel/restaurantes/[id]/identidade/page.tsx`
- Criar: `src/components/painel/identity-form.tsx`
- Criar: `src/components/painel/theme-preview.tsx`
- Criar: `src/components/painel/theme-picker.tsx`

**Interfaces:**
- Consome: `updateIdentityAction` da Tarefa 4; `SEGMENTS` e `suggestPresetFor` da Tarefa 3; `resolveTheme`, `PRESETS`, `isBaseInRange`, `contrastRatio` do plano 3A.
- Produz: nada que outra tarefa consuma.

- [ ] **Passo 1: A pré-visualização**

`src/components/painel/theme-preview.tsx`, componente de cliente. Um quadro de celular com um cardápio de mentira — duas categorias, três itens — desenhado com as variáveis que `resolveTheme` produz.

`resolveTheme` roda no navegador sem problema: ela importa `@/lib/color`, `@/lib/theme/presets` e `@/domain/theme`, e nenhum dos três toca `@/server`. **Foi para isto que `color.ts` foi mantido livre de imports de servidor no plano 3A.**

As variáveis entram por `style` no elemento raiz do quadro. A face escura não é pré-visualizada: ela não é escolha do dono, é o padrão do preset, e mostrar duas telas dobraria a interface para uma informação que ele não controla.

- [ ] **Passo 2: A escolha do tema**

`src/components/painel/theme-picker.tsx`: os oito temas como cartões, cada um com o nome, os segmentos que atende e três bolinhas com as cores padrão. O sugerido pelo segmento aparece marcado, com o texto *"Sugerido para {segmento}"* — sugestão, não trava: qualquer um pode ser escolhido.

- [ ] **Passo 3: O formulário**

`src/components/painel/identity-form.tsx`, juntando:

- **Segmento** — um `Combobox` com busca sobre `SEGMENTS`. Ao escolher, se o dono ainda não tiver mexido no tema à mão, o tema sugerido é aplicado.
- **Tema** — o `ThemePicker`.
- **Fundo e destaque** — dois `<input type="color">`. O fundo mostra a faixa do preset e é conferido com `isBaseInRange` **enquanto** se escolhe, com a mensagem na hora. O destaque mostra a razão de contraste calculada e avisa abaixo de 3.
- **Densidade** — dois botões, Confortável e Compacto, com a explicação de que compacto serve a cardápio de centenas de itens.
- **Logo e capa** — reaproveitar o fluxo de envio que `media-editor.tsx` já usa, apontando para `logo_path` e `cover_path`.
- **Restaurar o padrão do tema** — sempre visível, limpando `base` e `accent`.

A conferência no navegador é conveniência. **A regra é o servidor**, em `updateIdentity`, e ela roda de novo lá — como já está escrito na Tarefa 4, passo 6.

- [ ] **Passo 4: A página**

`src/app/painel/restaurantes/[id]/identidade/page.tsx`: página de servidor, `requireRestaurantAdmin`, carrega o restaurante e entrega ao formulário. Em duas colunas no desktop — formulário à esquerda, pré-visualização grudada à direita — e empilhadas no celular, com a pré-visualização em cima.

- [ ] **Passo 5: Verificar no navegador**

Trocar o tema e ver a pré-visualização mudar **sem recarregar**. Escolher um fundo branco no tema Brasa e confirmar que a tela recusa com explicação. Salvar e abrir o cardápio público: precisa estar igual à pré-visualização.

- [ ] **Passo 6: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 8: A equipe

**Arquivos:**
- Criar: `src/app/painel/restaurantes/[id]/equipe/page.tsx`
- Criar: `src/components/painel/team-invite-dialog.tsx`
- Criar: `src/components/painel/member-row.tsx`
- Apagar: `src/components/admin/team-section.tsx` (o equivalente vive no painel agora)
- Modificar antes de apagar: `src/app/admin/restaurantes/[id]/page.tsx`, que hoje importa o `team-section`

**Interfaces:**
- Consome: `listMembers`, `changeMemberRoleAction`, `removeMemberAction` do plano 3B; `createTeamInviteAction`, `listInvites`, `revokeInviteAction` da Tarefa 4; `MEMBER_ROLE_LABELS` do plano 3B.
- Produz: nada que outra tarefa consuma.

- [ ] **Passo 0: Desfazer o import antes de apagar**

O detalhe do restaurante no console, `src/app/admin/restaurantes/[id]/page.tsx`, importa `team-section`. Apagar o componente sem tocar nessa página quebra o build.

A equipe passa a ser assunto do painel, então a seção sai do console: remover o import e o uso. Se você quiser manter uma visão de leitura da equipe no console, ela vira uma tabela simples ali mesmo, sem ações — mas a decisão padrão deste plano é **remover**, porque quem administra a equipe agora é o dono.

Conferir depois:

```bash
grep -rn "team-section\|TeamSection" src/
```

Esperado: nenhuma linha.

- [ ] **Passo 1: A página**

`src/app/painel/restaurantes/[id]/equipe/page.tsx`: `requireRestaurantAdmin`, depois duas seções — **Pessoas** e **Convites pendentes**.

- [ ] **Passo 2: A linha do membro**

`member-row.tsx`: e-mail, nome quando houver, um `Select` de papel com os quatro rótulos de `MEMBER_ROLE_LABELS`, e remover atrás de um `AlertDialog`.

O `AlertDialog` fica como **irmão** do menu, controlado por `open`, nunca dentro dele: diálogo montado dentro de `DropdownMenuContent` some junto com o menu quando o item é selecionado, e nunca chega a aparecer.

Quando a ação devolver a mensagem do único administrador, mostrá-la no toast e **reverter** o `Select` ao valor anterior. Um seletor que fica mostrando o papel novo depois de a gravação ter falhado mente sobre o estado do sistema.

- [ ] **Passo 3: O convite interno**

`team-invite-dialog.tsx`: igual ao de plataforma, mais um `Select` de papel, e explicando que o administrador pode tudo e os demais só leem o cardápio. O mesmo texto de "Prazo para aceitar" da Tarefa 5, passo 4.

- [ ] **Passo 4: O caminho até a equipe**

Acrescentar a navegação do painel — Cardápio, Identidade, Contato, Equipe — na casca do painel, com caminhos **externos** (`/restaurantes/{id}/equipe`, nunca `/painel/...`). Os itens que não são o Cardápio só aparecem para quem é administrador.

- [ ] **Passo 5: Verificar no navegador**

Convidar alguém como garçom, resgatar noutra janela, confirmar que entra em leitura. Promover a administrador e confirmar que os botões aparecem. Tentar rebaixar o único administrador e confirmar a recusa com mensagem clara.

- [ ] **Passo 6: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 9: Verificação de ponta a ponta

Nenhum código novo. Só evidência.

- [ ] **Passo 1: Compilar**

```bash
pnpm build
```

Esperado: build concluído, sem erro.

- [ ] **Passo 2: O ciclo completo, num restaurante novo**

Numa janela anônima, do começo ao fim: emitir convite no console → abrir o link → criar conta → nomear "Cantina do Zé" → conferir que o endereço proposto é `cantina-do-ze` → criar → escolher segmento Pizzaria → conferir que o tema **Forno** vem sugerido → escolher cores → preencher contato → criar categoria e item → publicar → abrir o cardápio público e conferir que está no tema escolhido.

- [ ] **Passo 3: Provar que o convite não é queimado por colisão de endereço**

Criar um restaurante com o endereço `teste-colisao`. Emitir um convite novo, abrir noutra janela, criar conta, e tentar o mesmo endereço.

Esperado: a mensagem "Este endereço já está em uso", e — o que importa — **recarregar a página do convite ainda mostra o assistente**, não "convite indisponível". Se mostrar indisponível, a transação da função não está desfazendo o resgate, e cada erro de digitação queima um convite.

- [ ] **Passo 4: Provar que a criação de restaurante continua fechada**

No SQL Editor do projeto na nuvem, como um usuário comum autenticado:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user id de alguém que NÃO é admin de plataforma>","role":"authenticated"}';

insert into public.restaurants (slug, name) values ('invadido', 'Invadido');
```

Esperado: **erro de política**. Se essa linha entrar, a garantia central da fase caiu: o restaurante deixou de nascer só por convite.

- [ ] **Passo 5: Provar que o convite de equipe não cria restaurante**

```sql
select public.redeem_platform_invite('<token de um convite de EQUIPE>', 'X', 'x-teste');
```

Esperado: `convite inválido`. A função filtra por `restaurant_id is null` e não deve aceitar o outro tipo.

E o inverso:

```sql
select public.redeem_invite('<token de um convite de PLATAFORMA>');
```

Esperado: `convite inválido` também.

- [ ] **Passo 6: Provar que o convite vencido não vale, e que o resgatado continua valendo**

No SQL Editor, envelhecer um convite pendente:

```sql
update public.invites set expires_at = now() - interval '1 day' where id = '<id>';
```

Abrir o link. Esperado: "Convite indisponível".

Depois, envelhecer um convite **já resgatado** da mesma forma e confirmar que **a pessoa que o resgatou continua entrando normalmente**. É a promessa central: o prazo é para aceitar, não para usar.

- [ ] **Passo 7: Percorrer no celular**

O convite, a criação de conta e o assistente inteiro num celular de verdade. É por ali que a maior parte dos donos vai passar.

- [ ] **Passo 8: Relatar**

Listar, para cada passo: o comando rodado, a saída obtida e se corresponde ao esperado. Passo com resultado diferente do esperado é passo **não** concluído — não marcar a caixa.

---

## Cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| §3.1 Convite, `restaurant_id` anulável e CHECK | Tarefa 1 |
| §3.1 Validade é janela para aceitar | Tarefa 5 passo 4 (texto); Tarefa 9 passo 6 (prova) |
| §3.3 Segmento e tema | Tarefas 2, 3 e 7 |
| §5.1 Fluxo do convite de plataforma | Tarefas 5 e 6 |
| §5.2 Fluxo do convite de equipe | Tarefa 8 |
| §6 A criação atômica | Tarefa 1; provada na Tarefa 9 passo 3 |
| §7 O endereço automático | Tarefas 2 e 3 |
| §9.1 Console | Tarefa 5 |
| §9.2 Assistente, identidade, contato, equipe | Tarefas 6, 7 e 8 |
| §11 Endereço em uso; cor sem contraste; convite inválido | Tarefa 4 passos 4 e 6; Tarefa 9 passos 3 e 5 |
| §12 Promoção a administrador de plataforma continua seed manual | Nenhuma tarefa, de propósito |

**Fora deste plano:** todo o §8 é o plano 3A; §3.2 e §4 são o plano 3B.
