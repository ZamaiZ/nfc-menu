# Fase 5 — Pipeline de mídia e repaginação do painel: desenho

Data: 2026-09-19

## 1. O que esta fase muda

Quatro frentes, e a terceira é a maior:

1. **O envio de mídia deixa de ser imediato.** Os arquivos ficam locais, em blob, e só sobem quando o dono confirma. No caminho, são comprimidos.
2. **O trilho do cardápio público vira colapsável.** Ele abre fechado, expande com escalonamento, e para de fatiar os chips numa borda reta.
3. **O painel e o console são repaginados.** Uma linguagem visual só, construída sobre os primitivos que já existem no repositório e nunca foram usados.
4. **Os atalhos de contato ganham ícone.**

O que provocou a fase: o produto virou um feed de fotos na Fase 4, e o painel onde essas fotos entram continuou sendo um botão de enviar arquivo e uma lista sem miniatura. O dono edita o cardápio sem ver o que o cliente vê.

### 1.1 O achado que reenquadra a frente 3

Varredura dos 60 primitivos em `src/components/ui/`: **42 nunca são importados por nenhuma tela.** Entre eles, exatamente os que resolvem o que foi pedido.

| Primitivo sem uso | O que o painel faz hoje no lugar dele |
|---|---|
| `card` | cada superfície montada à mão: `rounded-xl border border-border bg-surface-2 p-4` |
| `sidebar` | duas barras horizontais empilhadas, `TopBar` + `TerritoryNav` |
| `progress` | nada: não existe progresso em lugar nenhum do produto |
| `attachment` | um botão de arquivo |
| `separator`, `avatar`, `tooltip`, `alert` | div solta, inicial em `span`, nada, parágrafo vermelho |
| `drawer`, `scroll-area`, `breadcrumb`, `collapsible` | não existem no painel |

**O painel não parece caro porque cada superfície foi desenhada de novo, à mão, com números ligeiramente diferentes.** Não é falta de direção visual: é falta de reuso. A repaginação começa por adotar o que já está pago.

## 2. Decisões tomadas, e por quê

| # | Decisão | Razão |
|---|---|---|
| 1 | Mídia fica em **blob** e só sobe ao confirmar | Subir na hora grava arquivo de quem desistiu do item, e impede anexar mídia ao CRIAR um item — hoje isso é impossível. |
| 2 | Teto único de **6 telas por prato**, qualquer mistura | O dono não pensa em "tipo", pensa em "quantas telas tem meu prato". Uma regra, uma mensagem de recusa. |
| 3 | O teto de 10MB passa a valer sobre o arquivo **comprimido** | Recusar um vídeo de 40MB que comprimiria para 3MB desperdiça justamente a compressão que esta fase constrói. |
| 4 | Compressão por **WebCodecs**, não ffmpeg.wasm | A CSP é `script-src 'self' 'unsafe-inline'`, sem `'wasm-unsafe-eval'`. E são ~25MB de download num painel que o dono abre do celular. WebCodecs foi medido disponível, com H.264 e VP9. |
| 5 | O **áudio é descartado** na compressão | O feed nunca toca som — `muted` é regra desde a Fase 2. O áudio que sobe hoje já nasce inaudível. **Irreversível**, e aceito com isso declarado. |
| 6 | Sem WebCodecs, **sobe o original** | Ninguém fica impedido de enviar por causa de navegador velho. O teto de 10MB continua protegendo. |
| 7 | `width` e `height` passam a ser **gravados** | As colunas existem e estão sempre nulas. A compressão já conhece as dimensões; gravá-las tira a decisão de enquadramento do `onLoad` e acaba com a troca de enquadramento depois do carregamento. |
| 8 | O trilho abre **colapsado** | Aberto, ele ocupa a faixa inteira sobre a foto e fatia o último chip numa borda reta. |
| 9 | "Voltar para a capa" vira o **primeiro chip**, não uma seta | A seta só aparecia fora da capa, então a função não existia na primeira tela. Como item da lista, ela existe sempre. |
| 10 | Escalonamento do trilho em **CSS puro**, sem `motion` | O cardápio carrega no celular de um cliente numa rede de restaurante. A Fase 4 já tirou o `Stagger` dessa rota pelo mesmo motivo. |
| 11 | **Console entra junto** na repaginação | Uma linguagem visual só no produto privado. Ele continua mais sóbrio pelo conteúdo, não por ter outra casca. |
| 12 | A serifada volta a ser **só do título de página** | Reverte decisão da Fase 3A. A intenção era coesão; o efeito foi banalizar a face — quando todo título é serifado, nenhum tem peso. |
| 13 | **Menos borda, mais superfície** | Fio de 1px em tudo achata: nada parece estar acima de nada. Elevação separa; o fio fica só entre conteúdos de mesmo peso. |
| 14 | `sidebar` nos dois tamanhos; `drawer` não entra | Tira a sensação de formulário solto numa página. E o primitivo existe completo, sem uso — inclusive com o caminho de celular já resolvido por dentro. |
| 15 | **Nenhuma migração** nesta fase | Todos os limites são de código, e as colunas que passam a ser preenchidas já existem. |

