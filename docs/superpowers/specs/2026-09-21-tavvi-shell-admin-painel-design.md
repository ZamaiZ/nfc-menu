# Tavvi — novo shell, navegação e repaginação do admin/painel

Data: 2026-09-21

Status: desenho aprovado em conversa; aguardando revisão do documento antes do plano de implementação.

## 1. Objetivo

Substituir a casca atual do console administrativo e do painel de restaurantes por uma experiência única da Tavvi, baseada na qualidade visual e nos comportamentos dos componentes de referência da `suite`:

- `components/custom/Sidebar`
- `components/custom/MobileNavigation`
- `components/custom/ThemeToggle`

A nova interface deve usar **Tavvi** como nome da plataforma e **TV** como monograma, preservar o verde-azulado atual, adotar Inter em todas as superfícies privadas e manter o cardápio público completamente subordinado à identidade escolhida pelo restaurante.

Esta especificação também corrige o fluxo em que erros transitórios do Supabase são transformados em 404 na abertura de um restaurante.

## 2. Diagnóstico do estado atual

### 2.1 O 404 não prova que o restaurante não existe

O redirect externo funciona: uma pessoa sem sessão é enviada para `/entrar?next=<destino>`, e a ação de login conserva esse destino.

O defeito está depois do redirect. `getRestaurantForMember()` usa `maybeSingle()` e devolve `null` tanto quando nenhuma linha é visível quanto quando o Supabase devolve erro. Layout e página transformam esse `null` em `notFound()`. Assim, timeout, conexão indisponível e erro de consulta aparecem como “restaurante inexistente”.

O mesmo restaurante e o papel do usuário ainda são consultados mais de uma vez entre layout e página. Isso aumenta o tempo de resposta e a superfície para falhas transitórias.

### 2.2 A tipografia atual contradiz o requisito

O root layout carrega Inter e Fraunces. O corpo usa Inter e os títulos principais pedem Fraunces por `font-display`. Portanto, o problema visual não é uma fonte ausente: é uma direção tipográfica deliberada que já não corresponde à Tavvi.

O cardápio público já possui isolamento correto por `--m-font-text` e `--m-font-display`. Esse isolamento deve ser preservado.

### 2.3 A navegação atual não corresponde à referência

A casca atual usa o sidebar genérico do shadcn, com variante inset, recolhimento em ícone e `Sheet` no mobile. Ela não reproduz:

- largura e ritmo da `suite`;
- persistência real entre recargas;
- transições de rótulo e ícone;
- flyout dos grupos no estado recolhido;
- navegação móvel em dock;
- feedback pendente por destino;
- Command Palette;
- atalho de tema;
- tratamento completo de foco, Escape e safe areas.

O cabeçalho horizontal também repete contexto já disponível na lateral e consome altura sem melhorar a orientação.

## 3. Princípios do novo desenho

### 3.1 Portar, não copiar cegamente

Os componentes da `suite` são referência de comportamento e aparência. A implementação da Tavvi será própria, porque a referência contém nomes, ações, providers, rotas e pressupostos que pertencem a outro produto.

Devem ser reproduzidos com fidelidade:

- proporções;
- hierarquia;
- estados;
- movimento;
- atalhos;
- acessibilidade;
- comportamento desktop e mobile.

Devem ser adaptados:

- marca;
- cores;
- rotas;
- permissões;
- ações de autenticação;
- conteúdo da navegação;
- destinos contextuais.

### 3.2 Uma linguagem para os dois territórios

Admin e painel compartilham a mesma casca e o mesmo sistema visual. Eles diferem pelo conteúdo, pelas permissões e pelos destinos de navegação, não pela qualidade ou por estruturas paralelas.

### 3.3 Inter nas superfícies privadas

Admin, painel, autenticação e onboarding usam Inter. Fraunces deixa de participar dessas superfícies.

O cardápio público não herda essa decisão. Suas fontes continuam vindo do tema do restaurante.

### 3.4 A cor comunica estado

O verde-azulado atual permanece como identidade principal. Ele será reservado para ação primária, foco, seleção e estados que precisem de destaque. Neutros organizam a maior parte da interface.

Não entra glassmorphism como linguagem geral. Transparência e blur ficam restritos aos overlays móveis em que ajudam a separar planos, seguindo a referência.

## 4. Arquitetura do shell

### 4.1 Fronteiras

Rotas públicas não montam a navegação administrativa:

- login do admin;
- login do painel;
- convite;
- cardápio público.

Rotas protegidas de admin e painel usam um único `TavviShell`.

O layout servidor produz uma configuração serializável com:

- contexto atual;
- destino inicial;
- nome e e-mail do usuário quando disponíveis;
- permissões;
- grupos e itens de navegação;
- identificação do restaurante quando houver;
- ações disponíveis.

O shell cliente recebe essa configuração e controla sidebar, dock móvel, Command Palette, tema, atalhos e estados locais. Ícones são resolvidos no cliente a partir de identificadores conhecidos, evitando passar componentes não serializáveis pela fronteira servidor/cliente.

### 4.2 Desktop

A sidebar terá:

- 260px expandida;
- 64px recolhida;
- altura `100dvh`;
- `Tavvi` no estado expandido;
- `TV` centralizado no estado recolhido;
- controle circular na borda direita;
- persistência em `localStorage`;
- `Ctrl+B` para expandir ou recolher;
- suporte a `prefers-reduced-motion`;
- tooltips nos controles recolhidos;
- rótulos animados sem vazamento ou recorte;
- navegação ativa por correspondência hierárquica;
- feedback de carregamento no próprio destino acionado.

Grupos expandidos mostram uma árvore visual. No estado recolhido, abrem um flyout acessível com scrim, posicionamento derivado do item, Escape e fechamento ao clicar fora.

O rodapé reúne tema e logout. O logout mostra estado pendente sem alterar as dimensões do botão.

### 4.3 Command Palette

A busca de páginas faz parte do shell desde a primeira versão.

- abre pelo botão da sidebar ou por `Ctrl+K`;
- pesquisa apenas os destinos presentes na configuração autorizada;
- agrupa resultados segundo a mesma árvore da navegação;
- mostra nome e descrição;
- permite navegação por teclado;
- fecha após mudança de rota;
- mantém feedback pendente enquanto o destino carrega;
- não oferece rotas ocultas por permissão.

A árvore de navegação será a fonte única para sidebar, painel móvel e Command Palette.

### 4.4 Mobile

Em larguras inferiores a 768px, a sidebar desktop sai e entra um dock flutuante com três destinos:

- Conta;
- Início;
- Menu.

O destino central é contextual:

- admin: Convites;
- painel sem restaurante ativo: Restaurantes;
- restaurante ativo: Cardápio do restaurante.

Conta abre um popover com identificação, tema e logout. Menu abre a árvore completa em painel inferior. Ambos preservam alvos de toque de ao menos 44px.

O painel móvel inclui:

- safe area inferior;
- altura máxima baseada em `dvh`;
- bloqueio de rolagem do documento quando o menu está aberto;
- scrim;
- Escape;
- foco inicial;
- focus trap;
- restauração do foco ao gatilho;
- fechamento automático ao mudar de rota;
- transições reduzidas ou removidas sob `prefers-reduced-motion`.

O conteúdo recebe padding inferior suficiente para nunca ficar escondido atrás do dock.

## 5. Tema e atalhos

O provider atual será evoluído e continuará responsável por persistência, resolução do tema do sistema e aplicação da classe `dark`. `next-themes` não será introduzido: seus comportamentos necessários serão implementados sobre a infraestrutura que o projeto já possui.

O seletor terá as opções Sistema, Claro e Escuro em um grupo de seleção único, com indicação semântica do valor ativo. O botão mostra o ícone do tema configurado e funciona com ou sem rótulo.

Atalhos globais:

- `Ctrl+B`: alterna a sidebar no desktop e o menu no mobile;
- `Ctrl+K`: abre ou fecha a Command Palette;
- `Ctrl+Alt+T` ou `AltGr+T`: percorre Sistema → Claro → Escuro → Sistema.

Os atalhos ignoram repetição e, quando aplicável, campos editáveis. O atalho de tema segue o comportamento da referência e reconhece eventos reais de teclado antes de acessar modificadores.

## 6. Sistema visual

### 6.1 Tipografia

- títulos principais: Inter 600 ou 700, com tamanho contido;
- títulos de seção: Inter 600;
- corpo e formulários: 15–16px;
- tabelas e metadados: 13–14px;
- microtexto: nunca abaixo de 12px quando carregar informação essencial;
- números permanecem tabulares onde alinhamento importa.

A hierarquia usa tamanho, peso, entrelinha e espaço. Não depende de uma fonte display separada.

### 6.2 Cor e superfície

