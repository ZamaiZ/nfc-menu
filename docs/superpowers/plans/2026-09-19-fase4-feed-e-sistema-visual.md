# Fase 4 — O cardápio como feed e o conserto do sistema visual: plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas (`- [ ]`) para acompanhamento.

**Objetivo:** consertar o sistema de cor dos oito temas, trocar o cardápio público de lista por um feed de dois eixos com mídia obrigatória, e fazer a revalidação apontar para os caminhos que ela precisa invalidar.

**Arquitetura:** a cor deixa de sair de uma regra única e passa a ter uma regra por papel, resolvida no servidor e entregue como variáveis CSS — nenhum tema chega ao navegador como JavaScript, igual à Fase 3A. O cardápio público vira dois roladores `scroll-snap` nativos aninhados: horizontal para prato, vertical para mídia, sem JavaScript de gesto. A revalidação passa a receber o caminho de **destino** do proxy, e a raiz do painel sai de `/` para parar de dividir pathname com o site.

**Pilha:** Next 16.3.5 (App Router, `proxy.ts`), React 19.2.8, Tailwind v4, shadcn sobre Base UI, `motion@13`, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-19-fase4-feed-e-sistema-visual-design.md`

## Restrições globais

Valem para **todas** as tarefas.

- **Nada de git.** Não rodar `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados, e só.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **A verificação de código é `pnpm exec tsc --noEmit`.** Lint não é portão.
- **As provas de lógica rodam com `pnpm exec tsx <arquivo>`.** O arquivo da prova vai no **diretório temporário da sessão**, nunca no projeto — ele é andaime de verificação, não código de produção. **Exceção declarada:** o script de contraste da Tarefa 2 vai para `scripts/verificar-contraste.ts`, dentro do projeto, porque ele é guarda de regressão e guarda que morre com a sessão não guarda nada. É o único arquivo de verificação que fica.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.** Esta versão do Next tem mudanças de contrato em relação ao conhecimento prévio.
- **Composição usa `render`, nunca `asChild`.** E **link não passa pelo `render` do Button** — `node_modules/@base-ui/react/docs/react/components/button.md:150` é explícito. Link que parece botão usa `<Link className={buttonVariants({ variant, size })}>`.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Toast:** `toast.add({ title, description, type })`, com `type` em `success | error | info | warning | loading`.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions de `@/server/actions` são a exceção deliberada.
- **`@/lib/color` não importa nada de `@/server`.** Ele roda nos dois lados, e é isso que permite a pré-visualização ao vivo existir.
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Rotas em `href` e `redirect` são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`; o proxy reescreve. **Exceção: `revalidatePath` recebe o caminho de DESTINO** — `/painel/restaurantes/x`. É o oposto da regra de `href`, e é de propósito (Tarefa 5).
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **Preço em centavos inteiros**; conversão para exibição só na borda, via `formatPriceBRL`.
- **Alvo de toque mínimo de 44px**, e cor nunca sendo o único portador de significado.

## Desvios registrados na execução

Emendados aqui, no lugar, em vez de virarem documento novo. Tudo abaixo foi
medido, não suposto.

**Bloco A**

1. **`--m-on-accent` precisou da mesma derivação de `--m-accent`.** O guarda
   da Tarefa 2 acusou **44 das 96** faces de prova reprovando: destaque
   derivado pousa em meio-tom, e aí nenhuma das duas tintas do preset alcança
   4,5:1 contra ele. Entrou `onAccentFor`, que escolhe e **depois** empurra,
   caindo em preto ou branco puro se nem isso servir.
2. **A faixa do fio virou 1,08–2,5:1**, medida. A de 1,4–2,2 que a spec trazia
   era arbitrada e reprovaria os dezesseis fios calibrados na Fase 3, que caem
   entre 1,11 e 1,24.
3. **O aceite explícito da derivação** entrou na Tarefa 3, a pedido do dono do
   projeto durante a execução. Sem ele a cor da marca mudaria em silêncio.
   Spec atualizada na §3.2.

**Bloco B**

4. **`_alvo.ts` ficou com uma função só.** O plano previa `alvoDoItem` e
   `alvoDaCategoria`; elas seriam redundantes, porque `menu.ts` já tem
   `ownerRestaurantOf` — a função que fecha o IDOR e portanto roda de
   qualquer forma. Cada escrita captura o id que ela já resolve e chama
   `alvoDoRestaurante`.
5. **`revalidateCaminhoPublico` não estava no plano.** Quando a plataforma
   troca o endereço, o slug ANTIGO também precisa ser invalidado, senão
   `/{slugAntigo}` continua servindo. `updateRestaurantSlug` passou a
   devolver `slugAnterior`.
6. **`revalidateListas` varre `/painel` e `/admin` inteiros**, e não
   `/painel/restaurantes` e `/admin/restaurantes`. Saber em qual página cada
   lista mora é acoplamento que quebra quando alguém move uma tela — e no
   console a lista de convites de plataforma mora em `/admin`, não em
   `/admin/restaurantes`.
7. **O destino da `TopBar` virou propriedade da variante.** No console, `/` é
   a tela de **Convites**, não a lista; apontar os dois para `/restaurantes`
   teria mudado o comportamento do console.
8. **`admin/not-found.tsx` apontava para o lugar errado** antes desta fase: o
   botão dizia "Voltar para a lista" e levava a `/`, que é Convites. Corrigido
   para `/restaurantes` junto com a troca do `render`.
9. **`protocolPadrao()` em `territory.ts`** resolveu a pendência de `http://`
   que o plano deixava em aberto para produção, derivando do domínio em vez de
   criar variável de ambiente nova.
10. **`object-contain` do logo teve de ir para o `style`.** Medido: a classe
    não vence. `theme.css` é importado sem `@layer`, e no Tailwind v4 regra
    sem camada tem prioridade sobre utilitário em `@layer utilities`.
11. **O título da raiz pública saiu duplicado** na primeira tentativa —
    "Cardápio digital · Cardápio digital" —, porque o layout raiz já tem
    `template`. A página deixou de declarar título próprio.

**Bloco C**

12. **O reparo de posição entrou DENTRO da migration 0015**, em vez de ficar
    num SQL avulso para rodar à mão (Tarefa 9, passo 3). Ele é idempotente —
    `is distinct from` não acha nada na segunda passagem — e assim viaja junto
    com o `schema.sql`, sem depender de alguém lembrar de executá-lo.
13. **`src/domain/database.types.ts` foi editado à mão** para acrescentar
    `focal_x` e `focal_y` a Row/Insert/Update de `menu_item_media`. O arquivo
    é GERADO: ao regerar depois de aplicar a migration, o resultado é o mesmo,
    em ordem alfabética, que foi a ordem usada aqui.
14. **Docker saiu do projeto.** Decisão do dono em 2026-09-19: nada de
    Docker, para nada. O "banco de prova local" que as fases 0 a 3 usavam
    deixa de existir. A idempotência passa a se provar aplicando o
    `schema.sql` duas vezes no SQL Editor da nuvem, e o resultado se confere
    por consulta REST — foi assim que a 0015 foi verificada.
15. **`semMidia` entrou no `OwnerMenuItemDTO` já na Tarefa 8**, e não na 11,
    porque as duas mexem no mesmo mapeamento de `getMenuForOwner` e separar
    produziria duas passagens pelo mesmo bloco.
16. **A pré-visualização do vídeo saiu da seção própria** e entrou na lista
    ordenada junto das imagens. Manter duas listas separadas por tipo
    esconderia do dono exatamente o que a Fase 4 tornou visível: a ordem das
    mídias é a ordem das telas do feed.

**Bloco D**

17. **A Tarefa 17 (rede) foi executada junto da 12 e da 13**, porque mora nos
    mesmos dois arquivos. Separar produziria duas passagens pelo mesmo
    componente.
18. **A folha (16) foi escrita antes do feed (15)**, e o feed já a importa. O
    plano previa o contrário, com uma etapa de ligação depois; inverter a
    ordem elimina a etapa.
19. **`irPara` usa `scrollIntoView`, e não `scrollTo` com deslocamento em
    pixels.** É a API própria para contêiner com `scroll-snap` e não depende
    de `clientWidth`, que muda quando o aparelho gira.
20. **A folha precisava das variáveis de FONTE, e não só das de cor.**
    Medido: o título saía em Inter no tema Sal. `--m-font-display` vale
    `var(--tf-cormorant), serif`, e `--tf-cormorant` é declarada pela classe
    do `next/font` no elemento da rota, que o portal não tem acima de si —
    variável indefinida torna a declaração inválida em tempo de valor
    computado, e a fonte cai para a HERDADA. `ALL_THEME_FONT_VARIABLES`
    entrou no `SheetContent`.
21. **O `SheetTitle` embute `text-foreground`**, token do PAINEL, e ele vence
    a herança do contêiner. No escuro passava despercebido porque os dois são
    quase brancos — mas **Brasa e Neon têm face CLARA com fundo quase preto**,
    e nelas o `--foreground` claro do painel daria texto preto sobre fundo
    preto. A cor foi para o `style`.

**Revisões visuais pedidas pelo dono do projeto durante a execução:**

22. **A faixa do trilho estava reusando o véu do RODAPÉ**, que é opaco
    embaixo e transparente em cima. No topo isso produzia uma tarja
    terminando em corte reto no meio da foto. Entrou `.menu-veil-top`, com o
    gradiente na direção certa e mais curto, e `.menu-chip`, que troca borda
    dura por fundo translúcido do tema com desfoque atrás. A seta de voltar
    passou a sumir na capa, onde não teria para onde voltar.
23. **O conteúdo da capa e do rodapé ganhou largura máxima de 720px**,
    centrada. Sem ela, num monitor o nome e o preço ficavam nas duas pontas
    de uma linha de 1300px. O véu continua de borda a borda.
24. **A capa deixou de ocupar a tela inteira.** A foto virou uma faixa de 34%
    da altura (`max-h-[300px]`, `min-h-[140px]`), e a identidade ocupa o
    resto. Capa de restaurante costuma ser textura genérica, e ela estava
    tomando 58% da tela para não dizer nada, com o nome e os contatos
    espremidos no rodapé.
25. **Sangria passou a ser regra, não padrão.** Vídeo sempre ocupa a tela
    inteira — é o que o dono filmou de propósito. Imagem só quando CABE no
    formato: a divergência entre a proporção da foto e a da tela precisa ser
    ≤ 1,25. Fora disso ela é emoldurada, com uma cópia desfocada atrás.
    Medido no cardápio real: foto 16:9 (1,777) contra caixa 0,462 dá
    divergência 3,85 e é emoldurada — antes era estourada e recortada, o
    mesmo defeito do logo em escala de tela cheia.
    **As colunas `width` e `height` de `menu_item_media` estão sempre nulas**
    — nada no envio as preenche —, então a decisão é tomada no cliente, pelo
    tamanho natural da imagem no `onLoad`.

26. **O contador `N / M` era ambíguo e foi refeito.** Ele conta o PRATO
    dentro da categoria — o eixo horizontal —, mas não dizia de quê. Num
    prato com duas mídias numa categoria de um item só, ele mostrava "1 / 1"
    e nunca mudava ao rolar, lendo como "foto 1 de 1" e parecendo quebrado.
    Agora ele traz o nome da categoria (`ENTRADAS · 2 de 7`) e **some quando
    a categoria tem um item só**, que é a mesma regra já aplicada aos
    pontinhos. Quem conta mídia continua sendo só os pontinhos.

**Uma medição que se revelou inválida, registrada para não se repetir:** a
verificação no navegador chegou a concluir que `scrollTo({behavior:'smooth'})`
não funcionava em contêiner com `scroll-snap`, e uma rede de segurança chegou
a ser escrita por causa disso. Era falso: `document.hidden` era `true` e a
página produzia **zero quadros em 600 ms**, porque a janela do Claude estava
atrás de outra. Rolagem suave e evento de `scroll` dependem de quadros. A rede
de segurança foi desfeita. **Antes de concluir qualquer coisa sobre animação,
rolagem ou evento de scroll no painel do navegador, conferir
`document.hidden` e contar quadros com `requestAnimationFrame`.**

## Valores que o plano inteiro usa

Copiados da spec, §3.2. Qualquer tarefa que precise de um número usa **estes**:

| Papel | Regra | Limite |
|---|---|---|
| `--m-ink` | maior contraste entre as candidatas | piso 7:1 |
| `--m-muted` | maior contraste entre as candidatas | piso 4,5:1 |
| `--m-line` | `hexToOklch(base).l >= 0.5 ? line[0] : line[1]` | faixa 1,08–2,5:1 |
| `--m-accent` | derivado por face a partir da cor do dono | piso 4,5:1 |
| `--m-on-accent` | maior contraste, medido contra o **destaque** | piso 4,5:1 |
| `--m-veil` | `--m-base` com alpha ≥ 0,92 na faixa de texto | — |

## Mapa de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `scripts/verificar-contraste.ts` | guarda de regressão dos tokens; único arquivo de verificação que fica no projeto |
| `src/server/revalidate.ts` | traduz "restaurante X mudou" nos caminhos de destino do proxy |
| `src/server/dal/_alvo.ts` | traduz id de restaurante, item ou categoria no alvo da revalidação; existe para não fechar ciclo entre `menu.ts` e `restaurants.ts` |
| `src/app/painel/restaurantes/page.tsx` | a lista de restaurantes, que hoje mora em `/` |
| `src/components/cardapio-publico/menu-feed.tsx` | rolador horizontal; dono do estado de categoria |
| `src/components/cardapio-publico/menu-cover.tsx` | a coluna zero |
| `src/components/cardapio-publico/menu-dish.tsx` | uma coluna: rolador vertical + rodapé fixo |
| `src/components/cardapio-publico/menu-media.tsx` | uma tela: imagem ou vídeo, com o véu |
| `src/components/cardapio-publico/menu-rail.tsx` | o trilho de categorias |
| `src/components/cardapio-publico/menu-details.tsx` | a folha com descrição e variações |
| `src/components/cardapio/media-focal.tsx` | o seletor de ponto focal, separado do editor de mídia |
| `supabase/migrations/0015_media_focal.sql` | `focal_x`, `focal_y` |

**Modificados**

| Arquivo | O que muda |
|---|---|
| `src/lib/color.ts` | ganha `oklchToHex` e `fitContrast` |
| `src/lib/theme/resolve.ts` | uma regra por papel; `--m-veil`; sem `layout` |
| `src/domain/theme.ts` | `ThemePreset['layout']` sai |
| `src/lib/theme/presets.ts` | o campo `layout` sai dos oito |
| `src/server/dal/restaurants.ts` | destaque validado nas duas faces; `setPublished` recusa item sem mídia; escritas devolvem `{ id, slug }` |
| `src/server/dal/menu.ts` | `getPublicMenu` filtra item sem mídia; `getMenuForOwner` devolve pendência; escritas devolvem `{ id, slug }` |
| `src/server/dal/media.ts` | `position` única por item; `reorderItemMedia`; `setMediaFocal` |
| `src/server/actions/*.ts` (7 arquivos) | `revalidatePath('/')` → `revalidateRestaurant(...)` |
| `src/components/painel/identity-form.tsx` | conferência nas duas faces |
| `src/components/painel/theme-preview.tsx` | duas faces lado a lado |
| `src/components/painel/publish-bar.tsx` | link sem `render`; lista de pendências |
| `src/components/cardapio/media-editor.tsx` | foco e reordenação |
| `src/components/cardapio-publico/theme.css` | perde `[data-layout]`; ganha as regras do feed |
| `src/app/(site)/[slug]/page.tsx` | monta o feed |
| `src/app/(site)/page.tsx` | deixa de ser HTML cru |
| `src/app/painel/page.tsx` | vira redirecionamento |
| `src/app/globals.css` | `cursor: pointer` |
| `src/components/shell/top-bar.tsx` | destino por variante |
| `src/server/actions/auth.ts` | padrão do `safeNextPath` |
| `next.config.ts` | `images.remotePatterns` |
| `src/domain/media.ts` | foco no schema; `maxPerItem` de 6 para 4 |

**Removidos**

`src/components/cardapio-publico/menu-header.tsx`, `menu-category.tsx`, `menu-item.tsx` — na Tarefa 18, depois que o feed estiver de pé.

---

# Bloco A — A fundação de cor

Nada aqui depende do feed. Este bloco sozinho já conserta o cardápio que está no ar hoje.

## Tarefa 1: Matemática de cor — a volta do OKLCH e o ajuste de contraste

**Arquivos:**
- Modificar: `src/lib/color.ts` (acrescentar ao fim; não mexer no que existe)
- Prova: `<temp da sessão>/prova-color.ts`

