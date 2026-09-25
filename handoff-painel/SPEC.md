# Spec: Painel do restaurante (pós-login) no modelo Tavvi

Referência visual e de comportamento: `Painel Restaurante.dc.html` (abra no navegador). O seletor **Desktop / Celular** fica no canto superior direito. Os Tweaks `page`, `estado`, `theme`, `pinned`, `gooey` e `motion` mostram todas as variantes.

Esta spec cobre:

1. a migração de identidade (tokens, fonte, casca) do território `painel` para o padrão Tavvi que o admin (`/admin`) e o login (`/painel/entrar`) já usam;
2. as quatro páginas de `painel/restaurantes/[id]/`: Cardápio, Identidade, Contato e Equipe, no desktop e no celular.

O protótipo usa dados fictícios. **Nenhuma regra de negócio nasce nele.** Toda regra que aparece na tela precisa ser conferida contra o código atual (seção 0) antes de ser implementada. Onde o protótipo pede algo que o código ainda não tem, a seção 9 lista o ponto como pendência, com a decisão que precisa ser tomada.

---

## 0. Antes de escrever código: pesquisa e revisão obrigatórias

Leia e anote o contrato atual de cada arquivo abaixo. A implementação segue esses contratos, não o protótipo.

### Domínio (`src/domain/`)
| Arquivo | O que conferir |
|---|---|
| `common.ts` | `plainTextSchema(max, min)` (trim, proíbe `<` e `>`), `priceCentsSchema` (0 a 99.999.999), `positionSchema` (0 a 10.000), `uuidSchema`, `slugSchema`, `safeNextPath` |
| `menu.ts` | `createCategorySchema` (nome 2–80, descrição ≤300), `updateCategorySchema` (+ `isVisible`), `reorderSchema`, `createItemSchema` (nome 2–120, descrição ≤600, `basePriceCents`, `dietaryTags` ≤10 × ≤30), `updateItemSchema` (+ `categoryId`, `isVisible`, `isAvailable`), `setItemAvailabilitySchema`, `createVariantSchema` (nome 1–60), `updateVariantSchema` (+ `isAvailable`), `OwnerMenuItemDTO.semMidia`, `OwnerMenuCategoryDTO` |
| `media.ts` | `MAX_MIDIAS_POR_ITEM = 6`, `focalSchema` **0 a 1** (o protótipo mostra 0–100%, converta), `reorderMediaSchema` (position 0–10), `registerMediaSchema` (vídeo ≤15.000 ms, dimensões), `setBrandImageSchema` |
| `theme.ts` | `THEME_PRESET_IDS`, `DEFAULT_PRESET = 'grao'`, `themeSchema` (`preset`, `base`, `accent`, `density` com `.catch`), `densitySchema` |
| `restaurant.ts` | `updateRestaurantProfileSchema` (nome 2–120, **descrição ≤500**, `contact.{phone ≤30, whatsapp ≤30, instagram ≤60, address ≤200}`), `setPublishedSchema`, `restaurantStatusSchema` (`draft/active/suspended`), `updateIdentitySchema` |
| `invite.ts` | `memberRoleSchema` (`admin/cashier/attendant/waiter`), `MEMBER_ROLE_LABELS`, `MEMBER_ROLE_HINTS`, `createTeamInviteSchema` (`expiresInDays` 1–30, padrão 7), `changeMemberRoleSchema` |
| `tag.ts` | `TagDTO` (plaquinhas). Fora do escopo desta entrega; só confirme que nada aqui depende dela |

### Lógica de tema (`src/lib/theme/`)
- `presets.ts`: `PRESETS` (8 temas, `segments`, `displayFont`, `textFont`, `radius`, `baseRange`, faces `light`/`dark`) e `isBaseInRange`. **As opções de cor de fundo do protótipo são ilustrativas.** A implementação gera as opções dentro de `baseRange` e valida com `isBaseInRange` no cliente e no servidor.
- `@/lib/color` (`hexToOklch`) e a regra de texto: a candidata de `ink`/`muted` com mais contraste vence (script `scripts/verificar-contraste.ts`).

