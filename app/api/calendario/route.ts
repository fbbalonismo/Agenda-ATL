import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "node:crypto";
import { chaveAssinatura, gerarCalendario } from "@/lib/feed";
import { deEvento, type EventoViagens } from "@/lib/sync";

// Calendário que o iPhone assina e atualiza sozinho. O link leva uma chave derivada da APP_SENHA
// (calendários assinados não mandam senha). Só leitura; quem tiver o link vê os compromissos.
export const dynamic = "force-dynamic";
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export async function GET(req: Request) {
  const senha = process.env.APP_SENHA;
  const k = new URL(req.url).searchParams.get("k") || "";
  if (!senha) return new Response("Calendário indisponível.", { status: 503 });
  const certa = Buffer.from(chaveAssinatura(senha)), recebida = Buffer.from(k);
  if (certa.length !== recebida.length || !timingSafeEqual(certa, recebida)) return new Response("Link inválido.", { status: 401 });
  if (!redis) return new Response("Calendário indisponível.", { status: 503 });

  const s = await redis.get<{ events?: EventoViagens[] }>("agente-viagens:state");
  const umAnoAtras = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const lista = (s?.events || [])
    .filter((e) => e?.id && e.date && e.title)
    .map(deEvento)
    .filter((c) => c.repetir === "ano" || c.data >= umAnoAtras);
  return new Response(gerarCalendario(lista), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": 'inline; filename="agenda-atl.ics"' },
  });
}