**Interfaces:**
- Consome: `hexToOklch`, `contrastRatio`, `isHex`, tipo `Oklch` — já existem no arquivo.
- Produz:
  - `oklchToHex(cor: Oklch): string` — hex `#rrggbb`, canais grampeados em 0–255.
  - `fitContrast(cor: string, fundo: string, piso: number): string | null` — devolve a cor com `L` movida até atingir `piso` contra `fundo`, preservando croma e matiz. `null` quando nenhum `L` atinge o piso naquele croma.

- [ ] **Passo 1: escrever a prova, antes do código**

Em `<temp da sessão>/prova-color.ts`:

```ts
import {
  contrastRatio,
  fitContrast,
  hexToOklch,
  oklchToHex,
} from 'C:/Users/Eduardo Zamai/Documents/nfc-menu/src/lib/color'

let falhas = 0
function conferir(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) {
    console.log(`  ok    ${nome}`)
  } else {
    console.log(`  FALHA ${nome} ${detalhe}`)
    falhas += 1
  }
}

console.log('oklchToHex — ida e volta')
for (const hex of ['#000000', '#ffffff', '#f0a154', '#16e0a3', '#241e0a', '#a82e1a']) {
  const volta = oklchToHex(hexToOklch(hex))
  // Tolerância de 1 no byte: a viagem passa por cbrt e por potência 2.4.
  const d = (a: string, b: string, i: number) =>
    Math.abs(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) - parseInt(b.slice(1 + i * 2, 3 + i * 2), 16))
  conferir(
    `${hex} volta como ${volta}`,
    d(hex, volta, 0) <= 1 && d(hex, volta, 1) <= 1 && d(hex, volta, 2) <= 1,
  )
}

console.log('\nfitContrast — o caso que quebrou o cardápio no ar')
const fundoEscuro = '#131312'
const destaqueDoDono = '#241e0a'
conferir(
  'o par original reprova',
  contrastRatio(fundoEscuro, destaqueDoDono) < 4.5,
  `= ${contrastRatio(fundoEscuro, destaqueDoDono).toFixed(2)}`,
)
const ajustado = fitContrast(destaqueDoDono, fundoEscuro, 4.5)
conferir('fitContrast devolve alguma coisa', ajustado !== null)
if (ajustado) {
  conferir(
    `${ajustado} atinge 4,5:1`,
    contrastRatio(fundoEscuro, ajustado) >= 4.5,
    `= ${contrastRatio(fundoEscuro, ajustado).toFixed(2)}`,
  )
  const antes = hexToOklch(destaqueDoDono)
  const depois = hexToOklch(ajustado)
  // Distância circular entre dois ângulos: o `+540 % 360 - 180` traz a
  // diferença para [-180, 180), e o módulo dela é a distância real. Perto de
  // ZERO é o que se quer — matiz preservado.
  const distanciaMatiz = Math.abs(((depois.h - antes.h + 540) % 360) - 180)
  conferir(
    'o matiz é preservado dentro de 6 graus',
    distanciaMatiz <= 6,
    `antes ${antes.h.toFixed(0)}, depois ${depois.h.toFixed(0)}, distância ${distanciaMatiz.toFixed(1)}`,
  )
}

console.log('\nfitContrast — não mexe no que já passa')
const jaPassa = '#f0a154'
conferir(
  'cor que já atinge o piso volta idêntica',
  fitContrast(jaPassa, '#0d0c0b', 4.5) === jaPassa,
)

console.log('\nfitContrast — as duas direções')
conferir(
  'sobre fundo claro, clareia não resolve: tem de escurecer',
  (() => {
    const r = fitContrast('#cccccc', '#fbfbfa', 4.5)
    return r !== null && hexToOklch(r).l < hexToOklch('#cccccc').l
  })(),
)
conferir(
  'sobre fundo escuro, escurecer não resolve: tem de clarear',
  (() => {
    const r = fitContrast('#333333', '#131312', 4.5)
    return r !== null && hexToOklch(r).l > hexToOklch('#333333').l
  })(),
)

console.log('\nfitContrast — o impossível devolve null')
conferir(
  'cinza médio sobre cinza médio, pedindo 21:1',
  fitContrast('#808080', '#808080', 21) === null,
)

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`)
process.exit(falhas === 0 ? 0 : 1)
```

- [ ] **Passo 2: rodar a prova e confirmar que ela falha**

```bash
pnpm exec tsx "<temp da sessão>/prova-color.ts"
```

Esperado: erro de importação — `oklchToHex` e `fitContrast` ainda não existem.

- [ ] **Passo 3: escrever `oklchToHex`**

Acrescentar ao fim de `src/lib/color.ts`:

```ts
// A volta do caminho que `hexToOklch` faz na ida: OKLCH → Oklab → LMS →
// linear → sRGB. Os coeficientes são a inversa dos da ida, publicados pelo
// mesmo Björn Ottosson.
//
// O grampeamento em 0–255 é a parte importante para o resto do sistema: um
// OKLCH pode descrever cor fora do gamute do sRGB, e o que a tela mostra é
// o valor grampeado. Como o contraste sempre é medido sobre o hex que sai
// daqui, a conta nunca mente sobre o que o cliente vai ver.
function fromLinear(channel: number): number {
  const v =
    channel <= 0.0031308
      ? 12.92 * channel
      : 1.055 * channel ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

export function oklchToHex({ l, c, h }: Oklch): string {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)

  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b

  const lLms = lRoot ** 3
  const mLms = mRoot ** 3
  const sLms = sRoot ** 3

  const r = 4.0767416621 * lLms - 3.3077115913 * mLms + 0.2309699292 * sLms
  const g = -1.2684380046 * lLms + 2.6097574011 * mLms - 0.3413193965 * sLms
  const bl = -0.0041960863 * lLms - 0.7034186147 * mLms + 1.707614701 * sLms

  return `#${[r, g, bl]
    .map((channel) => fromLinear(channel).toString(16).padStart(2, '0'))
    .join('')}`
}
```

- [ ] **Passo 4: escrever `fitContrast`**

Acrescentar logo abaixo:

```ts
// Move a LUMINOSIDADE da cor até ela atingir o piso contra o fundo,
// preservando croma e matiz. É isto que permite o destaque do dono existir
// nas duas faces do tema sem virar outra cor: o olho reconhece uma marca
// pelo matiz e pela saturação, não pela luminosidade.
//
// A busca é binária entre a luminosidade atual (que reprova) e o extremo
// (0 ou 1). Ela converge para o ponto MAIS PRÓXIMO do original que passa —
// o menor desvio possível da cor escolhida, e não um preto ou branco.
//
// Devolve null quando nem o extremo atinge o piso. Acontece com croma alto
// sobre fundo de luminosidade parecida, e o certo aí é recusar a escolha,
// não entregar uma cor que o cliente não enxerga.
export function fitContrast(
  color: string,
  background: string,
  minRatio: number,
): string | null {
  if (!isHex(color) || !isHex(background)) return null
  if (contrastRatio(background, color) >= minRatio) return color

  const { l, c, h } = hexToOklch(color)

  // O fundo decide qual direção tem chance. Sobre fundo escuro, clarear;
  // sobre claro, escurecer. A outra direção é tentada depois porque croma
  // alto pode fechar a primeira antes de chegar ao piso.
  const extremos = hexToOklch(background).l < 0.5 ? [1, 0] : [0, 1]

  for (const extremo of extremos) {
    if (contrastRatio(background, oklchToHex({ l: extremo, c, h })) < minRatio) {
      continue
    }

    // `perto` reprova, `longe` aprova. A cada passo o intervalo encolhe na
    // direção de `perto`, então o resultado é o mínimo movimento que serve.
    let perto = l
    let longe = extremo
    let melhor = oklchToHex({ l: extremo, c, h })

    for (let passo = 0; passo < 24; passo += 1) {
      const meio = (perto + longe) / 2
      const candidata = oklchToHex({ l: meio, c, h })
      if (contrastRatio(background, candidata) >= minRatio) {
        melhor = candidata
        longe = meio
      } else {
        perto = meio
      }
    }
    return melhor
  }

  return null
}
```

- [ ] **Passo 5: rodar a prova e confirmar que ela passa**

```bash
pnpm exec tsx "<temp da sessão>/prova-color.ts"
```

Esperado: `TUDO OK`, saída 0. Se a ida e volta falhar em algum hex, o erro está nos coeficientes — conferir contra os da função `hexToOklch` logo acima, que é a inversa.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: sem saída.

- [ ] **Passo 7: relatar**

Arquivos alterados: `src/lib/color.ts`. Nada de git.

---

## Tarefa 2: Uma regra por papel, e o guarda que faltava

**Arquivos:**
- Modificar: `src/lib/theme/resolve.ts` (a função `faceToVars` e a `resolveTheme`)
- Criar: `scripts/verificar-contraste.ts`

**Interfaces:**
- Consome: `fitContrast`, `oklchToHex`, `hexToOklch`, `pickByContrast`, `contrastRatio` de `@/lib/color`; `PRESETS`, `isBaseInRange` de `./presets`.
- Produz:
  - `PISOS: { ink: 7; muted: 4.5; accent: 4.5; onAccent: 4.5 }` — exportado de `resolve.ts`, para o formulário e o script lerem o mesmo número.
  - `FAIXA_FIO: { min: 1.08; max: 2.5 }` — idem.
  - `resolveTheme(raw: unknown): ResolvedTheme`, com `ResolvedTheme` perdendo o campo `layout`.
  - `lineFor(base: string, par: readonly [string, string]): string`.

- [ ] **Passo 1: trocar a resolução dos tokens**

Em `src/lib/theme/resolve.ts`, substituir `faceToVars` inteira e o tipo `ResolvedTheme`:

```ts
export const PISOS = {
  ink: 7,
  muted: 4.5,
  accent: 4.5,
  onAccent: 4.5,
} as const

// Faixa MEDIDA, não arbitrada: com a regra de `lineFor`, os dezesseis fios
// calibrados na Fase 3 caem entre 1,11 e 1,24. Uma faixa mais apertada
// reprovaria os dezesseis sem ganho. O piso pega o fio que sumiu no fundo;
// o teto pega o defeito desta fase, que estava em 12–15:1.
export const FAIXA_FIO = { min: 1.08, max: 2.5 } as const

export type ResolvedTheme = {
  presetId: ThemePresetId
  density: Density
  styleLight: Record<string, string>
  styleDark: Record<string, string>
}

// O fio é escolhido pela LUMINOSIDADE do fundo, e não pelo nome da face.
// Brasa e Neon têm face "clara" com fundo escuro — brasa.light.base é
// #0d0c0b, L = 0,16 — e indexar por nome daria fio claro sobre quase-preto
// nos dois. Isto também vale para um fundo personalizado.
export function lineFor(
  base: string,
  par: readonly [string, string],
): string {
  return hexToOklch(base).l >= 0.5 ? par[0] : par[1]
}

function faceToVars(
  preset: ThemePreset,
  face: FaceDefinition,
  base: string,
  accentEscolhido: string | null,
): Record<string, string> {
  const ink = pickByContrast(base, face.ink)

  // O destaque do dono é DERIVADO contra o fundo desta face. Sem isto, uma
  // cor escolhida e aprovada na face clara ia crua para a escura — foi
  // exatamente assim que #241e0a foi parar a 1,1:1 sobre #131312 num
  // cardápio no ar.
  //
  // `?? face.accent` é a rede: quando nem o extremo atinge o piso, a face
  // fica com o destaque do preset, que é calibrado. Recusar a gravação é
  // trabalho do servidor e do formulário; aqui o cardápio não pode cair.
  const accentBruto = accentEscolhido ?? face.accent
  const accent = fitContrast(accentBruto, base, PISOS.accent) ?? face.accent

  return {
    '--m-base': base,
    '--m-ink': ink,
    '--m-muted': pickByContrast(base, face.muted),
    '--m-line': lineFor(base, face.line),
    '--m-accent': accent,
    // O texto SOBRE o destaque é escolhido contra o DESTAQUE já derivado,
    // e não contra o bruto: derivar depois de escolher inverteria o par.
    '--m-on-accent': pickByContrast(accent, face.ink),
    // O véu é o fundo da face com alpha alto. É ele que torna o contraste
    // medível quando o que está atrás é foto de prato, e não cor conhecida.
    '--m-veil': `color-mix(in oklab, ${base} 94%, transparent)`,
    '--m-radius-block': preset.radius.block,
    '--m-radius-photo': preset.radius.photo,
    '--m-font-display': preset.displayFont,
    '--m-font-text': preset.textFont,
  }
}
```

- [ ] **Passo 2: ajustar `resolveTheme` para a assinatura nova**

Na mesma função `resolveTheme`, trocar o bloco final. O `accent` deixa de ser espalhado dentro de um objeto de face e passa como argumento próprio, porque agora cada face faz a própria derivação:

```ts
  return {
    presetId: preset.id,
    density: choice.density,
    styleLight: faceToVars(preset, preset.light, baseLight, accent),
    styleDark: faceToVars(preset, preset.dark, preset.dark.base, accent),
  }
```

Remover a linha `layout: preset.layout` e o import do tipo que só servia a ela, se ficar órfão.

- [ ] **Passo 3: escrever o guarda de regressão**

Criar `scripts/verificar-contraste.ts`. **Este arquivo fica no projeto** — é a exceção declarada nas restrições globais:

```ts
// Guarda de regressão dos tokens de tema. Roda os oito presets nas duas
// faces e confere a regra de CADA papel — que não são todas do mesmo tipo.
//
// Ele existe porque a Fase 3 saiu com as dezesseis faces usando o fio de
// maior contraste, a 12–15:1, e nada no projeto era capaz de notar.
//
// Uso: pnpm exec tsx scripts/verificar-contraste.ts
import { contrastRatio } from '../src/lib/color'
import { THEME_PRESET_IDS } from '../src/domain/theme'
import { PRESETS } from '../src/lib/theme/presets'
import { FAIXA_FIO, PISOS, resolveTheme } from '../src/lib/theme/resolve'

// Destaques plausíveis que um dono escolheria. Cada um é aprovado em pelo
// menos uma face de algum preset, e é justamente o caminho que produziu o
// defeito desta fase.
const DESTAQUES_DE_PROVA = ['#241e0a', '#8a2d1a', '#1a4d8a', '#0f5132', '#e0603f']

let falhas = 0

function piso(rotulo: string, razao: number, minimo: number) {
  const ok = razao >= minimo
  if (!ok) falhas += 1
  console.log(
    `    ${ok ? 'ok   ' : 'FALHA'} ${rotulo.padEnd(12)} ${razao.toFixed(2)}:1 (piso ${minimo})`,
  )
}

function faixa(rotulo: string, razao: number) {
  const ok = razao >= FAIXA_FIO.min && razao <= FAIXA_FIO.max
  if (!ok) falhas += 1
  const motivo =
    razao < FAIXA_FIO.min ? 'sumiu no fundo' : 'compete com o texto'
  console.log(
    `    ${ok ? 'ok   ' : 'FALHA'} ${rotulo.padEnd(12)} ${razao.toFixed(2)}:1 ` +
      `(faixa ${FAIXA_FIO.min}–${FAIXA_FIO.max})${ok ? '' : ` — ${motivo}`}`,
  )
}

function conferirFace(rotulo: string, vars: Record<string, string>) {
  console.log(`  ${rotulo}`)
  const base = vars['--m-base']
  piso('ink', contrastRatio(base, vars['--m-ink']), PISOS.ink)
  piso('muted', contrastRatio(base, vars['--m-muted']), PISOS.muted)
  piso('accent', contrastRatio(base, vars['--m-accent']), PISOS.accent)
  piso(
    'on-accent',
    contrastRatio(vars['--m-accent'], vars['--m-on-accent']),
    PISOS.onAccent,
  )
  faixa('line', contrastRatio(base, vars['--m-line']))
}

for (const id of THEME_PRESET_IDS) {
  console.log(`\n${PRESETS[id].label} (${id}) — cores do preset`)
  const padrao = resolveTheme({ preset: id, base: null, accent: null, density: 'confortavel' })
  conferirFace('face clara', padrao.styleLight)
  conferirFace('face escura', padrao.styleDark)

  for (const accent of DESTAQUES_DE_PROVA) {
    console.log(`\n${PRESETS[id].label} (${id}) — destaque personalizado ${accent}`)
    const t = resolveTheme({ preset: id, base: null, accent, density: 'confortavel' })
    conferirFace('face clara', t.styleLight)
    conferirFace('face escura', t.styleDark)
  }
}

