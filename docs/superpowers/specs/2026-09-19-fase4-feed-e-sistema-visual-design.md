# Fase 4 — O cardápio como feed e o conserto do sistema visual: desenho

Data: 2026-09-19

## 1. O que esta fase muda

Três mudanças, e a primeira sustenta as outras duas:

1. **As cores passam a ter papel.** Hoje todos os tokens de tema saem da mesma regra — "a candidata de maior contraste". Isso está certo para texto e errado para fio divisório e para destaque, e é a causa única do cardápio ilegível que motivou esta fase.
2. **O cardápio público deixa de ser lista e vira feed.** Uma coluna por prato no eixo horizontal, uma tela por mídia no eixo vertical, capa do restaurante como coluna zero, trilho de categorias fixo. Os quatro layouts de tema deixam de existir: tema passa a ser paleta, tipografia e raio.
3. **Mídia deixa de ser opcional.** Todo item precisa de foto ou vídeo para o cardápio ir ao ar. A recusa acontece na publicação, não na criação.

O que provocou a fase: o cardápio no ar tinha o nome da categoria e o preço invisíveis, o logo desenhado atrás da capa, e nenhuma escrita do sistema revalidava o que precisava revalidar. Três defeitos com a mesma assinatura — uma regra correta aplicada onde ela não valia.

### 1.1 O estado medido antes da fase

Tudo abaixo foi conferido no app rodando, não inferido.

| Sintoma | Medição |
|---|---|
| Destaque invisível no escuro | `#241e0a` sobre `#131312` = **1,1:1**. O mesmo par na face clara dá 16,0:1, e é só a face clara que o servidor confere. |
| Seis dos oito presets aceitam destaque que quebra no escuro | Simulado com quatro cores plausíveis: todas passam de 7:1 no claro e caem para 1,1–2,2:1 no escuro. |
| Fio divisório com peso de texto | Face escura do Sal: fio a **15,2:1** contra o fundo, texto a 16,5:1. Vale nas 16 faces. |
| Logo atrás da capa | Capa ocupa y 0→176 com `position: relative`; logo ocupa y 136→216 e é estático. Elemento posicionado pinta por cima. |
| Revalidação apontando para o lugar errado | **36** chamadas de `revalidatePath('/')`. |

## 2. Decisões tomadas, e por quê

| # | Decisão | Razão |
|---|---|---|
| 1 | Cada token de cor ganha regra própria | Uma regra só ("mais contraste") produz texto legível e fio gritante. O fio quer o contraste mínimo suficiente, não o máximo. |
| 2 | O destaque é **derivado por face**, a partir de uma cor do dono | O destaque é a marca. Marca que vira outra cor no escuro deixa de ser marca. Mover só a luminosidade em OKLCH preserva o que o olho reconhece. |
| 3 | O piso do destaque sobe de 3:1 para 4,5:1 | `--m-accent` pinta o nome da categoria e o preço. São **texto**; 3:1 é o limiar de elemento de interface. |
| 4 | A pré-visualização passa a mostrar **as duas faces** | Mostrar só a clara foi o que permitiu o bug chegar ao ar. Com o destaque derivado, há o que conferir nas duas. |
| 5 | Layout único; tema = paleta + tipografia + raio | Se todo item tem mídia, `sem-foto` não descreve nada. Quatro layouts viravam quatro caminhos de teste para uma diferença que deixou de existir. |
| 6 | Horizontal = prato, vertical = mídia, **sem exceção** | A alternativa — rolar entra no feed, e dentro do feed rolar troca a mídia — faz o mesmo gesto significar duas coisas, com a fronteira invisível. |
| 7 | A capa é a **coluna zero** do feed | Mantém a capa como primeira tela sem criar uma zona onde o gesto muda de sentido. |
| 8 | Texto sobre mídia usa **véu do tema**, não sombra genérica | A foto é imprevisível; o véu é cor conhecida. É o que permite medir contraste num fundo que é imagem. |
| 9 | Ponto focal, não editor de recorte | Um clique resolve o caso real (prato no terço inferior). Editor de recorte é uma tela inteira para o mesmo ganho. |
| 10 | Proporção é **recomendada**, não exigida | Exigir 9:16 rejeita o acervo que o restaurante já tem no celular, e o custo cai sobre quem a gente quer convencer a usar. |
| 11 | Mídia obrigatória recusa na **publicação** | Recusar na criação obriga a ter 80 fotos antes de digitar o primeiro nome. Recusar na publicação diz "monte à vontade, mas o cliente não vê cardápio pela metade". |
| 12 | Item sem mídia **não aparece** no feed, mesmo publicado | Terceira camada, no espírito das três da autorização: nenhum caminho produz coluna vazia — inclusive apagar a última foto com o cardápio no ar. |
| 13 | `revalidatePath` passa a receber o caminho de **destino** | É o que a doc empacotada manda (`revalidatePath.md:57`). O proxy reescreve; passar a origem não revalida nada. |
| 14 | Tags de cache ficam **fora** desta fase | `use cache` exige `cacheComponents: true`, que muda a semântica de cache do app inteiro. É fase própria. |
| 15 | A raiz do painel deixa de ser `/` | `/` é o único pathname que o site e o painel dividem. Enquanto dividirem, qualquer camada que chaveie por caminho pode servir a árvore errada. |

