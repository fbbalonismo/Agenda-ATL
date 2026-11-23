import { timingSafeEqual } from "node:crypto";
import { chaveAssinatura } from "@/lib/feed";

// Devolve o link de assinatura do calendário para quem sabe a senha do app.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const certa = process.env.APP_SENHA;
  const recebida = req.headers.get("x-senha") || "";
  if (!certa || !recebida) return Response.json({ erro: "Senha errada." }, { status: 401 });
  const a = Buffer.from(recebida), b = Buffer.from(certa);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ erro: "Senha errada." }, { status: 401 });
  const host = req.headers.get("x-forwarded-host") || new URL(req.url).host;
  return Response.json({ link: `webcal://${host}/api/calendario?k=${chaveAssinatura(certa)}` }, { headers: { "Cache-Control": "no-store" } });
}