console.log(
  falhas === 0
    ? '\nTODOS OS TOKENS DENTRO DA REGRA'
    : `\n${falhas} TOKEN(S) FORA DA REGRA`,
)
process.exit(falhas === 0 ? 0 : 1)
```

- [ ] **Passo 4: rodar o guarda**

```bash
pnpm exec tsx scripts/verificar-contraste.ts
```

Esperado: `TODOS OS TOKENS DENTRO DA REGRA`, saída 0.

**Se algum `line` falhar**, a regra de `lineFor` está invertida — conferir que a comparação é `>= 0.5` sobre a luminosidade do **fundo**, e não sobre o nome da face. **Se algum `accent` falhar**, `fitContrast` está devolvendo `null` e caindo na rede: isso é aceitável para um destaque personalizado impossível, mas **não** para o destaque do próprio preset. Nesse caso o preset é que está mal calibrado, e o valor precisa ser corrigido em `presets.ts`.

- [ ] **Passo 5: confirmar que o defeito seria pego**

Prova de que o guarda guarda alguma coisa. Trocar temporariamente, em `resolve.ts`, a linha do fio por `'--m-line': pickByContrast(base, face.line),` — que é exatamente o código de antes — e rodar de novo:

```bash
pnpm exec tsx scripts/verificar-contraste.ts
```

Esperado: **falha** em `line` nas dezesseis faces, com razões entre 11 e 16. **Desfazer a troca** e rodar de novo para voltar ao verde.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: erros **só** nos lugares que liam `theme.layout` — `src/app/(site)/[slug]/page.tsx`, `src/components/cardapio-publico/menu-category.tsx`, `menu-item.tsx` e `src/components/painel/theme-preview.tsx`. Eles são tratados nas Tarefas 4 e 15; anotar os nomes e seguir. Nenhum outro erro é esperado.

- [ ] **Passo 7: relatar**

Arquivos alterados: `src/lib/theme/resolve.ts`, `scripts/verificar-contraste.ts` (novo). Nada de git.

---

## Tarefa 3: O servidor e o formulário recusam nas duas faces

**Arquivos:**
- Modificar: `src/server/dal/restaurants.ts` — o bloco `if (data.theme.accent)` dentro de `updateIdentity`
- Modificar: `src/components/painel/identity-form.tsx` — `razaoAccent`, `accentValido` e o texto do campo de destaque
- Prova: `<temp da sessão>/prova-identidade.ts`

**Interfaces:**
- Consome: `fitContrast` de `@/lib/color`; `PISOS` de `@/lib/theme/resolve`.
- Produz: nada que outra tarefa consuma. É regra de borda.

- [ ] **Passo 1: escrever a prova**

Em `<temp da sessão>/prova-identidade.ts`:

```ts
import { contrastRatio, fitContrast } from 'C:/Users/Eduardo Zamai/Documents/nfc-menu/src/lib/color'
import { PRESETS } from 'C:/Users/Eduardo Zamai/Documents/nfc-menu/src/lib/theme/presets'
import { PISOS } from 'C:/Users/Eduardo Zamai/Documents/nfc-menu/src/lib/theme/resolve'
import { THEME_PRESET_IDS } from 'C:/Users/Eduardo Zamai/Documents/nfc-menu/src/domain/theme'

// A regra que as duas bordas passam a usar, escrita uma vez aqui para a
// prova poder afirmar sobre ela.
function facesQueReprovam(presetId: (typeof THEME_PRESET_IDS)[number], accent: string, base: string | null) {
  const preset = PRESETS[presetId]
  const fundoClaro = base ?? preset.light.base
  const fundoEscuro = preset.dark.base
  const reprovadas: string[] = []
  if (fitContrast(accent, fundoClaro, PISOS.accent) === null) reprovadas.push('clara')
  if (fitContrast(accent, fundoEscuro, PISOS.accent) === null) reprovadas.push('escura')
  return reprovadas
}

let falhas = 0
function conferir(nome: string, condicao: boolean, detalhe = '') {
  if (condicao) console.log(`  ok    ${nome}`)
  else { console.log(`  FALHA ${nome} ${detalhe}`); falhas += 1 }
}

console.log('O caso do cardápio no ar: destaque escuro no tema Sal')
conferir(
  '#241e0a sobre a base escura do Sal reprova em 4,5:1',
  contrastRatio(PRESETS.sal.dark.base, '#241e0a') < PISOS.accent,
)
conferir(
  'mas fitContrast salva: nenhuma face é declarada impossível',
  facesQueReprovam('sal', '#241e0a', null).length === 0,
)

console.log('\nUm destaque de croma alto e luminosidade média')
const dificil = '#7f7f7f'
console.log(`  faces impossíveis para ${dificil} no Sal: ${JSON.stringify(facesQueReprovam('sal', dificil, null))}`)

console.log('\nO destaque padrão de cada preset passa nas duas faces')
for (const id of THEME_PRESET_IDS) {
  const p = PRESETS[id]
  conferir(
    `${id}: claro`,
    fitContrast(p.light.accent, p.light.base, PISOS.accent) !== null,
  )
  conferir(
    `${id}: escuro`,
    fitContrast(p.dark.accent, p.dark.base, PISOS.accent) !== null,
  )
}

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`)
process.exit(falhas === 0 ? 0 : 1)
```

- [ ] **Passo 2: rodar a prova**

```bash
pnpm exec tsx "<temp da sessão>/prova-identidade.ts"
```

Esperado: `TUDO OK`. Esta prova afirma sobre `fitContrast`, que já existe da Tarefa 1 — ela passa de primeira, e o papel dela é fixar a regra antes de as duas bordas a copiarem.

- [ ] **Passo 3: trocar a regra no servidor**

Em `src/server/dal/restaurants.ts`, dentro de `updateIdentity`, substituir o bloco `if (data.theme.accent) { ... }` inteiro:

```ts
  if (data.theme.accent) {
    const preset = PRESETS[data.theme.preset]
    const fundoClaro = data.theme.base ?? preset.light.base
    const fundoEscuro = preset.dark.base

    // As DUAS faces, e não só a clara. A versão anterior conferia apenas
    // `preset.light.base`, e foi por isso que um destaque aprovado no claro
    // foi parar a 1,1:1 num cardápio escuro no ar.
    //
    // O piso é 4,5 e não 3: o destaque pinta o nome da categoria e o preço,
    // que são TEXTO. 3:1 é o limiar de elemento de interface.
    const reprovadas: string[] = []
    if (fitContrast(data.theme.accent, fundoClaro, PISOS.accent) === null) {
      reprovadas.push('clara')
    }
    if (fitContrast(data.theme.accent, fundoEscuro, PISOS.accent) === null) {
      reprovadas.push('escura')
    }

    if (reprovadas.length > 0) {
      throw new UserFacingError(
        reprovadas.length === 2
          ? 'Esta cor de destaque não fica legível em nenhuma das duas versões do cardápio. Escolha um tom mais vivo ou menos acinzentado.'
          : `Esta cor de destaque não fica legível na versão ${reprovadas[0]} do cardápio, que é a que aparece quando o celular do cliente está nesse modo. Escolha um tom mais vivo ou menos acinzentado.`,
      )
    }
  }
```

Ajustar os imports do arquivo: `contrastRatio` pode ficar órfão — conferir se outra função do arquivo ainda o usa antes de remover. Acrescentar `fitContrast` ao import de `@/lib/color` e `PISOS` a um import novo de `@/lib/theme/resolve`.

- [ ] **Passo 4: trocar a regra no formulário**

Em `src/components/painel/identity-form.tsx`, substituir o `useMemo` de `razaoAccent` e a constante `accentValido`:

```tsx
  // As mesmas duas conferências do servidor, no momento da escolha. Isto é
  // conveniência; a regra é o `updateIdentity`, que roda de novo e recusa.
  const facesDoAccent = useMemo(() => {
    const fundoEscuro = preset.dark.base
    return {
      clara: {
        razao: contrastRatio(baseAtual, accentAtual),
        possivel: fitContrast(accentAtual, baseAtual, PISOS.accent) !== null,
      },
      escura: {
        razao: contrastRatio(fundoEscuro, accentAtual),
        possivel: fitContrast(accentAtual, fundoEscuro, PISOS.accent) !== null,
      },
    }
  }, [baseAtual, accentAtual, preset])

  const accentValido = facesDoAccent.clara.possivel && facesDoAccent.escura.possivel
```

**O aceite explícito.** A derivação não pode ser silenciosa: a cor da marca mudaria pelas costas do dono. Acrescentar o estado e o cálculo:

```tsx
  // O aceite é por MUDANÇA, não por sessão: quem abre a tela e não mexe na
  // cor não é interrogado de novo sobre uma escolha que já fez.
  const [tocouAccent, setTocouAccent] = useState(false)
  const [accentAceito, setAccentAceito] = useState(false)

  const derivado = useMemo(
    () => ({
      claro: fitContrast(accentAtual, baseAtual, PISOS.accent),
      escuro: fitContrast(accentAtual, preset.dark.base, PISOS.accent),
    }),
    [accentAtual, baseAtual, preset],
  )

  // Só pede aceite quando a derivação de fato MUDOU a cor. Cor que já serve
  // nas duas faces passa direto — pedir confirmação do que não mudou é
  // ruído que ensina a clicar sem ler.
  const precisaAceite =
    tocouAccent &&
    accentValido &&
    (derivado.claro !== accentAtual || derivado.escuro !== accentAtual)
```

O `onChange` do campo de destaque passa a marcar as duas bandeiras:

```tsx
              onChange={(event) => {
                setTocouAccent(true)
                setAccentAceito(false)
                setEscolha((a) => ({ ...a, accent: event.target.value }))
              }}
```

E o bloco de aceite, logo abaixo do campo, quando `precisaAceite`:

```tsx
        {precisaAceite ? (
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <p className="text-small font-medium">
              Esta cor precisa de ajuste para ficar legível
            </p>
            <p className="mt-1 text-small text-muted-foreground">
              O matiz é mantido; só a luminosidade muda, e só na face em que
              a cor original não seria lida.
            </p>

            <div className="mt-3 flex gap-4">
              {[
                { rotulo: 'Você escolheu', cor: accentAtual },
                { rotulo: 'No claro', cor: derivado.claro ?? accentAtual },
                { rotulo: 'No escuro', cor: derivado.escuro ?? accentAtual },
              ].map((amostra) => (
                <div key={amostra.rotulo}>
                  <span
                    className="block size-10 rounded-md border border-border"
                    style={{ background: amostra.cor }}
                  />
                  <p className="mt-1 text-micro text-muted-foreground">
                    {amostra.rotulo}
                  </p>
                  <p className="text-micro font-medium">{amostra.cor}</p>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setAccentAceito(true)}
            >
              <RiCheckLine className="size-4" />
              Entendi, usar assim
            </Button>
          </div>
        ) : null}
```

E o botão de salvar ganha a trava:

```tsx
          <Button
            onClick={salvar}
            disabled={
              pending || !baseValida || !accentValido || (precisaAceite && !accentAceito)
            }
          >
```

**O aceite é regra de interface, não de servidor.** O servidor não tem como saber se alguém olhou para uma tela; o que ele faz continua sendo recusar o impossível.

E substituir o `FieldDescription` do campo `accent`:

```tsx
            <FieldDescription>
              {accentValido ? (
                <>
                  O sistema ajusta o tom desta cor em cada versão do cardápio
                  para ela ficar sempre legível, mantendo o matiz.
                </>
              ) : (
                <span className="text-destructive">
                  Esta cor não fica legível na versão{' '}
                  {!facesDoAccent.clara.possivel && !facesDoAccent.escura.possivel
                    ? 'clara nem na escura'
                    : !facesDoAccent.clara.possivel
                      ? 'clara'
                      : 'escura'}{' '}
                  do cardápio. Escolha um tom mais vivo ou menos acinzentado.
                </span>
              )}
            </FieldDescription>
```

Acrescentar `fitContrast` ao import de `@/lib/color` e `PISOS` ao de `@/lib/theme/resolve`.

- [ ] **Passo 5: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: continuam só os erros de `theme.layout` anotados na Tarefa 2.

- [ ] **Passo 6: conferir no navegador**

Subir o app, abrir `painel.localhost:<porta>/restaurantes/<id>/identidade`. **Conferir a porta com `netstat -ano | grep :3000` antes** — o `.claude/launch.json` diz 3100 e o `.env.local` diz 3000, e os dois divergem.

Escolher o tema Sal e pôr `#241e0a` no destaque. Esperado: o campo aceita, porque `fitContrast` consegue derivar nas duas faces — e a pré-visualização da Tarefa 4 vai mostrar a cor derivada, não a escolhida. Depois pôr `#808080`: esperado, recusa com o nome da face.

- [ ] **Passo 7: relatar**

Arquivos alterados: `src/server/dal/restaurants.ts`, `src/components/painel/identity-form.tsx`. Nada de git.

---

## Tarefa 4: A pré-visualização mostra as duas faces

**Arquivos:**
- Modificar: `src/components/painel/theme-preview.tsx`

**Interfaces:**
- Consome: `resolveTheme` (assinatura nova, sem `layout`) de `@/lib/theme/resolve`.
- Produz: `<ThemePreview theme={ThemeChoice} name={string} />` — a mesma assinatura de hoje. O `IdentityForm` não muda.

- [ ] **Passo 1: extrair a tela em um componente interno**

Hoje o arquivo tem uma tela só, com `style={resolvido.styleLight}`. O `AMOSTRA` fica como está. Trocar o corpo do componente exportado por um interno que recebe as variáveis e um rótulo:

```tsx
function Tela({
  vars,
  rotulo,
  name,
}: {
  vars: Record<string, string>
  rotulo: string
  name: string
}) {
  return (
    <div>
      <p className="mb-2 text-center text-micro font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {rotulo}
      </p>
      <div className="mx-auto w-[220px] overflow-hidden rounded-[24px] border-[6px] border-[#15161a] shadow-[var(--shadow-2)]">
        <div
          className={`menu h-[420px] overflow-hidden ${ALL_THEME_FONT_VARIABLES}`}
          style={vars as React.CSSProperties}
        >
          {/* Aqui entra, SEM ALTERAÇÃO NENHUMA, o conteúdo que hoje vive
              dentro da tela única: a faixa de capa em gradiente, o <h3> com
              o nome, e o map do AMOSTRA. É recorte e colagem, não reescrita
              — aquele markup já foi verificado na Fase 3A. */}
        </div>
      </div>
    </div>
  )
}
```

O `data-layout` sai do elemento — não existe mais layout variável. O `data-density` permanece.

- [ ] **Passo 2: renderizar as duas**

```tsx
export function ThemePreview({ theme, name }: { theme: ThemeChoice; name: string }) {
  const resolvido = resolveTheme(theme)

  // As DUAS faces. A Fase 3 mostrava só a clara, com o argumento de que a
  // escura não era escolha do dono. Deixou de ser verdade: o destaque que
  // ele escolhe agora é derivado em cada face, e é justamente na escura que
  // a derivação mais aparece. Mostrar uma só foi o que permitiu o defeito
  // desta fase chegar ao ar.
  return (
    <div className="grid grid-cols-2 gap-4">
      <Tela vars={resolvido.styleLight} rotulo="Claro" name={name} />
      <Tela vars={resolvido.styleDark} rotulo="Escuro" name={name} />
    </div>
  )
}
```

- [ ] **Passo 3: dar largura à coluna da pré-visualização**

Em `src/components/painel/identity-form.tsx`, a grade externa é `lg:grid-cols-[minmax(0,1fr)_320px]`. Duas telas de 220px mais o vão não cabem em 320. Trocar por `lg:grid-cols-[minmax(0,1fr)_480px]`.

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: os erros de `theme.layout` que restam são só os de `(site)/[slug]/page.tsx`, `menu-category.tsx` e `menu-item.tsx`. `theme-preview.tsx` sai da lista.

- [ ] **Passo 5: conferir no navegador**

Na tela de identidade, percorrer os oito temas e confirmar que as duas telas aparecem, que o destaque derivado é **visível nas duas**, e que pôr `#241e0a` no Sal produz uma cor legível na tela escura — diferente da escolhida, e é esse o comportamento correto.

Anexar captura de tela.

- [ ] **Passo 6: relatar**

Arquivos alterados: `src/components/painel/theme-preview.tsx`, `src/components/painel/identity-form.tsx`. Nada de git.

---

# Bloco B — Revalidação, território e as correções travadas

Independente do Bloco A e independente do feed.

## Tarefa 5: A revalidação passa a acertar o alvo

**Arquivos:**
- Criar: `src/server/revalidate.ts`, `src/server/dal/_alvo.ts`
- Modificar: `src/server/dal/menu.ts`, `src/server/dal/media.ts`, `src/server/dal/restaurants.ts`, `src/server/dal/tags.ts`, `src/server/dal/members.ts`, `src/server/dal/invites.ts` — as funções de escrita passam a devolver o alvo
- Modificar: `src/server/actions/menu.ts`, `media.ts`, `restaurants.ts`, `tags.ts`, `members.ts`, `invites.ts` — as 36 chamadas

