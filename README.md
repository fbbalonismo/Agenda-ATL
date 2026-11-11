# Agenda Alertas

No ar: https://agenda-atl.vercel.app

Página para agendar compromissos pelo iPhone: por voz, foto/print, PDF, texto colado (e-mail, WhatsApp) ou preenchendo na mão.
A IA lê a data e o horário, você confere e um toque salva no Calendário do iPhone com dois avisos:
**às 8h do dia**, **1 hora antes** e **na hora** (regras em `lib/ics.ts`).

## Meu ano

Botão **📅 Meu ano**: os 365 dias em sequência, com dia da semana, cor por mês, fim de semana em negrito e feriados
(nacionais, Carnaval/Sexta-feira Santa/Corpus Christi calculados, N. S. da Penha (ES) e aniversário de Vitória).
Toque no dia para anotar compromisso e observações, ou escreva/fale “aniversário André 20 de outubro” e toque em Marcar
(leitura da frase sem IA, em `lib/agenda.ts`). Aniversário repete todo ano. Tudo o que é salvo no Calendário do iPhone também entra aqui.
Os compromissos do “Meu ano” ficam guardados **neste aparelho** (localStorage, chave `agenda-ano-v1`). Abrir direto: `/?ver=ano`.

## Agenda junto com o app de viagens

Os compromissos do “Meu ano” ficam no mesmo banco do app Agente de Viagens (Upstash Redis `viagens-db`, chave `agente-viagens:state`):
o que é marcado em um aparece no outro, e as viagens e reservas aparecem aqui (só leitura). Rota: `/api/agenda` (protegida pela `APP_SENHA`).
Para ligar: na Vercel, conectar o banco `viagens-db` também a este projeto (Storage → viagens-db → Connect Project). Sem o banco,
o “Meu ano” funciona só no aparelho. Regras de mescla no app de viagens: `lib/eventsync.js` de lá.

## Semana

`/?ver=semana` mostra de segunda a domingo. `/api/semana` baixa um evento que repete toda segunda às 8h no Calendário do iPhone,
com aviso na tela e link para a semana.

## Configuração na Vercel (Settings → Environment Variables)

- `ANTHROPIC_API_KEY` — chave da API da Anthropic (console.anthropic.com), usada para ler arquivos e textos.
- `APP_SENHA` — senha que a página pede na primeira vez (evita que estranhos usem seus créditos).

## Comandos

- `npm run dev` — rodar local
- `npm test` — testes do arquivo de calendário
- `npm run build` — checagem completa

Deploy automático: todo push na `main` publica na Vercel.