### Server actions (`src/server/actions/`), sempre via `runAction` → `ActionResult`
- `menu.ts`: `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`, `reorderCategoriesAction`, `createItemAction`, `updateItemAction`, `deleteItemAction`, `reorderItemsAction`, `setItemAvailabilityAction`, `createVariantAction`, `updateVariantAction`, `deleteVariantAction`
- `media.ts`: `createUploadTicketAction`, `registerItemMediaAction`, `deleteItemMediaAction`, `setMediaFocalAction`, `reorderItemMediaAction`, `createBrandUploadTicketAction`, `setBrandImageAction`
- `restaurants.ts`: `updateRestaurantProfileAction`, `setPublishedAction`, `updateIdentityAction`
- `members.ts`: `removeMemberAction`, `changeMemberRoleAction`
- `invites.ts`: `createTeamInviteAction`, `revokeInviteAction`

### DAL e autorização
- `dal/restaurant-workspace.ts`: `getRestaurantWorkspace` devolve `{ restaurant, canEdit }`. O papel decide o que **aparece**. DAL e RLS barram de novo; não remova nenhuma das três camadas.
- `dal/menu.ts` (`getMenuForOwner`), `dal/members.ts`, `dal/invites.ts`, `dal/media.ts`.
- `components/shell/navigation.ts`: `getRestaurantNavigation(id, canEdit)`. Sem `canEdit`, a navegação tem só Cardápio. O protótipo reproduz isso no estado `leitura`.
- `server/revalidate.ts`: confira quais caminhos cada action revalida (painel e cardápio público).

### Componentes atuais que serão substituídos ou reaproveitados
- Painel: `components/cardapio/*` (`category-section`, `item-row`, `item-edit-dialog`, `item-create-dialog`, `category-dialog`, `media-editor`, `media-dropzone`, `media-focal`, `media-item`, `variants-editor`, `reorder-buttons`, `new-*-button`), `components/painel/*` (`publish-bar`, `identity-form`, `brand-images`, `theme-preview`, `profile-form`, `member-row`), `components/shell/*` (`tavvi-shell`, `desktop-sidebar`, `mobile-navigation`, `nav-tree`, `page-header`, `command-palette`).
- Console admin (padrão a seguir): `components/console/*` (`console-shell`, `rail`, `rail-store`, `liquid-frame`, `use-liquid-pocket`, `mobile-dock`, `account-popover`, `command-palette`, `list-hero`, `toolbar`, `state-card`, `tv-badge`, `buttons`).

**Resultado esperado desta etapa:** uma tabela com cada elemento interativo do protótipo, a action ou schema que o atende e o status (existe / precisa de ajuste / não existe). Só depois comece a seção 1.

### Mapa de controles para contratos

| Página / controle | Contrato atual | Situação |
|---|---|---|
| Cardápio: carregar restaurante, estado e permissão | `getRestaurantWorkspace`, `getMenuForOwner`, `getRestaurantNavigation` | Existe; manter DAL/RLS e navegação com `canEdit`. |
| Cardápio: criar/editar/excluir categoria e visibilidade | `createCategoryAction`, `updateCategoryAction`, `deleteCategoryAction`; `createCategorySchema`, `updateCategorySchema` | Existe. |
| Cardápio: reordenar categorias | `reorderCategoriesAction`; `reorderSchema` | Existe; enviar a ordem completa. |
| Cardápio: criar/editar/excluir item, mover, ocultar e preço/descrição/tags | `createItemAction`, `updateItemAction`, `deleteItemAction`; `createItemSchema`, `updateItemSchema` | Existe; descrição até 600, tags livres. |
| Cardápio: disponibilidade | `setItemAvailabilityAction`; `setItemAvailabilitySchema` | Existe. |
| Cardápio: variantes | `createVariantAction`, `updateVariantAction`, `deleteVariantAction`; `createVariantSchema`, `updateVariantSchema` | Existe. |
| Cardápio: upload, remover, ordenar e enquadrar mídia | `createUploadTicketAction`, `registerItemMediaAction`, `deleteItemMediaAction`, `setMediaFocalAction`, `reorderItemMediaAction`; schemas de `media.ts` | Existe; enquadramento usa coordenadas de 0 a 1. |
| Cardápio: publicar/despublicar | `setPublishedAction`; `setPublishedSchema`; validação em `dal/restaurants.ts` | Existe; requisitos são item visível e mídia nos itens visíveis. |
| Cardápio: busca e filtros | `getMenuForOwner` e `OwnerMenuCategoryDTO` (`semMidia`) | Existe para filtragem no cliente; preferências de modo usam `localStorage`. |
| Identidade: marca/logo/capa | `createBrandUploadTicketAction`, `setBrandImageAction`; `setBrandImageSchema` | Existe; `storagePath: null` remove imagem. |
| Identidade: segmento/tema/densidade | `updateIdentityAction`; `updateIdentitySchema`, `themeSchema`, `densitySchema`; `PRESETS`, `isBaseInRange` | Existe; validar faixa de cor no cliente e servidor. |
| Contato: perfil e canais | `updateRestaurantProfileAction`; `updateRestaurantProfileSchema` | Existe; descrição até 500; telefone/WhatsApp até 30; Instagram até 60; endereço único até 200. |
| Equipe: listar membros e papéis | `listMembers`; `changeMemberRoleAction`, `removeMemberAction`; `changeMemberRoleSchema`, `memberRoleSchema` | Existe; admin apenas; último administrador protegido. |
| Equipe: convidar e revogar | `createTeamInviteAction`, `revokeInviteAction`; `createTeamInviteSchema` | Existe; listar via `listInvites`, derivar estado com `inviteStatus`. |
| Casca: desktop/mobile e atalhos | componentes `console/*`; `getRestaurantNavigation(id, canEdit)` | Reaproveitar console; adaptar `ConsoleConfig` às quatro folhas do restaurante. |
| Duplicação e ações em lote | Nenhuma action correspondente | Fora do escopo aprovado. |
| Horário e endereço estruturado | Nenhum campo/schema correspondente | Fora do escopo aprovado. |