**Interfaces:**
- Produz:
  - `type AlvoRevalidacao = { id: string; slug: string }`
  - `revalidateRestaurant(alvo: AlvoRevalidacao): void`
  - Toda função de escrita da DAL que hoje devolve `void` passa a devolver `Promise<AlvoRevalidacao>`. As que devolvem um id (`registerItemMedia`, `createItem`, `createCategory`) passam a devolver `Promise<AlvoRevalidacao & { id: string }>` — atenção: `id` aqui é o do **restaurante**, então o id criado ganha nome próprio, `createdId`.

- [ ] **Passo 1: ler a doc antes de escrever**

```bash
sed -n '20,80p' node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md
```

O parágrafo que manda nesta tarefa é o da linha 57: com rewrite, passa-se o caminho de **destino**, não o de origem. O `src/proxy.ts` reescreve `/` para `/painel` e `/x` para `/painel/x`.

- [ ] **Passo 2: escrever o helper**

Criar `src/server/revalidate.ts`:

```ts
import 'server-only'
import { revalidatePath } from 'next/cache'

export type AlvoRevalidacao = { id: string; slug: string }

// O proxy reescreve `/` para `/painel` e `/x` para `/painel/x`. A doc do
// Next (revalidatePath.md:57) é explícita: com rewrite, passa-se o caminho
// de DESTINO, não o que aparece na barra de endereços.
//
// Esta é a ÚNICA exceção à regra "rotas são externas" que vale no projeto
// inteiro. Em `href` e em `redirect` continua sendo `/restaurantes/x`.
//
// O território público não tem rewrite, então o cardápio entra pelo caminho
// literal `/slug` — e sem `type`, porque caminho literal não leva `type`.
export function revalidateRestaurant({ id, slug }: AlvoRevalidacao): void {
  revalidatePath(`/${slug}`)
  revalidatePath(`/painel/restaurantes/${id}`, 'layout')
  revalidatePath(`/admin/restaurantes/${id}`, 'layout')
}

// Para a escrita que muda a LISTA, e não um restaurante: criar, remover,
// trocar situação pela plataforma. A lista do painel e a do console são
// páginas próprias e não são alcançadas pelo 'layout' acima.
export function revalidateListas(): void {
  revalidatePath('/painel/restaurantes', 'layout')
  revalidatePath('/admin/restaurantes', 'layout')
}
```

- [ ] **Passo 3: fazer a DAL devolver o alvo — uma função de apoio primeiro**

**Em arquivo próprio, e não dentro de `restaurants.ts`.** Se estas funções morassem lá, `menu.ts` e `media.ts` teriam de importar de `restaurants.ts` — e na Tarefa 11 `restaurants.ts` passa a importar `contarItensSemMidia` de `menu.ts`. Isso fecha um ciclo de importação. Um módulo de apoio que só depende de `_client` desfaz o ciclo antes de ele existir.

Criar `src/server/dal/_alvo.ts`:

```ts
import 'server-only'
import type { AlvoRevalidacao } from '@/server/revalidate'
import { db } from './_client'

// Toda escrita precisa dizer QUAL restaurante mudou, para a revalidação
// alcançar o cardápio público pelo slug e o painel pelo id. A consulta é
// barata e já está quente: a autorização acabou de ler esta mesma linha.
//
// Este arquivo NÃO autoriza nada. Ele roda sempre depois de um
// `requireRestaurantAdmin`, e existe só para traduzir id em alvo.
export async function alvoDoRestaurante(
  restaurantId: string,
): Promise<AlvoRevalidacao> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('id', restaurantId)
    .single()

  if (error || !data) throw new Error('Restaurante não encontrado')
  return { id: data.id as string, slug: data.slug as string }
}

export async function alvoDoItem(itemId: string): Promise<AlvoRevalidacao> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('restaurants!inner(id, slug)')
    .eq('id', itemId)
    .single()

  if (error || !data) throw new Error('Item não encontrado')
  const r = (data as unknown as { restaurants: { id: string; slug: string } }).restaurants
  return { id: r.id, slug: r.slug }
}

export async function alvoDaCategoria(
  categoryId: string,
): Promise<AlvoRevalidacao> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_categories')
    .select('restaurants!inner(id, slug)')
    .eq('id', categoryId)
    .single()

  if (error || !data) throw new Error('Categoria não encontrada')
  const r = (data as unknown as { restaurants: { id: string; slug: string } }).restaurants
  return { id: r.id, slug: r.slug }
}
```

- [ ] **Passo 4: converter as escritas, arquivo por arquivo**

A conversão é mecânica e tem uma forma só. No exemplo abaixo, **`// ...` significa o corpo que já existe, movido sem uma única alteração** — só a assinatura e a linha de `return` mudam. Nada de reescrever a função.

Exemplo em `src/server/dal/menu.ts`, na `createCategory`:

```ts
// antes
export async function createCategory(input: unknown): Promise<string> {
  const data = createCategorySchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)
  // ...
  return row.id as string
}

// depois
export async function createCategory(
  input: unknown,
): Promise<AlvoRevalidacao & { createdId: string }> {
  const data = createCategorySchema.parse(input)
  await requireRestaurantAdmin(data.restaurantId)
  // ...
  return { ...(await alvoDoRestaurante(data.restaurantId)), createdId: row.id as string }
}
```

Para a escrita que recebe `itemId` ou `categoryId` em vez de `restaurantId`, usar `alvoDoItem` ou `alvoDaCategoria`.

Cada arquivo importa `alvoDoRestaurante`, `alvoDoItem` ou `alvoDaCategoria` de `./_alvo`, e o tipo `AlvoRevalidacao` de `@/server/revalidate`.

**Ordem de trabalho, uma de cada vez, rodando `pnpm exec tsc --noEmit` depois de cada arquivo:** `menu.ts`, `media.ts`, `restaurants.ts`, `tags.ts`, `members.ts`, `invites.ts`. O compilador é o guia — ele aponta cada action que ficou desalinhada.

**Conferir que nenhum ciclo de importação nasceu:**

```bash
grep -n "from './restaurants'" src/server/dal/menu.ts src/server/dal/media.ts
```

Esperado: nenhuma linha. Quem precisa do alvo importa de `./_alvo`.

- [ ] **Passo 5: converter as 36 chamadas**

Em cada arquivo de `src/server/actions/`, a forma é sempre esta:

```ts
// antes
export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const id = await dal.createCategory(input)
    revalidatePath('/')
    return { id }
  })
}

// depois
export async function createCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { createdId, ...alvo } = await dal.createCategory(input)
    revalidateRestaurant(alvo)
    return { id: createdId }
  })
}
```

Em `restaurants.ts`, as três actions que mudam a **lista** — criar, remover e trocar situação pela plataforma — chamam **também** `revalidateListas()`.

Ao fim, conferir que nenhum `revalidatePath('/')` sobrou:

```bash
grep -rn "revalidatePath('/')" src/
```

Esperado: nenhuma linha.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: continuam só os erros de `theme.layout`.

- [ ] **Passo 7: provar no navegador que a revalidação chega**

Com o app rodando, e um restaurante publicado:

1. Abrir o cardápio público em uma aba: `localhost:<porta>/<slug>`.
2. No painel, em outra aba, renomear um item.
3. Recarregar a aba do cardápio.

Esperado: o nome novo aparece. Antes desta tarefa, o cardápio ficava velho.

4. Ainda no painel, confirmar que a tela voltou com o nome trocado **sem recarregar à mão**.

Anexar captura das duas abas.

- [ ] **Passo 8: relatar**

Arquivos alterados: `src/server/revalidate.ts` (novo), `src/server/dal/_alvo.ts` (novo), seis arquivos em `src/server/dal/`, seis em `src/server/actions/`. Nada de git.

---

## Tarefa 6: A raiz do painel sai de `/`

**Arquivos:**
- Criar: `src/app/painel/restaurantes/page.tsx`
- Modificar: `src/app/painel/page.tsx`
- Modificar: `src/server/actions/auth.ts`
- Modificar: `src/components/shell/top-bar.tsx`
- Modificar: `src/components/shell/territory-nav.tsx` (só um comentário)

**Interfaces:**
- Consome: `requireUser`, `listMyRestaurants` — já existem.
- Produz: a rota externa `/restaurantes` no território `painel.`, que o proxy reescreve para `/painel/restaurantes`.

- [ ] **Passo 1: mover a lista para a rota própria**

Criar `src/app/painel/restaurantes/page.tsx` com o **conteúdo atual** de `src/app/painel/page.tsx`, sem nenhuma alteração de comportamento: o `await requireUser()`, o `listMyRestaurants()`, o desvio de "um restaurante só" e o `Empty`. O `export const metadata = { title: 'Seus restaurantes' }` vem junto.

- [ ] **Passo 2: transformar a raiz em desvio**

Substituir `src/app/painel/page.tsx` inteiro:

```tsx
import { redirect } from 'next/navigation'

// `/` deixa de servir conteúdo no painel, e isso é estrutural, não estético.
// Era o único caminho que o território público e o painel dividiam, e toda
// camada de cache do Next — cache do roteador no cliente, cache de rota
// cheia no servidor, e uma CDN em produção — chaveia por caminho, não por
// host. Enquanto os dois dividirem `/`, existe um jeito de a árvore do site
// ser servida dentro do painel.
//
// Com o desvio, o painel nunca renderiza em `/`, e a ambiguidade acaba.
export default function Page() {
  redirect('/restaurantes')
}
```

- [ ] **Passo 3: o login passa a cair na rota própria**

Em `src/server/actions/auth.ts`, dentro de `signInAction`:

```ts
  // O padrão deixa de ser `/`. Cair na rota ambígua logo depois de entrar
  // era exatamente o momento em que o defeito aparecia.
  redirect(safeNextPath(formData.get('next'), '/restaurantes'))
```

**Atenção:** este arquivo serve os **dois** territórios privados. No console, `/restaurantes` também existe (`src/app/admin/restaurantes/page.tsx`), então o padrão vale para os dois sem ramificação.

- [ ] **Passo 4: a barra do topo aponta para a rota própria**

Em `src/components/shell/top-bar.tsx`, o `<Link href="/">` vira:

```tsx
        <Link
          href="/restaurantes"
```

O comentário acima dele, que hoje explica o caminho externo, passa a dizer: dentro de `painel.` e de `admin.` isto leva à lista, porque o proxy reescreve; escrever o prefixo do território produziria `/painel/painel/restaurantes`.

- [ ] **Passo 5: anotar o ramo que sobrou no TerritoryNav**

Em `src/components/shell/territory-nav.tsx`, o ramo `item.href === '/'` deixa de ser alcançável no painel, mas **continua valendo no console**, onde `/` ainda é rota real. Não apagar. Acrescentar acima dele:

```tsx
          // O ramo de `/` vale só no console: no painel a raiz virou desvio
          // para `/restaurantes` na Fase 4, e nenhum item de navegação
          // aponta mais para ela. Apagar isto quebraria o console.
```

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 7: conferir os dois territórios no navegador**

1. `painel.localhost:<porta>/` → esperado: desvia para `/restaurantes` e mostra a lista (ou desvia direto para o restaurante, se houver um só).
2. Sair e entrar de novo → esperado: cai em `/restaurantes`, e **não** na página "Aproxime o celular da plaquinha".
3. Clicar no título na barra do topo → esperado: volta para a lista.
4. `admin.localhost:<porta>/` → esperado: o console continua funcionando exatamente como antes.
5. `localhost:<porta>/` → esperado: a página pública, que a Tarefa 7 vai redesenhar.

Anexar captura do passo 2.

- [ ] **Passo 8: relatar**

Arquivos alterados: `src/app/painel/restaurantes/page.tsx` (novo), `src/app/painel/page.tsx`, `src/server/actions/auth.ts`, `src/components/shell/top-bar.tsx`, `src/components/shell/territory-nav.tsx`. Nada de git.

---

## Tarefa 7: As quatro correções travadas

**Arquivos:**
- Modificar: `src/app/globals.css`
- Modificar: `src/components/painel/publish-bar.tsx`, `src/app/painel/restaurantes/[id]/comecar/page.tsx`, `src/app/admin/not-found.tsx`
- Modificar: `src/components/cardapio-publico/menu-header.tsx`
- Modificar: `src/app/(site)/page.tsx`

**Interfaces:**
- Consome: `buttonVariants` de `@/components/ui/button` — já exportado.
- Produz: nada. São quatro correções fechadas.

- [ ] **Passo 1: ler a doc do Base UI antes de mexer**

```bash
sed -n '133,155p' node_modules/@base-ui/react/docs/react/components/button.md
```

A linha 150 é explícita: link tem semântica própria e **não** deve ser renderizado como botão pelo `render`. Quem precisa de link com cara de botão estiliza o `<a>`.

- [ ] **Passo 2: cursor de mão**

Em `src/app/globals.css`, dentro do `@layer base` que já existe, acrescentar:

```css
  /* O Tailwind v4 deixou de pôr `cursor: pointer` em botão, seguindo o
     padrão do navegador. Num produto que roda em desktop no painel, isso
     faz cada botão parecer inerte até o clique. A regra volta aqui, uma
     vez, em vez de uma classe por componente.

     `:not(:disabled)` é o que importa: mão sobre botão desativado promete
     uma ação que não vai acontecer. */
  button:not(:disabled),
  [role='button']:not([aria-disabled='true']),
  a[href],
  label[for],
  summary {
    cursor: pointer;
  }
```

- [ ] **Passo 3: os quatro links que passam pelo `render`**

Em `src/components/painel/publish-bar.tsx`, trocar o bloco `noAr ? (...)`:

```tsx
        {noAr ? (
          // Link estilizado, e não Button com `render`: a doc do Base UI
          // (button.md:150) diz que âncora tem semântica própria e não deve
          // receber semântica de botão. Era este o erro de console.
          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline' })}
          >
            <RiExternalLinkLine className="size-4" />
            Ver no ar
          </Link>
        ) : null}
```

Trocar o import de `Button` por `{ Button, buttonVariants }`.

Em `src/app/painel/restaurantes/[id]/comecar/page.tsx`, os dois:

```tsx
          {etapa === 'identidade' ? (
            <Link
              href={`/restaurantes/${restaurant.id}/comecar?passo=contato`}
              className={buttonVariants({ variant: 'outline' })}
            >
              Continuar para o contato
            </Link>
          ) : null}

          <Link
            href={`/restaurantes/${restaurant.id}`}
            className={buttonVariants({ variant: 'ghost' })}
          >
            {etapa === 'identidade' ? 'Pular e montar o cardápio' : 'Ir para o cardápio'}
          </Link>
```

O import de `Button` sai do arquivo se não sobrar uso; entra `buttonVariants`.

Em `src/app/admin/not-found.tsx`:

```tsx
      <Link href="/restaurantes" className={buttonVariants({ variant: 'default' })}>
        Voltar para a lista
      </Link>
```

Conferir que nenhum `render={<Link` sobrou:

```bash
grep -rn "render={<Link" src/
```

Esperado: nenhuma linha.

- [ ] **Passo 4: o logo na frente da capa**

Em `src/components/cardapio-publico/menu-header.tsx`, o `<img>` do logo:

```tsx
          <img
            src={publicMediaUrl('image', logoPath)}
            alt=""
            // `relative z-10` porque a capa logo acima é `position: relative`,
            // e elemento posicionado pinta por cima de elemento estático
            // independente da ordem no DOM. Sem isto, os 40px do `-mt-10`
            // ficam ESCONDIDOS atrás da capa, e o logo aparece cortado.
            //
            // `object-contain` e não `cover`: recortar um logo retangular em
            // quadrado é sempre errado. O fundo é o do tema, com respiro.
            className="menu-photo relative z-10 -mt-10 h-20 w-20 border-4 object-contain p-1"
            style={{ borderColor: 'var(--m-base)', background: 'var(--m-base)' }}
          />
```

`.menu-photo` em `theme.css` declara `object-fit: cover`; a classe utilitária `object-contain` vem depois na cascata e vence. Conferir no navegador no passo 6 — se não vencer, mover a regra para o `style`.

**Este arquivo é removido na Tarefa 18**, quando `menu-cover.tsx` ocupar o lugar. A correção entra aqui mesmo assim: é uma linha, e ela conserta hoje um cardápio que está no ar hoje.

- [ ] **Passo 5: a página raiz pública**

Substituir `src/app/(site)/page.tsx`:

```tsx
import Link from 'next/link'
import { env } from '@/server/env'

export const metadata = {
  title: 'Cardápio digital',
  description: 'Cardápios de restaurante acessíveis por NFC e QR code.',
}

// Esta página é o que alguém vê ao digitar o domínio sem endereço de
// restaurante. Ela é pequena de propósito — não é site de marketing — mas
// deixa de ser HTML cru, porque é a primeira impressão do produto.
//
// Território público: nenhuma sessão, nenhum cookie, nenhum dado de
// restaurante. Só texto e um caminho para quem é dono.
export default function Page() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative max-w-[440px]">
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Cardápio digital
        </p>
        <h1 className="mt-3 font-display text-display font-semibold leading-tight tracking-[-0.01em]">
          O cardápio está na mesa
        </h1>
        <p className="mt-4 text-body text-muted-foreground">
          Encoste o celular na plaquinha do restaurante, ou aponte a câmera
          para o QR code. O cardápio abre sozinho — não precisa instalar nada.
        </p>

        <p className="mt-10 text-small text-muted-foreground">
          É dono de restaurante?{' '}
          <Link
            href={`http://painel.${env.NEXT_PUBLIC_ROOT_DOMAIN}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Entre no painel
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
```

**Atenção:** o link usa `http://` porque `NEXT_PUBLIC_ROOT_DOMAIN` é `localhost:3000` em desenvolvimento. Em produção isso precisa virar `https://` — registrar como pendência de implantação no relatório, não resolver aqui de improviso.

- [ ] **Passo 6: conferir no navegador**

1. `localhost:<porta>/` → a página nova, com o halo e a tipografia do sistema. Passar o mouse sobre o link: cursor de mão.
2. `localhost:<porta>/<slug>` → o logo **inteiro**, na frente da capa.
3. `painel.localhost:<porta>/restaurantes/<id>` → o console do navegador **sem** o erro do Base UI. Conferir com o painel de console aberto, recarregando a página.
4. Passar o mouse sobre botões no painel: cursor de mão; sobre botão desativado: seta.

Anexar captura do item 2 e do console limpo do item 3.

- [ ] **Passo 7: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 8: relatar**

Arquivos alterados: `src/app/globals.css`, `src/components/painel/publish-bar.tsx`, `src/app/painel/restaurantes/[id]/comecar/page.tsx`, `src/app/admin/not-found.tsx`, `src/components/cardapio-publico/menu-header.tsx`, `src/app/(site)/page.tsx`. Registrar a pendência do `http://` em produção. Nada de git.

---

# Bloco C — Mídia

Depende do Bloco A só para o placeholder do tema. Não depende do Bloco B.

## Tarefa 8: Ponto focal — banco, domínio e DAL

**Arquivos:**
- Criar: `supabase/migrations/0015_media_focal.sql`
- Modificar: `supabase/schema.sql` (gerado, nunca editado à mão)
- Modificar: `src/domain/media.ts`, `src/domain/menu.ts`
- Modificar: `src/server/dal/media.ts`, `src/server/dal/menu.ts`
- Modificar: `src/server/actions/media.ts`

**Interfaces:**
- Produz:
  - Colunas `menu_item_media.focal_x` e `focal_y`, `numeric not null default 0.5`, com `check between 0 and 1`.
  - `setMediaFocalSchema` = `{ mediaId: uuid, focalX: number, focalY: number }`
  - `setMediaFocal(input: unknown): Promise<AlvoRevalidacao>` em `dal/media.ts`
  - `setMediaFocalAction(input: unknown): Promise<ActionResult>`
  - `MenuMediaDTO` e `OwnerMenuItemDTO['media']` ganham `focalX: number` e `focalY: number`

- [ ] **Passo 1: escrever a migration**

Criar `supabase/migrations/0015_media_focal.sql`:

```sql
-- Fase 4. O feed desenha a midia em tela cheia, com object-fit: cover. Foto
-- quadrada ou em paisagem vira recorte central cego, e o prato sai do quadro.
-- O ponto focal e o pixel que o dono marcou como "nao pode sair", e vira
-- object-position na hora de desenhar.
--
-- Padrao 0.5/0.5 e o centro, que e exatamente o que o cover ja fazia: nenhuma
-- midia existente muda de aparencia ao aplicar esta migration.

alter table public.menu_item_media
  add column if not exists focal_x numeric not null default 0.5;

alter table public.menu_item_media
  add column if not exists focal_y numeric not null default 0.5;

-- `add constraint` nao aceita `if not exists`, e o schema.sql reexecuta tudo
-- a cada aplicacao. O bloco condicional e o que torna isto idempotente.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'menu_item_media_focal_range'
  ) then
    alter table public.menu_item_media
      add constraint menu_item_media_focal_range
      check (focal_x between 0 and 1 and focal_y between 0 and 1);
  end if;
end $$;
```

- [ ] **Passo 2: gerar o schema**

```bash
bash supabase/build-schema.sh
```

Esperado: `supabase/schema.sql` regenerado com a 0015 ao fim.

- [ ] **Passo 3: provar a idempotência — SEM Docker**

**Não existe banco de prova em Docker neste projeto.** A decisão é do dono do
projeto, tomada em 2026-09-19: nada de Docker, para nada. O que as fases
anteriores chamavam de "banco de prova em Docker" não vale mais.

A idempotência se prova onde o banco realmente está: aplicando o `schema.sql`
**duas vezes seguidas** no SQL Editor do projeto na nuvem. Ele é idempotente
por construção — `if not exists` nas colunas, bloco condicional na constraint,
e `is distinct from` no reparo de posição —, então a segunda execução tem de
passar sem erro e sem mudar nada.

Conferência do resultado, por consulta REST, sem precisar de cliente SQL:

```bash
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2-); KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2-); curl -s "$URL/rest/v1/menu_item_media?select=item_id,kind,position,focal_x,focal_y&order=item_id,position" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```

Esperado: `focal_x` e `focal_y` presentes com 0.5, e **nenhuma repetição de
`position` dentro de um mesmo `item_id`**.

- [ ] **Passo 4: aplicar no projeto da nuvem**

Colar `supabase/schema.sql` inteiro no SQL Editor do projeto para onde `NEXT_PUBLIC_SUPABASE_URL` aponta. É para lá que o app escreve; o banco em Docker é só prova.

**Conferir antes se a `0014_storage_roles.sql` já foi aplicada** — ela estava pendente em 2026-09-18. Se não tinha sido, esta aplicação a leva junto; registrar isso no relatório.

- [ ] **Passo 5: o domínio**

Em `src/domain/media.ts`:

```ts
const focalSchema = z.number().min(0).max(1)

export const setMediaFocalSchema = z.object({
  mediaId: uuidSchema,
  focalX: focalSchema,
  focalY: focalSchema,
})
```

E dentro de `registerMediaSchema`, junto de `width`/`height`:

```ts
  focalX: focalSchema.optional(),
  focalY: focalSchema.optional(),
```

- [ ] **Passo 6: os DTOs**

Em `src/domain/menu.ts`, `MenuMediaDTO` ganha `focalX: number` e `focalY: number`. O campo `media` de `OwnerMenuItemDTO` ganha os mesmos dois.

- [ ] **Passo 7: a DAL lê e escreve os dois campos**

Em `src/server/dal/menu.ts`: acrescentar `focal_x, focal_y` às **duas** listas de `select` de `menu_item_media`, ao tipo `RawMedia`, e ao mapeamento das duas funções:

```ts
              focalX: media.focal_x,
              focalY: media.focal_y,
```

Em `src/server/dal/media.ts`, o `insert` de `registerItemMedia` ganha:

```ts
      focal_x: data.focalX ?? 0.5,
      focal_y: data.focalY ?? 0.5,
```

E a função nova, ao fim do arquivo:

```ts
export async function setMediaFocal(input: unknown): Promise<AlvoRevalidacao> {
  const data = setMediaFocalSchema.parse(input)

  const supabase = await db()
  const { data: row, error: lookupError } = await supabase
    .from('menu_item_media')
    .select('restaurant_id')
    .eq('id', data.mediaId)
    .single()

  if (lookupError || !row) throw new Error('Mídia não encontrada')
  const restaurantId = row.restaurant_id as string
  await requireRestaurantAdmin(restaurantId)

  const { error } = await supabase
    .from('menu_item_media')
    .update({ focal_x: data.focalX, focal_y: data.focalY })
    .eq('id', data.mediaId)

  if (error) {
    throw new Error(`Não foi possível salvar o enquadramento: ${error.message}`)
  }

  return alvoDoRestaurante(restaurantId)
}
```

- [ ] **Passo 8: a action**

Em `src/server/actions/media.ts`:

```ts
export async function setMediaFocalAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.setMediaFocal(input))
  })
}
```

- [ ] **Passo 9: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 10: relatar**

Arquivos alterados: a migration nova, `schema.sql` regenerado, `src/domain/media.ts`, `src/domain/menu.ts`, `src/server/dal/media.ts`, `src/server/dal/menu.ts`, `src/server/actions/media.ts`. Registrar se a 0014 foi junto. Nada de git.

---

## Tarefa 9: A ordem das mídias passa a ser única por item

**O defeito que esta tarefa conserta:** `registerItemMedia` grava `position: sameKind` — a contagem de mídias **do mesmo tipo**. Imagens ficam em 0, 1, 2; e o vídeo também fica em **0**. Numa lista isso nunca apareceu, porque só `media[0]` virava miniatura e o filtro por `kind` separava os dois. No feed a ordem **é** a ordem das telas, e duas mídias em `position: 0` deixam indefinido qual abre o prato.

**Arquivos:**
- Modificar: `src/domain/media.ts`, `src/server/dal/media.ts`, `src/server/actions/media.ts`
- Prova: `<temp da sessão>/reparo-ordem.sql`

**Interfaces:**
- Produz:
  - `reorderMediaSchema` = `{ itemId: uuid, order: { id: uuid, position: number }[] }`
  - `reorderItemMedia(input: unknown): Promise<AlvoRevalidacao>`
  - `reorderItemMediaAction(input: unknown): Promise<ActionResult>`

- [ ] **Passo 1: o schema, no formato que o projeto já usa**

Em `src/domain/media.ts`:

```ts
// Mesmo formato do `reorderSchema` de `@/domain/menu`, que já serve
// categorias e itens. Um formato só de reordenação no projeto inteiro.
export const reorderMediaSchema = z.object({
  itemId: uuidSchema,
  order: z
    .array(z.object({ id: uuidSchema, position: z.int().min(0).max(10) }))
    .min(1),
})
```

- [ ] **Passo 2: a `position` passa a contar o item inteiro**

Em `src/server/dal/media.ts`, dentro de `registerItemMedia`. A consulta de irmãos já traz todas as linhas; o que muda é o uso:

```ts
  const limits = MEDIA_LIMITS[data.kind]
  const todas = siblings ?? []
  const sameKind = todas.filter((row) => row.kind === data.kind).length
```

O `if (sameKind >= limits.maxPerItem)` e o `ConflictError` continuam idênticos — o **teto** segue sendo por tipo, e só a **ordem** deixa de ser. No `insert`, trocar `position: sameKind` por:

```ts
      // A posição conta o item INTEIRO, e não o tipo. Contar por tipo punha
      // a primeira imagem e o vídeo os dois em 0, e no feed a ordem das
      // mídias É a ordem das telas: duas em 0 deixam indefinido qual abre o
      // prato. O teto por tipo continua em `sameKind`, acima.
      position: todas.length,
```

- [ ] **Passo 3: reparar as linhas que já estão no banco**

Escrever `<temp da sessão>/reparo-ordem.sql` e rodar no SQL Editor do projeto da nuvem, um bloco de cada vez:

```sql
-- 1. Diagnostico: itens com posicao repetida
select item_id, position, count(*)
from public.menu_item_media
group by item_id, position
having count(*) > 1
order by count(*) desc;
```

```sql
-- 2. Reparo: renumera cada item de 0 em diante, imagem antes de video,
-- preservando a ordem relativa que ja existia dentro de cada tipo.
with renumerado as (
  select
    id,
    row_number() over (
      partition by item_id
      order by (kind = 'video'), position, created_at
    ) - 1 as nova
  from public.menu_item_media
)
update public.menu_item_media m
set position = r.nova
from renumerado r
where m.id = r.id and m.position is distinct from r.nova;
```

```sql
-- 3. Conferencia: nenhuma repeticao sobrou
select item_id, position, count(*)
from public.menu_item_media
group by item_id, position
having count(*) > 1;
```

Esperado: o bloco 3 volta **vazio**. Guardar a saída do bloco 1 para o relatório — ela diz quantos itens estavam afetados.

- [ ] **Passo 4: a reordenação**

Em `src/server/dal/media.ts`:

```ts
export async function reorderItemMedia(input: unknown): Promise<AlvoRevalidacao> {
  const data = reorderMediaSchema.parse(input)

  const supabase = await db()
  const { data: item, error: lookupError } = await supabase
    .from('menu_items')
    .select('restaurant_id')
    .eq('id', data.itemId)
    .single()

  if (lookupError || !item) throw new Error('Item não encontrado')
  const restaurantId = item.restaurant_id as string
  await requireRestaurantAdmin(restaurantId)

  // Uma chamada por linha, e não um upsert em lote: o upsert do PostgREST
  // exige mandar a linha inteira, e mandar colunas que não mudaram abre a
  // porta para sobrescrever `storage_path` por engano. O teto por item é de
  // cinco mídias, então cinco chamadas é o pior caso.
  for (const entry of data.order) {
    const { error } = await supabase
      .from('menu_item_media')
      .update({ position: entry.position })
      .eq('id', entry.id)
      // A trava: sem ela, um id de mídia de OUTRO item passaria pela
      // autorização que acabou de ser feita sobre este item.
      .eq('item_id', data.itemId)

    if (error) throw new Error(`Não foi possível reordenar: ${error.message}`)
  }

  return alvoDoRestaurante(restaurantId)
}
```

- [ ] **Passo 5: a action**

```ts
export async function reorderItemMediaAction(input: unknown): Promise<ActionResult> {
  return runAction(async () => {
    revalidateRestaurant(await dal.reorderItemMedia(input))
  })
}
```

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 7: relatar**

Arquivos alterados: `src/domain/media.ts`, `src/server/dal/media.ts`, `src/server/actions/media.ts`. Anexar a contagem de itens que o reparo tocou. Nada de git.

---

## Tarefa 10: O editor de mídia ganha enquadramento e ordem

**Arquivos:**
- Criar: `src/components/cardapio/media-focal.tsx`
- Modificar: `src/components/cardapio/media-editor.tsx` (347 linhas hoje)
- Modificar: `src/domain/media.ts`

**Interfaces:**
- Consome: `setMediaFocalAction`, `reorderItemMediaAction`.
- Produz: `<MediaFocal media={OwnerMenuItemDTO['media'][number]} />`

- [ ] **Passo 1: baixar o teto de imagens**

Em `src/domain/media.ts`, dentro de `MEDIA_LIMITS.image`:

```ts
    // Baixou de 6 para 4 na Fase 4. Seis imagens mais um vídeo eram uma
    // galeria numa lista; no feed são sete telas verticais antes de o
    // cliente chegar ao próximo prato.
    maxPerItem: 4,
```

Itens que já têm 5 ou 6 imagens **continuam válidos**: o teto é conferido só ao inserir. Nada é apagado.

- [ ] **Passo 2: o seletor de ponto focal, em arquivo próprio**

Criar `src/components/cardapio/media-focal.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { RiCrosshair2Line } from 'react-icons/ri'
import { toast } from '@/components/ui/toast'
import type { OwnerMenuItemDTO } from '@/domain/menu'
import { publicMediaUrl } from '@/lib/media-url'
import { setMediaFocalAction } from '@/server/actions/media'

// Um clique, e não um editor de recorte. No feed a foto é desenhada em tela
// cheia com `cover`, e o que se perde é a sobra fora do quadro. O que o dono
// precisa dizer é uma coisa só: qual ponto não pode sair. Um editor de
// recorte seria uma tela inteira para o mesmo ganho.
export function MediaFocal({
  media,
}: {
  media: OwnerMenuItemDTO['media'][number]
}) {
  const [ponto, setPonto] = useState({ x: media.focalX, y: media.focalY })
  const [pending, startTransition] = useTransition()

  const preview =
    media.kind === 'image'
      ? publicMediaUrl('image', media.storagePath)
      : media.posterPath
        ? publicMediaUrl('image', media.posterPath)
        : null

  if (!preview) return null

  function marcar(event: React.MouseEvent<HTMLButtonElement>) {
    const caixa = event.currentTarget.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (event.clientX - caixa.left) / caixa.width))
    const y = Math.min(1, Math.max(0, (event.clientY - caixa.top) / caixa.height))
    setPonto({ x, y })

    startTransition(async () => {
      const result = await setMediaFocalAction({
        mediaId: media.id,
        focalX: x,
        focalY: y,
      })
      if (result.ok) {
        toast.add({ title: 'Enquadramento salvo', type: 'success' })
      } else {
        // A marca volta para onde estava: mostrar a marca nova depois de uma
        // gravação que falhou mentiria sobre o estado do sistema.
        setPonto({ x: media.focalX, y: media.focalY })
        toast.add({ title: result.error, type: 'error' })
      }
    })
  }

  return (
    <div>
      <p className="mb-2 text-small text-muted-foreground">
        Clique no ponto que não pode sair do quadro. No celular do cliente a
        foto ocupa a tela inteira, e é por aqui que ela é centrada.
      </p>
      <button
        type="button"
        onClick={marcar}
        disabled={pending}
        aria-label="Marcar o ponto de enquadramento"
        className="relative block aspect-[9/16] w-[160px] overflow-hidden rounded-lg border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: `${ponto.x * 100}% ${ponto.y * 100}%` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.9)]"
          style={{ left: `${ponto.x * 100}%`, top: `${ponto.y * 100}%` }}
        >
          <RiCrosshair2Line className="size-6" />
        </span>
      </button>
    </div>
  )
}
```

