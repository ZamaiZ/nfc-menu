# Fase 2 — CMS do cardápio: plano de implementação

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** Dar ao dono do restaurante a tela onde ele monta o próprio cardápio — categorias, itens, variações e mídia — com marcar "esgotado" a um toque no celular.

**Arquitetura:** A camada de dados já existe inteira desde a Fase 0: catorze funções em `dal/menu.ts` e as server actions correspondentes. Esta fase é interface sobre elas, mais duas extensões pontuais: `poster_path` no banco e `createUploadTicket` na DAL de mídia.

**Stack:** Next.js 16.3.5, React 19.2.8, shadcn sobre Base UI, Tailwind 4, Zod 4.

**Spec:** [`docs/superpowers/specs/2026-09-18-fase2-cms-cardapio-design.md`](../specs/2026-09-18-fase2-cms-cardapio-design.md)

## Estado da execução (2026-09-18)

| Tarefa | Situação |
|---|---|
| 1 — Capa de vídeo no banco | **Concluída e verificada.** Migration 0010 aplicada, idempotência provada, CHECK do prefixo provado nos dois sentidos |
| 2 — Autorização de envio | **Concluída e verificada.** A prova do `PUT` com corpo cru passou: URL assinada, resposta 200, arquivo gravado. `fetch` puro funciona, nenhum cliente Supabase vai para o navegador |
| 3 — Visão do dono e rota | **Concluída e verificada.** `getMenuForOwner` criada, atalho da raiz funcionando, rota protegida |
| 4 — Categorias | **Concluída e verificada** pelo cliente no navegador. O item "Ocultar" foi acrescentado ao menu em 2026-09-18 e ainda **não** foi verificado |
| 5 — Itens na lista | **Concluída e verificada** pelo cliente no navegador |
| 6 — Editar item | **Concluída e verificada** pelo cliente no navegador |
| 6.5 — Servidor de mídia | **Implementada**, `tsc` limpo. Teto, `position` e remoção da capa no lugar. Falta a prova em SQL, no projeto na nuvem |
| 7 — Mídia, imagens | **Verificada no navegador:** a galeria atualiza com o diálogo aberto, a transição faz o que devia. Falta a prova em SQL, no projeto na nuvem |
| 8 — Vídeo e capa | **Verificada no navegador:** capa vinda do primeiro quadro, teto de um vídeo, limite de 15 s. Falta a prova em SQL, no projeto na nuvem |
| 9 — Verificação final | Passos 1 a 3 feitos: `build` limpo, `/painel/restaurantes/[id]` dinâmica, as três fronteiras de sempre. Faltam o lixo no storage, o cardápio público e o celular |

**Caixa desmarcada quer dizer passo não concluído.** As sete que sobraram são todas de verificação, e o que falta nelas é o SQL no projeto na nuvem e o roteiro no navegador. Código, não falta.

A Tarefa 6.5 existe porque a revisão abaixo encontrou três correções de servidor que o plano original não previa: o teto por item, a posição da mídia e a remoção da capa. Ela vem antes da 7 de propósito — é mais barato o servidor já estar certo quando a primeira foto subir.

### Desvios já aplicados ao plano

- **Diálogo nunca dentro de menu suspenso** — ver a restrição global abaixo. Descoberto na Tarefa 4 e propagado.
- **`updateItemSchema` não omite mais `categoryId`** — sem isso, trocar a categoria de um item era impossível. Corrigido na Tarefa 6, no schema e na DAL.
- **Diálogos são controlados**, com componentes de cliente mínimos (`NewCategoryButton`, `NewItemButton`) segurando o estado onde a página é de servidor.
- **O menu da categoria ganhou "Ocultar"**, em 2026-09-18. A §5 da spec promete "editar, ocultar e excluir" no menu, e a Tarefa 4 entregou só editar e excluir, com a visibilidade escondida dentro do diálogo de edição. Um `DropdownMenuItem` chamando `updateCategoryAction` com `isVisible` invertido transforma quatro cliques em um. O rótulo e o ícone viram "Mostrar" quando a categoria já está oculta, para o menu nunca oferecer a ação que não faz sentido.

### Revisão de 2026-09-18, na abertura da Tarefa 7

Antes de escrever a mídia, o código já redigido das Tarefas 7 e 8 foi lido contra o código real da Fase 0 e contra a documentação do Next 16.3.5 em `node_modules/next/dist/docs/`. Cinco pontos mudaram, e a spec foi emendada junto.

1. **Server action chamada de manipulador de evento vai dentro de `startTransition`.** O guia de Server Functions do Next 16.3.5 diz, com essas palavras, que se invoca "from a form, or from an event handler or `useEffect` wrapped in `startTransition`". O `handleFile` original chamava as actions direto do `onChange`. Deixar assim daria o pior tipo de defeito: o arquivo sobe, o banco grava, e a galeria não muda — parece bug de upload e é de renderização.
2. **O teto de seis imagens e um vídeo passa a valer no servidor.** Era constante dentro do componente, e `registerItemMedia` não contava nada. A §10 da spec manda conferir cada regra na camada certa, e um teto que só existe no navegador não é regra, é sugestão.
3. **A capa sai junto com o vídeo.** `deleteItemMedia` apagava apenas o `storage_path`. A coluna `poster_path` nasceu na Tarefa 1 desta fase e o caminho de exclusão nunca foi atualizado: cada vídeo removido deixaria para trás um arquivo pago e inalcançável.
4. **`position` passa a ser gravada na inserção.** A coluna é `not null default 0` e ninguém a informava. Com tudo em zero, a ordenação de `getMenuForOwner` não tem o que ordenar, e a miniatura da linha do item — que é a primeira imagem — troca sozinha entre duas renderizações.
5. **A capa sobe no formato que o navegador devolveu.** `canvas.toBlob(..., 'image/webp')` no Safari antigo entrega PNG calado. Subir esse blob como `.webp`, servido como `image/webp`, daria uma capa que navegador nenhum desenha.

Tudo o mais do desenho original ficou de pé: os três passos do upload, a degradação da capa como caminho previsto (C5), a checagem tripla de formato e a ausência de cliente Supabase no navegador.

## Restrições globais

Valem para **todas** as tarefas.

- **Nada de git.** Não rodar `add`, `commit`, `push` ou qualquer outro comando de git. Cada tarefa termina listando os arquivos alterados, e só.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **A verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão.
- **Dois bancos, e eles não são o mesmo.** O Postgres em Docker (`supabase_db_nfc-menu`) é **banco de prova**: existe para provar migration idempotente e CHECK funcionando, e pode ser jogado fora a qualquer momento. O app — servidor e navegador — fala com o **projeto na nuvem**, porque `NEXT_PUBLIC_SUPABASE_URL` aponta para lá e `createUserClient` lê essa mesma variável. Logo: verificação de **schema** roda no Docker, por `psql`; verificação de **dado que o app gravou** roda no SQL Editor do projeto na nuvem. Rodar a segunda no Docker devolve resposta limpa e sem significado nenhum — o pior tipo de verificação, porque parece que passou.
- **Composição usa `render`, nunca `asChild`.** O shadcn deste projeto é sobre **Base UI**, não Radix. Escreve-se `<Trigger render={<Button />}>conteúdo</Trigger>`.
- **Toast:** `toast.add({ title, description, type })`, com `type` em `success | error | info | warning | loading`, de `@/components/ui/toast`.
- **Formulários:** `Field`, `FieldLabel`, `FieldDescription`, `FieldGroup` de `@/components/ui/field`.
- **`Switch` usa `checked` e `onCheckedChange(checked, details)`** — a assinatura do Base UI tem um segundo argumento que o Radix não tem.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions de `@/server/actions` são a exceção deliberada.
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.** É o contrato documentado do Next 16.3.5. Fora da transição, a revalidação pode não voltar aplicada, e a tela fica velha depois de uma operação que deu certo.
- **Toda página chama `requireUser()`**, e a DAL confirma pertencimento em cada operação.
- **Rotas são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`; o proxy reescreve para `/painel/restaurantes/x`. Nunca escrever o prefixo do território em `href` ou `redirect`.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **Preço em centavos inteiros** em todo lugar; conversão para exibição só na borda, via `formatPriceBRL`.
- **Diálogo nunca vive dentro de um menu suspenso.** Um `Dialog` ou `AlertDialog` montado dentro de `DropdownMenuContent` desaparece junto com o menu quando o item é selecionado, e nunca chega a aparecer. O padrão correto: o item do menu apenas liga um estado (`onClick={() => setEditOpen(true)}`), e o diálogo fica como **irmão** do menu, controlado por `open` e `onOpenChange`. Vale para categoria, item e qualquer confirmação de exclusão.
  Consequência prática: os diálogos deste plano são **controlados**, não recebem `trigger`. Onde a página é componente de servidor e precisa de um botão que abre diálogo, existe um componente de cliente mínimo só para segurar esse estado — como `NewCategoryButton`.

## Direção visual

Herdada da Fase 1, sem mudança: corpo 16px, título de página 28px, de seção 20px, de cartão 16px, todos peso 600. Linha de lista com 56px. Espaço entre blocos de 32px. Largura máxima de 1100px. Alvo de toque mínimo de 44px. Cor primária só em ação primária, foco e seleção — nunca como superfície, nunca para indicar situação.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0010_media_poster.sql` | `poster_path` em `menu_item_media` |
| `src/domain/media.ts` | `posterPath` no schema de registro e `maxPerItem` nos limites |
| `src/server/dal/media.ts` | `createUploadTicket`, teto por item, `position` na inserção e remoção da capa junto do vídeo |
| `src/server/actions/media.ts` | Ação que emite a autorização de envio |
| `src/lib/upload.ts` | `uploadToSignedUrl` e `captureVideoPoster`, ambos de navegador |
| `src/app/painel/page.tsx` | Decide entre vazio, atalho e lista |
| `src/app/painel/restaurantes/[id]/page.tsx` | A tela do cardápio |
| `src/components/cardapio/category-section.tsx` | Uma categoria com seus itens |
| `src/components/cardapio/item-row.tsx` | Uma linha de item, com o interruptor |
| `src/components/cardapio/category-dialog.tsx` | Criar e editar categoria |
| `src/components/cardapio/item-create-dialog.tsx` | Criar item, campos mínimos |
| `src/components/cardapio/item-edit-dialog.tsx` | Editar item: dados, variações, mídia |
| `src/components/cardapio/variants-editor.tsx` | Lista de variações dentro do diálogo |
| `src/components/cardapio/media-editor.tsx` | Galeria, upload e remoção |
| `src/components/cardapio/reorder-buttons.tsx` | Setas de subir e descer, reutilizadas |