## 3. O sistema de cor: tokens por papel

### 3.1 O que está errado hoje

`faceToVars` em `src/lib/theme/resolve.ts` passa `ink`, `muted` e `line` pela mesma `pickByContrast`, e copia `accent` cru para as duas faces. `pickByContrast` devolve a candidata de **maior** contraste contra o fundo. Consequências:

- `ink` e `muted`: correto. As 16 faces passam com folga.
- `line`: sempre a opção mais gritante disponível. Num fundo claro sai um fio quase preto; num escuro, um fio quase branco. Nas 16 faces.
- `accent`: não passa por regra nenhuma. O valor que o dono escolheu vai para a face escura sem conferência.

### 3.2 A regra nova, por token

| Token | Regra | Piso |
|---|---|---|
| `--m-base` | escolha do dono, dentro da faixa OKLCH do preset | inalterado |
| `--m-ink` | `pickByContrast` — máximo contraste | ≥ 7:1 |
| `--m-muted` | `pickByContrast` — máximo contraste | ≥ 4,5:1 |
| `--m-line` | **par**, escolhido pela luminosidade do fundo | faixa 1,08–2,5:1 |
| `--m-accent` | **derivado por face** a partir da cor do dono | ≥ 4,5:1 |
| `--m-on-accent` | melhor candidata contra o **destaque**, depois empurrada por `fitContrast` | ≥ 4,5:1 |
| `--m-veil` | novo. Véu sobre mídia, derivado de `--m-base` | garante o piso de `--m-ink` sobre foto |

**O fio deixa de ser escolha por contraste.** A tupla `line: [claro, escuro]` já significa "o primeiro serve fundo claro, o segundo serve fundo escuro". A conferência de faixa existe para pegar um preset novo mal calibrado, não para decidir.

**A chave é a luminosidade do fundo, não o nome da face.** Brasa e Neon têm face **clara** com fundo **escuro** — `brasa.light.base` é `#0d0c0b`, L = 0,16. Indexar por `light`/`dark` daria fio claro sobre quase-preto nos dois. A regra é `hexToOklch(base).l >= 0.5 ? line[0] : line[1]`, e ela vale também para um fundo personalizado que o dono escolheu dentro da faixa do preset.

**A faixa 1,08–2,5:1 é medida, não arbitrada.** Com a regra acima, os dezesseis fios calibrados à mão na Fase 3 caem entre **1,11:1 e 1,24:1** — a mesma ordem de grandeza do cinza de borda padrão do Tailwind sobre branco. Uma faixa mais apertada reprovaria os dezesseis sem ganho nenhum. O piso de 1,08 pega o fio que sumiu no fundo; o teto de 2,5 pega o defeito real desta fase, que hoje está em 12–15:1.

**O destaque passa a ser derivado.** O dono continua escolhendo **uma** cor. Para cada face, o sistema converte para OKLCH, preserva matiz e croma, e move `L` até o par bater 4,5:1 contra o fundo daquela face. Se o teto de `L` (0 ou 1) for alcançado sem atingir o piso — cor de croma muito alto num fundo de luminosidade próxima — a cor é recusada no momento da escolha, com o motivo.

**A derivação não é silenciosa.** Quando a cor derivada difere da escolhida, o formulário mostra as duas lado a lado — "você escolheu / no escuro aparece assim" — e só libera o salvar depois que o dono confirma. Sem isso a cor da marca mudaria pelas costas dele, e ele só descobriria se olhasse a pré-visualização escura.