A miniatura é `aspect-[9/16]` de propósito: ela mostra o enquadramento **como o cliente vai ver**, e não a foto inteira.

- [ ] **Passo 3: uma lista só, na ordem real**

Em `src/components/cardapio/media-editor.tsx`, a listagem hoje separa `images` de `video`. Passa a ser uma lista só:

```tsx
  // A lista do editor passa a ser a ordem REAL das telas do feed, imagem e
  // vídeo no mesmo eixo. Separar por tipo aqui esconderia do dono o que o
  // cliente vai ver primeiro.
  const ordenadas = [...media].sort((a, b) => a.position - b.position)
```

As constantes `images`, `full` e `video` continuam existindo para os dois botões de envio e para o teto — só a **exibição** muda.

- [ ] **Passo 4: mover para cima e para baixo**

Ainda em `media-editor.tsx`:

```tsx
  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao
    if (destino < 0 || destino >= ordenadas.length) return

    const nova = [...ordenadas]
    const [movida] = nova.splice(indice, 1)
    nova.splice(destino, 0, movida)

    startTransition(async () => {
      const result = await reorderItemMediaAction({
        itemId,
        order: nova.map((entrada, posicao) => ({
          id: entrada.id,
          position: posicao,
        })),
      })
      if (!result.ok) toast.add({ title: result.error, type: 'error' })
    })
  }
```

Cada entrada da lista ganha dois botões, no padrão do `reorder-buttons.tsx` que o cardápio já usa para itens, e a primeira ganha um rótulo:

```tsx
                {indice === 0 ? (
                  <span className="text-micro font-semibold uppercase tracking-wider text-primary">
                    Abre o prato
                  </span>
                ) : null}
```

- [ ] **Passo 5: pendurar o seletor de foco**

Dentro da entrada de cada mídia, abaixo da miniatura: `<MediaFocal media={entrada} />`.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 7: conferir no navegador**

No painel, na edição de um item com duas ou mais mídias:

1. Mover a segunda para a primeira posição → o rótulo "Abre o prato" acompanha, e recarregar confirma que gravou.
2. Clicar num canto da miniatura de foco → a foto se desloca na hora, o toast confirma, e recarregar confirma.
3. Tentar enviar uma quinta imagem → recusado com a mensagem de teto.

Anexar captura.

- [ ] **Passo 8: relatar**

Arquivos alterados: `src/components/cardapio/media-focal.tsx` (novo), `src/components/cardapio/media-editor.tsx`, `src/domain/media.ts`. Nada de git.

---

## Tarefa 11: Mídia obrigatória, em três camadas

**Arquivos:**
- Modificar: `src/server/dal/menu.ts` — função nova, `getPublicMenu` e `getMenuForOwner`
- Modificar: `src/server/dal/restaurants.ts` — `setPublished`
- Modificar: `src/domain/menu.ts` — `OwnerMenuItemDTO`
- Modificar: `src/app/painel/restaurantes/[id]/page.tsx`
- Modificar: `src/components/painel/publish-bar.tsx`
- Modificar: `src/components/cardapio/item-row.tsx`

**Interfaces:**
- Produz:
  - `contarItensSemMidia(restaurantId: string): Promise<number>` em `dal/menu.ts`
  - `OwnerMenuItemDTO` ganha `semMidia: boolean`
  - `PublishBar` ganha a prop `semMidia: number`

- [ ] **Passo 1: a contagem**

Em `src/server/dal/menu.ts`:

```ts
// Item visível e sem nenhuma mídia. É o que impede a publicação e o que some
// do feed. A junção é `!left` porque o que se procura é justamente a
// AUSÊNCIA do lado direito.
export async function contarItensSemMidia(restaurantId: string): Promise<number> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, menu_item_media!left ( id )')
    .eq('restaurant_id', restaurantId)
    .eq('is_visible', true)

  if (error) throw new Error(`Não foi possível conferir as fotos: ${error.message}`)

  return (data ?? []).filter(
    (item) =>
      ((item as { menu_item_media: unknown[] }).menu_item_media ?? []).length === 0,
  ).length
}
```

- [ ] **Passo 2: camada 1 — a publicação recusa**

Em `src/server/dal/restaurants.ts`, dentro de `setPublished`, no bloco `if (data.published)`, logo depois da conferência de "ao menos um item visível" que já existe:

```ts
    // Mídia é obrigatória a partir da Fase 4, e a recusa mora AQUI e não na
    // criação do item. Recusar na criação obrigaria o dono a ter oitenta
    // fotos antes de digitar o primeiro nome, e ele desistiria no meio.
    // Recusar na publicação diz: monte à vontade, mas o cliente não vê
    // cardápio pela metade.
    const semMidia = await contarItensSemMidia(data.restaurantId)
    if (semMidia > 0) {
      throw new UserFacingError(
        semMidia === 1
          ? 'Um item visível ainda está sem foto nem vídeo. Adicione a mídia dele antes de publicar.'
          : `${semMidia} itens visíveis ainda estão sem foto nem vídeo. Adicione a mídia deles antes de publicar.`,
      )
    }
```

**Restaurante que já está no ar não é tocado.** A regra roda só em `setPublished(true)`, então quem já publicou continua publicado até a próxima publicação — que é o que a §5.5 da spec decidiu.

- [ ] **Passo 3: camada 2 — o feed esconde**

Em `getPublicMenu`, no `.filter` dos itens:

```ts
      items: (category.menu_items ?? [])
        // Item sem mídia não entra no feed, nem num cardápio publicado.
        // Cobre o caso de apagar a última foto com o cardápio no ar: o item
        // some, o painel avisa, e o cliente na mesa nunca vê coluna vazia.
        .filter((item) => item.is_visible && (item.menu_item_media ?? []).length > 0)
```

E, depois do `.map` das categorias, antes do `return`:

```ts
  // Categoria que ficou sem item nenhum some do trilho. Trilho com categoria
  // que não leva a lugar nenhum é pior que trilho mais curto.
  const comItens = categories.filter((category) => category.items.length > 0)
```

Trocar `categories` por `comItens` no objeto devolvido.

- [ ] **Passo 4: camada 3 — o painel avisa**

Em `src/domain/menu.ts`, `OwnerMenuItemDTO` ganha:

```ts
  /** Visível e sem nenhuma mídia. É o que impede a publicação. */
  semMidia: boolean
```

Em `getMenuForOwner`, no `map` do item:

```ts
        semMidia: item.is_visible && (item.menu_item_media ?? []).length === 0,
```

Em `src/components/cardapio/item-row.tsx`, ao lado do nome:

```tsx
        {item.semMidia ? (
          // Texto, e não só cor: quem não distingue o contraste precisa
          // poder ler o que está faltando.
          <span className="inline-flex items-center gap-1 rounded-full bg-status-suspended-bg px-2 py-0.5 text-micro font-semibold text-status-suspended">
            <RiImageAddLine className="size-3" aria-hidden="true" />
            Sem foto
          </span>
        ) : null}
```

Importar `RiImageAddLine` de `react-icons/ri`.

- [ ] **Passo 5: a faixa de publicação lista o que falta**

Em `src/app/painel/restaurantes/[id]/page.tsx`, antes do JSX:

```tsx
  const semMidia = categories
    .flatMap((category) => category.items)
    .filter((item) => item.semMidia).length
```

Passar `semMidia={semMidia}` ao `PublishBar`. Em `publish-bar.tsx`, a prop entra na assinatura como `semMidia: number`, o botão ganha a trava:

```tsx
            disabled={pending || (!noAr && semMidia > 0)}
```

e, ao fim da faixa, quando `!noAr && semMidia > 0`:

```tsx
      <p className="w-full text-small text-status-suspended">
        {semMidia === 1
          ? 'Um item visível ainda está sem foto nem vídeo.'
          : `${semMidia} itens visíveis ainda estão sem foto nem vídeo.`}{' '}
        Procure a marca <strong>Sem foto</strong> na lista abaixo.
      </p>
```

Desativar o botão é cortesia; a regra é o `setPublished`, que recusa de novo.

- [ ] **Passo 6: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 7: provar as três camadas no navegador**

1. Restaurante em rascunho com um item sem mídia → o botão de publicar está desativado e a razão está escrita. Anexar captura.
2. Remover temporariamente o `disabled` pelo inspetor e clicar → esperado: recusa com a contagem. Prova que a camada 1 não depende da interface.
3. Restaurante **no ar**: apagar a última mídia de um item e recarregar o cardápio público → o item sumiu. No painel, a marca "Sem foto" apareceu.

- [ ] **Passo 8: relatar**

Arquivos alterados: `src/server/dal/menu.ts`, `src/server/dal/restaurants.ts`, `src/domain/menu.ts`, `src/app/painel/restaurantes/[id]/page.tsx`, `src/components/painel/publish-bar.tsx`, `src/components/cardapio/item-row.tsx`. Nada de git.

---

# Bloco D — O feed

Depende do Bloco A (as variáveis de cor, incluindo `--m-veil`) e do Bloco C (mídia com ordem e foco). Não depende do Bloco B.

## A lista plana

O rolador horizontal contém a capa e **todos** os pratos de **todas** as categorias, na ordem. O trilho não troca o conjunto de colunas: ele **rola até** a primeira coluna da categoria escolhida.

A primeira redação da spec dizia que tocar numa categoria trocava o conjunto, o que contradizia a própria §4.1 — conjunto trocado não deixa a categoria seguinte entrar em sequência sem uma emenda invisível no meio do deslize. **A spec foi corrigida junto com este plano** (§4.1 e §4.2), e as duas agora dizem lista plana. Além de resolver a contradição, isso elimina um estado que teria de ser mantido em sincronia com a posição do rolador.

## Tarefa 12: A tela de mídia

**Arquivos:**
- Modificar: `next.config.ts`
- Criar: `src/components/cardapio-publico/menu-media.tsx`
- Modificar: `src/components/cardapio-publico/theme.css`

**Interfaces:**
- Consome: `MenuMediaDTO` (já com `focalX`/`focalY`, da Tarefa 8); `publicMediaUrl`.
- Produz: `<MenuMedia media={MenuMediaDTO} prioridade={boolean} ativa={boolean} />`

- [ ] **Passo 1: ler a doc antes de configurar**

```bash
sed -n '1,60p' node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/images.md
```

- [ ] **Passo 2: liberar o host do Storage**

Em `next.config.ts`, acrescentar ao objeto `nextConfig`:

```ts
// O host sai da própria variável de ambiente: em desenvolvimento o Supabase
// é http://127.0.0.1:54321 e na nuvem é https://<projeto>.supabase.co.
// Escrever o host à mão quebraria um dos dois.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null

// ...dentro de nextConfig:
  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(':', '') as 'http' | 'https',
            hostname: supabase.hostname,
            port: supabase.port || undefined,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
```

**A CSP não muda.** O otimizador serve por `/_next/image`, que já está coberto por `img-src 'self'` na política que o arquivo monta logo acima.

- [ ] **Passo 3: as regras de CSS do feed**

Em `src/components/cardapio-publico/theme.css`, acrescentar ao fim:

```css
/* Os dois eixos são scroll-snap NATIVO aninhado. Não há JavaScript de gesto
   em lugar nenhum do feed: o navegador já sabe fazer inércia, e imitar isso
   à mão é onde esse tipo de interface costuma engasgar. */
.menu-feed {
  display: flex;
  height: 100dvh;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  /* Sem isto, chegar ao fim do feed puxa a página inteira atrás. */
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.menu-feed::-webkit-scrollbar {
  display: none;
}

.menu-column {
  position: relative;
  flex: 0 0 100%;
  height: 100dvh;
  scroll-snap-align: start;
  /* `always` impede o deslize rápido de pular três pratos de uma vez. */
  scroll-snap-stop: always;
}

/* O rolador vertical é ABSOLUTO dentro da coluna, e o rodapé fica de fora
   dele. É isso que faz nome e preço não se moverem quando a mídia troca —
   `position: sticky` dentro do rolador dependeria da ordem dos filhos e
   escorregaria no fim da lista. */
.menu-screens {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  overscroll-behavior-y: contain;
  scrollbar-width: none;
}
.menu-screens::-webkit-scrollbar {
  display: none;
}

.menu-screen {
  position: relative;
  height: 100dvh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  background: var(--m-base);
}

/* O véu. É ele que torna o contraste MEDÍVEL: o que está atrás é foto de
   prato, que é imprevisível, e o que fica atrás do texto é esta cor, que é
   conhecida. Os pisos do tema valem porque este gradiente existe. */
.menu-veil {
  background: linear-gradient(
    to top,
    var(--m-veil) 0%,
    var(--m-veil) 42%,
    color-mix(in oklab, var(--m-base) 55%, transparent) 68%,
    transparent 100%
  );
}

/* Quem pediu menos movimento continua com o snap — ele não é animação, é
   onde a rolagem para. O que sai é a rolagem suave e, na Tarefa 17, o
   autoplay do vídeo. */
@media (prefers-reduced-motion: reduce) {
  .menu-feed,
  .menu-screens {
    scroll-behavior: auto;
  }
}
```

Remover, no mesmo arquivo, os blocos `.menu[data-layout='cartao'] ...` e `.menu[data-density='compacto'] .menu-item-description`. Não existe mais layout variável nem descrição de lista para recolher.

- [ ] **Passo 4: a tela de mídia**

Criar `src/components/cardapio-publico/menu-media.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { MenuMediaDTO } from '@/domain/menu'
import { publicMediaUrl } from '@/lib/media-url'

// Uma tela do feed. Imagem ou vídeo, sempre em tela cheia, sempre com o
// ponto focal que o dono marcou.
//
// É componente de cliente por causa do vídeo: ele precisa saber quando está
// na tela. A imagem não precisaria, mas separar em dois arquivos por causa
// disso custaria mais do que economiza. O TEMA continua sem JavaScript: as
// variáveis de cor vêm renderizadas do servidor.
export function MenuMedia({
  media,
  prioridade,
  ativa,
}: {
  media: MenuMediaDTO
  /** Primeira tela do primeiro prato: carrega sem esperar. */
  prioridade: boolean
  /** A tela está visível agora. Só ela toca vídeo. */
  ativa: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const posicao = `${media.focalX * 100}% ${media.focalY * 100}%`

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (ativa) {
      // `catch` porque o navegador recusa `play()` em várias situações
      // legítimas — aba em segundo plano, economia de bateria. Recusa de
      // autoplay não é erro que o cliente precise ver.
      void el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [ativa])

  if (media.kind === 'video') {
    return (
      <div className="menu-screen">
        <video
          ref={videoRef}
          src={publicMediaUrl('video', media.storagePath)}
          poster={
            media.posterPath ? publicMediaUrl('image', media.posterPath) : undefined
          }
          // SEM SOM, sempre. Som saindo do celular de alguém numa mesa de
          // restaurante é agressão, e é a mesma razão pela qual o vídeo tem
          // teto de 15 segundos desde a Fase 2.
          muted
          playsInline
          loop
          // `none` e não `metadata`: a Tarefa 17 decide o que pré-carregar,
          // por vizinhança. O padrão aqui é não baixar nada.
          preload="none"
          className="h-full w-full object-cover"
          style={{ objectPosition: posicao }}
        />
      </div>
    )
  }

  return (
    <div className="menu-screen">
      <Image
        src={publicMediaUrl('image', media.storagePath)}
        alt={media.altText ?? ''}
        fill
        // O feed é uma coluna por tela em qualquer aparelho, então a imagem
        // sempre ocupa a largura inteira da janela.
        sizes="100vw"
        priority={prioridade}
        className="object-cover"
        style={{ objectPosition: posicao }}
      />
    </div>
  )
}
```

