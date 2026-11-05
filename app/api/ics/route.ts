import { gerarIcs, validar, type Compromisso } from "@/lib/ics";

// Devolve o arquivo de calendário. Ao abrir no iPhone, aparece "Adicionar ao Calendário".
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const c: Compromisso = {
    titulo: p.get("titulo") ?? "",
    data: p.get("data") ?? "",
    hora: p.get("hora") ?? "",
    local: p.get("local") ?? "",
    notas: p.get("notas") ?? "",
    duracaoMin: Number(p.get("duracao")) || 60,
  };
  const problema = validar(c);
  if (problema) return new Response(problema, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  return new Response(gerarIcs(c), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="compromisso.ics"',
      "Cache-Control": "no-store",
    },
  });
}