O aceite é **regra de interface, não de servidor**: o servidor não tem como saber se alguém olhou para uma tela. O que o servidor faz continua sendo recusar o impossível — a cor que não atinge o piso em alguma face nem no extremo de luminosidade.

**`--m-on-accent` precisa da mesma derivação, e isso foi descoberto pelo guarda.** O destaque derivado pode pousar em meio-tom, que é justamente onde nenhuma das duas tintas do preset alcança 4,5:1 contra ele. Escolher a melhor candidata não bastava: 44 das 96 faces de prova reprovavam. A regra passa a ser escolher **e depois empurrar**, caindo em preto ou branco puro se nem isso servir.

Alternativas descartadas:

- **Dono escolhe duas cores.** Mais interface, e ele não tem como julgar a face escura enquanto a pré-visualização não a mostrar — e mesmo mostrando, é decisão que ele não deveria precisar tomar.
- **A face escura ignora a escolha e usa o padrão do preset.** É o que a spec da Fase 3 descreve e o código não faz. Funciona, mas a marca some do escuro, que é onde metade dos celulares está.
- **Recusar toda cor que não sirva nas duas faces como escolhida.** Garantiria que o dono sempre vê a cor exata que escolheu, mas recusaria cores de marca legítimas: um vinho escuro serve no claro e não serve no escuro, e aí a marca fica de fora do cardápio noturno inteiro.

### 3.3 O que isso move

- `src/lib/color.ts` ganha `oklchToHex` (a volta não existe hoje — só `hexToOklch`) e `fitContrast(cor, fundo, piso)`, que move `L` preservando `C` e `H`.
- `src/lib/theme/resolve.ts`: `faceToVars` deixa de ser uma função com uma regra e passa a aplicar a regra de cada papel.
- `src/server/dal/restaurants.ts:203-212`: a validação do destaque roda **nas duas faces** e o piso sobe para 4,5.
- `src/components/painel/identity-form.tsx`: a mesma conferência, nas duas faces, no momento da escolha.
- `src/components/painel/theme-preview.tsx`: duas telas lado a lado, clara e escura.

## 4. A apresentação pública: o feed

### 4.1 A regra de navegação

> **Horizontal = onde estou no cardápio. Vertical = o que tem nesta parada.**

Uma regra, sem exceção e sem fronteira invisível.

```
[ capa ] → [ prato 1 ] → [ prato 2 ] → [ prato 3 ] ...
    ↓           ↓             ↓             ↓
identidade   mídia 1       mídia 1       mídia 1
contato      mídia 2       mídia 2       mídia 2
endereço     mídia 3       vídeo
```

- **Coluna zero é a capa.** Logo, nome, descrição, atalhos de contato, endereço. Continua sendo a primeira coisa que se vê.
- **Colunas 1..n são os pratos**, em **lista plana**: todos os pratos de todas as categorias, na ordem de `position` dentro de cada uma. Não existe "conjunto de colunas da categoria atual" a ser trocado — a categoria é uma propriedade da coluna, não um filtro sobre a lista.
- **Telas verticais de um prato são as mídias**, na ordem de `position`.
- Ao passar da última coluna de uma categoria, a próxima categoria entra em sequência. O trilho acompanha.
- Voltar à capa: deslizar até o começo, ou tocar no logo no trilho.

**Os dois eixos são `scroll-snap` nativo aninhado** — `x mandatory` no rolador externo, `y mandatory` dentro de cada coluna. Não há JS de gesto. Isso dá inércia correta, sobrevive a `prefers-reduced-motion`, funciona com teclado (setas) e continua sendo DOM real para leitor de tela.

### 4.2 O trilho

Fixo no topo, sobre as colunas. À esquerda o logo, que volta para a capa. À direita as categorias, roláveis na horizontal. Tocar numa categoria **rola até a primeira coluna dela**. É isso que resolve "oitenta itens, quero Bebidas".

**Rolar, e não trocar o conjunto de colunas.** A primeira redação desta seção dizia "troca o conjunto", o que contradizia a §4.1 — se o conjunto é trocado, a categoria seguinte não tem como entrar em sequência sem uma emenda invisível no meio do deslize. Com a lista plana, as duas frases valem literalmente e some um estado que teria de ser mantido em sincronia com a posição do rolador.