## 3. O pipeline de mídia

### 3.1 Staging em blob

O editor passa a ter duas listas: as mídias **gravadas** (do servidor) e as **pendentes** (locais).

```
MidiaPendente = {
  idLocal: string          // uuid do navegador, não do banco
  arquivo: File
  previewUrl: string       // URL.createObjectURL
  kind: 'image' | 'video'
  estado: 'pendente' | 'comprimindo' | 'enviando' | 'erro' | 'pronta'
  progresso: number        // 0–100
  erro?: string
  // preenchidos pela compressão, usados no registro
  comprimido?: Blob
  largura?: number
  altura?: number
  duracaoMs?: number
  posterBlob?: Blob        // só vídeo
}
```

A ordem é **única entre as duas listas** — pendentes entram no fim e podem ser reordenadas antes de subir.

**A confirmação é o "Salvar item" que o diálogo já tem.** Não entra botão novo. Ao confirmar, para cada pendente em ordem: comprime, sobe, registra. Progresso por arquivo, com compressão e envio como etapas distintas.

**Falha é isolada.** Se uma mídia falha, as outras seguem; a que falhou continua pendente com o motivo, e há "tentar de novo" sem refazer o resto.

**Fechar o diálogo com pendentes pede confirmação.** Sem isso o dono perde arquivo achando que salvou.

`URL.revokeObjectURL` ao remover e ao desmontar. Um dono que troca dez fotos numa sessão seguraria dez blobs na memória do celular.

### 3.2 Criar item já com mídia

Hoje é impossível, e não por esquecimento: `registerItemMedia` exige um `itemId` que ainda não existe, e por isso `item-create-dialog.tsx` não tem editor de mídia.

Com staging o problema some: `MediaEditor` passa a aceitar `itemId: string | null`. O `ItemCreateDialog` monta o editor em modo "sem id", e ao salvar cria o item, recebe o id e só então sobe as pendentes.

### 3.3 Compressão de imagem

Canvas → **WebP, qualidade 0.86**, redimensionado para no máximo **1920px no maior lado**, proporção preservada, sem ampliar o que já é menor.

**Se o resultado sair maior que o original, mantém o original.** Acontece com PNG pequeno e com foto já otimizada, e comprimir para piorar é o defeito clássico desse tipo de código.

O `toBlob` com `'image/webp'` é um **pedido, não uma promessa** — Safari antigo devolve PNG calado. Quem chama lê `blob.type`, que é o que `captureVideoPoster` já faz desde a Fase 2.

### 3.4 Compressão de vídeo

**Correção do que eu disse no desenho falado:** não é uma dependência, são **duas**. WebCodecs decodifica e codifica **amostras**, não arquivos. Para ler o arquivo de entrada é preciso um demultiplexador, e para escrever o de saída, um multiplexador.

