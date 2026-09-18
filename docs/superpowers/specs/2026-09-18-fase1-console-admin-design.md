# Fase 1 — Console do administrador

Data: 2026-09-18
Status: aprovado, pronto para plano de implementação

## 1. Contexto

A Fase 0 entregou a fundação, verificada: schema multi-inquilino com RLS negando por padrão, isolamento estrutural por chave estrangeira composta, camada de acesso a dados com autorização por posse, convite por link com uso único atômico, rate limit, auditoria, storage e três territórios separados por subdomínio.

O que **não** existe: qualquer interface além de esqueletos de rota. As páginas `/entrar` dos dois territórios privados são um `<h1>` e nada mais.

A Fase 1 é a primeira com interface de verdade. Ela fecha o primeiro ciclo completo do produto: **criar um restaurante, mandar o link para alguém, e essa pessoa entrar.**

Detalhes da fundação estão em [`2026-09-18-fundacao-nfc-menu-design.md`](2026-09-18-fundacao-nfc-menu-design.md). O que está lá não se repete aqui.

## 2. Escopo

**Dentro:**

- Autenticação real no território `admin.`: entrar e sair.
- Console do administrador: listar, criar, editar, suspender e remover restaurantes.
- Convites: emitir com link exibido uma única vez, listar e revogar.
- Equipe: listar membros de um restaurante e removê-los.
- Território `painel.`: entrar, resgatar convite, e uma raiz mínima listando os restaurantes da pessoa.
- Tema claro e escuro com persistência, sem piscar no carregamento.
- Sistema visual aplicado às telas acima.

**Fora:**

- CMS do cardápio — é a Fase 2.
- Cardápio público com design — é a Fase 3.
- Plaquinhas e QR code — cabem no console, mas ficam para depois do primeiro ciclo fechar.
- Tela de auditoria. O `audit_log` já grava e o administrador já tem permissão de leitura; falta só a tela.
- Testes automatizados — decisão do cliente, mantida.
- Recuperação de senha — depende de SMTP, que é dívida registrada na Fase 0.

## 3. Decisões e justificativas

| # | Decisão | Por quê |
|---|---|---|
| E1 | O resgate de convite entra na Fase 1, no território `painel.` | Um convite que ninguém consegue resgatar não entrega valor. São duas telas, e são elas que transformam a fase em algo utilizável |
| E2 | Lista e detalhe, com barra superior; sem menu lateral | O console tem uma seção só: restaurantes. Convite e membro pertencem a um restaurante e não existem soltos. Menu lateral hoje teria um item |
| E3 | Direção visual cálida e espaçosa (ver seção 6) | Densidade só se paga quando há muita linha para varrer. Com dezenas de restaurantes, o console denso entrega aperto sem entregar velocidade |
| E4 | Tema próprio, sem `next-themes` | O problema real é não piscar branco antes de aplicar o tema escuro, e isso são dez linhas de script embutido. Não justifica uma dependência |
| E5 | Resgate de convite é explícito, com botão | Resgate automático ao carregar a página faria um recarregamento acidental consumir o convite, que é de uso único |
| E6 | O link do convite aparece uma vez, com aviso antes de fechar | O banco guarda só o hash e não consegue reconstruí-lo. Se a interface não avisar antes, a pessoa descobre o problema quando já é tarde |
| E7 | Erro de login sempre genérico | Distinguir "e-mail não existe" de "senha errada" entrega metade da credencial. O e-mail do administrador é o alvo que interessa |
| E8 | Toda página reverifica autorização | O proxy redireciona quem não tem cookie, mas não autoriza. Autorização é da página e da action, sempre |
| E9 | Gerar os tipos do banco é o primeiro passo | O schema parou de mudar. A partir daí, errar nome de coluna vira erro de compilação em vez de erro em produção |
| E10 | Manter Inter como tipografia única | Uma segunda fonte é download extra no celular. Personalidade tipográfica compensa na Fase 3, no cardápio público; num console de uso interno, não |
| E11 | Erro previsto ganha mensagem própria; imprevisto continua genérico | Esconder "endereço já em uso" de quem acabou de digitar o endereço não protege nada e trava a pessoa. O genérico existe para não vazar o schema, não para punir quem errou um campo |

## 4. Telas e rotas

Caminhos externos, como o navegador os vê. O proxy reescreve para `/admin/*` e `/painel/*` internamente.

### Território `admin.`

| Rota | Tela | Acesso |
|---|---|---|
| `/entrar` | E-mail e senha | Pública dentro do território |
| `/` | Lista de restaurantes | `requirePlatformAdmin()` |
| `/restaurantes/{id}` | Detalhe do restaurante | `requirePlatformAdmin()` |