---

## Tarefa 1: Capa de vídeo no banco

**Arquivos:**
- Criar: `supabase/migrations/0010_media_poster.sql`
- Modificar: `src/domain/media.ts`, `src/server/dal/media.ts`, `src/domain/menu.ts`

**Interfaces:**
- Consome: `menu_item_media` da Fase 0
- Produz: coluna `poster_path`; `registerMediaSchema` com `posterPath` opcional; `MenuMediaDTO` com `posterPath`

- [x] **Passo 1: Escrever a migration**

Criar `supabase/migrations/0010_media_poster.sql`:

```sql
-- =====================================================================
-- 0010 — Capa do video
--
-- Rode DEPOIS do 0009. Idempotente: pode rodar de novo sem quebrar.
--
-- O CHECK espelha o que storage_path ja tem. Sem ele, a capa poderia
-- apontar para fora da pasta do restaurante -- a fronteira do inquilino
-- vale para todo caminho de arquivo, nao so para o principal.
-- =====================================================================

alter table public.menu_item_media
  add column if not exists poster_path text;

do $guard$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'menu_item_media_poster_prefix'
      and conrelid = 'public.menu_item_media'::regclass
  ) then
    alter table public.menu_item_media
      add constraint menu_item_media_poster_prefix
      check (poster_path is null or poster_path like restaurant_id::text || '/%');
  end if;
end
$guard$;
```

- [x] **Passo 2: Aplicar duas vezes no banco de prova**

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < supabase/migrations/0010_media_poster.sql
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < supabase/migrations/0010_media_poster.sql
```

Ambas precisam passar. A segunda prova a idempotência.

- [x] **Passo 3: Provar que o CHECK da capa funciona**

```bash
docker exec -i supabase_db_nfc-menu psql -U postgres -d postgres -c "update public.menu_item_media set poster_path = 'fora-da-pasta/capa.webp' where id = (select id from public.menu_item_media limit 1);"
```

Esperado: **erro** `menu_item_media_poster_prefix`. Se o update passar, a capa pode escapar da pasta do restaurante e o CHECK está errado.

Se não houver nenhuma linha em `menu_item_media`, rode antes `supabase/seed/dados-de-exemplo.sql` e o insert de mídia da Fase 0.

- [x] **Passo 4: Regenerar o arquivo único e os tipos**

```bash
bash supabase/build-schema.sh
npx supabase gen types typescript --local > src/domain/database.types.ts
```

**O `supabase/schema.sql` precisa ser colado no SQL Editor** — é a única vez nesta fase.

- [x] **Passo 5: Acrescentar `posterPath` ao schema de mídia**

Em `src/domain/media.ts`, dentro de `registerMediaSchema`, depois de `storagePath`:

```ts
  // So faz sentido quando kind = 'video'. Anulavel porque a captura pode
  // falhar, e falhar em capturar nao impede subir o video.
  posterPath: z.string().min(1).max(400).optional(),
```

- [x] **Passo 6: Acrescentar `posterPath` ao DTO público**

Em `src/domain/menu.ts`, dentro de `MenuMediaDTO`:

```ts
export type MenuMediaDTO = {
  kind: 'image' | 'video'
  storagePath: string
  posterPath: string | null
  altText: string | null
  durationMs: number | null
}
```

- [x] **Passo 7: Gravar e ler a capa na DAL**

Em `src/server/dal/media.ts`, dentro de `registerItemMedia`, no objeto passado ao `insert`, acrescentar depois de `storage_path`:

```ts
      poster_path: data.posterPath ?? null,
```

E em `src/server/dal/menu.ts`, no tipo `RawMedia`, acrescentar `poster_path: string | null`; no mapeamento de `media` dentro de `getPublicMenu`, acrescentar `posterPath: media.poster_path`; e na lista de colunas do `select` aninhado, trocar `menu_item_media ( kind, storage_path, alt_text, duration_ms, position )` por `menu_item_media ( kind, storage_path, poster_path, alt_text, duration_ms, position )`.

- [x] **Passo 8: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: nenhum erro.

- [x] **Passo 9: Arquivos alterados**

`supabase/migrations/0010_media_poster.sql` (novo), `supabase/schema.sql`, `src/domain/database.types.ts`, `src/domain/media.ts`, `src/domain/menu.ts`, `src/server/dal/media.ts`, `src/server/dal/menu.ts`. **Não commitar.**

---

## Tarefa 2: Autorização de envio, e a prova de que o envio simples funciona

Esta tarefa começa provando uma hipótese. Se a prova falhar, o plano B está descrito no Passo 2 e muda o resto da tarefa.

**Arquivos:**
- Modificar: `src/server/dal/media.ts`, `src/server/actions/media.ts`
- Criar: `src/lib/upload.ts`

**Interfaces:**
- Consome: `requireMember`, `MEDIA_LIMITS`
- Produz: `createUploadTicket({ itemId, kind, mimeType }) → { bucket, path, signedUrl }`; `createUploadTicketAction`; `uploadToSignedUrl(signedUrl, body: Blob, mimeType: string) → Promise<void>`

- [x] **Passo 1: Provar o contrato do envio assinado**

O cliente do Supabase tem dois caminhos internos para enviar a uma URL assinada. Com um `Blob`, ele monta um `FormData` com um campo de nome vazio — formato interno e frágil de replicar. Com corpo cru e `content-type`, ele faz um `PUT` simples, que é contrato padrão.

Queremos o segundo, porque é ele que nos permite enviar do navegador com `fetch` puro e **sem cliente Supabase no navegador**. Antes de construir em cima disso, prove.

Criar um arquivo temporário `prova-upload.mjs` na raiz:

```js
// Descartavel: prova que um PUT simples com corpo cru funciona numa URL
// assinada. Apagar depois de rodar.
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'

const status = execSync('npx supabase status', { encoding: 'utf8' })
const url = status.match(/API URL:\s*(\S+)/)[1]
const serviceKey = status.match(/service_role key:\s*(\S+)/)[1]

const supabase = createClient(url, serviceKey)
const caminho = `00000000-0000-0000-0000-000000000000/prova/${Date.now()}.webp`

const { data, error } = await supabase.storage
  .from('menu-images')
  .createSignedUploadUrl(caminho)

if (error) throw error
console.log('URL assinada obtida')

const bytes = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0])
const resposta = await fetch(data.signedUrl, {
  method: 'PUT',
  headers: { 'content-type': 'image/webp', 'cache-control': 'max-age=3600' },
  body: bytes,
})

console.log('PUT respondeu:', resposta.status)
if (!resposta.ok) console.log(await resposta.text())

const { data: lista } = await supabase.storage
  .from('menu-images')
  .list('00000000-0000-0000-0000-000000000000/prova')
console.log('arquivo gravado:', (lista ?? []).length > 0)

