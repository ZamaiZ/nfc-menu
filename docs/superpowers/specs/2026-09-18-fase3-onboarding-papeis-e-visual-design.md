# Fase 3 — Onboarding do restaurante, papéis e sistema visual: desenho

Data: 2026-09-18

## 1. O que esta fase muda

Três mudanças que se sustentam mutuamente:

1. **O restaurante deixa de ser criado pela plataforma.** O administrador da plataforma emite um convite e nada mais. Quem recebe cria a própria conta, cria o próprio restaurante e o configura. O endereço público é derivado do nome automaticamente.
2. **Papel deixa de ser decorativo.** Entram administrador, caixa, atendente e garçom. Só o administrador edita. Os outros três leem o cardápio e nada mais.
3. **O visual deixa de ser andaime.** As três superfícies ganham sistema próprio, e o cardápio público ganha oito temas, parametrizados pela identidade de cada restaurante.

O que provocou a fase: o modelo anterior supunha que a plataforma cadastrava o restaurante e depois entregava a chave. Isso não escala e não corresponde a como a venda acontece — quem fecha negócio recebe um link e se vira.

## 2. Decisões tomadas, e por quê

| # | Decisão | Razão |
|---|---|---|
| 1 | Fundação visual primeiro, depois estrutura, depois telas | As telas mudam de forma com o fluxo novo. A fundação não depende de tela nenhuma, então nada é feito duas vezes. |
| 2 | O restaurante nasce em rascunho; **o dono publica** | Ninguém fica com cardápio vazio no ar enquanto digita, e ele não depende da plataforma para operar. |
| 3 | Suspender continua exclusivo da plataforma | Castigo que o punido desfaz não é castigo. |
| 4 | Quatro papéis; quem não é administrador **lê** o cardápio | Consultar preço no salão é uso real hoje. Comanda e caixa não existem ainda; o papel fica gravado à espera da tela. |
| 5 | O endereço **congela** após a criação | O gatilho do banco já garante isso hoje, sem código novo. Endereço impresso não muda sozinho. |
| 6 | Uma tabela de convites, `restaurant_id` anulável | Duas tabelas duplicariam o manejo de token, que é a parte sensível. A diferença real é uma coluna. |
| 7 | O restaurante nasce **dentro** da função de resgate | A política de INSERT em `restaurants` continua fechada. Ninguém ganha o direito de criar restaurante; ganha o direito de resgatar um convite. |
| 8 | Tema = preset + duas cores do dono | O dono escolhe fundo e destaque; o resto deriva. Não existe combinação onde ele acerta o fundo e erra o texto, porque o texto não é escolha dele. |
| 9 | O segmento é campo próprio e **sugere** o tema | Sessenta tipos de restaurante não viram sessenta temas. Viram um atalho de onboarding e um dado de mercado. |
| 10 | Os oito temas entram nesta fase | Escolha do cliente, com o custo declarado na §12. |

## 3. Modelo de dados

### 3.1 Convite

`invites.restaurant_id` passa a aceitar nulo, e o nulo tem significado:

- **Nulo — convite de plataforma.** Emitido só pelo administrador da plataforma. Resgatá-lo cria um restaurante novo e torna quem resgatou administrador dele.
- **Preenchido — convite de equipe.** Emitido pelo administrador daquele restaurante. Resgatá-lo apenas insere a associação, no papel gravado no convite.

Restrição que amarra o par:

```
constraint invites_platform_role check (
  restaurant_id is not null or role = 'admin'
)
```

Um convite de plataforma sempre cria um administrador. Não existe convite de plataforma que produza garçom, porque não existiria restaurante para ele servir.

Tudo o mais da tabela fica idêntico: só o hash do token é gravado, `expires_at`, `redeemed_at`, `redeemed_by`, `revoked_at` e `created_by` seguem como estão.