### Restrições (as mesmas do login)
- Não altere assinaturas de actions, predicados de autorização, `proxy.ts`, territórios nem RLS sem uma decisão explícita (seção 9).
- Cores só via tokens `--tv-*`. Nada de hex nos componentes. Os únicos hex aceitos são os do tema do restaurante na prévia, que vêm de `PRESETS`.
- Não rode git, build, lint, typecheck nem testes (regra do projeto em `AGENTS.md`).

---

## 1. Migração de identidade: tokens, fonte e casca

Hoje `.territorio-painel` usa Inter e os tokens shadcn. Os tokens `--tv-*` vivem em `.territorio-admin, .tv-auth-scope` (`globals.css`, linhas ~119–244).

1. Em `globals.css`, acrescente `.territorio-painel` aos seletores de tokens:
   `.territorio-admin, .tv-auth-scope, .territorio-painel { … }` e `.dark .territorio-admin, .dark .tv-auth-scope, .dark .territorio-painel { … }`.
2. Em `@layer base`, no bloco `.territorio-painel` (linha ~438), troque a fonte para `var(--font-tavvi)` (Plus Jakarta), igual a `.territorio-admin`. A mono é `--font-tavvi-mono` (JetBrains Mono).
3. **Exceção:** o cardápio público (`components/cardapio-publico/*`, `theme.css`) **não** entra nesse escopo. A prévia do celular na Identidade renderiza as fontes do preset (`--tf-*`) dentro de um contêiner próprio, isolado dos tokens Tavvi.
4. Troque `TavviShell` (painel) pela mesma casca do console: `LiquidFrame` + `use-liquid-pocket` (bolso animado que acompanha o item ativo, mola com K 190 e C 15,5), `Rail` (88 px recolhido / 248 px fixado, `Ctrl B`, flyout ao passar o mouse com 220 ms), `AccountPopover` (tema Sistema/Claro/Escuro e Sair), `CommandPalette` (`Ctrl K`) e `MobileDock` no celular. Parametrize a configuração com um `ConsoleConfig` do painel:
   - folhas: Cardápio (`menu`), Identidade (`palette`), Contato (`contact`), Equipe (`team`), derivadas de `getRestaurantNavigation`;
   - cabeçalho do trilho: rótulo "Painel" e nome do restaurante (`contextLabel`);
   - conta: e-mail e papel (`MEMBER_ROLE_LABELS[role]`) · nome do restaurante.
5. Os ícones continuam do mesmo conjunto que o console usa (`react-icons/lu`): `LuBookOpen`, `LuPalette`, `LuContact`, `LuUsers`.