- [ ] **Passo 5: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: continuam os erros de `theme.layout` em `(site)/[slug]/page.tsx`, `menu-category.tsx` e `menu-item.tsx`. Eles caem nas Tarefas 15 e 18.

- [ ] **Passo 6: relatar**

Arquivos alterados: `next.config.ts`, `src/components/cardapio-publico/menu-media.tsx` (novo), `src/components/cardapio-publico/theme.css`. Nada de git.

---

## Tarefa 13: A coluna do prato

**Arquivos:**
- Criar: `src/components/cardapio-publico/menu-dish.tsx`

**Interfaces:**
- Consome: `MenuMedia`, `MenuItemDTO`, `formatPriceBRL`.
- Produz: `<MenuDish item={MenuItemDTO} indiceNaCategoria={number} totalNaCategoria={number} primeira={boolean} onVerDetalhes={() => void} />`

- [ ] **Passo 1: escrever a coluna**

Criar `src/components/cardapio-publico/menu-dish.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { MenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'
import { MenuMedia } from './menu-media'

// Uma coluna do feed: o rolador vertical das mídias, e um rodapé que NÃO se
// move quando a mídia troca.
//
// Nome e preço pertencem ao PRATO, não à tela. É isso que separa "feed de um
// prato" de "carrossel de fotos soltas".
export function MenuDish({
  item,
  indiceNaCategoria,
  totalNaCategoria,
  primeira,
  onVerDetalhes,
}: {
  item: MenuItemDTO
  indiceNaCategoria: number
  totalNaCategoria: number
  primeira: boolean
  onVerDetalhes: () => void
}) {
  const [telaAtiva, setTelaAtiva] = useState(0)

  // Com variações, o preço base some — regra da Fase 2, que continua. O
  // rodapé mostra a menor, e a lista inteira vai na folha: mostrar os dois
  // faria o cliente somar coisas que não se somam.
  const menorVariacao =
    item.variants.length > 0
      ? Math.min(...item.variants.map((v) => v.priceCents))
      : null

  function aoRolar(event: React.UIEvent<HTMLDivElement>) {
    const alvo = event.currentTarget
    // Divisão pela altura da própria janela de rolagem: cada tela ocupa
    // exatamente uma, por construção do `.menu-screen`.
    const indice = Math.round(alvo.scrollTop / alvo.clientHeight)
    if (indice !== telaAtiva) setTelaAtiva(indice)
  }

  return (
    <article
      className="menu-column"
      aria-label={item.name}
    >
      <div className="menu-screens" onScroll={aoRolar}>
        {item.media.map((media, indice) => (
          <MenuMedia
            key={media.storagePath}
            media={media}
            prioridade={primeira && indice === 0}
            // Só a tela visível toca vídeo. A Tarefa 17 acrescenta a
            // segunda condição, de vizinhança da coluna.
            ativa={indice === telaAtiva}
          />
        ))}
      </div>

      {/* Pontinhos: quantas telas o prato tem. Some quando há uma só —
          indicador que indica um item só é ruído. */}
      {item.media.length > 1 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5"
        >
          {item.media.map((media, indice) => (
            <span
              key={media.storagePath}
              className="block size-1.5 rounded-full transition-opacity"
              style={{
                background: 'var(--m-ink)',
                opacity: indice === telaAtiva ? 0.95 : 0.35,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* O rodapé vive FORA do rolador vertical. Ele não se move. */}
      <div className="menu-veil pointer-events-none absolute inset-x-0 bottom-0 z-10 pt-24">
        <div className="pointer-events-auto px-5 pb-8">
          <p
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--m-muted)' }}
          >
            {indiceNaCategoria + 1} / {totalNaCategoria}
          </p>

          {item.dietaryTags.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {item.dietaryTags.map((tag) => (
                <li
                  key={tag}
                  className="menu-block border px-2 py-0.5 text-[0.6875rem] font-medium"
                  style={{ borderColor: 'var(--m-line)', color: 'var(--m-muted)' }}
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 className="menu-display text-[1.5rem] font-semibold leading-tight">
              {item.name}
              {item.isAvailable ? null : (
                // Esgotado é TEXTO, não opacidade: quem não distingue o
                // contraste precisa poder ler. Regra da Fase 3, mantida.
                <span
                  className="ml-2 align-middle text-[0.8125rem] font-normal"
                  style={{ color: 'var(--m-muted)' }}
                >
                  esgotado
                </span>
              )}
            </h2>

            <span
              className="menu-accent shrink-0 text-[1.0625rem] font-semibold"
            >
              {menorVariacao === null ? (
                formatPriceBRL(item.basePriceCents)
              ) : (
                <>
                  <span
                    className="mr-1 text-[0.75rem] font-normal"
                    style={{ color: 'var(--m-muted)' }}
                  >
                    a partir de
                  </span>
                  {formatPriceBRL(menorVariacao)}
                </>
              )}
            </span>
          </div>

          {item.description || item.variants.length > 0 ? (
            <button
              type="button"
              onClick={onVerDetalhes}
              className="mt-2 flex min-h-11 items-center text-left text-[0.875rem] leading-snug"
              style={{ color: 'var(--m-muted)' }}
            >
              <span className="line-clamp-2">
                {item.description ?? 'Ver as opções deste prato'}
              </span>
              <span className="ml-2 shrink-0 underline underline-offset-2">
                ver mais
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Passo 2: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 3: relatar**

Arquivos alterados: `src/components/cardapio-publico/menu-dish.tsx` (novo). O componente ainda não é montado por ninguém — a Tarefa 15 o liga. Nada de git.

---

## Tarefa 14: A coluna zero

**Arquivos:**
- Criar: `src/components/cardapio-publico/menu-cover.tsx`

**Interfaces:**
- Consome: as mesmas props que o `MenuHeader` de hoje recebe.
- Produz: `<MenuCover name description logoPath coverPath contact />`

- [ ] **Passo 1: escrever a capa**

Criar `src/components/cardapio-publico/menu-cover.tsx`. O cálculo dos atalhos de contato é **copiado do `menu-header.tsx` sem alteração** — ele está correto e foi verificado na Fase 3:

```tsx
import Image from 'next/image'
import { publicMediaUrl } from '@/lib/media-url'

type Atalho = { rotulo: string; href: string }

// A coluna ZERO do feed, e não uma faixa antes dele. Assim o gesto tem um
// significado só no cardápio inteiro: horizontal é onde estou, vertical é o
// que tem nesta parada. A alternativa — rolar entra no feed, e dentro do
// feed rolar troca a mídia — fazia o mesmo gesto significar duas coisas com
// a fronteira invisível.
export function MenuCover({
  name,
  description,
  logoPath,
  coverPath,
  contact,
}: {
  name: string
  description: string | null
  logoPath: string | null
  coverPath: string | null
  contact: Record<string, string>
}) {
  // O predicado é escrito à mão: a inferência automática de `filter` só
  // chegou no TypeScript 5.5, e o projeto declara `^5`.
  const links: Atalho[] = [
    contact.whatsapp
      ? {
          rotulo: 'WhatsApp',
          href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`,
        }
      : null,
    contact.instagram
      ? {
          rotulo: 'Instagram',
          href: `https://instagram.com/${contact.instagram.replace(/^@/, '')}`,
        }
      : null,
    contact.phone
      ? { rotulo: 'Telefone', href: `tel:${contact.phone.replace(/\D/g, '')}` }
      : null,
  ].filter((link): link is Atalho => link !== null)

  return (
    <section className="menu-column" aria-label={`Sobre ${name}`}>
      <div className="menu-screens">
        <div className="menu-screen flex flex-col justify-end">
          {coverPath ? (
            <Image
              src={publicMediaUrl('image', coverPath)}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          ) : (
            // Sem capa, o tema desenha uma. Um retângulo cinza diria "faltou
            // foto"; isto diz "é assim".
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(150deg, color-mix(in oklab, var(--m-accent) 70%, var(--m-base)), var(--m-base))',
              }}
            />
          )}

          <div className="menu-veil relative z-10 px-5 pb-12 pt-32">
            {logoPath ? (
              // `object-contain` e não `cover`: recortar um logo retangular
              // em quadrado é sempre errado. E `relative` porque a capa
              // acima é posicionada e pintaria por cima de um estático —
              // era esse o defeito do logo cortado.
              <div
                className="menu-photo relative mb-5 size-20 overflow-hidden border-4"
                style={{ borderColor: 'var(--m-base)', background: 'var(--m-base)' }}
              >
                <Image
                  src={publicMediaUrl('image', logoPath)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              </div>
            ) : null}

            <h1 className="menu-display text-[2rem] font-semibold leading-tight">
              {name}
            </h1>

            {description ? (
              <p
                className="mt-2 text-[0.9375rem] leading-relaxed"
                style={{ color: 'var(--m-muted)' }}
              >
                {description}
              </p>
            ) : null}

            {links.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {links.map((link) => (
                  <a
                    key={link.rotulo}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    // min-h-11 são os 44px de alvo de toque.
                    className="menu-block menu-line flex min-h-11 items-center border px-4 text-sm font-medium"
                  >
                    {link.rotulo}
                  </a>
                ))}
              </div>
            ) : null}

            {contact.address ? (
              <p
                className="mt-4 text-[0.8125rem]"
                style={{ color: 'var(--m-muted)' }}
              >
                {contact.address}
              </p>
            ) : null}

            <p
              aria-hidden="true"
              className="mt-8 text-[0.75rem] font-medium uppercase tracking-[0.14em]"
              style={{ color: 'var(--m-muted)' }}
            >
              Deslize para ver o cardápio →
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
```

A dica "Deslize para ver o cardápio" existe porque o eixo horizontal não é o que a pessoa espera ao abrir uma página. Ela aparece só na capa, uma vez.

- [ ] **Passo 2: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 3: relatar**

Arquivos alterados: `src/components/cardapio-publico/menu-cover.tsx` (novo). Nada de git.

---

## Tarefa 15: O trilho, o feed e a rota

**Arquivos:**
- Criar: `src/components/cardapio-publico/menu-rail.tsx`
- Criar: `src/components/cardapio-publico/menu-feed.tsx`
- Modificar: `src/app/(site)/[slug]/page.tsx`

**Interfaces:**
- Consome: `MenuCover`, `MenuDish`, `MenuDetails` (Tarefa 16), `PublicMenuDTO`.
- Produz: `<MenuFeed menu={PublicMenuDTO} />` — o único componente que a rota monta além do `<style>` do tema.

- [ ] **Passo 1: o trilho**

Criar `src/components/cardapio-publico/menu-rail.tsx`:

```tsx
'use client'

import type { MenuCategoryDTO } from '@/domain/menu'