**A validade em dias é a janela para aceitar, não a duração do acesso.** Isso já é verdade no código de hoje — `expires_at` só é conferido em `preview_invite` e `redeem_invite`. O que muda é a interface dizer isso com todas as letras, porque "Validade em dias" hoje soa como assinatura.

### 3.2 Papéis

O tipo `public.membership_role`, hoje `('owner','manager')`, é substituído por `public.member_role`:

| Valor no banco | Rótulo na interface |
|---|---|
| `admin` | Administrador |
| `cashier` | Caixa |
| `attendant` | Atendente |
| `waiter` | Garçom |

Valores em inglês porque todo o resto do schema já é (`draft`/`active`/`suspended`, `image`/`video`). Os rótulos em português vivem na borda da interface, ao lado do `StatusBadge`.

**Por que tipo novo e não `alter type add value`:** Postgres acrescenta valor a enum mas nunca remove. `owner` e `manager` ficariam de lixo permanente no tipo, e todo `switch` no código teria que tratar valores impossíveis para sempre. Com zero restaurantes no ar, converter é barato: `owner` e `manager` mapeiam ambos para `admin`, porque hoje só existem donos.

### 3.3 Segmento e tema

Duas colunas novas em `restaurants`:

- `segment text` — o tipo de negócio, de uma lista fechada mantida no código. Anulável: quem pular a etapa fica sem, e isso não impede nada.
- `theme jsonb` — **já existe**, hoje vazia. Passa a guardar `{ preset, base, accent, density }`.

| Chave | Conteúdo | Origem |
|---|---|---|
| `preset` | um dos oito nomes de tema | escolhido, sugerido pelo segmento |
| `base` | cor de fundo, em hex | escolhida dentro da faixa do preset |
| `accent` | cor de destaque, em hex | escolhida, validada por contraste |
| `density` | `confortavel` ou `compacto` | escolhida; padrão confortável |

`logo_path` e `cover_path` já existem e continuam como estão.

**Os presets vivem no código, não no banco.** Cada um carrega fontes e regras de CSS próprias, então acrescentar o nono tema é um deploy, não uma linha numa tabela. O `theme jsonb` apenas nomeia um preset existente; um nome desconhecido cai no preset padrão em vez de quebrar a página.

## 4. Autorização

### 4.1 O buraco que esta fase fecha

Hoje **toda** a escrita do cardápio autoriza com `is_member`: dezoito chamadas em `src/server/dal/menu.ts`, três em `src/server/dal/media.ts`, duas em `src/server/dal/tags.ts`, e a RLS das quatro tabelas do cardápio diz o mesmo. Enquanto só existia dono, membro e dono eram a mesma pessoa. No minuto em que um garçom aceita um convite, `is_member` deixa de significar "pode editar" e passa a significar apenas "trabalha aqui".

`public.is_owner(uuid)` é substituída por `public.is_restaurant_admin(uuid)`, com a mesma forma e comparando `role = 'admin'`. `public.is_member(uuid)` permanece, e é ela que concede leitura.

### 4.2 A regra, por operação

| Operação | Anônimo | Membro | Administrador do restaurante | Plataforma |
|---|---|---|---|---|
| Ver cardápio publicado | sim | sim | sim | sim |
| Ver cardápio no painel | não | sim | sim | sim |
| Criar, editar, remover categoria, item, variação, mídia | não | **não** | sim | sim |
| Editar identidade, tema, segmento, contato | não | não | sim | sim |
| Publicar e despublicar | não | não | sim | sim |
| Convidar, trocar papel, remover membro | não | não | sim | sim |
| Emitir convite de plataforma | não | não | não | sim |
| Trocar endereço, suspender, remover restaurante | não | não | não | sim |

### 4.3 As três camadas

A regra é repetida em três lugares, de propósito, e uma falha em qualquer um é contida pelos outros:

1. **RLS**, que nega por padrão e é a última linha.
2. **DAL**, que confirma posse antes de tocar no banco — `requireRestaurantAdmin` substitui `requireOwner`.
3. **Interface**, que esconde o botão. Isso é cortesia, não segurança: quem chamar a server action na mão é barrado pelas outras duas.

Uma função `public.my_role(rid uuid) returns public.member_role` alimenta a camada 3.

### 4.4 O gatilho de colunas privilegiadas

`restaurants_guard_privileged_columns` fica **mais preciso, não mais frouxo**:

- `slug` e `deleted_at`: continuam bloqueados para qualquer um que não seja a plataforma.
- `status`: o administrador do restaurante move entre `draft` e `active`. Entrar em `suspended` ou sair de `suspended` continua exclusivo da plataforma.

A saída para `auth.uid()` nulo permanece: acesso direto ao banco já é privilegiado por definição, e tráfego da aplicação nunca chega com uid nulo.

### 4.5 Duas regras que hoje não existem

1. **O último administrador não pode ser removido nem rebaixado.** `removeMember` hoje aceita remover qualquer um, inclusive o único dono — e aí o restaurante fica órfão: ninguém edita, ninguém convida, e só sobra intervenção manual no banco. Vale para remoção e para troca de papel, inclusive quando alguém tenta rebaixar a si mesmo. Conferido na DAL **e** por gatilho no banco.
2. **Trocar o papel de quem já está na equipe.** Não existe operação para isso hoje, só convidar e remover. Promover o garçom a administrador não pode exigir removê-lo e reconvidá-lo.

Um administrador **pode** convidar outro administrador. Sócio é caso normal, e a regra 1 já impede o cenário ruim.

## 5. O fluxo, de ponta a ponta

### 5.1 Convite de plataforma

1. **Console.** "Novo convite" pede validade em dias e, opcionalmente, um e-mail para amarrar. Não pede nome de restaurante. Sai um link, exibido uma única vez.
2. **A pessoa abre o link.** A tela mostra que existe um convite para criar um restaurante e nada mais — nem quem convidou, nem prazo, nem e-mail amarrado, como já é hoje.
3. **Ela cria a conta** com e-mail e senha, ou entra se já tiver.
4. **Assistente, passo 1 — o nome.** Digita "Cantina do Zé"; o endereço aparece abaixo em tempo real como `cantina-do-ze`, com disponibilidade conferida enquanto digita, e pode ser ajustado antes de confirmar.
5. **Confirmar é uma chamada só.** Resgatar o convite, criar o restaurante e criar a associação de administrador acontecem numa função só, numa transação só.
6. **Passo 2 — identidade.** Segmento, tema sugerido, cores, logo, capa. Pulável.
7. **Passo 3 — contato.** Telefone, WhatsApp, Instagram, endereço. Pulável.
8. **Painel**, no cardápio vazio, com o próximo passo à vista.

### 5.2 Convite de equipe

Idêntico do passo 2 ao 3, e então a associação é criada no papel gravado no convite. Sem assistente: a pessoa cai direto no painel do restaurante que a convidou.

### 5.3 Publicação

O administrador aperta **Publicar cardápio**. A ação recusa, com motivo na tela, se o cardápio não tiver ao menos uma categoria visível com um item visível — publicar um cardápio vazio só produz um cliente confuso na mesa. Despublicar é livre e volta o restaurante para rascunho.

## 6. A criação atômica

Uma função `security definer` nova:

```
public.redeem_platform_invite(p_token text, p_name text, p_slug text) returns uuid
```

Ela, em ordem, dentro de uma transação:

1. Exige `auth.uid()` não nulo.
2. Marca o convite como resgatado, com `update ... where token_hash = sha256(...) and expires_at > now() and redeemed_at is null and revoked_at is null and restaurant_id is null and (email is null or lower(email) = lower(<e-mail do usuário>))`. A corrida entre dois cliques simultâneos é resolvida pelo próprio Postgres: só uma transação encontra `redeemed_at` ainda nulo.
3. Se nada foi atualizado, levanta `convite inválido` — mensagem única para as cinco condições de falha, pela mesma razão que hoje.
4. Insere o restaurante com `status = 'draft'`, `created_by = auth.uid()`.
5. Insere a associação com `role = 'admin'`.
6. Registra auditoria de `invite.redeemed` e `restaurant.created`.
7. Devolve o id do restaurante.