await supabase.storage.from('menu-images').remove([caminho])
```

Rodar:

```bash
node prova-upload.mjs
```

Esperado: `PUT respondeu: 200` e `arquivo gravado: true`.

A chave de serviço aparece aqui só porque este é um script de terminal descartável, nunca a aplicação. Isso não contradiz a decisão D6 da Fase 0, que é sobre o ambiente da aplicação.

- [x] **Passo 2: Decidir com base no resultado**

**Se a prova passou:** apague `prova-upload.mjs` e siga. O navegador vai enviar com `fetch` puro, e nenhum cliente Supabase entra no pacote do navegador.

```bash
rm prova-upload.mjs
```

**Se a prova falhou:** pare e reporte. O plano B é instalar um cliente de navegador — criar `src/lib/supabase-browser.ts` com `createBrowserClient` de `@supabase/ssr`, acrescentá-lo ao `ignores` da regra de import no `eslint.config.mjs`, e usar `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)`. Custa uns 30 KB no pacote do navegador e uma exceção documentada na regra. **Não siga sem avisar:** a spec vendeu "sem cliente Supabase no navegador" como benefício, e trocar isso é desvio que o cliente precisa saber.

- [x] **Passo 3: Substituir `buildUploadPath` por `createUploadTicket`**

Em `src/server/dal/media.ts`, trocar a função inteira `buildUploadPath` por:

```ts
export async function createUploadTicket(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<{ bucket: string; path: string; signedUrl: string }> {
  const itemId = uuidSchema.parse(input.itemId)

  const limits = MEDIA_LIMITS[input.kind]
  if (!(limits.mimes as readonly string[]).includes(input.mimeType)) {
    throw new UserFacingError('Formato de arquivo não aceito.')
  }

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', itemId)
    .single()

  if (error || !data) throw new UserFacingError('Item não encontrado.')
  const restaurantId = data.restaurant_id
  await requireMember(restaurantId)

  const extension = EXTENSION_BY_MIME[input.mimeType]
  // O caminho e montado no SERVIDOR, a partir do restaurante resolvido no
  // servidor. O navegador nunca escolhe onde grava: o prefixo do caminho e
  // a fronteira do inquilino, e deixar o cliente decidi-lo anularia a
  // politica de storage inteira.
  const path = `${restaurantId}/${itemId}/${randomUUID()}.${extension}`

  // A assinatura tambem passa pela RLS do storage: se esta sessao nao
  // puder escrever neste caminho, o Supabase recusa aqui.
  const { data: ticket, error: signError } = await supabase.storage
    .from(limits.bucket)
    .createSignedUploadUrl(path)

  if (signError || !ticket) {
    throw new UserFacingError('Não foi possível autorizar o envio.')
  }

  return { bucket: limits.bucket, path, signedUrl: ticket.signedUrl }
}
```

Acrescentar `UserFacingError` ao import de `./auth`.

- [x] **Passo 4: Trocar a action correspondente**

Em `src/server/actions/media.ts`, substituir `buildUploadPathAction` por:

```ts
export async function createUploadTicketAction(input: {
  itemId: string
  kind: MediaKind
  mimeType: string
}): Promise<ActionResult<{ bucket: string; path: string; signedUrl: string }>> {
  return runAction(() => dal.createUploadTicket(input))
}
```

- [x] **Passo 5: Criar o utilitário de envio do navegador**

`src/lib/upload.ts`:

```ts
// Utilitario de NAVEGADOR. Nao importa nada de @/server e nao conhece
// Supabase: a URL assinada carrega a propria autorizacao, entao um fetch
// basta. E isso que mantem @supabase/* fora do pacote do navegador.

// Aceita Blob, nao File: a capa do video e gerada por canvas e sai como
// Blob puro, sem nome nem tipo proprio. Por isso o mimeType vem separado.
export async function uploadToSignedUrl(
  signedUrl: string,
  body: Blob,
  mimeType: string,
): Promise<void> {
  // Corpo CRU, com content-type. Mandar o proprio Blob faria o Supabase
  // esperar um FormData de formato interno; o caminho de corpo cru e o
  // contrato estavel.
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'content-type': mimeType,
      'cache-control': 'max-age=3600',
    },
    body: await body.arrayBuffer(),
  })

  if (!response.ok) {
    throw new Error('Falha ao enviar o arquivo.')
  }
}
```

- [x] **Passo 6: Verificar**

```bash
pnpm exec tsc --noEmit
```

Esperado: um erro em `src/server/actions/media.ts` **só se** algum arquivo ainda chamar `buildUploadPathAction`. Como nada da Fase 1 usa mídia, deve passar limpo. Qualquer outro erro é real.

- [x] **Passo 7: Arquivos alterados**

`src/lib/upload.ts` (novo), `src/server/dal/media.ts`, `src/server/actions/media.ts`. **Não commitar.**

---

## Tarefa 3: A visão do dono e a rota do cardápio

O CMS precisa enxergar o cardápio **inteiro**, inclusive o que está oculto — e `getPublicMenu` filtra exatamente isso. Falta a função equivalente para quem edita.

**Arquivos:**
- Modificar: `src/domain/menu.ts`, `src/server/dal/menu.ts`, `src/app/painel/page.tsx`
- Criar: `src/app/painel/restaurantes/[id]/page.tsx`, `src/app/painel/restaurantes/[id]/loading.tsx`
- Criar: `src/components/cardapio/reorder-buttons.tsx`

**Interfaces:**
- Consome: `requireMember`, `getRestaurantForMember`
- Produz: `OwnerMenuCategoryDTO`, `OwnerMenuItemDTO`, `getMenuForOwner(restaurantId)`, `<ReorderButtons onUp onDown isFirst isLast disabled label />`

- [x] **Passo 1: Acrescentar os DTOs do dono**

Em `src/domain/menu.ts`, no fim:

```ts
// Espelha o PublicMenuDTO, mas expoe as bandeiras de visibilidade e nao
// filtra nada: quem edita precisa ver o que o cliente nao ve.
export type OwnerMenuItemDTO = {
  id: string
  // Necessario para o seletor de categoria do dialogo de edicao saber
  // qual opcao ja esta escolhida.
  categoryId: string
  name: string
  description: string | null
  basePriceCents: number
  isAvailable: boolean
  isVisible: boolean
  position: number
  dietaryTags: string[]
  variants: {
    id: string
    name: string
    priceCents: number
    isAvailable: boolean
  }[]
  media: {
    id: string
    kind: 'image' | 'video'
    storagePath: string
    posterPath: string | null
    altText: string | null
  }[]
}

export type OwnerMenuCategoryDTO = {
  id: string
  name: string
  description: string | null
  position: number
  isVisible: boolean
  items: OwnerMenuItemDTO[]
}
```

- [x] **Passo 2: Escrever `getMenuForOwner`**

Em `src/server/dal/menu.ts`, acrescentar ao import de `@/domain/menu` os tipos `OwnerMenuCategoryDTO` e `OwnerMenuItemDTO`, e acrescentar a função depois de `getPublicMenu`:

```ts
export async function getMenuForOwner(
  restaurantId: unknown,
): Promise<OwnerMenuCategoryDTO[]> {
  const id = uuidSchema.parse(restaurantId)
  await requireMember(id)

  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_categories')
    .select(
      `id, name, description, position, is_visible,
       menu_items (
         id, name, description, base_price_cents, is_available, is_visible,
         position, dietary_tags,
         menu_item_variants ( id, name, price_cents, is_available, position ),
         menu_item_media ( id, kind, storage_path, poster_path, alt_text, position )
       )`,
    )
    .eq('restaurant_id', id)
    .order('position')

  if (error) {
    throw new Error(`Não foi possível carregar o cardápio: ${error.message}`)
  }

  // Sem filtro de visibilidade, ao contrario de getPublicMenu. A ordenacao
  // dos aninhados vem em JavaScript porque o PostgREST ordena o nivel de
  // cima, mas nao os embutidos.
  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    position: category.position,
    isVisible: category.is_visible,
    items: (category.menu_items ?? [])
      .sort((a, b) => a.position - b.position)
      .map((item): OwnerMenuItemDTO => ({
        id: item.id,
        categoryId: category.id,
        name: item.name,
        description: item.description,
        basePriceCents: item.base_price_cents,
        isAvailable: item.is_available,
        isVisible: item.is_visible,
        position: item.position,
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
            id: media.id,
            kind: media.kind,
            storagePath: media.storage_path,
            posterPath: media.poster_path,
            altText: media.alt_text,
          })),
      })),
  }))
}
```

- [x] **Passo 3: Fazer a raiz do painel decidir sozinha**

Substituir o corpo de `src/app/painel/page.tsx`. O import de `redirect` entra no topo:

```tsx
import { redirect } from 'next/navigation'
```

E o componente passa a ser:

```tsx
export default async function Page() {
  await requireUser()
  const restaurants = await listMyRestaurants()

  // Uma tela de escolha com um item so e um clique que nao escolhe nada.
  // O desvio acontece no servidor, antes de renderizar, entao a lista nem
  // chega a piscar.
  if (restaurants.length === 1) {
    redirect(`/restaurantes/${restaurants[0].id}`)
  }

  return (
    // ... o resto do componente permanece como está, com a lista e o vazio
  )
}
```

Trocar cada `<Item key={...} variant="outline">` por uma versão clicável, envolvendo o conteúdo num link:

```tsx
            <Item key={restaurant.id} variant="outline">
              <ItemContent>
                <ItemTitle>
                  <Link
                    href={`/restaurantes/${restaurant.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {restaurant.name}
                  </Link>
                </ItemTitle>
                <ItemDescription>
                  {env.NEXT_PUBLIC_ROOT_DOMAIN}/{restaurant.slug}
                </ItemDescription>
              </ItemContent>
            </Item>
```

Acrescentar `import Link from 'next/link'` no topo, e remover a frase "A edição do cardápio chega na próxima etapa" — ela deixou de ser verdade.

- [x] **Passo 4: Criar os botões de reordenar**

`src/components/cardapio/reorder-buttons.tsx`:

```tsx
'use client'

import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ReorderButtons({
  label,
  isFirst,
  isLast,
  disabled,
  onUp,
  onDown,
}: {
  label: string
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
  onUp: () => void
  onDown: () => void
}) {
  return (
    <div className="flex items-center">
      {/* A primeira linha nao ganha seta para cima, em vez de ganhar uma
          desabilitada -- botao morto parece defeito. O espaco e reservado
          para as linhas nao dancarem de largura. */}
      {isFirst ? (
        <span className="size-9" aria-hidden="true" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onUp}
          aria-label={`Mover ${label} para cima`}
        >
          <ChevronUpIcon className="size-4" />
        </Button>
      )}

      {isLast ? (
        <span className="size-9" aria-hidden="true" />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={onDown}
          aria-label={`Mover ${label} para baixo`}
        >
          <ChevronDownIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}
```

- [x] **Passo 5: Criar a página do cardápio, ainda sem as seções**

`src/app/painel/restaurantes/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uuidSchema } from '@/domain/common'
import { requireUser } from '@/server/dal/auth'
import { getMenuForOwner } from '@/server/dal/menu'
import { getRestaurantForMember } from '@/server/dal/restaurants'
import { env } from '@/server/env'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUser()

  const { id } = await params
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) notFound()

  const restaurant = await getRestaurantForMember(parsed.data)
  // Restaurante de outra pessoa cai em 404, nao em "sem permissao": nao
  // confirmamos nem que o id existe.
  if (!restaurant) notFound()

  const categories = await getMenuForOwner(restaurant.id)

  const publicUrl = `http://${env.NEXT_PUBLIC_ROOT_DOMAIN}/${restaurant.slug}`

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">{restaurant.name}</h1>
          <p className="text-muted-foreground">
            {categories.length}{' '}
            {categories.length === 1 ? 'categoria' : 'categorias'}
          </p>
        </div>
        <Button
          variant="outline"
          render={
            <Link href={publicUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          <ExternalLinkIcon className="size-4" />
          Ver cardápio público
        </Button>
      </div>

      {/* As seções entram na Tarefa 4. */}
      <p className="text-muted-foreground">
        {categories.length} categorias carregadas.
      </p>
    </main>
  )
}
```

- [x] **Passo 6: Criar o esqueleto de carregamento**

`src/app/painel/restaurantes/[id]/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-52" />
      </div>
      <div className="space-y-6">
        {[0, 1].map((block) => (
          <Skeleton key={block} className="h-40 w-full" />
        ))}
      </div>
    </main>
  )
}
```

- [x] **Passo 7: Verificar**

```bash
pnpm exec tsc --noEmit
```

Com `pnpm dev` rodando e autenticado no painel: a raiz leva direto ao cardápio do restaurante, sem passar por lista. A página mostra o nome, a contagem de categorias e o botão de ver o público. Um id inválido, como `/restaurantes/abc`, cai em 404.

Um id de restaurante que existe mas **não é seu** também precisa cair em 404. Se você tiver só um restaurante, pegue um id de outro no console do administrador para testar.

- [x] **Passo 8: Arquivos alterados**

`src/components/cardapio/reorder-buttons.tsx`, `src/app/painel/restaurantes/[id]/page.tsx`, `loading.tsx` (novos), `src/domain/menu.ts`, `src/server/dal/menu.ts`, `src/app/painel/page.tsx`. **Não commitar.**

---

## Tarefa 4: Categorias

**Arquivos:**
- Criar: `src/components/cardapio/category-dialog.tsx`, `src/components/cardapio/category-section.tsx`
- Modificar: `src/app/painel/restaurantes/[id]/page.tsx`

**Interfaces:**
- Consome: `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`, `reorderCategoriesAction`, `<ReorderButtons>`
- Produz: `<CategoryDialog restaurantId category? trigger>`, `<CategorySection category index total allCategories>`

- [x] **Passo 1: Criar o diálogo de categoria**

Serve para criar e para editar — a diferença é receber ou não uma categoria.

`src/components/cardapio/category-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import {
  createCategoryAction,
  updateCategoryAction,
} from '@/server/actions/menu'

