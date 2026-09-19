# Fase 3B — Papéis e permissões: plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** trocar os dois papéis de hoje por quatro, e fechar o buraco de que **qualquer membro pode editar o cardápio** — o que é inofensivo enquanto só existe dono e vira brecha real no minuto em que um garçom aceita um convite.

**Arquitetura:** o tipo `membership_role` é substituído por `member_role`, `is_owner` por `is_restaurant_admin`, e as políticas de escrita das quatro tabelas do cardápio passam a exigir administrador. A regra é repetida em três camadas — RLS, DAL e interface — e uma falha em qualquer uma é contida pelas outras.

**Pilha:** Postgres/Supabase, Next 16.3.5, React 19.2.8, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-18-fase3-onboarding-papeis-e-visual-design.md`

**Este plano é o segundo de três.** Executar **depois** do 3A, porque as telas alteradas aqui usam `PageHeader` e `Reveal`, criados lá. O 3C depende deste, porque os convites de equipe carregam papel.

**Desvio declarado da spec:** o gatilho do último administrador sai da migration `0013` e entra na `0011`. É regra de papel, pertence à migração de papéis, e nada no `0013` depende dele.

## Estado da execução — 2026-09-18

**Código completo. Faltam só provas que exigem o SQL Editor ou uma sessão autenticada.**

O cliente aplicou o `schema.sql` no projeto na nuvem. Confirmado por sondagem da API: `is_slug_available`, `my_role`, `is_restaurant_admin` e `redeem_platform_invite` respondem, e `is_owner` devolve `PGRST202` — foi derrubada como devia. `pnpm exec tsc --noEmit` e `pnpm build` limpos.

| Tarefa | Situação |
|---|---|
| 1 — A migração de papéis | **Escrita e aplicada na nuvem.** Passos 3, 3b, 4 e 5 (provas no Docker) **não rodaram**: o Docker Desktop estava parado |
| 2 — A DAL fala de administrador | **Concluída.** Doze escritas do cardápio, três de mídia e uma de plaquinha passaram a exigir administrador; três leituras seguem com `requireMember`. `requireOwner` não existe mais em `src/` |
| 3 — Trocar papel e a trava na aplicação | **Concluída.** `changeMemberRole`, `assertNotLastAdmin` compartilhada com a remoção, e a action |
| 4 — Publicar e despublicar | **Concluída.** `setPublished` recusa cardápio sem item visível e traduz o `42501` do gatilho em mensagem de tela |
| 5 — O painel sabe quem está olhando | **Concluída.** `myRole` na página, `canEdit` descendo para `CategorySection` e `ItemRow` |
| 6 — Verificação de ponta a ponta | **Parcial.** Passo 1 (compilar) feito. Os demais exigem SQL Editor ou sessão autenticada |

### O que ficou para você rodar

Nenhum destes é código — são provas que dependem de acesso que esta sessão não tem.

1. **A prova de isolamento (Tarefa 6, passos 2 e 3).** É a prova que justifica a fase inteira: um garçom tentando escrever precisa afetar **zero linhas**, com a contraprova de que o administrador afeta uma. Sem a contraprova, "zero linhas" pode significar apenas consulta errada.
2. **A trava do último administrador e a do status** (passos 4 e 5).
3. **Percorrer as telas como garçom** (passo 4 da Tarefa 5 e passo 6 da Tarefa 6). Precisa de duas contas, e eu não entro em conta nenhuma.
4. **As provas de idempotência no Docker** (Tarefa 1, passos 3, 3b, 4 e 5). O **3b** é o que mais importa: prova que rodar o `schema.sql` de novo não promove garçom, caixa e atendente a administrador. Essa falha não dá erro — só aparece contando as linhas.

### Também não foi possível verificar no navegador

A troca de guardiões e a faixa de publicação só aparecem para quem tem sessão. Sem entrar em conta, o que deu para provar foi indireto, e está declarado: o cardápio público continua renderizando no tema, e `/convite/{token}` com token inválido devolve "Convite indisponível" — o que prova que a **nova forma do `preview_invite`, do `0012`, funciona contra o código atual**.

## Restrições globais

Idênticas às do plano 3A. Repetidas aqui porque quem executa pode estar lendo só este arquivo.

- **Nada de git.** Nenhum `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **A verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.**
- **Dois bancos, e eles não são o mesmo.** O Postgres em Docker (`supabase_db_nfc-menu`) é **banco de prova**: serve para provar migration idempotente e regra funcionando, e pode ser jogado fora. O app fala com o **projeto na nuvem**, porque `NEXT_PUBLIC_SUPABASE_URL` aponta para lá. Verificação de **schema** roda no Docker, por `psql`. Verificação de **dado que o app gravou** roda no SQL Editor do projeto na nuvem. Rodar a segunda no Docker devolve resposta limpa e sem significado — o pior tipo de verificação, porque parece que passou.
- **Migration avulsa nunca é aplicada.** Escreve-se o arquivo em `supabase/migrations/`, roda-se `bash supabase/build-schema.sh`, e o que vai para qualquer banco é o `supabase/schema.sql` gerado — arquivo único e idempotente, porque o SQL Editor do Supabase não guarda estado de migração. **Consequência que muda como a migração é escrita:** o `schema.sql` reexecuta as migrations anteriores toda vez, inclusive o `0001`, que recria tipos com `if not exists`. Toda guarda de idempotência precisa sobreviver a isso.
- **Composição usa `render`, nunca `asChild`.**
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.**
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Rotas são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0011_roles.sql` | Tipo, conversão, funções, políticas, gatilho |
| `src/domain/invite.ts` | `memberRoleSchema` com os quatro valores e os rótulos |
| `src/server/dal/auth.ts` | `requireRestaurantAdmin` no lugar de `requireOwner`; `myRole` |
| `src/server/dal/menu.ts` | Escrita passa a exigir administrador; leitura continua membro |
| `src/server/dal/media.ts` | Idem |
| `src/server/dal/tags.ts` | Idem |
| `src/server/dal/restaurants.ts` | `updateRestaurantProfile` exige administrador |
| `src/server/dal/members.ts` | `changeMemberRole`; trava do último administrador |
| `src/server/actions/members.ts` | Ação de trocar papel |
| `src/components/painel/publish-bar.tsx` | A faixa de publicação do dono, no painel |
| `src/app/painel/restaurantes/[id]/page.tsx` | Condiciona os botões ao papel |
| `src/components/cardapio/*` | Recebem `canEdit` e escondem o que não cabe |

---

## Tarefa 1: A migração de papéis

A tarefa mais delicada do plano inteiro. O tipo antigo tem dependentes, e derrubar na ordem errada trava a migração no meio, com metade das políticas removidas.

**Arquivos:**
- Criar: `supabase/migrations/0011_roles.sql`
- Ler antes: `supabase/migrations/0006_rls.sql`, `supabase/migrations/0007_privileged.sql`, `supabase/migrations/0009_members.sql`

**Interfaces:**
- Produz: o tipo `public.member_role`; as funções `public.is_restaurant_admin(uuid)` e `public.my_role(uuid)`. As Tarefas 2 a 5 consomem.

- [x] **Passo 1: Copiar os corpos das três funções que serão recriadas**

Antes de escrever qualquer coisa, abrir `0007_privileged.sql` e `0009_members.sql` e copiar os corpos de `preview_invite`, `redeem_invite` e `list_restaurant_members` para um rascunho. A migração vai derrubá-las porque a assinatura delas cita o tipo antigo, e precisa recriá-las **iguais**, trocando só `public.membership_role` por `public.member_role`.

Em `redeem_invite`, há uma comparação com o papel gravado no convite; ela não muda. Em `is_owner`, há `m.role = 'owner'`; na função nova vira `m.role = 'admin'`.

- [x] **Passo 2: Escrever a migração**

`supabase/migrations/0011_roles.sql`:

```sql
-- =====================================================================
-- 0011 — Papéis: quatro em vez de dois, e escrita só do administrador
--
-- Rode DEPOIS do 0010. Idempotente: pode rodar de novo sem quebrar.
--
-- A ORDEM AQUI NÃO É ESTILO, É REQUISITO. O tipo antigo tem dependentes:
-- políticas que chamam is_owner, e três funções cuja assinatura cita
-- membership_role. Derrubar o tipo antes deles falha; derrubar is_owner
-- antes das políticas falha. A sequência é: políticas, funções, tipo.
--
-- Por que tipo novo e não `alter type add value`: Postgres acrescenta valor
-- a enum mas nunca remove. 'owner' e 'manager' ficariam de lixo permanente,
-- e todo CASE no código teria que tratar valores impossíveis para sempre.
-- Com zero restaurantes no ar, converter é barato.
-- =====================================================================

-- ---------- 1. as políticas que citam is_owner ----------
drop policy if exists restaurants_update  on public.restaurants;
drop policy if exists memberships_delete  on public.memberships;
drop policy if exists invites_select      on public.invites;

-- ---------- 2. as funções que citam o tipo antigo ----------
drop function if exists public.is_owner(uuid);
drop function if exists public.preview_invite(text);
drop function if exists public.redeem_invite(text);
drop function if exists public.list_restaurant_members(uuid);

-- ---------- 3. o tipo novo ----------
do $enum$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'member_role' and n.nspname = 'public'
  ) then
    create type public.member_role as enum ('admin', 'cashier', 'attendant', 'waiter');
  end if;
end
$enum$;

-- ---------- 4. a conversão das colunas ----------
-- Esta é a ÚNICA parte não idempotente por natureza, e ela é perigosa por
-- um motivo que não é óbvio: o schema.sql deste projeto concatena TODAS as
-- migrations, e o 0001 recria `membership_role` toda vez que roda. Numa
-- segunda execução do schema completo, o tipo antigo volta a existir — órfão,
-- sem coluna nenhuma usando — e uma condição ingênua do tipo "se o tipo
-- existe, converta" dispararia a conversão de novo.
--
-- Por isso a condição olha a COLUNA, não o tipo: só converte se
-- memberships.role ainda for do tipo antigo. E o ELSE preserva o valor em
-- vez de assumir 'admin'. Sem essas duas linhas, rodar o schema.sql duas
-- vezes promoveria todo garçom, caixa e atendente a administrador, em
-- silêncio, sem erro nenhum na saída.
do $conv$
begin
  if exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    where n.nspname = 'public'
      and c.relname = 'memberships'
      and a.attname = 'role'
      and t.typname = 'membership_role'
  ) then
    -- 'owner' e 'manager' viram ambos 'admin': hoje só existem donos, e
    -- rebaixar alguém numa migração seria tirar acesso sem aviso. O `else`
    -- devolve o valor como está, que é o que torna uma segunda passagem
    -- inofensiva.
    alter table public.memberships
      alter column role type public.member_role
      using (case role::text
               when 'owner'   then 'admin'
               when 'manager' then 'admin'
               else role::text
             end)::public.member_role;

    alter table public.invites
      alter column role type public.member_role
      using (case role::text
               when 'owner'   then 'admin'
               when 'manager' then 'admin'
               else role::text
             end)::public.member_role;
  end if;
end
$conv$;

-- Fora do bloco, e sem condição: varre o tipo antigo sempre que ele existir,
-- inclusive o órfão que o 0001 recria a cada geração do schema.sql. Se
-- alguma coluna ainda o usasse, este comando falharia — e falhar aqui é o
-- comportamento certo, porque significaria que a conversão acima não rodou.
drop type if exists public.membership_role;

-- ---------- 5. as funções de papel ----------
create or replace function public.is_restaurant_admin(rid uuid)
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
      and m.role = 'admin'
  );
$fn$;

-- Alimenta a camada de interface: é ela que decide se o botão aparece.
-- Devolve nulo para quem não é membro, o que é diferente de um papel sem
-- poder — e a diferença importa na tela.
create or replace function public.my_role(rid uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.role from public.memberships m
  where m.restaurant_id = rid and m.user_id = (select auth.uid());
$fn$;

grant execute on function public.is_restaurant_admin(uuid) to authenticated;
grant execute on function public.my_role(uuid) to authenticated;

-- ---------- 6. as políticas derrubadas, de volta ----------
create policy restaurants_update on public.restaurants
  for update to authenticated
  using (public.is_restaurant_admin(id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(id) or public.is_platform_admin());

create policy memberships_delete on public.memberships
  for delete to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

create policy invites_select on public.invites
  for select to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

-- ---------- 7. a escrita do cardápio passa a exigir administrador ----------
-- ESTE é o buraco que a fase fecha. Estas políticas diziam is_member, e
-- is_member significa "trabalha aqui", não "pode editar". A leitura
-- continua sendo de qualquer membro: as políticas *_select_member ficam
-- como estão e não são tocadas aqui.
drop policy if exists menu_categories_insert on public.menu_categories;
create policy menu_categories_insert on public.menu_categories
  for insert to authenticated
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_categories_update on public.menu_categories;
create policy menu_categories_update on public.menu_categories
  for update to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_categories_delete on public.menu_categories;
create policy menu_categories_delete on public.menu_categories
  for delete to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_items_insert on public.menu_items;
create policy menu_items_insert on public.menu_items
  for insert to authenticated
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_items_update on public.menu_items;
create policy menu_items_update on public.menu_items
  for update to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_items_delete on public.menu_items;
create policy menu_items_delete on public.menu_items
  for delete to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_item_variants_insert on public.menu_item_variants;
create policy menu_item_variants_insert on public.menu_item_variants
  for insert to authenticated
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_item_variants_update on public.menu_item_variants;
create policy menu_item_variants_update on public.menu_item_variants
  for update to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_item_variants_delete on public.menu_item_variants;
create policy menu_item_variants_delete on public.menu_item_variants
  for delete to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_item_media_insert on public.menu_item_media;
create policy menu_item_media_insert on public.menu_item_media
  for insert to authenticated
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_item_media_update on public.menu_item_media;
create policy menu_item_media_update on public.menu_item_media
  for update to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

drop policy if exists menu_item_media_delete on public.menu_item_media;
create policy menu_item_media_delete on public.menu_item_media
  for delete to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

-- A plaquinha é objeto físico do restaurante. Trocar o rótulo ou desligá-la
-- é decisão de administração, não de quem está no salão.
drop policy if exists menu_tags_update_member on public.menu_tags;
create policy menu_tags_update_member on public.menu_tags
  for update to authenticated
  using (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin())
  with check (public.is_restaurant_admin(restaurant_id) or public.is_platform_admin());

-- ---------- 8. o gatilho de status, mais preciso ----------
-- Slug e deleted_at continuam fechados. O status ganha três casos: o
-- administrador do restaurante move entre rascunho e ativo; entrar ou sair
-- de suspenso continua exclusivo da plataforma. Suspensão que o suspenso
-- desfaz não é suspensão.
create or replace function public.restaurants_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  -- auth.uid() nulo significa acesso DIRETO ao banco: SQL Editor, psql ou
  -- função SECURITY DEFINER. Todos já são privilegiados por definição, e
  -- tráfego da aplicação nunca chega aqui com uid nulo.
  if (select auth.uid()) is null or public.is_platform_admin() then
    return new;
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'alterar slug exige administrador da plataforma' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    raise exception 'alterar deleted_at exige administrador da plataforma' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'suspended' or new.status = 'suspended' then
      raise exception 'suspender e reativar exige administrador da plataforma'
        using errcode = '42501';
    end if;
    if not public.is_restaurant_admin(new.id) then
      raise exception 'publicar exige administrador do restaurante'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists restaurants_guard_privileged on public.restaurants;
create trigger restaurants_guard_privileged
  before update on public.restaurants
  for each row execute function public.restaurants_guard_privileged_columns();

-- ---------- 9. o restaurante nunca fica órfão ----------
create or replace function public.memberships_guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_remaining int;
begin
  -- Só interessa quando um vínculo de ADMINISTRADOR está deixando de ser um.
  if old.role <> 'admin' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_op = 'UPDATE' and new.role = 'admin' then
    return new;
  end if;

  -- Remoção em cascata do restaurante inteiro passa direto: a linha-pai já
  -- saiu nesta transação. Sem esta saída, apagar um restaurante pelo SQL
  -- Editor travaria no primeiro administrador encontrado.
  if not exists (select 1 from public.restaurants r where r.id = old.restaurant_id) then
    return old;
  end if;

  select count(*) into v_remaining
    from public.memberships m
   where m.restaurant_id = old.restaurant_id
     and m.role = 'admin'
     and m.id <> old.id;

  if v_remaining = 0 then
    raise exception 'o restaurante precisa de ao menos um administrador'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$fn$;

drop trigger if exists memberships_guard_last_admin on public.memberships;
create trigger memberships_guard_last_admin
  before delete or update on public.memberships
  for each row execute function public.memberships_guard_last_admin();

-- ---------- 10. as três funções derrubadas, de volta ----------
-- Idênticas às do 0007 e do 0009, com membership_role trocado por
-- member_role e nada mais. A FORMA delas muda no 0012; aqui elas só
-- precisam voltar a existir, para cada migração continuar válida
-- isoladamente — o SQL Editor não guarda estado e elas são aplicadas à mão,
-- uma de cada vez.

create function public.preview_invite(p_token text)
returns table (restaurant_name text, invite_role public.member_role)
language sql
stable
security definer
set search_path = ''
as $fn$
  select r.name, i.role
  from public.invites i
  join public.restaurants r on r.id = i.restaurant_id
  where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
    and i.expires_at > now()
    and i.redeemed_at is null
    and i.revoked_at is null;
$fn$;

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
    raise exception 'convite invalido' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  update public.invites i
     set redeemed_at = now(),
         redeemed_by = v_uid
   where i.token_hash = sha256(convert_to(p_token, 'UTF8'))
     and i.expires_at > now()
     and i.redeemed_at is null
     and i.revoked_at is null
     and (i.email is null or lower(i.email) = lower(v_email))
  returning i.* into v_invite;

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
$fn$;

create function public.list_restaurant_members(p_restaurant_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  display_name text,
  member_role public.member_role,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select m.id, m.user_id, u.email::text, p.display_name, m.role, m.created_at
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where m.restaurant_id = p_restaurant_id
    and (
      public.is_member(p_restaurant_id)
      or public.is_platform_admin()
    )
  order by m.created_at;
$fn$;

grant execute on function public.preview_invite(text) to anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.list_restaurant_members(uuid) to authenticated;
```

**Confira as três contra os arquivos originais antes de rodar.** Elas foram transcritas de `0007_privileged.sql` e `0009_members.sql`; se algo tiver mudado naqueles arquivos depois que este plano foi escrito, o que vale é o arquivo, não isto aqui. A única alteração intencional é `public.membership_role` → `public.member_role`, na assinatura de `preview_invite` e de `list_restaurant_members`.

- [ ] **Passo 3: Gerar o schema e provar a idempotência no banco de prova**

Este projeto **não aplica migration avulsa**. O SQL Editor do Supabase não guarda estado de migração, então existe `supabase/build-schema.sh`, que concatena as migrations numeradas num `supabase/schema.sql` único e idempotente. É esse arquivo que vai para o banco.

```bash
bash supabase/build-schema.sh
```

Esperado: a saída lista as migrations, agora incluindo `0011_roles.sql`.

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres < supabase/schema.sql
```

Esperado: nenhum erro.

Rodar **de novo**, o mesmo comando. Esperado: nenhum erro de novo.

- [ ] **Passo 3b: Provar que a segunda passagem não promove ninguém**

Esta é a prova mais importante do passo anterior, e ela não aparece sozinha: a segunda execução do `schema.sql` **não dá erro** mesmo quando está fazendo a coisa errada.

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "
insert into public.memberships (restaurant_id, user_id, role)
select r.id, p.id, 'waiter'
  from public.restaurants r, public.profiles p
 limit 1
on conflict do nothing;
select role, count(*) from public.memberships group by role;"
```

Anotar a contagem. Rodar o `schema.sql` mais uma vez e repetir a contagem.

Esperado: **as duas contagens são idênticas**, com o `waiter` ainda lá. Se o garçom virar `admin`, a condição do bloco de conversão está olhando o tipo em vez da coluna, e o defeito só apareceria em produção, no dia em que alguém regerasse o schema.

- [ ] **Passo 4: Provar que a conversão preservou os vínculos**

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "select role, count(*) from public.memberships group by role;"
```

Esperado: só o valor `admin`, com a mesma contagem total que havia antes. Nenhum vínculo pode ter sumido.

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "select typname from pg_type where typname in ('membership_role','member_role');"
```

Esperado: só `member_role`. Se `membership_role` ainda aparecer, o `drop type` não rodou.

- [ ] **Passo 5: Provar a trava do último administrador**

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "
begin;
  delete from public.memberships where id = (select id from public.memberships where role='admin' limit 1);
rollback;"
```

Esperado: erro `o restaurante precisa de ao menos um administrador`, **desde que aquele seja o único administrador daquele restaurante**. Se o banco de prova tiver dois administradores no mesmo restaurante, a remoção passa e isso está certo — nesse caso, apague um primeiro e repita.

- [x] **Passo 6: Aplicar no projeto na nuvem**

Colar **`supabase/schema.sql`** — o arquivo gerado no passo 3, não a migration avulsa — no SQL Editor do projeto na nuvem e executar. Esperado: sucesso. É este banco que a aplicação usa.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 2: A DAL fala de administrador

**Arquivos:**
- Modificar: `src/domain/invite.ts`
- Modificar: `src/server/dal/auth.ts:76-107`
- Modificar: `src/server/dal/menu.ts` (doze chamadas de escrita)
- Modificar: `src/server/dal/media.ts` (três chamadas)
- Modificar: `src/server/dal/tags.ts` (duas chamadas)
- Modificar: `src/server/dal/restaurants.ts:91`
- Modificar: `src/server/dal/members.ts:16,50`
- Modificar: `src/server/dal/invites.ts:75`

**Interfaces:**
- Consome: `is_restaurant_admin` e `my_role` da Tarefa 1.
- Produz: `requireRestaurantAdmin(restaurantId)`, `myRole(restaurantId): Promise<MemberRole | null>`, `memberRoleSchema`, `MEMBER_ROLE_LABELS`. As Tarefas 3 a 5 e o plano 3C consomem.

- [x] **Passo 1: Os quatro papéis no domínio**

Em `src/domain/invite.ts`, substituir o bloco de `membershipRoleSchema`:

```ts
export const memberRoleSchema = z.enum(['admin', 'cashier', 'attendant', 'waiter'])
export type MemberRole = z.infer<typeof memberRoleSchema>

// Os valores vivem em inglês no banco, como todo o resto do schema. O
// português mora aqui, na borda, e é o único lugar que precisa mudar se um
// rótulo for repensado.
export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Administrador',
  cashier: 'Caixa',
  attendant: 'Atendente',
  waiter: 'Garçom',
}
```

Trocar, no mesmo arquivo, todas as ocorrências de `membershipRoleSchema` por `memberRoleSchema` e de `MembershipRole` por `MemberRole` — em `createInviteSchema`, `InviteDTO` e `MemberDTO`. Depois, rodar `grep -rn "MembershipRole\|membershipRoleSchema" src/` e corrigir o que sobrar.

- [x] **Passo 2: O guardião novo**

Em `src/server/dal/auth.ts`, trocar a união `GuardFunction` e a função `requireOwner`:

```ts
type GuardFunction = 'is_platform_admin' | 'is_member' | 'is_restaurant_admin'
```

```ts
export async function requireRestaurantAdmin(restaurantId: string): Promise<AuthUser> {
  const user = await requireUser()
  const allowed =
    (await callGuard('is_restaurant_admin', { rid: restaurantId })) ||
    (await callGuard('is_platform_admin'))
  if (!allowed) throw new ForbiddenError()
  return user
}

// Devolve nulo para quem não é membro, o que é DIFERENTE de um papel sem
// poder. A tela usa a diferença: não-membro nem chega a ver o restaurante;
// garçom vê e não edita.
export async function myRole(restaurantId: string): Promise<MemberRole | null> {
  await requireUser()
  const supabase = await createUserClient(await currentTerritory())
  const { data, error } = await supabase.rpc('my_role', { rid: restaurantId })
  if (error || !data) return null
  const parsed = memberRoleSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}
```

Acrescentar ao topo do arquivo: `import { memberRoleSchema, type MemberRole } from '@/domain/invite'`.

`requireOwner` deixa de existir. `requireMember` fica intacta.

- [x] **Passo 3: Separar leitura de escrita na DAL do cardápio**

Em `src/server/dal/menu.ts`, **duas** chamadas continuam `requireMember` e **doze** viram `requireRestaurantAdmin`:

| Continua `requireMember` | Vira `requireRestaurantAdmin` |
|---|---|
| `getMenuForOwner` | `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories` |
| `listCategories` | `createItem`, `updateItem`, `deleteItem`, `reorderItems`, `setItemAvailability` |
| | `createVariant`, `updateVariant`, `deleteVariant` |

**A distinção é exatamente a regra do produto:** ler o cardápio é de qualquer membro; mudar o cardápio é do administrador.

Rodar, para confirmar que nenhuma escrita ficou para trás:

```bash
grep -n "requireMember" src/server/dal/menu.ts
```

Esperado: exatamente duas linhas, ambas dentro de `getMenuForOwner` e `listCategories`.

- [x] **Passo 4: As demais DAL**

Em `src/server/dal/media.ts`, as três chamadas de `requireMember` viram `requireRestaurantAdmin`: enviar, registrar e apagar mídia são todas escrita.

Em `src/server/dal/tags.ts`, rodar primeiro:

```bash
grep -n "export async function" src/server/dal/tags.ts
```

As duas chamadas de `requireMember` viram `requireRestaurantAdmin` **se as funções que as contêm escreverem**. Se alguma delas apenas lista plaquinhas, ela continua `requireMember`. Decidir lendo, não presumindo.

Em `src/server/dal/restaurants.ts`, `updateRestaurantProfile` troca `requireOwner` por `requireRestaurantAdmin`.

Em `src/server/dal/members.ts` e `src/server/dal/invites.ts`, trocar `requireOwner` por `requireRestaurantAdmin` em todas as ocorrências.

- [x] **Passo 5: Confirmar que `requireOwner` sumiu**

```bash
grep -rn "requireOwner\|is_owner" src/
```

Esperado: nenhuma linha. Se sobrar alguma, ela vai falhar em produção — a função não existe mais no banco.

- [x] **Passo 6: Regerar os tipos do banco, se o projeto os gera**

```bash
grep -n "member_role\|membership_role" src/domain/database.types.ts
```

Se o arquivo citar `membership_role`, ele está desatualizado e precisa ser regerado pelo comando que o projeto usa para isso. Se o projeto não gera automaticamente, editar à mão as ocorrências do tipo e acrescentar as assinaturas de `is_restaurant_admin` e `my_role`.

- [x] **Passo 7: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 3: Trocar papel, e a trava na aplicação

O gatilho da Tarefa 1 já impede o restaurante ficar órfão. Esta tarefa dá a mensagem decente antes de chegar lá, e cria a operação que hoje não existe.

**Arquivos:**
- Modificar: `src/domain/invite.ts`
- Modificar: `src/server/dal/members.ts`
- Modificar: `src/server/actions/members.ts`

**Interfaces:**
- Consome: `requireRestaurantAdmin`, `memberRoleSchema` da Tarefa 2.
- Produz: `changeMemberRole(input)` na DAL e `changeMemberRoleAction(input)` nas actions. A Tarefa 5 e o plano 3C consomem.

- [x] **Passo 1: O schema**

Em `src/domain/invite.ts`:

```ts
export const changeMemberRoleSchema = z.object({
  membershipId: uuidSchema,
  role: memberRoleSchema,
})
```

- [x] **Passo 2: A operação na DAL**

Em `src/server/dal/members.ts`:

```ts
export async function changeMemberRole(input: unknown): Promise<void> {
  const data = changeMemberRoleSchema.parse(input)

  const supabase = await db()
  // Descobrimos o restaurante dono ANTES de autorizar. Confiar num
  // restaurantId vindo do cliente seria exatamente a brecha de IDOR.
  const { data: row, error: lookupError } = await supabase
    .from('memberships')
    .select('restaurant_id, user_id, role')
    .eq('id', data.membershipId)
    .single()

  if (lookupError || !row) throw new UserFacingError('Membro não encontrado.')
  await requireRestaurantAdmin(row.restaurant_id)

  if (row.role === data.role) return

  // O gatilho no banco recusaria de qualquer forma. Esta checagem existe
  // para a mensagem na tela dizer o que aconteceu, em vez de vazar um
  // errcode do Postgres.
  if (row.role === 'admin') {
    await assertNotLastAdmin(row.restaurant_id, data.membershipId)
  }

  const { error } = await supabase
    .from('memberships')
    .update({ role: data.role })
    .eq('id', data.membershipId)

  if (error) throw new Error(`Não foi possível trocar o papel: ${error.message}`)

  await recordAudit({
    action: 'membership.role_changed',
    subjectType: 'membership',
    subjectId: data.membershipId,
    restaurantId: row.restaurant_id,
    metadata: { from: row.role, to: data.role },
  })
}

// Compartilhada entre trocar papel e remover, porque as duas quebram a
// mesma garantia se passarem.
async function assertNotLastAdmin(
  restaurantId: string,
  membershipId: string,
): Promise<void> {
  const supabase = await db()
  const { count, error } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('role', 'admin')
    .neq('id', membershipId)

  if (error) throw new Error(`Não foi possível conferir a equipe: ${error.message}`)
  if ((count ?? 0) === 0) {
    throw new UserFacingError(
      'Este é o único administrador. Promova outra pessoa antes de mudar este papel.',
    )
  }
}
```

- [x] **Passo 3: A mesma trava na remoção**

Em `removeMember`, no mesmo arquivo, depois do `requireRestaurantAdmin(row.restaurant_id)` e antes do `delete`, acrescentar — e para isso o `select` precisa passar a trazer `role`:

```ts
  if (row.role === 'admin') {
    await assertNotLastAdmin(row.restaurant_id, id)
  }
```

- [x] **Passo 4: A action**

Em `src/server/actions/members.ts`, seguindo o formato das que já existem no arquivo:

```ts
export async function changeMemberRoleAction(
  input: unknown,
): Promise<ActionResult> {
  return runAction(async () => {
    await dal.changeMemberRole(input)
    revalidatePath('/')
  })
}
```

- [x] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 4: Publicar e despublicar

**Arquivos:**
- Modificar: `src/domain/restaurant.ts`
- Modificar: `src/server/dal/restaurants.ts`
- Modificar: `src/server/actions/restaurants.ts`
- Criar: `src/components/painel/publish-bar.tsx`

**Interfaces:**
- Consome: `requireRestaurantAdmin` da Tarefa 2.
- Produz: `setPublished(input)` na DAL, `setPublishedAction(input)` nas actions, `<PublishBar restaurantId status publicUrl canEdit>`. A Tarefa 5 consome a barra.

- [x] **Passo 1: O schema**

Em `src/domain/restaurant.ts`:

```ts
export const setPublishedSchema = z.object({
  restaurantId: uuidSchema,
  published: z.boolean(),
})
```

- [x] **Passo 2: A operação na DAL**

Em `src/server/dal/restaurants.ts`:

```ts
export async function setPublished(input: unknown): Promise<void> {
  const data = setPublishedSchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)

  const supabase = await db()

  if (data.published) {
    // Publicar cardápio vazio só produz cliente confuso na mesa. A conferência
    // é uma consulta, não uma regra de banco, porque "ao menos um item
    // visível" muda com o produto e travar isso num CHECK seria rigidez.
    const { count, error: countError } = await supabase
      .from('menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', data.restaurantId)
      .eq('is_visible', true)

    if (countError) {
      throw new Error(`Não foi possível conferir o cardápio: ${countError.message}`)
    }
    if ((count ?? 0) === 0) {
      throw new UserFacingError(
        'Adicione ao menos um item visível antes de publicar o cardápio.',
      )
    }
  }

  const { error } = await supabase
    .from('restaurants')
    .update({ status: data.published ? 'active' : 'draft' })
    .eq('id', data.restaurantId)

  if (error) {
    // O gatilho do 0011 recusa a saída de 'suspended' para quem não é
    // plataforma. Traduzir aqui evita mostrar errcode do Postgres na tela.
    if (error.code === '42501') {
      throw new UserFacingError(
        'Este restaurante está suspenso. Fale com o administrador da plataforma.',
      )
    }
    throw new Error(`Não foi possível alterar a publicação: ${error.message}`)
  }

  await recordAudit({
    action: data.published ? 'restaurant.published' : 'restaurant.unpublished',
    subjectType: 'restaurant',
    subjectId: data.restaurantId,
    restaurantId: data.restaurantId,
  })
}
```

Acrescentar `UserFacingError` ao import de `./auth` no topo do arquivo, se ainda não estiver lá.

- [x] **Passo 3: A action**

Em `src/server/actions/restaurants.ts`, no formato das existentes:

```ts
export async function setPublishedAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await dal.setPublished(input)
    revalidatePath('/')
  })
}
```

- [x] **Passo 4: A barra de publicação**

`src/components/painel/publish-bar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { RiEyeLine, RiExternalLinkLine, RiGlobalLine } from 'react-icons/ri'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import type { RestaurantStatus } from '@/domain/restaurant'
import { setPublishedAction } from '@/server/actions/restaurants'

export function PublishBar({
  restaurantId,
  status,
  publicUrl,
  canEdit,
}: {
  restaurantId: string
  status: RestaurantStatus
  publicUrl: string
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState(status)

  function toggle(published: boolean) {
    // A action vai DENTRO de startTransition: é o contrato documentado do
    // Next 16.3.5 para chamada vinda de manipulador de evento. Fora dela, a
    // revalidação pode não voltar aplicada e a tela fica velha depois de uma
    // operação que deu certo.
    startTransition(async () => {
      const result = await setPublishedAction({ restaurantId, published })
      if (result.ok) {
        setOptimistic(published ? 'active' : 'draft')
        toast.add({
          title: published ? 'Cardápio publicado' : 'Cardápio despublicado',
          type: 'success',
        })
      } else {
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  const rotulo = {
    active: 'No ar',
    draft: 'Rascunho',
    suspended: 'Suspenso',
  }[optimistic]

  return (
    <div className="menu-line mb-8 flex flex-wrap items-center gap-3 rounded-xl border bg-surface-2 p-4 shadow-[var(--shadow-1)]">
      <span className="flex items-center gap-2 text-card font-semibold">
        <RiGlobalLine className="size-4 text-muted-foreground" aria-hidden="true" />
        {rotulo}
      </span>

      <p className="text-small text-muted-foreground">
        {optimistic === 'active'
          ? 'Quem encostar o celular na plaquinha vê o cardápio.'
          : optimistic === 'draft'
            ? 'Só você vê. Publique quando terminar de montar.'
            : 'Fale com o administrador da plataforma.'}
      </p>

      <div className="ml-auto flex gap-2">
        {optimistic === 'active' ? (
          <Button
            variant="outline"
            render={<Link href={publicUrl} target="_blank" rel="noopener noreferrer" />}
          >
            <RiExternalLinkLine className="size-4" />
            Ver no ar
          </Button>
        ) : null}

        {canEdit && optimistic !== 'suspended' ? (
          <Button
            disabled={pending}
            variant={optimistic === 'active' ? 'outline' : 'default'}
            onClick={() => toggle(optimistic !== 'active')}
          >
            {pending ? <Spinner className="size-4" /> : <RiEyeLine className="size-4" />}
            {optimistic === 'active' ? 'Despublicar' : 'Publicar cardápio'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
```

- [x] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 5: O painel sabe quem está olhando

**Arquivos:**
- Modificar: `src/app/painel/restaurantes/[id]/page.tsx`
- Modificar: `src/components/cardapio/category-section.tsx`
- Modificar: `src/components/cardapio/item-row.tsx`

**Interfaces:**
- Consome: `myRole` da Tarefa 2, `PublishBar` da Tarefa 4, `PageHeader` do plano 3A.
- Produz: nada que outra tarefa consuma.

- [x] **Passo 1: A página pergunta o papel**

Em `src/app/painel/restaurantes/[id]/page.tsx`, depois de `getRestaurantForMember`:

```tsx
  const role = await myRole(restaurant.id)
  const canEdit = role === 'admin'
```

Substituir o cabeçalho manual pelo `PageHeader` do plano 3A e acrescentar a `PublishBar` logo abaixo:

```tsx
      <PageHeader
        title={restaurant.name}
        support={`${categories.length} ${categories.length === 1 ? 'categoria' : 'categorias'}`}
      >
        {canEdit && categories.length > 0 ? (
          <NewCategoryButton restaurantId={restaurant.id} />
        ) : null}
      </PageHeader>

      <PublishBar
        restaurantId={restaurant.id}
        status={restaurant.status}
        publicUrl={publicUrl}
        canEdit={canEdit}
      />
```

O botão "Ver cardápio público" sai do cabeçalho: ele agora vive dentro da `PublishBar`, onde faz sentido ao lado da situação.

- [x] **Passo 2: O vazio muda de texto conforme o papel**

No bloco `categories.length === 0`, o `EmptyContent` com o botão de criar categoria só aparece se `canEdit`. Para quem não edita, a descrição passa a ser:

```tsx
            <EmptyDescription>
              {canEdit
                ? 'Comece criando uma categoria, como Entradas ou Bebidas.'
                : 'O administrador ainda não montou o cardápio.'}
            </EmptyDescription>
```

Dizer "crie uma categoria" para quem não pode criar é pior que não dizer nada.

- [x] **Passo 3: Passar `canEdit` para baixo**

`CategorySection` e `ItemRow` ganham a propriedade `canEdit: boolean`, repassada pela página. Dentro de cada um:

- `CategorySection`: o `DropdownMenu` inteiro (editar, ocultar, excluir) e as setas de reordenar só aparecem com `canEdit`.
- `ItemRow`: o interruptor de disponibilidade, o menu e as setas só aparecem com `canEdit`. O nome, o preço e a miniatura aparecem para todos.

`NewItemButton`, dentro da categoria, também fica atrás de `canEdit`.

- [ ] **Passo 4: Verificar no navegador**

Com `pnpm dev`, entrando como administrador: tudo aparece como antes, mais a barra de publicação.

Depois, no SQL Editor do **projeto na nuvem**, rebaixar temporariamente a própria conta:

```sql
update public.memberships set role = 'waiter'
 where user_id = '<seu user id>' and restaurant_id = '<o restaurante de prova>';
```

Recarregar o painel. Esperado: o cardápio aparece inteiro, com preços, e **nenhum** botão de editar, nenhum interruptor, nenhuma seta, nenhum menu. A barra de publicação mostra a situação e não oferece o botão.

**O gatilho da Tarefa 1 vai recusar este UPDATE se você for o único administrador** — e isso está certo. Nesse caso, insira um segundo administrador antes.

Restaurar ao fim:

```sql
update public.memberships set role = 'admin'
 where user_id = '<seu user id>' and restaurant_id = '<o restaurante de prova>';
```

- [x] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhuma saída de erro.

**Ao terminar:** listar os arquivos alterados. Não commitar.

---

## Tarefa 6: Verificação de ponta a ponta

Nenhum código novo. Só evidência.

- [x] **Passo 1: Compilar**

```bash
pnpm build
```

Esperado: build concluído, sem erro.

- [ ] **Passo 2: A prova de isolamento, escopada**

Esta é a prova que importa da fase inteira, e ela roda no **projeto na nuvem**, com a RLS ativa — não como superusuário, que ignora RLS e devolve uma resposta limpa e sem significado.

No SQL Editor, com um usuário que seja `waiter` num restaurante:

```sql
-- Assume o papel do usuário autenticado, o que faz a RLS valer.
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user id do garçom>","role":"authenticated"}';

-- Deve devolver linhas: garçom LÊ o cardápio.
select count(*) from public.menu_items where restaurant_id = '<restaurante>';

-- Deve FALHAR ou afetar zero linhas: garçom não escreve.
update public.menu_items set name = 'invadido' where restaurant_id = '<restaurante>';
```

Esperado: a leitura devolve a contagem real; o `update` afeta **zero linhas**. Se afetar uma linha que seja, a política do passo 7 da Tarefa 1 não está valendo, e a fase inteira não cumpriu o objetivo.

Repetir o `update` contra `menu_categories`, `menu_item_variants` e `menu_item_media`. As quatro precisam dar zero.

- [ ] **Passo 3: A prova de que o administrador continua escrevendo**

Mesmo roteiro, trocando o `sub` pelo id de um `admin`. Esperado: o `update` afeta uma linha. Sem esta contraprova, "zero linhas" poderia significar apenas que a consulta está errada.

Lembrar de `rollback` ao fim, para não deixar um item chamado `invadido` no cardápio.

- [ ] **Passo 4: A prova da trava do último administrador, na nuvem**

```sql
delete from public.memberships
 where restaurant_id = '<restaurante com um único admin>' and role = 'admin';
```

Esperado: erro `o restaurante precisa de ao menos um administrador`.

- [ ] **Passo 5: A prova do status**

Com um usuário `admin` do restaurante, pela aplicação: publicar e despublicar funcionam. Depois, no SQL Editor como superusuário, suspender o restaurante:

```sql
update public.restaurants set status = 'suspended' where id = '<restaurante>';
```

Pela aplicação, tentar publicar. Esperado: a mensagem "Este restaurante está suspenso", e o status **não** muda. Restaurar para `active` ou `draft` ao fim.

- [ ] **Passo 6: Percorrer as três telas**

Como administrador: cardápio, publicar, equipe. Como garçom: cardápio em leitura. Confirmar que não existe caminho visível para escrita no segundo caso.

- [ ] **Passo 7: Relatar**

Listar, para cada passo: o comando rodado, a saída obtida e se corresponde ao esperado. Passo com resultado diferente do esperado é passo **não** concluído — não marcar a caixa.

---

## Cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| §3.2 Papéis, tipo novo e mapeamento | Tarefa 1, passos 3 e 4 |
| §4.1 O buraco que a fase fecha | Tarefa 1 passo 7; Tarefa 2 passo 3 |
| §4.2 A regra por operação | Tarefa 1 passos 6 e 7; Tarefa 2 |
| §4.3 As três camadas | Tarefa 1 (RLS), Tarefa 2 (DAL), Tarefa 5 (interface) |
| §4.4 O gatilho de colunas privilegiadas | Tarefa 1 passo 8 |
| §4.5.1 O último administrador | Tarefa 1 passo 9; Tarefa 3 passos 2 e 3 |
| §4.5.2 Trocar papel | Tarefa 3 |
| §5.3 Publicação | Tarefa 4 |
| §10 `0011_roles.sql` | Tarefa 1 |
| §11 Publicar sem item; membro chamando escrita | Tarefa 4 passo 2; Tarefa 6 passo 2 |
| §13 Prova de isolamento escopada | Tarefa 6 passos 2 e 3 |

**Fora deste plano, de propósito:** §3.1 convite, §3.3 segmento e tema, §5.1 e §5.2 fluxo de convite, §6 criação atômica, §7 endereço automático, §9.1 console e a tela de equipe do §9.2. Esses são o plano 3C. Todo o §8 é o plano 3A.