**Se o endereço colidir no passo 4**, o `unique` do slug levanta `23505`, a transação inteira volta atrás e **o convite continua válido**. A função converte isso num erro distinto e catalogável, para a aplicação poder dizer "este endereço já está em uso" em vez da mensagem opaca — o que não vaza nada, porque quem chegou até aqui já provou ter um convite válido.

`redeem_invite`, a função de hoje, passa a exigir `restaurant_id is not null`, para que um convite de plataforma nunca seja resgatado pelo caminho errado.

`preview_invite` passa a devolver também o **tipo** do convite, para a tela saber se mostra "crie seu restaurante" ou "junte-se a <nome>". Para convite de plataforma o nome do restaurante volta nulo, porque não existe.

## 7. O endereço automático

Algoritmo, aplicado ao nome digitado:

1. Normaliza para NFD e remove os sinais diacríticos — `Zé` vira `Ze`.
2. Minúsculas.
3. Tudo que não for `a-z` ou `0-9` vira hífen.
4. Hífens repetidos colapsam num só.
5. Hífens das pontas caem.
6. Corta em 50 caracteres, sem deixar hífen no fim.

Duas armadilhas que o banco já sinaliza e o gerador precisa respeitar antes de propor qualquer coisa:

- **Mínimo de três caracteres**, começando e terminando em alfanumérico. É o `restaurants_slug_shape`.
- **Palavras reservadas.** `admin`, `painel`, `api`, `t`, `entrar`, `convite`, `assets`, `static`, `public`, `favicon`, `robots`, `sitemap`. Um restaurante chamado "Admin" não pode virar `admin`.

Nos dois casos o gerador sufixa e mostra o resultado, em vez de propor algo que o banco vai recusar. Colisão com endereço existente sufixa com `-2`, `-3`, e assim por diante.

A disponibilidade é conferida por `public.is_slug_available(text) returns boolean`, `security definer`, concedida a `authenticated` e sujeita a limite de tentativas. Ela não vaza nada que visitar a URL já não vazasse — o endereço é público por natureza.

## 8. O sistema visual

### 8.1 O que da direção da Fase 1 cai, e por quê

- **"Tudo peso 600."** Título de página, de seção e de cartão diferem só em tamanho, e isso achata a hierarquia: o olho não tem onde descansar.
- **"Uma fonte só."** Peso e tamanho sozinhos não constroem hierarquia. Contraste de forma constrói.
- **"Cor primária nunca como superfície."** Boa regra para console de operação, ruim para cardápio, onde a marca precisa aparecer em superfície.

**O que fica:** alvo de toque mínimo de 44px, preço sempre em centavos inteiros com conversão só na borda, e cor nunca sendo o único portador de significado.

### 8.2 Fundação

Vale para as três superfícies:

- **Par tipográfico** — uma face de display e uma de texto, por superfície.
- **Escala com degraus reais** e pesos variados.
- **Profundidade por camada**, com sombra curta e baixa opacidade, em vez de retângulo delimitado por linha de 1px.
- **Movimento com propósito.** `motion@13` já está instalado e nunca foi usado. Entrada em cascata de 200 a 300ms, deslocamento de 8 a 12px, **só na montagem**, nunca a cada renderização. Desligado inteiro sob `prefers-reduced-motion`. **Não animam:** preço mudando e disponibilidade alternando, onde resposta instantânea vale mais que elegância.
- **Ícone dentro do campo.** `src/components/ui/input-group.tsx` já existe no projeto e não é usado por nenhum campo.
- **Estados desenhados:** foco, hover, carregando, vazio e erro, em vez do padrão herdado.