### Tabela de tokens (protótipo → código)
| Protótipo | Token |
|---|---|
| `--rail` | `--tv-rail` |
| `--panel` | `--tv-panel` |
| `--surface` | `--tv-surface` |
| `--field` | `--tv-field` |
| `--text` / `--muted` / `--subtle` | `--tv-text` / `--tv-muted` / `--tv-subtle` |
| `--line` / `--line2` | `--tv-line` / `--tv-line-strong` |
| `--accent` / `--accentS` | `--tv-accent` / `--tv-accent-surface` |
| `--okT` / `--okS` | `--tv-ok` / `--tv-ok-surface` |
| `--warnT` / `--warnS` | `--tv-warn` / `--tv-warn-surface` |
| `--neuT` / `--neuS` | `--tv-neutral` / `--tv-neutral-surface` |
| `--dangerT` / `--dangerS` | `--tv-error` / `--tv-error-surface` |
| `--hover` | `--tv-row-hover` |
| `--glass` / `--scrim` / `--shadow` | `--tv-glass` / `--tv-scrim` / `--tv-overlay-shadow` |
| `#B2F52F` (CTA) / hover `#BEF94A` | `--tv-lime` / `--tv-lime-pressed` |
| `#0A0C09` (texto sobre lime) | `--tv-ink` |
| sombra do CTA | `--tv-lime-cta-glow` |

O protótipo usa `--field #1A1D17` no escuro; o token atual é `#181B15`. **Vale o token.** Os raios seguem os do console: cartão 22, campo 14, chip 12–14, painel flutuante 26, drawer e sheet 28–30.

---

## 2. Padrões compartilhados (todas as páginas)

- **Cabeçalho leve** (sem o hero escuro do admin): selo com ponto lime e eyebrow, título 40/800 com ponto final em `--tv-accent`, resumo em `--tv-muted`, ação primária à direita. No celular, título 30.
- **CTA primário**: lime com quadrado escuro à direita, igual a "Novo convite" do console.
- **Menus de linha**: vidro (`--tv-glass` + blur), fecham ao clicar fora e com `Esc`.
- **Toast**: vidro no topo, com check lime, por 2 s.
- **Confirmações destrutivas**: modal com título, consequência em uma frase e botão `--tv-error-surface`/`--tv-error`. Excluir item, excluir categoria (avisa quantos itens saem), despublicar, remover pessoa.
- **Estados** (Tweak `estado`): `normal`, `rascunho`, `bloqueado`, `vazio`, `leitura`, `carregando`. `loading.tsx` de cada rota vira o skeleton mostrado.
- **Movimento**: respeite `prefers-reduced-motion` (a casca já faz isso; os gestos do celular também precisam).

---

## 3. Cardápio (`/restaurantes/[id]`)

### 3.1 Faixa de publicação
Três colunas: situação | "Para publicar" | link e ação.
- Situação: `restaurant.status === 'active'` → "No ar"; `draft` → "Rascunho". `suspended` não é do dono: mostre um aviso só-leitura, sem botão.
- Checklist:
  1. "Categorias com itens": `x de y`;
  2. "Todo item visível com foto ou vídeo": conta `semMidia` (a mesma conta da `page.tsx` atual). Clicar aplica o filtro "Sem mídia";
  3. "Logo e foto de capa": `logoPath` e `coverPath`. **Confirme se isso bloqueia a publicação hoje.** Se não bloqueia, mostre como recomendação, sem travar o botão.
- `Publicar` chama `setPublishedAction`. Fica desabilitado quando `semMidia > 0` ou quando não há nenhum item visível em qualquer categoria. O código atual conta itens visíveis sem considerar a visibilidade da categoria; preservar esse contrato. O servidor recusa de novo. Logo e capa são recomendação visual e não bloqueiam a publicação.
- No ar com `semMidia > 0`: aviso "N itens sem mídia não aparecem no feed".
- Link: `http://${NEXT_PUBLIC_ROOT_DOMAIN}/${slug}`, com Copiar e Ver no ar.

### 3.2 Modos
Dois grupos de abas, lembrados por restaurante em `localStorage`:
- **Ver**: Lista, Índice, Grade.
- **Trabalhar**: Estúdio, Quadro, Planilha, Sequência, Serviço.

Sem `canEdit`, sobram Lista, Índice, Grade e Sequência, sem controles de edição.