A paleta verde-azulada existente permanece. Seus valores serão expostos por tokens semânticos equivalentes nas faces clara e escura.

As superfícies seguem três níveis:

- fundo da aplicação;
- área de conteúdo ou agrupamento;
- popover, diálogo ou elemento elevado.

Bordas separam conteúdos de mesmo plano. Sombras curtas e diferenças de luminosidade separam planos. Não se coloca borda e sombra fortes em todos os elementos ao mesmo tempo.

### 6.3 Forma e espaço

- padding horizontal: 16px no mobile, 24px em telas médias e 32px no desktop;
- ritmo baseado em 4px;
- raios principais: 8px, 10px e 16px;
- pills reservadas a badges, chips e estados;
- largura máxima varia conforme o tipo de tela, não por números diferentes escolhidos em cada rota.

### 6.4 Cabeçalho de página

A barra superior global atual sai. Cada tela recebe um cabeçalho próprio com:

- título;
- texto de apoio opcional;
- ações contextuais;
- breadcrumb apenas quando a profundidade real justificar.

O cabeçalho quebra corretamente no mobile e não empurra ações para posições imprevisíveis.

## 7. Repaginação por superfície

### 7.1 Console administrativo

Convites recebem cabeçalho compacto, ação primária evidente e lista dentro de uma superfície própria. Status, prazo e revogação têm leitura rápida. No mobile, cada convite vira cartão em vez de forçar tabela horizontal.

Restaurantes mantêm a densidade de uma tabela no desktop, com linha inteira clicável, situação legível e alinhamento consistente. No mobile, os dados essenciais viram cartões empilhados.

O detalhe do restaurante separa endereço público e situação em seções claras. Ações destrutivas ou de suspensão não competem visualmente com ações rotineiras.

### 7.2 Painel de restaurantes

A seleção de restaurantes usa cartões com capa, logo, nome, endereço e situação. O cartão inteiro é interativo e possui foco visível.

No Cardápio:

- o cabeçalho reúne contexto e ação;
- publicação vira faixa de estado compacta;
- categorias são seções com cabeçalho, contagem e ações;
- itens organizam miniatura, nome, preço, disponibilidade e ações sem amontoamento;
- ações pouco frequentes permanecem em menu;
- controles essenciais continuam acessíveis ao polegar no mobile.

Identidade mantém editor e prévia em duas colunas no desktop. No mobile, a prévia vira uma seção própria depois dos controles e não comprime o formulário.

Contato agrupa campos relacionados dentro de uma superfície de leitura confortável.

Equipe separa membros de convites pendentes. No desktop usa tabela; no mobile, cartões. Troca de papel e remoção preservam feedback, reversão e confirmação.

O onboarding mantém três etapas, com progresso, ação primária, opção de pular e navegação coerentes com o restante do painel.

### 7.3 Autenticação e convite

Login e resgate de convite usam Inter e a identidade Tavvi. Permanecem sem navegação protegida. A composição centralizada ganha marca, superfície, foco e espaçamento coerentes com o produto, sem voltar ao formulário solto sobre o fundo.

## 8. Estados e feedback

Loading skeletons repetem a geometria da tela real. Não entram blocos genéricos com alturas sem relação com o conteúdo final.

Estados vazios incluem explicação e próximo passo quando o usuário puder agir. Quando não houver ação possível, não será exibido um botão sem efeito.

Navegação e ações assíncronas preservam as dimensões do controle enquanto mostram spinner ou superfície de espera.

Erros previstos ficam próximos da origem. Erros de rota usam `error.tsx` com mensagem segura, ação de tentar novamente e retorno possível. Toasts não roubam foco e são anunciados por região viva.

404 é reservado a identificador inválido, recurso realmente ausente ou recurso que a política deve tornar indistinguível de inexistente.

## 9. Fluxo de dados do restaurante

O carregamento de uma área de restaurante passa a usar um contexto deduplicado por renderização, contendo ao menos:

- restaurante visível;
- papel atual;
- capacidade de editar;
- usuário necessário à casca;
- configuração de navegação.

Layout e página reutilizam esse contexto. A página consulta somente o domínio específico, como cardápio, equipe ou identidade.

Na DAL:

- erro de consulta lança uma exceção segura no servidor;
- ausência sem erro devolve `null`;
- `notFound()` só é chamado para `null` ou identificador inválido;
- detalhes do Supabase não chegam à interface;
- consultas públicas mantêm a política de não revelar restaurante em rascunho, suspenso ou removido.