export function MenuRail({
  categorias,
  ativa,
  onIrParaCapa,
  onIrParaCategoria,
}: {
  categorias: MenuCategoryDTO[]
  /** Id da categoria da coluna visível. `null` na capa. */
  ativa: string | null
  onIrParaCapa: () => void
  onIrParaCategoria: (categoriaId: string) => void
}) {
  return (
    <nav
      aria-label="Categorias do cardápio"
      className="menu-veil absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pb-6 pt-3"
    >
      <button
        type="button"
        onClick={onIrParaCapa}
        aria-label="Voltar para o início do cardápio"
        className="menu-block menu-line flex size-11 shrink-0 items-center justify-center border text-sm font-semibold"
      >
        ←
      </button>

      <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categorias.map((categoria) => {
          const atual = categoria.id === ativa
          return (
            <li key={categoria.id}>
              <button
                type="button"
                onClick={() => onIrParaCategoria(categoria.id)}
                aria-current={atual ? 'true' : undefined}
                className="menu-block flex min-h-11 items-center whitespace-nowrap border px-3 text-[0.8125rem] font-semibold transition-colors"
                style={
                  atual
                    ? {
                        borderColor: 'var(--m-accent)',
                        color: 'var(--m-on-accent)',
                        background: 'var(--m-accent)',
                      }
                    : { borderColor: 'var(--m-line)', color: 'var(--m-muted)' }
                }
              >
                {categoria.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

A categoria ativa usa `--m-accent` como fundo e `--m-on-accent` como texto — o par que a Tarefa 2 garante em 4,5:1 um contra o outro.

- [ ] **Passo 2: o feed**

Criar `src/components/cardapio-publico/menu-feed.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MenuItemDTO, PublicMenuDTO } from '@/domain/menu'
import { MenuCover } from './menu-cover'
import { MenuDish } from './menu-dish'
import { MenuRail } from './menu-rail'

// `menu-details.tsx` NÃO é importado aqui ainda. Ele é criado na Tarefa 16,
// que também liga o estado `detalhes` abaixo. Importar agora deixaria esta
// tarefa sem compilar.

type Coluna = {
  item: MenuItemDTO
  categoriaId: string
  indiceNaCategoria: number
  totalNaCategoria: number
}

export function MenuFeed({ menu }: { menu: PublicMenuDTO }) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [detalhes, setDetalhes] = useState<MenuItemDTO | null>(null)

  // Lista PLANA: a capa e todos os pratos de todas as categorias, em ordem.
  // A spec descrevia trocar o conjunto de colunas ao escolher categoria; uma
  // lista plana faz a categoria seguinte entrar em sequência de verdade, e
  // tira um estado que teria de ser sincronizado com o rolador.
  const colunas: Coluna[] = menu.categories.flatMap((categoria) =>
    categoria.items.map((item, indice) => ({
      item,
      categoriaId: categoria.id,
      indiceNaCategoria: indice,
      totalNaCategoria: categoria.items.length,
    })),
  )

  // Índice 0 é a capa, então a coluna N do feed é `colunas[N - 1]`.
  const colunaAtual = indiceAtual > 0 ? colunas[indiceAtual - 1] : null

  const irPara = useCallback((indice: number) => {
    const feed = feedRef.current
    if (!feed) return
    feed.scrollTo({ left: indice * feed.clientWidth, behavior: 'smooth' })
  }, [])

  function aoRolar() {
    const feed = feedRef.current
    if (!feed) return
    const indice = Math.round(feed.scrollLeft / feed.clientWidth)
    if (indice !== indiceAtual) setIndiceAtual(indice)
  }

  function irParaCategoria(categoriaId: string) {
    const posicao = colunas.findIndex((c) => c.categoriaId === categoriaId)
    if (posicao >= 0) irPara(posicao + 1)
  }

  // Teclado. O rolador nativo responde a seta quando tem foco, mas só depois
  // de a pessoa clicar nele. Ouvir na janela faz o cardápio ser navegável de
  // teclado desde o primeiro instante, que é o que um leitor de tela espera.
  useEffect(() => {
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') irPara(Math.min(indiceAtual + 1, colunas.length))
      if (event.key === 'ArrowLeft') irPara(Math.max(indiceAtual - 1, 0))
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [indiceAtual, colunas.length, irPara])

  return (
    <>
      <MenuRail
        categorias={menu.categories}
        ativa={colunaAtual?.categoriaId ?? null}
        onIrParaCapa={() => irPara(0)}
        onIrParaCategoria={irParaCategoria}
      />

      <div ref={feedRef} className="menu-feed" onScroll={aoRolar}>
        <MenuCover
          name={menu.restaurant.name}
          description={menu.restaurant.description}
          logoPath={menu.restaurant.logoPath}
          coverPath={menu.restaurant.coverPath}
          contact={menu.restaurant.contact}
        />

        {colunas.map((coluna, indice) => (
          <MenuDish
            key={coluna.item.id}
            item={coluna.item}
            indiceNaCategoria={coluna.indiceNaCategoria}
            totalNaCategoria={coluna.totalNaCategoria}
            primeira={indice === 0}
            onVerDetalhes={() => setDetalhes(coluna.item)}
          />
        ))}
      </div>

      {/* A folha entra aqui na Tarefa 16. */}
    </>
  )
}
```

**O cardápio vazio.** Um restaurante publicado em que nenhum item tem mídia chega aqui com `menu.categories` vazio, porque a Tarefa 11 filtrou tudo. Sem tratamento, o cliente vê a capa e um trilho em branco. Acrescentar, logo antes do `return`:

```tsx
  // Cardápio publicado em que nenhum item tem mídia. Acontece com
  // restaurante que já estava no ar antes da Fase 4 — eles não são
  // despublicados (§5.5 da spec), então o caso é real e precisa de resposta.
  const vazio = colunas.length === 0
```

E, dentro do `.menu-feed`, depois do `<MenuCover>`:

```tsx
        {vazio ? (
          <section className="menu-column" aria-label="Cardápio em montagem">
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <p className="menu-display text-[1.25rem] font-semibold">
                O cardápio está sendo montado
              </p>
              <p className="mt-2 text-[0.9375rem]" style={{ color: 'var(--m-muted)' }}>
                Volte daqui a pouco, ou chame alguém da casa.
              </p>
            </div>
          </section>
        ) : null}
```

O trilho, com `menu.categories` vazio, já não renderiza chip nenhum — só o botão de voltar à capa. Não precisa de tratamento próprio.

- [ ] **Passo 3: a rota**

Em `src/app/(site)/[slug]/page.tsx`, trocar o corpo do `return`. O bloco `<style>` das duas faces **não muda** — ele está correto e é o que entrega o tema sem JavaScript:

```tsx
      <div
        data-menu={theme.presetId}
        data-density={theme.density}
        className={`menu relative overflow-hidden ${ALL_THEME_FONT_VARIABLES}`}
      >
        <MenuFeed menu={menu} />
      </div>
```

Remover `data-layout`, o `<main>` com `max-w-[560px]`, o `Stagger`, e os imports de `MenuCategory`, `MenuHeader` e `Stagger`.

O `Stagger` sai porque cascata de entrada era da lista: num feed, só uma coluna está visível, e animar a entrada das outras anima o que ninguém vê.

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

Esperado: os erros de `theme.layout` que sobram são **só** os de `menu-category.tsx` e `menu-item.tsx`, que a Tarefa 18 remove.

- [ ] **Passo 5: conferir no navegador, em tamanho de celular**

Abrir `localhost:<porta>/<slug>` com o viewport em 375×812:

1. A capa ocupa a tela inteira, com o logo **inteiro** e a dica de deslizar.
2. Deslizar para a esquerda → o primeiro prato, com nome e preço no rodapé.
3. Rolar para cima dentro do prato → a próxima mídia; nome e preço **não se movem**.
4. Os pontinhos à direita acompanham a mídia.
5. Deslizar de novo → próximo prato; o contador `2 / N` acompanha.
6. Tocar numa categoria no trilho → vai para o primeiro prato dela, e o chip fica destacado.
7. Setas ←/→ fazem o mesmo do deslize.

Anexar capturas de 1, 2 e 6.

- [ ] **Passo 6: relatar**

Arquivos alterados: `src/components/cardapio-publico/menu-rail.tsx` (novo), `menu-feed.tsx` (novo), `src/app/(site)/[slug]/page.tsx`. Nada de git.

---

## Tarefa 16: A folha de detalhes

**Arquivos:**
- Criar: `src/components/cardapio-publico/menu-details.tsx`
- Modificar: `src/components/cardapio-publico/menu-feed.tsx` — ligar a folha

**Interfaces:**
- Consome: `Sheet`, `SheetContent`, `SheetDescription`, `SheetHeader`, `SheetTitle` de `@/components/ui/sheet`; `MenuItemDTO`; `formatPriceBRL`.
- Produz: `<MenuDetails item={MenuItemDTO | null} onFechar={() => void} />`

**A API local, já conferida:** `Sheet` é `SheetPrimitive.Root.Props` do Base UI — controla-se com `open` e `onOpenChange`. `SheetContent` aceita `side` em `top | right | bottom | left` e `showCloseButton`, com padrão `true`.

**E uma armadilha, também já conferida:** `SheetContent` traz `bg-popover text-popover-foreground` embutido — cores do **painel**, não do tema do restaurante. Pior: ele renderiza dentro de `SheetPortal`, no fim do `body`, **fora** da árvore do `.menu`, então não herda nenhuma variável do tema. Somadas, as duas dariam uma folha com a cara do painel dentro do cardápio do cliente.

**A saída reaproveita o mecanismo que a rota já usa.** A folha de estilo embutida em `(site)/[slug]/page.tsx` declara as variáveis no seletor `[data-menu="<preset>"]`, e não numa classe — justamente porque `style` no elemento não expressa media query, e a face escura depende de uma. Basta o `SheetContent` carregar o mesmo `data-menu` para a regra alcançá-lo onde quer que o portal o coloque, **com a face escura junto**. Por isso `MenuDetails` recebe `presetId`.

- [ ] **Passo 1: escrever a folha**

Criar `src/components/cardapio-publico/menu-details.tsx`:

```tsx
'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { MenuItemDTO } from '@/domain/menu'
import { formatPriceBRL } from '@/lib/format'

// A descrição inteira e as variações moram aqui, e não sobre a foto. Texto
// longo empurrando a mídia é o que transforma um feed numa página comprida
// com imagem em cima.
export function MenuDetails({
  item,
  presetId,
  onFechar,
}: {
  item: MenuItemDTO | null
  /** O mesmo `data-menu` da rota. Sem ele o portal sai com a cor do painel. */
  presetId: string
  onFechar: () => void
}) {
  return (
    <Sheet open={item !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent
        side="bottom"
        // `data-menu` faz a folha de estilo embutida da rota alcançar este
        // elemento, que o portal põe fora da árvore do `.menu` — e traz a
        // face escura junto, porque a regra vive numa media query.
        //
        // `background` e `color` explícitos porque o SheetContent embute
        // `bg-popover text-popover-foreground`, que são cores do painel.
        data-menu={presetId}
        className="menu max-h-[85dvh] overflow-y-auto"
        style={{ background: 'var(--m-base)', color: 'var(--m-ink)' }}
      >
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle className="menu-display text-[1.25rem] font-semibold">
                {item.name}
              </SheetTitle>
              {item.description ? (
                <SheetDescription
                  className="text-[0.9375rem] leading-relaxed"
                  style={{ color: 'var(--m-muted)' }}
                >
                  {item.description}
                </SheetDescription>
              ) : null}
            </SheetHeader>

            {item.variants.length > 0 ? (
              <ul
                className="menu-line mt-6 divide-y"
                style={{ borderColor: 'var(--m-line)' }}
              >
                {item.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <span style={{ color: 'var(--m-ink)' }}>
                      {variant.name}
                      {variant.isAvailable ? null : (
                        <span
                          className="ml-2 text-[0.8125rem]"
                          style={{ color: 'var(--m-muted)' }}
                        >
                          esgotado
                        </span>
                      )}
                    </span>
                    <span className="menu-accent shrink-0 font-semibold">
                      {formatPriceBRL(variant.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="menu-accent mt-6 text-[1.125rem] font-semibold">
                {formatPriceBRL(item.basePriceCents)}
              </p>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Passo 2: ligar a folha no feed**

Em `src/components/cardapio-publico/menu-feed.tsx`, acrescentar o import que a Tarefa 15 deliberadamente deixou de fora:

```tsx
import { MenuDetails } from './menu-details'
```

E trocar o comentário `{/* A folha entra aqui na Tarefa 16. */}` por:

```tsx
      <MenuDetails
        item={detalhes}
        presetId={presetId}
        onFechar={() => setDetalhes(null)}
      />
```

`presetId` ainda não chega ao `MenuFeed`. Acrescentar à assinatura dele:

```tsx
export function MenuFeed({
  menu,
  presetId,
}: {
  menu: PublicMenuDTO
  presetId: string
}) {
```

E, em `src/app/(site)/[slug]/page.tsx`, passar o valor que a rota já tem em mãos:

```tsx
        <MenuFeed menu={menu} presetId={theme.presetId} />
```

- [ ] **Passo 3: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 4: conferir no navegador**

1. Tocar em "ver mais" num prato com descrição longa → a folha abre por baixo, com o texto inteiro.
2. Num prato com variações → a lista aparece com os preços, e o rodapé continua mostrando "a partir de".
3. As cores da folha são as do **tema do restaurante**, não as do painel — conferir nas **duas** faces, emulando `prefers-color-scheme`. Se saírem erradas, o `data-menu` não está no `SheetContent`.
4. Fechar a folha → volta ao feed, na mesma coluna e na mesma mídia.

Anexar captura de 1, 2 e 3 na face escura.

- [ ] **Passo 5: relatar**

Arquivos alterados: `src/components/cardapio-publico/menu-details.tsx` (novo), `src/components/cardapio-publico/menu-feed.tsx`, `src/app/(site)/[slug]/page.tsx`. Nada de git.

---

## Tarefa 17: Rede — só a vizinhança, e nada tocando sozinho

**Arquivos:**
- Modificar: `src/components/cardapio-publico/menu-dish.tsx`
- Modificar: `src/components/cardapio-publico/menu-media.tsx`
- Modificar: `src/components/cardapio-publico/menu-feed.tsx`

**O que esta tarefa paga:** o feed é a coisa mais pesada que este app já serviu, e o `domain/media.ts` já decidiu que dados móveis numa mesa são caros. Sem esta tarefa, abrir um cardápio de quarenta pratos baixa quarenta imagens de tela cheia.

**Interfaces:**
- Produz: `<MenuDish ... vizinha={boolean} />` e `<MenuMedia ... vizinha={boolean} />`

- [ ] **Passo 1: a coluna sabe se está por perto**

Em `menu-feed.tsx`, passar para cada `MenuDish`:

```tsx
            // A coluna atual e uma de cada lado. Fora disso, a mídia não é
            // buscada: quarenta pratos seriam quarenta imagens de tela
            // cheia numa rede de restaurante.
            vizinha={Math.abs(indice + 1 - indiceAtual) <= 1}
```

- [ ] **Passo 2: a coluna repassa para as telas**

Em `menu-dish.tsx`, a prop `vizinha: boolean` entra na assinatura e desce:

```tsx
          <MenuMedia
            key={media.storagePath}
            media={media}
            prioridade={primeira && indice === 0}
            ativa={vizinha && indice === telaAtiva}
            // A tela atual e uma de cada lado, DENTRO de uma coluna que já
            // é vizinha. As duas condições multiplicam.
            vizinha={vizinha && Math.abs(indice - telaAtiva) <= 1}
          />
```

- [ ] **Passo 3: a tela só busca quando é vizinha**

Em `menu-media.tsx`, a prop entra e comanda as duas mídias:

```tsx
  // `saveData` e rede lenta desligam o autoplay e zeram a pré-carga. O
  // navegador nem sempre expõe isso, então o encadeamento opcional é a
  // forma correta de ler.
  const conexao = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  const redeApertada =
    conexao?.saveData === true ||
    conexao?.effectiveType === 'slow-2g' ||
    conexao?.effectiveType === '2g'
```

No vídeo, trocar `preload` e a condição de tocar:

```tsx
          preload={vizinha && !redeApertada ? 'metadata' : 'none'}
```

```tsx
    if (ativa && !redeApertada && !reduzido) {
      void el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
```

Onde `reduzido` vem de:

```tsx
  // Autoplay é movimento. Quem pediu menos movimento recebe o poster e um
  // botão de tocar, não um vídeo rodando sozinho.
  const reduzido =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

E acrescentar `controls={reduzido || redeApertada}`, para quem não recebe autoplay ainda poder assistir se quiser.

Na imagem, só renderizar o `<Image>` quando `vizinha || prioridade`; caso contrário, um retângulo do tema:

```tsx
  if (!vizinha && !prioridade) {
    return (
      <div
        className="menu-screen"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(160deg, color-mix(in oklab, var(--m-accent) 22%, var(--m-base)), var(--m-base))',
        }}
      />
    )
  }
```

O placeholder é do **tema**, e não um cinza: um cinza diria "quebrou"; isto diz "está vindo".

- [ ] **Passo 4: conferir o código**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Passo 5: provar no navegador**

Com o painel de rede aberto, em `localhost:<porta>/<slug>`:

1. Ao abrir, contar as requisições de imagem. Esperado: a capa e a primeira mídia do primeiro prato, **não** o cardápio inteiro.
2. Deslizar dois pratos e contar de novo: as requisições aparecem conforme a vizinhança avança.
3. Emular rede lenta (3G) e recarregar: o vídeo **não** toca sozinho e mostra controles.
4. Ligar `prefers-reduced-motion` na emulação e recarregar: o vídeo não toca sozinho; o snap continua funcionando.

Anexar a aba de rede dos itens 1 e 2.

- [ ] **Passo 6: relatar**

Arquivos alterados: `menu-feed.tsx`, `menu-dish.tsx`, `menu-media.tsx`. Anexar a contagem de requisições antes e depois. Nada de git.

---

## Tarefa 18: A limpeza

**Arquivos:**
- Remover: `src/components/cardapio-publico/menu-header.tsx`, `menu-category.tsx`, `menu-item.tsx`
- Modificar: `src/domain/theme.ts`, `src/lib/theme/presets.ts`

**Só depois de o feed estar de pé e verificado.** Remover antes deixa o cardápio no ar sem substituto se alguma tarefa precisar voltar atrás.

- [ ] **Passo 1: confirmar que ninguém mais importa os três**

```bash
grep -rn "menu-header\|menu-category\|menu-item'" src/
```

Esperado: nenhuma linha fora dos próprios arquivos.

- [ ] **Passo 2: remover os três arquivos**

- [ ] **Passo 3: tirar `layout` do contrato de tema**

Em `src/domain/theme.ts`, remover do tipo `ThemePreset`:

```ts
  /** Como o item se apresenta. `cartao` é o único em que ele é um objeto. */
  layout: 'foto-grande' | 'foto-pequena' | 'sem-foto' | 'cartao'
```

Em `src/lib/theme/presets.ts`, remover a linha `layout: '...'` dos **oito** presets.

`density` **fica**: ela sobrevive como ritmo tipográfico da capa e do rodapé, e a coluna `theme` no banco continua guardando o valor.

- [ ] **Passo 4: conferir**

```bash
pnpm exec tsc --noEmit
```

Esperado: **sem saída**. É aqui que os erros anotados desde a Tarefa 2 finalmente zeram.

- [ ] **Passo 5: rodar o guarda de contraste de novo**

```bash
pnpm exec tsx scripts/verificar-contraste.ts
```

Esperado: `TODOS OS TOKENS DENTRO DA REGRA`. Tirar `layout` não podia mexer em cor; este passo prova.

- [ ] **Passo 6: construir**

```bash
pnpm build
```

Esperado: build limpo, com `/[slug]` dinâmica.

- [ ] **Passo 7: relatar**

Arquivos removidos: três. Alterados: `src/domain/theme.ts`, `src/lib/theme/presets.ts`. Nada de git.

---

## Tarefa 19: Verificação de ponta a ponta

Não escreve código. Existe porque as fases anteriores mostraram que o que não é conferido explicitamente não foi conferido.

- [ ] **Passo 1: código e guarda**

```bash
pnpm exec tsc --noEmit
```

```bash
pnpm exec tsx scripts/verificar-contraste.ts
```

```bash
pnpm build
```

Os três limpos. Colar a saída do guarda no relatório.

- [ ] **Passo 2: nenhum resquício**

```bash
grep -rn "revalidatePath('/')\|render={<Link\|data-layout" src/
```

Esperado: nenhuma linha.

- [ ] **Passo 3: os oito temas, nas duas faces**

Em viewport de celular (375×812), num restaurante com ao menos duas categorias, um prato com três mídias, um prato com variações e um prato esgotado. Para **cada um dos oito temas**, na face clara e na escura (emulação de `prefers-color-scheme`):

| O que conferir | Como sei que passou |
|---|---|
| Nome da categoria no trilho | legível; o chip ativo tem texto legível sobre o destaque |
| Preço no rodapé | legível sobre a foto, em qualquer foto |
| Fio da folha de detalhes | visível, e mais leve que o texto |
| Logo na capa | inteiro, não recortado, não escondido |
| Esgotado | a palavra aparece escrita |
| Contador `N / M` | acompanha o deslize |

São dezesseis passagens. Anexar captura de **pelo menos** Brasa escuro, Sal escuro (o tema que estava quebrado) e Confeito claro.

- [ ] **Passo 4: o ciclo do dono**

1. Entrar no painel → cai em `/restaurantes`, **não** na página do "Aproxime o celular".
2. Criar um item sem mídia → publicar é recusado, com a contagem.
3. Enviar foto, marcar o ponto focal, reordenar → publicar passa.
4. Abrir o cardápio público → o prato aparece, enquadrado no ponto marcado.
5. Trocar o nome do prato no painel → recarregar o cardápio público mostra o nome novo.
6. Apagar a última mídia de um prato → ele some do cardápio público e ganha "Sem foto" no painel.

- [ ] **Passo 5: rede e acessibilidade**

1. Rede 3G emulada: o cardápio abre e é navegável; vídeo não toca sozinho.
2. `prefers-reduced-motion`: o snap funciona, nada toca sozinho.
3. Só teclado: setas percorrem os pratos; `Tab` alcança o trilho e os atalhos de contato; a folha abre e fecha.
4. Console do navegador limpo: nenhum erro do Base UI, nenhum aviso de hidratação.

- [ ] **Passo 6: relatar o fechamento**

Uma tabela de tarefa por tarefa com a situação, as capturas anexadas, e **as pendências que ficaram** — entre elas a do `http://` do link do painel em produção (Tarefa 7) e a aplicação da `0014` se ela tiver ido junto na Tarefa 8. Nada de git: listar os arquivos alterados na fase inteira.