| Modo | Estrutura | Actions |
|---|---|---|
| Lista | Categoria em cartão (arrastar, recolher, subir/descer, menu), itens em linha | todas as de item e categoria |
| Índice | Lista + coluna fixa com a ordem das categorias (arrastar, pular para a categoria) | `reorderCategoriesAction` |
| Grade | Itens como cartões 9:16 | idem Lista |
| Estúdio | Lista de itens · editor inline · celular ao vivo, sem drawer | `updateItemAction`, variantes, mídia |
| Quadro | Uma coluna por categoria; arrastar item entre colunas muda a categoria | `updateItemAction({ categoryId })` + `reorderItemsAction` nas duas categorias |
| Planilha | Nome, categoria e preço editáveis na linha (salvam ao sair do campo, `Enter` confirma, `Esc` desfaz); toggles de Visível e Disponível | `updateItemAction`, `setItemAvailabilityAction` |
| Sequência | Faixa horizontal com a ordem real do feed, categorias como capítulos, telas numeradas | `reorderItemsAction`, `reorderCategoriesAction` |
| Serviço | Blocos grandes; tocar alterna disponível/esgotado; "Tudo disponível de novo" | `setItemAvailabilityAction` |

**Regra da Sequência:** uma tela entra no feed quando `categoria.isVisible && item.isVisible && media.length > 0`. Indisponível continua no feed, com o selo "Esgotado". **Confirme isso no `menu-feed.tsx` público.** O número mostrado é a posição real no feed.

### 3.3 Linha do item
Miniatura 9:16 (indica vídeo e quantidade de mídias; tracejada em `--tv-warn` quando não há mídia), nome, selos (Oculto, "Sem mídia · fora do feed", `dietaryTags`), descrição curta, meta ("2 fotos · 1 vídeo · 3 variações"), preço ("a partir de" quando há mais de uma variação; riscado se indisponível), toggle Disponível, setas (aparecem no hover), menu (Editar, Mover para…, Ocultar/Mostrar, Excluir).

- Duplicação fica fora desta entrega porque não há action no servidor. Não exibir a ação no menu.
- **Mover para…** = `updateItemAction` com o novo `categoryId`. O item vai para o fim da categoria de destino.

### 3.4 Busca, filtros e seleção em massa
- A busca procura em nome e descrição, só no cliente (o cardápio inteiro já chega em `getMenuForOwner`).
- Filtros com contagem: Todos, Sem mídia, Indisponíveis, Ocultos. Durante a busca ou o filtro, arrastar fica desligado (a ordem visível não é a real).
- Ações em lote ficam fora desta entrega porque não há action em lote. Não exibir seleção múltipla ou barra de ações.

### 3.5 Reordenar
Arrastar e setas nos dois níveis (categoria e item) e na ordem das mídias. Otimista, com rollback se a action falhar. `reorderSchema` pede `{ id, position }[]`: mande a lista inteira da categoria. Para mídias, `reorderMediaSchema` aceita `position` de 0 a 10.

### 3.6 Editor do item (drawer de 560 px; sheet no celular)
Ordem: **Fotos e vídeos** (a primeira abre o prato, arrastar para ordenar, limite `MAX_MIDIAS_POR_ITEM`, enquadramento clicando na foto → `setMediaFocalAction` com x e y de 0 a 1, "O ajuste é salvo automaticamente") → **Dados** (nome, categoria, preço com máscara BRL, descrição com contador de 600) → **Variações** (lista com nome e preço, adicionar, remover; `create/update/deleteVariantAction`) → **Restrições e destaques** (`dietaryTags`) → **Visível / Disponível**. Rodapé: Excluir, Fechar e Salvar item.

- Novo item usa o mesmo editor. Siga a regra atual do `item-create-dialog`: os arquivos são escolhidos antes e o envio começa ao criar o item (`createUploadTicketAction` → upload → `registerItemMediaAction`).
- Tags continuam como texto livre; mostrar as opções do protótipo apenas como sugestões que não restringem o valor salvo.

### 3.7 Categoria
Modal com nome, descrição e, na edição, "Visível no cardápio" (`updateCategorySchema.isVisible`). Categoria vazia mostra "Categorias vazias não aparecem no cardápio público". **Confirme essa regra no DTO público.** Cardápio vazio: estado vazio com CTA e sugestões rápidas (Entradas, Pratos principais, Bebidas, Sobremesas), cada uma chamando `createCategoryAction`.

---