```
arquivo → mp4box.js (demux) → VideoDecoder → redimensiona
        → VideoEncoder (H.264) → mp4-muxer (mux) → Blob .mp4
```

- **`mp4box.js`** demultiplexa a entrada. Só MP4/MOV — que é o que celular grava. **Entrada WebM cai no fallback** e sobe original.
- **`mp4-muxer`** escreve a saída. MP4 com H.264, e não WebM/VP9, porque WebM no iOS é irregular e MP4/H.264 toca em tudo.
- Ambos são JavaScript puro, sem wasm — compatíveis com a CSP.

**Parâmetros:** maior lado no máximo **1280px**, bitrate alvo **2,5 Mbps**, quadro-chave a cada 2s. Sem ampliar o que já é menor.

**O áudio é descartado.** §2.5.

**Caminho descartado:** capturar quadros de um `<video>` tocando com `playbackRate` alto, o que dispensaria o demultiplexador. Fica preso à velocidade de reprodução e **perde quadros** quando o decodificador não acompanha — exatamente o oposto de "mínima perda de qualidade".

**Este é o item de maior risco da fase**, e é o primeiro a ser cortado se o prazo apertar. §12.

### 3.5 Fallback

Sem `VideoEncoder`, ou com entrada que o demultiplexador não lê, o arquivo **sobe original**. O teto de 10MB continua valendo e passa a ser a única proteção. A interface diz que não foi possível comprimir; não esconde.

### 3.6 Os limites

| Regra | Antes | Agora |
|---|---|---|
| Por prato | 4 imagens + 1 vídeo, contados à parte | **6 telas**, qualquer mistura |
| Peso do vídeo | 10MB, sobre o original | 10MB, sobre o **comprimido** |
| Peso da imagem | 5MB | 5MB, sobre a **comprimida** |
| Duração | 15s | 15s, inalterado |
| Envio | um input para foto, outro para vídeo | **um só**, aceita os dois juntos |

`MEDIA_LIMITS.image.maxPerItem` e `.video.maxPerItem` são substituídos por `MAX_MIDIAS_POR_ITEM = 6`. **Itens que já têm mais que isso continuam válidos** — o teto é conferido só ao inserir, e nada é apagado.

### 3.7 A interface de envio

`attachment.tsx` vira a unidade visual de cada arquivo: miniatura, nome, tamanho, estado e remover. `AttachmentGroup` na faixa rolável.

**Ele depende de três classes que não existem no projeto** — `shimmer`, `scroll-fade-x` e `scrollbar-none`. As três entram no `globals.css` nesta fase. Sem elas, o estado de "enviando" não anima e a faixa mostra barra de rolagem.

A área de envio vira **dropzone**: arrastar e soltar, colar do clipboard, e clicar. Com estado visível de "solte aqui".

### 3.8 Logo e capa entram junto

`brand-images.tsx` usa o caminho antigo de upload imediato. Deixá-lo de fora daria duas experiências de envio no mesmo painel — e **a capa é a imagem mais pesada do sistema**, a que mais ganha com compressão. Adota o mesmo dropzone e a mesma compressão.

**Mas NÃO adota o staging.** Logo e capa continuam gravando sozinhas, na hora do envio, como a Fase 3 decidiu: envio de arquivo já é uma confirmação por si, e amarrá-lo a um botão de salvar criaria um estado em que o arquivo está no storage e o banco ainda não sabe dele. O que elas ganham é a área de envio e a compressão; o momento de gravar não muda.

Isso é uma diferença deliberada entre as duas telas, e o motivo é a diferença real: mídia de item pertence a um item que **pode não existir ainda**; logo e capa pertencem a um restaurante que **sempre existe**.

### 3.9 `width` e `height` param de ser nulos

A compressão conhece as dimensões finais. Gravá-las permite `menu-media.tsx` decidir sangria ou moldura **antes** de a imagem carregar, o que elimina a troca de enquadramento que a Fase 4 aceitou como limitação. Linhas antigas continuam com nulo e caem no `onLoad`, que fica como reserva.