### 8.3 As três superfícies

| | Console (`admin.`) | Painel (`painel.`) | Cardápio público |
|---|---|---|---|
| Para quem | a plataforma, operando | o dono, trabalhando | o cliente, com fome |
| Caráter | denso, sóbrio, informativo | espaçoso, guiado | a marca do restaurante |
| Densidade | alta | média | baixa |
| Tema | fixo, com claro e escuro | fixo, com claro e escuro | do restaurante |
| Dispositivo | desktop primeiro | desktop, funciona no celular | celular, e só ele importa |

### 8.4 Os oito temas

Cada preset define **par tipográfico, família de cor, raio, densidade, tratamento de foto e faixa de cor válida**, nas faces clara e escura, seguindo a preferência do aparelho do cliente.

| Tema | Segmentos | Caráter |
|---|---|---|
| **Brasa** | hamburgueria, churrascaria, steakhouse, parrilla, americano, K-BBQ, fast-food, food truck, dark kitchen | escuro, condensada pesada, foto grande, preço em destaque |
| **Forno** | pizzaria, cantina italiana, casa de massas, mineiro, nordestino, pastelaria, tapiocaria, rotisserie, self-service, buffet, casual dining, mexicano, árabe, indiano | creme e terroso, serifa robusta, vermelho de tomate, canto curto |
| **Grão** | cafeteria, padaria artesanal, creperia, brunch, restaurante de hotel | quente e claro, serifada no prato, logo redondo, foto pequena |
| **Sal** | alta gastronomia, bistrô francês, wine bar, mediterrâneo, peruano, cevicheria | saturação quase zero, serifada com muito respiro, sem foto, preço sem cifrão |
| **Horta** | açaí, saladeria, sucos, vegetariano, vegano, fit, gluten-free, poke, kosher, halal | claro e arejado, geométrica arredondada, canto muito suave, foto redonda |
| **Neon** | bar, boteco, pub, gastrobar, cachaçaria, izakaya | preto profundo, grotesca apertada, destaque de croma alta, sem foto |
| **Nori** | japonês, chinês, tailandês, coreano, vietnamita | precisão geométrica, gótica quadrada, régua de categoria, foto quadrada pequena, canto de 2px |
| **Confeito** | doceria, confeitaria, sorveteria, gelateria, churros | **o item é um cartão, não uma linha** — pastel, canto de 24px, foto quadrada grande, sombra colorida |

Árabe, indiano e mediterrâneo **não ganham tema próprio**: são Forno e Sal com outra faixa de destaque. Criar tema por cozinha é o caminho de volta para sessenta temas.

### 8.5 As duas cores do dono

O dono escolhe **fundo** e **destaque**. Texto principal, texto secundário, linhas, sombras e a cor sobre o destaque são todos derivados. Não existe combinação em que ele acerte o fundo e erre o texto, porque o texto não é escolha dele.

Cada preset declara uma **faixa válida** para o fundo, expressa como intervalo de luminosidade e de croma em OKLCH — o espaço que `globals.css` já usa em todos os tokens de hoje. Brasa declara luminosidade entre 0,08 e 0,22; Grão, entre 0,92 e 0,99. Bege em Brasa não é personalizar, é descaracterizar o tema e arruinar a foto por cima. Dentro da faixa, liberdade; o destaque não tem faixa de luminosidade, só a exigência de contraste da linha seguinte.

**O contraste é conferido no servidor antes de gravar**, nunca só no seletor de cor. Texto de corpo precisa de 4,5:1 contra o fundo em que ele aparece; texto grande e elementos de interface, 3:1. O que não passa é recusado com o motivo na tela, e "restaurar o padrão do tema" está sempre a um clique.

### 8.6 Densidade

