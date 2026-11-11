import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "node:crypto";
import type { Compromisso } from "@/lib/agenda";
import { deEvento, paraEvento, type EventoViagens, type ItemViagem } from "@/lib/sync";

// Compromissos compartilhados com o app Agente de Viagens (mesmo banco Upstash, conectado na Vercel aos dois projetos).
export const dynamic = "force-dynamic";
const CHAVE = "agente-viagens:state";
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

type Estado = { trips?: { id: string; name: string; emoji?: string; start?: string; end?: string; city?: string; items?: { id: string; type: string; title: string; date?: string; time?: string; status?: string }[] }[]; events?: EventoViagens[]; deletedEvents?: Record<string, number>; eventsAt?: number; updatedAt?: number; [k: string]: unknown };

function senhaOk(req: Request) {
  const certa = process.env.APP_SENHA;
  const recebida = req.headers.get("x-senha") || "";
  if (!certa || !recebida) return false;
  const a = Buffer.from(recebida), b = Buffer.from(certa);
  return a.length === b.length && timingSafeEqual(a, b);
}
const json = (dados: unknown, status = 200) => Response.json(dados, { status, headers: { "Cache-Control": "no-store" } });

function resumo(s: Estado | null) {
  const lista = (s?.events || []).filter((e) => e && e.id && e.date && e.title).map(deEvento);
  const viagens: ItemViagem[] = [];
  for (const t of s?.trips || []) {
    if (t.start) viagens.push({ id: "t-" + t.id, viagem: t.name, emoji: t.emoji || "🧳", tipo: "viagem", titulo: t.name + (t.end && t.end !== t.start ? " (até " + t.end.slice(8, 10) + "/" + t.end.slice(5, 7) + ")" : ""), data: t.start, hora: "", status: "confirmado" });
    for (const i of t.items || []) if (i.date && i.status !== "cancelado") viagens.push({ id: i.id, viagem: t.name, emoji: t.emoji || "🧳", tipo: i.type, titulo: i.title, data: i.date, hora: i.time || "", status: i.status || "confirmado" });
  }
  return { ligado: true, lista, viagens };
}

export async function GET(req: Request) {
  if (!redis) return json({ ligado: false });
  if (!senhaOk(req)) return json({ erro: "Senha errada." }, 401);
  return json(resumo(await redis.get<Estado>(CHAVE)));
}

export async function POST(req: Request) {
  if (!redis) return json({ ligado: false }, 503);
  if (!senhaOk(req)) return json({ erro: "Senha errada." }, 401);
  const corpo = (await req.json().catch(() => null)) as { op?: string; c?: Compromisso; id?: string; varios?: Compromisso[] } | null;
  if (!corpo) return json({ erro: "Pedido inválido." }, 400);
  const s: Estado = (await redis.get<Estado>(CHAVE)) || { trips: [], updatedAt: 0 };
  const agora = Date.now();
  s.events = s.events || [];
  s.deletedEvents = s.deletedEvents || {};
  const salvar = (c: Compromisso) => {
    if (!c?.id || !c.titulo?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(c.data || "")) return;
    const k = s.events!.findIndex((e) => e.id === c.id);
    const ev = { ...paraEvento(c, k >= 0 ? s.events![k] : undefined), u: agora };
    if (k >= 0) s.events![k] = ev; else s.events!.push(ev);
    delete s.deletedEvents![c.id];
  };
  if (corpo.op === "salvar" && corpo.c) salvar(corpo.c);
  else if (corpo.op === "importar" && Array.isArray(corpo.varios)) corpo.varios.slice(0, 500).forEach(salvar);
  else if (corpo.op === "apagar" && corpo.id) {
    s.events = s.events.filter((e) => e.id !== corpo.id);
    s.deletedEvents[corpo.id] = agora;
  } else return json({ erro: "Operação desconhecida." }, 400);
  // Não mexe em updatedAt (evita conflito com o app de viagens); eventsAt avisa que há compromisso novo.
  s.eventsAt = agora;
  await redis.set(CHAVE, s);
  return json(resumo(s));
}