## 4. O trilho colapsável

**Abre colapsado:** uma pílula à esquerda, com ícone e o nome da categoria atual — ou "Cardápio", na capa. Ela informa; não é um hambúrguer mudo.

**Ao tocar, expande:** a pílula vira fechar, e os chips entram **um a um** à direita, 40ms de atraso cada, deslizando 8px enquanto aparecem. O **primeiro chip é "Início"**, que volta para a capa.

Isso resolve os três defeitos de uma vez: a função de voltar passa a existir desde a primeira tela; nada fica sempre ocupando a faixa sobre a foto; e o último chip deixa de ser fatiado.

**A borda que corta some:** o rolador ganha `mask-image` com esmaecimento nas duas pontas. O chip se dissolve em vez de ser cortado por uma linha reta — e isso avisa que há mais para o lado, coisa que uma borda dura não diz.

**Fecha sozinho** ao escolher categoria e ao deslizar para outro prato.

**Sem biblioteca de animação.** CSS puro, `transition-delay` por índice, atrás de `prefers-reduced-motion`.

## 5. Os atalhos de contato

WhatsApp, Instagram e Telefone ganham ícone ao lado do rótulo, do `react-icons/ri` que o projeto já usa. Todos abrem em `_blank`.

Registrado: `target="_blank"` num `tel:` não faz nada de útil. Fica por consistência, a pedido.

Os mesmos ícones vão para os campos da tela de Contato no painel, para o dono reconhecer o que está preenchendo.

## 6. A linguagem visual

### 6.1 As três regras

**Menos borda, mais superfície.** Fio de 1px em tudo achata. Elevação — superfície mais sombra curta — separa; o fio fica **só** entre conteúdos de mesmo peso, como linhas de uma lista. É a mudança que mais altera a percepção e não custa uma cor nova.

**Um acento, usado pouco.** O teal fica, mas recua: marca **estado** — aba ativa, foco, publicado — e nada mais. Ação secundária vira neutra. Cor que aparece em tudo para de significar alguma coisa.

**Display raro e grande.** Serifada **só no título de página**. Reverte a decisão da Fase 3A de levá-la a `Card`, `Dialog`, `Sheet` e `Empty` via `--font-heading`.

### 6.2 O que muda nos tokens

Entra uma **escala de espaço declarada** (`--space-*`, base 4px), no lugar de números soltos por tela, e uma **curva de movimento única** — a expo-out que o `Reveal` já usa.

**Os tokens de cor e a escala tipográfica da Fase 3A ficam.** Eles estão bons, e o guarda de contraste do cardápio depende dos de cor. O que muda é ritmo, elevação e a face de título.

`--heading-face` deixa de apontar para a serifada em `.territorio-painel`. A serifada passa a ser pedida explicitamente por quem a quer, que é o título de página.

**Duas consequências que o plano não pode deixar passar**, porque são o efeito colateral direto dessa troca:

- `AuthShell` usa `font-heading` no título de "Entrar" e de "Convite". Esses **são** títulos de página, e precisam passar a pedir a serifada explicitamente — senão a tela de entrada, que é a primeira coisa que o dono vê, perde a face junto com os cartões.
- Todo `CardTitle`, `DialogTitle`, `SheetTitle` e `EmptyTitle` do painel passam a Inter de uma vez, sem nenhum arquivo deles ser tocado. É o efeito desejado, mas precisa ser **conferido tela a tela**: é a mudança de maior alcance visual da fase, e a que mais facilmente passa despercebida numa tela que ninguém abriu.

### 6.3 O shell

`sidebar` no desktop e no celular, para os dois territórios. **O primitivo já trata o celular sozinho**: `sidebar.tsx` usa `useIsMobile` e cai num `Sheet` internamente, então `drawer` não entra — uma peça a menos para manter. O topo perde a navegação e fica com contexto (`breadcrumb`) e as ações da tela. `TopBar` e `TerritoryNav`, como são hoje, saem.