Criar restaurante é um **diálogo** sobre a lista, não uma rota: são três campos (endereço, nome, descrição).

O detalhe tem quatro blocos, nesta ordem:

1. **Identidade** — nome, descrição e contato (telefone, WhatsApp, Instagram, endereço).
2. **Endereço público** — o slug, editável, com o link para o cardápio ao lado.
3. **Situação** — rascunho, ativo ou suspenso, e a remoção.
4. **Equipe e convites** — membros com opção de remover; convites com emitir e revogar.

### Território `painel.`

| Rota | Tela | Acesso |
|---|---|---|
| `/entrar` | E-mail e senha | Pública dentro do território |
| `/convite/{token}` | Resgate do convite | Pública dentro do território |
| `/` | Restaurantes da pessoa | `requireUser()` |

A raiz do `painel.` lista os restaurantes de que a pessoa participa e diz, em uma linha, que a edição do cardápio chega na Fase 2. Sem ela, quem resgata um convite cai numa tela vazia e não sabe se funcionou.

### Uma consequência boa do desenho da Fase 0

Trocar o slug **não quebra plaquinha nenhuma**: a plaquinha grava `/t/{token}`, que resolve para o slug atual a cada acesso. O campo de endereço público não precisa de aviso alarmante — apenas de uma nota de que links compartilhados diretamente deixam de funcionar.

## 5. Fluxos

### Entrar

Formulário com e-mail e senha, enviado a uma server action. A action aplica rate limit no balde `auth:login` (10 por minuto por IP, já definido na Fase 0), chama `signInWithPassword` e redireciona para o parâmetro `next` — validado por `safeNextPath`, que só aceita caminho interno — ou para a raiz do território.

Qualquer falha devolve a mesma mensagem: **"E-mail ou senha incorretos."** Nunca se distingue e-mail inexistente de senha errada.

Sair é uma server action que chama `signOut` e redireciona para `/entrar`.

### Criar restaurante

Diálogo com endereço, nome e descrição. O campo de endereço mostra, abaixo, como a URL ficará. Validação pelo `createRestaurantSchema` que já existe. Ao concluir, o diálogo fecha, a lista atualiza e um aviso confirma.

Endereço já em uso volta como erro **no campo**, não como aviso genérico — é o erro mais provável e o único que a pessoa consegue corrigir sozinha.

Isso exige uma pequena mudança na Fase 0, e vale registrar por quê. O `runAction` engole qualquer erro inesperado num texto genérico, de propósito: mensagem do Postgres traz nome de tabela, coluna e constraint, que é um mapa do schema de graça para quem estiver sondando. Mas endereço duplicado não é erro inesperado — é uma condição prevista, e esconder dela a pessoa que digitou não protege nada.

A correção tem duas partes:

1. `dal/restaurants.ts` detecta o código `23505` (violação de unicidade) do Postgres e lança um `ConflictError` tipado, com mensagem escrita por nós: "Este endereço já está em uso."
2. `actions/result.ts` trata `ConflictError` como já trata `ForbiddenError` e `RateLimitedError` — repassa a mensagem, que é segura porque nós a escrevemos.

O genérico continua valendo para tudo que não foi previsto, que é exatamente o que ele deveria cobrir.

### Emitir convite

Diálogo com papel (hoje só `owner`), e-mail opcional para amarrar o convite, e validade em dias (padrão 7).

Ao concluir, **o diálogo troca de conteúdo em vez de fechar**: mostra o link com um botão de copiar e o texto de que ele não será exibido novamente. Fechar exige um segundo clique, e o botão de fechar diz "Já copiei o link".

Isso é interface carregando uma garantia do banco: o `token_hash` é o que fica gravado, e ninguém — nem o banco, nem a aplicação — consegue reconstruir o link depois.

### Resgatar convite

1. `/convite/{token}` chama `previewInvite`, que já aplica rate limit. Token inválido, expirado, revogado ou já usado produzem **a mesma tela**: "Este convite não é mais válido."
2. Sendo válido, mostra apenas o nome do restaurante e o papel. Nunca quem convidou, nunca o e-mail amarrado.
3. Quem não está autenticado escolhe entre **criar conta** e **entrar**, na mesma página, em abas.
4. Autenticado, a página mostra o botão **"Aceitar convite"**.
5. O clique chama `redeemInviteAction` e redireciona para a raiz do `painel.`.

O token permanece na URL durante todo o fluxo, o que faz a autenticação não perdê-lo. O resgate é explícito porque o convite é de uso único: um recarregamento acidental não pode consumi-lo.

## 6. Sistema visual

Direção cálida e espaçosa (E3), aplicada tanto ao console quanto às telas do `painel.`.

