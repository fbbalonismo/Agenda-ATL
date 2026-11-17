# Agenda Alertas (Agenda ATL): contexto para o Claude Code

Página pessoal do André para agendar compromissos pelo iPhone (voz, foto/print, PDF, texto colado ou à mão),
com "Meu ano", a tela da semana e o lembrete de toda segunda.
Produção: https://agenda-atl.vercel.app · Repositório: fbbalonismo/Agenda-ATL (branch `main`).
Todo push na `main` publica sozinho na Vercel (projeto `andre-6383/agenda-atl`).
App irmão: Agente de Viagens (fbbalonismo/agente-viagens). **Os dois gravam no mesmo banco** (veja abaixo).

## Como o André quer ser tratado
- Português do Brasil, sempre.
- Conselheiro brutalmente honesto: sem elogios, sem validar por validar. Aponte riscos, pontos cegos e custo de oportunidade.
  Depois, faça o que foi pedido.
- Ele não é programador: explique passos com links diretos e nomes exatos de botões.

## Stack
- Next.js 16 (App Router, TypeScript), React 19. CSS em `app/globals.css`.
- IA: `@anthropic-ai/sdk` em `app/api/extrair` (lê foto, PDF e texto e devolve data e hora). Precisa de `ANTHROPIC_API_KEY`.
- Calendário do iPhone: arquivo .ics gerado em `lib/ics.ts` (avisos às 8h do dia, 1h antes e na hora). Testes em `lib/*.test.ts` (`npm test`).
- "Meu ano": `components/AgendaAno.tsx` + `lib/agenda.ts` (feriados e leitura de frase sem IA). Cópia local em localStorage `agenda-ano-v1`.
- Semana: `/?ver=semana`; `/api/semana` baixa o evento que repete toda segunda às 8h.

## Integração com o Agente de Viagens (o ponto mais frágil)
- Banco compartilhado: Upstash Redis `viagens-db`, chave `agente-viagens:state`, que é o documento **inteiro** do app de viagens
  (viagens, reservas, gastos, compromissos). Este app só deveria mexer em `events`, `deletedEvents` e `eventsAt`.
- Rota: `app/api/agenda/route.ts`. GET devolve compromissos + viagens e reservas (só leitura). POST `op`: `salvar` | `importar` | `apagar`.
- Tradução entre os formatos: `lib/sync.ts` (`deEvento` / `paraEvento`). `paraEvento` preserva os campos que só o app de viagens usa.
- Regras de mescla (vivem no OUTRO repositório, `lib/eventsync.js`): cada compromisso tem `u` (última mudança); apagado vira lápide
  em `deletedEvents[id]`; o mais novo vence. Este app **nunca** altera `updatedAt` (causaria conflito 409 no app de viagens),
  só `eventsAt`. Compromissos criados aqui levam `origem: 'atl'`.
- **Não remover nem renomear `u`, `deletedEvents`, `eventsAt`, `origem`.** Qualquer mudança no formato de `events` tem que ser feita
  nos dois repositórios ao mesmo tempo. Antes de mexer, ler o `CLAUDE.md` do agente-viagens.
- Sem o banco conectado, `/api/agenda` responde `{ ligado: false }` e o "Meu ano" funciona só no aparelho.

## Riscos conhecidos (não resolvidos)
- **Gravação concorrente:** o POST de `/api/agenda` lê o documento inteiro, muda os compromissos e grava o documento inteiro de volta.
  Se o app de viagens salvar no intervalo (milissegundos), a mudança dele em viagens e reservas pode ser desfeita no servidor.
  Com um usuário só, a chance é baixa, mas não é zero. Correção possível: compromissos numa chave própria do Redis ou trava (lock).
  Não fazer sem o André pedir.
- **Duas senhas protegem os mesmos dados:** `APP_PASSWORD` (app de viagens) e `APP_SENHA` (este app). O GET de `/api/agenda` devolve
  viagens e reservas, então `APP_SENHA` também protege os dados de viagem. Ela fica guardada em texto no localStorage do aparelho.
  A senha mais fraca das duas é o limite real de segurança.

## Variáveis de ambiente (Vercel)
`ANTHROPIC_API_KEY`, `APP_SENHA`, `KV_REST_API_URL`/`KV_REST_API_TOKEN` (aparecem ao conectar o `viagens-db` em Storage → Connect Project).
Variável nova só vale depois de nova publicação.

## Regras ao mexer
- Rodar `npm test` e `npm run build` antes de cada push. Testar no tamanho de celular (390 px).
- Nunca colocar credenciais no código.
