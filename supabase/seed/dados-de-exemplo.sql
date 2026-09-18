-- =====================================================================
-- DADOS DE EXEMPLO — opcional, so para ver o cardapio funcionando
--
-- Cria um restaurante de demonstracao com duas categorias, tres itens,
-- variacoes e uma plaquinha. Idempotente: pode rodar de novo.
--
-- Para APAGAR tudo depois, rode a ultima linha comentada no fim do arquivo.
-- =====================================================================

insert into public.restaurants (id, slug, name, description, status, contact)
values (
  'dddddddd-0000-4000-8000-000000000001',
  'cardapio-demo',
  'Cantina da Esquina',
  'Comida caseira, do jeito que a vó fazia.',
  'active',
  '{"phone": "(11) 4002-8922", "instagram": "cantinadaesquina"}'::jsonb
)
on conflict (id) do update set
  name        = excluded.name,
  description = excluded.description,
  status      = excluded.status,
  contact     = excluded.contact;

insert into public.menu_categories (id, restaurant_id, name, description, position)
values
  ('dddddddd-0000-4000-8000-000000000011',
   'dddddddd-0000-4000-8000-000000000001',
   'Entradas', 'Para começar bem', 0),
  ('dddddddd-0000-4000-8000-000000000012',
   'dddddddd-0000-4000-8000-000000000001',
   'Pratos principais', null, 1)
on conflict (id) do update set
  name        = excluded.name,
  description = excluded.description,
  position    = excluded.position;

insert into public.menu_items
  (id, restaurant_id, category_id, name, description, base_price_cents,
   position, dietary_tags)
values
  ('dddddddd-0000-4000-8000-000000000021',
   'dddddddd-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000011',
   'Pão de alho', 'Três espetos, na brasa.', 1890, 0,
   array['vegetariano']),
  ('dddddddd-0000-4000-8000-000000000022',
   'dddddddd-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000011',
   'Bolinho de bacalhau', 'Seis unidades.', 3450, 1,
   array[]::text[]),
  ('dddddddd-0000-4000-8000-000000000023',
   'dddddddd-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000012',
   'Parmegiana da casa', 'Acompanha arroz e fritas.', 6990, 0,
   array[]::text[])
on conflict (id) do update set
  name             = excluded.name,
  description      = excluded.description,
  base_price_cents = excluded.base_price_cents,
  position         = excluded.position,
  dietary_tags     = excluded.dietary_tags;

-- Variacoes com preco proprio, para ver o P/M/G funcionando.
insert into public.menu_item_variants
  (id, restaurant_id, item_id, name, price_cents, position)
values
  ('dddddddd-0000-4000-8000-000000000031',
   'dddddddd-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000023',
   'Individual', 6990, 0),
  ('dddddddd-0000-4000-8000-000000000032',
   'dddddddd-0000-4000-8000-000000000001',
   'dddddddd-0000-4000-8000-000000000023',
   'Para dois', 11900, 1)
on conflict (id) do update set
  name        = excluded.name,
  price_cents = excluded.price_cents,
  position    = excluded.position;

-- A plaquinha da mesa 3. O token respeita o alfabeto sem caracteres
-- ambiguos: sem I, L, O nem U.
insert into public.menu_tags (id, restaurant_id, public_token, label)
values (
  'dddddddd-0000-4000-8000-000000000041',
  'dddddddd-0000-4000-8000-000000000001',
  'DEMA2K4M7PQR9STV',
  'Mesa 3'
)
on conflict (id) do update set label = excluded.label;

-- Confirmacao do que foi criado.
select r.slug,
       (select count(*) from public.menu_categories c where c.restaurant_id = r.id) as categorias,
       (select count(*) from public.menu_items i where i.restaurant_id = r.id) as itens,
       (select count(*) from public.menu_tags t where t.restaurant_id = r.id) as plaquinhas
from public.restaurants r
where r.id = 'dddddddd-0000-4000-8000-000000000001';

-- Para apagar tudo depois, descomente e execute a linha abaixo. O cascade
-- leva categorias, itens, variacoes e plaquinhas junto.
-- delete from public.restaurants where id = 'dddddddd-0000-4000-8000-000000000001';