| Aspecto | Decisão |
|---|---|
| Tipografia | Inter, já carregada. Corpo 16px / 1.6. Títulos por peso 600 e escala, sem segunda fonte |
| Escala de título | Página 28px, seção 20px, cartão 16px |
| Densidade | Linha de tabela com 56px de altura; espaçamento vertical entre blocos de 32px |
| Raio | `0.45rem`, o valor que já está nos tokens |
| Neutros | Os tokens atuais, deslocados para um cinza levemente quente |
| Cor primária | O verde-azulado já definido, usado **apenas** em ação primária, anel de foco e item selecionado na navegação. Nunca como superfície, e nunca para indicar situação |
| Situação do restaurante | Conjunto semântico à parte, separado da primária: rascunho em neutro, ativo em **verde-folha** (visivelmente distinto do verde-azulado da primária), suspenso em âmbar. Nunca só cor: sempre cor mais texto |
| Largura máxima | 1100px de conteúdo, centralizado |
| Alvo de toque | Mínimo 44px em qualquer controle |

Cor nunca é o único portador de significado — situação, erro e sucesso sempre trazem texto ou ícone junto. Isso atende quem não distingue as cores e, de quebra, torna a interface legível numa captura de tela em preto e branco.

## 7. Tema

Um provedor próprio, em três partes:

1. **Script embutido no `<head>`**, executado antes da primeira pintura: lê `localStorage`, cai em `prefers-color-scheme` quando não há preferência salva, e aplica a classe `dark` no `<html>`. É isto que evita o lampejo branco.
2. **Contexto React** com o tema atual e a função de alternar, gravando em `localStorage`.
3. **Botão de alternância** na barra superior, com três estados: claro, escuro e sistema.

Toda leitura e escrita de `localStorage` vai em `try/catch`: em janela privada o acesso lança, e a interface precisa continuar funcionando com o tema padrão.

Os tokens de modo escuro já existem em `globals.css`, sob `.dark`. A Fase 1 os ajusta para a direção cálida, não os cria.

## 8. Erros, vazios e carregamento

**Erros de ação.** As server actions da Fase 0 já devolvem `ActionResult`, com `{ ok: false, error }` e mensagem segura — erro inesperado nunca vaza detalhe do Postgres. A interface só exibe: inline quando o erro pertence a um campo, em aviso flutuante quando é geral.

**Estados vazios.** Componente `empty`, já instalado. Cada vazio diz o que fazer em seguida, não apenas que está vazio: a lista sem restaurantes traz o botão de criar o primeiro.

**Carregamento.** `loading.tsx` por rota, com `skeleton` no formato do conteúdo que vem. Botão que dispara ação fica desabilitado e com `spinner` enquanto pendente, via `useActionState`.

**Falha de rota.** `error.tsx` em cada território, com mensagem neutra e opção de tentar de novo. `not-found.tsx` para restaurante inexistente.

## 9. Segurança na interface

Nada aqui substitui a fundação; tudo aqui a repete no lugar certo.

- **Toda página do console chama `requirePlatformAdmin()`.** O proxy redireciona quem não tem cookie, mas checagem otimista não é autorização.
- **Toda server action reverifica**, através da DAL. Ela é um endpoint POST público por construção e pode ser chamada sem passar por tela alguma.
- **O `id` da rota de detalhe é validado por Zod** antes de qualquer consulta.
- **O parâmetro `next` do login passa por `safeNextPath`**, que já existe e barra redirecionamento externo.
- **Nenhum componente de cliente importa `@/server`.** Dado chega por props, mutação sai por server action.
- **O link do convite nunca é registrado em log**, nem no servidor nem no navegador.

## 10. Limpezas incluídas

- `layout.tsx` ainda é o template: título "Create Next App", `lang="en"` e um import de `Figtree` que não é usado. Passa a `lang="pt-BR"`, com título e descrição do produto, e sem o import morto.
- Gerar os tipos do banco com `npx supabase gen types typescript` e passá-los como parâmetro genérico em `createUserClient`. É o primeiro passo da implementação (E9), e depois dele todo acesso da DAL fica verificado pelo compilador.

## 11. O que a Fase 1 deixa pronto

- **Fase 2, o CMS do cardápio:** a raiz do `painel.` já existe, com sessão e lista de restaurantes. O CMS pendura ali.
- **Plaquinhas com QR:** o detalhe do restaurante já tem a estrutura de blocos; plaquinhas viram um quinto bloco.
- **Tela de auditoria:** o `audit_log` grava desde a Fase 0 e o administrador já tem permissão de leitura. Falta apenas a tela.
- **Papel `manager`:** o bloco de equipe já lista e remove membros. Adicionar um segundo papel é uma política no banco e um seletor no diálogo de convite.