## 7. As telas

| Tela | O que ela vira |
|---|---|
| **Cardápio** `/restaurantes/[id]` | A que mais muda. §7.1 |
| **Lista de restaurantes** (painel) | De `Item` empilhado e só texto, para grade de cards com miniatura da capa, logo, nome, endereço público e situação |
| **Identidade** | Herda a casca; mantém a pré-visualização dupla da Fase 4; ganha o dropzone novo |
| **Contato** | Campos agrupados por assunto, com os ícones da §5 |
| **Equipe** | Linhas com `avatar`, papel em `badge`, ações ao fim |
| **Começar** | "Passo 2 de 3" em texto vira `progress` |
| **Convites** (console) | Link copiável com retorno visível — hoje ele aparece uma vez e não há confirmação de cópia |
| **Restaurantes** (console) | Tabela mantida, com densidade e badges consistentes |
| **Entrar / Convite** | `AuthShell` ganha a marca e deixa de ser formulário solto no escuro |

### 7.1 A tela do cardápio

**A linha do item passa a mostrar a foto.** Hoje `ItemRow` não exibe mídia nenhuma. Num produto que virou feed de fotos, o dono edita **sem ver o que o cliente vê**. A miniatura da primeira mídia entra na linha, e a marca "Sem foto" criada na Fase 4 ocupa o lugar quando falta.

**A faixa de publicação vira card de estado.** Passa a dizer o que falta para publicar — a contagem de itens sem mídia já está ligada ao botão desde a Fase 4 — e a mostrar o endereço público copiável.

**Categoria vira seção com cabeçalho próprio**, contagem de itens e ações agrupadas, no lugar de borda solta.

## 8. Estados, esqueletos e fluidez

**Esqueletos que espelham o layout.** Os três `loading.tsx` de hoje são retângulos genéricos sem relação com a tela que carregam, e o efeito é um salto quando o conteúdo chega. Cada rota ganha o seu, com a mesma grade do conteúdo real.

**Progresso onde havia silêncio.** `progress` no upload — compressão e envio como etapas — e no assistente.

**Optimistic onde o servidor confirma depois.** `item-row` já usa `useOptimistic` nos interruptores; o padrão se estende a publicar e a papel de membro.

**Erro que se recupera.** `alert` no lugar dos parágrafos vermelhos soltos, com ação de tentar de novo onde faz sentido.

**Uma curva só:** 160–220ms na entrada, 120ms na troca de estado, tudo atrás de `prefers-reduced-motion`.

## 9. Dependências novas

| Pacote | Para quê | Peso | Risco |
|---|---|---|---|
| `mp4box.js` | demultiplexar o vídeo de entrada | ~90KB | JS puro, compatível com a CSP. Só lê MP4/MOV |
| `mp4-muxer` | escrever o MP4 de saída | ~20KB | JS puro, sem wasm |

**Os dois são carregados sob demanda, por `import()` dinâmico, no momento em que um VÍDEO é escolhido** — não quando a tela abre, não quando uma foto é escolhida. Quem nunca envia vídeo nunca baixa os 110KB. A compressão de imagem não depende de nenhum dos dois: é canvas, que o navegador já tem.

## 10. Migrações

**Nenhuma.** Todos os limites vivem no código, e `width`/`height`/`focal_x`/`focal_y` já existem. É a primeira fase do projeto sem tocar no banco.