## 4. Identidade (`/identidade`)
- Duas colunas: formulário e prévia fixa de **300 px**, com o celular em **236×484**, bem menor que a prévia flutuante atual. A prévia tem o toggle Claro/Escuro.
- Marca e imagens: logo quadrada e capa deitada, com Trocar e Remover (`createBrandUploadTicketAction`, `setBrandImageAction` com `storagePath: null` para remover).
- Tipo de restaurante: a lista vem da união de `PRESETS[*].segments`. Serve só para sugerir; marque "Sugerido" no preset cujos `segments` incluem o tipo.
- Tema: 8 cartões com fundo, "Aa" na `displayFont`, acento e face escura, mais o nome do preset e da fonte.
- Cor de fundo: opções **geradas dentro de `baseRange`** e validadas com `isBaseInRange`. Cor de destaque: as do preset mais variações de matiz. O modo escuro mantém o matiz e ajusta a luminosidade (use a lógica atual de `theme-preview`/`presets`, não a do protótipo).
- Densidade: Confortável / Compacto (`densitySchema`).
- Barra fixa com o estado (salvo / alterações pendentes), "Restaurar as cores do tema" (`base` e `accent` voltam a `null`) e Salvar identidade (`updateIdentityAction`).

## 5. Contato (`/contato`)
- Seções em cartão: Sobre (nome, descrição) · Canais (telefone, WhatsApp, Instagram) · Endereço. Horário de funcionamento fica fora desta entrega. Prévia fixa "No topo do cardápio", com as cores da Identidade.
- Telefone e WhatsApp são salvos como dígitos, incluindo o código do país `55` (por exemplo, `551124568737`). Formate para leitura no campo; o cardápio público já remove caracteres não numéricos ao montar `tel:` e `wa.me`. Instagram é salvo sem `@`. Validar e formatar no cliente; o servidor mantém `plainTextSchema` (≤30/≤30/≤60).
- **Descrição:** o schema aceita 500 caracteres; o protótipo mostra 300. Use 500.
- Endereço permanece em um único campo de texto de até 200 caracteres.
- Barra "Alterações não salvas" com Descartar e Salvar (`updateRestaurantProfileAction`).

## 6. Equipe (`/equipe`)
- Cartões por papel (contagem, "Edita" ou "Consulta", `MEMBER_ROLE_HINTS`).
- Tabela: pessoa, "Você", papel (select; o seu não é editável), desde, Remover (aparece no hover) → `changeMemberRoleAction`, `removeMemberAction`. **Confira a regra do último administrador** no DAL/RLS e mostre o erro que ela devolve.
- Convites pendentes: e-mail, papel, criação e validade, Copiar link, Revogar (`revokeInviteAction`). O DAL retorna todos os convites da equipe; derive o estado com `inviteStatus` e filtre os pendentes na página.
- Convidar (modal): e-mail, papel em 4 cartões com a dica de cada um, validade 1/7/30 dias (`createTeamInviteSchema.expiresInDays`) → `createTeamInviteAction`.
- Estado vazio ("Só você por aqui") quando `members.length === 1`.

---

## 7. Celular (≤ 1023 px)
Mesma lógica e mesmas actions; muda só a forma.
- **Casca**: o `MobileDock` do console (Conta · Início · Menu) flutuando. Conta abre a folha com tema e Sair; Menu abre a folha "NAVEGAÇÃO" com as folhas do painel. Início leva ao Cardápio.
- **Cardápio**: faixa de publicação compacta (situação, link e Publicar; o checklist abre ao tocar) → abas de modo roláveis → busca + botão de filtros (folha) + "Ordenar" → chips de filtro roláveis.
  - Lista: deslizar para a direita esgota ou reativa (limiar de 80 px); para a esquerda revela Excluir (88 px); segurar 480 ms abre a folha de ações (Editar, Esgotar/Reativar, Mover para…, Ocultar, Excluir); puxar para baixo atualiza (`router.refresh()`); tocar abre o editor. Duplicação e seleção em massa não aparecem nesta entrega.
  - Modo **Ordenar**: alça de arrastar (linha de 76 px, os vizinhos deslizam) e setas; gestos de deslizar desligados.
  - Grade 2 colunas, Estúdio com abas Editar/Prévia e seletor de itens, Quadro em carrossel com `scroll-snap`, Planilha compacta (nome, preço, disponível), Sequência e Serviço em uma coluna.