O redirect de `/restaurantes` continua direto para o único restaurante quando houver exatamente um. Com zero ou múltiplos, mostra a seleção. Erro ao listar não produz redirect nem 404: cai no estado recuperável.

## 10. Navegação e permissões

O admin recebe:

- Convites;
- Restaurantes.

O painel sem restaurante ativo recebe Restaurantes.

Dentro de um restaurante, todos recebem Cardápio. Somente administradores recebem Identidade, Contato e Equipe. Esconder destinos é cortesia de interface; a DAL e a RLS continuam sendo a autorização real.

A correspondência de rota será hierárquica:

- `/` só fica ativo quando for exatamente `/`;
- um destino fica ativo em sua própria rota ou em descendentes;
- o prefixo interno criado pelo proxy não pode quebrar a comparação;
- caminhos usados em `href` e `redirect` continuam externos, sem `/admin` ou `/painel`.

## 11. Acessibilidade

Requisitos obrigatórios:

- foco visível em todo controle;
- ordem de foco equivalente à ordem visual;
- `aria-current="page"` no destino ativo;
- `aria-expanded`, `aria-controls` e `aria-haspopup` nos controles correspondentes;
- ícones decorativos fora da árvore de acessibilidade;
- nomes acessíveis em botões apenas com ícone;
- alvos móveis de ao menos 44×44px;
- nenhum significado comunicado apenas por cor;
- Escape em overlays;
- focus trap e restauração de foco;
- suporte a `prefers-reduced-motion`;
- conteúdo não encoberto por navegação fixa;
- link para pular a navegação e chegar ao conteúdo principal.

## 12. Fora do escopo

- Alterar a identidade visual do cardápio público.
- Alterar regras de negócio, papéis ou RLS.
- Criar métricas ou dashboards que ainda não possuem dados de produto.
- Adicionar novas etapas ao onboarding.
- Introduzir busca de conteúdo de cardápio; a Command Palette pesquisa rotas.
- Migrar o provider de tema para outra biblioteca sem necessidade funcional.
- Reformular os componentes públicos do feed.

## 13. Verificação permitida

O `AGENTS.md` proíbe `git`, `typecheck`, `build`, `lint` e `test`. Nenhum desses comandos será executado.

A verificação será feita por:

- inspeção estática dos arquivos alterados;
- abertura manual das rotas no navegador;
- conferência em 375px, 768px, 1024px e 1440px;
- claro, escuro e sistema;
- sidebar expandida e recolhida;
- persistência após recarga;
- `Ctrl+B`, `Ctrl+K`, `Ctrl+Alt+T` e `AltGr+T`;
- navegação completa por teclado;
- reduced-motion;
- Conta e Menu no mobile;
- usuário com um, nenhum e múltiplos restaurantes quando os dados disponíveis permitirem;
- 404 real e erro transitório recuperável;
- comparação visual com os componentes da `suite`.

## 14. Restrições herdadas

- Nada de git.
- Nada de testes automatizados ou comandos equivalentes aos proibidos.
- Antes de escrever código, ler o guia pertinente em `node_modules/next/dist/docs/`.
- Composição Base UI usa `render`, nunca `asChild`.
- Links internos usam `next/link`.
- `cn` vem do pacote `cn`.
- Componentes cliente não importam DAL nem segurança do servidor.
- Server actions chamadas por eventos rodam dentro de `startTransition`.
- Rotas privadas expostas ao navegador usam caminhos externos dos territórios.
- Português do Brasil em toda a interface.

## 15. Critérios de aceite

O trabalho estará concluído quando:

- admin e painel usarem Inter sem alterar as fontes do cardápio;
- a marca Tavvi/TV aparecer corretamente nos dois estados da sidebar;
- sidebar e navegação móvel reproduzirem aparência e comportamento da referência;
- Command Palette, tema e atalhos funcionarem nos dois territórios;
- todas as páginas privadas usarem a nova hierarquia visual;
- mobile não depender de tabela horizontal para tarefas principais;
- nenhum erro de consulta do restaurante for transformado em 404;
- layout e página reutilizarem o contexto do restaurante;
- estados loading, vazio, erro e 404 forem coerentes com a tela correspondente;
- foco, teclado, reduced-motion, safe areas e contraste estiverem atendidos;
- o navegador não exibir conteúdo encoberto, cortado ou deslocado nos breakpoints definidos.
