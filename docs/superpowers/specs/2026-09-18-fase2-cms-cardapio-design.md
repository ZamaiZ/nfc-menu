# Fase 2 — CMS do cardápio

Data: 2026-09-18
Status: aprovado, pronto para plano de implementação

## 1. Contexto

A Fase 0 entregou a fundação e a Fase 1 fechou o primeiro ciclo: criar restaurante, mandar convite, a pessoa entrar. Hoje quem aceita um convite chega numa raiz do painel que lista o restaurante e diz que a edição vem depois. Esta fase é esse "depois".

**A camada de dados já existe inteira.** `src/server/dal/menu.ts` traz as catorze funções de categoria, item e variação; `src/server/dal/media.ts` traz `buildUploadPath`, `registerItemMedia` e `deleteItemMedia`; e `src/server/actions/menu.ts` já expõe tudo como server action. Nada disso precisa ser escrito de novo.

Esta fase é, quase toda, interface.

Fundação em [`2026-09-18-fundacao-nfc-menu-design.md`](2026-09-18-fundacao-nfc-menu-design.md); console em [`2026-09-18-fase1-console-admin-design.md`](2026-09-18-fase1-console-admin-design.md). O que está lá não se repete aqui.

## 2. Escopo

**Dentro:**

- Tela do cardápio no território `painel.`: categorias, itens e variações, tudo numa página.
- Criar, editar, ocultar, excluir e reordenar categorias e itens.
- Alternar disponibilidade de um item em um toque, pensado para o celular.
- Mídia por item: até seis imagens e no máximo um vídeo, com upload direto e assinado.
- Captura automática da imagem de capa do vídeo, com degradação quando falhar.
- Uma migration: `poster_path` em `menu_item_media`.

**Fora:**

- Cardápio público com design — é a Fase 3. Esta fase só produz o conteúdo que ele vai exibir.
- Plaquinhas e QR code no console do administrador.
- Complementos e grupos de escolha (adicionais, obrigatórios, mínimo e máximo). O schema foi projetado para recebê-los, mas eles não entram aqui.
- Papel `manager`. Continua existindo no enum, sem política e sem interface.
- Testes automatizados — decisão do cliente, mantida.

## 3. Decisões e justificativas

| # | Decisão | Por quê |
|---|---|---|
| C1 | Uma página, com itens aninhados nas categorias | É como o cardápio se lê de verdade. No celular vira uma lista rolável onde marcar esgotado é um toque, sem navegar |
| C2 | Reordenar com setas de subir e descer | Zero dependência nova, funciona por teclado e por leitor de tela, e não briga com o rolamento no celular — problema clássico do arrastar |
| C3 | Imagem e vídeo já nesta fase | Escolha do cliente. O bucket, os limites e a DAL já existem desde a Fase 0 |
| C4 | Rota `/restaurantes/{id}`, com atalho quando há apenas um | Mesma forma do console, o que mantém o projeto coerente. E uma tela de escolha com um item só é um clique que não escolhe nada |
| C5 | Capa do vídeo capturada do primeiro quadro, **com degradação** | Escolha do cliente. Mas canvas não extrai quadro de todo códec: falhar em capturar não pode impedir de subir o vídeo |
| C6 | Criar pede o mínimo; editar abre o completo | Mídia precisa do id do item, que não existe antes de salvar. Separar os dois momentos resolve isso sem gambiarra |
| C7 | Upload por URL assinada, sem cliente Supabase no navegador | Mantém intacta a regra de que só `_client.ts` importa `@supabase/*`, e o arquivo não passa pela memória do nosso servidor |
| C8 | `poster_path` como coluna nova, com CHECK de prefixo | Sem CHECK, a capa escaparia da fronteira do inquilino que o `storage_path` respeita |
| C9 | Até seis imagens por item, no máximo um vídeo | Vídeo é caro em tráfego e o limite de um já estava na Fase 0. Imagem é barata, mas passando de seis a galeria deixa de ajudar a decidir e passa a atrapalhar |

## 4. Rotas e telas

Caminhos externos do território `painel.`, como o navegador os vê.

| Rota | Comportamento |
|---|---|
| `/` | Nenhum restaurante: estado vazio. **Um**: redireciona para o cardápio dele. Dois ou mais: lista para escolher |
| `/restaurantes/{id}` | A tela do cardápio |

O redirecionamento do caso "um restaurante" acontece no servidor, antes de renderizar — a pessoa nunca vê a lista piscar.

## 5. A tela do cardápio

Uma página, três níveis de profundidade visual.

**Cabeçalho:** nome do restaurante, link para o cardápio público (abre em nova aba) e botão de nova categoria.

**Cada categoria** é uma seção com o nome, a contagem de itens, setas de subir e descer, e um menu com editar, ocultar e excluir. Categoria oculta aparece esmaecida e com a palavra "Oculta" — nunca só pela opacidade.