- **Editor do item**: sheet que abre em 60%, puxa para 100% (arrastar mais de 70 px para cima) e fecha ao puxar para baixo (mais de 110 px). O botão Expandir/Reduzir faz o mesmo.
- **Modais** viram bottom sheets com a alça.
- **Identidade**: a prévia fica fixa no topo e recolhe para uma barra ao rolar (celular 146 px → miniatura, com as bolinhas das cores e o botão "Ver").
- **Contato e Equipe**: seções empilhadas; a barra de salvar fica acima do dock.
- Alvos de toque de no mínimo 44 px. Respeite `prefers-reduced-motion` nos gestos (sem mola, só a troca de estado).

---

## 8. Ordem sugerida
1. Seção 0 (tabela de contratos) → 2. tokens, fonte e casca (seção 1) → 3. Cardápio: Lista, Índice e Grade + editor + categoria → 4. Identidade → 5. Contato → 6. Equipe → 7. modos de trabalho → 8. celular → 9. estados e skeletons.

## 9. Registro original de pendências (resolvidas abaixo)

A tabela abaixo registra as perguntas que existiam antes da decisão. A tabela de decisões aprovadas ao final deste documento prevalece sobre estas alternativas antigas.
| Item do protótipo | Situação no código | Opções |
|---|---|---|
| Duplicar item | não há action | nova `duplicateItemAction` (copia item, variantes e mídia com novo `storagePath`?) ou montar no cliente com create + variants + register |
| Ações em lote | não há action | `Promise.all` das actions unitárias com rollback, ou novas actions em lote com um único `revalidate` |
| Tags dietéticas fixas | texto livre (`dietaryTags`) | constante de sugestões no domínio, mantendo o texto livre |
| Horário de funcionamento | não existe | nova chave em `contact` (jsonb) com schema próprio, ou coluna nova + migration; o cardápio público passa a mostrar "Aberto agora" |
| Endereço dividido | `address` texto ≤200 | manter um campo só (com máscara de CEP opcional) ou estender `contact` com `addressParts` |
| Formato de telefone salvo | texto livre ≤30 | salvar só os dígitos e formatar na borda |
| Logo e capa no checklist | a confirmar | só recomendação ou regra de publicação |
| Convites de equipe pendentes na Equipe | a confirmar no DAL | nova leitura no DAL se não existir |
| Preferência de modo do Cardápio | não existe | `localStorage` por restaurante (sem servidor) |

Qualquer mudança de schema segue o fluxo de `supabase/migrations` + `build-schema.sh` + `database.types.ts`, e a RLS correspondente.

### Decisões aprovadas e confirmações da auditoria

As decisões abaixo foram aprovadas para esta entrega. Não adicionar novas regras de banco ou migrations para atendê-las.

| Tema | Decisão / contrato confirmado |
|---|---|
| Duplicar item | Fora do escopo; ocultar a ação porque não existe action de duplicação. |
| Ações em lote | Fora do escopo; não oferecer seleção múltipla nem mutações parciais via `Promise.all`. |
| Tags dietéticas | Texto livre com sugestões clicáveis; sugestões não restringem o schema atual. |
| Horário de funcionamento | Fora do escopo; não persistir nem exibir “Aberto agora”. |
| Endereço | Um campo de texto, `contact.address`, até 200 caracteres. |
| Telefone | Salvar somente dígitos com código do país, incluindo `55`; formatar apenas no campo de edição. |
| Logo e capa | Não são requisito de publicação. Podem aparecer como recomendação, sem bloquear o botão. |
| Convites | `listInvites` devolve todos os convites do restaurante; `inviteStatus` distingue pendentes, vencidos, revogados e resgatados. |
| Último administrador | `changeMemberRole` e `removeMember` recusam a operação e retornam a mensagem “Este é o único administrador. Promova outra pessoa antes de mudar este papel.” |
| Preferência de modo | `localStorage` por restaurante, sem nova persistência no servidor. |
| Publicação | Requer ao menos um item visível e mídia em todos os itens visíveis. A checagem existente não considera `category.isVisible`; manter esse comportamento nesta entrega. |
| Feed público | Filtra categorias ocultas e vazias, itens ocultos e itens sem mídia. `isAvailable` não remove o item do feed. |