Um contador discreto (`3 / 12`) diz a posição dentro da categoria. Pontinhos verticais à direita marcam quantas mídias o prato tem.

### 4.3 O que fica sobre a mídia

O nome e o preço pertencem à **coluna**, não à tela: ficam fixos no rodapé e **não trocam** quando a mídia troca. É o que separa "feed de um prato" de "carrossel de fotos soltas".

| Elemento | Comportamento |
|---|---|
| Nome | rodapé fixo, `--m-font-display` |
| Preço | rodapé fixo, `--m-accent` sobre o véu |
| Variações | havendo variações, o preço base some (regra atual). O rodapé mostra "a partir de R$ X"; a lista vai na folha |
| Descrição | duas linhas com "ver mais"; a folha abre o texto inteiro. Nunca empurra a mídia |
| Esgotado | **texto**, não opacidade. Regra atual, mantida |
| Tags alimentares | chips acima do nome |

### 4.4 Legibilidade sobre foto

O texto vai sobre imagem arbitrária. A resposta é `--m-veil`: um gradiente de `--m-base` com alpha subindo do rodapé, com o texto em `--m-ink` por cima.

**A faixa de texto do rodapé tem alpha ≥ 0,92.** Esse número não é gosto: é o que faz o fundo efetivo ficar perto o suficiente de `--m-base` para as razões medidas na §3 continuarem valendo sobre qualquer foto. Com alpha menor, a foto atravessa e o contraste vira loteria; com o gradiente subindo acima da faixa, a transição para a imagem limpa continua suave.

Consequência que amarra esta seção à §3: os pisos da §3.2 são medidos contra `--m-base`, e o véu garante que o fundo efetivo do texto **é** `--m-base` dentro de uma tolerância conhecida. É assim que os oito temas continuam significando alguma coisa quando a tela inteira é imagem.

### 4.5 Rede

O `src/domain/media.ts` já decidiu que dados móveis numa mesa são caros — vídeo limitado a 10MB e 15s. Um feed de tela cheia é a coisa mais pesada que este app já serviu, e o desenho paga por isso:

- Só carregam as mídias **vizinhas**: coluna anterior e próxima, tela anterior e próxima. O resto fica com placeholder derivado do tema.
- Vídeo: `preload="none"`, `poster` sempre, **sem som**, e só toca ao entrar na tela.
- `navigator.connection.saveData` e `effectiveType`, quando o navegador expõe, desligam o autoplay e reduzem a janela de pré-carga para zero.
- `prefers-reduced-motion` desliga o snap animado e o autoplay.

**As imagens passam a usar `next/image`.** Hoje são `<img>` cru com `eslint-disable`, servindo o arquivo original do Supabase Storage no tamanho em que foi enviado — numa tela cheia, é o maior desperdício de banda do app. `next/image` com `remotePatterns` apontando para o host do Storage dá redimensionamento no servidor e `srcset` por densidade de tela, e **não** exige mexer na CSP: o otimizador serve por `/_next/image`, que já está coberto por `img-src 'self'`.

O custo é acoplar o cardápio público ao otimizador do Next e carregá-lo com o processamento. Se isso virar problema de custo ou de latência, a saída registrada é a API de transformação de imagem do próprio Supabase Storage, que devolve a URL já redimensionada e tira o Next do caminho — troca localizada em `src/lib/media-url.ts`, que é justamente por isso que essa função existe.

Vídeo continua em `<video>`; não há otimizador para ele.

### 4.6 Os componentes

| Novo | Papel |
|---|---|
| `menu-feed.tsx` | rolador horizontal; dono do estado de categoria |
| `menu-cover.tsx` | a coluna zero — substitui `menu-header.tsx` |
| `menu-dish.tsx` | uma coluna: rolador vertical + rodapé fixo |
| `menu-media.tsx` | uma tela: imagem ou vídeo, com o véu |
| `menu-rail.tsx` | o trilho |
| `menu-details.tsx` | a folha com descrição e variações |

Saem: `menu-category.tsx`, `menu-item.tsx`, `menu-header.tsx`.

`theme.css` perde os blocos `[data-layout]` e `[data-density='compacto'] .menu-item-description` — não há mais layout variável nem descrição de lista para recolher — e ganha as regras do feed. `data-density` sobrevive como ritmo tipográfico da capa e do rodapé.