## 11. Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Fechar o diálogo com mídia pendente | Pede confirmação, dizendo quantas se perderiam |
| Uma mídia falha no envio, as outras não | As outras seguem; a que falhou fica pendente com o motivo e opção de repetir |
| Compressão falha ou não há WebCodecs | Sobe o original, com aviso visível. Não silencia |
| Vídeo comprimido ainda acima de 10MB | Recusado, dizendo o tamanho final — o dono não tem como adivinhar |
| Entrada WebM | Sobe original: o demultiplexador só lê MP4/MOV |
| Arquivo que não é imagem nem vídeo | Recusado no dropzone, antes de qualquer processamento |
| Item chega a 6 telas | O dropzone desabilita e diz o teto |
| Item antigo com 6 imagens mais vídeo | Continua válido. O teto vale ao inserir |
| Criar item que falha depois de mídia comprimida | O item não nasce; as pendentes continuam pendentes e nada subiu |
| `toBlob` devolve PNG em vez de WebP | Quem chama lê `blob.type`. Regra que já existe desde a Fase 2 |
| Compressão maior que o original | Mantém o original |
| Trilho com uma categoria só | Expande igual. Uma categoria ainda precisa do "Início" ao lado |

## 12. O que esta fase não inclui

- **Áudio nos vídeos.** Descartado por decisão, §2.5.
- **Edição de imagem** além do ponto focal que a Fase 4 criou: nada de recorte, giro ou filtro.
- **Reprocessar o acervo existente.** As mídias já no storage continuam como estão; a compressão vale do envio novo em diante.
- **Cache Components.** Continua fora, herdado da Fase 4.
- **Busca no painel.** Nenhuma lista chegou ao tamanho que a justifica.
- **Tema claro/escuro do painel** além do que já existe. O `ThemeToggle` continua como está.

**A ordem de corte, se o prazo apertar**, nesta sequência:

1. **A compressão de vídeo** (§3.4). É o item de maior risco e o de maior superfície nova. Sem ela, o fallback da §3.5 vira o comportamento normal e o teto de 10MB segue protegendo. Tudo o mais da frente de mídia continua de pé.
2. **O console** (§2.11). O painel sozinho já entrega o pedido; o console fica declarado como pendência.
3. **Nada mais.** Staging, dropzone, trilho colapsável e a repaginação do painel são o corpo da fase — entregar metade deles é pior que não começar.

## 13. Verificação

No padrão das fases anteriores:

- **Código:** `pnpm exec tsc --noEmit` limpo. Lint não é portão.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **`scripts/verificar-contraste.ts` continua verde.** Esta fase não mexe nos tokens de cor do cardápio, e o guarda prova isso.
- **Prova de compressão, medida e relatada:** para uma foto e um vídeo reais, o tamanho antes e depois, e as dimensões de saída. Comprimir sem medir não é comprimir, é torcer.
- **Prova do fallback:** desligar `VideoEncoder` no navegador e confirmar que o vídeo sobe original com o aviso.
- **Prova do staging:** escolher três arquivos, fechar o diálogo sem salvar, reabrir e confirmar que **nada subiu**; depois salvar e confirmar que os três aparecem no cardápio público na ordem escolhida.
- **Prova do criar-com-mídia:** criar um item já com foto, e confirmar que ele nasce com ela.
- **Roteiro no navegador** das 17 telas, em celular e em desktop, nas faces clara e escura.
- **Roteiro do trilho:** abrir colapsado, expandir com escalonamento, escolher categoria, confirmar que fecha; e conferir que nenhum chip é cortado por borda reta.
- **Capturas de tela** em cada tarefa que muda o visual. A conferência não é delegada para quem pediu.
- **`document.hidden` e contagem de quadros** antes de qualquer conclusão sobre animação ou rolagem no painel do navegador. A Fase 4 produziu um diagnóstico falso por não fazer isso.

## 14. Restrições herdadas

Continuam valendo, sem mudança:

- **Nada de git.** Nenhum `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados.
- **Nada de Docker.** Decisão de 2026-09-19. Não existe banco de prova local; existe o projeto na nuvem, e conferência por consulta REST.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.**
- **Composição usa `render`, nunca `asChild`** — e link não passa pelo `render` do Button.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.**
- **`@/lib/color` não importa nada de `@/server`.**
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Rotas em `href` e `redirect` são externas**; `revalidatePath` recebe o **destino**.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **Preço em centavos inteiros.**
- **Alvo de toque mínimo de 44px**, e cor nunca como único portador de significado.
