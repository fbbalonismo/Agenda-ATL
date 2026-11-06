# Agenda Alertas

No ar: https://agenda-atl.vercel.app

Página para agendar compromissos pelo iPhone: por voz, foto/print, PDF, texto colado (e-mail, WhatsApp) ou preenchendo na mão.
A IA lê a data e o horário, você confere e um toque salva no Calendário do iPhone com dois avisos:
**às 8h do dia**, **1 hora antes** e **na hora** (regras em `lib/ics.ts`).

## Configuração na Vercel (Settings → Environment Variables)

- `ANTHROPIC_API_KEY` — chave da API da Anthropic (console.anthropic.com), usada para ler arquivos e textos.
- `APP_SENHA` — senha que a página pede na primeira vez (evita que estranhos usem seus créditos).

## Comandos

- `npm run dev` — rodar local
- `npm test` — testes do arquivo de calendário
- `npm run build` — checagem completa

Deploy automático: todo push na `main` publica na Vercel.