`ThemePreset['layout']` sai de `src/domain/theme.ts`. `density` fica.

## 5. Mídia: proporção, ordem e obrigatoriedade

### 5.1 O que já existe

`menu_item_media` já tem `position integer not null default 0` e índice em `(item_id, position)`; as duas consultas de `src/server/dal/menu.ts` já ordenam por ele. Também existem `width` e `height`, hoje sem uso. O que **não** existe é ação de reordenar: `src/server/actions/media.ts` tem apenas criar ticket, registrar e apagar.

### 5.2 O corte

A tela é `100dvh × 100vw` e a mídia preenche com `cover`. Foto quadrada ou paisagem vira recorte central cego — o mesmo defeito do logo, ocupando o celular inteiro.

**Ponto focal.** Duas colunas novas, `focal_x` e `focal_y`, `numeric` com padrão `0.5`, aplicadas como `object-position: calc(focal_x * 100%) calc(focal_y * 100%)`. No painel, o dono clica no ponto da foto que não pode sair do quadro.

A proporção recomendada (retrato, 4:5 ou 9:16) é **comunicada** no envio. Não é exigida.

### 5.3 A ordem passa a importar

Hoje `media[0]` é só a miniatura. No feed, a ordem **é** a ordem das telas, e a primeira abre o prato. Entra `reorderItemMedia`, no mesmo formato do `reorderSchema` que o cardápio já usa para categorias e itens — reaproveita o padrão, não inventa outro.

`MEDIA_LIMITS.image.maxPerItem` baixa de **6 para 4**. Com o vídeo, são cinco telas verticais por prato. Seis mais uma eram uma galeria numa lista; num feed são sete paradas antes do próximo prato.

### 5.4 A obrigatoriedade

Em três camadas, no espírito das três da autorização:

1. **Publicação recusa.** `setPublished(true)` falha se houver item visível sem mídia. A mensagem traz a contagem, e o `PublishBar` lista os itens com link direto.
2. **O feed esconde.** `getPublicMenu` filtra item sem mídia, mesmo num cardápio publicado. Cobre o caso de apagar a última foto com o cardápio no ar.
3. **O painel avisa.** `getMenuForOwner` devolve a pendência; a linha do item mostra o que falta.

### 5.5 O acervo que já existe

- Restaurantes **já no ar continuam no ar**. Despublicar o cardápio de um cliente por causa de uma regra nova é a plataforma decidindo sobre o negócio dele.
- Os itens sem mídia ficam ocultos (§5.4.2) e aparecem como pendência.
- A recusa na publicação vale a partir da **próxima** publicação.

## 6. Revalidação e território

### 6.1 O caminho de destino

`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md:57`:

> "When using rewrites, you must pass the **destination** path (the actual route file location), not the source path that appears in the browser's address bar."

O proxy reescreve `/` para `/painel`. As 36 chamadas passam `/`, a origem. Resultado: nada em `/painel/**` é revalidado, nada em `/[slug]` é revalidado, e a única rota invalidada é `app/(site)/page.tsx`.

**Um helper, chamado dos 36 lugares:**

```
src/server/revalidate.ts

revalidateRestaurant({ id, slug })
  revalidatePath(`/${slug}`)                              // público: sem rewrite, caminho literal
  revalidatePath(`/painel/restaurantes/${id}`, 'layout')  // destino
  revalidatePath(`/admin/restaurantes/${id}`, 'layout')   // destino
```

**Custo explícito:** as actions recebem `itemId`, `categoryId`, `mediaId` — não sabem o restaurante. A DAL **já carrega** a linha do restaurante em cada escrita, para autorizar. Então as funções de escrita da DAL passam a devolver `{ id, slug }` do restaurante afetado. É mudança de assinatura em torno de vinte funções, mecânica e conferível uma a uma.

Tags (`revalidateTag`) seriam melhores, porque tag não sabe o que é território. Ficam fora: `use cache` exige `cacheComponents: true` (`use-cache.md:29`), que muda a semântica de cache do app inteiro.

### 6.2 A página do "escanear" dentro do painel

**O que foi medido:** o proxy roda em requisição normal, em RSC/prefetch e em POST de server action. Os três foram testados contra `painel.localhost:3000` e os três devolveram 307 para `/entrar`. Não é proxy sendo pulado.