type Category = {
  id: string
  name: string
  description: string | null
  isVisible: boolean
}

export function CategoryDialog({
  restaurantId,
  category,
  trigger,
}: {
  restaurantId: string
  category?: Category
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(category?.isVisible ?? true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)

    const name = formData.get('name')
    const description = formData.get('description') || undefined

    const result = category
      ? await updateCategoryAction({
          categoryId: category.id,
          name,
          description,
          isVisible: visible,
        })
      : await createCategoryAction({ restaurantId, name, description })

    setPending(false)

    if (result.ok) {
      toast.add({
        title: category ? 'Categoria salva' : 'Categoria criada',
        type: 'success',
      })
      setOpen(false)
      return
    }
    setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
          <DialogDescription>
            Categorias agrupam os pratos no cardápio.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cat-name">Nome</FieldLabel>
              <Input
                id="cat-name"
                name="name"
                defaultValue={category?.name}
                placeholder="Entradas"
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cat-description">Descrição</FieldLabel>
              <Textarea
                id="cat-description"
                name="description"
                rows={2}
                defaultValue={category?.description ?? ''}
              />
            </Field>

            {category ? (
              <Field>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel htmlFor="cat-visible">
                    Visível no cardápio
                  </FieldLabel>
                  <Switch
                    id="cat-visible"
                    checked={visible}
                    onCheckedChange={(next) => setVisible(next)}
                  />
                </div>
              </Field>
            ) : null}
          </FieldGroup>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              {category ? 'Salvar' : 'Criar categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

`isVisible` só aparece na edição: uma categoria recém-criada sempre nasce visível, e perguntar isso na criação é uma decisão a mais num momento em que a pessoa só quer digitar um nome.

- [x] **Passo 2: Criar a seção de categoria**

`src/components/cardapio/category-section.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { EyeOffIcon, MoreVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuCategoryDTO } from '@/domain/menu'
import {
  deleteCategoryAction,
  reorderCategoriesAction,
} from '@/server/actions/menu'
import type { ActionResult } from '@/server/actions/result'
import { CategoryDialog } from './category-dialog'
import { ReorderButtons } from './reorder-buttons'

export function CategorySection({
  restaurantId,
  category,
  index,
  all,
  children,
}: {
  restaurantId: string
  category: OwnerMenuCategoryDTO
  index: number
  all: OwnerMenuCategoryDTO[]
  children: React.ReactNode
}) {
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult>, done: string) {
    startTransition(async () => {
      const result = await action()
      toast.add(
        result.ok
          ? { title: done, type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  function move(direction: -1 | 1) {
    // Troca de lugar com o vizinho e reenvia a lista inteira na nova ordem.
    // Reordenacao e rara e barata; nao vale otimizar para enviar so o par.
    const reordered = [...all]
    const target = index + direction
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]

    run(
      () =>
        reorderCategoriesAction({
          restaurantId,
          order: reordered.map((item, position) => ({
            id: item.id,
            position,
          })),
        }),
      'Ordem atualizada',
    )
  }

  return (
    <section className="rounded-lg border border-border">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="mr-auto">
          <h2 className="text-xl font-semibold">
            {category.name}
            {/* Oculta e dito por escrito, nao so pelo esmaecimento. */}
            {!category.isVisible ? (
              <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                Oculta
              </span>
            ) : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            {category.items.length}{' '}
            {category.items.length === 1 ? 'item' : 'itens'}
          </p>
        </div>

        <ReorderButtons
          label={`categoria ${category.name}`}
          isFirst={index === 0}
          isLast={index === all.length - 1}
          disabled={pending}
          onUp={() => move(-1)}
          onDown={() => move(1)}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ações da categoria ${category.name}`}
              />
            }
          >
            <MoreVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <CategoryDialog
              restaurantId={restaurantId}
              category={{
                id: category.id,
                name: category.name,
                description: category.description,
                isVisible: category.isVisible,
              }}
              trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <PencilIcon className="size-4" />
                  Editar
                </DropdownMenuItem>
              }
            />

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <DropdownMenuItem onSelect={(event) => event.preventDefault()} />
                }
              >
                <Trash2Icon className="size-4" />
                Excluir
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Excluir a categoria {category.name}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {category.items.length > 0
                      ? `Os ${category.items.length} itens dentro dela também serão excluídos. Isto não pode ser desfeito.`
                      : 'Isto não pode ser desfeito.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      run(
                        () => deleteCategoryAction(category.id),
                        'Categoria excluída',
                      )
                    }
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {children}
    </section>
  )
}
```

O aviso de exclusão **conta quantos itens vão junto**. O banco apaga em cascata; dizer só "isto não pode ser desfeito" esconderia o tamanho real do estrago.

O ícone de ocultar (`EyeOffIcon`) fica importado para a Tarefa 5, que o usa na linha do item.

- [x] **Passo 3: Ligar as seções na página**

Em `src/app/painel/restaurantes/[id]/page.tsx`, acrescentar os imports:

```tsx
import { UtensilsCrossedIcon } from 'lucide-react'
import { CategoryDialog } from '@/components/cardapio/category-dialog'
import { CategorySection } from '@/components/cardapio/category-section'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
```

Trocar o botão do cabeçalho por dois, e o parágrafo temporário pela lista:

```tsx
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={
              <Link href={publicUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLinkIcon className="size-4" />
            Ver cardápio público
          </Button>
          {categories.length > 0 ? (
            <CategoryDialog
              restaurantId={restaurant.id}
              trigger={<Button>Nova categoria</Button>}
            />
          ) : null}
        </div>
      </div>

      {categories.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UtensilsCrossedIcon />
            </EmptyMedia>
            <EmptyTitle>Cardápio vazio</EmptyTitle>
            <EmptyDescription>
              Comece criando uma categoria, como Entradas ou Bebidas.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CategoryDialog
              restaurantId={restaurant.id}
              trigger={<Button>Criar primeira categoria</Button>}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-6">
          {categories.map((category, index) => (
            <CategorySection
              key={category.id}
              restaurantId={restaurant.id}
              category={category}
              index={index}
              all={categories}
            >
              {/* Os itens entram na Tarefa 5. */}
              <p className="px-4 py-6 text-muted-foreground">
                {category.items.length} itens.
              </p>
            </CategorySection>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [x] **Passo 4: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador, no cardápio do restaurante:

1. Cardápio vazio mostra o estado vazio com o botão de criar dentro.
2. Criar "Entradas" e "Bebidas" — as duas aparecem como seções.
3. A seta para cima não existe na primeira; a de baixo não existe na última.
4. Mover "Bebidas" para cima inverte a ordem, e a ordem persiste depois de recarregar.
5. Editar "Entradas" e desmarcar "Visível no cardápio" faz aparecer a palavra **Oculta** ao lado do nome.
6. Excluir uma categoria vazia pede confirmação sem mencionar itens.

- [x] **Passo 5: Arquivos alterados**

`src/components/cardapio/category-dialog.tsx`, `category-section.tsx` (novos), `src/app/painel/restaurantes/[id]/page.tsx`. **Não commitar.**

---

## Tarefa 5: Itens na lista

**Arquivos:**
- Criar: `src/lib/media-url.ts`, `src/components/cardapio/item-create-dialog.tsx`, `src/components/cardapio/item-row.tsx`
- Modificar: `src/app/painel/restaurantes/[id]/page.tsx`

**Interfaces:**
- Consome: `createItemAction`, `deleteItemAction`, `reorderItemsAction`, `setItemAvailabilityAction`, `<ReorderButtons>`, `formatPriceBRL`
- Produz: `publicMediaUrl(kind, path)`, `<ItemCreateDialog restaurantId categoryId trigger>`, `<ItemRow restaurantId item index all>`

- [x] **Passo 1: Criar o montador de URL de mídia**

`src/lib/media-url.ts`:

```ts
import { MEDIA_LIMITS, type MediaKind } from '@/domain/media'

// Os buckets sao publicos para leitura -- o cardapio e publico -- entao a
// URL e previsivel e nao precisa ser assinada a cada exibicao.
export function publicMediaUrl(kind: MediaKind, path: string): string {
  const bucket = MEDIA_LIMITS[kind].bucket
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}
```

Este arquivo lê `process.env.NEXT_PUBLIC_SUPABASE_URL` direto, e não `@/server/env`, porque roda também no navegador — e `env.ts` é `server-only`. O prefixo `NEXT_PUBLIC_` é o que torna isso possível.

- [x] **Passo 2: Criar o diálogo de novo item**

Campos mínimos, por decisão C6: mídia precisa do id do item, que ainda não existe.

`src/components/cardapio/item-create-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { createItemAction } from '@/server/actions/menu'

export function ItemCreateDialog({
  restaurantId,
  categoryId,
  trigger,
}: {
  restaurantId: string
  categoryId: string
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)

    const reais = String(formData.get('price') ?? '').replace(',', '.')
    const cents = Math.round(Number(reais) * 100)

    if (!Number.isFinite(cents) || cents < 0) {
      setPending(false)
      setError('Informe um preço válido, como 18,90.')
      return
    }

    const result = await createItemAction({
      restaurantId,
      categoryId,
      name: formData.get('name'),
      basePriceCents: cents,
      dietaryTags: [],
    })

    setPending(false)

    if (result.ok) {
      toast.add({ title: 'Item criado', type: 'success' })
      setOpen(false)
      return
    }
    setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo item</DialogTitle>
          <DialogDescription>
            Descrição, variações e fotos você acrescenta depois, editando o
            item.
          </DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="item-name">Nome</FieldLabel>
              <Input
                id="item-name"
                name="name"
                placeholder="Pão de alho"
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="item-price">Preço</FieldLabel>
              <Input
                id="item-price"
                name="price"
                inputMode="decimal"
                placeholder="18,90"
                required
              />
              <FieldDescription>Em reais, como 18,90.</FieldDescription>
            </Field>
          </FieldGroup>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              Criar item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

O preço é digitado em reais e convertido para centavos aqui, na borda. O `Math.round` importa: `19.9 * 100` em ponto flutuante dá `1989.9999...`, e truncar produziria R$ 19,89 silenciosamente.

- [x] **Passo 3: Criar a linha do item**

`src/components/cardapio/item-row.tsx`:

```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { ImageIcon, MoreVerticalIcon, Trash2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'
import { publicMediaUrl } from '@/lib/media-url'
import {
  deleteItemAction,
  reorderItemsAction,
  setItemAvailabilityAction,
} from '@/server/actions/menu'
import type { ActionResult } from '@/server/actions/result'
import { ReorderButtons } from './reorder-buttons'

export function ItemRow({
  restaurantId,
  item,
  index,
  all,
}: {
  restaurantId: string
  item: OwnerMenuItemDTO
  index: number
  all: OwnerMenuItemDTO[]
}) {
  const [pending, startTransition] = useTransition()
  // Atualizacao otimista: no meio do servico, esperar a ida e volta ao
  // servidor para ver o interruptor mudar e inaceitavel.
  const [available, setAvailable] = useOptimistic(item.isAvailable)

  const thumb = item.media.find((media) => media.kind === 'image')

  function run(action: () => Promise<ActionResult>, done: string) {
    startTransition(async () => {
      const result = await action()
      toast.add(
        result.ok
          ? { title: done, type: 'success' }
          : { title: result.error, type: 'error' },
      )
    })
  }

  function toggleAvailability(next: boolean) {
    startTransition(async () => {
      setAvailable(next)
      const result = await setItemAvailabilityAction({
        itemId: item.id,
        isAvailable: next,
      })
      // Falhou: o useOptimistic reverte sozinho quando a transicao acaba
      // sem o servidor ter confirmado. So precisamos avisar.
      if (!result.ok) {
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  function move(direction: -1 | 1) {
    const reordered = [...all]
    const target = index + direction
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]

    run(
      () =>
        reorderItemsAction({
          restaurantId,
          order: reordered.map((entry, position) => ({
            id: entry.id,
            position,
          })),
        }),
      'Ordem atualizada',
    )
  }

  return (
    <div className="flex min-h-14 flex-wrap items-center gap-3 border-b border-border px-4 py-2 last:border-b-0">
      {/* Miniatura com img simples, nao next/image: o CMS nao e a superficie
          critica de desempenho, e usar next/image exigiria configurar
          remotePatterns para um host que muda por ambiente. */}
      {thumb ? (
        <img
          src={publicMediaUrl('image', thumb.storagePath)}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          className="size-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <ImageIcon className="size-4" aria-hidden="true" />
        </span>
      )}

      <div className="mr-auto min-w-0">
        <p className="truncate font-medium">
          {item.name}
          {!item.isVisible ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Oculto
            </span>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPriceBRL(item.basePriceCents)}
          {item.variants.length > 0
            ? ` · ${item.variants.length} ${item.variants.length === 1 ? 'variação' : 'variações'}`
            : ''}
        </p>
      </div>

      {/* A unica acao pensada para o polegar: sem dialogo, sem confirmacao,
          retorno imediato. E o que se faz no meio do servico. */}
      <label className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {available ? 'Disponível' : 'Esgotado'}
        </span>
        <Switch
          checked={available}
          disabled={pending}
          onCheckedChange={(next) => toggleAvailability(next)}
          aria-label={`${item.name} disponível`}
        />
      </label>

      <ReorderButtons
        label={`item ${item.name}`}
        isFirst={index === 0}
        isLast={index === all.length - 1}
        disabled={pending}
        onUp={() => move(-1)}
        onDown={() => move(1)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Ações do item ${item.name}`}
            />
          }
        >
          <MoreVerticalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* O item de editar entra na Tarefa 6. */}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()} />
              }
            >
              <Trash2Icon className="size-4" />
              Excluir
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {item.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  As variações e as fotos deste item saem junto. Isto não pode
                  ser desfeito.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    run(() => deleteItemAction(item.id), 'Item excluído')
                  }
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

- [x] **Passo 4: Ligar os itens dentro das seções**

Em `src/app/painel/restaurantes/[id]/page.tsx`, acrescentar os imports:

```tsx
import { PlusIcon } from 'lucide-react'
import { ItemCreateDialog } from '@/components/cardapio/item-create-dialog'
import { ItemRow } from '@/components/cardapio/item-row'
```

E trocar o parágrafo temporário dentro de `<CategorySection>` por:

```tsx
              {category.items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="mb-4 text-muted-foreground">
                    Nenhum item nesta categoria.
                  </p>
                  <ItemCreateDialog
                    restaurantId={restaurant.id}
                    categoryId={category.id}
                    trigger={
                      <Button variant="outline">
                        <PlusIcon className="size-4" />
                        Adicionar o primeiro item
                      </Button>
                    }
                  />
                </div>
              ) : (
                <>
                  {category.items.map((item, itemIndex) => (
                    <ItemRow
                      key={item.id}
                      restaurantId={restaurant.id}
                      item={item}
                      index={itemIndex}
                      all={category.items}
                    />
                  ))}
                  <div className="px-4 py-3">
                    <ItemCreateDialog
                      restaurantId={restaurant.id}
                      categoryId={category.id}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <PlusIcon className="size-4" />
                          Adicionar item
                        </Button>
                      }
                    />
                  </div>
                </>
              )}
```

- [x] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador:

1. Categoria vazia oferece "Adicionar o primeiro item".
2. Criar um item com preço `18,90` mostra **R$ 18,90** na linha. Se aparecer R$ 18,89, o arredondamento está errado.
3. O interruptor muda **na hora**, sem esperar o servidor, e o texto ao lado alterna entre Disponível e Esgotado.
4. Recarregar a página mantém o estado do interruptor.
5. Criar três itens e mover o do meio para cima reordena, e a ordem persiste.
6. Excluir um item pede confirmação mencionando variações e fotos.

O item 3 é o ponto da tarefa: essa é a ação que acontece no meio do serviço.

- [x] **Passo 6: Arquivos alterados**

`src/lib/media-url.ts`, `src/components/cardapio/item-create-dialog.tsx`, `item-row.tsx` (novos), `src/app/painel/restaurantes/[id]/page.tsx`. **Não commitar.**

---

## Tarefa 6: Editar item — dados e variações

**Arquivos:**
- Criar: `src/components/cardapio/variants-editor.tsx`, `src/components/cardapio/item-edit-dialog.tsx`
- Modificar: `src/components/cardapio/item-row.tsx`

**Interfaces:**
- Consome: `updateItemAction`, `createVariantAction`, `updateVariantAction`, `deleteVariantAction`
- Produz: `<VariantsEditor itemId variants>`, `<ItemEditDialog item categories trigger>`

- [x] **Passo 1: Criar o editor de variações**

`src/components/cardapio/variants-editor.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'
import {
  createVariantAction,
  deleteVariantAction,
} from '@/server/actions/menu'

export function VariantsEditor({
  itemId,
  variants,
}: {
  itemId: string
  variants: OwnerMenuItemDTO['variants']
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add() {
    const cents = Math.round(Number(price.replace(',', '.')) * 100)
    if (!name.trim()) {
      setError('Informe o nome da variação.')
      return
    }
    if (!Number.isFinite(cents) || cents < 0) {
      setError('Informe um preço válido, como 24,90.')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createVariantAction({
        itemId,
        name: name.trim(),
        priceCents: cents,
      })
      if (result.ok) {
        setName('')
        setPrice('')
        toast.add({ title: 'Variação adicionada', type: 'success' })
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem variações. Use para tamanhos, como Pizza P, M e G.
        </p>
      ) : (
        <ul className="space-y-2">
          {variants.map((variant) => (
            <li
              key={variant.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <span className="mr-auto">{variant.name}</span>
              <span className="text-muted-foreground">
                {formatPriceBRL(variant.priceCents)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`Remover variação ${variant.name}`}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteVariantAction(variant.id)
                    if (!result.ok) {
                      toast.add({ title: result.error, type: 'error' })
                    }
                  })
                }
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tamanho G"
          aria-label="Nome da variação"
          className="min-w-40 flex-1"
        />
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          placeholder="24,90"
          aria-label="Preço da variação"
          className="w-28"
        />
        <Button type="button" variant="outline" disabled={pending} onClick={add}>
          {pending ? <Spinner className="size-4" /> : <PlusIcon className="size-4" />}
          Adicionar
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

As variações são salvas **na hora**, uma a uma, e não junto com o formulário do item. São entidades próprias no banco, e fingir que fazem parte do formulário criaria o problema de sincronizar duas fontes de verdade dentro de um diálogo.

- [x] **Passo 2: Criar o diálogo de edição**

`src/components/cardapio/item-edit-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuCategoryDTO, OwnerMenuItemDTO } from '@/domain/menu'
import { updateItemAction } from '@/server/actions/menu'
import { VariantsEditor } from './variants-editor'

export function ItemEditDialog({
  item,
  categories,
  trigger,
}: {
  item: OwnerMenuItemDTO
  categories: OwnerMenuCategoryDTO[]
  trigger: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(item.isVisible)
  const [available, setAvailable] = useState(item.isAvailable)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)

    const cents = Math.round(
      Number(String(formData.get('price') ?? '').replace(',', '.')) * 100,
    )
    if (!Number.isFinite(cents) || cents < 0) {
      setPending(false)
      setError('Informe um preço válido, como 18,90.')
      return
    }

    const result = await updateItemAction({
      itemId: item.id,
      categoryId: formData.get('categoryId'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      basePriceCents: cents,
      dietaryTags: item.dietaryTags,
      isVisible: visible,
      isAvailable: available,
    })

    setPending(false)

    if (result.ok) {
      toast.add({ title: 'Item salvo', type: 'success' })
      setOpen(false)
      return
    }
    setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />

      {/* Rola por dentro e mantem o rodape fixo, para os botoes nao sumirem
          no fim do rolamento -- especialmente no celular. */}
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar item</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>

        <form action={submit} className="space-y-8">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-category">Categoria</FieldLabel>
              <NativeSelect id="edit-category" name="categoryId" defaultValue="">
                {categories.map((category) => (
                  <NativeSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                Trocar a categoria move o item no cardápio.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-name">Nome</FieldLabel>
              <Input id="edit-name" name="name" defaultValue={item.name} required />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-description">Descrição</FieldLabel>
              <Textarea
                id="edit-description"
                name="description"
                rows={3}
                defaultValue={item.description ?? ''}
              />
              <FieldDescription>
                Texto simples. Não são aceitos os caracteres menor e maior.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-price">Preço</FieldLabel>
              <Input
                id="edit-price"
                name="price"
                inputMode="decimal"
                defaultValue={(item.basePriceCents / 100).toFixed(2).replace('.', ',')}
                required
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="edit-visible">Visível no cardápio</FieldLabel>
                <Switch
                  id="edit-visible"
                  checked={visible}
                  onCheckedChange={(next) => setVisible(next)}
                />
              </div>
            </Field>

            <Field>
              <div className="flex items-center justify-between gap-4">
                <FieldLabel htmlFor="edit-available">Disponível</FieldLabel>
                <Switch
                  id="edit-available"
                  checked={available}
                  onCheckedChange={(next) => setAvailable(next)}
                />
              </div>
            </Field>
          </FieldGroup>

          <div>
            <h3 className="mb-4 text-base font-semibold">Variações</h3>
            <VariantsEditor itemId={item.id} variants={item.variants} />
          </div>

          {/* A seção de mídia entra na Tarefa 7. */}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner className="size-4" /> : null}
              Salvar item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Atenção ao seletor de categoria.** `updateItemSchema` da Fase 0 **não** aceita `categoryId` — ele foi escrito com `.omit({ restaurantId: true, categoryId: true })`. Então o campo acima está na tela mas não é enviado, e trocar a categoria não funcionaria.

Para fazer funcionar, no Passo 3 o schema e a DAL precisam aceitar a troca.

- [x] **Passo 3: Permitir trocar a categoria de um item**

Em `src/domain/menu.ts`, trocar `updateItemSchema` por:

```ts
export const updateItemSchema = createItemSchema
  .omit({ restaurantId: true })
  .extend({
    itemId: uuidSchema,
    isVisible: z.boolean(),
    isAvailable: z.boolean(),
  })
```

Ou seja: `categoryId` deixa de ser omitido. Em `src/server/dal/menu.ts`, dentro de `updateItem`, acrescentar ao objeto do `update`:

```ts
      category_id: data.categoryId,
```

Mover um item para a categoria de **outro restaurante** continua impossível: quem recusa é a chave estrangeira composta da Fase 0, não um `if` aqui.

No diálogo, trocar `defaultValue=""` do seletor por `defaultValue={item.categoryId}`. O campo `categoryId` já existe no `OwnerMenuItemDTO` desde a Tarefa 3, justamente para isto.

- [x] **Passo 4: Ligar o editar no menu da linha**

Em `src/components/cardapio/item-row.tsx`: acrescentar `PencilIcon` ao import de `lucide-react`, importar `ItemEditDialog` e o tipo `OwnerMenuCategoryDTO`, e acrescentar `categories: OwnerMenuCategoryDTO[]` às props do componente.

No `DropdownMenuContent`, antes do `AlertDialog`, acrescentar:

```tsx
          <ItemEditDialog
            item={item}
            categories={categories}
            trigger={
              <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                <PencilIcon className="size-4" />
                Editar
              </DropdownMenuItem>
            }
          />
```

E na página, passar `categories={categories}` a cada `<ItemRow>`.

- [x] **Passo 5: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador:

1. Editar um item abre o diálogo com os valores preenchidos e o preço no formato brasileiro.
2. Mudar nome e preço, salvar, e a lista refletir.
3. Adicionar uma variação "Tamanho G" por 24,90 — ela aparece na hora e a linha do item passa a mostrar "1 variação".
4. Remover a variação funciona.
5. **Trocar a categoria do item move ele de seção** depois de salvar. Se não mover, o Passo 3 não foi aplicado inteiro.
6. Digitar `<script>` na descrição devolve erro de validação do Zod, sem chegar ao banco.

- [x] **Passo 6: Arquivos alterados**

`src/components/cardapio/variants-editor.tsx`, `item-edit-dialog.tsx` (novos), `src/components/cardapio/item-row.tsx`, `src/domain/menu.ts`, `src/server/dal/menu.ts`, `src/app/painel/restaurantes/[id]/page.tsx`. **Não commitar.**

---

## Tarefa 6.5: Servidor de mídia — teto, posição e capa

**Arquivos:**
- Modificar: `src/domain/media.ts`, `src/server/dal/media.ts`

**Interfaces:**
- Consome: `MEDIA_LIMITS`, `ConflictError`
- Produz: `MEDIA_LIMITS[kind].maxPerItem`; `registerItemMedia` recusando acima do teto e gravando `position`; `deleteItemMedia` removendo a capa junto

Três correções pequenas no mesmo arquivo, todas saídas da revisão. Vêm antes da interface de propósito: é mais barato o servidor já estar certo quando a primeira foto subir do que descobrir depois que o teto nunca existiu.

- [x] **Passo 1: O teto vira dado do domínio**

Em `src/domain/media.ts`, acrescentar `maxPerItem` dentro de `MEDIA_LIMITS`, junto dos outros limites:

```ts
export const MEDIA_LIMITS = {
  image: {
    bucket: IMAGE_BUCKET,
    maxBytes: 5_242_880,
    // Teto por item. Nao e limite tecnico: e o ponto em que a galeria de um
    // prato deixa de ajudar a decidir e passa a atrapalhar.
    maxPerItem: 6,
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  video: {
    bucket: VIDEO_BUCKET,
    maxBytes: 10_485_760,
    // Video e caro em trafego, e o limite de um ja estava na Fase 0.
    maxPerItem: 1,
    mimes: ['video/mp4', 'video/webm'],
  },
} as const
```

O número passa a morar num lugar só. O navegador e a DAL leem o mesmo valor, e o dia em que ele mudar não vai existir um teto de seis na tela e outro de oito no banco.

- [x] **Passo 2: `registerItemMedia` confere o teto e grava a posição**

Em `src/server/dal/media.ts`, acrescentar `ConflictError` ao import de `./auth`:

```ts
import {
  ConflictError,
  currentTerritory,
  requireMember,
  UserFacingError,
} from './auth'
```

Dentro de `registerItemMedia`, depois da revalidação do prefixo e antes do `insert`:

```ts
  // Uma consulta, dois problemas. O teto por item e REGRA: o navegador
  // confere para responder na hora, mas quem garante e esta linha. E a
  // contagem do mesmo tipo vira a position da nova midia -- sem isso toda
  // linha fica no default 0, a ordem da galeria passa a depender do que o
  // banco devolver naquele instante, e a miniatura do item troca sozinha.
  const { data: siblings, error: countError } = await supabase
    .from('menu_item_media')
    .select('kind')
    .eq('item_id', data.itemId)

  if (countError) {
    throw new Error(
      `Não foi possível conferir a mídia do item: ${countError.message}`,
    )
  }

  const limits = MEDIA_LIMITS[data.kind]
  const sameKind = (siblings ?? []).filter(
    (row) => row.kind === data.kind,
  ).length

  if (sameKind >= limits.maxPerItem) {
    // ConflictError, nao Error cru: so UserFacingError e suas filhas
    // atravessam o runAction com a mensagem intacta. Um Error comum viraria
    // "Nao foi possivel concluir a operacao" e o dono nao saberia o que fazer.
    throw new ConflictError(
      data.kind === 'image'
        ? `Este item já tem ${limits.maxPerItem} imagens. Remova uma para enviar outra.`
        : 'Este item já tem um vídeo. Remova o atual para enviar outro.',
    )
  }
```

E no `insert`, acrescentar a posição logo depois de `kind`:

```ts
      position: sameKind,
```

- [x] **Passo 3: `deleteItemMedia` leva a capa junto**

No mesmo arquivo, trocar o `select` da busca da linha por:

```ts
    .select('restaurant_id, kind, storage_path, poster_path')
```

E, logo depois da remoção do arquivo principal:

```ts
  // A capa mora no bucket de imagem, mesmo pertencendo a um video. Deixa-la
  // para tras daria um arquivo pago e inalcancavel a cada video trocado --
  // e invisivel, porque nada no banco voltaria a apontar para ele.
  if (row.poster_path) {
    await supabase.storage
      .from(MEDIA_LIMITS.image.bucket)
      .remove([row.poster_path as string])
  }
```

- [ ] **Passo 4: Verificar**

```bash
pnpm exec tsc --noEmit
```

A prova do teto e da posição não precisa de navegador, mas precisa de mídia já gravada — então ela roda de verdade ao fim da Tarefa 7, no **SQL Editor do projeto na nuvem**. A consulta fica registrada aqui:

```sql
select item_id, kind, position from public.menu_item_media order by item_id, kind, position;
```

Esperado: para cada par de item e tipo, as posições saem 0, 1, 2… sem repetição. Se vier tudo em zero, o `position: sameKind` não entrou no `insert`.

- [x] **Passo 5: Arquivos alterados**

`src/domain/media.ts`, `src/server/dal/media.ts`. **Não commitar.**

---

## Tarefa 7: Mídia — imagens

**Arquivos:**
- Criar: `src/components/cardapio/media-editor.tsx`
- Modificar: `src/components/cardapio/item-edit-dialog.tsx`

**Interfaces:**
- Consome: `createUploadTicketAction`, `registerItemMediaAction`, `deleteItemMediaAction`, `uploadToSignedUrl`, `publicMediaUrl`, `MEDIA_LIMITS`
- Produz: `<MediaEditor itemId media>`

- [x] **Passo 1: Criar o editor de mídia**

`src/components/cardapio/media-editor.tsx`:

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { MEDIA_LIMITS } from '@/domain/media'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { publicMediaUrl } from '@/lib/media-url'
import { uploadToSignedUrl } from '@/lib/upload'
import {
  createUploadTicketAction,
  deleteItemMediaAction,
  registerItemMediaAction,
} from '@/server/actions/media'

export function MediaEditor({
  itemId,
  media,
}: {
  itemId: string
  media: OwnerMenuItemDTO['media']
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const limits = MEDIA_LIMITS.image
  const images = media.filter((entry) => entry.kind === 'image')
  const full = images.length >= limits.maxPerItem

  function handleFile(file: File) {
    setError(null)

    // As tres checagens de navegador acontecem FORA da transicao: sao
    // instantaneas e nao tocam a rede. Errar o formato nao deve nem acender
    // o indicador de carregamento.
    if (!(limits.mimes as readonly string[]).includes(file.type)) {
      setError('Formato não aceito. Use JPEG, PNG, WebP ou AVIF.')
      return
    }
    if (file.size > limits.maxBytes) {
      setError('Imagem acima de 5 MB. Reduza antes de enviar.')
      return
    }
    if (full) {
      setError(`Máximo de ${limits.maxPerItem} imagens por item.`)
      return
    }

    // Daqui para baixo, tudo dentro de startTransition. O guia de Server
    // Functions do Next 16 e explicito: de um manipulador de evento, a action
    // vai envolvida numa transicao. E assim que a revalidacao volta aplicada
    // e a galeria mostra a foto que acabou de subir.
    startTransition(async () => {
      // 1. O servidor autoriza e devolve o caminho. O navegador nunca escolhe
      //    onde grava.
      const ticket = await createUploadTicketAction({
        itemId,
        kind: 'image',
        mimeType: file.type,
      })
      if (!ticket.ok) {
        setError(ticket.error)
        return
      }

      // 2. O arquivo vai direto para o Storage, sem passar pelo nosso
      //    servidor.
      try {
        await uploadToSignedUrl(ticket.data.signedUrl, file, file.type)
      } catch {
        setError('Falha ao enviar a imagem. Tente de novo.')
        return
      }

      // 3. O servidor revalida o prefixo, confere o teto e grava a linha.
      const registered = await registerItemMediaAction({
        itemId,
        kind: 'image',
        storagePath: ticket.data.path,
      })

      if (registered.ok) {
        toast.add({ title: 'Imagem enviada', type: 'success' })
      } else {
        setError(registered.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem imagens. Uma boa foto é o que faz a pessoa escolher o prato.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {images.map((entry) => (
            <li key={entry.id} className="relative">
              <img
                src={publicMediaUrl('image', entry.storagePath)}
                alt={entry.altText ?? ''}
                width={96}
                height={96}
                loading="lazy"
                className="size-24 rounded-md object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={pending}
                aria-label="Remover imagem"
                className="absolute -right-2 -top-2 size-7"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteItemMediaAction(entry.id)
                    if (!result.ok) {
                      toast.add({ title: result.error, type: 'error' })
                    }
                  })
                }
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* O seletor nativo abre camera ou galeria no celular sem componente
          proprio. O input fica escondido e o botao o aciona. */}
      <input
        ref={inputRef}
        type="file"
        accept={limits.mimes.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />

      <Button
        type="button"
        variant="outline"
        disabled={pending || full}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <ImagePlusIcon className="size-4" />
        )}
        {full ? `Limite de ${limits.maxPerItem} imagens` : 'Enviar imagem'}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

O tamanho é conferido três vezes: aqui, para dar mensagem imediata sem gastar rede; no bucket, que o Supabase impõe no servidor; e o formato, de novo, na `createUploadTicket`. A quantidade é conferida duas: aqui e na `registerItemMedia`. Em todos os casos a checagem do navegador é conveniência, nunca a garantia.

- [x] **Passo 2: Ligar no diálogo de edição**

Em `src/components/cardapio/item-edit-dialog.tsx`, importar `MediaEditor` e trocar o comentário `{/* A seção de mídia entra na Tarefa 7. */}` por:

```tsx
          <div>
            <h3 className="mb-4 text-base font-semibold">Mídia</h3>
            <MediaEditor itemId={item.id} media={item.media} />
          </div>
```

- [ ] **Passo 3: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador, editando um item:

1. Enviar uma foto JPEG pequena — ela aparece na galeria **sem fechar o diálogo**, e a miniatura da linha do item também muda. Se a foto só aparecer ao reabrir o diálogo, a transição não está envolvendo a action.
2. Tentar enviar um PDF devolve "Formato não aceito" **sem** ir à rede.
3. Enviar seis fotos e o botão passa a dizer "Limite de 6 imagens", desabilitado.
4. Remover uma foto tira ela da galeria.
5. No **SQL Editor do projeto na nuvem** — é lá que o app grava —, conferir prefixo e posição de uma vez:

```sql
select kind, position, restaurant_id::text = split_part(storage_path,'/',1) as prefixo_bate from public.menu_item_media order by item_id, kind, position;
```

Esperado: `prefixo_bate` verdadeiro em todas — se vier falso, a fronteira do inquilino no storage está furada — e `position` em 0, 1, 2… por item e tipo, sem repetição.

6. Confirmar que nenhum item passou do teto, agora que o servidor confere:

```sql
select item_id, kind, count(*) from public.menu_item_media group by item_id, kind having count(*) > case when kind = 'image' then 6 else 1 end;
```

Esperado: nenhuma linha.

- [x] **Passo 4: Arquivos alterados**

`src/components/cardapio/media-editor.tsx` (novo), `src/components/cardapio/item-edit-dialog.tsx`. **Não commitar.**

---

## Tarefa 8: Vídeo e captura de capa

**Arquivos:**
- Modificar: `src/lib/upload.ts`, `src/components/cardapio/media-editor.tsx`

**Interfaces:**
- Consome: `uploadToSignedUrl`, `createUploadTicketAction`, `registerItemMediaAction`
- Produz: `readVideoDurationMs(file) → Promise<number | null>`, `captureVideoPoster(file) → Promise<Blob | null>`

- [x] **Passo 1: Escrever a leitura de duração e a captura de capa**

Acrescentar ao fim de `src/lib/upload.ts`:

```ts
// Espera um evento do elemento, com teto de tempo. Sem o teto, um codec que
// o navegador aceita carregar mas nao consegue decodificar deixaria a
// promessa pendurada para sempre, e a interface travada.
function waitFor(
  element: HTMLVideoElement,
  event: 'loadedmetadata' | 'seeked',
  timeoutMs = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const limit = setTimeout(() => {
      cleanup()
      reject(new Error(`tempo esgotado esperando ${event}`))
    }, timeoutMs)

    function cleanup() {
      clearTimeout(limit)
      element.removeEventListener(event, onDone)
      element.removeEventListener('error', onFail)
    }
    function onDone() {
      cleanup()
      resolve()
    }
    function onFail() {
      cleanup()
      reject(new Error('falha ao decodificar o vídeo'))
    }

    element.addEventListener(event, onDone)
    element.addEventListener('error', onFail)
  })
}

export async function readVideoDurationMs(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.src = url

  try {
    await waitFor(video, 'loadedmetadata')
    return Number.isFinite(video.duration)
      ? Math.round(video.duration * 1000)
      : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Devolve null em vez de lancar. Falhar em capturar uma capa nao pode
// impedir alguem de subir o video do proprio prato -- decisao C5.
export async function captureVideoPoster(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = url

  try {
    await waitFor(video, 'loadedmetadata')

    // 0,1s em vez de 0: o quadro exato em zero costuma vir preto.
    video.currentTime = Math.min(0.1, (video.duration || 1) / 2)
    await waitFor(video, 'seeked')

    if (!video.videoWidth || !video.videoHeight) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // WebP e o PEDIDO, nao a promessa. Safari antigo aceita o pedido e
    // devolve PNG calado, por isso quem chama precisa ler blob.type em vez
    // de supor o formato.
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.85)
    })
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

- [x] **Passo 2: Acrescentar o envio de vídeo ao editor de mídia**

Em `src/components/cardapio/media-editor.tsx`, acrescentar aos imports:

```tsx
import { FilmIcon } from 'lucide-react'
import { captureVideoPoster, readVideoDurationMs } from '@/lib/upload'
```

Acrescentar a constante de módulo, junto das que já existem:

```tsx
const MAX_VIDEO_MS = 15_000
```

Acrescentar a referência e o vídeo atual, junto dos outros derivados:

```tsx
  const videoInputRef = useRef<HTMLInputElement>(null)
  const video = media.find((entry) => entry.kind === 'video')
```

E acrescentar as duas funções, depois de `handleFile`:

```tsx
  // A capa e opcional POR CONSTRUCAO (decisao C5). Toda falha aqui devolve
  // undefined e o video sobe do mesmo jeito.
  async function uploadPoster(file: File): Promise<string | undefined> {
    const poster = await captureVideoPoster(file)
    if (!poster) return undefined

    // O tipo que o navegador DEVOLVEU, nao o que foi pedido. Safari antigo
    // aceita o pedido de WebP e entrega PNG calado; subir esse arquivo como
    // .webp, servido como image/webp, daria uma capa que nada desenha.
    const mimeType = poster.type
    if (!(MEDIA_LIMITS.image.mimes as readonly string[]).includes(mimeType)) {
      return undefined
    }

    const ticket = await createUploadTicketAction({
      itemId,
      kind: 'image',
      mimeType,
    })
    if (!ticket.ok) return undefined

    try {
      await uploadToSignedUrl(ticket.data.signedUrl, poster, mimeType)
      return ticket.data.path
    } catch {
      // Capa perdida, video segue. Nao vale interromper por isso.
      return undefined
    }
  }

  function handleVideo(file: File) {
    setError(null)

    const videoLimits = MEDIA_LIMITS.video
    if (!(videoLimits.mimes as readonly string[]).includes(file.type)) {
      setError('Formato não aceito. Use MP4 ou WebM.')
      return
    }
    if (file.size > videoLimits.maxBytes) {
      setError('Vídeo acima de 10 MB. Reduza antes de enviar.')
      return
    }
    if (video) {
      setError('Este item já tem um vídeo. Remova o atual para enviar outro.')
      return
    }

    startTransition(async () => {
      // A duracao exige decodificar, entao so aqui dentro. Null significa que
      // o navegador nao soube dizer -- nesse caso passamos sem afirmar nada,
      // porque o servidor tambem nao consegue conferir sem transcodificar.
      const durationMs = await readVideoDurationMs(file)
      if (durationMs !== null && durationMs > MAX_VIDEO_MS) {
        setError('O vídeo pode ter no máximo 15 segundos.')
        return
      }

      const posterPath = await uploadPoster(file)

      const ticket = await createUploadTicketAction({
        itemId,
        kind: 'video',
        mimeType: file.type,
      })
      if (!ticket.ok) {
        setError(ticket.error)
        return
      }

      try {
        await uploadToSignedUrl(ticket.data.signedUrl, file, file.type)
      } catch {
        setError('Falha ao enviar o vídeo. Tente de novo.')
        return
      }

      const registered = await registerItemMediaAction({
        itemId,
        kind: 'video',
        storagePath: ticket.data.path,
        posterPath,
        durationMs: durationMs ?? undefined,
      })

      if (!registered.ok) {
        setError(registered.error)
        return
      }

      toast.add(
        posterPath
          ? { title: 'Vídeo enviado', type: 'success' }
          : {
              title: 'Vídeo enviado',
              description:
                'Não foi possível gerar a capa automaticamente. O vídeo funciona normalmente.',
              type: 'info',
            },
      )
    })
  }
```

Repare que a falta de capa vira aviso **informativo**, não de erro. O upload deu certo; só um extra não saiu.

E repare na ordem: a capa sobe **antes** do vídeo. Se o vídeo falhar depois, sobra uma capa órfã de poucos quilobytes no bucket de imagens — desperdício pequeno e raro. Na ordem inversa, um vídeo já gravado ficaria esperando por uma capa que talvez nunca chegue, e o registro teria de acontecer duas vezes.

- [x] **Passo 3: Acrescentar o bloco de vídeo à interface**

No mesmo arquivo, depois do botão de enviar imagem:

```tsx
      <div className="space-y-3 border-t border-border pt-4">
        {video ? (
          <div className="relative w-fit">
            <video
              src={publicMediaUrl('video', video.storagePath)}
              poster={
                video.posterPath
                  ? publicMediaUrl('image', video.posterPath)
                  : undefined
              }
              controls
              muted
              playsInline
              preload="metadata"
              className="h-40 rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              disabled={pending}
              aria-label="Remover vídeo"
              className="absolute -right-2 -top-2 size-7"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteItemMediaAction(video.id)
                  if (!result.ok) {
                    toast.add({ title: result.error, type: 'error' })
                  }
                })
              }
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem vídeo. Um por item, de até 15 segundos e 10 MB.
          </p>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept={MEDIA_LIMITS.video.mimes.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleVideo(file)
            event.target.value = ''
          }}
        />

        <Button
          type="button"
          variant="outline"
          disabled={pending || Boolean(video)}
          onClick={() => videoInputRef.current?.click()}
        >
          {pending ? (
            <Spinner className="size-4" />
          ) : (
            <FilmIcon className="size-4" />
          )}
          {video ? 'Já tem um vídeo' : 'Enviar vídeo'}
        </Button>
      </div>
```

- [ ] **Passo 4: Verificar**

```bash
pnpm exec tsc --noEmit
```

No navegador, editando um item, com um MP4 curto à mão:

1. Enviar um MP4 de poucos segundos — ele aparece no player, **com capa** (o primeiro quadro, não uma tela preta).
2. Tentar enviar um segundo vídeo: o botão está desabilitado dizendo "Já tem um vídeo".
3. Tentar enviar um vídeo de mais de 15 segundos devolve a mensagem de limite **sem** enviar nada.
4. Remover o vídeo libera o botão de novo.
5. No **SQL Editor do projeto na nuvem**, conferir que a capa foi registrada e respeita o prefixo:

```sql
select kind, poster_path is not null as tem_capa, restaurant_id::text = split_part(coalesce(poster_path, storage_path),'/',1) as prefixo_bate from public.menu_item_media where kind = 'video';
```

Esperado: `tem_capa` verdadeiro e `prefixo_bate` verdadeiro.

Se `tem_capa` vier falso, a captura falhou — o que é um caminho **previsto**, não um defeito. Confira que o aviso informativo apareceu e que o vídeo toca normalmente. Se o vídeo também não tiver subido, aí sim é defeito.

6. Provar que a capa sai junto com o vídeo. **Antes** de remover, anotar o caminho da capa:

```sql
select poster_path from public.menu_item_media where kind = 'video';
```

Remover o vídeo pela interface e conferir que o arquivo sumiu do bucket, colando o caminho anotado:

```sql
select name from storage.objects where bucket_id = 'menu-images' and name = 'COLE_O_CAMINHO_AQUI';
```

Esperado: nenhuma linha. Se o arquivo continuar lá, o trecho do Passo 3 da Tarefa 6.5 não está sendo alcançado.

- [x] **Passo 5: Arquivos alterados**

`src/lib/upload.ts`, `src/components/cardapio/media-editor.tsx`. **Não commitar.**

---

## Tarefa 9: Verificação de ponta a ponta

Nenhum arquivo novo. Existe para provar que a fase fecha e para pegar o que só aparece com tudo junto.

- [x] **Passo 1: Compilar para produção**

```bash
pnpm exec tsc --noEmit && pnpm build 2>&1 | tail -20
```

Esperado: sem erro. Na tabela de rotas, `/painel/restaurantes/[id]` precisa aparecer como dinâmica (`ƒ`).

- [x] **Passo 2: Confirmar que nada do Supabase entrou no pacote do navegador**

```bash
grep -rn "@supabase" src/components/ src/lib/ src/hooks/ 2>/dev/null; echo "--- fim ---"
```

Esperado: nenhum **import**. A única ocorrência legítima é o comentário no topo de `src/lib/upload.ts`, que explica justamente por que `@supabase/*` não entra aqui. Qualquer linha começando com `import` é defeito. Esta é a decisão C7 valendo na prática — o envio acontece por `fetch` puro numa URL assinada.

- [x] **Passo 3: Confirmar as fronteiras de sempre**

```bash
grep -ri "service_role" src/ .env.local 2>/dev/null; echo "--- fim 1 ---"
grep -rn "@/server/dal\|@/server/security" src/components/ src/hooks/ 2>/dev/null; echo "--- fim 2 ---"
```

Esperado: nenhuma ocorrência em nenhum dos dois.

- [ ] **Passo 4: Confirmar que o storage não acumula lixo**

Toda mídia removida leva os arquivos junto: o principal e, quando é vídeo, a capa. Esta consulta, no **SQL Editor do projeto na nuvem**, procura arquivo no bucket sem linha correspondente no banco:

```sql
select o.bucket_id, o.name from storage.objects o where o.bucket_id in ('menu-images','menu-videos') and not exists (select 1 from public.menu_item_media m where m.storage_path = o.name or m.poster_path = o.name);
```

Esperado: nenhuma linha — **ou**, no máximo, arquivos de tentativas que falharam entre o envio e o registro. Esse segundo caso é limitação conhecida e aceita: o arquivo sobe antes de a linha existir, e se o registro falhar o arquivo fica para trás. Não é o que este passo procura.

O que ele procura é **capa de vídeo removido**. Se aparecer aqui uma imagem cujo vídeo não existe mais, o Passo 3 da Tarefa 6.5 não está sendo alcançado, e cada vídeo trocado passa a custar um arquivo que ninguém vai achar de novo.

- [ ] **Passo 5: Confirmar que o cardápio público reflete o CMS**

Com um restaurante **ativo** e um cardápio montado, abrir `localhost:3000/{slug}` e conferir:

| No CMS | No cardápio público |
|---|---|
| Categoria visível com itens visíveis | Aparecem |
| Categoria marcada como oculta | Some inteira, com os itens dentro |
| Item marcado como oculto | Some, mas a categoria fica |
| Item marcado como esgotado | Aparece, com a marca de esgotado |
| Variação adicionada | Aparece com o preço próprio |

A terceira e a quarta linha são diferentes de propósito: **oculto** é decisão de cardápio, **esgotado** é decisão do dia. Confundir as duas é o erro mais fácil de cometer aqui.

- [ ] **Passo 6: Percorrer o ciclo no celular**

Abrir o painel num celular de verdade, ou nas ferramentas de desenvolvedor em largura de 375px:

1. A lista rola numa coluna só, sem corte lateral.
2. O interruptor de disponibilidade é alcançável com o polegar e responde na hora.
3. Os diálogos rolam por dentro e os botões de salvar continuam visíveis no rodapé.
4. Enviar foto abre a câmera ou a galeria pelo seletor nativo.

O item 2 é a razão de ser desta fase no celular.

- [ ] **Passo 7: Relatar**

Listar o que passou, o que falhou e o que ficou de fora. Não afirmar que está completo sem ter rodado os passos e olhado a saída.

---

## Verificação de cobertura da spec

| Seção da spec | Onde é implementada |
|---|---|
| 2 — Escopo | Tarefas 1 a 8, mais a 6.5 |
| 4 — Rotas e telas | Tarefa 3 |
| 5 — A tela do cardápio | Tarefas 3, 4, 5 |
| 6 — Criar item | Tarefa 5 |
| 6 — Editar item | Tarefas 6 e 7 |
| 6 — Reordenar | Tarefas 3, 4, 5 |
| 6 — Disponibilidade | Tarefa 5 |
| 7 — Limites de mídia | Tarefas 6.5, 7 e 8 |
| 7 — Upload em três passos | Tarefas 2 e 7 |
| 7 — Captura da capa | Tarefa 8 |
| 7 — Remoção | Tarefas 6.5 e 8 |
| 8 — Mudança no banco | Tarefa 1 |
| 9 — Erros, vazios e celular | Tarefas 4, 5, 7, 9 |
| 10 — Segurança | Tarefas 2, 3, 6.5, 9 |
