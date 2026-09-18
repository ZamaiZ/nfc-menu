-- =====================================================================
-- PROVA DE ISOLAMENTO ENTRE RESTAURANTES
--
-- Cria dois donos e dois restaurantes, depois consulta o banco COMO cada
-- um deles e confere o que cada um enxerga. Roda inteiro dentro de uma
-- transacao e desfaz no final: nao deixa nada para tras.
--
-- Toda pergunta e ESCOPADA aos restaurantes criados aqui. Contar linhas
-- globalmente seria fragil: qualquer outro restaurante publico no banco
-- mudaria o numero e o teste passaria a medir a povoacao do banco em vez
-- de medir isolamento.
--
-- TODA linha do resultado precisa vir com passou = t.
-- =====================================================================

begin;

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dono-a@local.test',
   'irrelevante', now(), now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dono-b@local.test',
   'irrelevante', now(), now(), now());

insert into public.restaurants (id, slug, name, status) values
  ('a0000000-0000-0000-0000-000000000000', 'isolamento-a', 'Restaurante A', 'active'),
  -- O B nasce em rascunho de proposito: o anonimo nao pode ve-lo.
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

insert into public.invites (restaurant_id, role, token_hash, created_by, expires_at) values
  ('b0000000-0000-0000-0000-000000000000', 'owner',
   sha256(convert_to('token-do-b', 'UTF8')),
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now() + interval '7 days');

insert into public.menu_tags (restaurant_id, public_token, label) values
  ('b0000000-0000-0000-0000-000000000000', 'ISOLAMENTOB12345', 'Mesa do B');

-- ---------------------------------------------------------------------
-- Como o dono do restaurante A. Toda pergunta e sobre o restaurante B.
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    'role', 'authenticated')::text,
  true);

select 'dono A nao ve itens do B' as verificacao,
       count(*) = 0 as passou
from public.menu_items
where restaurant_id = 'b0000000-0000-0000-0000-000000000000';

select 'dono A nao ve categorias do B' as verificacao,
       count(*) = 0 as passou
from public.menu_categories
where restaurant_id = 'b0000000-0000-0000-0000-000000000000';

select 'dono A nao ve o restaurante B (rascunho)' as verificacao,
       count(*) = 0 as passou
from public.restaurants
where id = 'b0000000-0000-0000-0000-000000000000';

select 'dono A nao ve vinculos do B' as verificacao,
       count(*) = 0 as passou
from public.memberships
where restaurant_id = 'b0000000-0000-0000-0000-000000000000';

select 'dono A nao ve convites do B' as verificacao,
       count(*) = 0 as passou
from public.invites
where restaurant_id = 'b0000000-0000-0000-0000-000000000000';

select 'dono A nao ve plaquinhas do B' as verificacao,
       count(*) = 0 as passou
from public.menu_tags
where restaurant_id = 'b0000000-0000-0000-0000-000000000000';

select 'dono A VE o proprio restaurante' as verificacao,
       count(*) = 1 as passou
from public.restaurants
where id = 'a0000000-0000-0000-0000-000000000000';

select 'dono A VE os proprios itens' as verificacao,
       count(*) = 1 as passou
from public.menu_items
where restaurant_id = 'a0000000-0000-0000-0000-000000000000';

-- ---------------------------------------------------------------------
-- Como visitante anonimo.
-- ---------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', null, true);

select 'anonimo nao ve restaurante em rascunho' as verificacao,
       count(*) = 0 as passou
from public.restaurants
where id = 'b0000000-0000-0000-0000-000000000000';

select 'anonimo nao ve itens de restaurante em rascunho' as verificacao,
       count(*) = 0 as passou
from public.menu_items
where restaurant_id = 'b0000000-0000-0000-0000-000000000000';

select 'anonimo nao ve convite nenhum' as verificacao,
       count(*) = 0 as passou from public.invites;

select 'anonimo nao ve plaquinha nenhuma' as verificacao,
       count(*) = 0 as passou from public.menu_tags;

select 'anonimo nao ve vinculo nenhum' as verificacao,
       count(*) = 0 as passou from public.memberships;

select 'anonimo nao ve perfil nenhum' as verificacao,
       count(*) = 0 as passou from public.profiles;

select 'anonimo VE restaurante ativo' as verificacao,
       count(*) = 1 as passou
from public.restaurants
where id = 'a0000000-0000-0000-0000-000000000000';

reset role;

-- ---------------------------------------------------------------------
-- Permissoes no nivel do GRANT, checadas fora do papel anonimo.
--
-- audit_log e rate_limit_counters nao tem grant algum para anon, entao
-- consultar essas tabelas levanta "permission denied" em vez de devolver
-- zero linhas. Negar no GRANT e mais forte do que negar na RLS: a consulta
-- nem chega a ser avaliada. Por isso a pergunta aqui e sobre a permissao,
-- e nao sobre o resultado.
-- ---------------------------------------------------------------------
select 'anonimo nao tem permissao na auditoria' as verificacao,
       not has_table_privilege('anon', 'public.audit_log', 'select') as passou;

select 'anonimo nao tem permissao no rate limit' as verificacao,
       not has_table_privilege('anon', 'public.rate_limit_counters', 'select') as passou;

select 'autenticado nao tem permissao no rate limit' as verificacao,
       not has_table_privilege('authenticated', 'public.rate_limit_counters', 'select') as passou;

-- Este precisa passar: sem o grant, a politica audit_log_select_admin
-- nunca seria alcancada e nem o administrador leria a auditoria.
select 'autenticado PODE ler auditoria (a RLS estreita para admin)' as verificacao,
       has_table_privilege('authenticated', 'public.audit_log', 'select') as passou;
rollback;
