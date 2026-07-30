# Blusas da Turma — v2 (arquitetura por token) 👕

Cada aluno tem um **link individual** (`/p/TOKEN`) onde vê e responde só o
próprio cadastro, uma única vez. O **painel** (`/admin`) gerencia alunos,
links, pagamentos, estatísticas e gráficos.

Stack: React 18 + TypeScript + Vite + Supabase + React Router.

## Como funciona a segurança (leia isto)

A `anon key` do Supabase é pública (vai no bundle do front). Por isso:

- A tabela `participants` fica **fechada por RLS** — ninguém acessa direto pela
  API REST.
- O **aluno** só toca no próprio registro através de funções `SECURITY DEFINER`
  que recebem o token (`get_participant_by_token`, `submit_response`). Sem o
  token não há como ver nem alterar ninguém. É isso que impede um aluno de
  mexer no pagamento de outro.
- O **admin** usa funções protegidas por uma **chave** (`app_config.admin_key`
  no banco = `VITE_ADMIN_KEY` no front). Não é tela de login; é uma chave que o
  painel envia junto. Deixando a chave vazia nos dois lados, o admin opera
  aberto (sem senha) — **não recomendado**, pois aí qualquer um com a URL
  lista/edita/exclui.

## Passo a passo

### 1. Banco (Supabase)

SQL Editor → cole e rode `supabase/migrations/0002_token_architecture.sql`.
É **idempotente** (pode rodar de novo) e cria tabela, índices, constraints,
triggers, funções RPC, RLS e o **seed** com todos os alunos (tokens gerados
automaticamente). Se você tinha a v1, ele faz upgrade da tabela sem apagar dados.

Defina sua chave de admin:

```sql
update public.app_config set value = 'MINHA-CHAVE-FORTE' where key = 'admin_key';
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_ADMIN_KEY=MINHA-CHAVE-FORTE   # igual ao app_config.admin_key
```

### 3. Rodar

```bash
npm install
npm run dev
```
- Painel: http://localhost:5173/admin
- Aluno:  http://localhost:5173/p/TOKEN (copie um token pelo painel)

### Deploy (Vercel)

`npm run build`. O `vercel.json` já traz o rewrite de SPA para as rotas
`/p/:token`. Defina as 3 variáveis no painel da Vercel.

## Fluxo do aluno

1. Abre o link -> busca o token.
2. Token inexistente -> 404 bonito.
3. Token válido e não respondido -> escolhe Blusa (R$40) ou Blusa + Short (R$70),
   vê o valor total atualizar, marca (ou não) "Já realizei o pagamento" e Confirma.
4. O preço é definido no servidor (o cliente não escolhe valor).
5. Depois de confirmar: link bloqueado, mostra "Resposta enviada com sucesso —
   Este link já foi utilizado."

## Painel admin

Cards (total, responderam, faltam, só blusa, blusa+short, pagaram, valor
previsto/arrecadado/pendente), gráficos (donut de escolhas + barras de valores),
busca, novo aluno, editar nome, excluir, copiar link, compartilhar e exportar
CSV. Atualiza por polling a cada 8s (a tabela está fechada por RLS, então não dá
pra usar realtime) e após cada ação.

Valores: Previsto = soma de quem respondeu; Arrecadado = soma de quem pagou;
Pendente = previsto - arrecadado.

## Estrutura

```
src/
  pages/        AdminPage, StudentPage, NotFoundPage
  components/
    admin/      StatCards, AdminCharts, ParticipantRow, NameFormModal
    charts/     DonutChart, MoneyBars (SVG, sem dependência)
    shared/     Toast, Modal + ConfirmDialog
  hooks/        useAdminParticipants (dados + polling + stats)
  lib/          supabase (client) + api (RPCs)
  utils/        format (data/moeda/link) + csv
supabase/
  migrations/   0002_token_architecture.sql
```