`density` vale `confortavel` (padrão) ou `compacto`. Compacto reduz o espaçamento da linha e recolhe a descrição do item, que abre ao toque. Existe porque a lista de segmentos inclui rotisserie, padaria e self-service, que têm centenas de itens e ficam ilegíveis no espaçamento pensado para um rodízio de doze linhas.

## 9. As telas

### 9.1 Console (`admin.`)

Encolhe antes de melhorar. Perde o cadastro de restaurante inteiro — `create-restaurant-dialog.tsx` e `slug-form.tsx` saem de cena.

- **Início: convites.** Lista de convites de plataforma com situação (pendente, resgatado, vencido, revogado), quem resgatou e quando. Emitir e revogar.
- **Restaurantes.** Lista com nome, endereço, situação, segmento e data. Detalhe traz trocar endereço, suspender e remover, que continuam privilégio da plataforma.

### 9.2 Painel (`painel.`)

- **Assistente de criação**, três passos, com pré-visualização ao vivo do cardápio no passo de identidade. O dono precisa **ver** a cor que escolheu aplicada a um cardápio antes de gravar.
- **Cardápio.** O que já existe, refeito no visual novo, com os botões de edição condicionados ao papel e a faixa de publicação no topo.
- **Identidade.** Nome, descrição, segmento, tema, cores, logo, capa, densidade. Só administrador.
- **Contato.** Telefone, WhatsApp, Instagram, endereço. Só administrador.
- **Equipe.** Lista com papel, convites internos pendentes, trocar papel e remover. Só administrador. As duas travas da §4.5 valem aqui.

### 9.3 Cardápio público

Reconstruído do zero: `src/app/(site)/[slug]/page.tsx` hoje não tem uma classe de estilo sequer. Capa, logo, nome, contato, categorias e itens, no tema do restaurante, pensado para celular.

## 10. Migrações

Numeradas a partir de `0011`, idempotentes, aplicadas em ordem, no padrão que o projeto já usa.

| Arquivo | Conteúdo |
|---|---|
| `0011_roles.sql` | tipo `member_role`; conversão das colunas; `is_restaurant_admin`; `my_role`; políticas de escrita do cardápio passando a exigir administrador; gatilho de colunas privilegiadas revisto |
| `0012_invites.sql` | `restaurant_id` anulável; CHECK do par; RLS de convite por emissor; `preview_invite` devolvendo o tipo; `redeem_invite` exigindo restaurante; `redeem_platform_invite` |
| `0013_identity.sql` | coluna `segment`; `is_slug_available`; gatilho do último administrador |

**Ordem obrigatória dentro de `0011`**, porque o tipo antigo tem dependentes:

1. Remover as políticas que mencionam `is_owner`, em `restaurants`, `memberships` e `invites`.
2. Derrubar `is_owner`, `preview_invite`, `redeem_invite` e `list_restaurant_members` — as três últimas porque a assinatura delas cita `membership_role`.
3. Criar `member_role`, converter as colunas de `memberships` e `invites`, derrubar `membership_role`.
4. Criar `is_restaurant_admin` e `my_role`, recriar as políticas e **recriar as três funções com o tipo novo, na forma que tinham**.

`0012` então altera a forma de `preview_invite` e `redeem_invite`. As duas existem e funcionam ao fim de `0011`, o que mantém cada migração válida isoladamente — importante porque o SQL Editor não guarda estado e elas são aplicadas à mão, uma de cada vez.

**Guarda de idempotência:** o projeto já usa `drop ... if exists` antes de cada `create`, então esse padrão existe. O que estas migrações precisam acrescentar é a proteção da **conversão de coluna**, que não é idempotente por natureza: numa segunda execução o tipo antigo já não existe, e tentar converter de novo falha. A conversão fica dentro de um bloco condicionado à existência de `membership_role` em `pg_type`.

## 11. Erros e casos de borda