**Hipótese principal, com mecanismo:** quando uma action do painel chama `revalidatePath('/')`, ela invalida e faz reconstruir a árvore do caminho `/` — que é `app/(site)/page.tsx`. O POST passou pelo proxy e foi reescrito; a revalidação carrega o caminho externo cru. Bate com a intermitência relatada: acontece depois de salvar ou de entrar, não ao abrir a página do zero.

**Correção, em duas camadas, e as duas entram independentemente do que a reprodução mostrar:**

1. Os caminhos de destino (§6.1). É a causa provável e é correção obrigatória de qualquer forma.
2. `/` deixa de ser a landing do painel. `app/painel/page.tsx` passa a redirecionar para `/restaurantes`, e a lista de restaurantes vive em `app/painel/restaurantes/page.tsx`. Assim site e painel param de dividir pathname, e nenhuma camada que chaveie por caminho — router cache, full route cache, CDN em produção — tem como servir a árvore errada.

**O que a mudança 2 arrasta, e precisa entrar junto:**

- `signInAction` deixa de cair em `/` por padrão. O padrão de `safeNextPath` passa a ser `/restaurantes`. Sem isso o login continua passando pela rota ambígua, que é exatamente o que se quer tirar do caminho.
- `TopBar` aponta para `/restaurantes` no painel. Ela serve os dois territórios, então o destino vira propriedade da variante, e não `/` fixo — no console continua sendo `/`, que lá **não** é ambíguo porque o território público não tem lista de restaurantes.
- `TerritoryNav` compara `item.href === '/'` com `pathname.replace(/^\/(admin|painel)/, '') === ''`. Com a raiz do painel virando redirecionamento, esse ramo deixa de ser alcançável no painel e continua valendo no console. Fica como está, com um comentário dizendo por quê — apagá-lo quebraria o console.
- O desvio de `listMyRestaurants().length === 1` para `/restaurantes/${id}` muda de `app/painel/page.tsx` para `app/painel/restaurantes/page.tsx`. O comportamento visto pelo dono não muda.

**Pendência de confirmação:** uma reprodução precisa é desejável para cravar a camada — em que momento exato a página aparece. A ausência dela não bloqueia a fase.

### 6.3 A página raiz pública

`app/(site)/page.tsx` é hoje `<main><h1>` sem uma classe. É o que alguém vê ao digitar o domínio sem slug. Passa a ser uma página de verdade — pequena, não é site de marketing — com a tipografia e a superfície do sistema, dizendo o que é o produto e com um caminho para quem é dono de restaurante entrar no painel.

## 7. As correções travadas

| O quê | Onde | Como |
|---|---|---|
| Logo atrás da capa | `menu-header.tsx` → `menu-cover.tsx` | `relative z-10` |
| Logo recortado | `.menu-photo` | o logo usa `contain` com respiro. Recortar logo é sempre errado |
| Erro de console do Base UI | `publish-bar.tsx:82`, `comecar/page.tsx:79` e `:87`, `admin/not-found.tsx:12` | `button.md:150` é explícito: link **não** passa pelo `render` do Button. Vira `<Link className={buttonVariants({...})}>` |
| `cursor: pointer` | `globals.css`, `@layer base` | `button:not(:disabled)`, `[role="button"]`, `a[href]`, `label[for]`, `summary` |

## 8. Migrações

**`0015_media_focal.sql`**

- `alter table public.menu_item_media add column if not exists focal_x numeric not null default 0.5`
- idem `focal_y`
- `check (focal_x between 0 and 1)`, idem `focal_y`

Idempotente por `if not exists`, no padrão que o projeto já usa. Não há conversão de tipo, então não precisa do bloco condicional que `0011` precisou.

Nenhuma migração remove coluna. `width` e `height` continuam sem uso e não atrapalham; removê-las seria trabalho sem ganho e uma migração destrutiva a mais para aplicar à mão no SQL Editor.