**Cada item** é uma linha com miniatura, nome, preço, setas, menu e o **interruptor de disponibilidade**.

O interruptor é a única ação desenhada para o polegar: alvo de 44px, retorno imediato, sem diálogo de confirmação. É a ação que acontece no meio do serviço, com uma mão, e qualquer atrito nela é atrito no pior momento possível.

**Categoria vazia** mostra, no lugar da lista, o botão de adicionar o primeiro item. Sem item, uma categoria não tem razão de existir, e a tela deve dizer isso oferecendo a saída.

## 6. Fluxos

### Criar item

Diálogo curto: categoria, nome e preço. Salva e a linha aparece na lista.

Não pede descrição, variação nem mídia. Mídia exige o id do item, que ainda não existe; e pedir tudo de uma vez transforma "adicionar um prato" numa tarefa longa quando normalmente é rápida.

### Editar item

Diálogo completo, com três seções empilhadas e roláveis:

1. **Dados** — categoria, nome, descrição, preço, visível no cardápio, disponível.
2. **Variações** — lista de nome e preço, com adicionar e remover. Pizza P/M/G, chopp 300/500ml.
3. **Mídia** — imagens e vídeo, com subir e remover.

Trocar a categoria de um item é uma edição comum e vive aqui, não num fluxo de "mover" à parte.

### Reordenar

Setas de subir e descer em cada categoria e em cada item. A primeira linha não tem seta para cima, a última não tem para baixo — em vez de ter setas desabilitadas que parecem defeito.

Cada clique chama a action de reordenar com a lista inteira na nova ordem, e a tela atualiza. Reordenação é operação rara e barata; não vale otimizar.

### Disponibilidade

Um interruptor por item, chamando `setItemAvailabilityAction`. Atualização otimista: o interruptor muda na hora e reverte se a ação falhar, com aviso. No meio do serviço, esperar a ida e volta ao servidor para ver o estado mudar é inaceitável.

## 7. Mídia

### Limites, herdados da Fase 0

| Tipo | Bucket | Tamanho | Formatos |
|---|---|---|---|
| Imagem | `menu-images` | 5 MB | `jpeg`, `png`, `webp`, `avif` |
| Vídeo | `menu-videos` | 10 MB | `mp4`, `webm` |

Vídeo aceita no máximo 15 segundos, validado no navegador. O servidor não consegue conferir duração sem transcodificar — limitação já registrada na Fase 0.

Um item aceita **até seis imagens** e **no máximo um vídeo** (C9). Tentar ultrapassar qualquer um dos dois limites devolve mensagem clara em vez de silenciosamente substituir ou acumular. O teto de seis não é técnico: é o ponto em que uma galeria de prato deixa de ajudar a decidir e passa a atrapalhar.

Os dois tetos são **regra, não dica de interface**. O navegador confere para responder na hora, sem gastar rede; `registerItemMedia` confere de novo antes de gravar e recusa com mensagem própria. Um limite que existe só no navegador não é limite, é sugestão.

A mesma consulta que conta as mídias do item define a `position` da nova. Sem isso toda linha fica no `default 0`, a ordem da galeria passa a depender do que o banco devolver naquele instante, e a miniatura da linha do item — que é a primeira imagem — troca sozinha entre duas renderizações.

### Upload em três passos

1. O navegador pede uma autorização de envio a uma server action, informando o item, o tipo e o MIME.
2. A action valida o tipo, descobre o restaurante **pelo item** (nunca por um id vindo do cliente), confirma que a pessoa é membro, monta o caminho `{restaurant_id}/{item_id}/{uuid}.{ext}` e pede ao Storage uma URL assinada de envio. Devolve a URL, o caminho e o bucket.

   Isto exige **estender a DAL**: `buildUploadPath`, escrita na Fase 0, devolve apenas `{ bucket, path }` e não assina nada. Ela é substituída por `createUploadTicket`, que faz o mesmo e ainda chama `createSignedUploadUrl` do Storage, devolvendo `{ bucket, path, signedUrl }`. A checagem de posse continua onde estava; só o retorno cresce.
3. O navegador faz um `PUT` simples na URL assinada com o arquivo. Concluído, chama a action de registro, que revalida o prefixo e grava a linha.

Nenhum cliente Supabase existe no navegador: a URL assinada carrega a própria autorização, e um `fetch` basta. A regra de que só `_client.ts` importa `@supabase/*` continua valendo sem exceção.

São três checagens independentes, em camadas diferentes: a DAL confere posse em TypeScript, a RLS do storage confere no momento de assinar, e o CHECK do banco confere o prefixo ao gravar.

### Captura da capa do vídeo

Antes de subir um vídeo, o navegador:

1. Cria um `<video>` fora da tela a partir do arquivo local.
2. Espera os metadados, busca o instante de 0,1 s e espera o evento de busca concluída.
3. Desenha o quadro num `<canvas>` e pede um `blob` WebP — subindo depois **o formato que o navegador de fato devolveu**, não o que foi pedido. Safari antigo aceita o pedido de WebP e entrega PNG calado; gravar esse arquivo como `.webp`, servido como `image/webp`, produziria uma capa que navegador nenhum desenha. Formato devolvido fora da lista de aceitos: a capa é abandonada, e o vídeo sobe do mesmo jeito.
4. Pede **duas** autorizações de envio, porque são dois buckets diferentes: a capa vai para `menu-images` e o vídeo para `menu-videos`. Sobe os dois.
5. Registra a mídia com `posterPath` preenchido.

**Toda essa sequência é opcional.** Se qualquer passo falhar — códec não suportado, Safari recusando a busca antes da hora, canvas contaminado — o vídeo sobe sem capa e a interface avisa em tom informativo, não de erro. O navegador então mostra o primeiro quadro por conta própria.

Falhar em capturar uma capa não pode impedir alguém de subir o vídeo do próprio prato.

### Remoção

Remover uma mídia apaga o arquivo antes da linha. A ordem inversa, se a segunda etapa falhasse, deixaria arquivo sem dono e sem rastro no banco — o pior dos dois estados possíveis.

Quando a mídia é um vídeo com capa, **os dois arquivos saem**, cada um do seu bucket: o vídeo de `menu-videos` e a capa de `menu-images`. `poster_path` nasce nesta fase, e esquecê-lo na remoção deixaria uma imagem paga e inalcançável a cada vídeo trocado.

## 8. Mudança no banco

Uma migration, `0010_media_poster.sql`:

- Acrescenta `poster_path text` a `menu_item_media`, anulável, significativo apenas quando `kind = 'video'`.
- Acrescenta o CHECK `poster_path is null or poster_path like restaurant_id::text || '/%'`, espelhando a garantia que `storage_path` já tem. Sem ele, a capa poderia apontar para fora da pasta do restaurante.

Idempotente como todas as outras, e o `supabase/schema.sql` é regenerado. É a única vez nesta fase em que o arquivo precisa ser colado no SQL Editor.

O `registerMediaSchema` em `src/domain/media.ts` ganha `posterPath` opcional, e `registerItemMedia` passa a gravá-lo.

## 9. Erros, vazios e celular

**Erros** continuam pelo `ActionResult` da Fase 0: erro previsto traz mensagem própria, imprevisto vira genérico. Falha de upload aparece na própria área de mídia, não como aviso flutuante que some.

**Vazios** dizem o próximo passo: cardápio sem categoria oferece criar a primeira; categoria sem item oferece adicionar o primeiro.

**Celular** é o modo de uso de verdade para uma ação específica, e o desenho segue disso:

- A lista rola numa coluna só, sem layout alternativo.
- O interruptor de disponibilidade tem alvo de 44px e fica à direita, ao alcance do polegar.
- Os diálogos rolam internamente e os botões de ação ficam fixos no rodapé do diálogo, para não sumirem no fim do rolamento.
- Subir arquivo abre a câmera ou a galeria pelo seletor nativo, sem componente próprio.

## 10. Segurança

Nada aqui substitui a fundação; tudo repete a checagem no lugar certo.

- **Toda página chama `requireUser()`** e a DAL confirma pertencimento ao restaurante em cada operação.
- **O `id` da rota é validado por Zod** antes de qualquer consulta. Restaurante de outra pessoa cai em 404, não em "sem permissão" — não confirmamos que o id existe.
- **O restaurante dono de um item é sempre descoberto no servidor**, a partir do item. Um `restaurantId` enviado pelo cliente nunca decide autorização; é assim que se fecha IDOR.
- **Nenhum componente de cliente importa `@/server/dal` ou `@/server/security`.** Server actions continuam sendo a exceção deliberada.
- **Descrição de item segue texto puro**, sem HTML nem markdown, como decidido na Fase 0.
- **O teto de mídia por item é conferido no servidor.** Seis imagens e um vídeo valem dentro de `registerItemMedia`, não apenas no navegador. A checagem do cliente é conveniência; a do servidor é a garantia. A recusa sobe como erro previsto, para que a mensagem chegue inteira à tela em vez de virar o genérico.
- **A URL assinada de envio é de uso curto e caminho fixo.** Ela não autoriza escrever em qualquer lugar: o caminho é montado no servidor e vai embutido na assinatura.

## 11. O que a Fase 2 deixa pronto para a Fase 3

- **Conteúdo real para exibir.** `getPublicMenu` já existe e já devolve categorias, itens, variações e mídia em DTO pronto. A Fase 3 é design sobre dados que passam a existir.
- **Capa de vídeo resolvida.** `poster_path` chega preenchido, então o cardápio público não precisa lidar com quadro preto enquanto carrega.
- **Complementos.** O schema comporta; falta tabela, política e interface — nesta ordem.