| Situação | Comportamento |
|---|---|
| Token desconhecido, vencido, revogado, já resgatado, ou de e-mail diferente | Mesma mensagem para todos os cinco. Nenhum deles revela que o convite existe. |
| Endereço em uso na confirmação do assistente | Erro específico, convite **não** consumido, a pessoa tenta outro nome. |
| Nome que gera endereço reservado ou curto demais | O gerador sufixa antes de propor. O banco nunca chega a recusar. |
| Cor escolhida sem contraste suficiente | Recusada no servidor, com o motivo e o valor mínimo na tela. |
| `theme.preset` desconhecido | Cai no preset padrão. A página nunca quebra por dado ruim. |
| Publicar cardápio sem categoria ou item visível | Recusado, com o motivo na tela. |
| Remover ou rebaixar o último administrador | Recusado na DAL e no banco. |
| Membro não administrador chamando ação de escrita | Barrado na DAL e na RLS, mesmo sem botão na tela. |
| Restaurante suspenso | O dono continua entrando e editando; o cardápio público some. |

## 12. O que esta fase não inclui

- Comanda, pedido, caixa e qualquer tela para caixa, atendente e garçom além da leitura.
- Busca dentro do cardápio público.
- Histórico de endereços e redirecionamento do endereço antigo. Registrado como evolução natural quando existirem restaurantes no ar.
- Métricas de acesso ao cardápio.
- Mais de um idioma.
- Promoção de alguém a administrador da plataforma pela aplicação. Continua sendo seed manual.

**O custo declarado dos oito temas:** cada preset é um par tipográfico com fontes a carregar, duas faces de cor, uma faixa válida e a validação de contraste correspondente. Construir os oito nesta fase é a decisão tomada; se o prazo apertar, o corte natural é entregar Brasa, Forno e Grão primeiro — eles cobrem a maior fatia da lista de segmentos — e os outros cinco viram uma tarefa curta e repetitiva depois, porque a essa altura é só preencher variáveis.

## 13. Verificação

No padrão que as fases anteriores já estabeleceram:

- **Código:** `pnpm exec tsc --noEmit` limpo. Lint não é portão.
- **Sem testes automatizados.** Cada tarefa termina com um comando de verificação cujo resultado é conferido e reportado.
- **Dois bancos, e eles não são o mesmo.** Schema e idempotência de migração se provam no Postgres em Docker, por `psql`. Dado que a aplicação gravou se prova no SQL Editor do projeto na nuvem, porque é para lá que `NEXT_PUBLIC_SUPABASE_URL` aponta.
- **Prova de isolamento escopada:** um membro não administrador tentando escrever no cardápio precisa ser recusado com a RLS ativa, e isso se prova em SQL, não por inspeção de código.
- **Roteiro no navegador** para o ciclo completo: emitir convite, criar conta, criar restaurante, configurar identidade, montar cardápio, publicar, convidar a equipe, entrar como garçom e confirmar que não há botão de edição.
- **Roteiro no celular** para o cardápio público, nos oito temas, nas faces clara e escura.

## 14. Restrições herdadas

Continuam valendo, sem mudança:

- **Nada de git.** Nenhum `add`, `commit`, `push` ou `branch`. Cada tarefa termina listando os arquivos alterados.
- **Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.** Esta versão do Next tem mudanças de contrato em relação ao conhecimento prévio.
- **Composição usa `render`, nunca `asChild`.** O shadcn deste projeto é sobre Base UI.
- **Server action chamada de manipulador de evento vai dentro de `startTransition`.**
- **Diálogo nunca vive dentro de menu suspenso.**
- **Componente de cliente nunca importa `@/server/dal` nem `@/server/security`.** Server actions são a exceção deliberada.
- **Rotas são externas.** Dentro de `painel.` escreve-se `/restaurantes/x`; o proxy reescreve.
- **Português do Brasil** em toda a interface e em toda mensagem de erro.
- **`cn` vem do pacote `cn`**, não de `@/lib/utils`.
