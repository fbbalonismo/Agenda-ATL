import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual } from "node:crypto";

// Lê texto, foto/print (imagem) ou PDF e devolve os compromissos encontrados.
export const maxDuration = 60;

const MODELO = "claude-opus-5-5";
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type TipoImagem = (typeof TIPOS_IMAGEM)[number];

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["compromissos", "aviso"],
  properties: {
    compromissos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "data", "hora", "local", "observacao"],
        properties: {
          titulo: { type: "string", description: "Nome curto do compromisso" },
          data: { type: "string", description: "AAAA-MM-DD, ou vazio se não houver" },
          hora: { type: "string", description: "HH:MM em 24h, ou vazio se não houver" },
          local: { type: "string", description: "Endereço ou local, ou vazio" },
          observacao: { type: "string", description: "Detalhe útil curto (preparo, documento a levar), ou vazio" },
        },
      },
    },
    aviso: { type: "string", description: "Dúvida ou problema na leitura, ou vazio" },
  },
} as const;

export type Extraido = {
  compromissos: { titulo: string; data: string; hora: string; local: string; observacao: string }[];
  aviso: string;
};

type Entrada = {
  senha?: string;
  texto?: string;
  arquivo?: { tipo: string; base64: string };
};

function senhaOk(recebida: string | undefined) {
  const certa = process.env.APP_SENHA;
  if (!certa || !recebida) return false;
  const a = Buffer.from(recebida);
  const b = Buffer.from(certa);
  return a.length === b.length && timingSafeEqual(a, b);
}

function agoraEmBrasilia() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function erro(mensagem: string, status: number) {
  return Response.json({ erro: mensagem }, { status });
}

export async function POST(req: Request) {
  if (!process.env.APP_SENHA) return erro("A senha do app ainda não foi configurada na Vercel (APP_SENHA).", 500);
  if (!process.env.ANTHROPIC_API_KEY) return erro("A chave da IA ainda não foi configurada na Vercel (ANTHROPIC_API_KEY).", 500);

  let entrada: Entrada;
  try {
    entrada = await req.json();
  } catch {
    return erro("Arquivo grande demais ou envio incompleto. Tente um arquivo menor.", 400);
  }
  if (!senhaOk(entrada.senha)) return erro("Senha errada.", 401);

  const texto = entrada.texto?.trim() ?? "";
  const arquivo = entrada.arquivo;
  if (!texto && !arquivo) return erro("Mande um texto ou um arquivo.", 400);

  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (arquivo) {
    if (arquivo.tipo === "application/pdf") {
      conteudo.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: arquivo.base64 } });
    } else if ((TIPOS_IMAGEM as readonly string[]).includes(arquivo.tipo)) {
      conteudo.push({ type: "image", source: { type: "base64", media_type: arquivo.tipo as TipoImagem, data: arquivo.base64 } });
    } else {
      return erro("Tipo de arquivo não aceito. Use foto, print ou PDF.", 400);
    }
  }
  conteudo.push({
    type: "text",
    text: texto
      ? `Texto enviado pelo usuário:\n"""\n${texto}\n"""`
      : "Extraia o compromisso deste arquivo.",
  });

  const system = `Você lê pedidos de agendamento de uma pessoa no Brasil e extrai os compromissos (consultas, exames, reuniões, audiências, entregas, etc.).
Agora é ${agoraEmBrasilia()} (horário de Brasília).

Regras:
- Resolva datas relativas ("amanhã", "sexta", "dia 12") a partir de agora. Sem ano escrito, use a próxima ocorrência a partir de hoje.
- Use só a data e o horário DO COMPROMISSO. Ignore data de emissão, de nascimento, de validade, de envio da mensagem e horário do relógio de prints.
- Horário em 24h (14h30 → 14:30). Se não houver horário, deixe "hora" vazio. Não invente.
- Título curto e claro em português, com quem ou onde (ex.: "Consulta dermatologista – Dra. Ana").
- Se houver mais de um compromisso, liste todos, em ordem de data.
- Se não achar compromisso, devolva a lista vazia e explique em "aviso". Use "aviso" também para qualquer dúvida (ex.: duas datas possíveis).`;

  const client = new Anthropic();
  try {
    const resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system,
      messages: [{ role: "user", content: conteudo }],
    });

    if (resposta.stop_reason === "refusal") return erro("A IA não conseguiu ler este conteúdo. Preencha na mão.", 422);
    if (resposta.stop_reason === "max_tokens") return erro("O arquivo tem conteúdo demais. Envie só a parte do compromisso.", 422);

    const bloco = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    if (!bloco) return erro("A IA não devolveu resposta. Tente de novo.", 502);
    const dados = JSON.parse(bloco.text) as Extraido;
    return Response.json(dados);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return erro("A chave da IA está errada. Confira ANTHROPIC_API_KEY na Vercel.", 500);
    if (e instanceof Anthropic.PermissionDeniedError) return erro("A chave da IA não tem permissão ou está sem crédito.", 500);
    if (e instanceof Anthropic.RateLimitError) return erro("Muitos pedidos seguidos. Espere um minuto e tente de novo.", 429);
    if (e instanceof Anthropic.BadRequestError) {
      const msg = /credit|balance/i.test(e.message) ? "Os créditos da IA acabaram. Recarregue em console.anthropic.com." : "A IA não aceitou este arquivo. Tente outro formato ou preencha na mão.";
      return erro(msg, 400);
    }
    if (e instanceof Anthropic.APIError) return erro("A IA está fora do ar agora. Preencha na mão ou tente daqui a pouco.", 502);
    if (e instanceof SyntaxError) return erro("Resposta da IA veio incompleta. Tente de novo.", 502);
    throw e;
  }
}