## 9. Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Destaque escolhido que não atinge 4,5:1 em alguma das faces | Recusado no servidor e no momento da escolha, dizendo **qual** face falhou e qual o mínimo |
| Destaque de croma alto que não atinge o piso nem no limite de `L` | Recusado, com sugestão da cor mais próxima que passa |
| `theme.preset` desconhecido | Cai no padrão. Regra atual, mantida |
| Item sem mídia num cardápio publicado | Oculto no feed, pendência no painel. O cliente nunca vê coluna vazia |
| Categoria cujos itens estão todos sem mídia | A categoria some do trilho. Trilho com categoria que não leva a lugar nenhum é pior que trilho mais curto |
| Cardápio publicado sem nenhum item com mídia | O feed mostra só a capa, com uma linha dizendo que o cardápio está sendo montado |
| Publicar com item visível sem mídia | Recusado, com a contagem e a lista |
| Vídeo que falha ao carregar | Cai no `poster`. Sem poster, cai no placeholder do tema. A tela nunca fica preta |
| `saveData` ligado | Autoplay desligado, janela de pré-carga zerada, vídeo só toca por toque |
| Mídia com proporção fora de retrato | `cover` com o ponto focal. Sem ponto focal gravado, centro |
| Item com uma mídia só | Sem pontinhos verticais. Indicador que indica um item só é ruído |

## 10. O que esta fase não inclui

- **Cache Components** (`use cache`, `revalidateTag`). §2.14.
- **Busca dentro do cardápio.** O trilho resolve a navegação; busca é outra conversa.
- **Compartilhar um prato** com link direto para a coluna. Natural depois, e barato quando o feed existir.
- **Transcodificação de vídeo no servidor.** O limite de 10MB e 15s continua sendo validado no navegador, com a limitação já registrada na Fase 2.
- **Métricas** de quais pratos são mais vistos no feed — que é o dado que este formato torna possível pela primeira vez, e por isso mesmo merece desenho próprio.
- **Editor de recorte** de imagem. §2.9.

**Custo declarado do feed:** é a apresentação pública inteira reescrita, e ela é o produto. Se o prazo apertar, o corte natural **não** é entregar meio feed — é entregar a §3 (cor), a §6 (revalidação e território) e a §7 (correções), que são independentes e consertam o que está quebrado hoje, e adiar §4 e §5 em bloco. Meio feed é pior que a lista atual.

## 11. Verificação

No padrão que as fases anteriores estabeleceram:

- **Código:** `pnpm exec tsc --noEmit` limpo. Lint não é portão.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **Script de contraste:** um `npx tsx` que roda os 8 presets × 2 faces × todos os tokens da §3.2, imprime a tabela e sai com código diferente de zero quando a regra do token é violada. As regras não são todas do mesmo tipo, e o script precisa distinguir: `ink`, `muted`, `accent` e `on-accent` têm **piso** — falham abaixo dele. `line` tem **faixa** — falha abaixo de 1,08:1 por sumir, e falha acima de 2,5:1 por competir com o texto. É esse segundo caso que nenhuma verificação pegava, e é ele que deixou as 16 faces com o fio errado. O script roda também sobre destaques personalizados de exemplo, nas duas faces, provando a derivação da §3.2.
- **Prova de que a revalidação chega:** editar um item e conferir que o cardápio público mudou sem esperar TTL, e que a tela do painel trocou sozinha.
- **Prova da obrigatoriedade:** tentar publicar com item sem mídia e ser recusado; apagar a última mídia de um item com o cardápio no ar e conferir que ele some do feed e aparece como pendência.
- **Roteiro no navegador**, em tamanho de celular, nos **oito temas** e nas **duas faces**: capa, trilho, troca de categoria, deslize horizontal entre pratos, rolagem vertical entre mídias, folha de detalhes, item esgotado, item com variações.
- **Roteiro de rede:** com `saveData` ligado e com rede lenta emulada, conferir que nada toca sozinho e que só as mídias vizinhas são buscadas.
- **Capturas de tela** anexadas a cada tarefa que muda o visual. A conferência não é delegada para quem pediu.

## 12. Restrições herdadas

Continuam valendo, sem mudança:

- **Nada de git.** Nenhum `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.** Esta versão do Next tem mudanças de contrato em relação ao conhecimento prévio.
- **Composição usa `render`, nunca `asChild`.** O shadcn deste projeto é sobre Base UI. E link não passa pelo `render` do Button — §7.
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Diálogo nunca vive dentro de menu suspenso.**
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions são a exceção deliberada.
- **`@/lib/color` não importa nada de `@/server`.** É o que permite a pré-visualização ao vivo existir, e a §3 depende disso continuar verdadeiro.
- **Rotas são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`; o proxy reescreve. Exceção registrada: `revalidatePath` recebe o **destino** — §6.1.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
