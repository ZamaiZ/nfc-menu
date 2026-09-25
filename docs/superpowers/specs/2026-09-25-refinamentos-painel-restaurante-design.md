# Refinamentos do painel do restaurante

## Objetivo

Melhorar a velocidade percebida, o aproveitamento de espaço e a clareza dos estados vazios no painel do restaurante, preservando a identidade visual existente e oferecendo prévias úteis nos formulários de Identidade e Contato em desktop e mobile.

## Contexto confirmado

- A grade do cardápio usa imagens com proporção `9 / 11`, que dominam os cards e comprimem as informações dos itens.
- O modo Serviço executa a Server Action dentro de uma transição, mas não mantém estado otimista próprio. Os cards só refletem a disponibilidade confirmada pelo servidor, e todos ficam desabilitados enquanto a ação está pendente.
- A mensagem “Nenhum item visível está esgotado.” é renderizada sempre que não existe item esgotado, inclusive quando os itens já estão visíveis e disponíveis.
- Identidade mantém a prévia numa coluna da página; em telas menores, o CSS limita seu conteúdo e corta o telefone.
- Contato usa `ThemePreview`, que exibe itens de demonstração e recebe somente o tema e o nome inicial do restaurante. Não reflete descrição, telefone, WhatsApp, Instagram ou endereço que estão sendo editados.
- `NavLeafRow` calcula seleção com correspondência por prefixo, então uma rota filha pode manter o link Cardápio selecionado.
- O projeto já possui o componente composto `Empty` do shadcn. A listagem de restaurantes já o utiliza, mas os demais vazios usam mensagens e estruturas avulsas.

## Decisões de design

### Grade do cardápio

Reduzir a área ocupada pela mídia com uma proporção mais horizontal e altura controlada por breakpoint. Manter `object-fit: cover`, garantir que os metadados continuem legíveis e revisar o espaço interno dos cards para evitar a sensação de uma grade de pôsteres. Não alterar a apresentação em lista.

### Disponibilidade no modo Serviço

Atualizar imediatamente o estado visual do item acionado, sem aguardar a viagem de ida e volta da Server Action. A pendência deve ser específica por item para que outras disponibilidades continuem operáveis. Se a ação falhar, restaurar o estado confirmado e mostrar o erro pelo toast existente. Expor o estado pendente de forma acessível sem bloquear o restante da grade.

Quando não houver itens esgotados, não exibir texto explicativo nem empty state: os próprios cards mostram que os itens estão disponíveis. Se não houver itens visíveis, esse é um estado de ausência de conteúdo diferente e pode apresentar o empty state contextual com uma ação para revisar a visibilidade ou voltar ao cardápio.

### Prévia de Identidade e Contato

Substituir as prévias fixas nas colunas por um controle flutuante compartilhado. O acionador abre um popover ancorado, com fechamento por `Escape`, foco e semântica fornecidos pelo primitivo acessível já presente no projeto, e dimensionamento que respeita viewport e safe areas em telas estreitas.

O conteúdo apresenta um telefone completo, com alternância Claro/Escuro. Em Identidade, reflete o nome e a escolha de tema em edição. Em Contato, reflete o nome, a descrição e os canais/endereço em edição, com conteúdo organizado como cabeçalho e informações públicas do restaurante. Informações vazias são omitidas da prévia, em vez de substituídas por dados fictícios. O controle flutuante libera a largura da página para os campos configuráveis.

O componente compartilhado deve separar o invólucro interativo — acionador, popover, alternância de tema e moldura do telefone — do conteúdo específico de cada formulário. A prévia existente do cardápio pode continuar usando conteúdo de demonstração onde esse for o propósito explícito; a tela de Contato não deve reaproveitá-lo como se fossem dados reais.

### Estados vazios

Criar uma composição reutilizável sobre `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription` e `EmptyContent`. O componente deve aceitar ícone, texto, variante de densidade e ação opcional. A animação de entrada será curta e discreta, respeitará `prefers-reduced-motion` e não animará conteúdo repetidamente a cada interação de alta frequência.

Aplicar às situações reais de ausência de dados/resultados no painel:

- Nenhum restaurante acessível.
- Cardápio sem categorias.
- Busca ou filtro sem resultados.
- Categoria sem itens.
- Modo Serviço sem itens visíveis.
- Sequência sem itens com mídia.
- Quadro sem categorias.
- Coluna do quadro sem itens, mantendo a dica de soltar itens.
- Planilha sem itens.
- Estúdio sem item selecionado ou sem itens.
- Equipe sem outras pessoas e sem convites pendentes.
- Editor de mídia sem fotos/vídeos salvos ou na fila.
- Editor de variações sem variações cadastradas.

Cada estado terá texto e ícone específicos. CTAs devem usar a ação existente e apropriada: criar categoria/item, limpar busca/filtro, adicionar mídia/variação ou convidar pessoa. Não duplicar controles próximos sem necessidade; em especial, a Equipe pode apontar para o botão de convite que já está no cabeçalho. Textos instrutivos de campos e controles de upload não são vazios por si só e permanecem como instruções quando não representam ausência de dados.

### Navegação lateral

Calcular o href ativo mais específico uma vez para a árvore e usar igualdade com esse href ao renderizar cada folha. Assim, páginas filhas selecionam apenas seu próprio link. O grupo pai continua expandido conforme a hierarquia atual, sem marcar links ancestrais como a página corrente.

## Fluxos e erros

- Falha na mudança de disponibilidade: reverter apenas o item afetado e informar erro.
- Fechar o popover: suportar `Escape`, acionador, clique externo segundo o primitivo existente e restauração de foco.
- Prévia em tela pequena: restringir dimensões à viewport e permitir rolagem interna do conteúdo, sem cortar controles ou o telefone.
- Campos vazios na prévia de Contato: ocultar blocos ausentes sem dados de preenchimento fictícios.
- Movimento reduzido: remover deslocamentos/escala decorativos, mantendo feedback de opacidade/cor que ajude a reconhecer a mudança.

## Áreas previstas

- `src/app/globals.css` — grade, popover/telefone, estilos de estados vazios e movimento responsivo.
- `src/components/cardapio/menu-work-modes.tsx` — disponibilidade otimista e vazios dos modos de trabalho.
- `src/components/painel/menu-workspace.tsx` e `src/components/cardapio/item-row.tsx` — conteúdo dos vazios e tamanho da mídia em grade.
- `src/components/painel/identity-form.tsx` — integração da prévia com os valores de Identidade.
- `src/components/painel/profile-form.tsx` e `src/app/painel/restaurantes/[id]/contato/page.tsx` — prévia com valores editados de Contato.
- `src/components/painel/theme-preview.tsx` ou um componente específico complementar — conteúdo visual real por contexto.
- `src/components/shell/nav-tree.tsx` e, se necessário, `src/components/shell/navigation.ts` — seleção da folha ativa mais específica.
- `src/app/painel/restaurantes/[id]/equipe/page.tsx`, `src/components/cardapio/media-editor.tsx`, `src/components/cardapio/variants-editor.tsx` e `src/app/painel/restaurantes/page.tsx` — adoção das composições de estado vazio.
- Um componente compartilhado de empty state em `src/components/painel/` e um componente compartilhado de prévia em `src/components/painel/`.

## Restrições e validação

- Não adicionar dependências: os primitivos Popover, ícones, transições e componentes Empty já existem no projeto.
- Não executar nem adicionar testes, nem executar typecheck, build, lint ou comandos Git.
- Fazer revisão estática dos diffs e dos pontos de integração após implementar. A revisão visual manual fica limitada ao que puder ser inspecionado sem executar esses comandos proibidos.

## Critérios de aceite

1. A grade mostra mídia significativamente menor e cards com leitura equilibrada.
2. No modo Serviço, o clique altera o estado visual de imediato; falhas revertem apenas o item correspondente.
3. A mensagem de itens esgotados desaparece; sem itens visíveis, a ausência é apresentada como estado contextual distinto.
4. Identidade e Contato oferecem o mesmo acionador flutuante e popover funcional em desktop e mobile, incluindo `Escape`, Claro/Escuro e telefone não cortado.
5. A prévia de Contato acompanha os campos atuais e não exibe pratos fictícios como se fossem dados do restaurante.
6. Cada situação de ausência de conteúdo do painel usa o Empty trabalhado, com conteúdo específico e CTA quando houver ação natural.
7. A animação respeita movimento reduzido e os estados vazios não causam saltos ou atraso de interação.
8. Ao navegar para uma página filha do restaurante, somente o link daquela página é marcado como atual.
