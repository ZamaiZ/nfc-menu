-- =====================================================================
-- PROVA DE ISOLAMENTO ENTRE RESTAURANTES
--
-- Cria dois donos e dois restaurantes, depois consulta o banco COMO cada
-- um deles e confere o que cada um enxerga. Roda inteiro dentro de uma
-- transacao e desfaz no final: nao deixa nada para tras.
--
-- Qualquer numero diferente do esperado e vazamento entre inquilinos.
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
  ('a0000000-0000-0000-0000-000000000000', 'owner',
   sha256(convert_to('token-isolamento', 'UTF8')),
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() + interval '7 days');

insert into public.menu_tags (restaurant_id, public_token, label) values
  ('a0000000-0000-0000-0000-000000000000', 'ISOLAMENTO123456', 'Mesa 1');

-- ---------------------------------------------------------------------
-- Como o dono do restaurante A
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    'role', 'authenticated')::text,
  true);

select 'dono A ve itens' as verificacao,
       count(*) as total,
       coalesce(bool_and(name like '%do A'), true) as todos_sao_do_a
from public.menu_items;

select 'dono A ve vinculos' as verificacao, count(*) as total
from public.memberships;

select 'dono A ve convites' as verificacao, count(*) as total
from public.invites;

-- ---------------------------------------------------------------------
-- Como visitante anonimo
-- ---------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', null, true);

select 'anonimo ve restaurantes' as verificacao,
       count(*) as total,
       coalesce(bool_and(slug = 'isolamento-a'), true) as so_o_ativo
from public.restaurants;

select 'anonimo ve itens' as verificacao,
       count(*) as total,
       coalesce(bool_and(name like '%do A'), true) as so_do_restaurante_ativo
from public.menu_items;

select 'anonimo ve convites' as verificacao, count(*) as total from public.invites;
select 'anonimo ve plaquinhas' as verificacao, count(*) as total from public.menu_tags;
select 'anonimo ve vinculos' as verificacao, count(*) as total from public.memberships;
select 'anonimo ve perfis' as verificacao, count(*) as total from public.profiles;

reset role;
rollback;
